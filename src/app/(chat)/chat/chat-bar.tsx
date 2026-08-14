"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/lib/types";

/**
 * The one row above the conversation.
 *
 * It carries the way out — the sidebar is gone, so without this there is none
 * — and the three controls that would otherwise be lost with the app header:
 * the bell, the language and the theme. Someone who spends an hour in here
 * should not have to leave to find out a deadline fired.
 *
 * On a phone inside a thread it hides itself. The thread has its own header
 * with a back arrow to the list, and two back buttons pointing to two
 * different places, one above the other, is a way to teach people not to
 * trust either.
 */
export function ChatBar({ locale }: { locale: Locale }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const inThread = pathname !== "/chat";

  return (
    <header
      className={`${
        inThread ? "hidden lg:flex" : "flex"
      } shrink-0 items-center gap-2 border-b bg-[var(--panel)] px-3 py-2.5 sm:gap-3 sm:px-4`}
    >
      <Link
        href="/dashboard"
        // The word is dropped on a narrow screen but the label is not: without
        // it this becomes an arrow with no accessible name, which is the only
        // way out of a screen that has no navigation of its own.
        aria-label={t("common.back")}
        className="flex h-10 shrink-0 items-center gap-2 rounded-xl border px-2.5 text-sm font-medium transition hover:bg-[var(--surface)]"
      >
        <Icon name="arrow" className="size-4 rotate-180" aria-hidden />
        <span className="hidden sm:inline">{t("common.back")}</span>
      </Link>

      <p className="min-w-0 flex-1 truncate text-sm font-semibold">
        {t("chat.title")}
      </p>

      <NotificationBell />
      <span className="hidden sm:block">
        <LocaleSwitcher current={locale} />
      </span>
      <ThemeToggle />
    </header>
  );
}
