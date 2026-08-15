import Link from "next/link";
export default function OfflinePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Offline</p>
      <h1 className="display text-5xl mt-3">You&apos;re offline.</h1>
      <p className="max-w-xl mt-4 text-[var(--color-muted)]">
        You can continue browsing previously loaded menu content and reviewing your cart, but
        reconnect before submitting a pre-order.
      </p>
      <Link className="btn mt-8" href="/menu">
        View menu
      </Link>
    </main>
  );
}
