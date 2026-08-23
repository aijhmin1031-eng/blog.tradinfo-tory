// 도토리 그림함 등록부.
// 새 드랍은 PACKS 배열 맨 아래에 추가한다. 낱장 페이지(/pack/<slug>/)와 이미지 사이트맵이
// 이 파일 하나에서 자동 생성되므로, 여기에 없는 이미지는 검색에도 노출되지 않는다.
//
// desc 는 검색(의미 기반 포함) 대상 본문이다. 무엇을 그린 그림인지, 어디에 쓰는지,
// 어떤 형식인지를 사람이 읽는 문장으로 적는다. keywords 는 검색어 표기 변형을 담는다.

export type PackFormat = 'jpg' | 'png' | 'svg';

export type PackItem = {
  slug: string;
  name: string;
  /** 낱장 페이지 본문. 두세 문장, 검색어를 자연스럽게 품은 설명 */
  desc: string;
  /** 검색어 변형(동의어·영문·용도) */
  keywords: string[];
};

export type Pack = {
  key: string;
  vol: number;
  title: string;
  /** 목록·낱장 페이지에 쓰는 한 문단 소개 */
  note: string;
  date: string;
  /** 이미지 파일이 놓인 public 경로 */
  dir: string;
  format: PackFormat;
  /** 원본 크기 안내 문구 */
  size: string;
  /** 목록에서 '1탄' 대신 쓸 이름(초대 팩 등) */
  label?: string;
  /** 배경 투명 여부 */
  transparent: boolean;
  /** 썸네일 파일 규칙: pack1 은 <slug>-thumb.jpg, 소소 팩은 thumb/<slug>.png, SVG 는 원본 그대로 */
  thumb?: (slug: string) => string;
  /** 외부 출처가 있는 팩(소소의 작업실 등) */
  origin?: { name: string; href: string; note: string };
  items: PackItem[];
};

