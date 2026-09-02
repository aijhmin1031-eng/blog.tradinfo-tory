// DART 재무제표 수집 — 기업 분석 섹션의 원자료
//   산출: data/corp-fs/<종목코드>.json (보고서별 전체계정 아카이브, git 이 이력을 갖는다)
//         data/series/fs_<종목코드>_<항목>.json (대표 항목의 분기 계열, 차트가 읽는다)
// 키가 없거나 실패해도 기존 데이터를 유지한다. 사용: DART_API_KEY=... node scripts/pipeline/dart-fs.mjs
//
// ── 이 파일을 고치기 전에 반드시 읽을 것: `docs/corp-analysis.md` 4-2 절 ──────────────
// ★ 분기·반기 보고서의 `thstrm_amount` 는 **그 분기 석 달만**이다. 누적은
//   `thstrm_add_amount` 라는 **별도 필드**로 온다(삼성전자 2026 반기 171.5조 / 305.4조).
//   갈라 저장하지 않으면 「반기 매출」이 2분기 값으로 나간다. 절대 규칙 2 가 걸리는 자리다.
// ★ 재무상태표의 「전기」는 전년 **동기가 아니라 전년 말**이다(제58기 반기말 ↔ 제57기말).
// ★ 응답에 **기간 종료일 필드가 없다.** 12월 결산이라고 가정하지 말 것 —
//   기업개황(`company.json`)의 `acc_mt`(결산월)를 받아 계산한다.
// ★ **손익 보고서의 이름이 회사마다 다르다**(2026-09-02 실측). 삼성전자는 「손익계산서」와
//   「포괄손익계산서」를 따로 내는데 **서진시스템은 「포괄손익계산서」 하나만 낸다.**
//   `sj_nm === '손익계산서'` 로만 거르면 **그 회사 매출이 통째로 사라진다.**
//   `sj_div` 로 가르는 것이 안전하다 — IS(손익계산서)·CIS(포괄손익계산서) 둘 다 받는다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const todayKST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

const DART = process.env.DART_API_KEY;
const ROOT = new URL('../../', import.meta.url);
const FS_DIR = new URL('data/corp-fs/', ROOT);
const SERIES_DIR = new URL('data/series/', ROOT);

// 보고서 4종. 코드는 DART 규약이고 분기 순서가 이 차례다.
const REPORTS = [
  { code: '11013', label: '1분기', q: 1 },
  { code: '11012', label: '반기', q: 2 },
  { code: '11014', label: '3분기', q: 3 },
  { code: '11011', label: '사업', q: 4 },
];

// 계열로 뽑을 대표 항목. 전체계정은 아카이브에 다 있고, 차트가 읽는 것은 이 셋이다.
// (계열을 항목마다 만들면 회사 하나에 수백 개가 된다 — 쌓기만 하고 아무도 안 보는 것을
//  이미 겪었다. `/numbers/` 신설 때 계열 40개 중 화면에 나오는 것이 9개뿐이었다.)
const HEADLINE = [
  { key: 'revenue', account: '매출액', name: '매출액' },
  { key: 'opinc', account: '영업이익', name: '영업이익' },
];

// 손익 보고서인가. 이름이 아니라 구분코드로 가른다(위 함정 참조).
const isIncome = (r) => r.sj === 'IS' || r.sj === 'CIS'
  || r.sjNm === '손익계산서' || r.sjNm === '포괄손익계산서';

