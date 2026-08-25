#!/usr/bin/env node
// 예약 기사 사전 점검 — 발행일 아침이 되기 전에 미리 터뜨려 본다.
//
// 왜 있나: 예약 기사(pubDate 가 오늘 이후)는 평소 빌드에서 제외되므로,
// 그 안의 결함은 **발행일 아침 06:50 빌드에서 처음 터진다.** 실제로 2026-08-25 에
// 9/24 발행 예정 기사에서 사전에 없는 <Term> 이 발견됐고, 그대로 뒀다면 그날 아침
// 빌드가 통째로 실패해 발행이 멈출 뻔했다(worklog 8/25 일지).
//
// check-quality.mjs 는 슬러그를 지정해 한 편씩 보는 게이트다. 이 스크립트는
// **예약분 전체를 한 번에** 훑어, 발행일까지 남은 시간에 고칠 수 있게 한다.
//
// 사용법:
//   node scripts/precheck-scheduled.mjs          # 예약 기사 전체
//   node scripts/precheck-scheduled.mjs --all    # 발행분까지 포함
// 종료코드 0=이상 없음, 1=치명(빌드 실패 유발) 항목 발견.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const GLOSSARY = join(ROOT, 'src/lib/glossary.ts');

const todayKST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const includeLive = process.argv.includes('--all');

const glossary = readFileSync(GLOSSARY, 'utf8');
const hasTerm = (t) => {
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s{2}['"]?${esc}['"]?:\\s*\\{`, 'm').test(glossary);
};

const splitFront = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { front: m[1], body: m[2] } : { front: '', body: raw };
};
const koChars = (s) => (s.match(/[가-힣]/g)?.length ?? 0);

// 치명(발행일 빌드를 실패시킨다) / 품질(발행은 되지만 기준 미달)
const fatal = { term: [], missingTarget: [] };
const warn = { dash: [], noSrc: [], noEnd: [], link0: [], deadLink: [] };

const files = readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
const pubOf = new Map();
for (const f of files) {
  const { front } = splitFront(readFileSync(join(POSTS, f), 'utf8'));
  pubOf.set(f.replace('.mdx', ''), (front.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) || [])[1]);
}

let n = 0;
for (const f of files) {
  const slug = f.replace('.mdx', '');
  const pub = pubOf.get(slug);
  if (!pub) continue;
  if (!includeLive && pub <= todayKST) continue;
  n++;

  const raw = readFileSync(join(POSTS, f), 'utf8');
  const { front, body } = splitFront(raw);

  // ① 치명: 사전에 없는 <Term> → Term.astro 가 예외를 던져 빌드가 통째로 죽는다
  for (const m of body.matchAll(/<Term\s+t="([^"]+)"/g)) {
    if (!hasTerm(m[1])) fatal.term.push(`${slug} → "${m[1]}"`);
  }
  // ① 치명: 존재하지 않는 기사로의 링크
  for (const m of body.matchAll(/\]\(\/posts\/([a-z0-9-]+)\/\)/g)) {
    if (!existsSync(join(POSTS, `${m[1]}.mdx`))) fatal.missingTarget.push(`${slug} → /posts/${m[1]}/`);
  }

  // ② 품질
  if (body.includes('—') || front.includes('—')) warn.dash.push(slug);
  if (!(front.match(/^\s+-\s+org:/gm) || []).length) warn.noSrc.push(slug);
  if (!/실무에서 틀리기 쉬운 지점|다음에 확인할 것/.test(body)) warn.noEnd.push(slug);

  const links = [...body.matchAll(/\]\(\/posts\/([a-z0-9-]+)\/\)/g)].map((m) => m[1]);
  if (!links.length) warn.link0.push(`${slug}(${koChars(body)}자)`);
  // 이 기사보다 늦게 발행되는 기사로의 링크 → 독자에게 404
  for (const t of links) {
    const tp = pubOf.get(t);
    if (tp && tp > pub) warn.deadLink.push(`${slug}(${pub}) → ${t}(${tp})`);
  }
}

const C = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', x: '\x1b[0m' };
const line = (ok, label, items) =>
  console.log(`${ok ? `${C.g}✓${C.x}` : `${C.r}✗${C.x}`} ${label}: ${items.length ? items.join(', ') : '없음'}`);

console.log(`\n예약 기사 ${n}편 사전 점검 (오늘 ${todayKST} KST)\n`);
console.log('[치명 — 그 기사 발행일 아침 빌드가 실패한다]');
line(!fatal.term.length, '사전에 없는 <Term>', fatal.term);
line(!fatal.missingTarget.length, '존재하지 않는 링크 대상', fatal.missingTarget);
console.log('\n[품질 — 발행은 되지만 기준 미달]');
line(!warn.dash.length, '긴 대시(—) 위반', warn.dash);
line(!warn.noSrc.length, '출처 없음', warn.noSrc);
line(!warn.noEnd.length, '끝맺음 없음', warn.noEnd);
line(!warn.link0.length, '내부 링크 0개', warn.link0);
line(!warn.deadLink.length, '죽은 링크(발행 순서 역전)', warn.deadLink);

const fatalN = fatal.term.length + fatal.missingTarget.length;
if (fatalN) {
  console.log(`\n${C.r}치명 ${fatalN}건. 발행일 전에 반드시 고칠 것.${C.x}\n`);
  process.exit(1);
}
const warnN = Object.values(warn).reduce((a, b) => a + b.length, 0);
console.log(warnN ? `\n${C.y}품질 ${warnN}건. 발행 전에 손볼 것.${C.x}\n` : `\n${C.g}이상 없음.${C.x}\n`);
