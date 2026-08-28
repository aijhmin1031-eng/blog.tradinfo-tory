# CLAUDE.md — 도토리경제(Dotori Economy) 작업 규칙

한국어 경제·무역 데이터 블로그. 다람쥐 애널리스트 **토리**가 환율·금리·관세·수출입 숫자를 매일 전한다.
목표: 트래픽 → 구글 애드센스 수익 → 장기적으로 마케팅 채널.
라이브: https://aijhmin1031-eng.github.io/blog.tradinfo-tory/ (GitHub Pages, Actions 배포)

**이어서 작업하기 전에 반드시 `docs/worklog.md`(작업일지·현재 상태·미결 사항)를 읽을 것.**
**작업은 일지에 기록하면서 진행할 것(소유주 지시)** — 의미 있는 작업 단위마다 `worklog.md`의 일지·현재 상태·미결 사항을 갱신해 같은 커밋에 포함한다. 일지 없는 작업 커밋 금지.

## 절대 규칙 (소유주 지시 — 위반 금지)

1. **허접한 요소 하나도 금지.** 디자인·문구·데이터 전부. 어중간하면 만들지 말 것.
2. **검증 가능한 수치만.** 모든 숫자는 API·공식 통계에서 가져오고 출처·기준 시점을 명기한다. 지어낸 통계가 발견되면 기사를 삭제한다(전례 있음).
3. **격식체.** 구어체 금지. 독자 호칭(여러분 등) 금지. 어절 단위 줄바꿈(`word-break: keep-all`).
   **긴 대시(—) 금지**(소유주 지시, 2026-08-23): 제목은 말줄임표(…, 신문 헤드라인 관행), 본문은 마침표·쉼표·콜론으로. 나열 연결은 가운뎃점(·).
4. **전혀 AI스럽지 않게.** AI풍 베이지 색감·상투적 문구 금지. 종이 신문의 격조.
5. 캐릭터 토리: **매우 전문가스러운** 다람쥐(네이비 조끼+둥근 안경). 꼬리 강조하지 않음. 토리의 관점은 toriNote/토리의 노트로만.
6. 색 규약: 상승=빨강(`--up`), 하락=파랑(`--down`) — 한국 금융 관례. 브랜드 네이비 #1E3A5F, 액센트 #B4552D.
7. 글자만 나열하지 말 것 — 기사마다 요점 카드·차트·이미지로 시각화. 차트는 주요 지점에 점+수치 라벨.
8. **인용 가능성 3종**(소유주 지시, 2026-08-26): **두괄식 리드**(본문 첫 문단에 결론 수치) ·
   **핵심 발견 소제목 하나만 수치형**(나머지 소제목은 지금 톤 유지) · **표 최소 1개**(비교 축 둘 이상, 단위 붙여서).
   게이트가 **신규 기사에는 실패로** 건다. **전면 목록화는 하지 않는다** — 불릿은 가장 AI스러운 형식이고,
   불릿은 사실을 담지만 우리를 남과 가르는 **검정 문단은 줄글에만 담긴다**. 상세는 `docs/operations.md` 「4. 인용 가능성 3종」.

## 구조 한눈에

