"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderByAdmin } from "@/app/actions/orders";
import { formatPeso } from "@/lib/currency";
import type { OrderSummary } from "@/types/domain";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/order-status";
const next: Partial<Record<OrderSummary["order_status"], string>> = {
  confirmed: "preparing",
  ready_for_pickup: "completed",
  to_be_delivered: "completed",
};
export function AdminOrderQueue({ orders }: { orders: OrderSummary[] }) {
  const [filter, setFilter] = useState("all");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const filtered = orders.filter((order) => filter === "all" || order.order_status === filter);
  const update = (id: string, status: string, payment?: string) =>
    start(() => {
      void updateOrderByAdmin(id, status, payment).then((result) => {
        setMessage(result.message);
        if (result.ok) router.refresh();
      });
    });
  const nextStatus = (order: OrderSummary) =>
    order.order_status === "preparing"
      ? order.order_method === "delivery"
        ? "to_be_delivered"
        : "ready_for_pickup"
      : next[order.order_status];
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          "all",
          "pending",
          "confirmed",
          "preparing",
          "ready_for_pickup",
          "to_be_delivered",
          "completed",
          "rejected",
          "cancelled",
        ].map((value) => (
          <button
            key={value}
            className={`border px-3 py-2 text-xs font-bold uppercase ${filter === value ? "bg-primary text-white" : "border-[var(--color-border)]"}`}
            onClick={() => setFilter(value)}
          >
            {value.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      {message && (
        <p className="mb-5 text-sm" role="status">
          {message}
        </p>
      )}
      <div className="grid gap-3">
        {filtered.map((order) => (
          <article key={order.id} className="card p-5">
            <div className="flex flex-wrap gap-4 justify-between">
              <div>
                <strong>#{order.order_number}</strong>
                <p className="text-sm mt-1">
                  {order.customer_name_snapshot} · {order.fulfillment_date} · {order.time_slot}
                </p>
                <div className="mt-2 flex gap-3">
                  <OrderStatusBadge status={order.order_status} />
                  <PaymentBadge status={order.payment_status} />
                </div>
              </div>
              <strong>{formatPeso(order.total_centavos)}</strong>
            </div>
            <div className="flex gap-2 flex-wrap mt-5">
              {order.order_status === "pending" && (
                <>
                  <button
                    disabled={pending}
                    className="btn !min-h-9 !px-3"
                    onClick={() => update(order.id, "confirmed")}
                  >
                    Confirm
                  </button>
                  <button
                    disabled={pending}
                    className="btn danger !min-h-9 !px-3"
                    onClick={() => update(order.id, "rejected")}
                  >
                    Reject
                  </button>
                </>
              )}
              {nextStatus(order) && (
                <button
                  disabled={pending || order.order_status === "cancelled"}
                  className="btn !min-h-9 !px-3"
                  onClick={() => update(order.id, nextStatus(order)!)}
                >
                  {nextStatus(order)!.replaceAll("_", " ")}
                </button>
              )}
              {order.payment_status === "unpaid" && (
                <button
                  disabled={pending || order.order_status === "cancelled"}
                  className="btn secondary !min-h-9 !px-3"
                  onClick={() => update(order.id, order.order_status, "paid")}
                >
                  Mark paid
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
