"use client";
import Link from "next/link";
import { Coffee, Home, Package, ShoppingBag, UserRound, Palette, Settings } from "lucide-react";
import { useTheme } from "./theme-provider";
import { CartFloat } from "@/components/cart/cart-float";
import { ThemedLogo } from "./themed-logo";
import { cartCupCount, useCartStore } from "@/stores/cart-store";
import { createClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/profile", label: "Profile", icon: UserRound },
];
export function Navigation() {
  const { theme, toggle } = useTheme();
  const cups = useCartStore((state) => cartCupCount(state.lines));
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const loadRole = async () => {
      const client = createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return;
      const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin((data as { role?: string } | null)?.role === "admin");
    };
    void loadRole();
  }, []);
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" aria-label="The 1PM Club home">
            <ThemedLogo className="logo" width={300} height={134} priority />
          </Link>
          <nav className="nav-links" aria-label="Primary navigation">
            {links.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            {isAdmin && <Link href="/admin">Admin</Link>}
            <Link
              href="/cart"
              aria-label={`View cart${cups ? `, ${cups} cups` : ""}`}
              className="relative"
            >
              <ShoppingBag size={19} />
              {cups > 0 && (
                <span className="absolute -right-2 -top-2 grid min-w-4 h-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none text-[var(--color-background)]">
                  {cups > 99 ? "99+" : cups}
                </span>
              )}
            </Link>
            <button
              aria-label={`Switch to ${theme === "blue" ? "purple" : theme === "purple" ? "black and white" : "blue"} theme`}
              onClick={toggle}
              className="p-2 text-primary"
            >
              <Palette size={19} />
            </button>
          </nav>
        </div>
      </header>
      <CartFloat />
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="relative">
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin">
            <Settings size={18} />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
