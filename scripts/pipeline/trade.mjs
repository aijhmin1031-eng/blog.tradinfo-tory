// 관세청 품목별 국가별 수출입실적 — 주요 교역국의 월별 수출·수입·무역수지 수집
//   1) data/series/trade_<cc>.json 에 월별 누적 (exp/imp/bal, 달러)
//   2) src/data/trade.json (도토리 창고 국가별 무역수지 카드) 갱신
// 통관 통계 특성상 최근 1~2개월은 잠정치이며, 매 실행 시 재조회해 갱신한다.
// 사용: DATA_GO_KR_KEY=... node scripts/pipeline/trade.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const OUT = new URL('src/data/trade.json', ROOT);

// 수집 대상은 **정의서 한 곳**에서 온다 — `data/sources.json` 의 `trade` 절.
//   2026-08-31 이전에는 이 파일 안에 목록이 박혀 있었고, 그래서 손으로 심은 계열이
//   파이프라인에 등록되지 않은 채 조용히 멈추는 사고가 났다(`hs8542_HK`).
//   이제 수집기와 점검기(`series-check.mjs`)가 같은 파일을 읽으므로,
//   **한쪽만 고쳐 어긋나는 일이 구조적으로 불가능하다**(forms.json 과 같은 원칙).
const MONTHS_BACK = 4; // 이번 달 포함 최근 4개월 재조회 (잠정치 갱신 겸용)
// 목표 이력 길이. 계열이 이보다 짧으면 **모자란 달만** 함께 받아 채운다(자가 치유).
//   2026-08-31 신설. 국가별 4종이 3개월치뿐이었다(품목별은 13개월). 버그가 아니라
//   **과거 씨앗을 안 심어서**였고, MONTHS_BACK 이 4라 한 달에 하나씩만 늘고 있었다.
//   매번 13개월을 받으면 호출이 3배가 되므로, **부족할 때만** 채운다.
const SEED_MONTHS = 13;
// 한 번의 실행에서 **씨앗(과거 채우기)으로 쓸 수 있는 호출 수**.
//   최근 달 갱신은 잠정치 정확도에 직결되므로 예산에서 빼지 않고 언제나 먼저 돈다.
//   왜 필요한가: 계열이 38개로 늘면서 첫 씨앗이 400회를 넘는다. 일 한도(개발계정 10,000)에는
//   여유가 있지만 **순차 호출이라 CI 가 길어지고, 도중에 끊기면 그 실행이 통째로 헛돈다.**
//   예산을 두면 못 채운 만큼은 다음 실행이 이어서 채운다(자가 치유가 이미 그렇게 동작한다).
const SEED_BUDGET = Number(process.env.TRADE_SEED_BUDGET ?? 500);
let seedLeft = SEED_BUDGET;

const REG = JSON.parse(await readFile(new URL('data/sources.json', ROOT), 'utf8')).trade;
const COUNTRIES = REG.countries;
const ITEMS = REG.items;
const ITEM_COUNTRIES = REG.itemCountries;

const yymm = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1] : null;
};

