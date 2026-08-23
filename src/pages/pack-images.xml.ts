// 무료 이미지 전용 사이트맵. 구글은 <image:image>로 이미지 자체를 색인하고,
// 네이버는 표준 <url> 목록으로 낱장 페이지를 수집한다. robots.txt 에 등재해 둔다.
import type { APIRoute } from 'astro';
import { ALL_ITEMS, fileOf } from '../data/pack';
import { url } from '../lib/site';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const entries = ALL_ITEMS.map(({ pack, item }) => {
    const page = abs(url(`/pack/${item.slug}/`));
    return `  <url>
    <loc>${esc(page)}</loc>
    <lastmod>${pack.date}</lastmod>
    <changefreq>monthly</changefreq>
    <image:image>
      <image:loc>${esc(abs(url(fileOf(pack, item))))}</image:loc>
      <image:title>${esc(`${item.name} 무료 이미지`)}</image:title>
      <image:caption>${esc(item.desc)}</image:caption>
      <image:license>${esc(abs(url('/pack/')))}</image:license>
    </image:image>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
