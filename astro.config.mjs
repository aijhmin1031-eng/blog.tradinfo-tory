import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 정본은 커스텀 도메인(Vercel). GitHub Pages는 같은 내용을 서브경로로 계속 띄우되,
// 색인은 정본 한 곳으로 모으기 위해 canonical을 dotoriecon.com으로 내보낸다(Base.astro).
export const CANONICAL_ORIGIN = 'https://dotoriecon.com';

const onVercel = !!process.env.VERCEL;

export default defineConfig({
  site: onVercel ? CANONICAL_ORIGIN : 'https://aijhmin1031-eng.github.io',
  base: onVercel ? '/' : '/blog.tradinfo-tory',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
});
