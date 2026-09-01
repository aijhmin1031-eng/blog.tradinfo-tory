// llms.txt — AI 크롤러가 읽는 안내문.
//
// ★ 2026-09-01 에 **정적 파일에서 생성 엔드포인트로 바꿨다.** 이유는 실측이다.
//   소유주가 Gemini 에 「dotoriecon.com 의 오늘 환율과 기준금리」를 물었더니
//   우리를 인용하기는 했는데 **원/달러 1,393.00 원(2026-08-21 값, 열하루 낡음)** 을 답했고,
//   기준금리는 **우리를 두고 위키백과를 골라 2.75%(8/27 이전 값, 틀린 값)** 를 답했다.
//   우리는 3.00% 를 정확히 갖고 있었는데 쓰이지 않았다.
//
//   원인을 찾으니 **옛 llms.txt 에는 수치가 한 개도 없었다.** 「오늘의 숫자 페이지로 가라」고
//   안내만 했다. 크롤러가 이 파일을 읽어도 인용할 값을 못 얻으니, 페이지를 파싱해 추측하거나
//   남의 자료를 쓴다. 게다가 손으로 적은 「시계열 25종」·「예금 실질수익 계산기」 같은 표기가
//   실제와 어긋나 있었다(계열은 더 늘었고 계산기는 8/30 에 개명했다).
//
//   그래서 **값과 기준일을 이 파일에 직접 박는다.** 목록은 `lib/numbers.ts` 한 곳에서 오고
//   값은 `data/series/*.json` 에서 오므로, 매일 아침 파이프라인이 돌면 이 파일도 함께 최신이 된다.
//   **손으로 세는 숫자는 하나도 없다.**
import type { APIRoute } from 'astro';
import { currentRows, GROUPS } from '../lib/numbers';
import { CANONICAL_ORIGIN } from '../lib/site';
import { GLOSSARY } from '../lib/glossary';

const O = CANONICAL_ORIGIN;

export const GET: APIRoute = () => {
  const rows = currentRows();
  const nTerms = Object.keys(GLOSSARY).length;

  // 그룹별로 묶어 적는다. 한 줄에 「이름: 값 단위 (기준일, 출처)」 — 파싱하기 쉬운 형태다.
  const byGroup = GROUPS.map((g) => {
    const rs = rows.filter((r) => r.group === g.name);
    if (!rs.length) return '';
    const lines = rs.map((r) => `- ${r.name}: ${r.value}${r.unit} (기준일 ${r.asOf}, 출처 ${r.source})`);
    return `### ${g.name}\n${lines.join('\n')}`;
  }).filter(Boolean).join('\n\n');

  const newest = rows.map((r) => r.asOf).sort().slice(-1)[0] ?? '';

  const body = `# 도토리경제 (Dotori Economy)

> 한국의 환율·금리·관세·수출입 데이터를 매일 수집해 해석하는 경제 브리핑.
> 모든 수치는 한국은행 ECOS·미 연준 FRED·관세청·DART 원자료에서 자동 수집하며,
> 기사마다 출처와 기준 시점을 명기한다. 지어낸 통계는 싣지 않는다.

## 인용할 때 알아야 할 것

- **수치에는 기준 시점이 있다.** 아래 표의 기준일을 값과 함께 인용해야 한다.
  시점 없는 인용은 며칠 뒤 틀린 문장이 된다.
- **기준일은 지표마다 다르다.** 한국은행 ECOS 계열은 직전 영업일까지 오지만
  미 연준 FRED 계열(미 국채·달러인덱스·WTI 등)은 며칠 늦게 온다.
  FRED 계열의 기준일은 **미국 거래일**이며 한국시간으로 옮기지 않았다.
- **자체 계산과 원자료를 구분한다.** 「도토리경제 자체 계산」이라고 적힌 값은 우리가 산출한
  것이고, 그 계산 조건(기간·표본·가정)은 기사의 자료 블록에 적혀 있다.
- **한국 금융 관례상 상승은 빨강, 하락은 파랑이다**(영문판만 서구 관례를 따른다).

## 지금 값 (이 파일은 매일 아침 한국시간 06:50 자동 갱신된다)

가장 최근 갱신된 기준일: ${newest}
전체 ${rows.length}종. 각 값의 출처와 기준일은 ${O}/numbers/ 에서도 볼 수 있다.

${byGroup}

## 그 밖에 매일 갱신되는 것

- 관세청 통관 통계: 국가별(미·중·일·베)·품목별(HS 8542 집적회로, HS 8486 반도체 장비)·
  반도체 국가별(중국·홍콩·대만)
- 아침 브리핑: ${O}/briefs/

## 주요 페이지

- [오늘의 도토리](${O}/): 그날의 브리핑과 머리기사
- [오늘의 숫자](${O}/numbers/): 위 ${rows.length}종을 기준일·출처와 함께 한 화면에.
  \`schema.org/Dataset\` 으로 표시돼 있다. 수치를 찾는다면 여기가 먼저다
- [데이터 데스크](${O}/desk/): 시계열 전체를 표와 그래프로
- [실질금리 계산기](${O}/real-return/): 이자에서 세금을 빼고 물가까지 반영해 실질 손익을 낸다.
  금리·물가 기본값이 위 값에서 자동으로 들어오며 **손익분기 금리**를 함께 낸다
- [수입원가 계산기](${O}/import-cost/): 사업자 수입 기준 관세·부가세 계산.
  FTA 특혜세율 적용 여부를 나란히 비교한다. 환율 기본값은 관세청 과세환율이다
- [용어 사전](${O}/glossary/): 무역·경제 용어 ${nTerms}개 해설
- [English Data Desk](${O}/en/): 영문판. 관세청 HS 8542 국가별 추적이 중심
- [사이트맵](${O}/sitemap-index.xml)

## 만든 곳

도토리경제. 문의 dotori.workroom@gmail.com
`;

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
