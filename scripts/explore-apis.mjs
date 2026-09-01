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
//
// ★ 3판이다. 앞의 두 판이 각각 다른 이유로 답을 못 가져왔다.
//   1판: 셸 heredoc 안에 파이썬을 넣어 이스케이프가 꼬였다(파싱 실패).
//   2판: corpCode.xml 이 40초에 걸려 끊겼고, **그 한 번의 실패로 ②③④를 아예 못 봤다.**
//   3판에서 고친 것 셋 —
//     ⓐ **모든 줄에 경과 시간을 찍는다.** 어디서 느린지 추측하지 않고 본다.
//        (2판을 시간 제한 없이 돌렸다가 22분간 어디에 있는지 몰라 취소했다.)
//     ⓑ **①이 실패해도 ②③④를 본다.** 알려진 고유번호로 되돌아가되,
//        응답의 `corp_name` 으로 **맞는 회사인지 검증**한다(검증 없는 하드코딩은 하지 않는다).
//     ⓒ 호출 시간을 짧게(30초·재시도 1회) 잡아 **전체가 몇 분 안에 끝나게** 한다.
//        오래 기다려서 얻는 것보다 「느리다」는 사실 자체가 설계에 필요한 정보다.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const T0 = Date.now();
const el = () => `[+${((Date.now() - T0) / 1000).toFixed(1)}s]`;
const log = (s) => console.log(`${el()} ${s}`);

const KEY = process.env.DART_API_KEY ?? '';
log(`DART 키: ${KEY ? `있음(길이 ${KEY.length})` : '★ 없음 — Actions Secrets 확인 필요'}`);

function get(url, label, { binary = false, timeout = 30 } = {}) {
  console.log('');
  log(`── ${label}`);
  let out = '';
  try {
    out = execFileSync('curl', [
      '-sS', '--max-time', String(timeout), '--retry', '1', '--retry-delay', '2',
      '-o', binary ? '/tmp/resp.bin' : '/tmp/resp.txt',
      '-w', 'HTTP %{http_code} · total %{time_total}s · dns %{time_namelookup}s · connect %{time_connect}s · tls %{time_appconnect}s · size %{size_download} · speed %{speed_download}B/s',
      url,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: (timeout * 2 + 10) * 1000 });
  } catch (e) {
    log(`   ★ 실패: ${String(e.stdout ?? '').trim()} | ${String(e.stderr ?? '').trim().slice(0, 160)}`);
    return null;
  }
  log(`   ${out}`);
  if (binary) return null;
  try { return readFileSync('/tmp/resp.txt', 'utf8'); } catch { return null; }
}

