#!/usr/bin/env node
// 발행 전 검수 — **기사를 다르게 보이도록 해체해서 보여준다.**
//
// 왜 체크리스트가 아닌가(2026-08-29 사고): 「같은 0.50%p」의 지시 대상이 없는 결함이
// 게이트·감사·precheck 를 전부 통과하고 발행됐다. 수치·출처·표·링크가 다 있었기 때문이다.
// **쓴 사람과 검수하는 사람이 같은 눈이면 같은 것을 또 놓친다.** 체크리스트를 하나 더 주는 것으로는
// 안 되고, **본문을 그대로 다시 읽는 것으로도 안 된다**(방금 쓴 문장은 머릿속에서 자동으로 이어진다).
//
// 그래서 이 도구는 판단하지 않는다. **뼈대만 남기고 살을 발라** 사람이 다르게 보게 만든다.
//   ① 소제목만 — 이것만 읽어서 기사가 통하는가
//   ② 리드와 각 절의 첫 문장 — 논리가 이어지는가
//   ③ 지시어와 그 주변 — 「같은·이·그·위에서 본」이 가리킬 대상이 실제로 있는가
//   ④ 수치 등장 지도 — 같은 숫자가 다른 뜻으로 쓰이거나, 요약과 본문이 어긋나지 않는가
//   ⑤ 요약(three·description) 대 본문 — 카드에만 있고 본문에 없는 주장이 없는가
//
// 사용: node scripts/review.mjs <슬러그> [<슬러그> ...]   ·   npm run review <슬러그>
//
// ★ 일괄 판정 모드(`--scan`)를 만들었다가 걷어냈다(2026-08-29). 122편으로 실측했더니
//   두 규칙 다 헛불이 대부분이었다.
//     · 「거의 같은 기간을 다르게 부른다」(13개월 ≈ 1년) — **실제 결함은 base-rate-300 하나**였고
//       나머지는 전부 정상이었다. 「1년 만에 2.7배」는 **전년 동월 대비**로 정확히 1년이 맞고,
//       「13개월」은 **시계열 구간 길이**다. 서로 다른 것을 같다고 본 것은 규칙 쪽이었다.
//     · 「요약에만 있는 수치」 — 부호 차이(본문 -9.1% ↔ 요약 9.1%)와 마크업 분절로 헛불이 났다.
//   **헛불이 많은 경고는 늘 켜져 있어 아무도 안 보게 되고, 그러면 도구 전체가 무력해진다.**
//   판정은 걷어내고 **한 편씩 다르게 보여주는 것**만 남긴다. 판단은 사람이 한다.
//   (같은 자리를 다시 만들고 싶어지면 이 문단을 먼저 읽을 것.)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = { d: '\x1b[2m', b: '\x1b[1m', y: '\x1b[33m', c: '\x1b[36m', g: '\x1b[32m', x: '\x1b[0m' };

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.log('사용: node scripts/review.mjs <슬러그> [<슬러그> ...]');
  process.exit(1);
}

const strip = (t) => t.replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const firstSentence = (t) => {
  const s = strip(t).trim().split(/(?<=[.다]\s)|(?<=다\.)/)[0] ?? '';
  return s.replace(/\s+/g, ' ').trim().slice(0, 96);
};

