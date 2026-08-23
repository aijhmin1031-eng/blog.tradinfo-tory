// 「토리 이야기」 카툰 등록부.
// 전에는 about.astro 한 파일에 65컷이 통째로 쌓여 있어 화별 공유·검색이 불가능했다.
// 여기로 모아 두면 /story/ 목차와 화별 페이지(/story/<slug>/)가 자동으로 생긴다.
// 새 화를 그리면 EPISODES 맨 아래에 한 덩어리 추가하면 된다.

type Bubble = {
  text: string;
  kind: 'speech' | 'narration' | 'thought';
  x: string;
  y: string;
  tail?: 'b' | 'bl' | 'br' | 'l' | 'r' | 'tr';
  w?: string;
};
type Panel = { img: string; alt: string; act: 'autumn' | 'winter' | 'night' | 'dawn'; bubbles: Bubble[] };


const panels: Panel[] = [
  {
    img: '01', alt: '가을 숲에서 분주히 도토리를 모으는 다람쥐들', act: 'autumn',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', text: '옛날, 사계절이 유난히 변덕스러운 숲이 있었습니다.' }],
  },
  {
    img: '02', alt: '자루에 도토리를 마구 쓸어 담는 다람쥐들', act: 'autumn',
    bubbles: [{ kind: 'speech', x: '30%', y: '3%', tail: 'br', w: '46%', text: '빨리빨리! 많이 줍는 게 장땡이야!' }],
  },
  {
    img: '03', alt: '나무 아래에서 도토리를 살펴보고 장부에 적는 어린 토리', act: 'autumn',
    bubbles: [
      { kind: 'speech', x: '50%', y: '6%', tail: 'bl', w: '44%', text: '이건 꽉 찼고… 음, 이건 가볍네.' },
      { kind: 'narration', x: '3%', y: 'b:4%', w: '70%', text: '줍기 전에 꼭 들여다보고 장부에 적는, 조금 이상한 다람쥐가 있었습니다.' },
    ],
  },
  {
    img: '04', alt: '장부를 안은 토리를 보며 웃는 이웃 다람쥐들', act: 'autumn',
    bubbles: [
      { kind: 'speech', x: '48%', y: '3.5%', tail: 'br', w: '48%', text: '하하! 그럴 시간에 하나라도 더 주워!' },
      { kind: 'thought', x: '4%', y: '10%', tail: 'br', w: '34%', text: '…그래도, 적어둘래.' },
    ],
  },
  {
    img: '05', alt: '숲 위로 몰려오는 먹구름과 첫눈', act: 'winter',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', text: '그해 겨울은 예고 없이 일찍 왔습니다.' }],
  },
  {
    img: '06', alt: '쪼갠 도토리가 텅 비어 있어 충격받은 다람쥐', act: 'winter',
    bubbles: [{ kind: 'speech', x: '3.5%', y: '4%', tail: 'br', w: '36%', text: '속이… 비었잖아!?' }],
  },
  {
    img: '07', alt: '빈 도토리 앞에 낙담한 다람쥐들', act: 'winter',
    bubbles: [{ kind: 'speech', x: '5%', y: '5%', tail: 'b', w: '42%', text: '이 겨울을… 어떻게 나지.' }],
  },
  {
    img: '08', alt: '눈보라를 뚫고 창고로 걸어가는 토리', act: 'winter',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', text: '그때, 토리가 조용히 일어났습니다.' }],
  },
  {
    img: '09', alt: '한밤의 창고 문이 열리며 쏟아지는 따뜻한 빛', act: 'night',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', text: '끼이익…' }],
  },
  {
    img: '10', alt: '가지런히 쌓인 도토리 창고와 장부를 든 토리', act: 'night',
    bubbles: [{ kind: 'speech', x: '3.5%', y: '4%', tail: 'br', w: '44%', text: '전부 기록해 뒀어. 속이 꽉 찬 것들만.' }],
  },
  {
    img: '11', alt: '모닥불에 둘러앉아 도토리를 나누는 다람쥐들', act: 'night',
    bubbles: [
      { kind: 'speech', x: '56%', y: '3.5%', tail: 'b', w: '38%', text: '고마워, 토리야!' },
      { kind: 'narration', x: '3%', y: 'b:4%', text: '숲의 모두가 함께 겨울을 났습니다.' },
    ],
  },
  {
    img: '12', alt: '눈 녹는 언덕에서 해돋이를 바라보는 토리', act: 'dawn',
    bubbles: [{ kind: 'speech', x: '4%', y: '8%', tail: 'r', w: '46%', text: '좋은 도토리가 어디서 나는지, 매일 알려줄게.' }],
  },
  {
    img: '13', alt: '거울 앞에서 안경을 쓰는 토리, 옆에 걸린 네이비 베스트', act: 'dawn',
    bubbles: [{ kind: 'narration', x: '3%', y: 'b:4%', w: '80%', text: '그렇게 토리는 숲의 이코노미스트가 되었습니다.' }],
  },
  {
    img: '14', alt: '컨테이너가 쌓인 항구를 걷는 어른 토리', act: 'dawn',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', text: '그날부터 토리는 어디든 갑니다…' }],
  },
  {
    img: '15', alt: '시장 거리에서 수첩에 기록하는 토리', act: 'dawn',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', text: '거래가 있는 곳이라면, 어디든.' }],
  },
  {
    img: '16', alt: '아침 숲에서 차트를 들고 브리핑하는 토리', act: 'dawn',
    bubbles: [{ kind: 'speech', x: '3.5%', y: '5%', tail: 'r', w: '46%', text: '안녕하세요, 토리입니다. 오늘 주운 도토리 세 알부터 보시죠.' }],
  },
];

