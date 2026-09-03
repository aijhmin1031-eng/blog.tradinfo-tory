// 나라장터 입찰공고 수집 — 입찰레이더 `src/collector.py` + `g2b_client.py` 의 이식.
//
// CI 에서만 돈다(인증키가 Actions Secret 에 있다). 산출물은 `src/data/bid-notices.json`
// 이고 빌드가 그것을 읽어 `/bid-radar/` 를 그린다. 브라우저는 API 를 직접 부르지 않는다.
//
// 호출 한도: 개발계정 기준 **오퍼레이션마다 일 1,000건**이다. 그래서
//   - 업무구분은 공사·용역 둘만(외자·물품·기타는 이 화면의 대상이 아니다)
//   - 조회 창은 최근 N일(기본 2일), 페이지는 넉넉히 잡되 numOfRows 를 크게
//   - 기초금액·A값은 **수집된 공고가 있을 때만** 부른다
// 키가 없으면 조용히 건너뛴다(기존 파일 유지). 파이프라인 전체를 멈추지 않는다.
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../../src/data/bid-notices.json');
const ENDPOINT = process.env.G2B_ENDPOINT || 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';
const KEY = process.env.G2B_SERVICE_KEY || process.env.DATA_GO_KR_KEY || '';
const DAYS = Number(process.env.G2B_DAYS || 2);
// ★ 0 = 상한 없음(2026-09-04 소유주 지시 「검색되는 건 다 보여야지」).
// 예전에는 60건, 그다음 200건으로 잘랐는데 **자른 뒤에 거르니** 사용자가 찾는 공고가
// 처음부터 없을 수 있었다. 지금은 수집한 것을 전부 싣고 거르기는 화면이 한다.
const MAX_NOTICES = Number(process.env.G2B_MAX || 0);

const WORK_DIVS = {
  cnstwk: { list: '/getBidPblancListInfoCnstwkPPSSrch', basis: '/getBidPblancListInfoCnstwkBsisAmount' },
  servc: { list: '/getBidPblancListInfoServcPPSSrch', basis: '/getBidPblancListInfoServcBsisAmount' },
};
const OP_LICENSE = '/getBidPblancListInfoLicenseLimit';
const OP_REGION = '/getBidPblancListInfoPrtcptPsblRgn';
const OP_AVALUE = '/getBidPblancListBidPrceCalclAInfo';

// A값(법정경비) 구성 항목. 정본은 입찰레이더 `src/bid_price.py` 의 A_VALUE_COMPONENTS 이고
// 블로그 계산기는 `src/lib/bid-odds.js` 가 같은 목록을 들고 있다. 셋이 같아야 한다.
const A_VALUE_COMPONENTS = [
  'sftyMngcst', 'sftyChckMngcst', 'rtrfundNon', 'mrfnHealthInsrprm', 'npnInsrprm',
  'odsnLngtrmrcprInsrprm', 'qltyMngcst', 'envCnsrvcst', 'scontrctPayprcePayGrntyFee', 'usefulAmt',
];

