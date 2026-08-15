"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/menu", "Menu"],
  ["/admin/addons", "Add-ons"],
  ["/admin/analytics", "Analytics"],
  ["/admin/reports", "Reports"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 items-end" aria-label="Admin navigation">
      {links.map(([href, label]) => (
        <Link
          className={`border border-[var(--color-border)] px-3 py-2 text-xs font-bold uppercase ${pathname === href ? "bg-primary text-white" : "text-primary"}`}
          href={href}
          key={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