// 「토리의 일상」 연작, 제1화. 이미지는 무자막(말풍선은 HTML), 명세는 docs/worldview.md.

const dailyPanels: Panel[] = [
  {
    img: 'daily-01-1', alt: '새벽, 서재에서 스탠드를 켜는 토리', act: 'night',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '78%', text: '여섯 시 오십 분. 숲의 아침보다 먼저 토리의 하루가 열립니다.' }],
  },
  {
    img: 'daily-01-2', alt: '해 뜨는 항구에서 도토리를 줍는 토리', act: 'dawn',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '72%', text: '첫 행선지는 항구. 밤사이 바다를 건너온 숫자들이 기다립니다.' }],
  },
  {
    img: 'daily-01-3', alt: '저울과 돋보기로 도토리를 검수하는 토리', act: 'autumn',
    bubbles: [
      { kind: 'speech', x: '55%', y: '5%', tail: 'bl', w: '34%', text: '음, 이건 가볍군.' },
      { kind: 'narration', x: '3%', y: 'b:4%', w: '70%', text: '속이 빈 도토리는 장부에 오르지 못합니다.' },
    ],
  },
  {
    img: 'daily-01-4', alt: '아침 숲에서 차트로 브리핑하는 토리', act: 'dawn',
    bubbles: [{ kind: 'speech', x: '3.5%', y: '5%', tail: 'r', w: '46%', text: '일곱 시입니다. 오늘 주운 도토리, 세 알부터 보시죠.' }],
  },
];

// 마일스톤 게이트, 발행 기사 50편 달성 시 제2화 「만년필」 자동 공개 (worldview.md 진화 마일스톤)

