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

const SRC = JSON.parse(readFileSync(join(ROOT, 'data/sources.json'), 'utf8'));
const defs = [...SRC.series];

// ★ 무역 계열도 함께 본다(2026-08-31 신설).
// 그전까지 이 점검기는 ECOS·FRED 정의 24개만 봤고, `trade_*` 는 **점검 밖**이었다.
// 그래서 `hs8542_HK` 가 8/22 이후 갱신이 끊긴 채로 아흐레를 조용히 지났다 — 그 값을 쓰는
// 기사들이 낡은 숫자를 보여 주고 있었는데 아무 경보도 울리지 않았다.
// 관세청 API 는 코드가 틀려도 오류가 아니라 **빈 목록**을 주므로, 계열이 빈 채로 남는 것이
// 유일한 증상이다. 여기서 잡지 않으면 아무 데서도 못 잡는다.
//   · 주기는 월간(M)이고, 통관 통계는 확정까지 시간이 걸리므로 기본 월간 기준(70일)을 따른다.
for (const c of SRC.trade.countries) {
  defs.push({ id: `trade_${c.cc}`, name: `${c.name} 수출입`, cycle: 'M', source: '관세청', item: c.cc });
}
for (const it of SRC.trade.items) {
  defs.push({ id: `trade_${it.id}`, name: it.name, cycle: 'M', source: '관세청', item: `HS ${it.hs}` });
}
for (const ic of SRC.trade.itemCountries) {
  defs.push({ id: `trade_${ic.id}`, name: ic.name, cycle: 'M', source: '관세청', item: `HS ${ic.hs}/${ic.cc}` });
}

// 파생 계열은 sources.json 에 없다(수집이 아니라 계산으로 만들어진다).
// 그래도 **없으면 기사를 못 쓰는 것은 마찬가지**이므로 함께 점검한다.
// 여기 적지 않으면 파생이 조용히 사라져도 점검기가 통과라고 말한다.
const DERIVED = [
  { id: 'cpi_kr_yoy', name: '한국 소비자물가 상승률', cycle: 'M', source: '파생', note: 'collect.mjs 가 cpi_kr 지수에서 전년동월대비로 계산' },
];
defs.push(...DERIVED);
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
  // 계열마다 공표 지연이 다르다. 정의가 자기 주기를 아는 것이 맞으므로
  // `maxAgeDays` 가 있으면 그것을 쓴다(수출·국제수지는 두 달 남짓 늦게 나온다).
  const limit = def.maxAgeDays ?? (def.cycle === 'M' ? MAX_AGE_M : MAX_AGE_D);
  if (age != null && age > limit) stale.push({ def, last, age, limit });
  else ok.push({ def, last, age, n: pts.length });
}

// ★ 「그럴듯한 값」 대조 (2026-08-31 신설).
// 빈 계열은 위에서 잡힌다. 잡히지 않는 것은 **값은 왔는데 엉뚱한 값인 경우**다.
// 실제로 났던 사고: 관세청 질의가 품목코드만 싣고 국가코드를 빠뜨려, 「반도체 對중국·對홍콩·
// 對대만」 세 계열이 전부 HS 8542 **총계**로 채워졌다. 파일도 있고 날짜도 최신이라 점검기는
// 통과라고 말했고, 그 값을 쓰는 발행 기사가 자기 본문과 어긋난 차트를 보였다.
// 판별은 간단하다 — **부분이 전체와 똑같을 수는 없다.**
const sameAsParent = [];
for (const ic of (SRC.trade?.itemCountries ?? [])) {
  const child = join(ROOT, 'data/series', `trade_${ic.id}.json`);
  const parent = join(ROOT, 'data/series', `trade_hs${ic.hs}.json`);
  if (!existsSync(child) || !existsSync(parent)) continue;
  try {
    const c = JSON.parse(readFileSync(child, 'utf8')).points.at(-1);
    const p = JSON.parse(readFileSync(parent, 'utf8')).points.at(-1);
    if (c && p && c.d === p.d && c.exp === p.exp && c.imp === p.imp) {
      sameAsParent.push({ id: `trade_${ic.id}`, hs: ic.hs, cc: ic.cc, exp: c.exp });
    }
  } catch {}
}

const C = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', x: '\x1b[0m' };
console.log(`\n시계열 점검 · ${today} KST · 정의 ${defs.length}개\n`);

if (missing.length) {
  console.log(`${C.r}✗ 파일이 없거나 비어 있음 ${missing.length}개 — API 코드가 틀렸을 가능성이 크다${C.x}`);
  for (const d of missing) {
    const code = d.fred ?? (d.stat ? `${d.stat}/${d.item}` : d.item);
    console.log(`    ${d.id} (${d.source} ${code})${d.note ? ` ${C.d}· ${d.note}${C.x}` : ''}`);
  }
  console.log('');
}
if (stale.length) {
  console.log(`${C.y}△ 오래 멈춘 계열 ${stale.length}개${C.x}`);
  for (const s of stale) console.log(`    ${s.def.id}: 최신 ${s.last} (${s.age}일 전, 기준 ${s.limit}일)`);
  console.log('');
}
console.log(`${C.g}✓ 정상 ${ok.length}개${C.x}`);
for (const o of ok) console.log(`    ${C.d}${o.def.id.padEnd(18)} 최신 ${o.last} · ${o.n}개${C.x}`);
console.log('');

if (sameAsParent.length) {
  console.log(`${C.r}✗ 부분이 전체와 같은 계열 ${sameAsParent.length}개 — 국가코드가 질의에서 빠졌을 때 나는 증상이다${C.x}`);
  for (const s2 of sameAsParent) {
    console.log(`    ${s2.id}: HS ${s2.hs} 총계와 값이 같다(${(s2.exp / 1e8).toFixed(1)}억 달러). ${s2.cc} 만의 값이 아니다.`);
  }
  console.log('');
}

if (missing.length || sameAsParent.length) {
  if (missing.length) console.log(`${C.r}정의만 있고 자료가 없는 계열이 있다. 그 계열을 쓰는 기사는 쓸 수 없다.${C.x}`);
  if (sameAsParent.length) console.log(`${C.r}값은 있으나 엉뚱한 값인 계열이 있다. 빈 계열보다 위험하다 — 그럴듯해서 그대로 발행된다.${C.x}`);
  console.log('');
  process.exit(1);
}
