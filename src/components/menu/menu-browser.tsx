"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Minus } from "lucide-react";
import Image from "next/image";
import type { Addon, Product } from "@/types/domain";
import { formatPeso } from "@/lib/currency";
import { useCartStore } from "@/stores/cart-store";

export function MenuBrowser({ products, addons }: { products: Product[]; addons: Addon[] }) {
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const normalizeSearch = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = useMemo(
    () =>
      products.filter((product) => {
        const category = product.category?.name ?? "";
        return (
          (filter === "all" || normalizeSearch(category) === filter) &&
          normalizeSearch(`${product.name} ${category}`).includes(normalizeSearch(term))
        );
      }),
    [products, term, filter],
  );
  return (
    <>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none"
          size={20}
        />
        <input
          className="field !pl-11"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search drinks..."
          aria-label="Search drinks"
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {[
          { value: "all", label: "All" },
          { value: "coffee", label: "Coffee" },
          { value: "matcha", label: "Matcha" },
          { value: "hojicha", label: "Hōjicha" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`border px-4 py-2 text-xs font-bold uppercase ${filter === value ? "bg-primary text-white border-primary" : "border-[var(--color-border)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <article key={product.id} className="card p-5 flex flex-col min-h-44">
            {product.image_url && (
              <Image
                className="mb-4 aspect-square w-full object-cover border border-[var(--color-border)]"
                src={product.image_url}
                alt=""
                width={400}
                height={400}
                unoptimized
              />
            )}
            <p className="eyebrow">{product.category?.name}</p>
            <h2 className="display text-3xl mt-2 leading-none">{product.name}</h2>
            {product.description && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">{product.description}</p>
            )}
            <div className="mt-auto pt-5 flex justify-between items-end">
              <strong>{formatPeso(product.price_centavos)}</strong>
              {product.is_available ? (
                <button onClick={() => setSelected(product)} className="btn !min-h-9 !px-3">
                  <Plus size={16} /> Add
                </button>
              ) : (
                <span className="text-xs font-bold text-[var(--color-danger)] uppercase">
                  Sold out
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="card p-10 text-center mt-7">
          <p className="display text-3xl">Nothing brewing here.</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Try a different drink or category.
          </p>
        </div>
      )}
      {selected && (
        <ProductDialog product={selected} addons={addons} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
function ProductDialog({
  product,
  addons,
  onClose,
}: {
  product: Product;
  addons: Addon[];
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const add = useCartStore((state) => state.add);
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
  const active = addons.filter((addon) => addon.is_available);
  const addOnTotal = active
    .filter((addon) => chosen.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price_centavos, 0);
  const addItem = () => {
    add(
      product,
      active.filter((addon) => chosen.includes(addon.id)),
      quantity,
    );
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-40 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drink-title"
    >
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-auto bg-paper border-2 border-[var(--color-border)] p-6 sm:p-8">
        <div className="flex justify-between">
          <div>
            <p className="eyebrow">Customize</p>
            <h2 id="drink-title" className="display text-4xl mt-1">
              {product.name}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close customization">
            <X />
          </button>
        </div>
        <p className="mt-2 font-bold">{formatPeso(product.price_centavos)}</p>
        {product.image_url && (
          <Image
            className="mx-auto mt-5 aspect-square w-full max-w-xs object-cover border border-[var(--color-border)]"
            src={product.image_url}
            alt=""
            width={400}
            height={400}
            unoptimized
          />
        )}
        {product.description && (
          <p className="mt-4 text-sm text-[var(--color-muted)]">{product.description}</p>
        )}
        <fieldset className="mt-7">
          <legend className="eyebrow mb-3">Boost your drink</legend>
          {active.map((addon) => (
            <label
              key={addon.id}
              className="flex items-center gap-3 py-3 border-t border-[var(--color-border)] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={chosen.includes(addon.id)}
                onChange={() =>
                  setChosen((items) =>
                    items.includes(addon.id)
                      ? items.filter((id) => id !== addon.id)
                      : [...items, addon.id],
                  )
                }
              />
              <span className="flex-1 font-medium">{addon.name}</span>
              <span>+{formatPeso(addon.price_centavos)}</span>
            </label>
          ))}
        </fieldset>
        <div className="mt-7 flex items-center justify-between">
          <span className="eyebrow">Quantity</span>
          <div className="flex items-center border border-[var(--color-border)]">
            <button
              className="p-3"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-9 text-center font-bold">{quantity}</span>
            <button
              className="p-3"
              onClick={() => setQuantity((value) => Math.min(15, value + 1))}
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="mt-7 pt-4 border-t border-[var(--color-border)] flex justify-between items-center">
          <span className="eyebrow">Total</span>
          <strong className="text-2xl">
            {formatPeso((product.price_centavos + addOnTotal) * quantity)}
          </strong>
        </div>
        <button onClick={addItem} className="btn w-full mt-5">
          Add to order
        </button>
      </div>
    </div>
  );
}
