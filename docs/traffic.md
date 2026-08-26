# 유입 — 독자는 어디서 오나

> 2026-08-26 신설 (소유주 지적: "우리 아직 독자없어").
> 품질 체계를 네 층으로 쌓아 두고 정작 읽는 사람이 없으면,
> 아무도 안 보는 곳간 문에 자물쇠를 세 개 단 셈이다. 그 자리를 이 문서가 맡는다.

## 지금 상태 (2026-08-26 실측)

> ## ⚠️ 아래 「색인 0건」은 오진이었다 (2026-08-26 당일 정정)
>
> 소유주가 Search Console URL 검사로 확인하니 **「URL이 Google에 등록되어 있음」**이 떴다.
> **색인은 되어 있다.** 아래 표의 `site:` 0건은 세션의 웹 검색 도구로 돌린 것인데,
> 그 도구는 US 지역 기준이고 `site:`·따옴표 연산자를 제대로 처리하지 못한다
> (질의와 무관한 사이트만 돌려준 것으로 드러났다). **구글 색인 여부는 Search Console 이 정본이고,
> 검색 도구의 `site:` 결과를 근거로 삼지 말 것.**
>
> **그래서 병목이 바뀐다.** 색인이 아니라 **순위·노출**이다. 색인은 됐는데 방문자가 0이라면
> 검색 결과에서 우리가 안 보이거나 너무 아래에 있다는 뜻이다. 판정 지표는
> Search Console **실적(Performance)** 의 노출수·클릭수다.
> 사이트맵도 이미 성공적으로 읽혔다(`sitemap-index.xml` 발견 167 페이지, `pack-images.xml` 58).

| 확인한 것 | 결과 | 뜻 |
|---|---|---|
| ~~구글 `site:dotoriecon.com`~~ | ~~0건~~ | **오진. 위 정정 참조** |
| Supabase `visit_summary(30)` | **빈 배열** | 30일간 방문 기록 0건 |
| 도메인 나이 | **이틀** (8/24 취득) | 새 도메인은 색인에 며칠~몇 주 |
| 사이트맵 | 168 URL (기사 40·용어 43) | 정상 |
| `robots.txt` | 전면 허용 + Yeti 명시 + 사이트맵 2건 | 정상 |
| canonical · OG | 정본 도메인으로 정상 | 정상 |
| JSON-LD | Article · BreadcrumbList · Organization · Person · WebPage | 정상 |
| Vercel Analytics 스크립트 | HTTP 200 | 켜져 있다 |

**막힌 곳은 우리 쪽이 아니다.** 기술은 흠이 없고, 글도 107편 있다.
그리고 색인도 되어 있다(위 정정). **그렇다면 남은 설명은 하나, 순위가 낮아서 아무도 못 본다는 것이다.**
이틀 된 도메인에 외부 링크가 0개이니 당연한 결과다. 다음 지표는 방문자가 아니라
Search Console 의 **노출수**다. 노출이 0이면 순위 문제, 노출은 있는데 클릭이 0이면 제목·설명 문제다.

> **주의**: 방문 기록 0건은 「아무도 안 왔다」와 「로깅이 조용히 실패한다」를 구분하지 못한다.
> 소유주가 사이트를 한 번 열고 나서 `visit_summary` 를 다시 조회하면 갈린다. 아직 안 갈랐다.

## 그런데 기다린다고 오지는 않는다

색인은 시작일 뿐이고 그 다음은 순위 싸움이다. **우리에게 외부 링크가 0개, 외부 채널이 0개다.**
구글이 이틀 된 도메인을 믿을 근거가 하나도 없다.

## 1페이지를 실제로 검색해 봤다 (2026-08-26)

승산은 키워드 종류에 따라 **정반대**였다.

| 키워드 | 1페이지를 잡고 있는 것 | 승산 |
|---|---|---|
| `FOB CIF 차이` | 물류 SaaS 기업 블로그(클로브·쉽다·씨밴티지·포트로직스), 관세사무소, 아하 Q&A | **높다** |
| `해외직구 150달러 관세` | 개인 애드센스 정보 블로그 5곳 이상. 관세청 공식 페이지는 1페이지에 없다 | **낮다** |

