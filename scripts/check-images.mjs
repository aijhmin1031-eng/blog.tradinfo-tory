// 그림 크기 감사 (2026-08-27 신설).
//
// 왜 필요한가: 부모의 스코프 CSS 는 `<Pic>` 안의 img 에 닿지 않는다. 규칙이 조용히 죽으면
// `Pic` 의 기본값(width:100%)이 먹어 **30px 그림이 화면 폭까지 커진다.** 하루에 세 번 터졌다
// (토리의 한 마디 201px · 홈 하단 1,158px · 특집 허브 490px). 빌드도 통과하고 화면도 그려지므로
// 눈으로 보지 않으면 모른다. 그래서 **실측으로** 잡는다.
//
// ★ 이 스크립트의 첫 판은 서버가 죽은 것을 알아채지 못하고 모든 쪽을 조용히 건너뛴 뒤
//    「이상 없음」이라고 보고했다. **거짓 통과가 가장 나쁘다.** 지금은 한 쪽이라도 못 열면
//    실패로 끝난다.
//
// 사용: npm run build 뒤 `node scripts/check-images.mjs [베이스URL]`
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8140/blog.tradinfo-tory';
// ★ 크로미움 경로는 환경마다 다르다(2026-09-04 수리).
// 예전에는 `/opt/pw-browsers/chromium` 한 곳만 보았는데, **CI 는 거기에 설치하지 않는다**
// (`npx playwright install` 은 러너의 제 캐시에 넣는다). 그래서 배포 워크플로의
// 「품질 점검」이 이 한 줄 때문에 계속 실패하고 있었다. 로컬 윈도우에서도 당연히 없다.
// 순서: PW_CHROMIUM(직접 지정) → 그 경로가 실제로 있을 때만 사용 → 없으면 Playwright 가
// 제 힘으로 찾게 둔다(executablePath 를 넘기지 않는 것이 정답이다).
const HINT = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
const EXEC = existsSync(HINT) ? HINT : undefined;

// 조판마다 한 쪽. 버그는 조판 단위로 생기므로 전 페이지를 돌 필요가 없다.
// 낱장 조판(기사·용어·그림함·브리핑·특집)은 dist 에서 첫 항목을 자동으로 집어 온다.
const first = (dir) => {
  try { return readdirSync(join('dist', dir), { withFileTypes: true }).filter((e) => e.isDirectory())[0]?.name; }
  catch { return null; }
};
const targets = [
  ['홈', '/'],
  ['카테고리', '/category/money/'],
  ['숲', '/forest/'], ['창고', '/warehouse/'], ['소개', '/about/'], ['문의', '/contact/'],
  ['방법', '/method/'], ['지도', '/map/'], ['광장', '/board/'], ['검색', '/search/'],
  ['갈림길', '/galimgil/'], ['용어목록', '/glossary/'], ['그림함', '/pack/'],
  ['이야기', '/story/'], ['특집목록', '/topics/'], ['404', '/404.html'],
  ['영문홈', '/en/'], ['영문분석', '/en/analysis/'], ['영문그림함', '/en/pack/'], ['영문소개', '/en/about/'],
  ['기사', `/posts/${first('posts')}/`],
  ['용어낱장', `/glossary/${first('glossary')}/`],
  ['그림함낱장', `/pack/${first('pack')}/`],
  ['이야기낱장', `/story/${first('story')}/`],
  ['특집허브', `/topics/${first('topics')}/`],
  ['브리핑목록', '/briefs/'], ['브리핑낱장', `/briefs/${first('briefs')}/`],
  ['영문기사', `/en/posts/${first('en/posts')}/`],
  ['영문낱장', `/en/pack/${first('en/pack')}/`],
].filter(([, u]) => !u.includes('/undefined/'));

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const findings = [];
const failed = [];

// ★ 첫 판은 쪽마다 탭을 새로 열고 이미지 다운로드까지 기다려 10분을 넘겼다.
//    탭은 폭마다 하나만 쓰고, **레이아웃까지만** 기다린다 —
//    Astro 가 width·height 를 박아 주므로 그림이 다 내려오기 전에도 상자 크기는 확정된다.
const MEASURE = () => {
  const out = [];
  document.querySelectorAll('img').forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.width < 1) return;
    const attrW = Number(img.getAttribute('width')) || 0;
    const parent = img.parentElement?.getBoundingClientRect();
    const cls = (img.className || '').toString().split(' ')[0] || '';
    const why = [];
    if (attrW && r.width > attrW * 1.5) why.push(`지정 ${attrW}px → 실제 ${Math.round(r.width)}px`);
    if (parent && r.width > parent.width + 2) why.push(`부모를 ${Math.round(r.width - parent.width)}px 넘침`);
    if (why.length) out.push({ cls, alt: (img.alt || '').slice(0, 16), why: why.join(' · ') });
  });
  return out;
};

for (const w of [1280, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  // ★ 외부 요청(구글 폰트 등)이 이 컨테이너의 프록시에서 13초씩 잡혀 쪽당 13초가 걸렸다.
  //    조판 실측에는 외부 자원이 필요 없다 — 로컬이 아닌 것은 끊는다(쪽당 0.1초로 줄었다).
  await page.route('**/*', (route) => {
    const u = route.request().url();
    return u.startsWith('http://localhost') || u.startsWith('data:') ? route.continue() : route.abort();
  });
  for (const [name, u] of targets) {
    try {
      const res = await page.goto(BASE + u, { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (!res || res.status() >= 400) throw new Error('HTTP ' + (res?.status() ?? '없음'));
      const hits = await page.evaluate(MEASURE);
      for (const h of hits) findings.push({ page: name, w, ...h });
    } catch (e) {
      failed.push(`${name}/${w}px ${u} — ${e.message.split('\n')[0].slice(0, 60)}`);
    }
  }
  await page.close();
}
await browser.close();

// 못 열린 쪽이 있으면 결과를 믿을 수 없다. 조용히 넘기지 않는다.
if (failed.length) {
  console.log(`\x1b[31m실패\x1b[0m 열지 못한 쪽 ${failed.length}건 — 결과를 믿을 수 없다`);
  failed.slice(0, 8).forEach((f) => console.log('  ✗ ' + f));
  console.log('  `npm run build` 뒤 dist 를 서빙하고 있는지 확인할 것(기본 8140).');
  process.exit(2);
}
if (!findings.length) {
  console.log(`\x1b[32m통과\x1b[0m 그림 크기 이상 없음 — 조판 ${targets.length}종 × 2폭 = ${targets.length * 2}쪽 실측`);
  process.exit(0);
}
console.log(`\x1b[31m실패\x1b[0m 크기가 어긋난 그림 ${findings.length}건`);
for (const f of findings) console.log(`  ✗ ${f.page}/${f.w}px  .${f.cls || '(무명)'}  ${f.why}  [${f.alt}]`);
console.log('  부모의 스코프 CSS 는 <Pic> 안의 img 에 닿지 않는다. `:global()` 로 감싸고 **크기까지** 지정할 것.');
process.exit(1);
