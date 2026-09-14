import type { MessageKey } from "@/lib/i18n";

/** What the file picker offers: the formats `extract.ts` can read. */
export const ACCEPT =
  ".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.json,.jpg,.jpeg,.png,.webp,.gif";

/**
 * Roughly how many printed pages a text is, at about 1,800 characters a page.
 * An estimate, and always shown with "≈": characters mean nothing to a reader,
 * pages do.
 */
export function approxPages(chars: number): number {
  return Math.max(1, Math.round(chars / 1_800));
}

const GROUPED = new Intl.NumberFormat("ru-RU");

export function grouped(value: number): string {
  return GROUPED.format(value);
}

/** The short label in front of a document: its extension, or its format. */
export function extensionLabel(fileName: string, format: string): string {
  const extension = /\.([a-z0-9]{1,5})$/i.exec(fileName)?.[1];
  return (extension ?? format).slice(0, 4).toUpperCase();
}

const UPLOAD_ERRORS = new Set([
  "TOO_LARGE",
  "UNSUPPORTED_TYPE",
  "NO_TEXT",
  "UNREADABLE",
]);

/** A refused upload, said in words: what was wrong with the file. */
export function uploadErrorKey(code: string | undefined): MessageKey {
  return code && UPLOAD_ERRORS.has(code)
    ? (`knowledge.error.${code}` as MessageKey)
    : "common.error";
}
