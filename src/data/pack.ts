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
  /**
   * 영문판(/en/pack/) 원고. **있는 항목만** 영문 페이지가 생긴다(2026-08-26 신설).
   * 기계번역으로 전량을 뿌리면 구글 scaled content abuse 에 걸린다 — 골라서 직접 쓴다.
   */
  en?: { name: string; desc: string; keywords: string[] };
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
  { slug: 'coin-acorn', name: '도토리와 금화', desc: '도토리 한 알 옆에 금화가 쌓여 있는 그림입니다. 저축과 자산, 작은 돈이 모이는 이야기를 다루는 글의 대표 이미지로 쓰기 좋습니다.', keywords: ['도토리', '금화', '동전', '저축', '자산', 'acorn coin'], en: { name: "Acorn and gold coins", desc: "An acorn beside a small stack of gold coins. Suited to pieces on saving, compounding, and how small amounts accumulate over time.", keywords: ["acorn", "gold coin", "savings", "money illustration", "finance icon"] } },
  { slug: 'chart-up', name: '상승 차트', desc: '붉은 화살표가 오른쪽 위로 향하는 상승 차트입니다. 주가와 지수, 수출 실적이 오른 소식을 전할 때 씁니다. 색은 한국 금융 관례대로 상승을 빨강으로 그렸습니다.', keywords: ['상승', '차트', '그래프', '주가', '증가', '우상향', 'chart up'], en: { name: "Rising chart", desc: "A red arrow climbing to the right across a bar chart. Use it for gains in share prices, indices or export figures. The colour follows Korean market convention, where red marks a rise.", keywords: ["rising chart", "uptrend", "growth arrow", "stock chart", "finance illustration"] } },
  { slug: 'chart-down', name: '하락 차트', desc: '파란 화살표가 아래로 꺾이는 하락 차트입니다. 지수 하락, 수출 감소, 가격 조정 같은 내용에 맞춥니다. 하락은 파랑으로 그렸습니다.', keywords: ['하락', '차트', '그래프', '주가', '감소', '폭락', 'chart down'], en: { name: "Falling chart", desc: "A blue arrow bending downward. For index declines, falling exports and price corrections; in Korean market convention blue marks a fall.", keywords: ["falling chart", "downtrend", "decline arrow", "market correction"] } },
  { slug: 'piggy-bank', name: '저금통', desc: '동전이 들어가는 돼지 저금통입니다. 적금과 예금, 가계 저축을 다루는 글이나 재테크 자료의 삽화로 씁니다.', keywords: ['저금통', '돼지저금통', '적금', '예금', '저축', 'piggy bank'], en: { name: "Piggy bank", desc: "A piggy bank taking a coin. For household saving, deposit products and personal finance explainers.", keywords: ["piggy bank", "savings", "deposit", "personal finance"] } },
  { slug: 'banknotes', name: '지폐 다발', desc: '띠지로 묶인 지폐 다발과 동전입니다. 현금, 통화량, 급여, 자금 조달을 이야기할 때 쓰는 그림입니다.', keywords: ['지폐', '현금', '돈', '통화', '자금', 'cash money'], en: { name: "Banknotes and coins", desc: "A banded bundle of notes with loose coins beside it. For cash, money supply, payroll and funding.", keywords: ["banknotes", "cash", "currency", "money supply"] } },
  { slug: 'gold-bars', name: '금괴', desc: '쌓여 있는 금괴 그림입니다. 금값과 안전자산, 실물 투자, 외환보유액을 다루는 글에 어울립니다.', keywords: ['금괴', '금', '골드바', '안전자산', '금값', 'gold bar'], en: { name: "Gold bars", desc: "Stacked gold bars. For gold prices, safe-haven demand, physical assets and foreign exchange reserves.", keywords: ["gold bar", "bullion", "safe haven", "reserves"] } },
  { slug: 'cargo-ship', name: '컨테이너선', desc: '컨테이너를 실은 화물선이 바다를 지나는 그림입니다. 수출입과 해상운임, 물류 흐름을 설명하는 자료에 씁니다.', keywords: ['컨테이너선', '화물선', '해운', '수출입', '물류', '무역', 'cargo ship'], en: { name: "Container ship", desc: "A container ship under way at sea. For exports and imports, ocean freight rates and supply-chain flow.", keywords: ["container ship", "cargo ship", "shipping", "ocean freight", "trade"] } },
  { slug: 'harbor-crane', name: '항만 크레인', desc: '컨테이너를 들어 올리는 항만 갠트리 크레인입니다. 항만 물동량과 통관, 하역 작업을 다루는 글의 대표 이미지로 좋습니다.', keywords: ['항만', '크레인', '부두', '컨테이너', '물동량', 'harbor crane'], en: { name: "Port gantry crane", desc: "A gantry crane lifting a container. For port throughput, customs clearance and terminal handling.", keywords: ["gantry crane", "port", "harbour", "container terminal", "logistics"] } },
  { slug: 'globe-routes', name: '무역 항로', desc: '지구본 위로 항로가 이어진 그림입니다. 국가 간 교역, 공급망, 글로벌 시장을 설명할 때 씁니다.', keywords: ['무역', '항로', '지구본', '글로벌', '공급망', '수출', 'trade route'], en: { name: "Trade routes", desc: "Shipping lanes drawn across a globe. For cross-border trade, supply chains and global markets.", keywords: ["trade route", "globe", "supply chain", "global trade", "export"] } },
  { slug: 'ledger-pen', name: '장부와 만년필', desc: '펼친 장부 위에 만년필이 놓인 그림입니다. 회계와 결산, 기록과 공시를 이야기하는 글에 맞습니다.', keywords: ['장부', '회계', '결산', '만년필', '기록', '재무', 'ledger'], en: { name: "Ledger and fountain pen", desc: "An open ledger with a fountain pen resting across it. For accounting, closing the books, record-keeping and disclosure.", keywords: ["ledger", "accounting", "bookkeeping", "audit", "finance"] } },
  { slug: 'abacus', name: '주판', desc: '알이 가지런한 주판입니다. 셈과 계산, 옛 상거래와 부기를 소재로 하는 글에 씁니다.', keywords: ['주판', '계산', '셈', '부기', '회계', 'abacus'], en: { name: "Abacus", desc: "An abacus with its beads in line. For arithmetic, bookkeeping and the older side of commerce.", keywords: ["abacus", "calculation", "bookkeeping", "arithmetic"] } },
  { slug: 'bank-building', name: '은행', desc: '기둥이 늘어선 은행 건물입니다. 기준금리와 통화정책, 예금과 대출을 다루는 글의 삽화로 씁니다.', keywords: ['은행', '중앙은행', '금리', '대출', '예금', '금융', 'bank'], en: { name: "Bank", desc: "A colonnaded bank building. For policy rates, monetary policy, deposits and lending.", keywords: ["bank", "central bank", "interest rate", "monetary policy"] } },
  { slug: 'exchange', name: '환전', desc: '두 통화가 화살표로 맞바뀌는 환전 그림입니다. 환율과 외환시장, 해외 결제를 설명할 때 씁니다.', keywords: ['환전', '환율', '외환', '달러', '통화', 'currency exchange'], en: { name: "Currency exchange", desc: "Two currencies swapping along facing arrows. For exchange rates, foreign exchange markets and cross-border payment.", keywords: ["currency exchange", "foreign exchange", "exchange rate", "forex"] } },
  { slug: 'semiconductor', name: '반도체 칩', desc: '회로가 뻗어 나가는 반도체 칩입니다. 반도체 수출과 공정, 기술 산업을 다루는 글에 씁니다.', keywords: ['반도체', '칩', 'IT', '수출', '기술', '전자', 'semiconductor chip'], en: { name: "Semiconductor chip", desc: "A chip with circuit traces running outward. For semiconductor exports, fabrication and the technology industry.", keywords: ["semiconductor", "chip", "microchip", "technology", "export"] } },
  { slug: 'scale', name: '저울', desc: '양팔 저울이 균형을 맞춘 그림입니다. 무역수지와 균형, 비교와 판단을 이야기하는 자료에 맞습니다.', keywords: ['저울', '균형', '무역수지', '비교', '공정', 'balance scale'], en: { name: "Balance scale", desc: "A two-pan balance at rest. For trade balance, equilibrium, and comparisons that need a fair reading.", keywords: ["balance scale", "trade balance", "comparison", "equilibrium"] } },
  { slug: 'lighthouse', name: '등대', desc: '바다를 비추는 등대입니다. 지표와 방향, 전망과 신호를 은유하는 글의 대표 이미지로 씁니다.', keywords: ['등대', '바다', '지표', '전망', '항로', 'lighthouse'], en: { name: "Lighthouse", desc: "A lighthouse throwing light across water. For indicators, direction and forward-looking signals.", keywords: ["lighthouse", "indicator", "guidance", "outlook"] } },
  { slug: 'tori-treasure', name: '도토리를 안은 토리', desc: '도토리경제의 마스코트 다람쥐 토리가 도토리를 안고 있는 그림입니다. 자산을 모으는 이야기나 블로그 소개에 씁니다.', keywords: ['토리', '다람쥐', '캐릭터', '마스코트', '도토리', 'squirrel'], en: { name: "Squirrel holding acorns", desc: "Tori, the squirrel analyst who writes this publication, holding an armful of acorns. For pieces on accumulating assets, or wherever a friendly mascot fits.", keywords: ["squirrel", "mascot", "acorn", "savings", "character illustration"] } },
  { slug: 'tori-reading', name: '공부하는 토리', desc: '책과 자료를 앞에 둔 다람쥐 토리입니다. 공부와 조사, 입문 안내를 다루는 글에 어울립니다.', keywords: ['토리', '다람쥐', '공부', '독서', '캐릭터', 'study squirrel'], en: { name: "Squirrel reading", desc: "The same squirrel at a desk with books and papers in front of him. For study, research and beginner guides.", keywords: ["squirrel reading", "study", "research", "books", "character illustration"] } },
];

