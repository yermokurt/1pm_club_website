"use client";
import Link from "next/link";
import {
  Bell,
  Coffee,
  Home,
  Package,
  ShoppingBag,
  UserRound,
  Palette,
  Settings,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { CartFloat } from "@/components/cart/cart-float";
import { ThemedLogo } from "./themed-logo";
import { cartCupCount, useCartStore } from "@/stores/cart-store";
import { createClient } from "@/lib/supabase/browser";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/profile", label: "Profile", icon: UserRound },
];
export function Navigation() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const cups = useCartStore((state) => cartCupCount(state.lines));
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => {
    const loadRole = async () => {
      const client = createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return;
      setProfileId(user.id);
      const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin((data as { role?: string } | null)?.role === "admin");
    };
    void loadRole();
  }, []);
  useEffect(() => {
    const routes = ["/menu", "/orders", "/profile", "/cart", ...(isAdmin ? ["/admin"] : [])];
    const timer = window.setTimeout(() => routes.forEach((route) => router.prefetch(route)), 700);
    return () => window.clearTimeout(timer);
  }, [isAdmin, router]);
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" aria-label="The 1PM Club home">
            <ThemedLogo className="logo" width={300} height={134} priority />
          </Link>
          <nav className="nav-links" aria-label="Primary navigation">
            {links.map(({ href, label }) => (
              <span className="contents" key={href}>
                {label === "Profile" && isAdmin && <Link href="/admin">Admin</Link>}
                <Link href={href}>{label}</Link>
              </span>
            ))}
            {profileId && <NotificationBell profileId={profileId} />}
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
      {(pathname === "/" || pathname === "/menu") && <CartFloat />}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <span className="contents" key={href}>
            {label === "Profile" && isAdmin && (
              <Link href="/admin">
                <Settings size={18} />
                <span>Admin</span>
              </Link>
            )}
            <Link href={href} className="relative">
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          </span>
        ))}
      </nav>
    </>
  );
}

type Notification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
};

function NotificationBell({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const refreshNotifications = useCallback(async () => {
    const { data } = await createClient()
      .from("notifications")
      .select("id,title,body,read_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);
    setNotifications((data ?? []) as Notification[]);
  }, [profileId]);
  useEffect(() => {
    const client = createClient();
    void refreshNotifications();
    const channel = client
      .channel(`nav-notifications-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (event) =>
          setNotifications((current) => [event.new as Notification, ...current].slice(0, 5)),
      )
      .subscribe();
    return () => void client.removeChannel(channel);
  }, [profileId, refreshNotifications]);
  const unread = notifications.filter((notification) => !notification.read_at).length;
  const markAllRead = async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.read_at)
      .map(({ id }) => id);
    if (!unreadIds.length) return;
    await createClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read_at: new Date().toISOString() })),
    );
  };
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative p-2 text-primary"
        onClick={() => {
          setOpen((value) => !value);
          void refreshNotifications();
        }}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none text-[var(--color-background)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 border border-[var(--color-border)] bg-[var(--color-field)] p-3 shadow-[4px_4px_0_var(--color-border)]">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm uppercase">Notifications</strong>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-bold text-primary"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {notifications.length ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border border-[var(--color-border)] p-3 text-sm ${notification.read_at ? "opacity-60" : "bg-[var(--color-surface)]"}`}
                >
                  <strong className="block">{notification.title}</strong>
                  <span className="mt-1 block text-[var(--color-muted)]">{notification.body}</span>
                </div>
              ))
            ) : (
              <p className="p-3 text-sm text-[var(--color-muted)]">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
