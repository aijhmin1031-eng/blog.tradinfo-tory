// 복수예가 투찰률 계산 (참고용 통계 — 예측·보장이 아니다)
//
// ★ 정본은 입찰레이더 repo 의 `src/bid_price.py` 다. 이 파일은 그 계산을 브라우저에
//   옮긴 것이고, 두 구현은 같은 테스트 벡터(`src/data/bid-odds-vectors.json`)를 통과한다.
//   `npm run check-bid-odds` 가 그것을 확인한다. 한쪽만 고치면 그 자리에서 실패한다.
//
// 구조
//   1) 발주기관이 기초금액의 예비가격범위(보통 ±2~3%) 안에서 복수예비가격을
//      총예가개수(보통 15)만큼 만든다.
//   2) 투찰자들이 추첨한 결과 가장 많이 뽑힌 4개의 산술평균이 예정가격이 된다.
//   3) 15개 중 4개를 고르는 경우의 수는 C(15,4) = 1365 가지다. 전부 전개한다.
//   4) 적격심사 하한선 = (예정가격 - A값) x 낙찰하한율 + A값.
//      A값(법정경비)에는 낙찰하한율을 곱하지 않는다.
//
// 이 확률의 뜻: 투찰금액이 **하한선 미달로 탈락하지 않을 조합의 비율**.
// 낙찰 확률이 아니다. 낙찰은 하한을 통과한 업체 중 순위로 갈린다.

// 부동소수점 찌꺼기를 자르는 자리수. 1,000,000,000 x 0.87745 가
// 877,450,000.0000001 로 나와 그대로 절상하면 1원이 더 붙는다.
// ★ A값(법정경비)은 응답에 **합계로 오지 않는다**(2026-09-04 실호출 확인).
// `bidPrceCalclAValue` 라는 필드는 실제 응답에 없다 — 그것을 읽던 코드는 늘 null 이었다.
// 아래 구성 항목을 더한 값이 A값이다(빈 문자열은 0으로 친다). 정본은 bid_price.py 의
// A_VALUE_COMPONENTS 이고 두 목록은 같은 순서·같은 이름이어야 한다.
export const A_VALUE_COMPONENTS = [
  'sftyMngcst',                 // 안전관리비
  'sftyChckMngcst',             // 안전점검비
  'rtrfundNon',                 // 퇴직공제부금
  'mrfnHealthInsrprm',          // 국민건강보험료
  'npnInsrprm',                 // 국민연금보험료
  'odsnLngtrmrcprInsrprm',      // 노인장기요양보험료
  'qltyMngcst',                 // 품질관리비
  'envCnsrvcst',                // 환경보전비
  'scontrctPayprcePayGrntyFee', // 하도급대금지급보증서발급수수료
  'usefulAmt',                  // 기타
];

