/**
 * 데스크톱판 `gui_bridge.Api` 의 **웹 대역**.
 *
 * 왜 이 파일 하나로 끝나는가: 데스크톱판 화면(`src/gui_web/index.html`)은 이미 웹이고,
 * 파이썬과는 `api()` **한 함수**로만 이야기한다 —
 *   `function api(){ return (window.pywebview && window.pywebview.api) || null; }`
 * 그래서 `window.pywebview.api` 에 같은 이름·같은 반환 모양의 객체를 꽂아 두면
 * 화면 코드(2,609줄)는 **한 줄도 고치지 않고** 그대로 돈다. UI 가 100% 같은 이유다.
 *
 * 무엇이 달라지는가(정직하게):
 *   ① 공고는 SQLite 가 아니라 **아침에 CI 가 받아 둔 정적 파일**에서 읽는다.
 *      그래서 「지금 수집」은 브라우저가 할 수 없다 — 조달청 인증키를 공개된 페이지에
 *      심어야 하고, 그것은 키를 내주는 일이다(CLAUDE.md 금지).
 *   ② 관심·보관·숨김·메모·서류 체크는 **브라우저(localStorage)** 에 남는다.
 *      로그인이 없으므로 **기기·브라우저마다 따로** 쌓인다. 지우면 사라진다.
 *   ③ 정품 인증과 텔레그램은 소유주 지시로 **뺀다**.
 *   ④ 자동 실행(윈도우 작업 스케줄러)은 CI 아침 06:50 자동 수집이 대신한다.
 * 화면이 이 사실을 감추지 않게, 해당 함수는 **거짓 성공을 돌려주지 않고** 이유를 말한다.
 */
import { evaluate } from './qualifier.js';

const WORK_DIV_LABEL = { cnstwk: '공사', servc: '용역', thng: '물품', frgcpt: '외자', etc: '기타' };
const WORK_DIV_ORDER = ['cnstwk', 'servc', 'thng', 'frgcpt', 'etc'];
// 데스크톱판 `qualifier.REGIONS_METRO` 그대로(소재지 자동완성 선택지).
// 데스크톱판 gui_bridge.BID_STAGES 그대로(상세 패널의 진행단계 점).
const BID_STAGES = ['공고검토', '서류준비', '서류제출', '개찰대기', '종료'];
const REGIONS_METRO = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
  '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
  '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'];

/* ── 브라우저 저장소 ─────────────────────────────────────────────────
   ★ 시크릿 모드·저장소 차단에서 localStorage 는 **던진다**. 여기서 막지 않으면
   화면이 통째로 죽는다. 못 쓰면 메모리로 물러서고, 그 사실을 상태에 남긴다. */
const MEM = new Map();
let storeOk = true;
try { localStorage.setItem('br:t', '1'); localStorage.removeItem('br:t'); } catch (e) { storeOk = false; }
const load = (k, dflt) => {
  try {
    const raw = storeOk ? localStorage.getItem(k) : MEM.get(k);
    return raw ? JSON.parse(raw) : dflt;
  } catch (e) { return dflt; }
};
const save = (k, v) => {
  const raw = JSON.stringify(v);
  try { if (storeOk) localStorage.setItem(k, raw); else MEM.set(k, raw); } catch (e) { MEM.set(k, raw); }
};

const K_CFG = 'br:cfg';
const K_STATE = 'br:state';   // 자연키 → {state, stage, memo, memo_at}
const K_DOCS = 'br:docs';     // 자연키 → {docName: checked}

const nkey = (no, ord, wd) => `${no}|${String(ord ?? '000')}|${wd || ''}`;
const ordNum = (o) => { const n = parseInt(String(o ?? '0'), 10); return Number.isFinite(n) ? n : 0; };
const digits = (s) => String(s ?? '').replace(/\D/g, '');
const ok = (extra) => Object.assign({ ok: true }, extra);
const fail = (error) => ({ ok: false, error });