async function fetchMonth(cc, month, hsSgn = '') {
  const url =
    `https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList` +
    `?serviceKey=${KEY}&strtYymm=${month}&endYymm=${month}` +
    // ★ 둘 다 있으면 **둘 다 보낸다**(2026-08-31 수리).
    //   예전 코드는 `hsSgn ? hsSgn : cntyCd` 라 품목코드가 있으면 국가코드를 아예 안 실었다.
    //   그래서 「반도체 對중국·對홍콩·對대만」 세 계열이 전부 **HS 8542 총계**로 채워졌고
    //   (327.2억으로 셋이 똑같았다), 그 값을 쓰는 발행 기사가 자기 본문과 어긋난 차트를 보였다
    //   (semi-hongkong-route 는 홍콩 수출 43.7억을 제목에 걸어 두고 차트는 327.2억을 그렸다).
    //   ★ 이 종류는 **빈 계열이 아니라 「그럴듯한 값」으로 오므로 점검기가 못 잡는다.**
    //   갈래가 다른 계열끼리 값이 같으면 의심할 것.
    (hsSgn ? `&hsSgn=${hsSgn}` : '') + (cc ? `&cntyCd=${cc}` : '') +
    `&numOfRows=1&pageNo=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`관세청 ${cc} ${month} HTTP ${res.status}`);
  const xml = await res.text();
  const code = tag(xml, 'resultCode');
  if (code !== '00') throw new Error(`관세청 ${cc} ${month}: ${tag(xml, 'resultMsg')}`);
  // 첫 item 이 해당 월 총계다
  const item = xml.match(/<item>[\s\S]*?<\/item>/)?.[0];
  if (!item || tag(item, 'year') !== '총계') return null; // 아직 집계 전인 달
  const exp = Number(tag(item, 'expDlr'));
  const imp = Number(tag(item, 'impDlr'));
  if (!exp && !imp) return null;
  // 중량(kg)도 함께 받는다 — 2026-08-31 추가.
  //   금액만 받고 있어서 **kg당 단가(달러/kg)를 계산할 수 없었다.**
  //   단가는 원자료에 없고 우리가 나눠서 만드는 값이라, 「우리가 계산한 값」에 해당한다.
  //   (`semi-export-unit-value` 기사의 차트가 이것 때문에 하드코딩으로 남아 있었다 — 미결 8번)
  const expWgt = Number(tag(item, 'expWgt'));
  const impWgt = Number(tag(item, 'impWgt'));
  const row = { d: month, exp, imp, bal: Number(tag(item, 'balPayments')) };
  if (Number.isFinite(expWgt) && expWgt > 0) row.expWgt = expWgt;
  if (Number.isFinite(impWgt) && impWgt > 0) row.impWgt = impWgt;
  return row;
}

async function accumulate(cc, name, fresh) {
  const file = new URL(`trade_${cc}.json`, SERIES_DIR);
  let stored = { id: `trade_${cc}`, name, unit: 'USD', cycle: 'M', points: [] };
  try {
    stored = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const map = new Map(stored.points.map((p) => [p.d, p]));
  for (const p of fresh) map.set(p.d, p);
  stored.points = [...map.values()].sort((a, b) => a.d.localeCompare(b.d));
  stored.updatedAt = new Date().toISOString().slice(0, 10);
  await writeFile(file, JSON.stringify(stored, null, 1) + '\n');
  return stored;
}

const eok = (v) => v / 1e8; // 억 달러

/** 이 계열이 이번 실행에서 받아야 할 달 목록.
 *  = 최근 MONTHS_BACK 개월(잠정치 갱신) ∪ SEED_MONTHS 안에서 아직 없는 달(씨앗 채우기) */
async function monthsFor(id, recent, seed) {
  let have = new Set();
  try {
    // 파일명은 accumulate() 와 같은 규칙이어야 한다. 여기서 접두사를 빠뜨리면
    // 저장분을 못 찾아 **매일 13개월을 받게 된다**(2026-08-31 작성 중 실제로 냈던 실수).
    const j = JSON.parse(await readFile(new URL(`trade_${id}.json`, SERIES_DIR), 'utf8'));
    // 「있는 달」의 기준은 날짜가 아니라 **필요한 필드까지 채워졌는가**다.
    //   중량을 나중에 받기 시작했으므로, 금액만 있는 옛 점은 아직 덜 찬 것으로 본다.
    //   이렇게 두면 스키마를 넓힐 때마다 다음 실행이 스스로 메운다.
    have = new Set((j.points ?? []).filter((p) => p.expWgt != null).map((p) => p.d));
  } catch {}
  // 예산이 남은 만큼만 과거를 채운다. 최근 달(recent)은 예산과 무관하게 언제나 받는다.
  const missing = seed.filter((m) => !have.has(m)).slice(0, Math.max(0, seedLeft));
  seedLeft -= missing.length;
  return [...new Set([...recent, ...missing])].sort();
}

/** 달 하나가 실패해도 나머지를 포기하지 않는다.
 *  다만 **한 계열이 통째로 실패하면** 키·권한 문제일 수 있으므로 위로 던진다. */
async function fetchMonths(label, months, cc, hs = '') {
  const fresh = [];
  let failed = 0;
  for (const m of months) {
    try {
      const p = await fetchMonth(cc, m, hs);
      if (p) fresh.push(p);
    } catch (e) {
      failed++;
      console.log(`[trade] ${label} ${m} 실패: ${e.message}`);
    }
  }
  if (!fresh.length && failed) throw new Error(`${label}: ${failed}개월 전부 실패`);
  return fresh;
}

async function main() {
  if (!KEY) {
    console.log('[trade] DATA_GO_KR_KEY 미설정 — 건너뜀');
    return;
  }
  await mkdir(SERIES_DIR, { recursive: true });
  const monthList = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      out.push(yymm(d));
    }
    return out;
  };
  const recent = monthList(MONTHS_BACK);
  const seed = monthList(SEED_MONTHS);

  let out = { asOf: null, rows: [] };
  try {
    out = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {}

  const empty = [];
  const broke = [];

  /** 계열 하나를 받아 누적한다.
   *  ★ **한 계열의 실패가 나머지를 죽이지 않는다.** 계열이 38개가 되면서 이 격리가 필수가 됐다 —
   *  예전 4개짜리 코드는 하나가 던지면 바깥 catch 로 빠져 **그 뒤 계열을 전부 건너뛰었다.**
   *  그리고 **값이 하나도 안 온 계열은 크게 찍는다**: 코드가 틀리면 API 가 오류 대신
   *  「빈 목록」을 주므로, 조용히 빈 파일만 남는다(2026-08-25 `gold` 과 같은 계열의 사고). */
  const runOne = async (id, label, cc, hs = '') => {
    try {
      const months = await monthsFor(id, recent, seed);
      if (months.length > MONTHS_BACK) {
        console.log(`[trade] ${label}: 이력이 짧아 ${months.length - MONTHS_BACK}개월 씨앗을 함께 받는다`);
      }
      const fresh = await fetchMonths(label, months, cc, hs);
      const stored = await accumulate(id, label, fresh);
      if (!stored.points.length) {
        empty.push(`${id}(${label})`);
        console.log(`[trade] ${label}: ⚠ 값이 하나도 없다 — 코드(${hs || cc})가 틀렸을 가능성이 크다`);
        return null;
      }
      const last = stored.points[stored.points.length - 1];
      console.log(`[trade] ${label}: ${stored.points.length}개월 누적, 최신 ${last.d}`);
      return stored;
    } catch (e) {
      broke.push(`${id}(${label}): ${e.message}`);
      console.log(`[trade] ${label} 실패: ${e.message}`);
      return null;
    }
  };

  const rows = [];
  for (const c of COUNTRIES) {
    const stored = await runOne(c.cc, c.name, c.cc);
    if (!stored) continue;
    const last = stored.points[stored.points.length - 1];
    rows.push({
      cc: c.cc,
      name: c.name,
      month: `${last.d.slice(0, 4)}.${last.d.slice(4)}`,
      exp: +eok(last.exp).toFixed(1),
      imp: +eok(last.imp).toFixed(1),
      bal: +eok(last.bal).toFixed(1),
    });
  }
  if (rows.length) {
    out.rows = rows;
    out.asOf = rows[0].month;
  }
  // 품목 시계열 (반도체·승용차·원유 등)
  for (const it of ITEMS) await runOne(it.id, it.name, '', it.hs);
  // 품목 × 국가 (반도체의 중화권 경로)
  for (const ic of ITEM_COUNTRIES) await runOne(ic.id, ic.name, ic.cc, ic.hs);

  const usedSeed = SEED_BUDGET - seedLeft;
  console.log(
    `[trade] 씨앗 ${usedSeed}/${SEED_BUDGET} 사용` +
      (seedLeft <= 0 ? ' — 예산을 다 썼다. 남은 과거는 다음 실행이 이어서 채운다' : '')
  );
  if (empty.length) console.log(`[trade] ⚠ 값이 비어 있는 계열 ${empty.length}개: ${empty.join(', ')}`);
  if (broke.length) console.log(`[trade] ⚠ 실패한 계열 ${broke.length}개: ${broke.join(' | ')}`);

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('[trade] trade.json 갱신');
}

main().catch((e) => {
  console.error(`[trade] 실패(기존 데이터 유지): ${e.message}`);
});
