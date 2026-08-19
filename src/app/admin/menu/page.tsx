import { CatalogManager } from "@/components/admin/catalog-manager";
import { createClient } from "@/lib/supabase/server";
export default async function AdminMenuPage() {
  const supabase = await createClient();
  const [{ data }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,description,image_url,is_available,price_centavos,sort_order,category_id,categories(name)",
      )
      .order("sort_order"),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  const categoryOptions = (categories ?? []) as Array<{ id: string; name: string }>;
  const items = (data ?? []).map((item) => ({
    ...item,
    category_name:
      categoryOptions.find((category) => category.id === item.category_id)?.name ?? null,
  }));
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
          categories={categoryOptions}
          items={
            items as unknown as Array<{
              id: string;
              name: string;
              description: string | null;
              image_url: string | null;
              category_id: string;
              category_name: string | null;
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