const num = (v) => {
  if (v == null || v === '' || v === '-') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

async function dart(path, params) {
  const qs = new URLSearchParams({ crtfc_key: DART, ...params });
  const res = await fetch(`https://opendart.fss.or.kr/api/${path}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status === '013') return null; // 조회된 데이터 없음 — 아직 제출 전이면 정상이다
  if (data.status !== '000') throw new Error(`${data.status} ${data.message}`);
  return data;
}

// ★ 결산월을 받아 온다. 12월이라고 가정하지 않는다.
async function accMonth(corpCode) {
  const d = await dart('company.json', { corp_code: corpCode });
  const mt = Number(d?.acc_mt);
  if (!Number.isInteger(mt) || mt < 1 || mt > 12) throw new Error(`결산월을 못 읽었다: ${d?.acc_mt}`);
  return mt;
}

// 분기 끝 날짜 = 결산월 기준으로 q 번째 분기가 끝나는 달의 말일.
const endOfQuarter = (year, q, accMt) => {
  // 사업연도는 결산월에 끝난다. 1분기는 그로부터 9개월 전에 끝난다.
  const m = ((accMt - (4 - q) * 3 - 1 + 12 * 2) % 12) + 1;
  // 결산월보다 뒤의 달로 넘어가면 해가 하나 앞선다.
  const y = m > accMt ? year - 1 : year;
  return `${y}${String(m).padStart(2, '0')}${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

// 전체계정 한 벌. 필요한 필드만 남긴다(원본은 행마다 15개 필드인데 절반이 중복이다).
function slim(rows) {
  return rows.map((r) => ({
    sj: r.sj_div,
    sjNm: r.sj_nm,
    id: r.account_id,
    nm: r.account_nm,
    amount: num(r.thstrm_amount),
    cum: num(r.thstrm_add_amount),
    prev: num(r.frmtrm_amount),
    prevCum: num(r.frmtrm_add_amount),
    ord: Number(r.ord) || 0,
  }));
}

async function collectCompany(c) {
  const accMt = await accMonth(c.corpCode);
  if (accMt !== 12) console.log(`[dart-fs] ★ ${c.name} 결산월이 ${accMt}월이다 — 분기 끝 날짜를 확인할 것`);

  const file = new URL(`${c.stock}.json`, FS_DIR);
  let store = { stock: c.stock, corpCode: c.corpCode, name: c.name, accMonth: accMt, reports: [] };
  try { store = { ...store, ...JSON.parse(await readFile(file, 'utf8')) }; } catch {}
  const have = new Map(store.reports.map((r) => [`${r.year}-${r.reprt}`, r]));

  // 첫 수집이면 거슬러 올라가 채우고, 그다음부터는 최근 두 해만 다시 본다
  // (정정 공시가 나면 값이 바뀌므로 최근 것은 매번 덮어쓴다).
  const thisYear = Number(todayKST().slice(0, 4));
  const firstRun = store.reports.length === 0;
  const years = firstRun
    ? Array.from({ length: 6 }, (_, i) => String(thisYear - 5 + i))
    : [String(thisYear - 1), String(thisYear)];

  let added = 0;
  for (const year of years) {
    for (const rep of REPORTS) {
      const key = `${year}-${rep.code}`;
      // 첫 수집에서 이미 받아 둔 과거분은 건너뛴다(정정은 최근 두 해에서 잡힌다)
      if (have.has(key) && Number(year) < thisYear - 1) continue;

      const all = {};
      let rceptNo = null;
      let currency = null;
      let thstrmNm = null;
      for (const div of ['CFS', 'OFS']) {
        const d = await dart('fnlttSinglAcntAll.json', {
          corp_code: c.corpCode, bsns_year: year, reprt_code: rep.code, fs_div: div,
        });
        if (!d) continue;
        const rows = d.list ?? [];
        if (!rows.length) continue;
        all[div] = slim(rows);
        rceptNo ??= rows[0].rcept_no;
        currency ??= rows[0].currency;
        thstrmNm ??= rows[0].thstrm_nm;
      }
      if (!Object.keys(all).length) continue; // 아직 제출 전

      // ★ 전체계정에 누적 필드가 없으면 주요계정 API 로 메운다. 분기 값을
      //   틀리지 않는 것이 이 수집기에서 가장 중요하다(4-2 절).
      if (rep.code !== '11011' && !(all.CFS ?? []).some((r) => r.cum != null)) {
        const key3 = await dart('fnlttSinglAcnt.json', {
          corp_code: c.corpCode, bsns_year: year, reprt_code: rep.code,
        });
        for (const r of key3?.list ?? []) {
          const cum = num(r.thstrm_add_amount);
          if (cum == null) continue;
          const div = r.fs_nm === '연결재무제표' ? 'CFS' : 'OFS';
          // 주요계정은 「손익계산서」로 오는데 전체계정은 「포괄손익계산서」일 수 있다.
          // 이름을 맞추지 말고 **손익이면 이름만** 맞춘다.
          const hit = (all[div] ?? []).find((x) => x.nm === r.account_nm && isIncome(x));
          if (hit) { hit.cum = cum; hit.cumFrom = '주요계정'; }
        }
      }

      const entry = {
        year, reprt: rep.code, label: `${year} ${rep.label}`,
        quarter: rep.q, endDate: endOfQuarter(Number(year), rep.q, accMt),
        rceptNo, currency, thstrmNm,
        counts: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.length])),
        accounts: all,
      };
      have.set(key, entry);
      added++;
      console.log(`[dart-fs] ${c.name} ${entry.label}: CFS ${entry.counts.CFS ?? 0} · OFS ${entry.counts.OFS ?? 0} · 종료 ${entry.endDate}`);
    }
  }

  store.reports = [...have.values()].sort((a, b) => (a.year + a.reprt).localeCompare(b.year + b.reprt));
  store.updatedAt = todayKST();
  store.source = '금융감독원 DART (fnlttSinglAcntAll · fnlttSinglAcnt · company)';
  await writeFile(file, JSON.stringify(store, null, 1) + '\n');
  console.log(`[dart-fs] ${c.name}: 보고서 ${store.reports.length}건 (이번에 ${added}건)`);
  return store;
}

// 대표 항목을 분기 계열로 뽑는다. **값은 그 분기 석 달만**이다(누적이 아니다).
async function writeSeries(c, store) {
  for (const h of HEADLINE) {
    const points = [];
    for (const r of store.reports) {
      const row = (r.accounts.CFS ?? r.accounts.OFS ?? []).find(
        (x) => x.nm === h.account && isIncome(x),
      );
      if (!row) continue;
      // 사업보고서의 당기는 한 해 전체다. 4분기만 떼려면 3분기 누적을 빼야 하는데,
      // 그것은 우리가 만든 값이라 계열에 섞지 않는다(파생은 기사에서 따로 밝힌다).
      const v = r.reprt === '11011' ? null : row.amount;
      if (v == null) continue;
      points.push({ d: r.endDate, v: Math.round(v / 1e8) }); // 억원
    }
    if (!points.length) continue;
    const id = `fs_${c.stock}_${h.key}`;
    await writeFile(new URL(`${id}.json`, SERIES_DIR), JSON.stringify({
      id, name: `${c.name} ${h.name}`, unit: '억원', cycle: 'Q',
      note: '분기별 값(그 분기 석 달). 누적이 아니다.',
      updatedAt: todayKST(),
      points: points.sort((a, b) => a.d.localeCompare(b.d)),
    }, null, 1) + '\n');
    console.log(`[dart-fs] 계열 ${id}: ${points.length}개`);
  }
}

async function main() {
  if (!DART) { console.log('[dart-fs] DART_API_KEY 미설정 — 건너뜀'); return; }
  await mkdir(FS_DIR, { recursive: true });
  const reg = JSON.parse(await readFile(new URL('src/data/dart-corp.json', ROOT), 'utf8'));
  const targets = reg.analysis ?? [];
  if (!targets.length) { console.log('[dart-fs] 분석 대상이 없다 — dart-corp.json 의 analysis 를 채울 것'); return; }

  for (const c of targets) {
    try {
      const store = await collectCompany(c);
      await writeSeries(c, store);
    } catch (e) {
      // 한 회사가 실패해도 나머지를 계속한다(기존 파일은 그대로 남는다).
      console.log(`[dart-fs] ${c.name} 건너뜀(기존 유지): ${e.message}`);
    }
  }
}

main().catch((e) => console.error(`[dart-fs] 실패(기존 데이터 유지): ${e.message}`));
