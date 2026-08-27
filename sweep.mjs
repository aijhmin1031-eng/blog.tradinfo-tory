import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(d, e.name)) : (e.name === 'index.html' ? [join(d, e.name)] : []));
const pages = walk('dist').map(f => '/' + f.slice(5).replace(/index\.html$/, ''));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1850, height: 900 } });
const bad = [];
for (const u of pages) {
  await p.goto('http://localhost:8138/blog.tradinfo-tory' + u, { waitUntil: 'domcontentloaded' });
  const hits = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.wrap').forEach(el => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      // .wrap 인데 가운데로 오지 않는 것: 좌 여백이 20px 미만인데 폭이 화면보다 뚜렷이 좁다
      if (r.width < innerWidth - 80 && r.left < 20)
        out.push((el.className || '').toString().split(' ').filter(c => c !== 'wrap')[0] || '(무명)');
    });
    return [...new Set(out)];
  });
  if (hits.length) bad.push({ u, hits });
}
console.log(bad.length === 0 ? '가운데 정렬 깨진 .wrap 없음 ✓' : '깨진 곳:');
bad.slice(0, 20).forEach(x => console.log(' ', x.u, x.hits.join(', ')));
if (bad.length > 20) console.log(`  … 그 밖 ${bad.length - 20}쪽`);
console.log('훑은 쪽', pages.length);
await b.close();
