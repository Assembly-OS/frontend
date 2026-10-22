"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon, type IconName } from "@/components/icons";
import { Badge } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import type { KnowledgeStatus } from "@/lib/knowledge";

const TONE: Record<KnowledgeStatus, { className: string; icon: IconName }> = {
  READY: {
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
    icon: "check",
  },
  PARTIAL: {
    className:
      "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
    icon: "alert",
  },
  READING: {
    className:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30",
    icon: "clock",
  },
  FAILED: {
    className:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
    icon: "alert",
  },
};

/** Whether the AI can use a document — in words and an icon, not colour alone. */
export function StatusBadge({ status }: { status: KnowledgeStatus }) {
  const t = useT();
  const tone = TONE[status];
  return (
    <Badge className={`shrink-0 whitespace-nowrap ${tone.className}`}>
      <Icon name={tone.icon} className="mr-1 size-3" />
      {t(`knowledge.status.${status}` as MessageKey)}
    </Badge>
  );
}

/**
 * A document is read on the server after the upload has been answered. While
 * one is still being read, the page asks again every few seconds, so the
 * status turns to "available" in front of the person who uploaded it instead
 * of waiting for them to think of reloading.
 */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return null;
}
