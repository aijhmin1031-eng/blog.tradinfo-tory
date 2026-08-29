#!/usr/bin/env node
// 품질 지표 — 기사 한 편이 아니라 **블로그 전체**를 재고, 시간에 따라 남긴다.
//
// check-quality.mjs 와 역할이 다르다.
//   check-quality.mjs : 한 편이 기준을 통과했나 (게이트, 통과/실패)
//   quality-metrics.mjs: 블로그 전체가 나아지고 있나 (지표, 추세)
//
// 게이트만 있으면 "오늘 쓴 글이 규칙을 지켰나"까지만 안다.
// "지난달보다 나아졌나"는 알 수 없다. 그 자리를 이 스크립트가 채운다.
//
// 사용법:
//   node scripts/quality-metrics.mjs            # 현재 지표를 표로 출력
//   node scripts/quality-metrics.mjs --save     # data/quality-history.json 에 스냅샷 추가
//   node scripts/quality-metrics.mjs --trend    # 이전 스냅샷 대비 변화까지 표시
//
// 지표를 목표로 삼지 말 것. 숫자를 올리려고 글을 쓰면 물타기가 된다.
// 지표는 **결과를 확인하는 자**이지 글쓰기의 목적이 아니다.

import { hasEnding } from './lib/ending.mjs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const SERIES = join(ROOT, 'data/series');
const HISTORY = join(ROOT, 'data/quality-history.json');

const koChars = (s) => (s.match(/[가-힣]/g)?.length ?? 0);

// ── 검정 판정 (scripts/audit.mjs 와 같은 기준을 쓴다. 한쪽만 고치지 말 것) ──────
//   2026-08-26 정의 변경: 이전에는 「## 검정」이라는 **제목 글자**만 셌다.
//   그래서 제목을 「정말 동행하는가, 재 보았다」로 단 기사는 상관계수·대조군을 다 싣고도
//   0으로 잡혔다. 제목이 아니라 **반증을 시도한 흔적**을 센다.
//   → 이 줄 위아래의 「검정」 수치는 8/26 이전 스냅샷과 직접 비교하지 말 것.
const CLAIM = /때문|이유는|덕분|탓에|영향으로|동행|따라 움직|이끌|주도|비례|반대로 움직|닮았|같은 방향/;
const VERIFY = /상관계수|상관 |회귀|대조군|반증|결정계수|R²|베타|표본|유의|공통 추세|추세를 걷어|검정/;
const NEEDS_VERIFY = (front, body) => {
  const usesOurData = /<SeriesChart|<SeriesContext|<LineChart|<Spark/.test(body) || /^chart:/m.test(front);
  if (!usesOurData) return false;
  const prose = body
    .replace(/<PointCards[\s\S]*?\]\}\s*\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\n/g, ' ');
  // 수치로 한 주장이라야 수치로 검정할 수 있다 → 주장 어휘와 숫자가 같은 문장에 있을 때만.
  return prose.split(/(?<=[.。])\s+/).some((x) => CLAIM.test(x) && /\d/.test(x));
};
const todayKST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

function splitFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { front: m[1], body: m[2] } : { front: '', body: raw };
}

