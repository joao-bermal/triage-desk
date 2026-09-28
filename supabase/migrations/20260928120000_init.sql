-- Triage Desk: core schema, multi-brand isolation with Row Level Security.
--
-- Access model
--   * Staff sign in with Supabase Auth and belong to one or more brands (brand_members).
--   * Every tenant table carries brand_id; RLS only exposes rows of the caller's brands.
--   * Agents can read and work tickets; admins can also edit the knowledge base.
--   * Inbound tickets, AI triage results and order sync are written by server code
--     (n8n and the triage edge function) with the service role, which bypasses RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.brand_role as enum ('agent', 'admin');

create type public.ticket_status as enum (
  'new',          -- stored, waiting for triage
  'triaged',      -- AI draft ready for review
  'needs_human',  -- AI flagged it (refund dispute, damage, low confidence, refusal)
  'approved',     -- staff approved the reply; n8n picks it up and sends it
  'sent',         -- reply delivered
  'closed'        -- no reply needed
);

create type public.ticket_category as enum (
  'order_status', 'shipping', 'returns_refunds', 'damaged_or_wrong_item',
  'product_question', 'sizing_fit', 'pre_sales', 'billing', 'feedback', 'spam', 'other'
);

create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  support_email text not null,
  voice text not null default '',          -- tone guide used by the reply writer
  signature text not null default '',
  created_at timestamptz not null default now()
);

create table public.brand_members (
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.brand_role not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null,
  title text not null,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  unique (brand_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  handle text not null,
  title text not null,
  size_fit text not null default '',
  details text not null default '',
  price_usd numeric(10, 2),
  unique (brand_id, handle)
);

-- Mirror of store orders, kept fresh by the n8n Shopify order sync workflow.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  order_number text not null,
  customer_email text not null,
  status text not null,                    -- unfulfilled | in_transit | delivered | cancelled | refunded
  items jsonb not null default '[]'::jsonb,
  total_usd numeric(10, 2),
  placed_at timestamptz not null,
  shipped_at timestamptz,
  delivered_at timestamptz,
  tracking_url text,
  external_id text,                        -- Shopify order id
  updated_at timestamptz not null default now(),
  unique (brand_id, order_number)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  channel text not null default 'email',
  external_ref text,                       -- idempotency key from the source (email Message-ID, form id)
  customer_email text not null,
  customer_name text,
  subject text not null default '',
  body text not null,
  received_at timestamptz not null default now(),
  status public.ticket_status not null default 'new',
  -- AI triage output
  category public.ticket_category,
  priority public.ticket_priority,
  sentiment text,
  language text,
  summary text,
  draft_reply text,
  confidence numeric(3, 2),
  needs_human_reason text,
  order_number text,
  triage_model text,
  triage_ms integer,
  triage_input_tokens integer,
  triage_output_tokens integer,
  triaged_at timestamptz,
  -- Human review
  final_reply text,
  assigned_to uuid references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, external_ref)
);

create index tickets_brand_status_idx on public.tickets (brand_id, status, received_at desc);

-- Append-only audit trail of everything that happens to a ticket.
create table public.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  actor text not null,                     -- 'n8n', 'triage-agent', or a user id
  type text not null,                      -- received | triaged | triage_failed | edited | approved | sent | closed
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ticket_events_ticket_idx on public.ticket_events (ticket_id, created_at);

-- Failures reported by the n8n error workflow. Staff never read this directly.
create table public.automation_errors (
  id bigint generated always as identity primary key,
  workflow text not null,
  node text,
  message text not null,
  execution_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies do not recurse through brand_members RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_brand_member(target_brand uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.brand_members m
    where m.brand_id = target_brand and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_brand_role(target_brand uuid, wanted public.brand_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.brand_members m
    where m.brand_id = target_brand
      and m.user_id = (select auth.uid())
      and (m.role = wanted or m.role = 'admin')
  );
$$;

revoke all on function public.is_brand_member(uuid) from public;
revoke all on function public.has_brand_role(uuid, public.brand_role) from public;
grant execute on function public.is_brand_member(uuid) to authenticated;
grant execute on function public.has_brand_role(uuid, public.brand_role) to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_touch before update on public.tickets
  for each row execute function public.touch_updated_at();
create trigger policies_touch before update on public.policies
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Staff updates are limited to review fields and legal status moves; approval is stamped server side.
create or replace function public.guard_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The service role (n8n, edge function) is trusted and skips these checks.
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status not in ('needs_human', 'approved', 'closed', 'triaged') then
      raise exception 'status % can only be set by automation', new.status;
    end if;
    if new.status = 'approved' then
      if coalesce(nullif(trim(new.final_reply), ''), '') = '' then
        raise exception 'an approved ticket needs a final reply';
      end if;
      new.approved_by = (select auth.uid());
      new.approved_at = now();
    end if;
  end if;

  insert into public.ticket_events (ticket_id, brand_id, actor, type, payload)
  values (
    new.id, new.brand_id, (select auth.uid())::text,
    case when new.status is distinct from old.status then new.status::text else 'edited' end,
    jsonb_build_object('from', old.status, 'to', new.status)
  );
  return new;
end;
$$;

create trigger tickets_guard before update on public.tickets
  for each row execute function public.guard_ticket_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.brands enable row level security;
alter table public.brand_members enable row level security;
alter table public.policies enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.automation_errors enable row level security;

-- brands: members see their brands. No client writes.
create policy "members read their brands" on public.brands
  for select to authenticated using ((select public.is_brand_member(id)));

-- brand_members: you see the memberships of brands you belong to.
create policy "members read brand memberships" on public.brand_members
  for select to authenticated using ((select public.is_brand_member(brand_id)));

-- policies (knowledge base): members read, admins write.
create policy "members read policies" on public.policies
  for select to authenticated using ((select public.is_brand_member(brand_id)));
create policy "admins insert policies" on public.policies
  for insert to authenticated with check ((select public.has_brand_role(brand_id, 'admin')));
create policy "admins update policies" on public.policies
  for update to authenticated
  using ((select public.has_brand_role(brand_id, 'admin')))
  with check ((select public.has_brand_role(brand_id, 'admin')));
create policy "admins delete policies" on public.policies
  for delete to authenticated using ((select public.has_brand_role(brand_id, 'admin')));

-- products and orders: read only for members.
create policy "members read products" on public.products
  for select to authenticated using ((select public.is_brand_member(brand_id)));
create policy "members read orders" on public.orders
  for select to authenticated using ((select public.is_brand_member(brand_id)));

-- tickets: members read and work them; inserts only come from automation.
create policy "members read tickets" on public.tickets
  for select to authenticated using ((select public.is_brand_member(brand_id)));
create policy "members update tickets" on public.tickets
  for update to authenticated
  using ((select public.is_brand_member(brand_id)))
  with check ((select public.is_brand_member(brand_id)));

-- ticket_events: read only (rows are written by the guard trigger and by automation).
create policy "members read ticket events" on public.ticket_events
  for select to authenticated using ((select public.is_brand_member(brand_id)));

-- automation_errors: no policy, so only the service role can read or write.

-- Column level privileges: staff may only change the review fields of a ticket.
revoke update on public.tickets from authenticated;
grant update (status, final_reply, assigned_to) on public.tickets to authenticated;
revoke insert, delete on public.tickets from authenticated;
revoke insert, update, delete on public.ticket_events from authenticated;
revoke all on public.automation_errors from authenticated, anon;

-- Realtime: the inbox updates live when n8n or the agent writes a ticket.
alter publication supabase_realtime add table public.tickets;
