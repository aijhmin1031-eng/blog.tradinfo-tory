// 국기 — 국가별 표에서 나라 이름 옆에 단다.
//
// ★ 국기 이모지(🇺🇸)를 쓰지 않는다. 윈도우에는 국기 글꼴이 없어 크롬·엣지에서
//   두 글자(「US」)로 나온다. 소유주 환경이 윈도우이므로 화면에서 바로 드러난다.
//   맥·아이폰에서만 확인하고 넘어가면 못 보는 종류의 결함이다.
//
// 원본: flag-icons 7.5.0 (MIT). 4:3 판 15장을 `src/assets/flags/` 에 그대로 두었다.
//   패키지를 의존성으로 들이지 않은 이유 — 우리가 쓰는 것은 15장뿐인데
//   패키지는 500여 장을 들고 온다. 국가를 늘릴 때는 그 나라 파일만 더 넣으면 된다.
//
// 크기는 부르는 쪽에서 준다. `<img>` 에 width·height 를 반드시 함께 줄 것
//   (안 주면 레이아웃이 한 번 밀린다 — CLS).

const files = import.meta.glob<string>('../assets/flags/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** ISO alpha-2(대문자) → 국기 SVG 주소. 없는 나라는 undefined 를 준다(칸을 비운다). */
export const flagUrl = (cc: string): string | undefined =>
  files[`../assets/flags/${cc.toLowerCase()}.svg`];

/** 국기가 준비된 나라인지 */
export const hasFlag = (cc: string): boolean => flagUrl(cc) !== undefined;
