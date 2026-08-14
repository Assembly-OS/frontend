"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  PageHeader,
  Panel,
} from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { ProposalView, RunRow } from "@/lib/agents/orchestrator";
import { ACCEPTED } from "@/lib/agents/extract";
import type { MessageKey } from "@/lib/i18n";

/**
 * Speech recognition is a browser API with two spellings and no TypeScript
 * DOM typing, so it is reached through a narrow local interface rather than
 * casting `window` to `any` at each call site.
 */
interface SpeechResultList {
  length: number;
  item(index: number): { 0: { transcript: string }; isFinal: boolean };
}
interface SpeechEvent {
  resultIndex: number;
  results: SpeechResultList;
}
interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognizerCtor = new () => Recognizer;

function recognizerFactory(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognizerCtor;
    webkitSpeechRecognition?: RecognizerCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * Whether the microphone can only be held by one consumer at a time.
 *
 * Safari is that browser: with `MediaRecorder` holding the device,
 * `SpeechRecognition` yields nothing. It also refuses outright unless macOS
 * Dictation is enabled — and both failures can arrive *silently*: no text, no
 * error event, no `onend`, nothing on screen saying anything is wrong.
 *
 * So Safari does not get to try. The recorder runs and the server transcribes,
 * which is the one path that cannot fail quietly: either there is an audio file
 * at the end or there plainly is not. Nothing is lost by skipping the browser
 * here — Whisper reads Uzbek and Russian better than Safari's dictation does.
 * Chrome shares the device happily and keeps its live preview.
 */
function micIsExclusive(): boolean {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent;
  return /Safari/.test(agent) && !/Chrom(e|ium)|Edg|OPR/.test(agent);
}

/**
 * The running picture of a meeting, as the server keeps it. Mirrored here
 * rather than imported: the server module that owns it also opens the database.
 */
interface PlanItem {
  title: string;
  owner: string;
  due: string;
  status: "taklif" | "kelishildi" | "bajarilmoqda";
}
interface LiveState {
  keyPoints: string[];
  decisions: string[];
  plan: PlanItem[];
  questions: string[];
}

/** How often the recorder hands the server what it has heard since last time. */
const ROUND_MS = 60_000;

/** Timeslice for MediaRecorder — small enough that a round is never empty. */
const CHUNK_MS = 5_000;

/**
 * Auto first, and it is the default.
 *
 * A negotiation here is routinely held in three languages, often switching
 * inside one sentence, and forcing a single one made the recogniser resolve
 * every ambiguous word towards a language that was only sometimes being
 * spoken. Naming a language stays available for the meeting that genuinely is
 * monolingual, where the hint helps.
 */
const SPEECH_LANGS = [
  { code: "auto", label: "AUTO" },
  { code: "uz-UZ", label: "UZ" },
  { code: "ru-RU", label: "RU" },
  { code: "en-US", label: "EN" },
] as const;
type SpeechLang = (typeof SPEECH_LANGS)[number]["code"];

const SEVERITY: Record<string, string> = {
  P1: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
  P2: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  P3: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30",
  P4: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30",
};

interface StaffOption {
  id: number;
  login: string;
  full_name: string;
}

/** A meeting already on file, as the recordings list needs it. */
interface MeetingRecord {
  id: number;
  title: string;
  date: string;
  duration: number | null;
  company: string | null;
  summary: string | null;
  hasAudio: boolean;
  lang: string;
}

/** Fields a reviewer may correct before approving a drafted assignment. */
interface Draft {
  title: string;
  description: string;
  priority: string;
  deadline: string;
  toUserId: number;
}

const PRIORITIES = ["PAST", "ORTA", "YUQORI", "KRITIK"] as const;

export function AiClient({
  proposals,
  runs,
  staff,
  meetings,
  llmConfigured,
}: {
  proposals: ProposalView[];
  runs: RunRow[];
  staff: StaffOption[];
  meetings: MeetingRecord[];
  llmConfigured: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [tab, setTab] = useState<"document" | "meeting">("document");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  /**
   * "PDF · Yaratildi: 4 · Tasdiq kutilmoqda: 1" — a count that is zero is left
   * out, so the usual line reads as just what happened.
   */
  function outcomeText(
    format: string | undefined,
    created = 0,
    drafts = 0,
    dropped = 0,
  ): string {
    const parts = format ? [format] : [];
    parts.push(`${t("ai.created")}: ${created}`);
    if (drafts > 0) parts.push(`${t("ai.pending")}: ${drafts}`);
    if (dropped > 0) parts.push(`${t("ai.dropped")}: ${dropped}`);
    return parts.join(" · ");
  }

  /** What went wrong transcribing a recording, in the reader's language. */
  function sttError(code: string | undefined): string {
    switch (code) {
      case "STT_UNAVAILABLE":
        return t("ai.sttOffline");
      case "TOO_LONG":
        return t("ai.sttTooLong");
      case "EMPTY":
        return t("ai.sttEmpty");
      case "BAD_AUDIO":
      case "FAILED":
        return t("ai.sttFailed");
      case "TRANSCRIPT_TOO_SHORT":
        return t("ai.transcriptShort");
      default:
        return t("common.error");
    }
  }

  /* -------------------- PDF intake -------------------- */
  const pdfInput = useRef<HTMLInputElement>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  async function sendPdf(file: File) {
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch("/api/ai/document", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        status?: string;
        detail?: string;
        created?: number;
        drafts?: number;
        dropped?: number;
        format?: string;
        error?: string;
      };
      if (!response.ok) {
        setNotice({
          ok: false,
          text:
            data.error === "UNSUPPORTED_TYPE"
              ? t("ai.badFormat")
              : data.error === "NO_TEXT"
                ? t("ai.noText")
                : data.error === "UNREADABLE"
                  ? t("ai.unreadable")
                  : data.error === "TOO_LARGE"
                    ? t("ai.tooLarge")
                    : t("common.error"),
        });
        return;
      }
      setNotice(
        data.status === "blocked"
          ? { ok: false, text: data.detail ?? t("common.error") }
          : {
              ok: true,
              text: outcomeText(
                data.format,
                data.created,
                data.drafts,
                data.dropped,
              ),
            },
      );
      setPdfName(null);
      router.refresh();
    } catch {
      setNotice({ ok: false, text: t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  /* -------------------- Meeting recorder -------------------- */
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  // Recognition handles one language at a time and cannot detect it, so the
  // speaker picks. Seeded from the interface language, since that is usually
  // the language the meeting will be held in.
  // Not seeded from the interface language any more: the language somebody
  // reads the app in says nothing about the language the room will speak.
  const [speechLang, setSpeechLang] = useState<SpeechLang>("auto");
  const [elapsed, setElapsed] = useState(0);
  // A finished recording is waiting to be sent. Enough on its own: the server
  // transcribes it, so nothing has to be typed.
  const [hasAudio, setHasAudio] = useState(false);
  // Whether the browser is actually transcribing right now — which is not the
  // same as being able to: Safari can refuse after the meeting has started.
  const [sttLive, setSttLive] = useState(false);
  // The server-side session following this meeting, and the picture it keeps.
  const [liveSession, setLiveSession] = useState<number | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);
  const [rounding, setRounding] = useState(false);
  // Read from the browser rather than mirroring it into state: on the server
  // there is no SpeechRecognition, and the server snapshot says so.
  const sttAvailable = useSyncExternalStore(
    () => () => {},
    () => recognizerFactory() !== null && !micIsExclusive(),
    () => false,
  );

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const micStream = useRef<MediaStream | null>(null);
  const recognizer = useRef<Recognizer | null>(null);
  const audio = useRef<File | null>(null);
  // Recognition restarts itself on every pause; without a committed buffer the
  // text from before the pause would be overwritten by the next result batch.
  const committed = useRef("");
  // Recognition ends on its own after a silence and must be restarted — but
  // only while the meeting is still being recorded, and never after a refusal.
  const speechWanted = useRef(false);
  // How many results of the current session are already in `committed`.
  const finalCount = useRef(0);
  // Chunks already handed to the server. Everything past this index is what
  // the next round uploads — the server appends, so nothing is sent twice.
  const sentChunks = useRef(0);
  const sessionRef = useRef<number | null>(null);
  // One round at a time: a slow round must not overlap the next tick.
  const roundBusy = useRef(false);

  useEffect(() => {
    if (!recording) return;
    // The clock is read here rather than in the click handler: reading it
    // during render is what the purity rule forbids, and an effect is the
    // right place for it anyway — it starts when the recording does.
    const begin = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - begin) / 1000)),
      500,
    );
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      speechWanted.current = false;
      recognizer.current?.stop();
      micStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  /**
   * Hands the server the audio recorded since the last round.
   *
   * Only the new chunks go up — the server appends them to the recording it is
   * already holding, so an hour-long meeting uploads an hour of audio once,
   * not sixty times. `sentChunks` only advances on success, so a failed round
   * is retried with the next one rather than leaving a hole in the recording.
   */
  async function pushRound(final = false): Promise<number | null> {
    if (roundBusy.current) return sessionRef.current;
    const pending = chunks.current.slice(sentChunks.current);
    if (pending.length === 0) return sessionRef.current;

    roundBusy.current = true;
    setRounding(true);
    const upTo = chunks.current.length;
    try {
      const body = new FormData();
      body.append("audio", new Blob(pending, { type: "audio/webm" }), "part.webm");
      body.append("lang", speechLang);
      body.append("title", title.trim() || "Uchrashuv");
      if (sessionRef.current) body.append("session", String(sessionRef.current));

      const response = await fetch("/api/ai/meeting/live", {
        method: "POST",
        body,
      });
      if (!response.ok) return sessionRef.current;

      const data = (await response.json()) as {
        session?: number;
        transcript?: string;
        state?: LiveState;
      };
      sentChunks.current = upTo;
      if (data.session) {
        sessionRef.current = data.session;
        setLiveSession(data.session);
      }
      // While recording, the server's transcript is the authoritative one —
      // it has heard everything, including what this browser could not.
      if (typeof data.transcript === "string" && data.transcript.length > 0) {
        committed.current = `${data.transcript} `;
        setTranscript(data.transcript);
      }
      if (data.state) setLive(data.state);
      return sessionRef.current;
    } catch {
      // A dropped round costs nothing: the chunks stay queued for the next one.
      return sessionRef.current;
    } finally {
      roundBusy.current = false;
      setRounding(false);
      if (final) setRounding(false);
    }
  }

  // The meeting is followed while it happens, not after it ends.
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => void pushRound(), ROUND_MS);
    return () => clearInterval(timer);
    // `pushRound` reads refs and the language/title at call time, so it does
    // not need to be a dependency — re-creating the interval on every
    // keystroke in the title field would reset the round clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  /** Builds a recognizer for one language, wired to the shared buffers. */
  function makeRecognizer(code: SpeechLang): Recognizer | null {
    const Ctor = recognizerFactory();
    if (!Ctor) return null;

    const engine = new Ctor();
    engine.lang = code;
    engine.continuous = true;
    engine.interimResults = true;
    finalCount.current = 0;

    engine.onresult = (event) => {
      let interim = "";
      // Browsers disagree on `resultIndex`: some send only what changed, Safari
      // re-sends the whole list. Counting how many results have already been
      // committed works for both and cannot commit a sentence twice.
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results.item(i);
        if (!result.isFinal) {
          interim += result[0].transcript;
        } else if (i >= finalCount.current) {
          committed.current += `${result[0].transcript} `;
          finalCount.current = i + 1;
        }
      }
      setTranscript((committed.current + interim).trimStart());
    };

    // A pause ends the session; restart it until the user stops the meeting.
    engine.onend = () => {
      if (!speechWanted.current) return;
      finalCount.current = 0; // a new session numbers its results from zero
      try {
        engine.start();
      } catch {
        /* already restarting */
      }
    };

    // Silence here was the bug: a refused microphone looked exactly like a
    // quiet room. Anything fatal now stops the restart loop and falls back to
    // recording the audio, which the server transcribes after upload — so a
    // browser that will not transcribe no longer costs anyone the meeting.
    engine.onerror = (event) => {
      const reason = event?.error ?? "";
      if (
        reason === "not-allowed" ||
        reason === "service-not-allowed" ||
        reason === "audio-capture"
      ) {
        speechWanted.current = false;
        setSttLive(false);
        setNotice({ ok: true, text: t("ai.sttFallback") });
        void startAudioCapture();
      }
      // "no-speech", "aborted" and "network" are transient — `onend` recovers.
    };

    return engine;
  }

  function startSpeech(code: SpeechLang) {
    const engine = makeRecognizer(code);
    if (!engine) return;
    speechWanted.current = true;
    setSttLive(true);
    recognizer.current = engine;
    try {
      engine.start();
    } catch {
      // The previous session may not have released the device yet.
      setTimeout(() => {
        if (!speechWanted.current) return;
        try {
          engine.start();
        } catch {
          /* give up quietly; the transcript can still be typed */
        }
      }, 250);
    }
  }

  function stopSpeech() {
    speechWanted.current = false;
    setSttLive(false);
    const engine = recognizer.current;
    recognizer.current = null;
    if (!engine) return;
    // Drop the restart handler first, or `onend` immediately revives it.
    engine.onend = null;
    engine.onresult = null;
    engine.onerror = null;
    engine.stop();
  }

  /**
   * Starts capturing audio. Also the recovery path: when recognition is
   * refused mid-recording this is what saves the meeting, so it is safe to
   * call twice and does nothing the second time.
   */
  async function startAudioCapture(): Promise<boolean> {
    if (recorder.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice({ ok: false, text: t("chat.micUnsupported") });
      return false;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNotice({ ok: false, text: t("chat.micDenied") });
      return false;
    }

    micStream.current = stream;
    chunks.current = [];

    const media = new MediaRecorder(stream);
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      micStream.current = null;
      // Chunks are NOT cleared here — the final round still has to send the
      // tail, and the whole-file fallback is built from them if it never did.
      const blob = new Blob(chunks.current, {
        type: media.mimeType || "audio/webm",
      });
      if (blob.size > 0) {
        audio.current = new File([blob], "meeting.webm", { type: blob.type });
      }
      setHasAudio(blob.size > 0);
    };
    recorder.current = media;
    // A timeslice, so there is always something to hand over at the next
    // round instead of one blob that only exists once the meeting ends.
    media.start(CHUNK_MS);
    return true;
  }

  async function startRecording() {
    if (recording) return;

    committed.current = transcript ? `${transcript} ` : "";
    audio.current = null;
    chunks.current = [];
    sentChunks.current = 0;
    sessionRef.current = null;
    setHasAudio(false);
    setLiveSession(null);
    setLive(null);

    // The recording always happens. It is the only part of this that cannot
    // fail without saying so, and everything else is built on top of it.
    if (!(await startAudioCapture())) return;

    // Live transcription on top, where the browser can do it without taking
    // the microphone away from the recorder — which today means Chrome. Not on
    // AUTO: the Web Speech API must be told one language and cannot detect,
    // so a live preview there would be a confident transcription of the wrong
    // language sitting on screen while the server does the real work.
    if (speechLang !== "auto" && recognizerFactory() && !micIsExclusive()) {
      startSpeech(speechLang);
    }

    setElapsed(0);
    setRecording(true);
  }

  /**
   * Switches recognition language. Mid-recording this tears down the engine and
   * starts a fresh one: the audio recorder keeps running and the committed
   * transcript is untouched, so a meeting that changes language mid-way stays
   * one continuous recording.
   */
  function switchLang(code: SpeechLang) {
    setSpeechLang(code);
    if (!recording) return;
    stopSpeech();
    if (code !== "auto") startSpeech(code);
  }

  function stopRecording() {
    stopSpeech();
    const media = recorder.current;
    recorder.current = null;
    if (media && media.state !== "inactive") {
      // Flush the current timeslice so the closing minute is not lost, then
      // send it — `onstop` fires after the last `ondataavailable`.
      media.requestData();
      media.stop();
    } else {
      micStream.current?.getTracks().forEach((track) => track.stop());
      micStream.current = null;
    }
    setRecording(false);
    // The tail goes up on its own; the analyse button waits for nothing.
    setTimeout(() => void pushRound(true), 400);
  }

  async function sendMeeting() {
    // Any of three is enough: a live session the server already followed, text
    // the browser heard, or audio the server can still hear.
    if (!sessionRef.current && transcript.trim().length < 40 && !audio.current) {
      setNotice({ ok: false, text: t("ai.transcriptShort") });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      // Anything recorded since the last round goes up first, so the closing
      // minutes are part of the analysis rather than lost at the buzzer.
      const session = await pushRound(true);

      const form = new FormData();
      form.append("title", title.trim() || "Uchrashuv");
      form.append("transcript", transcript.trim());
      form.append("duration", String(elapsed));
      form.append("lang", speechLang);
      if (session) {
        // The server holds the recording and the transcript already.
        form.append("live", String(session));
      } else if (audio.current) {
        form.append("audio", audio.current, "meeting.webm");
      }

      const response = await fetch("/api/ai/meeting", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        status?: string;
        detail?: string;
        created?: number;
        drafts?: number;
        dropped?: number;
        keyPoints?: string[];
        transcribedHere?: boolean;
        transcript?: string;
        error?: string;
      };
      if (!response.ok) {
        setNotice({ ok: false, text: sttError(data.error) });
        return;
      }
      setNotice(
        data.status === "blocked"
          ? { ok: false, text: data.detail ?? t("common.error") }
          : {
              ok: true,
              text: outcomeText(
                `${t("ai.keyPoints")}: ${data.keyPoints?.length ?? 0}`,
                data.created,
                data.drafts,
                data.dropped,
              ),
            },
      );
      // Show what the server heard rather than clearing the box: a mishearing
      // is only findable by the person who was in the room.
      setTranscript(data.transcribedHere ? (data.transcript ?? "") : "");
      setTitle("");
      audio.current = null;
      chunks.current = [];
      sentChunks.current = 0;
      sessionRef.current = null;
      setHasAudio(false);
      setLiveSession(null);
      setLive(null);
      router.refresh();
    } catch {
      setNotice({ ok: false, text: t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  /* -------------------- Review -------------------- */
  // The proposal currently open for correction, and the values as edited.
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  /** Reads the draft back out of the proposal's stored payload. */
  function openEditor(item: ProposalView) {
    let payload: Partial<Draft> & { toUserId?: number } = {};
    try {
      payload = item.payload ? JSON.parse(item.payload) : {};
    } catch {
      /* a malformed payload edits from the visible fields instead */
    }
    setEditing(item.id);
    setDraft({
      title: String(payload.title ?? item.title),
      description: String(payload.description ?? ""),
      priority: String(payload.priority ?? "ORTA"),
      deadline: String(payload.deadline ?? ""),
      toUserId: Number(payload.toUserId ?? staff[0]?.id ?? 0),
    });
  }

  function closeEditor() {
    setEditing(null);
    setDraft(null);
  }

  async function decide(
    id: number,
    decision: "approve" | "reject",
    edits?: Draft,
  ) {
    setBusy(true);
    try {
      const response = await fetch(`/api/ai/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          edits
            ? {
                decision,
                edits: {
                  ...edits,
                  // An empty date field means "no deadline", not "unchanged".
                  deadline: edits.deadline || null,
                },
              }
            : { decision },
        ),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        result?: string;
        error?: string;
      };
      setNotice(
        data.ok
          ? { ok: true, text: data.result ?? t("admin.saved") }
          : {
              ok: false,
              text:
                data.error === "NOT_ASSIGNABLE"
                  ? t("ai.notAssignable")
                  : (data.error ?? t("common.error")),
            },
      );
      if (data.ok) closeEditor();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const pending = proposals.filter((item) => item.status === "pending");

  /**
   * History is about the assignments — what was created, what was rejected.
   *
   * The briefs sent to the chairman and his assistant used to land here too,
   * one entry per recipient, each carrying the meeting's entire summary. Two
   * copies of the same page of text buried the decisions this list exists to
   * show, and the brief itself already has a home on the conclusions page.
   */
  const settled = proposals.filter(
    (item) =>
      item.status !== "pending" &&
      item.action !== "notify" &&
      item.action !== "report",
  );

  return (
    <>
      <PageHeader title={t("ai.title")} description={t("ai.subtitle")} />

      {!llmConfigured && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t("agent.llmOff")}
        </p>
      )}
      {notice && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mb-5 flex gap-1 rounded-xl bg-[var(--surface)] p-1 sm:w-fit">
        {(["document", "meeting"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              tab === value
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "muted hover:opacity-80"
            }`}
          >
            {value === "document" ? t("ai.tabDocument") : t("ai.tabMeeting")}
          </button>
        ))}
      </div>

      {tab === "document" ? (
        <Panel title={t("ai.tabDocument")} className="mb-5">
          <div className="p-5">
            <p className="muted mb-1 text-sm">{t("ai.documentHint")}</p>
            <p className="muted mb-3 text-xs">{t("ai.formats")}</p>
            <input
              ref={pdfInput}
              type="file"
              accept={ACCEPTED}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) {
                  setPdfName(file.name);
                  void sendPdf(file);
                }
              }}
            />
            <Button
              size="lg"
              icon="file"
              onClick={() => pdfInput.current?.click()}
              disabled={busy}
            >
              {busy && pdfName ? t("ai.analyzing") : t("ai.pickFile")}
            </Button>
            {pdfName && (
              <p className="muted mt-2 text-xs">{pdfName}</p>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title={t("ai.tabMeeting")} className="mb-5">
          <div className="space-y-3 p-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("ai.meetingTitle")}
              className={FIELD}
            />

            <div className="flex flex-wrap items-center gap-3">
              {recording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2.5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
                >
                  <span className="size-2.5 animate-pulse rounded-full bg-white" />
                  {t("ai.stopRecording")} · {formatDuration(elapsed)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={busy}
                  className="flex items-center gap-2.5 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50 dark:bg-navy-600"
                >
                  <Icon name="mic" className="size-4" />
                  {t("ai.startRecording")}
                </button>
              )}
              <div className="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
                {SPEECH_LANGS.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => switchLang(option.code)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      speechLang === option.code
                        ? "bg-navy-900 text-white dark:bg-navy-600"
                        : "muted hover:opacity-80"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="muted text-xs">
                {(recording ? sttLive : sttAvailable)
                  ? t("ai.sttOn")
                  : t("ai.sttServer")}
              </span>
            </div>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={9}
              placeholder={t("ai.transcriptPlaceholder")}
              className={`${FIELD} scroll-thin resize-y font-mono text-xs leading-relaxed`}
            />

            {/* The meeting as the agent currently understands it. Appears the
                moment there is something to show and updates every minute, so
                the room can correct a misread decision while it still matters. */}
            {live &&
              (live.keyPoints.length > 0 ||
                live.decisions.length > 0 ||
                live.plan.length > 0 ||
                live.questions.length > 0) && (
                <div className="space-y-3 rounded-xl border border-dashed p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    {t("ai.livePicture")}
                    {rounding && (
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    )}
                  </p>

                  {live.keyPoints.length > 0 && (
                    <div>
                      <p className="muted mb-1 text-[11px] font-medium">
                        {t("ai.keyPoints")}
                      </p>
                      <ul className="space-y-0.5 text-xs">
                        {live.keyPoints.map((point) => (
                          <li key={point}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {live.decisions.length > 0 && (
                    <div>
                      <p className="muted mb-1 text-[11px] font-medium">
                        {t("ai.liveDecisions")}
                      </p>
                      <ul className="space-y-0.5 text-xs">
                        {live.decisions.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {live.plan.length > 0 && (
                    <div>
                      <p className="muted mb-1 text-[11px] font-medium">
                        {t("ai.livePlan")}
                      </p>
                      <ul className="space-y-1 text-xs">
                        {live.plan.map((item) => (
                          <li
                            key={`${item.title}-${item.owner}`}
                            className="flex flex-wrap items-baseline gap-x-2"
                          >
                            <span className="font-medium">{item.title}</span>
                            {item.owner && (
                              <span className="muted font-mono text-[11px]">
                                @{item.owner}
                              </span>
                            )}
                            {item.due && (
                              <span className="muted text-[11px]">{item.due}</span>
                            )}
                            <Badge
                              className={
                                item.status === "kelishildi"
                                  ? SEVERITY.P2
                                  : item.status === "bajarilmoqda"
                                    ? SEVERITY.P3
                                    : SEVERITY.P4
                              }
                            >
                              {t(`ai.status.${item.status}` as MessageKey)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {live.questions.length > 0 && (
                    <div>
                      <p className="muted mb-1 text-[11px] font-medium">
                        {t("ai.liveQuestions")}
                      </p>
                      <ul className="space-y-0.5 text-xs">
                        {live.questions.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            {/* An empty transcript box after recording looks broken unless it
                says otherwise — in Safari that is the normal, working state. */}
            {hasAudio && transcript.trim().length < 40 && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {t("ai.readyToSend")}
              </p>
            )}

            <p className="muted text-xs">{t("ai.autoNote")}</p>

            <button
              type="button"
              onClick={() => void sendMeeting()}
              disabled={
                busy ||
                recording ||
                (transcript.trim().length < 40 && !hasAudio && !liveSession)
              }
              className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-40 dark:bg-navy-600"
            >
              {busy
                ? transcript.trim().length < 40
                  ? t("ai.transcribing")
                  : t("ai.analyzing")
                : t("ai.analyze")}
            </button>
          </div>
        </Panel>
      )}

      {/* Each tab keeps its own second half. Recording a meeting, what you
          want underneath is the meetings already on file — not a queue of
          drafts waiting on somebody else. */}
      {tab === "meeting" && (
        <Panel title={`${t("ai.recordings")}: ${meetings.length}`} className="mb-5">
          {meetings.length === 0 ? (
            <EmptyState bare icon="mic" text={t("ai.noRecordings")} />
          ) : (
            <ul className="divide-y">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold">{meeting.title}</p>
                    {meeting.company && (
                      <span className="muted text-xs">{meeting.company}</span>
                    )}
                    <span className="muted ml-auto text-[11px] tabular-nums">
                      {formatDateTime(meeting.date)}
                      {meeting.duration
                        ? ` · ${formatDuration(meeting.duration)}`
                        : ""}
                    </span>
                  </div>

                  {meeting.summary && (
                    <p className="muted mt-1 text-xs leading-relaxed">
                      {meeting.summary}
                    </p>
                  )}

                  {meeting.hasAudio ? (
                    /* Native controls on purpose: they already work with the
                       keyboard, with screen readers and with the iOS lock
                       screen, and nothing here needs a custom player. */
                    <audio
                      controls
                      preload="none"
                      src={`/api/meetings/${meeting.id}/audio`}
                      className="mt-2 h-9 w-full max-w-md"
                    />
                  ) : (
                    <p className="muted mt-1.5 text-[11px]">
                      {t("ai.noAudioKept")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* The review queue belongs to the document tab. */}
      {tab === "document" && (
      <Panel title={`${t("ai.pending")}: ${pending.length}`} className="mb-5">
        {pending.length === 0 ? (
          <p className="muted px-5 py-8 text-sm">{t("agent.noProposals")}</p>
        ) : (
          <ul className="divide-y">
            {pending.map((item) => (
              <li key={item.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={SEVERITY[item.severity] ?? SEVERITY.P3}>
                    {item.severity}
                  </Badge>
                  <span className="muted font-mono text-[11px]">
                    {item.action}
                  </span>
                  <span className="muted ml-auto text-[11px]">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold">{item.title}</p>
                <p className="muted mt-1 whitespace-pre-wrap text-xs">
                  {item.body}
                </p>
                {editing === item.id && draft ? (
                  /* Correcting before approving. The model read a document;
                     the head reading this knows the department. */
                  <div className="mt-3 space-y-2 rounded-xl border border-dashed p-3">
                    <label className="block">
                      <span className="muted mb-1 block text-[11px] font-medium">
                        {t("form.title")}
                      </span>
                      <input
                        value={draft.title}
                        onChange={(e) =>
                          setDraft({ ...draft, title: e.target.value })
                        }
                        className={FIELD}
                      />
                    </label>

                    <label className="block">
                      <span className="muted mb-1 block text-[11px] font-medium">
                        {t("form.description")}
                      </span>
                      <textarea
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                        rows={3}
                        className={`${FIELD} resize-y`}
                      />
                    </label>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block">
                        <span className="muted mb-1 block text-[11px] font-medium">
                          {t("form.executor")}
                        </span>
                        <select
                          value={draft.toUserId}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              toUserId: Number(e.target.value),
                            })
                          }
                          className={FIELD}
                        >
                          {staff.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.full_name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="muted mb-1 block text-[11px] font-medium">
                          {t("form.priority")}
                        </span>
                        <select
                          value={draft.priority}
                          onChange={(e) =>
                            setDraft({ ...draft, priority: e.target.value })
                          }
                          className={FIELD}
                        >
                          {PRIORITIES.map((level) => (
                            <option key={level} value={level}>
                              {t(`priority.${level}` as MessageKey)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="muted mb-1 block text-[11px] font-medium">
                          {t("form.deadline")}
                        </span>
                        <input
                          type="date"
                          value={draft.deadline}
                          onChange={(e) =>
                            setDraft({ ...draft, deadline: e.target.value })
                          }
                          className={FIELD}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void decide(item.id, "approve", draft)}
                        disabled={busy || !draft.title.trim() || !draft.toUserId}
                        className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                      >
                        {t("ai.saveAndCreate")}
                      </button>
                      <button
                        type="button"
                        onClick={closeEditor}
                        disabled={busy}
                        className="muted rounded-lg border px-3.5 py-1.5 text-xs font-medium transition disabled:opacity-40"
                      >
                        {t("ai.cancelEdit")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void decide(item.id, "approve")}
                      disabled={busy}
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {item.action === "suggest_task"
                        ? t("ai.createTask")
                        : t("agent.approve")}
                    </button>
                    {item.action === "suggest_task" && (
                      <button
                        type="button"
                        onClick={() => openEditor(item)}
                        disabled={busy}
                        className="muted rounded-lg border px-3.5 py-1.5 text-xs font-medium transition hover:text-navy-700 disabled:opacity-40 dark:hover:text-navy-300"
                      >
                        {t("ai.edit")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void decide(item.id, "reject")}
                      disabled={busy}
                      className="muted rounded-lg border px-3.5 py-1.5 text-xs font-medium transition hover:text-rose-600 disabled:opacity-40"
                    >
                      {t("agent.reject")}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      )}

      <Panel title={t("ai.history")}>
        {settled.length === 0 && runs.length === 0 ? (
          <p className="muted px-5 py-8 text-sm">{t("agent.noRuns")}</p>
        ) : (
          <ul className="scroll-thin max-h-96 divide-y overflow-y-auto">
            {settled.map((item) => (
              <li key={item.id} className="px-5 py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{item.title}</span>
                  <span className="muted font-mono text-[11px]">
                    {item.status}
                  </span>
                  {item.result && (
                    <span className="muted text-[11px]">{item.result}</span>
                  )}
                  <span className="muted ml-auto text-[11px]">
                    {formatDateTime(item.created_at)}
                  </span>
                </p>
                {item.status !== "rejected" && (
                  <p className="muted mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs">
                    {item.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
