-- 방문 기록 — 외부 방문자 확인용 (2026-08-25 신설, 2026-08-26 봇 판정·경로별 조회 추가)
--
-- 왜 필요한가: 기존 page_views 는 path·views·시각만 저장해서
-- "이 조회가 소유주 본인인가 외부 방문자인가"를 영원히 알 수 없었다.
-- 여기에 (1) 그날치 방문자 구분값과 (2) 유입 도메인을 더해 그 질문에 답한다.
--
-- 개인정보를 남기지 않는다:
--   visitor 는 브라우저가 "그날 하루만" 쓰는 난수다. 자정이 지나면 새로 만들어져
--   같은 사람을 이틀 이상 추적할 수 없다. IP·쿠키·기기 정보는 저장하지 않는다.
--   ref_host 는 도메인만 남긴다(google.com). 전체 URL·검색어는 저장하지 않는다.
--   bot_hint 는 봇으로 판정한 근거 낱말(googlebot·yeti 등)만 남긴다. 사람의 브라우저
--   정보는 저장하지 않는다(사람으로 판정되면 null 이다).
--
-- 적용: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣고 Run.
--       전부 멱등이라(if not exists / or replace) 몇 번을 다시 돌려도 안전하다.

create table if not exists public.visit_log (
  day       date        not null default ((now() at time zone 'Asia/Seoul')::date),
  visitor   text        not null,
  path      text        not null,
  ref_host  text        not null default 'direct',
  first_at  timestamptz not null default now(),
  primary key (day, visitor, path)
);

-- 2026-08-26 추가. 이미 만들어진 표에도 붙는다.
-- 봇을 '버리지 않고 표시해서' 남긴다 — 조용히 버리면 오판을 영원히 알 수 없다.
alter table public.visit_log add column if not exists bot      boolean not null default false;
alter table public.visit_log add column if not exists bot_hint text;

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
declare
  -- PostgREST 는 요청 헤더를 GUC 로 넘겨준다. 브라우저인 척하는 크롤러도
  -- User-Agent 까지 위장하지는 않으므로, 최종 봇 판정은 클라이언트가 아니라 여기서 한다
  -- (클라이언트 쪽 판정은 쓸데없는 요청을 아끼는 용도일 뿐이다).
  v_headers text := nullif(current_setting('request.headers', true), '');
  v_ua      text := lower(coalesce(v_headers::json ->> 'user-agent', ''));
  v_bot     text;
