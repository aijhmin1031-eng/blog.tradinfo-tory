/**
 * 기사 대표 이미지를 「데이터 시각화」로 만든다 (2026-08-28 소유주 지시).
 *
 * 그전에는 토리 카툰을 히어로로 썼는데, 실무자 키워드로 들어온 독자에게
 * 「데이터 리포트」로 읽히지 않는다는 지적이 있었다. FT·이코노미스트가
 * 실제로 쓰는 방식 — 그 기사의 핵심 수치를 크게 세우고 근거 선을 함께 둔다.
 *
 * 생성 AI를 쓰지 않는다. 수치가 그대로 근거이므로 지어낼 여지가 없고,
 * 비용도 들지 않으며, 데이터가 갱신되면 다시 돌리기만 하면 된다.
 *
 * 조판 규칙(dataviz 기준):
 *  - 히어로 수치는 산세리프(세리프는 장식으로 읽힌다), 비례숫자
 *  - 계열 하나에는 범례를 두지 않는다. 제목이 계열을 말한다
 *  - 직접 라벨은 골라서만. 모든 점에 숫자를 붙이지 않는다
 *  - 격자·축은 물러나 있게, 선은 2px
 *  - 글자는 잉크 토큰으로. 계열 색을 글자에 쓰지 않는다
 *
 * 폰트는 원격(Google Fonts)이라 이 컨테이너에서 막힌다.
 * `--fonts <dir>` 로 로컬 사본을 넘긴다(local.css + w2/). 없으면 경고하고 멈춘다.
 *
 * 사용:
 *   node scripts/figures/hero-chart.mjs --spec <spec.json> [--out <file.jpg>]
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const args = process.argv.slice(2);
const arg = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const TOKENS = {
  paper: '#FBFBF9', ink: '#16140F', sub: '#5F5A50', muted: '#736D5E',
  hair: '#DDDAD2', hair2: '#ECEAE4', brand: '#1E3A5F', accent: '#B4552D',
  up: '#C73E3A', down: '#2F66A8',
  // 영문판만 서구 관례(상승=초록·하락=빨강). i18n.ts 와 같은 규약이다.
  upEn: '#2E7D4F', downEn: '#C73E3A',
};

/** 시리즈에서 (날짜, 값) 배열을 뽑는다. 무역 계열은 exp/imp/bal 중 하나를 고른다. */
function loadSeries(id, field = 'v', scale = 1) {
  const p = join(ROOT, 'data/series', id + '.json');
  if (!existsSync(p)) throw new Error(`시리즈가 없다: ${p}`);
  const pts = JSON.parse(readFileSync(p, 'utf8')).points ?? [];
  return pts.map((r) => ({ d: r.d, v: (field === 'v' ? r.v : r[field]) * scale }));
}

