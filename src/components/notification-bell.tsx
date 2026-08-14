"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./i18n-provider";
import { Icon, type IconName } from "./icons";
import { formatChatTime } from "@/lib/format";

interface Item {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
}

const KIND_ICON: Record<string, IconName> = {
  task: "inbox",
  reminder: "clock",
  agreement: "check",
  review: "shield",
  meeting: "calendar",
};

/** How often the bell asks. Slow on purpose — see the comment in `poll`. */
const POLL_MS = 60_000;

export function NotificationBell() {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const response = await fetch("/api/notifications");
        if (!response.ok) return;
        const data = (await response.json()) as {
          unread: number;
          notifications: Item[];
        };
        if (!alive) return;
        setUnread(data.unread);
        setItems(data.notifications);
      } catch {
        /* offline; the next tick tries again */
      }
    }

    void poll();
    // A minute, not a second: this request also runs the reminder sweep, and
    // nothing here is urgent to the second. The Mini App runs on a phone
    // network where a chattier poll costs battery for no gain.
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Click-away and Escape, so the panel behaves like every other popover the
  // reader has used.
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function read(id?: number) {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      const data = (await response.json()) as { unread?: number };
      setUnread(data.unread ?? 0);
      setItems((current) =>
        current.map((item) =>
          !id || item.id === id
            ? { ...item, read_at: item.read_at ?? new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      /* the next poll corrects the count */
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("notify.title")}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-xl border transition hover:bg-[var(--surface)]"
      >
        <Icon name="bell" className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold tabular-nums text-navy-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="panel absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
            <p className="text-sm font-semibold">{t("notify.title")}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void read()}
                className="muted text-xs font-medium hover:underline"
              >
                {t("notify.readAll")}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="muted px-4 py-8 text-center text-sm">
              {t("notify.empty")}
            </p>
          ) : (
            <ul className="scroll-thin max-h-[60vh] divide-y overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      void read(item.id);
                      setOpen(false);
                      router.refresh();
                    }}
                    className={`flex gap-3 px-4 py-3 transition hover:bg-[var(--surface)] ${
                      item.read_at ? "opacity-60" : ""
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                        item.read_at
                          ? "muted"
                          : "text-navy-700 dark:text-navy-200"
                      }`}
                      aria-hidden
                    >
                      <Icon
                        name={KIND_ICON[item.kind] ?? "bell"}
                        className="size-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      {item.body && (
                        <span className="muted block truncate text-xs">
                          {item.body}
                        </span>
                      )}
                      <span className="muted mt-0.5 block text-[11px]">
                        {formatChatTime(item.created_at)}
                      </span>
                    </span>
                    {!item.read_at && (
                      <span
                        aria-hidden
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
