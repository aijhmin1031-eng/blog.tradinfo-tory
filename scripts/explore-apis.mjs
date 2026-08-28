// 일회성 탐색 — 우리 키로 실제로 무엇을 가져올 수 있는지 목록화한다.
// CI 에서만 돌린다(키가 거기에만 있다). 출력은 CI 로그로 읽는다.
//
// ★ 키 값을 절대 출력하지 않는다. URL 도 그대로 찍지 않는다(키가 박혀 있다).
const ECOS = process.env.ECOS_API_KEY;
const FRED = process.env.FRED_API_KEY;
const DART = process.env.DART_API_KEY;
const GOKR = process.env.DATA_GO_KR_KEY;

const say = (...a) => console.log(...a);
const head = (t) => say(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`);

async function jget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function tget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// ── ECOS: 통계표 목록에서 거시 해석에 쓸 만한 것만 골라 본다 ──────────
async function ecos() {
  head('ECOS (한국은행) — 통계표 목록');
  if (!ECOS) return say('키 없음');
  try {
    const d = await jget(`https://ecos.bok.or.kr/api/StatisticTableList/${ECOS}/json/kr/1/1000`);
    const rows = d?.StatisticTableList?.row ?? [];
    say(`전체 통계표 ${rows.length}건 조회`);
    const KEY = /물가|고용|실업|국민계정|국제수지|경상|통화|수출|수입|산업생산|기대인플레|가계신용|생산자/;
    const hit = rows.filter((r) => KEY.test(r.STAT_NAME ?? ''));
    say(`\n거시 해석 관련 ${hit.length}건:`);
    for (const r of hit) {
      say(`  ${r.STAT_CODE}  [${r.CYCLE ?? '?'}] ${r.STAT_NAME}`);
    }
  } catch (e) { say(`실패: ${e.message}`); }
}

// ── ECOS: 우리가 찾던 표들의 세부항목 ──────────────────────────────
async function ecosItems() {
  head('ECOS — 관심 통계표의 세부항목 (첫 12개씩)');
  if (!ECOS) return say('키 없음');
  const want = [
    ['901Y009', '소비자물가지수(이미 사용 중)'],
    ['404Y014', '생산자물가지수(추정)'],
    ['901Y027', '경제심리·기대인플레(추정)'],
    ['301Y013', '국제수지(추정)'],
    ['901Y027', '고용(추정)'],
  ];
  const seen = new Set();
  for (const [code, label] of want) {
    if (seen.has(code)) continue;
    seen.add(code);
    try {
      const d = await jget(`https://ecos.bok.or.kr/api/StatisticItemList/${ECOS}/json/kr/1/12/${code}`);
      const rows = d?.StatisticItemList?.row ?? [];
      say(`\n${code} (${label}) — ${rows.length}개`);
      for (const r of rows) say(`    ${r.ITEM_CODE}  ${r.ITEM_NAME}  [${r.CYCLE ?? ''}] ${r.UNIT_NAME ?? ''}`);
    } catch (e) { say(`\n${code} (${label}) 실패: ${e.message}`); }
  }
}

// ── 관세청: 「수출 총액」을 뽑을 수 있는가 (지금 최대 구멍) ─────────
async function customs() {
  head('관세청 nitemtrade — 전체 수출 총액을 뽑을 수 있는가');
  if (!GOKR) return say('키 없음');
  const month = '202607';
  const tries = [
    ['국가코드 없이, HS 없이', ''],
    ['cntyCd=ZZ (전체 추정)', '&cntyCd=ZZ'],
    ['cntyCd=999', '&cntyCd=999'],
    ['hsSgn=00 (2단위 총계 추정)', '&hsSgn=00'],
  ];
  for (const [label, extra] of tries) {
    try {
      const xml = await tget(
        `https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList` +
        `?serviceKey=${GOKR}&strtYymm=${month}&endYymm=${month}${extra}&numOfRows=2&pageNo=1`
      );
      const code = xml.match(/<resultCode>([^<]*)/)?.[1];
      const msg = xml.match(/<resultMsg>([^<]*)/)?.[1];
      const first = xml.match(/<item>[\s\S]*?<\/item>/)?.[0] ?? '';
      const yr = first.match(/<year>([^<]*)/)?.[1];
      const exp = first.match(/<expDlr>([^<]*)/)?.[1];
      const imp = first.match(/<impDlr>([^<]*)/)?.[1];
      say(`  ${label}: code=${code} msg=${msg} · year=${yr} exp=${exp} imp=${imp}`);
    } catch (e) { say(`  ${label}: 실패 ${e.message}`); }
  }
}

// ── DART: 무엇을 쓸 수 있나 ─────────────────────────────────────
async function dart() {
  head('DART (금융감독원) — 사용 가능 확인');
  if (!DART) return say('키 없음');
  try {
    const d = await jget(`https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART}&bgn_de=20260801&end_de=20260828&corp_cls=Y&page_count=3`);
    say(`  공시목록 status=${d.status} (${d.message}) · 건수 ${d.total_count ?? '?'}`);
    for (const it of (d.list ?? []).slice(0, 3)) say(`    ${it.rcept_dt} ${it.corp_name} · ${it.report_nm}`);
  } catch (e) { say(`  공시목록 실패: ${e.message}`); }
  // 재무제표(단일회사 주요계정) — 삼성전자 00126380
  try {
    const d = await jget(`https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART}&corp_code=00126380&bsns_year=2025&reprt_code=11011`);
    say(`  주요계정 status=${d.status} (${d.message}) · 항목 ${(d.list ?? []).length}개`);
    for (const it of (d.list ?? []).slice(0, 4)) say(`    ${it.account_nm}: ${it.thstrm_amount}`);
  } catch (e) { say(`  주요계정 실패: ${e.message}`); }
}

// ── FRED: 한국 관련 계열 검색 ───────────────────────────────────
async function fred() {
  head('FRED — 한국(Korea) 관련 계열 검색 상위');
  if (!FRED) return say('키 없음');
  for (const q of ['Korea exports', 'Korea current account', 'Korea producer prices']) {
    try {
      const d = await jget(`https://api.stlouisfed.org/fred/series/search?search_text=${encodeURIComponent(q)}&api_key=${FRED}&file_type=json&limit=6&order_by=popularity&sort_order=desc`);
      say(`\n  "${q}" — ${d.count}건 중 상위:`);
      for (const s of d.seriess ?? []) say(`    ${s.id}  [${s.frequency_short}] ${s.title.slice(0, 62)} (${s.units_short})`);
    } catch (e) { say(`\n  "${q}" 실패: ${e.message}`); }
  }
}

await ecos();
await ecosItems();
await customs();
await dart();
await fred();
say('\n탐색 완료');
