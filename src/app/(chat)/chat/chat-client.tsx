"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { onPresence, onTyping } from "@/components/realtime-bus";
import {
  formatBytes,
  formatChatTime,
  formatDuration,
  initials,
} from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import type { MessageKind } from "@/lib/types";

export interface ConversationItem {
  id: number;
  login: string;
  full_name: string;
  role: string;
  position: string | null;
  last_body: string;
  last_kind: MessageKind;
  last_at: string;
  unread: number;
}

/** Label for an attachment whose caption is empty, so no preview line is blank. */
function kindLabel(kind: MessageKind, t: (key: MessageKey) => string): string {
  if (kind === "photo") return t("chat.photo");
  if (kind === "voice") return t("chat.voice");
  if (kind === "file") return t("chat.file");
  return "";
}

export interface PersonItem {
  id: number;
  login: string;
  full_name: string;
  role: string;
  department: string | null;
  position: string | null;
  group: string;
}

/* ------------------------------------------------------------------ */
/* Left rail: conversations + the full staff directory                 */
/* ------------------------------------------------------------------ */

const GROUP_ORDER = [
  "RAIS",
  "GR",
  "FR",
  "BR",
  "PR",
  "AI_LAB",
  "LOYIHA",
  "UYUSHMA",
];

function groupLabel(group: string, t: (key: MessageKey) => string): string {
  if (group === "RAIS") return t("role.RAIS");
  if (group === "LOYIHA") return t("role.LOYIHA_RAHBARI");
  if (group === "UYUSHMA") return t("role.UYUSHMA_RAISI");
  return t(`dept.${group}` as MessageKey);
}

export interface GroupItem {
  id: number;
  title: string;
  members: number;
  last_body: string;
  last_kind: MessageKind;
  last_at: string | null;
  last_from_name: string | null;
  unread: number;
}

