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
const montserrat = localFont({
  src: [
    {
      path: "../../public/fonts/Montserrat-Variable.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-montserrat",
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
      <body className={`${gulfs.variable} ${montserrat.variable}`}>
        <ThemeProvider>
          <Navigation />
          {children}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