const amount = (v) => {
  if (v === null || v === undefined) return 0;
  const t = String(v).replace(/,/g, '').trim();
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

/** A값 구성 항목을 더해 A값을 낸다. 항목이 하나도 없으면 0. */
export function sumAValue(item) {
  if (!item) return 0;
  return A_VALUE_COMPONENTS.reduce((acc, k) => acc + amount(item[k]), 0);
}

const ROUND_DIGITS = 6;
const EPS = 0.5 * Math.pow(10, -ROUND_DIGITS);

const roundTo = (v, digits) => {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
};

/** 87.745 / 0.87745 를 모두 0.87745 로. */
export function asRatio(rate) {
  const v = typeof rate === 'string' ? parseFloat(rate.replace(/[%,\s]/g, '')) : Number(rate);
  if (!isFinite(v)) return 0;
  return Math.abs(v) > 1 ? v / 100 : v;
}

/**
 * 한 공고의 투찰가 파라미터. `bid_price.BidParams` 의 이식이다.
 * 기존 함수들은 평범한 객체도 그대로 받는다(필드명이 같다).
 */
export class BidParams {
  constructor({
    baseAmount, lowerLimitRate, aValue = 0,
    totalReserves = 15, drawReserves = 4,
    rangeBeginRate = -2, rangeEndRate = 2,
  }) {
    this.baseAmount = Number(baseAmount);
    this.lowerLimitRate = lowerLimitRate;
    this.aValue = Number(aValue) || 0;
    this.totalReserves = Number(totalReserves) || 15;
    this.drawReserves = Number(drawReserves) || 4;
    this.rangeBeginRate = Number(rangeBeginRate);
    this.rangeEndRate = Number(rangeEndRate);
  }

  lowerRatio() { return asRatio(this.lowerLimitRate); }

  /**
   * 공고 행 + 기초금액 응답에서 만든다.
   * 기초금액이나 낙찰하한율이 없으면 null — 추정가격 따위로 대신 채우지 않는다.
   */
  static fromNotice(notice, basis = null, aValue = null) {
    const b = basis || {};
    const pick = (...keys) => {
      for (const k of keys) {
        for (const src of [b, notice]) {
          const v = src?.[k];
          if (v !== undefined && v !== null && v !== '' && v !== '0') return v;
        }
      }
      return null;
    };
    const base = pick('bssamt', 'bsis_amt', 'base_amount');
    const lwlt = pick('sucsfbid_lwlt_rate', 'sucsfbidLwltRate');
    if (base === null || lwlt === null) return null;
    const baseNum = parseFloat(String(base).replace(/,/g, ''));
    if (!isFinite(baseNum) || baseNum <= 0) return null;
    const rngB = pick('rsrvtnPrceRngBgnRate', 'rsrvtn_prce_rng_bgn_rate');
    const rngE = pick('rsrvtnPrceRngEndRate', 'rsrvtn_prce_rng_end_rate');
    return new BidParams({
      baseAmount: baseNum,
      lowerLimitRate: parseFloat(String(lwlt).replace('%', '')),
      // 합계 필드가 따로 없으므로, 명시적으로 받지 않았으면 구성 항목을 더한다.
      aValue: Number(
        aValue ?? pick('a_value', 'aValue') ?? (sumAValue(basis) || sumAValue(notice)) ?? 0,
      ),
      totalReserves: parseInt(pick('tot_prdprc_num', 'totPrdprcNum') ?? 15, 10),
      drawReserves: parseInt(pick('drwt_prdprc_num', 'drwtPrdprcNum') ?? 4, 10),
      rangeBeginRate: rngB !== null ? Number(rngB) : -2,
      rangeEndRate: rngE !== null ? Number(rngE) : 2,
    });
  }
}

/** 예비가격범위 하단·상단. 범위율은 늘 백분율이다(-2 = -2%). */
export function reserveRange(p) {
  return [
    p.baseAmount * (1 + Number(p.rangeBeginRate) / 100),
    p.baseAmount * (1 + Number(p.rangeEndRate) / 100),
  ];
}

/**
 * 복수예비가격을 범위 안에 등간격으로 놓는다.
 * 실제 값은 발주기관이 난수로 만들고 개찰 전에는 공개되지 않는다.
 * 등간격은 그 자리를 대신하는 근사이며, 실제보다 분포 폭이 좁게 나온다.
 */
export function syntheticReserves(p) {
  const n = Math.max(Math.trunc(p.totalReserves), 1);
  const [lo, hi] = reserveRange(p);
  if (n === 1) return [(lo + hi) / 2];
  const step = (hi - lo) / (n - 1);
  return Array.from({ length: n }, (_, i) => lo + step * i);
}

/** n개 중 k개를 고르는 모든 조합의 평균 = 예정가격 후보 전부(오름차순). */
export function priceDistribution(reserves, draw) {
  const n = reserves.length;
  if (draw <= 0 || draw > n) throw new Error(`추첨개수(${draw})가 예가개수(${n}) 범위를 벗어납니다.`);
  const out = [];
  const idx = Array.from({ length: draw }, (_, i) => i);
  for (;;) {
    let sum = 0;
    for (let i = 0; i < draw; i += 1) sum += reserves[idx[i]];
    // ★ 조합 평균은 반드시 ROUND_DIGITS 자리에서 정규화한다. 같은 수학적
    // 값이라도 더하는 순서에 따라 마지막 비트가 갈리고(파이썬 sum 과 이 루프가
    // 실제로 갈렸다), 그 오차가 투찰금액 경계에 얹히면 조합이 통째로 뒤집힌다.
    // 표준 사례에서 4개 조합이 999,999,999.99999988 로 떨어져
    // 파이썬 717 / 자바스크립트 713 으로 어긋났다. 지우지 말 것.
    out.push(roundTo(sum / draw, ROUND_DIGITS));
    let i = draw - 1;
    while (i >= 0 && idx[i] === n - draw + i) i -= 1;
    if (i < 0) break;
    idx[i] += 1;
    for (let j = i + 1; j < draw; j += 1) idx[j] = idx[j - 1] + 1;
  }
  out.sort((a, b) => a - b);
  return out;
}

/** 적격심사 하한선 = (예정가격 - A) x 낙찰하한율 + A. 원 단위 절상. */
export function lowerBound(price, p) {
  const a = Math.max(Number(p.aValue) || 0, 0);
  const base = Math.max(price - a, 0);
  return Math.ceil(roundTo(base * asRatio(p.lowerLimitRate) + a, ROUND_DIGITS));
}

/** 이 예정가격에서 심사 대상으로 남는가(하한 이상, 예정가격 이하). */
export function passes(bidAmount, price, p) {
  return lowerBound(price, p) <= bidAmount && bidAmount <= price;
}

const bisectLeft = (arr, x) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const bisectRight = (arr, x) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/**
 * 하한선 미달로 탈락하지 않을 조합의 비율(0~1).
 * 통과 구간은 연속이다. 하한선이 예정가격의 증가함수이므로 두 경계를 이진탐색해 센다.
 */
export function passProbability(bidAmount, distribution, p) {
  if (!distribution.length) return 0;
  const a = Math.max(Number(p.aValue) || 0, 0);
  const r = asRatio(p.lowerLimitRate);
  if (r <= 0) return 0;
  const ceiling = (Math.floor(bidAmount) + EPS - a) / r + a;
  const lo = bisectLeft(distribution, bidAmount);
  const hi = bisectRight(distribution, ceiling);
  return Math.max(hi - lo, 0) / distribution.length;
}

/** 투찰률(기초금액 대비 %) -> 투찰금액. 원 단위 반올림. */
export function bidAmountForRate(rate, p) {
  return Math.round(p.baseAmount * asRatio(rate));
}

/** 투찰률 구간별 확률 곡선. */
export function probabilityCurve(p, distribution, { loRate, hiRate = 100, step = 0.05 } = {}) {
  const lo = loRate ?? roundTo(asRatio(p.lowerLimitRate) * 100 - 1, 2);
  const steps = Math.round((hiRate - lo) / step);
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const rate = roundTo(lo + step * i, 4);
    const amount = bidAmountForRate(rate, p);
    out.push({ rate, amount, probability: passProbability(amount, distribution, p) });
  }
  return out;
}

/** 목표 확률을 만족하는 가장 낮은 투찰률. 같은 확률이면 낮은 쪽이 순위에 유리하다. */
export function recommendedBid(p, distribution, target, step = 0.01) {
  const curve = probabilityCurve(p, distribution, { step });
  return curve.find((pt) => pt.probability >= target) ?? null;
}

/** 화면이 한 번에 쓰는 요약. */
export function analyze(p, targets = [0.5, 0.8, 0.9, 0.95]) {
  const dist = priceDistribution(syntheticReserves(p), p.drawReserves);
  const curve = probabilityCurve(p, dist, { step: 0.01 });
  const mid = dist[Math.floor((dist.length - 1) / 2)];
  const [rangeLow, rangeHigh] = reserveRange(p);
  return {
    distribution: dist,
    curve,
    rangeLow,
    rangeHigh,
    combinations: dist.length,
    minPrice: dist[0],
    medianPrice: mid,
    maxPrice: dist[dist.length - 1],
    minRatePct: (dist[0] / p.baseAmount) * 100,
    maxRatePct: (dist[dist.length - 1] / p.baseAmount) * 100,
    recommended: targets.map((t) => ({
      target: t,
      point: curve.find((pt) => pt.probability >= t) ?? null,
    })),
  };
}
