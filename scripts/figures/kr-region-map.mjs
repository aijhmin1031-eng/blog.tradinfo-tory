// 대한민국 권역 지도 작도기 (2026-08-27 신설).
//
// **왜 손으로 그리는가**: 이미지 생성 모델에게 지도를 그리게 했더니 해안선이 실제와 달랐다.
// 소유주 지적으로 폐기했다. 지도는 삽화이기 전에 사실이라, 실제 경계 데이터로 그린다.
//
// 데이터: Natural Earth 1:50m admin_0_countries (퍼블릭 도메인).
//   이 컨테이너는 node fetch 가 프록시에 막히므로 curl 로 받아 둔다.
//   curl -sO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
//   mv ne_50m_admin_0_countries.geojson geo.json   (스크래치패드에 두고 이 스크립트를 그 옆에서 실행)
//
// 산출: kr-map.svg → sharp 로 PNG/JPG 변환해 src/assets/hero/ 에 넣는다.
// 제주는 회색이다 — 산업용 지역 전기요금제의 적용 대상에서 제외됐기 때문이다.
// 띠 경계 위도는 4개 광역권을 나타내는 **개념도**이며 행정 경계가 아니다.

// 실제 경계 데이터(Natural Earth 1:50m)로 대한민국 지도를 그린다.
// 모델이 그린 지도는 해안선이 실제와 달랐다. 지도는 사실이어야 한다.
import { readFileSync, writeFileSync } from 'node:fs';
const g = JSON.parse(readFileSync('geo.json', 'utf8'));
const kr = g.features.find(f => (f.properties.NAME || f.properties.ADMIN) === 'South Korea');
const polys = kr.geometry.coordinates.map(p => p[0]); // MultiPolygon 의 외곽 링만

// 면적 순으로 정렬 — 가장 큰 것이 본토, 그다음 큰 섬이 제주다.
const area = (r) => Math.abs(r.reduce((s, [x, y], i) => {
  const [x2, y2] = r[(i + 1) % r.length]; return s + (x * y2 - x2 * y);
}, 0) / 2);
const sorted = [...polys].sort((a, b) => area(b) - area(a));
const mainland = sorted[0];
// 제주는 본토 남서쪽에 있는 큰 섬. 위도 33~34, 경도 126 부근으로 특정한다.
const jeju = sorted.find(r => { const c = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length], [0, 0]);
  return c[1] < 34.0 && c[0] > 125.5 && c[0] < 127.5; });
let others = sorted.filter(r => r !== mainland && r !== jeju && area(r) > 0.0006);

// 화면 폭은 **본토와 제주**로만 잡는다. 울릉도·독도처럼 멀리 떨어진 섬을 넣으면
// 그것이 상자를 넓혀 본토가 한쪽으로 밀린다(첫 시안에서 실제로 그랬다).
const framing = [mainland, jeju].filter(Boolean).flat();
const all = framing;
const lons = all.map(p => p[0]), lats = all.map(p => p[1]);
const [minX, maxX, minY, maxY] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
// 위도 보정(메르카토르 대신 단순 코사인 보정) — 이 위도대에서는 이것으로 충분히 정확하다.
const kx = Math.cos((minY + maxY) / 2 * Math.PI / 180);
const W = 1376, H = 768, PAD = 40;
const sx = (W - PAD * 2) / ((maxX - minX) * kx), sy = (H - PAD * 2) / (maxY - minY);
const s = Math.min(sx, sy);
// 지도는 오른쪽에 두고 왼쪽은 막대 자리로 비운다.
const mapW = (maxX - minX) * kx * s;
const offX = W - mapW - 150, offY = (H - (maxY - minY) * s) / 2;
const px = ([lon, lat]) => [offX + (lon - minX) * kx * s, offY + (maxY - lat) * s];
const path = (ring) => 'M' + ring.map(p => px(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
// 본토 상자 밖으로 나가는 먼 섬은 그리지 않는다(화면 오른쪽에 점 하나로 뜬다).
others = others.filter(r => r.every(([lon, lat]) => lon >= minX - 0.15 && lon <= maxX + 0.15 && lat >= minY - 0.15 && lat <= maxY + 0.15));

// 광역권 경계 위도. 설계안의 4개 광역권을 대략의 위도선으로 나눈다(개념도).
const yOf = (lat) => offY + (maxY - lat) * s;
const bands = [
  { to: 37.05, fill: '#1E3A5F' }, // 위도 37.05 이북: 수도권 북부 계열
  { to: 36.30, fill: '#4B6C93' },
  { to: 35.35, fill: '#D9A03C' },
  { to: -90,   fill: '#C05B36' },
];
let defs = '', bandRects = '';
bands.forEach((b, i) => {
  const yTop = i === 0 ? 0 : yOf(bands[i - 1].to);
  const yBot = b.to === -90 ? H : yOf(b.to);
  bandRects += `<rect x="0" y="${yTop.toFixed(1)}" width="${W}" height="${(yBot - yTop).toFixed(1)}" fill="${b.fill}"/>`;
});
const mainlandPath = path(mainland);
const otherPaths = others.map(path).join('');
const jejuPath = jeju ? path(jeju) : '';

// 권역별 인하 폭 막대. 설계안의 구조를 그대로 옮긴 것이다 — 남부로 갈수록 깎이는 몫이 커지고
// 수도권은 0 에 가깝다. 길이는 최대 18원을 기준으로 한 비례이고, 숫자는 넣지 않는다(삽화이므로).
const barVals = [0, 6, 12, 18]; // 위(수도권 북부 계열) → 아래(남부권)
const barX = 150, barMaxW = 300, barH = 30, barGap = 26;
const barsTop = (H - (barVals.length * barH + (barVals.length - 1) * barGap)) / 2;
const bars = barVals.map((v, i) => {
  const y = barsTop + i * (barH + barGap);
  const w = Math.max(14, (v / 18) * barMaxW);
  const fill = bands[i].fill;
  return `<rect x="${barX}" y="${y}" width="${w.toFixed(0)}" height="${barH}" rx="6" fill="${fill}" stroke="#16140F" stroke-width="2"/>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#F7DFB3"/>
  ${bars}
  <defs><clipPath id="kr"><path d="${mainlandPath}"/>${otherPaths ? `<path d="${otherPaths}"/>` : ''}</clipPath></defs>
  <g clip-path="url(#kr)">${bandRects}</g>
  <path d="${mainlandPath}" fill="none" stroke="#16140F" stroke-width="2.4" stroke-linejoin="round"/>
  ${others.map(r => `<path d="${path(r)}" fill="none" stroke="#16140F" stroke-width="1.6"/>`).join('')}
  ${jejuPath ? `<path d="${jejuPath}" fill="#C9C6C0" stroke="#16140F" stroke-width="2"/>` : ''}
</svg>`;
writeFileSync('kr-map.svg', svg);
console.log('본토 점', mainland.length, '· 제주', jeju ? '찾음' : '못 찾음', '· 그 밖 섬', others.length);
