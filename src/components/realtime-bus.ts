/**
 * A one-tab event bus that lets components share the single SSE connection
 * without prop-drilling or a context provider. <LiveUpdates> owns the actual
 * EventSource; when a "typing" frame arrives it calls {@link emitTyping}, and any
 * open <Thread> that subscribed with {@link onTyping} hears about it. Plain
 * module state — one instance per browser tab, which is exactly the scope we want.
 */
export interface TypingEvent {
  /** Login of the person who is typing. */
  from: string;
}

export interface PresenceEvent {
  login: string;
  online: boolean;
  lastSeen: string | null;
}

type TypingHandler = (event: TypingEvent) => void;
type PresenceHandler = (event: PresenceEvent) => void;

const typingHandlers = new Set<TypingHandler>();
const presenceHandlers = new Set<PresenceHandler>();

export function emitTyping(event: TypingEvent): void {
  for (const handler of typingHandlers) handler(event);
}

export function onTyping(handler: TypingHandler): () => void {
  typingHandlers.add(handler);
  return () => {
    typingHandlers.delete(handler);
  };
}

export function emitPresence(event: PresenceEvent): void {
  for (const handler of presenceHandlers) handler(event);
}

export function onPresence(handler: PresenceHandler): () => void {
  presenceHandlers.add(handler);
  return () => {
    presenceHandlers.delete(handler);
  };
}
