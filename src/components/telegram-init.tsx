"use client";

import { useEffect } from "react";

/**
 * Telegram Mini App integration, loaded only when the page is actually inside
 * Telegram.
 *
 * The SDK used to sit in `<head>` as a `beforeInteractive` script, which meant
 * every page load — overwhelmingly ordinary desktop browsers — waited on a
 * request to telegram.org for a feature it would never use, and logged a
 * console error whenever that host was unreachable. Telegram announces itself
 * clearly enough that the script can be fetched only when it is wanted: the
 * webview exposes `TelegramWebviewProxy`, and a Mini App is always opened with
 * `tgWebApp*` parameters in the URL.
 */
function launchedByTelegram(): boolean {
  if (typeof window === "undefined") return false;
  const scope = window as unknown as {
    TelegramWebviewProxy?: unknown;
    Telegram?: { WebApp?: unknown };
  };
  if (scope.TelegramWebviewProxy || scope.Telegram?.WebApp) return true;
  const url = `${window.location.search}${window.location.hash}`;
  return url.includes("tgWebApp");
}

interface WebApp {
  ready: () => void;
  expand: () => void;
}

export function TelegramInit() {
  useEffect(() => {
    if (!launchedByTelegram()) return;

    const start = () => {
      const app = (window as unknown as { Telegram?: { WebApp?: WebApp } })
        .Telegram?.WebApp;
      if (!app) return false;
      // Telegram keeps its loading placeholder up until the page says it is
      // ready; without this the Mini App opens on a robot animation.
      app.ready();
      app.expand();
      return true;
    };

    if (start()) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => start();
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  return null;
}
