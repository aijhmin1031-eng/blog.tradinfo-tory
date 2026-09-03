// 입찰레이더 기초자료 — `ai-bid-radar/src/briefing.py` + `briefing_excel.py` + `notifier.py` 이식.
//
// 엑셀 네 시트(공고 비교표 · 참여 체크리스트 · 공동도급 분류 · 투찰가 참고)와
// 텔레그램 알림 카드를 **같은 열·같은 순서·같은 문구**로 화면에 낸다.
// 엑셀은 파일로 받아 열어야 보이고 알림은 텔레그램에서만 보이므로, 그 둘을 웹에 옮긴 것이다.

import * as joint from './joint-supply.js';
import { BidParams, analyze } from '../bid-odds.js';

/** 금액 사람친화 표기: 568181818 -> '5.7억' (briefing._won 과 같은 규칙) */
export function won(v) {
  // 파이썬 _won 은 None·빈값에서 예외가 나 '-' 를 돌려준다. Number(null)=0 이라
  // 그대로 옮기면 값이 없는 칸에 0 이 찍힌다(배정예산 열에서 실제로 그랬다).
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!isFinite(n)) return '-';
  if (n <= 0) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return Math.round(n / 10000).toLocaleString('ko-KR') + '만';
  return Math.round(n).toLocaleString('ko-KR');
}

export const WORK_DIV_LABEL = {
  cnstwk: '공사', servc: '용역', frgcpt: '외자', thng: '물품', etc: '기타',
};

const raw = (notice) => notice.raw || {};

/** 정규컬럼(snake) 우선, 없으면 raw(camel). '0'·빈값은 없는 것으로 본다(파이썬 _g 와 동일). */
function g(notice, r, ...keys) {
  for (const k of keys) {
    const v = notice[k];
    if (v !== undefined && v !== null && v !== '' && v !== '0') return v;
  }
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== '' && v !== '0') return v;
  }
  return null;
}

/**
 * 공고 원문 URL. **API 가 준 값만 쓴다.**
 *
 * ★ 주소를 손으로 지어내지 않는다(2026-09-04 실측). 나라장터도 조달정보 개방포털도
 * 지금은 세션 키가 붙은 SPA 라 **없는 공고번호를 넣어도 200 이 온다** — 상태코드로
 * 진짜와 가짜가 안 갈린다. 틀린 링크는 없는 링크보다 나쁘므로 빈 값으로 남긴다.
 * (실제 응답에서는 `bidNtceUrl` 이 비어 있고 `bidNtceDtlUrl` 에 값이 온다.)
 */
export function noticeUrl(notice) {
  const r = raw(notice);
  return g(notice, r, 'bid_ntce_dtl_url', 'bidNtceDtlUrl', 'bid_ntce_url', 'bidNtceUrl') || '';
}

/** 공고 핵심 항목 -> 비교표용 객체. 열 이름까지 엑셀과 같다. */
export function summarize(notice) {
  const r = raw(notice);
  const no = notice.bid_ntce_no || r.bidNtceNo || '';
  const ordn = notice.bid_ntce_ord || r.bidNtceOrd || '000';
  const nm = notice.bid_ntce_nm || r.bidNtceNm || '(제목없음)';
  const wd = notice.work_div || '';
  const presmpt = g(notice, r, 'presmpt_prce', 'presmptPrce');
  const bdgt = g(notice, r, 'asign_bdgt_amt', 'asignBdgtAmt', 'bdgtAmt');
  const vat = g(notice, r, 'vat', 'VAT');

  return {
    공고번호: `${no}-${ordn}`,
    업무구분: WORK_DIV_LABEL[wd] ?? wd,
    공고명: nm,
    수요기관: g(notice, r, 'dminstt_nm', 'dminsttNm') || '-',
    발주기관: g(notice, r, 'ntce_instt_nm', 'ntceInsttNm') || '-',
    계약방법: g(notice, r, 'cntrct_cncls_mthd_nm', 'cntrctCnclsMthdNm') || '-',
    낙찰방법: g(notice, r, 'sucsfbid_mthd_nm', 'sucsfbidMthdNm') || '-',
    추정가격: won(presmpt),
    배정예산: won(bdgt),
    부가세: won(vat),
    예가방법: g(notice, r, 'prearng_prce_dcsn_mthd_nm', 'prearngPrceDcsnMthdNm') || '-',
    낙찰하한율: g(notice, r, 'sucsfbid_lwlt_rate', 'sucsfbidLwltRate') ?? '-',
    공고게시: g(notice, r, 'bid_ntce_dt', 'bidNtceDt') || '-',
    입찰마감: g(notice, r, 'bid_clse_dt', 'bidClseDt') || '-',
    개찰일시: g(notice, r, 'openg_dt', 'opengDt') || '-',
    자격등록마감: g(notice, r, 'bid_qlfct_rgst_dt', 'bidQlfctRgstDt') || '-',
    업종제한: String(g(notice, r, 'indstrety_lmt_yn', 'indstrytyLmtYn') || '').toUpperCase() === 'Y' ? '있음' : '없음',
    지역제한: g(notice, r, 'rgn_lmt_bid_locplc_jdgm_bss_nm', 'rgnLmtBidLocplcJdgmBssNm') || '없음',
    공동수급: g(notice, r, 'cmmn_spldmd_mthd_nm', 'cmmnSpldmdMethdNm') || '-',
    공동도급구분: joint.evaluate(notice, r).label,
    원문URL: g(notice, r, 'bid_ntce_dtl_url', 'bidNtceDtlUrl', 'bid_ntce_url', 'bidNtceUrl') || '',
  };
}

