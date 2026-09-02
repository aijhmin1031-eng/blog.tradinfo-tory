// DART 보고서 원문에서 **절을 잘라 보관한다** — 기업 분석 1장(사업의 내용)의 재료.
//   산출: data/corp-text/<종목코드>.json
// 사용: DART_API_KEY=... node scripts/pipeline/dart-text.mjs
//
// ── 왜 원문을 받는가 (docs/corp-analysis.md 8-1 절) ────────────────────────────
// 소유주 지시(2026-09-02): 「사업내용이 반드시 포함되어야 하고 매우 중요한 항목이니
// 정성을 들여서 해석해 달라.」 그래서 어제 적어 둔 「서술은 1단계에 필요 없다」가 뒤집혔다.
//
// ★ **요약하려고 받는 것이 아니다.** 요약은 AI 가 이미 하는 일이고 원문은 공개돼 있다.
//   받는 이유는 **대조**다 — 딱지와 매출 · 말과 숫자 · 원재료와 거시 · 작년 원문과의 차이.
//   그래서 **직전 연도 같은 기간 보고서도 함께 받는다**(넷째 대조가 그것 없이는 불가능하다).
//
// ★ 원문 전체(6.8MB)는 저장소에 넣지 않는다. 절만 잘라 접수번호·받은 날짜와 함께 남긴다.
//   접수번호가 있으면 언제든 다시 받을 수 있고, 출처도 그것으로 댄다.
// ★ DART 처리량이 들쭉날쭉하다(2026-09-02 실측 15KB/초). 한 번에 몰아 받지 않는다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const todayKST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const DART = process.env.DART_API_KEY;
const ROOT = new URL('../../', import.meta.url);
const FS_DIR = new URL('data/corp-fs/', ROOT);
const OUT_DIR = new URL('data/corp-text/', ROOT);

// 정기보고서의 절 차례. 로마숫자 + 이름으로 경계를 잡는다.
// ★ 경계를 못 찾으면 **자르지 않고 못 찾았다고 남긴다.** 엉뚱한 데서 잘린 글을
//   기사 재료로 쓰면 절대 규칙 2 가 무너진다. 빈 것이 틀린 것보다 낫다.
const SECTIONS = [
  // ★ 서진시스템 본문에는 「II. 사업의 내용」 제목이 없고 머리글로만 나온다(2026-09-02 실측).
  //   그래서 시작 표지를 여럿 두고 **먼저 걸리는 것**을 쓴다. 「1. 사업의 개요」가 되돌아갈 자리다.
  { key: 'business', name: '사업의 내용',
    from: [/(?:^|\s)(?:II|Ⅱ)\s*[.．]\s*사업의\s*내용/, /(?:^|\s)1\s*[.．]\s*사업의\s*개요/],
    to: /(?:^|\s)(?:III|Ⅲ)\s*[.．]\s*재무에\s*관한\s*사항/ },
  { key: 'mdna', name: '이사의 경영진단 및 분석의견',
    from: [/(?:^|\s)(?:IV|Ⅳ)\s*[.．]\s*이사의\s*경영진단/],
    to: /(?:^|\s)(?:V|Ⅴ)\s*[.．]\s*회계감사인/ },
  { key: 'shareholders', name: '주주에 관한 사항',
    from: [/(?:^|\s)(?:VII|Ⅶ)\s*[.．]\s*주주에\s*관한\s*사항/],
    to: /(?:^|\s)(?:VIII|Ⅷ)\s*[.．]\s*임원\s*및\s*직원/ },
];

// ★ 추측을 반복하지 않기 위해, 후보 표지가 문서 어디에 몇 번 나오는지 함께 남긴다.
//   text-parsing 은 눈으로 봐야 알 수 있고, CI 왕복은 한 번에 4분이 든다.
const ANCHORS = [
  ['II.사업의내용', /(?:^|\s)(?:II|Ⅱ)\s*[.．]\s*사업의\s*내용/],
  ['1.사업의개요', /(?:^|\s)1\s*[.．]\s*사업의\s*개요/],
  ['2.주요제품', /(?:^|\s)2\s*[.．]\s*주요\s*제품/],
  ['III.재무에관한사항', /(?:^|\s)(?:III|Ⅲ)\s*[.．]\s*재무에\s*관한\s*사항/],
  ['VII.주주에관한사항', /(?:^|\s)(?:VII|Ⅶ)\s*[.．]\s*주주에\s*관한\s*사항/],
];

