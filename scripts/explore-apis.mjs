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

// ★ 10판. 소유주가 분석 대상을 정했다(2026-09-02):
//   **대한광통신(010170) · 서진시스템(178320)** — 둘 다 5G 관련 시총 상위권이다.
//   서진시스템은 「최근 증자를 많이 해서 욕을 먹는다」는 이야기가 있는데,
//   **들은 이야기를 그대로 쓰지 않는다.** 증자 공시·자본금·주식수로 실제를 확인한다.
//
//   확인할 것 —
//     ① 두 회사 고유번호 (corpCode.xml 3.6MB, 오늘 DART 가 느려 300초를 준다)
//     ② 결산월 (기간 종료일을 12월 결산으로 가정하지 않기 위해서다)
//     ③ 전체계정이 도는가 · 누적 필드가 오는가
//     ④ 증자 흔적 — 유상증자·증권발행실적·전환사채 공시가 실제로 몇 건인가
//     ⑤ 주식총수 API 로 주식수 변화를 볼 수 있는가 (희석을 계산하려면 필요하다)
import { readFileSync as rf, readdirSync as rd } from 'node:fs';

const TARGETS = [['대한광통신', '010170'], ['서진시스템', '178320'], ['SK텔레콤', '017670']];
const codes = new Map();

get(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`,
  '① corpCode.xml (3.6MB · 시간 300초)', { binary: true, timeout: 300 });
try {
  execFileSync('bash', ['-lc', 'cd /tmp && rm -rf cc && mkdir cc && unzip -o -q resp.bin -d cc'], { stdio: 'ignore', timeout: 60000 });
  const f = rd('/tmp/cc').find((x) => /\.xml$/i.test(x));
  const XML = rf(`/tmp/cc/${f}`, 'utf8');
  log(`   ${f} · ${XML.length.toLocaleString()}자`);
  for (const c of XML.split('</list>')) {
    const sc = (c.match(/<stock_code>\s*(\d{6})\s*<\/stock_code>/) || [])[1];
    const hit = TARGETS.find(([, code]) => code === sc);
    if (!hit) continue;
    const cc = (c.match(/<corp_code>\s*(\d{8})\s*<\/corp_code>/) || [])[1];
    const nm = (c.match(/<corp_name>\s*([^<]*?)\s*<\/corp_name>/) || [])[1];
    codes.set(hit[0], cc);
    log(`   ★ ${hit[0]}(${sc}) → 고유번호 ${cc} · 등록명 「${nm}」`);
  }
  log(`   ★ 그대로 옮겨 쓸 표: ${JSON.stringify(Object.fromEntries(TARGETS.filter(([n]) => codes.has(n)).map(([n, sc]) => [sc, codes.get(n)])))}`);
} catch (e) { log(`   ★ 실패: ${e.message.slice(0, 200)}`); }

const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (x) => `${x.getFullYear()}${pad2(x.getMonth() + 1)}${pad2(x.getDate())}`;

for (const [name, stock] of TARGETS.slice(0, 2)) {
  const cc = codes.get(name);
  if (!cc) { log(`\n★ ${name}: 고유번호가 없어 건너뜀`); continue; }

  // ② 결산월
  const cb = get(`https://opendart.fss.or.kr/api/company.json?crtfc_key=${KEY}&corp_code=${cc}`, `② ${name} 기업개황`);
  try {
    const j = JSON.parse(cb);
    log(`   결산월 ${j.acc_mt}월 · 업종 ${j.induty_code} · 설립 ${j.est_dt} · 상장 ${j.stock_name}`);
    log(`   한 행 키: ${Object.keys(j).join(', ')}`);
  } catch { log(`   파싱 실패`); }

  // ③ 전체계정
  const ab = get(`https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${KEY}&corp_code=${cc}&bsns_year=2026&reprt_code=11012&fs_div=CFS`,
    `③ ${name} 전체계정 2026 반기 CFS`);
  try {
    const j = JSON.parse(ab); const list = j.list ?? [];
    log(`   status=${j.status} · 계정 ${list.length}개 · 구분 ${[...new Set(list.map((x) => x.sj_nm))].join(' / ')}`);
    const is = list.filter((x) => x.sj_nm === '손익계산서');
    log(`   손익 ${is.length}개: ${is.map((x) => x.account_nm).join(', ')}`);
    const rev = is.find((x) => x.account_nm === '매출액');
    if (rev) log(`   ★ 매출액 행: ${JSON.stringify(rev)}`);
    log(`   ★ 누적 필드: ${is.some((x) => 'thstrm_add_amount' in x) ? '있다' : '없다 — 주요계정 API 로 메워야 한다'}`);
    const cap = list.find((x) => x.account_nm === '자본금');
    if (cap) log(`   자본금: 당기 ${cap.thstrm_amount} · 전기 ${cap.frmtrm_amount}`);
  } catch { log(`   파싱 실패: ${String(ab).replace(/\s+/g, ' ').slice(0, 200)}`); }

  // ④ 증자 흔적 — 3년치 공시에서 자본 조달 관련만 센다
  const d2 = new Date(); const b2 = new Date(d2.getTime() - 1095 * 86400000);
  const lb = get(`https://opendart.fss.or.kr/api/list.json?crtfc_key=${KEY}&corp_code=${cc}&bgn_de=${ymd(b2)}&end_de=${ymd(d2)}&page_count=100&page_no=1`,
    `④ ${name} 공시 목록 (3년)`);
  try {
    const j = JSON.parse(lb);
    const rows = j.list ?? [];
    log(`   총 ${j.total_count}건 · 전체 ${j.total_page}쪽 · 이번 쪽 ${rows.length}건`);
    const RAISE = /유상증자|무상증자|전환사채|신주인수권|교환사채|증권발행실적|주주배정|제3자배정|자본감소/;
    const hits = rows.filter((r) => RAISE.test(r.report_nm));
    log(`   ★ 자본조달 관련 ${hits.length}건(첫 쪽 기준): ${hits.map((r) => `${r.rcept_dt} ${r.report_nm.trim()}`).join(' | ') || '없음'}`);
    const per = rows.filter((r) => /^\[?(기재정정)?\]?\s*(사업보고서|반기보고서|분기보고서)/.test(r.report_nm.trim()));
    log(`   정기보고서 ${per.length}건: ${per.map((r) => `${r.rcept_dt} ${r.report_nm.trim()}`).join(' | ')}`);
  } catch { log(`   파싱 실패`); }

  // ⑤ 주식총수 — 희석을 계산하려면 주식수가 필요하다
  const sb = get(`https://opendart.fss.or.kr/api/stockTotqySttus.json?crtfc_key=${KEY}&corp_code=${cc}&bsns_year=2026&reprt_code=11012`,
    `⑤ ${name} 주식총수 2026 반기`);
  try {
    const j = JSON.parse(sb);
    log(`   status=${j.status} · ${(j.list ?? []).length}행`);
    for (const r of (j.list ?? []).slice(0, 4)) log(`     ${JSON.stringify(r)}`);
  } catch { log(`   파싱 실패: ${String(sb).replace(/\s+/g, ' ').slice(0, 200)}`); }
}

console.log('');
log('탐색 끝. 키 값은 출력하지 않았다.');
