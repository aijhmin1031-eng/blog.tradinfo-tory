// 특집(주제 허브) 등록부, 새 특집을 추가하면 내비 드롭다운과 /topics/ 인덱스에 자동 반영된다.
// 새 특집 추가 절차: ① src/pages/topics/<key>.astro 허브 페이지 생성 ② 여기에 한 줄 추가.

export interface Topic {
  key: string; // activeNav 키이자 기사 frontmatter topics 태그 값
  name: string;
  href: string;
  desc: string;
  image: string; // /topics/ 인덱스 카드 이미지
  series: string[]; // 이 특집이 쓰는 data/series/*.json (자동 갱신 검증용)
  glossaryKeys: string[]; // 용어 박스에 노출할 용어 (사전 그룹 통째 참조 금지)
  editedAt: string; // 편집 갱신일, 리드·연표·확인 지점을 수동 점검한 날
}

export const TOPICS: Topic[] = [
  {
    key: 'topic-semi',
    name: '반도체·AI',
    href: '/topics/semiconductor-ai/',
    desc: 'AI가 다시 그리는 한국 무역, 반도체 수출 통계·관련주·산업 지도까지 한 주제로 모았습니다.',
    image: '/images/hero/ai-semiconductor-map.jpg',
    series: ['trade_hs8542', 'trade_hs8486', 'trade_hs8542_CN', 'trade_hs8542_HK', 'trade_hs8542_TW', 'stk_005930', 'stk_000660'],
    glossaryKeys: ['HBM', 'D램', '파운드리', '팹리스', '패키징', '수율'],
    editedAt: '2026-08-22',
  },
];
