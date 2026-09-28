-- Entry points for n8n and the database webhook that hands approved replies to n8n.

alter table public.brands add column shop_domain text unique;   -- e.g. miau-atelier.myshopify.com

-- ---------------------------------------------------------------------------
-- ingest_ticket: idempotent insert used by the n8n inbound workflow.
-- Returns the ticket id and whether it is new, so a re-delivered email is not triaged twice.
-- ---------------------------------------------------------------------------
create or replace function public.ingest_ticket(
  p_brand_slug text,
  p_channel text,
  p_external_ref text,
  p_customer_email text,
  p_customer_name text,
  p_subject text,
  p_body text
)
returns table (ticket_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brand uuid;
  v_id uuid;
begin
  select id into v_brand from public.brands where slug = p_brand_slug;
  if v_brand is null then
    raise exception 'unknown brand %', p_brand_slug using errcode = 'P0002';
  end if;

  insert into public.tickets (brand_id, channel, external_ref, customer_email, customer_name, subject, body)
  values (v_brand, coalesce(p_channel, 'email'), p_external_ref, lower(trim(p_customer_email)), p_customer_name, coalesce(p_subject, ''), p_body)
  on conflict (brand_id, external_ref) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.tickets where brand_id = v_brand and external_ref = p_external_ref;
    return query select v_id, false;
    return;
  end if;

  insert into public.ticket_events (ticket_id, brand_id, actor, type, payload)
  values (v_id, v_brand, 'n8n', 'received', jsonb_build_object('channel', p_channel));
  return query select v_id, true;
end;
$$;

-- ---------------------------------------------------------------------------
-- sync_order: upsert of a Shopify order, called by the n8n order sync workflow.
-- ---------------------------------------------------------------------------
create or replace function public.sync_order(p_shop_domain text, p_order jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brand uuid;
  v_id uuid;
begin
  select id into v_brand from public.brands where shop_domain = p_shop_domain;
  if v_brand is null then
    raise exception 'no brand for shop %', p_shop_domain using errcode = 'P0002';
  end if;

  insert into public.orders (brand_id, order_number, customer_email, status, items, total_usd, placed_at, shipped_at, tracking_url, external_id)
  values (
    v_brand,
    p_order ->> 'order_number',
    lower(p_order ->> 'customer_email'),
    p_order ->> 'status',
    coalesce(p_order -> 'items', '[]'::jsonb),
    nullif(p_order ->> 'total_usd', '')::numeric,
    (p_order ->> 'placed_at')::timestamptz,
    nullif(p_order ->> 'shipped_at', '')::timestamptz,
    nullif(p_order ->> 'tracking_url', ''),
    p_order ->> 'external_id'
  )
  on conflict (brand_id, order_number) do update set
    customer_email = excluded.customer_email,
    status = excluded.status,
    items = excluded.items,
    total_usd = excluded.total_usd,
    shipped_at = coalesce(excluded.shipped_at, public.orders.shipped_at),
    tracking_url = coalesce(excluded.tracking_url, public.orders.tracking_url),
    external_id = excluded.external_id
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.ingest_ticket(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.sync_order(text, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_ticket(text, text, text, text, text, text, text) to service_role;
grant execute on function public.sync_order(text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Approved reply → n8n. Settings live in a private schema that the API does not expose.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key text primary key,
  value text not null
);

create or replace function private.notify_reply_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := (select value from private.settings where key = 'n8n_approved_webhook_url');
  v_secret text := (select value from private.settings where key = 'n8n_webhook_secret');
begin
  if v_url is null then
    return new;   -- automation not configured in this environment
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(v_secret, '')),
    body := jsonb_build_object('ticket_id', new.id, 'brand_id', new.brand_id)
  );
  return new;
end;
$$;

create trigger tickets_reply_approved
  after update of status on public.tickets
  for each row
  when (new.status = 'approved' and old.status is distinct from 'approved')
  execute function private.notify_reply_approved();
