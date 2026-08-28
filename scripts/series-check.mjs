// 시계열 상태 점검 — 정의는 있는데 **파일이 없거나 오래 멈춘** 계열을 찾는다.
//
// 왜 필요한가: `collect.mjs` 는 계열 하나가 실패해도 나머지를 지키려고
// **「실패, 기존 값 유지」 한 줄만 남기고 넘어간다.** 그 로그는 CI 안에 묻히므로,
// 코드가 틀린 계열은 **조용히 빈 채로 남는다.** 실제로 `gold`(8/25 소스 교체)는
// 그렇게 파일조차 없는 상태였다.
//
// 사용: node scripts/series-check.mjs [--max-age=<일>]
// 종료코드 0=이상 없음, 1=정의됐는데 파일이 없는 계열이 있음.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (f, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${f}=`));
  return a ? Number(a.split('=')[1]) : d;
};
const MAX_AGE_D = arg('max-age', 10); // 일별 계열 기준. 월별은 따로 본다.
const MAX_AGE_M = 70; // 월별은 공표 지연이 커서 두 달까지는 정상으로 본다.

const defs = JSON.parse(readFileSync(join(ROOT, 'data/sources.json'), 'utf8')).series;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

const ymdToDate = (s) =>
  s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  : s.length === 6 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-01` : null;

const missing = [];
const stale = [];
const ok = [];

for (const def of defs) {
  const p = join(ROOT, 'data/series', `${def.id}.json`);
  if (!existsSync(p)) { missing.push(def); continue; }
  let pts = [];
  try { pts = JSON.parse(readFileSync(p, 'utf8')).points ?? []; } catch {}
  if (!pts.length) { missing.push(def); continue; }
  const last = pts[pts.length - 1].d;
  const iso = ymdToDate(String(last));
  const age = iso ? Math.round((Date.parse(today) - Date.parse(iso)) / 86400000) : null;
  const limit = def.cycle === 'M' ? MAX_AGE_M : MAX_AGE_D;
  if (age != null && age > limit) stale.push({ def, last, age, limit });
  else ok.push({ def, last, age, n: pts.length });
}

const C = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', x: '\x1b[0m' };
console.log(`\n시계열 점검 · ${today} KST · 정의 ${defs.length}개\n`);

if (missing.length) {
  console.log(`${C.r}✗ 파일이 없거나 비어 있음 ${missing.length}개 — API 코드가 틀렸을 가능성이 크다${C.x}`);
  for (const d of missing) {
    console.log(`    ${d.id} (${d.source} ${d.fred ?? `${d.stat}/${d.item}`})${d.note ? ` ${C.d}· ${d.note}${C.x}` : ''}`);
  }
  console.log('');
}
if (stale.length) {
  console.log(`${C.y}△ 오래 멈춘 계열 ${stale.length}개${C.x}`);
  for (const s of stale) console.log(`    ${s.def.id}: 최신 ${s.last} (${s.age}일 전, 기준 ${s.limit}일)`);
  console.log('');
}
console.log(`${C.g}✓ 정상 ${ok.length}개${C.x}`);
for (const o of ok) console.log(`    ${C.d}${o.def.id.padEnd(12)} 최신 ${o.last} · ${o.n}개${C.x}`);
console.log('');

if (missing.length) {
  console.log(`${C.r}정의만 있고 자료가 없는 계열이 있다. 그 계열을 쓰는 기사는 쓸 수 없다.${C.x}\n`);
  process.exit(1);
}
