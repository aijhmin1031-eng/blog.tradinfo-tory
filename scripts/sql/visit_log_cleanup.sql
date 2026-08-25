-- [최종 정리 + 재발 방지] 2026-08-25
--
-- 세팅을 검증하느라 넣은 가짜 방문 기록을 지우고, **앞으로 다시 들어갈 수 없게** 막는다.
--
-- 왜 막아야 하나: 검증용 행이 남으면 통계에 없는 방문자가 잡힌다.
-- 실제로 `search.naver.com` 유입 1건으로 보여서, 모르고 보면 진짜 검색 유입으로 읽힌다.
-- 통계를 다루는 블로그가 자기 통계에 가짜를 남겨두면 안 된다.
--
-- 어떻게 막나: 브라우저가 만드는 방문자값은 crypto 난수를 16진수로 찍은 것이라
-- **반드시 [0-9a-f] 16자**다. 검증식을 그 실제 형식으로 좁히면,
-- 사람이 손으로 넣는 임의 문자열(test/zzzz 같은)은 자동으로 거부된다.

-- 1) 지금까지 넣은 검증용 행 제거
delete from public.visit_log
where visitor !~ '^[0-9a-f]{16}$';

-- 2) 앞으로 16진수 16자가 아닌 값은 아예 기록되지 않게 한다
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
  -- 브라우저가 실제로 만드는 형식(16진수 16자)만 받는다. 손으로 넣은 값은 거부된다.
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{16}$' then
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

-- 3) 확인: 남아 있는 실제 방문 기록
select day, path, ref_host, first_at
from public.visit_log
order by first_at desc
limit 20;
