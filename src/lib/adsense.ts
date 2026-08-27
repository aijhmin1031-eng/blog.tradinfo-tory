// 구글 애드센스 배선 (2026-08-27 신설).
//
// 승인 절차에서 구글은 「사이트 소유 확인」을 세 방법 중 하나로 요구한다.
//   ① 애드센스 코드 조각을 <head> 에 넣기   ② ads.txt 에 한 줄 넣기   ③ 메타 태그 넣기
// 어느 쪽을 요구받든 **게시자 ID 한 줄만 바꾸면** 세 가지가 동시에 켜지도록 해 둔다.
// 심사 중에도 코드가 살아 있어야 하는 경우가 많으므로 셋을 함께 내보낸다.
//
// 값은 비밀이 아니다. 게시자 ID 는 모든 방문자의 페이지 소스에 그대로 노출되는 공개 식별자다.
// 빈 문자열이면 아무것도 내보내지 않는다(지금 상태).
export const ADSENSE_PUB_ID = 'ca-pub-9956611000880183';

/** `ca-pub-…` 형태인지. 오타로 잘못된 코드가 전 페이지에 박히는 것을 막는다. */
export const adsenseOn = /^ca-pub-\d{10,}$/.test(ADSENSE_PUB_ID);

/** ads.txt 한 줄. 게시자 ID 에서 `ca-` 를 뗀 것이 ads.txt 용 표기다. */
export const adsTxtLine = adsenseOn
  ? `google.com, ${ADSENSE_PUB_ID.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`
  : '';
