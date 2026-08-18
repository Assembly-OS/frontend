"use client";

import { useEffect, useRef } from "react";
import { IconButton } from "./ui";

/**
 * Full-screen viewer for one attached image.
 *
 * Opening a photo used to be a link to `/api/files/[id]`, which handed the
 * browser a bare image on its own page: the conversation was gone, and coming
 * back meant the back button. Reading a chat is the surrounding context, so the
 * picture is shown over it and dismissed without leaving.
 */
export function Lightbox({
  src,
  alt,
  label,
  onClose,
}: {
  src: string;
  alt: string;
  /** Accessible name for the close control, in the reader's language. */
  label: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    // The page behind must not scroll away under the overlay.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Move focus in, so Escape and Tab act on the dialog rather than the page.
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="absolute right-3 top-3">
        <IconButton
          icon="close"
          label={label}
          onClick={onClose}
          className="border-white/20 bg-black/40 text-white hover:bg-black/60"
        />
      </div>

      {/* The image swallows the click so only the backdrop dismisses. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full cursor-default rounded-lg object-contain"
      />
    </div>
  );
}
