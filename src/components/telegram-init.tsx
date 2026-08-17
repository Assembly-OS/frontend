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
export function launchedByTelegram(): boolean {
  if (typeof window === "undefined") return false;
  const scope = window as unknown as {
    TelegramWebviewProxy?: unknown;
    Telegram?: { WebApp?: unknown };
  };
  if (scope.TelegramWebviewProxy || scope.Telegram?.WebApp) return true;
  const url = `${window.location.search}${window.location.hash}`;
  return url.includes("tgWebApp");
}

export interface WebApp {
  initData: string;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
}

function webApp(): WebApp | null {
  return (
    (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp ??
    null
  );
}

/** Resolves once the SDK is available, or with null outside Telegram. */
export function loadTelegram(): Promise<WebApp | null> {
  if (!launchedByTelegram()) return Promise.resolve(null);

  const existing = webApp();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    // Reuse the tag if something else already started the fetch, so two
    // callers on one page do not load the SDK twice.
    const url = "https://telegram.org/js/telegram-web-app.js";
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`,
    );
    if (!script) {
      script = document.createElement("script");
      script.src = url;
      script.async = true;
      document.head.appendChild(script);
    }
    // A dead network must not leave the caller waiting forever — outside
    // Telegram's reach the page still has to render its own login form.
    const done = (value: WebApp | null) => resolve(value);
    const timer = setTimeout(() => done(webApp()), 4000);
    script.addEventListener("load", () => {
      clearTimeout(timer);
      done(webApp());
    });
    script.addEventListener("error", () => {
      clearTimeout(timer);
      done(null);
    });
  });
}

export function TelegramInit() {
  useEffect(() => {
    let cancelled = false;
    void loadTelegram().then((app) => {
      if (cancelled || !app) return;
      // Telegram keeps its loading placeholder up until the page says it is
      // ready; without this the Mini App opens on a robot animation.
      app.ready();
      app.expand();
      // Follow the theme the reader chose in Telegram rather than the one
      // this platform last stored on another device. Inside the Mini App the
      // surrounding chrome is Telegram's, and a light page framed in a dark
      // client reads as a broken embed.
      const scheme = app.colorScheme;
      if (scheme === "dark" || scheme === "light") {
        document.documentElement.dataset.theme = scheme;
        window.dispatchEvent(new Event("assambleya:theme"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
