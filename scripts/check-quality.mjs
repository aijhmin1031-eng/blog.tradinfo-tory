#!/usr/bin/env node
// 물타기 게이트 — 설명 기사 보강(미결 15번, docs/backfill-queue.md)의 통과 기준을 기계로 점검한다.
//
// 왜 있나: "2배로 늘리자"를 목표로 삼으면 같은 말을 다시 쓰고 배경 설명을 부풀리게 된다.
// 얇은 기사보다 나쁜 것이 부풀린 기사다. 그래서 보강 커밋 전에 이 스크립트가
// "분량만 늘고 새 사실·새 출처가 없는가"를 git 원본과 대 보고 막는다.
// 기준 원문은 docs/operations.md 「통과 기준(물타기 게이트)」 절.
//
// 사용법:
//   node scripts/check-quality.mjs <슬러그> [<슬러그> ...]
//   node scripts/check-quality.mjs --all        # 큐 전체(backfill-queue.md의 슬러그) 점검
//   node scripts/check-quality.mjs --linkable   # 지금 링크 걸어도 되는 기사 목록(쓰기 전에 볼 것)
// 종료코드 0=통과, 1=하나라도 실패.
//
// --linkable 이 있는 이유: 죽은 내부 링크는 "쓰고 나서" 걸리면 이미 늦다.
// 아직 발행 안 된 기사로 링크를 걸어 두면 독자에게 404가 간다(2026-08-25 실제 발생).
// 쓰기 전에 이 목록을 보고 그 안에서만 고르면 애초에 안 걸린다.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const BASE_REF = process.env.QUALITY_BASE_REF || 'origin/main';

// site.ts readingMinutesOf 와 같은 규칙: 한글 글자수만 센다(500자/분).
const KO_CHARS_PER_MIN = 500;
const koChars = (s) => (s.match(/[가-힣]/g)?.length ?? 0);
const readingMinutes = (body) => Math.max(1, Math.round(koChars(body) / KO_CHARS_PER_MIN));

// --- 파싱 도우미 ---------------------------------------------------------
function splitFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { front: '', body: raw };
  return { front: m[1], body: m[2] };
}

// frontmatter 의 sources: 아래 항목(- org:) 개수를 센다.
function countSources(front) {
  const lines = front.split('\n');
  let inSources = false;
  let count = 0;
  for (const line of lines) {
    if (/^sources:\s*$/.test(line)) { inSources = true; continue; }
    if (inSources) {
      if (/^\S/.test(line)) break; // 다음 최상위 키를 만나면 종료
      if (/^\s+-\s+org:/.test(line)) count++;
    }
  }
  return count;
}

