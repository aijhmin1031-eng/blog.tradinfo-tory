export const SITE = {
  name: '무역토리',
  nameEn: 'TradeTory',
  tagline: '거래가 있는 곳에, 토리가 갑니다',
  taglineSub: '무역·환율·금리·시장의 숫자를 매일 줍는 데이터 브리핑',
  description:
    '무역토리는 무역, 환율, 금리, 관세 등 돈이 움직이는 모든 거래의 데이터를 차트 한 장과 세 줄 요약으로 전하는 경제 브리핑 블로그입니다.',
  // 검색엔진 소유확인 코드, 네이버 서치어드바이저에서 발급받은 값을 넣으면 자동 반영
  naverVerify: '',
  googleVerify: '', // GSC는 토큰(siteOwner)으로 이미 확인됨. 필요 시 메타 방식 대비용
};

export const CATEGORIES = {
  money: { name: '돈의 흐름', slug: 'money', cls: 'cat-money' },
  tariff: { name: '관세·통상', slug: 'tariff', cls: 'cat-tariff' },
  trade: { name: '수출입 리포트', slug: 'trade', cls: 'cat-trade' },
  basics: { name: '상식 사전', slug: 'basics', cls: 'cat-basics' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const url = (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`;

export const heroFor = (category: CategoryKey, hero?: string) =>
  hero ? url(hero) : url(`/images/cat/${CATEGORIES[category].slug}.jpg`);

// 예약 발행 게이트, pubDate가 KST 기준 오늘 이후인 글은 빌드에서 제외한다.
// 매일 아침 KST 06:50 파이프라인 빌드가 그날 일자 기사를 자동으로 발행하는 구조.
export const isPublished = (pubDate: Date) => {
  const kstToday = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return pubDate.toISOString().slice(0, 10) <= kstToday;
};

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
