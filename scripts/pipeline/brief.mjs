// 가공·발행 단계 — data/series/ 축적분에서 규칙 기반 데일리 브리핑을 생성한다.
//   산출물: src/content/briefs/<YYYY-MM-DD>.json (기준일 = 최신 영업일)
//   같은 날짜가 이미 있으면 덮어쓴다(멱등). 문장은 결정론적 규칙으로 생성 — 추측·전망 없음.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const OUT_DIR = new URL('src/content/briefs/', ROOT);

const load = async (id) => JSON.parse(await readFile(new URL(`${id}.json`, SERIES_DIR), 'utf8'));
const last = (s) => s.points[s.points.length - 1];
const prev = (s) => s.points[s.points.length - 2];
const fmtNum = (v, frac = 2) =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
const iso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
const kdate = (d) => `${Number(d.slice(4, 6))}월 ${Number(d.slice(6, 8))}일`;

function moveWord(pct) {
  const a = Math.abs(pct);
  if (a < 0.05) return '보합권에 머물렀습니다';
  const dir = pct > 0 ? '올랐습니다' : '내렸습니다';
  if (a >= 1.5) return `큰 폭으로 ${dir}`;
  if (a >= 0.5) return dir;
  return `소폭 ${dir}`;
}

async function main() {
  const [krw, jpy, kospi, ktb, us10, wti] = await Promise.all(
    ['usdkrw', 'jpy100', 'kospi', 'ktb10y', 'us10y', 'wti'].map(load)
  );
  const date = last(krw).d; // 기준일 = 환율 최신 영업일
  const gap = +(last(ktb).v - [...us10.points].reverse().find((p) => p.d <= date).v).toFixed(2);

  const pct = (s) => ((last(s).v - prev(s).v) / prev(s).v) * 100;
  const items = [
    { id: 'usdkrw', label: '원/달러 환율', unit: '원', s: krw, frac: 2 },
    { id: 'jpy100', label: '원/100엔 환율', unit: '원', s: jpy, frac: 2 },
    { id: 'kospi', label: 'KOSPI', unit: '', s: kospi, frac: 2 },
    { id: 'wti', label: 'WTI 유가', unit: '달러', s: wti, frac: 2 },
  ];
  const movers = items.map((it) => {
    const p = pct(it.s);
    return {
      label: it.label,
      value: `${fmtNum(last(it.s).v, it.frac)}${it.unit === '달러' ? '달러' : it.unit}`,
      delta: `${Math.abs(p).toFixed(2)}%`,
      dir: p >= 0 ? 'up' : 'down',
      pct: p,
    };
  });
  const top = [...movers].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];

  const summary = [
    `${kdate(date)} 시장에서 가장 큰 움직임은 ${top.label}이었습니다. 전일 대비 ${top.dir === 'up' ? '+' : '-'}${top.delta}, ${fmtNum(last(items.find((i) => i.label === top.label).s).v)}${top.label.includes('환율') ? '원' : top.label === 'WTI 유가' ? '달러' : ''}로 마감했습니다.`,
    `원/달러 환율은 ${fmtNum(last(krw).v)}원으로 전일 대비 ${moveWord(pct(krw))}. 원/100엔 환율은 ${fmtNum(last(jpy).v)}원을 기록했습니다.`,
    `금리는 국고채 10년 ${fmtNum(last(ktb).v)}%, 미 국채 10년 ${fmtNum(last(us10).v)}% — 한·미 격차는 ${gap > 0 ? '+' : ''}${fmtNum(gap)}%p입니다.`,
  ];

  const chartPoints = krw.points.slice(-20);
  const lo = Math.min(...chartPoints.map((p) => p.v));
  const hi = Math.max(...chartPoints.map((p) => p.v));
  const mid = Math.round((lo + hi) / 2 / 5) * 5;
  const brief = {
    date: iso(date),
    title: `${kdate(date)} 데일리 브리핑`,
    summary,
    movers: movers.map(({ pct, ...rest }) => rest),
    chart: {
      title: `원/달러 환율 — 최근 20영업일 (${fmtNum(last(krw).v)}원)`,
      unit: '원',
      values: chartPoints.map((p) => p.v),
      yTicks: [Math.round(lo), mid, Math.round(hi)],
      xLabels: [
        { idx: 0, text: kdate(chartPoints[0].d) },
        { idx: chartPoints.length - 1, text: kdate(date) },
      ],
      endLabel: `${fmtNum(last(krw).v)}원`,
      source: '자료: 한국은행 ECOS · 미 연준 FRED · 무역토리 가공',
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  const out = new URL(`${brief.date}.json`, OUT_DIR);
  await writeFile(out, JSON.stringify(brief, null, 2) + '\n');
  console.log(`[brief] 발행 — ${brief.date} (${brief.title})`);
}

main().catch((e) => {
  console.error(`[brief] 실패: ${e.message}`);
  process.exitCode = 1;
});
