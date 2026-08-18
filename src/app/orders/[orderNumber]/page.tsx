import { notFound } from "next/navigation";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/order-status";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/currency";
import type { OrderDetail } from "@/types/domain";
import { GuestOrderActions } from "@/components/orders/guest-order-actions";
import { OrderProgress } from "@/components/orders/order-progress";
import { OrderRealtime } from "@/components/orders/order-realtime";
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderNumber: rawNumber } = await params;
  const { token } = await searchParams;
  const orderNumber = Number(rawNumber);
  if (!Number.isSafeInteger(orderNumber)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let data: unknown = null;
  if (user) {
    const response = await supabase
      .from("orders")
      .select("*,order_items(*,order_item_addons(*))")
      .eq("order_number", orderNumber)
      .eq("customer_id", user.id)
      .maybeSingle();
    data = response.data;
  } else if (token) {
    const response = await supabase.rpc("get_guest_order", {
      p_order_number: orderNumber,
      p_token: token,
    });
    data = response.data?.[0] ?? null;
  }
  if (!data) notFound();
  const order = data as OrderDetail;
  return (
    <main className="shell max-w-3xl">
      {user && <OrderRealtime customerId={user.id} />}
      <p className="eyebrow">Order #{order.order_number}</p>
      <h1 className="display text-6xl mt-2">On its way.</h1>
      {!user && token && (
        <>
          <p className="mt-4 text-[var(--color-muted)]">
            Keep this secure link so you can track your guest order.
          </p>
          <GuestOrderActions href={`/orders/${orderNumber}?token=${encodeURIComponent(token)}`} />
        </>
      )}
      <div className="card mt-8 p-6 sm:p-8">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-sm">
              <strong>Order status:</strong> <OrderStatusBadge status={order.order_status} />
            </p>
            <p className="mt-2 text-sm">
              <strong>Payment status:</strong> <PaymentBadge status={order.payment_status} />
            </p>
          </div>
          <strong className="text-2xl">{formatPeso(order.total_centavos)}</strong>
        </div>
        <dl className="grid sm:grid-cols-3 gap-5 mt-8 pt-6 border-t border-[var(--color-border)] text-sm">
          <div>
            <dt className="eyebrow">Fulfilment</dt>
            <dd className="mt-2 font-bold">{order.fulfillment_date}</dd>
          </div>
          <div>
            <dt className="eyebrow">Slot</dt>
            <dd className="mt-2 font-bold capitalize">{order.time_slot}</dd>
          </div>
          <div>
            <dt className="eyebrow">Method</dt>
            <dd className="mt-2 font-bold capitalize">
              {order.order_method}
              {order.department_name_snapshot ? ` · ${order.department_name_snapshot}` : ""}
            </dd>
          </div>
        </dl>
        <OrderProgress status={order.order_status} method={order.order_method} />
        {order.order_items && (
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <p className="eyebrow">Your drinks</p>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between py-3 border-b border-[var(--color-border)]"
              >
                <div>
                  <strong>
                    {item.quantity}× {item.product_name_snapshot}
                  </strong>
                  {item.order_item_addons?.length ? (
                    <p className="text-sm text-[var(--color-muted)]">
                      +{" "}
                      {item.order_item_addons.map((addon) => addon.addon_name_snapshot).join(", ")}
                    </p>
                  ) : null}
                </div>
                <span>{formatPeso(item.subtotal_centavos)}</span>
              </div>
            ))}
          </div>
        )}
        {order.rejection_message && (
          <p className="mt-6 p-4 border border-[var(--color-danger)] text-[var(--color-danger)]">
            {order.rejection_message}
          </p>
        )}
      </div>
    </main>
  );
}
