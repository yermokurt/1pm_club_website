"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
export function OrderRealtime({ customerId }: { customerId: string }) {
  const router = useRouter();
  useEffect(() => {
    const channel = createClient()
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
    return () => {
      void createClient().removeChannel(channel);
    };
  }, [customerId, router]);
  return null;
}
