// 특집(주제 허브) 등록부 — 새 특집을 추가하면 내비 드롭다운과 /topics/ 인덱스에 자동 반영된다.
// 새 특집 추가 절차: ① src/pages/topics/<key>.astro 허브 페이지 생성 ② 여기에 한 줄 추가.

export interface Topic {
  key: string; // activeNav 키이자 URL 조각
  name: string;
  href: string;
  desc: string;
  image: string; // /topics/ 인덱스 카드 이미지
}

export const TOPICS: Topic[] = [
  {
    key: 'topic-semi',
    name: '반도체·AI',
    href: '/topics/semiconductor-ai/',
    desc: 'AI가 다시 그리는 한국 무역 — 반도체 수출 통계·관련주·산업 지도까지 한 주제로 모았습니다.',
    image: '/images/hero/ai-semiconductor-map.jpg',
  },
];
