// 일회성 탐색 — 특정 통계표·항목 코드를 실제 키로 찾는다. CI 에서만 돌린다.
// ★ 키 값을 절대 출력하지 않는다.
const ECOS = process.env.ECOS_API_KEY;
const say = (...a) => console.log(...a);
const head = (t) => say(`\n${'='.repeat(66)}\n${t}\n${'='.repeat(66)}`);
const jget = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };

// ① 통계표 목록에서 키워드로 표를 찾는다
async function findTables(keyword) {
  head(`ECOS 통계표 검색: "${keyword}"`);
  const d = await jget(`https://ecos.bok.or.kr/api/StatisticTableList/${ECOS}/json/kr/1/1000`);
  const rows = d?.StatisticTableList?.row ?? [];
  const hit = rows.filter((r) => new RegExp(keyword).test(r.STAT_NAME ?? ''));
  if (!hit.length) return say('  없음');
  for (const r of hit) say(`  ${r.STAT_CODE}  [${r.CYCLE ?? '?'}] ${r.STAT_NAME}`);
  return hit;
}

// ② 표의 항목 목록
async function items(code, label) {
  try {
    const d = await jget(`https://ecos.bok.or.kr/api/StatisticItemList/${ECOS}/json/kr/1/30/${code}`);
    const rows = d?.StatisticItemList?.row ?? [];
    say(`\n  ${code} (${label}) — 항목 ${rows.length}개`);
    for (const r of rows) say(`      ${r.ITEM_CODE}  ${r.ITEM_NAME}  [${r.CYCLE ?? ''}] ${r.UNIT_NAME ?? ''}`);
  } catch (e) { say(`\n  ${code} 실패: ${e.message}`); }
}

// ③ 실제 값이 오는지 확인
async function sample(code, item, cycle, from, to) {
  try {
    const d = await jget(`https://ecos.bok.or.kr/api/StatisticSearch/${ECOS}/json/kr/1/5/${code}/${cycle}/${from}/${to}/${item}`);
    const rows = d?.StatisticSearch?.row ?? [];
    say(`\n  값 확인 ${code}/${item} [${cycle}] — ${rows.length}건`);
    for (const r of rows.slice(-3)) say(`      ${r.TIME}  ${r.DATA_VALUE}  ${r.UNIT_NAME ?? ''}`);
  } catch (e) { say(`\n  값 확인 ${code}/${item} 실패: ${e.message}`); }
}

if (!ECOS) { say('ECOS 키 없음'); } else {
  const t1 = await findTables('외환보유');
  head('후보 표의 항목');
  for (const r of (t1 ?? []).slice(0, 3)) await items(r.STAT_CODE, r.STAT_NAME);
  // 산업생산도 겸사 확인(국제 주요국 표의 한국 항목코드)
  head('국제 주요국 산업생산(902Y020) 항목 — 한국 코드 찾기');
  await items('902Y020', '국제 주요국 산업생산지수');
}
say('\n탐색 완료');
