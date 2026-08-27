#!/usr/bin/env node
// 물타기 게이트 — 설명 기사 보강(미결 15번, docs/backfill-queue.md)의 통과 기준을 기계로 점검한다.
//
// 왜 있나: "2배로 늘리자"를 목표로 삼으면 같은 말을 다시 쓰고 배경 설명을 부풀리게 된다.
// 얇은 기사보다 나쁜 것이 부풀린 기사다. 그래서 보강 커밋 전에 이 스크립트가
// "분량만 늘고 새 사실·새 출처가 없는가"를 git 원본과 대 보고 막는다.
// 기준 원문은 docs/operations.md 「통과 기준(물타기 게이트)」 절.
//
// 2026-08-26 추가 — 인용 가능성 3종(소유주 지시): 두괄식 리드 · 수치형 핵심 소제목 · 표.
//   남이 우리를 인용하려면 들어 올릴 수 있는 한 문장이 있어야 한다. 구글 스니펫과 LLM 은
//   요약 카드(ThreeLines)가 아니라 본문 첫 문단과 소제목을 집어 간다.
//   **신규 기사는 실패, 기존 기사는 경고**다(이유는 아래 해당 절 주석).
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
// 영문판(/en/) — 2026-08-26. 별도 컬렉션이라 디렉토리도 따로다.
// **게이트가 영문을 못 보면 영문은 규칙 밖에 놓인다.** 그 구멍을 열어 두지 않는다.
const POSTS_EN = join(ROOT, 'src/content/posts-en');
const dirOf = (slug) => (existsSync(join(POSTS_EN, `${slug}.mdx`)) ? POSTS_EN : POSTS);
const isEnSlug = (slug) => existsSync(join(POSTS_EN, `${slug}.mdx`));
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

function gitShow(slug, sub = 'src/content/posts') {
  try {
    return execSync(`git show ${BASE_REF}:${sub}/${slug}.mdx`, {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8',
    });
  } catch {
    return null; // 원본이 없다(신규 글) → 물타기 비교는 생략
  }
}

