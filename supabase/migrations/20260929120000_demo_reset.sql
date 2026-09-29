-- Public demo support.
--
-- The hosted demo lets anyone sign in as a support agent, so visitors approve, edit and
-- close tickets. Once the demo tickets have been triaged, an operator takes a snapshot
-- (select private.take_demo_snapshot()) and a daily job puts every ticket and event back
-- to that state. Without a snapshot the job does nothing, so local and real deployments
-- are unaffected.

create extension if not exists pg_cron with schema pg_catalog;

create table private.demo_tickets (like public.tickets including defaults);
create table private.demo_ticket_events (like public.ticket_events including defaults);

create or replace function private.take_demo_snapshot()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  truncate private.demo_tickets, private.demo_ticket_events;
  insert into private.demo_tickets select * from public.tickets;
  insert into private.demo_ticket_events select * from public.ticket_events;
end;
$$;

create or replace function private.reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from private.demo_tickets) then
    return;   -- no snapshot: not a public demo
  end if;
  delete from public.tickets;   -- events go with them (on delete cascade)
  insert into public.tickets select * from private.demo_tickets;
  insert into public.ticket_events overriding system value select * from private.demo_ticket_events;
end;
$$;

revoke all on function private.take_demo_snapshot() from public, anon, authenticated;
revoke all on function private.reset_demo() from public, anon, authenticated;

select cron.schedule('reset-public-demo', '0 6 * * *', 'select private.reset_demo()');
