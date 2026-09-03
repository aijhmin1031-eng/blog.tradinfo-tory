// 최소 XLSX 작성기 — 브라우저에서 엑셀 파일을 만든다.
//
// 왜 직접 쓰는가: 이 사이트에는 외부 스크립트가 한 줄도 없다(CDN 의존 0).
// 표 넷을 시트 넷으로 내보내고 원문 URL 을 하이퍼링크로 거는 데에는
// 라이브러리 전체가 필요하지 않다. .xlsx 는 XML 몇 장을 담은 ZIP 이다.
//
// 시트 이름·열 순서·하이퍼링크 문구(「공고 원문」)는 입찰레이더의
// `src/briefing_excel.py` 와 같게 맞춘다. 사람이 두 파일을 나란히 놓고 보기 때문이다.

const enc = new TextEncoder();

/* ── CRC32 (ZIP 에 필요) ───────────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ── ZIP (무압축 store) ────────────────────────────────────────────── */
// 표 넷 분량이라 압축하지 않아도 수백 KB 를 넘지 않는다.
// deflate 를 직접 넣지 않는 편이 코드가 짧고 깨질 자리가 없다.
function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
  const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), ...u16(0),
    ];
    chunks.push(new Uint8Array(local), nameBytes, data);
    central.push({ name: nameBytes, crc, size: data.length, offset });
    offset += local.length + nameBytes.length + data.length;
  }

  const dir = [];
  for (const e of central) {
    dir.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),
      ...u32(e.crc), ...u32(e.size), ...u32(e.size),
      ...u16(e.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(e.offset),
    ]), e.name);
  }
  const dirBytes = dir.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(central.length), ...u16(central.length),
    ...u32(dirBytes), ...u32(offset), ...u16(0),
  ]);
  return new Blob([...chunks, ...dir, end], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ── XML 조각 ──────────────────────────────────────────────────────── */
const xmlEsc = (v) => String(v === null || v === undefined ? '' : v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  // 엑셀이 못 읽는 제어문자를 걷어낸다(공고명에 섞여 들어온 적이 있다)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const colName = (n) => {
  let s = '';
  let i = n;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

/** 숫자로 넣을 값인지. 금액이 문자열로 들어가면 엑셀에서 계산이 안 된다. */
const isNumeric = (v) => typeof v === 'number' && Number.isFinite(v);

function sheetXml(rows, links, headerRows) {
  const linkRefs = new Set(links.map((l) => l.ref));
  const out = [];

  rows.forEach((row, r) => {
    const isHead = r < headerRows;
    const cells = row.map((cell, c) => {
      const ref = colName(c + 1) + (r + 1);
      if (cell === null || cell === undefined || cell === '') return '';
      if (isNumeric(cell)) return '<c r="' + ref + '" s="' + (isHead ? 1 : 0) + '"><v>' + cell + '</v></c>';
      const style = isHead ? 1 : (linkRefs.has(ref) ? 2 : 0);
      return '<c r="' + ref + '" t="inlineStr" s="' + style + '"><is><t xml:space="preserve">'
        + xmlEsc(cell) + '</t></is></c>';
    }).join('');
    out.push('<row r="' + (r + 1) + '">' + cells + '</row>');
  });

  const hyper = links.length
    ? '<hyperlinks>' + links.map((l) => '<hyperlink ref="' + l.ref + '" r:id="rId' + l.id + '"/>').join('') + '</hyperlinks>'
    : '';

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + '<sheetData>' + out.join('') + '</sheetData>' + hyper + '</worksheet>';
}

function relsXml(links) {
  const rels = links.map((l) => '<Relationship Id="rId' + l.id
    + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"'
    + ' Target="' + xmlEsc(l.url) + '" TargetMode="External"/>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + rels + '</Relationships>';
}

const CONTENT_TYPES = (n) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + Array.from({ length: n }, (_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1)
    + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
  + '</Types>';

// s=0 본문 · s=1 머리행(브랜드 네이비 바탕에 흰 글씨) · s=2 하이퍼링크(파랑·밑줄)
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="3">'
  + '<font><sz val="9"/><name val="맑은 고딕"/></font>'
  + '<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="맑은 고딕"/></font>'
  + '<font><u/><sz val="9"/><color rgb="FF0563C1"/><name val="맑은 고딕"/></font>'
  + '</fonts>'
  + '<fills count="3">'
  + '<fill><patternFill patternType="none"/></fill>'
  + '<fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/><bgColor indexed="64"/></patternFill></fill>'
  + '</fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  // ★ cellStyles 의 Normal 이 없으면 엑셀·openpyxl 이 「기본 스타일 없음」 경고를 낸다.
  + '<cellXfs count="3">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>'
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>'
  + '</cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

/**
 * 시트 여럿을 담은 .xlsx Blob 을 만든다.
 * sheets: [{ name, rows: [[셀, ...], ...], headerRows?, links?: [{row, col, url}] }]
 *   - 셀은 문자열이나 숫자. row·col 은 0부터 센다.
 *   - headerRows 를 넘기지 않으면 첫 줄 하나를 머리행으로 본다.
 */
export function buildWorkbook(sheets) {
  const files = [];

  files.push({ name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES(sheets.length)) });

  files.push({
    name: '_rels/.rels',
    data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>'),
  });

  files.push({
    name: 'xl/workbook.xml',
    data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheets.map((s, i) => '<sheet name="' + xmlEsc(s.name) + '" sheetId="' + (i + 1)
        + '" r:id="rId' + (i + 1) + '"/>').join('')
      + '</sheets></workbook>'),
  });

  files.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map((_, i) => '<Relationship Id="rId' + (i + 1)
        + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"'
        + ' Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (sheets.length + 1)
      + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>'),
  });

  files.push({ name: 'xl/styles.xml', data: enc.encode(STYLES) });

  sheets.forEach((s, i) => {
    const links = (s.links || [])
      .filter((l) => l && l.url)
      .map((l, n) => ({ ref: colName(l.col + 1) + (l.row + 1), url: l.url, id: n + 1 }));
    const headerRows = s.headerRows === undefined ? 1 : s.headerRows;
    files.push({
      name: 'xl/worksheets/sheet' + (i + 1) + '.xml',
      data: enc.encode(sheetXml(s.rows, links, headerRows)),
    });
    if (links.length) {
      files.push({
        name: 'xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels',
        data: enc.encode(relsXml(links)),
      });
    }
  });

  return zip(files);
}
