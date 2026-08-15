import Link from "next/link";
import { ArrowRight, Coffee, Sparkles } from "lucide-react";
import { getMenu, getSettings } from "@/lib/data";
import { formatPeso } from "@/lib/currency";
export default async function HomePage() {
  const [products, settings] = await Promise.all([getMenu(), getSettings()]);
  return (
    <main className="shell">
      <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center pt-4 pb-10 lg:pt-8 lg:pb-20 border-b border-[var(--color-border)]">
        <div>
          <p className="eyebrow">Office café pre-orders</p>
          <h1 className="display text-[clamp(4.2rem,12vw,8.5rem)] leading-[.8] mt-5 text-primary">
            Your 1PM,
            <br />
            break, poured.
          </h1>
          <p className="mt-7 max-w-lg text-[var(--color-muted)] leading-7">
            Choose your coffee, matcha or hōjicha ahead of time. We&apos;ll have it ready when the
            break begins.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link className="btn" href="/menu">
              Browse menu <ArrowRight size={16} className="ml-2" />
            </Link>
            <span className="btn secondary cursor-default">
              {settings.accepting_orders ? "● Taking pre-orders" : "● Pre-orders closed"}
            </span>
          </div>
        </div>
        <div className="card aspect-square grid place-items-center relative overflow-hidden">
          <Coffee className="doodle w-2/3 h-2/3 rotate-[-12deg]" strokeWidth={1} />
          <span className="absolute bottom-8 display text-3xl">Off Shift Cafe</span>
        </div>
      </section>
      <section className="py-12">
        <div className="flex justify-between items-end">
          <div>
            <p className="eyebrow">The favourites</p>
            <h2 className="display text-5xl mt-2">Pick your pour</h2>
          </div>
          <Link className="text-primary font-bold text-sm" href="/menu">
            Full menu →
          </Link>
        </div>
        <div className="grid gap-3 mt-7 sm:grid-cols-3">
          {products
            .filter((item) => item.is_available)
            .slice(0, 3)
            .map((product) => (
              <Link
                key={product.id}
                href="/menu"
                className="card p-5 hover:bg-[var(--color-secondary)]"
              >
                <p className="eyebrow">{product.category?.name}</p>
                <h3 className="display text-3xl mt-2">{product.name}</h3>
                <p className="mt-6 font-bold">{formatPeso(product.price_centavos)}</p>
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
