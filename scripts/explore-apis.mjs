#!/usr/bin/env node
// 일회성 탐색 — DART 정기보고서 재무제표 (2026-09-01, 기업 분석 준비).
//
// 확인할 것 넷.
//   ① `corpCode.xml` 로 고유번호 8자리를 받을 수 있는가 (모든 호출의 열쇠다)
//   ② `fnlttSinglAcnt` 가 **분기·반기·연간** 각각 무엇을 돌려주는가
//      (reprt_code 11011 사업 · 11012 반기 · 11013 1분기 · 11014 3분기)
//   ③ 계정 항목이 실제로 무엇무엇인가 — 기사에 쓸 수 있는 수준인가
//   ④ 연결(CFS)과 별도(OFS)가 갈리는가
//
// ★ curl 로 부른다. node fetch 의 「fetch failed」를 결론으로 삼지 말 것(CLAUDE.md 함정).
// ★ 키 값은 절대 출력하지 않는다.
import { execFileSync } from 'node:child_process';

const KEY = process.env.DART_API_KEY ?? '';
console.log(`DART 키: ${KEY ? `있음(길이 ${KEY.length})` : '★ 없음 — Actions Secrets 확인 필요'}`);

function get(url, label, { binary = false } = {}) {
  console.log(`\n── ${label}`);
  const out = execFileSync('curl', [
    '-sS', '--max-time', '40', '-o', binary ? '/tmp/resp.bin' : '/tmp/resp.txt',
    '-w', 'HTTP %{http_code} · total %{time_total}s · size %{size_download} · type %{content_type}',
    url,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`   ${out}`);
  if (binary) return null;
  const body = execFileSync('cat', ['/tmp/resp.txt'], { encoding: 'utf8' });
  return body;
}

// ── ① 고유번호 (ZIP 으로 온다. 여기서는 응답 형태만 본다) ──────────────
get(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`, '① corpCode.xml (고유번호 목록, ZIP)', { binary: true });
// ★ 파싱은 Node 에서 직접 한다. 첫 판은 셸 heredoc 안에 파이썬을 넣었다가
//   이스케이프가 네 겹으로 꼬여 **정규식이 아무것도 못 잡았다**(API 문제가 아니라 내 문제였다).
//   중첩 heredoc 을 쓰지 말 것.
import { readFileSync, readdirSync } from 'node:fs';

let CORP = '';
let XML = '';
try {
  execFileSync('bash', ['-lc', 'cd /tmp && rm -rf cc && mkdir cc && unzip -o -q resp.bin -d cc'], { stdio: 'ignore' });
  const f = readdirSync('/tmp/cc').find((x) => /\.xml$/i.test(x));
  console.log(`   압축 풀기: ${f}`);
  XML = readFileSync(`/tmp/cc/${f}`, 'utf8');
  console.log(`   XML 길이: ${XML.length.toLocaleString()}자`);
  const first = XML.match(/<list>[\s\S]{0,300}?<\/list>/);
  if (first) console.log(`   첫 항목: ${first[0].replace(/\s+/g, ' ')}`);

  // 종목코드로 찾는다. 이름은 표기가 갈릴 수 있으나 종목코드는 하나다.
  for (const [name, stock] of [['삼성전자', '005930'], ['SK하이닉스', '000660'], ['HMM', '011200']]) {
    const re = new RegExp(`<list>(?:(?!</list>)[\\s\\S])*?<stock_code>${stock}</stock_code>(?:(?!</list>)[\\s\\S])*?</list>`);
    const m = XML.match(re);
    const code = m ? (m[0].match(/<corp_code>(\d{8})<\/corp_code>/) || [])[1] : null;
    const nm = m ? (m[0].match(/<corp_name>([^<]*)<\/corp_name>/) || [])[1] : null;
    console.log(`   ${name}(${stock}) → 고유번호 ${code ?? '못 찾음'}${nm ? ` · 등록명 「${nm}」` : ''}`);
    if (stock === '005930' && code) CORP = code;
  }
  const listed = (XML.match(/<stock_code>\d{6}<\/stock_code>/g) || []).length;
  const all = (XML.match(/<list>/g) || []).length;
  console.log(`   전체 ${all.toLocaleString()}곳 중 상장(종목코드 있음) ${listed.toLocaleString()}곳`);
} catch (e) {
  console.log(`   ★ 실패: ${e.message.slice(0, 200)}`);
}

console.log(`\n삼성전자 고유번호: ${CORP || '(못 얻음 — 아래는 건너뜀)'}`);

if (CORP) {
  for (const [code, name] of [['11013', '1분기'], ['11012', '반기'], ['11014', '3분기'], ['11011', '사업(연간)']]) {
    for (const year of ['2026', '2025']) {
      const body = get(
        `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${KEY}&corp_code=${CORP}&bsns_year=${year}&reprt_code=${code}`,
        `② ${year} ${name} (reprt_code=${code})`
      );
      try {
        const j = JSON.parse(body);
        console.log(`   status=${j.status} message=${j.message}`);
        const list = j.list ?? [];
        console.log(`   계정 수: ${list.length}`);
        if (list.length) {
          const fs = [...new Set(list.map((x) => x.fs_nm))];
          console.log(`   재무제표 구분: ${fs.join(' / ')}`);
          for (const r of list.slice(0, 6)) {
            console.log(`     ${(r.fs_nm ?? '').padEnd(6)} ${(r.sj_nm ?? '').padEnd(10)} ${(r.account_nm ?? '').padEnd(14)} 당기 ${String(r.thstrm_amount ?? '').padStart(18)}`);
          }
          console.log(`   ★ 항목 이름 전부: ${[...new Set(list.map((x) => x.account_nm))].join(', ')}`);
        }
      } catch (e) { console.log(`   JSON 파싱 실패: ${String(body).replace(/\s+/g, ' ').slice(0, 200)}`); }
      if (year === '2026' && body && /"status":"000"/.test(body)) break; // 최신 연도가 되면 그만
    }
  }
}
console.log('\n탐색 끝. 키 값은 출력하지 않았다.');