for (const slug of slugs) {
  const ko = join(ROOT, 'src/content/posts', `${slug}.mdx`);
  const en = join(ROOT, 'src/content/posts-en', `${slug}.mdx`);
  const file = existsSync(ko) ? ko : en;
  if (!existsSync(file)) { console.log(`${C.y}${slug}: 파일 없음${C.x}`); continue; }
  const raw = readFileSync(file, 'utf8');
  const [, front, body] = raw.split(/^---$/m);

  const title = (front.match(/^title:\s*'(.*)'/m) ?? [])[1] ?? '';
  console.log(`\n${C.b}${'='.repeat(72)}${C.x}`);
  console.log(`${C.b}검수 · ${slug}${C.x}\n${C.d}${title}${C.x}`);
  console.log(`${C.b}${'='.repeat(72)}${C.x}`);

  // ① 소제목만
  const heads = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  console.log(`\n${C.c}① 소제목만 읽어 본다 — 이것만으로 기사가 통하는가${C.x}`);
  heads.forEach((h, i) => console.log(`   ${i + 1}. ${h}`));
  if (!heads.length) console.log(`   ${C.y}소제목이 없다${C.x}`);

  // ② 리드 + 각 절 첫 문장
  const blocks = body.split(/^##\s+.+$/m);
  console.log(`\n${C.c}② 리드와 각 절의 첫 문장 — 논리가 이어지는가${C.x}`);
  const lead = (blocks[0] ?? '').split(/\n\s*\n/).map((x) => x.trim())
    .find((x) => x && !/^(import\s|[<#|>])/.test(x) && !/^[-*]\s/.test(x)) ?? '';
  console.log(`   ${C.d}[리드]${C.x} ${firstSentence(lead)}`);
  heads.forEach((h, i) => {
    const seg = (blocks[i + 1] ?? '').split(/\n\s*\n/).map((x) => x.trim())
      .find((x) => x && !/^(import\s|[<#|>])/.test(x) && !/^[-*|]/.test(x)) ?? '';
    console.log(`   ${C.d}[${i + 1}]${C.x} ${firstSentence(seg)}`);
  });

  // ③ 지시어와 주변
  console.log(`\n${C.c}③ 지시어 — 가리킬 대상이 앞에 실제로 있는가 ${C.d}(눈으로 확인할 것)${C.x}`);
  const DEIXIS = /(같은|이런|그런|위에서 본|앞에서 본|앞서 본|이 수치|그 수치|이것이|그것이)\s*\S{0,14}/g;
  const found = [...body.matchAll(DEIXIS)];
  if (!found.length) console.log(`   ${C.d}없음${C.x}`);
  for (const m of found) {
    const around = strip(body.slice(Math.max(0, m.index - 34), m.index + m[0].length + 26)).replace(/\s+/g, ' ');
    console.log(`   · ${C.b}${m[0].trim()}${C.x}  ${C.d}…${around.trim()}…${C.x}`);
  }

  // ④ 수치 등장 지도
  console.log(`\n${C.c}④ 수치가 처음 나오는 자리 — 같은 숫자가 다른 뜻으로 쓰이지 않는가${C.x}`);
  const NUM = /-?\d[\d,]*\.?\d*\s*(%p|%|bp|원|달러|배|억|조|만|개월|년)/g;
  const firstAt = new Map();
  for (const m of body.matchAll(NUM)) {
    const k = m[0].replace(/\s+/g, '');
    if (!firstAt.has(k)) firstAt.set(k, m.index);
  }
  const secOf = (idx) => {
    let n = 0, at = 0;
    for (const m of body.matchAll(/^##\s+.+$/gm)) { if (m.index < idx) { n += 1; at = m.index; } }
    return n === 0 ? '리드' : `${n}절`;
  };
  // 절을 넘나드는 수치만 남긴다. 전부 나열하면 시끄러워서 아무도 안 본다 —
  // 정작 볼 것은 **같은 숫자가 여러 절에 나올 때 뜻이 같은가**이다.
  const where = new Map();
  for (const m of body.matchAll(NUM)) {
    const k = m[0].replace(/\s+/g, '');
    if (!where.has(k)) where.set(k, new Set());
    where.get(k).add(secOf(m.index));
  }
  const cross = [...where.entries()].filter(([, set]) => set.size > 1)
    .sort((a, b) => firstAt.get(a[0]) - firstAt.get(b[0]));
  if (!cross.length) console.log(`   ${C.d}절을 넘나드는 수치 없음${C.x}`);
  for (const [k, set] of cross) console.log(`   · ${C.b}${k}${C.x} ${C.d}${[...set].join(' → ')}${C.x}`);

  // ⑤ 요약 대 본문
  console.log(`\n${C.c}⑤ 요약에만 있고 본문에 없는 수치 — 카드가 본문보다 앞서 나가지 않는가${C.x}`);
  // `sources` 의 note 는 참고 수치(법령 조문·조회 구간)라 본문에 없는 것이 정상이다.
  // 독자가 카드로 읽는 자리(description·three)만 본다. 실제로 「소득세법 제129조」를
  // 129조(금액)로 읽는 헛불이 났다.
  const reader = (front.match(/^description:[\s\S]*?(?=^\w+:)/m) ?? [''])[0]
               + (front.match(/^three:[\s\S]*?(?=^\w+:)/m) ?? [''])[0];
  const bodyNums = new Set([...body.matchAll(NUM)].map((m) => m[0].replace(/[\s,]/g, '')));
  const frontNums = [...reader.matchAll(NUM)].map((m) => m[0].replace(/[\s,]/g, ''));
  const orphan = [...new Set(frontNums)].filter((n) => !bodyNums.has(n));
  console.log(orphan.length ? `   ${C.y}${orphan.join('  ')}${C.x}` : `   ${C.g}없음${C.x}`);

  console.log(`\n${C.d}판단은 사람이 한다. 이 출력은 다르게 보이게 할 뿐이다.${C.x}`);
}
