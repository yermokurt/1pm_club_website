-- Delivery departments are now free-form text. Historical department IDs are retained.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%department_id%'
  loop
    execute format('alter table public.orders drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.orders add constraint orders_delivery_department_check check (
  (order_method = 'delivery' and department_name_snapshot is not null
    and char_length(trim(department_name_snapshot)) between 2 and 100)
  or (order_method = 'pickup' and department_id is null and department_name_snapshot is null)
);

drop function if exists public.create_order_with_payment(
  text, text, public.order_method, public.payment_method, uuid, date,
  public.time_slot, text, jsonb
);

create function public.create_order_with_payment(
  p_customer_name text,
  p_customer_email text,
  p_order_method public.order_method,
  p_payment_method public.payment_method,
  p_department_name text,
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
  v_settings public.business_settings%rowtype;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_now time := (now() at time zone 'Asia/Manila')::time;
  v_days int;
  v_cups int;
  v_used int;
  v_subtotal int := 0;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_addon public.addons%rowtype;
  v_item_id uuid;
  v_addon_total int;
  v_token text;
  v_profile public.profiles%rowtype;
  v_department_name text := nullif(trim(p_department_name), '');
begin
  select * into v_settings from public.business_settings where id = true;
  if not found or not v_settings.accepting_orders then raise exception 'ORDERS_CLOSED'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'INVALID_ITEMS'; end if;
  v_days := p_fulfillment_date - v_today;
  if v_days < 0 or v_days > 7 or extract(isodow from p_fulfillment_date) not in (1,2,3) then raise exception 'SCHEDULE_INVALID'; end if;
  if v_days = 0 then
    if (p_time_slot = 'morning' and v_now >= v_settings.morning_cutoff)
      or (p_time_slot = 'lunch' and v_now >= v_settings.lunch_cutoff) then raise exception 'SLOT_CLOSED'; end if;
  elsif (extract(isodow from p_fulfillment_date) = 1 and v_days not between 1 and 3)
    or (extract(isodow from p_fulfillment_date) = 2 and v_days <> 1)
    or (extract(isodow from p_fulfillment_date) = 3 and v_days <> 1) then raise exception 'SCHEDULE_INVALID'; end if;
  select coalesce(sum((item->>'quantity')::int), 0) into v_cups from jsonb_array_elements(p_items) item;
  if v_cups < 1 or v_cups > v_settings.slot_capacity then raise exception 'INVALID_QUANTITY'; end if;
  if p_order_method = 'delivery' and (v_department_name is null or char_length(v_department_name) not between 2 and 100) then raise exception 'INVALID_DEPARTMENT'; end if;
  if p_order_method = 'pickup' then v_department_name := null; end if;

  perform pg_advisory_xact_lock(hashtext('daily-capacity:' || p_fulfillment_date::text));
  select coalesce(sum(i.quantity), 0) into v_used
  from public.orders o join public.order_items i on i.order_id = o.id
  where o.fulfillment_date = p_fulfillment_date
    and o.order_status in ('pending','confirmed','preparing','ready_for_pickup','to_be_delivered');
  if v_used + v_cups > v_settings.slot_capacity then raise exception 'CAPACITY_FULL'; end if;

  if auth.uid() is not null then
    select * into v_profile from public.profiles where id = auth.uid();
    if not found then raise exception 'PROFILE_REQUIRED'; end if;
  else
    if char_length(trim(p_customer_name)) < 2 then raise exception 'INVALID_GUEST'; end if;
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_available;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    v_addon_total := 0;
    for v_addon in select * from public.addons where id in (
      select value::uuid from jsonb_array_elements_text(coalesce(v_item->'addon_ids', '[]'::jsonb))
    ) loop
      if not v_addon.is_available then raise exception 'ADDON_UNAVAILABLE'; end if;
      v_addon_total := v_addon_total + v_addon.price_centavos;
    end loop;
    if (select count(*) from jsonb_array_elements_text(coalesce(v_item->'addon_ids','[]'::jsonb))) <>
       (select count(*) from public.addons where id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item->'addon_ids','[]'::jsonb)))) then raise exception 'INVALID_ADDON'; end if;
    v_subtotal := v_subtotal + (v_product.price_centavos + v_addon_total) * (v_item->>'quantity')::int;
  end loop;

  insert into public.orders(
    customer_id, customer_name_snapshot, customer_email_snapshot, guest_access_token_hash,
    order_method, department_id, department_name_snapshot, fulfillment_date, time_slot,
    payment_method, subtotal_centavos, total_centavos, customer_note
  ) values (
    auth.uid(), coalesce(v_profile.name, trim(p_customer_name)),
    case when auth.uid() is null then nullif(lower(trim(p_customer_email)), '') else v_profile.email end,
    case when v_token is null then null else extensions.crypt(v_token, extensions.gen_salt('bf')) end,
    p_order_method, null, v_department_name, p_fulfillment_date, p_time_slot,
    p_payment_method, v_subtotal, v_subtotal, nullif(trim(p_customer_note), '')
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid;
    insert into public.order_items(order_id, product_id, product_name_snapshot, unit_price_snapshot_centavos, quantity, subtotal_centavos)
    values (v_order.id, v_product.id, v_product.name, v_product.price_centavos, (v_item->>'quantity')::int,
      (v_product.price_centavos + (select coalesce(sum(price_centavos),0) from public.addons where id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item->'addon_ids','[]'::jsonb))))) * (v_item->>'quantity')::int)
    returning id into v_item_id;
    insert into public.order_item_addons(order_item_id, addon_id, addon_name_snapshot, addon_price_snapshot_centavos)
    select v_item_id, a.id, a.name, a.price_centavos from public.addons a
    where a.id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item->'addon_ids','[]'::jsonb)));
  end loop;
  return query select v_order.order_number, v_token;
end;
$$;

grant execute on function public.create_order_with_payment(
  text, text, public.order_method, public.payment_method, text, date,
  public.time_slot, text, jsonb
) to anon, authenticated;
