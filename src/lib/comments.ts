// giscus (GitHub Discussions) 설정, 기사 댓글·도토리 광장 공용.
// 활성화 절차(소유주 클릭 2번 + 값 2개):
//   ① repo Settings → General → Features → Discussions 체크
//   ② https://github.com/apps/giscus 앱을 이 repo에 설치
//   ③ https://giscus.app 에서 repo 입력 → 발급된 repoId / categoryId를 아래에 기입
// 두 값이 비어 있는 동안 댓글·광장 위젯은 렌더링되지 않는다(안전 기본값).
export const GISCUS = {
  repo: 'aijhmin1031-eng/blog.tradinfo-tory',
  repoId: '', // 예: R_kgDO...
  category: 'Comments',
  categoryId: '', // 예: DIC_kwDO...
};
export const COMMENTS_ENABLED = GISCUS.repoId !== '' && GISCUS.categoryId !== '';
