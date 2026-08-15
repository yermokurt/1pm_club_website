import { AdminOrderQueue } from "@/components/admin/admin-order-queue";
import { createClient } from "@/lib/supabase/server";
import type { OrderSummary } from "@/types/domain";
export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id,order_number,customer_name_snapshot,customer_email_snapshot,department_name_snapshot,customer_note,fulfillment_date,time_slot,order_method,order_status,payment_status,total_centavos,created_at,order_items(product_name_snapshot,quantity,subtotal_centavos,order_item_addons(addon_name_snapshot,addon_price_snapshot_centavos))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <section className="pt-8">
      <p className="eyebrow">Live queue</p>
      <h2 className="display text-5xl mt-2">Orders</h2>
      <div className="mt-7">
        <AdminOrderQueue orders={(data ?? []) as unknown as OrderSummary[]} />
      </div>
    </section>
  );
}
