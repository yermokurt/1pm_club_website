"use client";
import Link from "next/link";
import { useState } from "react";

export function GuestOrderActions({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
    setCopied(true);
  };
  return (
    <div className="flex flex-wrap gap-3 mt-6">
      <Link className="btn" href={href}>
        View order
      </Link>
      <button className="btn secondary" onClick={copy}>
        {copied ? "Link copied" : "Copy order link"}
      </button>
    </div>
  );
}