// 프런트매터 sources 블록의 항목 수와 url 보유 수
function sourceInfo(front) {
  const lines = front.split('\n');
  let inS = false, n = 0, urls = 0;
  for (const line of lines) {
    if (/^sources:\s*$/.test(line)) { inS = true; continue; }
    if (!inS) continue;
    if (/^\S/.test(line)) break;
    if (/^\s+-\s+org:/.test(line)) n++;
    if (/^\s+url:\s*['"]?https?:\/\//.test(line)) urls++;
  }
  return { n, urls };
}

// 본문에서 수치 토큰만 뽑는다(반복 판정용)
const nums = (t) => new Set(t.match(/\d[\d,]*\.?\d*\s*(?:억 달러|억달러|만 원|원|%p|%|배|bp|포인트)/g) ?? []);

// 8자 연속 조각 집합(겹침 판정용)
function shingles(t, k = 8) {
  const s = t.replace(/[^가-힣]/g, '');
  const out = new Set();
  for (let i = 0; i + k <= s.length; i++) out.add(s.slice(i, i + k));
  return out;
}

function measure() {
  const today = todayKST();
  const arts = [];

  for (const f of readdirSync(POSTS)) {
    if (!f.endsWith('.mdx')) continue;
    const slug = f.slice(0, -4);
    const raw = readFileSync(join(POSTS, f), 'utf8');
    const { front, body } = splitFront(raw);
    const pub = (front.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1] ?? '';
    const draft = /^draft:\s*true/m.test(front);

    const chars = koChars(body);
    const src = sourceInfo(front);

    // 조판 부품 분리
    const pcBlocks = body.match(/<PointCards[\s\S]*?\]\}\s*\/>/g) ?? [];
    const pcDesc = (pcBlocks.join(' ').match(/desc:\s*'([^']*)'/g) ?? []).join(' ');
    const prose = body.replace(/<PointCards[\s\S]*?\]\}\s*\/>/g, '').replace(/<[^>]+>/g, '');
    const paras = prose.split('\n\n').map((p) => p.trim())
      .filter((p) => p && !/^(import\s|#|\||-)/.test(p));

    // 도입부 재탕: 요점3줄·KeyStat 의 수치가 본문 첫 문단에 다시 나오는 개수
    const topText = [
      ...(front.match(/^\s+(?:what|why|next):\s*(.+)$/gm) ?? []),
      ...(body.match(/<KeyStat[^>]*>/g) ?? []),
    ].join(' ');
    const topNums = nums(topText);
    const leadRepeat = paras.length && topNums.size
      ? [...nums(paras[0])].filter((x) => topNums.has(x)).length : 0;

    // PointCards 가 본문을 되풀이하는 비율
    const P = shingles(pcDesc);
    const B = shingles(prose);
    const pcOverlap = P.size > 20 ? [...P].filter((x) => B.has(x)).length / P.size : 0;

    arts.push({
      slug, pub, draft, chars,
      sources: src.n, sourceUrls: src.urls,
      hasEnding: hasEnding(front, body),
      oldEnding: /오늘의 결론/.test(body),
      emDash: (raw.match(/—/g) ?? []).length,
      internalLinks: (body.match(/\]\((\/posts\/|\/story\/|\/topics\/)/g) ?? []).length,
      hasVerification: VERIFY.test(body),
      needsVerification: NEEDS_VERIFY(front, body),
      usesLiveData: /<SeriesChart|<SeriesContext/.test(body),
      longParas: paras.filter((p) => koChars(p) > 350).length,
      leadRepeat, pcOverlap,
    });
  }

  const live = arts.filter((a) => !a.draft);
  const n = live.length;
  const pct = (c) => (n ? Math.round((c / n) * 1000) / 10 : 0);
  const sorted = [...live].map((a) => a.chars).sort((x, y) => x - y);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  // 수집만 하고 기사에서 한 번도 안 쓰는 데이터 계열
  let seriesTotal = 0, seriesUsed = 0;
  if (existsSync(SERIES)) {
    const allBody = live.map((a) => readFileSync(join(POSTS, `${a.slug}.mdx`), 'utf8')).join('\n');
    for (const f of readdirSync(SERIES)) {
      if (!f.endsWith('.json')) continue;
      const id = f.slice(0, -5);
      try { if (!JSON.parse(readFileSync(join(SERIES, f), 'utf8')).points?.length) continue; } catch { continue; }
      seriesTotal++;
      if (allBody.includes(`"${id}"`)) seriesUsed++;
    }
  }

  return {
    date: today,
    articles: n,
    depth: {
      meanChars: n ? Math.round(live.reduce((s, a) => s + a.chars, 0) / n) : 0,
      medianChars: median,
      pctOver1500: pct(live.filter((a) => a.chars >= 1500).length),
      pctOver1300: pct(live.filter((a) => a.chars >= 1300).length),
    },
    evidence: {
      pctWithSources: pct(live.filter((a) => a.sources > 0).length),
      pctWithSourceUrl: pct(live.filter((a) => a.sourceUrls > 0).length),
      pctWithVerification: pct(live.filter((a) => a.hasVerification).length),
      // 가장 중요한 칸. 분모가 전체가 아니라 **검정이 필요한 기사**다.
      // 해설 기사에까지 상관계수를 요구하면 지표가 물타기를 부추긴다.
      claimArticles: live.filter((a) => a.needsVerification).length,
      pctClaimsVerified: (() => {
        const need = live.filter((a) => a.needsVerification);
        return need.length ? Math.round((need.filter((a) => a.hasVerification).length / need.length) * 1000) / 10 : 100;
      })(),
    },
    repetition: {
      leadRepeatArticles: live.filter((a) => a.leadRepeat >= 1).length,
      pcOverlapArticles: live.filter((a) => a.pcOverlap >= 0.2).length,
      meanPcOverlap: n ? Math.round((live.reduce((s, a) => s + a.pcOverlap, 0) / n) * 1000) / 10 : 0,
    },
    connection: {
      meanInternalLinks: n ? Math.round((live.reduce((s, a) => s + a.internalLinks, 0) / n) * 10) / 10 : 0,
      pctNoInternalLink: pct(live.filter((a) => a.internalLinks === 0).length),
      pctUsingLiveData: pct(live.filter((a) => a.usesLiveData).length),
      seriesUsed, seriesTotal,
    },
    form: {
      oldEndingLeft: live.filter((a) => a.oldEnding).length,
      noEnding: live.filter((a) => !a.hasEnding).length,
      emDashViolations: live.filter((a) => a.emDash > 0).length,
      longParaArticles: live.filter((a) => a.longParas > 0).length,
    },
  };
}

