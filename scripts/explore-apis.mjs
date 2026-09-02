#!/usr/bin/env node
// DART 탐색 — **끝났다.** 확인한 것을 남겨 두고 무거운 재호출은 하지 않는다.
//
// 정본은 `docs/corp-analysis.md` 4-2·4-3·4-4 절이다. 여기 요약만 둔다.
//   ① corpCode.xml  3.6MB ZIP · 118,820곳 중 상장 3,930곳 · **오늘 DART 처리량이 15KB/초라
//      90초로는 못 받는다.** 그래서 고유번호는 `src/data/dart-corp.json` 에 고정했다.
//   ② fnlttSinglAcnt      주요계정 14종 · **thstrm_add_amount(누적)가 온다**
//   ③ fnlttSinglAcntAll   전체계정 삼성 223 / 서진 252 · **누적 필드는 안 온다**(②로 메운다)
//   ④ document.xml        보고서 원문 6.8MB · 태그 벗기면 63.8만 자 · 사업의 내용·위험 다 있다
//   ⑤ list.json           corp_code 로 종목별 호출 가능(이름으로 거르면 안 된다)
//   ⑥ stockTotqySttus     주식총수·자기주식·이익소각까지 온다
//   ⑦ company.json        acc_mt(결산월) — 기간 종료일을 계산하려면 필요하다
//
// ★ 실측으로 잡은 함정 둘
//   - **손익 보고서 이름이 회사마다 다르다.** 삼성전자는 「손익계산서」+「포괄손익계산서」,
//     서진시스템은 「포괄손익계산서」만. 이름으로 거르면 후자의 매출이 통째로 사라진다.
//   - **분기 보고서의 당기는 그 분기 석 달만이다.** 누적은 별도 필드다.
//
// 다시 탐색할 일이 생기면 git 이력에서 꺼내 쓸 것(10판까지 있다).
const t0 = Date.now();
console.log(`[+0.0s] DART 탐색은 완료됐다. 정본은 docs/corp-analysis.md 4-2·4-3·4-4 절.`);
console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] 이 워크플로는 이제 수집기 실행에 쓴다.`);
