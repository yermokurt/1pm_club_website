import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/currency";
import { getSettings } from "@/lib/data";

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
const currentWeekRange = () => {
  const date = new Date(today() + "T12:00:00Z");
  const mondayOffset = date.getUTCDay() === 0 ? -6 : 1 - date.getUTCDay();
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);
  return {
    from: monday.toISOString().slice(0, 10),
    to: friday.toISOString().slice(0, 10),
  };
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const defaultRange = currentWeekRange();
  const to = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : defaultRange.to;
  const from =
    params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : defaultRange.from;
  const status = statuses.includes(params.status ?? "") ? params.status : "";
  const payment = ["qr", "cod"].includes(params.payment ?? "") ? params.payment : "";
  const fulfilment = ["pickup", "delivery"].includes(params.fulfilment ?? "")
    ? params.fulfilment
    : "";
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "created_at,order_status,payment_status,payment_method,order_method,total_centavos,order_items(product_name_snapshot,quantity,subtotal_centavos)",
    )
    .gte("created_at", `${from}T00:00:00+08:00`)
    .lt("created_at", `${to}T23:59:59.999+08:00`);
  if (status) query = query.eq("order_status", status);
  if (payment) query = query.eq("payment_method", payment);
  if (fulfilment) query = query.eq("order_method", fulfilment);
  const [{ data }, settings] = await Promise.all([query, getSettings()]);
  const orders = (data ?? []) as Array<{
    created_at: string;
    order_status: string;
    payment_status: string;
    total_centavos: number;
    order_items: Array<{
      product_name_snapshot: string;
      quantity: number;
      subtotal_centavos: number;
    }>;
  }>;
  const valid = orders.filter((order) => !["rejected", "cancelled"].includes(order.order_status));
  const revenue = valid
    .filter((order) => order.payment_status === "paid")
    .reduce((sum, order) => sum + order.total_centavos, 0);
  const cups = orders.reduce(
    (sum, order) => sum + order.order_items.reduce((count, item) => count + item.quantity, 0),
    0,
  );
  const drinks = new Map<string, { units: number; revenue: number }>();
  valid
    .filter((order) => order.payment_status === "paid")
    .flatMap((order) => order.order_items)
    .forEach((item) => {
      const current = drinks.get(item.product_name_snapshot) ?? { units: 0, revenue: 0 };
      drinks.set(item.product_name_snapshot, {
        units: current.units + item.quantity,
        revenue: current.revenue + item.subtotal_centavos,
      });
    });
  const cards = [
    ["Revenue", formatPeso(revenue)],
    ["Orders", orders.length],
    ["Drinks sold", cups],
    [
      "Average order",
      formatPeso(
        valid.length
          ? Math.round(valid.reduce((sum, order) => sum + order.total_centavos, 0) / valid.length)
          : 0,
      ),
    ],
  ];
  const perDay = new Map<string, number>();
  const cursor = new Date(`${from}T12:00:00Z`);
  const lastDay = new Date(`${to}T12:00:00Z`);
  while (cursor <= lastDay) {
    perDay.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  orders.forEach((order) => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
      new Date(order.created_at),
    );
    const drinksForOrder = order.order_items.reduce((total, item) => total + item.quantity, 0);
    if (perDay.has(day)) perDay.set(day, (perDay.get(day) ?? 0) + drinksForOrder);
  });
  const dailyOrders = [...perDay.entries()];
  const peakDrinks = Math.max(1, ...dailyOrders.map(([, count]) => count));
  const chartCapacity = Math.max(1, settings.slot_capacity);
  const midpoint = Math.ceil(chartCapacity / 2);
  return (
    <section className="pt-8">
      <p className="eyebrow">Orders placed analytics</p>
      <h2 className="display text-5xl mt-2">Analytics</h2>
      <form className="card grid grid-cols-2 gap-3 p-5 mt-7 lg:grid-cols-5">
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
        <button className="btn !min-h-[46px] col-span-2 lg:col-span-5">Apply filters</button>
      </form>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {cards.map(([label, value]) => (
          <article className="card p-5" key={label as string}>
            <p className="eyebrow">{label}</p>
            <strong className="display text-4xl mt-2 block">{value}</strong>
          </article>
        ))}
      </div>
      <div className="grid gap-6 mt-6 lg:grid-cols-2">
        <div className="card p-6">
          <p className="eyebrow">Top paid drinks by quantity</p>
          {[...drinks.entries()]
            .sort((a, b) => b[1].units - a[1].units)
            .slice(0, 5)
            .map(([name, value]) => (
              <div
                className="flex justify-between py-3 border-b border-[var(--color-border)]"
                key={name}
              >
                <span>
                  {name}
                  <small className="block text-[var(--color-muted)]">{value.units} sold</small>
                </span>
                <strong>{formatPeso(value.revenue)}</strong>
              </div>
            ))}
          {!drinks.size && (
            <p className="mt-4 text-[var(--color-muted)]">
              No paid order data matches these filters.
            </p>
          )}
        </div>
        <div className="card p-6">
          <p className="eyebrow">Total drinks per day</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Daily slot capacity: {chartCapacity} cups
          </p>
          <div className="mt-5 grid grid-cols-[2.25rem_1fr] gap-2">
            <div className="flex h-56 flex-col justify-between text-right text-xs text-[var(--color-muted)]">
              <span>{chartCapacity}</span>
              <span>{midpoint}</span>
              <span>0</span>
            </div>
            <div
              className="flex h-56 items-end gap-1 border-b border-l border-[var(--color-border)] bg-[linear-gradient(to_bottom,transparent_49.5%,var(--color-border)_50%,transparent_50.5%)]"
              role="img"
              aria-label={`Bar chart showing total drinks for each day in the selected range, scaled to the ${chartCapacity}-cup daily capacity`}
            >
              {dailyOrders.map(([day, count]) => (
                <div className="group flex h-full min-w-0 flex-1 flex-col justify-end" key={day}>
                  <div
                    className="min-h-1 bg-primary transition-[height]"
                    style={{ height: `${Math.min(100, (count / chartCapacity) * 100)}%` }}
                    title={`${day}: ${count} drink${count === 1 ? "" : "s"}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex justify-between gap-3 text-xs text-[var(--color-muted)]">
            <span>{from}</span>
            <span>Peak: {peakDrinks} drinks</span>
            <span>{to}</span>
          </div>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Hover a bar to see that day&apos;s drink total. This chart uses the same filters above.
          </p>
        </div>
      </div>
    </section>
  );
}
