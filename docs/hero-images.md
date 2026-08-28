# 기사 대표 이미지 — 편집 일러스트 (2026-08-28 소유주 결정)

**정본은 이 문서다.**

## 결정

소유주 지적: 「우리가 사용하는 기사 이미지가 너무 유치한거 같아.
전문가처럼 보이는 적합한 이미지로 기사를 써야겠어.」

네 방향(보도사진 웨이퍼 · 보도사진 항만 · 추상 매크로 · **편집 일러스트**)을 실제로 구워
놓고 골랐다. 소유주 선택은 **편집 일러스트(등각 투영)**다.

- **앞으로 쓰는 기사의 대표 이미지는 이 규격으로 만든다.**
- **8/27·8/28 발행분(총 32편)을 교체했다.

## 다운로드·수집 (2026-08-28 소유주 지시 — 「이미지도 다운로드 할 수 있게, 출처 포함해서 모아놓자」)

**전부 「도토리 그림함」 5탄으로 함께 올렸다.** 새 인프라를 만들지 않았다 — 그림함이 이미
낱장 페이지·다운로드 버튼·출처 조건·이미지 사이트맵을 전부 갖추고 있어서, 새 팩 볼륨 하나를
등록하는 것만으로 32장 전부가 `/pack/<슬러그>/` 로 검색·다운로드 대상이 됐다.

- `src/data/pack.ts` 의 `pIllustration`(32항목) + `PACKS` 5번째 볼륨(`key: 'illustration'`).
- 원본은 `public/images/pack-illustrations/<슬러그>.jpg`(1376×768, 기사 히어로와 동일 파일),
  정사각 썸네일은 같은 폴더 `thumb/<슬러그>.jpg`(900×900 crop).
- **1~4탄과 형식이 다르다** — 그전까지는 전부 투명 PNG였는데 5탄은 배경 있는 JPG다.
  목록 페이지(`pack.astro`)의 소개문이 「전부 투명 PNG」라고 단정하고 있었던 것을 함께 고쳤다.
- 영문판 낱장 템플릿(`en/pack/[slug].astro`)은 여전히 투명 PNG를 하드코딩한다.
  5탄엔 아직 `.en` 항목이 없어 무사하지만, 나중에 영문을 붙이면 조용히 틀린 설명이 나간다
  — 파일에 경고 주석을 남겨 뒀다.
** 소유주 지시 「그래야 블로그 스타일이 확 바뀔거 같어」.
  그 이전 기사는 그대로 둔다. 필요하면 같은 절차로 더 내려갈 수 있다.
- **★ 예외 하나: `power-tariff-by-region` 은 바꾸지 않았다.** 그 히어로는 **정부 보도자료의
  공식 그림**이고 출처로 인용한 것이다. 일러스트로 갈아 끼우면 근거가 사라진다.
  **공식 자료를 인용한 히어로는 교체 대상이 아니다.**
- **토리는 사라지지 않는다** — 머리글·소개·`/story/`·그림함에 그대로 있다.
  기사 히어로 자리에서만 물러난다.

### 왜 이 방향인가

