import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Addon, BusinessSettings, Product, SlotCapacity } from "@/types/domain";

const defaultSettings: BusinessSettings = {
  accepting_orders: true,
  morning_cutoff: "10:00",
  lunch_cutoff: "13:30",
  slot_capacity: 15,
  timezone: "Asia/Manila",
  payment_qr_url: null,
};
export async function getMenu(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .order("sort_order");
  return (data ?? []) as unknown as Product[];
}
export async function getAddons(): Promise<Addon[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("addons").select("*").order("sort_order");
  return (data ?? []) as unknown as Addon[];
}
export async function getMostOrderedProducts(products: Product[]): Promise<Product[]> {
  const available = products.filter((product) => product.is_available);
  try {
    const admin = createAdminClient();
    const [{ data: orders, error: ordersError }, { data: items, error: itemsError }] =
      await Promise.all([
        admin.from("orders").select("id,order_status"),
        admin.from("order_items").select("order_id,product_id,quantity"),
      ]);
    if (ordersError || itemsError) throw ordersError ?? itemsError;
    const countableOrders = new Set(
      ((orders ?? []) as Array<{ id: string; order_status: string }>)
        .filter((order) => !["rejected", "cancelled"].includes(order.order_status))
        .map((order) => order.id),
    );
    const quantities = new Map<string, number>();
    for (const item of (items ?? []) as Array<{
      order_id: string;
      product_id: string;
      quantity: number;
    }>) {
      if (countableOrders.has(item.order_id))
        quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + item.quantity);
    }
    return [...available]
      .sort(
        (first, second) =>
          (quantities.get(second.id) ?? 0) - (quantities.get(first.id) ?? 0) ||
          first.sort_order - second.sort_order,
      )
      .slice(0, 3);
  } catch {
    // Keep the homepage useful while a server-only key is unavailable locally.
    return available.slice(0, 3);
  }
}
export async function getSettings(): Promise<BusinessSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return (data as unknown as BusinessSettings | null) ?? defaultSettings;
}
export async function getSlotCapacity(date: string): Promise<SlotCapacity[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_slot_capacity", { p_fulfillment_date: date });
  return (data ?? []) as unknown as SlotCapacity[];
}
