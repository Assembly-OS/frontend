"use client";

import { useEffect } from "react";

/**
 * When the platform is opened as a Telegram Mini App, Telegram keeps its
 * loading placeholder (the robot) on screen until the page tells it the app is
 * ready. The SDK (telegram-web-app.js) is loaded in <head>; here we call
 * ready()/expand() once it is available. Outside Telegram this is a no-op.
 */
export function TelegramInit() {
  useEffect(() => {
    let tries = 0;
    const apply = () => {
      const tg = (
        window as unknown as { Telegram?: { WebApp?: {
          ready: () => void;
          expand: () => void;
          setHeaderColor?: (c: string) => void;
        } } }
      ).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        return true;
      }
      return false;
    };
    if (apply()) return;
    // The SDK script may still be loading; poll briefly, then give up.
    const timer = setInterval(() => {
      if (apply() || (tries += 1) > 40) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return null;
}
