"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderByAdmin, updateOrderByAdmin } from "@/app/actions/orders";
import { formatPeso } from "@/lib/currency";
import type { OrderSummary } from "@/types/domain";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/order-status";
const next: Partial<Record<OrderSummary["order_status"], string>> = {
  confirmed: "preparing",
  ready_for_pickup: "completed",
  to_be_delivered: "completed",
};
type AdminOrder = OrderSummary & {
  customer_email_snapshot?: string | null;
  department_name_snapshot?: string | null;
  customer_note?: string | null;
  order_items?: Array<{
    product_name_snapshot: string;
    quantity: number;
    subtotal_centavos: number;
    order_item_addons?: Array<{ addon_name_snapshot: string }>;
  }>;
};
export function AdminOrderQueue({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState("all");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrder | null>(null);
  const [typedOrderNumber, setTypedOrderNumber] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!selected && !deleteTarget) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [deleteTarget, selected]);
  const filtered = orders.filter((order) => filter === "all" || order.order_status === filter);
  const update = (id: string, status: string, payment?: string) =>
    start(() => {
      void updateOrderByAdmin(id, status, payment).then((result) => {
        setMessage(result.message);
        if (result.ok) router.refresh();
      });
    });
  const deleteOrder = () => {
    if (!deleteTarget) return;
    start(() => {
      void deleteOrderByAdmin(deleteTarget.id, typedOrderNumber).then((result) => {
        setMessage(result.message);
        if (result.ok) {
          setDeleteTarget(null);
          setTypedOrderNumber("");
          router.refresh();
        }
      });
    });
  };
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
                {order.order_items?.length ? (
                  <p className="mt-3 text-sm text-[var(--color-muted)]">
                    {order.order_items
                      .flatMap((item) => [
                        `${item.quantity}× ${item.product_name_snapshot}`,
                        ...(item.order_item_addons ?? []).map(
                          (addon) => `+ ${addon.addon_name_snapshot}`,
                        ),
                      ])
                      .join(", ")}
                  </p>
                ) : null}
              </div>
              <strong>{formatPeso(order.total_centavos)}</strong>
            </div>
            <div className="flex gap-2 flex-wrap mt-5">
              <button className="btn secondary !min-h-9 !px-3" onClick={() => setSelected(order)}>
                View details
              </button>
              <button
                className="btn danger !min-h-9 !px-3"
                disabled={pending}
                onClick={() => {
                  setDeleteTarget(order);
                  setTypedOrderNumber("");
                }}
              >
                Delete
              </button>
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
              {order.payment_status === "unpaid" &&
                !["rejected", "cancelled"].includes(order.order_status) && (
                  <button
                    disabled={pending}
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
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto border border-[var(--color-border)] bg-[var(--color-field)] p-6 shadow-[6px_6px_0_var(--color-border)]">
            <div className="flex justify-between gap-4">
              <div>
                <p className="eyebrow">Order details</p>
                <h3 className="display text-4xl">#{selected.order_number}</h3>
              </div>
              <button className="btn secondary !min-h-9 !px-3" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2">
              <p>
                <strong>Customer:</strong> {selected.customer_name_snapshot}
              </p>
              <p>
                <strong>Email:</strong> {selected.customer_email_snapshot || "—"}
              </p>
              <p>
                <strong>Fulfilment:</strong> {selected.fulfillment_date}
              </p>
              <p>
                <strong>Slot:</strong> {selected.time_slot}
              </p>
              <p>
                <strong>Method:</strong> {selected.order_method}
              </p>
              <p>
                <strong>Department:</strong> {selected.department_name_snapshot || "—"}
              </p>
              {selected.customer_note && (
                <p className="sm:col-span-2">
                  <strong>Note:</strong> {selected.customer_note}
                </p>
              )}
            </div>
            <div className="mt-5">
              <p className="eyebrow mb-2">Order items</p>
              {selected.order_items?.map((item, index) => (
                <div
                  className="flex justify-between gap-4 border-t border-[var(--color-border)] py-3"
                  key={`${item.product_name_snapshot}-${index}`}
                >
                  <div>
                    <strong>
                      {item.quantity}× {item.product_name_snapshot}
                    </strong>
                    {item.order_item_addons?.length ? (
                      <p className="text-sm text-[var(--color-muted)]">
                        +{" "}
                        {item.order_item_addons
                          .map((addon) => addon.addon_name_snapshot)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <strong className="whitespace-nowrap">
                    {formatPeso(item.subtotal_centavos)}
                  </strong>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-[var(--color-border)] pt-4 text-right text-xl font-bold">
              {formatPeso(selected.total_centavos)}
            </p>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-order-title"
        >
          <div className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-field)] p-6 shadow-[6px_6px_0_var(--color-border)]">
            <p className="eyebrow text-[var(--color-danger)]">Permanent action</p>
            <h3 id="delete-order-title" className="display mt-2 text-3xl">
              Delete order #{deleteTarget.order_number}?
            </h3>
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              This permanently removes the order, its drink items, add-ons, and email logs. It
              cannot be undone.
            </p>
            <label className="mt-5 block">
              <span className="form-label">Type {deleteTarget.order_number} to confirm</span>
              <input
                className="field"
                inputMode="numeric"
                value={typedOrderNumber}
                onChange={(event) => setTypedOrderNumber(event.target.value)}
                autoFocus
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="btn secondary !min-h-9 !px-3"
                disabled={pending}
                onClick={() => {
                  setDeleteTarget(null);
                  setTypedOrderNumber("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn danger !min-h-9 !px-3"
                disabled={pending || typedOrderNumber.trim() !== String(deleteTarget.order_number)}
                onClick={deleteOrder}
              >
                Permanently delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
