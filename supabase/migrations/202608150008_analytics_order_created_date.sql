-- Analytics measures recent business activity by when an order was placed,
-- not its future fulfilment date.
create or replace function public.admin_analytics(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  select jsonb_build_object(
    'summary', (
      select jsonb_build_object(
        'revenue_centavos', coalesce(sum(o.total_centavos) filter(where o.payment_status = 'paid' and o.order_status not in ('rejected','cancelled')), 0),
        'orders', count(*),
        'drinks_sold', coalesce((
          select sum(i.quantity) from public.order_items i join public.orders oi on oi.id = i.order_id
          where (oi.created_at at time zone 'Asia/Manila')::date between p_start and p_end
        ), 0),
        'average_order_centavos', coalesce(round(avg(o.total_centavos)), 0)
      ) from public.orders o
      where (o.created_at at time zone 'Asia/Manila')::date between p_start and p_end
    ),
    'statuses', (
      select coalesce(jsonb_object_agg(status, count), '{}'::jsonb) from (
        select order_status::text as status, count(*)::int as count from public.orders
        where (created_at at time zone 'Asia/Manila')::date between p_start and p_end group by order_status
      ) s
    ),
    'methods', (
      select coalesce(jsonb_object_agg(method, count), '{}'::jsonb) from (
        select order_method::text as method, count(*)::int as count from public.orders
        where (created_at at time zone 'Asia/Manila')::date between p_start and p_end group by order_method
      ) m
    ),
    'top_drinks', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select i.product_name_snapshot as name, sum(i.quantity)::int as units, sum(i.subtotal_centavos)::int as revenue_centavos
        from public.order_items i join public.orders od on od.id = i.order_id
        where (od.created_at at time zone 'Asia/Manila')::date between p_start and p_end
          and od.payment_status = 'paid' and od.order_status not in ('rejected','cancelled')
        group by i.product_name_snapshot order by units desc limit 5
      ) x
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

grant execute on function public.admin_analytics(date, date) to authenticated;