- Astro 5 정적 사이트. base `/blog.tradinfo-tory`, site `https://aijhmin1031-eng.github.io`
- 기사: `src/content/posts/*.mdx` — frontmatter에 three(세 줄 요약)/toriNote/dataAsOf/chart/topics/topicRole
- **주 7일 발행 + 예약 발행**: pubDate가 KST 오늘 이후인 글은 빌드에서 제외(`lib/site.ts isPublished`) — 미래 일자로 미리 써 두면 그날 아침 빌드가 자동 발행한다
- **하루 발행량 = 일반 기사 1편 + 특집 기사 1편**(소유주 지시, 2026-08-22부터). 특집 기사는 `topics`+`topicRole` 태그로 허브에 자동 입고
- 컴포넌트: `KeyStat`(큰 수치) `PointCards`(아이콘 요점 카드) `LineChart`(마크·라벨 차트) `Term`(용어 메모 칩) `Spark`(고저 라벨 스파크라인) `CorpPanel` `TradePanel` `Ticker`(기준일 고정 칩)
- 용어 사전: `src/lib/glossary.ts` + `src/lib/pictograms.ts` → 본문 `<Term t="용어" />`, `/glossary/` 페이지 자동
- 특집: `src/lib/topics.ts` 등록부 → 내비 드롭다운·`/topics/` 인덱스 자동. **개설·유지 기준은 `docs/topics-standard.md` 필수 준수**
- 내비는 **4슬롯 고정**(오늘의 도토리 · 도토리 숲▾ · 도토리 창고▾ · 소개) — 읽을거리는 숲, 도구는 창고 아래로.
  **읽을거리·도구를 늘릴 때는 항목을 늘리지 말고 드롭다운이 흡수한다.** 소개만 예외로 최상위에 둔다
  (2026-08-27 소유주 지시 — 「누가 쓰는가」는 처음 온 독자와 심사자가 가장 먼저 찾는 자리다).
  숲 착지는 `/forest/`, 창고 착지는 `/warehouse/`. **다섯 칸째는 안 된다** — 390px 에서 4칸이 355px 라
  여유가 35px 뿐이다(여백을 12px 로 줄여 맞춘 값이다).
- 데이터 파이프라인(매일 아침 KST 06:50 자동, `npm run pipeline`):
  `collect.mjs`(ECOS·FRED 지표) → `corp.mjs`(주식시세·DART 공시) → `trade.mjs`(관세청 국가·품목별) → `brief.mjs`(아침 브리핑 발행)
  산출: `data/series/*.json`(장기 축적, git이 이력) + `src/data/*.json`(화면 바인딩) — CI가 커밋백
- 배포는 이중: GitHub Pages(정본) + Vercel 병행(`astro.config.mjs`가 VERCEL env로 base 분기, Vercel 사본은 도메인 연결 전까지 noindex)
- Supabase 프로젝트 `tradetory`(서울, 무료 티어): 뉴스레터 구독·조회수·갈림길 채점 아카이브. 클라이언트 설정은 `src/lib/supabase.ts`(anon 키는 공개용 설계, 쓰기는 RPC·엣지 함수만). 갈림길 채점 기록은 `galimgil_scores` 테이블(절차는 worklog 8/23 일지)
- **영문판 `/en/`**(2026-08-26 개설): 한글판 미러가 아니라 **「데이터 데스크」**다. 중심은 `/en/tracker/`(관세청 HS 8542 국가별, 매일 자동 갱신). 원고는 `src/content/posts-en/`(컬렉션 `postsEn` — **일부러 갈랐다**), 조판은 `layouts/PostEn.astro`, 문자열·색 규약은 `src/lib/i18n.ts`. **영문만 상승=초록·하락=빨강**(서구 관례), **em dash 허용**(한글 조판 규칙이므로). 기준 정본은 **`docs/english-edition.md`**. **발행은 한글과 같은 아침 한 번**(2026-08-28 소유주 결정 — ET 오전 별도 배포안은 되돌렸다)
- **기사 대표 이미지는 「편집 일러스트(등각 투영)」다**(2026-08-28 소유주 결정 — 카툰 히어로가 「유치하다」).
  네 방향을 실제로 구워 놓고 골랐다. 정본은 **`docs/hero-images.md`** 에 고정 스타일 프롬프트가 있다.
  Pollo `openai/gpt-image-2-0` · 16:9 · 1K · medium. **스타일 문장은 손대지 않고 장면만 바꾼다.**
  장면은 소재 나열이 아니라 **그 기사의 발견(대비·구조) 자체**를 옮긴다.
  **8/28 발행분부터** 적용하고 그 이전 기사는 그대로 둔다. 토리는 머리글·소개·`/story/`·그림함에 그대로 있다.
  ★ **차트를 히어로로 쓰는 안은 폐기됐다**(소유주 반려). 차트는 본문에서 `SeriesChart` 가 한다.
