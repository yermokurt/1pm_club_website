import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker-registration";

const gulfs = localFont({
  src: "../../public/gulfs-display-normal.ttf",
  variable: "--font-gulfs",
  display: "swap",
});
export const metadata: Metadata = {
  title: "The 1PM Club",
  description: "Office café pre-orders",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/images/logo.png" },
};
export const viewport: Viewport = { themeColor: "#0224CC" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={gulfs.variable}>
        <ThemeProvider>
          <Navigation />
          {children}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
