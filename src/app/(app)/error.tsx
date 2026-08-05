"use client";

import { useEffect } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";

/**
 * Catches a thrown error in any protected page and offers a retry, instead of
 * dropping the user on a blank screen. Rendered inside the app layout, so the
 * shell (and i18n) stay in place. `reset` re-renders the failed segment.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // Surface it for logs; the digest links to the server-side stack in prod.
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-rose-500/12 text-rose-600 dark:text-rose-400">
        <Icon name="close" className="size-5" />
      </span>
      <p className="text-sm font-medium">{t("common.error")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 dark:bg-navy-600 dark:hover:bg-navy-500"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