// 엑셀 「공고 비교표」 열 순서 그대로
export const COMPARE_COLS = [
  '공고번호', '업무구분', '공고명', '수요기관', '계약방법', '낙찰방법',
  '추정가격', '배정예산', '예가방법', '낙찰하한율',
  '입찰마감', '개찰일시', '자격등록마감',
  '업종제한', '지역제한', '공동수급', '공동도급구분', '공고게시', '원문URL',
];

/** 참여 준비 체크리스트. [항목, 값, 메모] 순서·문구까지 파이썬과 같다. */
export function checklist(notice, licenseLimits = null, possibleRegions = null) {
  const r = raw(notice);
  const items = [];
  items.push(['입찰 마감', g(notice, r, 'bid_clse_dt', 'bidClseDt') || '-', '이 시각 전 투찰 완료']);
  items.push(['개찰 일시', g(notice, r, 'openg_dt', 'opengDt') || '-', '결과 확인']);
  const qlfct = g(notice, r, 'bid_qlfct_rgst_dt', 'bidQlfctRgstDt');
  if (qlfct) items.push(['입찰참가자격 등록마감', qlfct, '★ 이 전에 자격등록 필수']);
  const pq = g(notice, r, 'pq_appl_doc_rcpt_dt', 'pqApplDocRcptDt');
  if (pq) items.push(['PQ신청서 접수마감', pq, 'PQ 대상 공고']);
  const dcmtg = g(notice, r, 'dcmtg_oprtn_dt', 'dcmtgOprtnDt');
  if (dcmtg) {
    items.push(['설명회', `${dcmtg} / ${g(notice, r, 'dcmtg_oprtn_plce', 'dcmtgOprtnPlce') || ''}`, '참석 권장']);
  }

  if (licenseLimits && licenseLimits.length) {
    items.push(['필요 면허/업종', licenseLimits.join(' · '), '★ 보유 여부 확인']);
  } else if (String(g(notice, r, 'indstrety_lmt_yn', 'indstrytyLmtYn') || '').toUpperCase() === 'Y') {
    items.push(['업종 제한', '있음(상세 확인 필요)', '공고서에서 면허 확인']);
  }
  if (possibleRegions && possibleRegions.length) {
    items.push(['참가가능 지역', possibleRegions.join(' · '), '★ 소재지 확인']);
  }

  const presmpt = g(notice, r, 'presmpt_prce', 'presmptPrce');
  if (presmpt) items.push(['추정가격', won(presmpt), '투찰가 산정 기준']);
  items.push(['입찰보증금', '통상 입찰금액의 5% 이상', '공고서 조건 확인(전자보증서 등)']);
  items.push(['낙찰방법', g(notice, r, 'sucsfbid_mthd_nm', 'sucsfbidMthdNm') || '-', '적격심사/최저가 등 방식 확인']);

  const specFiles = [];
  for (let i = 1; i <= 10; i += 1) if (r[`ntceSpecFileNm${i}`]) specFiles.push(r[`ntceSpecFileNm${i}`]);
  if (specFiles.length) {
    items.push(['규격서/공고문', `${specFiles.length}개 첨부`,
      '다운로드 후 과업·서류 확인: ' + specFiles.slice(0, 3).join(', ')]);
  }
  items.push(['기본 제출서류', '사업자등록증·국세/지방세 완납증명·인감 등', '공통 서류 준비']);
  return items;
}

