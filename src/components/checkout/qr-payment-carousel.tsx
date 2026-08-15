"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const qrCodes = [
  { src: "/payment%20qr/gacsh.png", label: "GCash" },
  { src: "/payment%20qr/gotyme.png", label: "GoTyme" },
  { src: "/payment%20qr/maribank.png", label: "MariBank" },
];

export function QrPaymentCarousel() {
  const [active, setActive] = useState(0);
  const current = qrCodes[active]!;
  const move = (direction: number) =>
    setActive((value) => (value + direction + qrCodes.length) % qrCodes.length);
  return (
    <div className="mt-5">
      <div className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[4px_4px_0_var(--color-border)]">
        <Image
          className="aspect-square w-full object-contain"
          src={current.src}
          alt={`${current.label} payment QR code`}
          width={520}
          height={520}
        />
        <button
          className="absolute left-5 top-1/2 -translate-y-1/2 border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-primary"
          type="button"
          aria-label="Previous QR code"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="absolute right-5 top-1/2 -translate-y-1/2 border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-primary"
          type="button"
          aria-label="Next QR code"
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <strong className="text-sm">{current.label}</strong>
        <div className="flex gap-2" aria-label="QR payment options">
          {qrCodes.map((code, index) => (
            <button
              className={`h-2.5 w-2.5 rounded-full border border-[var(--color-border)] ${index === active ? "bg-primary" : "bg-transparent"}`}
              key={code.label}
              type="button"
              aria-label={`Show ${code.label} QR code`}
              aria-current={index === active}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
