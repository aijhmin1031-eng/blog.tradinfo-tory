// 공사 공고의 실적·시공능력 관련 필드 실측 — 일회성 탐색. CI 에서만 돈다.
//
// 왜 재는가: 크몽 고객이 「당사 실적 대비 입찰 참석이 가능한 공사건 분류」를 물었다.
// `docs/06_수집기_collector.md` 는 공사 공고에 `cnstrtnAbltyEvlAmtList`(시공능력평가액)·
// `indstrytyEvlRt`(업종평가율)·`mainCnsttyNm`(주공종)·`cnstrtsiteRgnNm`(공사현장지역)이
// 온다고 적어 두었는데, **그 값이 무엇을 담는지는 적혀 있지 않다.**
//
// ★ 값의 생김새를 모르는 채로 화면을 만들면 그것이 곧 오해가 된다.
//   그래서 ① 몇 %에 값이 있는지 ② 실제 값이 어떻게 생겼는지 ③ 표본 원문을
//   눈으로 볼 수 있게 찍는다. **값이 안 오면 그 기능은 접는다.**
const KEY = process.env.G2B_SERVICE_KEY || process.env.DATA_GO_KR_KEY || '';
const ENDPOINT = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';
const DAYS = Number(process.env.G2B_DAYS || 2);

const t0 = Date.now();
const log = (s) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(u) {
  let last;
  for (let i = 0; i < 3; i += 1) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'dotori-bid-radar/1.0' } });
      return await res.text();
    } catch (e) { last = e; await sleep(1500 * (i + 1)); }
  }
  throw last;
}

async function call(op, params) {
  const qs = new URLSearchParams({ serviceKey: KEY, type: 'json', numOfRows: '999', pageNo: '1', ...params });
  const text = await fetchText(`${ENDPOINT}${op}?${qs}`);
  if (text.trimStart().startsWith('<')) throw new Error(`XML 응답 ${text.slice(0, 140).replace(KEY, '***')}`);
  const data = JSON.parse(text);
  const h = data?.response?.header ?? {};
  const code = String(h.resultCode ?? '');
  if (code !== '00' && code !== '0') throw new Error(`오류 ${code} ${h.resultMsg ?? ''}`);
  const body = data?.response?.body ?? {};
  let items = body.items ?? [];
  if (!Array.isArray(items)) items = items.item ? [].concat(items.item) : [];
  return { items, total: Number(body.totalCount || 0) };
}

const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/** 필드 하나를 잰다: 값이 있는 비율, 서로 다른 값 개수, 짧은 표본 몇 개. */
function measure(rows, key, samples = 5) {
  const vals = rows.map((r) => r[key]).filter(has).map((v) => String(v).trim());
  const uniq = [...new Set(vals)];
  const rate = rows.length ? ((vals.length / rows.length) * 100).toFixed(1) : '0.0';
  const show = uniq.slice(0, samples).map((v) => (v.length > 90 ? `${v.slice(0, 90)}…` : v));
  console.log(`  ${key.padEnd(34)} ${String(vals.length).padStart(4)}건 (${rate.padStart(5)}%) · 서로 다른 값 ${uniq.length}`);
  for (const v of show) console.log(`      ▸ ${v}`);
}

async function main() {
  if (!KEY) { log('인증키 없음 — 중단'); return; }
  const now = new Date();
  const bgn = fmt(new Date(now.getTime() - DAYS * 864e5));
  const end = fmt(now);
  log(`조회 창 ${bgn} ~ ${end}`);

  const r = await call('/getBidPblancListInfoCnstwkPPSSrch',
    { inqryDiv: '1', bidNtceBgnDt: bgn, bidNtceEndDt: end });
  log(`공사 목록 ${r.items.length}건 / 총 ${r.total}`);
  if (!r.items.length) { log('받은 공고가 없어 잴 것이 없다'); return; }

  // ① 응답에 실제로 있는 키 전부 (문서에 없는 필드를 놓치지 않으려는 것)
  const keyCount = {};
  for (const it of r.items) for (const [k, v] of Object.entries(it)) if (has(v)) keyCount[k] = (keyCount[k] || 0) + 1;
  const keys = Object.keys(keyCount).sort();
  console.log(`\n── 응답 키 ${keys.length}종 (값이 하나라도 있는 것만) ──`);
  console.log(`   ${keys.join(', ')}`);

  // ② 실적·시공능력 후보 필드를 이름으로 훑는다 (문서에 없는 것까지 걸리게)
  const suspects = keys.filter((k) => /ablty|evl|prfmnc|cnstty|rgn|indstryty|ciblApl|bdgt|govsply/i.test(k));
  console.log(`\n── 실적·능력·공종·지역 관련으로 보이는 키 ${suspects.length}종 ──`);
  for (const k of suspects) measure(r.items, k, 4);

  // ③ 표본 두 건의 해당 키 원문 (생김새를 눈으로 본다)
  console.log('\n── 표본 2건 원문 ──');
  for (const it of r.items.slice(0, 2)) {
    console.log(`  [${it.bidNtceNo}-${it.bidNtceOrd}] ${String(it.bidNtceNm || '').slice(0, 50)}`);
    for (const k of suspects) if (has(it[k])) console.log(`      ${k} = ${JSON.stringify(it[k]).slice(0, 200)}`);
  }

  // ④ 평가대상 주력분야 (오퍼레이션 25) — 적격심사·낙찰자선정기준이 여기 온다는 문서 기록 확인
  await sleep(300);
  try {
    const e = await call('/getBidPblancListEvaluationIndstrytyMfrcInfo',
      { inqryDiv: '1', inqryBgnDt: bgn, inqryEndDt: end });
    log(`평가대상 주력분야 ${e.items.length}줄 / 총 ${e.total}`);
    if (e.items.length) {
      console.log(`   키: ${Object.keys(e.items[0]).join(', ')}`);
      for (const it of e.items.slice(0, 3)) console.log(`      ▸ ${JSON.stringify(it).slice(0, 320)}`);
    }
  } catch (err) {
    log(`평가대상 주력분야 조회 실패: ${String(err.message).slice(0, 160)}`);
  }

  log('탐색 끝');
}

main().catch((e) => {
  log(`실패: ${String(e.message).replace(KEY || 'KEY', '***').slice(0, 300)}`);
  process.exitCode = 1;
});
