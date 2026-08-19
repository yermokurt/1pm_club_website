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
  order_items: Array<{
    product_name_snapshot: string;
    quantity: number;
    subtotal_centavos: number;
    order_item_addons?: Array<{ addon_name_snapshot: string }>;
  }>;
};

export function ReportsTable({ orders }: { orders: ReportOrder[] }) {
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
    "Drink",
    "Add-ons",
    "Cup Total",
    "Order Total",
  ];
  const inventoryRows = orders.flatMap((order) =>
    order.order_items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => [
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
        item.product_name_snapshot,
        (item.order_item_addons ?? []).map((addon) => addon.addon_name_snapshot).join(", "),
        item.subtotal_centavos / item.quantity / 100,
        order.total_centavos / 100,
      ]),
    ),
  );
  const exportCsv = () => {
    const csv = [
      fields,
      ...inventoryRows.map((row) =>
        row.map((value, index) =>
          index === 12 || index === 13 ? Number(value).toFixed(2) : value,
        ),
      ),
    ]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "1pm-club-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportXlsx = async () => {
    const XLSX = await import("xlsx-js-style");
    const worksheet = XLSX.utils.aoa_to_sheet([fields, ...inventoryRows]);
    const lastColumn = XLSX.utils.encode_col(fields.length - 1);
    worksheet["!autofilter"] = { ref: `A1:${lastColumn}${inventoryRows.length + 1}` };
    worksheet["!cols"] = fields.map((field, columnIndex) => {
      const longestValue = Math.max(
        field.length,
        ...inventoryRows.map((row) => String(row[columnIndex] ?? "").length),
      );
      return { wch: Math.min(Math.max(longestValue + 2, 12), 42) };
    });
    const styledWorksheet = worksheet as typeof worksheet & {
      "!views"?: Array<Record<string, unknown>>;
    };
    styledWorksheet["!views"] = [
      { state: "frozen", ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" },
    ];
    fields.forEach((_, index) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
      if (cell)
        cell.s = {
          fill: { patternType: "solid", fgColor: { rgb: "0224CC" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
    });
    inventoryRows.forEach((_, rowIndex) => {
      [12, 13].forEach((columnIndex) => {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
        if (cell) cell.z = "₱#,##0.00";
      });
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory by cup");
    XLSX.writeFile(workbook, "1pm-club-inventory.xlsx", { compression: true });
  };
  const exportPdf = () => {
    const rows = orders
      .map(
        (order) =>
          `<tr><td>#${order.order_number}</td><td>${order.fulfillment_date}</td><td>${order.customer_name_snapshot}</td><td>${order.order_items.reduce((total, item) => total + item.quantity, 0)}</td><td>${order.order_method}</td><td>${order.department_name_snapshot ?? "—"}</td><td>${order.payment_method ?? "QR"} / ${order.payment_status}</td><td>${order.order_status.replaceAll("_", " ")}</td><td>${formatPeso(order.total_centavos)}</td></tr>`,
      )
      .join("");
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.write(
      `<!doctype html><html><head><title>1PM Club Report</title><style>@page{margin:14mm}*{box-sizing:border-box}body{margin:0;background:#f7f7f7;color:#000728;font-family:Arial,sans-serif}.report{max-width:1120px;margin:auto;padding:34px;border:1px solid #000728;background:#fff}.eyebrow{margin:0 0 10px;color:#4a10bd;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.heading{display:flex;align-items:end;justify-content:space-between;gap:20px;border-bottom:1px solid #000728;padding-bottom:20px}.mark{display:inline-grid;width:42px;height:42px;place-items:center;background:#0224cc;color:#fff;font-size:20px;font-weight:900}.heading h1{margin:0;font-size:38px;letter-spacing:-.04em}.summary{margin:22px 0;display:flex;gap:10px}.summary div{min-width:120px;border:1px solid #000728;padding:10px}.summary strong{display:block;font-size:21px}.summary span{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{background:#0224cc;color:#fff;text-align:left;text-transform:uppercase;letter-spacing:.05em;font-size:10px}th,td{border:1px solid #000728;padding:10px;font-size:11px}tr:nth-child(even){background:#f1edff}td:last-child{font-weight:800}.footer{margin-top:18px;color:#625e70;font-size:10px}@media print{body{background:#fff}.report{padding:0;border:0}.heading h1{font-size:30px}}</style></head><body><main class="report"><header class="heading"><div><p class="eyebrow">1PM Club · Historical operations</p><h1>Orders report</h1></div><div class="mark">1P</div></header><section class="summary"><div><strong>${orders.length}</strong><span>Orders shown</span></div><div><strong>${formatPeso(orders.reduce((total, order) => total + order.total_centavos, 0))}</strong><span>Total value</span></div></section><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Cups</th><th>Method</th><th>Department</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="footer">Generated by The 1PM Club</p></main></body></html>`,
    );
    popup.document.close();
    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 250);
  };
  if (!orders.length)
    return <div className="card p-7 text-[var(--color-muted)]">No orders match these filters.</div>;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <button className="btn secondary" onClick={exportCsv}>
          Export CSV
        </button>
        <button className="btn secondary" onClick={exportXlsx}>
          Export to XLSX
        </button>
        <button className="btn secondary" onClick={exportPdf}>
          Export PDF
        </button>
      </div>
      <div className="grid gap-3 md:hidden">
        {orders.map((order) => (
          <article className="card p-4" key={order.order_number}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong>#{order.order_number}</strong>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{order.fulfillment_date}</p>
              </div>
              <strong>{formatPeso(order.total_centavos)}</strong>
            </div>
            <p className="mt-3 font-bold">{order.customer_name_snapshot}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3 text-sm">
              <p>
                <span className="form-label">Cups</span>
                {order.order_items.reduce((total, item) => total + item.quantity, 0)}
              </p>
              <p>
                <span className="form-label">Fulfilment</span>
                <span className="capitalize">{order.order_method}</span>
              </p>
              <p>
                <span className="form-label">Payment</span>
                <span className="capitalize">
                  {order.payment_method ?? "QR"} · {order.payment_status}
                </span>
              </p>
              <p>
                <span className="form-label">Status</span>
                <span className="capitalize">{order.order_status.replaceAll("_", " ")}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto border border-[var(--color-border)] md:block">
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