const p2: PackItem[] = [
  { slug: 'full-moon', name: '보름달', desc: '구름 사이로 뜬 보름달입니다. 한가위와 추석 인사, 명절 안내문에 쓰는 벡터 그림입니다.', keywords: ['보름달', '한가위', '추석', '명절', '달', 'full moon'], en: { name: "Full moon behind clouds", desc: "A full moon rising through thin cloud. Drawn for Chuseok, the Korean autumn harvest festival, which falls on the full moon of the eighth lunar month; it works for any night or harvest scene.", keywords: ["full moon", "harvest moon", "Chuseok", "autumn", "night sky"] } },
  { slug: 'songpyeon', name: '송편', desc: '접시에 담긴 송편 세 개입니다. 추석 음식과 명절 상차림을 소개할 때 씁니다.', keywords: ['송편', '추석', '한가위', '떡', '명절음식', 'songpyeon'], en: { name: "Songpyeon rice cakes", desc: "Three songpyeon on a plate. These are half-moon rice cakes filled with sesame or sweetened bean paste, the food most associated with Chuseok in Korea.", keywords: ["songpyeon", "Korean rice cake", "Chuseok", "Korean food", "tteok"] } },
  { slug: 'gift-bojagi', name: '보자기 선물', desc: '보자기로 묶은 명절 선물입니다. 추석 선물과 인사, 감사 표현에 쓰는 그림입니다.', keywords: ['보자기', '선물', '추석선물', '명절', '한복보', 'gift wrap'], en: { name: "Gift wrapped in bojagi", desc: "A present wrapped in bojagi, the square Korean cloth used instead of paper for gifts. Suits holiday gifting, thank-you notes and anything about reusable wrapping.", keywords: ["bojagi", "Korean gift wrap", "furoshiki style", "holiday gift", "present"] } },
  { slug: 'persimmon', name: '감', desc: '잎이 달린 잘 익은 감입니다. 가을 제철 과일과 수확, 계절 인사에 씁니다.', keywords: ['감', '홍시', '가을', '과일', '수확', 'persimmon'], en: { name: "Persimmon", desc: "A ripe persimmon with the leaf still attached. An autumn fruit across East Asia; use it for seasonal produce, harvest and autumn greetings.", keywords: ["persimmon", "autumn fruit", "harvest", "seasonal", "fruit illustration"] } },
  { slug: 'chestnut', name: '알밤', desc: '껍질을 벗은 알밤 두 알입니다. 가을 간식과 수확철 이야기에 어울립니다.', keywords: ['밤', '알밤', '가을', '견과', '수확', 'chestnut'], en: { name: "Chestnuts", desc: "Two shelled chestnuts. An autumn snack in Korea and much of Europe; suits harvest season and street-food subjects.", keywords: ["chestnut", "autumn snack", "harvest", "nuts"] } },
  { slug: 'acorn-trio', name: '도토리 삼형제', desc: '크기가 다른 도토리 세 알입니다. 가을 숲과 저축, 도토리경제의 상징으로 씁니다.', keywords: ['도토리', '가을', '숲', '견과', '저축', 'acorn'], en: { name: "Three acorns", desc: "Three acorns in graded sizes. The emblem of this publication, and a plain way to signal autumn woodland or small savings adding up.", keywords: ["acorn", "three acorns", "autumn", "oak", "savings"] } },
  { slug: 'oak-leaf', name: '참나무 잎', desc: '가장자리가 물결치는 참나무 잎입니다. 가을 장식과 배경 요소로 쓰기 좋습니다.', keywords: ['참나무', '잎', '낙엽', '가을', '단풍', 'oak leaf'], en: { name: "Oak leaf", desc: "An oak leaf with a wavy edge. A quiet decorative element for autumn layouts and backgrounds.", keywords: ["oak leaf", "autumn leaf", "decoration", "botanical"] } },
  { slug: 'ginkgo-leaf', name: '은행잎', desc: '부채꼴로 펼쳐진 은행잎입니다. 가을 거리와 계절 변화의 장식 요소로 씁니다.', keywords: ['은행잎', '낙엽', '가을', '노란잎', 'ginkgo leaf'], en: { name: "Ginkgo leaf", desc: "A ginkgo leaf opened out like a fan. Ginkgo lines many streets in Seoul and turns bright yellow in autumn, so it reads as a seasonal marker.", keywords: ["ginkgo leaf", "autumn leaf", "Seoul", "seasonal", "botanical"] } },
  { slug: 'rice-sheaf', name: '벼 이삭단', desc: '끈으로 묶은 벼 이삭단입니다. 추수와 수확, 농업과 곡물 이야기에 씁니다.', keywords: ['벼', '이삭', '추수', '수확', '농사', '곡물', 'rice'], en: { name: "Sheaf of rice", desc: "A bound sheaf of rice ears. For harvest, agriculture, grain markets and food security.", keywords: ["rice sheaf", "harvest", "agriculture", "grain", "farming"] } },
  { slug: 'coin-pouch', name: '복주머니', desc: '엽전이 든 복주머니입니다. 명절 세뱃돈과 복, 선물 인사에 쓰는 그림입니다.', keywords: ['복주머니', '세뱃돈', '엽전', '명절', '복', 'lucky pouch'], en: { name: "Lucky money pouch", desc: "A bokjumeoni, the embroidered Korean pouch used to give money at holidays, with old coins spilling out. For gift money, good fortune and seasonal greetings.", keywords: ["bokjumeoni", "lucky pouch", "gift money", "Korean tradition", "coins"] } },
  { slug: 'lantern', name: '청사초롱', desc: '전통 청사초롱입니다. 명절 밤과 축제, 안내와 환영의 장면에 씁니다.', keywords: ['청사초롱', '초롱', '전통', '명절', '등불', 'lantern'], en: { name: "Traditional lantern", desc: "A cheongsachorong, the blue-and-red silk lantern carried at Korean celebrations. For festival nights, welcome and guidance.", keywords: ["Korean lantern", "cheongsachorong", "festival", "night", "tradition"] } },
  { slug: 'yakgwa', name: '약과', desc: '꽃 모양으로 빚은 약과입니다. 전통 과자와 명절 다과상 소개에 씁니다.', keywords: ['약과', '한과', '전통과자', '명절', '다과', 'yakgwa'], en: { name: "Yakgwa honey cookies", desc: "Yakgwa shaped like flowers. A deep-fried honey pastry served at Korean holidays and tea tables, and the sweet most often on a Chuseok plate.", keywords: ["yakgwa", "Korean sweets", "honey cookie", "tea table", "Chuseok"] } },
  { slug: 'ribbon-label', name: '리본 라벨', desc: '양 끝이 접힌 리본 라벨입니다. 제목 띠나 가격표, 배너 자리에 넣어 쓰는 장식 부품입니다.', keywords: ['리본', '라벨', '배너', '띠', '장식', 'ribbon label'], en: { name: "Ribbon label", desc: "A ribbon banner with folded ends. A parts piece: drop a title, a price or a tag into the middle.", keywords: ["ribbon banner", "label", "title bar", "price tag", "decoration"] } },
  { slug: 'frame-round', name: '원형 프레임', desc: '도토리와 잎으로 두른 원형 프레임입니다. 사진이나 문구를 가운데 넣어 쓰는 테두리 부품입니다.', keywords: ['프레임', '테두리', '원형', '장식', '틀', 'round frame'], en: { name: "Round frame with acorns", desc: "A circular frame wreathed in acorns and leaves. Put a photograph or a line of text in the centre.", keywords: ["round frame", "wreath", "border", "photo frame", "decoration"] } },
  { slug: 'corner-flourish', name: '모서리 장식', desc: '문서 모서리에 두르는 잎 장식입니다. 표지와 카드, 안내문의 네 귀퉁이에 씁니다.', keywords: ['모서리', '장식', '코너', '테두리', '카드', 'corner ornament'], en: { name: "Corner flourish", desc: "A leaf ornament for the corner of a page. For covers, cards and notices that need a finished edge.", keywords: ["corner ornament", "flourish", "border", "page decoration"] } },
  { slug: 'divider', name: '구분선', desc: '가운데 도토리가 놓인 구분선입니다. 글의 단락과 단락 사이를 나눌 때 씁니다.', keywords: ['구분선', 'divider', '단락', '장식선', '구획'], en: { name: "Section divider", desc: "A rule with a single acorn at its centre. For separating one passage from the next.", keywords: ["divider", "section break", "horizontal rule", "ornament"] } },
];

