-- 봇 필터 보강 — 체류 신호(engaged) + 사람/판정보류/봇 3분할 (2026-09-04)
--
-- 왜 필요한가: 2026-09-04 에 10일치를 세어 보니 숫자가 실제보다 열 배 이상 커 보였다.
--   9/03 하루에 「방문자 97명 / 조회 109회 / 경로 82종」이었다. 서로 다른 브라우저
--   97개가 거의 정확히 한 쪽씩만 봤다는 뜻이고, 30일 전체로도 경로 219종 가운데
--   106종(48%)이 「방문자 1명·조회 1회」였다. 사람이 블로그를 보면 홈에서 기사로,
--   기사에서 다른 기사로 넘어가 ref_host 가 'internal' 로 찍힌다.
--   실제로 'internal' 만 23명이 201회를 봤다 — 여러 쪽을 도는 덩어리는 그것뿐이었다.
--
-- ★ User-Agent 층은 이미 한계다. log_visit 의 낱말 목록은 스무 개가 넘는데
--   30일간 걸린 것이 gptbot 1건뿐이었다. 남은 것들은 **진짜 브라우저 UA 를 쓰는
--   렌더러**(검색엔진 렌더링·링크 미리보기·SEO 도구)다. 낱말을 더 넣어도 안 잡힌다.
--   그래서 이 패치는 UA 가 아니라 **행동**으로 가른다.
--
-- 두 층을 더한다.
--   ① 체류 신호 `engaged` — 사람이 화면을 5초 이상 보았거나 한 번이라도 만졌을 때
--      브라우저가 두 번째로 보내는 표시다. 렌더러는 찍고 바로 나가므로 오지 않는다.
--      **첫 기록은 그대로 남는다.** 지우는 것이 아니라 덧칠하는 것이다.
--   ② 읽을 때의 3분할 — 방문자·하루 단위로 사람 / 판정 보류 / 봇으로 가른다.
--      「판정 보류」는 봇이라고 단정하지 않는다. direct 로 들어와 한 쪽만 보고 나간
--      기록이라 사람인지 렌더러인지 이 자료만으로는 갈리지 않는다는 뜻이다.
--      **사람 수를 하한(humans)과 상한(humans + oneshot)으로 함께 읽는다.**
--
-- 이 저장소의 원칙 그대로다: 조용히 버리지 않는다. 버리면 오판을 영원히 알 수 없다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 전체 붙여넣고 Run. 전부 멱등이다.

-- ① 체류 신호 ---------------------------------------------------------------
alter table public.visit_log add column if not exists engaged boolean not null default false;

