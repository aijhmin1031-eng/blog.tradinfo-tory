#!/usr/bin/env node
// 전수 감사 — 「목록」이 아니라 「기준」으로 기사를 본다.
//
// 왜 만들었나 (2026-08-26):
//   품질 관리가 `docs/backfill-queue.md` 라는 **사람이 손으로 뽑은 목록** 위에 서 있었다.
//   목록은 8/25 에 만들어졌고, 기사는 매일 2편씩 늘어난다. 그래서
//   ① 큐 밖의 데이터 기사 14편이 링크 0개로 남았고(Tier C 신설 경위),
//   ② 큐를 완주한 뒤에도 `semi-import-paradox` 처럼 **주장만 있고 검정이 없는 기사**가
//      게이트를 통과한 채 서 있었다.
//   목록은 낡는다. 그래서 목록을 버리고 **매번 전수로 계산**한다.
//
// check-quality.mjs 와의 역할 분담:
//   check-quality  = 편별 **형식** 게이트(출처·끝맺음·긴 대시·죽은 링크·문단). 커밋 전 통과 필수.
//   audit(이 파일) = **전수 스캔 + 내용 검사**. 무엇을 다음에 손봐야 하는지 우선순위로 뽑는다.
//   precheck-scheduled = 예약분만 미리 훑어 발행일 사고를 막는다.
//
// 사용법:
//   node scripts/audit.mjs              # 전수 감사, 우선순위 목록
//   node scripts/audit.mjs --strict     # 하나라도 걸리면 종료코드 1 (훅용)
//   node scripts/audit.mjs --fail-on=90 # 가중치 90 이상(검정 없음·출처 없음)만 종료코드 1 (CI용)
//   node scripts/audit.mjs a b c        # 지정한 슬러그만
//   node scripts/audit.mjs --json       # 기계용 출력

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const todayKST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

const args = process.argv.slice(2);
const strict = args.includes('--strict');
// CI 는 「검정 없음·출처 없음」처럼 기사를 못 믿게 만드는 것만 빨갛게 켠다.
// 얇음·재탕까지 빨갛게 켜면 빨간불이 상시가 되고, 상시가 된 경고는 안 보게 된다.
const failOn = Number((args.find((a) => a.startsWith('--fail-on=')) ?? '').split('=')[1] ?? NaN);
const asJson = args.includes('--json');
const only = args.filter((a) => !a.startsWith('--'));

// ★ 제목의 수치가 지금도 맞는가 (2026-08-28 신설, 소유주 지시 「최신성이 부족하다」)
//
// `precheck` 는 **예약분**을 본다. 이미 나간 기사의 제목이 낡는 것은 이쪽이 본다.
// 실제로 두 편이 「기준금리 2.75%」를 제목에 달고 살아 있었다(8월 27일 3.00% 가 됐다).
//
// 만드는 과정에서 두 번 헛짚었다(경위는 `docs/operations.md` 「6. 재고 구성」).
// 나이(dataAsOf 지연)로는 못 잡는다 — 지연 9일 사이에 정책이 바뀐 사례가 있었다.
// **제목만** 본다. 본문의 과거 비교 수치는 낡은 것이 아니라 원래 과거 값이다.
const SERIES_OF = [
  [/기준금리/, 'baserate'], [/국고채/, 'ktb10y'], [/미\s*국채/, 'us10y'],
  [/원\/달러|원달러/, 'usdkrw'], [/엔화|원\/100엔/, 'jpy100'],
  [/코스피|KOSPI/, 'kospi'], [/WTI|유가/, 'wti'],
  [/정기예금|예금\s*금리/, 'deposit1y'],
];
const seriesCache = new Map();
const seriesLatest = (id) => {
  if (seriesCache.has(id)) return seriesCache.get(id);
  let v = null;
  try {
    const p = JSON.parse(readFileSync(join(ROOT, 'data/series', `${id}.json`), 'utf8')).points;
    v = p?.length ? p[p.length - 1].v ?? null : null;
  } catch {}
  seriesCache.set(id, v);
  return v;
};
/**
 * 제목이 현재값과 어긋나는 수치를 담고 있으면 그 목록을 돌려준다.
 *
 * 오탐을 걸러 내는 세 장치. 셋 다 실제 오탐을 보고 넣은 것이다.
 *  ① **범위 서술**은 뺀다 — 「72달러에서 93달러를 오가다」는 지나간 구간을 말한 것이라
 *     현재값이 그 안에 있어도 틀린 게 아니다.
 *  ② **문턱 서술**은 뺀다 — 「3%를 넘었나」·「3%대」는 점이 아니라 경계·구간이다.
 *  ③ 계열 이름이 여럿 걸리면 **수치에 가장 가까운 것**을 고른다. 앞에서부터 찾으면
 *     「기준금리 2.75%, 국고채 4.38%」의 4.38% 가 기준금리에 붙어 버린다.
 */
