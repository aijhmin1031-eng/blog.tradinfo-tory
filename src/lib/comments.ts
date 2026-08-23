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
