// 대표 이미지(hero) 해석기 — 2026-08-26 신설.
//
// 왜 있나: 이미지가 전부 `public/` 에 있어 Astro 의 이미지 최적화를 통째로 우회하고 있었다.
// 그 결과 목록 카드가 160×90 으로 보여 주면서 **1200px 원본(107~203KB)** 을 그대로 내려받았고,
// 홈·카테고리 페이지가 1.2~1.6MB 가 됐다(8/26 구조 점검 실측, 낭비 추정 28MB).
//
// 그래서 hero·cat 이미지를 `src/assets/` 로 옮겼다. 그러면 빌드가 리사이즈·WebP 변환을 맡는다.
// 다만 기사 프런트매터의 `hero` 는 **문자열 경로**(`/images/hero/x.jpg`)라 정적 import 를 쓸 수 없다.
// 그래서 glob 으로 파일명 → ImageMetadata 지도를 만들어 두고 문자열로 찾아 쓴다.
//
// 주의: 여기서 돌려주는 것은 URL 문자열이 아니라 **ImageMetadata** 다.
// `<Image src={...}>` 에 넘겨야 최적화가 걸린다. og:image 처럼 URL 문자열이 필요한 자리는
// 컴포넌트 프런트매터에서 `getImage()` 로 한 번 더 풀어 쓴다(PostLayout 참고).

import type { ImageMetadata } from 'astro';
import { CATEGORIES, type CategoryKey } from './site';

const heroes = import.meta.glob<{ default: ImageMetadata }>('../assets/hero/*.{jpg,jpeg,png}', {
  eager: true,
});
const cats = import.meta.glob<{ default: ImageMetadata }>('../assets/cat/*.{jpg,jpeg,png}', {
  eager: true,
});
// 카툰·캐릭터·그림함 썸네일도 같은 방식으로 최적화한다(2026-08-26).
// `fig` 는 기업 분석 인포그래픽이다(2026-09-02). 절마다 한 장씩 들어간다.
// `promo` 는 우리가 우리를 광고하는 자체 배너다(2026-09-03).
// 그림함 **원본**은 내려받기 대상이라 `public/` 에 그대로 둔다. 여기 있는 것은 화면용 썸네일뿐이다.
const others = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/{story,poses,tori,packthumb,fig,promo}/*.{jpg,jpeg,png}',
  { eager: true }
);

/** glob 키는 '../assets/hero/x.jpg' 형태다. 파일명만 떼어 지도를 다시 만든다. */
const byName = (mod: Record<string, { default: ImageMetadata }>) =>
  Object.fromEntries(
    Object.entries(mod).map(([k, v]) => [k.split('/').pop() as string, v.default])
  );

const HERO = byName(heroes);
const CAT = byName(cats);
const OTHER = byName(others);

/**
 * 기사의 대표 이미지를 돌려준다. 프런트매터에 `hero` 가 없으면 카테고리 기본 이미지로 떨어진다.
 * 파일이 아예 없으면 `undefined` 를 돌려주므로, 부르는 쪽에서 렌더를 건너뛸 수 있다.
 */
export function heroMeta(category: CategoryKey, hero?: string): ImageMetadata | undefined {
  if (hero) {
    const name = hero.split('/').pop();
    // ★ `hero/` 밖에 있는 그림을 대표 이미지로 쓰는 기사가 있다(2026-09-03 전수 점검에서 나왔다).
    //    갈림길 1화가 `story/galim-02.jpg` 를 가리켰는데, 여기서 HERO 만 뒤지느라 못 찾고
    //    **조용히 카테고리 배너로 떨어져 있었다.** 빌드도 화면도 멀쩡해서 눈으로만 보면 모른다.
    //    OTHER 까지 본 뒤에 대체한다 — 대체는 정말 없을 때만 일어나야 한다.
    if (name) {
      const found = HERO[name] ?? OTHER[name];
      if (found) return found;
    }
  }
  return CAT[`${CATEGORIES[category].slug}.jpg`];
}

/**
 * 경로 문자열만 있는 자리에서 쓴다(특집 등록부·카툰·썸네일 등).
 * 파일명으로 찾으므로 폴더가 달라도 된다. 이름이 겹치지 않는다는 전제이고, 겹치면 빌드 때 잡힌다.
 */
export function metaByPath(path?: string): ImageMetadata | undefined {
  const name = path?.split('/').pop();
  return name ? HERO[name] ?? CAT[name] ?? OTHER[name] : undefined;
}
