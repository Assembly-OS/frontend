"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { onPresence, onTyping } from "@/components/realtime-bus";
import { formatChatTime, initials } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";

export interface ConversationItem {
  id: number;
  login: string;
  full_name: string;
  role: string;
  position: string | null;
  last_body: string;
  last_at: string;
  unread: number;
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

export function ConversationList({
  conversations,
  people,
  raisLogin,
  meLogin,
  onlineLogins,
}: {
  conversations: ConversationItem[];
  people: PersonItem[];
  raisLogin: string | null;
  meLogin: string;
  onlineLogins: string[];
}) {
  const t = useT();
  const params = useParams<{ login?: string }>();
  const active = params?.login ? decodeURIComponent(params.login) : null;

  const [tab, setTab] = useState<"chats" | "people">(
    conversations.length > 0 ? "chats" : "people",
  );
  const [filter, setFilter] = useState("");

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

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: matched.filter((person) => person.group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
          {(["chats", "people"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === value
                  ? "bg-navy-900 text-white dark:bg-navy-600"
                  : "muted hover:opacity-80"
              }`}
            >
              {value === "chats" ? t("chat.tabChats") : t("chat.tabPeople")}
              {value === "chats" && conversations.length > 0 && (
                <span className="ml-1.5 opacity-70">{conversations.length}</span>
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
        {tab === "chats" ? (
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
                          {conversation.last_body}
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

            {groups.length === 0 && (
              <p className="muted px-2 py-4 text-center text-xs">
                {t("chat.notFound")}
              </p>
            )}

            {groups.map((entry) => (
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
  body: string;
  created_at: string;
}

/** A message the user has sent that is not yet confirmed by the server. */
interface Outgoing {
  clientId: number;
  body: string;
  created_at: string;
  status: "sending" | "failed";
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
  meId,
  initial,
  initialHasMore,
}: {
  partner: {
    login: string;
    full_name: string;
    roleLabel: string;
    position: string | null;
    online: boolean;
    lastSeen: string | null;
  };
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
  const [presence, setPresence] = useState({
    online: partner.online,
    lastSeen: partner.lastSeen,
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
  const [seenLogin, setSeenLogin] = useState(partner.login);
  if (seenLogin !== partner.login) {
    setSeenLogin(partner.login);
    setPresence({ online: partner.online, lastSeen: partner.lastSeen });
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
      const response = await fetch(
        `/api/chat/${partner.login}?before=${oldest}`,
      );
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
  }, [partner.login]);

  // Presence for this partner arrives over the same stream via the in-tab bus.
  useEffect(() => {
    return onPresence((event) => {
      if (event.login !== partner.login) return;
      setPresence({ online: event.online, lastSeen: event.lastSeen });
      if (event.online) setPartnerTyping(false);
    });
  }, [partner.login]);

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
      const response = await fetch(`/api/chat/${partner.login}`, {
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

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
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
    if (value && now - lastPing.current > TYPING_PING_MS) {
      lastPing.current = now;
      void fetch(`/api/chat/${partner.login}/typing`, { method: "POST" }).catch(
        () => {},
      );
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
        <Avatar name={partner.full_name} online={presence.online} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{partner.full_name}</p>
          <p className="muted truncate text-xs">
            <span className="font-mono">@{partner.login}</span> ·{" "}
            {partner.position ?? partner.roleLabel}
          </p>
          <p className="truncate text-xs">
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
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  mine
                    ? "rounded-br-md bg-navy-900 text-white dark:bg-navy-600"
                    : "rounded-bl-md bg-[var(--panel)]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.body}
                </p>
                <p
                  className={`mt-1 text-right text-[10px] ${
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
        {outbox.map((message) => (
          <div key={`out-${message.clientId}`} className="flex justify-end">
            <div
              className={`max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm shadow-sm ${
                message.status === "failed"
                  ? "bg-rose-600 text-white"
                  : "bg-navy-900 text-white opacity-70 dark:bg-navy-600"
              }`}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.body}
              </p>
              <p className="mt-1 flex items-center justify-end gap-2 text-[10px] text-white/70">
                {message.status === "failed" ? (
                  <>
                    <span>{t("chat.failed")}</span>
                    <button
                      type="button"
                      onClick={() => void deliver(message.clientId, message.body)}
                      className="font-semibold underline underline-offset-2 hover:text-white"
                    >
                      {t("chat.retry")}
                    </button>
                  </>
                ) : (
                  <span>{t("chat.sending")}</span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
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
          placeholder={t("chat.placeholder")}
          className="scroll-thin max-h-32 min-h-11 flex-1 resize-none rounded-xl border bg-[var(--surface)] px-3.5 py-3 text-sm outline-none focus:border-navy-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition hover:bg-navy-800 disabled:opacity-40 dark:bg-navy-600"
          aria-label={t("chat.send")}
        >
          <Icon name="send" className="size-4" />
        </button>
      </form>
    </div>
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
