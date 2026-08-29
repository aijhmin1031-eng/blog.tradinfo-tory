#!/usr/bin/env node
// 일회성 탐색 — 관세청 관세환율(과세환율) API 가 우리 DATA_GO_KR_KEY 로 되는가.
// 확인 뒤 이 파일과 워크플로는 제거한다(8/28 과 같은 절차).
//
// 왜: `/import-cost/` 계산기가 지금 **시장 환율**을 기본값으로 쓴다. 실제 수입신고에는
// 관세청이 주간으로 정하는 **과세환율**이 적용되므로 지금은 「다를 수 있으니 확인하라」는
// 단서를 달아 두었다. 이 API 가 되면 그 단서가 사라지고 통화 선택까지 가능해진다.
const KEY = process.env.DATA_GO_KR_KEY;
const BASE = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
const line = (s) => console.log(s);

const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const days = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };

async function probe(dt, tp) {
  const url = `${BASE}?serviceKey=${KEY}&aplyBgnDt=${dt}&weekFxrtTpcd=${tp}`;
  try {
    const r = await fetch(url);
    const t = await r.text();
    return { status: r.status, body: t };
  } catch (e) {
    return { status: 0, body: `fetch failed: ${e.message}` };
  }
}

line('='.repeat(66));
line('관세청 관세환율(과세환율) API 탐색');
line('='.repeat(66));

for (const back of [0, 1, 3, 7]) {
  const dt = days(back);
  const { status, body } = await probe(dt, 2); // 2 = 수입
  line(`\n── aplyBgnDt=${dt} (수입) · HTTP ${status}`);
  const code = (body.match(/<resultCode>([^<]*)</) || [])[1];
  const msg = (body.match(/<resultMsg>([^<]*)</) || [])[1]
           || (body.match(/<returnAuthMsg>([^<]*)</) || [])[1]
           || (body.match(/<errMsg>([^<]*)</) || [])[1];
  if (code || msg) line(`   resultCode=${code ?? '-'} msg=${msg ?? '-'}`);
  const items = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  line(`   item 수: ${items.length}`);
  if (items.length) {
    for (const it of items.slice(0, 6)) {
      const g = (k) => (it[1].match(new RegExp(`<${k}>([^<]*)<`)) || [])[1] ?? '';
      line(`     ${g('currSgn').padEnd(4)} ${g('mtryUtNm').padEnd(22)} ${g('fxrt').padStart(12)}  적용 ${g('aplyBgnDt')}`);
    }
    const usd = items.map((i) => i[1]).find((x) => /<currSgn>USD</.test(x));
    if (usd) line(`   ★ USD 과세환율: ${(usd.match(/<fxrt>([^<]*)</) || [])[1]}`);
    break; // 성공하면 더 볼 필요 없다
  }
  line(`   원문 앞부분: ${body.replace(/\s+/g, ' ').slice(0, 220)}`);
}

line('\n탐색 완료');
