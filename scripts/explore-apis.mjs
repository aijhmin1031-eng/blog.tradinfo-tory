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

// ★ 8판. 소유주 지시(2026-09-02): 「종목을 다른 것으로 할거야 — 5G 관련 종목으로
//   시총 상위기업 1개만 찾아봐.」
//
//   ★ 시총을 기억으로 답하지 않는다(절대 규칙 2). 금융위 주식시세 API 의 `mrktTotAmt`
//     를 실제로 받아 순위를 매긴다. 후보는 내가 고르지만 **순위는 데이터가 정한다.**
//
//   후보 고른 기준 — 「5G 관련」을 셋으로 갈랐다.
//     ⓐ 망을 운영하는 통신사   ⓑ 기지국·중계기 장비   ⓒ 광트랜시버·RF 부품
//   삼성전자는 세계 5G 장비 점유율 상위 업체지만 **5G 관련주로 부르지 않는다**(사업의 대부분이
//   반도체·스마트폰이다). 그래도 순위를 투명하게 보려고 참고로 함께 넣고 표시한다.
const DATAGO = process.env.DATA_GO_KR_KEY ?? '';
log(`공공데이터 키: ${DATAGO ? `있음(길이 ${DATAGO.length})` : '★ 없음'}`);

const CANDIDATES = [
  ['SK텔레콤',      '017670', 'ⓐ 통신사'],
  ['KT',            '030200', 'ⓐ 통신사'],
  ['LG유플러스',    '032640', 'ⓐ 통신사'],
  ['케이엠더블유',  '032500', 'ⓑ 기지국 장비'],
  ['에이스테크',    '088800', 'ⓑ 기지국 안테나'],
  ['다산네트웍스',  '039560', 'ⓑ 네트워크 장비'],
  ['유비쿼스',      '264450', 'ⓑ 네트워크 장비'],
  ['서진시스템',    '178320', 'ⓑ 통신장비 함체'],
  ['이노와이어리스','073490', 'ⓑ 계측·스몰셀'],
  ['RFHIC',         '218410', 'ⓒ RF 반도체'],
  ['오이솔루션',    '138080', 'ⓒ 광트랜시버'],
  ['대한광통신',    '010170', 'ⓒ 광섬유'],
  ['삼성전자',      '005930', '(참고) 5G 장비 겸업'],
];

const pad2 = (n) => String(n).padStart(2, '0');
const ymdOf = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
const bgn = new Date(); bgn.setDate(bgn.getDate() - 12);

const rank = [];
for (const [name, code, kind] of CANDIDATES) {
  const body = get(
    `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo` +
    `?serviceKey=${DATAGO}&resultType=json&numOfRows=30&likeSrtnCd=${code}&beginBasDt=${ymdOf(bgn)}`,
    `${name} (${code}) ${kind}`);
  if (!body) continue;
  try {
    const rows = (JSON.parse(body)?.response?.body?.items?.item ?? []).filter((r) => r.srtnCd === code);
    if (!rows.length) { log(`   ★ 행 없음`); continue; }
    const last = rows.sort((a, b) => a.basDt.localeCompare(b.basDt)).at(-1);
    const cap = Number(last.mrktTotAmt);
    rank.push({ name, code, kind, cap, clpr: Number(last.clpr), basDt: last.basDt, itmsNm: last.itmsNm });
    log(`   ${last.basDt} · ${last.itmsNm} · 종가 ${Number(last.clpr).toLocaleString()}원 · 시총 ${(cap / 1e12).toFixed(2)}조원`);
  } catch (e) { log(`   파싱 실패: ${String(body).replace(/\s+/g, ' ').slice(0, 160)}`); }
}

console.log('');
log('★★ 시가총액 순위 (실측) ★★');
rank.sort((a, b) => b.cap - a.cap);
rank.forEach((r, i) => log(`   ${String(i + 1).padStart(2)}. ${r.name.padEnd(9)} ${r.kind.padEnd(16)} ${(r.cap / 1e12).toFixed(2)}조원  (기준일 ${r.basDt})`));
const pick = rank.find((r) => !r.kind.startsWith('(참고)'));
console.log('');
log(`★ 5G 관련 시총 1위: ${pick ? `${pick.name}(${pick.code}) · ${(pick.cap / 1e12).toFixed(2)}조원 · 기준일 ${pick.basDt}` : '못 정함'}`);

console.log('');
log('탐색 끝. 키 값은 출력하지 않았다.');
