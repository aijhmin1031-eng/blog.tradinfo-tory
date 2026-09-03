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
const MAX_NOTICES = Number(process.env.G2B_MAX || 60);

const WORK_DIVS = {
  cnstwk: { list: '/getBidPblancListInfoCnstwkPPSSrch', basis: '/getBidPblancListInfoCnstwkBsisAmount' },
  servc: { list: '/getBidPblancListInfoServcPPSSrch', basis: '/getBidPblancListInfoServcBsisAmount' },
};
const OP_LICENSE = '/getBidPblancListInfoLicenseLimit';
const OP_REGION = '/getBidPblancListInfoPrtcptPsblRgn';
const OP_AVALUE = '/getBidPblancListBidPrceCalclAInfo';

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
const key = (no, ord) => `${no}-${String(ord || '000').padStart(3, '0')}`;

async function call(op, params) {
  const qs = new URLSearchParams({ serviceKey: KEY, type: 'json', numOfRows: '100', pageNo: '1', ...params });
  const res = await fetch(`${ENDPOINT}${op}?${qs}`, { headers: { 'User-Agent': 'dotori-bid-radar/1.0' } });
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    // XML 은 보통 인증·파라미터 오류다. 본문에 인증키가 섞여 나올 수 있어 앞부분만 남긴다.
    throw new Error(`XML 응답(인증/파라미터 의심) ${op}: ${text.slice(0, 160).replace(KEY, '***')}`);
  }
  const data = JSON.parse(text);
  const header = data?.response?.header ?? {};
  const code = String(header.resultCode ?? '');
  if (code !== '00' && code !== '0') throw new Error(`API 오류 ${code} ${op}: ${header.resultMsg ?? ''}`);
  let items = data?.response?.body?.items ?? [];
  if (!Array.isArray(items)) items = items.item ? [].concat(items.item) : [];
  return items;
}

async function safeCall(op, params, label) {
  try {
    return await call(op, params);
  } catch (e) {
    console.log(`  · ${label} 건너뜀 (${e.message.slice(0, 120)})`);
    return [];
  }
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

  const rows = [];
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
  for (const it of await safeCall(OP_AVALUE, { inqryDiv: '1', inqryBgnDt: auxBgn, inqryEndDt: auxEnd }, 'A값')) {
    const k = key(it.bidNtceNo, it.bidNtceOrd);
    if (basis[k]) basis[k].a_value = it.bidPrceCalclAValue ?? it.aValue ?? null;
  }

  // 마감이 남은 공고를 앞에 두고, 화면이 감당할 만큼만 싣는다
  rows.sort((a, b) => String(b.bid_ntce_dt || '').localeCompare(String(a.bid_ntce_dt || '')));
  const notices = rows.slice(0, MAX_NOTICES).map((row) => {
    const k = key(row.bid_ntce_no, row.bid_ntce_ord);
    return { ...row, licenseLimits: licenses[k] || [], possibleRegions: regions[k] || [], basis: basis[k] || null };
  });

  const payload = {
    source: 'g2b',
    generatedAt: new Date().toISOString(),
    window: { bgn, end },
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
  console.log(`[g2b] 기록 ${notices.length}건 → src/data/bid-notices.json`, payload.counts);
}

main().catch((e) => {
  // 수집 실패가 사이트 빌드를 멈추면 안 된다. 기존 파일이 있으면 그대로 쓴다.
  console.log(`[g2b] 실패: ${String(e.message).replace(KEY || 'KEY', '***').slice(0, 200)}`);
  if (!existsSync(OUT)) process.exitCode = 0;
  else console.log('[g2b] 기존 데이터를 유지합니다.');
});