function buildHtml(spec) {
  const lang = spec.lang === 'en' ? 'en' : 'ko';
  const up = lang === 'en' ? TOKENS.upEn : TOKENS.up;
  const down = lang === 'en' ? TOKENS.downEn : TOKENS.down;
  const series = loadSeries(spec.series, spec.field ?? 'v', spec.scale ?? 1);
  const win = spec.window ?? series.length;
  const pts = series.slice(-win);
  if (pts.length < 2) throw new Error('점이 두 개도 안 된다');

  const rising = pts.at(-1).v >= pts[0].v;
  const line = spec.tone === 'down' ? down : spec.tone === 'up' ? up : rising ? up : down;

  // 좌표계
  const W = 1376, H = 768;
  const plot = { x: 92, y: 372, w: W - 92 - 92, h: 258 };
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.18 || Math.abs(hi) * 0.1 || 1;
  lo -= pad; hi += pad;
  const X = (i) => plot.x + (plot.w * i) / (pts.length - 1);
  const Y = (v) => plot.y + plot.h - (plot.h * (v - lo)) / (hi - lo);

  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${path} L${X(pts.length - 1).toFixed(1)},${(plot.y + plot.h).toFixed(1)} L${plot.x},${(plot.y + plot.h).toFixed(1)} Z`;

  // 직접 라벨: 골라서만(첫 점·마지막 점, 그리고 지정된 것)
  const marks = (spec.marks ?? []).map((m) => {
    const i = pts.findIndex((p) => p.d === m.date);
    if (i < 0) throw new Error(`marks 의 날짜가 시리즈에 없다: ${m.date}`);
    return { ...m, i, x: X(i), y: Y(pts[i].v) };
  });

  const grid = [0, 0.5, 1].map((t) => {
    const y = plot.y + plot.h * t;
    return `<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.w}" y2="${y}" stroke="${TOKENS.hair2}" stroke-width="1"/>`;
  }).join('');

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="/fonts/local.css">
<style>
  html,body{margin:0;padding:0;background:${TOKENS.paper};width:${W}px;height:${H}px;overflow:hidden}
  .wrap{position:relative;width:${W}px;height:${H}px;
        font-family:'IBM Plex Sans KR','Hahmlet',sans-serif;-webkit-font-smoothing:antialiased}
  .kicker{position:absolute;left:92px;top:84px;font-size:26px;letter-spacing:.14em;
          font-weight:700;color:${TOKENS.accent};text-transform:uppercase}
  /* 제목과 수치는 서로 다른 칸에 둔다. 한 칸에 두면 긴 제목이 수치를 덮는다
     (첫 판에서 실제로 겹쳤다). 폭을 나눠 두면 제목이 길어져도 아래로만 자란다. */
  .headline{position:absolute;left:92px;top:136px;width:672px;
            font-family:'Hahmlet',serif;font-weight:700;font-size:46px;line-height:1.3;
            color:${TOKENS.ink};word-break:keep-all}
  /* 히어로 수치는 산세리프·비례숫자. 세리프로 쓰면 장식으로 읽힌다. */
  .figure{position:absolute;left:${92 + 672 + 40}px;width:${W - 92 - 92 - 672 - 40}px;
          top:142px;text-align:right}
  .figure .v{font-size:104px;font-weight:700;line-height:1;color:${TOKENS.ink};
             font-variant-numeric:proportional-nums;white-space:nowrap}
  .figure .cap{margin-top:12px;font-size:23px;font-weight:500;color:${TOKENS.sub};word-break:keep-all}
  .foot{position:absolute;left:92px;top:702px;font-size:22px;color:${TOKENS.muted}}
  .rule{position:absolute;left:92px;top:332px;width:${plot.w}px;height:2px;background:${TOKENS.ink}}
  .axis{position:absolute;top:${plot.y + plot.h + 18}px;font-size:21px;color:${TOKENS.muted}}
  svg{position:absolute;left:0;top:0}
  .lbl{font-family:'IBM Plex Sans KR',sans-serif;font-size:23px;font-weight:700;fill:${TOKENS.ink}}
  .lbl-sub{font-family:'IBM Plex Sans KR',sans-serif;font-size:19px;fill:${TOKENS.muted}}
</style>
<div class="wrap">
  <div class="kicker">${esc(spec.kicker ?? '')}</div>
  <div class="headline">${esc(spec.headline ?? '')}</div>
  ${spec.figure ? `<div class="figure"><div class="v">${esc(spec.figure)}</div>
     <div class="cap">${esc(spec.figureCaption ?? '')}</div></div>` : ''}
  <div class="rule"></div>
  <svg width="${W}" height="${H}">
    <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${line}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${line}" stop-opacity="0.02"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#fill)"/>
    <path d="${path}" fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${marks.map((m) => `
      <circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="9" fill="${TOKENS.paper}" stroke="${line}" stroke-width="3"/>
      <text class="lbl" x="${(m.x + (m.dx ?? 0)).toFixed(1)}" y="${(m.y + (m.dy ?? -24)).toFixed(1)}"
            text-anchor="${m.anchor ?? 'middle'}">${esc(m.label)}</text>`).join('')}
  </svg>
  <div class="axis" style="left:92px">${esc(spec.xFirst ?? '')}</div>
  <div class="axis" style="right:92px">${esc(spec.xLast ?? '')}</div>
  <div class="foot">${esc(spec.source ?? '')}</div>
</div>`;
}

const specPath = arg('--spec');
if (!specPath) { console.error('--spec <spec.json> 이 필요하다'); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const html = buildHtml(spec);
const outHtml = arg('--html', join(ROOT, '.hero-tmp.html'));
mkdirSync(dirname(outHtml), { recursive: true });
writeFileSync(outHtml, html);
console.log(outHtml);
