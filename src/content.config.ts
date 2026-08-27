import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['money', 'tariff', 'trade', 'basics']),
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

export const collections = { posts, briefs, postsEn };
