// 기사 양식 5종 — **분야가 아니라 내용이 양식을 정한다** (2026-08-28 소유주 결정).
//
// 그전에는 양식이 카테고리에 묶여 있었다. money 면 무조건 경로 추적형이라
// **같은 분야 안에서 다양성이 안 나왔다.** 같은 「돈의 흐름」이라도 「환율이 얼마다」와
// 「그래서 내 예금이 얼마다」와 「다음 금통위에서 갈린다」는 서로 다른 글이다.
//
// ★ 표 자체는 `src/data/forms.json` 한 곳에만 있다. 게이트(`check-quality.mjs`)와
//   감사(`audit.mjs`)가 같은 JSON 을 읽는다 — 예전처럼 각자 베껴 들면 한쪽만 고치게 된다.
//   해설·뼈대·예문은 `docs/article-forms.md` 가 정본이다.
import spec from '../data/forms.json';

export type FormKey = 'report' | 'ledger' | 'branch' | 'path' | 'ask';

export interface FormSpec {
  name: string;
  question: string;
  skeleton: string;
  numHead: boolean;
  table: boolean;
  extra?: 'assumption' | 'timing';
}

export const FORMS = spec.forms as Record<FormKey, FormSpec>;
export const FORM_BY_CATEGORY = spec.byCategory as Record<string, FormKey>;

export const formKeyOf = (declared?: string, category?: string): FormKey =>
  (declared && declared in FORMS ? (declared as FormKey) : undefined) ??
  FORM_BY_CATEGORY[category ?? ''] ??
  'report';

export const formOf = (declared?: string, category?: string): FormSpec =>
  FORMS[formKeyOf(declared, category)];
