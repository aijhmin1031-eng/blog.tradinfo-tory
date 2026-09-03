// 입찰레이더 공동수급(공동도급) 분류 — `ai-bid-radar/src/joint_supply.py` 의 1:1 이식.
//
// 이미 수집하는 `cmmn_spldmd_mthd_nm`(공동수급방식명) 한 컬럼으로 가른다. 새 호출이 없다.
//
// ★ 「실적에 따른 공동도급 / 무실적 공동도급」 구분은 이 필드로 오지 않는다.
//   구성원별 실적 인정 비율과 최소 지분율은 공고서·현장설명서 본문에 적힌다.
//   그래서 분류는 「어떤 방식이 열려 있는가」까지이고, 그 사실을 메모로 함께 낸다.

export const KINDS = {
  joint: ['공동이행', '출자비율대로 함께 시공 · 실적도 지분만큼 인정'],
  divided: ['분담이행', '공종을 나눠 각자 시공 · 맡은 공종 면허·실적만 필요'],
  mixed: ['혼합', '공동이행·분담이행 모두 허용 · 협정 방식은 구성원이 선택'],
  main_contractor: ['주계약자', '종합(주계약자)+전문(부계약자) 구성'],
  solo: ['단독', '공동수급 불가 · 단독 투찰만 가능'],
  unknown: ['확인필요', '공고에 방식 표기가 없음 · 공고서 확인 필요'],
};

/** 공동수급방식명 -> KINDS 의 키. */
export function classify(methodName) {
  const s = String(methodName || '').replace(/ /g, '');
  if (!s) return 'unknown';
  if (s === '-' || s === '해당없음' || s === '해당사항없음') return 'solo';
  if (s.includes('불가') || s.includes('불허') || s.includes('단독')) return 'solo';
  const hasJoint = s.includes('공동이행');
  const hasDiv = s.includes('분담이행');
  if (hasJoint && hasDiv) return 'mixed';
  if (hasJoint) return 'joint';
  if (hasDiv) return 'divided';
  if (s.includes('주계약자')) return 'main_contractor';
  return 'unknown';
}

/** 공고 한 건의 공동수급 판정. */
export function evaluate(notice, raw = {}) {
  const method = notice.cmmn_spldmd_mthd_nm || raw.cmmnSpldmdMethdNm || notice.cmmnSpldmdMethdNm || '';
  const kind = classify(method);
  const [label, desc] = KINDS[kind];
  const rgn = notice.cmmn_spldmd_corp_rgn_lmt_yn || raw.cmmnSpldmdCorpRgnLmtYn || '';
  const regionLimit = String(rgn).trim().toUpperCase() === 'Y';

  const notes = [];
  if (kind === 'divided') notes.push('타 공종 실적이 없어도 맡은 공종만으로 참여할 여지가 있다');
  if (kind === 'joint') notes.push('실적·시공능력이 출자비율만큼만 인정된다');
  if (regionLimit) notes.push('구성원 소재지 제한이 걸려 있다(공고서 확인)');
  if (['joint', 'divided', 'mixed', 'main_contractor'].includes(kind)) {
    notes.push('구성원별 실적 인정 비율은 공고서 본문에서 확인해야 한다');
  }

  return {
    kind,
    label,
    desc,
    available: ['joint', 'divided', 'mixed', 'main_contractor'].includes(kind),
    methodName: method || '-',
    regionLimit,
    note: notes.join(' · '),
  };
}

/** 공동수급이 열려 있는 공고만 추린다. */
export function filterAvailable(notices, kinds = null) {
  return notices.filter((n) => {
    const r = evaluate(n, n.raw || {});
    if (!r.available) return false;
    if (kinds && kinds.length && !kinds.includes(r.kind)) return false;
    return true;
  });
}
