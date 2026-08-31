// 영문판(/en/) 뼈대 — 2026-08-26 소유주 결정.
//
// 왜 하위 경로(/en/)인가:
//   GSC 속성이 **도메인 속성** dotoriecon.com 이라 모든 하위 경로·서브도메인을 한 속성이
//   덮는다. 따라서 /en/ 은 **추가 등록이 필요 없다.** 별도 도메인으로 가면 새 속성을
//   등록해야 할 뿐 아니라 8/24 에 산 도메인이 쌓아 온 색인·신뢰를 하나도 못 물려받는다.
//
// 무엇을 싣는가(소유주 결정 — 「데이터 데스크」):
//   107편 전량 미러가 아니다. 반도체 특집과 데이터 기사만 골라 싣고, 승부처는
//   기사가 아니라 **상시 데이터 트래커**다. 로이터·닛케이와 기사로 붙으면 지지만,
//   관세청 HS 8542 국가별 월별 원자료를 영어로 무료 공개하는 곳은 사실상 없다.
//   대량 기계번역은 구글 스팸 정책(scaled content abuse)의 표적이고 애드센스 심사에도
//   불리하므로, **번역이 아니라 별도 편집**으로 간다.

export type Lang = 'ko' | 'en';
export const LANGS: Lang[] = ['ko', 'en'];
export const DEFAULT_LANG: Lang = 'ko';

/** <html lang> 과 og:locale 에 쓰는 값 */
export const HTML_LANG: Record<Lang, string> = { ko: 'ko', en: 'en' };
export const OG_LOCALE: Record<Lang, string> = { ko: 'ko_KR', en: 'en_US' };
/** hreflang 값. 지역까지 좁히지 않는다 — 한국어권·영어권 전체가 대상이다. */
export const HREFLANG: Record<Lang, string> = { ko: 'ko', en: 'en' };

/** 경로에서 언어를 읽는다. /en/ 로 시작하면 영문, 나머지는 한글. */
export function langOf(pathname: string): Lang {
  return /^\/en(\/|$)/.test(stripBase(pathname)) ? 'en' : 'ko';
}

/** base(/blog.tradinfo-tory) 를 떼어 정본 기준 경로로 만든다. GH Pages 미러 때문에 필요하다. */
export function stripBase(pathname: string): string {
  const b = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = b && pathname.startsWith(b) ? pathname.slice(b.length) : pathname;
  return p || '/';
}

/** 언어 접두어를 뗀 「중립 경로」. /en/posts/x/ → /posts/x/ */
export function neutralPath(pathname: string): string {
  const p = stripBase(pathname);
  return p.replace(/^\/en(?=\/|$)/, '') || '/';
}

/** 중립 경로를 그 언어의 실제 경로로. ko 는 그대로, en 은 /en 을 붙인다. */
export function localizedPath(path: string, lang: Lang): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === 'en' ? (p === '/' ? '/en/' : `/en${p}`) : p;
}

// ── UI 문자열 ────────────────────────────────────────────────
// 세계관 용어(도토리 숲·도토리 창고)는 **직역하지 않는다**. Acorn Forest 는 영어권에서
// 유아용으로 읽힌다(소유주 결정: 영문판은 세계관 용어 대신 기능 이름으로 간다).
// 문체는 로이터·이코노미스트 기준 — 3인칭, 축약형 금지, 능동태, 독자 호칭(you) 금지.
type Dict = {
  siteName: string;
  tagline: string;
  description: string;
  navHome: string;
  navArticles: string;
  navTracker: string;
  navGlossary: string;
  navAbout: string;
  langSwitch: string;
  langSwitchLabel: string;
  readingTime: (m: number) => string;
  published: string;
  updated: string;
  /** 영문 내비: 무료 그림 */
  navPack: string;
  /** 차트 단위 라벨 접두사 */
  unitLabel: string;
  /** 테마 토글 접근성 라벨 */
  themeToggle: string;
  themeToggleTitle: string;
  sources: string;
  relatedReading: string;
  threeTitle: string;
  threeSub: string;
  threeWhat: string;
  threeWhy: string;
  threeNext: string;
  toriNote: string;
  dataAsOf: string;
  backToTop: string;
  noTranslation: string;
};