-- 첫 기록을 덧칠하는 함수. 없는 행은 만들지 않는다(먼저 log_visit 이 있어야 한다).
create or replace function public.mark_engaged(p_path text, p_visitor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 형식 검증은 log_visit 과 같은 기준이다. 손으로 넣은 값은 거부된다.
  if p_path is null or p_path !~ '^/([a-z0-9._-]+/)*$' or length(p_path) > 200 then
    return;
  end if;
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{16}$' then
    return;
  end if;

  update public.visit_log
     set engaged = true
   where day = ((now() at time zone 'Asia/Seoul')::date)
     and visitor = p_visitor
     and path = p_path;
end;
$$;

grant execute on function public.mark_engaged(text, text) to anon;

-- ② 방문자·하루 단위 분류 ---------------------------------------------------
-- 한 사람의 하루치를 모아 셋 중 하나로 매긴다. 조회 함수들이 전부 이것을 쓴다.
--   bot     — UA 로 봇이라고 판정된 기록이 하루 중 하나라도 있는 방문자
--   human   — 체류 신호가 왔거나 · 두 쪽 이상 보았거나 · 외부에서 들어온 방문자
--   oneshot — 나머지. direct 로 들어와 한 쪽만 보고 나갔고 체류 신호도 없다.
--             사람일 수도 있다(북마크로 와서 한 편 읽고 나간 경우). 그래서 봇이라고
--             부르지 않고 「판정 보류」로 따로 센다.
create or replace view public.visit_class as
  select
    v.day,
    v.visitor,
    bool_or(v.bot)                                                    as is_bot,
    bool_or(v.engaged)                                                as is_engaged,
    count(distinct v.path)                                            as paths,
    count(*)                                                          as views,
    bool_or(v.ref_host not in ('direct', 'internal'))                 as is_external,
    case
      when bool_or(v.bot) then 'bot'
      when bool_or(v.engaged) or count(distinct v.path) >= 2
        or bool_or(v.ref_host not in ('direct', 'internal')) then 'human'
      else 'oneshot'
    end                                                               as class
  from public.visit_log v
  group by v.day, v.visitor;

-- 뷰도 익명에게 직접 열지 않는다. 아래 함수로만 나간다.
revoke all on public.visit_class from anon, authenticated;

-- ③ 조회 함수 재작성 --------------------------------------------------------
-- returns table 의 열이 늘어나므로 create or replace 로는 못 바꾼다. 지우고 다시 만든다.
drop function if exists public.visit_summary(int);
drop function if exists public.visit_pages(int);
drop function if exists public.visit_referrers(int);

-- 최근 n일간 날짜별. visitors 의 뜻은 예전과 같다(봇 제외 전체).
-- 거기에 humans / oneshot 를 더해 그 안이 어떻게 갈리는지 보인다.
create or replace function public.visit_summary(p_days int default 14)
returns table (
  day date, visitors bigint, pageviews bigint, external_visitors bigint,
  humans bigint, oneshot bigint, engaged bigint, bots bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.day,
    count(*) filter (where c.class <> 'bot')                          as visitors,
    sum(c.views) filter (where c.class <> 'bot')                      as pageviews,
    count(*) filter (where c.class <> 'bot' and c.is_external)        as external_visitors,
    count(*) filter (where c.class = 'human')                         as humans,
    count(*) filter (where c.class = 'oneshot')                       as oneshot,
    count(*) filter (where c.is_engaged)                              as engaged,
    count(*) filter (where c.class = 'bot')                           as bots
  from public.visit_class c
  where c.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
  group by c.day
  order by c.day desc;
$$;

grant execute on function public.visit_summary(int) to anon;

-- 최근 n일간 유입 경로별. 사람으로 판정된 방문자만 센다.
create or replace function public.visit_referrers(p_days int default 14)
returns table (ref_host text, visitors bigint, pageviews bigint, humans bigint)
language sql
security definer
set search_path = public
as $$
  select
    v.ref_host,
    count(distinct v.visitor)                                         as visitors,
    count(*)                                                          as pageviews,
    count(distinct v.visitor) filter (where c.class = 'human')        as humans
  from public.visit_log v
  join public.visit_class c on c.day = v.day and c.visitor = v.visitor
  where v.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
    and c.class <> 'bot'
  group by v.ref_host
  order by humans desc, visitors desc, pageviews desc;
$$;

grant execute on function public.visit_referrers(int) to anon;

-- 최근 n일간 경로별. 어느 글을 **사람이** 보았는지가 이 표의 값어치다.
create or replace function public.visit_pages(p_days int default 7)
returns table (
  path text, visitors bigint, views bigint, external_visitors bigint,
  humans bigint, last_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    v.path,
    count(distinct v.visitor)                                         as visitors,
    count(*)                                                          as views,
    count(distinct v.visitor) filter (
      where v.ref_host not in ('direct', 'internal')
    )                                                                 as external_visitors,
    count(distinct v.visitor) filter (where c.class = 'human')        as humans,
    max(v.first_at)                                                   as last_at
  from public.visit_log v
  join public.visit_class c on c.day = v.day and c.visitor = v.visitor
  where v.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
    and c.class <> 'bot'
  group by v.path
  order by humans desc, visitors desc, views desc, v.path;
$$;

grant execute on function public.visit_pages(int) to anon;

-- visit_bots 는 그대로 둔다(UA 로 걸러낸 것만 보는 자리다).
-- 체류 신호는 이 패치를 적용한 뒤부터 쌓인다. 그 이전 기록은 engaged 가 전부 false 라
-- 「두 쪽 이상」과 「외부 유입」만으로 갈린다 — 소급되지 않는다는 사실을 잊지 말 것.
