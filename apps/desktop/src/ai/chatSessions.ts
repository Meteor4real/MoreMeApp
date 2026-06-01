// Saved chats for the Group Terminal. Each chat has its own participant set
// and message history; you create new ones and switch between them instead of
// clearing. Persisted to localStorage.

export type ChatMsg = {
  id: string;
  agentId: string;
  name: string;
  content: string;
  kind: "user" | "agent" | "system" | "tool";
  ts: number;
  tokens?: number;     // approximate token count for this message
};

export type ChatSession = {
  id: string;
  title: string;
  participantIds: string[];   // agent ids in this chat
  msgs: ChatMsg[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "nchub.chats.v3";
const subs = new Set<(s: ChatSession[]) => void>();

export function loadChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as ChatSession[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
export function saveChats(list: ChatSession[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100))); } catch { /* ignore */ }
  subs.forEach((fn) => fn(list));
}
export function subscribeChats(fn: (s: ChatSession[]) => void): () => void {
  subs.add(fn); fn(loadChats());
  return () => subs.delete(fn);
}

export function newChat(participantIds: string[], title?: string): ChatSession {
  const now = Date.now();
  return {
    id: "chat-" + now.toString(36) + Math.random().toString(36).slice(2, 5),
    title: title || "New chat",
    participantIds,
    msgs: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ~4 chars per token is the standard rough estimate.
export function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}