/** 엑셀 「공동도급 분류」 시트 행. */
export function jointSupplyRows(notices) {
  return notices.map((n) => {
    const s = summarize(n);
    const j = joint.evaluate(n, raw(n));
    return {
      공고번호: s.공고번호,
      공고명: s.공고명,
      구분: j.label,
      가능여부: j.available ? '가능' : '불가',
      공고표기: j.methodName,
      지역제한: j.regionLimit ? '있음' : '없음',
      메모: j.note || j.desc,
    };
  });
}

// 엑셀 「투찰가 참고」 열 순서 그대로
export const BID_PRICE_COLS = [
  '공고번호', '공고명', '기초금액', '예비가격범위', '낙찰하한율', 'A값',
  '사정률(최저)', '사정률(중앙)', '사정률(최고)',
  '투찰률 50%', '투찰률 80%', '투찰률 90%', '투찰률 95%',
  '투찰금액 90%', '산출근거',
];

const pctLabel = (v) => (v === null || v === undefined ? '-' : `${v}%`);

/** 공고 한 건의 투찰가 참고표 행. 기초금액이 없으면 산출하지 않고 사유만 적는다. */
export function bidPriceRow(notice, basis = null) {
  const s = summarize(notice);
  const p = BidParams.fromNotice({ ...raw(notice), ...notice }, basis);
  const row = { 공고번호: s.공고번호, 공고명: s.공고명 };
  if (!p) {
    row.산출근거 = '기초금액 또는 낙찰하한율 미공개, 산출하지 않음';
    return row;
  }
  const res = analyze(p);
  const rec = (t) => res.recommended.find((x) => x.target === t)?.point ?? null;
  return {
    ...row,
    기초금액: won(p.baseAmount),
    예비가격범위: `${won(res.rangeLow)} ~ ${won(res.rangeHigh)}`,
    낙찰하한율: `${Math.round(p.lowerRatio() * 100 * 1000) / 1000}%`,
    A값: p.aValue > 0 ? won(p.aValue) : '-',
    '사정률(최저)': `${Math.round(res.minRatePct * 1000) / 1000}%`,
    '사정률(중앙)': `${Math.round((res.medianPrice / p.baseAmount) * 100 * 1000) / 1000}%`,
    '사정률(최고)': `${Math.round(res.maxRatePct * 1000) / 1000}%`,
    '투찰률 50%': pctLabel(rec(0.5)?.rate),
    '투찰률 80%': pctLabel(rec(0.8)?.rate),
    '투찰률 90%': pctLabel(rec(0.9)?.rate),
    '투찰률 95%': pctLabel(rec(0.95)?.rate),
    '투찰금액 90%': rec(0.9) ? won(rec(0.9).amount) : '-',
    산출근거: `복수예가 ${p.totalReserves}개 중 ${p.drawReserves}개 조합 `
      + `${res.combinations.toLocaleString('ko-KR')}가지 전수 전개 · 예가는 범위 내 등간격 근사`,
  };
}

/** 텔레그램 알림 카드(notifier.format_notice) 를 줄 단위로. 이모지·순서까지 같다. */
export function alertLines(notice, match = null) {
  const r = raw(notice);
  const nm = notice.bid_ntce_nm || r.bidNtceNm || '(제목없음)';
  const dmin = notice.dminstt_nm || notice.ntce_instt_nm || r.dminsttNm || '-';
  const price = won(notice.presmpt_prce ?? r.presmptPrce);
  const clse = notice.bid_clse_dt || r.bidClseDt || '-';
  const openg = notice.openg_dt || r.opengDt || '-';
  const cntrct = notice.cntrct_cncls_mthd_nm || r.cntrctCnclsMthdNm || '-';
  const url = notice.bid_ntce_dtl_url || notice.bid_ntce_url || r.bidNtceDtlUrl || '';

  const lines = [];
  const badge = match
    ? { eligible: '✅ 참여가능', ineligible: '❌ 자격미달', unknown: '❓ 확인필요' }[match.verdict] ?? ''
    : '';
  lines.push({ icon: '📢', text: nm, title: true, badge });
  lines.push({ icon: '🏛', text: dmin });
  lines.push({ icon: '💰', text: `추정가 ${price}  |  📑 ${cntrct}` });
  lines.push({ icon: '⏰', text: `마감 ${clse}  |  🔨 개찰 ${openg}` });
  const j = joint.evaluate(notice, r);
  if (j.available) {
    lines.push({ icon: '🤝', text: `공동도급 ${j.label}${j.regionLimit ? ' · 구성원 지역제한' : ''}` });
  }
  if (match && match.reasons && match.reasons.length) {
    lines.push({ icon: '🔎', text: match.reasons[match.reasons.length - 1] });
  }
  if (url) lines.push({ icon: '🔗', text: '공고 원문 보기', href: url });
  return lines;
}
