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

const COUNTRIES = [
  { cc: 'US', name: '미국' },
  { cc: 'CN', name: '중국' },
  { cc: 'JP', name: '일본' },
  { cc: 'VN', name: '베트남' },
];
const MONTHS_BACK = 4; // 이번 달 포함 최근 4개월 재조회 (잠정치 갱신 겸용)
// 목표 이력 길이. 계열이 이보다 짧으면 **모자란 달만** 함께 받아 채운다(자가 치유).
//   2026-08-31 신설. 국가별 4종이 3개월치뿐이었다(품목별은 13개월). 버그가 아니라
//   **과거 씨앗을 안 심어서**였고, MONTHS_BACK 이 4라 한 달에 하나씩만 늘고 있었다.
//   매번 13개월을 받으면 호출이 3배가 되므로, **부족할 때만** 채운다.
//   첫 실행에서만 비용이 들고 그 뒤로는 평소대로 4개월만 돈다.
const SEED_MONTHS = 13;
// 품목 시계열 — 반도체·AI 허브 등에서 사용
const ITEMS = [
  { hs: '8542', id: 'hs8542', name: '반도체(전자집적회로)' },
  { hs: '8486', id: 'hs8486', name: '반도체 제조 장비' },
];
// 품목 × 국가 — 반도체 특집의 국가별 지도(중화권 경로)에서 쓴다.
//   ★ 2026-08-31 추가. 이 세 계열은 **파이프라인에 아예 없었다.** 과거에 손으로 한 번
//   심어 두고 그 뒤로 갱신이 끊겨 있었다(`hs8542_HK` 최종 갱신 8/22, 품목별은 8/29).
//   그 데이터를 쓰는 기사들이 낡은 숫자를 보여 주고 있었다.
//   **손으로 심은 계열은 반드시 파이프라인에 등록할 것.** 안 하면 조용히 멈춘다.
const ITEM_COUNTRIES = [
  { hs: '8542', cc: 'CN', id: 'hs8542_CN', name: '반도체 對중국' },
  { hs: '8542', cc: 'HK', id: 'hs8542_HK', name: '반도체 對홍콩' },
  { hs: '8542', cc: 'TW', id: 'hs8542_TW', name: '반도체 對대만' },
];

const yymm = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1] : null;
};

async function fetchMonth(cc, month, hsSgn = '') {
  const url =
    `https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList` +
    `?serviceKey=${KEY}&strtYymm=${month}&endYymm=${month}` +
    (hsSgn ? `&hsSgn=${hsSgn}` : `&cntyCd=${cc}`) +
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
  const missing = seed.filter((m) => !have.has(m));
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

  try {
    const rows = [];
    for (const c of COUNTRIES) {
      const months = await monthsFor(c.cc, recent, seed);
      if (months.length > MONTHS_BACK) {
        console.log(`[trade] ${c.name}: 이력이 짧아 ${months.length - MONTHS_BACK}개월 씨앗을 함께 받는다`);
      }
      const fresh = await fetchMonths(c.name, months, c.cc);
      const stored = await accumulate(c.cc, c.name, fresh);
      const last = stored.points[stored.points.length - 1];
      if (!last) continue;
      rows.push({
        cc: c.cc,
        name: c.name,
        month: `${last.d.slice(0, 4)}.${last.d.slice(4)}`,
        exp: +eok(last.exp).toFixed(1),
        imp: +eok(last.imp).toFixed(1),
        bal: +eok(last.bal).toFixed(1),
      });
      console.log(`[trade] ${c.name}: ${stored.points.length}개월 누적, 최신 ${last.d}`);
    }
    if (rows.length) {
      out.rows = rows;
      out.asOf = rows[0].month;
    }
    // 품목 시계열 (반도체 등)
    for (const it of ITEMS) {
      const months = await monthsFor(it.id, recent, seed);
      if (months.length > MONTHS_BACK) {
        console.log(`[trade] ${it.name}: 이력이 짧아 ${months.length - MONTHS_BACK}개월 씨앗을 함께 받는다`);
      }
      const fresh = await fetchMonths(it.name, months, '', it.hs);
      const stored = await accumulate(it.id, it.name, fresh);
      console.log(`[trade] ${it.name}: ${stored.points.length}개월 누적`);
    }
    // 품목 × 국가
    for (const ic of ITEM_COUNTRIES) {
      const months = await monthsFor(ic.id, recent, seed);
      if (months.length > MONTHS_BACK) {
        console.log(`[trade] ${ic.name}: 이력이 짧아 ${months.length - MONTHS_BACK}개월 씨앗을 함께 받는다`);
      }
      const fresh = await fetchMonths(ic.name, months, ic.cc, ic.hs);
      const stored = await accumulate(ic.id, ic.name, fresh);
      console.log(`[trade] ${ic.name}: ${stored.points.length}개월 누적`);
    }
  } catch (e) {
    console.log(`[trade] 수집 건너뜀(기존 유지): ${e.message}`);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('[trade] trade.json 갱신');
}

main().catch((e) => {
  console.error(`[trade] 실패(기존 데이터 유지): ${e.message}`);
});
