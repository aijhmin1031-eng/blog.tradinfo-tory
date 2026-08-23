// 용어 사전, 본문 속 전문용어를 Term 컴포넌트로 감싸면 이 정의가 카드로 열린다.
// /glossary/ 페이지도 이 사전을 그대로 렌더링한다.
// def 는 초보자 대상 한두 문장, 격식체. icon 은 Term.astro 의 픽토그램 키.
// group 은 용어 모음 페이지의 분류: money(돈·금리) | fx(환율) | trade(무역 실무) | tariff(관세·통상) | stat(통계·지표)

export interface GlossaryEntry {
  label: string;
  def: string;
  icon: string;
  group: 'money' | 'fx' | 'trade' | 'tariff' | 'stat' | 'industry';
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ── 돈·금리 ──────────────────────────────
  기준금리: {
    label: '기준금리',
    def: '한국은행 금융통화위원회가 정하는 정책 금리. 시중의 모든 금리가 출발하는 기준점 역할을 한다.',
    icon: 'rate',
    group: 'money',
  },
  가산금리: {
    label: '가산금리',
    def: '기준이 되는 금리 위에 위험도·비용을 반영해 얹는 금리. 대출 금리는 대개 기준금리에 가산금리를 더해 정해진다.',
    icon: 'spread',
    group: 'money',
  },
  국고채: {
    label: '국고채',
    def: '정부가 돈을 빌리며 발행하는 채권. 나라의 차용증인 만큼 가장 안전한 자산으로 꼽히며, 시장금리의 기준이 된다.',
    icon: 'bond',
    group: 'money',
  },
  베이시스포인트: {
    label: '베이시스포인트(bp)',
    def: '0.01%포인트. 금리의 작은 변화를 잴 때 쓰는 단위로, 25bp 인상은 0.25%포인트 인상을 뜻한다.',
    icon: 'bp',
    group: 'money',
  },
  만기: {
    label: '만기',
    def: '예금·채권 등 금융 계약이 끝나 원금을 돌려받는 시점. 만기가 길수록 대체로 금리가 높다.',
    icon: 'maturity',
    group: 'money',
  },
  유동성: {
    label: '유동성',
    def: '시장에 도는 돈의 양, 또는 자산을 제값에 빨리 현금으로 바꿀 수 있는 정도.',
    icon: 'liquidity',
    group: 'money',
  },
  코픽스: {
    label: '코픽스(COFIX)',
    def: '국내 은행들이 자금을 조달할 때 든 금리를 평균한 지수. 주택담보대출 등 변동금리 대출의 기준으로 쓰인다.',
    icon: 'bank',
    group: 'money',
  },
  예금자보호: {
    label: '예금자보호',
    def: '금융회사가 파산해도 예금보험공사가 예금을 대신 돌려주는 제도. 2025년 9월부터 보호 한도는 1인당 1억 원이다.',
    icon: 'shield',
    group: 'money',
  },
  금융통화위원회: {
    label: '금융통화위원회',
    def: '한국은행에서 기준금리 등 통화정책을 결정하는 회의체. 연 8회 통화정책방향 회의를 열어 기준금리를 정한다.',
    icon: 'gavel',
    group: 'money',
  },
  마진: {
    label: '마진',
    def: '판매 가격에서 원가를 뺀 이익의 폭. 마진이 얇을수록 비용이 조금만 올라도 이익이 사라진다.',
    icon: 'profitability',
    group: 'money',
  },

