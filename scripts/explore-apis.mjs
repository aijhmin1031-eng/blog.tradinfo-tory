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
try {
  const t = execFileSync('bash', ['-lc', 'file -b /tmp/resp.bin | head -c 80'], { encoding: 'utf8' });
  console.log(`   파일 형식: ${t.trim()}`);
  const n = execFileSync('bash', ['-lc',
    'cd /tmp && rm -rf cc && mkdir cc && (unzip -o -q resp.bin -d cc 2>/dev/null || true) && ls cc | head -3 && wc -c cc/* 2>/dev/null | tail -1'
  ], { encoding: 'utf8' });
  console.log(`   압축 풀기: ${n.trim().replace(/\n/g, ' · ')}`);
  const s = execFileSync('bash', ['-lc',
    `grep -o '<list>[^!]*</list>' /tmp/cc/*.xml 2>/dev/null | head -1 | head -c 400`
  ], { encoding: 'utf8' });
  if (s.trim()) console.log(`   첫 항목: ${s.trim()}`);
  const samsung = execFileSync('bash', ['-lc',
    `python3 - <<'PY'
import re,glob
for f in glob.glob('/tmp/cc/*.xml'):
    t=open(f,encoding='utf-8',errors='ignore').read()
    for name,code in [('삼성전자','005930'),('SK하이닉스','000660'),('HMM','011200')]:
        m=re.search(r'<list>\\\\s*<corp_code>(\\\\d{8})</corp_code>\\\\s*<corp_name>'+name+r'</corp_name>\\\\s*<corp_eng_name>[^<]*</corp_eng_name>\\\\s*<stock_code>'+code, t)
        print(f'  {name}({code}) 고유번호:', m.group(1) if m else '못 찾음')
    break
PY`
  ], { encoding: 'utf8' });
  console.log(samsung.trimEnd());
} catch (e) { console.log(`   (압축 처리 실패: ${e.message.slice(0, 120)})`); }

// ── ②③④ 재무제표 주요계정 ─────────────────────────────────────────
// 삼성전자 고유번호는 위에서 확인되면 그 값을 쓴다. 알려진 값은 하드코딩하지 않는다.
let CORP = '';
try {
  CORP = execFileSync('bash', ['-lc',
    `python3 - <<'PY'
import re,glob
for f in glob.glob('/tmp/cc/*.xml'):
    t=open(f,encoding='utf-8',errors='ignore').read()
    m=re.search(r'<corp_code>(\\\\d{8})</corp_code>\\\\s*<corp_name>삼성전자</corp_name>', t)
    print(m.group(1) if m else '')
    break
PY`], { encoding: 'utf8' }).trim();
} catch {}
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
