// 계열 낱장 — 데이터 데스크의 차트가 필요할 때만 받아 간다.
//
// 왜 엔드포인트로 가르나: 계열 63개를 전부 페이지에 실으면 2.0MB 다. 표에 필요한 것은
//   마지막 값 몇 개뿐이므로, **표는 빌드 시점 요약으로 그리고 차트만 여기서 받는다.**
//   정적 사이트라 서버가 없지만 Astro 가 빌드 때 파일로 구워 주므로 동작은 같다.
//
// 긴 계열은 **화면 폭보다 점이 많다**(us10y 는 3,838개). 그대로 보내면 파일이 크고
//   그려도 구분되지 않으므로 최대 720점으로 솎는다 — 다만 **마지막 점은 반드시 남긴다**
//   (오늘 값이 빠지면 표와 차트가 어긋나 보인다).
import type { APIRoute } from 'astro';

const files = import.meta.glob<any>('../../../../data/series/*.json', { eager: true, import: 'default' });

const MAX = 720;
const thin = <T,>(pts: T[]): T[] => {
  if (pts.length <= MAX) return pts;
  const step = (pts.length - 1) / (MAX - 1);
  const out: T[] = [];
  for (let i = 0; i < MAX - 1; i++) out.push(pts[Math.round(i * step)]);
  out.push(pts[pts.length - 1]); // 끝점은 솎지 않는다
  return out;
};

export function getStaticPaths() {
  return Object.keys(files).map((k) => ({
    params: { id: k.split('/').pop()!.replace('.json', '') },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const f = files[`../../../../data/series/${params.id}.json`];
  if (!f) return new Response('not found', { status: 404 });
  return new Response(
    JSON.stringify({
      id: f.id, name: f.name, unit: f.unit, cycle: f.cycle,
      updatedAt: f.updatedAt, n: f.points.length, points: thin(f.points),
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } }
  );
};
