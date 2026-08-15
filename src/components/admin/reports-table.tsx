"use client";
import { formatPeso } from "@/lib/currency";

export type ReportOrder = {
  order_number: number;
  fulfillment_date: string;
  customer_name_snapshot: string;
  customer_email_snapshot: string | null;
  order_method: string;
  department_name_snapshot: string | null;
  time_slot: string;
  payment_method: string | null;
  payment_status: string;
  order_status: string;
  total_centavos: number;
  order_items: Array<{ quantity: number }>;
};

export function ReportsTable({ orders }: { orders: ReportOrder[] }) {
  const exportCsv = () => {
    const fields = [
      "Order Number",
      "Date",
      "Customer",
      "Email",
      "Fulfilment Method",
      "Department",
      "Slot",
      "Payment Method",
      "Payment Status",
      "Order Status",
      "Cup Quantity",
      "Total",
    ];
    const csv = [
      fields,
      ...orders.map((order) => [
        order.order_number,
        order.fulfillment_date,
        order.customer_name_snapshot,
        order.customer_email_snapshot ?? "",
        order.order_method,
        order.department_name_snapshot ?? "",
        order.time_slot,
        order.payment_method ?? "",
        order.payment_status,
        order.order_status,
        order.order_items.reduce((total, item) => total + item.quantity, 0),
        (order.total_centavos / 100).toFixed(2),
      ]),
    ]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "1pm-club-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  if (!orders.length)
    return <div className="card p-7 text-[var(--color-muted)]">No orders match these filters.</div>;
  return (
    <>
      <button className="btn secondary mb-4" onClick={exportCsv}>
        Export CSV
      </button>
      <div className="overflow-x-auto border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[var(--color-surface)] text-left">
            <tr>
              {[
                "Order #",
                "Date",
                "Customer",
                "Cups",
                "Fulfilment",
                "Department",
                "Payment",
                "Status",
                "Total",
              ].map((label) => (
                <th className="p-3" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t border-[var(--color-border)]" key={order.order_number}>
                <td className="p-3 font-bold">#{order.order_number}</td>
                <td className="p-3">{order.fulfillment_date}</td>
                <td className="p-3">{order.customer_name_snapshot}</td>
                <td className="p-3">
                  {order.order_items.reduce((total, item) => total + item.quantity, 0)}
                </td>
                <td className="p-3 capitalize">{order.order_method}</td>
                <td className="p-3">{order.department_name_snapshot ?? "—"}</td>
                <td className="p-3 capitalize">
                  {order.payment_method ?? "QR"}
                  <br />
                  <span className="text-xs text-[var(--color-muted)]">{order.payment_status}</span>
                </td>
                <td className="p-3 capitalize">{order.order_status.replaceAll("_", " ")}</td>
                <td className="p-3 font-bold">{formatPeso(order.total_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
