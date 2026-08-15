"use client";
import Image from "next/image";
import { useTheme } from "./theme-provider";

export function ThemedLogo({
  className,
  width,
  height,
  priority = false,
}: {
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
}) {
  const { theme } = useTheme();
  const src =
    theme === "mono"
      ? "/images/whitelogo.png"
      : theme === "purple"
        ? "/images/switchlogo.png"
        : "/images/logo.png";
  return (
    <Image
      className={className}
      src={src}
      alt="The 1PM Club"
      width={width}
      height={height}
      priority={priority}
      unoptimized
    />
  );
}