/** 데스크톱판 `build_bid_url` 그대로 — 나라장터 투찰 화면(로그인 시 [투찰] 버튼). */
function buildBidUrl(no, ord = '000', ntceDt = '', clseDt = '') {
  const n = String(no || '').trim();
  if (!n) return '';
  const ordd = String(ord || '000').trim() || '000';
  const pad = (x) => String(x).padStart(2, '0');
  const ymd = (s2, fallbackDays) => {
    const m = String(s2 || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + m[2] + m[3];
    const d = new Date(Date.now() + fallbackDays * 864e5);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  };
  const shift = (y, days) => {
    const d = new Date(Number(y.slice(0, 4)), Number(y.slice(4, 6)) - 1, Number(y.slice(6, 8)));
    if (Number.isNaN(d.getTime())) return y;
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  };
  let frm = shift(ymd(ntceDt, -7), -7);
  let to = shift(ymd(clseDt, 7), 7);
  if (to < frm) { const t = frm; frm = to; to = t; }
  return 'https://www.g2b.go.kr/link/PBPA021_01/?'
    + `bidPbancNo=${n}&bidPbancOrd=${ordd}&bidDateType=R&fromBidDt=${frm}&toBidDt=${to}`;
}

/** 데스크톱판 `estimate_bid_price` 그대로. 참고용 근사치다(예정가격은 추첨이다). */
function estimateBidPrice(price, lwltRate, workDiv, srvceDiv) {
  const p = Math.trunc(Number(price) || 0);
  if (p <= 0) return { ok: false };
  let rate = null;
  let rateSrc = '추정';
  if (lwltRate !== null && lwltRate !== undefined && lwltRate !== '' && Number(lwltRate) !== 0) {
    const r = parseFloat(String(lwltRate).replace('%', '').trim());
    if (Number.isFinite(r) && r >= 50 && r <= 100) { rate = r; rateSrc = '공고'; }
  }
  if (rate === null) {
    const wd = String(workDiv || '').trim();
    const sd = String(srvceDiv || '').trim();
    if (wd === 'thng') rate = p < 210000000 ? 84.245 : 80.495;
    else if (wd === 'cnstwk') rate = 87.745;
    else if (wd === 'servc') rate = sd.includes('기술') ? 87.995 : 85.495;
    else rate = 85.0;
  }
  const base = p * (rate / 100);
  return {
    ok: true, rate: Math.round(rate * 1000) / 1000, rate_src: rateSrc,
    point: Math.round(base * 1.005), low: Math.round(base), high: Math.round(base * 1.012),
  };
}

export function install(data) {
  const NOTICES = data.notices || [];
  const asOf = data.generatedAt || '';

  const cfg = () => Object.assign({
    company_nm: '', region: '경상남도 창원시',
    licenses: ['조경식재ㆍ시설물공사업', '지반조성ㆍ포장공사업'],
    keywords: { include: [], all: [], exclude: [] },
  }, load(K_CFG, {}));

  const states = () => load(K_STATE, {});
  /** 수집분에 실제로 나온 값만 선택지로 준다(데스크톱판 `_distinct_*` 와 같은 뜻). */
  const distinct = (field) => [...new Set(NOTICES.map((n) => (n[field] || '').trim()).filter(Boolean))].sort();
  const docs = () => load(K_DOCS, {});

  /** 공고 한 건 → 목록 행. 데스크톱판 list_notices 의 item 모양과 **같은 열쇠**를 쓴다. */
  function toItem(n, smap, profile) {
    const no = n.bid_ntce_no;
    const ordd = String(n.bid_ntce_ord ?? '000');
    const wd = n.work_div || '';
    const st = smap[nkey(no, ordd, wd)] || {};
    const verd = evaluate(n, n.licenseLimits || [], n.possibleRegions || [], profile);
    return {
      id: `${no}-${ordd}`,
      bid_ntce_no: no, bid_ntce_ord: ordd, work_div_code: wd,
      name: n.bid_ntce_nm || '',
      instt: n.dminstt_nm || n.ntce_instt_nm || '',
      work_div: WORK_DIV_LABEL[wd] || wd,
      price: n.presmpt_prce,
      clse_dt: n.bid_clse_dt || '',
      ntce_dt: n.bid_ntce_dt || '',
      verdict: verd.verdict,
      reasons: (verd.reasons && verd.reasons.length) ? verd.reasons[verd.reasons.length - 1] : '',
      url: n.bid_ntce_dtl_url || '',
      hidden: st.state === 'hidden',
      state: st.state || 'normal',
      stage: st.stage || '',
      bid_reco: estimateBidPrice(n.presmpt_prce, n.sucsfbid_lwlt_rate, wd, n.srvce_div_nm),
      __n: n,
    };
  }

  /** 데스크톱판 list_notices 를 그대로 옮긴다(필터 → 최신 차수만 → 정렬 → 페이징). */
  function listNotices(page = 1, pageSize = 20, opts = null) {
    const o = opts || {};
    const q = (o.q || '').trim();
    const verdict = o.verdict || '';
    const wset = (o.work_divs && o.work_divs.length) ? new Set(o.work_divs) : null;
    const dateField = (o.date_field === 'bid_clse_dt') ? 'bid_clse_dt' : 'bid_ntce_dt';
    const dfN = digits(o.date_from); const dtN = digits(o.date_to);
    const SORTS = new Set(['bid_ntce_dt', 'bid_clse_dt', 'presmpt_prce', 'work_div', 'verdict']);
    const sort = SORTS.has(o.sort) ? o.sort : 'bid_ntce_dt';
    const order = String(o.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const includeHidden = !!o.include_hidden;
    const hiddenOnly = !!o.hidden_only;
    const box = o.box || 'all';

    const c = cfg();
    const profile = { company: c.company_nm, region: c.region, licenses: c.licenses || [] };
    const smap = states();
    let items = [];
    for (const n of NOTICES) {
      const no = n.bid_ntce_no;
      const ordd = String(n.bid_ntce_ord ?? '000');
      const wd = n.work_div || '';
      const st = smap[nkey(no, ordd, wd)] || {};
      const state = st.state || 'normal';
      const isHidden = state === 'hidden';
      // 함(box)별 노출 규칙 — 데스크톱판과 같다.
      if (box === 'interest') { if (state !== 'interest') continue; }
      else if (box === 'archived') { if (state !== 'archived') continue; }
      else if (hiddenOnly) { if (!isHidden) continue; }
      else if ((state === 'hidden' || state === 'archived') && !includeHidden) continue;

      const nm = n.bid_ntce_nm || '';
      if (q && !nm.includes(q)) continue;
      if (wset && !wset.has(wd)) continue;
      if (dfN || dtN) {
        const cell = digits(n[dateField]);
        if (dfN && cell.slice(0, dfN.length) < dfN) continue;
        if (dtN && cell.slice(0, dtN.length) > dtN) continue;
      }
      const it = toItem(n, smap, profile);
      if (verdict && it.verdict !== verdict) continue;
      items.push(it);
    }

    // 같은 공고번호의 정정·재공고는 최신 차수 1건만.
    const latest = new Map();
    for (const it of items) {
      const cur = latest.get(it.bid_ntce_no);
      if (!cur || ordNum(it.bid_ntce_ord) > ordNum(cur.bid_ntce_ord)) latest.set(it.bid_ntce_no, it);
    }
    items = [...latest.values()];

    const eligibleTotal = items.filter((x) => x.verdict === 'eligible').length;

    const SVAL = { bid_ntce_dt: 'ntce_dt', bid_clse_dt: 'clse_dt', presmpt_prce: 'price', work_div: 'work_div', verdict: 'verdict' };
    const sval = SVAL[sort];
    const wdRank = {}; WORK_DIV_ORDER.forEach((c2, i) => { wdRank[WORK_DIV_LABEL[c2]] = i; });
    const vdRank = { eligible: 0, unknown: 1, ineligible: 2 };
    const skey = (it) => {
      const v = it[sval];
      if (sort === 'presmpt_prce') return Number(v) || -1;
      if (sort === 'work_div') return wdRank[v] ?? 99;
      if (sort === 'verdict') return vdRank[v] ?? 9;
      return v || '';
    };
    items.sort((a, b) => {
      const x = skey(a); const y = skey(b);
      const r = (x < y) ? -1 : (x > y) ? 1 : 0;
      return order === 'desc' ? -r : r;
    });

    const total = items.length;
    const ps = Math.max(1, parseInt(pageSize, 10) || 20);
    const totalPages = Math.max(1, Math.ceil(total / ps));
    const pg = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
    const start = (pg - 1) * ps;
    const kw = c.keywords || { include: [], all: [], exclude: [] };
    return ok({
      items: items.slice(start, start + ps).map((x) => { const y = { ...x }; delete y.__n; return y; }),
      total, page: pg, page_size: ps, total_pages: totalPages, eligible_total: eligibleTotal,
      has_keywords: !!((kw.include || []).length + (kw.all || []).length + (kw.exclude || []).length),
      keywords: kw, has_licenses: !!(c.licenses || []).length,
    });
  }

  const find = (no, ord, wd) => NOTICES.find((n) => n.bid_ntce_no === no
    && String(n.bid_ntce_ord ?? '000') === String(ord ?? '000')
    && (!wd || (n.work_div || '') === wd));

  function setState(no, ord = '000', wd = '', state = 'normal') {
    const m = states();
    const k = nkey(no, ord, wd);
    const cur = m[k] || {};
    if (state === 'normal') { delete cur.state; } else { cur.state = state; }
    if (Object.keys(cur).length) m[k] = cur; else delete m[k];
    save(K_STATE, m);
    return ok({ state });
  }

  const API = {
    /* ── 공고 ─────────────────────────────────────────────────── */
    list_notices: (page, page_size, opts) => listNotices(page, page_size, opts),
    list_interest: (page, page_size, opts) => listNotices(page, page_size, { ...(opts || {}), box: 'interest' }),
    list_archived: (page, page_size, opts) => listNotices(page, page_size, { ...(opts || {}), box: 'archived' }),

    /* 우측 상세 패널. ★ 화면은 `d.clse_dt` 처럼 **평평하게** 읽는다 —
       `{detail:{...}}` 로 감싸면 패널이 빈 채로 뜬다(실제로 제목이 비어 나왔다).
       열쇠 이름은 데스크톱판 get_notice_detail 과 한 글자도 다르지 않게 맞췄다. */
    get_notice_detail(bid_ntce_no, bid_ntce_ord = '000', work_div = '') {
      const ordd = String(bid_ntce_ord || '000');
      const n = find(bid_ntce_no, ordd, work_div);
      if (!n) return fail('공고를 찾을 수 없습니다.');
      const wd = work_div || n.work_div || '';
      const c = cfg();
      const profile = { company: c.company_nm, region: c.region, licenses: c.licenses || [] };
      const st = states()[nkey(bid_ntce_no, ordd, wd)] || {};
      const verd = evaluate(n, n.licenseLimits || [], n.possibleRegions || [], profile);
      const raw = n.raw || {};
      const rg = (k) => { const v = raw[k]; return (v === null || v === undefined || v === '') ? '' : v; };
      const g = (k) => { const v = n[k]; return (v === null || v === undefined || v === '') ? '' : v; };
      const docsList = [];
      for (let i = 1; i <= 10; i += 1) {
        const nm = rg(`ntceSpecFileNm${i}`); const ur = rg(`ntceSpecDocUrl${i}`);
        if (nm || ur) docsList.push({ name: nm || `첨부파일 ${i}`, url: ur });
      }
      const num = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : null; };
      const yes = (v) => String(v || '').toUpperCase() === 'Y';
      return ok({
        bid_ntce_no, bid_ntce_ord: ordd, work_div_code: wd,
        name: n.bid_ntce_nm || '',
        ntce_no_full: bid_ntce_no + ((ordd && ordd !== '000') ? `-${ordd}` : ''),
        instt: n.dminstt_nm || n.ntce_instt_nm || '',
        ntce_instt: g('ntce_instt_nm'),
        work_div: WORK_DIV_LABEL[wd] || wd,
        ntce_kind: rg('ntceKindNm'),
        price: n.presmpt_prce,
        budget: rg('asignBdgtAmt'), vat: g('vat'),
        clse_dt: n.bid_clse_dt || '', ntce_dt: n.bid_ntce_dt || '',
        begin_dt: rg('bidBeginDt'), openg_dt: n.openg_dt || '',
        qlfct_dt: g('bid_qlfct_rgst_dt'), openg_plce: rg('opengPlce'),
        cntrct_mthd: g('cntrct_cncls_mthd_nm'), bid_mthd: rg('bidMethdNm'),
        sucsfbid_mthd: g('sucsfbid_mthd_nm'), prearng_mthd: g('prearng_prce_dcsn_mthd_nm'),
        lwlt_rate: g('sucsfbid_lwlt_rate'), cmmn_spldmd: g('cmmn_spldmd_mthd_nm'),
        clsfc_nm: rg('pubPrcrmntClsfcNm'),
        clsfc_path: [rg('pubPrcrmntLrgClsfcNm'), rg('pubPrcrmntMidClsfcNm')].filter(Boolean).join(' > '),
        srvce_div: rg('srvceDivNm'),
        indstryty_lmt: yes(g('indstrety_lmt_yn')),
        rgn_lmt: yes(rg('bidPrtcptLmtYn')),
        re_ntce: yes(rg('reNtceYn')),
        ofcl_nm: rg('ntceInsttOflNm') || rg('ntceInsttOfclNm'),
        ofcl_tel: rg('ntceInsttOfclTel'), ofcl_email: rg('ntceInsttOfclEmail'),
        url: n.bid_ntce_dtl_url || '',
        docs: docsList, std_doc_url: rg('stdNtceDocUrl'),
        tech_rt: num(rg('techAbltEvlRt')), price_rt: num(rg('bidPrceEvlRt')),
        grntymny_yn: yes(rg('bidGrntymnyPaymntYn')), prtcpt_fee: rg('bidPrtcptFee'),
        pq_eval: yes(rg('pqEvalYn')), tp_eval: yes(rg('tpEvalYn')),
        pq_clse: rg('pqApplDocRcptDt'), tp_clse: rg('tpEvalApplClseDt'),
        spldmd_clse: rg('cmmnSpldmdAgrmntClseDt'),
        verdict: verd.verdict, reasons: verd.reasons || [],
        lic_limit: n.licenseLimits || [], psbl_rgn: n.possibleRegions || [],
        state: st.state || 'normal', stage: st.stage || '', memo: st.memo || '',
        stages: BID_STAGES,
        bid_reco: estimateBidPrice(n.presmpt_prce, n.sucsfbid_lwlt_rate, wd, rg('srvceDivNm')),
        bid_url: buildBidUrl(bid_ntce_no, ordd, n.bid_ntce_dt, n.bid_clse_dt),
      });
    },

    set_notice_state: (no, ord, wd, state) => setState(no, ord, wd, state),
    hide_notice: (no, ord = '000', wd = '') => setState(no, ord, wd, 'hidden'),
    unhide_notice: (no, ord = '000', wd = '') => setState(no, ord, wd, 'normal'),
    delete_archived: (no, ord = '000', wd = '') => setState(no, ord, wd, 'normal'),

    set_notice_stage(no, ord = '000', wd = '', stage = '') {
      const m = states(); const k = nkey(no, ord, wd);
      const cur = m[k] || {};
      if (stage) cur.stage = stage; else delete cur.stage;
      if (Object.keys(cur).length) m[k] = cur; else delete m[k];
      save(K_STATE, m);
      return ok({ stage });
    },

    set_notice_memo(no, ord = '000', wd = '', memo = '') {
      const m = states(); const k = nkey(no, ord, wd);
      const cur = m[k] || {};
      if (memo) { cur.memo = memo; cur.memo_at = new Date().toISOString(); }
      else { delete cur.memo; delete cur.memo_at; }
      if (Object.keys(cur).length) m[k] = cur; else delete m[k];
      save(K_STATE, m);
      return ok({ memo });
    },

    list_memos() {
      const m = states();
      const items = [];
      for (const [k, v] of Object.entries(m)) {
        if (!v.memo) continue;
        const [no, ord, wd] = k.split('|');
        const n = find(no, ord, wd);
        items.push({
          bid_ntce_no: no, bid_ntce_ord: ord, work_div_code: wd,
          work_div: WORK_DIV_LABEL[wd] || wd,
          name: n ? (n.bid_ntce_nm || '') : '(수집분에 없는 공고)',
          clse_dt: n ? (n.bid_clse_dt || '') : '',
          url: n ? (n.bid_ntce_dtl_url || '') : '',
          memo: v.memo, memo_at: v.memo_at || '', stage: v.stage || '', state: v.state || 'normal',
        });
      }
      items.sort((a, b) => String(b.memo_at).localeCompare(String(a.memo_at)));
      return ok({ items, total: items.length });
    },

    /* ── 제출서류 체크 ────────────────────────────────────────── */
    list_documents(no, ord = '000', wd = '') {
        // 데스크톱판 gui_bridge.DEFAULT_DOCS 그대로.
      const DEFAULTS = ['사업자등록증', '법인등기부등본(법인인감증명서)', '국세·지방세 완납증명',
        '보유 면허·자격 등록증', '입찰참가신청서', '산출내역서(가격제안서)',
        '기술제안서/사업수행계획서', '실적증명서', '4대보험 가입증명'];
      const m = docs()[nkey(no, ord, wd)] || {};
      const names = [...new Set([...DEFAULTS, ...Object.keys(m)])];
      // ★ 화면은 `is_checked` 와 `done/total` 을 읽는다. `checked` 로 주면
      //   체크가 안 보이고 머리글이 「undefined/undefined 완료」로 나온다(실제로 나왔다).
      const items = names.map((d) => ({ doc_name: d, is_checked: !!m[d] }));
      return ok({ items, total: items.length, done: items.filter((x) => x.is_checked).length });
    },
    set_doc_checked(no, ord = '000', wd = '', doc_name = '', checked = false) {
      const all = docs(); const k = nkey(no, ord, wd);
      all[k] = all[k] || {}; all[k][doc_name] = !!checked;
      save(K_DOCS, all); return ok({ checked: !!checked });
    },
    add_doc(no, ord = '000', wd = '', doc_name = '') {
      if (!doc_name) return fail('서류 이름을 입력하십시오.');
      const all = docs(); const k = nkey(no, ord, wd);
      all[k] = all[k] || {}; if (!(doc_name in all[k])) all[k][doc_name] = false;
      save(K_DOCS, all); return ok({});
    },
    remove_doc(no, ord = '000', wd = '', doc_name = '') {
      const all = docs(); const k = nkey(no, ord, wd);
      if (all[k]) { delete all[k][doc_name]; save(K_DOCS, all); }
      return ok({});
    },

    /* ── 대시보드·상태 ────────────────────────────────────────── */
    /* 데스크톱판 dashboard_stats 와 **같은 열쇠**를 돌려준다.
       열쇠 이름이 하나만 어긋나도 화면이 undefined.toLocaleString() 으로 죽는다(실제로 죽었다). */
    dashboard_stats() {
      const all = listNotices(1, 1000000, {}).items;
      const verdict = { eligible: 0, unknown: 0, ineligible: 0 };
      const workCnt = {}; WORK_DIV_ORDER.forEach((c2) => { workCnt[c2] = 0; });
      const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const today = ymd(new Date());
      const d7 = ymd(new Date(Date.now() + 7 * 864e5));
      const thisWeek = [];
      let closingSoon = 0;
      for (const it of all) {
        verdict[it.verdict] = (verdict[it.verdict] || 0) + 1;
        if (it.work_div_code in workCnt) workCnt[it.work_div_code] += 1;
        const clse = String(it.clse_dt || '').slice(0, 10);
        if (it.verdict === 'eligible' && clse && clse >= today && clse <= d7) {
          closingSoon += 1;
          thisWeek.push({
            bid_ntce_no: it.bid_ntce_no, bid_ntce_ord: it.bid_ntce_ord, work_div_code: it.work_div_code,
            name: it.name, instt: it.instt, price: it.price, clse_dt: it.clse_dt, url: it.url,
          });
        }
      }
      thisWeek.sort((a, b) => String(a.clse_dt).localeCompare(String(b.clse_dt)));
      return ok({
        total: all.length,
        // sent_today 는 텔레그램 발송 건수다. 알림을 뺐으므로 늘 0 이고, 화면이 그렇게 적는다.
        kpi: { eligible: verdict.eligible, closing_soon: closingSoon, unknown: verdict.unknown, sent_today: 0 },
        verdict,
        work_div: WORK_DIV_ORDER.map((c2) => ({ code: c2, label: WORK_DIV_LABEL[c2], n: workCnt[c2] })),
        this_week: thisWeek.slice(0, 8),
        last_success_at: asOf,
      });
    },

    get_status: () => ok({
      last_run_at: asOf, last_success_at: asOf, auto_registered: true,
      license: API.get_license_status(),
      total: NOTICES.length, window: data.window || null,
    }),

    /* ── 설정 ─────────────────────────────────────────────────
       ★ 화면은 `STATE.cfg.has_g2b_key` 처럼 **평평한 열쇠**를 바로 읽는다.
       `{config: {...}}` 로 감싸면 전부 undefined 가 되어 「설정 필요」로 굳는다. */
    get_config() {
      const c = cfg();
      return ok({
        company_nm: c.company_nm || '', region: c.region || '', licenses: c.licenses || [],
        regions_available: REGIONS_METRO,
        work_divs: c.work_divs || ['cnstwk', 'servc', 'thng'],
        presets: load('br:presets', []),
        cntrct_mthd_options: distinct('cntrct_cncls_mthd_nm'),
        srvce_div_options: distinct('srvce_div_nm'),
        g2b_endpoint: 'apis.data.go.kr/1230000/ad/BidPublicInfoService',
        telegram_chat_id: '', days: c.days ?? 1, period_mode: c.period_mode || '1w',
        max_per_run: c.max_per_run ?? 10,
        include_unknown: c.include_unknown !== false, include_briefing: !!c.include_briefing,
        onboarded: true,   // 공개 화면이라 첫 진입 마법사를 띄우지 않는다(기본 조건이 이미 들어 있다).
        interval_minutes: 1440, interval_days: 1,
        // ★ 인증키는 **서버(CI)** 에 있고 이 페이지에는 없다. 화면의 연결 표시는
        //   「공고 자료가 연결되어 있는가」를 뜻한다. 텔레그램은 소유주 지시로 뺐으므로
        //   그 조건은 이 판에서 성립하지 않아, 표시가 「설정 필요」로 굳지 않게 참으로 둔다.
        has_g2b_key: true, has_bot_token: true,
        g2b_service_key: '', telegram_bot_token: '',
        keywords: c.keywords || { include: [], all: [], exclude: [] },
        work_div_options: WORK_DIV_ORDER.map((c2) => ({ code: c2, label: WORK_DIV_LABEL[c2] })),
      });
    },
    save_config(d) { save(K_CFG, Object.assign(cfg(), d || {})); return API.get_config(); },
    list_presets: () => ok({ presets: load('br:presets', []) }),
    save_preset(preset) {
      const list = load('br:presets', []);
      const i = list.findIndex((x) => x.id === preset.id);
      if (i >= 0) list[i] = preset; else list.push({ ...preset, id: preset.id || String(Date.now()) });
      save('br:presets', list); return ok({ presets: list });
    },
    delete_preset(id) {
      save('br:presets', load('br:presets', []).filter((x) => x.id !== id));
      return ok({ presets: load('br:presets', []) });
    },
    toggle_preset(id, enabled) {
      const list = load('br:presets', []).map((x) => (x.id === id ? { ...x, enabled: !!enabled } : x));
      save('br:presets', list); return ok({ presets: list });
    },
    preview_preset(preset, days = 30, sample_n = 3) {
      const r = listNotices(1, sample_n, { q: (preset && preset.q) || '' });
      return ok({ total: r.total, samples: r.items });
    },

    open_external(url) { if (url) window.open(url, '_blank', 'noopener'); return ok({}); },

    /* ── 이 화면에서 성립하지 않는 것 ────────────────────────────
       ★ **거짓 성공을 돌려주지 않는다.** 화면이 「됐다」고 말하면 소유주가
       텔레그램을 기다리거나 수집이 돈 줄 알게 된다. 이유를 그대로 말한다. */
    run_collect: () => fail('이 화면에서는 수집을 실행하지 않습니다. '
      + '브라우저가 조달청 API 를 직접 부르려면 인증키를 공개된 페이지에 실어야 하기 때문입니다. '
      + `수집은 매일 아침 서버에서 자동으로 돌고, 이 화면은 그 결과를 읽습니다(마지막 수집 ${asOf}).`),
    test_telegram: () => fail('알림(텔레그램) 기능은 이 화면에 넣지 않았습니다.'),
    find_chat_id: () => fail('알림(텔레그램) 기능은 이 화면에 넣지 않았습니다.'),
    list_history: () => ok({ items: [], total: 0, page: 1, page_size: 30, total_pages: 1 }),
    delete_history: () => fail('발송 기록이 없습니다(알림 기능 제외).'),
    cleanup_history: () => fail('발송 기록이 없습니다(알림 기능 제외).'),
    register_auto: () => fail('자동 실행은 설치형 프로그램의 기능입니다. '
      + '이 화면의 공고는 매일 아침 서버가 자동으로 갱신합니다.'),
    unregister_auto: () => fail('자동 실행은 설치형 프로그램의 기능입니다.'),
    open_data_folder: () => fail('웹 화면에는 자료 폴더가 없습니다.'),
    quit_app: () => ok({}),
    /* 대시보드 「데이터 관리」 카드. ★ total·expired·size_mb 가 없으면 화면이
       undefined.toLocaleString() 으로 죽는다(실제로 죽었다). 여기 값은 전부 실제로 센다. */
    db_stats() {
      const now = Date.now();
      const expired = NOTICES.filter((n) => {
        const t = Date.parse(String(n.bid_clse_dt || '').replace(' ', 'T'));
        return Number.isFinite(t) && t < now;
      }).length;
      return ok({
        total: NOTICES.length, expired, retain_days: 0,
        size_mb: Math.round(JSON.stringify(data).length / 1048576 * 10) / 10,
        db_path: '', data_dir: '',
        last_collect: asOf, marks: Object.keys(states()).length,
        storage: storeOk ? 'localStorage' : 'memory',
      });
    },
    cleanup_expired: () => fail('이 화면은 서버가 갱신합니다. 지난 공고는 다음 수집에서 빠집니다.'),
    clear_all_notices: () => fail('이 화면은 서버가 갱신합니다.'),
    set_retain_days: () => fail('보관 기간은 서버 수집 설정입니다.'),
    /* 정품 인증은 소유주 지시로 뺐다. ★ 화면은 부팅 첫 줄에서 이것을 부르고
       `ls.active` 가 아니면 **라이선스 입력 모달로 앱을 막는다**(실제로 막혔다).
       열쇠 이름을 원본과 똑같이 맞춰야 통과한다 — `active`·`plan`·`max_runs`. */
    get_license_status: () => ok({
      active: true, org: '도토리경제', exp: '', feat: [],
      plan: 'full', max_runs: 0, runs_left: null,
    }),
    activate_license: () => ok({ active: true, plan: 'full', max_runs: 0, runs_left: null }),
  };

  // 모든 함수를 Promise 로 감싼다 — 화면은 파이썬 브리지처럼 `await` 로 부른다.
  const asAsync = {};
  for (const [k, fn] of Object.entries(API)) {
    asAsync[k] = (...a) => { try { return Promise.resolve(fn(...a)); } catch (e) { return Promise.resolve(fail(String(e && e.message || e))); } };
  }
  window.pywebview = { api: asAsync };
  window.dispatchEvent(new Event('pywebviewready'));
  return asAsync;
}
