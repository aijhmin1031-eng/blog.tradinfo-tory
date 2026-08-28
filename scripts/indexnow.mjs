#!/usr/bin/env node
// IndexNow 제출 — 크롤러가 오기를 기다리지 않고 「바뀌었다」고 먼저 알린다.
//
// 왜 만들었나 (2026-08-26):
//   도메인을 8/24에 취득했더니 `site:dotoriecon.com` 결과가 0건이었다. 색인이 안 되면
//   검색으로 들어올 경로가 물리적으로 없다. 그런데 **구글은 색인 요청을 API로 열어 두지 않는다**
//   (URL Inspection API 는 상태 조회 전용, Indexing API 는 JobPosting·BroadcastEvent 전용).
//   구글 쪽은 사람이 Search Console 버튼을 눌러야 한다.
//
//   반면 **네이버·Bing·Yandex 는 IndexNow 프로토콜을 받는다**(네이버는 2023년 7월부터).
//   한국 검색 트래픽에서 네이버 몫이 크므로, 자동화되는 이쪽 절반이라도 먼저 확실히 한다.
//
// 인증 방식:
//   비밀키가 아니다. `public/<key>.txt` 를 사이트에 공개해 두고 그 키를 함께 보내면,
//   검색엔진이 그 파일을 읽어 「이 도메인의 주인이 맞다」를 확인한다.
//   그래서 이 키는 커밋해도 되고, 커밋해야만 동작한다.
//
// 사용법:
//   node scripts/indexnow.mjs            # 오늘 KST 기준 새로 발행된 기사만
//   node scripts/indexnow.mjs --all      # 사이트맵 전체 (최초 1회 씨뿌리기용)
//   node scripts/indexnow.mjs --dry      # 보내지 않고 목록만 출력
//   node scripts/indexnow.mjs <url> ...  # 지정한 주소만
//
// 주의: 이 컨테이너에서는 node fetch 가 프록시에 막힌다(503/000). 로컬 확인은 --dry 로 하고,
//       실제 제출은 CI 에서 돈다. 로컬에서 굳이 보내야 하면 --print-curl 로 명령을 뽑아 쓴다.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const POSTS_EN = join(ROOT, 'src/content/posts-en');
const PUBLIC = join(ROOT, 'public');
const HOST = 'dotoriecon.com';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const explicit = args.filter((a) => a.startsWith('http'));
const todayKST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
// 영문도 한글과 같은 한국시간 기준이다(같은 아침에 함께 발행하므로).

// 키는 public/ 의 <32자 16진수>.txt 하나로 정한다. 파일이 곧 소유 증명이다.
const keyFile = readdirSync(PUBLIC).find((f) => /^[0-9a-f]{8,128}\.txt$/.test(f));
if (!keyFile) {
  console.error('✗ public/ 에 IndexNow 키 파일이 없다. <32자 16진수>.txt 를 만들고 그 안에 같은 값을 넣을 것.');
  process.exit(1);
}
const key = keyFile.replace('.txt', '');
const inside = readFileSync(join(PUBLIC, keyFile), 'utf8').trim();
if (inside !== key) {
  console.error(`✗ 키 파일 이름과 내용이 다르다. 파일명 ${key}, 내용 ${inside.slice(0, 12)}…`);
  console.error('  검색엔진이 이 파일을 읽어 소유를 확인하므로 둘이 같아야 한다.');
  process.exit(1);
}

// 발행된 기사 URL (예약분은 아직 페이지가 없으므로 넣으면 404 를 보고하는 셈이 된다)
const publishedPosts = (onlyToday) =>
  readdirSync(POSTS)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const raw = readFileSync(join(POSTS, f), 'utf8');
      const pub = (raw.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) ?? [])[1] ?? '';
      return { slug: f.slice(0, -4), pub };
    })
    .filter((p) => p.pub && p.pub <= todayKST && (!onlyToday || p.pub === todayKST))
    .map((p) => `${ORIGIN}/posts/${p.slug}/`);

// 영문 기사도 같이 제출한다 (2026-08-28 신설). 그전에는 한글만 나가서
// **영문 6편이 개설 이래 한 번도 IndexNow 로 알려진 적이 없었다.**
// 미국 독자를 노린다면 이쪽이 오히려 중요하다 — 지금까지 잡힌 유일한 검색 유입이 bing.com 이다.
const publishedPostsEn = (onlyToday) =>
  readdirSync(POSTS_EN)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const raw = readFileSync(join(POSTS_EN, f), 'utf8');
      const pub = (raw.match(/^pubDate:\s*'?(\d{4}-\d{2}-\d{2})/m) ?? [])[1] ?? '';
      return { slug: f.slice(0, -4), pub };
    })
    .filter((p) => p.pub && p.pub <= todayKST && (!onlyToday || p.pub === todayKST))
    .map((p) => `${ORIGIN}/en/posts/${p.slug}/`);

// 전체 씨뿌리기는 사이트맵을 그대로 쓴다. 허브·용어 낱장까지 한 번에 알린다.
const fromSitemap = () => {
  const sm = join(ROOT, 'dist/sitemap-0.xml');
  if (!existsSync(sm)) {
    console.error('✗ dist/sitemap-0.xml 이 없다. 먼저 npm run build 를 돌릴 것.');
    process.exit(1);
  }
  return [...readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    // 빌드가 GitHub Pages 주소로 나왔더라도 제출은 정본 도메인으로 한다.
    .map((u) => u.replace(/^https?:\/\/[^/]+(\/blog\.tradinfo-tory)?/, ORIGIN));
};

let urls = explicit.length
  ? explicit
  : flag('--all')
    ? fromSitemap()
    : [...publishedPosts(true), ...publishedPostsEn(true)];
urls = [...new Set(urls)].filter((u) => u.startsWith(ORIGIN));

if (!urls.length) {
  console.log(`오늘(${todayKST}) 새로 발행된 기사가 없다. 보낼 것 없음.`);
  process.exit(0);
}

const body = { host: HOST, key, keyLocation: `${ORIGIN}/${keyFile}`, urlList: urls };

console.log(`IndexNow · ${todayKST} KST · ${urls.length}건`);
for (const u of urls) console.log('  ' + u);

if (flag('--print-curl')) {
  console.log(`\ncurl -sS -X POST '${ENDPOINT}' -H 'Content-Type: application/json' -d '${JSON.stringify(body)}'`);
  process.exit(0);
}
if (flag('--dry')) {
  console.log('\n--dry 이므로 보내지 않았다.');
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

// 200/202 가 정상이다. 202 는 「받았고 키를 확인하는 중」이라는 뜻.
const text = await res.text().catch(() => '');
console.log(`\nHTTP ${res.status}${text ? ' · ' + text.slice(0, 200) : ''}`);
if (res.status === 200 || res.status === 202) {
  console.log('✓ 제출 완료 (네이버·Bing·Yandex 가 같은 제출을 나눠 받는다. 구글은 참여하지 않는다)');
} else {
  // 색인 알림이 실패했다고 배포를 실패시키지는 않는다. 기사 발행이 우선이다.
  console.error('✗ 제출 실패. 흔한 원인: 키 파일이 아직 배포 안 됨(422), 너무 잦은 제출(429)');
  process.exit(1);
}