begin
  -- ★ 헤더를 못 읽는 환경이면 판정을 아예 하지 않는다(fail-open).
  --   여기서 막아 버리면 헤더가 안 보이는 순간 방문 기록이 통째로 0이 되고,
  --   그것이 조용히 일어난다. 이 저장소는 그 사고를 이미 한 번 겪었다(8/25~26 계측 공백).
  if v_headers is not null then
    if v_ua = '' then
      v_bot := 'no-ua';           -- 사람의 브라우저는 User-Agent 를 반드시 보낸다
    else
      -- 판정 근거 낱말을 그대로 뽑아 둔다. 나중에 오판을 확인할 수 있어야 한다.
      -- 주의: 'naver' 를 넣지 말 것 — 네이버 앱 인앱 브라우저 UA 에 NAVER(inapp…) 가 들어간다.
      --       'duckduckgo' 도 넣지 말 것 — 사람이 쓰는 브라우저 UA 다. 봇은 duckduckbot 이다.
      v_bot := substring(v_ua from
        '([a-z0-9._-]*[a-z]bot|bot/|bot\)|crawler|crawling|spider|slurp|yeti|scrapy|curl/|wget|'
        'python-requests|httpx|aiohttp|axios|node-fetch|okhttp|java/|go-http|'
        'headless|phantomjs|puppeteer|playwright|lighthouse|inspectiontool|'
        'monitoring|uptime|pingdom|statuscake|bingpreview|fetcher|feedly|feedfetcher|'
        'archiver|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claude|perplexity|'
        'ccbot|facebookexternalhit|embedly|whatsapp|kakaotalk-scrap|daumoa|'
        'google-read-aloud|google favicon|vercel)');
    end if;
  end if;

  -- 경로·방문자값 형식 검증. 형식이 어긋나면 조용히 무시한다.
  -- 주의: 홈('/')도 반드시 통과해야 한다. 첫 판(2026-08-25)은 '^/[a-z0-9/_.-]*/$' 였는데
  -- 슬래시를 두 개 요구하는 바람에 **가장 많이 보는 홈이 통째로 거부됐다.**
  if p_path is null or p_path !~ '^/([a-z0-9._-]+/)*$' or length(p_path) > 200 then
    return;
  end if;
  -- 브라우저가 실제로 만드는 형식(crypto 난수 → 16진수 16자)만 받는다.
  -- 손으로 넣은 임의 문자열은 거부돼, 검증하다 통계를 더럽힐 일이 없다.
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{16}$' then
    return;
  end if;

  insert into public.visit_log (visitor, path, ref_host, bot, bot_hint)
  values (
    p_visitor,
    p_path,
    -- 도메인만 남긴다. 우리 도메인에서 온 내부 이동은 'internal' 로 접는다.
    case
      when p_ref is null or p_ref = '' then 'direct'
      when p_ref ~ 'dotoriecon\.com' then 'internal'
      else substring(lower(p_ref) from '^(?:https?://)?(?:www\.)?([a-z0-9.-]{1,80})')
    end,
    v_bot is not null,
    v_bot
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.log_visit(text, text, text) to anon;

-- 조회 함수 (요약만 돌려준다) ----------------------------------------------
-- 아래 세 함수는 전부 '사람으로 판정된 것'만 센다(bot = false).
-- 걸러낸 것이 무엇이었는지는 visit_bots 로 따로 본다.

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
    and not v.bot
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
    and not v.bot
  group by v.ref_host
  order by visitors desc, pageviews desc;
$$;

grant execute on function public.visit_referrers(int) to anon;

-- 최근 n일간 경로별 방문자 수 (어느 글을 보았나) ----------------------------
-- 2026-08-26 신설. 요약·유입경로만으로는 "direct 11명이 서로 다른 글을 하나씩 본 것인가"
-- (= 크롤러 렌더링 패턴인가)를 확인할 방법이 없었다. 사람 판정분만 센다.
create or replace function public.visit_pages(p_days int default 7)
returns table (path text, visitors bigint, views bigint, external_visitors bigint, last_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    v.path,
    count(distinct v.visitor)                                              as visitors,
    count(*)                                                               as views,
    count(distinct v.visitor) filter (
      where v.ref_host not in ('direct', 'internal')
    )                                                                      as external_visitors,
    max(v.first_at)                                                        as last_at
  from public.visit_log v
  where v.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
    and not v.bot
  group by v.path
  order by visitors desc, views desc, v.path;
$$;

grant execute on function public.visit_pages(int) to anon;

-- 최근 n일간 걸러낸 봇 (오판 확인용) ----------------------------------------
-- 2026-08-26 신설. 봇 필터는 조용히 사람을 지울 수 있다. 무엇을 몇 건 걸렀는지
-- 눈으로 볼 수 있어야 그 필터를 믿을 수 있다.
create or replace function public.visit_bots(p_days int default 7)
returns table (bot_hint text, visitors bigint, views bigint, paths bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(v.bot_hint, 'unknown')                                        as bot_hint,
    count(distinct v.visitor)                                              as visitors,
    count(*)                                                               as views,
    count(distinct v.path)                                                 as paths
  from public.visit_log v
  where v.day > ((now() at time zone 'Asia/Seoul')::date - p_days)
    and v.bot
  group by 1
  order by views desc;
$$;

grant execute on function public.visit_bots(int) to anon;