// sources 항목 중 url 이 붙은 것의 개수(진짜 출처는 독자가 되짚어 갈 주소가 있어야 한다).
function countSourceUrls(front) {
  const lines = front.split('\n');
  let inSources = false;
  let count = 0;
  for (const line of lines) {
    if (/^sources:\s*$/.test(line)) { inSources = true; continue; }
    if (inSources) {
      if (/^\S/.test(line)) break;
      if (/^\s+url:\s*['"]?https?:\/\//.test(line)) count++;
    }
  }
  return count;
}

function gitShow(slug) {
  try {
    return execSync(`git show ${BASE_REF}:src/content/posts/${slug}.mdx`, {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8',
    });
  } catch {
    return null; // 원본이 없다(신규 글) → 물타기 비교는 생략
  }
}

// --- 한 편 점검 ----------------------------------------------------------
function check(slug) {
  const path = join(POSTS, `${slug}.mdx`);
  if (!existsSync(path)) {
    return { slug, ok: false, fails: [`파일 없음: ${path}`], warns: [], info: {} };
  }
  const raw = readFileSync(path, 'utf8');
  const { front, body } = splitFront(raw);

  const fails = [];
  const warns = [];

  const chars = koChars(body);
  const mins = readingMinutes(body);
  const sources = countSources(front);
  const sourceUrls = countSourceUrls(front);

  // ① 진짜 출처 — sources 배열이 비어 있으면 실패. url 없는 출처는 경고.
  if (sources === 0) {
    fails.push('sources 배열이 비어 있다 — 진짜 출처를 확인해 넣을 것(operations.md 「출처 표기」).');
  } else if (sourceUrls === 0) {
    warns.push(`sources ${sources}건에 확인 URL 이 하나도 없다 — 되짚어 갈 주소를 붙이는 편이 좋다.`);
  }

  // ② 끝맺음 교체 — 「오늘의 결론」이 남아 있으면 실패, 새 끝맺음이 없어도 실패.
  if (/오늘의 결론/.test(body)) {
    fails.push('「오늘의 결론」이 남아 있다 — 「실무에서 틀리기 쉬운 지점」(설명) 또는 「다음에 확인할 것」(데이터)으로 교체.');
  }
  const hasNewEnding = /실무에서 틀리기 쉬운 지점/.test(body) || /다음에 확인할 것/.test(body);
  if (!hasNewEnding) {
    fails.push('새 끝맺음(「실무에서 틀리기 쉬운 지점」/「다음에 확인할 것」)이 없다.');
  }

  // ③ 긴 대시(—) 금지 — 절대 규칙 #3(소유주 지시). 마침표·쉼표·콜론, 나열은 가운뎃점(·).
  const emDashes = (raw.match(/—/g) || []).length;
  if (emDashes > 0) {
    fails.push(`긴 대시(—) ${emDashes}개 — 절대 규칙 위반. 마침표·쉼표·콜론으로, 나열은 가운뎃점(·)으로.`);
  }

  // ④ 물타기 — git 원본 대비 분량은 늘었는데 출처가 그대로면 실패.
  const baseRaw = gitShow(slug);
  let baseChars = null;
  let baseSources = null;
  if (baseRaw) {
    const b = splitFront(baseRaw);
    baseChars = koChars(b.body);
    baseSources = countSources(b.front);
    // 물타기의 신호는 "큰 폭으로 늘었는데 새 출처가 없다"이다. 링크 한 줄·오탈자 같은
    // 소소한 손질(150자 이하 증가)까지 잡으면 이미 끝난 기사를 다시 못 만지므로 임계값을 둔다.
    // (출처가 아예 없는 경우는 위 ①에서 이미 실패 처리된다.)
    const MEANINGFUL_GROWTH = 150; // 3종 세트의 가장 작은 조각(진짜 출처 +80~150자)에 맞춘 선
    if (chars - baseChars > MEANINGFUL_GROWTH && sources <= baseSources) {
      fails.push(
        `물타기 의심 — 분량 ${baseChars}→${chars}자로 크게 늘었는데 sources 는 ${baseSources}→${sources}건(그대로). ` +
        '늘어난 분량에 검증된 숫자나 새 출처가 최소 하나 동반돼야 한다.'
      );
    }
  }

  // 분량 리포트(목표는 결과일 뿐 — 미달은 경고로만).
  if (chars < 1300) {
    warns.push(`분량 ${chars}자(${mins}분) — 목표(설명 1,800~2,200 / 데이터 1,300~1,800)에 못 미친다. ` +
      '분량을 채우려 하지 말고 새 사실이 충분한지 볼 것.');
  }

  // ⑤ 내부 연결(체류 시간) — 우리 기사/특집/토리 이야기로 가는 링크 수를 센다.
  const internalLinks = (body.match(/\]\((\/posts\/|\/story\/|\/topics\/)/g) || []).length;
  if (internalLinks === 0) {
    warns.push('내부 링크 0개 — 관련 우리 기사가 있으면 [핵심어](/posts/슬러그/)로 걸어 독자를 붙잡을 것(operations.md 「내부 연결 원칙」).');
  }

  // ⑤-1 죽은 내부 링크 — 링크 대상이 독자가 클릭하는 시점에 아직 발행 전이면 404가 된다.
  // 대상이 "이 기사보다 늦게" 뜨고 "오늘 기준으로도 아직" 안 떴을 때만 잡는다(과거의 공백은 무의미).
  const todayKST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const myPub = (front.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1];
  for (const m of body.matchAll(/\]\(\/posts\/([a-z0-9-]+)\/\)/g)) {
    const target = m[1];
    const tPath = join(POSTS, `${target}.mdx`);
    if (!existsSync(tPath)) {
      fails.push(`내부 링크 대상이 없다: /posts/${target}/ — 슬러그를 확인할 것.`);
      continue;
    }
    const tFront = splitFront(readFileSync(tPath, 'utf8')).front;
    const tPub = (tFront.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1];
    if (tPub && (!myPub || tPub > myPub) && tPub > todayKST) {
      fails.push(`죽은 내부 링크 — /posts/${target}/ 는 ${tPub}에 발행되는데 아직 발행 전이다(오늘 ${todayKST}). ` +
        '독자가 클릭하면 404다. 이미 발행된 기사로 링크하거나 대상 발행일을 앞당길 것.');
    }
  }

  // ⑥ 문단 길이(읽기 편함) — 줄글 문단이 한글 350자를 넘으면 쪼갤 것.
  const longParas = [];
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t) continue;
    // 표(|)·JSX(<)·소제목(#)·import·인용부호 블록은 문단 길이 대상에서 뺀다.
    if (/^[|<#]/.test(t) || /^import\s/.test(t)) continue;
    const c = koChars(t);
    if (c > 350) longParas.push({ c, head: t.replace(/\s+/g, ' ').slice(0, 24) });
  }
  for (const p of longParas) {
    warns.push(`문단이 ${p.c}자로 길다 ("${p.head}…") — 내용이 바뀌는 지점에서 문단을 나눌 것(빈 줄).`);
  }

  return {
    slug,
    ok: fails.length === 0,
    fails,
    warns,
    info: { chars, mins, sources, sourceUrls, baseChars, baseSources, internalLinks },
  };
}

// --- 큐에서 슬러그 뽑기(--all) -------------------------------------------
function queueSlugs() {
  const q = readFileSync(join(ROOT, 'docs/backfill-queue.md'), 'utf8');
  const slugs = [];
  for (const m of q.matchAll(/`([a-z0-9-]+)`/g)) {
    // 표에 등장하는 백틱 슬러그만. 문장 속 파일명 등은 대개 확장자가 붙어 걸러진다.
    if (!slugs.includes(m[1])) slugs.push(m[1]);
  }
  return slugs;
}

// --- 실행 ---------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('사용법: node scripts/check-quality.mjs <슬러그> [...]  |  --all');
  process.exit(2);
}

