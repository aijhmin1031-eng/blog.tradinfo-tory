# 유입 — 독자는 어디서 오나

> 2026-08-26 신설 (소유주 지적: "우리 아직 독자없어").
> 품질 체계를 네 층으로 쌓아 두고 정작 읽는 사람이 없으면,
> 아무도 안 보는 곳간 문에 자물쇠를 세 개 단 셈이다. 그 자리를 이 문서가 맡는다.

## 지금 상태 (2026-08-26 실측)

| 확인한 것 | 결과 | 뜻 |
|---|---|---|
| 구글 `site:dotoriecon.com` | **0건** | 색인 자체가 안 됐다 |
| Supabase `visit_summary(30)` | **빈 배열** | 30일간 방문 기록 0건 |
| 도메인 나이 | **이틀** (8/24 취득) | 새 도메인은 색인에 며칠~몇 주 |
| 사이트맵 | 168 URL (기사 40·용어 43) | 정상 |
| `robots.txt` | 전면 허용 + Yeti 명시 + 사이트맵 2건 | 정상 |
| canonical · OG | 정본 도메인으로 정상 | 정상 |
| JSON-LD | Article · BreadcrumbList · Organization · Person · WebPage | 정상 |
| Vercel Analytics 스크립트 | HTTP 200 | 켜져 있다 |

**막힌 곳은 우리 쪽이 아니다.** 기술은 흠이 없고, 글도 107편 있다.
색인이 안 됐으므로 **검색으로 들어올 경로가 물리적으로 존재하지 않는다.**
지금 방문자 0은 글이 나빠서가 아니라 문이 아직 안 열려서다.

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

**네이버도 같이**: https://searchadvisor.naver.com → 사이트 → **웹 페이지 수집**에 같은 주소를 넣는다.
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

## 아직 손대지 않은 것

- **구글 색인.** 프로토콜상 자동화가 불가능하다. 소유주가 Search Console 에서 눌러야 한다.
- **외부 링크 0개.** 색인이 되어도 순위를 올릴 근거가 없다. 지금 가장 큰 빈칸이다.
- **외부 채널 0개.** 네이버 블로그·브런치·스레드 어디에도 재배포 동선이 없다.
- **검색 수요 조사가 표본 2개.** 위의 「실무자 키워드가 승산」은 가설이지 결론이 아니다.

## 무엇을 보고 판단하나

`docs/analytics.md` 의 확인처 세 곳(Vercel·Search Console·Supabase)이 그대로 판정 기준이다.
**색인 성공의 첫 신호는 방문자가 아니라 Search Console 의 「노출수」다.**
노출수가 0에서 벗어나면 문이 열린 것이고, 클릭이 0이면 제목·설명을 손볼 자리다.