const daily02Panels: Panel[] = [
  {
    img: 'daily-02-01', alt: '몽당연필로 장부를 쓰는 토리', act: 'autumn',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '76%', text: '쉰 번째 기사를 쓰던 아침, 연필은 엄지손가락만큼 남아 있었습니다.' }],
  },
  {
    img: 'daily-02-02', alt: '쉰 권의 장부 옆에 놓인 몽당연필', act: 'autumn',
    bubbles: [{ kind: 'speech', x: '48%', y: '6%', tail: 'bl', w: '42%', text: '…너와 참 많이도 적었구나.' }],
  },
  {
    img: 'daily-02-03', alt: '문장 한가운데에서 부러지는 연필', act: 'autumn',
    bubbles: [
      { kind: 'narration', x: '3%', y: '4%', w: '60%', text: '그리고 쉰 번째 문장의 한가운데에서…' },
      { kind: 'speech', x: '62%', y: '30%', tail: 'bl', w: '18%', text: '앗.' },
    ],
  },
  {
    img: 'daily-02-04', alt: '숯덩이로 써 보다 얼굴이 검어진 토리', act: 'autumn',
    bubbles: [{ kind: 'speech', x: '55%', y: '6%', tail: 'bl', w: '36%', text: '이건… 조금 크군.' }],
  },
  {
    img: 'daily-02-05', alt: '깃펜에 재채기가 난 토리', act: 'autumn',
    bubbles: [
      { kind: 'speech', x: '58%', y: '5%', tail: 'bl', w: '28%', text: '엣취!' },
      { kind: 'narration', x: '3%', y: 'b:4%', w: '70%', text: '숲의 도구들에게는 저마다 다른 주인이 있었습니다.' },
    ],
  },
  {
    img: 'daily-02-06', alt: '반 줄 짧아진 아침 브리핑 게시판 앞의 다람쥐들', act: 'winter',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '80%', text: '그 아침, 브리핑이 처음으로 반 줄 짧았습니다. 숲은 반 줄의 공백을 금세 알아차렸습니다.' }],
  },
  {
    img: 'daily-02-07', alt: '밤, 화로에 불을 붙이는 늙은 장인 다람쥐', act: 'night',
    bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '66%', text: '그날 밤, 숲의 늙은 장인이 조용히 화로에 불을 붙였습니다.' }],
  },
  {
    img: 'daily-02-08', alt: '도토리 금촉 만년필을 만드는 손', act: 'night',
    bubbles: [{ kind: 'narration', x: '3%', y: 'b:4%', w: '72%', text: '도토리 껍질의 금빛으로 촉을, 참나무의 심으로 몸통을.' }],
  },
  {
    img: 'daily-02-09', alt: '만년필을 선물받는 토리', act: 'dawn',
    bubbles: [{ kind: 'speech', x: '3.5%', y: '5%', tail: 'br', w: '46%', text: '쉰 번을 적은 손에게, 숲이 드리는 답례요.' }],
  },
  {
    img: 'daily-02-10', alt: '쉰 권의 장부 앞에서 만년필을 들어 올린 토리', act: 'dawn',
    bubbles: [{ kind: 'speech', x: '3.5%', y: '5%', tail: 'r', w: '52%', text: '연필은 지울 수 있어 정직했고, 만년필은 지울 수 없어 무겁습니다.' }],
  },
  {
    img: 'daily-02-11', alt: '만년필로 쉰한 번째 기사의 첫 문장을 쓰는 토리', act: 'dawn',
    bubbles: [
      { kind: 'narration', x: '3%', y: '4%', w: '64%', text: '쉰한 번째 기사의 첫 문장이 그렇게 적혔습니다.' },
      { kind: 'speech', x: '52%', y: 'b:10%', tail: 'tr', w: '40%', text: '…오늘의 도토리, 세 알부터.' },
    ],
  },
  {
    img: 'daily-02-12', alt: '서재 벽 액자에 걸린 몽당연필', act: 'dawn',
    bubbles: [{ kind: 'narration', x: '3%', y: 'b:4%', w: '84%', text: '몽당연필은 서재에서 가장 잘 보이는 자리에 걸렸습니다. 쉰 편의 겨울을 먼저 적어 둔, 첫 번째 도구였으니까요.' }],
  },
];

// 「토리 일대기」, 20컷 5장. 탄생에서 오늘까지. 인용 컷은 quote 캡션 강조.

