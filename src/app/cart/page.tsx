import { CartPage } from "@/components/cart/cart-page";
export default function Page() {
  return (
    <main className="shell">
      <p className="eyebrow">Your pre-order</p>
      <h1 className="display text-6xl mt-2">Cart</h1>
      <div className="mt-9">
        <CartPage />
      </div>
    </main>
  );
}
