// 수집·축적 단계 — data/sources.json에 정의된 모든 시계열을 수집해
//   1) data/series/<id>.json 에 장기 누적 (git이 이력 관리 — 블로그의 데이터 자산)
//   2) src/data/indicators.json (티커·타일) 갱신
// 사용: ECOS_API_KEY=... FRED_API_KEY=... node scripts/pipeline/collect.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const ECOS = process.env.ECOS_API_KEY;
const FRED = process.env.FRED_API_KEY;
const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const INDICATORS = new URL('src/data/indicators.json', ROOT);

const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const ym = (d) => ymd(d).slice(0, 6);

async function fetchEcos(def) {
  const end = new Date();
  const start = new Date(end.getTime() * 1); // copy
  if (def.cycle === 'M') start.setMonth(start.getMonth() - 26);
  else start.setDate(start.getDate() - 70);
  const fmt = def.cycle === 'M' ? ym : ymd;
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS}/json/kr/1/200/${def.stat}/${def.cycle}/${fmt(start)}/${fmt(end)}/${def.item}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECOS ${def.id} HTTP ${res.status}`);
  const rows = (await res.json())?.StatisticSearch?.row;
  if (!rows?.length) throw new Error(`ECOS ${def.id}: empty`);
  return rows
    .map((r) => ({ d: r.TIME, v: Number(r.DATA_VALUE) }))
    .filter((p) => !Number.isNaN(p.v));
}

async function fetchFred(def) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${def.fred}&api_key=${FRED}&file_type=json&sort_order=desc&limit=60`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${def.id} HTTP ${res.status}`);
  const obs = (await res.json())?.observations;
  if (!obs?.length) throw new Error(`FRED ${def.id}: empty`);
  return obs
    .filter((o) => o.value !== '.')
    .map((o) => ({ d: o.date.replaceAll('-', ''), v: Number(o.value) }))
    .reverse();
}

async function accumulate(def, fresh) {
  const file = new URL(`${def.id}.json`, SERIES_DIR);
  let stored = { id: def.id, name: def.name, unit: def.unit, cycle: def.cycle, points: [] };
  try {
    stored = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const map = new Map(stored.points.map((p) => [p.d, p.v]));
  for (const p of fresh) map.set(p.d, p.v);
  stored.points = [...map.entries()]
    .map(([d, v]) => ({ d, v }))
    .sort((a, b) => a.d.localeCompare(b.d));
  stored.updatedAt = new Date().toISOString().slice(0, 10);
  await writeFile(file, JSON.stringify(stored, null, 1) + '\n');
  return stored;
}

const lastV = (s) => s.points[s.points.length - 1];
const prevV = (s) => s.points[s.points.length - 2];
const fmtNum = (v, frac = 2) =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
const spark = (s, n = 9) => {
  const tail = s.points.slice(-n).map((x) => x.v);
  const lo = Math.min(...tail);
  const hi = Math.max(...tail);
  return tail.map((v) => Math.round(26 - ((v - lo) / (hi - lo || 1)) * 22));
};

async function main() {
  if (!ECOS || !FRED) {
    console.log('[collect] API 키 미설정 — 기존 데이터 유지');
    return;
  }
  await mkdir(SERIES_DIR, { recursive: true });
  const defs = JSON.parse(await readFile(new URL('data/sources.json', ROOT), 'utf8')).series;

  const acc = {};
  for (const def of defs) {
    const fresh = def.source === 'FRED' ? await fetchFred(def) : await fetchEcos(def);
    acc[def.id] = await accumulate(def, fresh);
    console.log(`[collect] ${def.id}: ${acc[def.id].points.length}개 누적, 최신 ${lastV(acc[def.id]).d}`);
  }

  // 파생: 한·미 금리차 (공통 날짜)
  const usMap = new Map(acc.us10y.points.map((p) => [p.d, p.v]));
  const gapPoints = acc.ktb10y.points
    .filter((p) => usMap.has(p.d))
    .map((p) => ({ d: p.d, v: +(p.v - usMap.get(p.d)).toFixed(2) }));
  const gap = { points: gapPoints };

  const pct = (s) => ((lastV(s).v - prevV(s).v) / prevV(s).v) * 100;
  const dir = (x) => (x >= 0 ? 'up' : 'down');
  const d = {
    krw: pct(acc.usdkrw),
    jpy: pct(acc.jpy100),
    kospi: pct(acc.kospi),
    wti: pct(acc.wti),
    us10bp: Math.round((lastV(acc.us10y).v - prevV(acc.us10y).v) * 100),
    gapbp: gapPoints.length > 1 ? Math.round((lastV(gap).v - prevV(gap).v) * 100) : 0,
  };

  const indicators = JSON.parse(await readFile(INDICATORS, 'utf8'));
  const t = lastV(acc.usdkrw).d;
  indicators.asOf = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  indicators.note = 'ECOS·FRED 자동 수집 — data/series/ 에 장기 축적';
  indicators.ticker = [
    { label: 'USD/KRW', value: fmtNum(lastV(acc.usdkrw).v), delta: `${Math.abs(d.krw).toFixed(2)}%`, dir: dir(d.krw) },
    { label: 'JPY100', value: fmtNum(lastV(acc.jpy100).v), delta: `${Math.abs(d.jpy).toFixed(2)}%`, dir: dir(d.jpy) },
    { label: 'WTI', value: `$${fmtNum(lastV(acc.wti).v)}`, delta: `${Math.abs(d.wti).toFixed(2)}%`, dir: dir(d.wti) },
    { label: 'KOSPI', value: fmtNum(lastV(acc.kospi).v), delta: `${Math.abs(d.kospi).toFixed(2)}%`, dir: dir(d.kospi) },
    { label: '美 10Y', value: `${fmtNum(lastV(acc.us10y).v)}%`, delta: `${Math.abs(d.us10bp)}bp`, dir: dir(d.us10bp) },
    { label: '국고채 10Y', value: `${fmtNum(lastV(acc.ktb10y).v)}%`, delta: '', dir: 'up' },
  ];
  indicators.tiles = [
    { label: '원/달러 환율', value: fmtNum(lastV(acc.usdkrw).v), delta: `${Math.abs(d.krw).toFixed(2)}%`, dir: dir(d.krw), spark: spark(acc.usdkrw) },
    { label: '한·미 금리차 (10Y)', value: `${lastV(gap).v > 0 ? '+' : ''}${fmtNum(lastV(gap).v)}%p`, delta: `${Math.abs(d.gapbp)}bp`, dir: dir(d.gapbp), spark: spark(gap) },
    { label: 'KOSPI', value: fmtNum(lastV(acc.kospi).v), delta: `${Math.abs(d.kospi).toFixed(2)}%`, dir: dir(d.kospi), spark: spark(acc.kospi) },
  ];
  await writeFile(INDICATORS, JSON.stringify(indicators, null, 2) + '\n');
  console.log(`[collect] indicators.json 갱신 — 기준일 ${indicators.asOf}`);
}

main().catch((e) => {
  console.error(`[collect] 실패(기존 데이터 유지): ${e.message}`);
});
