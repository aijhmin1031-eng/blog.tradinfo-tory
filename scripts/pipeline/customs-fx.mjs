// 관세청 관세환율(과세환율) 수집 — 수입신고에 실제로 적용되는 주간 환율
//
// 왜 필요한가 (2026-08-31):
//   `/import-cost/` 계산기가 지금은 **시장 환율**(ECOS 매매기준율)을 기본값으로 쓴다.
//   그런데 수입신고서에 적히는 것은 **관세청이 주 단위로 고시하는 과세환율**이다.
//   둘은 다르고, 이 차이가 곧 계산기의 「실제 신고 환율은 다를 수 있다」는 단서였다.
//   과세환율을 받아 오면 그 단서를 걷어낼 수 있고, **통화 선택(EUR·JPY·CNY)까지 열린다.**
//   (2026-08-29 실측에서 이 API 만 활용신청이 없어 403 이었고, 8/31 소유주가 신청해 열렸다.)
//
// API: 관세청_관세환율정보(GW)  https://www.data.go.kr/data/15101230/openapi.do
//   요청: serviceKey · aplyBgnDt(YYYYMMDD, 조회 기준일) · weekFxrtTpcd(수출 1 / 수입 2)
//   응답 item: cntySgn(국가부호) mtryUtNm(화폐단위명) currSgn(통화부호) fxrt(환율)
//             aplyBgnDt(적용개시일자) imexTp(수출입구분)
//
// 산출:
//   data/series/customs_fx_<통화>.json  — 주간 시계열(수입 기준). 장기 축적.
//   src/data/customs-fx.json            — 화면·계산기 바인딩용 최신 스냅샷(전 통화)
//
// 사용: DATA_GO_KR_KEY=... node scripts/pipeline/customs-fx.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
const ROOT = new URL('../../', import.meta.url);
const SERIES_DIR = new URL('data/series/', ROOT);
const OUT = new URL('src/data/customs-fx.json', ROOT);
const ENDPOINT = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';

// 시계열로 쌓을 통화. 나머지는 최신 스냅샷에만 담는다(계열 파일이 무한정 늘지 않게).
const SERIES_CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY'];
// 과세환율은 주 단위 고시다. 오늘 값이 아직 없으면 하루씩 뒤로 물러 최대 열흘까지 찾는다.
const LOOKBACK_DAYS = 10;

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1] : null;
};
const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** 기준일 하나를 조회한다. 고시가 없는 날이면 빈 배열을 돌려준다. */
async function fetchDay(dateStr, imexTp = '2') {
  const url =
    `${ENDPOINT}?serviceKey=${KEY}&aplyBgnDt=${dateStr}&weekFxrtTpcd=${imexTp}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`관세환율 ${dateStr} HTTP ${res.status}`);
  const xml = await res.text();
  const code = tag(xml, 'resultCode');
  // 결과코드가 정상이 아니면 원문 메시지를 그대로 올린다(활용신청 누락 등을 바로 알기 위해).
  if (code && code !== '00') throw new Error(`관세환율 ${dateStr}: [${code}] ${tag(xml, 'resultMsg')}`);
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const rows = [];
  for (const it of items) {
    const cur = tag(it, 'currSgn');
    const rate = Number(tag(it, 'fxrt'));
    if (!cur || !Number.isFinite(rate) || rate <= 0) continue;
    rows.push({
      cur,
      rate,
      unitName: tag(it, 'mtryUtNm') ?? '',
      country: tag(it, 'cntySgn') ?? '',
      applyDate: tag(it, 'aplyBgnDt') ?? dateStr,
    });
  }
  return rows;
}

async function accumulate(cur, rows) {
  const file = new URL(`customs_fx_${cur}.json`, SERIES_DIR);
  let stored = {
    id: `customs_fx_${cur}`,
    name: `관세환율(수입) ${cur}`,
    unit: 'KRW',
    cycle: 'W',
    points: [],
  };
  try {
    stored = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const map = new Map(stored.points.map((p) => [p.d, p]));
  for (const r of rows) map.set(r.applyDate, { d: r.applyDate, v: r.rate });
  stored.points = [...map.values()].sort((a, b) => a.d.localeCompare(b.d));
  stored.updatedAt = new Date().toISOString().slice(0, 10);
  await writeFile(file, JSON.stringify(stored, null, 1) + '\n');
  return stored;
}

async function main() {
  if (!KEY) {
    console.log('[customs-fx] DATA_GO_KR_KEY 미설정 — 건너뜀');
    return;
  }
  await mkdir(SERIES_DIR, { recursive: true });

  let rows = [];
  let usedDate = null;
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = ymd(d);
    try {
      const got = await fetchDay(ds);
      if (got.length) {
        rows = got;
        usedDate = ds;
        break;
      }
      console.log(`[customs-fx] ${ds}: 고시 없음`);
    } catch (e) {
      // 첫 시도의 오류는 그대로 올린다(활용신청 누락·키 문제를 조용히 넘기지 않는다).
      if (i === 0) throw e;
      console.log(`[customs-fx] ${ds} 실패: ${e.message}`);
    }
  }

  if (!rows.length) {
    console.log(`[customs-fx] 최근 ${LOOKBACK_DAYS}일 안에 고시를 못 찾음 — 기존 값 유지`);
    return;
  }

  const applyDate = rows[0].applyDate;
  console.log(`[customs-fx] 조회일 ${usedDate} · 적용개시 ${applyDate} · 통화 ${rows.length}종`);
  for (const c of SERIES_CURRENCIES) {
    const r = rows.find((x) => x.cur === c);
    // 화폐단위명을 함께 찍는다. 엔화처럼 100 단위로 고시되는 통화가 있는지 눈으로 확인해야 한다.
    console.log(`[customs-fx]   ${c}: ${r ? `${r.rate} (${r.unitName})` : '없음'}`);
  }

  for (const c of SERIES_CURRENCIES) {
    const r = rows.find((x) => x.cur === c);
    if (!r) continue;
    const stored = await accumulate(c, [r]);
    console.log(`[customs-fx] customs_fx_${c}: ${stored.points.length}주 누적`);
  }

  const snapshot = {
    applyDate,
    fetchedAt: new Date().toISOString().slice(0, 10),
    basis: '수입(과세)',
    source: '관세청 관세환율정보(GW)',
    rates: Object.fromEntries(
      rows.map((r) => [r.cur, { rate: r.rate, unitName: r.unitName, country: r.country }]),
    ),
  };
  await writeFile(OUT, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`[customs-fx] customs-fx.json 갱신 (통화 ${rows.length}종)`);
}

main().catch((e) => {
  console.log(`[customs-fx] 실패: ${e.message}`);
  process.exitCode = 0; // 계열 하나가 실패해도 파이프라인 전체를 멈추지 않는다
});
