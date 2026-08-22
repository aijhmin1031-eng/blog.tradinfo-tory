// 지표 자동 수집 파이프라인 (1단계: 환율 — 한국은행 ECOS)
// 사용: ECOS_API_KEY=... node scripts/fetch-indicators.mjs
// GitHub Actions에서는 저장소 Secrets(ECOS_API_KEY)로 주입한다.
// 키가 없으면 기존 src/data/indicators.json을 건드리지 않고 종료한다.
import { readFile, writeFile } from 'node:fs/promises';

const KEY = process.env.ECOS_API_KEY;
const OUT = new URL('../src/data/indicators.json', import.meta.url);

const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

async function fetchKrwUsd() {
  // ECOS 통계표 731Y001(주요국 환율), 항목 0000001(원/달러 매매기준율)
  const end = new Date();
  const start = new Date(end.getTime() - 45 * 24 * 3600 * 1000);
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${KEY}/json/kr/1/60/731Y001/D/${ymd(start)}/${ymd(end)}/0000001`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.StatisticSearch?.row;
  if (!rows?.length) throw new Error('ECOS: empty response');
  return rows.map((r) => ({ date: r.TIME, value: Number(r.DATA_VALUE) }));
}

async function main() {
  if (!KEY) {
    console.log('[fetch-indicators] ECOS_API_KEY 미설정 — 시드 데이터 유지');
    return;
  }
  const current = JSON.parse(await readFile(OUT, 'utf8'));
  try {
    const series = await fetchKrwUsd();
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const deltaPct = ((last.value - prev.value) / prev.value) * 100;
    const dir = deltaPct >= 0 ? 'up' : 'down';

    current.asOf = `${last.date.slice(0, 4)}-${last.date.slice(4, 6)}-${last.date.slice(6, 8)}`;
    current.note = 'ECOS 자동 수집 (원/달러) · 나머지 지표 파이프라인 확장 예정';

    const fmt = last.value.toLocaleString('ko-KR', { minimumFractionDigits: 2 });
    const tickerFx = current.ticker.find((t) => t.label === 'USD/KRW');
    if (tickerFx) Object.assign(tickerFx, { value: fmt, delta: `${Math.abs(deltaPct).toFixed(2)}%`, dir });

    const tileFx = current.tiles.find((t) => t.label === '원/달러 환율');
    if (tileFx) {
      const tail = series.slice(-9).map((s) => s.value);
      const lo = Math.min(...tail);
      const hi = Math.max(...tail);
      Object.assign(tileFx, {
        value: fmt,
        delta: `${Math.abs(deltaPct).toFixed(2)}%`,
        dir,
        spark: tail.map((v) => Math.round(26 - ((v - lo) / (hi - lo || 1)) * 22)),
      });
    }

    await writeFile(OUT, JSON.stringify(current, null, 2) + '\n');
    console.log(`[fetch-indicators] 갱신 완료 — 기준일 ${current.asOf}`);
  } catch (e) {
    console.error(`[fetch-indicators] 실패(기존 데이터 유지): ${e.message}`);
  }
}

main();
