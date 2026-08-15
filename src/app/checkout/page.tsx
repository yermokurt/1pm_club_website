import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export default async function CheckoutPage() {
  const [settings, supabase] = await Promise.all([getSettings(), createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let name = "";
  let email = user?.email ?? "";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("name,email")
      .eq("id", user.id)
      .maybeSingle();
    const profile = data as unknown as { name?: string; email?: string } | null;
    name = profile?.name ?? "";
    email = profile?.email ?? email;
  }
  return (
    <main className="shell">
      <p className="eyebrow">Almost there</p>
      <h1 className="display text-6xl mt-2">Checkout</h1>
      <p className="mt-4 text-[var(--color-muted)]">
        Choose a valid slot, scan the café QR and submit for approval.
      </p>
      <div className="mt-9">
        {settings.accepting_orders ? (
          <CheckoutForm settings={settings} initialName={name} initialEmail={email} />
        ) : (
          <div className="card p-8">
            <p className="display text-4xl">Pre-orders are closed.</p>
            <p className="mt-3 text-[var(--color-muted)]">
              The café is not accepting new orders right now. Please check back later.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
