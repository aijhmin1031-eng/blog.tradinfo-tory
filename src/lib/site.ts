export const SITE = {
  name: '도토리경제',
  nameEn: 'Dotori Economy',
  tagline: '거래가 있는 곳에, 토리가 갑니다',
  taglineSub: '무역·환율·금리·시장의 숫자를 매일 줍는 데이터 브리핑',
  description:
    '도토리경제는 무역, 환율, 금리, 관세 등 돈이 움직이는 모든 거래의 데이터를 차트 한 장과 세 줄 요약으로 전하는 경제 브리핑 블로그입니다.',
  // 검색엔진 소유확인 코드, 네이버 서치어드바이저에서 발급받은 값을 넣으면 자동 반영
  naverVerify: '',
  googleVerify: '', // GSC는 토큰(siteOwner)으로 이미 확인됨. 필요 시 메타 방식 대비용
};

export const CATEGORIES = {
  money: { name: '돈의 흐름', slug: 'money', cls: 'cat-money', desc: '환율·금리·물가, 돈의 값이 정해지는 구조를 데이터로 읽습니다.' },
  tariff: { name: '관세·통상', slug: 'tariff', cls: 'cat-tariff', desc: '관세와 통상 규범, 국경을 넘는 거래의 규칙을 해설합니다.' },
  trade: { name: '수출입 리포트', slug: 'trade', cls: 'cat-trade', desc: '수출입 통계와 품목·국가별 흐름을 통관 데이터로 짚습니다.' },
  basics: { name: '상식 사전', slug: 'basics', cls: 'cat-basics', desc: '경제·무역 기사의 낯선 용어와 제도를 입문자의 눈높이로 풉니다.' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const url = (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`;

// heroFor 는 2026-08-26 에 제거했다. 대표 이미지는 이제 `public/` 이 아니라 `src/assets/` 에 있고
// URL 문자열이 아니라 ImageMetadata 로 다룬다(빌드가 리사이즈·WebP 를 맡는다).
// 대신 `lib/images.ts` 의 heroMeta()/metaByPath() 와 `components/Pic.astro` 를 쓸 것.

// ── 시간대 ────────────────────────────────────────────────
// 이 블로그의 기준 시간은 한국(KST)이다. 빌드는 UTC 서버에서 도는데
// new Date() 의 지역 게터를 그대로 쓰면 UTC 날짜가 찍혀 하루가 밀린다(요일까지 어긋난다).
// 그래서 표시용 날짜는 전부 Intl 로 시간대를 명시해 뽑는다.
export const TZ_KST = 'Asia/Seoul';
export const TZ_ET = 'America/New_York'; // 미 증시·국채 기준, 서머타임은 Intl 이 알아서 처리한다

const partsIn = (tz: string, d: Date) => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, wd: p.weekday };
};

const KO_DAYS: Record<string, string> = {
  Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일',
};

/** 오늘 날짜(YYYY-MM-DD)를 해당 시간대 기준으로 */
export const todayIn = (tz: string, now: Date = new Date()) => {
  const { y, m, d } = partsIn(tz, now);
  return `${y}-${m}-${d}`;
};

/** 상단 표시용: 2026년 8월 24일 월요일 */
export const dateLineIn = (tz: string, now: Date = new Date()) => {
  const { y, m, d, wd } = partsIn(tz, now);
  return `${y}년 ${Number(m)}월 ${Number(d)}일 ${KO_DAYS[wd] ?? wd}요일`;
};

/** 영문판 날짜 줄: Wednesday, 26 August 2026 (2026-08-26 신설 — 영문에 한국어 날짜가 찍히고 있었다) */
export const dateLineEnIn = (tz: string, now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now);

/** 영문판 참고 표시: NY 26 Aug */
export const shortDateEnIn = (tz: string, now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short' }).format(now);

/** 참고 표시용: 8월 23일 (일) */
export const shortDateIn = (tz: string, now: Date = new Date()) => {
  const { m, d, wd } = partsIn(tz, now);
  return `${Number(m)}월 ${Number(d)}일 (${KO_DAYS[wd] ?? wd})`;
};

// 예약 발행 게이트, pubDate가 KST 기준 오늘 이후인 글은 빌드에서 제외한다.
// 매일 아침 KST 06:50 파이프라인 빌드가 그날 일자 기사를 자동으로 발행하는 구조.
export const isPublished = (pubDate: Date) => pubDate.toISOString().slice(0, 10) <= todayIn(TZ_KST);

// ★ 영문판은 미국 동부 시간으로 잰다 (2026-08-28 소유주 지시 — 「미국 시장도 우리의 주요 독자」).
// 한글 게이트를 그대로 쓰면 KST 06:50 빌드에 영문이 함께 나가는데, 그 시각은 **ET 전날 17:50** 이라
// 미국 독자가 자는 사이에 발행되고 아침에는 이미 하루 지난 글이 된다.
// ET 로 재면 그날 일자 영문 기사는 ET 자정에 발행 자격을 얻고,
// 13:00 UTC(= ET 오전 9시, 서머타임 때는 8시) 빌드가 미국 오전에 실제로 내보낸다.
// 두 게이트를 가르는 이유는 하나 더 있다 — 한글 기사는 KST 아침에, 영문 기사는 ET 아침에
// 나가야 하므로 같은 날짜 문자열이라도 발행 시점이 반나절 어긋나야 맞다.
export const isPublishedEn = (pubDate: Date) => pubDate.toISOString().slice(0, 10) <= todayIn(TZ_ET);

// 읽기 시간은 손으로 적지 않는다. 예전에는 프런트매터에 직접 써 넣었는데,
// 표기 평균 6.5분에 실제 분량은 1.7분이라 처음 온 독자가 가장 먼저 만나는 것이 과장이었다.
// 본문에서 실측해 계산한다 — 세는 것은 한글 글자수뿐이다.
// JSX 태그·속성명·import 는 전부 로마자라 자동으로 빠지고,
// KeyStat·PointCards 같은 컴포넌트 안의 한국어 문구는 독자가 실제로 읽으므로 그대로 잡힌다.
const KO_CHARS_PER_MIN = 500; // 경제 해설은 숫자가 섞여 느리게 읽힌다. 넉넉히(=독자에게 유리하게) 잡는다.
export const readingMinutesOf = (body: string) =>
  Math.max(1, Math.round((body.match(/[가-힣]/g)?.length ?? 0) / KO_CHARS_PER_MIN));

// 기사 pubDate 는 프런트매터의 'YYYY-MM-DD' 가 UTC 자정으로 파싱된 값이다.
// 지역 게터를 쓰면 실행 시간대에 따라 하루가 밀리므로 UTC 게터로 고정해 읽는다.
export const fmtDate = (d: Date) =>
  `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