const p1: PackItem[] = [
  { slug: 'coin-acorn', name: '도토리와 금화', desc: '도토리 한 알 옆에 금화가 쌓여 있는 그림입니다. 저축과 자산, 작은 돈이 모이는 이야기를 다루는 글의 대표 이미지로 쓰기 좋습니다.', keywords: ['도토리', '금화', '동전', '저축', '자산', 'acorn coin'] },
  { slug: 'chart-up', name: '상승 차트', desc: '붉은 화살표가 오른쪽 위로 향하는 상승 차트입니다. 주가와 지수, 수출 실적이 오른 소식을 전할 때 씁니다. 색은 한국 금융 관례대로 상승을 빨강으로 그렸습니다.', keywords: ['상승', '차트', '그래프', '주가', '증가', '우상향', 'chart up'] },
  { slug: 'chart-down', name: '하락 차트', desc: '파란 화살표가 아래로 꺾이는 하락 차트입니다. 지수 하락, 수출 감소, 가격 조정 같은 내용에 맞춥니다. 하락은 파랑으로 그렸습니다.', keywords: ['하락', '차트', '그래프', '주가', '감소', '폭락', 'chart down'] },
  { slug: 'piggy-bank', name: '저금통', desc: '동전이 들어가는 돼지 저금통입니다. 적금과 예금, 가계 저축을 다루는 글이나 재테크 자료의 삽화로 씁니다.', keywords: ['저금통', '돼지저금통', '적금', '예금', '저축', 'piggy bank'] },
  { slug: 'banknotes', name: '지폐 다발', desc: '띠지로 묶인 지폐 다발과 동전입니다. 현금, 통화량, 급여, 자금 조달을 이야기할 때 쓰는 그림입니다.', keywords: ['지폐', '현금', '돈', '통화', '자금', 'cash money'] },
  { slug: 'gold-bars', name: '금괴', desc: '쌓여 있는 금괴 그림입니다. 금값과 안전자산, 실물 투자, 외환보유액을 다루는 글에 어울립니다.', keywords: ['금괴', '금', '골드바', '안전자산', '금값', 'gold bar'] },
  { slug: 'cargo-ship', name: '컨테이너선', desc: '컨테이너를 실은 화물선이 바다를 지나는 그림입니다. 수출입과 해상운임, 물류 흐름을 설명하는 자료에 씁니다.', keywords: ['컨테이너선', '화물선', '해운', '수출입', '물류', '무역', 'cargo ship'] },
  { slug: 'harbor-crane', name: '항만 크레인', desc: '컨테이너를 들어 올리는 항만 갠트리 크레인입니다. 항만 물동량과 통관, 하역 작업을 다루는 글의 대표 이미지로 좋습니다.', keywords: ['항만', '크레인', '부두', '컨테이너', '물동량', 'harbor crane'] },
  { slug: 'globe-routes', name: '무역 항로', desc: '지구본 위로 항로가 이어진 그림입니다. 국가 간 교역, 공급망, 글로벌 시장을 설명할 때 씁니다.', keywords: ['무역', '항로', '지구본', '글로벌', '공급망', '수출', 'trade route'] },
  { slug: 'ledger-pen', name: '장부와 만년필', desc: '펼친 장부 위에 만년필이 놓인 그림입니다. 회계와 결산, 기록과 공시를 이야기하는 글에 맞습니다.', keywords: ['장부', '회계', '결산', '만년필', '기록', '재무', 'ledger'] },
  { slug: 'abacus', name: '주판', desc: '알이 가지런한 주판입니다. 셈과 계산, 옛 상거래와 부기를 소재로 하는 글에 씁니다.', keywords: ['주판', '계산', '셈', '부기', '회계', 'abacus'] },
  { slug: 'bank-building', name: '은행', desc: '기둥이 늘어선 은행 건물입니다. 기준금리와 통화정책, 예금과 대출을 다루는 글의 삽화로 씁니다.', keywords: ['은행', '중앙은행', '금리', '대출', '예금', '금융', 'bank'] },
  { slug: 'exchange', name: '환전', desc: '두 통화가 화살표로 맞바뀌는 환전 그림입니다. 환율과 외환시장, 해외 결제를 설명할 때 씁니다.', keywords: ['환전', '환율', '외환', '달러', '통화', 'currency exchange'] },
  { slug: 'semiconductor', name: '반도체 칩', desc: '회로가 뻗어 나가는 반도체 칩입니다. 반도체 수출과 공정, 기술 산업을 다루는 글에 씁니다.', keywords: ['반도체', '칩', 'IT', '수출', '기술', '전자', 'semiconductor chip'] },
  { slug: 'scale', name: '저울', desc: '양팔 저울이 균형을 맞춘 그림입니다. 무역수지와 균형, 비교와 판단을 이야기하는 자료에 맞습니다.', keywords: ['저울', '균형', '무역수지', '비교', '공정', 'balance scale'] },
  { slug: 'lighthouse', name: '등대', desc: '바다를 비추는 등대입니다. 지표와 방향, 전망과 신호를 은유하는 글의 대표 이미지로 씁니다.', keywords: ['등대', '바다', '지표', '전망', '항로', 'lighthouse'] },
  { slug: 'tori-treasure', name: '도토리를 안은 토리', desc: '도토리경제의 마스코트 다람쥐 토리가 도토리를 안고 있는 그림입니다. 자산을 모으는 이야기나 블로그 소개에 씁니다.', keywords: ['토리', '다람쥐', '캐릭터', '마스코트', '도토리', 'squirrel'] },
  { slug: 'tori-reading', name: '공부하는 토리', desc: '책과 자료를 앞에 둔 다람쥐 토리입니다. 공부와 조사, 입문 안내를 다루는 글에 어울립니다.', keywords: ['토리', '다람쥐', '공부', '독서', '캐릭터', 'study squirrel'] },
];

