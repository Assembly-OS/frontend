"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import {
  Button,
  EmptyState,
  FIELD,
  FOCUS,
  MetricStrip,
  PageHeader,
  Panel,
} from "@/components/ui";
import { formatBytes, formatDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import type { KnowledgeReason, KnowledgeStatus } from "@/lib/knowledge";
import {
  ACCEPT,
  approxPages,
  extensionLabel,
  grouped,
  uploadErrorKey,
} from "./library";
import { AutoRefresh, StatusBadge } from "./status";

/** One document as the list needs it — no storage key leaves the server. */
export interface LibraryRow {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  format: string;
  status: KnowledgeStatus;
  reason: KnowledgeReason | null;
  text_chars: number;
  part_count: number;
  uploader_name: string;
  updated_at: string;
}

/** Rows before "show more". */
const PAGE = 20;

/** Below this many a search box is chrome; above it, the fastest way in. */
const SEARCH_FROM = 7;

const HOW: MessageKey[] = [
  "knowledge.how.1",
  "knowledge.how.2",
  "knowledge.how.3",
  "knowledge.how.4",
];

export function KnowledgeClient({
  documents,
  canManage,
  llmConfigured,
}: {
  documents: LibraryRow[];
  canManage: boolean;
  llmConfigured: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  const available = documents.filter(
    (doc) => doc.status === "READY" || doc.status === "PARTIAL",
  );
  const reading = documents.filter((doc) => doc.status === "READING").length;
  const chars = available.reduce((sum, doc) => sum + doc.text_chars, 0);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? documents.filter(
        (doc) =>
          doc.title.toLowerCase().includes(needle) ||
          doc.file_name.toLowerCase().includes(needle),
      )
    : documents;
  const page = visible.slice(0, shown);

  return (
    <>
      <AutoRefresh active={reading > 0} />

      <PageHeader title={t("knowledge.title")} description={t("knowledge.desc")} />

      {/* Only for the people who upload: it changes what they should expect
          from a PDF, and it is nothing a reader of the list can act on. */}
      {canManage && !llmConfigured && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t("knowledge.noKey")}
        </p>
      )}

      <div className="mb-6">
        <MetricStrip
          items={[
            { label: t("knowledge.metric.documents"), value: documents.length },
            { label: t("knowledge.metric.available"), value: available.length },
            { label: t("knowledge.metric.reading"), value: reading },
            {
              label: t("knowledge.metric.volume"),
              value:
                chars > 0
                  ? `≈ ${grouped(approxPages(chars))} ${t("knowledge.pagesShort")}`
                  : "—",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title={t("knowledge.list")}>
          {documents.length === 0 ? (
            <EmptyState
              bare
              icon="library"
              text={t("knowledge.empty")}
              hint={t(canManage ? "knowledge.emptyManage" : "knowledge.emptyView")}
            />
          ) : (
            <>
              {documents.length >= SEARCH_FROM && (
                <div className="border-b px-5 py-3">
                  <label className="relative block">
                    <span className="sr-only">{t("knowledge.find")}</span>
                    <Icon
                      name="search"
                      className="muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setShown(PAGE);
                      }}
                      placeholder={t("knowledge.find")}
                      className={`${FIELD} pl-9`}
                    />
                  </label>
                </div>
              )}

              {visible.length === 0 ? (
                <EmptyState bare icon="search" text={t("knowledge.noMatch")} />
              ) : (
                <ul className="divide-y">
                  {page.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </ul>
              )}

              {visible.length > page.length && (
                <div className="border-t p-4">
                  <Button
                    variant="secondary"
                    block
                    onClick={() => setShown((count) => count + PAGE)}
                  >
                    {t("tasks.showMore")} · {visible.length - page.length}
                  </Button>
                </div>
              )}
            </>
          )}
        </Panel>

        <div className="space-y-6">
          {canManage && <UploadPanel />}
          <Panel title={t("knowledge.how.title")}>
            <ul className="space-y-2.5 px-5 py-4">
              {HOW.map((key) => (
                <li key={key} className="flex gap-2 text-xs leading-relaxed">
                  <Icon name="check" className="muted mt-0.5 size-3.5 shrink-0" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function DocumentRow({ doc }: { doc: LibraryRow }) {
  const t = useT();
  const usable = doc.status === "READY" || doc.status === "PARTIAL";
  const pages = usable ? (
    <span className="muted text-[11px] tabular-nums">
      ≈ {grouped(approxPages(doc.text_chars))} {t("knowledge.pagesShort")}
    </span>
  ) : null;

  return (
    <li>
      <Link
        href={`/knowledge/${doc.id}`}
        className={`flex items-start gap-3 px-5 py-3.5 transition duration-150 hover:bg-[var(--surface)] ${FOCUS}`}
      >
        <span
          aria-hidden
          className="muted grid h-9 w-12 shrink-0 place-items-center rounded-lg border text-[11px] font-semibold"
        >
          {extensionLabel(doc.file_name, doc.format)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere]">
            {doc.title}
          </span>
          <span className="muted mt-0.5 block truncate text-xs">
            {doc.file_name} · {formatBytes(doc.file_size)}
          </span>
          <span className="muted mt-0.5 block truncate text-[11px]">
            {doc.uploader_name} · {formatDate(doc.updated_at)}
          </span>
          {/* On a phone the status goes under the name. Beside it, the
              badge left a title room for three words. */}
          <span className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
            <StatusBadge status={doc.status} />
            {pages}
          </span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
          <StatusBadge status={doc.status} />
          {pages}
        </span>
      </Link>
    </li>
  );
}

function UploadPanel() {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    if (title.trim()) form.append("title", title.trim());

    try {
      const response = await fetch("/api/knowledge", { method: "POST", body: form });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(t(uploadErrorKey(data.error)));
        return;
      }
      setFile(null);
      setTitle("");
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t("knowledge.upload.title")}>
      <form
        className="space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
        }}
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm transition duration-150 hover:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-navy-500/25">
          <Icon name="paperclip" className="muted size-4 shrink-0" />
          <span className={`min-w-0 flex-1 truncate ${file ? "" : "muted"}`}>
            {file ? file.name : t("knowledge.upload.pick")}
          </span>
          {file && (
            <span className="muted shrink-0 text-xs tabular-nums">
              {formatBytes(file.size)}
            </span>
          )}
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </label>

        <input
          type="text"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("knowledge.upload.name")}
          aria-label={t("knowledge.upload.name")}
          className={FIELD}
        />

        <p className="muted text-[11px] leading-relaxed">
          {t("knowledge.upload.formats")}
        </p>

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={!file || busy}>
          {busy ? t("knowledge.upload.busy") : t("knowledge.upload.submit")}
        </Button>
      </form>
    </Panel>
  );
}