- 세계관: `docs/worldview.md` · 운영 절차: `docs/operations.md` · 특집 기준: `docs/topics-standard.md` · 품질 체계: `docs/quality.md` · **유입: `docs/traffic.md`** · **대표 이미지: `docs/hero-images.md`**

## 시크릿 (값을 절대 출력·커밋하지 말 것)

- 원본 보관: `aijhmin1031-eng/secret` repo의 age 암호문 (`master.env.age` 등). 마스터키는 소유주 Google Drive에만.
  사용 절차·목록은 그 repo의 README·index.md. 복호화 산출물은 `/tmp/secret-vault/`에만.
- CI 사본: GitHub Actions Secrets에 `ECOS_API_KEY` `FRED_API_KEY` `DART_API_KEY` `DATA_GO_KR_KEY` 등록 완료.
- `DATA_GO_KR_KEY` = 공공데이터포털 일반 인증키 하나로 금융위 주식시세·관세청 수출입실적 모두 사용(활용신청 승인 완료).

## 작업 방법 (이 환경의 함정 포함)

- 빌드는 **반드시 repo 디렉토리에서** `npm run build`. 커밋 전 빌드 통과 확인.
- 스크린샷 검증: dist를 `python3 -m http.server 8123`으로 서빙(scratchpad에 symlink), Playwright 스크립트는 **repo 디렉토리 안에 두고** 실행(`/opt/pw-browsers/chromium`), 데스크톱+390px 모바일 확인.
- 이 원격 컨테이너에서는 **node fetch가 프록시에 막힌다**(503/000) — 로컬 데이터 시드는 curl로. CI에서는 문제 없음.
- 이미지 생성: Pollo API(nano-banana-2), 캐릭터 일관성은 레퍼런스 이미지 URL 필수 — **정본은 repo `docs/character/`**(이미지+URL+복구 절차 README). 스크래치패드 사본은 세션과 함께 사라지므로 믿지 말 것.
  스타일 프롬프트: "Same flat vector cartoon style as the reference squirrel character (navy vest with brass buttons and golden acorn pin, gold-rimmed round glasses), clean thick outlines, flat solid colors, warm cream background… Strictly no text, no letters, no signboards, no numbers, no watermark."
  캐릭터 디테일 명세 v2는 `docs/worldview.md` 참조(2026-08-22 고도화 — 레퍼런스 교체됨, 이전 URL은 `tori-char/url_p1_v1_backup.txt`).
  생성물은 반드시 눈으로 검수(깨진 글자·색 규약 위반은 재생성). 기사 대표 이미지는 **`src/assets/hero/{slug}.jpg`** + frontmatter `hero`(경로 문자열은 `/images/hero/{slug}.jpg` 로 그대로 적는다, 파일명으로 찾는다).
- **이미지 ★ 정본은 `src/assets/` 다**(2026-08-26 전환). 그전에는 전부 `public/` 에 있어 Astro 최적화를
  통째로 우회했고, 목록 카드가 160×90 자리에 1200px 원본을 받아 홈이 1.5MB였다(지금 235KB).
  **화면에 쓰는 그림은 `<Pic>`**(`components/Pic.astro`, 리사이즈·WebP·2배 밀도), **경로 문자열이 필요하면
  `getImage()`** 로 푼다(og:image·JSON-LD). 해석기는 `lib/images.ts`(파일명 → ImageMetadata glob 지도).
  **`public/images/` 에 새 그림을 넣으면 최적화를 못 받는다** — 예외는 **그림함 원본**뿐이다(내려받기 대상).
  이미지를 옮길 때는 **빌드 통과를 믿지 말고** 산출 HTML 의 이미지 URL이 실제 파일로 있는지 전수 확인할 것
  (8/26 이동에서 8곳이 조용히 404 가 될 뻔했다).
- **CSS 함정 ★ 껍데기 클래스는 조용히 아무 일도 안 한다**(2026-08-26). 영문 기사들이 표를
  `<div class="table-scroll">` 로 감싸고 있었는데 **그 클래스가 어디에도 정의돼 있지 않았다.**
  빌드도 통과하고 화면도 그려지지만 390px 에서 표가 문서를 53px 밀어내 **페이지 전체에 가로
  스크롤**이 생겼다. 규칙은 `global.css` 의 `.prose .table-scroll`(overflow-x + min-width)이다.
  새 클래스를 쓸 때는 **정의가 실제로 있는지 grep 으로 확인**할 것.