- **전문가스러우면서 우리 것으로 읽힌다.** 보도사진은 확실히 프로답지만 어느 매체나 쓰는
  그림이라 우리를 구분해 주지 않는다. 이 일러스트는 **우리 팔레트(네이비 #1E3A5F +
  번트오렌지 #B4552D)를 그대로 입어** 기사들이 한 집안으로 보인다.
- **주제를 안 가린다.** 사진은 소재가 있어야 하는데(웨이퍼·항만), 등각 일러스트는
  관세·환율·금리 같은 추상 주제도 장면으로 옮길 수 있다.
- **AI 사진의 위험이 없다.** 포토리얼 생성물은 미묘하게 틀려도 「사진」이라 독자가 사실로
  받아들인다. 일러스트는 애초에 해석이라 그 위험이 없다.

## 만드는 법

Pollo API `openai/gpt-image-2-0`, `aspectRatio 16:9`, `resolution 1K`, `quality medium`.
(키는 secret vault. **값을 커밋·출력하지 말 것.**)

프롬프트는 **고정 스타일 문장 + 장면 한 문단**이다. 스타일 문장은 손대지 않는다.

```
Serious editorial illustration for a broadsheet financial newspaper: restrained flat
geometric shapes in isometric projection, deep navy and slate grey with a single
burnt-orange accent on a warm off-white ground, fine technical linework, architectural
and precise, understated and adult, absolutely not cartoon, no mascot, no cute
characters, no faces. No text, no letters, no numbers, no logos, no watermark.
```

**장면은 그 기사의 발견을 그림으로 옮긴다.** 소재를 나열하지 말고, 기사가 말하는
**대비나 구조 자체**를 장면으로 만든다. 실제로 쓴 것들:

| 기사 | 장면 |
|---|---|
| 장비 수입 정체 | 팹의 하역장에 **다 쌓고 멈춘 궤짝 더미**, 반대편으로는 **끝없이 이어지는 출하 행렬** |
| 국가별 수출 지도 | 부두 셋 — 하나는 배로 빽빽하고, 하나는 보통, 하나는 **배 한 척뿐** |
| 주가와 시장 | 항만 수조를 **물결 하나가 가로지르며** 정박한 배 전부를 **같은 각도로** 기울인다 |
| 사이클 신호 셋 | 계기 셋이 나란한 제어반, **세 번째만 유리가 회색으로 죽어 있다** |
| 반도체 흑자 해부 | 출하 차선은 넓고 빽빽한데 **반입 차선은 가늘다** |
| 유가 롤러코스터 | 원유 탱크 격자, **부유 지붕 높이가 제각각** |

문장 끝에 「~가 이 그림의 주제다(is the subject)」를 붙이면 모델이 대비를 살린다.

## 검수 (반드시)

1. **글자·숫자가 들어갔는지** — 들어갔으면 재생성. 생성 모델의 글자는 거의 항상 깨진다.
2. **색 규약 위반** — 상승/하락을 색으로 말하는 그림이면 한글은 상승=빨강, 영문은 상승=초록.
3. **카툰기** — 둥근 캐릭터·얼굴이 들어갔으면 재생성.
4. **여러 장을 한 번에 만들면 시트로 묶어** 한눈에 본다(`sharp` 로 2×2 합성).
5. 규격은 **1376×768**(기존 히어로와 같음), `src/assets/hero/<슬러그>.jpg`.
   frontmatter 는 `hero: '/images/hero/<슬러그>.jpg'` — 파일명으로 찾는다.

## 폐기된 방향 (되돌리지 말 것)

**데이터 시각화(차트)를 히어로로 쓰는 안**을 만들었다가 폐기했다. 도구까지 만들었는데
(`scripts/figures/hero-chart.mjs` 등, 2026-08-28 커밋 `a845987` 에 있다) 소유주가
「데이터 기반 이미지 아님」으로 확실히 반려했다. **차트는 본문에서 `SeriesChart` 가 이미
하고 있고**, 히어로 자리는 그림의 몫이다. 되살릴 이유가 생기면 그 커밋에서 꺼낼 수 있다.

## 섹션별 시각 언어 (2026-08-28 소유주 결정)

소유주 지시: 「완전 다른 컨셉과 디자인으로. 기존에 사용한 카툰 형식은 어디가 적합할까?」

**액센트만 바꾸는 안은 반려됐다.** 같은 등각 일러스트에 색만 네 가지로 두는 것은
결국 같은 그림이라 다양성이 아니다(그 시안도 실제로 구워 보고 접었다).
**조판 언어 자체를 가른다.**

### 카툰이 맞는 자리를 찾았다

카툰의 강점은 친근함·서사이고 약점은 실무자에게 유치하게 읽히는 것이다.
그러니 **독자가 초심자일 때** 맞는다. `상식 사전`의 정의가 그대로다 —
「낯선 용어와 제도를 **입문자의 눈높이로** 푼다」. 여기서 카툰은 유치한 것이 아니라
**「여기가 쉬운 입구다」라는 신호**다. 반대로 `수출입 리포트`·`관세·통상`은 HS코드·신용장으로
검색해 들어온 실무자가 닿는 자리라 정색한 톤이 필요하다.

**그림의 결이 「이건 어떤 종류의 읽기인가」를 미리 알려 준다** — 이것이 이 체계의 목적이다.

| 섹션 | 시각 언어 | 왜 이 언어인가 |
|---|---|---|
| **수출입 리포트** trade | **등각 투영 일러스트**(현행 유지) | 항만·물류·공정은 **공간의 흐름**이라 등각이 원래 맞는 자리 |
| **돈의 흐름** money | **계기·다이얼 매크로**, 어두운 바탕 | 환율·금리는 공간이 아니라 **값**이다. 정밀 기기를 가까이서, 무게감 |
| **관세·통상** tariff | **서류·도장·봉인의 평면 구성**(위에서 내려봄) | 관세는 장소가 아니라 **규칙과 서식**이다 |
| **상식 사전** basics | **토리 카툰** | 입문자 눈높이. 카툰이 제 역할을 하는 유일한 자리 |

### 프롬프트 뼈대

**trade** — 위 「만드는 법」의 고정 스타일 문장을 그대로.

**money** — 등각이 아니라 **매크로**임을 명시해야 한다(안 적으면 등각으로 돌아간다).
```
Editorial illustration for a financial newspaper, rendered as a tight macro study rather
than a wide scene: an extreme close view of a single precision brass pressure gauge and a
fine graduated dial, shallow depth of field, sitting on a near-black ground with one warm
rim light picking out the machined edges. Deep navy shadows, brushed brass, a single
burnt-orange needle. Absolutely not isometric, not a wide establishing shot.
No text, no letters, no numbers on the dial face, no logos, no watermark.
```

**tariff** — **정투상(위에서 곧장 내려봄)**을 명시한다.
```
Editorial illustration for a financial newspaper, composed as a flat top-down still life on
a desk, seen straight from above (orthographic, not isometric, no perspective): official
customs forms laid in an overlapping grid, a round rubber stamp, an ink pad, a wax seal and
a paper clip with generous white space. Warm off-white paper with subtle fibre texture, deep
navy printed rules, one burnt-orange stamp impression as the only saturated element.
The form fields are empty ruled boxes with no writing.
No text, no letters, no numbers, no logos, no watermark.
```

**basics** — 카툰. **`docs/character/` 의 레퍼런스 URL이 필수**이고 모델은 `google/nano-banana-2` 다
(캐릭터 일관성은 레퍼런스로만 유지된다).
```
Same flat vector cartoon style as the reference squirrel character (navy vest with brass
buttons and golden acorn pin, gold-rimmed round glasses), clean thick outlines, flat solid
colors, warm cream background. <장면>. Friendly and clear, the register of a good textbook
illustration. Strictly no text, no letters, no signboards, no numbers, no watermark.
```

### 알고 있어야 할 것

- **money 만 유일하게 사진풍이다.** 나머지 셋은 일러스트인데 이것만 포토리얼에 가까워서,
  네 언어를 나란히 놓으면 이질감이 생긴다. 「어두운 바탕 + 정밀 기기」가 money 를 구분하는
  힘이기도 하므로 **의도된 이질감으로 두되**, 목록 페이지에서 어색하면 이 칸을 먼저 손볼 것.
- **tariff 는 「빈 칸」이어야 한다.** 서식에 글자를 넣게 하면 깨진 글자가 나온다.
  「The form fields are empty ruled boxes with no writing」을 반드시 넣는다.
- **money·tariff 는 등각으로 되돌아가려는 경향이 있다.** 「absolutely not isometric」·
  「orthographic, not isometric」을 명시해야 유지된다.
- **소급하지 않는다.** 8/27·8/28 에 구운 32장은 전부 등각 오렌지다.
  섹션별 언어는 **그 뒤에 굽는 것부터** 적용한다.
