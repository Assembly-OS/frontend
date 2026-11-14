"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Badge, Button, EmptyState, FIELD, IconButton, Select } from "@/components/ui";
import { formatBytes, formatDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/project-document-kinds";
import { NEUTRAL_TONE } from "@/lib/types";

/** One document as the panel needs it — no storage key leaves the server. */
export interface DocumentItem {
  id: number;
  kind: DocumentKind;
  title: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

/**
 * The passport's documents, TZ block 1.3. A list anyone can download from,
 * and for the people who keep the project, a small form to add one.
 */
export function ProjectDocuments({
  projectId,
  documents,
  canEdit,
}: {
  projectId: number;
  documents: DocumentItem[];
  canEdit: boolean;
}) {
  const t = useT();
  return (
    <>
      {documents.length === 0 ? (
        <EmptyState bare icon="file" text={t("proj.docs.empty")} />
      ) : (
        <ul className="divide-y">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} projectId={projectId} doc={doc} canEdit={canEdit} />
          ))}
        </ul>
      )}
      {canEdit && <UploadForm projectId={projectId} />}
    </>
  );
}

function DocumentRow({
  projectId,
  doc,
  canEdit,
}: {
  projectId: number;
  doc: DocumentItem;
  canEdit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(t("common.error"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <a
            href={`/api/projects/${projectId}/documents/${doc.id}/file`}
            title={doc.file_name}
            className="block truncate text-sm font-medium hover:underline"
          >
            {doc.title}
          </a>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge className={NEUTRAL_TONE}>
              {t(`proj.docs.kind.${doc.kind}` as MessageKey)}
            </Badge>
            <span className="muted text-[11px] tabular-nums">
              {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
            </span>
          </p>
        </div>
        {canEdit && !confirm && (
          <IconButton
            icon="trash"
            variant="ghost"
            label={t("proj.docs.remove")}
            disabled={busy}
            onClick={() => setConfirm(true)}
          />
        )}
      </div>
      {confirm && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}>
            {t("proj.docs.removeConfirm")}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(false)}>
            {t("action.cancel")}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </li>
  );
}

function UploadForm({ projectId }: { projectId: number }) {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("MASTER_PLAN");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    if (title.trim()) form.append("title", title.trim());
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(t(data.error === "TOO_LARGE" ? "proj.docs.tooLarge" : "common.error"));
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
    <form
      className="space-y-2 border-t px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        void upload();
      }}
    >
      <Select
        id={`doc-kind-${projectId}`}
        aria-label={t("proj.docs.kindLabel")}
        value={kind}
        onChange={(event) => setKind(event.target.value as DocumentKind)}
      >
        {DOCUMENT_KINDS.map((value) => (
          <option key={value} value={value}>
            {t(`proj.docs.kind.${value}` as MessageKey)}
          </option>
        ))}
      </Select>
      <input
        id={`doc-title-${projectId}`}
        type="text"
        value={title}
        maxLength={200}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t("proj.docs.name")}
        aria-label={t("proj.docs.name")}
        className={FIELD}
      />
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm transition duration-150 hover:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-navy-500/25">
        <Icon name="paperclip" className="muted size-4 shrink-0" />
        <span className={`min-w-0 flex-1 truncate ${file ? "" : "muted"}`}>
          {file ? file.name : t("proj.docs.pick")}
        </span>
        <input
          ref={input}
          id={`doc-file-${projectId}`}
          type="file"
          className="sr-only"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <Button type="submit" size="sm" block disabled={!file || busy}>
        {busy ? t("proj.docs.busy") : t("proj.docs.add")}
      </Button>
      <p className="muted text-[11px]">{t("proj.docs.kept")}</p>
    </form>
  );
}
