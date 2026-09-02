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

// ★ 7판. 소유주 물음: **「보고서 원문을 진짜로 받을 수 있느냐」**
//   지금까지 증명한 것은 주요계정 14종(숫자)뿐이다. 원문과 전체계정은 안 때려 봤다.
//   여기서 둘을 확인한다. 넘겨짚지 않는다.
//     ⑨ `document.xml` — 기업이 제출한 보고서 **원문 파일**
//     ⑩ `fnlttSinglAcntAll` — **전체 계정**(주요계정 14종이 아니라 수백 항목)
import { readFileSync as rf, readdirSync as rd, statSync } from 'node:fs';

// ⑨ 원문. 삼성전자 2026 반기보고서 접수번호(우리 공시 수집분에서 나온 값이다).
const RCEPT = '20260814003699';
get(`https://opendart.fss.or.kr/api/document.xml?crtfc_key=${KEY}&rcept_no=${RCEPT}`,
  `⑨ document.xml — 삼성전자 반기보고서 원문 (rcept_no=${RCEPT})`, { binary: true, timeout: 120 });
try {
  execFileSync('bash', ['-lc', 'cd /tmp && rm -rf doc && mkdir doc && unzip -o -q resp.bin -d doc'], { stdio: 'ignore', timeout: 60000 });
  const files = rd('/tmp/doc');
  log(`   압축 안: ${files.length}개 — ${files.map((f) => `${f}(${statSync(`/tmp/doc/${f}`).size.toLocaleString()}B)`).join(', ')}`);
  const big = files.map((f) => [f, statSync(`/tmp/doc/${f}`).size]).sort((a, b) => b[1] - a[1])[0];
  if (big) {
    const raw = rf(`/tmp/doc/${big[0]}`, 'utf8');
    log(`   가장 큰 파일 ${big[0]} · ${raw.length.toLocaleString()}자`);
    // 태그를 벗겨 사람이 읽는 글이 나오는지 본다
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    log(`   태그 벗긴 본문 ${text.length.toLocaleString()}자`);
    log(`   앞머리 300자: ${text.slice(0, 300)}`);
    // 우리가 쓸 만한 절이 실제로 들어 있는가
    for (const k of ['사업의 내용', '위험', '주요 제품', '연구개발', '매출', '원재료', '시장점유율', '주주']) {
      const i = text.indexOf(k);
      log(`   「${k}」 ${i >= 0 ? `있음(${i.toLocaleString()}자 지점)` : '없음'}`);
    }
  }
} catch (e) { log(`   ★ ⑨ 압축 풀기 실패: ${e.message.slice(0, 200)}`); }

// ⑩ 전체 계정
for (const div of ['CFS', 'OFS']) {
  const b = get(`https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${KEY}&corp_code=00126380&bsns_year=2026&reprt_code=11012&fs_div=${div}`,
    `⑩ fnlttSinglAcntAll — 2026 반기 ${div}`);
  try {
    const j = JSON.parse(b);
    const list = j.list ?? [];
    log(`   status=${j.status} · 계정 ${list.length}개`);
    log(`   보고서 구분: ${[...new Set(list.map((x) => x.sj_nm))].join(' / ')}`);
    const is = list.filter((x) => x.sj_nm === '손익계산서');
    log(`   손익계산서 항목 ${is.length}개: ${is.slice(0, 25).map((x) => x.account_nm).join(', ')}`);
    log(`   한 행 키: ${Object.keys(list[0] ?? {}).join(', ')}`);
    log(`   한 행 전문: ${JSON.stringify(list[0])}`);
  } catch (e) { log(`   JSON 파싱 실패: ${String(b).replace(/\s+/g, ' ').slice(0, 200)}`); }
}

console.log('');
log('탐색 끝. 키 값은 출력하지 않았다.');