const staleFigures = (title) => {
  // ① 범위 서술 판정: 숫자 둘이 «에서/~» 로 이어지고 오가다·사이·까지 로 닫힌다.
  // 「72달러에서 93달러를」처럼 단위(달러·원)가 한글이라 [^가-힣] 로는 끊긴다. 길이로 잡는다.
  const isRange =
    /\d[\s\S]{0,10}?(?:에서|~)[\s\S]{0,10}?\d/.test(title) && /오가|사이|까지|등락/.test(title);
  if (isRange) return [];

  const out = [];
  for (const m of title.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|원|달러)/g)) {
    const after = title.slice(m.index + m[0].length, m.index + m[0].length + 6);
    if (/^대|^를?\s*(넘|밑|아래|위)|^이상|^이하/.test(after)) continue; // ② 문턱·구간
    const around = title.slice(Math.max(0, m.index - 22), m.index + m[0].length + 22);
    // ③ 가장 가까운 계열 이름을 고른다.
    let best = null, bestDist = Infinity;
    for (const [re, id] of SERIES_OF) {
      const mm = around.match(re);
      if (!mm) continue;
      const dist = Math.abs(mm.index - (m.index - Math.max(0, m.index - 22)));
      if (dist < bestDist) { bestDist = dist; best = id; }
    }
    if (!best) continue;
    const cur = seriesLatest(best);
    if (cur == null) continue;
    const claimed = parseFloat(m[1].replace(/,/g, ''));
    const diff = Math.abs(claimed - cur) / cur;
    // 3% 미만은 정상 변동(국고채 4.38→4.288 은 2.1% 로, 낡은 것이 아니라 움직인 것이다),
    // 50% 이상은 애초에 같은 대상을 가리키는 수치가 아니다.
    if (diff > 0.03 && diff < 0.5) out.push(`${m[0]}(${best} 현재 ${cur})`);
  }
  return out;
};

const splitFront = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { front: m[1], body: m[2] } : { front: '', body: raw };
};
const koChars = (s) => (s.match(/[가-힣]/g)?.length ?? 0);

// ── 내용 검사의 두 어휘집 ────────────────────────────────────────────────
// 「주장」: 우리 수치로 인과·동행을 말하는 문장이 있는가.
//   주의: 어휘만 보면 「~때문이다」 같은 평범한 설명문까지 걸린다(2026-08-26 실측 14편 중
//   절반이 위양성이었다). 그래서 **주장 어휘와 숫자가 같은 문장에 있을 때만** 센다.
//   수치로 하는 주장이라야 수치로 검정할 수 있기 때문이다.
const CLAIM = /때문|이유는|덕분|탓에|영향으로|동행|따라 움직|이끌|주도|비례|반대로 움직|닮았|같은 방향/;
// 「검정」: 그 주장을 반증하려 시도한 흔적이 있는가.
//   operations.md 「검정 문단」 규칙: 원인을 지목하면 반증 시도를 함께 싣는다.
const VERIFY = /상관계수|상관 |회귀|대조군|반증|결정계수|R²|베타|표본|유의|공통 추세|추세를 걷어|검정/;

