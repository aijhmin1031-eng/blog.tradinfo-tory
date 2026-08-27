// ads.txt — 광고 재고를 누가 팔 권한이 있는지 밝히는 IAB 표준 파일.
// 애드센스 승인 뒤 이것이 없으면 대시보드에 「수익 손실 위험」 경고가 계속 뜬다.
//
// ★ 정적 빌드에서는 엔드포인트가 **무조건 파일을 만든다.** 처음에 404 Response 를 돌려줬더니
//    `dist/ads.txt` 에 「Not found」가 본문으로 박혀 200 으로 나갔다(2026-08-27 수리).
//    그래서 게시자 ID 가 없을 때는 **주석만 있는 유효한 ads.txt** 를 낸다.
//    ads.txt 표준은 `#` 주석을 허용하고, 승인된 판매자가 없다는 사실 그대로라 거짓도 아니다.
import type { APIRoute } from 'astro';
import { adsTxtLine, adsenseOn } from '../lib/adsense';

const body = adsenseOn
  ? `${adsTxtLine}\n`
  : '# Dotori Economy (dotoriecon.com)\n# 광고 게재 전입니다. 승인 후 이 파일에 게시자 ID가 들어갑니다.\n';

export const GET: APIRoute = () =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
