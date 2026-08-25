-- [수정 패치 2026-08-25] 홈('/')이 거부되던 문제 + 동작 확인용 테스트 기록 제거
--
-- 최초 판의 경로 검증식이 '^/[a-z0-9/_.-]*/$' 였는데, 이 식은 슬래시를 두 개 요구한다.
-- 그래서 '/posts/fob-vs-cif/' 는 통과하지만 **홈 '/' 는 거부됐다** — 가장 많이 보는 페이지다.
-- 이 파일만 SQL Editor 에 붙여넣고 Run 하면 된다(함수 교체 + 테스트 행 삭제). 한 번이면 끝.

create or replace function public.log_visit(p_path text, p_visitor text, p_ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 홈('/')도 통과한다: 슬래시로 끝나는 세그먼트가 0개 이상.
  if p_path is null or p_path !~ '^/([a-z0-9._-]+/)*$' or length(p_path) > 200 then
    return;
  end if;
  if p_visitor is null or p_visitor !~ '^[a-z0-9]{16}$' then
    return;
  end if;

  insert into public.visit_log (visitor, path, ref_host)
  values (
    p_visitor,
    p_path,
    -- 도메인만 남긴다. 우리 도메인에서 온 내부 이동은 'internal' 로 접는다.
    case
      when p_ref is null or p_ref = '' then 'direct'
      when p_ref ~ 'dotoriecon\.com' then 'internal'
      else substring(lower(p_ref) from '^(?:https?://)?(?:www\.)?([a-z0-9.-]{1,80})')
    end
  )
  on conflict do nothing;
end;
$$;

-- 함수가 실제로 기록·집계되는지 확인하려고 넣었던 테스트 행을 지운다.
-- (지우지 않으면 8/25 통계에 방문자 1명·외부 유입 1명이 허위로 잡힌다.)
delete from public.visit_log where visitor = 'abcdef0123456789';
