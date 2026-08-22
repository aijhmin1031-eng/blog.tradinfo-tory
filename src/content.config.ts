import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['money', 'tariff', 'trade', 'basics']),
    pubDate: z.coerce.date(),
    readingMinutes: z.number().default(5),
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

export const collections = { posts, briefs };
