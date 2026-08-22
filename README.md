# 무역토리 (TradeTory)

> 거래가 있는 곳에, 토리가 갑니다.

무역·환율·금리·시장의 숫자를 매일 줍는 데이터 브리핑 블로그. 다람쥐 이코노미스트 **토리**가
공식 데이터를 차트 한 장과 세 줄 요약으로 전합니다.

## 스택

- [Astro](https://astro.build) + MDX — 정적 사이트
- Pagefind — 사이트 내 검색 (빌드 후 생성)
- GitHub Pages — 배포 (`.github/workflows/deploy.yml`)

## 개발

```bash
npm install
npm run dev        # 로컬 미리보기
npm run build      # dist/ 빌드 (+ pagefind 색인)
npm run fetch-data # ECOS_API_KEY 설정 시 지표 갱신
```

## 콘텐츠 작성

`src/content/posts/*.mdx` — frontmatter 필수 필드는 `src/content.config.ts` 참고.
기사 포맷: **세 줄 요약(무슨 일/왜 중요/다음 체크) → 결론형 제목의 차트 → 본문 → 토리의 한 마디**.

- 카테고리: `money`(돈의 흐름) · `tariff`(관세·통상) · `trade`(수출입 리포트) · `basics`(상식 사전)
- 편집 원칙과 세계관: `docs/worldview.md`

## 배포 (GitHub Pages)

1. 저장소 **Settings → Pages → Source: GitHub Actions** 선택
2. (선택) **Settings → Secrets → Actions**에 `ECOS_API_KEY` 등록 — 평일 아침 지표 자동 갱신
3. 워크플로가 푸시/스케줄마다 빌드·배포

주소: `https://aijhmin1031-eng.github.io/blog.tradinfo-tory/` (커스텀 도메인 연결 시
`astro.config.mjs`의 `site`/`base` 수정)
