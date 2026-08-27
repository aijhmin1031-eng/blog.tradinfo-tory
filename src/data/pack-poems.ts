// 그림함 낱장에 붙는 짧은 시 (소유주 제안, 2026-08-27).
//
// 왜 시인가: 낱장 118쪽이 서로 고유 195자밖에 차이가 없었다. 사양만 늘리면 표가 길어질 뿐
// 사람이 읽을 이유가 생기지 않는다. 그림 한 장이 무엇을 뜻하는지를 두세 줄로 적으면
// **그 쪽에만 있는 글**이 생기고, 그림을 고르는 사람에게도 쓸모가 있다.
//
// 규칙: 두세 줄. 추상어(희망·미래·성장) 금지. 마지막 줄에 생각이 한 번 꺾일 것.
// 긴 대시 금지(절대 규칙 3). 상투구 금지 — 「벼는 익을수록 고개를 숙인다」 같은 것은 쓰지 않는다.

export type Poem = { ko: string[]; en?: string[] };

export const POEMS: Record<string, Poem> = {
  // ── 1탄 돈의 물건들 ──────────────────────────────
  'coin-acorn': { ko: ['한 알은 심으면 나무가 되고', '한 닢은 세면 숫자가 된다.', '겨울을 나는 쪽은 대개 심은 쪽이다.'], en: ['Plant the one and it becomes a tree.', 'Count the other and it becomes a number.', 'Winter tends to favour what was planted.'] },
  'chart-up': { ko: ['오르는 선은 지나간 자리만 그린다.', '화살표가 가리키는 곳에는', '아직 아무 값도 찍혀 있지 않다.'], en: ['A rising line draws only where it has been.', 'Where the arrow points,', 'nothing has been recorded yet.'] },
  'chart-down': { ko: ['내려가는 선도 선이다.', '같은 붓으로 그렸고 같은 눈금을 밟았다.', '읽는 사람의 표정만 달라진다.'], en: ['A falling line is still a line.', 'Same ink, same gridlines.', 'Only the reader\'s face changes.'] },
  'piggy-bank': { ko: ['넣을 구멍은 있고 꺼낼 구멍은 없다.', '그 불편이 저금통의 전부다.'], en: ['There is a slot for putting in', 'and none for taking out.', 'That inconvenience is the whole design.'] },
  'banknotes': { ko: ['종이의 무게는 어디서나 같다.', '값을 다르게 만드는 것은', '그 위의 숫자를 믿는 사람의 수다.'], en: ['Paper weighs the same everywhere.', 'What changes its worth is the number of people', 'who trust the figure printed on it.'] },
  'gold-bars': { ko: ['금은 이자를 낳지 않는다.', '사람들이 다른 모든 것을 의심할 때', '그 무능이 미덕이 된다.'], en: ['Gold pays no interest.', 'When everything else is doubted,', 'that uselessness becomes a virtue.'] },
  'cargo-ship': { ko: ['배는 상자를 옮기고', '상자는 약속을 옮긴다.', '바다에 떠 있는 것은 대개 계약이다.'], en: ['The ship carries boxes', 'and the boxes carry promises.', 'What floats out there is mostly contract.'] },
  'harbor-crane': { ko: ['들어 올리는 데 삼 분,', '그 삼 분을 기다리느라', '배 한 척이 하루를 쓴다.'], en: ['Three minutes to lift it.', 'Waiting for those three minutes', 'costs a ship an entire day.'] },
  'globe-routes': { ko: ['지도 위의 선은 곧지만', '그 선을 지나는 배는', '매번 다른 파도를 지난다.'], en: ['The lines on the map are straight.', 'The ships that follow them', 'cross different water every time.'] },
  'ledger-pen': { ko: ['적히지 않은 거래는 없었던 거래다.', '장부는 기억을 대신하는 것이 아니라', '기억을 못 믿어서 있는 것이다.'], en: ['A trade not written down did not happen.', 'A ledger does not replace memory.', 'It exists because memory is not trusted.'] },
  'abacus': { ko: ['전기가 없어도 셈은 틀리지 않았다.', '틀린 것은 언제나', '알을 옮긴 손이었다.'], en: ['It never miscounted for want of electricity.', 'What erred was always', 'the hand that moved the beads.'] },
  'bank-building': { ko: ['기둥이 굵은 이유는', '무거운 것을 떠받쳐서가 아니라', '무너지지 않아 보여야 해서다.'], en: ['The columns are thick', 'not because they carry weight', 'but because they must look unable to fall.'] },
  'exchange': { ko: ['같은 값의 두 종이를 맞바꾸는 일.', '그 사이 소수점 둘째 자리에서', '하루치 손익이 갈린다.'], en: ['Two papers of equal worth trade places.', 'A day of profit and loss is decided', 'in the second decimal between them.'] },
  'semiconductor': { ko: ['손톱만 한 판 위에', '도시 하나만큼의 길이 깔려 있다.', '값이 오르는 것은 그 길의 촘촘함이다.'], en: ['On a plate the size of a fingernail', 'lie the roads of an entire city.', 'What rises in price is how closely they are packed.'] },
  'scale': { ko: ['저울은 어느 쪽도 편들지 않는다.', '기울었다면', '올려놓은 쪽이 무거웠을 뿐이다.'], en: ['A balance takes no side.', 'If it tilts,', 'the load on that side was heavier.'] },
  'lighthouse': { ko: ['등대는 길을 알려 주지 않는다.', '여기가 뭍이라고', '다만 제 자리를 밝힐 뿐이다.'], en: ['A lighthouse gives no directions.', 'It says only that here is land,', 'and holds its own position.'] },
  'tori-treasure': { ko: ['품에 안은 것이 많아질수록', '셈은 정확해야 한다.', '곳간을 지키는 일의 절반은 세는 일이다.'], en: ['The more one holds,', 'the more exact the counting must be.', 'Half of guarding a store is counting it.'] },
  'tori-reading': { ko: ['읽는 일은 느리다.', '그러나 겨울이 왔을 때', '무엇을 남길지 아는 쪽은 읽은 쪽이다.'], en: ['Reading is slow.', 'But when winter comes,', 'the one who read knows what to keep.'] },

  // ── 2탄 가을과 명절 ──────────────────────────────
  'full-moon': { ko: ['일 년에 한 번', '가장 둥근 얼굴로 뜬다.', '그날만은 아무도 그 값을 묻지 않는다.'], en: ['Once a year it rises at its roundest.', 'On that night', 'nobody asks what it is worth.'] },
  'songpyeon': { ko: ['속을 감춘 채로 쪄야', '모양이 산다.', '솔잎 냄새는 그 감춘 시간의 값이다.'], en: ['It must be steamed with the filling hidden', 'for the shape to hold.', 'The scent of pine is the price of that hidden time.'] },
  'gift-bojagi': { ko: ['네 귀를 모아 묶으면', '무엇이든 선물이 된다.', '매듭은 보내는 사람의 마지막 문장이다.'], en: ['Gather the four corners and tie them', 'and anything becomes a gift.', 'The knot is the sender\'s last sentence.'] },
  'persimmon': { ko: ['떫은 채로 따면 못 먹는다.', '기다린 시간만큼만 달아진다.'], en: ['Picked while astringent, it cannot be eaten.', 'It sweetens only as much as it was left alone.'] },
  'chestnut': { ko: ['가시를 벗기고 껍질을 벗기고', '속껍질까지 벗겨야', '겨우 한 알이다.'], en: ['Past the burr, past the shell,', 'past the skin beneath it,', 'and there is barely one nut.'] },
  'acorn-trio': { ko: ['크기가 다르다고', '심는 깊이가 달라지지는 않는다.', '셋 다 같은 흙에 묻힌다.'], en: ['Being of different sizes', 'does not change how deep they are planted.', 'All three go into the same soil.'] },
  'oak-leaf': { ko: ['가장자리가 물결치는 것은', '바람을 오래 견딘 잎의 모양이다.'], en: ['The wavy edge is the shape of a leaf', 'that endured wind for a long time.'] },
  'ginkgo-leaf': { ko: ['부채꼴로 펴진 잎 하나가', '가을이 왔다는 가장 짧은 통지다.'], en: ['One leaf opened like a fan', 'is the shortest notice that autumn has arrived.'] },
  'rice-sheaf': { ko: ['묶어 세워야 마른다.', '한 단으로 서 있는 동안', '낟알은 제 무게를 마친다.'], en: ['It must be bound and stood upright to dry.', 'While it stands as one sheaf', 'the grain finishes its own weight.'] },
  'coin-pouch': { ko: ['엽전은 소리로 먼저 온다.', '주머니를 여는 손보다', '흔드는 손이 먼저 웃는다.'], en: ['The coins arrive as sound first.', 'The hand that shakes the pouch', 'laughs before the hand that opens it.'] },
  'lantern': { ko: ['청색과 홍색 사이에', '심지 하나가 있다.', '밤이 길수록 그 하나가 커 보인다.'], en: ['Between the blue and the red', 'there is a single wick.', 'The longer the night, the larger it looks.'] },
  'yakgwa': { ko: ['꿀에 담근 시간이', '반죽을 부드럽게 한다.', '서두른 약과는 언제나 딱딱하다.'], en: ['Time spent in honey softens the dough.', 'A hurried yakgwa is always hard.'] },

  // ── 장식 부품 ──────────────────────────────
  'ribbon-label': { ko: ['이름표는 물건을 바꾸지 않는다.', '다만 부를 이름을 준다.'], en: ['A label does not change the thing.', 'It only gives it a name to be called by.'] },
  'frame-round': { ko: ['테두리는 안쪽을 가두지 않는다.', '여기부터 보라고', '눈길을 세워 줄 뿐이다.'], en: ['A border does not shut the inside in.', 'It stands the eye up', 'and says, begin here.'] },
  'corner-flourish': { ko: ['네 귀퉁이가 정리되면', '가운데는 저절로 조용해진다.'], en: ['Once the four corners are settled,', 'the middle grows quiet by itself.'] },
  'divider': { ko: ['문장과 문장 사이에도', '숨 쉴 자리가 필요하다.', '선 하나가 그 자리를 만든다.'], en: ['Even between sentences', 'there must be room to breathe.', 'A single line makes that room.'] },

  // ── 소소의 작업실 수채 ──────────────────────────────
  'latte': { ko: ['하트는 삼십 초면 사라진다.', '그 짧음을 알면서도', '매번 그려 넣는다.'], en: ['The heart is gone in thirty seconds.', 'Knowing that,', 'it is drawn again every time.'] },
  'sketchbook': { ko: ['빈 종이는 두렵지 않다.', '첫 줄을 그은 뒤에야', '무엇을 그릴지 정해진다.'], en: ['Blank paper is not frightening.', 'Only after the first line', 'is it settled what will be drawn.'] },
  'acorns': { ko: ['물감이 마르는 동안', '세 알은 나란히 앉아 있었다.', '번진 자리가 그늘이 되었다.'], en: ['While the paint dried', 'the three sat side by side.', 'Where it bled became the shade.'] },
  'tart': { ko: ['한 조각으로 자른 것은', '아껴 먹기 위해서가 아니라', '나눠 먹기 위해서다.'], en: ['It was cut into a slice', 'not to be eaten sparingly', 'but to be shared.'] },
  'teapot': { ko: ['끓는 물이 지나가야', '잎은 제 색을 내놓는다.', '급히 따르면 맹물이다.'], en: ['Boiling water must pass through', 'before the leaf gives up its colour.', 'Poured in haste it is only water.'] },
  'macaron': { ko: ['겉은 바스러지고 속은 눅진하다.', '서로 다른 두 식감을', '한 입에 넣는 일.'], en: ['Crisp outside, dense within.', 'Two textures that disagree,', 'taken in one bite.'] },
  'sugarcube': { ko: ['네모난 것이 둥근 잔에 들어가', '흔적 없이 사라진다.', '남는 것은 맛뿐이다.'], en: ['Something square enters a round cup', 'and disappears without trace.', 'What remains is the taste.'] },
  'lemon': { ko: ['얇게 썰어야 향이 먼저 나온다.', '두꺼우면 신맛만 남는다.'], en: ['Sliced thin, the scent comes first.', 'Cut thick, only the sourness stays.'] },

  // ── 3탄 사무실과 책상 ──────────────────────────────
  'laptop': { ko: ['화면이 비어 있을 때가', '가장 무겁다.'], en: ['The screen is heaviest', 'when it is empty.'] },
  'notebook-pen': { ko: ['적어 두지 않은 생각은', '대개 그날 안에 사라진다.'], en: ['A thought not written down', 'usually disappears the same day.'] },
  'clipboard': { ko: ['체크 표시 셋이', '밤잠을 지켜 준다.'], en: ['Three check marks', 'protect a night of sleep.'] },
  'desk-calendar': { ko: ['넘긴 장은 돌아오지 않는다.', '그래서 달력은', '언제나 앞쪽이 두껍다.'], en: ['A turned page does not come back.', 'That is why a calendar', 'is always thicker at the front.'] },
  'coffee-mug': { ko: ['김이 오르는 동안만', '하루는 아직 시작되지 않았다.'], en: ['While the steam is still rising', 'the day has not yet begun.'] },
  'document-folder': { ko: ['찾을 수 없는 자료는', '없는 자료와 같다.'], en: ['A file that cannot be found', 'is the same as a file that does not exist.'] },
  'sticky-notes': { ko: ['붙였다 떼는 종이에', '가장 급한 일이 적힌다.'], en: ['The most urgent work is written', 'on paper made to be peeled off.'] },
  'presentation-board': { ko: ['막대의 높이는 정직하지만', '눈금을 어디서 끊을지는', '그리는 사람이 정한다.'], en: ['The height of a bar is honest.', 'Where the axis is cut', 'is decided by whoever draws it.'] },
  'whiteboard': { ko: ['지울 수 있어서', '무엇이든 적을 수 있다.'], en: ['Because it can be erased,', 'anything can be written on it.'] },
  'printer': { ko: ['화면의 글자는 고칠 수 있고', '종이의 글자는 남는다.'], en: ['Letters on a screen can be corrected.', 'Letters on paper remain.'] },
  'desk-lamp': { ko: ['불빛이 닿는 만큼만 책상이다.', '나머지는 밤이다.'], en: ['The desk is only as wide as the light reaches.', 'The rest is night.'] },
  'magnifier-doc': { ko: ['크게 보는 일은', '더 많이 보는 일이 아니라', '덜 보는 대신 자세히 보는 일이다.'], en: ['To look larger is not to see more', 'but to see less, and closely.'] },
  'stamp': { ko: ['붉은 자국 하나가', '종이를 문서로 바꾼다.'], en: ['One red mark', 'turns paper into a document.'] },
  'envelope': { ko: ['봉랍을 누르는 순간', '편지는 더 이상', '쓴 사람의 것이 아니다.'], en: ['The moment the seal is pressed,', 'the letter belongs to the writer no longer.'] },
  'gear-cogs': { ko: ['혼자 도는 톱니는', '아무 일도 하지 않는다.', '맞물려야 비로소 기계다.'], en: ['A cog turning alone does no work.', 'Only when meshed is it a machine.'] },
  'wall-clock': { ko: ['시계는 시간을 만들지 않는다.', '다만 모두가 같은 시간을', '보게 할 뿐이다.'], en: ['A clock does not make time.', 'It only makes everyone', 'look at the same one.'] },
};
