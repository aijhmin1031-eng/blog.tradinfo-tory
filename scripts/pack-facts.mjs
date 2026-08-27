// 그림함 낱장 페이지의 「고유한 사실」을 원본 파일에서 뽑는다.
//
// 왜: 낱장 118쪽이 서로 고유 195자밖에 차이가 없었다(2026-08-27 실측). 검색에도 심사에도
// 불리하다. 지어낸 문장으로 늘리는 것은 절대 규칙 2 위반이므로, **파일에서 실제로 계산되는
// 값만** 싣는다. 픽셀 크기·파일 용량·투명 여부·대표 색(HEX).
//
// 대표 색은 이미지를 32×32 로 줄여 화소를 24단계로 양자화한 뒤 빈도순으로 고른다.
// 투명 화소와 거의 흰/검은 화소는 배경이므로 제외하고, 너무 비슷한 색은 하나로 묶는다.
// 결과는 src/data/pack-facts.json — 빌드가 이 파일을 읽는다(원본은 public 에 그대로 둔다).

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src/data/pack.ts'), 'utf8');

// pack.ts 를 파싱하지 않고 필요한 것만 뽑는다(등록부는 사람이 고치는 파일이라 형태가 안정적이다).
const packs = [...src.matchAll(/key: '([a-z0-9]+)',[\s\S]*?dir: '([^']+)'/g)].map((m) => ({ key: m[1], dir: m[2] }));
const blocks = src.split(/const (p1|p2|p3|soso): PackItem\[\] = \[/).slice(1);
const dirOfVar = { p1: '/images/pack', p2: '/images/pack2', p3: '/images/pack3', soso: '/images/pack-soso' };

const items = [];
for (let i = 0; i < blocks.length; i += 2) {
  const dir = dirOfVar[blocks[i]];
  for (const m of blocks[i + 1].matchAll(/slug: '([a-z0-9-]+)'/g)) items.push({ slug: m[1], dir });
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

async function facts(file) {
  const img = sharp(file);
  const meta = await img.metadata();
  const { data, info } = await img
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;                       // 투명 배경
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 238 && mn > 238) continue;          // 흰 배경
    if (mx < 26) continue;                       // 윤곽선의 검정
    const q = [r, g, b].map((v) => Math.round(v / 24) * 24);
    const k = q.join(',');
    const cur = bins.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n++; cur.r += r; cur.g += g; cur.b += b;
    bins.set(k, cur);
  }
  const ranked = [...bins.values()]
    .sort((x, y) => y.n - x.n)
    .map((c) => [Math.round(c.r / c.n), Math.round(c.g / c.n), Math.round(c.b / c.n)]);

  const picked = [];
  for (const c of ranked) {
    if (picked.every((p) => dist(p, c) > 90)) picked.push(c);   // 비슷한 색은 하나로
    if (picked.length === 5) break;
  }
  return {
    w: meta.width, h: meta.height,
    kb: Math.round(statSync(file).size / 1024),
    alpha: !!meta.hasAlpha,
    colors: picked.map(([r, g, b]) => hex(r, g, b)),
  };
}

const out = {};
let missing = 0;
for (const { slug, dir } of items) {
  const file = join(ROOT, 'public', dir.slice(1), `${slug}.png`);
  if (!existsSync(file)) { console.warn('원본 없음:', file.replace(ROOT, '')); missing++; continue; }
  out[slug] = await facts(file);
}
writeFileSync(join(ROOT, 'src/data/pack-facts.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(out).length}장 기록${missing ? ` · 원본 없음 ${missing}장` : ''} → src/data/pack-facts.json`);