// --linkable: 오늘 기준 이미 발행된 기사만 추려 준다. 내부 링크는 여기서만 고른다.
if (args.includes('--linkable')) {
  const todayKST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const rows = [];
  for (const f of readdirSync(POSTS)) {
    if (!f.endsWith('.mdx')) continue;
    const { front } = splitFront(readFileSync(join(POSTS, f), 'utf8'));
    const pub = (front.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1];
    const draft = /^draft:\s*true/m.test(front);
    if (!pub || draft || pub > todayKST) continue;
    const title = (front.match(/^title:\s*'(.+?)'/m) || [])[1] ?? '';
    rows.push({ slug: f.slice(0, -4), pub, title });
  }
  rows.sort((a, b) => (a.pub < b.pub ? 1 : -1));
  console.log(`\n지금(${todayKST} KST) 링크 걸어도 되는 기사 ${rows.length}편 — 이 밖의 슬러그는 404가 된다.\n`);
  for (const r of rows) console.log(`  ${r.pub}  /posts/${r.slug}/  ${r.title.slice(0, 40)}`);
  console.log('');
  process.exit(0);
}

let slugs = args;
if (args.includes('--all')) {
  slugs = queueSlugs().filter((s) => existsSync(join(POSTS, `${s}.mdx`)));
}

let anyFail = false;
for (const slug of slugs) {
  const r = check(slug);
  const { info } = r;
  const head = r.ok ? '\x1b[32m통과\x1b[0m' : '\x1b[31m실패\x1b[0m';
  const size = info.chars != null
    ? ` ${info.chars}자·${info.mins}분·출처 ${info.sources}건·링크 ${info.internalLinks}개` +
      (info.baseChars != null ? ` (원본 ${info.baseChars}자·출처 ${info.baseSources}건)` : '')
    : '';
  console.log(`\n[${head}] ${slug}${size}`);
  for (const f of r.fails) console.log(`  ✗ ${f}`);
  for (const w of r.warns) console.log(`  △ ${w}`);
  if (!r.ok) anyFail = true;
}

console.log('');
process.exit(anyFail ? 1 : 0);