**결론: 우리 승산은 일반 소비자 키워드가 아니라 실무자 키워드에 있다.**

- **일반 소비자 키워드**(해외직구·예금자보호·환전 꿀팁)는 정보 블로그가 이미 포화다.
  이들은 SEO만 노리고 양산하며 도메인도 오래됐다. 신규 도메인이 뚫기 가장 어려운 레드오션이다.
- **실무자 키워드**(인코텀즈·HS코드·신용장·원산지증명서·B/L)는 상대가 **기업 블로그**다.
  수가 적고, 자사 제품 홍보가 목적이라 설명이 얕다. **우리 글이 실제로 더 깊다.**

이 판단은 기사 두 개 표본에서 나온 것이다. 확정된 전략이 아니라 **다음에 검증할 가설**로 다룬다.

## 지금 우리를 찾을 수 있는 검색어 (2026-08-26)

**두 종류로 갈린다. 섞어 판단하지 말 것.**

### ① 브랜드·고유명 — 경쟁이 없다. 색인만 되면 뜬다. **색인 진단용으로 쓴다.**

```
도토리경제 · dotoriecon · 도토리 창고 · 도토리 숲 · 용어 도토리
토리의 갈림길 · 도토리 광장 · 숫자를 다루는 방법 · 블로그 지도
매일 아침 7시, 새 도토리가 올라옵니다
```

창고 도구는 페이지마다 이름이 다르므로 그대로 검색하면 된다
(`용어 도토리`=사전 · `토리의 갈림길`=주간 갈림길 · `도토리 광장`=게시판 ·
`숫자를 다루는 방법`=방법론 · `도토리경제 무료 이미지 나눔`=그림함).

**색인 범위 진단**: `site:dotoriecon.com` (전체) · `site:dotoriecon.com/posts/` (기사만).

> **⚠️ `site:` 결과, 특히 경로 지정은 근거로 삼기 전에 의심할 것.**
> 세션의 웹 검색 도구는 `site:` 를 아예 처리하지 못했고(8/26 오진),
> **네이버는 하위 경로(`/posts/`) 지정을 제대로 처리하지 못한다**(8/26 확인:
> `/posts/` 0건이 떴지만 같은 화면의 `/category/` 결과 설명이 기사 본문에서 나왔다).
> **정본은 각 엔진의 웹마스터 도구다**(Search Console · 서치어드바이저).
> 낱장 색인이 궁금하면 **기사 제목을 통째로** 검색하는 편이 확실하다.

**2026-08-26 확인 결과**
- **구글**: 홈·`/method/`·`/contact/`·`/privacy/`·`/glossary/` 색인, 파비콘 표시. **기사도 색인 확인됨.**
- **네이버**: 홈·`/forest/`·`/glossary/`·`/category/` 색인. **`/forest/` 에 토리 썸네일이 붙었다.**
  **기사 낱장은 아직 색인 안 됨**(제목 통째 검색으로 확인. 8/26 갈림).
  네이버는 새 외부 사이트의 웹문서 수집이 느리다. **IndexNow 는 「알림」이지 색인 보장이 아니다.**
  → 서치어드바이저 **요청 → 웹 페이지 수집**으로 기사 URL 을 직접 밀어 준다.
  순서는 아래 「색인 요청 우선순위」와 같다(1일차 실무자 키워드 10편부터).
  **목록을 줄 때는 반드시 실제 HTTP 200 을 확인하고 줄 것** — 앞서 404 인 `/category/` 가
  네이버에 제출된 일이 있다.

### ② 기사 본문을 찾으려면 — 제목을 통째로

우리만 쓴 문장이라 경쟁이 0이다.

```
홍콩이라는 항구 반도체 수출 지도의 우회로
9,115에서 5,594까지 코스피 한여름 폭락의 복기
FOB와 CIF 견적서의 세 글자가 바꾸는 것들
```

### ③ 아직 안 나오는 것 — 그리고 지금은 그게 정상이다

```
FOB CIF 차이 · HS코드 · 관세 환급 · 해외직구 150달러
```

