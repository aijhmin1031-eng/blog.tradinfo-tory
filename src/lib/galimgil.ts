// 갈림길 자동 채점 (2026-08-27 신설).
//
// 1화는 「다음 주에 공개 채점」이라고 써 놓고 사람이 손대지 않아 `pending` 인 채 멈췄다.
// 전망을 숫자 문턱으로 적어 두면(프런트매터 `forecast`) **빌드가 시계열을 다시 읽어 판정한다.**
// 매일 아침 파이프라인이 시계열을 갱신하고 빌드가 돌므로, 관측 구간이 끝나는 다음 날
// 판정이 저절로 바뀐다. 사람이 할 일은 전망을 쓰는 것뿐이다.

export type Forecast = {
  series: string;
  field: 'v' | 'exp' | 'imp' | 'bal';
  label: string;
  unit: string;
  from: string;
  to: string;
  claim: string;
  confidence: number;
  rule: 'stay_below' | 'stay_above' | 'stay_between';
  low?: number;
  high?: number;
};

export type Verdict = {
  status: 'pending' | 'hit' | 'miss' | 'nodata';
  /** 관측 구간에서 실제로 나온 최저·최고 종가 */
  min: number | null;
  max: number | null;
  /** 판정을 깬 날짜(빗나갔을 때) */
  brokeOn: string | null;
  /** 지금까지 관측된 거래일 수 */
  days: number;
  /** 관측 구간이 끝났는가 (달력 기준) */
  closed: boolean;
  /** 시계열이 관측 구간 끝까지 실제로 채워져 있는가 */
  covered: boolean;
  /** 시계열의 마지막 날짜 (자료가 밀렸을 때 화면에 밝히려고) */
  lastSeen: string | null;
};

type Point = { d: string; v?: number; exp?: number; imp?: number; bal?: number };

const ymd = (d: string) => d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);

export function evaluate(f: Forecast, points: Point[], todayKST: string): Verdict {
  const inRange = points.filter((p) => {
    const k = p.d.length === 8 ? ymd(p.d) : p.d; // 월별 시리즈(YYYYMM)는 그대로 비교하지 않는다
    return p.d.length === 8 && k >= f.from && k <= f.to;
  });
  const vals = inRange
    .map((p) => ({ d: ymd(p.d), v: p[f.field] as number | undefined }))
    .filter((x): x is { d: string; v: number } => typeof x.v === 'number');

  const closed = todayKST > f.to;

  // ★ 달력이 지났다고 채점하면 안 된다 (2026-08-28 발견).
  // 파이프라인이 하루라도 거르면 시계열이 밀린다. 실제로 8/26·8/27 아침 스케줄이 건너뛰어
  // 코스피가 8/26 에 멈춰 있었는데, 그 상태로 8/29 가 되면 **관측 구간 5거래일 중 3일만 보고
  // 「적중」을 선언**하게 된다. 못 본 이틀에 문턱이 깨졌을 수도 있다.
  // 그래서 「구간 끝까지 자료가 왔는가」를 따로 재고, 안 왔으면 채점하지 않는다.
  // 문턱이 이미 깨진 경우만 예외다 — 그것은 남은 자료가 뒤집을 수 없다.
  const all = points.filter((p) => p.d.length === 8);
  const lastSeen = all.length ? ymd(all[all.length - 1].d) : null;
  const covered = lastSeen != null && lastSeen >= f.to;

  if (vals.length === 0)
    return { status: closed && covered ? 'nodata' : 'pending', min: null, max: null, brokeOn: null, days: 0, closed, covered, lastSeen };

  const min = Math.min(...vals.map((x) => x.v));
  const max = Math.max(...vals.map((x) => x.v));

  const broke = vals.find((x) => {
    if (f.rule === 'stay_below') return f.high != null && x.v > f.high;
    if (f.rule === 'stay_above') return f.low != null && x.v < f.low;
    return (f.high != null && x.v > f.high) || (f.low != null && x.v < f.low);
  });

  // 문턱을 깬 순간 결과는 확정된다. 구간이 남았어도 되돌릴 수 없다.
  if (broke) return { status: 'miss', min, max, brokeOn: broke.d, days: vals.length, closed, covered, lastSeen };
  // 지키고 있으면 **구간이 끝나고 자료도 구간 끝까지 와야** 적중이다.
  return { status: closed && covered ? 'hit' : 'pending', min, max, brokeOn: null, days: vals.length, closed, covered, lastSeen };
}

/** 화면에 쓸 한 줄. 「4.40% 를 넘지 않는다」 처럼 읽힌다. */
export function ruleText(f: Forecast): string {
  const u = f.unit;
  if (f.rule === 'stay_below') return `${f.high}${u} 를 넘지 않는다`;
  if (f.rule === 'stay_above') return `${f.low}${u} 아래로 내려가지 않는다`;
  return `${f.low}${u} ~ ${f.high}${u} 안에 머문다`;
}

export const VERDICT_LABEL: Record<Verdict['status'], string> = {
  pending: '채점 중',
  hit: '적중',
  miss: '빗나감',
  nodata: '자료 없음',
};

/** 한눈에 보는 표식 (소유주 지시 2026-08-28). 채점 전에는 표식을 주지 않는다. */
export const VERDICT_MARK: Record<Verdict['status'], string> = {
  pending: '',
  hit: 'O',
  miss: 'X',
  nodata: '',
};
