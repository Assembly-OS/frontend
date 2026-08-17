"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon, type IconName } from "@/components/icons";
import { Button, EmptyState, FIELD, PageHeader, Panel } from "@/components/ui";

interface Ref {
  kind: "company" | "meeting" | "agreement" | "task" | "person";
  id: number;
  label: string;
  href: string;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  refs?: Ref[];
  failed?: boolean;
  /** The question to re-send, on failures where a retry can succeed. */
  retry?: string;
}

const REF_ICON: Record<Ref["kind"], IconName> = {
  company: "grid",
  meeting: "calendar",
  agreement: "check",
  task: "inbox",
  person: "user",
};

/** Questions worth one tap — and a demonstration of what it can be asked. */
const SUGGESTIONS = [
  "assistant.q1",
  "assistant.q2",
  "assistant.q3",
  "assistant.q4",
] as const;

export function AssistantClient({
  llmConfigured,
  initial,
}: {
  llmConfigured: boolean;
  /** The conversation as the server has it — what a refresh comes back to. */
  initial: Turn[];
}) {
  const t = useT();
  const [turns, setTurns] = useState<Turn[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only once there is something to scroll to — otherwise the empty state
    // is yanked out of view the moment the page opens.
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;

    // A failed exchange is dropped before the retry, so a second attempt does
    // not sit under the error message from the first.
    setTurns((current) => [
      ...current.filter((turn) => !turn.failed),
      { role: "user", content: text },
    ]);
    setDraft("");
    setBusy(true);

    try {
      // No history in the body: the server keeps the conversation and reads
      // its own record, so two open tabs cannot disagree about what was said.
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = (await response.json()) as {
        answer?: string;
        refs?: Ref[];
        error?: string;
      };

      if (!response.ok || !data.answer) {
        setTurns((current) => [
          ...current,
          {
            role: "assistant",
            failed: true,
            // Each of these tells the reader something different about what
            // to do next, which is the whole reason they are separate.
            content:
              data.error === "RATE_LIMIT"
                ? t("assistant.tooFast")
                : data.error === "TOO_COMPLEX"
                  ? t("assistant.tooComplex")
                  : data.error === "REFUSED"
                    ? t("assistant.refused")
                    : data.error === "NO_KEY"
                      ? t("agent.llmOff")
                      : t("assistant.failed"),
            // Only worth offering where trying again can plausibly work. A
            // refusal and a missing key will fail again identically.
            retry:
              data.error !== "REFUSED" && data.error !== "NO_KEY" ? text : undefined,
          },
        ]);
        return;
      }

      setTurns((current) => [
        ...current,
        { role: "assistant", content: data.answer!, refs: data.refs ?? [] },
      ]);
    } catch {
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          failed: true,
          content: t("assistant.failed"),
          retry: text,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setTurns([]);
    setConfirmClear(false);
    try {
      await fetch("/api/ai/assistant", { method: "DELETE" });
    } catch {
      /* cleared on screen; the next load will show what actually remains */
    }
  }

  return (
    <>
      <PageHeader
        title={t("assistant.title")}
        description={t("assistant.desc")}
        action={
          turns.length > 0 ? (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={() => void clear()}>
                  {t("assistant.clearConfirm")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                >
                  {t("action.cancel")}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={() => setConfirmClear(true)}
              >
                {t("assistant.clear")}
              </Button>
            )
          ) : undefined
        }
      />

      {!llmConfigured && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t("agent.llmOff")}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel>
          <div className="scroll-thin max-h-[calc(100dvh-19rem)] min-h-[18rem] overflow-y-auto p-5">
            {turns.length === 0 ? (
              <EmptyState
                bare
                icon="shield"
                text={t("assistant.empty")}
                hint={t("assistant.emptyHint")}
              />
            ) : (
              <ul className="space-y-5">
                {turns.map((turn, index) => (
                  <li key={index}>
                    {turn.role === "user" ? (
                      <div className="flex justify-end">
                        <p className="max-w-[85%] rounded-2xl rounded-br bg-navy-900 px-4 py-2.5 text-sm text-white dark:bg-navy-600">
                          {turn.content}
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-[92%]">
                        <p
                          className={`whitespace-pre-wrap text-sm leading-relaxed ${
                            turn.failed ? "text-rose-600 dark:text-rose-400" : ""
                          }`}
                        >
                          {turn.content}
                        </p>
                        {turn.retry && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void ask(turn.retry!)}
                            className="mt-2 rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--surface)] disabled:opacity-50"
                          >
                            {t("common.retry")}
                          </button>
                        )}
                        {turn.refs && turn.refs.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {turn.refs.map((ref) => (
                              <Link
                                key={`${ref.kind}-${ref.id}`}
                                href={ref.href}
                                className="muted inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                              >
                                <Icon
                                  name={REF_ICON[ref.kind]}
                                  className="size-3 shrink-0"
                                />
                                <span className="truncate">{ref.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {busy && (
                  <li className="muted flex items-center gap-2 text-sm">
                    <span className="size-1.5 animate-pulse rounded-full bg-current" />
                    {t("assistant.thinking")}
                  </li>
                )}
              </ul>
            )}
            <div ref={endRef} />
          </div>

          {/* On a phone the examples ride just above the box you type in, as
              one scrollable row. As a column in a panel underneath they cost a
              whole screen of height for four lines nobody scrolls to — and the
              chat itself is the thing that should own the screen. */}
          <div className="scroll-thin flex gap-2 overflow-x-auto border-t px-4 py-2.5 xl:hidden">
            {SUGGESTIONS.map((key) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => void ask(t(key))}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs transition hover:bg-[var(--surface)] disabled:opacity-50"
              >
                {t(key)}
              </button>
            ))}
          </div>

          <form
            className="flex items-end gap-2 border-t p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter breaks the line — the convention
                // every chat the reader already uses follows.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
              rows={1}
              placeholder={t("assistant.placeholder")}
              className={`${FIELD} max-h-32 resize-y`}
            />
            <Button
              type="submit"
              icon="send"
              disabled={busy || !draft.trim()}
              aria-label={t("assistant.send")}
            />
          </form>
        </Panel>

        <Panel title={t("assistant.examples")} className="hidden xl:block">
          <ul className="divide-y">
            {SUGGESTIONS.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(t(key))}
                  className="w-full px-5 py-3 text-left text-xs transition hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
          <p className="muted flex items-start gap-2 border-t bg-[var(--surface)] px-5 py-3 text-[11px]">
            <Icon name="shield" className="mt-px size-3 shrink-0" aria-hidden />
            <span>{t("assistant.scope")}</span>
          </p>
        </Panel>
      </div>
    </>
  );
}
