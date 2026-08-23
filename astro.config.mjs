import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 이중 배포:
//  - GitHub Pages(정본): https://aijhmin1031-eng.github.io/blog.tradinfo-tory/
//  - Vercel(병행, 커스텀 도메인 대기): VERCEL env가 있으면 base '/'로 빌드
// 커스텀 도메인 연결 시 site를 그 도메인으로 교체하고 Vercel을 정본으로 승격
const onVercel = !!process.env.VERCEL;
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  site: onVercel
    ? `https://${vercelHost ?? 'blog-tradinfo-tory.vercel.app'}`
    : 'https://aijhmin1031-eng.github.io',
  base: onVercel ? '/' : '/blog.tradinfo-tory',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
});