// --- 출력 ----------------------------------------------------------------
const FMT = [
  ['깊이', [
    ['평균 분량', (m) => `${m.depth.meanChars.toLocaleString()}자`, 'up'],
    ['중앙 분량', (m) => `${m.depth.medianChars.toLocaleString()}자`, 'up'],
    ['1,500자 이상', (m) => `${m.depth.pctOver1500}%`, 'up'],
  ]],
  ['근거', [
    ['출처 보유', (m) => `${m.evidence.pctWithSources}%`, 'up'],
    ['확인 URL 보유', (m) => `${m.evidence.pctWithSourceUrl}%`, 'up'],
    ['검정 흔적 보유(전체)', (m) => `${m.evidence.pctWithVerification}%`, 'up'],
    // 4번째 원소는 증감 계산용 숫자 getter. 값 문자열에 다른 숫자가 섞이면
    // 문자열에서 숫자를 긁는 기본 방식이 엉뚱한 값을 만든다(예: "37.5% (8편 중)" → 37.58).
    ['★ 주장 기사 중 검정', (m) => `${m.evidence.pctClaimsVerified}% (${m.evidence.claimArticles}편)`, 'up',
      (m) => m.evidence.pctClaimsVerified],
  ]],
  ['반복', [
    ['도입부 재탕 기사', (m) => `${m.repetition.leadRepeatArticles}편`, 'down'],
    ['PointCards 재탕 기사', (m) => `${m.repetition.pcOverlapArticles}편`, 'down'],
  ]],
  ['연결·데이터', [
    ['평균 내부 링크', (m) => `${m.connection.meanInternalLinks}개`, 'up'],
    ['내부 링크 없음', (m) => `${m.connection.pctNoInternalLink}%`, 'down'],
    ['실데이터 사용', (m) => `${m.connection.pctUsingLiveData}%`, 'up'],
    ['쓰이는 데이터 계열', (m) => `${m.connection.seriesUsed}/${m.connection.seriesTotal}`, 'up'],
  ]],
  ['형식', [
    ['「오늘의 결론」 잔존', (m) => `${m.form.oldEndingLeft}편`, 'down'],
    ['끝맺음 없음', (m) => `${m.form.noEnding}편`, 'down'],
    ['긴 대시 위반', (m) => `${m.form.emDashViolations}편`, 'down'],
    ['긴 문단 보유', (m) => `${m.form.longParaArticles}편`, 'down'],
  ]],
];

const args = process.argv.slice(2);
const m = measure();

let prev = null;
let history = [];
if (existsSync(HISTORY)) {
  try { history = JSON.parse(readFileSync(HISTORY, 'utf8')); } catch { history = []; }
  prev = history.filter((h) => h.date !== m.date).slice(-1)[0] ?? null;
}

console.log(`\n도토리경제 품질 지표 · ${m.date} · 기사 ${m.articles}편\n`);
for (const [group, rows] of FMT) {
  console.log(`  [${group}]`);
  for (const [label, get, dir, num] of rows) {
    let delta = '';
    if (args.includes('--trend') && prev) {
      try {
        const a = num ? num(m) : get(m).replace(/[^0-9.]/g, '');
        const b = num ? num(prev) : get(prev).replace(/[^0-9.]/g, '');
        if (b === undefined || b === null || b === '') throw new Error('이전 스냅샷에 없던 지표');
        const d = Number(a) - Number(b);
        if (Number.isFinite(d) && d !== 0) {
          const good = dir === 'up' ? d > 0 : d < 0;
          delta = `  ${good ? '\x1b[32m' : '\x1b[31m'}${d > 0 ? '+' : ''}${Math.round(d * 10) / 10}\x1b[0m (${prev.date} 대비)`;
        }
      } catch { /* 이전 스냅샷에 없던 지표 */ }
    }
    console.log(`    ${label.padEnd(22)} ${get(m).padStart(10)}${delta}`);
  }
  console.log('');
}

if (args.includes('--save')) {
  history = history.filter((h) => h.date !== m.date);
  history.push(m);
  history.sort((a, b) => (a.date < b.date ? -1 : 1));
  writeFileSync(HISTORY, JSON.stringify(history, null, 1) + '\n');
  console.log(`  기록: data/quality-history.json (${history.length}개 스냅샷)\n`);
}
