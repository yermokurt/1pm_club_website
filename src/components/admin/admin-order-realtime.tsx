"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function AdminOrderRealtime() {
  const router = useRouter();
  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel("admin-order-queue")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () =>
        router.refresh(),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () =>
        router.refresh(),
      )
      .subscribe();
    // Fallback for instances where the orders table is not in the Realtime publication.
    const interval = window.setInterval(() => router.refresh(), 15_000);
    return () => {
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [router]);
  return null;
}