  // ── 환율 ──────────────────────────────
  매매기준율: {
    label: '매매기준율',
    def: '전날 은행 사이에 거래된 환율을 거래량으로 가중평균해 산출한 그날 환율의 기준값.',
    icon: 'benchmark',
    group: 'fx',
  },
  전신환: {
    label: '전신환',
    def: '지폐 실물 없이 전산으로만 오가는 외화. 송금·이체가 여기에 해당하며, 현찰보다 환전 수수료가 작다.',
    icon: 'wire',
    group: 'fx',
  },
  스프레드: {
    label: '스프레드',
    def: '두 가격 사이의 간격. 환전에서는 살 때와 팔 때 가격의 차이를, 채권에서는 두 금리의 차이를 가리킨다.',
    icon: 'spread',
    group: 'fx',
  },
  헤지: {
    label: '헤지',
    def: '가격이 움직여 손해 볼 위험을, 반대 방향의 거래를 미리 걸어 두어 상쇄하는 것.',
    icon: 'hedge',
    group: 'fx',
  },
  선물환: {
    label: '선물환',
    def: '미래에 주고받을 외화의 환율을 지금 미리 확정해 두는 계약. 환율이 어디로 가든 그 가격으로 거래한다.',
    icon: 'forward',
    group: 'fx',
  },
  프리미엄: {
    label: '프리미엄',
    def: '권리를 사는 대가로 지불하는 금액. 옵션 거래에서는 보험료에 해당하는 비용이다.',
    icon: 'premium',
    group: 'fx',
  },
  달러인덱스: {
    label: '달러인덱스(DXY)',
    def: '유로·엔 등 주요 6개 통화 대비 달러의 종합적인 강약을 나타내는 지수. 100보다 높으면 기준 시점보다 달러가 강하다는 뜻이다.',
    icon: 'chartline',
    group: 'fx',
  },
  채산성: {
    label: '채산성',
    def: '비용을 빼고 이익이 남는 정도. 환율이 내리면 수출 기업이 받는 원화가 줄어 채산성이 나빠진다.',
    icon: 'profitability',
    group: 'fx',
  },

  // ── 무역 실무 ──────────────────────────────
  인코텀즈: {
    label: '인코텀즈(Incoterms)',
    def: '국제상업회의소(ICC)가 정한 무역 조건 약어 체계. 비용과 위험이 어디서 판매자에서 구매자로 넘어가는지를 세 글자로 약속한다.',
    icon: 'ship',
    group: 'trade',
  },
  신용장: {
    label: '신용장(L/C)',
    def: '수입업자의 거래 은행이 "서류만 맞으면 대금을 지급하겠다"고 약속하는 증서. 서로 모르는 두 나라 기업 사이에 은행이 신용을 빌려주는 장치다.',
    icon: 'lc',
    group: 'trade',
  },
  선하증권: {
    label: '선하증권(B/L)',
    def: '배에 실은 화물의 인수증이자 소유권 증서. 이 서류를 가진 사람이 도착지에서 화물을 찾을 수 있다.',
    icon: 'anchor',
    group: 'trade',
  },
  환어음: {
    label: '환어음',
    def: '수출자가 수입자 앞으로 "이 금액을 지급하라"고 발행하는 지급 청구서. 신용장 거래와 추심 거래의 중심 서류다.',
    icon: 'doc',
    group: 'trade',
  },
  네고: {
    label: '네고(매입)',
    def: '수출자가 선적 서류를 은행에 넘기고 수출 대금을 미리 받는 것. 은행이 서류를 사들인다는 뜻에서 매입(negotiation)이라 부른다.',
    icon: 'coin',
    group: 'trade',
  },
  적하보험: {
    label: '적하보험',
    def: '운송 중 화물의 손상·멸실을 보상하는 보험. 무역 조건(CIF·CIP)에 따라 가입 의무자가 달라진다.',
    icon: 'shield',
    group: 'trade',
  },
  'FCL·LCL': {
    label: 'FCL·LCL',
    def: 'FCL은 컨테이너 하나를 통째로 쓰는 방식, LCL은 여러 화주의 짐을 한 컨테이너에 모아 싣는 방식이다.',
    icon: 'container',
    group: 'trade',
  },
  보세구역: {
    label: '보세구역',
    def: '수입 신고와 세금 납부가 끝나기 전의 화물을 보관하는, 세관이 관리하는 구역. 이 안에 있는 동안은 관세가 유보된다.',
    icon: 'warehouse',
    group: 'trade',
  },
  통관: {
    label: '통관',
    def: '세관에 신고하고 검사와 세금 납부를 거쳐 물품의 반출입 허가를 받는 절차.',
    icon: 'customs',
    group: 'trade',
  },
  관세사: {
    label: '관세사',
    def: '수출입 신고와 관세 업무를 대리하는 국가 자격 전문가. 통관 실무의 대부분이 관세사를 통해 이뤄진다.',
    icon: 'stamp',
    group: 'trade',
  },

