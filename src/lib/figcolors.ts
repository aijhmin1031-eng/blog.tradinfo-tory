/**
 * 기업 분석 인포그래픽의 색 — **검증을 통과한 값만 쓴다.**
 *
 * 브랜드 네이비(#1E3A5F)·액센트(#B4552D)는 글·괘선·강조에는 맞지만
 * **카테고리 마크로는 채도와 명도가 미달**이라 검증에서 떨어졌다
 * (Lightness band FAIL · Chroma floor FAIL · 정상시야 ΔE 12.2 로 15 미만).
 * 그래서 마크 색은 검증을 통과한 5색을 쓰고, 브랜드 색은 글·괘선에 남긴다.
 *
 * 검증 결과(2026-09-02, dataviz validate_palette.js):
 *   밝은 모드  전 항목 PASS · 대비만 WARN → **직접 라벨로 해소**(모든 조각에 수치를 적는다)
 *   어두운 모드 전 항목 PASS
 *
 * ★ 순서를 섞지 말 것. 카테고리 색은 **고정 순서**로 배정하고 돌려쓰지 않는다.
 *   여섯째 항목이 필요하면 색을 새로 만들지 말고 「기타」로 접는다.
 */
export const FIG_CAT = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
} as const;

/** 사업 부문 → 고정 색 자리. 색은 **회사가 아니라 부문**을 따라간다. */
export const SEGMENT_SLOT: Record<string, number> = {
  반도체장비: 0,
  ESS: 1,
  통신장비: 2,
  '전기차·배터리': 3,
  기타: 4,
  통신사업: 2, // 대조군(대한광통신)도 통신은 같은 자리를 쓴다
  전력사업: 0,
};

/** CSS 변수로 내보낸다 — 밝은·어두운 모드를 각각 선언해야 하므로 클래스에서 쓴다. */
export const figCatVars = (n: number) =>
  Array.from({ length: n }, (_, i) => `--fig-${i}: ${FIG_CAT.light[i]};`).join(' ');
export const figCatVarsDark = (n: number) =>
  Array.from({ length: n }, (_, i) => `--fig-${i}: ${FIG_CAT.dark[i]};`).join(' ');
