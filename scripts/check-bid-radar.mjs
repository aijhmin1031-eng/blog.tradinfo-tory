// 입찰레이더 엔진 교차검증 — 자격필터·공동도급 분류가 파이썬과 같은 판정을 내는지 본다.
//
// 벡터 정본은 ai-bid-radar `tests/vectors/bid_price_vectors.json` 의 `rules` 절이고
// `src/data/bid-odds-vectors.json` 은 그 사본이다. 판정과 **사유 문장까지** 대조한다.
//   node scripts/check-bid-radar.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluate as judge } from '../src/lib/bid-radar/qualifier.js';
import * as joint from '../src/lib/bid-radar/joint-supply.js';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '../src/data/bid-odds-vectors.json'), 'utf8'));
const rules = data.rules;
if (!rules) {
  console.error('❌ 벡터에 rules 절이 없습니다. ai-bid-radar 에서 tests/make_vectors.py 를 다시 돌리십시오.');
  process.exit(1);
}

const fails = [];
let n = 0;

for (const c of rules.qualify) {
  const res = judge(c.notice, c.licenseLimits, c.possibleRegions,
    { region: c.profileValue.region, licenses: c.profileValue.licenses });
  const tag = `[${c.profile}] ${c.case}`;
  if (res.verdict !== c.expected.verdict) fails.push(`${tag}: 판정 ${res.verdict} != ${c.expected.verdict}`);
  if (res.reasons.length !== c.expected.reasons.length) {
    fails.push(`${tag}: 사유 개수 ${res.reasons.length} != ${c.expected.reasons.length}`);
  } else {
    res.reasons.forEach((r, i) => {
      if (r !== c.expected.reasons[i]) fails.push(`${tag}: 사유[${i}]\n    JS  ${r}\n    PY  ${c.expected.reasons[i]}`);
    });
  }
  n += 1;
}

for (const c of rules.joint) {
  const r = joint.evaluate({ cmmn_spldmd_mthd_nm: c.methodName });
  const tag = `공동수급 '${c.methodName || '(빈값)'}'`;
  for (const k of ['kind', 'label', 'available', 'note']) {
    const got = k === 'available' ? r.available : r[k];
    if (got !== c.expected[k]) fails.push(`${tag}: ${k} ${JSON.stringify(got)} != ${JSON.stringify(c.expected[k])}`);
  }
  n += 1;
}

if (fails.length) {
  console.error('❌ 입찰레이더 엔진이 파이썬 정본과 갈립니다');
  fails.forEach((f) => console.error('   ' + f));
  process.exit(1);
}
console.log(`✅ 입찰레이더 엔진 교차검증 통과 — 자격 ${rules.qualify.length}건 · 공동도급 ${rules.joint.length}건 (총 ${n})`);