const sumAValue = (item) => {
  if (!item) return 0;
  return A_VALUE_COMPONENTS.reduce((acc, k) => {
    const t = String(item[k] ?? '').replace(/,/g, '').trim();
    const n = t ? Number(t) : 0;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
};

// 기초금액 응답은 27개 항목으로 오는데 화면이 쓰는 것은 아래뿐이다.
// 상한을 없애 공고 수가 네 배로 늘었으므로, 안 쓰는 항목은 싣지 않는다.
// A값 구성 항목을 남기는 이유는 `a_value` 가 비었을 때 계산기가 직접 더하기 때문이다.
const BASIS_KEYS = [
  'bssamt', 'rsrvtnPrceRngBgnRate', 'rsrvtnPrceRngEndRate', 'a_value',
  ...A_VALUE_COMPONENTS,
];

function trimBasis(b) {
  if (!b) return null;
  const out = {};
  for (const k of BASIS_KEYS) if (b[k] !== undefined && b[k] !== null && b[k] !== '') out[k] = b[k];
  return Object.keys(out).length ? out : null;
}

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
const key = (no, ord) => `${no}-${String(ord || '000').padStart(3, '0')}`;

// 한 쪽에 받을 수 있는 최대 건수. 1000 이상을 넣으면 API 가 거부하고 10건만 준다
// (정본 `ai-bid-radar/src/g2b_client.py` 의 `_MAX_NUM_ROWS` 와 같은 값이다).
const PAGE_ROWS = 999;
const MAX_PAGES = Number(process.env.G2B_MAX_PAGES || 8);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 한 쪽을 받는다. 총건수(totalCount)를 함께 돌려주어 호출 쪽이 넘길지 정한다. */
async function call(op, params, page = 1, rows = PAGE_ROWS) {
  const qs = new URLSearchParams({
    serviceKey: KEY, type: 'json', numOfRows: String(rows), pageNo: String(page), ...params,
  });
  // ★ 연결 실패 한 번으로 계열을 통째로 버리지 않는다(2026-09-04 CI 에서 실제로 겪었다).
  //   같은 코드가 1분 전에 성공했는데 첫 호출만 `fetch failed` 였다.
  let text;
  let lastErr;
  for (let i = 0; i < 3; i += 1) {
    try {
      const res = await fetch(`${ENDPOINT}${op}?${qs}`, { headers: { 'User-Agent': 'dotori-bid-radar/1.0' } });
      text = await res.text();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * (i + 1));
    }
  }
  if (lastErr) throw lastErr;
  if (text.trimStart().startsWith('<')) {
    // XML 은 보통 인증·파라미터 오류다. 본문에 인증키가 섞여 나올 수 있어 앞부분만 남긴다.
    throw new Error(`XML 응답(인증/파라미터 의심) ${op}: ${text.slice(0, 160).replace(KEY, '***')}`);
  }
  const data = JSON.parse(text);
  const header = data?.response?.header ?? {};
  const code = String(header.resultCode ?? '');
  if (code !== '00' && code !== '0') throw new Error(`API 오류 ${code} ${op}: ${header.resultMsg ?? ''}`);
  const body = data?.response?.body ?? {};
  let items = body.items ?? [];
  if (!Array.isArray(items)) items = items.item ? [].concat(items.item) : [];
  return { items, total: Number(body.totalCount || 0) };
}

/**
 * ★ 총건수만큼 쪽을 넘겨 전부 받는다(2026-09-04 수리).
 *
 * 예전 `call()` 은 **1쪽·100건만 받고 끝냈다.** 보조정보(면허제한·참가가능지역·기초금액)는
 * 공고 한 건에 여러 줄이 붙어 조회창 이틀에 4,400줄이 쌓이는데, 그중 앞 100줄만 보니
 * 화면에 싣는 60건과 거의 겹치지 않아 **오류 없이 조용히 0건**이 됐다.
 * 정본 `g2b_client.fetch_aux()` 는 처음부터 999건씩 넘기고 있었다 — 4,438건이면 5쪽이라
 * 개발계정 일 1,000건 안에서 넉넉하다.
 *
 * 중간 쪽에서 실패하면 **그때까지 받은 것은 살린다**(전부 버리면 예전처럼 0이 된다).
 */
async function safeCall(op, params, label) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let got;
    try {
      got = await call(op, params, page);
    } catch (e) {
      console.log(`  · ${label} ${page}쪽에서 중단 (${e.message.slice(0, 120)})`);
      break;
    }
    out.push(...got.items);
    if (!got.items.length || page * PAGE_ROWS >= got.total) break;
    if (page === MAX_PAGES) console.log(`  · ${label} 총 ${got.total}건 중 ${out.length}건까지만 받았습니다(쪽 상한).`);
    await sleep(200);
  }
  return out;
}

