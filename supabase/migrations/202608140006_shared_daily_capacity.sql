-- Morning and lunch share one daily cup limit. Run after migration 005.
create or replace function public.get_slot_capacity(p_fulfillment_date date)
returns table(time_slot public.time_slot, reserved_cups int, capacity int)
language sql
stable
security definer
set search_path = public
as $$
  with slots as (
    select unnest(enum_range(null::public.time_slot)) as slot
  ), used as (
    select coalesce(sum(i.quantity), 0)::int as cups
    from public.orders o
    join public.order_items i on i.order_id = o.id
    where o.fulfillment_date = p_fulfillment_date
      and o.order_status in ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'to_be_delivered')
  )
  select slots.slot, used.cups, settings.slot_capacity
  from slots
  cross join used
  cross join public.business_settings settings
  where settings.id = true;
$$;

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
  v_capacity int;
  v_used int;
  v_requested int;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ITEMS';
  end if;

  select slot_capacity into v_capacity from public.business_settings where id = true;
  perform pg_advisory_xact_lock(hashtext('daily-capacity:' || p_fulfillment_date::text));
  select coalesce(sum(i.quantity), 0)::int into v_used
  from public.orders o join public.order_items i on i.order_id = o.id
  where o.fulfillment_date = p_fulfillment_date
    and o.order_status in ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'to_be_delivered');
  select coalesce(sum((item->>'quantity')::int), 0)::int into v_requested
  from jsonb_array_elements(p_items) item;
  if v_requested < 1 or v_used + v_requested > v_capacity then
    raise exception 'CAPACITY_FULL';
  end if;

  if auth.uid() is null and v_email is null then
    v_email_for_legacy_rpc := 'guest-' || extensions.gen_random_uuid() || '@no-email.local';
  else
    v_email_for_legacy_rpc := coalesce(v_email, 'customer@profile.local');
  end if;

  select created.order_number, created.guest_access_token
    into v_order_number, v_guest_token
    from public.create_order(p_customer_name, v_email_for_legacy_rpc, p_order_method,
      p_department_id, p_fulfillment_date, p_time_slot, p_customer_note, p_items) created;

  update public.orders
    set payment_method = p_payment_method,
        customer_email_snapshot = case when customer_id is null then v_email else customer_email_snapshot end
    where orders.order_number = v_order_number;
  return query select v_order_number, v_guest_token;
end;
$$;

grant execute on function public.get_slot_capacity(date) to anon, authenticated;
revoke execute on function public.create_order(
  text, text, public.order_method, uuid, date, public.time_slot, text, jsonb
) from anon, authenticated;
grant execute on function public.create_order_with_payment(
  text, text, public.order_method, public.payment_method, uuid, date,
  public.time_slot, text, jsonb
) to anon, authenticated;
