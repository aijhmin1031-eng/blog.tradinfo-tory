// 입찰레이더 자격필터 — `ai-bid-radar/src/qualifier.py` 의 1:1 이식.
//
// ★ 정본은 파이썬이다. 규칙을 고칠 때는 파이썬을 먼저 고치고 벡터를 다시 만든 뒤
//   여기를 맞춘다(`npm run check-bid-radar` 가 두 구현의 판정을 대조한다).
//
// 매칭 규칙
//   1) 지역 제한: 공고에 참가가능지역이 지정돼 있으면 내 지역이 그 안에 들어야 통과.
//   2) 면허/업종 제한: 공고에 면허제한이 있으면 내 보유 면허 중 하나라도 매칭돼야 통과.
//   3) 제한 정보가 아예 없으면 통과. 단 indstrytyLmtYn=Y 인데 면허목록이 없으면 불확실.
//
// 판정: eligible(가능) / ineligible(불가) / unknown(불확실, 사람 확인 권장)

// 광역시·도 표준 표기 ↔ 약칭 (지역 매칭 보정)
export const REGION_ALIASES = {
  서울특별시: ['서울'], 부산광역시: ['부산'], 대구광역시: ['대구'],
  인천광역시: ['인천'], 광주광역시: ['광주'], 대전광역시: ['대전'],
  울산광역시: ['울산'], 세종특별자치시: ['세종'],
  경기도: ['경기'], 강원특별자치도: ['강원'], 강원도: ['강원'],
  충청북도: ['충북', '충청북도'], 충청남도: ['충남', '충청남도'],
  전북특별자치도: ['전북', '전라북도'], 전라북도: ['전북'],
  전라남도: ['전남', '전라남도'], 경상북도: ['경북', '경상북도'],
  경상남도: ['경남', '경상남도'], 제주특별자치도: ['제주', '제주도'],
};

/** '경상남도 창원시' -> ['경상남도','창원시'] */
export function regionTokens(region) {
  return String(region || '').replace(/ {2}/g, ' ').split(' ').filter(Boolean);
}

/** 내 지역이 허용지역 목록 중 하나에 포함되는지(광역 단위 우선). */
export function regionMatch(myRegion, allowedRegions) {
  if (!allowedRegions || !allowedRegions.length) return true; // 지역 제한 없음
  if (!myRegion) return false;
  const my = String(myRegion);
  const myTokens = new Set(my.replace(/ {2}/g, ' ').split(' ').filter(Boolean));
  for (const allowed of allowedRegions) {
    const a = String(allowed || '').trim();
    if (!a) continue;
    if (my.includes(a) || a.includes(my)) return true;      // 직접 포함(양방향)
    if (myTokens.has(a)) return true;                        // 토큰 교집합
    for (const [std, aliases] of Object.entries(REGION_ALIASES)) {
      const names = new Set([std, ...aliases]);
      if (!names.has(a)) continue;
      const tokenHit = [...myTokens].some((t) => names.has(t));
      const textHit = [...names].some((n) => my.includes(n));
      if (tokenHit || textHit) return true;
    }
  }
  return false;
}

/** 내 면허 중 하나라도 공고 요구 면허에 매칭되는지(부분 문자열). */
export function licenseMatch(myLicenses, required) {
  if (!required || !required.length) return true;
  if (!myLicenses || !myLicenses.length) return false;
  for (const req of required) {
    // 면허명은 '소프트웨어사업자(컴퓨터관련서비스사업)/1468' 처럼 코드가 붙는다 → 앞부분만
    const rName = String(req || '').split('/')[0].trim();
    for (const mine of myLicenses) {
      const m = String(mine || '').trim();
      if (!m || !rName) continue;
      if (rName.includes(m) || m.includes(rName)) return true;
    }
  }
  return false;
}

// 사유 문장에 목록을 넣을 때는 **파이썬 리스트 표기**를 쓴다.
// 두 구현의 사유 문자열까지 글자 그대로 대조하기 위해서다(`npm run check-bid-radar`).
const pyList = (arr) => `[${(arr || []).map((v) => `'${v}'`).join(', ')}]`;

/**
 * 단일 공고 자격 판정.
 * 반환: { bidNtceNo, bidNtceNm, verdict, reasons }
 */
export function evaluate(notice, licenseLimits, possibleRegions, profile) {
  const reasons = [];
  let ineligible = false;
  let unknown = false;
  const licenses = profile.licenses || [];

  // 1) 지역
  if (possibleRegions && possibleRegions.length) {
    if (regionMatch(profile.region, possibleRegions)) {
      reasons.push(`지역 OK (내 '${profile.region}' ∈ ${pyList(possibleRegions)})`);
    } else {
      ineligible = true;
      reasons.push(`지역 불가 (내 '${profile.region}' ∉ ${pyList(possibleRegions)})`);
    }
  } else {
    reasons.push('지역 제한 없음');
  }

  // 2) 면허·업종
  const lmt = String(notice.indstrety_lmt_yn ?? notice.indstrytyLmtYn ?? '').toUpperCase();
  if (licenseLimits && licenseLimits.length) {
    if (licenseMatch(licenses, licenseLimits)) {
      reasons.push(`면허 OK (보유 ${pyList(licenses)} ↔ 요구 ${pyList(licenseLimits)})`);
    } else {
      ineligible = true;
      reasons.push(`면허 불가 (보유 ${pyList(licenses)} ↔ 요구 ${pyList(licenseLimits)})`);
    }
  } else if (lmt === 'Y') {
    unknown = true;
    reasons.push('업종제한 있음(indstrytyLmtYn=Y)이나 면허 상세 미확보 → 확인 필요');
  } else {
    reasons.push('면허/업종 제한 없음');
  }

  const verdict = ineligible ? 'ineligible' : unknown ? 'unknown' : 'eligible';
  return {
    bidNtceNo: notice.bid_ntce_no || '',
    bidNtceNm: notice.bid_ntce_nm || '',
    verdict,
    reasons,
  };
}

export const VERDICT_LABEL = {
  eligible: { icon: '✅', text: '참여가능' },
  ineligible: { icon: '❌', text: '자격미달' },
  unknown: { icon: '❓', text: '확인필요' },
};
