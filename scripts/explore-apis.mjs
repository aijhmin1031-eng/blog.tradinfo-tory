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

// ★ 9판. 5G 시총 1위는 SK텔레콤(017670) · 20.32조원(2026-09-01 실측)으로 갈렸다.
//   기업 분석 대상으로 세우려면 **고유번호**가 필요하다. corpCode.xml 은 3.6MB 인데
//   DART 처리량이 오늘 15KB/초 수준이라 90초로는 못 받는다(8판 직전 실행이 그래서 죽었다).
//   **여기서만 300초를 준다.** 받고 나면 표에 고정하므로 다시 받을 일이 없다.
import { readFileSync as rf, readdirSync as rd } from 'node:fs';

const TARGET = ['SK텔레콤', '017670'];
let corpCode = null;

get(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`,
  '① corpCode.xml (3.6MB · 시간 300초)', { binary: true, timeout: 300 });
try {
  execFileSync('bash', ['-lc', 'cd /tmp && rm -rf cc && mkdir cc && unzip -o -q resp.bin -d cc'], { stdio: 'ignore', timeout: 60000 });
  const f = rd('/tmp/cc').find((x) => /\.xml$/i.test(x));
  const XML = rf(`/tmp/cc/${f}`, 'utf8');
  log(`   ${f} · ${XML.length.toLocaleString()}자`);
  for (const c of XML.split('</list>')) {
    if (!c.includes(`<stock_code>${TARGET[1]}</stock_code>`)) continue;
    corpCode = (c.match(/<corp_code>\s*(\d{8})\s*<\/corp_code>/) || [])[1];
    const nm = (c.match(/<corp_name>\s*([^<]*?)\s*<\/corp_name>/) || [])[1];
    log(`   ★ ${TARGET[0]}(${TARGET[1]}) → 고유번호 ${corpCode} · 등록명 「${nm}」`);
    break;
  }
  if (!corpCode) log(`   ★ 못 찾음`);
} catch (e) { log(`   ★ 실패: ${e.message.slice(0, 200)}`); }

if (corpCode) {
  // ② 이 회사도 반기보고서가 나와 있는가
  const pad2 = (n) => String(n).padStart(2, '0');
  const d = new Date(); const b = new Date(d.getTime() - 120 * 86400000);
  const ymd = (x) => `${x.getFullYear()}${pad2(x.getMonth() + 1)}${pad2(x.getDate())}`;
  const lb = get(`https://opendart.fss.or.kr/api/list.json?crtfc_key=${KEY}&corp_code=${corpCode}&bgn_de=${ymd(b)}&end_de=${ymd(d)}&page_count=100`,
    '② 공시 목록 (최근 120일)');
  try {
    const j = JSON.parse(lb);
    const per = (j.list ?? []).filter((r) => /^\[?(기재정정)?\]?\s*(사업보고서|반기보고서|분기보고서)/.test(r.report_nm.trim()));
    log(`   총 ${j.total_count}건 · 정기보고서 ${per.length}건: ${per.map((r) => `${r.rcept_dt} ${r.report_nm.trim()}`).join(' | ') || '없음'}`);
  } catch { log(`   파싱 실패`); }

  // ③ 전체계정이 도는가 — 소유주가 「전체계정까지」로 정했다
  for (const [year, code, nm] of [['2026', '11012', '반기'], ['2025', '11011', '사업(연간)']]) {
    const b2 = get(`https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${code}&fs_div=CFS`,
      `③ 전체계정 ${year} ${nm} CFS`);
    try {
      const j = JSON.parse(b2); const list = j.list ?? [];
      log(`   status=${j.status} · 계정 ${list.length}개 · 구분: ${[...new Set(list.map((x) => x.sj_nm))].join(' / ')}`);
      const is = list.filter((x) => x.sj_nm === '손익계산서');
      log(`   손익 ${is.length}개: ${is.map((x) => x.account_nm).join(', ')}`);
      // ★ 전체계정에도 누적 필드가 오는가 — 주요계정에는 왔다. 여기서 갈려야 분기 값을 못 틀린다.
      const rev = is.find((x) => x.account_nm === '매출액');
      if (rev) log(`   ★ 매출액 행 전문: ${JSON.stringify(rev)}`);
      log(`   ★ 누적 필드(thstrm_add_amount) 존재: ${is.some((x) => 'thstrm_add_amount' in x) ? '있다' : '없다 — 분기 값은 주요계정 API 로 받아야 한다'}`);
    } catch { log(`   파싱 실패: ${String(b2).replace(/\s+/g, ' ').slice(0, 200)}`); }
  }
}

console.log('');
log('탐색 끝. 키 값은 출력하지 않았다.');
