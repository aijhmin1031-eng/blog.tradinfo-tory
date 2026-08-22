// 기업 데이터 수집 — DART 공시 + 무역 관련 대표주 시세
//   1) data/series/stk_<code>.json 에 종가 시계열 장기 누적
//   2) src/data/corp.json (도토리 창고의 관련주 타일·공시 목록) 갱신
// 키가 없거나 미승인이어도 실패하지 않고 기존 데이터를 유지한다.
// 사용: DART_API_KEY=... DATA_GO_KR_KEY=... node scripts/pipeline/corp.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const DART = process.env.DART_API_KEY;
const DATAGO = process.env.DATA_GO_KR_KEY;
const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const CORP = new URL('src/data/corp.json', ROOT);

// 무역토리 관심 종목 — 수출·무역의 대표 업종
const WATCHLIST = [
  { code: '005930', name: '삼성전자', sector: '반도체' },
  { code: '005380', name: '현대차', sector: '자동차' },
  { code: '011200', name: 'HMM', sector: '해운' },
  { code: '005490', name: 'POSCO홀딩스', sector: '철강' },
  { code: '373220', name: 'LG에너지솔루션', sector: '배터리' },
];
// DART corp_name 은 공시 서식 명칭 기준
const DART_NAMES = new Set(WATCHLIST.map((w) => w.name));

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

async function fetchStock(item) {
  const begin = new Date();
  begin.setDate(begin.getDate() - 45);
  const url =
    `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo` +
    `?serviceKey=${DATAGO}&resultType=json&numOfRows=60&likeSrtnCd=${item.code}&beginBasDt=${ymd(begin)}`;
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok || body.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
    throw new Error(`주식시세 ${item.name}: 키 미승인 또는 HTTP ${res.status}`);
  }
  const rows = JSON.parse(body)?.response?.body?.items?.item ?? [];
  const points = rows
    .filter((r) => r.srtnCd === item.code)
    .map((r) => ({ d: r.basDt, v: Number(r.clpr) }))
    .filter((p) => !Number.isNaN(p.v))
    .sort((a, b) => a.d.localeCompare(b.d));
  if (!points.length) throw new Error(`주식시세 ${item.name}: empty`);
  return points;
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
  stored.updatedAt = new Date().toISOString().slice(0, 10);
  await writeFile(file, JSON.stringify(stored, null, 1) + '\n');
  return stored;
}

const spark = (points, n = 9) => {
  const tail = points.slice(-n).map((x) => x.v);
  const lo = Math.min(...tail);
  const hi = Math.max(...tail);
  return tail.map((v) => Math.round(26 - ((v - lo) / (hi - lo || 1)) * 22));
};

async function fetchDart() {
  const end = new Date();
  const begin = new Date();
  begin.setDate(begin.getDate() - 7);
  const out = [];
  for (const ty of ['A', 'B']) {
    // A=정기공시, B=주요사항보고
    const url =
      `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART}` +
      `&bgn_de=${ymd(begin)}&end_de=${ymd(end)}&corp_cls=Y&pblntf_ty=${ty}&page_count=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`DART HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== '000' && data.status !== '013') throw new Error(`DART ${data.status} ${data.message}`);
    for (const r of data.list ?? []) {
      if (!DART_NAMES.has(r.corp_name)) continue;
      out.push({
        date: r.rcept_dt,
        corp: r.corp_name,
        title: r.report_nm.trim(),
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`,
      });
    }
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
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
        const stored = await accumulateStock(item, await fetchStock(item));
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
