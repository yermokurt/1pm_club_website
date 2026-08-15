-- Personal email is optional for guests. Registered customers retain their
-- verified profile email snapshot. Run this after migrations 001 through 004.
alter table public.orders
  alter column customer_email_snapshot drop not null;

create or replace function public.create_order_with_payment(
  p_customer_name text,
  p_customer_email text,
  p_order_method public.order_method,
  p_payment_method public.payment_method,
  p_department_id uuid,
  p_fulfillment_date date,
  p_time_slot public.time_slot,
  p_customer_note text,
  p_items jsonb
)
returns table(order_number bigint, guest_access_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order_number bigint;
  v_guest_token text;
  v_email text := nullif(lower(trim(p_customer_email)), '');
  v_email_for_legacy_rpc text;
begin
  -- The original, authoritative order function validates guest email. Supply a
  -- private placeholder only while it creates a guest order, then clear it.
  -- This preserves all of its scheduling, capacity, price and stock checks.
  if auth.uid() is null and v_email is null then
    v_email_for_legacy_rpc := 'guest-' || extensions.gen_random_uuid() || '@no-email.local';
  else
    v_email_for_legacy_rpc := coalesce(v_email, 'customer@profile.local');
  end if;

  select created.order_number, created.guest_access_token
    into v_order_number, v_guest_token
    from public.create_order(
      p_customer_name,
      v_email_for_legacy_rpc,
      p_order_method,
      p_department_id,
      p_fulfillment_date,
      p_time_slot,
      p_customer_note,
      p_items
    ) created;

  update public.orders
    set payment_method = p_payment_method,
        customer_email_snapshot = case when customer_id is null then v_email else customer_email_snapshot end
    where orders.order_number = v_order_number;

  return query select v_order_number, v_guest_token;
end;
$$;

grant execute on function public.create_order_with_payment(
  text, text, public.order_method, public.payment_method, uuid, date,
  public.time_slot, text, jsonb
) to anon, authenticated;

-- Publish only a non-sensitive date signal, never order rows, to checkout
-- subscribers. The client re-fetches the authoritative capacity RPC on signal.
create table if not exists public.slot_capacity_events (
  id bigint generated always as identity primary key,
  fulfillment_date date not null,
  created_at timestamptz not null default now()
);

alter table public.slot_capacity_events enable row level security;

drop policy if exists "capacity events public read" on public.slot_capacity_events;
create policy "capacity events public read"
  on public.slot_capacity_events for select
  to anon, authenticated
  using (true);

create or replace function public.record_slot_capacity_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.slot_capacity_events(fulfillment_date)
  values (coalesce(new.fulfillment_date, old.fulfillment_date));
  return coalesce(new, old);
end;
$$;

drop trigger if exists orders_capacity_event on public.orders;
create trigger orders_capacity_event
after insert or update or delete on public.orders
for each row execute function public.record_slot_capacity_event();

-- The guard keeps this migration safe if the table has already been added in
-- the dashboard publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'slot_capacity_events'
  ) then
    alter publication supabase_realtime add table public.slot_capacity_events;
  end if;
end $$;