도메인 나이와 **외부 링크 0개** 탓에 색인이 됐어도 1페이지에 못 올라간다.
**여기가 남은 병목이고, 브랜드 검색이 잘 뜬다고 해서 이 칸이 나아진 것은 아니다.**

## 색인 요청 우선순위 (소유주 작업)

구글 Search Console 의 URL 검사 → 색인 요청은 **하루 약 10건** 제한이 있다.
107편을 다 요청할 수 없으므로 순서가 중요하다.

**원칙: 허브를 먼저.** 구글이 홈과 목록 페이지를 색인하면 내부 링크를 타고 나머지를 스스로 발견한다.
낱장부터 넣으면 그 발견 경로가 안 생긴다.

### 0일차 — 허브 7개 (가장 먼저)

```
https://dotoriecon.com/
https://dotoriecon.com/forest/
https://dotoriecon.com/glossary/
https://dotoriecon.com/category/trade/
https://dotoriecon.com/category/tariff/
https://dotoriecon.com/category/money/
https://dotoriecon.com/category/basics/
```

### 1일차 — 실무자 키워드 10편 (승산 최고)

```
/posts/fob-vs-cif/                    FOB CIF 차이
/posts/incoterms-2020-guide/          인코텀즈 2020
/posts/hs-code-basics/                HS코드
/posts/letter-of-credit-basics/       신용장 L/C
/posts/fta-origin-certificate/        FTA 원산지증명서
/posts/bill-of-lading-basics/         선하증권 B/L
/posts/import-duty-calculation/       수입 관세 계산
/posts/duty-drawback-basics/          관세 환급
/posts/export-process-a-to-z/         수출 절차
/posts/dp-da-collection-basics/       D/P D/A 추심결제
```

### 2일차 — 실무자 키워드 10편

```
/posts/ocean-freight-explained/       해상운임 FCL LCL
/posts/container-teu-cbm/             TEU CBM
/posts/bonded-area-basics/            보세구역
/posts/tariff-types-explained/        관세의 종류
/posts/antidumping-duty-basics/       반덤핑관세
/posts/trade-insurance-basics/        무역보험
/posts/fx-hedge-basics/               환헤지 선물환
/posts/exchange-rate-quotes/          매매기준율 전신환 현찰
/posts/trade-balance-vs-current-account/  무역수지 경상수지 차이
/posts/tariff-who-pays/               관세 부담
```

### 3일차 — 일반·금융 10편 (경쟁이 세지만 등록은 해 둔다)

```
/posts/overseas-direct-purchase-tax/  해외직구 150달러
/posts/deposit-insurance-100m/        예금자보호 1억
/posts/cofix-explained/               코픽스
/posts/fx-deposit-basics/             외화예금
/posts/deposit-special-rates/         정기예금 금리
/posts/dollar-index-explained/        달러인덱스 DXY
/posts/import-price-and-inflation/    수입물가
/posts/base-rate-vs-market-rate/      기준금리 국고채
/posts/hbm-explained/                 HBM
/posts/ai-semiconductor-map/          AI 반도체 용어
```

### 4일차 — 나머지 (뉴스형·자체 관점, 검색보다 재방문용)

`semi-*` · `krw-1400-three-signals` · `memory-stocks-summer` · `seoul-fx-market-day` ·
`shareholder-return-two-roads` · `tori-galimgil-01` · `semi-export-*` 등.

### 절차

1. https://search.google.com/search-console → 속성 `dotoriecon.com`
2. 상단 **URL 검사** 칸에 주소를 붙여넣고 Enter
3. 「URL이 Google에 등록되어 있지 않음」이 뜨면 → **색인 생성 요청**
4. 하루 한도에 걸리면 다음 날 이어서

**네이버도 같이**: https://searchadvisor.naver.com → 사이트 → **요청 → 웹 페이지 수집**.

네이버 제출 현황 (2026-08-26 기준)
- 사이트맵 `sitemap-index.xml`·`pack-images.xml` — **제출 완료(8/24)**
- 웹 페이지 수집 — 허브 8건·기사 10건 **요청 완료(8/26)**
- **RSS `rss.xml` — 제출 완료(8/24 06:28:47).** 기사 40편을 담고 있고 새 글이 자동으로 실린다.

