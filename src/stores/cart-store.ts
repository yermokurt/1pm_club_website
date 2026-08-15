"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Addon, CartLine, Product } from "@/types/domain";

interface CartState {
  lines: CartLine[];
  add: (product: Product, addons: Addon[], quantity: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}
const makeId = () =>
  typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, addons, quantity) =>
        set((state) => ({
          lines: [...state.lines, { lineId: makeId(), product, addons, quantity }],
        })),
      setQuantity: (lineId, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((line) => (line.lineId === lineId ? { ...line, quantity } : line))
            .filter((line) => line.quantity > 0),
        })),
      remove: (lineId) =>
        set((state) => ({ lines: state.lines.filter((line) => line.lineId !== lineId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "1pm-cart", partialize: (state) => ({ lines: state.lines }) },
  ),
);
export const cartCupCount = (lines: CartLine[]) =>
  lines.reduce((total, line) => total + line.quantity, 0);
export const cartTotal = (lines: CartLine[]) =>
  lines.reduce(
    (total, line) =>
      total +
      (line.product.price_centavos +
        line.addons.reduce((sum, addon) => sum + addon.price_centavos, 0)) *
        line.quantity,
    0,
  );
