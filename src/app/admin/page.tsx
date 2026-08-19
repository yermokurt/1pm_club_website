import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function AdminPage() {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const displayDate = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const { data } = await supabase
    .from("orders")
    .select("order_status,payment_status")
    .eq("fulfillment_date", today);
  const orders = (data ?? []) as Array<{ order_status: string; payment_status: string }>;
  const statuses = [
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "to_be_delivered",
    "completed",
  ];
  return (
    <section className="pt-8">
      <p className="eyebrow">Today&apos;s operations · {displayDate}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {statuses.map((status) => (
          <Link href="/admin/orders" key={status} className="card p-4">
            <p className="text-xs uppercase font-bold">{status.replaceAll("_", " ")}</p>
            <strong className="display text-4xl">
              {orders.filter((order) => order.order_status === status).length}
            </strong>
          </Link>
        ))}
      </div>
      <div className="card p-6 mt-6">
        <p className="eyebrow">Payment overview</p>
        <p className="display text-5xl mt-2">
          {orders.filter((order) => order.payment_status === "paid").length} paid
        </p>
        <Link href="/admin/orders" className="btn mt-5">
          Open order queue
        </Link>
      </div>
    </section>
  );
}
