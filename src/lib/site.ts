export const SITE = {
  name: '무역토리',
  nameEn: 'TradeTory',
  tagline: '거래가 있는 곳에, 토리가 갑니다',
  taglineSub: '무역·환율·금리·시장의 숫자를 매일 줍는 데이터 브리핑',
  description:
    '무역토리는 무역, 환율, 금리, 관세 등 돈이 움직이는 모든 거래의 데이터를 차트 한 장과 세 줄 요약으로 전하는 경제 브리핑 블로그입니다.',
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

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
