// Documents — our-skinned Google Docs. The connection is intentionally the
// easiest possible for the user: they sign into Google inside the embedded
// webview (cookies persist in the persist:hub partition), and add docs by
// pasting a share link. Each doc can be blocked from the AIs individually.
// The AIs read a non-blocked doc via its plain-text export endpoint.

export type DocEntry = { id: string; title: string; blocked?: boolean; addedAt: number };
type DocsState = { connected: boolean; docs: DocEntry[] };

const KEY = "nchub.documents.v1";
const subs = new Set<(s: DocsState) => void>();

export function loadDocs(): DocsState {
  try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r) as DocsState; return { connected: !!s.connected, docs: Array.isArray(s.docs) ? s.docs : [] }; } }
  catch { /* ignore */ }
  return { connected: false, docs: [] };
}
export function saveDocs(s: DocsState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  subs.forEach((fn) => fn(s));
}
export function subscribeDocs(fn: (s: DocsState) => void): () => void {
  subs.add(fn); fn(loadDocs());
  return () => subs.delete(fn);
}
export function docsConnected(): boolean { return loadDocs().connected; }
export function setConnected(v: boolean) { const s = loadDocs(); saveDocs({ ...s, connected: v }); }

// Extract a Google Docs document id from a pasted URL or raw id.
export function extractDocId(input: string): string | null {
  const t = input.trim();
  const m = t.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) || t.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(t)) return t;
  return null;
}
export function addDoc(input: string, title?: string): DocEntry | null {
  const id = extractDocId(input);
  if (!id) return null;
  const s = loadDocs();
  if (s.docs.some((d) => d.id === id)) return s.docs.find((d) => d.id === id) || null;
  const entry: DocEntry = { id, title: title?.trim() || "Untitled document", blocked: false, addedAt: Date.now() };
  saveDocs({ ...s, docs: [entry, ...s.docs] });
  return entry;
}
export function removeDoc(id: string) { const s = loadDocs(); saveDocs({ ...s, docs: s.docs.filter((d) => d.id !== id) }); }
export function setDocBlocked(id: string, blocked: boolean) { const s = loadDocs(); saveDocs({ ...s, docs: s.docs.map((d) => d.id === id ? { ...d, blocked } : d) }); }
export function renameDoc(id: string, title: string) { const s = loadDocs(); saveDocs({ ...s, docs: s.docs.map((d) => d.id === id ? { ...d, title } : d) }); }
export function docUrl(id: string): string { return `https://docs.google.com/document/d/${id}/edit`; }