// 산문만 남긴다: JSX 속성값이 문장으로 잡히면 위양성이 된다.
const proseOnly = (body) =>
  body
    .replace(/<PointCards[\s\S]*?\]\}\s*\/>/g, ' ')
    .replace(/<SeriesChart[\s\S]*?\/>/g, ' ')
    .replace(/<LineChart[\s\S]*?\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

const claimSentences = (body) =>
  proseOnly(body)
    .replace(/\n/g, ' ')
    .split(/(?<=[.。])\s+/)
    .filter((s) => CLAIM.test(s) && /\d/.test(s));

// 우리 수치로 그림을 그리는 기사인가 (=검정이 필요한 기사)
const usesOurData = (front, body) => /<SeriesChart|<SeriesContext|<LineChart|<Spark/.test(body) || /^chart:/m.test(front);

// 도입부 재탕에서 **빼야 할 숫자**: 연도·HS 코드·제목에 든 숫자(버전명·주제어).
//   2026-08-26 실측에서 도입부 재탕으로 잡힌 5편이 전부 이런 위양성이었다
//   (인코텀즈 2020, HS 8486/8542, 연도 2026, 기사 주제인 1,400원).
const numsOf = (t) => new Set((t.match(/-?\d[\d,]*\.?\d*/g) ?? []).map((s) => s.replace(/,/g, '')).filter((s) => s.length > 1));
const isNoise = (n, title) => /^(19|20)\d{2}$/.test(n) || /^8\d{3}$/.test(n) || title.replace(/,/g, '').includes(n);

const shingles = (t) => {
  const w = t.replace(/[^가-힣a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const S = new Set();
  for (let i = 0; i + 2 <= w.length; i++) S.add(`${w[i]} ${w[i + 1]}`);
  return S;
};

const files = readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
const findings = [];

for (const file of files) {
  const slug = file.replace('.mdx', '');
  if (only.length && !only.includes(slug)) continue;

  const raw = readFileSync(join(POSTS, file), 'utf8');
  const { front, body } = splitFront(raw);
  const pub = (front.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) ?? [])[1] ?? '?';
  const title = (front.match(/^title:\s*'(.*)'/m) ?? [])[1] ?? '';
  const ko = koChars(body);
  const issues = [];

  // ① 내용 — 주장에 검정이 붙어 있는가 (게이트가 못 보는 자리, 이번 사고의 핵심)
  const claims = usesOurData(front, body) ? claimSentences(body) : [];
  if (claims.length && !VERIFY.test(body)) {
    const q = claims[0].trim().replace(/\s+/g, ' ').slice(0, 44);
    issues.push({ w: 100, tag: '검정 없음', msg: `수치로 주장하는데 반증 시도가 없다 → "${q}…"` });
  }
  // ①-2 제목의 수치가 현재값과 어긋나는가 — 독자가 가장 먼저 보는 자리의 거짓이다.
  // 「검정 없음」(100) 다음, 「출처 없음」(90) 위에 둔다.
  const stale = staleFigures(title);
  if (stale.length) {
    issues.push({ w: 95, tag: '제목 수치 낡음', msg: `제목이 현재와 다른 값을 말한다 → ${stale.join(' · ')}` });
  }

  // ② 형식 — 게이트와 같은 기준이지만 전수로 본다
  if (!(front.match(/^\s+-\s+org:/gm) ?? []).length) issues.push({ w: 90, tag: '출처 없음', msg: 'sources 배열이 비어 있다' });
  if (!/실무에서 틀리기 쉬운 지점|다음에 확인할 것/.test(body)) issues.push({ w: 80, tag: '끝맺음 없음', msg: '끝맺음이 규칙 밖이다' });
  if (body.includes('—') || front.includes('—')) issues.push({ w: 80, tag: '긴 대시', msg: '절대 규칙 위반' });

  const links = [...body.matchAll(/\]\(\/posts\/([a-z0-9-]+)\/\)/g)].map((m) => m[1]);
  if (!links.length) issues.push({ w: 60, tag: '링크 0개', msg: '독자가 다음에 읽을 곳이 없다' });

  // ③ 분량 — 짧은 것 자체가 죄는 아니지만, 검정도 링크도 없이 짧으면 손볼 자리다
  if (ko < 900 && !VERIFY.test(body)) issues.push({ w: 40, tag: `얇음(${ko}자)`, msg: '검정도 없이 900자 미만' });

  // ④ 반복 — 위양성(연도·HS코드·제목 숫자)을 제외하고 센다
  const prose = body.replace(/<PointCards[\s\S]*?\]\}\s*\/>/g, '').replace(/<[^>]+>/g, '');
  const paras = prose.split('\n\n').map((p) => p.trim()).filter((p) => p && !/^(import\s|#|\||-)/.test(p));
  const topText = [...(front.match(/^\s+(?:what|why|next):\s*(.+)$/gm) ?? []), ...(body.match(/<KeyStat[^>]*>/g) ?? [])].join(' ');
  const topNums = numsOf(topText);
  // 2026-08-26 규칙을 좁혔다 — 두괄식 리드(아래 ⑤)를 강제하면서 이 판정과 정면으로 부딪혔다.
  //   첫 문단이 요약 카드의 수치를 **하나** 되풀이하는 것은 이제 규칙이 시키는 일이다.
  //   진짜 재탕은 「수치도 문장도 그대로 옮긴 것」이므로, 수치 2개 이상 + 표현까지 겹칠 때만 센다.
  //   (미결 22번: 위양성은 슬러그 예외가 아니라 판정 규칙을 좁혀서 없앤다.)
  const lead = [...numsOf(paras[0] ?? '')].filter((n) => topNums.has(n) && !isNoise(n, title));
  const leadOv = (() => {
    const T = shingles(topText.replace(/<[^>]+>/g, ' ')), L = shingles(paras[0] ?? '');
    return L.size > 8 ? [...L].filter((x) => T.has(x)).length / L.size : 0;
  })();
  if (lead.length >= 2 && leadOv >= 0.2) {
    issues.push({ w: 30, tag: '도입부 재탕', msg: `요점3줄의 수치(${lead.join(', ')})와 표현을 첫 문단이 그대로 옮겼다(겹침 ${(leadOv * 100).toFixed(0)}%)` });
  }

  // ⑤ 인용 가능성 3종 (2026-08-26 소유주 지시) — 게이트는 신규만 막고, 기존 107편의
  //   순서는 여기가 정한다. 90 미만이라 CI 빨간불은 켜지 않는다(--fail-on=90).
  //   왜 보는가: 구글 스니펫·LLM 은 요약 카드가 아니라 **첫 문단과 소제목**을 집어 간다.
  const realNums = (t) => [...numsOf(t)].filter((n) => !isNoise(n, title));
  const leadPara = (paras[0] ?? '').replace(/<[^>]+>/g, ' ');
  if (leadPara && !realNums(leadPara).length) {
    issues.push({ w: 55, tag: '리드 비두괄식', msg: '첫 문단에 결론 수치가 없다 — 검색엔진·LLM 이 집어 가는 자리다' });
  }
  // ★ 인용 3종을 **분야별로 가른다**(2026-08-28 소유주 결정, `check-quality.mjs` 의 FORM 과 같은 표).
  // 발행분 69편의 PointCards 사용률이 네 분야 모두 100% 였고 소제목 수도 4.3~5.8 로 같았다.
  // 원인은 이 규칙이 분야를 안 가린 데 있었다. **두괄식 리드만 전 분야 공통**으로 남긴다
  // (거기서 물러나면 다양성이 아니라 인용 불가가 된다). 내주는 것은 수치형 소제목과 표다.
  const FORM = {
    trade:  { numHead: true,  table: true  },
    money:  { numHead: false, table: true  },
    tariff: { numHead: false, table: true  },
    basics: { numHead: false, table: false },
  };
  const cat2 = (front.match(/^category:\s*(\w+)/m) ?? [])[1] ?? '';
  const form = FORM[cat2] ?? { numHead: true, table: true };

  const h2s = body.match(/^##\s+.+$/gm) ?? [];
  if (form.numHead && h2s.length && !h2s.some((h) => realNums(h).length)) {
    issues.push({ w: 50, tag: '소제목 무수치', msg: `소제목 ${h2s.length}개 중 발견을 수치로 말하는 것이 없다 — 하나만 수치형으로` });
  }
  if (form.table && !/^\s*\|[\s:|-]+\|\s*$/m.test(body)) {
    issues.push({ w: 45, tag: '표 없음', msg: '나열·대조가 줄글에 묻혀 있다 — 인용은 표에서 나온다' });
  }

  const pcDesc = ((body.match(/<PointCards[\s\S]*?\]\}\s*\/>/g) ?? []).join(' ').match(/desc:\s*'([^']*)'/g) ?? []).join(' ');
  const P = shingles(pcDesc), B = shingles(prose);
  const ov = P.size > 20 ? [...P].filter((x) => B.has(x)).length / P.size : 0;
  if (ov >= 0.2) issues.push({ w: 30, tag: `PointCards 겹침(${(ov * 100).toFixed(0)}%)`, msg: '카드가 본문을 되풀이한다' });

  if (issues.length) findings.push({ slug, pub, ko, live: pub <= todayKST, issues, score: Math.max(...issues.map((i) => i.w)) });
}

