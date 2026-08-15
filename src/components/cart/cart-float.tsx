"use client";
import Link from "next/link";
import { cartCupCount, cartTotal, useCartStore } from "@/stores/cart-store";
import { formatPeso } from "@/lib/currency";
export function CartFloat() {
  const lines = useCartStore((state) => state.lines);
  const cups = cartCupCount(lines);
  if (!cups) return null;
  return (
    <Link className="cart-float" href="/cart">
      <span>
        {cups} {cups === 1 ? "cup" : "cups"} · {formatPeso(cartTotal(lines))}
      </span>
      <span className="text-xs uppercase tracking-widest">View order →</span>
    </Link>
  );
}
