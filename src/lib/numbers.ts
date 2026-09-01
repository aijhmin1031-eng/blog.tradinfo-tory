// 「오늘의 숫자」 지표 묶음 — **이 파일이 유일한 목록이다.**
//
// 왜 여기로 옮겼나 (2026-09-01): 목록이 `pages/numbers.astro` 안에만 있었고,
// `llms.txt` 는 그것을 손으로 베껴 「시계열 25종」이라 적어 두었다. 계열이 늘어도
// llms.txt 는 그대로라 **AI 가 읽는 문서가 사실과 어긋났다.**
// 이 저장소는 같은 사고를 이미 겪었다 — 게이트와 감사가 양식 표를 각자 베껴 들고 있다가
// 한쪽만 고쳐 어긋났고, 그래서 `src/data/forms.json` 한 곳으로 모았다. 같은 처방이다.
import defs from '../../data/sources.json';

export type Group = { name: string; ids: string[]; note: string };

export const GROUPS: Group[] = [
  { name: '환율', ids: ['usdkrw', 'jpy100', 'dxy'], note: '원화의 값과 달러 자체의 강약을 함께 본다' },
  { name: '금리', ids: ['baserate', 'ktb10y', 'deposit1y', 'fedfunds', 'us2y', 'us10y', 'us10y2y'], note: '정책금리와 시장금리는 따로 움직인다' },
  { name: '물가·고용', ids: ['cpi_kr', 'cpi_kr_yoy', 'ppi_kr', 'cpi_us', 'unrate_kr', 'unrate_us'], note: '한국 물가는 지수, 미국은 상승률로 온다' },
  { name: '원자재', ids: ['wti', 'brent', 'natgas', 'copper'], note: '우리 수입 원유는 WTI 보다 브렌트에 가깝다' },
  { name: '대외 거래', ids: ['exports_kr', 'balance_goods_kr', 'reserves_kr', 'prod_kr'], note: '환율의 구조적 배경이 여기 있다' },
  { name: '증시', ids: ['kospi'], note: '' },
];

// glob 은 이 파일 기준 상대경로다. `src/lib/` 와 `src/pages/` 는 깊이가 같아 경로가 같다.
const series = import.meta.glob('../../data/series/*.json', { eager: true });
export const loadSeries = (id: string): any => (series[`../../data/series/${id}.json`] as any)?.default;

export const META = new Map<string, any>((defs.series as any[]).map((d) => [d.id, d]));

/** 자릿수는 **정의서의 `frac` 이 우선**이다. 크기로만 정하면 환율 1,380.30 이 1,380 으로 잘린다. */
export const fmtValue = (v: number, frac?: number) => {
  const f = frac ?? (Math.abs(v) >= 10000 ? 0 : Math.abs(v) >= 100 ? 1 : 2);
  return v.toLocaleString('ko-KR', { minimumFractionDigits: f, maximumFractionDigits: f });
};

/** `20260901` → `2026-09-01`, `202607` → `2026-07` */
export const dashDate = (d: string) =>
  d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : `${d.slice(0, 4)}-${d.slice(4, 6)}`;

/** 파생 계열은 `data/sources.json` 에 정의가 없다(수집한 것이 아니라 우리가 만든 것이므로).
 *  그래서 출처가 빈칸으로 나갔다 — 절대 규칙 2(출처 명기) 위반이라 여기서 메운다.
 *  **빈칸으로 두느니 무엇에서 산출했는지 밝힌다.** 새 파생 계열을 만들면 여기 한 줄 추가할 것. */
const DERIVED_SOURCE: Record<string, string> = {
  cpi_kr_yoy: '도토리경제 자체 계산 (한국은행 ECOS 소비자물가지수에서 전년 동월 대비 산출)',
};

export type Row = { id: string; name: string; value: string; unit: string; asOf: string; source: string; group: string };

/** 지금 값이 있는 지표만, 그룹 순서대로. 값·단위·기준일·출처를 함께 돌려준다. */
export function currentRows(): Row[] {
  const out: Row[] = [];
  for (const g of GROUPS) {
    for (const id of g.ids) {
      const s = loadSeries(id);
      if (!s?.points?.length) continue; // 자료가 없는 계열은 조용히 뺀다 — 빈 줄이 나가면 안 된다
      const last = s.points[s.points.length - 1];
      const m = META.get(id) ?? {};
      out.push({
        id,
        name: m.name ?? s.name ?? id,
        value: fmtValue(last.v, m.frac),
        unit: m.unit ?? s.unit ?? '',
        asOf: dashDate(String(last.d)),
        source: m.license ?? m.source ?? DERIVED_SOURCE[id] ?? '출처 미상 — 확인 필요',
        group: g.name,
      });
    }
  }
  return out;
}
