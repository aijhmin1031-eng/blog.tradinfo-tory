// 나라장터 보조정보 실측 — 일회성 탐색. CI(`.github/workflows/explore.yml`)에서만 돈다.
//
// 무엇을 재는가
//   ① 오퍼레이션마다 totalCount 와 실제로 받아 온 건수 (쪽 넘기기가 도는지)
//   ② 참가가능지역 표기의 **실제 어휘** — 「경상북도」인지 「경북」인지, 기초지자체까지
//      오는지. 소재지 2단 드롭다운을 무엇으로 채울지가 여기서 정해진다.
//   ③ 면허제한 표기 — `src/data/bid-licenses.json` 의 27종이 실제 공고를 얼마나 덮는지
//   ④ 공고 한 건에 지역·면허가 몇 줄이나 붙는지
//
// 값은 세어서 요약만 찍는다. 인증키는 어디에도 남기지 않는다.
const KEY = process.env.G2B_SERVICE_KEY || process.env.DATA_GO_KR_KEY || '';
const ENDPOINT = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';
const DAYS = Number(process.env.G2B_DAYS || 2);
const PAGE_ROWS = 999;
const MAX_PAGES = 8;

const t0 = Date.now();
// ★ 모든 줄에 경과 시간을 찍는다. 「느린 것」과 「멈춘 것」을 구별하지 못하면
//   멀쩡한 실행을 죽이게 된다(2026-09-01 전례).
const log = (s) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ★ 연결 실패는 결론이 아니다(2026-09-04). 같은 코드가 1분 전에 성공했는데
//   첫 호출이 `fetch failed` 한 번으로 죽었다. 세 번까지 다시 걸어 본다.
async function fetchText(u) {
  let last;
  for (let i = 0; i < 3; i += 1) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'dotori-bid-radar/1.0' } });
      return await res.text();
    } catch (e) {
      last = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw last;
}

async function page(op, params, pageNo) {
  const qs = new URLSearchParams({
    serviceKey: KEY, type: 'json', numOfRows: String(PAGE_ROWS), pageNo: String(pageNo), ...params,
  });
  const text = await fetchText(`${ENDPOINT}${op}?${qs}`);
  if (text.trimStart().startsWith('<')) throw new Error(`XML 응답 ${text.slice(0, 120).replace(KEY, '***')}`);
  const data = JSON.parse(text);
  const code = String(data?.response?.header?.resultCode ?? '');
  if (code !== '00' && code !== '0') throw new Error(`오류 ${code} ${data?.response?.header?.resultMsg ?? ''}`);
  const body = data?.response?.body ?? {};
  let items = body.items ?? [];
  if (!Array.isArray(items)) items = items.item ? [].concat(items.item) : [];
  return { items, total: Number(body.totalCount || 0) };
}

async function all(op, params, label) {
  const out = [];
  let total = 0;
  for (let p = 1; p <= MAX_PAGES; p += 1) {
    const got = await page(op, params, p);
    total = got.total;
    out.push(...got.items);
    log(`  ${label} ${p}쪽 ${got.items.length}건 (누적 ${out.length} / 총 ${total})`);
    if (!got.items.length || p * PAGE_ROWS >= total) break;
    await sleep(200);
  }
  return { rows: out, total };
}

/** 값별 건수를 많은 순으로. 어휘가 무엇인지 눈으로 보려는 것이다. */
function tally(values, top = 0) {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) || 0) + 1);
  const out = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return top > 0 ? out.slice(0, top) : out;
}

