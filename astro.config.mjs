import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// GitHub Pages: https://aijhmin1031-eng.github.io/blog.tradinfo-tory/
// 커스텀 도메인 연결 시 site 교체, base는 '/'로 변경
export default defineConfig({
  site: 'https://aijhmin1031-eng.github.io',
  base: '/blog.tradinfo-tory',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
});
