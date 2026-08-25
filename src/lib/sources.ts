// 출처 등록부 — 기사가 쓴 원자료를 독자가 되짚어 갈 수 있게 하는 정본.
//
// 왜 만들었나: 8/25 전수 진단에서 104편 중 103편에 외부 출처 링크가 없었고,
// 구조화 데이터의 citation 은 기사 내용과 무관하게 전부 같은 문자열이 박혀 있었다.
// 경제·금융은 검색엔진이 신뢰도를 특히 엄격하게 보는 영역이라, 이건 콘텐츠 문제이자
// 구조적 약점이었다. 여기 등록된 값에서 기사 끝 「자료」 블록과 citation 을 함께 만든다.
//
// 원칙: 없는 출처를 지어내지 않는다. 실제로 쓴 것만 적는다.

export interface Source {
  org: string; // 발표 기관
  name: string; // 통계·서비스 이름
  url?: string; // 독자가 직접 확인할 수 있는 주소
  note?: string; // 조회 구간·표본 등 이 기사에서의 사용 조건
}

/** 파이프라인이 실제로 호출하는 API 기준의 표준 출처 */
export const SOURCE: Record<string, Source> = {
  ecos: {
    org: '한국은행',
    name: 'ECOS 경제통계시스템',
    url: 'https://ecos.bok.or.kr/',
  },
  fred: {
    org: '미국 세인트루이스 연은',
    name: 'FRED',
    url: 'https://fred.stlouisfed.org/',
  },
  customs: {
    org: '관세청',
    name: '수출입무역통계 (품목별·국가별)',
    url: 'https://unipass.customs.go.kr/ets/',
  },
  krxPrice: {
    org: '금융위원회',
    name: '주식시세정보 오픈API',
    url: 'https://www.data.go.kr/data/15094808/openapi.do',
  },
  dart: {
    org: '금융감독원',
    name: 'DART 전자공시시스템',
    url: 'https://dart.fss.or.kr/',
  },
};

/** FRED 는 시리즈별 낱장이 있으니 거기까지 데려다준다 */
export const fredSeries = (id: string, label: string): Source => ({
  org: SOURCE.fred.org,
  name: `FRED ${label}`,
  url: `https://fred.stlouisfed.org/series/${id}`,
});

/**
 * data/series/<id> 계열이 어느 출처에서 왔는지.
 * SeriesChart 를 쓰는 기사의 출처를 손으로 다시 적지 않게 하려는 표다.
 */
export const SERIES_SOURCE: Record<string, Source> = {
  usdkrw: SOURCE.ecos,
  jpy100: SOURCE.ecos,
  kospi: SOURCE.ecos,
  ktb10y: SOURCE.ecos,
  baserate: SOURCE.ecos,
  deposit1y: SOURCE.ecos,
  us10y: fredSeries('DGS10', '미 국채 10년 금리'),
  wti: fredSeries('DCOILWTICO', 'WTI 유가'),
  gold: fredSeries('PGOLDUSDM', '국제 금값'),
  natgas: fredSeries('DHHNGSP', '천연가스 헨리허브'),
  copper: fredSeries('PCOPPUSDM', '국제 구리값'),
};

/** trade_* 는 전부 관세청, stk_* 는 전부 금융위 주식시세다 */
export const sourceForSeries = (id: string): Source | undefined => {
  if (SERIES_SOURCE[id]) return SERIES_SOURCE[id];
  if (id.startsWith('trade_')) return SOURCE.customs;
  if (id.startsWith('stk_')) return SOURCE.krxPrice;
  return undefined;
};

/** 같은 출처가 두 번 들어가지 않게 정리한다 (기사에 차트가 여러 개일 때) */
export const dedupeSources = (list: Source[]): Source[] => {
  const seen = new Set<string>();
  return list.filter((s) => {
    const key = `${s.org}|${s.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
