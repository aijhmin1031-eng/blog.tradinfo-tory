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
  // 조회 기간을 늘려도 "1/200"(응답 200행 상한)에 잘려 실제로는 최근 200행만 왔었다.
  // 실사용 사례에서 1000행까지 문제없이 쓰이는 것을 확인해 페이지 크기도 함께 늘린다.
  // 조회 상한은 일간·월간 모두 10년으로 통일. 일간 10년(~3,650일)을 담으려면
  // 페이지 크기도 그만큼 넉넉히 잡아야 해서 4000으로 올린다(월간은 120개월로 여유 있음).
  start.setFullYear(start.getFullYear() - 10);
  const fmt = def.cycle === 'M' ? ym : ymd;
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS}/json/kr/1/4000/${def.stat}/${def.cycle}/${fmt(start)}/${fmt(end)}/${def.item}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECOS ${def.id} HTTP ${res.status}`);
  const rows = (await res.json())?.StatisticSearch?.row;
  if (!rows?.length) throw new Error(`ECOS ${def.id}: empty`);
  return rows
    .map((r) => ({ d: r.TIME, v: Number(r.DATA_VALUE) }))
    .filter((p) => !Number.isNaN(p.v));
}

async function fetchFred(def) {
  // 60개로 자르면 매일 쌓여도 늘 60일 근처에 머문다(accumulate가 과거치를 안 지우는 것과 무관하게,
  // 애초에 그만큼만 받아 오니까). 조회 상한은 ECOS와 맞춰 10년 — 일별 10년(~3,650일)을
  // 여유 있게 담도록 4000행을 요청해 다음 실행부터 깊이가 단번에 늘어나게 한다.
  // units 를 주면 FRED 가 변환값을 직접 준다(pc1 = 전년동기대비 %).
  // 물가는 지수보다 상승률로 읽는 것이 기사에 바로 쓰인다 — 우리가 계산하면
  // 기준월이 어긋날 위험이 있으므로 원 제공자의 계산을 그대로 쓴다.
  const unitsQ = def.units ? `&units=${def.units}` : '';
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${def.fred}&api_key=${FRED}&file_type=json&sort_order=desc&limit=4000${unitsQ}`;
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
// 스파크 고점·저점 라벨 — 큰 수는 정수, 작은 수는 소수 2자리
const fmtShort = (v) =>
  Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('ko-KR') : fmtNum(v);
const sparkHiLo = (s, n = 9) => {
  const tail = s.points.slice(-n).map((x) => x.v);
  return { sparkHi: fmtShort(Math.max(...tail)), sparkLo: fmtShort(Math.min(...tail)) };
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
    // 시리즈 하나가 실패해도(API 순간 오류 등) 나머지 수집·기존에 쌓인 값은 지켜야 한다.
    // 실패한 시리즈는 직전에 저장된 파일을 그대로 읽어 그 자리를 메운다.
    try {
      const fresh = def.source === 'FRED' ? await fetchFred(def) : await fetchEcos(def);
      acc[def.id] = await accumulate(def, fresh);
      console.log(`[collect] ${def.id}: ${acc[def.id].points.length}개 누적, 최신 ${lastV(acc[def.id]).d}`);
    } catch (e) {
      console.error(`[collect] ${def.id} 실패, 기존 값 유지: ${e.message}`);
      try {
        acc[def.id] = JSON.parse(await readFile(new URL(`${def.id}.json`, SERIES_DIR), 'utf8'));
      } catch {
        acc[def.id] = { id: def.id, name: def.name, unit: def.unit, cycle: def.cycle, points: [] };
      }
    }
  }

  // 파생: 한국 소비자물가 상승률 (전년동월대비)
  //
  // ★ 한국과 미국의 물가가 **다른 형태로 온다.** 미국은 FRED `units=pc1` 로 상승률(%)이
  // 바로 오는데, ECOS 소비자물가는 **지수**(2020=100)로 온다. 이름만 「상승률」로 붙여 두면
  // **지수 119.77 과 상승률 3.30% 를 나란히 놓는 사고**가 난다(실제로 처음에 그렇게 넣었다).
  // 그래서 지수는 지수로 두고, 상승률은 여기서 같은 달 전년 값과 나눠 파생 계열로 만든다.
  if (acc.cpi_kr?.points?.length) {
    const idx = new Map(acc.cpi_kr.points.map((p) => [p.d, p.v]));
    const yoyPoints = acc.cpi_kr.points
      .map((p) => {
        const prev = idx.get(String(Number(p.d.slice(0, 4)) - 1) + p.d.slice(4));
        return prev ? { d: p.d, v: +((p.v / prev - 1) * 100).toFixed(2) } : null;
      })
      .filter(Boolean);
    if (yoyPoints.length) {
      const out = { id: 'cpi_kr_yoy', name: '한국 소비자물가 상승률', unit: '%', cycle: 'M', points: yoyPoints, updatedAt: new Date().toISOString().slice(0, 10) };
      await writeFile(new URL('cpi_kr_yoy.json', SERIES_DIR), JSON.stringify(out) + '\n');
      console.log(`[collect] cpi_kr_yoy: ${yoyPoints.length}개 파생, 최신 ${yoyPoints[yoyPoints.length - 1].d} ${yoyPoints[yoyPoints.length - 1].v}%`);
    }
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
    { label: '원/달러 환율', value: fmtNum(lastV(acc.usdkrw).v), delta: `${Math.abs(d.krw).toFixed(2)}%`, dir: dir(d.krw), spark: spark(acc.usdkrw), ...sparkHiLo(acc.usdkrw) },
    { label: '한·미 금리차 (10Y)', value: `${lastV(gap).v > 0 ? '+' : ''}${fmtNum(lastV(gap).v)}%p`, delta: `${Math.abs(d.gapbp)}bp`, dir: dir(d.gapbp), spark: spark(gap), ...sparkHiLo(gap) },
    { label: 'KOSPI', value: fmtNum(lastV(acc.kospi).v), delta: `${Math.abs(d.kospi).toFixed(2)}%`, dir: dir(d.kospi), spark: spark(acc.kospi), ...sparkHiLo(acc.kospi) },
  ];
  await writeFile(INDICATORS, JSON.stringify(indicators, null, 2) + '\n');
  console.log(`[collect] indicators.json 갱신 — 기준일 ${indicators.asOf}`);
}

main().catch((e) => {
  console.error(`[collect] 실패(기존 데이터 유지): ${e.message}`);
});
