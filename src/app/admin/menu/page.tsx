import { CatalogManager } from "@/components/admin/catalog-manager";
import { createClient } from "@/lib/supabase/server";
export default async function AdminMenuPage() {
  const supabase = await createClient();
  const [{ data }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,is_available,price_centavos,sort_order")
      .order("sort_order"),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  return (
    <section className="pt-8">
      <p className="eyebrow">Catalogue</p>
      <h2 className="display text-5xl mt-2">Menu</h2>
      <p className="mt-3 text-sm text-[var(--color-muted)]">
        Pricing is stored in centavos and only editable by admins.
      </p>
      <div className="mt-7">
        <CatalogManager
          table="products"
          priceable
          categories={(categories ?? []) as unknown as Array<{ id: string; name: string }>}
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