export const T: Record<Lang, Dict> = {
  ko: {
    siteName: '도토리경제',
    tagline: '거래가 있는 곳에, 토리가 갑니다',
    description:
      '도토리경제는 무역, 환율, 금리, 관세 등 돈이 움직이는 모든 거래의 데이터를 차트 한 장과 세 줄 요약으로 전하는 경제 브리핑 블로그입니다.',
    navHome: '오늘의 도토리',
    navArticles: '분석',
    navTracker: '오늘의 지표',
    navGlossary: '용어 도토리',
    navAbout: '소개',
    langSwitch: 'English',
    langSwitchLabel: '언어 전환',
    readingTime: (m) => `${m}분`,
    published: '발행',
    updated: '갱신',
    navPack: '그림함',
    unitLabel: '단위',
    themeToggle: '화면 테마 전환',
    themeToggleTitle: '라이트/다크 전환',
    sources: '자료',
    relatedReading: '함께 읽기',
    threeTitle: '토리의 세 줄 요약',
    threeSub: '30초 안에 핵심만',
    threeWhat: '무슨 일',
    threeWhy: '왜 중요',
    threeNext: '다음 체크',
    toriNote: '토리의 노트',
    dataAsOf: '기준',
    backToTop: '맨 위로',
    noTranslation: '이 글은 아직 영문판이 없습니다.',
  },
  en: {
    siteName: 'Dotori Economy',
    tagline: 'Korean trade and macro data, read from the source',
    description:
      'Dotori Economy publishes Korean customs, currency and interest-rate data with independent analysis. Semiconductor exports by destination, drawn monthly from Korea Customs Service records.',
    navHome: 'Home',
    navArticles: 'Analysis',
    navTracker: 'Data Tracker',
    navGlossary: 'Glossary',
    navAbout: 'About',
    langSwitch: '한국어',
    langSwitchLabel: 'Switch language',
    readingTime: (m) => `${m} min read`,
    published: 'Published',
    updated: 'Updated',
    navPack: 'Free Illustrations',
    unitLabel: 'Unit',
    themeToggle: 'Switch colour theme',
    themeToggleTitle: 'Light / dark',
    sources: 'Sources',
    relatedReading: 'Related',
    threeTitle: 'The three lines',
    threeSub: 'The essentials in 30 seconds',
    threeWhat: 'What happened',
    threeWhy: 'Why it matters',
    threeNext: 'What to watch',
    toriNote: "Tori's Note",
    dataAsOf: 'Data as of',
    backToTop: 'Back to top',
    noTranslation: 'This article is not available in English.',
  },
};

// ── 색 규약 ────────────────────────────────────────────────
// 절대 규칙 6 은 상승=빨강(한국 금융 관례)이다. 그런데 **서구는 정반대**여서
// 영문판의 빨간 상승 화살표는 외국 독자에게 「하락」으로 읽힌다.
// 소유주 결정(2026-08-26): **영문판만 뒤집는다.** 한글판은 규칙 6 그대로 둔다.
// 구현은 CSS 변수 교체다 — 마크업의 `up`/`down` 은 양쪽에서 그대로 쓰고,
// <html data-lang="en"> 에서 --up/--down 토큰만 서로 바꾼다(global.css).
export const FLIP_SIGN_COLORS: Record<Lang, boolean> = { ko: false, en: true };

/** 영문 수치 표기 — 「43.7억 달러」는 영어로 읽히지 않는다. $4.37 billion 으로 환산한다. */
export function usdEn(eokUsd: number): string {
  const usd = eokUsd * 1e8; // 억 달러 → 달러
  if (Math.abs(usd) >= 1e9) return `$${(usd / 1e9).toFixed(2)} billion`;
  return `$${(usd / 1e6).toFixed(0)} million`;
}