const soso: PackItem[] = [
  { slug: 'latte', name: '라떼 한 잔', desc: '하트가 그려진 라떼 한 잔입니다. 카페와 아침, 휴식을 소재로 하는 블로그 글과 SNS 카드에 쓰는 수채화 그림입니다.', keywords: ['라떼', '커피', '카페', '아침', '음료', '수채화', 'latte coffee'], en: { name: "Latte cup", desc: "A watercolour of a latte with a heart poured into it. For cafe subjects, mornings and slower posts.", keywords: ["latte", "coffee", "cafe", "watercolour", "morning"] } },
  { slug: 'sketchbook', name: '스케치북', desc: '연필이 놓인 스케치북입니다. 기록과 계획, 취미와 공부를 다루는 글에 어울리는 수채화 그림입니다.', keywords: ['스케치북', '노트', '연필', '기록', '공부', '문구', 'sketchbook'], en: { name: "Sketchbook and pencil", desc: "A watercolour sketchbook with a pencil across it. For note-taking, planning, hobbies and study.", keywords: ["sketchbook", "pencil", "notebook", "watercolour", "planning"] } },
  { slug: 'acorns', name: '도토리 삼형제', desc: '나란히 놓인 도토리 세 알을 수채화로 그렸습니다. 가을과 저축, 작은 결실을 이야기할 때 씁니다.', keywords: ['도토리', '가을', '견과', '수채화', '저축', 'acorn'], en: { name: "Three acorns, watercolour", desc: "Three acorns side by side, painted in watercolour. A softer alternative to the flat vector set for autumn and saving subjects.", keywords: ["acorn", "watercolour", "autumn", "savings", "botanical"] } },
  { slug: 'tart', name: '딸기 타르트', desc: '딸기를 올린 타르트 한 조각입니다. 디저트와 카페 메뉴, 소소한 기쁨을 다루는 글에 씁니다.', keywords: ['타르트', '딸기', '디저트', '베이킹', '카페', 'strawberry tart'], en: { name: "Strawberry tart", desc: "A slice of strawberry tart in watercolour. For desserts, cafe menus and small pleasures.", keywords: ["strawberry tart", "dessert", "cafe", "watercolour", "baking"] } },
  { slug: 'teapot', name: '꽃무늬 티팟', desc: '꽃무늬가 그려진 티팟입니다. 홈카페와 티타임, 오후의 여유를 소개하는 자료에 씁니다.', keywords: ['티팟', '주전자', '홍차', '홈카페', '티타임', 'teapot'], en: { name: "Floral teapot", desc: "A watercolour teapot with a floral pattern. For tea time, home cafes and unhurried afternoons.", keywords: ["teapot", "tea time", "home cafe", "watercolour", "floral"] } },
  { slug: 'macaron', name: '핑크 마카롱', desc: '분홍빛 마카롱입니다. 디저트 소개와 선물, 달콤한 분위기의 카드에 씁니다.', keywords: ['마카롱', '디저트', '베이커리', '핑크', '간식', 'macaron'], en: { name: "Pink macaron", desc: "A pink macaron in watercolour. For dessert posts, gifts and anything that wants a sweet register.", keywords: ["macaron", "dessert", "pink", "watercolour", "patisserie"] } },
  { slug: 'sugarcube', name: '각설탕 접시', desc: '접시에 담긴 각설탕입니다. 커피와 홍차 곁의 소품으로, 홈카페 자료에 곁들여 씁니다.', keywords: ['각설탕', '설탕', '커피', '홈카페', '소품', 'sugar cube'], en: { name: "Sugar cubes on a dish", desc: "Sugar cubes on a small dish, in watercolour. A companion piece beside coffee or black tea.", keywords: ["sugar cubes", "coffee", "tea", "watercolour", "still life"] } },
  { slug: 'lemon', name: '레몬 슬라이스', desc: '얇게 썬 레몬 조각입니다. 음료와 상큼한 계절감을 표현하는 자료에 씁니다.', keywords: ['레몬', '슬라이스', '과일', '음료', '상큼', 'lemon slice'], en: { name: "Lemon slices", desc: "Thinly cut lemon in watercolour. For drinks, citrus and a fresh seasonal note.", keywords: ["lemon slice", "citrus", "drink", "watercolour", "fresh"] } },
];

