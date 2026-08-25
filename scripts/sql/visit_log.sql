-- 방문 기록 — 외부 방문자 확인용 (2026-08-25 신설)
--
-- 왜 필요한가: 기존 page_views 는 path·views·시각만 저장해서
-- "이 조회가 소유주 본인인가 외부 방문자인가"를 영원히 알 수 없었다.
-- 여기에 (1) 그날치 방문자 구분값과 (2) 유입 도메인을 더해 그 질문에 답한다.
--
-- 개인정보를 남기지 않는다:
--   visitor 는 브라우저가 "그날 하루만" 쓰는 난수다. 자정이 지나면 새로 만들어져
--   같은 사람을 이틀 이상 추적할 수 없다. IP·쿠키·기기 정보는 저장하지 않는다.
--   ref_host 는 도메인만 남긴다(google.com). 전체 URL·검색어는 저장하지 않는다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣고 Run. 한 번만 하면 된다.

create table if not exists public.visit_log (
  day       date        not null default ((now() at time zone 'Asia/Seoul')::date),
  visitor   text        not null,
  path      text        not null,
  ref_host  text        not null default 'direct',
  first_at  timestamptz not null default now(),
  primary key (day, visitor, path)
);

create index if not exists visit_log_day_idx on public.visit_log (day desc);

alter table public.visit_log enable row level security;
-- 익명 클라이언트는 테이블을 직접 읽지도 쓰지도 못한다. 아래 함수로만 접근한다.
revoke all on public.visit_log from anon, authenticated;

-- 기록 함수 --------------------------------------------------------------
create or replace function public.log_visit(p_path text, p_visitor text, p_ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 경로·방문자값 형식 검증. 형식이 어긋나면 조용히 무시한다.
  -- 주의: 홈('/')도 반드시 통과해야 한다. 첫 판(2026-08-25)은 '^/[a-z0-9/_.-]*/$' 였는데
  -- 슬래시를 두 개 요구하는 바람에 **가장 많이 보는 홈이 통째로 거부됐다.**
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

grant execute on function public.log_visit(text, text, text) to anon;

-- 조회 함수 (요약만 돌려준다) ----------------------------------------------
-- 최근 n일간 날짜별: 순 방문자 수 / 조회 페이지 수 / 외부 유입 방문자 수
create or replace function public.visit_summary(p_days int default 14)
returns table (day date, visitors bigint, pageviews bigint, external_visitors bigint)
language sql
security definer
set search_path = public
as $$
  select
    v.day,
    count(distinct v.visitor)                                              as visitors,
    count(*)                                                               as pageviews,
    count(distinct v.visitor) filter (
      where v.ref_host not in ('direct', 'internal')
    )                                                                      as external_visitors
  from public.visit_log v
  where v.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
  group by v.day
  order by v.day desc;
$$;

grant execute on function public.visit_summary(int) to anon;

-- 최근 n일간 유입 경로별 방문자 수 (어디서 들어왔나)
create or replace function public.visit_referrers(p_days int default 14)
returns table (ref_host text, visitors bigint, pageviews bigint)
language sql
security definer
set search_path = public
as $$
  select v.ref_host, count(distinct v.visitor) as visitors, count(*) as pageviews
  from public.visit_log v
  where v.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
  group by v.ref_host
  order by visitors desc, pageviews desc;
$$;

grant execute on function public.visit_referrers(int) to anon;
