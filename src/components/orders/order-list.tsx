"use client";
import Link from "next/link";
import { useTransition } from "react";
import { cancelOrder } from "@/app/actions/orders";
import { formatPeso } from "@/lib/currency";
import type { OrderSummary } from "@/types/domain";
import { OrderStatusBadge, PaymentBadge } from "./order-status";
export function OrderList({ orders }: { orders: OrderSummary[] }) {
  const [pending, start] = useTransition();
  if (!orders.length)
    return (
      <div className="card p-10 text-center">
        <p className="display text-4xl">No orders yet.</p>
        <p className="mt-3 text-[var(--color-muted)]">Your next 1PM pick-me-up will land here.</p>
        <Link className="btn mt-7" href="/menu">
          Browse menu
        </Link>
      </div>
    );
  return (
    <div className="grid gap-3">
      {orders.map((order) => (
        <article
          key={order.id}
          className="card p-5 flex flex-wrap gap-4 justify-between items-center"
        >
          <div>
            <p className="font-bold">
              #{order.order_number}{" "}
              <span className="ml-2 text-sm font-normal">
                {order.fulfillment_date} · {order.time_slot}
              </span>
            </p>
            <div className="mt-2 flex gap-3">
              <OrderStatusBadge status={order.order_status} />
              <PaymentBadge status={order.payment_status} />
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-wrap gap-3 items-center sm:justify-end">
            <strong>{formatPeso(order.total_centavos)}</strong>
            <Link className="btn secondary !min-h-9 !px-3" href={`/orders/${order.order_number}`}>
              View
            </Link>
            {order.order_status === "pending" && (
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await cancelOrder(order.id);
                  })
                }
                className="text-xs uppercase font-bold text-[var(--color-danger)]"
              >
                Cancel
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
