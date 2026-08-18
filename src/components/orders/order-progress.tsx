"use client";

import type { OrderMethod, OrderStatus } from "@/types/domain";

const shared = ["pending", "confirmed", "preparing"] as const;
const label: Record<OrderStatus, string> = {
  pending: "Pending approval",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  to_be_delivered: "Out for delivery",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function OrderProgress({ status, method }: { status: OrderStatus; method: OrderMethod }) {
  if (status === "rejected" || status === "cancelled")
    return (
      <div className="mt-7 border border-[var(--color-danger)] p-4 text-sm text-[var(--color-danger)]">
        This order has been {label[status].toLowerCase()}.
      </div>
    );
  const finalStep = method === "delivery" ? "to_be_delivered" : "ready_for_pickup";
  const steps = [...shared, finalStep, "completed"] as OrderStatus[];
  const active = Math.max(0, steps.indexOf(status));
  const progress = (active / (steps.length - 1)) * 100;
  return (
    <section className="mt-8 border-t border-[var(--color-border)] pt-6" aria-live="polite">
      <p className="eyebrow">Live order tracking</p>
      <div className="mt-4 h-3 overflow-hidden border border-[var(--color-border)]">
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] font-bold uppercase">
        {steps.map((step, index) => (
          <li key={step} className={index <= active ? "text-primary" : "text-[var(--color-muted)]"}>
            {label[step]}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        This page refreshes automatically when your order status changes.
      </p>
    </section>
  );
}
