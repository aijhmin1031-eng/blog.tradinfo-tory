// 기업 데이터 수집 — DART 공시 + 무역 관련 대표주 시세
//   1) data/series/stk_<code>.json 에 종가 시계열 장기 누적
//   2) src/data/corp.json (도토리 창고의 관련주 타일·공시 목록) 갱신
// 키가 없거나 미승인이어도 실패하지 않고 기존 데이터를 유지한다.
// 사용: DART_API_KEY=... DATA_GO_KR_KEY=... node scripts/pipeline/corp.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// ★ 날짜는 KST 로 찍는다(2026-09-01 소유주 지시 「모든 일자는 한국 표준시로」).
// `new Date().toISOString()` 은 **UTC** 라, 06:50 KST 실행이 21:50 UTC 전날이므로
// **하루 전 날짜로 찍힌다.** 이 저장소의 모든 날짜는 KST 가 기준이다.
const todayKST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());


const DART = process.env.DART_API_KEY;
const DATAGO = process.env.DATA_GO_KR_KEY;
const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const CORP = new URL('src/data/corp.json', ROOT);

// 도토리경제 관심 종목 — 수출·무역의 대표 업종
// ★ 2026-09-06 수리 — **분석 대상의 주가를 받지 않고 있었다.**
//   이 목록이 대형주 여섯으로 손코딩돼 있었고, 정작 분석 보고서를 내는
//   대한광통신·서진시스템은 빠져 있었다. 그래서 낱장의 시가총액이 손으로 적은 값이었고
//   「분석 시점 주가」를 계산할 재료가 아예 없었다.
//   목록은 이제 `dart-corp.json` 한 곳에서 온다 — `analysis`(분석 대상)가 먼저다.
const REG = JSON.parse(await readFile(new URL('src/data/dart-corp.json', ROOT), 'utf8'));
const WATCHLIST = [
  ...(REG.analysis ?? []).map((c) => ({ code: c.stock, name: c.name, sector: c.role ?? c.theme ?? '분석 대상', analysis: true })),
  ...(REG.companies ?? []).map((c) => ({ code: c.stock, name: c.name, sector: c.sector })),
].filter((v, i, a) => a.findIndex((x) => x.code === v.code) === i);
// ★ DART 고유번호 표는 `src/data/dart-corp.json` 한 곳에만 있다.
//   이름이 아니라 고유번호로 부른다 — 이름 표기는 갈리지만(현대차/현대자동차)
//   고유번호는 하나다. 값은 corpCode.xml 에서 뽑아 CI 실호출로 확인했다(2026-09-01).
const DART_CORPS = REG.companies;

const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const fmtNum = (v, frac = 0) =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });

async function loadCorp() {
  try {
    return JSON.parse(await readFile(CORP, 'utf8'));
  } catch {
    return { asOf: null, stocks: [], disclosures: [] };
  }
}

/** 한 구간의 종가를 받는다. `beginBasDt`~`endBasDt` 는 금융위 API 의 조회 창이다. */
async function fetchWindow(item, begin, end) {
  const url =
    `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo` +
    `?serviceKey=${DATAGO}&resultType=json&numOfRows=400&pageNo=1&likeSrtnCd=${item.code}` +
    `&beginBasDt=${begin}&endBasDt=${end}`;
  // ★ 타임아웃이 없으면 게이트웨이가 죽은 날 소켓마다 매달린다(2026-09-06 실제 사고).
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await res.text();
  if (!res.ok || body.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
    throw new Error(`주식시세 ${item.name}: 키 미승인 또는 HTTP ${res.status}`);
  }
  const rows = JSON.parse(body)?.response?.body?.items?.item ?? [];
  return rows
    .filter((r) => r.srtnCd === item.code)
    .map((r) => ({ d: r.basDt, v: Number(r.clpr) }))
    .filter((p) => !Number.isNaN(p.v));
}