const FIELDS = {
  bidNtceNo: 'bid_ntce_no', bidNtceOrd: 'bid_ntce_ord', bidNtceNm: 'bid_ntce_nm',
  ntceInsttNm: 'ntce_instt_nm', dminsttNm: 'dminstt_nm',
  cntrctCnclsMthdNm: 'cntrct_cncls_mthd_nm', sucsfbidMthdNm: 'sucsfbid_mthd_nm',
  bidNtceDt: 'bid_ntce_dt', bidClseDt: 'bid_clse_dt', opengDt: 'openg_dt',
  bidQlfctRgstDt: 'bid_qlfct_rgst_dt', dcmtgOprtnDt: 'dcmtg_oprtn_dt', dcmtgOprtnPlce: 'dcmtg_oprtn_plce',
  presmptPrce: 'presmpt_prce', asignBdgtAmt: 'asign_bdgt_amt', VAT: 'vat',
  prearngPrceDcsnMthdNm: 'prearng_prce_dcsn_mthd_nm',
  totPrdprcNum: 'tot_prdprc_num', drwtPrdprcNum: 'drwt_prdprc_num',
  sucsfbidLwltRate: 'sucsfbid_lwlt_rate',
  indstrytyLmtYn: 'indstrety_lmt_yn', cmmnSpldmdMethdNm: 'cmmn_spldmd_mthd_nm',
  cmmnSpldmdCorpRgnLmtYn: 'cmmn_spldmd_corp_rgn_lmt_yn',
  rgnLmtBidLocplcJdgmBssNm: 'rgn_lmt_bid_locplc_jdgm_bss_nm',
  bidNtceUrl: 'bid_ntce_url', bidNtceDtlUrl: 'bid_ntce_dtl_url',

  // ★ 공사 공고에만 오는 필드들(2026-09-04 실호출로 채워지는 비율까지 확인).
  //   용역 공고에는 아예 없다. 없는 값은 담지 않으므로 그대로 두면 된다.
  //   `cnstrtnAbltyEvlAmtList`(시공능력평가액)는 표본에서 값이 오지 않아 넣지 않았다 —
  //   오지 않는 필드로 기능을 만들면 그것이 곧 오해가 된다.
  mainCnsttyNm: 'main_cnstty_nm',                       // 주공종명 (37.9%) 면허와 같은 어휘로 온다
  mainCnsttyPresmptPrce: 'main_cnstty_presmpt_prce',    // 주공종 추정가격 (38.2%)
  cnstrtsiteRgnNm: 'cnstrtsite_rgn_nm',                 // 공사현장지역 (참가가능지역과 다른 축이다)
  rgnDutyJntcontrctYn: 'rgn_duty_jntcontrct_yn',        // 지역의무공동도급 여부 (100%)
  rgnDutyJntcontrctRt: 'rgn_duty_jntcontrct_rt',        // 지역업체 의무 지분율 (2.8%)
  indstrytyEvlRt: 'indstryty_evl_rt',                   // 업종평가율
  ciblAplYn: 'cibl_apl_yn',                             // 주계약자 적용 여부
};

function toRow(item, workDiv) {
  const row = { work_div: workDiv, raw: {} };
  for (const [api, col] of Object.entries(FIELDS)) {
    const v = item[api];
    if (v !== undefined && v !== null && String(v).trim() !== '') row[col] = v;
  }
  // 규격서 첨부는 체크리스트가 raw 에서 읽는다
  for (let i = 1; i <= 10; i += 1) if (item[`ntceSpecFileNm${i}`]) row.raw[`ntceSpecFileNm${i}`] = item[`ntceSpecFileNm${i}`];
  row.bid_ntce_ord = row.bid_ntce_ord || '000';
  return row;
}