  // ── 관세·통상 ──────────────────────────────
  원산지: {
    label: '원산지',
    def: '물품이 실제로 생산·제조된 나라. 관세율과 수입 규제가 이 기준으로 갈린다.',
    icon: 'globe',
    group: 'tariff',
  },
  FTA: {
    label: 'FTA',
    def: '두 나라 이상이 관세를 낮추거나 없애기로 맺는 자유무역협정. 혜택을 받으려면 원산지 요건을 충족하고 증명해야 한다.',
    icon: 'flags',
    group: 'tariff',
  },
  과세가격: {
    label: '과세가격',
    def: '관세를 계산하는 기준 금액. 물품 가격에 운임과 보험료를 더해 정하는 것이 원칙이다.',
    icon: 'scale',
    group: 'tariff',
  },
  관세환급: {
    label: '관세환급',
    def: '수출용 원재료를 수입할 때 낸 관세를, 그 재료로 만든 제품의 수출이 확인되면 되돌려주는 제도.',
    icon: 'refund',
    group: 'tariff',
  },
  덤핑: {
    label: '덤핑',
    def: '자국 판매 가격보다 싸게 수출하는 것. 수입국은 산업 피해가 인정되면 반덤핑관세로 대응할 수 있다.',
    icon: 'gavel',
    group: 'tariff',
  },

  // ── 산업·기술 ──────────────────────────────
  HBM: {
    label: 'HBM',
    def: 'D램을 수직으로 쌓아 데이터가 오가는 통로를 극대화한 고대역폭 메모리. AI 가속기 옆에 붙어 연산의 데이터 병목을 푸는 핵심 부품이다.',
    icon: 'chip',
    group: 'industry',
  },
  파운드리: {
    label: '파운드리',
    def: '설계도를 받아 반도체를 위탁 생산하는 사업. 설계 전문 회사(팹리스)와 생산 전문 회사의 분업 구조를 이룬다.',
    icon: 'warehouse',
    group: 'industry',
  },
  팹리스: {
    label: '팹리스',
    def: '공장(팹) 없이 반도체 설계만 하는 회사. 생산은 파운드리에 맡기고 설계 역량으로 승부한다.',
    icon: 'provisional',
    group: 'industry',
  },
  D램: {
    label: 'D램',
    def: '전원이 꺼지면 내용이 사라지는 휘발성 메모리. 연산의 작업대 역할을 하며, 전원이 꺼져도 데이터가 남는 낸드플래시와 함께 메모리 반도체의 양대 축이다.',
    icon: 'chip',
    group: 'industry',
  },

  패키징: {
    label: '패키징',
    def: '만들어진 칩들을 자르고 쌓고 연결해 완성품으로 조립하는 반도체의 후공정. HBM처럼 칩을 수직으로 쌓는 시대가 되며 기술 난도와 중요도가 급격히 올라갔다.',
    icon: 'chip',
    group: 'industry',
  },
  수율: {
    label: '수율',
    def: '생산한 칩 중 정상 작동하는 비율. 수율이 곧 반도체 공장의 원가 경쟁력이며, 첨단 공정일수록 수율 확보가 어렵다.',
    icon: 'check',
    group: 'industry',
  },

  // ── 통계·지표 ──────────────────────────────
  무역수지: {
    label: '무역수지',
    def: '수출액에서 수입액을 뺀 값. 관세청의 통관 기록을 기준으로 집계하며, 매월 1일에 전월 잠정치가 발표된다.',
    icon: 'chartline',
    group: 'stat',
  },
  경상수지: {
    label: '경상수지',
    def: '상품·서비스·소득·이전까지 포함한 나라 전체의 대외 수입과 지출의 차이. 한국은행이 국제수지 기준으로 집계한다.',
    icon: 'scale',
    group: 'stat',
  },
  잠정치: {
    label: '잠정치',
    def: '확정 전에 먼저 발표하는 임시 집계값. 이후 자료가 보완되면 수치가 소폭 수정될 수 있다.',
    icon: 'provisional',
    group: 'stat',
  },
};

export const GLOSSARY_GROUPS: Record<GlossaryEntry['group'], string> = {
  money: '돈·금리',
  fx: '환율',
  trade: '무역 실무',
  tariff: '관세·통상',
  stat: '통계·지표',
  industry: '산업·기술',
};
