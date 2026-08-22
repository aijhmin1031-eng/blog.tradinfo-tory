// 관세청 품목별 국가별 수출입실적 — 주요 교역국의 월별 수출·수입·무역수지 수집
//   1) data/series/trade_<cc>.json 에 월별 누적 (exp/imp/bal, 달러)
//   2) src/data/trade.json (도토리 창고 국가별 무역수지 카드) 갱신
// 통관 통계 특성상 최근 1~2개월은 잠정치이며, 매 실행 시 재조회해 갱신한다.
// 사용: DATA_GO_KR_KEY=... node scripts/pipeline/trade.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const OUT = new URL('src/data/trade.json', ROOT);

const COUNTRIES = [
  { cc: 'US', name: '미국' },
  { cc: 'CN', name: '중국' },
  { cc: 'JP', name: '일본' },
  { cc: 'VN', name: '베트남' },
];
const MONTHS_BACK = 4; // 이번 달 포함 최근 4개월 재조회 (잠정치 갱신 겸용)

const yymm = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1] : null;
};

async function fetchMonth(cc, month) {
  const url =
    `https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList` +
    `?serviceKey=${KEY}&strtYymm=${month}&endYymm=${month}&cntyCd=${cc}&numOfRows=1&pageNo=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`관세청 ${cc} ${month} HTTP ${res.status}`);
  const xml = await res.text();
  const code = tag(xml, 'resultCode');
  if (code !== '00') throw new Error(`관세청 ${cc} ${month}: ${tag(xml, 'resultMsg')}`);
  // 첫 item 이 해당 월 총계다
  const item = xml.match(/<item>[\s\S]*?<\/item>/)?.[0];
  if (!item || tag(item, 'year') !== '총계') return null; // 아직 집계 전인 달
  const exp = Number(tag(item, 'expDlr'));
  const imp = Number(tag(item, 'impDlr'));
  if (!exp && !imp) return null;
  return { d: month, exp, imp, bal: Number(tag(item, 'balPayments')) };
}

async function accumulate(cc, name, fresh) {
  const file = new URL(`trade_${cc}.json`, SERIES_DIR);
  let stored = { id: `trade_${cc}`, name, unit: 'USD', cycle: 'M', points: [] };
  try {
    stored = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const map = new Map(stored.points.map((p) => [p.d, p]));
  for (const p of fresh) map.set(p.d, p);
  stored.points = [...map.values()].sort((a, b) => a.d.localeCompare(b.d));
  stored.updatedAt = new Date().toISOString().slice(0, 10);
  await writeFile(file, JSON.stringify(stored, null, 1) + '\n');
  return stored;
}

const eok = (v) => v / 1e8; // 억 달러

async function main() {
  if (!KEY) {
    console.log('[trade] DATA_GO_KR_KEY 미설정 — 건너뜀');
    return;
  }
  await mkdir(SERIES_DIR, { recursive: true });
  const months = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(yymm(d));
  }

  let out = { asOf: null, rows: [] };
  try {
    out = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {}

  try {
    const rows = [];
    for (const c of COUNTRIES) {
      const fresh = [];
      for (const m of months) {
        const p = await fetchMonth(c.cc, m);
        if (p) fresh.push(p);
      }
      const stored = await accumulate(c.cc, c.name, fresh);
      const last = stored.points[stored.points.length - 1];
      if (!last) continue;
      rows.push({
        cc: c.cc,
        name: c.name,
        month: `${last.d.slice(0, 4)}.${last.d.slice(4)}`,
        exp: +eok(last.exp).toFixed(1),
        imp: +eok(last.imp).toFixed(1),
        bal: +eok(last.bal).toFixed(1),
      });
      console.log(`[trade] ${c.name}: ${stored.points.length}개월 누적, 최신 ${last.d}`);
    }
    if (rows.length) {
      out.rows = rows;
      out.asOf = rows[0].month;
    }
  } catch (e) {
    console.log(`[trade] 수집 건너뜀(기존 유지): ${e.message}`);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('[trade] trade.json 갱신');
}

main().catch((e) => {
  console.error(`[trade] 실패(기존 데이터 유지): ${e.message}`);
});
