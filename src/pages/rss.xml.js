import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';

// 분석 보고서는 정기보고서 제출 시마다 다시 쓰이므로 날짜가 발행일이 아니라 갱신일이다.
// RSS 도 갱신일 기준으로 싣는다(소개 화면 「발행」 절과 같은 규약).
export async function GET(context) {
  const corps = (await getCollection('corps', ({ data }) => !data.draft)).sort(
    (a, b) => +new Date(b.data.updated) - +new Date(a.data.updated),
  );
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: corps.map((c) => ({
      title: c.data.title,
      description: c.data.description,
      pubDate: new Date(c.data.updated),
      link: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/corp/${c.id}/`,
    })),
    customData: '<language>ko-kr</language>',
  });
}
