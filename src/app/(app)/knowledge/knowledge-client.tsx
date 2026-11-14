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
  Select,
} from "@/components/ui";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import type { Hit } from "@/lib/knowledge/retrieve";
import { SOURCE_KINDS, type SourceKind, type SourceReason, type SourceStatus } from "@/lib/knowledge/types";
import type { Visibility } from "@/lib/knowledge/library";
import { ACCEPT, approxPages, extensionLabel, grouped, isBusy, uploadErrorKey } from "./library";
import { AutoRefresh, KindBadge, StatusBadge } from "./status";

/** One document as the list needs it — no storage key leaves the server. */
export interface LibraryRow {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  format: string;
  visibility: Visibility;
  status: SourceStatus;
  text_chars: number;
  uploader_name: string;
  updated_at: string;
}

export interface SourceLine {
  id: number;
  kind: SourceKind;
  title: string;
  status: SourceStatus;
  reason: SourceReason | null;
  occurred_at: string | null;
  author_name: string | null;
  project_code: string | null;
  href: string;
}

export function KnowledgeClient({
  canAdd,
  notes,
  projects,
  stats,
  documents,
  initialSources,
  initialMore,
}: {
  canAdd: boolean;
  notes: string[];
  projects: { id: number; code: string; name: string }[];
  stats: { ready: number; waiting: number; failed: number; lastIndexedAt: string | null };
  documents: LibraryRow[];
  initialSources: SourceLine[];
  initialMore: boolean;
}) {
  const t = useT();
  const reading =
    documents.some((doc) => isBusy(doc.status)) || initialSources.some((row) => isBusy(row.status));

  return (
    <>
      <AutoRefresh active={reading} />

      <PageHeader title={t("knowledge.title")} description={t("knowledge.desc")} />

      {notes.length > 0 && (
        <ul className="mb-4 space-y-2">
          {notes.map((note) => (
            <li
              key={note}
              className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
            >
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="mb-6">
        <MetricStrip
          items={[
            { label: t("knowledge.metric.records"), value: grouped(stats.ready) },
            { label: t("knowledge.metric.waiting"), value: grouped(stats.waiting) },
            { label: t("knowledge.metric.failed"), value: grouped(stats.failed) },
            {
              label: t("knowledge.metric.lastRead"),
              value: stats.lastIndexedAt ? formatDate(stats.lastIndexedAt) : t("knowledge.never"),
              hint: stats.lastIndexedAt ? formatDateTime(stats.lastIndexedAt) : undefined,
            },
          ]}
        />
      </div>

      <div className="mb-6">
        <MemorySearch />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SourcesPanel initial={initialSources} initialMore={initialMore} />
        <div className="space-y-6">
          {canAdd && <UploadPanel projects={projects} />}
          <DocumentsPanel documents={documents} canAdd={canAdd} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/**
 * The memory, asked directly — the same retrieval the chat uses, without
 * the model: instant, free, and a way to see for oneself what the AI would
 * have been shown.
 */
function MemorySearch() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function search() {
    const text = query.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(false);
    try {
      const url = new URL("/api/knowledge/search", window.location.origin);
      url.searchParams.set("q", text);
      const response = await fetch(url);
      if (!response.ok) throw new Error("search");
      setHits(((await response.json()) as { hits: Hit[] }).hits);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <form
        className="flex items-end gap-2 p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">{t("knowledge.search.placeholder")}</span>
          <Icon
            name="search"
            className="muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("knowledge.search.placeholder")}
            className={`${FIELD} pl-9`}
          />
        </label>
        <Button type="submit" disabled={busy || !query.trim()}>
          {busy ? t("common.loading") : t("knowledge.search.button")}
        </Button>
      </form>

      {hits === null && !error ? (
        <p className="muted flex items-start gap-2 border-t px-5 py-3 text-[11px]">
          <Icon name="shield" className="mt-px size-3 shrink-0" aria-hidden />
          {t("knowledge.search.hint")}
        </p>
      ) : error ? (
        <p role="alert" className="border-t px-5 py-3 text-sm text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      ) : hits && hits.length === 0 ? (
        <p className="muted border-t px-5 py-3 text-sm">{t("knowledge.search.empty")}</p>
      ) : (
        <ol className="divide-y border-t">
          {hits!.map((hit) => (
            <li key={hit.chunk_id} className="px-5 py-3.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <KindBadge kind={hit.kind} />
                <span className="text-sm font-medium [overflow-wrap:anywhere]">{hit.title}</span>
                <span className="muted text-[11px]">
                  {hit.occurred_at ? formatDate(hit.occurred_at) : ""}
                  {hit.author_name ? ` · ${hit.author_name}` : ""}
                  {hit.project_code ? ` · ${hit.project_code}` : ""}
                  {hit.section ? ` · ${hit.section}` : ""}
                </span>
              </p>
              <p className="muted mt-1.5 border-l-2 pl-3 text-xs leading-relaxed [overflow-wrap:anywhere]">
                {hit.excerpt}
              </p>
              <p className="mt-1.5 flex gap-3 text-[11px] font-medium">
                <Link href={hit.href} className="hover:underline">
                  {t("knowledge.open")}
                </Link>
                <Link href={hit.evidence_href} className="muted hover:underline">
                  {t("knowledge.passages")}
                </Link>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* The register                                                        */
/* ------------------------------------------------------------------ */

const PAGE = 30;

function SourcesPanel({ initial, initialMore }: { initial: SourceLine[]; initialMore: boolean }) {
  const t = useT();
  const [kind, setKind] = useState<"" | SourceKind>("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [rows, setRows] = useState<SourceLine[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [busy, setBusy] = useState(false);

  async function load(options: { kind: "" | SourceKind; failedOnly: boolean; before?: number }) {
    setBusy(true);
    try {
      const url = new URL("/api/knowledge/sources", window.location.origin);
      if (options.kind) url.searchParams.set("kind", options.kind);
      if (options.failedOnly) url.searchParams.set("status", "FAILED");
      if (options.before) url.searchParams.set("before", String(options.before));
      const response = await fetch(url);
      if (!response.ok) return;
      const data = (await response.json()) as { rows: SourceLine[]; more: boolean };
      setRows((current) => (options.before ? [...current, ...data.rows] : data.rows));
      setMore(data.more);
    } finally {
      setBusy(false);
    }
  }

  function filter(nextKind: "" | SourceKind, nextFailed: boolean) {
    setKind(nextKind);
    setFailedOnly(nextFailed);
    void load({ kind: nextKind, failedOnly: nextFailed });
  }

  return (
    <Panel
      title={t("knowledge.records")}
      action={
        <div className="flex items-center gap-2">
          <label className="muted flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={failedOnly}
              onChange={(event) => filter(kind, event.target.checked)}
              className="size-4 rounded border"
            />
            {t("knowledge.filter.failed")}
          </label>
          <div className="w-40">
            <Select
              value={kind}
              aria-label={t("knowledge.filter.all")}
              onChange={(event) => filter(event.target.value as "" | SourceKind, failedOnly)}
              className="py-1.5 text-xs"
            >
              <option value="">{t("knowledge.filter.all")}</option>
              {SOURCE_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(`knowledge.kind.${option}` as MessageKey)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      }
    >
      <p className="muted border-b px-5 py-2.5 text-[11px]">{t("knowledge.records.hint")}</p>
      {rows.length === 0 ? (
        <EmptyState
          bare
          icon="library"
          text={kind || failedOnly ? t("knowledge.records.empty") : t("knowledge.empty")}
          hint={kind || failedOnly ? undefined : t("knowledge.emptyHint")}
        />
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/knowledge/sources/${row.id}`}
                className={`flex items-start gap-3 px-5 py-3 transition duration-150 hover:bg-[var(--surface)] ${FOCUS}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <KindBadge kind={row.kind} />
                    <span className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere]">
                      {row.title}
                    </span>
                  </span>
                  <span className="muted mt-1 block truncate text-[11px]">
                    {row.occurred_at ? formatDate(row.occurred_at) : "—"}
                    {row.author_name ? ` · ${row.author_name}` : ""}
                    {row.project_code ? ` · ${row.project_code}` : ""}
                  </span>
                  {(row.status === "FAILED" || row.status === "PARTIAL") && row.reason && (
                    <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">
                      {t(`knowledge.reason.${row.reason}` as MessageKey)}
                    </span>
                  )}
                </span>
                <StatusBadge status={row.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <div className="border-t p-4">
          <Button
            variant="secondary"
            block
            disabled={busy}
            onClick={() => void load({ kind, failedOnly, before: rows.at(-1)?.id })}
          >
            {busy ? t("common.loading") : t("knowledge.source.showMore")}
          </Button>
        </div>
      )}
      {rows.length >= PAGE && !more && null}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* The library                                                         */
/* ------------------------------------------------------------------ */

function DocumentsPanel({ documents, canAdd }: { documents: LibraryRow[]; canAdd: boolean }) {
  const t = useT();
  const [shown, setShown] = useState(12);
  return (
    <Panel title={t("knowledge.documents")}>
      <p className="muted border-b px-5 py-2.5 text-[11px]">{t("knowledge.documents.hint")}</p>
      {documents.length === 0 ? (
        <EmptyState
          bare
          icon="file"
          text={t("knowledge.records.empty")}
          hint={canAdd ? t("knowledge.upload.formats") : undefined}
        />
      ) : (
        <ul className="divide-y">
          {documents.slice(0, shown).map((doc) => {
            const usable = doc.status === "READY" || doc.status === "PARTIAL";
            return (
              <li key={doc.id}>
                <Link
                  href={`/knowledge/${doc.id}`}
                  className={`flex items-start gap-3 px-5 py-3 transition duration-150 hover:bg-[var(--surface)] ${FOCUS}`}
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
                    <span className="muted mt-0.5 block truncate text-[11px]">
                      {doc.uploader_name} · {formatDate(doc.updated_at)} · {formatBytes(doc.file_size)}
                      {usable ? ` · ≈ ${grouped(approxPages(doc.text_chars))} ${t("knowledge.pagesShort")}` : ""}
                      {` · ${t(`knowledge.vis.${doc.visibility}` as MessageKey)}`}
                    </span>
                  </span>
                  <StatusBadge status={doc.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {documents.length > shown && (
        <div className="border-t p-4">
          <Button variant="secondary" block onClick={() => setShown((count) => count + 12)}>
            {t("knowledge.source.showMore")} · {documents.length - shown}
          </Button>
        </div>
      )}
    </Panel>
  );
}

function UploadPanel({ projects }: { projects: { id: number; code: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("ALL");
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    if (title.trim()) form.append("title", title.trim());
    form.append("visibility", visibility);
    if (visibility === "PROJECT" && projectId) form.append("projectId", projectId);

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
            <span className="muted shrink-0 text-xs tabular-nums">{formatBytes(file.size)}</span>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="muted mb-1 block text-xs">{t("knowledge.upload.visibility")}</span>
            <Select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              {(["ALL", "PROJECT", "DEPARTMENT", "PRIVATE"] as const).map((option) => (
                <option key={option} value={option}>
                  {t(`knowledge.vis.${option}` as MessageKey)}
                </option>
              ))}
            </Select>
          </label>
          {visibility === "PROJECT" && (
            <label className="block">
              <span className="muted mb-1 block text-xs">{t("knowledge.upload.project")}</span>
              <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">—</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} · {project.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>

        <p className="muted text-[11px] leading-relaxed">{t("knowledge.upload.formats")}</p>

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <Button
          type="submit"
          block
          disabled={!file || busy || (visibility === "PROJECT" && !projectId)}
        >
          {busy ? t("knowledge.upload.busy") : t("knowledge.upload.submit")}
        </Button>
      </form>
    </Panel>
  );
}
