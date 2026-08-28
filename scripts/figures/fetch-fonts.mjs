/**
 * 히어로 차트를 구우려면 한글 웹폰트가 로컬에 있어야 한다.
 *
 * 사이트는 폰트를 Google Fonts 에서 원격으로 받는데(Base.astro), 이 원격
 * 컨테이너에서는 브라우저의 외부 요청이 프록시에 막힌다. 그대로 구우면
 * **글자가 두부(□)로 나오면서도 «성공»으로 끝난다** — render-hero.mjs 가
 * 그것을 막고 있지만, 애초에 폰트를 깔아 두는 것이 이 스크립트다.
 *
 * ★ node fetch 는 이 컨테이너에서 막힌다(CLAUDE.md). 그래서 curl 로 받는다.
 * ★ 폰트 파일은 저장소에 커밋하지 않는다(6MB, 라이선스 사본 관리 부담).
 *   대신 이 스크립트가 언제든 다시 만든다. 30초쯤 걸린다.
 *
 * 사용: node scripts/figures/fetch-fonts.mjs <받을디렉토리>
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('사용: fetch-fonts.mjs <디렉토리>'); process.exit(1); }
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Hahmlet:wght@500;700;900&family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap';

mkdirSync(join(dir, 'w2'), { recursive: true });
const curl = (url) => execFileSync('curl', ['-s', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 });

if (existsSync(join(dir, 'local.css')) && readdirSync(join(dir, 'w2')).length > 300) {
  console.log('이미 받아 둔 폰트가 있다. 건너뛴다.');
  process.exit(0);
}

console.log('폰트 CSS 를 받는다…');
let css = curl(CSS_URL).toString('utf8');
// 한글은 유니코드 구간별로 잘게 쪼개져 온다(파일 수백 개). unicode-range 가 붙어
// 있으므로 브라우저가 필요한 조각만 읽는다 — 전부 받아도 실제 로드는 몇 개뿐이다.
const urls = [...new Set([...css.matchAll(/https:\/\/fonts\.gstatic\.com[^)]*/g)].map((m) => m[0]))];
console.log(`woff2 조각 ${urls.length}개를 받는다…`);
urls.forEach((u, i) => {
  const name = `s${String(i + 1).padStart(3, '0')}.woff2`;
  writeFileSync(join(dir, 'w2', name), curl(u));
  css = css.split(u).join('w2/' + name);
  if ((i + 1) % 60 === 0) console.log(`  ${i + 1}/${urls.length}`);
});
writeFileSync(join(dir, 'local.css'), css);
const left = (css.match(/fonts\.gstatic/g) ?? []).length;
if (left) { console.error(`✗ 원격 참조가 ${left}개 남았다`); process.exit(1); }
console.log(`완료 — ${dir}/local.css (원격 참조 0)`);
