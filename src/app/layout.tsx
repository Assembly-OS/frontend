import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { TelegramInit } from "@/components/telegram-init";

export const metadata: Metadata = {
  title: "ASSAMBLEYA OS",
  description:
    "O'zbekiston Iqtisodiyot Assambleyasi — integratsiyalashgan raqamli boshqaruv tizimi",
};

export const viewport: Viewport = {
  themeColor: "#17171c",
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint: stamps the saved (or system) theme on <html> so the
// page never flashes the wrong palette and <ThemeToggle> can read it directly.
const THEME_BOOT = `try{var s=localStorage.getItem('assambleya-theme');document.documentElement.dataset.theme=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Telegram Mini App SDK — lets the page signal readiness so Telegram
            drops its loading placeholder. beforeInteractive = in <head>. */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <TelegramInit />
        {children}
      </body>
    </html>
  );
}