findings.sort((a, b) => b.score - a.score || a.ko - b.ko);

if (asJson) {
  console.log(JSON.stringify({ today: todayKST, total: files.length, findings }, null, 2));
} else {
  const C = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', x: '\x1b[0m' };
  console.log(`\n전수 감사 · ${todayKST} KST · 기사 ${files.length}편${only.length ? ` (지정 ${only.length}편)` : ''}\n`);
  if (!findings.length) {
    console.log(`${C.g}손볼 기사 없음.${C.x}\n`);
  } else {
    const byTag = {};
    for (const f of findings) for (const i of f.issues) (byTag[i.tag.replace(/\(.*/, '')] ??= []).push(f.slug);
    console.log('[한눈에]');
    for (const [t, v] of Object.entries(byTag).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${t.padEnd(16)} ${String(v.length).padStart(3)}편`);
    }
    console.log(`\n[손볼 순서] ${findings.length}편\n`);
    for (const f of findings) {
      const mark = f.score >= 100 ? `${C.r}★${C.x}` : f.score >= 80 ? `${C.y}!${C.x}` : ' ';
      console.log(`${mark} ${f.slug} ${C.d}(${f.pub}${f.live ? '' : ' 예약'} · ${f.ko}자)${C.x}`);
      for (const i of f.issues) console.log(`    · ${i.tag}: ${i.msg}`);
    }
    console.log();
  }
}

if (strict && findings.length) process.exit(1);
if (Number.isFinite(failOn)) {
  const blocking = findings.filter((f) => f.score >= failOn);
  if (blocking.length) {
    console.error(`\n✗ 가중치 ${failOn} 이상 ${blocking.length}편: ${blocking.map((f) => f.slug).join(', ')}\n`);
    process.exit(1);
  }
}
