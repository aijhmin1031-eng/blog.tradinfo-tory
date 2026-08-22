# 토리 캐릭터 레퍼런스 (인수인계용 정본)

이미지 생성(Pollo nano-banana-2)의 캐릭터 일관성은 **레퍼런스 이미지 URL**로 유지한다.
스크래치패드는 세션마다 사라지므로, 이 디렉토리가 **정본 보관소**다.

| 파일 | 내용 |
|---|---|
| `tori-ref-v2.jpg` | 현행 기본 레퍼런스 (v2, 2026-08-22 고도화 — 연필) |
| `ref-url-v2.txt` | v2의 Pollo CDN URL — 생성 스크립트의 `images:[REF]`에 그대로 사용 |
| `tori-ref-v3-pen.jpg` | v3 후보 (만년필) — 기사 50편 마일스톤 + 소유주 승인 후 교체용 |

## 새 세션에서의 사용법
1. `ref-url-v2.txt`의 URL이 살아 있으면 그대로 REF로 사용.
2. URL이 만료됐으면 `tori-ref-v2.jpg`를 Pollo 생성 요청의 참조 이미지로 재업로드해 새 URL 확보
   (기존 절차: 이미지를 입력으로 한 번 생성하면 응답의 CDN URL을 재사용 가능).
3. v3 전환 시(50편 + 승인): `tori-ref-v3-pen.jpg`로 같은 절차, worldview.md 디테일 명세 v3 기록.

디테일 명세·스타일 프롬프트는 `docs/worldview.md`와 루트 `CLAUDE.md` 참조.