async function fetchDoc(rceptNo) {
  const res = await fetch(`https://opendart.fss.or.kr/api/document.xml?crtfc_key=${DART}&rcept_no=${rceptNo}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`응답이 너무 작다(${buf.length}B) — ${buf.toString('utf8').slice(0, 200)}`);
  const dir = `/tmp/dart-doc-${rceptNo}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await writeFile(`${dir}/doc.zip`, buf);
  execFileSync('bash', ['-lc', `cd ${dir} && unzip -o -q doc.zip`], { stdio: 'ignore', timeout: 60000 });
  const f = readdirSync(dir).find((x) => /\.xml$/i.test(x));
  if (!f) throw new Error('압축 안에 xml 이 없다');
  const raw = readFileSync(`${dir}/${f}`, 'utf8');
  rmSync(dir, { recursive: true, force: true });
  return { raw, zipBytes: buf.length };
}

// 태그를 벗겨 사람이 읽는 글로 만든다. 표는 칸을 공백으로 남긴다.
const strip = (xml) =>
  xml
    .replace(/<\s*(br|BR)\s*\/?>/g, '\n')
    .replace(/<\/\s*(TR|tr|P|p|TITLE|title)\s*>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;?/g, ' ')
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ★ **목차를 본문으로 착각하지 않는다**(2026-09-02 사고 두 번).
//   정기보고서 앞머리에는 「II. 사업의 내용 ----------- 12」 같은 차례가 있어
//   절 이름이 문서에 여러 번 나온다. 게다가 **절 이름이 쪽 머리글로도 반복된다.**
//   1판: 첫 번째(차례)를 잡아 「주주에 관한 사항」이 46자로 잘렸다.
//   2판: 차례 구간을 길이 비율로 건너뛰었더니 **진짜 시작점을 지나쳐** 서진시스템이
//        「신용평가에 관한 사항」부터 시작했다(구간을 추측한 것이 잘못이었다).
//   3판: 구간을 추측하지 않고 **차례 줄 자체를 알아본다** — 차례는 이름 뒤 120자
//        안에 긴 점선이 따라온다. 그런 자리는 건너뛰고 첫 번째 본문 자리를 쓴다.
const isTocLine = (text, i) => /-{10,}/.test(text.slice(i, i + 120));

// ★ **상호참조를 절 제목으로 착각하지 않는다**(2026-09-02, 표지 위치를 찍어 보고 갈렸다).
//   서진시스템 2026 반기에서 「II. 사업의 내용」이 세 곳에 나왔다 —
//     748   차례      「II. 사업의 내용 -------- 12」
//     2,879 상호참조  「II. 사업의 내용 ]을 참조하시기 바랍니다」  ← 3판이 이걸 잡았다
//     10,791 본문     「II. 사업의 내용 1. 사업의 개요 당사는 글로벌 메탈 플랫폼…」
//   가르는 표는 **바로 뒤에 하위 첫 항목 「1.」이 오는가**다. 상호참조는 「]」나 「-」가 따라온다.
const isRealHeading = (text, i) =>
  /^[^\]\-]{0,30}?\s1\s*[.．]\s*[가-힣]/.test(text.slice(i, i + 80).replace(/\s+/g, ' '));

function findAll(text, re) {
  const g = new RegExp(re.source, 'g');
  const out = [];
  let m;
  while ((m = g.exec(text)) !== null && out.length < 500) {
    out.push(m.index);
    if (g.lastIndex === m.index) g.lastIndex++;
  }
  return out;
}

