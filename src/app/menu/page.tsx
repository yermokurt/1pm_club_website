import { MenuBrowser } from "@/components/menu/menu-browser";
import { getAddons, getMenu } from "@/lib/data";
export default async function MenuPage() {
  const [products, addons] = await Promise.all([getMenu(), getAddons()]);
  return (
    <main className="shell">
      <p className="eyebrow">The 1PM Club</p>
      <h1 className="display text-6xl sm:text-8xl text-primary mt-2">Menu</h1>
      <p className="max-w-lg mt-5 text-[var(--color-muted)]">
        Choose a drink, add the little extras, then reserve your drink of choice.
      </p>
      <div className="mt-10">
        <MenuBrowser products={products} addons={addons} />
      </div>
    </main>
  );
}
