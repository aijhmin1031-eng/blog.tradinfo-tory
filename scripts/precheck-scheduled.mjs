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

// 시계열 최신값. 없으면 null(검사를 건너뛴다 — 자료가 없다고 기사를 의심하지는 않는다).
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

// 치명(발행일 빌드를 실패시킨다) / 품질(발행은 되지만 기준 미달)
const fatal = { term: [], missingTarget: [] };
const warn = { dash: [], noSrc: [], noEnd: [], link0: [], deadLink: [], stale: [] };

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

  // ② 품질 ★ 신선도 (2026-08-28 신설, 소유주 지시 「최신 데이터 기반이 부족하다」)
  //
  // 재고를 미리 쌓는 구조 자체가 최신성과 충돌한다. 실측했을 때 예약 41편의
  // dataAsOf→pubDate 지연이 **중앙값 19일·최대 37일**이었고, 그중 `base-rate-275` 는
  // 제목에 「기준금리 2.75%」를 달고 있는데 발행 나흘 전 기준금리가 3.00% 가 됐다.
  // **발행 시점에 이미 틀린 제목**이 자동으로 나갈 뻔했다.
  //
  // 그래서 「제목·세줄요약에 수치가 박혀 있는데 자료가 오래된」 예약 기사를 경고한다.
  // 자동으로 옳고 그름을 판정하지는 않는다 — 시장 수치는 늘 조금씩 움직이므로
  // 기계가 틀렸다고 단정하면 오탐이 쌓여 아무도 안 본다. **사람이 볼 목록을 좁혀 줄 뿐이다.**
  // basics(상식)는 제도·정의를 설명하므로 이 검사에서 뺀다.
  // ② 품질 ★ 「제목의 수치가 지금도 맞는가」 (2026-08-28 신설, 소유주 지시)
  //
  // ★ 두 번 헛짚고 세 번째에 맞췄다. 남겨 둘 값이 있는 실패다.
  //   1차: 「제목에 숫자가 있으면 경고」 → 예약분 5건 전부 오탐이었다.
  //        면세 한도 800달러·우대율 90%·보조금 527억 달러는 정책 상수·예시라 낡지 않는다.
  //   2차: 「자료가 21일 이상 묶었으면 경고」 → **실제 사고를 못 잡았다.**
  //        `base-rate-275` 는 지연이 9일뿐인데 그 9일 사이 기준금리가 2.75%→3.00% 로 바뀌어
  //        「기준금리 2.75%」라는 제목이 발행 시점에 이미 틀린 상태였다.
  //        **나이는 잘못된 신호다** — 짧은 지연에도 정책은 바뀐다.
  //   3차(지금): 제목·세줄요약의 수치를 **우리가 매일 수집하는 시계열의 현재값과 직접 대조**한다.
  //
  // 오탐을 줄이는 두 장치:
  //   · 차이가 2% 미만이면 정상 변동으로 보고 넘긴다(엔 876→869 는 0.8%).
  //   · 차이가 50% 이상이면 **같은 대상을 가리키는 수치가 아니다**(「환율의 90%」의 90 대 1,384).
  //   · 「3%대」처럼 «대» 가 붙은 것은 구간을 뜻하므로 대조하지 않는다.
  //   · **제목만 본다.** 세줄요약까지 넣으면 「945원에서 876원으로」의 945 같은
  //     **과거 비교 수치**가 걸린다. 그것은 낡은 게 아니라 원래 과거 값이다.
  //     제목은 독자에게 하는 약속이라, 거기 박힌 수치가 어긋나면 그것은 거짓이 된다.
  const SERIES_OF = [
    [/기준금리/, 'baserate'], [/국고채/, 'ktb10y'], [/미\s*국채/, 'us10y'],
    [/원\/달러|원달러/, 'usdkrw'], [/엔화|원\/100엔/, 'jpy100'],
    [/코스피|KOSPI/, 'kospi'], [/WTI|유가/, 'wti'],
    [/정기예금|예금\s*금리/, 'deposit1y'],
  ];
  const cat = (front.match(/^category:\s*(\w+)/m) || [])[1];
  const title = (front.match(/^title:\s*'(.+?)'\s*$/m) || [])[1] || '';
  if (cat && cat !== 'basics') {
    const head = title;
    for (const m of head.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|원|달러)(대)?/g)) {
      if (m[3]) continue; // 「3%대」 = 구간 표현
      const around = head.slice(Math.max(0, m.index - 22), m.index + m[0].length + 22);
      const hit = SERIES_OF.find(([re]) => re.test(around));
      if (!hit) continue;
      const cur = seriesLatest(hit[1]);
      if (cur == null) continue;
      const claimed = parseFloat(m[1].replace(/,/g, ''));
      const diff = Math.abs(claimed - cur) / cur;
      if (diff > 0.02 && diff < 0.5) {
        warn.stale.push(`${slug}(${pub}) «${m[0]}» 대 ${hit[1]} 현재 ${cur}`);
      }
    }
  }

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
line(!warn.stale.length, '제목의 수치가 현재값과 어긋남', warn.stale);

const fatalN = fatal.term.length + fatal.missingTarget.length;
if (fatalN) {
  console.log(`\n${C.r}치명 ${fatalN}건. 발행일 전에 반드시 고칠 것.${C.x}\n`);
  process.exit(1);
}
const warnN = Object.values(warn).reduce((a, b) => a + b.length, 0);
console.log(warnN ? `\n${C.y}품질 ${warnN}건. 발행 전에 손볼 것.${C.x}\n` : `\n${C.g}이상 없음.${C.x}\n`);