### 네이버 대조군 실험 (2026-08-26 진행 중)

**8/26 수집 요청 뒤 기사 `fob-vs-cif` 가 네이버에 떴다.** 아침에는 안 떴다.
**다만 원인이 둘로 갈린다**: ①같은 날 IndexNow 168건 제출(기사 40편 전부) ②수집 요청 10편.

작업 순서 덕에 **대조군이 우연히 생겼다.**

| | 편수 | 받은 것 |
|---|---|---|
| 처치군 | 10편 | IndexNow + 수집 요청 |
| **대조군** | **30편** | **IndexNow 만** |

**★ 30편을 손으로 넣지 말 것.** 넣으면 대조군이 사라지고, **매일 새 기사마다 손으로
넣어야 하는지 영영 모르게 된다.**

**판정법**: 하루쯤 뒤 대조군에서 한 편을 네이버에 제목으로 검색한다.
예: 「같은 무게, 2.7배 가격…반도체 수출 단가의 마법」(`semi-export-unit-value`).

- **뜨면** → 사이트맵·RSS·IndexNow 로 자동 수집된다. 손댈 필요 없다.
- **안 뜨면** → 수집 요청이 필요하다. 나머지 30편을 넣고, **매일 발행분도 손으로 넣어야
  하므로 상시 운영에 절차를 추가**한다.

**대조군 30편** (2026-08-26 전부 HTTP 200 확인, 우선순위 순)

```
ocean-freight-explained · container-teu-cbm · bonded-area-basics · tariff-types-explained
antidumping-duty-basics · trade-insurance-basics · fx-hedge-basics · exchange-rate-quotes
trade-balance-vs-current-account · tariff-who-pays · overseas-direct-purchase-tax
deposit-insurance-100m · cofix-explained · fx-deposit-basics · deposit-special-rates
dollar-index-explained · import-price-and-inflation · base-rate-vs-market-rate
hbm-explained · ai-semiconductor-map · krw-1400-three-signals · semi-equipment-imports
semi-export-by-country · semiconductor-export-engine · semi-export-unit-value
shareholder-return-two-roads · tori-galimgil-01 · memory-stocks-summer
semi-import-paradox · seoul-fx-market-day
```

주소는 `https://dotoriecon.com/posts/<슬러그>/` 형식이다.
**목록을 소유주에게 줄 때는 반드시 실제 HTTP 200 을 확인하고 줄 것**
(앞서 404 인 `/category/` 가 네이버에 제출된 일이 있다).
한국 검색 트래픽에서 네이버 몫이 크고, 신규 도메인은 구글보다 네이버가 빠를 때가 있다.

## 색인 알림 — 자동화되는 절반 (IndexNow, 2026-08-26 신설)

**구글은 색인 요청을 API로 열어 두지 않는다.** 확인한 사실이다.

| 구글 API | 무엇이 되나 | 우리에게 |
|---|---|---|
| URL Inspection API | 색인 **상태 조회**만 (하루 2,000건) | 요청 불가 |
| Indexing API | **JobPosting·BroadcastEvent 두 종류만** 공식 지원 | 일반 기사는 대상 밖 |

일반 기사를 Indexing API 에 넣는 우회가 돌아다니지만, 공식 지원 밖이라 구글이 무시하거나
후순위로 돌린다. **통과시키려고 가짜 채용공고 구조화 데이터를 심는 것은 스팸 정책 위반이다.
하지 않는다.** 구글 쪽은 사람이 Search Console 버튼을 누르는 수밖에 없다.

**반면 네이버·Bing·Yandex 는 IndexNow 프로토콜을 받는다**(네이버는 2023년 7월부터).
한국 검색 트래픽에서 네이버 몫이 크므로, 자동화되는 이쪽 절반은 확실히 해 둔다.