type LifeChapter = { title: string; sub: string; panels: Panel[] };
const lifeChapters: LifeChapter[] = [
  {
    title: '제1장 흉년의 아이',
    sub: '얕은 곳간과 셈하는 아버지',
    panels: [
      { img: 'life-01', alt: '폭풍우 치는 가을 숲의 작은 집', act: 'autumn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '66%', text: '토리는 흉년의 가을에 태어났습니다.' }] },
      { img: 'life-02', alt: '도토리를 세는 아버지와 아기를 안은 어머니', act: 'night',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '76%', text: '그해 곳간은 얕았고, 아버지는 저녁마다 도토리를 세고 또 셌습니다.' }] },
      { img: 'life-03', alt: '아버지의 셈돌에 손을 뻗는 아기 토리', act: 'night',
        bubbles: [{ kind: 'speech', x: '4%', y: '5%', tail: 'br', w: '44%', text: '허, 요 녀석, 세는 걸 좋아하는구나.' }] },
      { img: 'life-04', alt: '겨울, 멀건 죽을 나누는 가족', act: 'winter',
        bubbles: [
          { kind: 'speech', x: '40%', y: '4%', tail: 'bl', w: '54%', text: '부족한 건 견딜 수 있어. 무서운 건, 얼마나 남았는지 모르는 것이지.' },
          { kind: 'narration', x: '3%', y: 'b:4%', w: '60%', text: '얕은 곳간으로도 겨울을 난 이유였습니다.' },
        ] },
    ],
  },
  {
    title: '제2장 첫 장부',
    sub: '무엇이든 세던 아이',
    panels: [
      { img: 'life-05', alt: '나무껍질로 첫 공책을 만드는 어린 토리', act: 'autumn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '72%', text: '일곱 살, 토리는 나무껍질로 첫 장부를 만들었습니다.' }] },
      { img: 'life-06', alt: '구름과 개미를 세는 어린 토리', act: 'autumn',
        bubbles: [
          { kind: 'speech', x: '48%', y: '6%', tail: 'bl', w: '40%', text: '구름 셋… 개미 마흔둘…' },
          { kind: 'narration', x: '3%', y: 'b:4%', w: '52%', text: '처음에는, 무엇이든 셌습니다.' },
        ] },
      { img: 'life-07', alt: '홀로 기록하는 토리와 노는 아이들', act: 'autumn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '80%', text: '숲의 아이들에게 토리는 조금 이상한 아이였습니다. 「첫 번째 도토리」의 그 아이입니다.' }] },
      { img: 'life-08', alt: '도토리 두드리는 법을 가르치는 아버지', act: 'autumn',
        bubbles: [{ kind: 'speech', x: '3.5%', y: '4%', tail: 'br', w: '48%', text: '두드려 보렴. 가벼운 소리가 나면, 속이 빈 게란다.' }] },
    ],
  },
  {
    title: '제3장 그 겨울',
    sub: '기록이 곳간이 된 날',
    panels: [
      { img: 'life-09', alt: '눈밤, 창고를 여는 어린 토리와 마을 다람쥐들', act: 'winter',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '80%', text: '열두 살의 겨울, 숲의 모두가 알게 되었습니다. 기록이 곧 곳간이라는 것을.' }] },
      { img: 'life-10', alt: '봄 언덕에서 해돋이를 보는 토리', act: 'dawn',
        bubbles: [
          { kind: 'speech', x: '3.5%', y: '6%', tail: 'r', w: '46%', text: '좋은 도토리가 어디서 나는지, 매일 알려줄게.' },
          { kind: 'narration', x: '3%', y: 'b:4%', w: '40%', text: '봄, 언덕 위의 약속.' },
        ] },
    ],
  },
  {
    title: '제4장 항구와 소문',
    sub: '전 재산을 잃고 얻은 한 줄',
    panels: [
      { img: 'life-11', alt: '숲의 경계에서 항구를 내려다보는 토리', act: 'dawn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '70%', text: '자란 토리는 숲 바깥의 숫자를 배우러 떠났습니다.' }] },
      { img: 'life-12', alt: '항구 시장의 젊은 토리', act: 'autumn',
        bubbles: [
          { kind: 'speech', x: '30%', y: '4%', tail: 'b', w: '48%', text: '도토리 값이 바다를 건너면 달라지는구나!' },
          { kind: 'narration', x: '3%', y: 'b:4%', w: '64%', text: '항구에는 숲에 없던 저울과 동전이 있었습니다.' },
        ] },
      { img: 'life-13', alt: '비 오는 항구, 빈 주머니와 속 빈 황금 도토리', act: 'winter',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '82%', text: '반짝이는 도토리의 소문에 전 재산을 건 적도 있었습니다. 쪼개 보니, 속이 비어 있었습니다.' }] },
      { img: 'life-14', alt: '처마 밑에서 도토리를 두드려 보는 토리', act: 'winter',
        bubbles: [{ kind: 'speech', x: '3.5%', y: '5%', tail: 'br', w: '52%', text: '…아버지 말이 맞았어. 두드려 보지 않은 건, 아는 게 아니야.' }] },
      { img: 'life-15', alt: '촛불 아래 새 장부의 첫 줄을 쓰는 토리', act: 'night',
        bubbles: [{ kind: 'narration', x: '3%', y: 'b:4%', w: '84%', text: '그날 밤, 새 장부의 첫 줄에 평생의 규칙이 적혔습니다. 확인한 것만 적는다.' }] },
    ],
  },
  {
    title: '제5장 도토리경제',
    sub: '청중 둘의 첫 브리핑, 그리고 오늘',
    panels: [
      { img: 'life-16', alt: '거울 앞에서 안경을 쓰는 토리', act: 'dawn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '84%', text: '숲으로 돌아온 날, 토리는 안경을 쓰고 조끼를 입었습니다. 숫자 앞에 서는 자의 예복이었습니다.' }] },
      { img: 'life-17', alt: '창고를 짓는 토리', act: 'autumn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '78%', text: '그리고 창고를 지었습니다. 도토리 대신, 검증된 숫자를 쌓는 창고를.' }] },
      { img: 'life-18', alt: '청중이 둘뿐인 첫 브리핑', act: 'dawn',
        bubbles: [
          { kind: 'speech', x: '3.5%', y: '5%', tail: 'br', w: '36%', text: '…그럼, 시작하겠습니다.' },
          { kind: 'narration', x: '3%', y: 'b:4%', w: '78%', text: '첫 브리핑의 청중은 둘이었습니다. 토리는 개의치 않았습니다. 숫자는 청중을 세지 않으니까요.' },
        ] },
      { img: 'life-19', alt: '사계절을 도는 브리핑과 쌓이는 장부', act: 'autumn',
        bubbles: [{ kind: 'narration', x: '3%', y: '4%', w: '78%', text: '계절이 돌 때마다 청중이 늘었고, 장부가 쌓였고, 연필은 짧아졌습니다.' }] },
      { img: 'life-20', alt: '새벽 서재에서 다음 줄을 쓰는 토리', act: 'dawn',
        bubbles: [{ kind: 'narration', x: '3%', y: 'b:4%', w: '84%', text: '토리의 일대기는 아직 쓰는 중입니다. 내일 아침 일곱 시, 다음 줄이 적힙니다.' }] },
    ],
  },
];


export type Episode = {
  slug: string;
  /** 목차·페이지 제목 */
  title: string;
  /** 한 줄 부제 */
  sub: string;
  /** 연작 이름 */
  series: string;
  /** 공개 순서(옛것이 위) */
  order: number;
  /** 목차 카드에 쓸 대표 컷 */
  cover: string;
  /** 컷 수 */
  cuts: number;
  /** 낱장 페이지 본문 설명(검색 대상) */
  desc: string;
  /** 단일 스트립 */
  panels?: Panel[];
  /** 장으로 나뉜 연작 */
  chapters?: LifeChapter[];
  /** 발행 기사 수가 이 값에 이르러야 공개 */
  gateAtPosts?: number;
};

export const EPISODES: Episode[] = [
  {
    slug: 'first-acorn',
    title: '첫 번째 도토리',
    sub: '도토리경제가 매일 아침 데이터를 줍는 이유',
    series: '기원 동화',
    order: 1,
    cover: '01',
    cuts: panels.length,
    desc: '모두가 도토리를 자루째 쓸어 담던 가을, 어린 토리만 하나씩 열어 보고 장부에 적었습니다. 그해 겨울 빈 도토리가 드러났을 때 숲을 살린 것은 그 기록이었습니다. 도토리경제가 확인한 것만 적는 이유를 담은 16컷 이야기입니다.',
    panels,
  },
  {
    slug: 'daily-01',
    title: '토리의 일상 제1화, 새벽의 장부',
    sub: '도토리경제의 아침 브리핑은 이렇게 만들어집니다',
    series: '토리의 일상',
    order: 2,
    cover: 'daily-01-1',
    cuts: dailyPanels.length,
    desc: '새벽 서재에서 스탠드를 켜고, 항구에서 숫자를 줍고, 저울로 검수해 아침 브리핑을 내보내기까지. 토리의 하루가 곧 이 블로그의 데이터 파이프라인입니다. 4컷.',
    panels: dailyPanels,
  },
  {
    slug: 'daily-02',
    title: '토리의 일상 제2화, 만년필',
    sub: '쉰 번째 기사를 적던 날, 몽당연필에게 생긴 일',
    series: '토리의 일상',
    order: 3,
    cover: 'daily-02-01',
    cuts: daily02Panels.length,
    desc: '쉰 권째 장부를 적던 날 몽당연필이 부러졌습니다. 늙은 장인 다람쥐가 건넨 것은 지울 수 없는 펜이었습니다. 기사 50편 고비에서 그린 12컷 이야기입니다.',
    panels: daily02Panels,
    gateAtPosts: 50,
  },
  {
    slug: 'life',
    title: '토리 일대기, 숫자를 세는 다람쥐',
    sub: '흉년의 아이가 숲의 이코노미스트가 되기까지, 다섯 장의 이야기',
    series: '일대기',
    order: 4,
    cover: 'life-01',
    cuts: lifeChapters.reduce((n, c) => n + c.panels.length, 0),
    desc: '흉년의 가을에 태어나 아버지의 셈을 보고 자란 아이가, 첫 장부를 적고 항구를 걸으며 오늘의 브리핑에 이르기까지. 다섯 장 20컷으로 그린 토리의 일대기입니다.',
    chapters: lifeChapters,
  },
];

export type { Bubble, Panel, LifeChapter };
