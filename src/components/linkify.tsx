import type { ReactNode } from "react";

/**
 * Renders text with its URLs as links.
 *
 * Built out of React nodes rather than a string of HTML. `dangerouslySetInnerHTML`
 * would be shorter and would also mean every chat message is a place to inject
 * markup into somebody else's page — the text here is written by one colleague
 * and read by another, which is exactly the path that must not exist. React
 * escapes each piece as it renders it, so the danger never arises.
 *
 * Only http and https become links. A bare `javascript:` is a script that runs
 * on click, and no message needs one; anything not matched stays as text, which
 * is the safe direction to fail in.
 */

/**
 * Matches an absolute URL, or a bare `www.` host people type without a scheme.
 *
 * Deliberately not exhaustive: a message is prose, and a pattern that tries to
 * catch every legal URI starts swallowing ordinary sentences instead.
 */
const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/**
 * Sentence punctuation that follows a link far more often than it belongs to
 * one. "See https://assembly.uz." ends in a full stop, not in a path.
 */
const TRAILING = /[.,!?;:»"'\]]+$/;

/** Splits the trailing punctuation off a match, keeping balanced brackets. */
function trim(match: string): [url: string, tail: string] {
  let url = match;
  let tail = "";

  const punctuation = TRAILING.exec(url);
  if (punctuation) {
    tail = punctuation[0];
    url = url.slice(0, -tail.length);
  }

  // A closing bracket is part of the address when the address opened one —
  // Wikipedia and issue trackers both produce those.
  while (url.endsWith(")") && !url.includes("(")) {
    tail = ")" + tail;
    url = url.slice(0, -1);
  }

  return [url, tail];
}

export function Linkify({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const [url, tail] = trim(match[0]);
    if (!url) continue;

    if (start > last) out.push(text.slice(last, start));

    out.push(
      <a
        key={key++}
        href={url.startsWith("www.") ? `https://${url}` : url}
        target="_blank"
        // noopener: the opened page must not reach back through window.opener.
        // noreferrer: an internal address is nobody else's business.
        rel="noopener noreferrer nofollow"
        className="underline decoration-current/40 underline-offset-2 transition hover:decoration-current"
      >
        {url}
      </a>,
    );

    if (tail) out.push(tail);
    last = start + match[0].length;
  }

  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