async function main() {
  if (!KEY) {
    console.log('[g2b] 인증키 없음 — 수집을 건너뜁니다(기존 데이터 유지).');
    return;
  }
  const now = new Date();
  const bgn = fmt(new Date(now.getTime() - DAYS * 864e5));
  const end = fmt(now);
  console.log(`[g2b] 수집 창 ${bgn} ~ ${end}`);

  let rows = [];
  for (const [div, ops] of Object.entries(WORK_DIVS)) {
    const items = await safeCall(ops.list, { inqryDiv: '1', bidNtceBgnDt: bgn, bidNtceEndDt: end }, `${div} 목록`);
    console.log(`  · ${div} 공고 ${items.length}건`);
    for (const it of items) rows.push(toRow(it, div));
  }
  if (!rows.length) {
    console.log('[g2b] 받은 공고가 없습니다. 기존 데이터를 유지합니다.');
    return;
  }

  // 보강 조회 창은 양끝 6시간 확장(등록일시 기준이라 게시일시와 어긋난다)
  const shift = (s, h) => {
    const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:00`);
    return fmt(new Date(d.getTime() + h * 36e5));
  };
  const auxBgn = shift(bgn, -6);
  const auxEnd = shift(end, 6);

  const licenses = {};
  for (const it of await safeCall(OP_LICENSE, { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, '면허제한')) {
    const nm = String(it.lcnsLmtNm || '').trim();
    if (nm) (licenses[key(it.bidNtceNo, it.bidNtceOrd)] ||= []).push(nm);
  }
  const regions = {};
  for (const it of await safeCall(OP_REGION, { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, '참가가능지역')) {
    const nm = String(it.prtcptPsblRgnNm || '').trim();
    if (nm) (regions[key(it.bidNtceNo, it.bidNtceOrd)] ||= []).push(nm);
  }
  const basis = {};
  for (const [div, ops] of Object.entries(WORK_DIVS)) {
    for (const it of await safeCall(ops.basis, { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, `${div} 기초금액`)) {
      basis[key(it.bidNtceNo, it.bidNtceOrd)] = { ...it };
    }
  }
  // ★ A값은 합계로 오지 않는다(2026-09-04 실호출로 확인).
  // `bidPrceCalclAValue` 라는 필드는 응답에 없어서 예전 코드는 늘 null 을 넣고 있었다.
  // 구성 항목(안전관리비·퇴직공제부금·건강보험료 …)을 더한 값이 A값이다.
  // 그 항목들은 **기초금액 응답에도 그대로 들어 있으므로** 별도 호출 없이 먼저 채우고,
  // 비어 있는 것만 A값 오퍼레이션으로 메운다(개발계정 일 1,000건을 아낀다).
  for (const k of Object.keys(basis)) {
    const v = sumAValue(basis[k]);
    if (v > 0) basis[k].a_value = v;
  }
  const needA = Object.keys(basis).filter((k) => !(basis[k].a_value > 0));
  if (needA.length) {
    for (const it of await safeCall(OP_AVALUE, { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, 'A값')) {
      const k = key(it.bidNtceNo, it.bidNtceOrd);
      if (basis[k] && !(basis[k].a_value > 0)) basis[k].a_value = sumAValue(it) || null;
    }
  } else {
    console.log('  · A값은 기초금액 응답에서 전부 채웠습니다(호출 생략).');
  }

  // ★ 마감이 지난 공고는 싣지 않는다(2026-09-04 수리).
  // 예전에는 주석만 「마감이 남은 공고를 앞에」였고 실제로는 **게시일**로만 정렬했다.
  // 실데이터로 재어 보니 60건 중 5건이 이미 마감된 공고였다 — 참여할 수 없는 공고가
  // 화면을 차지하고, 상한(MAX_NOTICES)에 걸려 살아 있는 공고를 밀어낸다.
  const nowMs = Date.now();
  const clseMs = (r) => {
    const t = String(r.bid_clse_dt || '').trim();
    if (!t) return Infinity;          // 마감이 없으면 거르지 않는다(빈 값은 지어내지 않는다)
    const d = new Date(t.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? Infinity : d.getTime();
  };
  const before = rows.length;
  rows = rows.filter((r) => clseMs(r) >= nowMs);
  if (before !== rows.length) console.log(`  · 마감이 지난 공고 ${before - rows.length}건 제외`);

  // ★ 같은 공고가 두 줄로 오면 안 된다(2026-09-04 소유주 지시 「데이터가 겹치면 안 된다」).
  // 재공고·정정공고는 공고번호가 같고 차수만 다르다. **가장 큰 차수 하나만** 남긴다.
  const best = new Map();
  for (const r of rows) {
    const no = String(r.bid_ntce_no || '');
    const ord = Number(r.bid_ntce_ord || 0);
    const prev = best.get(no);
    if (!prev || ord > Number(prev.bid_ntce_ord || 0)) best.set(no, r);
  }
  if (best.size !== rows.length) console.log(`  · 같은 공고의 이전 차수 ${rows.length - best.size}건 제외`);
  rows = [...best.values()];

  // 마감이 임박한 것부터. 같으면 최근 게시분이 앞이다.
  rows.sort((a, b) => (clseMs(a) - clseMs(b))
    || String(b.bid_ntce_dt || '').localeCompare(String(a.bid_ntce_dt || '')));
  const kept = MAX_NOTICES > 0 ? rows.slice(0, MAX_NOTICES) : rows;
  const notices = kept.map((row) => {
    const k = key(row.bid_ntce_no, row.bid_ntce_ord);
    return {
      ...row,
      licenseLimits: licenses[k] || [],
      possibleRegions: regions[k] || [],
      basis: trimBasis(basis[k]),
    };
  });

  // ★ 화면이 고르게 할 어휘는 **API 가 쓰는 그 이름**이어야 한다(2026-09-04 실측).
  //
  // 손으로 적은 표는 반드시 낡는다. 실제로 낡아 있었다 —
  //   · 면허: 우리는 「조경식재공사업」, 나라장터는 「조경식재ㆍ시설물공사업」(가운뎃점이 ㆍ 다).
  //           licenseMatch 는 부분 문자열로 맞추므로 **어느 쪽으로도 안 걸렸다.**
  //   · 지역: 우리는 「전라남도」·「광주광역시」, 나라장터는 「전남광주통합특별시」.
  //           인천은 제물포구·영종구·서해구·검단구로 갈렸다.
  // 그래서 수집할 때 어휘를 함께 적어 두고, 화면이 등록부와 합쳐 쓴다.
  // 지역은 광역·기초 두 마디까지만 본다(읍면리까지 오는 공고가 있는데 그것은 고를 대상이 아니다).
  const licenseVocab = [...Object.entries(
    Object.values(licenses).flat().reduce((m, v) => {
      const nm = String(v).split('/')[0].trim();
      if (nm) m[nm] = (m[nm] || 0) + 1;
      return m;
    }, {}),
  )].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const regionVocab = {};
  for (const v of Object.values(regions).flat()) {
    const t = String(v).replace(/ {2,}/g, ' ').trim().split(' ').filter(Boolean);
    if (!t.length) continue;
    const prov = t[0];
    (regionVocab[prov] ||= new Set());
    // 두 마디째가 시·군·구일 때만 기초로 본다(「도계읍」·「발이리」는 넣지 않는다).
    if (t[1] && /[시군구]$/.test(t[1])) regionVocab[prov].add(t[1]);
  }
  const regionVocabOut = Object.fromEntries(
    Object.entries(regionVocab)
      .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
      .map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b, 'ko'))]),
  );

  const payload = {
    source: 'g2b',
    generatedAt: new Date().toISOString(),
    window: { bgn, end },
    licenseVocab,
    regionVocab: regionVocabOut,
    counts: {
      notices: notices.length,
      withLicense: notices.filter((n) => n.licenseLimits.length).length,
      withRegion: notices.filter((n) => n.possibleRegions.length).length,
      withBasis: notices.filter((n) => n.basis).length,
    },
    notices,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 1)}\n`, 'utf8');
  console.log(`[g2b] 기록 ${notices.length}건 (수집 ${rows.length}건 중) → src/data/bid-notices.json`, payload.counts);
}

main().catch((e) => {
  // 수집 실패가 사이트 빌드를 멈추면 안 된다. 기존 파일이 있으면 그대로 쓴다.
  console.log(`[g2b] 실패: ${String(e.message).replace(KEY || 'KEY', '***').slice(0, 200)}`);
  if (!existsSync(OUT)) process.exitCode = 0;
  else console.log('[g2b] 기존 데이터를 유지합니다.');
});
