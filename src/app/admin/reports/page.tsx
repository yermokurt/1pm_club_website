import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/currency";
import { ReportsTable, type ReportOrder } from "@/components/admin/reports-table";

const statuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "to_be_delivered",
  "completed",
  "rejected",
  "cancelled",
];
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const to = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : today();
  const start = new Date(`${to}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  const from =
    params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
      ? params.from
      : start.toISOString().slice(0, 10);
  const status = statuses.includes(params.status ?? "") ? params.status : "";
  const payment = ["qr", "cod"].includes(params.payment ?? "") ? params.payment : "";
  const fulfilment = ["pickup", "delivery"].includes(params.fulfilment ?? "")
    ? params.fulfilment
    : "";
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "order_number,fulfillment_date,customer_name_snapshot,customer_email_snapshot,order_method,department_name_snapshot,time_slot,payment_method,payment_status,order_status,total_centavos,order_items(product_name_snapshot,quantity,subtotal_centavos,order_item_addons(addon_name_snapshot))",
    )
    .gte("created_at", `${from}T00:00:00+08:00`)
    .lt("created_at", `${to}T23:59:59.999+08:00`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (status) query = query.eq("order_status", status);
  if (payment) query = query.eq("payment_method", payment);
  if (fulfilment) query = query.eq("order_method", fulfilment);
  const { data } = await query;
  const orders = (data ?? []) as unknown as ReportOrder[];
  const cups = orders.reduce(
    (total, order) => total + order.order_items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );
  const completed = orders.filter((order) => order.order_status === "completed");
  const revenue = completed.reduce((total, order) => total + order.total_centavos, 0);
  const failed = orders.filter((order) =>
    ["cancelled", "rejected"].includes(order.order_status),
  ).length;
  const summary = [
    ["Total orders", orders.length],
    ["Total cups", cups],
    ["Revenue", formatPeso(revenue)],
    ["Completed", completed.length],
    ["Cancelled / rejected", failed],
  ];
  return (
    <section className="pt-8">
      <p className="eyebrow">Historical operations</p>
      <h2 className="display text-5xl mt-2">Reports</h2>
      <form className="card grid sm:grid-cols-2 lg:grid-cols-5 gap-3 p-5 mt-7">
        <label>
          <span className="form-label">From</span>
          <input className="field" type="date" name="from" defaultValue={from} />
        </label>
        <label>
          <span className="form-label">To</span>
          <input className="field" type="date" name="to" defaultValue={to} />
        </label>
        <label>
          <span className="form-label">Status</span>
          <select className="field" name="status" defaultValue={status}>
            <option value="">All</option>
            {statuses.map((value) => (
              <option value={value} key={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="form-label">Payment</span>
          <select className="field" name="payment" defaultValue={payment}>
            <option value="">All</option>
            <option value="qr">QR</option>
            <option value="cod">Cash</option>
          </select>
        </label>
        <label>
          <span className="form-label">Fulfilment</span>
          <select className="field" name="fulfilment" defaultValue={fulfilment}>
            <option value="">All</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
        <button className="btn sm:col-span-2 lg:col-span-5">Apply filters</button>
      </form>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
        {summary.map(([label, value]) => (
          <article className="card p-4" key={label as string}>
            <p className="eyebrow">{label}</p>
            <strong className="display text-3xl mt-2 block">{value}</strong>
          </article>
        ))}
      </div>
      <div className="mt-7">
        <ReportsTable orders={orders} />
      </div>
    </section>
  );
}