// ★ 씨앗 예산 — 이력이 짧은 종목만 과거를 채운다(2026-09-06 신설).
//   밸류에이션의 위치(「지금 PBR 이 자기 이력의 몇 번째인가」)를 내려면 몇 해치가 있어야 하는데
//   지금은 40일치뿐이었다. 한 번에 다 받지 않고 실행마다 조금씩 뒤로 판다 —
//   개발계정 일일 호출 한도를 한 번에 태우지 않기 위해서다.
const SEED_BUDGET = Number(process.env.STK_SEED_CALLS || 24);
const SEED_TARGET_DAYS = Number(process.env.STK_SEED_DAYS || 1825); // 5년
let seedUsed = 0;

async function fetchStock(item, stored) {
  const today = new Date();
  const points = [];

  // ① 최근분은 늘 받는다(45일 창).
  const recent = new Date(today); recent.setDate(recent.getDate() - 45);
  points.push(...(await fetchWindow(item, ymd(recent), ymd(today))));

  // ② 이력이 목표보다 짧으면 **가장 오래된 관측일 앞쪽으로** 반년씩 판다.
  //    분석 대상을 먼저 채운다 — 보고서가 그 값을 쓴다.
  const oldest = stored?.points?.[0]?.d;
  if (item.analysis || (stored?.points?.length ?? 0) < 200) {
    let cursor = oldest ? new Date(`${oldest.slice(0, 4)}-${oldest.slice(4, 6)}-${oldest.slice(6, 8)}`) : new Date(today);
    const floor = new Date(today); floor.setDate(floor.getDate() - SEED_TARGET_DAYS);
    while (cursor > floor && seedUsed < SEED_BUDGET) {
      const end = new Date(cursor); end.setDate(end.getDate() - 1);
      const begin = new Date(end); begin.setDate(begin.getDate() - 182);
      seedUsed += 1;
      try {
        const got = await fetchWindow(item, ymd(begin), ymd(end));
        if (!got.length) break;           // 상장 전까지 팠으면 그만둔다
        points.push(...got);
      } catch (e) {
        console.log(`[corp] ${item.name} 씨앗 중단: ${e.message.slice(0, 60)}`);
        break;
      }
      cursor = begin;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  if (!points.length) throw new Error(`주식시세 ${item.name}: empty`);
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

/** 이미 쌓인 종가 계열을 읽는다(없으면 null). 씨앗이 어디부터 팔지 정하는 데 쓴다. */
async function readSeries(code) {
  try {
    return JSON.parse(await readFile(new URL(`stk_${code}.json`, SERIES_DIR), 'utf8'));
  } catch { return null; }
}

async function accumulateStock(item, fresh) {
  const file = new URL(`stk_${item.code}.json`, SERIES_DIR);
  let stored = { id: `stk_${item.code}`, name: item.name, unit: '원', cycle: 'D', points: [] };
  try {
    stored = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const map = new Map(stored.points.map((p) => [p.d, p.v]));
  for (const p of fresh) map.set(p.d, p.v);
  stored.points = [...map.entries()].map(([d, v]) => ({ d, v })).sort((a, b) => a.d.localeCompare(b.d));
  stored.updatedAt = todayKST();
  await writeFile(file, JSON.stringify(stored, null, 1) + '\n');
  return stored;
}

const spark = (points, n = 9) => {
  const tail = points.slice(-n).map((x) => x.v);
  const lo = Math.min(...tail);
  const hi = Math.max(...tail);
  return tail.map((v) => Math.round(26 - ((v - lo) / (hi - lo || 1)) * 22));
};

// ★ 2026-09-01 재작성. 이 함수는 **줄곧 0건**을 돌려주고 있었다. 이유가 둘이었다.
//   ⓐ 코스피 전체 정기공시를 **100건만** 받아 그중에서 우리 6종목을 골랐다.
//      최근 7일 코스피 공시는 수백 건이라 우리 종목이 그 100건 안에 들 이유가 없다.
//   ⓑ 이름으로 걸렀는데 **DART 등록명이 다르다** — 우리는 「현대차」, DART 는 「현대자동차」다.
//   둘 다 `corp_code` 로 종목별로 부르면 사라진다(고유번호는 이름 표기와 무관하다).
//   CI 실호출로 확인했다(2026-09-01): 삼성전자 90일 858건 · SK하이닉스 71건 · 현대차 40건.
//
// 그리고 **정기보고서를 따로 표시한다.** 공시 목록의 대부분은
// 「임원ㆍ주요주주특정증권등소유상황보고서」라 「보고서」로 거르면 그것만 걸린다.
// 우리가 보는 것은 사업·반기·분기보고서 셋이다(2026-09-01 현재 최신은 8/14 제출 반기보고서).
const PERIODIC = /^\[?(기재정정)?\]?\s*(사업보고서|반기보고서|분기보고서)/;

async function fetchDart() {
  const end = new Date();
  const begin = new Date();
  begin.setDate(begin.getDate() - 30);
  const out = [];
  for (const c of DART_CORPS) {
    const url =
      `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART}` +
      `&corp_code=${c.corpCode}&bgn_de=${ymd(begin)}&end_de=${ymd(end)}&page_count=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`DART HTTP ${res.status}`);
    const data = await res.json();
    // 013 = 조회된 데이터 없음. 그 회사만 조용한 것이므로 나머지는 계속한다.
    if (data.status === '013') continue;
    if (data.status !== '000') throw new Error(`DART ${data.status} ${data.message}`);
    for (const r of data.list ?? []) {
      const title = r.report_nm.trim();
      out.push({
        date: r.rcept_dt,
        corp: c.name, // 우리 표기로 통일한다(DART 등록명은 「현대자동차」다)
        title,
        periodic: PERIODIC.test(title),
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`,
      });
    }
  }
  // 정기보고서를 앞에 세우고, 그다음 최신순.
  out.sort((a, b) => Number(b.periodic) - Number(a.periodic) || b.date.localeCompare(a.date));
  return out.slice(0, 10);
}

async function main() {
  await mkdir(SERIES_DIR, { recursive: true });
  const corp = await loadCorp();

  // 1) 관련주 시세
  if (DATAGO) {
    try {
      const stocks = [];
      for (const item of WATCHLIST) {
        // 기존 이력을 먼저 읽어 넘긴다 — 씨앗이 어디까지 팠는지 알아야 한다.
        const prevStored = await readSeries(item.code);
        const stored = await accumulateStock(item, await fetchStock(item, prevStored));
        const pts = stored.points;
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2] ?? last;
        const pct = ((last.v - prev.v) / prev.v) * 100;
        const tail = pts.slice(-9).map((x) => x.v);
        stocks.push({
          name: item.name,
          sector: item.sector,
          value: fmtNum(last.v),
          delta: `${Math.abs(pct).toFixed(2)}%`,
          dir: pct >= 0 ? 'up' : 'down',
          spark: spark(pts),
          sparkHi: fmtNum(Math.max(...tail)),
          sparkLo: fmtNum(Math.min(...tail)),
          basDt: last.d,
        });
        console.log(`[corp] ${item.name}: ${pts.length}개 누적, 최신 ${last.d}`);
      }
      corp.stocks = stocks;
      corp.asOf = stocks[0]?.basDt
        ? `${stocks[0].basDt.slice(0, 4)}-${stocks[0].basDt.slice(4, 6)}-${stocks[0].basDt.slice(6, 8)}`
        : corp.asOf;
    } catch (e) {
      console.log(`[corp] 주식시세 건너뜀(기존 유지): ${e.message}`);
    }
  } else {
    console.log('[corp] DATA_GO_KR_KEY 미설정 — 관련주 시세 건너뜀');
  }

  // 2) DART 공시
  if (DART) {
    try {
      corp.disclosures = await fetchDart();
      console.log(`[corp] DART 공시 ${corp.disclosures.length}건 (최근 7일, 관심 종목)`);
    } catch (e) {
      console.log(`[corp] DART 건너뜀(기존 유지): ${e.message}`);
    }
  } else {
    console.log('[corp] DART_API_KEY 미설정 — 공시 수집 건너뜀');
  }

  await writeFile(CORP, JSON.stringify(corp, null, 2) + '\n');
  console.log('[corp] corp.json 갱신');
}

main().catch((e) => {
  console.error(`[corp] 실패(기존 데이터 유지): ${e.message}`);
});
