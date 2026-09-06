import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';




// ── 영문판(/en/) — 2026-08-26 신설 ─────────────────────────────────────
// **일부러 별도 컬렉션이다.** 같은 posts 컬렉션에 lang 필드로 섞으면
// `getCollection('posts', ...)` 를 쓰는 12곳(카테고리·숲·특집·사전·갈림길…)이
// 전부 영문 기사를 함께 집어 온다. 한 곳만 빠뜨려도 한글 목록에 영문이 새고,
// 그것이 조용히 일어난다. 컬렉션을 가르면 기존 호출부는 한 줄도 안 건드려도 된다.
//
// 스키마가 한글판과 다른 이유: 영문판은 미러가 아니라 별도 편집이다(소유주 결정).
// three(세 줄 요약)·sources 는 같은 구조를 쓰되, 세계관 필드(toriNote·place)는
// 데이터 기사에서 무기명으로 가므로 선택이다.

// ── 기업 분석 `/corp/` — 2026-09-02 신설 ──────────────────────────────
// **일부러 posts 와 가른 컬렉션이다.** 기사와 수명이 다르기 때문이다.
// 기사는 발행일이 박히고 그날의 사실로 남지만, 회사 낱장은 **분기마다 다시 쓰인다.**
// 같은 컬렉션에 두면 「2026-09-04 작성」이 붙은 글이 2027년 숫자를 들고 있게 되고,
// 그것이 목록·RSS·사이트맵에 기사로 섞여 나간다(영문판을 가른 것과 같은 이유다).
// 그래서 날짜 필드도 `pubDate` 가 아니라 **`updated`(갱신일)** 다.
//
// 형식은 「LLM 위키」다 — 기계가 인용할 수 있는 사실을 머리(`glance`)에 놓고
// 사람이 읽는 해석을 6장으로 잇는다. 정본은 `docs/corp-analysis.md` 8절.
const corps = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/corps' }),
  schema: z.object({
    /** 회사명. 페이지 제목과 목록 카드가 함께 쓴다. */
    name: z.string(),
    /** 종목코드 6자리. 금융위 시세 API 의 키다. */
    stock: z.string().regex(/^\d{6}$/),
    /** DART 고유번호 8자리. `src/data/dart-corp.json` 과 같은 값이어야 한다. */
    corpCode: z.string().regex(/^\d{8}$/),
    market: z.enum(['KOSPI', 'KOSDAQ']),
    /**
     * 시장이 붙인 이름표(「5G 관련주」 등). **회사가 쓴 이름이 아니다.**
     * 1장의 대조 하나가 여기서 나오므로 필드로 세웠다 — 본문에만 두면 갱신 때 빠뜨린다.
     */
    label: z.string().optional(),
    title: z.string(),
    description: z.string(),
    draft: z.boolean().default(false),
    /** 갱신일. 정기보고서가 새로 나오면 올린다. */
    updated: z.coerce.date(),
    /** 이 낱장의 숫자가 어느 시점 것인가. 한눈 카드와 함께 화면에 나간다. */
    dataAsOf: z.string(),
    hero: z.string().optional(),
    toriNote: z.string().optional(),
    /**
     * 한눈 카드 — **사실만 놓는다.** 해석을 섞지 않는 것이 이 블록의 조건이다.
     * 두괄식 규약과 기계 인용을 여기서 함께 만족시킨다(`docs/corp-analysis.md` 8절).
     * `note` 에는 기준 시점·산출 조건을 적는다. 비워 두지 말 것.
     */
    glance: z
      .array(z.object({ k: z.string(), v: z.string(), note: z.string() }))
      .min(4),
    /**
     * 6장 「향후 방향」이 쓰는 판별표. **예측이 아니라 판별 조건이다** —
     * 무엇을, 어느 선을 기준으로, 언제 보면 이 읽기가 맞는지 갈리는가.
     */
    watch: z
      .array(z.object({ metric: z.string(), now: z.string(), line: z.string(), when: z.string() }))
      .optional(),
    sources: z
      .array(z.object({ org: z.string(), name: z.string(), url: z.string().optional(), note: z.string().optional() }))
      .optional(),
  }),
});

export const collections = { corps };