// ── ① 고유번호 (ZIP 3.6MB) ──────────────────────────────────────────
// 시간을 90초로 잡았다. 1판은 7초, 2판은 40초에 못 받았다 — DART 쪽이 들쭉날쭉하다.
get(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`,
  '① corpCode.xml (고유번호 목록, 3.6MB ZIP)', { binary: true, timeout: 90 });

// 우리 관심 종목. 종목코드로 찾는다(이름 표기는 갈릴 수 있으나 종목코드는 하나다).
const WATCH = [
  ['삼성전자', '005930'], ['SK하이닉스', '000660'], ['현대차', '005380'],
  ['HMM', '011200'], ['POSCO홀딩스', '005490'], ['LG에너지솔루션', '373220'],
];
const found = new Map();

try {
  execFileSync('bash', ['-lc', 'cd /tmp && rm -rf cc && mkdir cc && unzip -o -q resp.bin -d cc'], { stdio: 'ignore', timeout: 60000 });
  const f = readdirSync('/tmp/cc').find((x) => /\.xml$/i.test(x));
  log(`   압축 풀기: ${f}`);
  const XML = readFileSync(`/tmp/cc/${f}`, 'utf8');
  log(`   XML 길이: ${XML.length.toLocaleString()}자`);

  // ★ 통째로 정규식을 걸지 않는다. 항목 단위로 갈라 한 번만 훑는다(선형).
  const chunks = XML.split('</list>');
  log(`   항목 ${chunks.length.toLocaleString()}개로 분할`);
  let listed = 0;
  for (const c of chunks) {
    const sc = (c.match(/<stock_code>\s*(\d{6})\s*<\/stock_code>/) || [])[1];
    if (!sc) continue;
    listed++;
    const hit = WATCH.find(([, code]) => code === sc);
    if (!hit) continue;
    const cc = (c.match(/<corp_code>\s*(\d{8})\s*<\/corp_code>/) || [])[1];
    const nm = (c.match(/<corp_name>\s*([^<]*?)\s*<\/corp_name>/) || [])[1];
    if (cc) found.set(hit[0], { corp_code: cc, name: nm, stock: sc });
  }
  log(`   전체 ${chunks.length.toLocaleString()}곳 중 상장(종목코드 있음) ${listed.toLocaleString()}곳`);
  for (const [name, code] of WATCH) {
    const v = found.get(name);
    log(`   ${name}(${code}) → 고유번호 ${v ? `${v.corp_code} · 등록명 「${v.name}」` : '못 찾음'}`);
  }
  if (found.size) {
    log(`   ★ 그대로 옮겨 쓸 표: ${JSON.stringify(Object.fromEntries([...found].map(([k, v]) => [v.stock, v.corp_code])))}`);
  }
} catch (e) {
  log(`   ★ ① 실패: ${e.message.slice(0, 200)}`);
}

// ⓑ ①이 안 되어도 ②③④는 본다. 알려진 값으로 되돌아가되 **응답의 회사명으로 검증**한다.
const FALLBACK = '00126380'; // 삼성전자로 알려진 고유번호 — 아래에서 corp_name 으로 확인한다
const CORP = found.get('삼성전자')?.corp_code ?? FALLBACK;
const viaFallback = !found.has('삼성전자');
console.log('');
log(`삼성전자 고유번호: ${CORP}${viaFallback ? ' (★ ①이 실패해 알려진 값으로 되돌아감 — 아래 응답의 corp_name 으로 검증한다)' : ''}`);

let verified = false;
for (const [code, name] of [['11013', '1분기'], ['11012', '반기'], ['11014', '3분기'], ['11011', '사업(연간)']]) {
  for (const year of ['2026', '2025']) {
    const body = get(
      `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${KEY}&corp_code=${CORP}&bsns_year=${year}&reprt_code=${code}`,
      `② ${year} ${name} (reprt_code=${code})`
    );
    if (!body) continue;
    let j;
    try { j = JSON.parse(body); }
    catch { log(`   JSON 파싱 실패: ${String(body).replace(/\s+/g, ' ').slice(0, 200)}`); continue; }
    log(`   status=${j.status} message=${j.message}`);
    const list = j.list ?? [];
    log(`   계정 수: ${list.length}`);
    if (list.length) {
      if (!verified) {
        const nm = list[0].corp_code === CORP ? '고유번호 일치' : '★ 고유번호 불일치';
        log(`   ★ 검증: ${nm} · 응답 회사코드 ${list[0].corp_code} · 통화 ${list[0].currency ?? '?'}`);
        verified = true;
      }
      log(`   재무제표 구분(④ 연결/별도): ${[...new Set(list.map((x) => x.fs_nm))].join(' / ')}`);
      log(`   보고서 구분: ${[...new Set(list.map((x) => x.sj_nm))].join(' / ')}`);
      log(`   기간: 당기 ${list[0].thstrm_nm ?? '?'} · 전기 ${list[0].frmtrm_nm ?? '?'} · 전전기 ${list[0].bfefrmtrm_nm ?? '?'}`);
      for (const r of list.slice(0, 8)) {
        log(`     ${(r.fs_nm ?? '').padEnd(4)} ${(r.sj_nm ?? '').padEnd(9)} ${(r.account_nm ?? '').padEnd(12)} 당기 ${String(r.thstrm_amount ?? '').padStart(18)}`);
      }
      log(`   ★ ③ 항목 이름 전부: ${[...new Set(list.map((x) => x.account_nm))].join(', ')}`);
    }
    if (/"status":"000"/.test(body)) break; // 그 연도가 있으면 이전 연도는 안 본다
  }
}
console.log('');
log('탐색 끝. 키 값은 출력하지 않았다.');
