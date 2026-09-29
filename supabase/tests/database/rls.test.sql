-- Row Level Security tests. Run with: npx supabase test db
-- Uses the seed users: agent (Miau Atelier), nordic (Nordic Paws), admin (both brands).

begin;
select plan(14);

-- Start from a known state: a manual run may already have approved or sent demo-1.
set local session_replication_role = replica;
update public.tickets set status = 'triaged', approved_by = null, approved_at = null, sent_at = null where external_ref = 'demo-1';
set local session_replication_role = origin;

create or replace function pg_temp.act_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- Miau Atelier agent -------------------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is((select count(*) from public.brands), 1::bigint, 'agent sees only their own brand');
select is((select count(*) from public.tickets where brand_id = '22222222-2222-4222-8222-222222222222'), 0::bigint, 'agent cannot see another brand''s tickets');
select ok((select count(*) from public.tickets) > 0, 'agent sees their brand''s tickets');
select is((select count(*) from public.orders where order_number = 'NP-2201'), 0::bigint, 'agent cannot read another brand''s orders');

select throws_ok(
  $$ insert into public.tickets (brand_id, customer_email, body) values ('11111111-1111-4111-8111-111111111111', 'x@example.com', 'hi') $$,
  '42501', null, 'agent cannot insert tickets (only automation can)'
);
select throws_ok(
  $$ update public.tickets set draft_reply = 'hacked' where external_ref = 'demo-1' $$,
  '42501', null, 'agent cannot change AI fields (column grants)'
);
select throws_ok(
  $$ update public.tickets set status = 'sent' where external_ref = 'demo-1' $$,
  'P0001', 'status sent can only be set by automation', 'agent cannot mark a ticket as sent'
);
select throws_ok(
  $$ update public.tickets set status = 'approved', final_reply = '' where external_ref = 'demo-1' $$,
  'P0001', 'an approved ticket needs a final reply', 'approval requires a reply'
);

update public.tickets set final_reply = 'Hi Emma, your tree is on its way.', status = 'approved' where external_ref = 'demo-1';
select is(
  (select approved_by from public.tickets where external_ref = 'demo-1'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'approval stamps the approving user'
);

update public.policies set body = 'changed by agent' where slug = 'shipping';
select isnt((select body from public.policies where slug = 'shipping' and brand_id = '11111111-1111-4111-8111-111111111111'), 'changed by agent', 'agent cannot edit policies');

select throws_ok($$ select * from public.automation_errors $$, '42501', null, 'agent cannot read automation errors');
select throws_ok($$ select public.ingest_ticket('miau-atelier', 'email', 'x', 'a@b.co', null, 's', 'b') $$, '42501', null, 'agent cannot call the ingest RPC');

-- Nordic Paws agent ---------------------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000003');
select is((select count(*) from public.tickets where brand_id = '11111111-1111-4111-8111-111111111111'), 0::bigint, 'Nordic agent cannot see Miau tickets');

-- Admin of both brands -------------------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000002');
update public.policies set body = body || ' (reviewed)' where slug = 'shipping' and brand_id = '11111111-1111-4111-8111-111111111111';
select ok((select body from public.policies where slug = 'shipping' and brand_id = '11111111-1111-4111-8111-111111111111') like '%(reviewed)', 'admin can edit policies');

select * from finish();
rollback;
