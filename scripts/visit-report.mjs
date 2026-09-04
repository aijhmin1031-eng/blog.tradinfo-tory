#!/usr/bin/env node
/**
 * 방문 기록을 한 화면으로 — `npm run visits [일수]` (기본 14일)
 *
 * 왜 스크립트인가 (2026-09-04): 방문자를 확인할 때마다 Supabase RPC 를 손으로
 * 때리고 있었다. 그때마다 「visitors 97명」 같은 날것의 숫자를 먼저 보게 되는데,
 * 그 숫자는 **사람이 아니다**. 사람·판정보류·봇을 갈라 보여 주는 자리를 하나 만들어
 * 다음 세션이 같은 착각을 반복하지 않게 한다.
 *
 * ★ node fetch 는 이 저장소의 원격 컨테이너에서 프록시에 막힌다(CLAUDE.md).
 *   그래서 curl 로 부른다 — 「fetch failed」를 결론으로 삼지 않기 위한 것이기도 하다.
 *
 * 읽는 법:
 *   사람   — 체류 신호가 왔거나 · 두 쪽 이상 보았거나 · 외부에서 들어온 방문자
 *   보류   — direct 로 들어와 한 쪽만 보고 나갔고 체류 신호도 없다. 봇이라고 단정하지
 *            않는다(북마크로 와서 한 편 읽고 나간 사람일 수 있다). 사람 수의 상한이다.
 *   봇     — User-Agent 로 판정된 것. 무엇을 걸렀는지는 visit_bots 로 따로 본다.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const days = Number(process.argv[2] || 14);
const src = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const URL_ = src.match(/SUPABASE_URL = '([^']+)'/)?.[1];
const KEY = src.match(/eyJ[A-Za-z0-9._-]+/)?.[0];
if (!URL_ || !KEY) { console.error('src/lib/supabase.ts 에서 주소·키를 못 읽었다.'); process.exit(1); }

function rpc(fn, body) {
  const out = execFileSync('curl', [
    '-sS', '-X', 'POST', `${URL_}/rest/v1/rpc/${fn}`,
    '-H', `apikey: ${KEY}`, '-H', `Authorization: Bearer ${KEY}`,
    '-H', 'Content-Type: application/json', '-d', JSON.stringify(body),
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const data = JSON.parse(out);
  if (!Array.isArray(data)) throw new Error(`${fn}: ${out.slice(0, 200)}`);
  return data;
}

const pad = (v, n) => String(v).padStart(n);
const sum = (r, k) => r.reduce((a, x) => a + Number(x[k] || 0), 0);
// 패치 이전 스키마로도 돌아간다 — 열이 없으면 조용히 '-' 로 찍는다.
const has = (r, k) => r.length > 0 && r[0][k] !== undefined;
const col = (x, k) => (x[k] === undefined ? '-' : x[k]);

const s = rpc('visit_summary', { p_days: days });
console.log(`\n■ 최근 ${days}일 — 날짜별\n`);
console.log('  날짜         사람   보류    봇   조회   외부');
for (const d of s) {
  console.log(`  ${d.day}  ${pad(col(d, 'humans'), 5)} ${pad(col(d, 'oneshot'), 5)} ${pad(col(d, 'bots'), 5)}`
    + ` ${pad(d.pageviews, 6)} ${pad(d.external_visitors, 5)}`);
}
if (!has(s, 'humans')) {
  console.log('\n  ⚠ 사람·보류·봇 열이 없다 — scripts/sql/visit_log_engagement_20260904.sql 이 아직 안 돌았다.');
} else {
  console.log(`\n  합계  사람 ${sum(s, 'humans')}명 · 보류 ${sum(s, 'oneshot')}명 · 봇 ${sum(s, 'bots')}명`
    + ` · 조회 ${sum(s, 'pageviews')}회 · 외부 유입 ${sum(s, 'external_visitors')}명`
    + `\n        체류 신호가 온 방문자 ${sum(s, 'engaged')}명 (신호는 패치 적용 이후 기록분에만 있다)`);
}

const r = rpc('visit_referrers', { p_days: days });
console.log(`\n■ 유입 경로\n`);
for (const x of r) {
  console.log(`  ${String(x.ref_host).padEnd(22)} 방문자 ${pad(x.visitors, 4)} · 조회 ${pad(x.pageviews, 5)}`
    + ` · 사람 ${pad(col(x, 'humans'), 4)}`);
}

const p = rpc('visit_pages', { p_days: days });
const humanPages = has(p, 'humans') ? p.filter((x) => Number(x.humans) > 0) : p;
console.log(`\n■ 사람이 본 쪽 (전체 ${p.length}종 중 ${humanPages.length}종)\n`);
for (const x of humanPages.slice(0, 20)) {
  console.log(`  사람 ${pad(col(x, 'humans'), 3)} · 외부 ${pad(x.external_visitors, 3)} · 조회 ${pad(x.views, 4)}`
    + `  ${x.path}`);
}

const b = rpc('visit_bots', { p_days: days });
console.log(`\n■ User-Agent 로 걸러낸 봇\n`);
if (!b.length) console.log('  없음 — UA 층은 이미 한계다. 렌더러는 진짜 브라우저 UA 를 쓴다.');
for (const x of b) console.log(`  ${String(x.bot_hint).padEnd(22)} 조회 ${pad(x.views, 5)} · 경로 ${pad(x.paths, 4)}`);
console.log('');
