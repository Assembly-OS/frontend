"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "./icons";
import { LocaleSwitcher } from "./locale-switcher";
import { useI18n } from "./i18n-provider";
import type { MessageKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: IconName;
  badge?: number;
  group?: MessageKey;
}

export interface ShellUser {
  full_name: string;
  login: string;
  roleLabel: string;
  departmentLabel: string | null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The theme lives on <html data-theme>, written before paint by the boot script
 * in the root layout. This reads that DOM state instead of duplicating it in
 * React state, so there is no flash and no setState-in-effect.
 */
const THEME_EVENT = "assambleya:theme";

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function ThemeToggle() {
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
      className="grid size-9 place-items-center rounded-xl border transition hover:bg-[var(--surface)]"
    >
      <Icon name={dark ? "sun" : "moon"} className="size-4" />
    </button>
  );
}

export function AppShell({
  nav,
  user,
  locale,
  children,
}: {
  nav: NavItem[];
  user: ShellUser;
  locale: Locale;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();

  // The drawer is remembered per route, so navigating anywhere closes it
  // without an effect that chases `pathname`.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);

  const groups: { group: MessageKey | null; items: NavItem[] }[] = [];
  for (const item of nav) {
    const key = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.group === key) last.items.push(item);
    else groups.push({ group: key, items: [item] });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-lg bg-gold-500 text-sm font-black text-navy-950">
          A
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold tracking-[0.16em]">
            {t("app.name")}
          </p>
          <p className="truncate text-[11px] text-white/50">{t("app.org")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto grid size-8 place-items-center rounded-lg text-white/70 lg:hidden"
          aria-label={t("action.close")}
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>

      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {groups.map((group, index) => (
          <div key={group.group ?? `g${index}`}>
            {group.group && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {t(group.group)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? "bg-white/12 font-semibold text-white"
                          : "text-white/65 hover:bg-white/6 hover:text-white"
                      }`}
                    >
                      <Icon name={item.icon} className="size-[18px] shrink-0" />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {!!item.badge && (
                        <span className="min-w-5 rounded-full bg-gold-500 px-1.5 text-center text-[11px] font-bold text-navy-950">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/6"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-700 text-xs font-bold">
            {initials(user.full_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">
              {user.full_name}
            </span>
            <span className="block truncate text-[11px] text-white/50">
              {user.roleLabel}
            </span>
          </span>
        </Link>
        <form action="/api/auth/logout" method="post" className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/6 hover:text-white"
          >
            <Icon name="logout" className="size-[18px]" />
            {t("nav.logout")}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[268px_1fr]">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        {sidebar}
      </aside>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[268px] lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-[var(--panel)]/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-9 shrink-0 place-items-center rounded-xl border lg:hidden"
            aria-label="Menu"
          >
            <Icon name="menu" className="size-4" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="muted truncate text-xs">
              @{user.login}
              {user.departmentLabel ? ` · ${user.departmentLabel}` : ""}
            </p>
          </div>

          <LocaleSwitcher current={locale} />
          <ThemeToggle />
        </header>

        <main className="min-w-0 max-w-full flex-1 overflow-x-clip px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
