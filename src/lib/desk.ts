// 데이터 데스크 — 우리가 가진 계열 전부를 **한 모양**으로 만들어 게시판에 넘긴다.
//
// 왜 만들었나 (2026-08-31, 소유주 지시): 계열은 쌓이는데 화면은 갈래마다 따로였다.
//   `/numbers/` 는 지표만, 창고 카드는 국가 넷만, 무역 품목은 기사 안에만 있었다.
//   갈래마다 다른 코드로 그리면 갈래가 늘 때마다 화면을 새로 짜야 한다.
//   여기서 **하나의 행 모양(DeskRow)** 으로 통일해 두면, 게시판은 갈래를 몰라도 된다.
//
// ★ 이 파일은 해석을 담지 않는다(소유주 지시). 수치·기간·출처까지가 여기 몫이고,
//   「그래서 무엇을 뜻하는가」는 기사가 맡는다.

import defs from '../../data/sources.json';
import { sourceForSeries } from './sources';

export interface SeriesPoint {
  d: string;
  v?: number;
  exp?: number;
  imp?: number;
  bal?: number;
  expWgt?: number;
  impWgt?: number;
}
export interface SeriesFile {
  id: string;
  name: string;
  unit: string;
  cycle: 'D' | 'W' | 'M';
  points: SeriesPoint[];
  updatedAt?: string;
}

const files = import.meta.glob<SeriesFile>('../../data/series/*.json', {
  eager: true,
  import: 'default',
});
export const loadSeries = (id: string): SeriesFile | undefined =>
  files[`../../data/series/${id}.json`];

/** 정의서에서 온 부가 정보(자릿수·라이선스 등) */
const META = new Map<string, any>((defs.series as any[]).map((d) => [d.id, d]));
export const TRADE = (defs as any).trade as {
  countries: { cc: string; name: string }[];
  items: { hs: string; id: string; name: string; side: string }[];
  itemCountries: { hs: string; cc: string; id: string; name: string }[];
};

/** 품목 아이콘 — HS 4단위로 고른다. 사전에 없으면 컨테이너로 떨어진다. */
const ITEM_ICON: Record<string, string> = {
  '8542': 'chip', '8486': 'equipment', '8703': 'car', '8708': 'carpart',
  '2710': 'fuel', '8901': 'ship', '3901': 'polymer', '3902': 'polymer',
  '7208': 'steel', '8517': 'signal', '8524': 'display', '8471': 'computer',
  '8507': 'battery', '8541': 'diode', '3304': 'cosmetic', '4011': 'tire',
  '2709': 'oil', '2711': 'gas', '2701': 'coal', '3004': 'pill',
};
/** 지표 아이콘 */
const IND_ICON: Record<string, string> = {
  usdkrw: 'fx', jpy100: 'fx', dxy: 'fx',
  baserate: 'benchmark', ktb10y: 'bond', deposit1y: 'coin', fedfunds: 'benchmark',
  us2y: 'bond', us10y: 'bond', us10y2y: 'spread',
  cpi_kr: 'price', cpi_kr_yoy: 'price', ppi_kr: 'price', cpi_us: 'price',
  unrate_kr: 'people', unrate_us: 'people',
  wti: 'oil', brent: 'oil', natgas: 'gas', copper: 'copperwire',
  exports_kr: 'container', balance_goods_kr: 'scale', reserves_kr: 'reserve', prod_kr: 'factory',
  kospi: 'chartline',
};

export interface DeskRow {
  id: string;
  name: string;
  icon: string;
  cc?: string;
  hs?: string;
  side?: string;
  /** 지표류 대표값 */
  value?: number;
  diff?: number;
  pct?: number;
  frac?: number;
  /** 무역류 (억 달러) */
  exp?: number;
  imp?: number;
  bal?: number;
  /** 우리가 계산한 값 — 원자료에 없다 (달러/kg) */
  unitExp?: number;
  unitImp?: number;
  unit: string;
  cycle: string;
  asOf: string;
  first: string;
  n: number;
  source: string;
  sourceUrl?: string;
}

const eok = (v: number) => +(v / 1e8).toFixed(1); // 달러 → 억 달러
export const dstr = (d: string) =>
  d.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : `${d.slice(0, 4)}.${d.slice(4)}`;
const cycleName = (c: string) => (c === 'D' ? '일별' : c === 'W' ? '주별' : '월별');

const srcLabel = (id: string) => {
  const m = META.get(id);
  if (m?.license) return m.license;
  const s = sourceForSeries(id);
  return s ? `${s.org} ${s.name}` : '도토리경제 파생';
};
const srcUrl = (id: string) => sourceForSeries(id)?.url;