// --- 한 편 점검 ----------------------------------------------------------
function check(slug) {
  const isEn = isEnSlug(slug);
  const path = join(dirOf(slug), `${slug}.mdx`);
  if (!existsSync(path)) {
    return { slug, ok: false, fails: [`파일 없음: ${path}`], warns: [], info: {} };
  }
  const raw = readFileSync(path, 'utf8');
  const { front, body } = splitFront(raw);

  const fails = [];
  const warns = [];

  // 영문 기사에 koChars 를 쓰면 **항상 0자**가 되어 분량·물타기 검사가 통째로 무력화된다.
  // 영어는 단어수로 세고, 한글 1,500자 내외에 해당하는 분량을 단어로 환산해 기준을 잡는다
  // (한글 500자/분 · 영어 220단어/분 → 1,500자 ≈ 3분 ≈ 660단어).
  const enWords = (b) => (b.replace(/<[^>]+>/g, ' ').match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length;
  const chars = isEn ? enWords(body) : koChars(body);
  const mins = isEn ? Math.max(1, Math.round(chars / 220)) : readingMinutes(body);
  const unit = isEn ? '단어' : '자';
  const THIN = isEn ? 570 : 1300; // 기준(660단어 / 1,500자)의 약 87%
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
  const hasNewEnding = isEn
    ? /## What to watch|## Where this goes wrong in practice/.test(body)
    : /실무에서 틀리기 쉬운 지점/.test(body) || /다음에 확인할 것/.test(body);
  if (!hasNewEnding) {
    fails.push(isEn
      ? '끝맺음이 없다 — 「## What to watch」(데이터) 또는 「## Where this goes wrong in practice」(설명)로 끝낼 것.'
      : '새 끝맺음(「실무에서 틀리기 쉬운 지점」/「다음에 확인할 것」)이 없다.');
  }

  // ③ 긴 대시(—) 금지 — 절대 규칙 #3(소유주 지시). 마침표·쉼표·콜론, 나열은 가운뎃점(·).
  // 절대 규칙 3(긴 대시 금지)은 **한글 조판 규칙**이다. 영어에서 em dash 는 정상 문장부호이고,
  // 금지하면 영문 기사가 전부 실패한다. 그래서 영문에는 걸지 않는다.
  const emDashes = isEn ? 0 : (raw.match(/—/g) || []).length;
  if (emDashes > 0) {
    fails.push(`긴 대시(—) ${emDashes}개 — 절대 규칙 위반. 마침표·쉼표·콜론으로, 나열은 가운뎃점(·)으로.`);
  }

  // ④ 물타기 — git 원본 대비 분량은 늘었는데 출처가 그대로면 실패.
  const baseRaw = gitShow(slug, isEn ? 'src/content/posts-en' : 'src/content/posts');
  let baseChars = null;
  let baseSources = null;
  if (baseRaw) {
    const b = splitFront(baseRaw);
    baseChars = isEn ? enWords(b.body) : koChars(b.body); // 영문에 koChars 를 쓰면 0이 나와 물타기 판정이 거짓양성이 된다
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
  // 기준은 1,500자 내외(소유주 지시 2026-08-25). 하한선이 아니라 기준점이므로 경고만 낸다.
  // 채우려고 문장을 붙이는 것이 미달보다 나쁘다.
  if (chars < THIN) {
    warns.push(`분량 ${chars}${unit}(${mins}분) — 기준 ${isEn ? '660단어' : '1,500자'} 내외보다 짧다. ` +
      '분량을 채우려 하지 말고 새 사실이 충분한지만 볼 것(부족하면 소재를 더 찾는다).');
  }

  // ⑤ 내부 연결(체류 시간) — 우리 기사/특집/토리 이야기로 가는 링크 수를 센다.
  const internalLinks = isEn
    ? (body.match(/\]\(\/en\//g) || []).length
    : (body.match(/\]\((\/posts\/|\/story\/|\/topics\/)/g) || []).length;
  if (internalLinks === 0) {
    warns.push('내부 링크 0개 — 관련 우리 기사가 있으면 [핵심어](/posts/슬러그/)로 걸어 독자를 붙잡을 것(operations.md 「내부 연결 원칙」).');
  }

  // ⑤-1 죽은 내부 링크 — 링크 대상이 독자가 클릭하는 시점에 아직 발행 전이면 404가 된다.
  // 대상이 "이 기사보다 늦게" 뜨고 "오늘 기준으로도 아직" 안 떴을 때만 잡는다(과거의 공백은 무의미).
  const todayKST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const myPub = (front.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1];
  // 영문판도 같은 검사를 받아야 한다(2026-08-26). 영문 기사끼리 링크하는데 상대가 예약분이면
  // 그 링크는 발행일까지 404 다 — 6편을 한꺼번에 낼 때 실제로 걸릴 수 있었다.
  for (const m of isEn
    ? body.matchAll(/\]\(\/en\/posts\/([a-z0-9-]+)\/\)/g)
    : body.matchAll(/\]\(\/posts\/([a-z0-9-]+)\/\)/g)) {
    const target = m[1];
    const tPath = join(isEn ? POSTS_EN : POSTS, `${target}.mdx`);
    const shown = isEn ? `/en/posts/${target}/` : `/posts/${target}/`;
    if (!existsSync(tPath)) {
      fails.push(`내부 링크 대상이 없다: ${shown} — 슬러그를 확인할 것.`);
      continue;
    }
    const tFront = splitFront(readFileSync(tPath, 'utf8')).front;
    const tPub = (tFront.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1];
    if (tPub && (!myPub || tPub > myPub) && tPub > todayKST) {
      fails.push(`죽은 내부 링크 — ${shown} 는 ${tPub}에 발행되는데 아직 발행 전이다(오늘 ${todayKST}). ` +
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
    const c = isEn ? enWords(t) : koChars(t);
    if (c > (isEn ? 155 : 350)) longParas.push({ c, head: t.replace(/\s+/g, ' ').slice(0, 24) });
  }
  for (const p of longParas) {
    warns.push(`문단이 ${p.c}${unit}로 길다 ("${p.head}…") — 내용이 바뀌는 지점에서 문단을 나눌 것(빈 줄).`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 인용 가능성 3종 (2026-08-26 소유주 지시 — 두괄식·수치형 소제목·표)
  //
  // 왜 게이트에 넣나: 우리 병목은 품질이 아니라 노출이다(docs/traffic.md).
  // 남이 우리를 인용하려면 **들어 올릴 수 있는 한 문장**이 있어야 하고,
  // 구글 스니펫·LLM 은 요약 카드가 아니라 **본문 첫 문단과 소제목**을 집어 간다.
  // 실측(2026-08-26): 리드에 수치 36% · 수치형 소제목 7% · 표 0편이 33편.
  //
  // 왜 신규만 실패인가: 기존 107편을 한꺼번에 빨갛게 켜면 빨간불이 상시가 되고,
  // 상시가 된 경고는 안 보게 된다(audit.mjs 의 --fail-on 주석과 같은 이유).
  // 기존분은 audit 이 우선순위를 매겨 감사 일과가 순서대로 처리한다.
  const isNew = baseRaw === null;
  const level = (m) => (isNew ? fails : warns).push(m);

  // 숫자 중 「내용이 아닌 것」을 뺀다: 연도·HS 코드·제목에 든 숫자(버전명·주제어).
  // audit.mjs 의 isNoise 와 같은 규칙 — 인코텀즈 2020, HS 8542 를 발견 수치로 세면 안 된다.
  const myTitle = (front.match(/^title:\s*'(.*)'/m) || [])[1] ?? '';
  const realNums = (t) =>
    (t.match(/-?\d[\d,]*\.?\d*/g) || [])
      .map((n) => n.replace(/,/g, ''))
      .filter((n) => !/^(19|20)\d{2}$/.test(n) && !/^8\d{3}$/.test(n) && !myTitle.replace(/,/g, '').includes(n));

  // 본문의 첫 「산문」 문단 — import·JSX·소제목·표·목록은 건너뛴다.
  let leadPara = '';
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || /^(import\s|[<#|>])/.test(t) || /^[-*]\s/.test(t)) continue;
    leadPara = t.replace(/<[^>]+>/g, '');
    break;
  }

  // ⑦ 두괄식 리드 — 첫 문단이 이 기사의 결론 수치로 열려야 한다.
  if (!leadPara) {
    level('본문에 산문 리드 문단이 없다 — 첫 문단은 결론 수치를 담은 줄글로 연다.');
  } else if (realNums(leadPara).length === 0) {
    level(
      `두괄식 아님 — 첫 문단에 결론 수치가 없다 ("${leadPara.replace(/\s+/g, ' ').slice(0, 28)}…"). ` +
      '독자는 요약 카드를 보지만 검색엔진·LLM 은 첫 문단을 집어 간다. 결론을 먼저 쓸 것.'
    );
  } else {
    // 수치가 있어도 기준시점이 없으면 인용해 갈 수가 없다(언제 숫자인지 모르므로).
    const hasWhen = /^dataAsOf:/m.test(front) || /\d{4}년|\d{1,2}월|분기|기준/.test(leadPara);
    if (!hasWhen) {
      warns.push('리드에 수치는 있으나 기준시점이 없다 — dataAsOf 를 넣거나 첫 문단에 「2026년 7월 기준」처럼 시점을 적을 것.');
    }
  }

  // ⑧ 핵심 발견 소제목은 수치형 — 소제목 전체를 바꾸라는 뜻이 아니다.
  // 발견을 담은 소제목 **하나**에 숫자를 넣는다(소유주 결정 2026-08-26).
  const h2s = body.match(/^##\s+.+$/gm) || [];
  if (h2s.length === 0) {
    warns.push('소제목(##)이 없다 — 독자가 어디쯤인지 알 수 없다(operations.md 「흐름」).');
  } else if (!h2s.some((h) => realNums(h).length > 0)) {
    level(
      `핵심 발견 소제목이 수치형이 아니다 — 소제목 ${h2s.length}개 중 숫자를 담은 것이 하나도 없다. ` +
      '발견을 담은 소제목 하나만 「홍콩, 수출 43.7억 대 수입 0.3억」처럼 수치형으로 바꿀 것(나머지는 지금 톤 유지).'
    );
  }

  // ⑨ 표 — 비교 축이 둘 이상인 표가 최소 하나. 장식용 2행 표는 만들지 않는다.
  // 단위 사전에 **영문판 단위**가 없어 「$3.78bn」짜리 표가 「단위 없음」으로 걸렸다(2026-08-26 수리).
  const UNIT = /%|％|달러|원|억|조|배|bp|포인트|톤|TEU|CBM|배럴|온스|R²|건|명|kg|KG|만|\$|\bbn\b|per cent|\bpp\b/;
  const tables = [];
  {
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*\|.*\|\s*$/.test(lines[i])) continue;
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) continue;
      const cols = lines[i].split('|').filter((c) => c.trim()).length;
      let r = i + 2;
      while (/^\s*\|.*\|\s*$/.test(lines[r] ?? '')) r++;
      tables.push({ cols, rows: r - i - 2, text: lines.slice(i, r).join('\n') });
      i = r;
    }
  }
  if (tables.length === 0) {
    level('표가 없다 — 세 항목 이상의 나열·대조는 줄글이 아니라 표로(operations.md 「문단·줄바꿈 원칙」). 인용도 표에서 나온다.');
  } else {
    for (const t of tables) {
      if (t.cols < 2 || t.rows < 2) {
        warns.push(`장식용 표 의심 — ${t.cols}열 ${t.rows}행. 비교 축이 둘 이상일 때만 표로 만들 것(아니면 줄글이 낫다).`);
      } else if (realNums(t.text).length && !UNIT.test(t.text)) {
        // 숫자가 든 표에만 묻는다. 개념을 대조하는 표(FOB 대 CIF 같은)에 단위는 없는 것이 맞다.
        warns.push('표에 단위가 없다 — 「43.7억 달러」처럼 단위를 붙여야 그 표만 떼어 인용할 수 있다.');
      }
    }
  }

  return {
    slug,
    ok: fails.length === 0,
    fails,
    warns,
    info: { chars, mins, unit, sources, sourceUrls, baseChars, baseSources, internalLinks, isNew, isEn, tables: tables.length, h2: h2s.length },
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
// ── --html: 산출 HTML 에서 화면에 나가는 긴 대시를 잡는다 (2026-08-27 신설) ──────
// 절대 규칙 3(긴 대시 금지)은 **기사 본문에만** 걸려 있었다. 그래서 조판 파일(.astro)의
// UI 문구로 두 번 새어 나갔다 — 그림함 낱장 118쪽의 「없음 — 투명 PNG」와 소개 페이지 한 줄.
// 소스를 훑으면 주석의 대시까지 걸려 거짓양성이 쏟아진다. **독자가 실제로 보는 것**을 보는 편이
// 정확하다: 빌드 산출물에서 script·style·태그를 걷어내고 남은 글에만 묻는다.
// 영문판(/en/)은 em dash 가 정상 문장부호이므로 제외한다(english-edition.md 3절).
if (args.includes('--html')) {
  const DIST = join(ROOT, 'dist');
  if (!existsSync(DIST)) {
    console.error('dist 가 없다. `npm run build` 뒤에 실행할 것.');
    process.exit(2);
  }
  const walk = (dir) => {
    const out = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(full));
      else if (e.name.endsWith('.html')) out.push(full);
    }
    return out;
  };
  const hits = [];
  for (const f of walk(DIST)) {
    const rel = f.slice(DIST.length + 1);
    if (rel.startsWith('en/')) continue;
    const text = readFileSync(f, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]*>/g, ' ');
    const n = (text.match(/—/g) || []).length;
    if (n) hits.push({ rel, n });
  }
  if (hits.length === 0) {
    console.log('\x1b[32m통과\x1b[0m 화면에 나가는 긴 대시 없음 (영문판 제외)');
    process.exit(0);
  }
  console.log(`\x1b[31m실패\x1b[0m 긴 대시가 화면에 나간다 — ${hits.length}쪽`);
  for (const h of hits.slice(0, 12)) console.log(`  ✗ ${h.rel} (${h.n}곳)`);
  if (hits.length > 12) console.log(`  … 그 밖 ${hits.length - 12}쪽`);
  console.log('  제목은 말줄임표, 본문은 마침표·쉼표·콜론, 나열은 가운뎃점으로 바꿀 것(절대 규칙 3).');
  process.exit(1);
}

if (args.includes('--all')) {
  // 큐(한글 보강 대상) + **영문 전량**. 큐는 한글 기사 목록이라 영문은 영원히 검사
  // 대상에 들어오지 않았다 — CI 의 「품질 점검」이 영문을 한 편도 안 보고 있었다(2026-08-26 수리).
  // 영문은 편수가 적고 새 판이므로 매번 전수로 본다.
  const en = readdirSync(POSTS_EN)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.slice(0, -4));
  slugs = [...queueSlugs().filter((s) => existsSync(join(POSTS, `${s}.mdx`))), ...en];
}

let anyFail = false;
for (const slug of slugs) {
  const r = check(slug);
  const { info } = r;
  const head = r.ok ? '\x1b[32m통과\x1b[0m' : '\x1b[31m실패\x1b[0m';
  const size = info.chars != null
    ? ` ${info.chars}${info.unit}·${info.mins}분·출처 ${info.sources}건·링크 ${info.internalLinks}개·표 ${info.tables}개` +
      (info.isNew ? ' \x1b[33m[신규]\x1b[0m' : '') +
      (info.baseChars != null ? ` (원본 ${info.baseChars}${info.unit}·출처 ${info.baseSources}건)` : '')
    : '';
  console.log(`\n[${head}] ${slug}${size}`);
  for (const f of r.fails) console.log(`  ✗ ${f}`);
  for (const w of r.warns) console.log(`  △ ${w}`);
  if (!r.ok) anyFail = true;
}

console.log('');
process.exit(anyFail ? 1 : 0);
