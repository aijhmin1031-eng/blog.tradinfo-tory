-- [정리] 세팅 검증용으로 넣었던 행 삭제 (2026-08-25)
--
-- 함수가 실제로 기록되는지 확인하려고 넣은 가짜 방문 기록이다.
-- 지우지 않으면 8/25 통계에 방문자가 허위로 잡힌다.
-- 실제 방문자값은 브라우저가 만드는 16자리 16진수라 아래 두 값과 겹칠 일이 없다.

delete from public.visit_log
where visitor in ('abcdef0123456789', '1111111111verify');

-- 확인: 남은 기록 (검증 행이 없으면 아무것도 안 나오거나 실제 방문만 나온다)
select day, visitor, path, ref_host, first_at
from public.visit_log
order by first_at desc
limit 20;
