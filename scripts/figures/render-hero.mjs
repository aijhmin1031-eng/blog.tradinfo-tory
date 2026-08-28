/**
 * hero-chart.mjs 가 만든 HTML 을 실제 브라우저로 그려 JPG 로 굽는다.
 *
 * ★ 겹침을 기계가 본다. 첫 판에서 히어로 수치가 제목을 덮고 x축 라벨이 출처와
 * 겹쳤는데, 빌드는 통과하고 그림도 그려져서 **눈으로 봐야만** 알 수 있었다.
 * 조판 상자들의 사각형이 실제로 교차하는지 재서, 겹치면 종료코드 2 로 죽는다.
 *
 * ★ 두부(tofu) 검사도 한다. 한글 폰트가 원격이라 이 컨테이너에서 막히면
 * 글자가 □ 로 나오는데, 그래도 그림은 «성공»으로 나온다. 폰트가 실제로
 * 물렸는지 document.fonts 로 확인한다.
 *
 * 사용: node scripts/figures/render-hero.mjs <서빙주소> <출력.jpg>
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const [url, out] = process.argv.slice(2);
if (!url || !out) { console.error('사용: render-hero.mjs <url> <out.jpg>'); process.exit(1); }

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1376, height: 768 } });
// 외부 요청은 프록시에 걸려 몇십 초를 잡아먹는다. 로컬만 통과시킨다.
await p.route('**/*', (r) => (r.request().url().includes('localhost') ? r.continue() : r.abort()));
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);

const report = await p.evaluate(() => {
  const sel = ['.kicker', '.headline', '.figure', '.foot', '.axis'];
  const boxes = [];
  for (const s of sel) {
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) boxes.push({ s, x: r.x, y: r.y, w: r.width, h: r.height, t: el.textContent.trim().slice(0, 24) });
    }
  }
  const hits = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
      const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
      if (ox > 2 && oy > 2) hits.push(`${a.s}("${a.t}") ↔ ${c.s}("${c.t}") ${Math.round(ox)}×${Math.round(oy)}px`);
    }
  // 글자가 화면 밖으로 나갔는지
  const over = boxes.filter((x) => x.x < 0 || x.y < 0 || x.x + x.w > 1376 || x.y + x.h > 768)
                    .map((x) => `${x.s}("${x.t}") 화면 밖`);
  const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
  return { hits, over, fonts: [...new Set(fonts)], boxes: boxes.length };
});

console.log(`조판 상자 ${report.boxes}개 · 로드된 폰트: ${report.fonts.join(', ') || '(없음)'}`);
if (!report.fonts.some((f) => /Hahmlet|Plex/.test(f))) {
  console.error('✗ 한글 폰트가 안 물렸다. 두부(□)로 구워질 수 있어 중단한다.');
  await b.close(); process.exit(2);
}
if (report.hits.length || report.over.length) {
  for (const h of [...report.hits, ...report.over]) console.error('  ✗ ' + h);
  console.error('✗ 조판이 겹치거나 넘쳤다.');
  await b.close(); process.exit(2);
}

const png = out.replace(/\.jpe?g$/i, '.png');
await p.screenshot({ path: png });
await b.close();
execFileSync(process.execPath, ['-e', `
const sharp=require('sharp');
sharp('${png}').jpeg({quality:90}).toFile('${out}').then(()=>{
  require('fs').unlinkSync('${png}');
  console.log('구움: ${out}');
});`], { cwd: process.cwd(), stdio: 'inherit' });