async function main() {
  if (!KEY) { log('인증키 없음 — 중단'); return; }
  const now = new Date();
  const bgn = fmt(new Date(now.getTime() - DAYS * 864e5));
  const end = fmt(now);
  log(`조회 창 ${bgn} ~ ${end}`);

  // ① 공고 목록 (공사·용역)
  const notices = [];
  for (const [div, op] of Object.entries({
    cnstwk: '/getBidPblancListInfoCnstwkPPSSrch',
    servc: '/getBidPblancListInfoServcPPSSrch',
  })) {
    const r = await all(op, { inqryDiv: '1', bidNtceBgnDt: bgn, bidNtceEndDt: end }, `${div} 목록`);
    log(`${div} 목록: 총 ${r.total}건 중 ${r.rows.length}건 확보`);
    notices.push(...r.rows.map((it) => ({ ...it, __div: div })));
  }
  log(`공고 합계 ${notices.length}건`);

  // 마감이 남은 것만 (화면에 싣는 대상과 같은 기준)
  const alive = notices.filter((n) => {
    const t = String(n.bidClseDt || '').trim();
    if (!t) return true;
    const d = new Date(t.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) || d.getTime() >= Date.now();
  });
  log(`마감 남은 공고 ${alive.length}건 (지난 것 ${notices.length - alive.length}건)`);

  const shift = (s, h) => {
    const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:00`);
    return fmt(new Date(d.getTime() + h * 36e5));
  };
  const auxBgn = shift(bgn, -6);
  const auxEnd = shift(end, 6);
  const key = (no, ord) => `${no}-${String(ord || '000').padStart(3, '0')}`;
  const noticeKeys = new Set(alive.map((n) => key(n.bidNtceNo, n.bidNtceOrd)));

  // ② 참가가능지역 — 어휘를 본다
  const rgn = await all('/getBidPblancListInfoPrtcptPsblRgn',
    { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, '참가가능지역');
  const rgnNames = rgn.rows.map((r) => String(r.prtcptPsblRgnNm || '').trim()).filter(Boolean);
  const rgnHit = new Set(rgn.rows.filter((r) => noticeKeys.has(key(r.bidNtceNo, r.bidNtceOrd)))
    .map((r) => key(r.bidNtceNo, r.bidNtceOrd)));
  log(`참가가능지역 ${rgn.rows.length}줄 · 우리 공고와 겹치는 공고 ${rgnHit.size}건`);
  console.log('── 지역 표기 전체 ──');
  for (const [v, c] of tally(rgnNames)) console.log(`   ${String(c).padStart(5)}  ${v}`);
  const withSpace = rgnNames.filter((v) => v.includes(' ')).length;
  console.log(`   (공백 포함 표기 ${withSpace}줄 / 서로 다른 표기 ${new Set(rgnNames).size}종)`);

  // ③ 면허제한 — 카탈로그가 얼마나 덮는지
  const lic = await all('/getBidPblancListInfoLicenseLimit',
    { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, '면허제한');
  const licNames = lic.rows.map((r) => String(r.lcnsLmtNm || '').split('/')[0].trim()).filter(Boolean);
  const licHit = new Set(lic.rows.filter((r) => noticeKeys.has(key(r.bidNtceNo, r.bidNtceOrd)))
    .map((r) => key(r.bidNtceNo, r.bidNtceOrd)));
  log(`면허제한 ${lic.rows.length}줄 · 우리 공고와 겹치는 공고 ${licHit.size}건`);
  console.log('── 면허 표기 전체 ──');
  for (const [v, c] of tally(licNames)) console.log(`   ${String(c).padStart(5)}  ${v}`);
  console.log(`   (서로 다른 표기 ${new Set(licNames).size}종)`);

  // ④ 기초금액
  for (const [div, op] of Object.entries({
    cnstwk: '/getBidPblancListInfoCnstwkBsisAmount',
    servc: '/getBidPblancListInfoServcBsisAmount',
  })) {
    const r = await all(op, { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, `${div} 기초금액`);
    const hit = new Set(r.rows.filter((x) => noticeKeys.has(key(x.bidNtceNo, x.bidNtceOrd)))
      .map((x) => key(x.bidNtceNo, x.bidNtceOrd)));
    log(`${div} 기초금액 ${r.rows.length}줄 · 우리 공고와 겹치는 공고 ${hit.size}건`);
  }

  log('탐색 끝');
}

main().catch((e) => {
  log(`실패: ${String(e.message).replace(KEY || 'KEY', '***').slice(0, 300)}`);
  process.exitCode = 1;
});