const p3: PackItem[] = [
  { slug: 'laptop', name: '노트북', desc: '화면이 비어 있는 노트북을 비스듬히 본 그림입니다. 재택근무와 온라인 강의, 업무 도구를 다루는 글의 대표 이미지로 씁니다. 화면이 빈 채라 캡처나 문구를 얹기에도 좋습니다.', keywords: ['노트북', '랩탑', '컴퓨터', '재택근무', '업무', 'laptop'], en: { name: "Laptop", desc: "A laptop seen at an angle with a blank screen. For remote work, online courses and work tools. The empty screen leaves room to drop in a screenshot or a line of text.", keywords: ["laptop", "remote work", "computer", "office illustration", "workspace"] } },
  { slug: 'notebook-pen', name: '노트와 볼펜', desc: '스프링 노트 위에 볼펜이 놓인 그림입니다. 기록과 메모, 공부와 계획 세우기를 이야기하는 글이나 서식 자료에 어울립니다.', keywords: ['노트', '수첩', '볼펜', '메모', '기록', '필기', 'notebook pen'], en: { name: "Notebook and pen", desc: "A spiral notebook with a ballpoint pen laid on it. For notes, planning, study and worksheet templates.", keywords: ["notebook", "pen", "notes", "planning", "stationery"] } },
  { slug: 'clipboard', name: '체크리스트 클립보드', desc: '체크 표시 세 개가 찍힌 클립보드입니다. 점검표와 준비물, 절차 안내와 마감 확인을 다루는 자료에 씁니다.', keywords: ['클립보드', '체크리스트', '점검표', '할일', '체크', 'checklist clipboard'], en: { name: "Checklist on a clipboard", desc: "A clipboard with three ticks on it. For checklists, prerequisites, procedures and sign-off.", keywords: ["clipboard", "checklist", "tick", "procedure", "to-do"] } },
  { slug: 'desk-calendar', name: '탁상 달력', desc: '철끈으로 묶인 탁상 달력이 세워져 있는 그림입니다. 일정과 마감, 월간 계획을 안내하는 글에 씁니다. 날짜 칸이 비어 있어 어떤 달에도 씁니다.', keywords: ['달력', '탁상달력', '일정', '캘린더', '마감', '스케줄', 'calendar'], en: { name: "Desk calendar", desc: "A wire-bound desk calendar standing open. For schedules, deadlines and monthly planning; the date squares are blank so it fits any month.", keywords: ["desk calendar", "schedule", "deadline", "planner", "monthly"] } },
  { slug: 'coffee-mug', name: '커피 머그', desc: '김이 오르는 커피 머그컵입니다. 아침 루틴과 휴식, 카페와 일상 이야기를 다루는 글에 두루 씁니다.', keywords: ['커피', '머그', '컵', '카페', '아침', '휴식', 'coffee mug'], en: { name: "Coffee mug", desc: "A mug of coffee with steam rising. For morning routines, breaks and everyday working scenes.", keywords: ["coffee mug", "hot drink", "break", "morning", "office"] } },
  { slug: 'document-folder', name: '서류 폴더', desc: '서류가 꽂힌 종이 폴더입니다. 자료 정리와 보관, 제출 서류와 아카이브를 설명할 때 씁니다.', keywords: ['폴더', '서류', '파일', '문서', '자료', '정리', 'folder document'], en: { name: "Document folder", desc: "A paper folder with documents in it. For filing, storage, submissions and archives.", keywords: ["document folder", "filing", "paperwork", "archive", "office"] } },
  { slug: 'sticky-notes', name: '포스트잇', desc: '겹쳐 놓인 접착 메모지입니다. 아이디어와 할 일, 짧은 알림을 다루는 글이나 발표 자료의 장식으로 씁니다.', keywords: ['포스트잇', '메모지', '접착메모', '아이디어', '할일', 'sticky notes'], en: { name: "Sticky notes", desc: "A small stack of sticky notes. For ideas, tasks and short reminders, or as decoration in a slide.", keywords: ["sticky notes", "post-it", "reminder", "ideas", "task"] } },
  { slug: 'presentation-board', name: '발표용 차트 보드', desc: '막대그래프가 그려진 이젤형 발표 보드입니다. 실적 보고와 강의, 브리핑과 제안 발표를 다루는 자료에 맞습니다.', keywords: ['발표', '프레젠테이션', '차트', '보드', '그래프', '강의', 'presentation chart'], en: { name: "Presentation board", desc: "An easel board carrying a bar chart. For results reporting, lectures, briefings and pitches.", keywords: ["presentation board", "bar chart", "briefing", "pitch", "report"] } },
  { slug: 'whiteboard', name: '화이트보드', desc: '바퀴가 달린 이동식 화이트보드입니다. 판이 비어 있어 강의와 회의, 브레인스토밍 장면에 문구를 얹어 쓰기 좋습니다.', keywords: ['화이트보드', '칠판', '회의', '강의', '브레인스토밍', 'whiteboard'], en: { name: "Whiteboard on castors", desc: "A mobile whiteboard with an empty surface, so text can be dropped on. For lectures, meetings and brainstorming.", keywords: ["whiteboard", "meeting", "brainstorm", "lecture", "blank board"] } },
  { slug: 'printer', name: '프린터', desc: '종이가 빠져나오는 탁상 프린터입니다. 출력과 인쇄, 서류 발급과 사무 기기를 다루는 글에 씁니다.', keywords: ['프린터', '인쇄', '출력', '복합기', '사무기기', 'printer'], en: { name: "Desktop printer", desc: "A desktop printer with a sheet coming out. For printing, document issuance and office equipment.", keywords: ["printer", "printing", "document", "office equipment"] } },
  { slug: 'desk-lamp', name: '책상 스탠드', desc: '불이 켜진 관절형 책상 스탠드입니다. 야근과 새벽 작업, 집중과 서재 분위기를 담는 글에 어울립니다.', keywords: ['스탠드', '조명', '책상등', '램프', '야근', '집중', 'desk lamp'], en: { name: "Desk lamp", desc: "An articulated desk lamp switched on. For late shifts, early mornings, concentration and study rooms.", keywords: ["desk lamp", "study", "late night", "focus", "workspace"] } },
  { slug: 'magnifier-doc', name: '돋보기와 서류', desc: '서류 더미를 돋보기로 들여다보는 그림입니다. 검토와 감사, 조사와 팩트체크를 이야기하는 글의 대표 이미지로 씁니다.', keywords: ['돋보기', '검토', '조사', '분석', '감사', '확인', 'magnifier document'], en: { name: "Magnifier over documents", desc: "A magnifying glass held over a pile of papers. For review, audit, investigation and fact-checking.", keywords: ["magnifier", "audit", "review", "investigation", "fact check"] } },
  { slug: 'stamp', name: '결재 도장', desc: '도장과 인주가 함께 놓인 그림입니다. 승인과 결재, 계약과 공증을 다루는 글이나 행정 안내 자료에 씁니다.', keywords: ['도장', '결재', '승인', '인주', '계약', '날인', 'stamp approval'], en: { name: "Approval stamp", desc: "A stamp beside its ink pad. For approval, sign-off, contracts and notarisation. In Korea and Japan a personal seal still carries the weight a signature does elsewhere.", keywords: ["stamp", "seal", "approval", "contract", "hanko"] } },
  { slug: 'envelope', name: '봉투', desc: '봉랍으로 봉한 편지 봉투입니다. 안내문과 통지, 초대와 문의 메일을 이야기하는 글에 씁니다.', keywords: ['봉투', '편지', '메일', '우편', '초대장', '문의', 'envelope letter'], en: { name: "Sealed envelope", desc: "A letter envelope closed with wax. For notices, invitations and enquiries.", keywords: ["envelope", "letter", "invitation", "notice", "mail"] } },
  { slug: 'gear-cogs', name: '맞물린 톱니바퀴', desc: '크기가 다른 톱니바퀴 세 개가 맞물린 그림입니다. 자동화와 절차, 시스템과 협업 구조를 설명할 때 씁니다.', keywords: ['톱니바퀴', '기어', '자동화', '시스템', '프로세스', '협업', 'gears'], en: { name: "Interlocking cogs", desc: "Three cogs of different sizes meshed together. For automation, process, systems and how parts fit.", keywords: ["cogs", "gears", "automation", "process", "system"] } },
  { slug: 'wall-clock', name: '벽시계', desc: '테두리가 굵은 둥근 벽시계입니다. 시간 관리와 마감, 근무 시간과 일정 안내를 다루는 글에 씁니다.', keywords: ['시계', '벽시계', '시간', '마감', '일정', '근무시간', 'wall clock'], en: { name: "Wall clock", desc: "A round wall clock with a heavy rim. For time management, deadlines, working hours and schedules.", keywords: ["wall clock", "time", "deadline", "schedule", "working hours"] } },
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
    key: 'vol3',
    vol: 3,
    title: '사무·업무 도구',
    note:
      '책상 위에서 매일 쓰는 물건 16종입니다. 노트북과 노트, 클립보드와 달력, 발표 보드와 화이트보드처럼 ' +
      '업무·강의·정리 이야기에 빠지지 않는 도구를 도토리경제의 그림체로 그렸습니다. 배경이 비어 있는 투명 PNG라 ' +
      '색이 있는 슬라이드 위에도 흰 네모 없이 얹힙니다.',
    date: '2026-08-24',
    dir: '/images/pack3',
    format: 'png',
    size: '1600 × 1600 픽셀',
    transparent: true,
    thumb: (s) => `/images/pack3/thumb/${s}.png`,
    items: p3,
  },
  {
    key: 'soso',
    vol: 4,
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

/**
 * 영문판에 싣는 항목만 골라 낸다(2026-08-26).
 * `en` 원고가 있는 것만 페이지가 생긴다 — 기계번역으로 전량을 뿌리면
 * 얇은 중복 페이지가 되어 구글 scaled content abuse 에 걸린다.
 */
export const EN_ITEMS = ALL_ITEMS.filter(({ item }) => !!item.en);
