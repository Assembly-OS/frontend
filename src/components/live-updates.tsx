"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "./i18n-provider";
import { Icon } from "./icons";
import {
  emitPresence,
  emitTyping,
  type PresenceEvent,
  type TypingEvent,
} from "./realtime-bus";
import type { Pulse } from "@/lib/queries";

/** How long the "new assignment" toast stays on screen. */
const TOAST_MS = 12000;

function changed(a: Pulse, b: Pulse) {
  return (
    a.taskRev !== b.taskRev ||
    a.orgRev !== b.orgRev ||
    a.msgRev !== b.msgRev ||
    a.incoming !== b.incoming ||
    a.inWork !== b.inWork ||
    a.onReview !== b.onReview ||
    a.unread !== b.unread
  );
}

/**
 * Keeps every page of the app live without a manual reload: the moment a head
 * hands out an assignment, the subordinate's inbox, dashboard counters and
 * sidebar badges re-render, and a toast announces the arrival.
 *
 * Mounted once in the app layout, so a single stream covers all routes. Server
 * components are re-rendered through `router.refresh()`, which keeps client
 * state (open forms, typed text) intact.
 */
export function LiveUpdates({ initial }: { initial: Pulse }) {
  const router = useRouter();
  const t = useT();

  // The last pulse this browser tab acted on. A ref, not state: it must not
  // reset when the layout re-renders after a refresh it triggered itself.
  const seen = useRef(initial);
  const [arrived, setArrived] = useState(0);

  useEffect(() => {
    // A single Server-Sent Events connection: the server pushes a fresh pulse
    // the instant a write touches this user — no interval, no delay. The
    // browser's EventSource transparently reconnects if the socket drops.
    const source = new EventSource("/api/stream");

    // Coalesce bursts: several events in quick succession (e.g. a manager
    // watching org-wide activity) collapse into one re-render instead of thrashing.
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 250);
    };

    source.addEventListener("pulse", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as Pulse;
      const before = seen.current;
      seen.current = next;

      if (next.incoming > before.incoming) {
        setArrived(next.incoming - before.incoming);
      }
      // The stream's opening frame is just a baseline; only push a refresh when
      // something genuinely moved (every later frame does, by construction).
      if (changed(before, next)) scheduleRefresh();
    });

    // Typing signals never hit the database, so they ride the stream separately
    // and are handed to whichever open thread cares via the in-tab bus.
    source.addEventListener("typing", (event) => {
      emitTyping(JSON.parse((event as MessageEvent).data) as TypingEvent);
    });

    // Presence (online / last-seen) changes for anyone, relayed to open threads.
    source.addEventListener("presence", (event) => {
      emitPresence(JSON.parse((event as MessageEvent).data) as PresenceEvent);
    });

    return () => {
      clearTimeout(refreshTimer);
      source.close();
    };
  }, [router]);

  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(() => setArrived(0), TOAST_MS);
    return () => clearTimeout(timer);
  }, [arrived]);

  if (!arrived) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise fixed bottom-4 right-4 z-50 w-[min(20rem,calc(100vw-2rem))]"
    >
      <div className="panel flex items-start gap-3 p-4 shadow-lg ring-1 ring-gold-500/40">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-500 text-navy-950">
          <Icon name="bell" className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {t("live.newTask")}
            {arrived > 1 && ` · ${arrived}`}
          </p>
          <p className="muted mt-0.5 text-xs">{t("live.newTaskHint")}</p>
          <Link
            href="/tasks/inbox"
            onClick={() => setArrived(0)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:underline dark:text-gold-400"
          >
            {t("live.open")}
            <Icon name="arrow" className="size-3.5" />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setArrived(0)}
          aria-label={t("action.close")}
          className="muted grid size-7 shrink-0 place-items-center rounded-lg transition hover:bg-[var(--surface)]"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
