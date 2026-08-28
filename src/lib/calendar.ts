// 경제 일정 — 「다음 분기점이 언제인가」
//
// 왜 필요한가: 우리 시계열은 전부 **지나간 값**이라 기사가 늘 뒤를 본다.
// 전문 매체가 우리와 갈리는 자리가 여기다. 같은 기준금리를 쓰면서 저쪽은
// 「오늘 밤 11시」를 제목에 박고 우리는 「다음에 확인할 것」을 날짜 없이 적었다.
// 등록부는 `src/data/calendar.json`, 날짜는 발표 기관 공식 페이지에서 확인한 것만 넣는다.
import raw from '../data/calendar.json';
import { TZ_KST, todayIn } from './site';

export type CalEvent = {
  id: string;
  date: string; // 발표 현지 날짜 (YYYY-MM-DD)
  org: string;
  name: string;
  what: string;
  series?: string;
  tz: 'KST' | 'ET';
  etTime?: string;
  sep?: boolean;
  src: string;
  verifiedAt: string;
};

export const CAL_SOURCES = raw.sources as Record<string, string>;
export const EVENTS = (raw.events as CalEvent[]).slice().sort((a, b) => a.date.localeCompare(b.date));

// ET 오프셋을 실제로 잰다. 서머타임을 손으로 계산하면 1년에 두 번 틀린다.
// UTC 17시가 그날 ET 로 몇 시인지 물으면 오프셋이 나온다(EDT 13시 → 4, EST 12시 → 5).
const etOffset = (isoDate: string) => {
  const hh = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).format(new Date(`${isoDate}T17:00:00Z`));
  return 17 - Number(hh);
};

/** ET 발표 시각을 한국 날짜·시각으로. FOMC 는 늘 다음 날 새벽이다. */
export const kstMoment = (e: CalEvent) => {
  if (e.tz === 'KST' || !e.etTime) return { date: e.date, time: null as string | null };
  const [h, m] = e.etTime.split(':').map(Number);
  const utc = new Date(`${e.date}T00:00:00Z`);
  utc.setUTCHours(h + etOffset(e.date), m);
  const kst = new Date(utc.getTime() + 9 * 3600_000);
  return {
    date: kst.toISOString().slice(0, 10),
    time: `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`,
  };
};

/** 한국시간 오늘 기준 남은 날수. 오늘이면 0. */
export const daysUntil = (isoDate: string, now: Date = new Date()) =>
  Math.round((Date.parse(isoDate) - Date.parse(todayIn(TZ_KST, now))) / 86_400_000);

/** 한국시간 기준으로 아직 오지 않은 일정 (발표가 한국시간으로 언제인지로 잰다) */
export const upcoming = (n = 3, now: Date = new Date()) =>
  EVENTS.filter((e) => kstMoment(e).date >= todayIn(TZ_KST, now)).slice(0, n);

/** 이미 지난 일정 중 가장 최근 것 — 「직전 회의는 이랬다」에 쓴다 */
export const lastPast = (now: Date = new Date()) => {
  const t = todayIn(TZ_KST, now);
  const past = EVENTS.filter((e) => kstMoment(e).date < t);
  return past[past.length - 1] ?? null;
};

/** 특정 계열에 걸린 다음 일정 — 기사 끝 「다음 확인 시점」에 날짜를 준다 */
export const nextFor = (series: string, now: Date = new Date()) =>
  upcoming(EVENTS.length, now).find((e) => e.series === series) ?? null;

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 10월 22일 (목) */
export const calLabel = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${m}월 ${d}일 (${KO_DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
};

/** D-3 · 오늘 · D+2 */
export const ddayLabel = (isoDate: string, now: Date = new Date()) => {
  const d = daysUntil(isoDate, now);
  return d === 0 ? '오늘' : d > 0 ? `D-${d}` : `D+${-d}`;
};
