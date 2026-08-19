import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Addon, BusinessSettings, Product, SlotCapacity } from "@/types/domain";

const defaultSettings: BusinessSettings = {
  accepting_orders: true,
  morning_cutoff: "10:00",
  lunch_cutoff: "13:30",
  slot_capacity: 15,
  monday_booking_lead_days: 2,
  tuesday_booking_lead_days: 1,
  wednesday_booking_lead_days: 1,
  thursday_booking_lead_days: 1,
  friday_booking_lead_days: 1,
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
    const { data, error } = await admin.rpc("get_most_ordered_product_ids", {
      p_limit: 3,
      p_days: 90,
    });
    if (error) throw error;
    const rank = new Map(
      ((data ?? []) as Array<{ product_id: string }>).map(({ product_id }, index) => [
        product_id,
        index,
      ]),
    );
    return [...available]
      .filter((product) => rank.has(product.id))
      .sort((first, second) => (rank.get(first.id) ?? 0) - (rank.get(second.id) ?? 0))
      .slice(0, 3);
  } catch {
    // Keep the homepage useful before the performance migration is installed.
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
