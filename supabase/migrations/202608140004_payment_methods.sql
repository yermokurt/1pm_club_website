do $$
begin
  create type public.payment_method as enum ('cod', 'qr');
exception
  when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists payment_method public.payment_method not null default 'qr';

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
begin
  select created.order_number, created.guest_access_token
    into v_order_number, v_guest_token
    from public.create_order(
      p_customer_name,
      p_customer_email,
      p_order_method,
      p_department_id,
      p_fulfillment_date,
      p_time_slot,
      p_customer_note,
      p_items
    ) created;

  update public.orders
    set payment_method = p_payment_method
    where orders.order_number = v_order_number;

  return query select v_order_number, v_guest_token;
end;
$$;

grant execute on function public.create_order_with_payment(
  text, text, public.order_method, public.payment_method, uuid, date,
  public.time_slot, text, jsonb
) to anon, authenticated;