- **★ 스코프 CSS 함정의 세 얼굴**(2026-08-26~27, 셋 다 실제로 터졌다). 부모의 스코프 CSS 는
  **자식 컴포넌트 안의 요소에 닿지 않는다.** 빌드도 통과하고 화면도 그려져서 눈으로 봐야만 안다.
  ① `X img { }` 로 자식 `<Pic>` 의 img 를 스타일 → `X :global(img)` 로(24곳 일괄 수리).
  ② **`<Pic class="foo">` 로 넘긴 클래스** → 그 클래스도 자식 스코프라 `:global(.foo)` 로 감쌀 것.
  이 구멍으로 홈 하단 토리가 180px 대신 **1,158px** 로 나왔다.
  ③ **ID 선택자도 스코프를 탄다**(`#tori-greet img`) — 88px 그림이 210px 로 나왔다.
  ④ `:global()` 을 걸어도 **크기를 안 주면** Pic 의 기본값(100%)이 먹는다 — 104px 초상이 644px 로 나왔다.
  ⑤ 컴포넌트 자신이 규칙을 들게 하는 방법(`Pic.astro` 의 `img { width:100% }`)이 가장 안전하다.
  **이 계열은 눈으로 못 잡는다 — `npm run check-images` 가 조판 29종을 실측한다**(CI 에도 붙어 있다).
- **★ 단축 margin·padding 이 `.wrap` 의 가운데 정렬을 죽인다**(2026-08-27). `.wrap` 은
  `margin: 0 auto` 인데 `.foo { margin: 34px 0 0 }` 로 덮으면 좌우가 0 이 되어 **넓은 화면에서
  본문이 왼쪽 끝에 붙는다.** 1280px 에서는 티가 안 나고 1600px 이상에서 드러난다.
  좌우는 반드시 `auto` 로 남길 것(6곳 수리). 정적 검사로 잡는 법은 worklog 8/27 일지에 있다.
- **hreflang 은 한 방향으로는 무효다**(2026-08-26). 영문 기사만 한글을 가리키고 한글은 영문을
  가리키지 않아 구글이 짝을 인정하지 않는 상태였다. 한글 기사 쪽은
  `src/pages/posts/[...slug].astro` 가 `postsEn` 에서 `translationOf` 로 짝을 찾아
  `PostLayout → Base` 의 `altPath` 로 넘긴다. 짝을 새로 만들면 **양쪽 산출 HTML 에서 둘 다
  확인**할 것.
- **Astro 함정 ★ `<script>` 안은 원시 텍스트다**(2026-08-26 사고). `<script define:vars={...}>` 본문을 `{\`...\`}` 로 감싸면 중괄호가 표현식으로 평가되지 않고 **그대로 나간다.** 결과가 「블록 하나 + 템플릿 문자열 하나」라 문법 오류도 없이 조용히 아무 일도 안 한다. 이 구멍으로 **방문 기록이 8/25 도입 이후 한 건도 안 쌓였다.** 스크립트 안에는 날 JS 를 그대로 쓸 것. **브라우저 코드는 「배포된 HTML 을 열어 실제로 실행되는지」까지 확인**해야 한다(빌드 통과는 아무것도 보장하지 않는다). 로컬 빌드는 `onVercel` 이 꺼져 정본 전용 스크립트가 아예 안 나오므로 `VERCEL=1 npm run build` 로 확인한다.
- Astro 함정: 인라인 컴포넌트는 템플릿 앞뒤 공백이 텍스트로 새어나온다(Term.astro 참고 — `</span><style>` 붙여 쓰기). JSX 속성 안의 스프레드·복잡식은 컴파일 오류를 낼 수 있으니 frontmatter에서 사전 계산.
- **★ 물결표 두 개가 취소선을 만든다**(2026-08-27 사고). MDX(GFM)는 `~텍스트~` 를 취소선으로 읽는다.
  「인하 폭이 0~1원 … kWh당 12~18원」 처럼 한 문단에 물결표가 둘이면 **그 사이 전체에 줄이 그어진다.**
  범위를 쓸 때는 `0\~1원` 처럼 이스케이프하거나 표 안에서 `0 ~ 5원` 처럼 띄어 쓸 것(띄면 안전하다).
  `node scripts/check-quality.mjs --html` 이 산출물에서 `<del>` 을 잡는다.
