import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 정본은 커스텀 도메인(Vercel). GitHub Pages는 같은 내용을 서브경로로 계속 띄우되,
// 색인은 정본 한 곳으로 모으기 위해 canonical을 dotoriecon.com으로 내보낸다(Base.astro).
export const CANONICAL_ORIGIN = 'https://dotoriecon.com';

const onVercel = !!process.env.VERCEL;

// 사이트맵 <lastmod> — 2026-08-26 추가.
// 이전 사이트맵은 <loc> 만 있었다. 크롤러가 「이 페이지가 언제 바뀌었나」를 알 방법이
// 없으면 재방문 일정을 세우지 못한다(구글이 실제로 쓰는 힌트는 lastmod 하나뿐이다.
// changefreq·priority 는 무시한다고 공식적으로 밝혔으므로 넣지 않는다).
//
// 날짜는 **git 이 기록한 마지막 커밋 시각**을 쓴다. 파일 mtime 은 CI 체크아웃 때
// 전부 오늘로 덮여 쓸모가 없고, pubDate 는 보강해도 안 바뀌어 거짓말이 된다.
const postLastmod = (() => {
  const map = new Map();
  try {
    const out = execSync(
      'git log --format=%cI --name-only --diff-filter=AM -- src/content/posts',
      { cwd: fileURLToPath(new URL('.', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    let when = null;
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (/^\d{4}-\d{2}-\d{2}T/.test(t)) { when = t; continue; }
      const m = t.match(/^src\/content\/posts\/(.+)\.mdx$/);
      // git log 는 최신 커밋부터 내려오므로, 슬러그를 처음 만난 때가 마지막 수정 시각이다.
      if (m && when && !map.has(m[1])) map.set(m[1], when);
    }
  } catch {
    // git 이 없거나 얕은 클론이면 lastmod 없이 내보낸다. 틀린 날짜보다 없는 편이 낫다.
  }
  return map;
})();

export default defineConfig({
  site: onVercel ? CANONICAL_ORIGIN : 'https://aijhmin1031-eng.github.io',
  base: onVercel ? '/' : '/blog.tradinfo-tory',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const m = item.url.match(/\/posts\/([^/]+)\/$/);
        const when = m && postLastmod.get(m[1]);
        if (when) item.lastmod = when;
        return item;
      },
    }),
  ],
});
