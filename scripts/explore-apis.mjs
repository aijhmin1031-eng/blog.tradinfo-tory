#!/usr/bin/env node
// 일회성 탐색 2차 — 관세환율 API. 1차는 node fetch 가 네 번 다 `fetch failed`(연결 실패)였다.
// 그런데 `trade.mjs` 는 **같은 호스트**(apis.data.go.kr/1220000/)를 매일 정상 호출한다.
// 그래서 호스트가 아니라 다른 원인이다. curl 로 바꿔 DNS·TLS·HTTP 를 갈라 본다.
// 대조군으로 이미 되는 nitemtrade 도 같이 때려 본다(되는 것과 안 되는 것의 차이를 본다).
import { execFileSync } from 'node:child_process';

const KEY = process.env.DATA_GO_KR_KEY ?? '';
const ymd = (n) => { const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; };

function curl(url, label) {
  console.log(`\n── ${label}`);
  try {
    const out = execFileSync('curl', [
      '-sS', '--max-time', '30', '-o', '/tmp/resp.txt',
      '-w', 'HTTP %{http_code} · dns %{time_namelookup}s · connect %{time_connect}s · tls %{time_appconnect}s · total %{time_total}s · size %{size_download}',
      url,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(`   ${out}`);
    const body = execFileSync('cat', ['/tmp/resp.txt'], { encoding: 'utf8' });
    const code = (body.match(/<resultCode>([^<]*)</) || [])[1];
    const msg  = (body.match(/<resultMsg>([^<]*)</) || [])[1]
              || (body.match(/<returnAuthMsg>([^<]*)</) || [])[1]
              || (body.match(/<errMsg>([^<]*)</) || [])[1];
    if (code || msg) console.log(`   resultCode=${code ?? '-'} · msg=${msg ?? '-'}`);
    const items = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    console.log(`   item 수: ${items.length}`);
    for (const it of items.slice(0, 8)) {
      const g = (k) => (it[1].match(new RegExp(`<${k}>([^<]*)<`)) || [])[1] ?? '';
      if (g('currSgn')) console.log(`     ${g('currSgn').padEnd(4)} ${g('mtryUtNm').padEnd(24)} ${g('fxrt').padStart(12)}  적용 ${g('aplyBgnDt')}`);
    }
    const usd = items.map((i) => i[1]).find((x) => /<currSgn>USD</.test(x));
    if (usd) console.log(`   ★ USD 과세환율 ${(usd.match(/<fxrt>([^<]*)</) || [])[1]}`);
    if (!items.length) console.log(`   원문: ${body.replace(/\s+/g, ' ').slice(0, 300)}`);
    return items.length;
  } catch (e) {
    console.log(`   curl 실패: ${String(e.stderr || e.message).slice(0, 200)}`);
    return 0;
  }
}

console.log('='.repeat(70));
console.log('관세청 API 탐색 2차 — curl 로 DNS·TLS·HTTP 를 갈라 본다');
console.log('='.repeat(70));

// 대조군: 이미 매일 정상 동작하는 호출
curl(`https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList?serviceKey=${KEY}&strtYymm=202607&endYymm=202607&hsSgn=8542`,
     '대조군 · 품목별 수출입실적 (매일 정상 동작하는 것)');

// 본명제: 관세환율
for (const back of [0, 2, 5]) {
  const n = curl(`https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo?serviceKey=${KEY}&aplyBgnDt=${ymd(back)}&weekFxrtTpcd=2`,
                 `관세환율 · aplyBgnDt=${ymd(back)} · 수입`);
  if (n) break;
}
// http (비TLS) 로도 한 번
curl(`http://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo?serviceKey=${KEY}&aplyBgnDt=${ymd(2)}&weekFxrtTpcd=2`,
     '관세환율 · http (비TLS) 로 재시도');

console.log('\n탐색 완료');