function cut(text, sec) {
  // 시작 표지 여럿 중 **먼저 걸리는 것**을 쓴다.
  let starts = [];
  let usedFrom = -1;
  for (let k = 0; k < sec.from.length; k++) {
    const hit = findAll(text, sec.from[k]).filter((i) => !isTocLine(text, i) && isRealHeading(text, i));
    if (hit.length) { starts = hit; usedFrom = k; break; }
  }
  if (!starts.length) return { found: false, why: '시작 표지가 차례 밖에 없다' };
  const a = starts[0];
  const ends = findAll(text, sec.to).filter((i) => i > a + 300 && !isTocLine(text, i) && isRealHeading(text, i));
  if (!ends.length) return { found: false, why: '끝 표지를 못 찾았다' };
  const out = text.slice(a, ends[0]).trim();
  // 자르지 않고 알리는 편이 낫다 — 엉뚱하게 잘린 글을 기사 재료로 쓰면 절대 규칙 2 가 무너진다.
  if (out.length < 300) return { found: false, why: `잘린 글이 너무 짧다(${out.length}자)` };
  return { found: true, at: a, text: out, headerRepeats: starts.length, usedFrom };
}

async function main() {
  if (!DART) { console.log('[dart-text] DART_API_KEY 미설정 — 건너뜀'); return; }
  await mkdir(OUT_DIR, { recursive: true });
  const reg = JSON.parse(await readFile(new URL('src/data/dart-corp.json', ROOT), 'utf8'));

  for (const c of reg.analysis ?? []) {
    let store = { stock: c.stock, name: c.name, docs: [] };
    const out = new URL(`${c.stock}.json`, OUT_DIR);
    try { store = { ...store, ...JSON.parse(await readFile(out, 'utf8')) }; } catch {}
    const have = new Set(store.docs.map((d) => d.rceptNo));

    const arch = JSON.parse(await readFile(new URL(`${c.stock}.json`, FS_DIR), 'utf8'));
    // 최신 정기보고서와 **직전 연도 같은 기간** 둘을 받는다(넷째 대조에 필요하다).
    const withNo = arch.reports.filter((r) => r.rceptNo).sort((a, b) => b.endDate.localeCompare(a.endDate));
    const latest = withNo[0];
    const yearAgo = latest && withNo.find((r) => r.reprt === latest.reprt && r.year === String(Number(latest.year) - 1));
    const want = [latest, yearAgo].filter(Boolean).filter((r) => !have.has(r.rceptNo));
    if (!want.length) { console.log(`[dart-text] ${c.name}: 새로 받을 원문 없음`); continue; }

    for (const r of want) {
      try {
        const t0 = Date.now();
        const { raw, zipBytes } = await fetchDoc(r.rceptNo);
        const text = strip(raw);
        const doc = {
          rceptNo: r.rceptNo, label: r.label, endDate: r.endDate,
          fetchedAt: todayKST(),
          zipBytes, rawChars: raw.length, textChars: text.length,
          sections: {},
          anchors: Object.fromEntries(ANCHORS.map(([nm, re]) => [nm,
            findAll(text, re).slice(0, 8).map((i) => ({ at: i, toc: isTocLine(text, i), ctx: text.slice(i, i + 70).replace(/\s+/g, ' ') })),
          ])),
        };
        for (const sec of SECTIONS) {
          const got = cut(text, sec);
          doc.sections[sec.key] = got.found
            ? { name: sec.name, chars: got.text.length, headerRepeats: got.headerRepeats, usedFrom: got.usedFrom, text: got.text }
            : { name: sec.name, chars: 0, missing: got.why };
          console.log(`[dart-text] ${c.name} ${r.label} · ${sec.name}: ${got.found ? `${got.text.length.toLocaleString()}자` : `★ ${got.why}`}`);
        }
        store.docs.push(doc);
        console.log(`[dart-text] ${c.name} ${r.label} 받음 — ZIP ${(zipBytes / 1024).toFixed(0)}KB · 본문 ${text.length.toLocaleString()}자 · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
      } catch (e) {
        console.log(`[dart-text] ${c.name} ${r.label} 건너뜀: ${e.message}`);
      }
    }
    store.docs.sort((a, b) => b.endDate.localeCompare(a.endDate));
    store.updatedAt = todayKST();
    store.source = '금융감독원 DART 전자공시 원문(document.xml)';
    await writeFile(out, JSON.stringify(store, null, 1) + '\n');
  }
}

main().catch((e) => console.error(`[dart-text] 실패(기존 유지): ${e.message}`));
