# CLAUDE.md — 무역토리(TradeTory) 작업 규칙

한국어 경제·무역 데이터 블로그. 다람쥐 애널리스트 **토리**가 환율·금리·관세·수출입 숫자를 매일 전한다.
목표: 트래픽 → 구글 애드센스 수익 → 장기적으로 마케팅 채널.
라이브: https://aijhmin1031-eng.github.io/blog.tradinfo-tory/ (GitHub Pages, Actions 배포)

**이어서 작업하기 전에 반드시 `docs/worklog.md`(작업일지·현재 상태·미결 사항)를 읽을 것.**

## 절대 규칙 (소유주 지시 — 위반 금지)

1. **허접한 요소 하나도 금지.** 디자인·문구·데이터 전부. 어중간하면 만들지 말 것.
2. **검증 가능한 수치만.** 모든 숫자는 API·공식 통계에서 가져오고 출처·기준 시점을 명기한다. 지어낸 통계가 발견되면 기사를 삭제한다(전례 있음).
3. **격식체.** 구어체 금지. 독자 호칭(여러분 등) 금지. 어절 단위 줄바꿈(`word-break: keep-all`).
4. **전혀 AI스럽지 않게.** AI풍 베이지 색감·상투적 문구 금지. 종이 신문의 격조.
5. 캐릭터 토리: **매우 전문가스러운** 다람쥐(네이비 조끼+둥근 안경). 꼬리 강조하지 않음. 토리의 관점은 toriNote/토리의 노트로만.
6. 색 규약: 상승=빨강(`--up`), 하락=파랑(`--down`) — 한국 금융 관례. 브랜드 네이비 #1E3A5F, 액센트 #B4552D.
7. 글자만 나열하지 말 것 — 기사마다 요점 카드·차트·이미지로 시각화. 차트는 주요 지점에 점+수치 라벨.

## 구조 한눈에

- Astro 5 정적 사이트. base `/blog.tradinfo-tory`, site `https://aijhmin1031-eng.github.io`
- 기사: `src/content/posts/*.mdx` — frontmatter에 three(세 줄 요약)/toriNote/dataAsOf/chart/topics/topicRole
- **주 7일 발행 + 예약 발행**: pubDate가 KST 오늘 이후인 글은 빌드에서 제외(`lib/site.ts isPublished`) — 미래 일자로 미리 써 두면 그날 아침 빌드가 자동 발행한다
- **하루 발행량 = 일반 기사 1편 + 특집 기사 1편**(소유주 지시, 2026-08-22부터). 특집 기사는 `topics`+`topicRole` 태그로 허브에 자동 입고
- 컴포넌트: `KeyStat`(큰 수치) `PointCards`(아이콘 요점 카드) `LineChart`(마크·라벨 차트) `Term`(용어 메모 칩) `Spark`(고저 라벨 스파크라인) `CorpPanel` `TradePanel` `Ticker`(기준일 고정 칩)
- 용어 사전: `src/lib/glossary.ts` + `src/lib/pictograms.ts` → 본문 `<Term t="용어" />`, `/glossary/` 페이지 자동
- 특집: `src/lib/topics.ts` 등록부 → 내비 드롭다운·`/topics/` 인덱스 자동. **개설·유지 기준은 `docs/topics-standard.md` 필수 준수**
- 내비는 7슬롯 고정(홈·카테고리4·특집▾·도토리 창고▾) — 항목을 늘리지 말고 드롭다운이 흡수
- 데이터 파이프라인(매일 아침 KST 06:50 자동, `npm run pipeline`):
  `collect.mjs`(ECOS·FRED 지표) → `corp.mjs`(주식시세·DART 공시) → `trade.mjs`(관세청 국가·품목별) → `brief.mjs`(아침 브리핑 발행)
  산출: `data/series/*.json`(장기 축적, git이 이력) + `src/data/*.json`(화면 바인딩) — CI가 커밋백
- 세계관: `docs/worldview.md` · 운영 절차: `docs/operations.md` · 특집 기준: `docs/topics-standard.md`

## 시크릿 (값을 절대 출력·커밋하지 말 것)

- 원본 보관: `aijhmin1031-eng/secret` repo의 age 암호문 (`master.env.age` 등). 마스터키는 소유주 Google Drive에만.
  사용 절차·목록은 그 repo의 README·index.md. 복호화 산출물은 `/tmp/secret-vault/`에만.
- CI 사본: GitHub Actions Secrets에 `ECOS_API_KEY` `FRED_API_KEY` `DART_API_KEY` `DATA_GO_KR_KEY` 등록 완료.
- `DATA_GO_KR_KEY` = 공공데이터포털 일반 인증키 하나로 금융위 주식시세·관세청 수출입실적 모두 사용(활용신청 승인 완료).

## 작업 방법 (이 환경의 함정 포함)

- 빌드는 **반드시 repo 디렉토리에서** `npm run build`. 커밋 전 빌드 통과 확인.
- 스크린샷 검증: dist를 `python3 -m http.server 8123`으로 서빙(scratchpad에 symlink), Playwright 스크립트는 **repo 디렉토리 안에 두고** 실행(`/opt/pw-browsers/chromium`), 데스크톱+390px 모바일 확인.
- 이 원격 컨테이너에서는 **node fetch가 프록시에 막힌다**(503/000) — 로컬 데이터 시드는 curl로. CI에서는 문제 없음.
- 이미지 생성: Pollo API(nano-banana-2), 캐릭터 일관성은 레퍼런스 이미지 URL 필수(스크래치패드 `tori-char/url_p1.txt`; 유실 시 기존 이미지로 재업로드).
  스타일 프롬프트: "Same flat vector cartoon style as the reference squirrel character (navy vest with brass buttons and golden acorn pin, gold-rimmed round glasses), clean thick outlines, flat solid colors, warm cream background… Strictly no text, no letters, no signboards, no numbers, no watermark."
  캐릭터 디테일 명세 v2는 `docs/worldview.md` 참조(2026-08-22 고도화 — 레퍼런스 교체됨, 이전 URL은 `tori-char/url_p1_v1_backup.txt`).
  생성물은 반드시 눈으로 검수(깨진 글자·색 규약 위반은 재생성). 기사 대표 이미지는 `public/images/hero/{slug}.jpg` + frontmatter `hero`.
- Astro 함정: 인라인 컴포넌트는 템플릿 앞뒤 공백이 텍스트로 새어나온다(Term.astro 참고 — `</span><style>` 붙여 쓰기). JSX 속성 안의 스프레드·복잡식은 컴파일 오류를 낼 수 있으니 frontmatter에서 사전 계산.
- 기사 발행 체크: ① 수치 출처 대조 ② `<Term>` 칩(그 용어를 설명하는 기사 자체에는 넣지 않기, 비유적 사용 제외) ③ PointCards 1개 ④ hero 이미지 ⑤ 특집 소속이면 `topics`+`topicRole` 태그 ⑥ 빌드·스크린샷.
- 커밋: 한국어 제목, 본문에 요점. 푸시하면 자동 배포(2~3분).

## 검색·수익화 상태

- Google(사이트맵 API 제출)·네이버(소유확인+사이트맵+RSS) 등록 완료. GSC 토큰은 secret vault.
- 애드센스는 **커스텀 도메인이 선행 조건** (현 주소는 하위 경로 + 루트에 별개 사이트 '소소의 작업실'이 있어 도메인 단위 심사 불가). 도메인 후보 선정 완료·구매는 소유주 보류 중 — `docs/worklog.md` 참조.
