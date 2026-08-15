import type { OrderStatus, PaymentStatus } from "@/types/domain";
const labels: Record<OrderStatus, string> = {
  pending: "Pending approval",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  to_be_delivered: "To be delivered",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "rejected" || status === "cancelled"
      ? "text-[var(--color-danger)]"
      : status === "completed"
        ? "text-[var(--color-success)]"
        : "text-primary";
  return (
    <span className={`text-xs font-extrabold uppercase tracking-wider ${tone}`}>
      ● {labels[status]}
    </span>
  );
}
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`text-xs font-extrabold uppercase tracking-wider ${status === "paid" ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}
    >
      ● {status}
    </span>
  );
}
