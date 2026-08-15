import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/currency";
type Analytics = {
  summary: {
    revenue_centavos: number;
    orders: number;
    drinks_sold: number;
    average_order_centavos: number;
  };
  top_drinks: Array<{ name: string; units: number; revenue_centavos: number }>;
};
export default async function AnalyticsPage() {
  const end = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_analytics", {
    p_start: start.toISOString().slice(0, 10),
    p_end: end,
  });
  const analytics = (data ?? {
    summary: { revenue_centavos: 0, orders: 0, drinks_sold: 0, average_order_centavos: 0 },
    top_drinks: [],
  }) as unknown as Analytics;
  const cards = [
    ["Revenue", formatPeso(analytics.summary.revenue_centavos)],
    ["Orders", analytics.summary.orders],
    ["Drinks sold", analytics.summary.drinks_sold],
    ["Average order", formatPeso(analytics.summary.average_order_centavos)],
  ];
  return (
    <section className="pt-8">
      <p className="eyebrow">Orders placed in the last 30 days</p>
      <h2 className="display text-5xl mt-2">Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
        {cards.map(([label, value]) => (
          <article className="card p-5" key={label as string}>
            <p className="eyebrow">{label}</p>
            <strong className="display text-4xl mt-2 block">{value}</strong>
          </article>
        ))}
      </div>
      <div className="card p-6 mt-6 max-w-2xl">
        <p className="eyebrow">Top drinks by quantity</p>
        {analytics.top_drinks.length ? (
          analytics.top_drinks.map((drink) => (
            <div
              className="flex justify-between py-3 border-b border-[var(--color-border)]"
              key={drink.name}
            >
              <span>
                {drink.name}
                <small className="block text-[var(--color-muted)]">{drink.units} sold</small>
              </span>
              <strong>{formatPeso(drink.revenue_centavos)}</strong>
            </div>
          ))
        ) : (
          <p className="mt-4 text-[var(--color-muted)]">No paid order data in this range.</p>
        )}
      </div>
    </section>
  );
}
