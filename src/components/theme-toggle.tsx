"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icons";

/**
 * The theme lives on <html data-theme>, written before paint by the boot script
 * in the root layout. This reads that DOM state instead of duplicating it in
 * React state, so there is no flash and no setState-in-effect.
 *
 * Its own file because two shells need it now — the sidebar one and the
 * full-screen chat one — and a second copy is a second place for the theme to
 * drift out of step with the document.
 */
const THEME_EVENT = "assambleya:theme";

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("assambleya-theme", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Theme"
      className="grid size-9 shrink-0 place-items-center rounded-xl border transition hover:bg-[var(--surface)]"
    >
      <Icon name={dark ? "sun" : "moon"} className="size-4" />
    </button>
  );
}