export function ConversationList({
  conversations,
  groups,
  people,
  raisLogin,
  meLogin,
  onlineLogins,
}: {
  conversations: ConversationItem[];
  groups: GroupItem[];
  people: PersonItem[];
  raisLogin: string | null;
  meLogin: string;
  onlineLogins: string[];
}) {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ login?: string; id?: string }>();
  const active = params?.login ? decodeURIComponent(params.login) : null;
  const activeGroup = params?.id ? Number(params.id) : null;

  const [tab, setTab] = useState<"chats" | "groups" | "people">(
    conversations.length > 0 ? "chats" : groups.length > 0 ? "groups" : "people",
  );
  const [filter, setFilter] = useState("");
  // Group creation lives in the rail: pick a name, tick colleagues, done.
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || picked.length === 0) {
      setError(t("chat.pickMembers"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), memberIds: picked }),
      });
      if (!response.ok) throw new Error("create failed");
      const data = (await response.json()) as { id: number };
      setCreating(false);
      setTitle("");
      setPicked([]);
      router.push(`/chat/group/${data.id}`);
      router.refresh();
    } catch {
      setError(t("chat.groupCreateError"));
    } finally {
      setBusy(false);
    }
  }

  // Live online set: seeded from the server, then kept current by presence
  // events (which arrive for the people this user actually converses with).
  const [online, setOnline] = useState(() => new Set(onlineLogins));
  const onlineKey = onlineLogins.join(",");
  const [seenKey, setSeenKey] = useState(onlineKey);
  if (seenKey !== onlineKey) {
    setSeenKey(onlineKey);
    setOnline(new Set(onlineLogins));
  }
  useEffect(() => {
    return onPresence((event) => {
      setOnline((prev) => {
        const next = new Set(prev);
        if (event.online) next.add(event.login);
        else next.delete(event.login);
        return next;
      });
    });
  }, []);

  // Matches login, name, position and department, so "@gr.rahbar", "Bekzod"
  // and "GR" all find the same person.
  const needle = filter.trim().replace(/^@/, "").toLowerCase();
  const matched = needle
    ? people.filter((person) =>
        `${person.login} ${person.full_name} ${person.position ?? ""} ${groupLabel(
          person.group,
          t,
        )}`
          .toLowerCase()
          .includes(needle),
      )
    : people;

  const departmentGroups = GROUP_ORDER.map((group) => ({
    group,
    items: matched.filter((person) => person.group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
          {(["chats", "groups", "people"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                tab === value
                  ? "bg-navy-900 text-white dark:bg-navy-600"
                  : "muted hover:opacity-80"
              }`}
            >
              {value === "chats"
                ? t("chat.tabChats")
                : value === "groups"
                  ? t("chat.tabGroups")
                  : t("chat.tabPeople")}
              {value === "chats" && conversations.length > 0 && (
                <span className="ml-1.5 opacity-70">{conversations.length}</span>
              )}
              {value === "groups" && groups.length > 0 && (
                <span className="ml-1.5 opacity-70">{groups.length}</span>
              )}
            </button>
          ))}
        </div>

        {raisLogin && raisLogin !== meLogin && (
          <Link
            href={`/chat/${raisLogin}`}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active === raisLogin
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "bg-gold-500/12 text-gold-600 hover:bg-gold-500/20 dark:text-gold-400"
            }`}
          >
            <Icon name="chat" className="size-4" />
            <span className="truncate">{t("nav.chatRais")}</span>
          </Link>
        )}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {tab === "groups" ? (
          <div className="p-2">
            {creating ? (
              <form onSubmit={createGroup} className="space-y-2 p-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("chat.groupName")}
                  className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-navy-500"
                  autoFocus
                />
                <p className="muted px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {t("chat.groupMembers")} · {picked.length}
                </p>
                <ul className="scroll-thin max-h-56 overflow-y-auto rounded-xl border">
                  {people.map((person) => {
                    const on = picked.includes(person.id);
                    return (
                      <li key={person.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setPicked((list) =>
                              on
                                ? list.filter((id) => id !== person.id)
                                : [...list, person.id],
                            )
                          }
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--surface)]"
                        >
                          <span
                            className={`grid size-4 shrink-0 place-items-center rounded border ${
                              on
                                ? "border-navy-600 bg-navy-900 text-white dark:bg-navy-600"
                                : ""
                            }`}
                          >
                            {on && <Icon name="check" className="size-3" />}
                          </span>
                          <span className="truncate">{person.full_name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {error && (
                  <p className="px-1 text-xs font-medium text-rose-600">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-navy-900 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50 dark:bg-navy-600"
                  >
                    {busy ? t("chat.groupCreating") : t("chat.groupCreate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setError(null);
                    }}
                    className="rounded-xl border px-4 text-sm font-medium transition hover:bg-[var(--surface)]"
                  >
                    {t("common.back")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="mb-2 flex w-full items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface)]"
                >
                  <Icon name="plus" className="size-4" />
                  {t("chat.newGroup")}
                </button>

                {groups.length === 0 ? (
                  <p className="muted p-6 text-center text-sm">
                    {t("chat.noGroups")}
                  </p>
                ) : (
                  <ul>
                    {groups.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/chat/group/${item.id}`}
                          className={`flex items-start gap-3 rounded-xl px-2 py-2.5 transition ${
                            activeGroup === item.id
                              ? "bg-[var(--surface)]"
                              : "hover:bg-[var(--surface)]"
                          }`}
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-500/20 text-gold-600 dark:text-gold-400">
                            <Icon name="users" className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {item.title}
                              </span>
                              {item.last_at && (
                                <span className="muted ml-auto shrink-0 text-[10px]">
                                  {formatChatTime(item.last_at)}
                                </span>
                              )}
                            </span>
                            <span className="muted mt-0.5 flex items-center gap-2">
                              <span className="truncate text-xs">
                                {item.last_at
                                  ? `${item.last_from_name ?? ""}: ${
                                      item.last_body ||
                                      kindLabel(item.last_kind, t)
                                    }`
                                  : `${item.members} ${t("chat.membersCount")}`}
                              </span>
                              {item.unread > 0 && (
                                <span className="ml-auto min-w-4 shrink-0 rounded-full bg-gold-500 px-1.5 text-center text-[10px] font-bold text-navy-950">
                                  {item.unread}
                                </span>
                              )}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : tab === "chats" ? (
          conversations.length === 0 ? (
            <p className="muted p-6 text-center text-sm">{t("chat.noChats")}</p>
          ) : (
            <ul className="p-2">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`/chat/${conversation.login}`}
                    className={`flex items-start gap-3 rounded-xl px-2 py-2.5 transition ${
                      active === conversation.login
                        ? "bg-[var(--surface)]"
                        : "hover:bg-[var(--surface)]"
                    }`}
                  >
                    <Avatar
                      name={conversation.full_name}
                      online={online.has(conversation.login)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {conversation.full_name}
                        </span>
                        <span className="muted ml-auto shrink-0 text-[10px]">
                          {formatChatTime(conversation.last_at)}
                        </span>
                      </span>
                      <span className="muted mt-0.5 flex items-center gap-2">
                        <span className="truncate text-xs">
                          {conversation.last_body ||
                            kindLabel(conversation.last_kind, t)}
                        </span>
                        {conversation.unread > 0 && (
                          <span className="ml-auto min-w-4 shrink-0 rounded-full bg-gold-500 px-1.5 text-center text-[10px] font-bold text-navy-950">
                            {conversation.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="p-2">
            <input
              type="text"
              name="staff-filter"
              autoComplete="off"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("chat.filter")}
              className="mb-2 w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-navy-500"
            />

            {departmentGroups.length === 0 && (
              <p className="muted px-2 py-4 text-center text-xs">
                {t("chat.notFound")}
              </p>
            )}

            {departmentGroups.map((entry) => (
              <div key={entry.group} className="mb-2">
                <p className="muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {groupLabel(entry.group, t)}
                </p>
                <ul>
                  {entry.items.map((person) => (
                    <li key={person.id}>
                      <Link
                        href={`/chat/${person.login}`}
                        className={`flex items-center gap-3 rounded-xl px-2 py-2 transition ${
                          active === person.login
                            ? "bg-[var(--surface)]"
                            : "hover:bg-[var(--surface)]"
                        }`}
                      >
                        <Avatar
                          name={person.full_name}
                          online={online.has(person.login)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {person.full_name}
                          </span>
                          <span className="muted block truncate text-xs">
                            <span className="font-mono">@{person.login}</span>
                            {" · "}
                            {person.position ??
                              t(`role.${person.role}` as MessageKey)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, online }: { name: string; online?: boolean }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white dark:bg-navy-700">
      {initials(name)}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--panel)] bg-emerald-500" />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Right pane: the thread                                              */
/* ------------------------------------------------------------------ */

export interface ThreadMessage {
  id: number;
  from_user_id: number;
  /** Present on group messages: several people speak, so bubbles are labelled. */
  from_name?: string;
  from_login?: string;
  /** Message text, or the attachment's caption — empty when there is none. */
  body: string;
  kind: MessageKind;
  file_name: string | null;
  file_size: number | null;
  file_mime: string | null;
  duration: number | null;
  created_at: string;
}

/** A message the user has sent that is not yet confirmed by the server. */
interface Outgoing {
  clientId: number;
  body: string;
  created_at: string;
  status: "sending" | "failed";
  /** Set for an attachment: the blob is kept so "retry" can re-upload it. */
  attachment?: PendingFile;
}

/** A blob chosen or recorded but not yet accepted by the server. */
interface PendingFile {
  file: File;
  kind: "photo" | "voice" | "file";
  /** Object URL for the local preview; revoked once the send resolves. */
  preview: string | null;
  duration: number | null;
}

/**
 * Client-side mirror of the server's per-kind ceiling (`src/lib/uploads.ts`).
 * Checking here turns a 50 MB round-trip that ends in 413 into an instant
 * message; the server still enforces the real limit.
 */
const MAX_BYTES: Record<PendingFile["kind"], number> = {
  photo: 10 * 1024 * 1024,
  voice: 20 * 1024 * 1024,
  file: 50 * 1024 * 1024,
};

/** Longest voice note the server stores — the recorder stops itself here. */
const MAX_RECORD_SECONDS = 10 * 60;

/**
 * Container formats MediaRecorder may offer, best first. Chrome and Firefox
 * take Opus in WebM/Ogg; Safari — and so every iOS webview, Telegram's
 * included — only records MP4/AAC. An empty string lets the browser choose.
 */
const RECORD_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "",
];

function pickRecordType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return (
    RECORD_TYPES.find(
      (type) => type === "" || MediaRecorder.isTypeSupported(type),
    ) ?? ""
  );
}

/** UTC timestamp in the exact `YYYY-MM-DD HH:MM:SS` shape the server stores. */
function localStamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Human-readable presence line: "online" while connected, otherwise "last seen
 * N min/hours ago", falling back to the exact time for anything over a day.
 * The stored timestamp is UTC, so it is parsed with an explicit `Z`.
 */
function presenceLabel(
  online: boolean,
  lastSeen: string | null,
  t: (key: MessageKey) => string,
): string {
  if (online) return t("chat.online");
  if (!lastSeen) return t("chat.seenOffline");

  const elapsed = Date.now() - Date.parse(`${lastSeen.replace(" ", "T")}Z`);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return t("chat.seenJustNow");
  if (minutes < 60) return t("chat.seenMinAgo").replace("{n}", String(minutes));

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("chat.seenHoursAgo").replace("{n}", String(hours));

  return t("chat.seenAt").replace("{time}", formatChatTime(lastSeen));
}

/** Once per this window we tell the server we are typing — enough to stay live
 *  without a request per keystroke. */
const TYPING_PING_MS = 2500;
/** Clear the partner's "typing…" line if no ping arrives within this window. */
const TYPING_CLEAR_MS = 4000;

export function Thread({
  partner,
  group,
  endpoint,
  meId,
  initial,
  initialHasMore,
}: {
  /** The other person, on a one-to-one thread. Null in a group. */
  partner?: {
    login: string;
    full_name: string;
    roleLabel: string;
    position: string | null;
    online: boolean;
    lastSeen: string | null;
  } | null;
  /** The group, when this is a group thread. Null one-to-one. */
  group?: { id: number; title: string; members: number } | null;
  /**
   * Where this thread lives: `/api/chat/<login>` or `/api/chat/group/<id>`.
   * Sending, uploading and paging all hang off it, so the two rails share
   * every piece of composer machinery instead of keeping two copies.
   */
  endpoint: string;
  meId: number;
  initial: ThreadMessage[];
  initialHasMore: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>(initial);
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const [draft, setDraft] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  // A picked photo/file waits here while the user types its caption.
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [presence, setPresence] = useState({
    online: partner?.online ?? false,
    lastSeen: partner?.lastSeen ?? null,
  });
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [, forceTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Scroll height captured just before older messages are prepended, so the
  // viewport can be held steady instead of jumping.
  const restoreFrom = useRef<number | null>(null);
  const seq = useRef(0);
  const lastPing = useRef(0);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const micStream = useRef<MediaStream | null>(null);
  const recordStart = useRef(0);
  // Set by "cancel" so the recorder's stop handler throws the take away
  // instead of sending it — `stop()` fires the same event either way.
  const discard = useRef(false);

  // Server data wins whenever the page re-renders (router.refresh, navigation
  // to another thread) — the documented "adjust state during render" pattern.
  const [serverSnapshot, setServerSnapshot] = useState(initial);
  if (serverSnapshot !== initial) {
    setServerSnapshot(initial);
    setMessages(initial);
    setHasMore(initialHasMore);
  }

  // Switching to a different colleague re-seeds presence from that person's
  // server-rendered status (same adjust-during-render pattern as messages).
  const [seenLogin, setSeenLogin] = useState(partner?.login ?? "");
  if (seenLogin !== (partner?.login ?? "")) {
    setSeenLogin(partner?.login ?? "");
    setPresence({
      online: partner?.online ?? false,
      lastSeen: partner?.lastSeen ?? null,
    });
  }

  useEffect(() => {
    // After prepending an older page, hold the viewport where it was instead of
    // snapping to the bottom.
    if (restoreFrom.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight - restoreFrom.current;
      restoreFrom.current = null;
      return;
    }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, outbox, partnerTyping]);

  async function loadOlder() {
    const oldest = messages[0]?.id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const response = await fetch(`${endpoint}?before=${oldest}`);
      if (response.ok) {
        const data = (await response.json()) as {
          messages: ThreadMessage[];
          hasMore: boolean;
        };
        restoreFrom.current = scrollRef.current?.scrollHeight ?? null;
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoadingOlder(false);
    }
  }

  // No message polling: <LiveUpdates> holds the app's single SSE connection, and
  // an incoming message bumps the pulse, which fires router.refresh(). That
  // re-runs this thread's server page, which hands down a fresh `initial` — the
  // "server data wins" block above swaps it in the instant the message arrives.
  //
  // Typing signals ride that same connection and reach us through the in-tab
  // bus. We show the line while pings keep coming and drop it after a short lull.
  useEffect(() => {
    let clear: ReturnType<typeof setTimeout> | undefined;
    if (!partner) return;
    const off = onTyping((event) => {
      if (event.from !== partner.login) return;
      setPartnerTyping(true);
      clearTimeout(clear);
      clear = setTimeout(() => setPartnerTyping(false), TYPING_CLEAR_MS);
    });
    return () => {
      off();
      clearTimeout(clear);
      setPartnerTyping(false);
    };
  }, [partner]);

  // Presence for this partner arrives over the same stream via the in-tab bus.
  useEffect(() => {
    if (!partner) return;
    return onPresence((event) => {
      if (event.login !== partner.login) return;
      setPresence({ online: event.online, lastSeen: event.lastSeen });
      if (event.online) setPartnerTyping(false);
    });
  }, [partner]);

  // While offline, re-render once a minute so "N minutes ago" keeps counting up
  // even when no new event arrives.
  useEffect(() => {
    if (presence.online) return;
    const timer = setInterval(() => forceTick((v) => v + 1), 60_000);
    return () => clearInterval(timer);
  }, [presence.online, presence.lastSeen]);

  async function deliver(clientId: number, text: string) {
    setOutbox((list) =>
      list.map((m) => (m.clientId === clientId ? { ...m, status: "sending" } : m)),
    );
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!response.ok) throw new Error("send failed");
      const data = (await response.json()) as { messages: ThreadMessage[] };
      // Server truth now contains this message — drop the pending copy and let
      // the real one render (also re-seeds the recipient via the pulse refresh).
      setMessages(data.messages);
      setOutbox((list) => list.filter((m) => m.clientId !== clientId));
      router.refresh();
    } catch {
      // Keep the bubble, flag it, and offer a retry — never lose the text.
      setOutbox((list) =>
        list.map((m) =>
          m.clientId === clientId ? { ...m, status: "failed" } : m,
        ),
      );
    }
  }

  /**
   * Uploads one blob as multipart. Same contract as {@link deliver}: on success
   * the server returns the whole fresh thread, so the optimistic bubble is
   * dropped and the real row takes its place.
   */
  async function deliverAttachment(
    clientId: number,
    item: PendingFile,
    caption: string,
  ) {
    setOutbox((list) =>
      list.map((m) => (m.clientId === clientId ? { ...m, status: "sending" } : m)),
    );
    try {
      const form = new FormData();
      form.append("file", item.file, item.file.name);
      form.append("kind", item.kind);
      if (caption) form.append("caption", caption);
      if (item.duration) form.append("duration", String(item.duration));

      const response = await fetch(`${endpoint}/attach`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        if (response.status === 413)
          setNotice(
            t("chat.tooLarge").replace("{n}", formatBytes(MAX_BYTES[item.kind])),
          );
        throw new Error(String(response.status));
      }

      const data = (await response.json()) as { messages: ThreadMessage[] };
      setMessages(data.messages);
      setOutbox((list) => list.filter((m) => m.clientId !== clientId));
      if (item.preview) URL.revokeObjectURL(item.preview);
      router.refresh();
    } catch {
      // Keep the bubble and its blob so "retry" can re-upload the same file.
      setOutbox((list) =>
        list.map((m) =>
          m.clientId === clientId ? { ...m, status: "failed" } : m,
        ),
      );
    }
  }

  /** Queue an attachment optimistically and start its upload. */
  function enqueue(item: PendingFile, caption: string) {
    const clientId = ++seq.current;
    setOutbox((list) => [
      ...list,
      {
        clientId,
        body: caption,
        created_at: localStamp(),
        status: "sending",
        attachment: item,
      },
    ]);
    void deliverAttachment(clientId, item, caption);
  }

  /** A photo or file the user just picked — held until they press send. */
  function choose(file: File | null | undefined, kind: PendingFile["kind"]) {
    if (!file) return;
    if (file.size > MAX_BYTES[kind]) {
      setNotice(t("chat.tooLarge").replace("{n}", formatBytes(MAX_BYTES[kind])));
      return;
    }
    setNotice(null);
    setAttachOpen(false);
    setPending((prev) => {
      if (prev?.preview) URL.revokeObjectURL(prev.preview);
      return {
        file,
        kind,
        preview: kind === "photo" ? URL.createObjectURL(file) : null,
        duration: null,
      };
    });
  }

  function clearPending() {
    setPending((prev) => {
      if (prev?.preview) URL.revokeObjectURL(prev.preview);
      return null;
    });
  }

  async function startRecording() {
    if (recording) return;
    // Recording needs a secure context; over plain http (or an old webview)
    // the API is simply absent, so say so instead of failing silently.
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setNotice(t("chat.micUnsupported"));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNotice(t("chat.micDenied"));
      return;
    }

    const type = pickRecordType();
    let media: MediaRecorder;
    try {
      media = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setNotice(t("chat.micUnsupported"));
      return;
    }

    chunks.current = [];
    discard.current = false;
    micStream.current = stream;
    recorder.current = media;

    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };

    // One exit path for every ending — send, cancel, unmount or the length cap.
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      micStream.current = null;
      recorder.current = null;
      setRecording(false);
      setElapsed(0);

      const parts = chunks.current;
      chunks.current = [];
      if (discard.current) return;

      const blob = new Blob(parts, { type: media.mimeType || "audio/webm" });
      if (blob.size === 0) return;

      const seconds = Math.max(
        1,
        Math.round((Date.now() - recordStart.current) / 1000),
      );
      const extension = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";

      // A voice note carries no caption — it goes the moment recording ends.
      enqueue(
        {
          file: new File([blob], `voice-message.${extension}`, {
            type: blob.type,
          }),
          kind: "voice",
          preview: null,
          duration: seconds,
        },
        "",
      );
    };

    setNotice(null);
    media.start();
    recordStart.current = Date.now();
    setElapsed(0);
    setRecording(true);
  }

  /** `keep` sends the take; otherwise the audio is thrown away. */
  function stopRecording(keep: boolean) {
    const media = recorder.current;
    if (!media) return;
    discard.current = !keep;
    if (media.state !== "inactive") media.stop();
  }

  // Tick the on-screen counter, and stop at the ceiling the server enforces.
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const seconds = Math.round((Date.now() - recordStart.current) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_RECORD_SECONDS) stopRecording(true);
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  // Never leave the microphone live behind a closed thread. `discard` first:
  // stopping fires the recorder's onstop, which must not send a half-take from
  // a component that is going away.
  useEffect(() => {
    return () => {
      discard.current = true;
      const media = recorder.current;
      if (media && media.state !== "inactive") media.stop();
      micStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();

    // A queued photo or file sends with whatever is in the box as its caption.
    if (pending) {
      enqueue(pending, text);
      setPending(null);
      setDraft("");
      lastPing.current = 0;
      return;
    }

    if (!text) return;
    const clientId = ++seq.current;
    // Optimistic: the bubble appears the instant Enter is pressed.
    setOutbox((list) => [
      ...list,
      { clientId, body: text, created_at: localStamp(), status: "sending" },
    ]);
    setDraft("");
    lastPing.current = 0; // we just sent — let the next keystroke re-announce
    void deliver(clientId, text);
  }

  function onDraftChange(value: string) {
    setDraft(value);
    // Throttled "I'm typing" ping — fire-and-forget, ignore failures.
    const now = Date.now();
    if (partner && value && now - lastPing.current > TYPING_PING_MS) {
      lastPing.current = now;
      void fetch(`${endpoint}/typing`, { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/chat"
          className="grid size-8 place-items-center rounded-lg border lg:hidden"
          aria-label={t("common.back")}
        >
          <Icon name="close" className="size-4" />
        </Link>
        {group ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-500/20 text-gold-600 dark:text-gold-400">
            <Icon name="users" className="size-4" />
          </span>
        ) : (
          <Avatar name={partner!.full_name} online={presence.online} />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {group ? group.title : partner!.full_name}
          </p>
          {group ? (
            <p className="muted truncate text-xs">
              {group.members} {t("chat.membersCount")}
            </p>
          ) : (
            <p className="muted truncate text-xs">
              <span className="font-mono">@{partner!.login}</span> ·{" "}
              {partner!.position ?? partner!.roleLabel}
            </p>
          )}
          <p className={`truncate text-xs ${group ? "hidden" : ""}`}>
            {partnerTyping ? (
              <span className="font-medium text-navy-700 dark:text-gold-400">
                {t("chat.typing")}
              </span>
            ) : presence.online ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {t("chat.online")}
              </span>
            ) : (
              <span className="muted">
                {presenceLabel(presence.online, presence.lastSeen, t)}
              </span>
            )}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-[var(--surface)] p-4"
      >
        {messages.length === 0 && outbox.length === 0 && (
          <p className="muted py-10 text-center text-sm">
            {t("chat.searchHint")}
          </p>
        )}
        {hasMore && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="muted rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-[var(--panel)] disabled:opacity-50"
            >
              {loadingOlder ? t("common.loading") : t("chat.loadOlder")}
            </button>
          </div>
        )}
        {messages.map((message) => {
          const mine = message.from_user_id === meId;
          // A photo fills its bubble edge to edge; everything else keeps the
          // usual text padding.
          const framed = message.kind === "photo";
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl text-sm shadow-sm ${
                  framed ? "p-1.5" : "px-3.5 py-2.5"
                } ${
                  mine
                    ? "rounded-br-md bg-navy-900 text-white dark:bg-navy-600"
                    : "rounded-bl-md bg-[var(--panel)]"
                }`}
              >
                {group && !mine && message.from_name && (
                  <p className="mb-1 truncate text-xs font-semibold text-navy-700 dark:text-gold-400">
                    {message.from_name}
                  </p>
                )}
                {message.kind !== "text" && (
                  <AttachmentView message={message} mine={mine} t={t} />
                )}
                {message.body && (
                  <p
                    className={`whitespace-pre-wrap break-words leading-relaxed ${
                      message.kind === "text" ? "" : "mt-2"
                    } ${framed ? "px-2" : ""}`}
                  >
                    {message.body}
                  </p>
                )}
                <p
                  className={`mt-1 text-right text-[10px] ${framed ? "px-2 pb-0.5" : ""} ${
                    mine ? "text-white/55" : "muted"
                  }`}
                >
                  {formatChatTime(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Optimistic / failed messages, always from me, always at the bottom. */}
        {outbox.map((message) => {
          const item = message.attachment;
          return (
            <div key={`out-${message.clientId}`} className="flex justify-end">
              <div
                className={`max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm shadow-sm ${
                  message.status === "failed"
                    ? "bg-rose-600 text-white"
                    : "bg-navy-900 text-white opacity-70 dark:bg-navy-600"
                }`}
              >
                {/* The blob is still local, so the preview comes from the
                    object URL rather than /api/files. */}
                {item?.kind === "photo" && item.preview && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.preview}
                    alt={t("chat.photo")}
                    className="mb-1.5 h-auto max-h-[15rem] w-auto max-w-full rounded-xl object-contain"
                  />
                )}
                {item && item.kind !== "photo" && (
                  <span className="mb-1.5 flex items-center gap-2">
                    <Icon
                      name={item.kind === "voice" ? "mic" : "file"}
                      className="size-4 shrink-0"
                    />
                    <span className="truncate">
                      {item.kind === "voice"
                        ? `${t("chat.voice")} · ${formatDuration(item.duration)}`
                        : item.file.name}
                    </span>
                  </span>
                )}
                {message.body && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.body}
                  </p>
                )}
                <p className="mt-1 flex items-center justify-end gap-2 text-[10px] text-white/70">
                  {message.status === "failed" ? (
                    <>
                      <span>{t("chat.failed")}</span>
                      <button
                        type="button"
                        onClick={() =>
                          item
                            ? void deliverAttachment(
                                message.clientId,
                                item,
                                message.body,
                              )
                            : void deliver(message.clientId, message.body)
                        }
                        className="font-semibold underline underline-offset-2 hover:text-white"
                      >
                        {t("chat.retry")}
                      </button>
                    </>
                  ) : (
                    <span>{item ? t("chat.uploading") : t("chat.sending")}</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {notice && (
        <p className="border-t bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-300">
          {notice}
        </p>
      )}

      {/* A picked photo or file, waiting for its caption and the send press. */}
      {pending && (
        <div className="flex items-center gap-3 border-t px-3 py-2">
          {pending.preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={pending.preview}
              alt=""
              className="size-12 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="muted grid size-12 shrink-0 place-items-center rounded-lg border">
              <Icon name="file" className="size-5" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {pending.file.name}
            </span>
            <span className="muted block text-xs">
              {formatBytes(pending.file.size)}
            </span>
          </span>
          <button
            type="button"
            onClick={clearPending}
            aria-label={t("chat.attachRemove")}
            className="muted grid size-9 shrink-0 place-items-center rounded-lg border transition hover:text-rose-600"
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-2 border-t p-3">
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
            <span className="truncate text-sm font-medium">
              {t("chat.record")}
            </span>
            <span className="muted ml-auto font-mono text-sm tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => stopRecording(false)}
            aria-label={t("chat.recordCancel")}
            className="muted grid size-11 shrink-0 place-items-center rounded-xl border transition hover:text-rose-600"
          >
            <Icon name="trash" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            aria-label={t("chat.recordSend")}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition hover:bg-navy-800 dark:bg-navy-600"
          >
            <Icon name="send" className="size-4" />
          </button>
        </div>
      ) : (
        <form
          onSubmit={send}
          className="relative flex items-end gap-2 border-t p-3"
        >
          {attachOpen && (
            <>
              {/* Click-away layer, below the menu but above everything else. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => setAttachOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-16 left-3 z-20 w-48 overflow-hidden rounded-xl border bg-[var(--panel)] shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAttachOpen(false);
                    photoInput.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-[var(--surface)]"
                >
                  <Icon name="image" className="size-4" />
                  {t("chat.photo")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachOpen(false);
                    fileInput.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 border-t px-3.5 py-2.5 text-sm transition hover:bg-[var(--surface)]"
                >
                  <Icon name="file" className="size-4" />
                  {t("chat.file")}
                </button>
              </div>
            </>
          )}

          {/* Resetting `value` lets the same file be picked twice in a row. */}
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              choose(e.target.files?.[0], "photo");
              e.target.value = "";
            }}
          />
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={(e) => {
              choose(e.target.files?.[0], "file");
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => setAttachOpen((open) => !open)}
            aria-label={t("chat.attach")}
            aria-expanded={attachOpen}
            className="muted grid size-11 shrink-0 place-items-center rounded-xl border transition hover:text-navy-700 dark:hover:text-gold-400"
          >
            <Icon name="paperclip" className="size-4" />
          </button>

          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(e);
              }
            }}
            rows={1}
            placeholder={pending ? t("chat.caption") : t("chat.placeholder")}
            className="scroll-thin max-h-32 min-h-11 flex-1 resize-none rounded-xl border bg-[var(--surface)] px-3.5 py-3 text-sm outline-none focus:border-navy-500"
          />

          {/* Mic while there is nothing to send — the send arrow the moment
              there is, so one slot serves both. */}
          {draft.trim() || pending ? (
            <button
              type="submit"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition hover:bg-navy-800 dark:bg-navy-600"
              aria-label={t("chat.send")}
            >
              <Icon name="send" className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              aria-label={t("chat.record")}
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition hover:bg-navy-800 dark:bg-navy-600"
            >
              <Icon name="mic" className="size-4" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}

/**
 * The attachment inside a confirmed bubble. Bytes come from `/api/files/[id]`,
 * which checks the reader — the storage path never reaches the browser.
 */
function AttachmentView({
  message,
  mine,
  t,
}: {
  message: ThreadMessage;
  mine: boolean;
  t: (key: MessageKey) => string;
}) {
  const url = `/api/files/${message.id}`;

  if (message.kind === "photo") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl"
      >
        {/* Plain <img>: next/image would proxy through the optimizer, which
            fetches without the session cookie and would 401 on every load.
            Height-led thumbnail: `w-auto` lets the aspect ratio pick the width,
            so a tall phone screenshot becomes a narrow strip instead of being
            blown up to the bubble's full width and cropped. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={message.file_name ?? t("chat.photo")}
          loading="lazy"
          className="h-auto max-h-[15rem] w-auto max-w-full object-contain"
        />
      </a>
    );
  }

  if (message.kind === "voice") {
    return (
      <span className="flex items-center gap-2">
        <audio
          controls
          preload="metadata"
          src={url}
          className="h-9 w-52 max-w-full"
        />
        {/* WebM from MediaRecorder carries no duration cue, so most players
            show "Infinity" until the clip ends — print the recorded length. */}
        {message.duration ? (
          <span
            className={`shrink-0 font-mono text-[11px] ${mine ? "text-white/60" : "muted"}`}
          >
            {formatDuration(message.duration)}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <a
      href={url}
      download={message.file_name ?? undefined}
      className={`flex items-center gap-2.5 rounded-xl px-1 py-0.5 transition ${
        mine ? "hover:bg-white/10" : "hover:bg-[var(--surface)]"
      }`}
    >
      <Icon name="file" className="size-6 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {message.file_name ?? t("chat.file")}
        </span>
        <span
          className={`block text-[11px] ${mine ? "text-white/60" : "muted"}`}
        >
          {formatBytes(message.file_size)}
        </span>
      </span>
      <Icon name="download" className="size-4 shrink-0 opacity-70" />
    </a>
  );
}

export function ChatPlaceholder() {
  const t = useT();
  return (
    <div className="panel hidden h-full flex-col items-center justify-center gap-3 p-10 text-center lg:flex">
      <span className="muted grid size-12 place-items-center rounded-full border">
        <Icon name="chat" className="size-5" />
      </span>
      <p className="muted text-sm">{t("chat.selectChat")}</p>
    </div>
  );
}

export function RoleLabel({ role }: { role: string }) {
  const t = useT();
  return <>{t(`role.${role}` as MessageKey)}</>;
}