```bash
npm run indexnow                        # 오늘 KST 기준 새로 발행된 기사만
node scripts/indexnow.mjs --all         # 사이트맵 전체 (최초 씨뿌리기, 빌드 후)
node scripts/indexnow.mjs --dry         # 보내지 않고 목록만
node scripts/indexnow.mjs --print-curl  # 이 컨테이너용(node fetch 가 프록시에 막힌다)
```

**인증은 비밀키가 아니라 공개 파일이다.** `public/<키>.txt` 를 사이트에 올려 두면
검색엔진이 그 파일을 읽어 도메인 소유를 확인한다. **그래서 이 키는 커밋해야만 동작한다.**
파일명과 내용이 같아야 하며, 스크립트가 시작할 때 그 둘을 대조한다.

**최초 씨뿌리기 이력**: 2026-08-26, 사이트맵 전체 168건 제출 → **HTTP 202**.
(202 = 받았고 키를 확인하는 중) 이후로는 신규 발행분만 매일 자동으로 나간다.

**CI 연결**: `deploy.yml` 의 `색인 알림` job 이 매일 아침 배포 뒤에 그날 발행분을 제출한다.
키 파일이 정본 도메인에 실제로 떠 있어야 통과하므로 최대 5분간 확인하며 기다린다.
`continue-on-error: true` 다. 색인 알림이 실패해도 그날 발행은 이미 끝났으므로 배포를 물들이지 않는다.

## 사이트맵 `lastmod` (2026-08-26 추가)

이전 사이트맵에는 `<loc>` 만 있었다. 크롤러가 「이 페이지가 언제 바뀌었나」를 알 방법이 없으면
재방문 일정을 세우지 못한다. `astro.config.mjs` 의 `serialize` 에서 기사마다 `<lastmod>` 를 넣는다.

- 날짜는 **git 이 기록한 마지막 커밋 시각**을 쓴다.
  파일 mtime 은 CI 체크아웃 때 전부 오늘로 덮여 쓸모가 없고, `pubDate` 는 보강해도 안 바뀌어 거짓말이 된다.
- `changefreq`·`priority` 는 **넣지 않는다.** 구글이 무시한다고 공식적으로 밝혔다.
- 얕은 클론이라 git 이력이 없으면 `lastmod` 없이 내보낸다. 틀린 날짜보다 없는 편이 낫다.

## 소제목이 검색 결과에 실린다 (2026-08-26 확인)

기사 `fob-vs-cif` 가 검색 결과에 뜰 때 **본문 소제목이 「섹션 이동 칩」으로 함께 노출된다**
(두 조건의 핵심 차이 · 견적 비교는 이렇게 · 컨테이너 시대의 각주, FCA와 CIP …).

- 검색엔진이 우리 **소제목 구조를 제대로 읽었다**는 뜻이다.
- 결과가 차지하는 세로 폭이 커져 **클릭률에 유리**하고, 독자가 원하는 절로 바로 들어온다.
- **소제목을 성실히 다는 편집 규칙이 값을 했다.** 계속 유지할 것.
  (반대로 「## 오늘의 결론」 같은 상투적 소제목은 이 자리에서도 손해다.)

*2026-08-26 확인: **네이버 화면**이다. 네이버도 소제목을 섹션 칩으로 노출한다.*

## 아직 손대지 않은 것

- **구글 색인.** 프로토콜상 자동화가 불가능하다. 소유주가 Search Console 에서 눌러야 한다.
- **외부 링크 0개.** 색인이 되어도 순위를 올릴 근거가 없다. 지금 가장 큰 빈칸이다.
- **외부 채널 0개.** 네이버 블로그·브런치·스레드 어디에도 재배포 동선이 없다.
- **검색 수요 조사가 표본 2개.** 위의 「실무자 키워드가 승산」은 가설이지 결론이 아니다.

## 무엇을 보고 판단하나

`docs/analytics.md` 의 확인처 세 곳(Vercel·Search Console·Supabase)이 그대로 판정 기준이다.
**색인 성공의 첫 신호는 방문자가 아니라 Search Console 의 「노출수」다.**
노출수가 0에서 벗어나면 문이 열린 것이고, 클릭이 0이면 제목·설명을 손볼 자리다.