- **★ PDF 자료는 텍스트만 읽고 끝내지 말 것**(2026-08-27 사고). 정부 보도자료의 **핵심 수치가
  그림 안에** 있었다(광역권별 인하 폭). 텍스트만 읽고 기사를 내 숫자를 틀렸다.
  `npm i pdf-parse` 후 `new PDFParse({data}).getImage()` 로 그림을 꺼내 **눈으로 볼 것.**
  공식 그림은 인용이 가장 정확하다 — 출처를 sources 에 **별도 항목**으로 세우고 캡션에도 적는다.
- 기사 발행 체크: ⓪ **인용 3종**(두괄식 리드·수치형 소제목 1개·표 1개 — 게이트가 신규엔 실패로 건다) ① 수치 출처 대조 ② `<Term>` 칩(그 용어를 설명하는 기사 자체에는 넣지 않기, 비유적 사용 제외 / **사전에 없는 용어를 쓰면 그 기사 발행일 아침 빌드가 통째로 실패한다**) ③ PointCards 1개 ④ hero 이미지 ⑤ 특집 소속이면 `topics`+`topicRole` 태그 ⑥ 빌드·스크린샷.
- **예약분은 `npm run precheck`로 미리 터뜨려 본다**(2026-08-26 신설). 예약 기사는 평소 빌드에서 빠져 **결함이 발행일 아침에야 터진다** — 사전에 없는 `<Term>` 하나가 그날 빌드를 통째로 죽인다. 아침 점검 때 한 줄 돌릴 것.
- **다음에 손볼 기사는 목록이 아니라 `npm run audit` 이 정한다**(2026-08-26 신설). 손으로 뽑은 큐(`docs/backfill-queue.md`)는 매일 2편씩 느는 기사를 못 따라가 구멍을 냈다. 감사는 107편 전수를 매번 다시 계산하고, **게이트가 못 보는 것(수치로 주장해 놓고 반증 시도가 없는 기사)까지 본다.** 체계 전체는 `docs/quality.md` 4층 구조.
- **커밋 훅·CI가 규칙을 대신 지킨다**(2026-08-26). 훅은 옵트인(`git config core.hooksPath .githooks`), CI는 푸시마다 `품질 점검` job이 게이트 전수+`precheck`+`audit --fail-on=90`을 돈다. **CI 점검은 배포를 막지 않는다**(별도 job) — 기사 한 편의 흠으로 사이트가 멎으면 안 되므로.
- **게이트는 신규 기사에도 필수다**(2026-08-26 소유주 지적으로 명문화). 쓰기 전 `node scripts/check-quality.mjs --linkable`로 링크 대상을 고르고, 커밋 전 `node scripts/check-quality.mjs <슬러그>`를 통과시킨다. **내부 링크 0개 경고를 무시하지 말 것** — 이 구멍으로 데이터 기사 14편이 링크 없이 남았다(큐 Tier C). 상세는 `docs/operations.md` 「4. 품질 기준」.
- 커밋: 한국어 제목, 본문에 요점. 푸시하면 자동 배포(2~3분).

## 검색·수익화 상태

- Google(사이트맵 API 제출)·네이버(소유확인+사이트맵+RSS) 등록 완료. GSC 토큰은 secret vault.
- 애드센스는 **커스텀 도메인이 선행 조건** (현 주소는 하위 경로 + 루트에 별개 사이트 '소소의 작업실'이 있어 도메인 단위 심사 불가). 도메인 후보 선정 완료·구매는 소유주 보류 중 — `docs/worklog.md` 참조.
