"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartCupCount, cartTotal, useCartStore } from "@/stores/cart-store";
import { formatPeso } from "@/lib/currency";
export function CartPage() {
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  if (!lines.length)
    return (
      <div className="card p-10 text-center">
        <p className="display text-4xl">Your cup is waiting.</p>
        <p className="mt-3 text-[var(--color-muted)]">
          Choose a drink, make it yours, and it will appear here.
        </p>
        <Link className="btn mt-7" href="/menu">
          Browse menu
        </Link>
      </div>
    );
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
      <section className="space-y-3">
        {lines.map((line) => (
          <article key={line.lineId} className="card p-5 flex gap-4">
            <div className="flex-1">
              <p className="eyebrow">{line.product.category?.name}</p>
              <h2 className="product-name text-2xl mt-1">{line.product.name}</h2>
              {line.addons.length > 0 && (
                <p className="text-sm mt-2 text-[var(--color-muted)]">
                  + {line.addons.map((addon) => addon.name).join(", ")}
                </p>
              )}
              <p className="font-bold mt-3">
                {formatPeso(
                  (line.product.price_centavos +
                    line.addons.reduce((sum, addon) => sum + addon.price_centavos, 0)) *
                    line.quantity,
                )}
              </p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button
                onClick={() => remove(line.lineId)}
                aria-label={`Remove ${line.product.name}`}
                className="text-[var(--color-danger)]"
              >
                <Trash2 size={18} />
              </button>
              <div className="flex border border-[var(--color-border)]">
                <button
                  className="p-2"
                  onClick={() => setQuantity(line.lineId, line.quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 grid place-items-center font-bold">{line.quantity}</span>
                <button
                  className="p-2"
                  onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <aside className="card p-6 h-fit">
        <p className="eyebrow">Order total</p>
        <div className="flex justify-between mt-5">
          <span>{cartCupCount(lines)} cups</span>
          <strong>{formatPeso(cartTotal(lines))}</strong>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-5">
          Payment is made by scanning the café QR at checkout.
        </p>
        <Link className="btn w-full mt-6" href="/checkout">
          Continue to checkout
        </Link>
      </aside>
    </div>
  );
}
