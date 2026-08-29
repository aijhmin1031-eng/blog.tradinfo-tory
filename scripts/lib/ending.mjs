// 끝맺음 규칙 — **한 곳에만 둔다.**
//
// 2026-08-28 에 양식 표(`src/data/forms.json`)를 한 곳으로 모아 놓고도, 끝맺음 규칙은
// `check-quality.mjs` 와 `precheck-scheduled.mjs` 두 군데에 각자 남아 있었다. 그래서
// 게이트에서 완화한 규칙이 예약분 점검에는 반영되지 않아, 같은 기사가 한쪽은 통과하고
// 한쪽은 실패했다(2026-08-29 에 실제로 그렇게 걸렸다). 규칙은 여기 하나뿐이다.
//
// 규칙의 뜻: 「무엇을 언제 보면 되는지 주고 끝나라」이지 특정 문구가 아니다.
//  · 양식(`form:`)을 선언한 기사 — 마지막 `##` 절이 **앞을 가리키기만 하면** 된다.
//  · 선언 안 한 기사(2026-08-28 이전 100여 편) — 붙박이 문구 그대로. 소급하면 한꺼번에 빨개진다.

const KO_FIXED = /실무에서 틀리기 쉬운 지점|다음에 확인할 것/;
const EN_FIXED = /## What to watch|## Where this goes wrong in practice/;
const FORWARD = /\d{1,2}월\s*\d{1,2}일|확인할|지켜볼|볼 것|판별|다음 분기점|어디서 갈리/;

/** @param {string} front 프런트매터 @param {string} body 본문 @param {boolean} isEn 영문판 */
export const hasEnding = (front, body, isEn = false) => {
  if (isEn) return EN_FIXED.test(body);
  if (KO_FIXED.test(body)) return true;
  const declared = /^form:\s*\w+/m.test(front);
  if (!declared) return false;
  const lastSection = body.split(/^##\s+/m).pop() ?? '';
  return FORWARD.test(lastSection);
};
