import { CatalogManager } from "@/components/admin/catalog-manager";
import { createClient } from "@/lib/supabase/server";
export default async function AdminAddonsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("addons")
    .select("id,name,is_available,price_centavos,sort_order")
    .order("sort_order");
  return (
    <section className="pt-8">
      <p className="eyebrow">Modifiers</p>
      <h2 className="display text-5xl mt-2">Add-ons</h2>
      <div className="mt-7">
        <CatalogManager
          table="addons"
          priceable
          items={
            (data ?? []) as unknown as Array<{
              id: string;
              name: string;
              is_available: boolean;
              price_centavos: number;
              sort_order: number;
            }>
          }
        />
      </div>
    </section>
  );
}
