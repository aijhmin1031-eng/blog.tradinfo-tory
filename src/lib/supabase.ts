// Supabase 연동 설정 (프로젝트: tradetory, 서울 리전)
// anon 키는 공개용으로 설계된 키다. 쓰기 가능한 경로는
// bump_view RPC(경로 검증 내장)와 subscribe 엣지 함수(service role 경유)뿐이며,
// 테이블 직접 쓰기는 RLS가 전부 차단한다.
export const SUPABASE_URL = 'https://tfksqpxfpniavvnwfjiu.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3NxcHhmcG5pYXZ2bndmaml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjU0NzEsImV4cCI6MjEwMzAwMTQ3MX0.wIQ51MDO27VvgdNiJl4skl8X0hh6WM_NK8ysg1lBp1Q';

/** 클라이언트 fetch용 공통 헤더 */
export const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};
