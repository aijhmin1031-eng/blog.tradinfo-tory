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
  }),
});

export const collections = { posts };
