// 지표 자동 수집 파이프라인 — 검증 완료 시계열 6종
//   ECOS(한국은행): 원/달러(731Y001·0000001), 원/100엔(731Y001·0000002),
//                   KOSPI(802Y001·0001000), 국고채 10년(817Y002·010210000)
//   FRED(미 연준):  미 국채 10년(DGS10), WTI(DCOILWTICO)
// 사용: ECOS_API_KEY=... FRED_API_KEY=... node scripts/fetch-indicators.mjs
// GitHub Actions에서는 저장소 Secrets로 주입. 키가 없으면 기존 데이터를 유지한 채 종료.
import { readFile, writeFile } from 'node:fs/promises';

const ECOS = process.env.ECOS_API_KEY;
const FRED = process.env.FRED_API_KEY;
const OUT = new URL('../src/data/indicators.json', import.meta.url);

const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

async function ecosSeries(stat, item) {
  const end = new Date();
  const start = new Date(end.getTime() - 45 * 24 * 3600 * 1000);
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS}/json/kr/1/60/${stat}/D/${ymd(start)}/${ymd(end)}/${item}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECOS ${stat}/${item} HTTP ${res.status}`);
  const rows = (await res.json())?.StatisticSearch?.row;
  if (!rows?.length) throw new Error(`ECOS ${stat}/${item}: empty`);
  return rows.map((r) => ({ date: r.TIME, value: Number(r.DATA_VALUE) })).filter((r) => !Number.isNaN(r.value));
}

async function fredSeries(id) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED}&file_type=json&sort_order=desc&limit=40`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${id} HTTP ${res.status}`);
  const obs = (await res.json())?.observations;
  if (!obs?.length) throw new Error(`FRED ${id}: empty`);
  return obs
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date.replaceAll('-', ''), value: Number(o.value) }))
    .reverse();
}

const last = (s) => s[s.length - 1];
const prev = (s) => s[s.length - 2];
const pctDelta = (s) => ((last(s).value - prev(s).value) / prev(s).value) * 100;
const fmtNum = (v, frac = 2) =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
const spark = (s, n = 9) => {
  const tail = s.slice(-n).map((x) => x.value);
  const lo = Math.min(...tail);
  const hi = Math.max(...tail);
  return tail.map((v) => Math.round(26 - ((v - lo) / (hi - lo || 1)) * 22));
};
const dirOf = (d) => (d >= 0 ? 'up' : 'down');
const isoDate = (t) => `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;

async function main() {
  if (!ECOS || !FRED) {
    console.log('[fetch-indicators] API 키 미설정 — 기존 데이터 유지');
    return;
  }
  const current = JSON.parse(await readFile(OUT, 'utf8'));
  try {
    const [krw, jpy, kospi, ktb10, dgs10, wti] = await Promise.all([
      ecosSeries('731Y001', '0000001'),
      ecosSeries('731Y001', '0000002'),
      ecosSeries('802Y001', '0001000'),
      ecosSeries('817Y002', '010210000'),
      fredSeries('DGS10'),
      fredSeries('DCOILWTICO'),
    ]);

    // 한·미 금리차(10Y): 공통 날짜만 짝지어 계산
    const usMap = new Map(dgs10.map((x) => [x.date, x.value]));
    const gap = ktb10
      .filter((x) => usMap.has(x.date))
      .map((x) => ({ date: x.date, value: +(x.value - usMap.get(x.date)).toFixed(2) }));

    const d = {
      krw: pctDelta(krw),
      jpy: pctDelta(jpy),
      kospi: pctDelta(kospi),
      wti: pctDelta(wti),
      us10bp: Math.round((last(dgs10).value - prev(dgs10).value) * 100),
      gapbp: gap.length > 1 ? Math.round((last(gap).value - prev(gap).value) * 100) : 0,
    };

    current.asOf = isoDate(last(krw).date);
    current.note = 'ECOS·FRED 자동 수집 (환율·엔화·KOSPI·국고채10Y·美10Y·WTI)';
    current.ticker = [
      { label: 'USD/KRW', value: fmtNum(last(krw).value), delta: `${Math.abs(d.krw).toFixed(2)}%`, dir: dirOf(d.krw) },
      { label: 'JPY100', value: fmtNum(last(jpy).value), delta: `${Math.abs(d.jpy).toFixed(2)}%`, dir: dirOf(d.jpy) },
      { label: 'WTI', value: `$${fmtNum(last(wti).value)}`, delta: `${Math.abs(d.wti).toFixed(2)}%`, dir: dirOf(d.wti) },
      { label: 'KOSPI', value: fmtNum(last(kospi).value), delta: `${Math.abs(d.kospi).toFixed(2)}%`, dir: dirOf(d.kospi) },
      { label: '美 10Y', value: `${fmtNum(last(dgs10).value)}%`, delta: `${Math.abs(d.us10bp)}bp`, dir: dirOf(d.us10bp) },
      { label: '국고채 10Y', value: `${fmtNum(last(ktb10).value)}%`, delta: '', dir: dirOf(0) },
    ];
    current.tiles = [
      { label: '원/달러 환율', value: fmtNum(last(krw).value), delta: `${Math.abs(d.krw).toFixed(2)}%`, dir: dirOf(d.krw), spark: spark(krw) },
      { label: '한·미 금리차 (10Y)', value: `${last(gap).value > 0 ? '+' : ''}${fmtNum(last(gap).value)}%p`, delta: `${Math.abs(d.gapbp)}bp`, dir: dirOf(d.gapbp), spark: spark(gap) },
      { label: 'KOSPI', value: fmtNum(last(kospi).value), delta: `${Math.abs(d.kospi).toFixed(2)}%`, dir: dirOf(d.kospi), spark: spark(kospi) },
    ];

    await writeFile(OUT, JSON.stringify(current, null, 2) + '\n');
    console.log(`[fetch-indicators] 갱신 완료 — 기준일 ${current.asOf}`);
  } catch (e) {
    console.error(`[fetch-indicators] 실패(기존 데이터 유지): ${e.message}`);
    process.exitCode = 0;
  }
}

main();
