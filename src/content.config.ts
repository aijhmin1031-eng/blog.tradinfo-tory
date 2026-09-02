import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['money', 'tariff', 'trade', 'basics']),
    /**
     * 기사 양식 5종 (2026-08-28 신설, 소유주 지시 「기사 내용에 따라 적절하게 적용」).
     * **분야가 아니라 내용이 양식을 정한다.** 고르는 법은 「이 기사가 답하는 질문이 무엇인가」.
     * 생략하면 분야의 기본 양식으로 되돌린다(`src/lib/forms.ts` FORM_BY_CATEGORY).
     * 정본은 `docs/article-forms.md`.
     */
    form: z.enum(['report', 'ledger', 'branch', 'path', 'ask']).optional(),
    pubDate: z.coerce.date(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    hero: z.string().optional(), // 대표 이미지 경로. 없으면 카테고리 배너 자동 사용
    place: z.string().optional(), // "오늘은 ~에 다녀왔습니다"
    three: z
      .object({
        what: z.string(), // 무슨 일이
        why: z.string(), // 왜 중요한가
        next: z.string(), // 다음에 뭘 봐야 하나
      })
      .optional(),
    toriNote: z.string().optional(),
    dataAsOf: z.string().optional(),
    /**
     * 갈림길 연재의 **기계가 채점할 수 있는 전망**(2026-08-27 신설).
     *
     * 왜 프런트매터인가: 1화는 채점을 사람이 하기로 해 놓고 `pending` 인 채 멈췄다.
     * 전망을 숫자 문턱으로 적어 두면 **빌드가 매일 시계열을 다시 읽어 스스로 판정한다.**
     * 사람이 손댈 일이 없으므로 다시 멈추지 않는다.
     *
     * rule: stay_below(high 를 한 번도 안 넘으면 적중) · stay_above(low 를 한 번도 안 깨면 적중)
     *       · stay_between(둘 다 지키면 적중). 관측 구간의 **종가**로만 판정한다.
     */
    forecast: z
      .object({
        series: z.string(),
        field: z.enum(['v', 'exp', 'imp', 'bal']).default('v'),
        label: z.string(),
        unit: z.string(),
        from: z.string(),
        to: z.string(),
        claim: z.string(),
        confidence: z.number().min(1).max(99),
        rule: z.enum(['stay_below', 'stay_above', 'stay_between']),
        low: z.number().optional(),
        high: z.number().optional(),
      })
      .optional(),
    // 이 기사가 실제로 쓴 원자료. 기사 끝 「자료」 블록과 구조화 데이터 citation 을 여기서 만든다.
    // 없는 출처를 지어 넣지 말 것 — 비어 있으면 자료 블록과 citation 둘 다 생략된다(lib/sources.ts).
    sources: z
      .array(
        z.object({
          org: z.string(), // 발표 기관: 한국은행, 관세청 …
          name: z.string(), // 통계·서비스 이름
          url: z.string().optional(),
          note: z.string().optional(), // 조회 구간·표본 등 이 기사에서의 사용 조건
        })
      )
      .optional(),
    topics: z.array(z.string()).optional(), // 소속 특집 key 목록 (lib/topics.ts)
    topicRole: z.enum(['입문', '데이터', '심층']).optional(), // 특집 내 역할 라벨
    chart: z
      .object({
        title: z.string(),
        unit: z.string().optional(),
        values: z.array(z.number()),
        yTicks: z.array(z.number()).optional(),
        xLabels: z.array(z.object({ idx: z.number(), text: z.string() })).optional(),
        endLabel: z.string().optional(),
        marks: z.array(z.object({ idx: z.number(), label: z.string().optional(), dx: z.number().optional(), dy: z.number().optional() })).optional(),
        valueSuffix: z.string().optional(),
        source: z.string(),
        color: z.enum(['down', 'up', 'accent']).optional(),
      })
      .optional(),
  }),
});

const briefs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/briefs' }),
  schema: z.object({
    date: z.string(),
    title: z.string(),
    summary: z.array(z.string()),
    movers: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        delta: z.string(),
        dir: z.enum(['up', 'down']),
      })
    ),
    chart: z
      .object({
        title: z.string(),
        unit: z.string().optional(),
        values: z.array(z.number()),
        yTicks: z.array(z.number()).optional(),
        xLabels: z.array(z.object({ idx: z.number(), text: z.string() })).optional(),
        endLabel: z.string().optional(),
        marks: z.array(z.object({ idx: z.number(), label: z.string().optional(), dx: z.number().optional(), dy: z.number().optional() })).optional(),
        valueSuffix: z.string().optional(),
        source: z.string(),
      })
      .optional(),
  }),
});


// ── 영문판(/en/) — 2026-08-26 신설 ─────────────────────────────────────
// **일부러 별도 컬렉션이다.** 같은 posts 컬렉션에 lang 필드로 섞으면
// `getCollection('posts', ...)` 를 쓰는 12곳(카테고리·숲·특집·사전·갈림길…)이
// 전부 영문 기사를 함께 집어 온다. 한 곳만 빠뜨려도 한글 목록에 영문이 새고,
// 그것이 조용히 일어난다. 컬렉션을 가르면 기존 호출부는 한 줄도 안 건드려도 된다.
//
// 스키마가 한글판과 다른 이유: 영문판은 미러가 아니라 별도 편집이다(소유주 결정).
// three(세 줄 요약)·sources 는 같은 구조를 쓰되, 세계관 필드(toriNote·place)는
// 데이터 기사에서 무기명으로 가므로 선택이다.
const postsEn = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts-en' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    hero: z.string().optional(),
    /** 짝이 되는 한글 기사 슬러그. hreflang 을 양방향으로 걸 때 쓴다. */
    translationOf: z.string().optional(),
    three: z
      .object({ what: z.string(), why: z.string(), next: z.string() })
      .optional(),
    /** Tori's Note — 데이터 트래커는 무기명, 논평만 서명(소유주 결정 2026-08-26) */
    toriNote: z.string().optional(),
    dataAsOf: z.string().optional(),
    sources: z
      .array(z.object({ org: z.string(), name: z.string(), url: z.string().optional(), note: z.string().optional() }))
      .optional(),
    topics: z.array(z.string()).optional(),
  }),
});

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

export const collections = { posts, briefs, postsEn, corps };
