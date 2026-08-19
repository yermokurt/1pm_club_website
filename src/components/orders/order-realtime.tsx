"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
export function OrderRealtime({ customerId }: { customerId: string }) {
  const router = useRouter();
  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel(`customer-orders-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${customerId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    // Realtime provides instant updates when enabled in Supabase. Polling is a
    // dependable fallback for local testing or projects without replication enabled.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => {
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [customerId, router]);
  return null;
}