const p2: PackItem[] = [
  { slug: 'full-moon', name: '보름달', desc: '구름 사이로 뜬 보름달입니다. 한가위와 추석 인사, 명절 안내문에 쓰는 벡터 그림입니다.', keywords: ['보름달', '한가위', '추석', '명절', '달', 'full moon'] },
  { slug: 'songpyeon', name: '송편', desc: '접시에 담긴 송편 세 개입니다. 추석 음식과 명절 상차림을 소개할 때 씁니다.', keywords: ['송편', '추석', '한가위', '떡', '명절음식', 'songpyeon'] },
  { slug: 'gift-bojagi', name: '보자기 선물', desc: '보자기로 묶은 명절 선물입니다. 추석 선물과 인사, 감사 표현에 쓰는 그림입니다.', keywords: ['보자기', '선물', '추석선물', '명절', '한복보', 'gift wrap'] },
  { slug: 'persimmon', name: '감', desc: '잎이 달린 잘 익은 감입니다. 가을 제철 과일과 수확, 계절 인사에 씁니다.', keywords: ['감', '홍시', '가을', '과일', '수확', 'persimmon'] },
  { slug: 'chestnut', name: '알밤', desc: '껍질을 벗은 알밤 두 알입니다. 가을 간식과 수확철 이야기에 어울립니다.', keywords: ['밤', '알밤', '가을', '견과', '수확', 'chestnut'] },
  { slug: 'acorn-trio', name: '도토리 삼형제', desc: '크기가 다른 도토리 세 알입니다. 가을 숲과 저축, 도토리경제의 상징으로 씁니다.', keywords: ['도토리', '가을', '숲', '견과', '저축', 'acorn'] },
  { slug: 'oak-leaf', name: '참나무 잎', desc: '가장자리가 물결치는 참나무 잎입니다. 가을 장식과 배경 요소로 쓰기 좋습니다.', keywords: ['참나무', '잎', '낙엽', '가을', '단풍', 'oak leaf'] },
  { slug: 'ginkgo-leaf', name: '은행잎', desc: '부채꼴로 펼쳐진 은행잎입니다. 가을 거리와 계절 변화의 장식 요소로 씁니다.', keywords: ['은행잎', '낙엽', '가을', '노란잎', 'ginkgo leaf'] },
  { slug: 'rice-sheaf', name: '벼 이삭단', desc: '끈으로 묶은 벼 이삭단입니다. 추수와 수확, 농업과 곡물 이야기에 씁니다.', keywords: ['벼', '이삭', '추수', '수확', '농사', '곡물', 'rice'] },
  { slug: 'coin-pouch', name: '복주머니', desc: '엽전이 든 복주머니입니다. 명절 세뱃돈과 복, 선물 인사에 쓰는 그림입니다.', keywords: ['복주머니', '세뱃돈', '엽전', '명절', '복', 'lucky pouch'] },
  { slug: 'lantern', name: '청사초롱', desc: '전통 청사초롱입니다. 명절 밤과 축제, 안내와 환영의 장면에 씁니다.', keywords: ['청사초롱', '초롱', '전통', '명절', '등불', 'lantern'] },
  { slug: 'yakgwa', name: '약과', desc: '꽃 모양으로 빚은 약과입니다. 전통 과자와 명절 다과상 소개에 씁니다.', keywords: ['약과', '한과', '전통과자', '명절', '다과', 'yakgwa'] },
  { slug: 'ribbon-label', name: '리본 라벨', desc: '양 끝이 접힌 리본 라벨입니다. 제목 띠나 가격표, 배너 자리에 넣어 쓰는 장식 부품입니다.', keywords: ['리본', '라벨', '배너', '띠', '장식', 'ribbon label'] },
  { slug: 'frame-round', name: '원형 프레임', desc: '도토리와 잎으로 두른 원형 프레임입니다. 사진이나 문구를 가운데 넣어 쓰는 테두리 부품입니다.', keywords: ['프레임', '테두리', '원형', '장식', '틀', 'round frame'] },
  { slug: 'corner-flourish', name: '모서리 장식', desc: '문서 모서리에 두르는 잎 장식입니다. 표지와 카드, 안내문의 네 귀퉁이에 씁니다.', keywords: ['모서리', '장식', '코너', '테두리', '카드', 'corner ornament'] },
  { slug: 'divider', name: '구분선', desc: '가운데 도토리가 놓인 구분선입니다. 글의 단락과 단락 사이를 나눌 때 씁니다.', keywords: ['구분선', 'divider', '단락', '장식선', '구획'] },
];