/** 지표 한 줄 */
function indicatorRow(id: string): DeskRow | null {
  const s = loadSeries(id);
  if (!s?.points?.length) return null;
  const pts = s.points;
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (last.v == null) return null;
  const diff = prev?.v != null ? last.v - prev.v : undefined;
  return {
    id, name: s.name, icon: IND_ICON[id] ?? 'chartline',
    value: last.v,
    diff,
    pct: diff != null && prev?.v ? +((diff / prev.v) * 100).toFixed(2) : undefined,
    frac: META.get(id)?.frac,
    unit: s.unit, cycle: cycleName(s.cycle),
    asOf: dstr(last.d), first: dstr(pts[0].d), n: pts.length,
    source: srcLabel(id), sourceUrl: srcUrl(id),
  };
}

/** 무역 한 줄. 단가(달러/kg)는 **우리가 나눠 만든 값**이라 원자료에 없다. */
function tradeRow(seriesId: string, name: string, icon: string, extra: Partial<DeskRow>): DeskRow | null {
  const s = loadSeries(seriesId);
  if (!s?.points?.length) return null;
  const pts = s.points;
  const last = pts[pts.length - 1];
  if (last.exp == null) return null;
  return {
    id: seriesId, name, icon,
    exp: eok(last.exp), imp: eok(last.imp ?? 0), bal: eok(last.bal ?? 0),
    unitExp: last.expWgt ? +(last.exp / last.expWgt).toFixed(2) : undefined,
    unitImp: last.impWgt && last.imp ? +(last.imp / last.impWgt).toFixed(2) : undefined,
    unit: '억 달러', cycle: '월별',
    asOf: dstr(last.d), first: dstr(pts[0].d), n: pts.length,
    source: '관세청 수출입무역통계', sourceUrl: srcUrl(seriesId),
    ...extra,
  };
}

export interface DeskSection {
  key: string;
  name: string;
  icon: string;
  note: string;
  rows: DeskRow[];
  groups?: { name: string; ids: string[] }[];
}

const IND_GROUPS = [
  { name: '환율', ids: ['usdkrw', 'jpy100', 'dxy'] },
  { name: '금리', ids: ['baserate', 'ktb10y', 'deposit1y', 'fedfunds', 'us2y', 'us10y', 'us10y2y'] },
  { name: '물가·고용', ids: ['cpi_kr', 'cpi_kr_yoy', 'ppi_kr', 'cpi_us', 'unrate_kr', 'unrate_us'] },
  { name: '원자재', ids: ['wti', 'brent', 'natgas', 'copper'] },
  { name: '대외 거래', ids: ['exports_kr', 'balance_goods_kr', 'reserves_kr', 'prod_kr'] },
  { name: '증시', ids: ['kospi'] },
];

export function buildDesk(): DeskSection[] {
  const indicators = IND_GROUPS.flatMap((g) => g.ids).map(indicatorRow).filter(Boolean) as DeskRow[];

  const countries = TRADE.countries
    .map((c) => tradeRow(`trade_${c.cc}`, c.name, 'globe', { cc: c.cc }))
    .filter(Boolean) as DeskRow[];

  const items = TRADE.items
    .map((it) =>
      tradeRow(`trade_${it.id}`, it.name, ITEM_ICON[it.hs] ?? 'container', { hs: it.hs, side: it.side })
    )
    .filter(Boolean) as DeskRow[];

  const itemCountries = TRADE.itemCountries
    .map((ic) => tradeRow(`trade_${ic.id}`, ic.name, 'chip', { hs: ic.hs, cc: ic.cc }))
    .filter(Boolean) as DeskRow[];

  const stocks = Object.keys(files)
    .map((k) => k.split('/').pop()!.replace('.json', ''))
    .filter((id) => id.startsWith('stk_'))
    .map((id) => {
      const r = indicatorRow(id);
      return r ? { ...r, icon: 'chartline' } : null;
    })
    .filter(Boolean) as DeskRow[];

  const customsFx = Object.keys(files)
    .map((k) => k.split('/').pop()!.replace('.json', ''))
    .filter((id) => id.startsWith('customs_fx_'))
    .map((id) => {
      const r = indicatorRow(id);
      return r ? { ...r, icon: 'customs' } : null;
    })
    .filter(Boolean) as DeskRow[];

  return [
    {
      key: 'indicators', name: '경제지표', icon: 'chartline',
      note: '환율·금리·물가·원자재·대외거래·증시', rows: indicators, groups: IND_GROUPS,
    },
    { key: 'countries', name: '국가별 무역', icon: 'globe', note: '수출·수입·무역수지와 kg당 단가', rows: countries },
    { key: 'items', name: '품목별 무역', icon: 'container', note: 'HS 4단위 주요 수출입 품목', rows: items },
    { key: 'chips', name: '반도체 경로', icon: 'chip', note: 'HS 8542 의 국가별 흐름', rows: itemCountries },
    { key: 'stocks', name: '기업 주가', icon: 'bank', note: '관심 종목 종가', rows: stocks },
    { key: 'customsfx', name: '관세환율', icon: 'customs', note: '수입신고에 적용되는 주간 고시 환율', rows: customsFx },
  ].filter((s) => s.rows.length) as DeskSection[];
}
