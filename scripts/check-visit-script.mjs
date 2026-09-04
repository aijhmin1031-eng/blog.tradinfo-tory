#!/usr/bin/env node
/**
 * 방문 계측 스크립트가 「배포된 HTML 에서 실제로 실행되는지」 확인한다.
 *
 * 왜 필요한가 (2026-08-25~26 사고):
 *   Astro 의 <script> 안은 원시 텍스트다. 본문을 {`...`} 로 감싸 두었더니 중괄호가
 *   평가되지 않고 그대로 나갔고, 문법 오류도 없이 조용히 아무 일도 안 했다.
 *   빌드는 내내 통과했고 방문 기록은 하루 넘게 한 건도 쌓이지 않았다.
 *   **빌드 통과는 브라우저 실행을 보장하지 않는다.** 그래서 실제로 띄워서 확인한다.
 *
 * 쓰는 법:
 *   VERCEL=1 npm run build && node scripts/check-visit-script.mjs
 *   (VERCEL=1 이어야 정본 전용 스크립트가 dist 에 들어간다)
 *
 * 확인하는 것: ①사람 UA 로 페이지마다 기록되는가 ②쪽을 옮겨도 방문자값이 같은가
 *              ③방문자값 형식이 서버 검증(16진수 16자)을 통과하는가 ④봇 UA 는 안 보내는가
 *              ⑤체류 신호(mark_engaged)가 **사람일 때만** 가는가 (2026-09-04 추가)
 *                — 찍고 바로 나가면 안 가고, 만지거나 5초 넘게 보면 간다.
 *                이것이 UA 로 못 잡는 렌더러를 가르는 층이다.
 * Supabase 로는 아무것도 보내지 않는다 — 요청을 가로채서 확인만 한다(통계를 더럽히지 않는다).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = 8231;
const HOST = '127.0.0.1';
// location.hostname 이 localhost·127.0.0.1 이면 계측이 일부러 꺼진다(개발 중 집계 오염 방지).
// 그래서 브라우저에는 다른 이름으로 접속시키고, 그 이름만 로컬 서버로 돌린다.
const FAKE_HOST = 'check.dotoriecon.test';
const BASE = `http://${FAKE_HOST}:${PORT}`;

const HUMAN = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html 이 없다. 먼저 `VERCEL=1 npm run build` 를 돌릴 것.');
  process.exit(1);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', HOST], {
  cwd: 'dist',
  stdio: 'ignore',
});
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);

await new Promise((r) => setTimeout(r, 800));

async function visit(label, ua, opts = {}) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    // 가짜 호스트명을 로컬 서버로 돌린다(계측이 localhost 에서 꺼지므로).
    args: [`--host-resolver-rules=MAP ${FAKE_HOST} ${HOST}`],
  });
  const ctx = await browser.newContext({ userAgent: ua });
  // Playwright 는 navigator.webdriver 가 true 라 계측 첫 줄에서 걸린다. 사람처럼 보이게 한다.
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const calls = [];
  const engaged = [];
  await ctx.route('**/rest/v1/rpc/log_visit', (route) => {
    calls.push(JSON.parse(route.request().postData() || '{}'));
    route.fulfill({ status: 200, body: '' });
  });
  await ctx.route('**/rest/v1/rpc/mark_engaged', (route) => {
    engaged.push(JSON.parse(route.request().postData() || '{}'));
    route.fulfill({ status: 200, body: '' });
  });
  const page = await ctx.newPage();
  for (const path of opts.paths || ['/', '/forest/']) {
    await page.goto(BASE + path, { waitUntil: 'load' });
    if (opts.click) await page.mouse.click(5, 5);
    await page.waitForTimeout(opts.dwell ?? 900);
  }
  await browser.close();
  console.log(`[${label}] log_visit ${calls.length}건 ${calls.map((c) => c.p_path).join(' ')}`
    + ` · 체류 신호 ${engaged.length}건`);
  return { calls, engaged };
}

// ① 찍고 바로 나가는 방문 — 렌더러가 하는 짓이다. 기록은 남되 체류 신호는 없어야 한다.
const quick = await visit('사람 UA·찍고 나감', HUMAN);
// ② 화면을 만진 방문 — 5초를 기다릴 것 없이 그 자리에서 사람이다.
const clicked = await visit('사람 UA·클릭', HUMAN, { paths: ['/'], click: true, dwell: 700 });
// ③ 만지지 않았지만 오래 본 방문 — 5초를 넘기면 사람으로 본다.
const stayed = await visit('사람 UA·5초 체류', HUMAN, { paths: ['/'], dwell: 6000 });
const bot = await visit('구글봇 UA', BOT);
stop();

const human = quick.calls;

const checks = [
  ['두 쪽 모두 기록된다', human.length === 2],
  ['쪽을 옮겨도 방문자값이 같다', human.length === 2 && human[0].p_visitor === human[1].p_visitor],
  ['방문자값이 서버 검증 형식이다', human.length > 0 && human.every((c) => /^[0-9a-f]{16}$/.test(c.p_visitor))],
  ['경로가 서버 검증 형식이다', human.every((c) => /^\/([a-z0-9._-]+\/)*$/.test(c.p_path))],
  ['봇 UA 는 아예 보내지 않는다', bot.calls.length === 0],
  // ★ 여기부터가 2026-09-04 에 더한 층이다. 앞의 넷은 「기록이 되는가」만 보고,
  //    렌더러와 사람을 가르지 못했다(30일간 UA 로 걸린 봇이 1건뿐이었다).
  ['찍고 나가면 체류 신호가 없다', quick.engaged.length === 0],
  ['클릭하면 체류 신호가 간다', clicked.engaged.length === 1],
  ['5초 넘게 보면 체류 신호가 간다', stayed.engaged.length === 1],
  ['체류 신호의 경로·방문자값이 기록과 같다',
    clicked.engaged.length === 1 && clicked.calls.length === 1
    && clicked.engaged[0].p_path === clicked.calls[0].p_path
    && clicked.engaged[0].p_visitor === clicked.calls[0].p_visitor],
  ['체류 신호는 한 쪽당 한 번만 간다', stayed.engaged.length <= 1],
  ['봇 UA 는 체류 신호도 안 보낸다', bot.engaged.length === 0],
];

console.log('');
let failed = 0;
for (const [name, ok] of checks) {
  console.log(` ${ok ? '통과' : '실패'}  ${name}`);
  if (!ok) failed++;
}
console.log(failed ? `\n${failed}건 실패 — 계측이 돌지 않는다.` : '\n방문 계측이 실제로 실행된다.');
process.exit(failed ? 1 : 0);
