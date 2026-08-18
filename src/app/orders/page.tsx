import { OrderList } from "@/components/orders/order-list";
import { createClient } from "@/lib/supabase/server";
import type { OrderSummary } from "@/types/domain";
import Link from "next/link";
import { OrderRealtime } from "@/components/orders/order-realtime";
import {
  OrderNotifications,
  type OrderNotification,
} from "@/components/orders/order-notifications";
export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return (
      <main className="shell">
        <p className="eyebrow">Your orders</p>
        <h1 className="display text-6xl mt-2">Track your break</h1>
        <p className="mt-5 text-[var(--color-muted)]">
          Sign in to see registered orders. Guests can use the secure link provided after checkout.
        </p>
        <Link className="btn mt-7" href="/auth/login">
          Sign in
        </Link>
      </main>
    );
  const [{ data }, { data: notifications }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,order_number,customer_name_snapshot,fulfillment_date,time_slot,order_method,order_status,payment_status,total_centavos,created_at",
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notifications")
      .select("id,title,body,read_at,created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  return (
    <main className="shell">
      <OrderRealtime customerId={user.id} />
      <p className="eyebrow">Your orders</p>
      <h1 className="display text-6xl mt-2">Track your break</h1>
      <div className="mt-9">
        <OrderNotifications
          profileId={user.id}
          initialNotifications={(notifications ?? []) as unknown as OrderNotification[]}
        />
        <OrderList orders={(data ?? []) as unknown as OrderSummary[]} />
      </div>
    </main>
  );
}
