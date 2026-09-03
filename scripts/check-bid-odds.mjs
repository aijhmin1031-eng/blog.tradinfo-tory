// 투찰률 계산기 교차검증 — 입찰레이더(파이썬)와 같은 값을 내는지 확인한다.
//
// 벡터 정본은 ai-bid-radar `tests/vectors/bid_price_vectors.json` 이고
// `src/data/bid-odds-vectors.json` 은 그 사본이다. 양쪽이 갈리면 여기서 실패한다.
//   node scripts/check-bid-odds.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  syntheticReserves, priceDistribution, bidAmountForRate, passProbability,
} from '../src/lib/bid-odds.js';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '../src/data/bid-odds-vectors.json'), 'utf8'));

// 파이썬 dataclass 필드명 -> 자바스크립트 필드명
const toParams = (o) => ({
  baseAmount: o.base_amount,
  lowerLimitRate: o.lower_limit_rate,
  aValue: o.a_value ?? 0,
  totalReserves: o.total_reserves,
  drawReserves: o.draw_reserves,
  rangeBeginRate: o.range_begin_rate,
  rangeEndRate: o.range_end_rate,
});

let checked = 0;
const fails = [];
const near = (a, b, tol) => Math.abs(a - b) <= tol;

for (const c of data.cases) {
  const p = toParams(c.params);
  const dist = priceDistribution(syntheticReserves(p), p.drawReserves);
  const e = c.expected;
  if (dist.length !== e.combinations) fails.push(`${c.name}: 조합 수 ${dist.length} != ${e.combinations}`);
  if (!near(dist[0], e.minPrice, 1e-3)) fails.push(`${c.name}: 최저 예정가격 ${dist[0]} != ${e.minPrice}`);
  if (!near(dist[dist.length - 1], e.maxPrice, 1e-3)) fails.push(`${c.name}: 최고 예정가격이 다릅니다`);
  for (const pt of e.curve) {
    const amount = bidAmountForRate(pt.rate, p);
    if (amount !== pt.amount) fails.push(`${c.name} ${pt.rate}%: 투찰금액 ${amount} != ${pt.amount}`);
    const prob = passProbability(amount, dist, p);
    if (!near(prob, pt.probability, 1e-12)) {
      fails.push(`${c.name} ${pt.rate}%: 확률 ${prob} != ${pt.probability}`);
    }
    checked += 1;
  }
}

if (fails.length) {
  console.error('❌ 투찰률 계산기가 입찰레이더와 갈립니다');
  fails.forEach((f) => console.error('   ' + f));
  process.exit(1);
}
console.log(`✅ 투찰률 계산기 교차검증 통과 — 사례 ${data.cases.length}종 / 곡선 지점 ${checked}개`);