const soso: PackItem[] = [
  { slug: 'latte', name: '라떼 한 잔', desc: '하트가 그려진 라떼 한 잔입니다. 카페와 아침, 휴식을 소재로 하는 블로그 글과 SNS 카드에 쓰는 수채화 그림입니다.', keywords: ['라떼', '커피', '카페', '아침', '음료', '수채화', 'latte coffee'] },
  { slug: 'sketchbook', name: '스케치북', desc: '연필이 놓인 스케치북입니다. 기록과 계획, 취미와 공부를 다루는 글에 어울리는 수채화 그림입니다.', keywords: ['스케치북', '노트', '연필', '기록', '공부', '문구', 'sketchbook'] },
  { slug: 'acorns', name: '도토리 삼형제', desc: '나란히 놓인 도토리 세 알을 수채화로 그렸습니다. 가을과 저축, 작은 결실을 이야기할 때 씁니다.', keywords: ['도토리', '가을', '견과', '수채화', '저축', 'acorn'] },
  { slug: 'tart', name: '딸기 타르트', desc: '딸기를 올린 타르트 한 조각입니다. 디저트와 카페 메뉴, 소소한 기쁨을 다루는 글에 씁니다.', keywords: ['타르트', '딸기', '디저트', '베이킹', '카페', 'strawberry tart'] },
  { slug: 'teapot', name: '꽃무늬 티팟', desc: '꽃무늬가 그려진 티팟입니다. 홈카페와 티타임, 오후의 여유를 소개하는 자료에 씁니다.', keywords: ['티팟', '주전자', '홍차', '홈카페', '티타임', 'teapot'] },
  { slug: 'macaron', name: '핑크 마카롱', desc: '분홍빛 마카롱입니다. 디저트 소개와 선물, 달콤한 분위기의 카드에 씁니다.', keywords: ['마카롱', '디저트', '베이커리', '핑크', '간식', 'macaron'] },
  { slug: 'sugarcube', name: '각설탕 접시', desc: '접시에 담긴 각설탕입니다. 커피와 홍차 곁의 소품으로, 홈카페 자료에 곁들여 씁니다.', keywords: ['각설탕', '설탕', '커피', '홈카페', '소품', 'sugar cube'] },
  { slug: 'lemon', name: '레몬 슬라이스', desc: '얇게 썬 레몬 조각입니다. 음료와 상큼한 계절감을 표현하는 자료에 씁니다.', keywords: ['레몬', '슬라이스', '과일', '음료', '상큼', 'lemon slice'] },
];

export const PACKS: Pack[] = [
  {
    key: 'vol1',
    vol: 1,
    title: '돈의 물건들',
    note:
      '경제와 무역을 다루는 글에 바로 얹을 수 있는 오브젝트 18종입니다. 도토리와 금화, 상승·하락 차트, 컨테이너선과 항만 크레인처럼 ' +
      '숫자 이야기에 자주 나오는 물건들을 도토리경제의 그림체로 그렸습니다. 배경이 비어 있는 투명 PNG입니다.',
    date: '2026-08-23',
    dir: '/images/pack',
    format: 'png',
    size: '1600 × 1600 픽셀',
    transparent: true,
    thumb: (s) => `/images/pack/thumb/${s}.png`,
    items: p1,
  },
  {
    key: 'vol2',
    vol: 2,
    title: '한가위·가을 부품',
    note:
      '추석과 가을 콘텐츠에 쓰는 부품 16종입니다. 보름달과 송편, 도토리와 참나무 잎 같은 계절 오브젝트에 리본·프레임·구분선 같은 ' +
      '장식 부품을 더했습니다. 배경이 비어 있어 색이 있는 지면 위에도 흰 네모 없이 얹힙니다.',
    date: '2026-08-23',
    dir: '/images/pack2',
    format: 'png',
    size: '1600 × 1600 픽셀',
    transparent: true,
    thumb: (s) => `/images/pack2/thumb/${s}.png`,
    items: p2,
  },
  {
    key: 'soso',
    vol: 3,
    label: '특별판',
    title: '소소의 작업실 수채화',
    note:
      '자매 블로그 소소의 작업실에서 그린 수채화 오브젝트 8종을 함께 나눕니다. 라떼와 스케치북, 티팟과 마카롱처럼 ' +
      '일상과 홈카페를 담은 그림이라 경제 글뿐 아니라 어떤 블로그에도 잘 얹힙니다. 배경이 비어 있는 투명 PNG입니다.',
    date: '2026-08-23',
    dir: '/images/pack-soso',
    format: 'png',
    size: '1600 × 1600 픽셀',
    transparent: true,
    thumb: (s) => `/images/pack-soso/thumb/${s}.png`,
    origin: {
      name: '소소의 작업실',
      href: 'https://aijhmin1031-eng.github.io/freebies/',
      note: '원본 3000픽셀 파일과 더 많은 수채화 그림은 소소의 작업실 무료나눔에서 받을 수 있습니다.',
    },
    items: soso,
  },
];

export const ALL_ITEMS = PACKS.flatMap((pack) => pack.items.map((item) => ({ pack, item })));

export const fileOf = (pack: Pack, item: PackItem) => `${pack.dir}/${item.slug}.${pack.format}`;
export const thumbOf = (pack: Pack, item: PackItem) =>
  pack.thumb ? pack.thumb(item.slug) : fileOf(pack, item);
