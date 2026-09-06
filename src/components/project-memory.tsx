"use client";

import { useState } from "react";
import { useT } from "./i18n-provider";
import { Button, FIELD, Panel } from "./ui";
import { Icon } from "./icons";
import { formatDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";

interface Found {
  id: number;
  thread_id: number;
  thread_title: string;
  body: string;
  occurred_on: string | null;
  created_at: string;
  author_full_name: string;
}

interface Source {
  entryId: number;
  threadId: number;
  threadTitle: string;
  day: string;
  excerpt: string;
}

interface Answer {
  answer: string;
  found: boolean;
  sources: Source[];
  truncated: boolean;
}

/**
 * Asking the project what it remembers.
 *
 * One box and two verbs, because the two ways of finding something fail in
 * opposite directions and a person usually knows which one they need. Search
 * is instant, free and literal — right when you remember a word. Ask reads
 * every record and answers in sentences — right when you remember a question
 * but not a word.
 *
 * The answer always arrives with the records it rests on, and those records
 * are links. That is the whole difference between this and a chatbot: an
 * answer you can click through to the sentence somebody actually wrote is
 * checkable, and one you cannot is a claim.
 */
export function ProjectMemory({
  projectId,
  threadId,
  scopeLabel,
}: {
  projectId: number;
  /** Present on a chat page: narrows every question to that one history. */
  threadId?: number;
  scopeLabel: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"search" | "ask" | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");

  function clear() {
    setFound(null);
    setAnswer(null);
    setError("");
  }

  async function search() {
    if (!query.trim()) return;
    clear();
    setBusy("search");
    try {
      const url = new URL(
        `/api/projects/${projectId}/search`,
        window.location.origin,
      );
      url.searchParams.set("q", query.trim());
      if (threadId) url.searchParams.set("threadId", String(threadId));
      const response = await fetch(url);
      if (!response.ok) throw new Error("search");
      setFound((await response.json()) as Found[]);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  async function ask() {
    if (!query.trim()) return;
    clear();
    setBusy("ask");
    try {
      const response = await fetch(`/api/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query.trim(), threadId }),
      });
      const data = (await response.json()) as Answer & { error?: string };
      if (data.error) {
        // NO_KEY and EMPTY are states, not failures: say what they mean
        // rather than showing a red box the reader cannot act on.
        setError(t(`memory.${data.error}` as MessageKey));
        return;
      }
      if (!response.ok) throw new Error("ask");
      setAnswer(data);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel>
      <div className="p-4 sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
        >
          <label htmlFor="memory-q" className="sr-only">
            {t("memory.placeholder")}
          </label>
          <input
            id="memory-q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("memory.placeholder")}
            className={FIELD}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              icon="chat"
              disabled={busy !== null || !query.trim()}
            >
              {busy === "ask" ? t("common.loading") : t("memory.ask")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="search"
              disabled={busy !== null || !query.trim()}
              onClick={() => void search()}
            >
              {busy === "search" ? t("common.loading") : t("memory.search")}
            </Button>
            <span className="muted text-[11px]">{scopeLabel}</span>
          </div>
        </form>

        {error && (
          <p role="alert" className="muted mt-3 text-sm">
            {error}
          </p>
        )}

        {answer && (
          <div className="mt-4 border-t pt-4">
            {/* An honest miss is rendered as an answer, not as an error: the
                records genuinely do not cover it, and that is information. */}
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {answer.answer}
            </p>

            {answer.truncated && (
              <p className="muted mt-2 text-[11px]">{t("memory.truncated")}</p>
            )}

            {answer.sources.length > 0 && (
              <div className="mt-3">
                <p className="muted text-[11px] font-semibold uppercase tracking-wide">
                  {t("memory.sources")}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {answer.sources.map((source) => (
                    <li key={source.entryId}>
                      <a
                        href={`/projects/${projectId}/${source.threadId}`}
                        className="block rounded-lg border px-3 py-2 text-xs transition duration-150 hover:bg-[var(--surface)]"
                      >
                        <span className="muted tabular-nums">
                          {formatDate(source.day)}
                        </span>
                        <span className="muted"> · {source.threadTitle}</span>
                        <span className="mt-0.5 block">{source.excerpt}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {found && (
          <div className="mt-4 border-t pt-4">
            {found.length === 0 ? (
              <p className="muted text-sm">{t("memory.nothing")}</p>
            ) : (
              <ul className="space-y-1.5">
                {found.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`/projects/${projectId}/${entry.thread_id}`}
                      className="block rounded-lg border px-3 py-2 text-xs transition duration-150 hover:bg-[var(--surface)]"
                    >
                      <span className="muted tabular-nums">
                        {formatDate(entry.occurred_on ?? entry.created_at)}
                      </span>
                      <span className="muted"> · {entry.thread_title}</span>
                      <span className="mt-0.5 block line-clamp-2">
                        {entry.body}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!answer && !found && !error && (
          <p className="muted mt-3 flex items-start gap-1.5 text-[11px]">
            <Icon name="shield" className="mt-px size-3.5 shrink-0" />
            {t("memory.hint")}
          </p>
        )}
      </div>
    </Panel>
  );
}
