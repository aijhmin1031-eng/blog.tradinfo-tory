// giscus (GitHub Discussions) 설정, 기사 댓글·도토리 광장 공용.
// 2026-08-23 활성화 완료: Discussions 켜기 + giscus 앱 설치(소유주) → ID 발급 기입.
// 카테고리는 Announcements: 관리자·giscus만 스레드를 만들 수 있어 임의 스레드 생성을 막는다(giscus 권장).
// 값이 비면 댓글·광장 위젯은 렌더링되지 않는다(안전 기본값).
export const GISCUS = {
  repo: 'aijhmin1031-eng/blog.tradinfo-tory',
  repoId: 'R_kgDOUAK_9A',
  category: 'Announcements',
  categoryId: 'DIC_kwDOUAK_9M4DD_C2',
};
export const COMMENTS_ENABLED = GISCUS.repoId !== '' && GISCUS.categoryId !== '';

// 자체 댓글(구글 로그인, Supabase Auth) 전환 스위치 — 소유주 결정(8/23): 구글 로그인이 대중적이라 전환.
// 구글 클라우드 OAuth 클라이언트 발급 + Supabase 대시보드 Google provider 설정이 끝나면 true로.
// true가 되면 기사·광장이 CommentThread(자체 댓글)로 바뀌고 giscus는 물러난다.
export const NATIVE_COMMENTS_LIVE = false;
