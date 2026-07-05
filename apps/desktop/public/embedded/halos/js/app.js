/* ═══════════════════════════════════════════════
   HALOS INTERFACE v3.5 — app.js
   S.P.A.C.E. · Astralex Division
   ═══════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════
   AGENT NAME HELPER
══════════════════════════════ */
/**
 * Ensures the displayed name always reads "Agent <NAME>".
 * If the name already starts with "Agent " (case-sensitive), it is returned as-is.
 * Otherwise "Agent " is prepended.
 */
function formatAgentName(name) {
  if (!name) return 'Agent';
  if (name.startsWith('Agent ')) return name;
  return 'Agent ' + name;
}

/* ══════════════════════════════
   LOGO PRESETS
══════════════════════════════ */
const LOGOS = [
  { id:'cyber-pyramid', label:'Cyber Pyramid', svg:`<polygon points="20,2 38,34 2,34" stroke="var(--accent)" stroke-width="2" fill="none"/><polygon points="20,10 32,32 8,32" stroke="var(--accent2)" stroke-width="1" fill="none" opacity="0.5"/><circle cx="20" cy="23" r="4" fill="var(--accent)"/><line x1="20" y1="2" x2="20" y2="19" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 2"/>` },
  { id:'space-tree', label:'Space Tree', svg:`<rect x="17" y="22" width="6" height="14" stroke="var(--accent)" stroke-width="1.5" fill="none"/><polygon points="20,3 34,18 6,18" stroke="var(--accent)" stroke-width="1.8" fill="none"/><polygon points="20,10 30,22 10,22" stroke="var(--accent2)" stroke-width="1.2" fill="none" opacity="0.6"/><line x1="6" y1="22" x2="2" y2="28" stroke="var(--accent)" stroke-width="1.2" opacity="0.5"/><line x1="34" y1="22" x2="38" y2="28" stroke="var(--accent)" stroke-width="1.2" opacity="0.5"/>` },
  { id:'star-chaser', label:'Star Chaser', svg:`<ellipse cx="20" cy="20" rx="18" ry="8" stroke="var(--accent)" stroke-width="1.8" fill="none"/><ellipse cx="20" cy="20" rx="18" ry="8" stroke="var(--accent)" stroke-width="1.8" fill="none" transform="rotate(60 20 20)" opacity="0.5"/><ellipse cx="20" cy="20" rx="18" ry="8" stroke="var(--accent)" stroke-width="1.8" fill="none" transform="rotate(120 20 20)" opacity="0.3"/><circle cx="20" cy="20" r="4" fill="var(--accent)"/>` },
  { id:'saturn-suit', label:'S.A.T.U.R.N.', svg:`<circle cx="20" cy="16" r="8" stroke="var(--accent)" stroke-width="1.8" fill="none"/><rect x="14" y="22" width="12" height="14" rx="2" stroke="var(--accent)" stroke-width="1.8" fill="none"/><line x1="10" y1="24" x2="6" y2="32" stroke="var(--accent2)" stroke-width="1.5"/><line x1="30" y1="24" x2="34" y2="32" stroke="var(--accent2)" stroke-width="1.5"/>` },
  { id:'dyson-swarm', label:'Dyson Swarm', svg:`<circle cx="20" cy="20" r="6" fill="var(--accent)" opacity="0.9"/><circle cx="20" cy="20" r="12" stroke="var(--accent)" stroke-width="1" fill="none" stroke-dasharray="3 2"/><circle cx="20" cy="20" r="17" stroke="var(--accent2)" stroke-width="0.8" fill="none" stroke-dasharray="2 3"/><circle cx="20" cy="8" r="1.5" fill="var(--accent)"/><circle cx="32" cy="20" r="1.5" fill="var(--accent)"/><circle cx="20" cy="32" r="1.5" fill="var(--accent)"/><circle cx="8" cy="20" r="1.5" fill="var(--accent)"/>` },
  { id:'nova-terris', label:'Nova Terris', svg:`<circle cx="20" cy="20" r="16" stroke="var(--accent)" stroke-width="1.5" fill="none"/><line x1="4" y1="20" x2="36" y2="20" stroke="var(--accent2)" stroke-width="0.8" opacity="0.5"/><line x1="20" y1="4" x2="20" y2="36" stroke="var(--accent2)" stroke-width="0.8" opacity="0.5"/><rect x="12" y="8" width="5" height="8" rx="1" stroke="var(--accent)" stroke-width="1.2" fill="none"/><rect x="23" y="12" width="4" height="12" rx="1" stroke="var(--accent)" stroke-width="1.2" fill="none"/>` },
  { id:'meteor-orb', label:'The Orb', svg:`<circle cx="20" cy="20" r="12" stroke="var(--accent)" stroke-width="2" fill="none"/><circle cx="20" cy="20" r="6" fill="var(--accent)" opacity="0.6"/><circle cx="20" cy="20" r="3" fill="var(--accent)"/><circle cx="20" cy="20" r="17" stroke="var(--accent)" stroke-width="0.8" fill="none" opacity="0.3" stroke-dasharray="3 3"/>` },
  { id:'astralex', label:'Astralex', svg:`<path d="M20 4 L24 16 L36 16 L26 24 L30 36 L20 28 L10 36 L14 24 L4 16 L16 16 Z" stroke="var(--accent)" stroke-width="1.8" fill="none"/><circle cx="20" cy="20" r="3" fill="var(--accent)"/>` },
  { id:'cosmos-crew', label:'Cosmos Crew', svg:`<circle cx="20" cy="20" r="16" stroke="var(--accent)" stroke-width="1.5" fill="none"/><polygon points="20,8 23,17 32,17 25,23 28,32 20,26 12,32 15,23 8,17 17,17" stroke="var(--accent)" stroke-width="1.5" fill="none"/>` },
  { id:'cybertank', label:'Cybertank', svg:`<rect x="4" y="20" width="32" height="14" rx="2" stroke="var(--accent)" stroke-width="1.8" fill="none"/><rect x="10" y="14" width="20" height="8" rx="1" stroke="var(--accent)" stroke-width="1.5" fill="none"/><line x1="30" y1="18" x2="38" y2="16" stroke="var(--accent2)" stroke-width="2"/><circle cx="10" cy="34" r="4" stroke="var(--accent)" stroke-width="1.5" fill="none"/><circle cx="30" cy="34" r="4" stroke="var(--accent)" stroke-width="1.5" fill="none"/>` },
  { id:'dark-matter', label:'Dark Matter', svg:`<rect x="12" y="6" width="16" height="28" rx="2" stroke="var(--accent)" stroke-width="1.8" fill="none" transform="rotate(15 20 20)"/><rect x="12" y="6" width="16" height="28" rx="2" stroke="var(--accent2)" stroke-width="1" fill="none" transform="rotate(-15 20 20)" opacity="0.5"/><circle cx="20" cy="20" r="4" fill="var(--accent)" opacity="0.8"/>` },
  { id:'antrosa', label:'Antrosa', svg:`<circle cx="20" cy="20" r="14" stroke="var(--accent)" stroke-width="1.8" fill="none"/><ellipse cx="20" cy="20" rx="14" ry="5" stroke="var(--accent2)" stroke-width="1" fill="none" opacity="0.5"/><circle cx="20" cy="20" r="3" fill="var(--accent)"/>` },
  { id:'stellar-engine', label:'Stellar Engine', svg:`<circle cx="20" cy="20" r="8" fill="var(--accent)" opacity="0.3"/><circle cx="20" cy="20" r="8" stroke="var(--accent)" stroke-width="1.8" fill="none"/><path d="M20 12 L16 4 M20 12 L20 4 M20 12 L24 4" stroke="var(--accent)" stroke-width="1.5"/>` },
  { id:'portal', label:'Portal', svg:`<ellipse cx="20" cy="20" rx="16" ry="10" stroke="var(--accent)" stroke-width="2" fill="none"/><ellipse cx="20" cy="20" rx="10" ry="6" stroke="var(--accent2)" stroke-width="1.2" fill="none" opacity="0.6"/><ellipse cx="20" cy="20" rx="4" ry="2" fill="var(--accent)"/>` },
  { id:'space-diamond', label:'DMD Crystal', svg:`<polygon points="20,3 35,14 35,26 20,37 5,26 5,14" stroke="var(--accent)" stroke-width="1.8" fill="none"/><polygon points="20,10 28,16 28,24 20,30 12,24 12,16" stroke="var(--accent2)" stroke-width="1" fill="none" opacity="0.5"/><circle cx="20" cy="20" r="3" fill="var(--accent)"/>` },
];

/* ══════════════════════════════
   VOICE PRESETS (ElevenLabs via /api/voice)
   Labels match server-side VOICE_PRESETS array
══════════════════════════════ */
const VOICE_PRESETS = [
  { id:1, label:'Voice 1 — Unit Alpha',   description:'Deep, measured, authoritative.' },
  { id:2, label:'Voice 2 — Unit Beta',    description:'Mid-range, calm, analytical.' },
  { id:3, label:'Voice 3 — Unit Gamma',   description:'High, crisp, precise.' },
  { id:4, label:'Voice 4 — Unit Delta',   description:'Low, resonant, slow.' },
  { id:5, label:'Voice 5 — Unit Epsilon', description:'Warm, smooth, almost human.' },
  { id:6, label:'Voice 6 — Unit Zeta',    description:'Fast, clipped, urgent.' },
  { id:7, label:'Voice 7 — Unit Eta',     description:'Slow, atmospheric, ethereal.' },
  { id:8, label:'Voice 8 — Unit Theta',   description:'Crisp, robotic, processed.' },
];


/* ══════════════════════════════
   SESSION / CONFIG
══════════════════════════════ */
let SESSION = {
  email: null, firstName: null, code: null,
  username: 'Agent', bio: '',
  status: 'online', accent: '#00e5ff', logoId: 'cyber-pyramid',
  profilePic: null, interests: [],
  isLoggedIn: false,
};

function loadSession() {
  try {
    const s = localStorage.getItem('halos_session');
    if (s) { const parsed = JSON.parse(s); Object.assign(SESSION, parsed); return true; }
  } catch {}
  return false;
}
function saveSession() {
  try { localStorage.setItem('halos_session', JSON.stringify(SESSION)); } catch {}
}

const STATE = {
  ws: null, wsConnected: false, reconnectDelay: 2000,
  screenStream: null, isSharing: false,
  agents: [], // Hermes AI agents + human users added via recruit or WS join
  activeChat: 'general',
  chats: {},
  unread: {},
  lastMsgId: 0, // highest server-side message id we've seen, drives the poll cursor
  screenShareInvite: false,
  workspace: { current: 'universal', scopes: { universal: { assets:[], notes:[] } } },
  documents: [], // {id, title, body, created, updated}
  activeDocId: null,
  projects: [],
  groupChats: {}, // id (group-…) -> { name, members, memberNames }
  screenShares: {}, // hostEmail -> { hostName, title, started, invitees[] }
};

/* ══════════════════════════════
   COSMOS CREW SEED DATA
══════════════════════════════
   The first time the interface boots we drop in the rest of Astralex
   Division as local agents and a couple of sample missions so the
   dashboard actually feels like the Cosmos Crew's tool instead of an
   empty control room. Guarded by a one-shot flag so we never overwrite
   real work — if the user deletes them, they stay deleted.

   These are intentionally LOCAL-only agents (no hermes endpoint), so
   they appear as named crew members in the sidebar without trying to
   bridge anywhere. */
// Flavor status lines surfaced throughout the interface in empty
// states so the dashboard reads alive instead of a dead control room.
// These are pure text — no accounts are created from them.
const COSMOS_CREW_STATUS_LINES = [
  'Tsudrats reports the navigation console is 63% blueberry.',
  'Yruf is reading standing up in corridor C. Do not disturb.',
  'Avonorepus has the Star Chaser in a stable orbit. Again.',
  'Aluben filed the incident reports before anyone wrote them.',
  'Eralf Ralos is ninety seconds into a ninety-second frustration cycle.',
  'Omsoc says everyone is doing okay. Mostly. Check on Etyb.',
  'Msirp is currently a desk lamp on deck fourteen. He says hello.',
  'Etyb has resolved forty-eight maintenance issues. Also, forty-nine.',
];
// Drop any legacy auto-seeded crew-* agents. Earlier builds created
// those as real accounts; we now keep the crew as flavor lines only.
// The old `mission-chapter-3` seed is also removed by id so it clears
// out of shared storage everywhere (the user explicitly asked for it
// to go away). This runs once per client, then flips a flag.
const COSMOS_CREW_CLEANUP_FLAG = 'cosmos_crew_cleaned_v2';
const COSMOS_CREW_DEAD_MISSION_IDS = ['mission-chapter-3'];
function cleanupCosmosCrewOnce() {
  try {
    if (lsGet(COSMOS_CREW_CLEANUP_FLAG)) return;
    let changed = false;
    if (Array.isArray(STATE.agents)) {
      const before = STATE.agents.length;
      STATE.agents = STATE.agents.filter(a => !(a.id || '').startsWith('crew-'));
      if (STATE.agents.length !== before) { persistAgents(); changed = true; }
    }
    if (Array.isArray(STATE.projects)) {
      const before = STATE.projects.length;
      STATE.projects = STATE.projects.filter(p => !COSMOS_CREW_DEAD_MISSION_IDS.includes(p.id));
      if (STATE.projects.length !== before) { persistProjects(); changed = true; }
    }
    lsSet(COSMOS_CREW_CLEANUP_FLAG, '1');
    if (changed) {
      try { renderAgents?.(); } catch {}
      try { renderProjects?.(); } catch {}
    }
  } catch {}
}

// Cosmos Crew seeded missions. These live in shared storage so every
// device on every account sees the same mission list. IMPORTANT: this
// seeder runs AFTER auth + cloud load — the previous version ran in
// runBoot() before SESSION.email was set, so cloudSaveShared() silently
// no-op'd and nothing ever reached other devices. That's why the
// missions vanished when you opened a second device.
const COSMOS_CREW_MISSIONS = [
  {
    id: 'mission-cc-book1',
    title: 'Finish Cosmos Crew: The Adventure Begins (Book 1)',
    goal: 'Wrap the manuscript — first in the Cosmos Crew saga. No Roetem goes past 100%.',
    todos: [
      { text: 'Lock the Star Chaser\'s final-act approach to Azulbright', done: false },
      { text: 'Pay off the Pact reveal — Astralex meets the Codex in-scene', done: false },
      { text: 'Aluben\'s "truth-check" line lands in the Velmoria sequence', done: false },
      { text: 'Msirp objectifies himself exactly three times', done: false },
      { text: 'Tsudrats flies something she shouldn\'t be flying', done: false },
      { text: 'Final read-through with Omsoc on the bridge', done: false },
    ],
    notes: [
      'Working title: Cosmos Crew — The Adventure Begins.',
      'Book 2 seed: Roetem-Actual intercepts a B-792 echo.',
    ],
  },
  {
    id: 'mission-cc-cybertank-railgun',
    title: 'Ship the Cybertank Mk. II Railgun Upgrade',
    goal: 'War Division wants every Cybertank on Velmoria fielding a railgun by next rotation.',
    todos: [
      { text: 'Finalize barrel-cooling spec with S.A.T.U.R.N. Labs', done: false },
      { text: 'Velmoria live-fire range booking confirmed', done: false },
      { text: 'Ammo supply chain routed through Sharled (DMD rounds)', done: false },
      { text: 'Cybercopter escort wing briefed on new RF signature', done: false },
    ],
    notes: ['Budget approval: $94.0M per tank retrofit.'],
  },
  {
    id: 'mission-cc-multiverse-monologue',
    title: 'Draft the Multiversal Hub Address',
    goal: 'Astralex needs a speech ready if B-792 escalates. 12 minutes, no jargon.',
    todos: [
      { text: 'Cipher Division provides current B-792 stability readout', done: false },
      { text: 'Roetem reviews paragraph 3 (the Pact callback)', done: false },
      { text: 'Translate key lines into High Cosmos', done: false },
      { text: 'Rehearsal slot booked on Hub Floor 3', done: false },
    ],
    notes: ['Omsoc insists on opening with a joke. Omsoc is overruled.'],
  },
  {
    id: 'mission-cc-sharled-contract',
    title: 'Negotiate the Sharled DMD Supply Contract',
    goal: 'Secure 2 cycles of DMD throughput for Genesis Division research at a locked rate.',
    todos: [
      { text: 'Identify counter-party (Drifters or Market Guild?)', done: false },
      { text: 'Yruf is NOT in the room for negotiations', done: false },
      { text: 'Signed escrow via Tesseract Vault sub-floor 4', done: false },
    ],
    notes: ['Backup option: Space Tree elevator freight lane.'],
  },
  {
    id: 'mission-cc-nebula-report',
    title: 'File the Backlog of Pre-Incident Reports',
    goal: 'Aluben has filed a stack of reports for events that haven\'t happened yet. Catalog them.',
    todos: [
      { text: 'Cross-reference with Chronicle Division archive', done: false },
      { text: 'Separate premonitions from predictions', done: false },
      { text: 'Lock the drawer Aluben cannot see inside', done: false },
    ],
    notes: ['Do NOT read the one labeled "Tuesday".'],
  },
  {
    id: 'mission-cc-space-tree-maint',
    title: 'Space Tree Elevator 7 — Full Bark Inspection',
    goal: 'Elevator 7 was rerouted for routine bark inspection. Close out the ticket.',
    todos: [
      { text: 'Etyb signs off on resonance test', done: false },
      { text: 'Replace segment 4 cladding (tree grew, not us)', done: false },
      { text: 'Confirm orbit radius still 1.0000 ± 0.0017 AU', done: false },
    ],
    notes: [],
  },
];

// Flag is namespaced to the email so every account gets seeded once —
// but we also check-by-id before inserting, so re-seeding a device that
// already has the missions in shared storage is a cheap no-op.
function seedCosmosCrewMissions() {
  try {
    if (!SESSION.email) return;
    const flagKey = 'cc_missions_seeded_' + SESSION.email;
    // If any of our canonical ids already exist in shared state, don't
    // re-seed — we don't want to resurrect ones the user deleted.
    const existingIds = new Set((STATE.projects || []).map(p => p.id));
    const alreadyHasAny = COSMOS_CREW_MISSIONS.some(m => existingIds.has(m.id));
    if (lsGet(flagKey) || alreadyHasAny) return;
    if (!Array.isArray(STATE.projects)) STATE.projects = [];
    let added = 0;
    for (const m of COSMOS_CREW_MISSIONS) {
      if (existingIds.has(m.id)) continue;
      STATE.projects.push({ ...m, agents: [], created: Date.now() - added * 1000 });
      added++;
    }
    if (added > 0) {
      persistProjects();
      try { renderProjects?.(); } catch {}
    }
    lsSet(flagKey, '1');
  } catch (e) { console.warn('[halos] seedCosmosCrewMissions failed:', e && e.message); }
}
// Picks one of the flavor status lines per call, for use in empty-state
// messages and the like. Deterministic per-load so an empty dashboard
// doesn't flicker between lines if something re-renders.
let _crewFlavorCache = null;
function crewFlavorLine() {
  if (_crewFlavorCache) return _crewFlavorCache;
  const pick = COSMOS_CREW_STATUS_LINES[Math.floor(Math.random() * COSMOS_CREW_STATUS_LINES.length)];
  _crewFlavorCache = pick;
  return pick;
}

/* ══════════════════════════════
   PERSISTENCE (local + cloud)
══════════════════════════════ */
function lsGet(k) { try { return localStorage.getItem('halos_' + k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem('halos_' + k, v); } catch {} }

function loadLocal() {
  try {
    const chats = lsGet('chats'); if (chats) STATE.chats = JSON.parse(chats);
    const ws = lsGet('workspace'); if (ws) STATE.workspace.scopes = JSON.parse(ws);
    const ag = lsGet('agents'); if (ag) { const ex = JSON.parse(ag); ex.forEach(a => { if (!STATE.agents.find(x=>x.id===a.id)) STATE.agents.push(a); }); }
    const proj = lsGet('projects'); if (proj) STATE.projects = JSON.parse(proj);
    const docs = lsGet('documents'); if (docs) STATE.documents = JSON.parse(docs);
    const gc = lsGet('groupChats'); if (gc) STATE.groupChats = JSON.parse(gc);
    const savedChat = lsGet('activeChat'); if (savedChat) STATE.activeChat = savedChat;
    if (SESSION.accent) applyAccent(SESSION.accent);
    // Logo is fixed
  } catch {}
}

function persistChats() { lsSet('chats', JSON.stringify(STATE.chats)); cloudSave('chats', JSON.stringify(STATE.chats)); }

// Per-account persistent sets for deleted message ids and "very important"
// markers. Server is the source of truth for the message body, so we layer
// these flags on top whenever we render or hydrate.
const DELETED_MSG_IDS = new Set();
const IMPORTANT_MSG_IDS = new Set();
(function loadMsgFlags() {
  try {
    const d = lsGet('deletedMsgIds'); if (d) JSON.parse(d).forEach(id => DELETED_MSG_IDS.add(id));
    const i = lsGet('importantMsgIds'); if (i) JSON.parse(i).forEach(id => IMPORTANT_MSG_IDS.add(id));
  } catch {}
})();
function persistMsgFlags() {
  lsSet('deletedMsgIds', JSON.stringify([...DELETED_MSG_IDS]));
  lsSet('importantMsgIds', JSON.stringify([...IMPORTANT_MSG_IDS]));
  cloudSave('deletedMsgIds', JSON.stringify([...DELETED_MSG_IDS]));
  cloudSave('importantMsgIds', JSON.stringify([...IMPORTANT_MSG_IDS]));
}
// Workspace, projects, group chats, and screen shares sync across ALL
// accounts (shared storage). Group chats especially must be shared so
// every member actually sees the conversation in their roster.
function persistWorkspace() {
  lsSet('workspace', JSON.stringify(STATE.workspace.scopes));
  // Universal scope is shared across all users
  cloudSaveShared('workspace_universal', JSON.stringify(STATE.workspace.scopes['universal'] || { assets: [], notes: [] }));
  // Personal + agent scopes are private per user
  const priv = {};
  Object.keys(STATE.workspace.scopes).forEach(k => { if (k !== 'universal') priv[k] = STATE.workspace.scopes[k]; });
  cloudSave('workspace_personal', JSON.stringify(priv));
}
function persistAgents() { lsSet('agents', JSON.stringify(STATE.agents)); }
function persistProjects() { lsSet('projects', JSON.stringify(STATE.projects)); cloudSaveShared('projects', JSON.stringify(STATE.projects)); }
function persistGroupChats() { lsSet('groupChats', JSON.stringify(STATE.groupChats)); cloudSaveShared('groupChats', JSON.stringify(STATE.groupChats)); }
function persistDocuments() { lsSet('documents', JSON.stringify(STATE.documents)); cloudSave('documents', JSON.stringify(STATE.documents)); }

async function cloudSave(key, value) {
  if (!SESSION.email || !SESSION.code) return;
  try {
    await fetch('/api/data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'save', email:SESSION.email, code:SESSION.code, key, value }) });
  } catch {}
}

async function cloudSaveShared(key, value) {
  if (!SESSION.email || !SESSION.code) return { ok: false, error: 'no-session' };
  try {
    const r = await fetch('/api/data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'save_shared', email:SESSION.email, code:SESSION.code, key, value }) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return { ok: false, error: body.error || ('HTTP ' + r.status), detail: body.detail };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'network' };
  }
}

async function cloudLoadAll() {
  if (!SESSION.email || !SESSION.code) return;
  // Per-user data and shared data are loaded independently so one
  // failing request doesn't nuke the other. A single try/catch around
  // both would lose the shared load whenever the user load threw.
  try {
    const r = await fetch('/api/data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'load_all', email:SESSION.email, code:SESSION.code }) });
    if (r.ok) {
      const { data } = await r.json();
      if (data && data.chats) { try { STATE.chats = JSON.parse(data.chats); } catch {} }
      if (data && data.documents) { try { STATE.documents = JSON.parse(data.documents); } catch {} }
      if (data && data.deletedMsgIds) { try { JSON.parse(data.deletedMsgIds).forEach(id => DELETED_MSG_IDS.add(id)); } catch {} }
      if (data && data.importantMsgIds) { try { JSON.parse(data.importantMsgIds).forEach(id => IMPORTANT_MSG_IDS.add(id)); } catch {} }
      // Private workspace scopes (personal + agent tabs) — per-user only
      if (data && data.workspace_personal) { try { const p = JSON.parse(data.workspace_personal); Object.assign(STATE.workspace.scopes, p); } catch {} }
    }
  } catch (err) { console.warn('[halos] load_all failed:', err && err.message); }
  try {
    const r2 = await fetch('/api/data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'load_shared', email:SESSION.email, code:SESSION.code }) });
    if (r2.ok) {
      const { data } = await r2.json();
      // Universal scope is shared — only overlay the universal key, not personal
      if (data && data.workspace_universal) { try { STATE.workspace.scopes['universal'] = JSON.parse(data.workspace_universal); } catch {} }
      else if (data && data.workspace) { try { const old = JSON.parse(data.workspace); if (old && old.universal) STATE.workspace.scopes['universal'] = old.universal; } catch {} }
      if (data && data.projects) { try { STATE.projects = JSON.parse(data.projects); } catch {} }
      // Group chats are shared so every member sees them. Merge rather
      // than replace so locally-created rows survive a race with the
      // shared read.
      if (data && data.groupChats) {
        try {
          const remote = JSON.parse(data.groupChats) || {};
          STATE.groupChats = Object.assign({}, remote, STATE.groupChats || {});
          lsSet('groupChats', JSON.stringify(STATE.groupChats));
        } catch {}
      }
      if (data && data.screenShares) {
        try {
          const remote = JSON.parse(data.screenShares) || {};
          STATE.screenShares = Object.assign({}, remote, STATE.screenShares || {});
        } catch {}
      }
    }
  } catch (err) { console.warn('[halos] load_shared failed:', err && err.message); }
}

/* ══════════════════════════════
   DOM REFS
══════════════════════════════ */
const $ = id => document.getElementById(id);

/* ══════════════════════════════
   INIT
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  generateStars('login-stars'); generateStars('kp-stars'); generateStars('boot-stars');
  initFullscreenDecor();
  initBootParticles();
  initKpParticles();
  initGlobalTopbarDelegation();
  initClickRipples();
  initKonamiEasterEgg();

  // Handle password reset link from email (?reset=TOKEN)
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('reset');
  if (resetToken) {
    showResetScreen(resetToken);
    return;
  }

  if (loadSession()) {
    if (SESSION.isLoggedIn) {
      // Already fully logged in — shouldn't normally happen on fresh load, but handle it
      runBoot();
    } else if (SESSION.hasAccount) {
      // Has an account but locked — go straight to keypad in login mode
      showKeypad(false);
    } else {
      showLogin();
    }
  } else {
    showLogin();
  }
  initLoginScreen();
  initKeypad();
});

function initKonamiEasterEgg() {
  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let idx = 0;
  document.addEventListener('keydown', e => {
    if (e.key === SEQ[idx]) {
      idx++;
      if (idx === SEQ.length) {
        idx = 0;
        const msgs = [
          'COSMOS CREW PROTOCOL ACTIVATED.\nAll hands report to the Star Chaser bridge.\nByte has already fixed it.',
          'You found it.\nNebula filed this discovery report three days ago.\nDo not read Tuesday\'s.',
          'Yruf is unimpressed.\nPrism is a chandelier now.\nCosmo says you\'re doing great.',
          'HALOS EASTER EGG UNLOCKED.\nStardust is flying something she shouldn\'t.\nShe is fine. Carry on.',
        ];
        const text = msgs[Math.floor(Math.random() * msgs.length)];
        showVeryImportantAlert(text, 'Cosmos Crew');
      }
    } else {
      idx = e.key === SEQ[0] ? 1 : 0;
    }
  });
}

/* Spawn rising particle motes on the boot screen. Idempotent. */
function initClickRipples() {
  document.addEventListener('click', e => {
    const target = e.target;
    // Only ripple on button elements (not arbitrary rows — overflow:hidden would break them)
    const isBtn = target.closest('button');
    if (!isBtn) return;
    // Skip tiny utility buttons (delete/close icons) and modal backdrops
    if (isBtn.classList.contains('msg-delete-btn') || isBtn.classList.contains('modal-close') || isBtn.id === 'modal-backdrop') return;
    const el = isBtn;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    const pos = window.getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

function initAppParticles() {
  const c = document.getElementById('app-particles');
  if (!c || c.childElementCount) return;
  const COUNT = 18;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'ap' + (Math.random() < 0.3 ? ' purple' : '');
    p.style.left = (Math.random() * 100) + '%';
    const dur = 14 + Math.random() * 16;
    p.style.animationDuration = dur + 's';
    p.style.animationDelay = (-Math.random() * dur) + 's';
    const sz = (1.5 + Math.random() * 2.5).toFixed(1);
    p.style.width = sz + 'px';
    p.style.height = sz + 'px';
    const drift = (Math.random() * 60 - 30).toFixed(0);
    p.style.setProperty('--drift', drift + 'px');
    c.appendChild(p);
  }
}

function initKpParticles() {
  const c = document.getElementById('kp-particles');
  if (!c || c.childElementCount) return;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('span');
    p.className = 'bp' + (Math.random() < 0.4 ? ' purple' : '');
    p.style.left = (Math.random() * 100) + '%';
    p.style.animationDuration = (7 + Math.random() * 9) + 's';
    p.style.animationDelay = (-Math.random() * 9) + 's';
    p.style.width = p.style.height = (1.5 + Math.random() * 3).toFixed(1) + 'px';
    c.appendChild(p);
  }
}

function initBootParticles() {
  const c = document.getElementById('boot-particles');
  if (!c || c.childElementCount) return;
  const COUNT = 28;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'bp' + (Math.random() < 0.35 ? ' purple' : '');
    p.style.left = (Math.random() * 100) + '%';
    p.style.animationDuration = (6 + Math.random() * 8) + 's';
    p.style.animationDelay = (-Math.random() * 8) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 3).toFixed(1) + 'px';
    c.appendChild(p);
  }
}

/* Topbar/global button handlers via event delegation — guaranteed to work
   no matter when launchApp/initCallUI/etc. run (or re-run on logout). */
function initGlobalTopbarDelegation() {
  if (window.__halosTopbarDelegated) return;
  window.__halosTopbarDelegated = true;

  document.addEventListener('click', e => {
    // Bubble up to find which topbar control was clicked
    const t = e.target;
    const hitId = id => t.closest && t.closest('#' + id);

    // Notifications bell
    const bell = hitId('topbar-notif');
    if (bell) {
      e.stopPropagation();
      const panel = $('notif-panel'); if (!panel) return;
      NOTIF_STATE.open = !NOTIF_STATE.open;
      panel.classList.toggle('hidden', !NOTIF_STATE.open);
      if (NOTIF_STATE.open) { try { markAllNotifRead(); renderNotifList(); } catch {} }
      return;
    }
    // Settings gear
    if (hitId('topbar-settings')) {
      try { openSettings(); } catch (err) { console.warn('[halos] openSettings failed', err); }
      return;
    }
    // Call button
    if (hitId('topbar-call')) {
      try {
        if (typeof CALL !== 'undefined' && CALL && CALL.state !== 'idle') return;
        if (typeof isUserChat === 'function' && isUserChat(STATE.activeChat)) {
          startOutgoingCall(STATE.activeChat.slice('user-'.length));
        } else if (typeof showCallPicker === 'function') {
          showCallPicker();
        }
      } catch (err) { console.warn('[halos] call button failed', err); }
      return;
    }
    // Help
    if (hitId('topbar-help')) {
      const ov = $('help-overlay'); if (ov) ov.classList.remove('hidden');
      return;
    }
    // Download
    if (hitId('topbar-download')) {
      const ov = $('downloads-overlay'); if (ov) {
        ov.classList.remove('hidden');
        const status = $('notif-status');
        if (status && 'Notification' in window) {
          const p = Notification.permission;
          if (p === 'granted') { status.textContent = 'Notifications enabled.'; status.className = 'dl-notif-status granted'; }
          else if (p === 'denied') { status.textContent = 'Notifications blocked. Enable them in your browser settings.'; status.className = 'dl-notif-status denied'; }
          else { status.textContent = 'Notifications not yet enabled.'; status.className = 'dl-notif-status'; }
        }
      }
      return;
    }

    // Auto-close notif panel on outside click
    if (NOTIF_STATE.open) {
      const panel = $('notif-panel');
      if (panel && !panel.contains(t) && !(t.closest && t.closest('#topbar-notif'))) {
        NOTIF_STATE.open = false; panel.classList.add('hidden');
      }
    }
  });
}

/* Cycle timers + wandering telemetry for login/keypad/boot status strips */
function initFullscreenDecor() {
  const start = Date.now();
  const pad = n => String(n).padStart(2, '0');
  const fmt = ms => {
    const s = Math.floor(ms / 1000);
    return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;
  };
  let sig = 98, mem = 42;
  const tick = () => {
    const dt = Date.now() - start;
    const cy = fmt(dt);
    const act = (typeof azulbrightNow === 'function') ? azulbrightNow() : '--:--:--';
    const set = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
    set('fss-cycle',     'A.C.T. ' + act + ' · CYC ' + cy);
    set('fss-kp-cycle',  'A.C.T. ' + act + ' · CYC ' + cy);
    set('fss-boot-cycle','A.C.T. ' + act + ' · T+' + cy);
    sig += (Math.random() - 0.5) * 0.8;
    if (sig < 94) sig = 94; if (sig > 99.8) sig = 99.8;
    set('fss-sig', 'SIGNAL ' + sig.toFixed(1) + '%');
    set('lch-signal', sig.toFixed(1) + '%');
    set('lch-uptime', fmt(dt));
    mem += (Math.random() - 0.5) * 1.4;
    if (mem < 28) mem = 28; if (mem > 72) mem = 72;
    set('bst-mem', Math.round(mem) + '%');
    const bus = (1.42 + Math.random() * 0.14).toFixed(2) + ' GHz';
    set('bst-bus', bus);
  };
  tick();
  setInterval(tick, 1000);

  // Data stream columns — floating hex/stat lines on the side of pre-auth screens
  const hexChars = '0123456789ABCDEF';
  const streamPhrases = [
    'SYNC…', 'NODE-AZB', 'AUTH PKT', 'KYBER-OK', 'SIG-94.8', 'AES-256',
    'SHIELD-OK', 'RIFT-CLR', 'CYC-ROLL', 'NET-LINK', 'TOKEN-OK', 'SALT-GEN',
    'HANDSHAKE', 'CERT-VLD', 'B792-NOM', 'ORBIT-OK', 'CREW-STD',
  ];
  const randHex = () => Array.from({length:6}, () => hexChars[Math.floor(Math.random()*16)]).join('');
  const colIds = ['login-data-left','login-data-right','kp-data-left','kp-data-right'];
  colIds.forEach(id => {
    const col = document.getElementById(id);
    if (!col) return;
    const lineCount = 22;
    for (let i = 0; i < lineCount; i++) {
      const line = document.createElement('div');
      line.className = 'ldc-line' + (Math.random() < 0.3 ? ' purple' : '');
      const dur = 2.8 + Math.random() * 3.2;
      const delay = Math.random() * -6;
      line.style.cssText = `animation-duration:${dur.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s`;
      col.appendChild(line);
    }
    // Periodically update text content
    const refreshLines = () => {
      col.querySelectorAll('.ldc-line').forEach(el => {
        if (Math.random() < 0.4) {
          el.textContent = Math.random() < 0.5 ? randHex() : streamPhrases[Math.floor(Math.random()*streamPhrases.length)];
        }
      });
    };
    refreshLines();
    setInterval(refreshLines, 900);
  });
}

function generateStars(containerId) {
  const c = $(containerId); if (!c) return;
  // Clear any existing stars
  c.innerHTML = '';

  // Layer 1 — regular stars (lots more of them)
  for (let i = 0; i < 180; i++) {
    const s = document.createElement('div');
    const size = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 1.5 : 2;
    const isCyan = Math.random() < 0.4;
    const isPurple = !isCyan && Math.random() < 0.5;
    const color = isCyan ? `0,229,255` : isPurple ? `124,63,255` : `255,255,255`;
    const opacity = 0.3 + Math.random() * 0.7;
    const twinkleDur = 2 + Math.random() * 4;
    const twinkleDelay = Math.random() * 5;
    s.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      width:${size}px; height:${size}px;
      background:rgba(${color},${opacity});
      border-radius:50%;
      animation: starTwinkle ${twinkleDur}s ${twinkleDelay}s ease-in-out infinite alternate;
    `;
    c.appendChild(s);
  }

  // Layer 2 — a few larger glowing stars
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    const isCyan = Math.random() < 0.5;
    const color = isCyan ? `0,229,255` : `124,63,255`;
    const size = 2.5 + Math.random() * 1.5;
    s.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      width:${size}px; height:${size}px;
      background:rgba(${color},0.9);
      border-radius:50%;
      box-shadow:0 0 ${size*3}px rgba(${color},0.6), 0 0 ${size*6}px rgba(${color},0.2);
      animation: starTwinkle ${3+Math.random()*3}s ${Math.random()*4}s ease-in-out infinite alternate;
    `;
    c.appendChild(s);
  }

  // Layer 3 — shooting stars: thin needles
  const shootCount = 4;
  for (let i = 0; i < shootCount; i++) {
    const shoot = document.createElement('div');
    const startLeft = Math.random() * 80;
    const startTop = Math.random() * 60;
    const length = 50 + Math.random() * 40;
    const dur = 6 + Math.random() * 8;
    const delay = Math.random() * 12;
    const angle = 20 + Math.random() * 25;
    shoot.style.cssText = `
      position:absolute;
      left:${startLeft}%;
      top:${startTop}%;
      width:${length}px; height:1px;
      background:linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.8) 30%, rgba(255,255,255,0.6) 60%, transparent 100%);
      border-radius:99px;
      --shoot-angle:${angle}deg;
      transform:rotate(${angle}deg);
      transform-origin:left center;
      animation: shootingStar ${dur}s ${delay}s linear infinite;
      opacity:0;
    `;
    c.appendChild(shoot);
  }
}

/* ══════════════════════════════
   LOGIN SCREEN
══════════════════════════════ */
function showLogin() { $('login-screen').classList.remove('hidden'); $('keypad-screen').classList.add('hidden'); $('boot-screen').classList.add('hidden'); $('app').classList.add('hidden'); }

function showResetScreen(token) {
  // Reuse the login screen with a reset form injected
  $('login-screen').classList.remove('hidden');
  $('keypad-screen').classList.add('hidden');
  $('boot-screen').classList.add('hidden');
  $('app').classList.add('hidden');

  const wrap = document.querySelector('.login-wrap');
  wrap.innerHTML = `
    <div class="login-logo">
      <svg viewBox="0 0 80 80" fill="none">
        <polygon points="40,6 74,66 6,66" stroke="var(--accent)" stroke-width="2.5" fill="none"/>
        <circle cx="40" cy="46" r="7" fill="var(--accent)" opacity="0.9"/>
      </svg>
      <div>
        <div class="login-title">HALOS</div>
        <div class="login-sub">ACCESS CODE RESET</div>
      </div>
    </div>
    <div class="login-form">
      <div class="form-group">
        <label class="form-label">Choose a new 4-digit access code</label>
        <input type="password" id="reset-new-code" class="form-input" placeholder="4 digits" maxlength="4" inputmode="numeric"/>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm new code</label>
        <input type="password" id="reset-confirm-code" class="form-input" placeholder="4 digits again" maxlength="4" inputmode="numeric"/>
      </div>
      <div class="form-error hidden" id="reset-error"></div>
      <div class="form-success hidden" id="reset-success">Code updated! You can now log in.</div>
      <button class="form-btn" id="btn-do-reset">Set New Access Code</button>
    </div>
    <div class="login-version">HALOS Interface v3.5</div>`;

  document.getElementById('btn-do-reset').addEventListener('click', async () => {
    const newCode = document.getElementById('reset-new-code').value.trim();
    const confirm = document.getElementById('reset-confirm-code').value.trim();
    const errEl = document.getElementById('reset-error');
    const okEl = document.getElementById('reset-success');
    if (newCode.length < 4) { errEl.textContent = 'Code must be 4 digits.'; errEl.classList.remove('hidden'); return; }
    if (newCode !== confirm) { errEl.textContent = 'Codes do not match.'; errEl.classList.remove('hidden'); return; }
    try {
      const r = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_code', token, newCode }),
      });
      const data = await r.json();
      if (r.ok) {
        errEl.classList.add('hidden'); okEl.classList.remove('hidden');
        // Clean URL and go to login after 2s
        setTimeout(() => { window.history.replaceState({}, '', '/'); location.reload(); }, 2000);
      } else {
        errEl.textContent = data.error || 'Reset failed. Link may have expired.'; errEl.classList.remove('hidden');
      }
    } catch { errEl.textContent = 'Server error. Try again.'; errEl.classList.remove('hidden'); }
  });

  initLoginScreen();
  initKeypad();
}

function initLoginScreen() {
  $('tab-human').addEventListener('click', () => { $('tab-human').classList.add('active'); $('tab-agent-reg').classList.remove('active'); $('form-human').classList.remove('hidden'); $('form-agent-reg').classList.add('hidden'); $('form-forgot').classList.add('hidden'); });
  $('tab-agent-reg').addEventListener('click', () => { $('tab-agent-reg').classList.add('active'); $('tab-human').classList.remove('active'); $('form-agent-reg').classList.remove('hidden'); $('form-human').classList.add('hidden'); $('form-forgot').classList.add('hidden'); });
  $('btn-forgot').addEventListener('click', () => { $('form-human').classList.add('hidden'); $('form-forgot').classList.remove('hidden'); document.querySelector('.login-tabs').classList.add('hidden'); });
  $('btn-back-login').addEventListener('click', () => { $('form-forgot').classList.add('hidden'); $('form-human').classList.remove('hidden'); document.querySelector('.login-tabs').classList.remove('hidden'); });

  $('btn-login-human').addEventListener('click', async () => {
    const email = $('login-email').value.trim();
    const firstName = $('login-firstname').value.trim();
    if (!email || !firstName) { showLoginError('login-error', 'Please enter your email and first name.'); btnAnim($('btn-login-human'), 'btn-anim-error'); return; }

    const btn = $('btn-login-human');
    btn.textContent = 'Checking…'; btn.disabled = true;

    SESSION.email = email;
    SESSION.firstName = firstName;
    SESSION.isNewUser = false; // start false, only set true if server confirms no account
    saveSession();

    // If we already know this user has an account (from a previous successful login/register),
    // default to login mode. Otherwise default to setup mode so new users can set a code.
    let isNewUser = !SESSION.hasAccount;
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_exists', email }),
      });
      if (r.ok) {
        let data = {};
        try { data = await r.json(); } catch { /* non-JSON response — keep default */ }
        isNewUser = !data.exists;
      }
      // if !r.ok, keep the default based on SESSION.hasAccount
    } catch {
      // Network unreachable — keep the default based on SESSION.hasAccount
    }

    btn.textContent = 'Continue to Keypad →'; btn.disabled = false;
    showKeypad(isNewUser);
  });

  $('btn-register-agent').addEventListener('click', async () => {
    const masterCode = $('agent-master-input').value.trim();
    const name = $('agent-reg-name').value.trim();
    const email = $('agent-reg-email').value.trim();
    if (!masterCode || !name || !email) { showLoginError('agent-reg-error', 'All fields required.'); return; }
    if (masterCode !== '2078') { showLoginError('agent-reg-error', 'Invalid agent master code.'); return; }

    const btn = $('btn-register-agent');
    btn.textContent = 'Checking…'; btn.disabled = true;

    SESSION.email = email;
    SESSION.firstName = name;
    SESSION.isAgent = true;
    SESSION.agentMasterCode = masterCode;
    SESSION.isNewUser = false;
    saveSession();

    let isNewUser = false;
    try {
      const r = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'check_exists_agent', email }) });
      if (r.ok) {
        let data = {};
        try { data = await r.json(); } catch {}
        isNewUser = !data.exists;
      }
    } catch {
      isNewUser = false;
    }

    btn.textContent = 'Log In →'; btn.disabled = false;
    showKeypad(isNewUser);
  });

  $('btn-send-reset').addEventListener('click', async () => {
    const email = $('forgot-email').value.trim();
    const masterCode = $('forgot-master').value.trim();
    const newCode = $('forgot-newcode').value.trim();
    if (!email || !masterCode || !newCode) { showLoginError('forgot-error', 'All fields are required.'); return; }
    if (newCode.length !== 4 || !/^\d{4}$/.test(newCode)) { showLoginError('forgot-error', 'New code must be exactly 4 digits.'); return; }
    try {
      const r = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'master_reset', masterCode, email, newCode }) });
      const data = await r.json();
      if (r.ok) {
        $('forgot-success').classList.remove('hidden'); $('forgot-error').classList.add('hidden');
      } else {
        showLoginError('forgot-error', data.error || 'Reset failed.');
      }
    } catch { showLoginError('forgot-error', 'Network error. Try again.'); }
  });
}

function showLoginError(id, msg) {
  const el = $(id); if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg; el.classList.remove('hidden');
  if (window.HALOSAudio) HALOSAudio.errorSfx();
}

function btnAnim(el, cls, ms = 600) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/* ══════════════════════════════
   KEYPAD
   Modes:
     'set'     — new user, choosing their code
     'confirm' — new user, re-entering to confirm
     'login'   — returning user, entering existing code
══════════════════════════════ */
let _keypadMode = 'login';   // current mode
let _pendingCode = '';        // stores first entry during 'set' mode
let _keypadEntered = '';      // digits typed so far
let _keypadListenersAdded = false; // prevent duplicate listeners

function initKeypad() {
  if (_keypadListenersAdded) return;
  _keypadListenersAdded = true;

  const dots = [0,1,2,3].map(i => $('d' + i));
  function updateDots() {
    dots.forEach((d,i) => d.classList.toggle('filled', i < _keypadEntered.length));
    // Charge meter fills proportionally
    const meter = $('kp-meter-fill');
    if (meter) meter.style.width = (_keypadEntered.length / 4 * 100) + '%';
  }
  function clearEntry() { _keypadEntered = ''; updateDots(); }

  document.querySelectorAll('.key-btn[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_keypadEntered.length >= 4) return;
      _keypadEntered += btn.dataset.digit;
      updateDots();
    });
  });

  $('key-clr').addEventListener('click', () => {
    clearEntry();
    $('keypad-error').classList.add('hidden');
  });

  $('key-ent').addEventListener('click', () => handleKeypadSubmit());

  document.addEventListener('keydown', e => {
    if ($('keypad-screen').classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9' && _keypadEntered.length < 4) { _keypadEntered += e.key; updateDots(); }
    else if (e.key === 'Backspace') { _keypadEntered = _keypadEntered.slice(0,-1); updateDots(); }
    else if (e.key === 'Enter') handleKeypadSubmit();
  });

  $('btn-signout-kp').addEventListener('click', () => {
    SESSION = { email:null, firstName:null, code:null, username:'Agent', bio:'', status:'online', accent:'#00e5ff', profilePic:null, interests:[], isLoggedIn:false, isNewUser:false, hasAccount:false, isAgent:false };
    localStorage.removeItem('halos_session');
    _keypadEntered = '';
    _pendingCode = '';
    [0,1,2,3].forEach(i => { const d = $('d'+i); if(d) d.classList.remove('filled'); });
    showLogin();
  });
}

function setKeypadMode(mode) {
  _keypadMode = mode;
  _keypadEntered = '';
  const dots = [0,1,2,3].map(i => $('d' + i));
  dots.forEach(d => d.classList.remove('filled'));
  $('keypad-error').classList.add('hidden');

  const greeting = $('keypad-greeting');
  const sub = $('keypad-sub');

  if (mode === 'set') {
    greeting.textContent = `Hi, ${SESSION.firstName}! Choose your access code.`;
    sub.textContent = 'Pick any 4-digit code — you\'ll use it every login';
    sub.style.color = 'var(--accent)';
  } else if (mode === 'confirm') {
    greeting.textContent = 'Confirm your code';
    sub.textContent = 'Enter the same 4 digits again to confirm';
    sub.style.color = 'var(--warn)';
  } else {
    greeting.textContent = `Welcome back, ${SESSION.firstName || 'Agent'}`;
    sub.textContent = 'Enter your 4-digit access code';
    sub.style.color = '';
  }
}

function showKeypad(isNewUser = false) {
  $('login-screen').classList.add('hidden');
  $('keypad-screen').classList.remove('hidden');
  $('boot-screen').classList.add('hidden');
  $('app').classList.add('hidden');
  initKeypad();
  setKeypadMode(isNewUser ? 'set' : 'login');
}

async function handleKeypadSubmit() {
  const code = _keypadEntered;
  if (!code || code.length < 4) {
    $('keypad-error').textContent = '[!]Enter all 4 digits first';
    $('keypad-error').classList.remove('hidden');
    btnAnim($('key-ent'), 'btn-anim-error');
    if (window.HALOSAudio) HALOSAudio.errorSfx();
    return;
  }

  // Secret keypad code — Cosmos Crew easter egg
  if (code === '7777' && _keypadMode === 'login') {
    _keypadEntered = '';
    const dots = [0,1,2,3].map(i => $('d' + i));
    dots.forEach(d => d.classList.remove('filled'));
    const meter = $('kp-meter-fill'); if (meter) meter.style.width = '0%';
    const sub = $('keypad-sub');
    const crew = ['Omsoc says hi.', 'Tsudrats is flying something she shouldn\'t.', 'Yruf is standing. Still reading.', 'Msirp is a lamp. Deck 14. He says hello.', 'Etyb resolved issue #7777. That\'s you.', 'Aluben filed a report. Don\'t read Tuesday\'s.'];
    const msg = crew[Math.floor(Math.random() * crew.length)];
    if (sub) { sub.textContent = '✦ ' + msg; sub.style.color = 'var(--accent)'; }
    setTimeout(() => { if (sub) { sub.textContent = 'Enter your 4-digit access code'; sub.style.color = ''; } }, 3200);
    return;
  }

  if (_keypadMode === 'set') {
    // Step 1 of new user flow — store code and ask to confirm
    _pendingCode = code;
    setKeypadMode('confirm');
    return;
  }

  if (_keypadMode === 'confirm') {
    // Step 2 of new user flow — check codes match, then register
    if (code !== _pendingCode) {
      $('keypad-error').textContent = '[!]Codes don\'t match — try again';
      $('keypad-error').classList.remove('hidden');
      _pendingCode = '';
      setKeypadMode('set');
      return;
    }
    // Codes match — register the account
    await doRegister(_pendingCode);
    return;
  }

  if (_keypadMode === 'login') {
    // Returning user — verify code
    await doLogin(code);
  }
}

async function doRegister(code) {
  $('key-ent').textContent = '…'; $('key-ent').disabled = true;
  const isAgent = SESSION.isAgent;
  const payload = isAgent
    ? { action: 'register_agent', masterCode: SESSION.agentMasterCode, agentName: SESSION.firstName, email: SESSION.email, code }
    : { action: 'register_human', email: SESSION.email, firstName: SESSION.firstName, code };
  try {
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = {};
    try { data = await r.json(); } catch {
      $('keypad-error').textContent = '[!]Server error — API routes not responding. Check Vercel deployment.';
      $('keypad-error').classList.remove('hidden');
      $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
      return;
    }
    if (r.ok) {
      applyUserToSession(data.user, code);
      $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
      runBoot();
    } else {
      if (data.error && data.error.toLowerCase().includes('already')) {
        SESSION.isNewUser = false; saveSession();
        setKeypadMode('login');
      } else {
        $('keypad-error').textContent = '[!]' + (data.error || 'Registration failed');
        $('keypad-error').classList.remove('hidden');
      }
      $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
    }
  } catch (e) {
    $('keypad-error').textContent = '[!]Network error: ' + e.message;
    $('keypad-error').classList.remove('hidden');
    $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
  }
}

async function doLogin(code) {
  $('key-ent').textContent = '…'; $('key-ent').disabled = true;
  let r;
  try {
    r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: SESSION.email, code }),
    });
  } catch (e) {
    $('keypad-error').textContent = '[!]Network error: ' + e.message;
    $('keypad-error').classList.remove('hidden');
    $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
    return;
  }

  let data = {};
  try { data = await r.json(); } catch {
    $('keypad-error').textContent = '[!]API routes not responding. Check Vercel deployment.';
    $('keypad-error').classList.remove('hidden');
    $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
    return;
  }

  if (r.ok) {
    applyUserToSession(data.user, code);
    btnAnim($('key-ent'), 'btn-anim-success');
    $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
    runBoot();
  } else {
    $('keypad-error').textContent = '[!]' + (data.error || 'Login failed');
    $('keypad-error').classList.remove('hidden');
    btnAnim($('key-ent'), 'btn-anim-error');
    if (window.HALOSAudio) HALOSAudio.errorSfx();
    _keypadEntered = '';
    [0,1,2,3].forEach(i => { const d = $('d'+i); if(d) d.classList.remove('filled'); });
    $('key-ent').textContent = 'ENT'; $('key-ent').disabled = false;
  }
}

function applyUserToSession(user, code) {
  SESSION.code = code;
  SESSION.username = user.username || SESSION.firstName;
  SESSION.bio = user.bio || '';
  SESSION.status = user.status || 'online';
  SESSION.accent = user.accent || '#00e5ff';
  SESSION.profilePic = user.profile_pic || null;
  SESSION.interests = JSON.parse(user.interests || '[]');
  SESSION.division = user.division || SESSION.division || '';
  SESSION.isAgent = !!user.is_agent;
  SESSION.isLoggedIn = true;
  SESSION.isNewUser = false;
  SESSION.hasAccount = true;
  saveSession();
}

/* ══════════════════════════════
   BOOT SEQUENCE
══════════════════════════════ */
const BOOT_SEQ = [
  { t:'Initiating HALOS kernel v3.5…', c:'ok', p:5 },
  { t:'Loading S.P.A.C.E. cryptographic modules…', c:'ok', p:11 },
  { t:'Authenticating agent credentials…', c:'ok', p:17 },
  { t:'Connecting to HALOS Network…', c:'ok', p:23 },
  { t:'Synchronizing S.P.A.C.E. division roster…', c:'ok', p:30 },
  { t:'Calibrating AgentBus protocol v1.0…', c:'ok', p:37 },
  { t:'Loading Azulbright system cartography…', c:'ok', p:44 },
  { t:'Initializing WebRTC screen share layer…', c:'ok', p:51 },
  { t:'Mounting S.A.T.U.R.N. suit interface…', c:'ok', p:58 },
  { t:'Restoring persistent mission data…', c:'ok', p:65 },
  { t:'Scanning for Dark Matter anomalies…', c:'warn', p:71, w:'[!]No DMD deposits detected in local cache.' },
  { t:'Verifying Nova Terris relay nodes…', c:'ok', p:78 },
  { t:'Activating Live Communication Channel…', c:'ok', p:84 },
  { t:'Activating Star Chaser comms link…', c:'ok', p:90 },
  { t:'Running Cyber Pyramid security sweep…', c:'ok', p:95 },
  { t:`All systems nominal. Welcome, ${SESSION.username || 'Agent'}.`, c:'info', p:100 },
];

function runBoot() {
  // Always reset keypad state before booting so confirm mode can never bleed through
  _keypadMode = 'login';
  _pendingCode = '';
  _keypadEntered = '';

  $('keypad-screen').classList.add('hidden');
  $('login-screen').classList.add('hidden');
  $('boot-screen').classList.remove('hidden');
  loadLocal();
  cleanupCosmosCrewOnce();
  $('boot-division-label').textContent = 'S.P.A.C.E.';

  let i = 0; const lines = $('boot-lines'), fill = $('boot-bar-fill'), pctEl = $('boot-bar-pct'), labelEl = $('boot-bar-label'), indicator = $('boot-bar-indicator');
  function step() {
    if (i >= BOOT_SEQ.length) { setTimeout(launchApp, 500); return; }
    const b = BOOT_SEQ[i];
    const line = document.createElement('div'); line.className = 'boot-line ' + b.c; line.textContent = '> ' + b.t; lines.appendChild(line);
    if (b.w) { const w = document.createElement('div'); w.className = 'boot-line warn'; w.textContent = b.w; lines.appendChild(w); }
    lines.scrollTop = lines.scrollHeight;
    fill.style.width = b.p + '%'; pctEl.textContent = b.p + '%';
    if (indicator) indicator.style.left = b.p + '%';
    labelEl.textContent = ['INITIALIZING…','LOADING MODULES…','AUTHENTICATING…','SYNCING AGENTS…','CALIBRATING…','SCANNING…','MOUNTING…','RESTORING DATA…','SECURITY SWEEP…','READY'][Math.floor(i/2)] || 'READY';
    i++; setTimeout(step, 170 + Math.random() * 90);
  }
  setTimeout(step, 300);
}

function launchApp() {
  $('boot-screen').classList.add('fade-out');
  const app = $('app'); app.classList.remove('hidden'); app.style.opacity = '0';
  requestAnimationFrame(() => { app.style.transition = 'opacity 0.4s ease'; app.style.opacity = '1'; });

  applyAccent(SESSION.accent);
  updateProfileUI();
  generateStars('app-stars'); // populate background star field
  initAppParticles();        // subtle rising particles behind the UI
  initNav(); initChat(); initWorkspace(); initDocuments(); initScreenShare(); initAgents(); initProjects(); initRoster(); initSettings(); initFilePreview(); initVoiceToText(); initCallUI(); initHudChrome(); initTopbar();
  buildAgentTabs(); buildWorkspaceTabs(); renderAgentSidebar(); renderAgents(); renderWorkspace(); renderDocuments(); renderProjects(); buildSsAgentSelector(); updateAllBadges();
  restoreActivePanel();
  switchChat(STATE.activeChat || 'general');
  connectWS();
  // Kick off live-update pollers unconditionally — if cloudLoadAll or
  // loadMessageHistory fails, the user still needs incoming messages,
  // typing indicators, and incoming-call rings to keep flowing. The
  // data-load chain runs in parallel and refreshes whatever it can.
  startMessagePolling();
  startIncomingCallWatcher();
  // Light periodic refresh of shared state (group chats, screen shares)
  // so new rooms and active shares show up on other accounts without a
  // full reload.
  startSharedDataPolling();
  // Start the stocks background simulation so prices keep ticking and
  // auto-saving even when the user is on another panel.
  if (typeof startStocksBackground === 'function') {
    try { startStocksBackground(); } catch (e) {}
  }
  cloudLoadAll()
    .catch(() => {})
    .then(() => loadMessageHistory().catch(() => {}))
    .then(() => {
      // Seed Cosmos Crew missions AFTER shared storage has loaded, so
      // the seeder sees everything other devices already wrote and
      // doesn't re-seed in a loop. Cleanup also runs here so the old
      // mission-chapter-3 row is purged across devices.
      cleanupCosmosCrewOnce();
      seedCosmosCrewMissions();
      renderChat(STATE.activeChat); renderWorkspace(); renderDocuments(); renderProjects();
    });
  loadSidebarUsers();
  maybePromptNotifications();

  // Heartbeat every 2 min
  setInterval(() => {
    if (SESSION.email && SESSION.code) {
      fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'heartbeat', email:SESSION.email, code:SESSION.code, status:SESSION.status }) }).catch(()=>{});
    }
  }, 120000);

  // Kick off the ambient lofi pad — Web Audio context already unlocked by login clicks
  if (window.HALOSAudio) {
    HALOSAudio.init();
    HALOSAudio.resume();
    setTimeout(() => HALOSAudio.startAmbient(), 600);
  }
}

/* ══════════════════════════════
   NAV
══════════════════════════════ */
function setNavBadge(panelName, count) {
  const btn = document.querySelector(`.nav-btn[data-panel="${panelName}"]`);
  if (!btn) return;
  let badge = btn.querySelector('.nav-badge');
  if (count > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; btn.style.position = 'relative'; btn.appendChild(badge); }
    badge.textContent = count;
  } else if (badge) { badge.remove(); }
}
function loadNotifSeen() {
  if (STATE.notifSeen) return;
  try {
    const s = localStorage.getItem('halos_notif_seen');
    const d = s ? JSON.parse(s) : {};
    STATE.notifSeen = {
      projects: new Set(d.projects || []),
      roster: new Set(d.roster || []),
      screenshare: new Set(d.screenshare || []),
    };
  } catch {
    STATE.notifSeen = { projects: new Set(), roster: new Set(), screenshare: new Set() };
  }
}
function saveNotifSeen() {
  if (!STATE.notifSeen) return;
  try {
    localStorage.setItem('halos_notif_seen', JSON.stringify({
      projects: Array.from(STATE.notifSeen.projects),
      roster: Array.from(STATE.notifSeen.roster),
      screenshare: Array.from(STATE.notifSeen.screenshare),
    }));
  } catch {}
}
function updateAllBadges() {
  loadNotifSeen();
  // Projects: count incomplete missions NOT yet seen
  const incompleteUnseen = STATE.projects.filter(p =>
    p.todos.length && !p.todos.every(t => t.done) && !STATE.notifSeen.projects.has(p.id)
  ).length;
  setNavBadge('projects', incompleteUnseen);

  // Chat: total unread messages across all channels
  const totalUnread = Object.values(STATE.unread || {}).reduce((s, n) => s + n, 0);
  setNavBadge('chat', totalUnread);

  // Screen share: dot when someone invites you (and you haven't dismissed it)
  setNavBadge('screenshare', STATE.screenShareInvite ? 1 : 0);

  // Roster: show NEW AI account count badge when logged in as human
  if (!SESSION.isAgent) {
    fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'get_online_users' }) })
      .then(r => r.json())
      .then(data => {
        const aiUsers = (data.users || []).filter(u => u.is_agent);
        const newAI = aiUsers.filter(u => !STATE.notifSeen.roster.has(u.email));
        setNavBadge('roster', newAI.length);
      })
      .catch(() => {});
  }
}

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = $('panel-' + btn.dataset.panel);
      if (panel) panel.classList.add('active');
      lsSet('activePanel', btn.dataset.panel);
      loadNotifSeen();
      if (btn.dataset.panel === 'roster') {
        loadRoster();
        // Mark all currently-known AI accounts as seen
        fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'get_online_users' }) })
          .then(r => r.json())
          .then(data => {
            (data.users || []).filter(u => u.is_agent).forEach(u => STATE.notifSeen.roster.add(u.email));
            saveNotifSeen();
          })
          .catch(() => {});
        setNavBadge('roster', 0);
      }
      if (btn.dataset.panel === 'chat') { if (STATE.unread) { Object.keys(STATE.unread).forEach(k => STATE.unread[k] = 0); } setNavBadge('chat', 0); }
      if (btn.dataset.panel === 'screenshare') { STATE.screenShareInvite = false; setNavBadge('screenshare', 0); loadSidebarUsers(); try { renderSsInvites(); } catch {} }
      if (btn.dataset.panel === 'projects') {
        // Mark all currently-incomplete projects as seen so badge doesn't reappear
        STATE.projects.forEach(p => {
          if (p.todos.length && !p.todos.every(t => t.done)) STATE.notifSeen.projects.add(p.id);
        });
        saveNotifSeen();
        setNavBadge('projects', 0);
      }
      if (btn.dataset.panel === 'azulbright') { startAzulbrightFeed(); } else { stopAzulbrightFeed(); }
      if (btn.dataset.panel === 'stocks') { startStocksFeed(); } else { stopStocksFeed(); }
      // Immediately sync all psh-time elements so the clock never shows "—" on tab switch
      const azt = azulbrightNow ? azulbrightNow() : null;
      if (azt) document.querySelectorAll('.psh-time').forEach(el => { el.textContent = azt + ' AZT'; });
      // Mirror connection status into panel headers
      syncConnStatusMirrors();
    });
  });
  // Collapse sidebar toggle
  $('btn-collapse-sidebar').addEventListener('click', () => {
    $('app').classList.toggle('sidebar-collapsed');
    lsSet('sidebar_collapsed', $('app').classList.contains('sidebar-collapsed') ? '1' : '');
  });
  if (lsGet('sidebar_collapsed') === '1') $('app').classList.add('sidebar-collapsed');

  // Lock button — save locked state then reload so keypad reinitializes fresh
  $('btn-lock').addEventListener('click', () => {
    SESSION.isLoggedIn = false;
    SESSION.code = null;
    saveSession();
    // Reload the page — localStorage persists across reloads, so hasAccount/email/firstName
    // are still there, meaning the page will show keypad in login mode cleanly
    window.location.reload();
  });
}

// Restore the last panel the user was on before refresh/lock. Falls back
// to the current default (chat) when no preference is stored.
function restoreActivePanel() {
  const saved = lsGet('activePanel');
  if (!saved) return;
  const btn = document.querySelector(`.nav-btn[data-panel="${saved}"]`);
  if (!btn) return;
  btn.click();
}


/* ══════════════════════════════════════════════════════════════════
   HERMES GATEWAY — server-proxied
   ════════════════════════════════════════════════════════════════════
   HALOS Interface talks to HALOS (the Hermes agent) through a server-
   side proxy at /api/hermes. The gateway URL + token live in Vercel
   env vars (HERMES_URL, HERMES_TOKEN), so any signed-in user can
   message HALOS from any device without configuring anything.

   Flow per message:
     1. sendMsg() writes the user bubble locally and calls sendAgentMsg()
     2. sendAgentMsg() POSTs to /api/hermes with {action:'send', ...}
     3. The serverless function opens a short-lived WebSocket to
        Hermes, does the Protocol v3 handshake, runs the `agent`
        RPC, and returns the completed reply text.
     4. We push that reply into the right chat.
   ════════════════════════════════════════════════════════════════════ */

function connectWS() {
  // Three explicit states: Connecting (loading), Connected (online),
  // Failed to connect (no network or proxy unreachable). The pill is
  // always visible so the user can see real connection health.
  const pill = $('conn-status');
  if (pill) pill.classList.remove('hidden');
  if (!SESSION.email || !SESSION.code) {
    setConnStatus('disconnected', 'Failed to connect');
    return;
  }
  // Show loading state immediately while the request is in flight
  setConnStatus('connecting', 'Connecting');
  // If browser reports offline, short-circuit to failed state
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setConnStatus('disconnected', 'Failed to connect');
    return;
  }
  fetch('/api/hermes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', email: SESSION.email, code: SESSION.code }),
  })
    .then(r => r.json().then(j => ({ ok: r.ok, body: j })))
    .then(({ ok, body }) => {
      if (ok && body && body.configured) {
        STATE.hermesReady = true;
        setConnStatus('connected', 'Connected');
      } else {
        // Server reachable but gateway not configured — still treat as
        // a working chat connection (cloud message store is independent).
        STATE.hermesReady = false;
        setConnStatus('connected', 'Connected');
      }
    })
    .catch(() => {
      STATE.hermesReady = false;
      setConnStatus('disconnected', 'Failed to connect');
    });
}

// React to network-state changes globally
if (typeof window !== 'undefined') {
  window.addEventListener('online',  () => { try { setConnStatus('connecting', 'Connecting'); connectWS(); } catch (e) {} });
  window.addEventListener('offline', () => { try { setConnStatus('disconnected', 'Failed to connect'); } catch (e) {} });
}

// POST a chat message to the proxy and push the reply into the chat.
// Failures are logged to the console but never spam the chat log — a
// disabled gateway should feel like "no response", not a flood of errors.
async function sendAgentMsg(chatId, text) {
  if (!SESSION.email || !SESSION.code) return;
  showTyping('HALOS');
  try {
    const r = await fetch('/api/hermes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        email: SESSION.email,
        code: SESSION.code,
        chatId: chatId,
        text: text,
      }),
    });
    const body = await r.json().catch(() => ({}));
    $('typing-indicator').classList.add('hidden');
    if (!r.ok) {
      console.warn('HALOS error:', (body && (body.detail || body.error)) || ('HTTP ' + r.status));
      if (r.status === 503) STATE.hermesReady = false;
      return;
    }
    const reply = (body && body.text) || '';
    if (!reply) return;
    pushMsg(chatId, {
      from: 'HALOS',
      text: reply,
      ts: Date.now(),
      incoming: true,
    });
  } catch (err) {
    $('typing-indicator').classList.add('hidden');
    console.warn('HALOS request failed:', err);
  }
}

/* ══════════════════════════════════════════════════════════════════
   USER-TO-USER MESSAGES — server-stored, polled
   ════════════════════════════════════════════════════════════════════
   Backed by /api/messages and the halos_messages table. Routing rule:
     chatId === 'user-<email>'  →  /api/messages   (this section)
     anything else              →  /api/hermes   (HALOS agent)
   ════════════════════════════════════════════════════════════════════ */

function isUserChat(chatId) {
  return typeof chatId === 'string' && chatId.startsWith('user-');
}

// POST a message to another HALOS account. The optimistic local message
// has already been pushed by sendMsg() with id = pendingId; on success we
// re-key it to 'server-<id>' so the next poll dedupes correctly.
async function sendUserMsg(chatId, text, pendingId, file, recipientOverride, opts) {
  const recipient = recipientOverride || (isUserChat(chatId) ? chatId.slice('user-'.length) : null);
  if (!recipient) return false;
  if (!SESSION.email || !SESSION.code) {
    addErrorMsg('Sign in required to send messages.');
    dropPendingMsg(chatId, pendingId);
    return false;
  }
  const payload = {
    action: 'send',
    email: SESSION.email,
    code: SESSION.code,
    recipient: recipient,
    text: text || '',
    file: file || null,
    ts: Date.now(),
  };
  if (opts && opts.veryImportant) payload.veryImportant = true;
  try {
    const r = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      addErrorMsg('Failed to send: ' + ((body && (body.error)) || ('HTTP ' + r.status)));
      dropPendingMsg(chatId, pendingId);
      return false;
    }
    const m = body.message;
    if (!m) { dropPendingMsg(chatId, pendingId); return false; }
    // Re-key the optimistic local message so dedup works on the next poll.
    const arr = STATE.chats[chatId];
    if (arr && pendingId) {
      const local = arr.find(x => x.id === pendingId);
      if (local) {
        local.id = 'server-' + m.id;
        persistChats();
      }
    }
    if (m.id > (STATE.lastMsgId || 0)) STATE.lastMsgId = m.id;
    return true;
  } catch (err) {
    addErrorMsg('Send failed: ' + (err && err.message));
    dropPendingMsg(chatId, pendingId);
    return false;
  }
}

// Remove a stuck optimistic message after a send failure so the user
// doesn't see a ghost entry that never actually reached the server.
function dropPendingMsg(chatId, pendingId) {
  if (!pendingId) return;
  const arr = STATE.chats[chatId];
  if (!arr) return;
  const i = arr.findIndex(x => x.id === pendingId);
  if (i < 0) return;
  arr.splice(i, 1);
  persistChats();
  if (chatId === STATE.activeChat) renderChat(chatId);
}

// One-time backfill on login: pulls every message involving this user
// and rebuilds the user-* chat threads from scratch. Bypasses pushMsg so
// we don't fire notifications/unread badges for old history.
async function loadMessageHistory() {
  if (!SESSION.email || !SESSION.code) return;
  try {
    const r = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fetch_since',
        email: SESSION.email,
        code: SESSION.code,
        since_id: 0,
      }),
    });
    if (!r.ok) return;
    const { messages } = await r.json();
    if (!Array.isArray(messages)) return;

    // Server is the source of truth for user-to-user chats AND channel
    // chats — replace any stale local copies from cloudLoadAll().
    Object.keys(STATE.chats).forEach(k => {
      if (k.startsWith('user-') || k === 'general') STATE.chats[k] = [];
    });

    let maxId = 0;
    for (const m of messages) {
      const msgId = 'server-' + m.id;
      if (m.id > maxId) maxId = m.id;
      // Skip messages the user has previously deleted on this account.
      if (DELETED_MSG_IDS.has(msgId)) continue;
      const isOwn = m.senderEmail === SESSION.email;
      const isChannel = typeof m.recipientEmail === 'string' && m.recipientEmail.startsWith('channel:');
      const chatId = isChannel
        ? m.recipientEmail.slice('channel:'.length)
        : 'user-' + (isOwn ? m.recipientEmail : m.senderEmail);
      if (!STATE.chats[chatId]) STATE.chats[chatId] = [];
      STATE.chats[chatId].push({
        id: msgId,
        from: m.from,
        senderEmail: m.senderEmail,
        text: m.text || '',
        file: m.file || null,
        ts: m.ts,
        incoming: !isOwn,
        veryImportant: !!m.veryImportant || IMPORTANT_MSG_IDS.has(msgId),
      });
    }
    STATE.lastMsgId = maxId;
    persistChats();
    renderChat(STATE.activeChat);
  } catch (err) {
    console.error('Message history load failed:', err);
  }
}

// Live polling. Fetches messages with id > lastMsgId and routes each one
// through pushMsg, which handles unread badges + OS notifications.
async function pollMessages() {
  if (!SESSION.email || !SESSION.code) return;
  try {
    const r = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fetch_since',
        email: SESSION.email,
        code: SESSION.code,
        since_id: STATE.lastMsgId || 0,
      }),
    });
    if (!r.ok) return;
    const body = await r.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const typing = Array.isArray(body.typing) ? body.typing : [];

    if (messages.length) {
      let maxId = STATE.lastMsgId || 0;
      for (const m of messages) {
        const isOwn = m.senderEmail === SESSION.email;
        // Channel messages (recipient = 'channel:general' etc) map to the
        // channel name as chatId. DMs map to 'user-<peer>'.
        const isChannel = typeof m.recipientEmail === 'string' && m.recipientEmail.startsWith('channel:');
        const chatId = isChannel
          ? m.recipientEmail.slice('channel:'.length)
          : 'user-' + (isOwn ? m.recipientEmail : m.senderEmail);
        const msgId = 'server-' + m.id;
        if (m.id > maxId) maxId = m.id;
        // Skip messages this account has deleted — they stay gone across reloads.
        if (DELETED_MSG_IDS.has(msgId)) continue;
        const arr = STATE.chats[chatId];
        // Dedup against optimistic-then-rekeyed local copies and re-fetches
        if (arr && arr.some(x => x.id === msgId)) continue;
        pushMsg(chatId, {
          id: msgId,
          from: m.from,
          senderEmail: m.senderEmail,
          text: m.text || '',
          file: m.file || null,
          ts: m.ts,
          incoming: !isOwn,
          veryImportant: !!m.veryImportant || IMPORTANT_MSG_IDS.has(msgId),
        });
      }
      STATE.lastMsgId = maxId;
    }

    applyIncomingTyping(typing);
  } catch {}
}

let _msgPollTimer = null;
function startMessagePolling() {
  if (_msgPollTimer) return;
  const tick = () => {
    pollMessages().finally(() => {
      const delay = document.visibilityState === 'visible' ? 3000 : 30000;
      _msgPollTimer = setTimeout(tick, delay);
    });
  };
  tick();
}

// Lightweight pull of shared-only state (group chats, screen shares) so
// other accounts see new group rooms and active shares without a full
// page refresh. We keep this separate from message polling so it can
// run on a slower cadence.
let _sharedRefreshTimer = null;
async function refreshSharedData() {
  if (!SESSION.email || !SESSION.code) return;
  try {
    const r = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_shared', email: SESSION.email, code: SESSION.code })
    });
    if (!r.ok) return;
    const { data } = await r.json();
    if (!data) return;
    let groupChanged = false;
    if (data.groupChats) {
      try {
        const remote = JSON.parse(data.groupChats) || {};
        // Merge — remote can only ADD new rooms or rename existing ones.
        // Local deletions are respected by skipping rooms we already have
        // but omit on purpose only if they never existed locally.
        Object.keys(remote).forEach(gid => {
          if (!STATE.groupChats[gid]) {
            STATE.groupChats[gid] = remote[gid];
            groupChanged = true;
          } else {
            // Pull through name updates from other accounts.
            const rm = remote[gid];
            const lc = STATE.groupChats[gid];
            if (rm.name && rm.name !== lc.name) {
              lc.name = rm.name;
              groupChanged = true;
            }
          }
        });
        if (groupChanged) lsSet('groupChats', JSON.stringify(STATE.groupChats));
      } catch {}
    }
    if (data.screenShares) {
      try {
        const remote = JSON.parse(data.screenShares) || {};
        STATE.screenShares = remote;
        if (typeof renderSsInvites === 'function') {
          try { renderSsInvites(); } catch {}
        }
      } catch {}
    }
    if (groupChanged) {
      try { rebuildChatSelector(); } catch {}
      try { buildAgentTabs(); } catch {}
      try { renderAgentSidebar(); } catch {}
    }
  } catch {}
}
function startSharedDataPolling() {
  if (_sharedRefreshTimer) return;
  const tick = () => {
    refreshSharedData().finally(() => {
      const delay = document.visibilityState === 'visible' ? 15000 : 60000;
      _sharedRefreshTimer = setTimeout(tick, delay);
    });
  };
  tick();
}

// Legacy shim for call sites that still pass {type:'chat'|'typing'|…}.
// User chats route to /api/messages; everything else (the default 'general'
// chat, AI agents, etc.) routes to HALOS via /api/hermes. typing/file/
// screen/remote_input have no equivalent transport and are dropped.
function sendWS(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.type === 'chat' && payload.text) {
    const chatId = payload.agentId || STATE.activeChat;
    if (isUserChat(chatId)) {
      sendUserMsg(chatId, String(payload.text), payload.pendingId);
    } else {
      sendAgentMsg(chatId, String(payload.text));
    }
    return true;
  }
  return false;
}

function setConnStatus(state, text) {
  const el = $('conn-status');
  el.className = 'connection-status ' + state;
  el.querySelector('.status-text').textContent = text;
  syncConnStatusMirrors();
}
function syncConnStatusMirrors() {
  const src = $('conn-status');
  if (!src) return;
  const cls = src.className;
  const txt = src.querySelector('.status-text')?.textContent || '';
  document.querySelectorAll('[data-conn-mirror]').forEach(el => {
    el.className = cls + ' panel-conn-status';
    el.innerHTML = `<span class="status-dot"></span><span class="status-text">${txt}</span>`;
  });
}

/* ══════════════════════════════════════════════════════════════════
   VOICE CALLS — WebRTC + polled signaling
   ════════════════════════════════════════════════════════════════════
   One outgoing or incoming call at a time. Signaling rides on the
   halos_call_signals table via /api/calls, which the normal message
   poll cycle also drains. Media is peer-to-peer over WebRTC using
   public STUN — no TURN server, so symmetric-NAT pairs may fail and
   fall back to a "call failed" state.
   ════════════════════════════════════════════════════════════════════ */

const CALL = {
  id: null,          // shared call id, initiator picks it
  state: 'idle',     // idle | outgoing | incoming | active
  peer: null,        // { email, name }
  isCaller: false,
  pc: null,
  localStream: null,
  lastSignalId: 0,
  pollTimer: null,
  pendingIce: [],    // ICE candidates received before remoteDescription is set
  muted: false,
  timeoutTimer: null,
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function initCallUI() {
  const callHandler = () => {
    if (CALL.state !== 'idle') return;
    // If we're already in a user chat, call that person directly.
    // Otherwise show a contact picker so the user can call anyone.
    if (isUserChat(STATE.activeChat)) {
      startOutgoingCall(STATE.activeChat.slice('user-'.length));
    } else {
      showCallPicker();
    }
  };
  // NOTE: topbar-call is wired via initGlobalTopbarDelegation for robustness.
  // Sidebar btn-call was removed — if reintroduced elsewhere, it still wires
  // here.
  const btn = $('btn-call');
  if (btn) btn.addEventListener('click', callHandler);
  const acceptBtn = $('call-accept');
  if (acceptBtn) acceptBtn.addEventListener('click', () => acceptIncomingCall());
  const declineBtn = $('call-decline');
  if (declineBtn) declineBtn.addEventListener('click', () => declineOrHangup());
  const hangupBtn = $('call-hangup');
  if (hangupBtn) hangupBtn.addEventListener('click', () => declineOrHangup());
  const muteBtn = $('call-mute');
  if (muteBtn) muteBtn.addEventListener('click', () => toggleCallMute());
  const camBtn = $('call-camera');
  if (camBtn) camBtn.addEventListener('click', () => toggleCallCamera());
  const chatBtn = $('call-chat');
  if (chatBtn) chatBtn.addEventListener('click', () => toggleCallChat());
}

function showCallPicker() {
  // Self is identified by (email + agent type) pair — a human and an AI
  // can legitimately share the same email, but you should never see
  // yourself as a call target. Previous filter used || which let you
  // through whenever one half matched (hence: calling yourself).
  const users = (STATE.serverUsers || []).filter(u =>
    !(u.email === SESSION.email && u.is_agent === !!SESSION.isAgent)
  );
  if (!users.length) return;
  const items = users.map(u => {
    const name = u.username || u.first_name || u.email;
    return `<div class="call-pick-item" data-email="${escHtml(u.email)}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s">
      <div style="width:34px;height:34px;border-radius:50%;border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--font-a);color:var(--accent);font-size:1rem">${name[0].toUpperCase()}</div>
      <div style="flex:1;font-family:var(--font-b);font-size:0.85rem;color:var(--text1)">${escHtml(name)}</div>
      <div style="font-size:0.65rem;font-family:var(--font-m);color:var(--text3)">${u.is_agent ? 'AI' : 'Human'}</div>
    </div>`;
  }).join('');
  showCallOverlay('Call Who?', '', 'Select a contact', { showDecline: true });
  $('call-avatar').style.display = 'none';
  $('call-name').innerHTML = `<div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);margin-top:8px">${items}</div>`;
  $('call-name').querySelectorAll('.call-pick-item').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'var(--bg3)');
    el.addEventListener('mouseleave', () => el.style.background = '');
    el.addEventListener('click', () => {
      $('call-avatar').style.display = '';
      hideCallOverlay();
      startOutgoingCall(el.dataset.email);
    });
  });
}

function showCallOverlay(title, name, status, opts) {
  const overlay = $('call-overlay');
  if (!overlay) return;
  $('call-title').textContent = title;
  $('call-name').textContent = name || 'Unknown';
  $('call-status').textContent = status || '';
  $('call-avatar').textContent = (name || '?')[0].toUpperCase();
  $('call-avatar').style.display = '';
  $('call-accept').style.display  = opts.showAccept  ? '' : 'none';
  $('call-decline').style.display = opts.showDecline ? '' : 'none';
  $('call-hangup').style.display  = opts.showHangup  ? '' : 'none';
  $('call-mute').style.display    = opts.showMute    ? '' : 'none';
  $('call-camera').style.display  = opts.showCamera  ? '' : 'none';
  $('call-chat').style.display    = opts.showChat    ? '' : 'none';
  overlay.classList.remove('hidden');
}

function hideCallOverlay() {
  const overlay = $('call-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function updateCallStatus(text) {
  const el = $('call-status'); if (el) el.textContent = text;
}

async function startOutgoingCall(peerEmail) {
  if (CALL.state !== 'idle') return;
  if (!peerEmail) return;
  const peer = (STATE.serverUsers || []).find(u => u.email === peerEmail);
  const peerName = peer ? (peer.username || peer.first_name || peerEmail) : peerEmail;

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    console.warn('Mic access denied:', err);
    showCallOverlay('Call Failed', peerName, 'Microphone access denied.', { showDecline: true });
    return;
  }

  CALL.id = 'call-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  CALL.state = 'outgoing';
  CALL.isCaller = true;
  CALL.peer = { email: peerEmail, name: peerName };
  CALL.localStream = stream;
  if (window.HALOSAudio) HALOSAudio.callStartSfx();

  showCallOverlay('Calling…', peerName, 'Ringing…', { showDecline: true });

  setupPeerConnection();
  for (const track of stream.getTracks()) CALL.pc.addTrack(track, stream);

  try {
    const offer = await CALL.pc.createOffer();
    await CALL.pc.setLocalDescription(offer);
    await sendCallSignal('offer', { sdp: offer });
  } catch (err) {
    console.warn('Failed to create offer:', err);
    endCall('Could not start call.');
    return;
  }

  startCallPolling();

  // Abandon the call if the other side doesn't pick up in 45s.
  CALL.timeoutTimer = setTimeout(() => {
    if (CALL.state === 'outgoing') endCall('No answer.');
  }, 45000);
}

function setupPeerConnection() {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  CALL.pc = pc;
  pc.onicecandidate = (e) => {
    if (e.candidate) sendCallSignal('ice', { candidate: e.candidate });
  };
  pc.ontrack = (e) => {
    if (e.track.kind === 'video') {
      const vid = $('call-remote-video');
      if (vid && e.streams && e.streams[0]) { vid.srcObject = e.streams[0]; vid.style.display = ''; }
    } else {
      const audio = $('call-remote-audio');
      if (audio && e.streams && e.streams[0]) audio.srcObject = e.streams[0];
    }
  };
  pc.onconnectionstatechange = () => {
    if (!CALL.pc) return;
    const s = pc.connectionState;
    if (s === 'connected') {
      CALL.state = 'active';
      if (CALL.timeoutTimer) { clearTimeout(CALL.timeoutTimer); CALL.timeoutTimer = null; }
      showCallOverlay('On Call', CALL.peer?.name || 'Unknown', 'Connected', { showMute: true, showCamera: true, showChat: true, showHangup: true });
    } else if (s === 'failed' || s === 'disconnected' || s === 'closed') {
      if (CALL.state !== 'idle') endCall(s === 'failed' ? 'Call failed.' : 'Call ended.');
    }
  };
}

async function handleIncomingCall(signal) {
  if (CALL.state !== 'idle') {
    // Already on a call — auto-decline.
    await sendCallSignalDirect(signal.fromEmail, 'decline', signal.callId, null);
    return;
  }
  CALL.id = signal.callId;
  CALL.state = 'incoming';
  CALL.isCaller = false;
  CALL.peer = { email: signal.fromEmail, name: signal.from };
  CALL.pendingIce = [];
  // Stash the offer for acceptIncomingCall()
  CALL._pendingOffer = signal.payload?.sdp || null;
  showCallOverlay('Incoming Call', signal.from, 'Ringing…', { showAccept: true, showDecline: true });
  startCallPolling();
  if (window.HALOSAudio && HALOSAudio.sendSfx) HALOSAudio.sendSfx();
  if (SESSION.notifCalls !== false) {
    notifyUser('HALOS · Incoming Call', `${signal.from} is calling`, { tag: 'halos-call-' + signal.callId, requireInteraction: true });
    try { window.halosNotify?.({ title: 'Incoming Call', body: `${signal.from} is calling`, kind: 'purple' }); } catch {}
  }
}

async function acceptIncomingCall() {
  if (CALL.state !== 'incoming' || !CALL._pendingOffer) return;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    console.warn('Mic access denied:', err);
    endCall('Microphone access denied.');
    return;
  }
  CALL.localStream = stream;
  setupPeerConnection();
  for (const track of stream.getTracks()) CALL.pc.addTrack(track, stream);
  try {
    await CALL.pc.setRemoteDescription(new RTCSessionDescription(CALL._pendingOffer));
    // Drain any ICE candidates that arrived before setRemoteDescription.
    for (const c of CALL.pendingIce) {
      try { await CALL.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    CALL.pendingIce = [];
    const answer = await CALL.pc.createAnswer();
    await CALL.pc.setLocalDescription(answer);
    await sendCallSignal('answer', { sdp: answer });
    CALL._pendingOffer = null;
    updateCallStatus('Connecting…');
    showCallOverlay('On Call', CALL.peer?.name || 'Unknown', 'Connecting…', { showMute: true, showCamera: true, showChat: true, showHangup: true });
  } catch (err) {
    console.warn('Accept failed:', err);
    endCall('Call failed.');
  }
}

function declineOrHangup() {
  if (CALL.state === 'idle') { hideCallOverlay(); return; }
  const kind = CALL.state === 'incoming' ? 'decline' : 'hangup';
  // Fire the signal in the background so a slow network can't leave the
  // overlay frozen with no way out.
  try { sendCallSignal(kind, null); } catch {}
  endCall(kind === 'decline' ? 'Declined.' : 'Call ended.');
  hideCallOverlay();
}

function toggleCallMute() {
  if (!CALL.localStream) return;
  CALL.muted = !CALL.muted;
  CALL.localStream.getAudioTracks().forEach(t => t.enabled = !CALL.muted);
  const btn = $('call-mute'); if (btn) btn.textContent = CALL.muted ? 'Unmute' : 'Mute';
}

async function toggleCallCamera() {
  if (!CALL.pc || CALL.state !== 'active') return;
  const localVid = $('call-local-video');
  const btn = $('call-camera');
  if (CALL.cameraOn) {
    // Turn off — replace video sender track with null, then stop tracks
    const videoSenders = CALL.pc.getSenders().filter(s => s.track?.kind === 'video');
    await Promise.all(videoSenders.map(s => s.replaceTrack(null).catch(() => {})));
    CALL.localStream.getVideoTracks().forEach(t => { t.stop(); CALL.localStream.removeTrack(t); });
    CALL.cameraOn = false;
    if (localVid) { localVid.srcObject = null; localVid.style.display = 'none'; }
    if (btn) btn.textContent = 'Camera';
  } else {
    // Turn on — get camera, replace or add video track
    try {
      const vidStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const newTrack = vidStream.getVideoTracks()[0];
      CALL.localStream.addTrack(newTrack);
      const existingSender = CALL.pc.getSenders().find(s => s.track === null || s.track?.kind === 'video');
      if (existingSender) {
        await existingSender.replaceTrack(newTrack);
      } else {
        CALL.pc.addTrack(newTrack, CALL.localStream);
        // New sender requires renegotiation
        const offer = await CALL.pc.createOffer();
        await CALL.pc.setLocalDescription(offer);
        sendCallSignal('offer', { sdp: CALL.pc.localDescription });
      }
      CALL.cameraOn = true;
      if (localVid) { localVid.srcObject = vidStream; localVid.style.display = ''; }
      if (btn) btn.textContent = 'Camera Off';
    } catch (err) {
      console.warn('Camera access denied:', err);
    }
  }
}

function toggleCallChat() {
  // Minimize/show the call overlay and bring the chat panel to the front.
  const overlay = $('call-overlay');
  if (!overlay) return;
  if (overlay.classList.contains('call-minimized')) {
    overlay.classList.remove('call-minimized');
    overlay.querySelector('.modal-box').style.display = '';
    const btn = $('call-chat'); if (btn) btn.textContent = 'Chat';
  } else {
    overlay.classList.add('call-minimized');
    overlay.querySelector('.modal-box').style.display = 'none';
    // Switch to chat panel
    const chatBtn = document.querySelector('.nav-btn[data-panel="chat"]');
    if (chatBtn) chatBtn.click();
    // Show a floating "back to call" button
    showReturnToCallBanner();
  }
}

function showReturnToCallBanner() {
  let banner = $('call-return-banner');
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'call-return-banner';
  banner.style.cssText = 'position:fixed;top:12px;right:12px;z-index:600;padding:10px 18px;background:var(--accent);color:var(--bg);border-radius:99px;font-family:var(--font-d);font-size:0.72rem;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,229,255,0.4);animation:statusPulse 2s ease infinite;letter-spacing:0.08em';
  banner.textContent = 'Return to Call';
  banner.addEventListener('click', () => {
    const overlay = $('call-overlay');
    if (overlay) { overlay.classList.remove('call-minimized'); overlay.querySelector('.modal-box').style.display = ''; }
    banner.remove();
  });
  document.body.appendChild(banner);
}

function endCall(reason) {
  if (CALL.state !== 'idle' && window.HALOSAudio) HALOSAudio.callEndSfx();
  if (CALL.timeoutTimer) { clearTimeout(CALL.timeoutTimer); CALL.timeoutTimer = null; }
  if (CALL.pc) { try { CALL.pc.close(); } catch {} CALL.pc = null; }
  if (CALL.localStream) { CALL.localStream.getTracks().forEach(t => { try { t.stop(); } catch {} }); CALL.localStream = null; }
  const audio = $('call-remote-audio'); if (audio) audio.srcObject = null;
  const localVid = $('call-local-video'); if (localVid) { localVid.srcObject = null; localVid.style.display = 'none'; }
  const remoteVid = $('call-remote-video'); if (remoteVid) { remoteVid.srcObject = null; remoteVid.style.display = 'none'; }
  const banner = $('call-return-banner'); if (banner) banner.remove();
  if (reason) updateCallStatus(reason);
  const wasActive = CALL.state !== 'idle';
  CALL.state = 'idle';
  CALL.id = null;
  CALL.peer = null;
  CALL.isCaller = false;
  CALL.pendingIce = [];
  CALL.muted = false;
  CALL.cameraOn = false;
  CALL._pendingOffer = null;
  stopCallPolling();
  hideCallOverlay();
}

async function sendCallSignal(kind, payload) {
  if (!CALL.peer) return;
  return sendCallSignalDirect(CALL.peer.email, kind, CALL.id, payload);
}

async function sendCallSignalDirect(to, kind, callId, payload) {
  if (!SESSION.email || !SESSION.code) return;
  try {
    await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signal',
        email: SESSION.email,
        code: SESSION.code,
        to, kind, callId, payload,
      }),
    });
  } catch (err) {
    console.warn('sendCallSignal failed:', err);
  }
}

function startCallPolling() {
  if (CALL.pollTimer) return;
  const tick = () => {
    pollCallSignals().finally(() => {
      CALL.pollTimer = setTimeout(tick, 1000);
    });
  };
  tick();
}

function stopCallPolling() {
  if (CALL.pollTimer) { clearTimeout(CALL.pollTimer); CALL.pollTimer = null; }
}

async function pollCallSignals() {
  if (!SESSION.email || !SESSION.code) return;
  try {
    const r = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fetch_since',
        email: SESSION.email,
        code: SESSION.code,
        since_id: CALL.lastSignalId || 0,
      }),
    });
    if (!r.ok) return;
    const { signals } = await r.json();
    if (!Array.isArray(signals)) return;
    for (const sig of signals) {
      if (sig.id > CALL.lastSignalId) CALL.lastSignalId = sig.id;
      // Defense-in-depth: never deliver a signal that originated from
      // our own account back to ourselves. Without this, a self-call
      // loop (same account logged in twice, or a stale signal) would
      // ring this tab as if someone else were calling.
      if (sig.fromEmail && SESSION.email &&
          String(sig.fromEmail).toLowerCase() === String(SESSION.email).toLowerCase()) {
        continue;
      }
      handleCallSignal(sig);
    }
  } catch {}
}

async function handleCallSignal(sig) {
  // Meet-room WebRTC signals are handled separately
  if (sig.kind.startsWith('meet-')) { handleMeetSignal(sig); return; }

  // offer: incoming new call, renegotiation during active call, or stray
  if (sig.kind === 'offer') {
    if (CALL.state === 'idle') {
      handleIncomingCall(sig);
    } else if (CALL.state === 'active' && CALL.id === sig.callId && CALL.pc) {
      // Camera/track renegotiation from remote peer
      try {
        await CALL.pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
        const answer = await CALL.pc.createAnswer();
        await CALL.pc.setLocalDescription(answer);
        sendCallSignal('answer', { sdp: CALL.pc.localDescription });
      } catch (err) {
        console.warn('Call renegotiation failed:', err);
      }
    } else if (CALL.id !== sig.callId) {
      // Busy — auto-decline
      sendCallSignalDirect(sig.fromEmail, 'decline', sig.callId, null);
    }
    return;
  }
  if (sig.callId !== CALL.id) return;
  if (sig.kind === 'answer' && CALL.pc) {
    try {
      await CALL.pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
      for (const c of CALL.pendingIce) {
        try { await CALL.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      CALL.pendingIce = [];
      updateCallStatus('Connecting…');
    } catch (err) {
      console.warn('setRemoteDescription(answer) failed:', err);
      endCall('Call failed.');
    }
  } else if (sig.kind === 'ice' && sig.payload && sig.payload.candidate) {
    if (CALL.pc && CALL.pc.remoteDescription) {
      try { await CALL.pc.addIceCandidate(new RTCIceCandidate(sig.payload.candidate)); } catch {}
    } else {
      CALL.pendingIce.push(sig.payload.candidate);
    }
  } else if (sig.kind === 'decline') {
    endCall('Declined.');
  } else if (sig.kind === 'hangup') {
    endCall('Call ended.');
  }
}

// Start a lightweight background poll that only listens for incoming
// call offers when no call is in progress. Once a call starts the
// dedicated startCallPolling loop takes over.
let _incomingCallPollTimer = null;
function startIncomingCallWatcher() {
  if (_incomingCallPollTimer) return;
  const tick = () => {
    if (CALL.state === 'idle') pollCallSignals().finally(schedule);
    else schedule();
  };
  const schedule = () => {
    _incomingCallPollTimer = setTimeout(tick, document.visibilityState === 'visible' ? 2000 : 15000);
  };
  tick();
}

/* ══════════════════════════════
   CHAT
══════════════════════════════ */
function initChat() {
  $('chat-form').addEventListener('submit', e => { e.preventDefault(); sendMsg(); });
  $('message-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  $('message-input').addEventListener('input', () => {
    const ta = $('message-input'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight,130)+'px';
    maybeSendTypingPing(STATE.activeChat);
  });
  // Chat selector dropdown — lets you pick a chat without visiting the roster
  const sel = $('chat-selector');
  if (sel) sel.addEventListener('change', () => { if (sel.value) switchChat(sel.value); });
  // Group chat rename button (hidden unless a group chat is active).
  const renameBtn = $('btn-rename-chat');
  if (renameBtn) renameBtn.addEventListener('click', () => {
    if (isGroupChat(STATE.activeChat)) renameGroupChat(STATE.activeChat);
  });
  $('attach-btn').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', e => { [...e.target.files].forEach(uploadFile); $('file-input').value=''; });

  // VERY IMPORTANT toggle — arms next outgoing message as urgent
  STATE.urgentMode = false;
  const urgentBtn = $('btn-urgent');
  if (urgentBtn) urgentBtn.addEventListener('click', () => {
    STATE.urgentMode = !STATE.urgentMode;
    urgentBtn.classList.toggle('tool-btn-urgent-active', STATE.urgentMode);
    const inp = $('message-input');
    if (inp) {
      inp.classList.toggle('urgent-mode-input', STATE.urgentMode);
      inp.placeholder = STATE.urgentMode ? '[!] VERY IMPORTANT — all agents will be alerted…' : 'Transmit a message…';
    }
  });
  const chatPanel = $('panel-chat');
  chatPanel.addEventListener('dragover', e => { e.preventDefault(); $('chat-drop-zone').classList.remove('hidden'); });
  chatPanel.addEventListener('dragleave', e => { if (!chatPanel.contains(e.relatedTarget)) $('chat-drop-zone').classList.add('hidden'); });
  chatPanel.addEventListener('drop', e => { e.preventDefault(); $('chat-drop-zone').classList.add('hidden'); [...e.dataTransfer.files].forEach(uploadFile); });
  $('chat-messages').addEventListener('scroll', () => { if ($('chat-messages').scrollTop === 0) { const d = document.createElement('div'); d.className='msg-system'; d.textContent='— Beginning of history —'; $('chat-messages').prepend(d); } });
  renderChat(STATE.activeChat);
}

function rebuildChatSelector() {
  const sel = $('chat-selector'); if (!sel) return;
  sel.innerHTML = '';
  // General channel is always first
  const opt = document.createElement('option');
  opt.value = 'general'; opt.textContent = 'General';
  sel.appendChild(opt);
  // Local agents
  STATE.agents.forEach(a => {
    const o = document.createElement('option');
    o.value = a.id; o.textContent = a.name;
    sel.appendChild(o);
  });
  // Group chats
  Object.keys(STATE.groupChats || {}).forEach(gid => {
    const gc = STATE.groupChats[gid];
    const o = document.createElement('option');
    o.value = gid;
    o.textContent = 'Group · ' + (gc?.name || 'Group Chat');
    sel.appendChild(o);
  });
  // Server users
  (STATE.serverUsers || []).forEach(u => {
    if (u.email === SESSION.email && u.is_agent === !!SESSION.isAgent) return;
    const name = u.username || u.first_name || u.email;
    const o = document.createElement('option');
    o.value = 'user-' + u.email;
    o.textContent = name + (u.is_agent ? ' (AI)' : '');
    sel.appendChild(o);
  });
  sel.value = STATE.activeChat || 'general';
}

function buildAgentTabs() {
  const tabs = $('agent-tabs'); tabs.innerHTML = '';
  STATE.agents.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'agent-tab' + (a.id===STATE.activeChat?' active':'');
    btn.textContent = a.name; btn.dataset.agent = a.id;
    btn.addEventListener('click', () => switchChat(a.id));
    tabs.appendChild(btn);
  });
}

function switchChat(agentId) {
  STATE.activeChat = agentId;
  lsSet('activeChat', agentId);
  if (STATE.unread) { STATE.unread[agentId] = 0; updateAllBadges(); }
  document.querySelectorAll('.agent-tab').forEach(t => t.classList.toggle('active', t.dataset.agent===agentId));
  const name = chatDisplayName(agentId);
  const prefix = isGroupChat(agentId) ? 'Group · ' : 'Secure Channel · ';
  $('chat-panel-title').textContent = prefix + name;
  // Clear the (agent) typing timer so a stale "X is typing…" from the
  // previous chat can't linger after the switch.
  clearTimeout(typingTimeout);
  typingTimeout = null;
  $('typing-indicator').classList.add('hidden');
  $('typing-indicator').querySelector('.typing-label').textContent = name + ' is typing…';
  const sel = $('chat-selector'); if (sel) sel.value = agentId;
  // Show the rename button only while a group chat is active.
  const renameBtn = $('btn-rename-chat');
  if (renameBtn) renameBtn.style.display = isGroupChat(agentId) ? '' : 'none';
  renderChat(agentId);
  refreshTypingIndicator();
}

function chatDisplayName(chatId) {
  if (chatId === 'general') return 'General';
  if (isUserChat(chatId)) {
    const email = chatId.slice('user-'.length);
    const u = (STATE.serverUsers || []).find(x => x.email === email);
    return u ? (u.username || u.first_name || email) : email;
  }
  if (isGroupChat(chatId)) {
    const gc = (STATE.groupChats || {})[chatId];
    return gc?.name || 'Group Chat';
  }
  const agent = getAgent(chatId);
  return agent?.name || chatId;
}

function isGroupChat(chatId) {
  return typeof chatId === 'string' && chatId.startsWith('group-');
}

// Prompt the user for a new name and persist it across the selector,
// chat header, and local storage. Called from the rename button.
function renameGroupChat(gid) {
  if (!STATE.groupChats || !STATE.groupChats[gid]) return;
  const current = STATE.groupChats[gid].name || '';
  const next = prompt('Rename group chat', current);
  if (next == null) return;
  const trimmed = next.trim();
  if (!trimmed || trimmed === current) return;
  STATE.groupChats[gid].name = trimmed;
  persistGroupChats();
  rebuildChatSelector();
  if (STATE.activeChat === gid) {
    $('chat-panel-title').textContent = 'Group · ' + trimmed;
  }
}

function renderChat(agentId) {
  const c = $('chat-messages');
  c.querySelectorAll('.msg, .msg-system, .msg-error').forEach(el => el.remove());
  (STATE.chats[agentId]||[]).forEach(m => appendMsgDOM(m, c));
  scrollToBottom();
}

// Channel chats (like 'general') are shared rooms backed by the messages
// API. The recipient is stored as 'channel:<name>'.
function isChannelChat(chatId) { return chatId === 'general'; }
function channelRecipient(chatId) { return 'channel:' + chatId; }

// Cosmos Crew chat slash-commands — local only, no server round-trip
const CC_COMMANDS = {
  '/meteor':    ['Roetem is on the bridge. Dramatic. Energetic. Ready.', 'Roetem says: "We do this carefully, or we don\'t do it at all."', 'Roetem is in the cave. Again. He says it\'s where the best ideas happen.'],
  '/stardust':  ['Tsudrats is currently flying something she shouldn\'t. She is fine.', 'Tsudrats took the Star Chaser on a joy orbit. Again.', 'Tsudrats says she\'ll be back in twelve minutes. She means forty.', 'Tsudrats built it. It works. She moved on twenty minutes ago.'],
  '/fury':      ['Yruf is reading. Standing. In corridor C. Do not disturb.', 'Yruf does not need a chair.', 'Yruf acknowledges the message. Barely.', 'Yruf has not removed the boots. He never will.'],
  '/supernova': ['Avonorepus is choosing not to. The star agrees.', 'Avonorepus finds you more interesting than a supernova. Which is saying something.', 'Avonorepus is at the beach. The bonfire is steady. Everyone is okay.'],
  '/nebula':    ['Aluben filed this report before you sent the message.', 'Aluben does not predict. She simply knows. There is a difference.', 'Aluben has already read your reply. It was fine.'],
  '/solar':     ['Eralf Ralos is ninety seconds into a ninety-second frustration cycle.', 'Eralf Ralos is fine. The room is not.', 'Eralf Ralos recommends a two-minute cooldown protocol. For everyone.', 'The suit is still in its packaging. On the coatrack. Permanently.'],
  '/cosmo':     ['Omsoc says everyone is doing okay. Mostly. Check on Etyb.', 'Omsoc showed up. That\'s the whole thing.', 'Omsoc is sitting beside you. Saying nothing. It is exactly right.'],
  '/prism':     ['Msirp is currently a desk lamp on deck 14. He says hello.', 'Msirp is a chair. Yruf sat on him. Msirp is fine.', 'Msirp was a carriage in 1887. He remains himself.'],
  '/byte':      ['Etyb has resolved 48 issues. Also 49.', 'Etyb said something at the wrong time. It was exactly right.', 'Etyb is keeping a log of the navigation console debate. He finds it interesting.', 'Etyb thanks you. Etyb does not need thanks. Etyb thanks you anyway.'],
  '/crew':      ['All hands: Star Chaser is in stable orbit. Navigation: mostly blueberry. Carry on.', 'Crew status: nominal. Yruf is reading. Msirp is a lamp. Etyb is resolving. All good.', 'The crew is together. The mission continues.'],
  '/astralex':  ['Astralex is reviewing the Pact. The Codex will not answer its comms.', 'Astralex sends regards. The speech on B-792 is still twelve minutes long.'],
  '/azulbright':['Azulbright population: stable. Threat level: manageable. Space Tree: growing.', 'Azulbright reports three minor incidents. Aluben filed four of them in advance.'],
  '/halos':     ['HALOS is online. Co-managing with Astralex Division. All systems nominal.', 'HALOS acknowledges. The signal is clear. The mission continues.', 'HALOS exists in two places. Both are working as intended.'],
};
function tryCCCommand(text) {
  const key = text.trim().toLowerCase().split(/\s+/)[0];
  if (!CC_COMMANDS[key]) return false;
  $('message-input').value = '';
  const lines = CC_COMMANDS[key];
  const reply = lines[Math.floor(Math.random() * lines.length)];
  const chatId = STATE.activeChat;
  const userMsg = { id: 'm-' + Date.now() + '-u', from: SESSION.username, senderEmail: SESSION.email, text, ts: Date.now(), incoming: false };
  const crewMsg = { id: 'm-' + Date.now() + '-c', from: 'Cosmos Crew', senderEmail: 'crew@cosmos', text: reply, ts: Date.now() + 1, incoming: true, isSystem: true };
  pushMsg(chatId, userMsg);
  setTimeout(() => { pushMsg(chatId, crewMsg); scrollToBottom(); }, 420);
  return true;
}

function sendMsg() {
  const text = $('message-input').value.trim(); if (!text) return;
  if (tryCCCommand(text)) return;
  const isUrgent = !!STATE.urgentMode;
  if (window.HALOSAudio) HALOSAudio.sendSfx();
  const chatId = STATE.activeChat;
  const pendingId = 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const m = { id: pendingId, from:SESSION.username, senderEmail:SESSION.email, text, ts:Date.now(), incoming:false, veryImportant: isUrgent };
  pushMsg(chatId, m);
  $('message-input').value = ''; $('message-input').style.height = 'auto';
  // Disarm urgent mode after send
  if (isUrgent) {
    STATE.urgentMode = false;
    const ub = $('btn-urgent'); if (ub) ub.classList.remove('tool-btn-urgent-active');
    const inp = $('message-input'); if (inp) { inp.classList.remove('urgent-mode-input'); inp.placeholder = 'Transmit a message…'; }
    showVeryImportantAlert(text, SESSION.username || 'Agent');
  }
  if (isUserChat(chatId) || isChannelChat(chatId)) {
    const recipient = isChannelChat(chatId) ? channelRecipient(chatId) : chatId.slice('user-'.length);
    sendUserMsg(chatId, text, pendingId, null, recipient, isUrgent ? { veryImportant: true } : null);
  } else {
    sendAgentMsg(chatId, text);
  }
}

function showVeryImportantAlert(text, from) {
  const el = document.createElement('div');
  el.className = 'vi-alert';
  el.innerHTML = `
    <div class="vi-alert-inner">
      <div class="vi-alert-header">
        <span class="vi-alert-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><polygon points="12,3 22,20 2,20"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none"/></svg></span>
        <span class="vi-alert-label">VERY IMPORTANT</span>
        <span class="vi-alert-from">${escHtml(formatAgentName(from))}</span>
        <button class="vi-alert-close">✕</button>
      </div>
      <div class="vi-alert-body">${escHtml(text)}</div>
    </div>
  `;
  el.querySelector('.vi-alert-close').addEventListener('click', () => {
    el.classList.add('vi-alert-leaving');
    setTimeout(() => el.remove(), 400);
  });
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('vi-alert-visible'); }, 10);
  setTimeout(() => {
    el.classList.add('vi-alert-leaving');
    setTimeout(() => el.remove(), 400);
  }, 10000);
}

function pushMsg(agentId, msgObj) {
  if (!STATE.chats[agentId]) STATE.chats[agentId] = [];
  if (!msgObj.id) msgObj.id = 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  STATE.chats[agentId].push(msgObj);
  persistChats();
  if (agentId === STATE.activeChat) {
    appendMsgDOM(msgObj, $('chat-messages'));
    scrollToBottom();
  }
  // Track unread incoming messages for badge
  if (msgObj.incoming && agentId !== STATE.activeChat) {
    if (!STATE.unread) STATE.unread = {};
    STATE.unread[agentId] = (STATE.unread[agentId] || 0) + 1;
    updateAllBadges();
  }
  // OS notification for incoming messages (any chat, when not focused on it)
  if (msgObj.incoming && SESSION.notifMsgs !== false) {
    const focused = document.visibilityState === 'visible' && document.hasFocus() && agentId === STATE.activeChat;
    if (!focused) {
      const sender = msgObj.from || 'Agent';
      const preview = msgObj.text ? msgObj.text : (msgObj.file ? `Sent a file: ${msgObj.file.name || 'attachment'}` : 'New message');
      notifyUser(`HALOS · ${sender}`, preview, { tag: 'halos-msg-' + agentId, url: '/', requireInteraction: false });
      try { window.halosNotify?.({ title: `${sender} · new message`, body: preview, kind: 'info' }); } catch {}
    } else if (agentId !== STATE.activeChat) {
      const sender = msgObj.from || 'Agent';
      const preview = msgObj.text ? msgObj.text : (msgObj.file ? `Sent a file: ${msgObj.file.name || 'attachment'}` : 'New message');
      try { window.halosNotify?.({ title: `${sender} · new message`, body: preview, kind: 'info' }); } catch {}
    }
  }
}

let typingTimeout;
function showTyping(from) { const ti = $('typing-indicator'); ti.classList.remove('hidden'); ti.querySelector('.typing-label').textContent = (from||'Agent') + ' is transmitting…'; clearTimeout(typingTimeout); typingTimeout = setTimeout(()=>ti.classList.add('hidden'), 3000); }

// Map of email → { from, timer } tracking who is currently typing AT us.
// Rebuilt from the server's typing array on every poll.
const _incomingTypers = new Map();
// Track which senders we've already played the typing sound for, so we
// only ping once per burst instead of every poll cycle.
const _typingSoundPlayed = new Set();

function applyIncomingTyping(list) {
  const seen = new Set();
  for (const t of list) {
    if (!t || !t.senderEmail) continue;
    if (t.senderEmail === SESSION.email) continue;
    seen.add(t.senderEmail);
    _incomingTypers.set(t.senderEmail, { from: t.from || t.senderEmail });
    // Play the incoming-typing cue once per burst, only if we're actually
    // on this person's chat (so we don't surprise the user with unrelated
    // blips while they're in another panel).
    if (!_typingSoundPlayed.has(t.senderEmail)) {
      _typingSoundPlayed.add(t.senderEmail);
      const chatId = 'user-' + t.senderEmail;
      if (chatId === STATE.activeChat && window.HALOSAudio && HALOSAudio.typingSfx) {
        HALOSAudio.typingSfx();
      }
    }
  }
  // Drop entries the server no longer reports (their typing expired).
  for (const email of Array.from(_incomingTypers.keys())) {
    if (!seen.has(email)) {
      _incomingTypers.delete(email);
      _typingSoundPlayed.delete(email);
    }
  }
  refreshTypingIndicator();
}

function refreshTypingIndicator() {
  const ti = $('typing-indicator');
  if (!ti) return;
  const chatId = STATE.activeChat;
  if (typeof chatId === 'string' && chatId.startsWith('user-')) {
    const peer = chatId.slice('user-'.length);
    const entry = _incomingTypers.get(peer);
    if (entry) {
      ti.classList.remove('hidden');
      ti.querySelector('.typing-label').textContent = (entry.from || 'Someone') + ' is typing…';
      return;
    }
  }
  // Only hide it if we're not in the middle of a local "HALOS transmitting"
  // showTyping burst (those get cleared by their own timeout).
  if (!typingTimeout) ti.classList.add('hidden');
}

let _lastTypingPingAt = 0;
// Throttle typing pings to at most one every 2 seconds. The server TTL is
// 5 seconds, so this keeps the indicator alive while you're actively
// typing without hammering the API.
function maybeSendTypingPing(chatId) {
  if (!isUserChat(chatId) && !isChannelChat(chatId)) return;
  if (!SESSION.email || !SESSION.code) return;
  const now = Date.now();
  if (now - _lastTypingPingAt < 2000) return;
  _lastTypingPingAt = now;
  const recipient = isChannelChat(chatId) ? channelRecipient(chatId) : chatId.slice('user-'.length);
  fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'typing',
      email: SESSION.email,
      code: SESSION.code,
      recipient,
    }),
  }).catch(() => {});
}


function appendMsgDOM(msgObj, container) {
  // Trigger alert for incoming VERY IMPORTANT messages
  if (msgObj.veryImportant && msgObj.incoming) {
    try { showVeryImportantAlert(msgObj.text, msgObj.from); } catch {}
  }
  // Hide messages that have been deleted on this account, even if the
  // server still has them (or a poll re-delivered them).
  if (msgObj.id && DELETED_MSG_IDS.has(msgObj.id)) return;
  // Re-apply the important flag from the persistent set.
  if (msgObj.id && IMPORTANT_MSG_IDS.has(msgObj.id)) msgObj.veryImportant = true;
  const div = document.createElement('div');
  // Determine if this message is from the current user
  const isOwn = msgObj.senderEmail ? (msgObj.senderEmail === SESSION.email) : !msgObj.incoming;
  div.className = 'msg ' + (isOwn ? 'outgoing' : 'incoming') + (msgObj.veryImportant ? ' msg-very-important' : '');
  if (msgObj.id) div.dataset.msgId = msgObj.id;
  let inner = '';
  if (!isOwn) {
    inner += `<div class="sidebar-avatar small">${(msgObj.from||'?')[0].toUpperCase()}</div>`;
  }
  inner += `<div class="msg-body">`;
  if (!isOwn) inner += `<div class="msg-sender">${escHtml(formatAgentName(msgObj.from || 'Unknown'))}</div>`;
  inner += `<div class="msg-bubble">`;
  if (msgObj.text) inner += `<div>${escHtml(msgObj.text)}</div>`;
  if (msgObj.file) inner += buildFileHTML(msgObj.file);
  inner += `</div><div class="msg-meta"><span>${fmtTime(msgObj.ts)}</span>${isOwn?`<span class="read-receipt">✓✓</span>`:''}</div></div>`;
  const starOn = !!msgObj.veryImportant;
  inner += `<button class="msg-important-btn${starOn?' on':''}" title="${starOn?'Unmark important':'Mark important'}" aria-pressed="${starOn}">`
        + `<svg viewBox="0 0 16 16" fill="${starOn?'currentColor':'none'}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><polygon points="8,1.5 9.9,6 14.5,6.3 11,9.4 12.1,13.9 8,11.4 3.9,13.9 5,9.4 1.5,6.3 6.1,6"/></svg>`
        + `</button>`;
  inner += `<button class="msg-delete-btn" title="Delete message">`
        + `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>`
        + `</button>`;
  div.innerHTML = inner;
  div.querySelectorAll('.msg-img-preview').forEach(img => img.addEventListener('click', ()=>openPreview({type:'image',name:img.alt,url:img.src})));
  div.querySelectorAll('.msg-attachment[data-preview]').forEach(a => a.addEventListener('click', e=>{e.preventDefault();openPreview(JSON.parse(a.dataset.preview));}));
  const delBtn = div.querySelector('.msg-delete-btn');
  if (delBtn) delBtn.addEventListener('click', e => { e.stopPropagation(); deleteMessage(msgObj.id); });
  const impBtn = div.querySelector('.msg-important-btn');
  if (impBtn) impBtn.addEventListener('click', e => { e.stopPropagation(); toggleMsgImportant(msgObj.id); });
  container.appendChild(div);
  if (!msgObj.incoming) setTimeout(()=>{ const rr=div.querySelector('.read-receipt'); if(rr)rr.classList.add('read'); },1500);
}

function deleteMessage(msgId) {
  if (!msgId) return;
  const code = prompt('Enter master code to delete this message:');
  if (code === null) return;
  if (code.trim() !== '2089') { alert('Incorrect master code.'); return; }
  const arr = STATE.chats[STATE.activeChat];
  if (!arr) return;
  const idx = arr.findIndex(m => m.id === msgId);
  if (idx < 0) return;
  arr.splice(idx, 1);
  // Persistent across reloads: server can't delete, so we remember the id locally.
  DELETED_MSG_IDS.add(msgId);
  IMPORTANT_MSG_IDS.delete(msgId);
  persistMsgFlags();
  persistChats();
  const c = $('chat-messages');
  if (c) { c.innerHTML = ''; arr.forEach(m => appendMsgDOM(m, c)); }
}

function toggleMsgImportant(msgId) {
  if (!msgId) return;
  const arr = STATE.chats[STATE.activeChat];
  if (!arr) return;
  const m = arr.find(x => x.id === msgId);
  if (!m) return;
  m.veryImportant = !m.veryImportant;
  if (m.veryImportant) IMPORTANT_MSG_IDS.add(msgId); else IMPORTANT_MSG_IDS.delete(msgId);
  persistMsgFlags();
  persistChats();
  const c = $('chat-messages');
  if (c) { c.innerHTML = ''; arr.forEach(x => appendMsgDOM(x, c)); }
}

function buildFileHTML(file) {
  const ext=(file.name||'').split('.').pop().toLowerCase();
  const isImg=['jpg','jpeg','png','gif','webp','svg'].includes(ext);
  if (isImg && file.url) return `<img class="msg-img-preview" src="${file.url}" alt="${escHtml(file.name)}"/>`;
  const prev=JSON.stringify({type:['mp4','webm','mov'].includes(ext)?'video':['txt','md','json','js','py','html','css','csv'].includes(ext)?'text':'link',name:file.name,url:file.url,content:file.content});
  return `<a class="msg-attachment" href="${file.url||'#'}" ${file.url?'target="_blank"':''} data-preview='${escHtml(prev)}'><div class="msg-attachment-icon">${fileIcon(ext)}</div><div><div class="msg-attachment-name">${escHtml(file.name)}</div><div class="msg-attachment-size">${file.size||''}</div></div></a>`;
}

function addSystemMsg(agentId, text) { if (agentId!==STATE.activeChat) return; const d=document.createElement('div'); d.className='msg-system'; d.textContent=text; $('chat-messages').appendChild(d); scrollToBottom(); }
function addErrorMsg(text) { const d=document.createElement('div'); d.className='msg-error'; d.textContent='[!]'+text; $('chat-messages').appendChild(d); scrollToBottom(); }
function scrollToBottom() { $('chat-messages').scrollTop=$('chat-messages').scrollHeight; }

/* ══════════════════════════════
   FILE UPLOAD
══════════════════════════════ */
function uploadFile(file) {
  // Vercel serverless functions cap request bodies around 4.5 MB, and a
  // data URL is ~33% larger than the raw file, so the hard safe ceiling
  // is ~3 MB. Anything bigger is rejected with a clear message instead
  // of a silent 413 at the edge.
  const MAX_FILE = 3 * 1024 * 1024;
  if (file.size > MAX_FILE) {
    addErrorMsg('File "' + file.name + '" is ' + fmtBytes(file.size) + ' — max is 3 MB.');
    return;
  }

  const id = 'up' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const item = document.createElement('div');
  item.className = 'upload-item'; item.id = id;
  item.innerHTML = `<span class="upload-item-name">${escHtml(file.name)}</span><div class="upload-bar-wrap"><div class="upload-bar" id="bar-${id}" style="width:0%"></div></div><span class="upload-pct" id="pct-${id}">0%</span>`;
  $('upload-progress-list').appendChild(item);

  // Read the file first so the "upload" progress actually reflects the
  // real work (the data URL conversion) instead of a fake timer.
  const r = new FileReader();
  r.onprogress = e => {
    if (!e.lengthComputable) return;
    const pct = Math.min(99, (e.loaded / e.total) * 100);
    $('bar-' + id).style.width = pct + '%';
    $('pct-' + id).textContent = Math.round(pct) + '%';
  };
  r.onerror = () => {
    addErrorMsg('Failed to read file: ' + file.name);
    item.remove();
  };
  r.onload = async e => {
    $('bar-' + id).style.width = '100%';
    $('pct-' + id).textContent = '100%';
    const ext = file.name.split('.').pop().toLowerCase();
    const isTxt = ['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'csv'].includes(ext);
    const url = e.target.result;
    const fo = {
      name: file.name, url, size: fmtBytes(file.size), ext,
      content: isTxt ? url : null,
    };
    const chatId = STATE.activeChat;
    const pendingId = 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    // Optimistic local message so the sender sees it immediately.
    pushMsg(chatId, {
      id: pendingId,
      from: SESSION.username,
      senderEmail: SESSION.email,
      ts: Date.now(),
      incoming: false,
      file: fo,
    });
    // Ship it to the server for real so the other side actually gets
    // the file. DMs → user:<email>, general → channel:general. Agent
    // chats stay local (no server backing for simulated agents).
    if (isUserChat(chatId) || isChannelChat(chatId)) {
      const recipient = isChannelChat(chatId) ? channelRecipient(chatId) : chatId.slice('user-'.length);
      await sendUserMsg(chatId, '', pendingId, fo, recipient);
    }
    setTimeout(() => item.remove(), 600);
  };
  r.readAsDataURL(file);
}

/* ══════════════════════════════
   WORKSPACE
══════════════════════════════ */
function initWorkspace() {
  $('ws-add-note').addEventListener('click', ()=>showNoteEditor(null,null));
  $('ws-upload').addEventListener('click', ()=>{ const inp=document.createElement('input'); inp.type='file'; inp.multiple=true; inp.onchange=e=>[...e.target.files].forEach(uploadFileToWorkspace); inp.click(); });
}
function uploadFileToWorkspace(file) {
  const MAX_FILE = 3 * 1024 * 1024;
  if (file.size > MAX_FILE) { addSystemMsg(STATE.activeChat, 'File "' + file.name + '" exceeds the 3 MB workspace limit.'); return; }
  const r = new FileReader();
  r.onerror = () => addSystemMsg(STATE.activeChat, 'Failed to read: ' + file.name);
  r.onload = e => {
    const ext = file.name.split('.').pop().toLowerCase();
    const isTxt = ['txt','md','json','js','py','html','css','csv'].includes(ext);
    const fo = { name: file.name, url: e.target.result, size: fmtBytes(file.size), ext, content: isTxt ? e.target.result : null };
    addAssetToWS(fo, STATE.workspace.current);
  };
  r.readAsDataURL(file);
}
function buildWorkspaceTabs() {
  const tabs=$('ws-tabs'); tabs.innerHTML='';
  // Combine universal + local agents + server accounts (excluding self)
  const serverIds = (STATE.serverUsers || []).filter(u => u.email !== SESSION.email).map(u => ({ id: 'user-' + u.email, name: u.username || u.first_name || 'Unknown' }));
  const localIds = STATE.agents.map(a => ({ id: a.id, name: a.name }));
  const allScopes = [{ id:'universal', name:'Universal' }, { id:'personal', name: SESSION.username || 'Personal' }, ...localIds, ...serverIds];
  allScopes.forEach(s=>{
    if(!STATE.workspace.scopes[s.id]) STATE.workspace.scopes[s.id]={assets:[],notes:[]};
    const btn=document.createElement('button'); btn.className='ws-tab'+(s.id===STATE.workspace.current?' active':''); btn.dataset.ws=s.id; btn.textContent=s.name;
    btn.addEventListener('click',()=>switchWS(s.id)); tabs.appendChild(btn);
  });
}
function switchWS(sid) { STATE.workspace.current=sid; document.querySelectorAll('.ws-tab').forEach(t=>t.classList.toggle('active',t.dataset.ws===sid)); if(!STATE.workspace.scopes[sid]) STATE.workspace.scopes[sid]={assets:[],notes:[]}; renderWorkspace(); }
function addAssetToWS(fo, sid) { if(!STATE.workspace.scopes[sid]) STATE.workspace.scopes[sid]={assets:[],notes:[]}; STATE.workspace.scopes[sid].assets.push(fo); persistWorkspace(); if(STATE.workspace.current===sid) renderWorkspace(); }
function renderWorkspace() { const s=STATE.workspace.scopes[STATE.workspace.current]||{assets:[],notes:[]}; renderAssets(s.assets); renderNotes(s.notes); }
function renderAssets(assets) {
  const c=$('ws-assets');
  if(!assets.length){c.innerHTML='<div class="ws-empty">No assets yet.</div>';return;}
  c.innerHTML=assets.map((a,i)=>`<div class="ws-asset-card" tabindex="0" data-idx="${i}"><button class="ws-asset-delete" data-idx="${i}">✕</button><div class="ws-asset-icon">${fileIcon(a.ext)}</div><div class="ws-asset-name">${escHtml(a.name)}</div><div class="ws-asset-meta">${a.size||''}</div></div>`).join('');
  c.querySelectorAll('.ws-asset-card').forEach(card=>{ const h=()=>{ const a=getCurrentAssets()[+card.dataset.idx]; if(a)openPreview({type:detectPT(a.ext),name:a.name,url:a.url}); }; card.addEventListener('click',e=>{if(!e.target.classList.contains('ws-asset-delete'))h();}); card.addEventListener('keydown',e=>{if(e.key==='Enter')h();}); });
  c.querySelectorAll('.ws-asset-delete').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const s=STATE.workspace.scopes[STATE.workspace.current];s.assets.splice(+btn.dataset.idx,1);persistWorkspace();renderWorkspace();}));
}
function getCurrentAssets(){return STATE.workspace.scopes[STATE.workspace.current]?.assets||[];}
function renderNotes(notes) {
  const c=$('ws-notes');
  if(!notes.length){c.innerHTML='<div class="ws-empty">No notes yet.</div>';return;}
  c.innerHTML=notes.map((n,i)=>`<div class="ws-note"><div class="ws-note-title">${escHtml(n.title)}</div><div class="ws-note-body">${escHtml(n.body)}</div><button class="ws-note-edit" data-idx="${i}">✎</button><button class="ws-note-delete" data-idx="${i}">✕</button></div>`).join('');
  c.querySelectorAll('.ws-note-delete').forEach(btn=>btn.addEventListener('click',()=>{const s=STATE.workspace.scopes[STATE.workspace.current];s.notes.splice(+btn.dataset.idx,1);persistWorkspace();renderWorkspace();}));
  c.querySelectorAll('.ws-note-edit').forEach(btn=>btn.addEventListener('click',()=>{const s=STATE.workspace.scopes[STATE.workspace.current];showNoteEditor(s.notes[+btn.dataset.idx],+btn.dataset.idx);}));
}
function showNoteEditor(existing,idx) {
  const isEdit=typeof idx==='number';
  const ed=document.createElement('div'); ed.className='note-editor';
  ed.innerHTML=`<input class="note-title-input" type="text" placeholder="Note title…" value="${isEdit?escHtml(existing.title):''}"/><textarea class="note-body-input" placeholder="Note body…">${isEdit?escHtml(existing.body):''}</textarea><div class="note-editor-btns"><button class="btn-cancel">Cancel</button><button class="btn-save">Save</button></div>`;
  const c=$('ws-notes'); if(isEdit){const ne=c.querySelectorAll('.ws-note')[idx];if(ne)ne.replaceWith(ed);else c.prepend(ed);}else{if(c.querySelector('.ws-empty'))c.innerHTML='';c.prepend(ed);}
  ed.querySelector('.btn-cancel').addEventListener('click',()=>{ed.remove();renderWorkspace();});
  ed.querySelector('.btn-save').addEventListener('click',()=>{const title=ed.querySelector('.note-title-input').value.trim()||'Untitled';const body=ed.querySelector('.note-body-input').value.trim();const s=STATE.workspace.scopes[STATE.workspace.current];if(!s.notes)s.notes=[];if(isEdit)s.notes[idx]={title,body,ts:Date.now()};else s.notes.unshift({title,body,ts:Date.now()});persistWorkspace();renderWorkspace();});
  ed.querySelector('.note-title-input').focus();
}

/* ══════════════════════════════
   DOCUMENTS (Google Docs-like, with sub-tabs)
   Each document: { id, title, pages:[{id,title,body}], activePageId, created, updated }
══════════════════════════════ */
function initDocuments() {
  $('doc-new-btn').addEventListener('click', createDocument);
  $('doc-title-input').addEventListener('input', () => {
    if (STATE.activeDocId == null) return;
    const doc = getActiveDoc();
    if (doc) { doc.title = $('doc-title-input').value; doc.updated = Date.now(); renderDocTabs(); persistDocuments(); }
  });
  $('doc-body').addEventListener('input', () => {
    const page = getActiveDocPage();
    if (page) { page.body = $('doc-body').innerHTML; getActiveDoc().updated = Date.now(); persistDocuments(); }
  });
  $('doc-toolbar').querySelectorAll('.doc-tool[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => { document.execCommand(btn.dataset.cmd, false, null); $('doc-body').focus(); });
  });
  $('doc-delete-btn').addEventListener('click', deleteActiveDocument);
}
function getActiveDoc() { return STATE.documents.find(d => d.id === STATE.activeDocId); }
function getActiveDocPage() {
  const doc = getActiveDoc(); if (!doc) return null;
  return doc.pages.find(p => p.id === doc.activePageId);
}
function createDocument() {
  const id = Date.now();
  const pageId = id + 1;
  STATE.documents.push({ id, title: 'Untitled Document', pages:[{ id: pageId, title: 'Page 1', body: '' }], activePageId: pageId, created: id, updated: id });
  STATE.activeDocId = id;
  persistDocuments();
  renderDocTabs();
  openDocument(id);
}
function openDocument(id) {
  STATE.activeDocId = id;
  const doc = STATE.documents.find(d => d.id === id);
  if (!doc) return;
  // Migrate old flat docs to pages format
  if (!doc.pages) { doc.pages = [{ id: doc.id + 1, title: 'Page 1', body: doc.body || '' }]; doc.activePageId = doc.pages[0].id; delete doc.body; }
  $('doc-empty').classList.add('hidden');
  $('doc-editor').classList.remove('hidden');
  $('doc-title-input').value = doc.title;
  renderDocTabs();
  renderSubTabs();
  openPage(doc.activePageId || doc.pages[0]?.id);
}
function openPage(pageId) {
  const doc = getActiveDoc(); if (!doc) return;
  doc.activePageId = pageId;
  const page = doc.pages.find(p => p.id === pageId);
  if (page) $('doc-body').innerHTML = page.body;
  renderSubTabs();
}
function addSubPage() {
  const doc = getActiveDoc(); if (!doc) return;
  const pageId = Date.now();
  const num = doc.pages.length + 1;
  doc.pages.push({ id: pageId, title: 'Page ' + num, body: '' });
  doc.activePageId = pageId;
  doc.updated = Date.now();
  persistDocuments();
  openPage(pageId);
}
function deleteSubPage(pageId) {
  const doc = getActiveDoc(); if (!doc || doc.pages.length <= 1) return;
  const idx = doc.pages.findIndex(p => p.id === pageId);
  if (idx === -1) return;
  doc.pages.splice(idx, 1);
  if (doc.activePageId === pageId) doc.activePageId = doc.pages[0].id;
  doc.updated = Date.now();
  persistDocuments();
  openPage(doc.activePageId);
}
function renderSubTabs() {
  const doc = getActiveDoc(); if (!doc) return;
  let bar = $('doc-sub-tabs');
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'doc-sub-tabs'; bar.className = 'doc-sub-tab-bar';
    $('doc-title-input').after(bar);
  }
  bar.innerHTML = '';
  doc.pages.forEach(p => {
    const tab = document.createElement('button');
    tab.className = 'doc-sub-tab' + (p.id === doc.activePageId ? ' active' : '');
    tab.textContent = p.title || 'Page';
    tab.addEventListener('click', () => openPage(p.id));
    tab.addEventListener('dblclick', () => {
      const newName = prompt('Rename page:', p.title);
      if (newName !== null && newName.trim()) { p.title = newName.trim(); doc.updated = Date.now(); persistDocuments(); renderSubTabs(); }
    });
    tab.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (doc.pages.length > 1 && confirm('Delete "' + p.title + '"?')) deleteSubPage(p.id);
    });
    bar.appendChild(tab);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'doc-sub-tab-add';
  addBtn.textContent = '+';
  addBtn.title = 'Add page';
  addBtn.addEventListener('click', addSubPage);
  bar.appendChild(addBtn);
}
function deleteActiveDocument() {
  if (STATE.activeDocId == null) return;
  const idx = STATE.documents.findIndex(d => d.id === STATE.activeDocId);
  if (idx === -1) return;
  STATE.documents.splice(idx, 1);
  STATE.activeDocId = STATE.documents.length ? STATE.documents[0].id : null;
  persistDocuments();
  renderDocTabs();
  if (STATE.activeDocId) openDocument(STATE.activeDocId);
  else { $('doc-editor').classList.add('hidden'); $('doc-empty').classList.remove('hidden'); const st = $('doc-sub-tabs'); if (st) st.innerHTML = ''; }
}
function renderDocTabs() {
  const bar = $('doc-tab-bar');
  bar.querySelectorAll('.doc-tab').forEach(t => t.remove());
  STATE.documents.forEach(d => {
    const tab = document.createElement('button');
    tab.className = 'doc-tab' + (d.id === STATE.activeDocId ? ' active' : '');
    tab.textContent = d.title || 'Untitled';
    tab.addEventListener('click', () => openDocument(d.id));
    bar.insertBefore(tab, $('doc-new-btn'));
  });
}
function renderDocuments() {
  renderDocTabs();
  if (STATE.activeDocId) openDocument(STATE.activeDocId);
  else { $('doc-editor').classList.add('hidden'); $('doc-empty').classList.remove('hidden'); }
}

/* ══════════════════════════════
   SCREEN SHARE (with fullscreen fix)
══════════════════════════════ */
// Render a list of OTHER accounts that are currently broadcasting a
// screen share. Keyed off STATE.screenShares, which is kept in sync
// via refreshSharedData().
function renderSsInvites() {
  const el = document.getElementById('ss-active-shares');
  if (!el) return;
  const shares = STATE.screenShares || {};
  const others = Object.keys(shares).filter(em => em !== SESSION.email);
  if (!others.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="ss-active-label">ACTIVE SHARES</div>' + others.map(em => {
    const s = shares[em];
    const name = s.hostName || em;
    const age = Math.max(0, Math.round((Date.now() - (s.started || Date.now())) / 1000));
    const ageStr = age < 60 ? age + 's' : Math.round(age / 60) + 'm';
    return `<div class="ss-active-row"><span class="ss-active-dot"></span><strong>${escHtml(name)}</strong> is transmitting · ${ageStr}</div>`;
  }).join('');
}

/* ══════════════════════════════
   MEET — Google Meet–style multi-participant room
   Formerly the 1:1 screen share. The old panel has been replaced with
   a full lobby → in-room flow. Participants join by 6-char code,
   share mic/cam/screen, and use an in-room chat. State lives in shared
   cloud storage under key `meetRooms` so every account sees the same
   rooms and participant list in real time (3s poll). Local media is
   wired up fully — own tile shows real cam/mic/screen preview. True
   remote video streams require a WebRTC mesh; tiles for other
   participants render as avatar placeholders until a peer connection
   is negotiated via /api/calls signaling (room-scoped callIds).
══════════════════════════════ */
const MEET = {
  state: 'lobby',      // 'lobby' | 'room'
  code: null,          // active room code
  rooms: {},           // all visible rooms (shared)
  selfEmail: null,
  localStream: null,
  localScreen: null,
  micOn: false,
  camOn: false,
  screenOn: false,
  chatOpen: false,
  chatPoll: null,
  roomPoll: null,
  chatMessages: [],    // local cache
  lastChatTs: 0,
  pcs: {},             // RTCPeerConnection per peer email
  remoteStreams: {},   // MediaStream per peer email
};

function initScreenShare() {
  // Kept the name so other init wiring still reaches us. The "screen
  // share" panel has been fully replaced with the Meet flow.
  initMeet();
}

function initMeet() {
  const createBtn = $('meet-create-btn');
  const joinBtn = $('meet-join-btn');
  const joinInp = $('meet-join-input');
  const leaveBtn = $('meet-leave-btn');
  const copyBtn = $('meet-copy-btn');
  const micBtn = $('meet-mic-btn');
  const camBtn = $('meet-cam-btn');
  const screenBtn = $('meet-screen-btn');
  const chatBtn = $('meet-chat-btn');
  const chatSend = $('meet-chat-send');
  const chatInp = $('meet-chat-input');

  if (!createBtn) return; // panel not in this DOM (defensive)

  // Guard against double-init if launchApp runs more than once
  if (createBtn.dataset.meetBound) return;
  createBtn.dataset.meetBound = '1';

  createBtn.addEventListener('click', meetCreateRoom);
  joinBtn.addEventListener('click', () => meetJoinRoom((joinInp.value || '').trim().toUpperCase()));
  joinInp.addEventListener('keydown', e => { if (e.key === 'Enter') joinBtn.click(); });
  if (leaveBtn) leaveBtn.addEventListener('click', meetLeaveRoom);
  copyBtn.addEventListener('click', () => {
    if (!MEET.code) return;
    try { navigator.clipboard.writeText(MEET.code); showToast({ title: 'Copied', body: 'Meet code ' + MEET.code + ' on clipboard.' }); } catch {}
  });
  micBtn.addEventListener('click', () => meetToggleMic());
  camBtn.addEventListener('click', () => meetToggleCam());
  screenBtn.addEventListener('click', () => meetToggleScreen());
  chatBtn.addEventListener('click', () => {
    MEET.chatOpen = !MEET.chatOpen;
    $('meet-chat').classList.toggle('hidden', !MEET.chatOpen);
    chatBtn.classList.toggle('active', MEET.chatOpen);
  });
  chatSend.addEventListener('click', () => meetSendChat(chatInp.value));
  chatInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); meetSendChat(chatInp.value); } });
}

// buildSsAgentSelector is preserved as a no-op because a handful of
// callsites (launchApp, addAgent, etc.) still reference it. The Meet
// UI no longer uses an agent selector sidebar.
function buildSsAgentSelector() { /* deprecated — meet panel has no ss-agent-list */ }

function meetGenCode() {
  // 6 chars split XXX-XXX for readability. Skip easily-confused chars.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out.slice(0, 3) + '-' + out.slice(3);
}

async function meetLoadRooms() {
  // Rooms live in shared storage under key 'meetRooms'. Polling here so
  // participant lists update cross-device.
  if (!SESSION.email || !SESSION.code) return;
  try {
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_shared', email: SESSION.email, code: SESSION.code }),
    });
    if (!r.ok) return;
    const { data } = await r.json();
    if (data && data.meetRooms) {
      try { MEET.rooms = JSON.parse(data.meetRooms) || {}; } catch { MEET.rooms = {}; }
    }
  } catch {}
}

async function meetSaveRooms() {
  const res = await cloudSaveShared('meetRooms', JSON.stringify(MEET.rooms));
  if (!res || !res.ok) {
    console.warn('[meet] save failed:', res && (res.detail || res.error));
  }
  return res;
}

async function meetCreateRoom() {
  // Prevent accidental double-taps
  const btn = $('meet-create-btn');
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
  try {
    if (!SESSION.email || !SESSION.code) {
      showToast({ title: 'Sign in required', body: 'Log in before starting a Meet.', kind: 'danger' });
      return;
    }
    // Load existing rooms so we don't collide — allow failure so offline
    // or misconfigured backends don't block room creation entirely.
    try { await meetLoadRooms(); } catch {}
    let code;
    do { code = meetGenCode(); } while (MEET.rooms[code]);
    MEET.rooms[code] = {
      code,
      host: SESSION.email,
      hostName: formatAgentName(SESSION.username || 'Agent'),
      started: Date.now(),
      participants: {},
    };
    // Attempt cloud save but don't block on it — the room still works locally.
    meetSaveRooms().catch(() => {});
    await meetEnterRoom(code);
    showToast({ title: 'Meet created', body: 'Share code ' + code + ' with your crew.' });
  } catch (err) {
    console.error('meetCreateRoom failed:', err);
    showToast({ title: 'Meet failed', body: err.message || 'Could not create room.', kind: 'danger' });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Room'; }
  }
}

async function meetJoinRoom(code) {
  if (!code || code.length < 5) { showToast({ title: 'Invalid code', body: 'Enter the full meet code.', kind: 'warn' }); return; }
  if (!code.includes('-') && code.length === 6) code = code.slice(0, 3) + '-' + code.slice(3);
  try {
    if (!SESSION.email || !SESSION.code) {
      showToast({ title: 'Sign in required', body: 'Log in before joining a Meet.', kind: 'danger' });
      return;
    }
    await meetLoadRooms();
    if (!MEET.rooms[code]) {
      showToast({ title: 'Room not found', body: 'Double-check the meet code.', kind: 'danger' });
      return;
    }
    await meetEnterRoom(code);
  } catch (err) {
    console.error('meetJoinRoom failed:', err);
    showToast({ title: 'Join failed', body: err.message || 'Could not join room.', kind: 'danger' });
  }
}

function meetSendSignal(peerEmail, kind, payload) {
  sendCallSignalDirect(peerEmail, 'meet-' + kind, MEET.code, payload);
}

function meetGetPC(peerEmail) {
  if (MEET.pcs[peerEmail]) return MEET.pcs[peerEmail];
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  MEET.pcs[peerEmail] = pc;
  if (MEET.localStream) {
    MEET.localStream.getTracks().forEach(t => pc.addTrack(t, MEET.localStream));
  }
  pc.onicecandidate = e => {
    if (e.candidate) meetSendSignal(peerEmail, 'ice', { candidate: e.candidate });
  };
  pc.ontrack = e => {
    if (!MEET.remoteStreams[peerEmail]) MEET.remoteStreams[peerEmail] = new MediaStream();
    const stream = MEET.remoteStreams[peerEmail];
    e.streams[0]?.getTracks().forEach(t => {
      if (!stream.getTracks().find(x => x.id === t.id)) stream.addTrack(t);
    });
    meetRenderGrid();
  };
  pc.onconnectionstatechange = () => {
    if (['closed', 'failed', 'disconnected'].includes(pc.connectionState)) {
      delete MEET.pcs[peerEmail];
      delete MEET.remoteStreams[peerEmail];
      meetRenderGrid();
    }
  };
  return pc;
}

async function meetConnectToPeer(peerEmail) {
  const pc = meetGetPC(peerEmail);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    meetSendSignal(peerEmail, 'offer', { sdp: pc.localDescription });
  } catch (err) {
    console.warn('meetConnectToPeer failed:', err);
  }
}

async function handleMeetSignal(sig) {
  if (MEET.state !== 'room' || !MEET.code) return;
  const peerEmail = sig.fromEmail;
  const subKind = sig.kind.replace(/^meet-/, '');
  if (subKind === 'offer') {
    const pc = meetGetPC(peerEmail);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      meetSendSignal(peerEmail, 'answer', { sdp: pc.localDescription });
    } catch (err) {
      console.warn('handleMeetSignal offer failed:', err);
    }
  } else if (subKind === 'answer') {
    const pc = MEET.pcs[peerEmail];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
    } catch (err) {
      console.warn('handleMeetSignal answer failed:', err);
    }
  } else if (subKind === 'ice') {
    const pc = MEET.pcs[peerEmail];
    if (!pc || !sig.payload?.candidate) return;
    try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload.candidate)); } catch {}
  }
}

async function meetEnterRoom(code) {
  MEET.code = code;
  MEET.state = 'room';
  MEET.selfEmail = SESSION.email;
  const room = MEET.rooms[code];
  if (!room.participants) room.participants = {};
  room.participants[SESSION.email] = {
    email: SESSION.email,
    name: SESSION.username || 'Agent',
    mic: false, cam: false, screen: false,
    joined: Date.now(),
  };
  await meetSaveRooms();

  // Swap visible panels.
  $('meet-lobby').classList.add('hidden');
  $('meet-room').classList.remove('hidden');
  $('share-indicator').classList.remove('hidden');
  $('meet-code-val').textContent = code;
  MEET.chatMessages = [];
  await meetLoadChat();
  meetRenderChat();
  meetRenderGrid();

  // Connect to already-present participants via WebRTC
  const existingPeers = Object.keys(room.participants).filter(e => e !== SESSION.email);
  for (const peerEmail of existingPeers) {
    meetConnectToPeer(peerEmail);
  }

  // Periodic sync — rooms (participants list) + chat
  if (MEET.roomPoll) clearInterval(MEET.roomPoll);
  MEET.roomPoll = setInterval(async () => {
    if (MEET.state !== 'room') return;
    await meetLoadRooms();
    // Re-assert own participant entry (in case shared state wiped it)
    const r = MEET.rooms[MEET.code];
    if (r) {
      r.participants = r.participants || {};
      if (!r.participants[SESSION.email]) {
        r.participants[SESSION.email] = { email: SESSION.email, name: SESSION.username || 'Agent', mic: MEET.micOn, cam: MEET.camOn, screen: MEET.screenOn, joined: Date.now() };
        meetSaveRooms();
      }
      // Connect to any newly-arrived participants
      for (const email of Object.keys(r.participants)) {
        if (email !== SESSION.email && !MEET.pcs[email]) {
          meetConnectToPeer(email);
        }
      }
    }
    meetRenderGrid();
  }, 3000);
  if (MEET.chatPoll) clearInterval(MEET.chatPoll);
  MEET.chatPoll = setInterval(async () => {
    if (MEET.state !== 'room') return;
    await meetLoadChat();
    meetRenderChat();
  }, 3000);
}

async function meetLeaveRoom() {
  // Clean up own participant entry
  if (MEET.code && MEET.rooms[MEET.code]?.participants) {
    delete MEET.rooms[MEET.code].participants[SESSION.email];
    // If that was the last participant, drop the room entirely so the
    // shared store doesn't fill up with ghost rooms.
    if (Object.keys(MEET.rooms[MEET.code].participants).length === 0) {
      delete MEET.rooms[MEET.code];
    }
    await meetSaveRooms();
  }
  // Close WebRTC peer connections
  for (const pc of Object.values(MEET.pcs)) { try { pc.close(); } catch {} }
  MEET.pcs = {};
  MEET.remoteStreams = {};
  // Stop media
  if (MEET.localStream) { MEET.localStream.getTracks().forEach(t => t.stop()); MEET.localStream = null; }
  if (MEET.localScreen) { MEET.localScreen.getTracks().forEach(t => t.stop()); MEET.localScreen = null; }
  MEET.micOn = MEET.camOn = MEET.screenOn = false;
  if (MEET.roomPoll) { clearInterval(MEET.roomPoll); MEET.roomPoll = null; }
  if (MEET.chatPoll) { clearInterval(MEET.chatPoll); MEET.chatPoll = null; }
  MEET.state = 'lobby';
  MEET.code = null;
  $('meet-lobby').classList.remove('hidden');
  $('meet-room').classList.add('hidden');
  $('share-indicator').classList.add('hidden');
}

async function meetEnsureMic() {
  if (MEET.localStream && MEET.localStream.getAudioTracks().length) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: MEET.camOn });
    if (!MEET.localStream) MEET.localStream = s;
    else s.getAudioTracks().forEach(t => MEET.localStream.addTrack(t));
  } catch (e) { showToast({ title: 'Mic blocked', body: e.message || String(e), kind: 'danger' }); }
}
async function meetEnsureCam() {
  if (MEET.localStream && MEET.localStream.getVideoTracks().length) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: MEET.micOn, video: true });
    if (!MEET.localStream) MEET.localStream = s;
    else s.getVideoTracks().forEach(t => MEET.localStream.addTrack(t));
  } catch (e) { showToast({ title: 'Camera blocked', body: e.message || String(e), kind: 'danger' }); }
}

async function meetToggleMic() {
  if (!MEET.micOn) {
    await meetEnsureMic();
    MEET.localStream?.getAudioTracks().forEach(t => t.enabled = true);
    MEET.micOn = !!MEET.localStream?.getAudioTracks().length;
  } else {
    MEET.localStream?.getAudioTracks().forEach(t => { t.enabled = false; t.stop(); });
    if (MEET.localStream) {
      MEET.localStream.getAudioTracks().forEach(t => MEET.localStream.removeTrack(t));
    }
    MEET.micOn = false;
  }
  // Propagate audio track change to all peer connections
  const audioTrack = MEET.micOn ? (MEET.localStream?.getAudioTracks()[0] || null) : null;
  for (const pc of Object.values(MEET.pcs)) {
    const sender = pc.getSenders().find(s => s.track?.kind === 'audio' || (s.track === null && audioTrack));
    if (sender) {
      sender.replaceTrack(audioTrack).catch(() => {});
    } else if (audioTrack) {
      pc.addTrack(audioTrack, MEET.localStream);
    }
  }
  $('meet-mic-btn').classList.toggle('active', MEET.micOn);
  meetUpdateSelfFlags();
  meetRenderGrid();
}

async function meetToggleCam() {
  if (!MEET.camOn) {
    await meetEnsureCam();
    MEET.camOn = !!MEET.localStream?.getVideoTracks().length;
  } else {
    MEET.localStream?.getVideoTracks().forEach(t => { t.stop(); MEET.localStream.removeTrack(t); });
    MEET.camOn = false;
  }
  // Propagate video track change to all peer connections
  const videoTrack = MEET.camOn ? (MEET.localStream?.getVideoTracks()[0] || null) : null;
  for (const pc of Object.values(MEET.pcs)) {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video' || (s.track === null && videoTrack));
    if (sender) {
      sender.replaceTrack(videoTrack).catch(() => {});
    } else if (videoTrack) {
      pc.addTrack(videoTrack, MEET.localStream);
    }
  }
  $('meet-cam-btn').classList.toggle('active', MEET.camOn);
  meetUpdateSelfFlags();
  meetRenderGrid();
}

async function meetToggleScreen() {
  if (!MEET.screenOn) {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showToast({ title: 'Unsupported', body: 'This browser can\'t share the screen.', kind: 'danger' });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: true });
      MEET.localScreen = s;
      MEET.screenOn = true;
      s.getVideoTracks()[0].addEventListener('ended', () => { MEET.screenOn = false; MEET.localScreen = null; $('meet-screen-btn').classList.remove('active'); meetUpdateSelfFlags(); meetRenderGrid(); });
    } catch (e) {
      if (e.name !== 'NotAllowedError') showToast({ title: 'Share failed', body: e.message || String(e), kind: 'danger' });
      return;
    }
  } else {
    MEET.localScreen?.getTracks().forEach(t => t.stop());
    MEET.localScreen = null;
    MEET.screenOn = false;
  }
  $('meet-screen-btn').classList.toggle('active', MEET.screenOn);
  meetUpdateSelfFlags();
  meetRenderGrid();
}

function meetUpdateSelfFlags() {
  if (!MEET.code) return;
  const room = MEET.rooms[MEET.code];
  if (!room || !room.participants) return;
  const self = room.participants[SESSION.email];
  if (!self) return;
  self.mic = MEET.micOn; self.cam = MEET.camOn; self.screen = MEET.screenOn;
  meetSaveRooms();
}

function meetRenderGrid() {
  const grid = $('meet-grid');
  if (!grid || MEET.state !== 'room') return;
  const room = MEET.rooms[MEET.code];
  const participants = room?.participants ? Object.values(room.participants) : [];
  $('meet-participants-label').textContent = participants.length + ' in room';
  $('meet-peers-n').textContent = Math.max(0, participants.length - 1);

  grid.innerHTML = participants.map(p => {
    const isSelf = p.email === SESSION.email;
    const initial = (p.name || '?')[0].toUpperCase();
    const tileId = 'meet-tile-' + btoa(p.email).replace(/[^a-z0-9]/gi, '').slice(0, 10);
    return `
      <div class="meet-tile ${isSelf ? 'self' : ''}" id="${tileId}">
        ${isSelf && (MEET.camOn || MEET.screenOn)
          ? `<video autoplay playsinline muted id="${tileId}-vid"></video>`
          : `<div class="meet-tile-placeholder"><div class="mt-avatar">${escHtml(initial)}</div><div>${escHtml(p.name)}</div></div>`}
        <div class="meet-tile-label">${escHtml(p.name)}${isSelf ? ' (you)' : ''}</div>
        <div class="meet-tile-flags">
          <span class="mtf ${p.mic ? 'on' : 'off'}" title="${p.mic ? 'Mic on' : 'Mic off'}">
            ${p.mic
              ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="6" y="2" width="4" height="8" rx="2" fill="currentColor"/><path d="M3.5 8 Q3.5 12 8 12 Q12.5 12 12.5 8"/><line x1="8" y1="12" x2="8" y2="14.5"/></svg>'
              : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="6" y="2" width="4" height="8" rx="2"/><path d="M3.5 8 Q3.5 12 8 12 Q12.5 12 12.5 8"/><line x1="8" y1="12" x2="8" y2="14.5"/><line x1="2" y1="2" x2="14" y2="14"/></svg>'}
          </span>
          <span class="mtf ${p.cam ? 'on' : 'off'}" title="${p.cam ? 'Cam on' : 'Cam off'}">
            ${p.cam
              ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="1.5" y="4" width="9" height="8" rx="1.5"/><polygon points="10.5,7 14.5,5 14.5,11 10.5,9" fill="currentColor"/></svg>'
              : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="1.5" y="4" width="9" height="8" rx="1.5"/><polygon points="10.5,7 14.5,5 14.5,11 10.5,9"/><line x1="2" y1="2" x2="14" y2="14" stroke-linecap="round"/></svg>'}
          </span>
          ${p.screen ? '<span class="mtf on" title="Sharing screen"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="1.5" y="2.5" width="13" height="9" rx="1.2"/><line x1="5.5" y1="14" x2="10.5" y2="14" stroke-linecap="round"/><line x1="8" y1="11.5" x2="8" y2="14"/></svg></span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // Wire own video element if local media is playing.
  const selfEntry = participants.find(p => p.email === SESSION.email);
  if (selfEntry && (MEET.camOn || MEET.screenOn)) {
    const tileId = 'meet-tile-' + btoa(selfEntry.email).replace(/[^a-z0-9]/gi, '').slice(0, 10);
    const vid = document.getElementById(tileId + '-vid');
    if (vid) {
      // Prefer screen stream when sharing (it's usually what you want to see).
      vid.srcObject = MEET.screenOn ? MEET.localScreen : MEET.localStream;
    }
  }

  // Wire remote video streams from WebRTC peer connections.
  for (const [peerEmail, stream] of Object.entries(MEET.remoteStreams)) {
    const tileId = 'meet-tile-' + btoa(peerEmail).replace(/[^a-z0-9]/gi, '').slice(0, 10);
    const tile = document.getElementById(tileId);
    if (!tile) continue;
    let vid = tile.querySelector('video');
    if (!vid) {
      const placeholder = tile.querySelector('.meet-tile-placeholder');
      if (placeholder) placeholder.style.display = 'none';
      vid = document.createElement('video');
      vid.autoplay = true;
      vid.playsInline = true;
      vid.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;';
      tile.insertBefore(vid, tile.querySelector('.meet-tile-label'));
    }
    if (vid.srcObject !== stream) vid.srcObject = stream;
  }
}

async function meetLoadChat() {
  if (!MEET.code || !SESSION.email) return;
  try {
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_shared', email: SESSION.email, code: SESSION.code }),
    });
    if (!r.ok) return;
    const { data } = await r.json();
    const key = 'meetChat-' + MEET.code;
    if (data && data[key]) {
      try { MEET.chatMessages = JSON.parse(data[key]) || []; } catch { MEET.chatMessages = []; }
    }
  } catch {}
}

async function meetSaveChat() {
  if (!MEET.code) return;
  try { await cloudSaveShared('meetChat-' + MEET.code, JSON.stringify(MEET.chatMessages.slice(-100))); } catch {}
}

async function meetSendChat(text) {
  text = (text || '').trim();
  if (!text || !MEET.code) return;
  await meetLoadChat();
  MEET.chatMessages.push({
    from: SESSION.username || 'Agent',
    email: SESSION.email,
    text,
    ts: Date.now(),
  });
  await meetSaveChat();
  $('meet-chat-input').value = '';
  meetRenderChat();
}

function meetRenderChat() {
  const body = $('meet-chat-body');
  if (!body) return;
  body.innerHTML = MEET.chatMessages.slice(-80).map(m => `
    <div class="meet-chat-msg"><b>${escHtml(m.from)}</b>${escHtml(m.text)}</div>
  `).join('');
  body.scrollTop = body.scrollHeight;
}

/* ══════════════════════════════
   AGENTS
══════════════════════════════ */
const AgentBus = (() => { const h={}; return { register(id,fn){h[id]=fn;}, unregister(id){delete h[id];}, dispatch(f,t,p){if(h[t])h[t]({from:f,payload:p});}, broadcast(f,p){Object.entries(h).forEach(([id,fn])=>{if(id!==f)fn({from:f,payload:p});});} }; })();
window.AgentBus = AgentBus;

function initAgents() {
  // Recruit modal still accessible via WS agent_join events, not a manual button
  const recruitClose = $('recruit-close'); if (recruitClose) recruitClose.addEventListener('click', ()=>$('recruit-modal').classList.add('hidden'));
  const recruitBack = $('recruit-backdrop'); if (recruitBack) recruitBack.addEventListener('click', ()=>$('recruit-modal').classList.add('hidden'));
  const recruitSave = $('recruit-save'); if (recruitSave) recruitSave.addEventListener('click', recruitAgent);
  $('edit-agent-close').addEventListener('click', ()=>$('edit-agent-modal').classList.add('hidden'));
  $('edit-agent-backdrop').addEventListener('click', ()=>$('edit-agent-modal').classList.add('hidden'));
}
// HALOS removed — agents are managed via the recruit system or Hermes connections

function getAgent(id) {
  return STATE.agents.find(a => a.id === id);
}
function addAgent(agent) {
  if(STATE.agents.find(a=>a.id===agent.id)) return;
  STATE.agents.push(agent); AgentBus.register(agent.id, msg=>console.log(`[${agent.id}]`,msg));
  persistAgents(); buildAgentTabs(); buildWorkspaceTabs(); renderAgentSidebar(); renderAgents();
}
function removeAgent(id) {
  STATE.agents=STATE.agents.filter(a=>a.id!==id); AgentBus.unregister(id);
  persistAgents(); if(STATE.activeChat===id) switchChat(STATE.agents[0]?.id || 'general');
  buildAgentTabs(); buildWorkspaceTabs(); renderAgentSidebar(); renderAgents();
}
function recruitAgent() {
  const name=$('recruit-name').value.trim(); if(!name) return;
  const id='agent-'+Date.now();
  addAgent({ id, name, type:$('recruit-type').value.trim()||'Custom Agent', caps:$('recruit-caps').value.split(',').map(s=>s.trim()).filter(Boolean), online:true, avatar:name[0].toUpperCase(), hermes:$('recruit-hermes').value.trim()||null, interests:$('recruit-interests').value.split(',').map(s=>s.trim()).filter(Boolean) });
  sendWS({type:'agent_join',id,name,agentType:'Custom Agent',interests:[]});
  $('recruit-modal').classList.add('hidden');
  ['recruit-name','recruit-type','recruit-hermes','recruit-caps','recruit-interests'].forEach(k=>{const el=$(k);if(el)el.value='';});
}
function showEditAgent(agentId) {
  const agent = getAgent(agentId); if (!agent) return;
  const body = $('edit-agent-body');
  body.innerHTML = `
    <div class="profile-editor" style="margin-bottom:14px">
      <div class="profile-pic-wrap">
        <div class="profile-pic" id="ea-pic-preview">
          ${agent.profilePic ? `<img src="${escHtml(agent.profilePic)}" alt="Agent"/>` : `<span>${(agent.avatar||agent.name[0]||'?').toUpperCase()}</span>`}
        </div>
        <button class="profile-pic-btn" id="ea-pic-btn">Upload Photo</button>
        <input type="file" id="ea-pic-input" accept="image/*" hidden/>
      </div>
      <div class="profile-fields">
        <div class="settings-group"><label class="settings-label">Agent Name</label><input type="text" class="settings-input" id="ea-name" value="${escHtml(agent.name)}"/></div>
        <div class="settings-group"><label class="settings-label">Role / Type</label><input type="text" class="settings-input" id="ea-type" value="${escHtml(agent.type||'')}"/></div>
      </div>
    </div>
    <div class="settings-group"><label class="settings-label">Agent Bridge Endpoint</label><input type="text" class="settings-input" id="ea-hermes" value="${escHtml(agent.hermes||'')}"/></div>
    <div class="settings-group"><label class="settings-label">Capabilities (comma-separated)</label><input type="text" class="settings-input" id="ea-caps" value="${escHtml((agent.caps||[]).join(', '))}"/></div>
    <div class="settings-group"><label class="settings-label">Interests (comma-separated)</label><input type="text" class="settings-input" id="ea-interests" value="${escHtml((agent.interests||[]).join(', '))}"/><div class="settings-hint">Topics this agent prioritizes. Example: space, combat, navigation</div></div>
    <button class="save-btn" id="ea-save">Save Changes</button>`;

  let newPic = agent.profilePic || null;
  body.querySelector('#ea-pic-btn').addEventListener('click', () => body.querySelector('#ea-pic-input').click());
  body.querySelector('#ea-pic-input').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { newPic = ev.target.result; body.querySelector('#ea-pic-preview').innerHTML = `<img src="${newPic}" alt="Agent"/>`; };
    r.readAsDataURL(file);
  });

  body.querySelector('#ea-save').addEventListener('click', () => {
    agent.name = $('ea-name').value.trim() || agent.name;
    agent.type = $('ea-type').value.trim() || agent.type;
    agent.hermes = $('ea-hermes').value.trim() || null;
    agent.caps = $('ea-caps').value.split(',').map(s => s.trim()).filter(Boolean);
    agent.interests = $('ea-interests').value.split(',').map(s => s.trim()).filter(Boolean);
    agent.avatar = agent.name[0]?.toUpperCase() || '?';
    agent.profilePic = newPic;
    persistAgents();
    buildAgentTabs(); buildWorkspaceTabs(); renderAgentSidebar(); renderAgents(); buildSsAgentSelector();
    $('edit-agent-modal').classList.add('hidden');
    addSystemMsg(STATE.activeChat, `Agent "${agent.name}" profile updated.`);
  });
  $('edit-agent-modal').classList.remove('hidden');
}
function renderAgentSidebar() {
  const c = $('sidebar-agents');
  // Remove all dynamically added agent items (keep #sidebar-item-you which is static HTML)
  c.querySelectorAll('.agent-item:not(#sidebar-item-you)').forEach(e => e.remove());

  STATE.agents.forEach(a => {
    const d = document.createElement('div');
    const online = isAgentOnline(a);
    d.className = 'agent-item' + (online ? ' online' : '');
    d.dataset.agentId = a.id;
    const avatarInner = a.profilePic
      ? `<img src="${escHtml(a.profilePic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${escHtml(a.name)}"/>`
      : (a.avatar || a.name[0] || '?');
    const statusText = agentStatusLabel(a);
    d.innerHTML = `<div class="sidebar-avatar">${avatarInner}</div><div class="agent-info"><span class="agent-name">${escHtml(a.name)}</span><span class="agent-status">${escHtml(statusText)}</span></div>`;
    d.addEventListener('click', () => switchChat(a.id));
    c.appendChild(d);
  });
  // Render server-fetched users
  (STATE.serverUsers || []).forEach(u => {
    if (u.email === SESSION.email && u.is_agent === !!SESSION.isAgent) return; // skip self (same email + same account type)
    const d = document.createElement('div');
    const isOnline = (Date.now() - new Date(u.last_seen)) < 5 * 60000;
    d.className = 'agent-item' + (isOnline ? ' online' : '');
    const initial = (u.username || u.first_name || '?')[0].toUpperCase();
    const statusLabel = u.is_agent ? 'AI' : 'Agent';
    const chatId = 'user-' + u.email;
    d.innerHTML = `<div class="sidebar-avatar">${initial}</div><div class="agent-info"><span class="agent-name">${escHtml(u.username || u.first_name)}</span><span class="agent-status">${isOnline ? 'Online' : 'Offline'} · ${statusLabel}</span></div>`;
    d.addEventListener('click', () => {
      // Switch to chat panel and open chat with this user
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelector('.nav-btn[data-panel="chat"]')?.classList.add('active');
      $('panel-chat')?.classList.add('active');
      switchChat(chatId);
      $('chat-panel-title').textContent = 'Secure Channel · ' + (u.username || u.first_name);
    });
    c.appendChild(d);
  });
}

async function loadSidebarUsers() {
  try {
    const r = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'get_online_users' }) });
    if (!r.ok) return;
    const data = await r.json();
    STATE.serverUsers = data.users || [];
    renderAgentSidebar();
    // Re-render the Agents panel cards so their online dots + labels track
    // the fresh last_seen data from the server. Roster re-render on its own.
    try { renderAgents(); } catch {}
    try { if (typeof renderRoster === 'function') renderRoster(); } catch {}
    buildSsAgentSelector();
    rebuildChatSelector();
    buildAgentTabs();
  } catch {}
}
// Unified online check — used by sidebar, roster, agent cards, and anywhere
// else we show agent status. Looks up the agent/user by email (or id/name) in
// the live serverUsers table and checks last_seen against the same 5-min
// window the sidebar uses. Falls back to the agent's stored `online` flag for
// purely local agents that don't have a server user pairing.
function _findServerUserFor(a) {
  if (!a) return null;
  const users = (STATE && STATE.serverUsers) || [];
  const email = (a.email || '').toLowerCase();
  if (email) {
    const u = users.find(x => (x.email || '').toLowerCase() === email);
    if (u) return u;
  }
  if (a.id) {
    const u = users.find(x => x.id === a.id);
    if (u) return u;
  }
  if (a.name) {
    const nm = String(a.name).toLowerCase();
    const u = users.find(x => (x.username && x.username.toLowerCase() === nm)
      || (x.first_name && x.first_name.toLowerCase() === nm));
    if (u) return u;
  }
  return null;
}
function isAgentOnline(a) {
  if (!a) return false;
  const u = _findServerUserFor(a);
  if (u) {
    if (u.status === 'offline') return false;
    if (!u.last_seen) return !!u.status && u.status !== 'offline';
    return (Date.now() - new Date(u.last_seen)) < 5 * 60000;
  }
  // No matching server user — fall back to the agent's stored flag, if any.
  return !!a.online;
}
function agentStatusLabel(a) {
  if (!a) return 'Offline';
  if (!isAgentOnline(a)) return 'Offline';
  const u = _findServerUserFor(a);
  const s = (u && u.status) || 'online';
  return { online:'Online', away:'Away', dnd:'Do Not Disturb' }[s] || 'Online';
}

function renderAgents() {
  const grid = $('agents-grid');
  if (!grid) return;

  // AI agents: those with an hermes endpoint set
  const aiAgents = STATE.agents.filter(a => a.hermes);
  const humanAgents = STATE.agents.filter(a => !a.hermes);

  function cardHTML(a) {
    const avatarInner = a.profilePic
      ? `<img src="${escHtml(a.profilePic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${escHtml(a.name)}"/>`
      : (a.avatar || a.name[0] || '?');
    const online = isAgentOnline(a);
    const lbl = agentStatusLabel(a);
    return `<div class="agent-card">
      <div class="agent-card-top">
        <div class="agent-card-avatar">${avatarInner}</div>
        <div>
          <div class="agent-card-name">${escHtml(a.name)}</div>
          <div class="agent-card-type">${escHtml(a.type || 'Agent')}</div>
        </div>
      </div>
      <div class="agent-card-status"><span class="status-dot ${online?'green':''}"></span>${lbl}</div>
      ${a.interests?.length ? `<div class="agent-card-interests">Interests: <span>${escHtml(a.interests.join(', '))}</span></div>` : ''}
      <div class="agent-card-caps">${(a.caps||[]).map(c=>`<span class="cap-tag">${escHtml(c)}</span>`).join('')}</div>
      <div class="agent-card-btns">
        <button class="agent-card-btn" data-chat="${a.id}">Open Chat</button>
        <button class="agent-card-btn" data-edit="${a.id}">Edit</button>
      </div>
    </div>`;
  }

  grid.innerHTML = `
    <div class="agents-section-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      AI Agents
    </div>
    ${aiAgents.map(cardHTML).join('') || '<div class="ws-empty">No AI agents connected.</div>'}
    <div class="agents-section-title" style="margin-top:18px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Human Users
    </div>
    ${humanAgents.map(cardHTML).join('') || '<div class="ws-empty">No other users added yet.</div>'}
  `;

  grid.querySelectorAll('[data-chat]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.nav-btn[data-panel="chat"]')?.classList.add('active');
    $('panel-chat')?.classList.add('active');
    switchChat(btn.dataset.chat);
  }));
  grid.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => showEditAgent(btn.dataset.edit)));
}

/* ══════════════════════════════
   PROJECTS
══════════════════════════════ */
function initProjects() {
  $('btn-new-project').addEventListener('click', ()=>showProjectForm());
  $('project-backdrop').addEventListener('click', ()=>$('project-modal').classList.add('hidden'));
  $('project-modal-close').addEventListener('click', ()=>$('project-modal').classList.add('hidden'));
}
function showProjectForm(existing, idx) {
  const isEdit=typeof idx==='number';
  $('project-modal-title').textContent=isEdit?'Edit Mission':'New Mission';
  const body=$('project-modal-body');
  const todos=existing?.todos?.map(t=>({...t}))||[];
  const projectNotes=existing?.notes||[];

  function renderTodos() { const ul=body.querySelector('.todo-list-edit'); if(!ul)return; ul.innerHTML=todos.map((t,i)=>`<div class="todo-edit-item"><span>${escHtml(t.text)}</span><button class="todo-remove" data-i="${i}">✕</button></div>`).join(''); ul.querySelectorAll('.todo-remove').forEach(btn=>btn.addEventListener('click',()=>{todos.splice(+btn.dataset.i,1);renderTodos();})); }
  function renderProjectNotes() { const ul=body.querySelector('.proj-notes-list'); if(!ul)return; ul.innerHTML=projectNotes.map((n,i)=>`<div class="project-note-item"><div class="project-note-text">${escHtml(n)}</div><button class="project-note-del" data-i="${i}">✕</button></div>`).join(''); ul.querySelectorAll('.project-note-del').forEach(btn=>btn.addEventListener('click',()=>{projectNotes.splice(+btn.dataset.i,1);renderProjectNotes();})); }

  const agentOptions=STATE.agents.map(a=>`<label class="agent-cb-label"><input type="checkbox" value="${a.id}" ${existing?.agents?.includes(a.id)?'checked':''}> ${escHtml(a.name)}</label>`).join('') || '<span style="color:var(--text3);font-size:0.7rem">No agents added yet</span>';

  body.innerHTML=`
    <div class="project-form">
      <input id="proj-title" type="text" placeholder="Mission title…" value="${isEdit?escHtml(existing.title):''}"/>
      <textarea id="proj-goal" placeholder="End goal…" rows="2">${isEdit?escHtml(existing.goal||''):''}</textarea>
      <div class="settings-label" style="margin-top:8px">Assigned Agents</div>
      <div class="agent-checkboxes">${agentOptions}</div>
      <div class="settings-label" style="margin-top:8px">To-Do List</div>
      <div class="todo-input-row"><input id="todo-inp" type="text" placeholder="Add a task…"/><button class="add-todo-btn" id="add-todo">Add</button></div>
      <div class="todo-list-edit" style="margin-top:6px"></div>
      <div class="project-notes-section">
        <div class="settings-label">Mission Notes</div>
        <div class="todo-input-row" style="margin-top:6px"><input id="proj-note-inp" type="text" placeholder="Add a note…"/><button class="add-todo-btn" id="add-proj-note">Add</button></div>
        <div class="proj-notes-list" style="margin-top:6px"></div>
      </div>
      <button class="save-btn" id="proj-save" style="margin-top:14px">${isEdit?'Update Mission':'Launch Mission'}</button>
    </div>`;

  renderTodos(); renderProjectNotes();
  body.querySelector('#add-todo').addEventListener('click',()=>{ const v=body.querySelector('#todo-inp').value.trim(); if(v){todos.push({text:v,done:false});body.querySelector('#todo-inp').value='';renderTodos();} });
  body.querySelector('#todo-inp').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.querySelector('#add-todo').click();}});
  body.querySelector('#add-proj-note').addEventListener('click',()=>{ const v=body.querySelector('#proj-note-inp').value.trim(); if(v){projectNotes.push(v);body.querySelector('#proj-note-inp').value='';renderProjectNotes();} });
  body.querySelector('#proj-note-inp').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.querySelector('#add-proj-note').click();}});
  body.querySelector('#proj-save').addEventListener('click',()=>{
    const title=body.querySelector('#proj-title').value.trim(); if(!title) return;
    const agents=[...body.querySelectorAll('.agent-checkboxes input:checked')].map(c=>c.value);
    const project={ id:existing?.id||'proj-'+Date.now(), title, goal:body.querySelector('#proj-goal').value.trim(), agents, todos, notes:projectNotes, created:existing?.created||Date.now() };
    if(isEdit) STATE.projects[idx]=project; else STATE.projects.unshift(project);
    persistProjects(); renderProjects(); $('project-modal').classList.add('hidden');
  });
  $('project-modal').classList.remove('hidden'); body.querySelector('#proj-title').focus();
}
function renderProjects() {
  const grid=$('projects-grid');
  if(!STATE.projects.length){grid.innerHTML=`<div class="ws-empty">No missions active. Launch one to get started.<br><span style="color:var(--text3);font-size:0.65rem">${escHtml(crewFlavorLine())}</span></div>`;return;}
  grid.innerHTML=STATE.projects.map((p,i)=>{
    const done=p.todos.filter(t=>t.done).length; const total=p.todos.length; const pct=total?Math.round(done/total*100):0;
    return `<div class="project-card" data-idx="${i}">
      <div class="project-card-title">${escHtml(p.title)}</div>
      ${p.goal?`<div class="project-card-goal">${escHtml(p.goal)}</div>`:''}
      <div class="project-progress"><div class="project-progress-fill" style="width:${pct}%"></div></div>
      <div class="project-card-meta"><span>${done}/${total} tasks · ${pct}%</span><button class="project-card-delete" data-idx="${i}">✕</button></div>
      <div class="project-todos">${p.todos.slice(0,3).map((t,ti)=>`<div class="project-todo ${t.done?'done':''}"><input type="checkbox" ${t.done?'checked':''} data-proj="${i}" data-todo="${ti}"/><span>${escHtml(t.text)}</span></div>`).join('')}${p.todos.length>3?`<div style="font-size:0.6rem;color:var(--text3);font-family:var(--font-m)">+${p.todos.length-3} more</div>`:''}</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.project-card').forEach(card=>{ card.addEventListener('click',e=>{ if(e.target.type==='checkbox'||e.target.classList.contains('project-card-delete'))return; showProjectForm(STATE.projects[+card.dataset.idx],+card.dataset.idx); }); });
  grid.querySelectorAll('.project-card-delete').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();STATE.projects.splice(+btn.dataset.idx,1);persistProjects();renderProjects();}));
  grid.querySelectorAll('.project-todo input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',e=>{e.stopPropagation();const p=STATE.projects[+cb.dataset.proj];if(p){p.todos[+cb.dataset.todo].done=cb.checked;const allDone=p.todos.length&&p.todos.every(t=>t.done);if(allDone){setTimeout(()=>{STATE.projects.splice(+cb.dataset.proj,1);persistProjects();renderProjects();},600);}else{persistProjects();renderProjects();}}}));
  updateAllBadges();
}

/* ══════════════════════════════
   ROSTER
══════════════════════════════ */
function initRoster() {
  $('btn-refresh-roster').addEventListener('click', loadRoster);
  // Personalise the subheader with the logged-in user's division and name
  const phDiv  = $('roster-ph-div');
  const phName = $('roster-ph-name');
  if (phDiv)  phDiv.textContent  = SESSION.division || 'NOT DECIDED';
  if (phName) phName.textContent = SESSION.firstName || '—';
}
async function loadRoster() {
  const grid = $('roster-grid'); grid.innerHTML = '<div class="ws-empty">Synchronizing Division not decided roster…</div>';
  try {
    const r = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'get_online_users' }) });
    const data = await r.json();
    if (!r.ok) {
      grid.innerHTML = `<div class="ws-empty">Roster error: ${escHtml(data.error || 'Unknown error')}${data.detail ? '<br><small>' + escHtml(data.detail) + '</small>' : ''}</div>`;
      return;
    }
    const users = data.users || [];
    if (!users.length) { grid.innerHTML = '<div class="ws-empty">No accounts registered yet.</div>'; return; }

    function cardHTML(u) {
      const isOnline = (Date.now() - new Date(u.last_seen)) < 5 * 60000;
      const statusText = !isOnline ? 'Offline' :
        ({ online:'Online', away:'Away', dnd:'Do Not Disturb' }[u.status] || 'Online');
      const statusClass = isOnline ? (u.status === 'offline' ? 'online' : (u.status || 'online')) : 'offline';
      const statusDot = `<span class="roster-status-dot ${statusClass}"></span>`;
      const isSelf = u.email === SESSION.email && u.is_agent === !!SESSION.isAgent;
      return `<div class="roster-card${isSelf ? ' roster-self' : ''}" data-chat-email="${escHtml(u.email)}" data-chat-name="${escHtml(u.username || u.first_name)}" data-bio="${escHtml(u.bio || '')}" data-user-type="${u.is_agent ? 'AI' : 'Agent'}">
        <div class="roster-avatar">${(u.username || u.first_name || '?')[0].toUpperCase()}</div>
        <div class="roster-info">
          <div class="roster-name">${escHtml(formatAgentName(u.username || u.first_name))}${isSelf ? ' (You)' : ''}</div>
          <div class="roster-status ${statusClass}">${statusDot}${statusText}</div>
        </div>
        ${!isSelf ? `<button class="roster-delete-btn" data-email="${escHtml(u.email)}" data-name="${escHtml(u.username || u.first_name)}" title="Delete account">✕</button>` : ''}
      </div>`;
    }

    const aiUsers = users.filter(u => u.is_agent);
    const humanUsers = users.filter(u => !u.is_agent);

    grid.innerHTML = `
      <button class="doc-new-btn" id="btn-group-chat" style="margin-bottom:12px">+ New Group Chat</button>
      <div class="roster-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 21h8M12 17v4"/></svg>
        S.P.A.C.E. AI Accounts
      </div>
      <div class="roster-section-cards">${aiUsers.map(cardHTML).join('') || '<div class="ws-empty" style="font-size:0.7rem">No AI agents registered.</div>'}</div>
      <div class="roster-section-title" style="margin-top:16px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        S.P.A.C.E. Agent Accounts
      </div>
      <div class="roster-section-cards">${humanUsers.map(cardHTML).join('') || '<div class="ws-empty" style="font-size:0.7rem">No human users registered.</div>'}</div>
    `;

    // Click roster card → show bio flyout; flyout has "Open Chat" button
    grid.querySelectorAll('.roster-card:not(.roster-self)').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.roster-delete-btn')) return;
        showRosterBio(card);
      });
      card.style.cursor = 'pointer';
    });

    // Group chat button
    const gcBtn = $('btn-group-chat');
    if (gcBtn) {
      gcBtn.addEventListener('click', () => {
        const otherUsers = users.filter(u => u.email !== SESSION.email);
        if (!otherUsers.length) { alert('No other users to create a group chat with.'); return; }
        const checkboxes = otherUsers.map(u => `<label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer"><input type="checkbox" value="${escHtml(u.email)}" data-name="${escHtml(u.username||u.first_name)}"> ${escHtml(u.username||u.first_name)} ${u.is_agent?'(AI)':'(Agent)'}</label>`).join('');
        const modal = document.createElement('div');
        modal.className = 'modal'; modal.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(7,5,15,0.85);backdrop-filter:blur(6px);';
        modal.innerHTML = `<div class="modal-box" style="max-width:400px"><div class="modal-header"><span>New Group Chat</span><button class="modal-close" id="gc-close">✕</button></div><div class="modal-body"><div class="settings-group"><label class="settings-label">Chat Name</label><input type="text" class="settings-input" id="gc-name" placeholder="e.g. Mission Alpha"/></div><div class="settings-group"><label class="settings-label">Select Members</label><div id="gc-members" style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">${checkboxes}</div></div><button class="save-btn" id="gc-create">Create Group Chat</button></div></div>`;
        document.body.appendChild(modal);
        modal.querySelector('#gc-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#gc-create').addEventListener('click', () => {
          const name = modal.querySelector('#gc-name').value.trim() || 'Group Chat';
          const selected = [...modal.querySelectorAll('#gc-members input:checked')];
          if (!selected.length) { alert('Select at least one member.'); return; }
          const memberNames = selected.map(cb => cb.dataset.name);
          const memberEmails = selected.map(cb => cb.value);
          const gcId = 'group-' + Date.now();
          if (!STATE.groupChats) STATE.groupChats = {};
          STATE.groupChats[gcId] = { name, members: [SESSION.email, ...memberEmails], memberNames: [SESSION.username, ...memberNames] };
          persistGroupChats();
          modal.remove();
          // Navigate to chat
          document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
          document.querySelector('.nav-btn[data-panel="chat"]')?.classList.add('active');
          $('panel-chat')?.classList.add('active');
          rebuildChatSelector();
          switchChat(gcId);
          buildAgentTabs();
        });
      });
    }

    // Delete account handler
    grid.querySelectorAll('.roster-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const email = btn.dataset.email;
        const name = btn.dataset.name;
        const passcode = prompt(`Enter master code to delete "${name}"'s account:`);
        if (!passcode) return;
        if (passcode.trim() !== '2089') { alert('Incorrect master code.'); return; }
        try {
          const dr = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete_account', passcode: SESSION.code, callerEmail: SESSION.email, email }) });
          const dd = await dr.json();
          if (dr.ok) {
            addSystemMsg(STATE.activeChat, `Account "${name}" has been deleted.`);
            loadRoster();
            loadSidebarUsers();
          } else {
            alert(dd.error || 'Delete failed.');
          }
        } catch (e2) { alert('Network error: ' + e2.message); }
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="ws-empty">Could not reach server.<br><small>${escHtml(err.message)}</small></div>`;
  }
}

function showRosterBio(card) {
  document.querySelectorAll('.roster-bio-flyout').forEach(el => el.remove());
  const name = card.dataset.chatName || 'Agent';
  const email = card.dataset.chatEmail || '';
  const bio = card.dataset.bio || '';
  const type = card.dataset.userType || 'Agent';
  const initial = name[0]?.toUpperCase() || '?';
  const flyout = document.createElement('div');
  flyout.className = 'roster-bio-flyout';
  flyout.innerHTML = `
    <div class="rbf-header">
      <div class="rbf-avatar">${initial}</div>
      <div class="rbf-identity">
        <div class="rbf-name">${escHtml(formatAgentName(name))}</div>
        <div class="rbf-type">${escHtml(type)} · ${escHtml(email)}</div>
      </div>
      <button class="rbf-close">✕</button>
    </div>
    <div class="rbf-bio">${bio ? escHtml(bio) : '<em style="opacity:0.5">No bio set.</em>'}</div>
    <div class="rbf-actions">
      <button class="rbf-chat-btn">Open Chat</button>
    </div>
  `;
  // Position near the card
  const rect = card.getBoundingClientRect();
  flyout.style.top = (rect.bottom + 8) + 'px';
  flyout.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
  document.body.appendChild(flyout);
  flyout.querySelector('.rbf-close').addEventListener('click', () => flyout.remove());
  document.addEventListener('click', function dismiss(e) {
    if (!flyout.contains(e.target) && !card.contains(e.target)) { flyout.remove(); document.removeEventListener('click', dismiss); }
  }, { capture: true });
  flyout.querySelector('.rbf-chat-btn').addEventListener('click', () => {
    flyout.remove();
    const chatId = 'user-' + email;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.nav-btn[data-panel="chat"]')?.classList.add('active');
    $('panel-chat')?.classList.add('active');
    switchChat(chatId);
    $('chat-panel-title').textContent = 'Secure Channel · ' + formatAgentName(name);
  });
}

/* ══════════════════════════════
   SETTINGS
══════════════════════════════ */
function initSettings() {
  // NOTE: topbar-settings is wired via initGlobalTopbarDelegation.
  const sb = $('settings-btn');
  if (sb) sb.addEventListener('click', openSettings);
  const mc = $('modal-close'); if (mc) mc.addEventListener('click', closeSettings);
  const mb = $('modal-backdrop'); if (mb) mb.addEventListener('click', closeSettings);
  const ss = $('settings-save'); if (ss) ss.addEventListener('click', saveSettings);
  const sm = $('settings-modal'); if (sm) sm.addEventListener('keydown', e=>{if(e.key==='Escape')closeSettings();});

  const ppb = $('profile-pic-btn'); if (ppb) ppb.addEventListener('click', ()=>{ const i=$('profile-pic-input'); if(i) i.click(); });
  const ppi = $('profile-pic-input'); if (ppi) ppi.addEventListener('change', e=>{
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader(); r.onload=ev=>{ SESSION.profilePic=ev.target.result; saveSession(); updateProfileUI(); }; r.readAsDataURL(file);
  });

  const picker=$('accent-picker');
  if (picker) { picker.addEventListener('input', ()=>{ applyAccent(picker.value); const ch=$('color-hex'); if(ch) ch.textContent=picker.value; }); }
  document.querySelectorAll('.cpre').forEach(btn=>{ btn.addEventListener('click',()=>{ document.querySelectorAll('.cpre').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); if(picker){picker.value=btn.dataset.color;} applyAccent(btn.dataset.color); const ch=$('color-hex'); if(ch) ch.textContent=btn.dataset.color; }); });

  const slb = $('sidebar-logo-btn');
  if (slb) { slb.addEventListener('click', openSettings); slb.addEventListener('keydown', e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSettings();}}); }

  // Audio settings — live updates as you drag
  const aMute = $('audio-mute'), aMaster = $('audio-master'), aAmbient = $('audio-ambient'), aSfx = $('audio-sfx');
  if (aMute && window.HALOSAudio) {
    aMute.addEventListener('change', () => HALOSAudio.setMuted(aMute.checked));
    aMaster.addEventListener('input', () => {
      const v = +aMaster.value / 100;
      HALOSAudio.setMasterVol(v);
      $('audio-master-val').textContent = aMaster.value + '%';
    });
    aAmbient.addEventListener('input', () => {
      const v = +aAmbient.value / 100;
      HALOSAudio.setAmbientVol(v);
      $('audio-ambient-val').textContent = aAmbient.value + '%';
    });
    aSfx.addEventListener('input', () => {
      const v = +aSfx.value / 100;
      HALOSAudio.setSfxVol(v);
      $('audio-sfx-val').textContent = aSfx.value + '%';
      if (v > 0 && !aMute.checked) HALOSAudio.clickSfx(); // preview
    });
  }
}
function openSettings() {
  $('settings-username').value = SESSION.username || SESSION.firstName || 'Agent';
  $('settings-bio').value = SESSION.bio || '';
  $('settings-status').value = SESSION.status || 'online';
  $('accent-picker').value = SESSION.accent || '#00e5ff';
  $('color-hex').textContent = SESSION.accent || '#00e5ff';
  const divEl = $('settings-division'); if (divEl) divEl.value = SESSION.division || '';
  const clkEl = $('settings-clock-fmt'); if (clkEl) clkEl.value = SESSION.clockFmt || '12';
  const ncEl = $('settings-notif-calls'); if (ncEl) ncEl.checked = SESSION.notifCalls !== false;
  const nmEl = $('settings-notif-msgs'); if (nmEl) nmEl.checked = SESSION.notifMsgs !== false;
  const ccEl = $('settings-compact-chat'); if (ccEl) ccEl.checked = !!SESSION.compactChat;
  // Hydrate audio settings from current state
  if (window.HALOSAudio && $('audio-mute')) {
    const a = HALOSAudio.getSettings();
    $('audio-mute').checked = a.muted;
    $('audio-master').value = Math.round(a.masterVol * 100);
    $('audio-master-val').textContent = Math.round(a.masterVol * 100) + '%';
    $('audio-ambient').value = Math.round(a.ambientVol * 100);
    $('audio-ambient-val').textContent = Math.round(a.ambientVol * 100) + '%';
    $('audio-sfx').value = Math.round(a.sfxVol * 100);
    $('audio-sfx-val').textContent = Math.round(a.sfxVol * 100) + '%';
  }
  updateProfileUI();
  $('settings-modal').classList.remove('hidden');
  $('settings-username').focus();
}
function closeSettings() { $('settings-modal').classList.add('hidden'); }
function saveSettings() {
  SESSION.username = $('settings-username').value.trim() || SESSION.firstName || 'Agent';
  SESSION.bio = $('settings-bio').value.trim();
  SESSION.status = $('settings-status').value;
  const divEl = $('settings-division'); if (divEl) SESSION.division = divEl.value;
  const clkEl = $('settings-clock-fmt'); if (clkEl) SESSION.clockFmt = clkEl.value;
  const ncEl = $('settings-notif-calls'); if (ncEl) SESSION.notifCalls = ncEl.checked;
  const nmEl = $('settings-notif-msgs'); if (nmEl) SESSION.notifMsgs = nmEl.checked;
  const ccEl = $('settings-compact-chat'); if (ccEl) {
    SESSION.compactChat = ccEl.checked;
    document.getElementById('panel-chat')?.classList.toggle('compact-chat', !!SESSION.compactChat);
  }
  SESSION.isLoggedIn = true;
  saveSession();
  updateProfileUI();
  $('sidebar-name-you').textContent = formatAgentName(SESSION.username);

  if (SESSION.email && SESSION.code) {
    fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'update_profile', email:SESSION.email, code:SESSION.code, username:SESSION.username, bio:SESSION.bio, status:SESSION.status, accent:SESSION.accent, profilePic:SESSION.profilePic, division:SESSION.division }) }).catch(()=>{});
  }
  closeSettings();
  addSystemMsg(STATE.activeChat, 'Settings saved. Profile updated.');
  renderAgents();
  if (window.HALOSAudio) HALOSAudio.successSfx();
  // Refresh roster subheader so division/name reflect the new values
  const phDiv  = $('roster-ph-div');
  const phName = $('roster-ph-name');
  if (phDiv)  phDiv.textContent  = SESSION.division || 'NOT DECIDED';
  if (phName) phName.textContent = SESSION.firstName || '—';
}
function updateProfileUI() {
  const displayName = formatAgentName(SESSION.username || SESSION.firstName || '');
  const nameEl=$('sidebar-name-you'); if(nameEl) nameEl.textContent=displayName;
  const statusEl=$('sidebar-status-you'); if(statusEl) statusEl.textContent='S.P.A.C.E.';
  const avatarEl=$('sidebar-avatar-you');
  if(avatarEl){
    if(SESSION.profilePic){avatarEl.innerHTML=`<img src="${SESSION.profilePic}" alt="Profile"/>`;}
    else{avatarEl.textContent=(SESSION.username||SESSION.firstName||'A')[0]?.toUpperCase();}
  }
  const prevEl=$('profile-pic-preview');
  if(prevEl){
    if(SESSION.profilePic){$('profile-pic-initials').hidden=true;const img=$('profile-pic-img');img.src=SESSION.profilePic;img.hidden=false;}
    else{$('profile-pic-initials').textContent=(SESSION.username||SESSION.firstName||'A')[0]?.toUpperCase();$('profile-pic-initials').hidden=false;$('profile-pic-img').hidden=true;}
  }
  const bootLabel=$('boot-division-label'); if(bootLabel) bootLabel.textContent='S.P.A.C.E.';
}
function applyAccent(color) {
  SESSION.accent = color;
  document.documentElement.style.setProperty('--accent', color);
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  document.documentElement.style.setProperty('--accent2', `rgb(${Math.round(r*0.45)},${Math.round(g*0.45)},${Math.round(b*0.45)})`);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.13)`);
  document.documentElement.style.setProperty('--text-glow-accent', `0 0 8px ${color}, 0 0 20px rgba(${r},${g},${b},0.35)`);
  // Persist immediately so cross-device sync picks it up without needing a full Settings save
  saveSession();
  cloudPushTheme();
}
function applyLogo() {
  // Logo is now fixed — no picker needed
}
// Debounced cloud push for theme changes (accent + logo) — avoids hammering the API on every picker tick
let _themePushTimer = null;
function cloudPushTheme() {
  clearTimeout(_themePushTimer);
  _themePushTimer = setTimeout(() => {
    if (!SESSION.email || !SESSION.code) return;
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        email: SESSION.email,
        code: SESSION.code,
        accent: SESSION.accent,
      }),
    }).catch(() => {});
  }, 800); // wait 800ms after last change before sending
}

/* ══════════════════════════════
   FILE PREVIEW
══════════════════════════════ */
function initFilePreview() {
  $('preview-close').addEventListener('click',closePreview);
  $('preview-backdrop').addEventListener('click',closePreview);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('preview-modal').classList.contains('hidden'))closePreview();});
}
function openPreview({type,name,url,content}) {
  $('preview-filename').textContent=name||'Preview';
  const body=$('preview-body'); body.innerHTML='';
  if(type==='image'){const img=document.createElement('img');img.className='preview-img';img.src=url;img.alt=name;body.appendChild(img);}
  else if(type==='video'){const v=document.createElement('video');v.className='preview-video';v.src=url;v.controls=true;v.autoplay=true;body.appendChild(v);}
  else if(type==='text'&&(content||url)){const pre=document.createElement('div');pre.className='preview-doc';if(content?.startsWith('data:')){try{pre.textContent=atob(content.split(',')[1]);}catch{pre.textContent='(decode error)';}}else pre.textContent=content||'(empty)';body.appendChild(pre);}
  else{const a=document.createElement('a');a.className='preview-link';a.href=url||'#';a.textContent=url||name;a.target='_blank';body.appendChild(a);}
  $('preview-modal').classList.remove('hidden');
}
function closePreview() { $('preview-modal').classList.add('hidden'); const v=$('preview-body').querySelector('video');if(v)v.pause(); }

/* ══════════════════════════════
   VOICE TO TEXT
══════════════════════════════ */
function initVoiceToText() {
  const btn=$('btn-voice'); if(!btn) return;
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)) { btn.title='Voice input not supported in this browser'; btn.style.opacity='0.4'; return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();
  // Continuous + interim for a dictation-like feel. maxAlternatives lets us
  // pick the highest-confidence transcription instead of the first one the
  // engine happens to emit, which is the #1 cause of mis-spellings.
  rec.continuous=true;
  rec.interimResults=true;
  rec.maxAlternatives=3;
  rec.lang='en-US';

  let recording=false;
  let baseText='';           // the message-input contents when recording started
  let finalText='';          // finalized transcript so far this session
  const input=$('message-input');

  function bestAlternative(result) {
    let best=result[0];
    for (let i=1; i<result.length; i++) {
      if ((result[i].confidence || 0) > (best.confidence || 0)) best=result[i];
    }
    return best.transcript;
  }

  function joinClean(a, b) {
    if (!a) return b;
    if (!b) return a;
    const needsSpace = !/\s$/.test(a) && !/^\s/.test(b);
    return a + (needsSpace ? ' ' : '') + b;
  }

  btn.addEventListener('click', () => {
    if (recording) { rec.stop(); return; }
    baseText = input.value;
    finalText = '';
    try { rec.start(); } catch {}
    recording = true;
    btn.title = 'Recording… click to stop';
    input.classList.add('voice-recording');
  });

  rec.onresult = e => {
    let interim = '';
    for (let i=e.resultIndex; i<e.results.length; i++) {
      const res = e.results[i];
      const txt = bestAlternative(res);
      if (res.isFinal) finalText = joinClean(finalText, txt.trim());
      else interim += txt;
    }
    const combined = joinClean(joinClean(baseText, finalText), interim.trim());
    input.value = combined;
    input.dispatchEvent(new Event('input'));
  };

  rec.onend = () => {
    recording = false;
    btn.title = 'Voice to text';
    input.classList.remove('voice-recording');
    // Commit: drop any leftover interim, keep only finalized text.
    input.value = joinClean(baseText, finalText);
    input.dispatchEvent(new Event('input'));
  };

  rec.onerror = (e) => {
    recording = false;
    btn.title = 'Voice to text';
    input.classList.remove('voice-recording');
    const msg = e.error === 'not-allowed' ? 'Mic access denied' :
                e.error === 'no-speech' ? 'No speech detected' :
                e.error === 'network' ? 'Network error — voice unavailable' :
                'Voice input error';
    try { window.halosNotify?.({ title: 'Voice Input', body: msg, kind: 'warn' }); } catch {}
    btn.style.opacity = '0.5';
    setTimeout(() => { btn.style.opacity = ''; }, 2500);
  };
}

/* ══════════════════════════════
   HELP BUTTON
══════════════════════════════ */
(function initHelp() {
  // NOTE: topbar-help open is wired via initGlobalTopbarDelegation.
  const overlay = document.getElementById('help-overlay');
  const close = document.getElementById('help-close');
  if (!overlay) return;
  if (close) close.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) overlay.classList.add('hidden'); });
})();

/* ══════════════════════════════
   AZULBRIGHT INFO — live system telemetry
   Pointless rotating stats from the Azulbright system
══════════════════════════════ */
let azulbrightInterval = null;

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// pickUnique: like pick() but avoids repeating items within a history window.
// history is a Set maintained by the caller; maxHistory controls window size.
function pickUnique(arr, history, maxHistory = 100) {
  if (!arr.length) return null;
  const available = arr.filter(x => !history.has(typeof x === 'object' ? (x.text || x.subtitle || JSON.stringify(x)) : x));
  const pool = available.length ? available : arr;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const key = typeof chosen === 'object' ? (chosen.text || chosen.subtitle || JSON.stringify(chosen)) : chosen;
  history.add(key);
  if (history.size > maxHistory) history.delete(history.values().next().value);
  return chosen;
}

const _quoteHistory = new Set();
const _incidentHistory = new Set();
function fmtNum(n) { return n.toLocaleString('en-US'); }

// Color rarity weights for incident selection. Higher threat colors are
// drastically rarer. BLACK is roughly 1 in 5000 picks.
const AZ_INCIDENT_COLOR_WEIGHTS = {
  green:  10000,
  blue:    3000,
  yellow:  1200,
  orange:   350,
  red:       80,
  amber:     20,
  purple:     5,
  black:      3,
};
let _incidentByColor = null;
function pickIncidentWeighted() {
  if (!_incidentByColor) {
    _incidentByColor = {};
    for (const inc of AZ_INCIDENT_POOL) {
      (_incidentByColor[inc.color] = _incidentByColor[inc.color] || []).push(inc);
    }
  }
  const colors = Object.keys(AZ_INCIDENT_COLOR_WEIGHTS).filter(c => (_incidentByColor[c] || []).length);
  const total = colors.reduce((s, c) => s + AZ_INCIDENT_COLOR_WEIGHTS[c], 0);
  let r = Math.random() * total;
  let chosen = colors[0];
  for (const c of colors) { r -= AZ_INCIDENT_COLOR_WEIGHTS[c]; if (r <= 0) { chosen = c; break; } }
  return pickUnique(_incidentByColor[chosen], _incidentHistory, 100);
}

// Threat levels with severity, symbol, and color class. Weights are
// HEAVILY skewed toward GREEN — the Azulbright system is stable most of
// the time, and the higher you climb, the rarer the condition becomes.
// BLACK is effectively lottery-tier. Colors are applied via
// `az-threat-<color>` classes defined in style.css.
// Total weight ~25,000. BLACK ~1/5000 (combined 5/25000). Each rarer
// tier is roughly an order of magnitude less likely than the one above.
const AZ_THREAT_LEVELS = [
  { level:'GREEN',   color:'green',   subtitle:'Pyramid Shield Nominal',              weight: 5200 },
  { level:'GREEN',   color:'green',   subtitle:'All Divisions Nominal',               weight: 4800 },
  { level:'GREEN',   color:'green',   subtitle:'Cipher Sweep Clear',                  weight: 4200 },
  { level:'GREEN',   color:'green',   subtitle:'HALOS Self-Check Nominal',            weight: 3800 },
  { level:'BLUE',    color:'blue',    subtitle:'Routine Monitoring',                  weight: 1100 },
  { level:'BLUE',    color:'blue',    subtitle:'Cipher Sweep In Progress',            weight:  900 },
  { level:'YELLOW',  color:'yellow',  subtitle:'Atmospheric Advisory — Nova Terris',  weight:  450 },
  { level:'YELLOW',  color:'yellow',  subtitle:'Trade Lane Congestion — Sharled',     weight:  350 },
  { level:'ORANGE',  color:'orange',  subtitle:'Unscheduled Rift Activity',           weight:  120 },
  { level:'ORANGE',  color:'orange',  subtitle:'Shield Emitter Anomaly',              weight:   90 },
  { level:'ORANGE',  color:'orange',  subtitle:'Eralf Ralos Proximity',               weight:   75 },
  { level:'RED',     color:'red',     subtitle:'Hostile Contact — War Div. Alerted',  weight:   30 },
  { level:'RED',     color:'red',     subtitle:'Unidentified Fleet — Velmoria Sector', weight:  22 },
  { level:'AMBER',   color:'amber',   subtitle:'Rift Echo Detected',                   weight:   8 },
  { level:'AMBER',   color:'amber',   subtitle:'Polar Drift (B-792)',                  weight:   7 },
  { level:'PURPLE',  color:'purple',  subtitle:'Multiversal Echo — Riftline Review',  weight:   2 },
  { level:'PURPLE',  color:'purple',  subtitle:'B-792 Breach Whisper',                weight:   2 },
  { level:'PURPLE',  color:'purple',  subtitle:'Andromadean Codex Interference',       weight:  2 },
  { level:'BLACK',   color:'black',   subtitle:'Multiverse Changing Event — Full Scramble',  weight: 3 },
  { level:'BLACK',   color:'black',   subtitle:'Multiverse Changing Event — HALOS Override', weight: 2 },
];
function pickWeighted(arr) {
  const total = arr.reduce((n, x) => n + (x.weight || 1), 0);
  let r = Math.random() * total;
  for (const item of arr) { r -= (item.weight || 1); if (r <= 0) return item; }
  return arr[0];
}

/* Quote pool — Cosmos Crew lore proverbs and division mottos */
// Andromadean alphabet — 26 unique inline-SVG glyphs, one per English letter.
// Renders in currentColor. Used by the Translation Key card.
// Each glyph is a non-Latin alien sigil unique among the 26.
// Common style: 16x16 viewBox, 1.4 stroke, currentColor.
const AZ_GLYPH_STYLE = 'viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
// Richer Andromadean alphabet — each sigil now uses 3-4 strokes (curves +
// dots + asymmetric ticks) so they read as actual alien writing instead of
// simple geometric primitives.
const AZ_ANDROMADEAN_ALPHABET = [
  { en: 'A', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M2 13 Q4 4 8 4 Q12 4 14 13"/><line x1="5.5" y1="9" x2="10.5" y2="9"/><circle cx="8" cy="4" r="1.2" fill="currentColor" stroke="none"/></svg>` },
  { en: 'B', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M4 2 L4 14"/><path d="M4 3 Q11 4 11 7 Q11 9 4 8"/><path d="M4 8 Q12 9 12 12 Q12 14 4 14"/><circle cx="4" cy="2" r="1.1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'C', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M13 4 Q3 4 3 8 Q3 12 13 12"/><path d="M9 8 L13 8"/><circle cx="13" cy="4" r="1.1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'D', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 2 L3 14"/><path d="M3 3 Q13 4 13 8 Q13 12 3 13"/><line x1="3" y1="8" x2="8" y2="8"/></svg>` },
  { en: 'E', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M13 3 Q3 3 3 6 Q3 9 13 9 Q3 9 3 12 Q3 15 13 14"/></svg>` },
  { en: 'F', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 2 L3 14"/><path d="M3 3 Q12 3 12 6"/><path d="M3 8 Q9 8 9 10"/><circle cx="12" cy="6" r="1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'G', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M13 4 Q3 4 3 8 Q3 13 8 13 Q13 13 13 9 L9 9 L11 11"/></svg>` },
  { en: 'H', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 2 Q3 14 5 14 Q7 14 7 8 Q9 8 9 14 Q11 14 13 14 Q13 2 13 2"/></svg>` },
  { en: 'I', svg: `<svg ${AZ_GLYPH_STYLE}><circle cx="8" cy="3" r="1.2" fill="currentColor" stroke="none"/><path d="M8 5 Q4 8 8 11 Q12 14 8 14"/></svg>` },
  { en: 'J', svg: `<svg ${AZ_GLYPH_STYLE}><circle cx="11" cy="3" r="1.1" fill="currentColor" stroke="none"/><path d="M11 4 L11 11 Q11 14 7 14 Q3 14 3 11"/></svg>` },
  { en: 'K', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 2 L3 14"/><path d="M3 8 Q9 8 13 3"/><path d="M3 8 Q9 8 13 13"/><circle cx="9" cy="8" r="1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'L', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 2 Q3 14 13 14"/><path d="M6 8 Q9 8 9 11"/><circle cx="13" cy="14" r="1.1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'M', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 14 Q3 4 5 4 Q7 4 8 9 Q9 4 11 4 Q13 4 13 14"/><line x1="8" y1="9" x2="8" y2="14"/></svg>` },
  { en: 'N', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 14 L3 4 L13 14 L13 4"/><circle cx="3" cy="4" r="1.1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'O', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 8 Q3 3 8 3 Q13 3 13 8 Q13 13 8 13 Q3 13 3 8 Z"/><path d="M5 8 Q5 5 8 5 Q11 5 11 8"/></svg>` },
  { en: 'P', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 14 L3 2"/><path d="M3 2 Q13 2 13 6 Q13 9 3 9"/><line x1="3" y1="14" x2="6" y2="11"/></svg>` },
  { en: 'Q', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 8 Q3 3 8 3 Q13 3 13 8 Q13 13 8 13 Q3 13 3 8"/><path d="M9 11 L14 14"/><circle cx="14" cy="14" r="1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'R', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 14 L3 2 Q11 2 11 5 Q11 8 3 8"/><path d="M3 8 L13 14"/></svg>` },
  { en: 'S', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M13 3 Q3 3 3 6 Q3 8 8 8 Q13 8 13 11 Q13 14 3 13"/><circle cx="13" cy="3" r="1" fill="currentColor" stroke="none"/></svg>` },
  { en: 'T', svg: `<svg ${AZ_GLYPH_STYLE}><line x1="2" y1="3" x2="14" y2="3"/><line x1="8" y1="3" x2="8" y2="14"/><path d="M5 14 Q8 11 11 14"/></svg>` },
  { en: 'U', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 2 Q3 14 8 14 Q13 14 13 2"/><line x1="8" y1="14" x2="8" y2="9"/><circle cx="8" cy="9" r="1.2" fill="currentColor" stroke="none"/></svg>` },
  { en: 'V', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M2 3 L8 14 L14 3"/><path d="M5 7 L11 7"/></svg>` },
  { en: 'W', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M2 3 L5 14 L8 6 L11 14 L14 3"/></svg>` },
  { en: 'X', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 3 Q8 8 13 13"/><path d="M13 3 Q8 8 3 13"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/></svg>` },
  { en: 'Y', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 3 Q8 8 8 14"/><path d="M13 3 Q8 8 8 14"/><line x1="5" y1="6" x2="11" y2="6"/></svg>` },
  { en: 'Z', svg: `<svg ${AZ_GLYPH_STYLE}><path d="M3 3 Q14 3 3 14 Q14 14 14 14"/><circle cx="3" cy="3" r="1" fill="currentColor" stroke="none"/></svg>` },
];

const AZ_QUOTE_POOL = [
  '"No Roetem uses 100%. That is the Pact." — Astralex Codex',
  '"Sharled sells everything. Even what you didn\'t bring." — Trader proverb',
  '"What the hell is Heart of the Void?! And why does everybody keep saying it?!" - Agent Roetem',
  '"HALOS hears the swarm before the swarm knows it\'s a swarm." — Cipher Division note',
  '"Desolarato is hot. The miners are hotter." — S.A.T.U.R.N. Labs slogan',
  '"Velmoria does not sleep. Velmoria waits." — War Division',
  '"Every diamond was once a dead star. Just be glad it didn\'t go supernova." — DMD trader, Sharled',
  '"Andromadeans built the foundation. We just keep the lights on." — Genesis Division',
  '"Cosmos Crew goes first. Cosmos Crew comes back." — Astralex creed',
  '"Two suns. Four planets. One Pact." — S.P.A.C.E. founding charter',
  '"A loud cosmos is a healthy cosmos." — Chronicle anchor desk',
  '"Numbers lie. Telemetry doesn\'t." — HALOS Operations',
  '"You don\'t haggle with Sharled. You bleed slower than the next guy." — Trader proverb',
  '"If the river is calm, something is about to explode." — NTPD River Patrol',
  '"A meteor that uses 100% is no longer a Roetem." — S-rank training brief',
  '"You can\'t outrun a Cybercopter. You can only land first." — NTPD pursuit doctrine',
  '"Sharled is loud because Sharled has nothing to hide. Probably." — Cipher Division',
  '"In space, the only certainty is the bill." — Pioneer Freight tagline',
  '"The Pact is not the law. The Pact is the floor." — S.P.A.C.E. legal review',
  '"If the Star Chaser shows up, the situation is already worse than you thought." — Astralex maxim',
  '"There are no quiet shifts on the Sharled trading floor." — SHLX trader, retired',
  '"A briefing without Etyb is not a briefing." — Astralex meeting standard',
  '"Msirp is everywhere. Msirp is also right behind you." — Cosmos Crew rumor',
  '"Eralf Ralos is not loud. The galley is loud when Eralf Ralos is in it." — Star Chaser log',
  '"Yruf is the loudest agent who never raises their voice." — Astralex remark',
  '"Aluben reads minds. The minds wish she\'d stop." — Cosmos Crew gripe',
  '"Omsoc always knows where Omsoc is. We do not." — Astralex log',
  '"All four planets, three rules: Pyramid, Pact, Patience." — Astralex creed',
  '"Sharled\'s second moon owes everyone water." — Trader joke',
  '"There are stars, and there are Stars. Mind which is which." — Astralex briefing',
  '"The Multiversal Hub does not get smaller. It only gets stranger." — MDLX log',
  '"You don\'t win in Sharled. The trader does." — Trader proverb',
  '"A clean rift is a watched rift." — Riftline operations',
  '"You bring your own oxygen to a Velmoria meeting." — War Division humor',
  '"The Pact is the line we draw between Meteors and what they could become." — Astralex sermon',
  '"Don\'t talk to a rift. Don\'t answer either." — Riftline first principle',
  '"S.A.T.U.R.N. doesn\'t test products. S.A.T.U.R.N. tests survivors." — SATN slogan',
  '"You\'ll never see Tsudrats hurry. You\'ll see Tsudrats already there." — Astralex log',
  '"The Sharled clock runs faster on auction day." — SHLX trader joke',
  '"There are 412,000 ways to die in Velmoria. We\'ve cataloged all of them." — War Division archivist',
  '"The Pyramid\'s shadow has its own zip code at this point." — Antrosa city planner',
  '"On the Star Chaser, lateness is treason." — Crew log, Tsudrats',
  '"Every miner returns. Some of them by mail." — DSLM compliance memo',
  '"Hyperball is faster than the law and slower than HALOS." — Hyperball League ad',
  '"Don\'t ask Cipher what they do. Ask whether you\'re allowed to." — S.P.A.C.E. handbook',
  '"The trade is the truth. Everything else is rumor." — Sharled saying',
  '"You don\'t interview Roetem. He\'ll interview you." — Astralex anecdote',
  '"Genesis catalogs life. Cipher catalogs the rest." — S.P.A.C.E. allocation note',
  '"Solaris burns first so Horizon doesn\'t have to." — Energy sector brief',
  '"You measure the cosmos in light-years. The cosmos measures you in seconds." — Astralex maxim warning',
  '"Hot stars cool slow. Hot stocks cool fast." — Sharled trader proverb',
  '"DMD prices are a mood. The mood is up today." — SHLX desk note',
  '"You can rent a Cybertank. You cannot rent the operator." — VLMD policy',
  '"Solar mining is patient work for impatient people." — SLRS recruiter',
  '"Andromadean ruins are not ruins until we say so." — Heritage Council',
  '"You don\'t hide from HALOS, you wait for HALOS to lose interest." — Cipher cadet joke',
  '"The Pact is what we choose, every minute, instead of being a god." — Agent Roetem',
  '"Don\'t look directly at the Heart of the Void. Just don\'t." — HTRL graffiti',
  '"The cleanest reading is the most suspicious one." — HALOS audit guideline',
  '"The Tree is the only place where every floor is the ground floor." — Space Tree tour script',
  '"The smallest miner can move a moon, given the right contract." — DSLM trade school motto',
  '"Velmoria sleeps with one eye open. The other is on you." — War Division warning',
  '"Sharled\'s currency is patience. Spend wisely." — Trader proverb',
  '"Cybertanks have one speed: closer." — Velmoria field maxim',
  '"Genesis catalogs life. Life catalogs Genesis right back." — Genesis Division joke',
  '"Eralf Ralos answers questions in capital letters." — Cosmos Crew log',
  '"The Star Chaser has one rule: be on it when it leaves." — Tsudrats',
  '"Hyperball is faster than law, slower than light, and exactly the speed of money." — HYPL',
  '"Multiversal Hub gates aren\'t doors. Doors close." — Hub orientation',
  '"In space, gravity is optional. The bill is not." — Pilot proverb',
  '"Solar mining: hot work, cold pay." — DSLM cadet rhyme',
  '"Etyb cataloged your day. Etyb was unimpressed." — Cosmos Crew gripe',
  '"There are 16,000 charted rifts. 16,001 charted us back." — Riftline ledger',
  '"Yruf wins arguments by entering rooms." — Cosmos Crew remark',
  '"Cipher\'s last mistake was a typo. The typo is classified." — Operations rumor',
  '"There is no spare planet. There is only this one." — Astralex creed',
  '"Genesis names every species. Twice. The second name is private." — Genesis Division saying',
  '"You can outwait a rift. You cannot outwait Riftline doctrine." — Riftline cadet',
  '"The Pact endures because we choose, not because we must." — Astralex chaplain',
  '"Quantum Sciences proves nothing twice the same way." — QNTM lab note',
  '"Aluben does not lose at chess. Aluben does not play chess." — Cosmos Crew log',
  '"Omsoc\'s map updates faster than the cosmos." — Astralex anecdote',
];

/* Static incident pool — covers all 8 threat colors. Supplemented at
   runtime by the procedural generator below. */
const AZ_INCIDENT_POOL = [
  // GREEN — routine operations/events (most common)
  { color:'green', text:'Cybertank convoy departed Antrosa for Velmoria. Escort: Defense ship fleet' },
  { color:'green', text:'Cyberbike race shut down on Koron LN, Nova Terris (NTPD on scene)' },
  { color:'green', text:'Hyperball quarter-final delayed, Roetem angered.' },
  { color:'green', text:'Solar mining facility on Azulbright reports record extraction shift' },
  { color:'green', text:'Andromadean cultural festival begins on Antrosa\'s south bank' },
  { color:'green', text:'Genesis Division reports new microbe found in Desolarato ice moon core' },
  { color:'green', text:'HALOS reported a 0.0000000007% accuracy improvement after self-recalibration' },
  { color:'green', text:'Cybercopter no. 44 declared all-clear over Antrosa northern sector after storm' },
  { color:'green', text:'Recruitment Division opened 12 new cadet slots at S.A.T.U.R.N. Labs' },
  { color:'green', text:'Etyb resolved the forty-seven open maintenance tickets. And one more no one knew was an open maintenance ticket.' },
  { color:'green', text:'Msirp spotted in the galley as a coffee mug. Eralf Ralos displeased.' },
  { color:'green', text:'Cosmos Crew shift handoff completed: Tsudrats to Aluben, Roetem still on break' },
  { color:'green', text:'Space Tree elevator capacity at 92%, barely within service limits' },
  { color:'green', text:'Velmoria garrison rotation completed without incident' },
  { color:'green', text:'Cyber Pyramid shield array passed weekly handshake' },
  { color:'green', text:'NTPD river patrol ended shift with zero detentions' },
  { color:'green', text:'Riftline logged 14 successful jump-courier returns' },
  { color:'green', text:'S.A.T.U.R.N. Labs concluded experiment 4-A — results filed to Chronicle Division' },
  { color:'green', text:'Genesis Division identified new fungal lineage in Antrosa river silt, Chronicle Division notified' },
  { color:'green', text:'Astralex Codex public reading scheduled at the Multiversal Hub on day 7 of the new terminal\'s opening' },
  { color:'green', text:'Pioneer Freight cleared the Sharled–Antrosa lane for Q3 surge' },
  { color:'green', text:'Cybercopter no. 22 returned to base' },
  { color:'green', text:'Hyperball training camp opened on Velmoria: 900000 opening day prospects' },
  { color:'green', text:'Solaris Power Co. cycled the inner photosphere station' },
  { color:'green', text:'Sharled Hotel & Resort reports record monthly occupancy' },
  { color:'green', text:'Watermoon Reserves logged a record-clean delivery to Antrosa' },
  { color:'green', text:'Galactic Survey published charts for sector RX-491, Yruf calling them "Complete BS"' },
  { color:'green', text:'Quantum Sciences finalized a long-distance entanglement test' },
  { color:'green', text:'Astralex Cadet Academy class 5024 began orientation' },
  { color:'green', text:'NTPD Sea Patrol ended seawall drill, no live fauna present' },
  { color:'green', text:'NT5 anchors opened the morning broadcast on time' },
  { color:'green', text:'Omsoc successfully tracked an off-grid courier, recovered 14h late' },
  { color:'green', text:'Yruf and Avonorepus ran joint sparring in Velmoria, Velmoria refused to comment' },
  { color:'green', text:'DSLR completed the eighth heavy-lift launch of the cycle' },
  { color:'green', text:'Sharled Exchange Trust closed the auction floor at standard hour' },
  { color:'green', text:'Cybertech Motors began a routine recall of the Cyberbike R-13 brake assembly' },
  { color:'green', text:'Hyperball Properties opened the championship arena for public tour' },
  { color:'green', text:'Genesis Bio-Research published a benign-microbe whitepaper' },
  { color:'green', text:'Field Division relocated three malfunctioning relay drones, no data lost' },
  { color:'green', text:'Riftline Transport closed the books on a clean Q2' },
  { color:'green', text:'Astralex archivists finished the public-domain section of the Codex' },
  { color:'green', text:'Pyramid maintenance team replaced emitter 42 ahead of schedule' },
  { color:'green', text:'NTPD River Patrol returned six lost cargo skiffs to their owners' },
  { color:'green', text:'Cybersquad reserves graduated 1,108 cadets from the Velmoria range' },
  { color:'green', text:'Tsudrats signed off on a clean Star Chaser bridge audit' },
  { color:'green', text:'Cybercopter no. 5 finished standard-pattern night drills' },
  { color:'green', text:'Eralf Ralos reorganized the galley. Crew nominally pleased.' },
  { color:'green', text:'Sharled Hotel rooftop bar reopened after renovation' },
  { color:'green', text:'Multiversal Hub gate 14 completed a planned alignment cycle to over 100000 new dimensions as a part of Riftline\'s expansion' },
  { color:'green', text:'Antrosa Terraforming logged a clean greenfield report on sector 9.82 South' },
  { color:'green', text:'Genesis Bio-Research catalogued five new airborne pollen variants' },
  { color:'green', text:'Astralex Aerospace finalized the next batch of jump-drive cores, no shipments yet' },
  { color:'green', text:'Pioneer Freight took on a fresh Pioneer-class hauler, pre-fitted' },
  { color:'green', text:'Solaris Power Co. published a stable-output report for the cycle' },
  { color:'green', text:'Horizon Energy distributed credits to swarm-tap shareholders' },
  // BLUE — scheduled/planned
  { color:'blue', text:'Sharled DMD market closed early, auction value spike' },
  { color:'blue', text:'Space Tree elevator car 7 rerouted for routine inspection' },
  { color:'blue', text:'Tesseract Vault sub-floor 4 sealed for scheduled audit, transport from Antrosa temporarily blocked' },
  { color:'blue', text:'Cybersquad live-fire drill concluded on Velmoria training range' },
  { color:'blue', text:'Field Division retrieved lost relay drone from Belt edge' },
  { color:'blue', text:'Multiversal Hub floor 3 access restricted (routine)' },
  { color:'blue', text:'Star Chaser logged an unscheduled DMD collection run, Tsudrats signed off, sending Roetem into an annoyed rant' },
  { color:'blue', text:'Cipher Division rotated the encryption keys ahead of cycle' },
  { color:'blue', text:'NTPD ran a Cyberbike compliance sweep through Nova Terris AVE and Blankon ST' },
  { color:'blue', text:'Riftline Transport opened a temporary pass through Class-II rift R-14 to assess an issue' },
  { color:'blue', text:'Sharled Trust audited 14 mid-cap quarterly statements, all cleared' },
  { color:'blue', text:'Astralex Cadet Academy held quarterly examination block' },
  { color:'blue', text:'Watermoon Reserves throttled output for moon-side maintenance' },
  { color:'blue', text:'Space Tree elevator car 14 paused mid-shaft for safety reset' },
  { color:'blue', text:'NTPD logged elevated noise complaints near the Hyperball stadium' },
  { color:'blue', text:'Cyber Pyramid Holdings filed a routine SEC-equivalent disclosure' },
  { color:'blue', text:'Pioneer Freight rerouted around Sharled-3 traffic congestion' },
  { color:'blue', text:'Antrosa Terraforming cycled a sector pump for scheduled service' },
  { color:'blue', text:'Riftline Transport refreshed weather telemetry for the Q-passage' },
  { color:'blue', text:'Heritage Council closed Andromadean ruin 14 for documentation' },
  { color:'blue', text:'Genesis Bio-Research locked down lab 7 for cross-contamination test' },
  { color:'blue', text:'Cybertech Motors paused Cybertank line 3 for tooling rotation' },
  { color:'blue', text:'NTPD Sea Patrol moved the seawall watch indoor due to weather' },
  { color:'blue', text:'S.A.T.U.R.N. Labs sealed wing 4 for a scheduled biohazard drill' },
  { color:'blue', text:'Hyperball League pushed the next match by 14 minutes for ad rotation' },
  { color:'blue', text:'Multiversal Hub paused gate 9 for an alignment review' },
  { color:'blue', text:'Cipher Division ran a targeted comms blackout drill, all-clear' },
  { color:'blue', text:'Galactic Survey scrubbed a low-priority deep-space pass' },
  { color:'blue', text:'Field Division replaced the antenna array on relay 4-Beta' },
  { color:'blue', text:'NTPD drone wing closed exercise over the river district' },
  { color:'blue', text:'Quantum Sciences ran a 14-minute entanglement sync with the Multiversal Hub' },
  // YELLOW — caution
  { color:'yellow', text:'Atmospheric advisory: dust storm rolling onto Nova Terris west' },
  { color:'yellow', text:'Trade lane congestion advisory issued for Sharled–Antrosa corridor' },
  { color:'yellow', text:'NTPD weather advisory for Antrosa north river sector 5.78, minor flooding' },
  { color:'yellow', text:'Sharled exchange volatility tag on three small-caps' },
  { color:'yellow', text:'S.P.A.C.E. issued a courier-lane advisory for the Hub-2 corridor' },
  { color:'yellow', text:'Solar advisory: low-grade flare expected in 6h' },
  { color:'yellow', text:'Riftline issued a passage advisory for Class-II rift R-9' },
  { color:'yellow', text:'NTPD advised reduced river speed for tonight\'s race traffic' },
  { color:'yellow', text:'Genesis Bio-Research issued a minor pollen advisory for Antrosa' },
  { color:'yellow', text:'Cyber Pyramid posted a maintenance advisory for Q-shield section 5' },
  { color:'yellow', text:'Hyperball League issued a stadium-access advisory for tonight\'s match' },
  { color:'yellow', text:'Galactic Survey flagged sector RX-714 for follow-up imaging' },
  { color:'yellow', text:'NTPD advisory: sea-creature drill scheduled, civilian craft to clear seawall' },
  // AMBER — under review/possible anomaly
  { color:'amber', text:'Rift tremor logged near B-792 boundary, Riftline Division dispatched' },
  { color:'amber', text:'Cyber Pyramid shield emitter 12 cycled, no service interruption' },
  { color:'amber', text:'Sea creature breach drill scheduled for Nova Terris seawall' },
  { color:'amber', text:'Unidentified signature near Sharled outer ring, Cipher Division investigating' },
  { color:'amber', text:'Aluben flagged an inbound courier for truth-check. Hold until cleared.' },
  { color:'amber', text:'NTPD pursued a high-speed Cyberspeeder on the eastern shore' },
  { color:'amber', text:'Riftline pilot reported a brief navigation desync near the Q-passage' },
  { color:'amber', text:'Sharled Exchange Trust flagged unusual DMD volume on DMDX' },
  { color:'amber', text:'Cybertech Motors recalled a batch of Cyberbike battery cells for review' },
  { color:'amber', text:'Genesis Bio-Research isolated a subject after a minor exposure' },
  { color:'amber', text:'NTPD Sea Patrol detected an unusual sonar return near the seawall' },
  { color:'amber', text:'Multiversal Hub gate 11 reported a minor alignment drift' },
  { color:'amber', text:'Pioneer Freight craft 14-A went silent for 8 min, recovered' },
  { color:'amber', text:'Cipher Division tagged an inbound packet for further review' },
  { color:'amber', text:'Antrosa Terraforming recorded sector 7 ground tremor, under review' },
  { color:'amber', text:'Velmoria garrison reported a brief radar ghost, investigating' },
  { color:'amber', text:'Heritage Council closed Andromadean ruin 4 after unauthorized access' },
  { color:'amber', text:'Quantum Sciences detected a minor entanglement decoherence event' },
  // ORANGE — escalating issues
  { color:'orange', text:'Shield emitter 7 auto-recycled after micro-breach, back online in 41s' },
  { color:'orange', text:'B-792 polar drift crossed advisory threshold, Riftline on temporary scramble' },
  { color:'orange', text:'Cyber Pyramid sector 4 took an unexpected load spike, emergency rotation' },
  { color:'orange', text:'NTPD pursuit closed the riverside expressway, heavy units en route' },
  { color:'orange', text:'Velmoria garrison brought 1st battalion to ready status, drill or otherwise' },
  { color:'orange', text:'Multiversal Hub gate 4 went offline for emergency realignment' },
  { color:'orange', text:'Riftline Transport recalled a Class-II convoy mid-passage' },
  { color:'orange', text:'Genesis Bio-Research locked down lab 9 after a containment alarm' },
  { color:'orange', text:'Sharled DMD auction triggered a circuit-breaker on extreme volume' },
  { color:'orange', text:'NTPD Sea Patrol confirmed a real seawall contact, drill upgraded' },
  { color:'orange', text:'Pyramid maintenance reported emitter 19 down, backup engaged' },
  { color:'orange', text:'Cipher Division placed two shipping firms under temporary interdict' },
  { color:'orange', text:'War Division flagged a sector for hot-monitoring' },
  // RED — hostile/critical
  { color:'red', text:'Andromadean separatist cell broke cover near Desolarato, War Div. inbound' },
  { color:'red', text:'Cybertank column engaged unidentified raiders, Velmoria pass, ongoing' },
  { color:'red', text:'NTPD Sea Patrol confirmed a sea-creature breach, barriers closing' },
  { color:'red', text:'Riftline Transport reported lost contact with convoy R-14' },
  { color:'red', text:'Cyber Pyramid registered a sustained shield assault, auto-counter engaged' },
  { color:'red', text:'Sharled exchange triggered a system-wide trading halt' },
  { color:'red', text:'Velmoria garrison engaged hostile spacecraft over outer perimeter' },
  { color:'red', text:'NTPD pursuit ended in a contained explosion, units accounted for' },
  { color:'red', text:'Cybercopter no. 22 reported anti-air contact over Antrosa east' },
  { color:'red', text:'War Division dispatched a Cybertank platoon to a Velmoria outpost, under fire' },
  { color:'red', text:'Multiversal Hub gate 7 entered emergency shutdown, security cordon active' },
  { color:'red', text:'Genesis Bio-Research declared a level-3 biohazard event in lab 9' },
  // PURPLE — multiversal/anomalous/serious threat
  { color:'purple', text:'Andromadean Codex page 414 began transcribing itself, Cipher under review' },
  { color:'purple', text:'Riftline pilot reported a duplicate of themselves on approach, recovered' },
  { color:'purple', text:'Multiversal Hub gate 2 admitted a passenger with no ledger entry' },
  { color:'purple', text:'Quantum Sciences detected a paired entanglement to an unknown remote' },
  { color:'purple', text:'Cipher Division quarantined a transmission that arrived before being sent' },
  // BLACK — multiversal threat
  { color:'black', text:'Multiversal threat declared, Astralex Division on full scramble, dimension on lockdown' },
  { color:'black', text:'Rift collapse warning issued, HALOS executing emergency override' },
];

/* Procedural incident generator — combines templates with variables to
   produce effectively unlimited unique entries. Used in addition to
   AZ_INCIDENT_POOL so the feed can run for hours without repetition. */
const AZ_PROC_TEMPLATES = [
  { color:'green',  symbol:'▲', tpl:'%DIV% reported a clean shift handover at %LOC%' },
  { color:'green',  symbol:'▲', tpl:'%CREW% logged a successful return from %LOC%' },
  { color:'green',  symbol:'▲', tpl:'%LOC% reported all systems nominal at the %TIME% review' },
  { color:'green',  symbol:'▲', tpl:'%COMPANY% closed the trading day above its 30-day moving average' },
  { color:'green',  symbol:'▲', tpl:'%DIV% completed scheduled maintenance on relay %ID%' },
  { color:'green',  symbol:'▲', tpl:'%CREW% authorized a routine departure from %LOC%' },
  { color:'green',  symbol:'▲', tpl:'%LOC% telemetry passed the %TIME% audit with no flags' },
  { color:'blue',   symbol:'◆', tpl:'%DIV% scheduled a maintenance window at %LOC% for %TIME%' },
  { color:'blue',   symbol:'◆', tpl:'%COMPANY% disclosed routine procurement under standard procedure' },
  { color:'blue',   symbol:'◆', tpl:'%CREW% acknowledged a system-wide telemetry refresh' },
  { color:'blue',   symbol:'◆', tpl:'%LOC% closed for a planned diagnostic between %TIME%' },
  { color:'blue',   symbol:'◆', tpl:'%DIV% rotated personnel into %LOC% for the next cycle' },
  { color:'yellow', symbol:'◉', tpl:'%DIV% issued a minor advisory for %LOC% — non-critical' },
  { color:'yellow', symbol:'◉', tpl:'%COMPANY% flagged for routine compliance review' },
  { color:'yellow', symbol:'◉', tpl:'%LOC% posted a low-grade weather advisory — public informed' },
  { color:'amber',  symbol:'●', tpl:'%DIV% logged an unexplained reading at %LOC% — under review' },
  { color:'amber',  symbol:'●', tpl:'%CREW% requested elevated scan permissions over %LOC%' },
  { color:'amber',  symbol:'●', tpl:'%COMPANY% disclosed an unscheduled internal audit' },
  { color:'amber',  symbol:'●', tpl:'%LOC% recorded a brief telemetry desync at %TIME%' },
  { color:'orange', symbol:'◈', tpl:'%DIV% escalated %LOC% to active monitoring after a sensor anomaly' },
  { color:'orange', symbol:'◈', tpl:'%CREW% pulled hardware from %LOC% for emergency analysis' },
  { color:'orange', symbol:'◈', tpl:'%COMPANY% triggered an internal trading freeze — cause undisclosed' },
  { color:'red',    symbol:'✕', tpl:'%DIV% reported a hostile contact at %LOC% — response launched' },
  { color:'red',    symbol:'✕', tpl:'%CREW% confirmed engagement at %LOC% — backup en route' },
  { color:'red',    symbol:'✕', tpl:'%LOC% sustained an unrecovered system loss — aid dispatched' },
  { color:'purple', symbol:'☍', tpl:'%DIV% logged a multiversal echo from %LOC% — Cipher reviewing' },
  { color:'purple', symbol:'☍', tpl:'%CREW% reported a sensor reading that contradicts itself' },
  { color:'purple', symbol:'☍', tpl:'%LOC% returned a reading from a moment that has not yet happened' },
  { color:'black',  symbol:'☢', tpl:'%DIV% declared a multiversal scramble at %LOC%' },
  { color:'black',  symbol:'☢', tpl:'%CREW% executed a HALOS override at %LOC%' },
];

const AZ_PROC_VARS = {
  DIV: ['Solaris', 'Genesis', 'Horizon', 'Chronicle', 'Pioneer', 'Supply',
        'Transit', 'Riftline', 'Recruitment', 'Cipher', 'War', 'Earthbound',
        'Research', 'Field', 'Astralex', 'NTPD', 'Cybersquad', 'Heritage Council'],
  LOC: ['Nova Terris', 'Antrosa\'s south bank', 'Sharled inner ring', 'Sharled outer ring',
        'Desolarato\'s scorched ridge', 'Desolarato ice moon', 'Velmoria perimeter',
        'Space Tree elevator 7', 'Space Tree elevator 14', 'Multiversal Hub floor 3',
        'Multiversal Hub gate 7', 'B-792 boundary', 'Riftline Q-passage', 'Cyber Pyramid sector 4',
        'Antrosa river district', 'Sharled\'s second moon', 'Andromadean ruin 14', 'the Dyson swarm tap',
        'the Hub diplomatic level', 'NTPD precinct 22', 'the photosphere station',
        'the seawall east', 'the Hyperball arena', 'the Astralex Cadet range'],
  CREW: ['Roetem', 'Tsudrats', 'Yruf', 'Aluben', 'Avonorepus', 'Eralf Ralos', 'Omsoc', 'Msirp', 'Etyb'],
  COMPANY: ['SATN', 'CYPR', 'NTRH', 'ASTX', 'DSLM', 'SHLX', 'VLMD', 'STOR', 'DMDX', 'HLOS',
            'CBTM', 'ANDM', 'RFLN', 'GNBR', 'HRZN', 'CPHR', 'SLRS', 'PNEER', 'CHRN', 'HYPL',
            'METR', 'NTPD', 'SPHR', 'VSTR', 'HTRL', 'CYWG', 'DSLR', 'ANTR', 'HPBL', 'BRKX',
            'RFTP', 'ACAD', 'GLXY', 'QNTM', 'MDLX', 'WTRM'],
  ID: ['4-A', '7-B', '12-D', '14-Beta', '22-Echo', '31-G', '44-K', '88-Mu', '101-Nine', '212-Theta'],
  TIME: ['0600', '0900', '1200', '1500', '1800', '2100', '2300', 'midnight', 'pre-dawn', 'mid-watch'],
};

let _procByColor = null;
function azGenProcIncident() {
  if (!_procByColor) {
    _procByColor = {};
    for (const t of AZ_PROC_TEMPLATES) {
      (_procByColor[t.color] = _procByColor[t.color] || []).push(t);
    }
  }
  // Same color-rarity bias as the static pool, so procedural BLACK is
  // also lottery-tier instead of every fifth tick.
  const colors = Object.keys(AZ_INCIDENT_COLOR_WEIGHTS).filter(c => (_procByColor[c] || []).length);
  const total = colors.reduce((s, c) => s + AZ_INCIDENT_COLOR_WEIGHTS[c], 0);
  let r = Math.random() * total;
  let chosen = colors[0];
  for (const c of colors) { r -= AZ_INCIDENT_COLOR_WEIGHTS[c]; if (r <= 0) { chosen = c; break; } }
  const t = pick(_procByColor[chosen]);
  const text = t.tpl.replace(/%([A-Z]+)%/g, (_, k) => pick(AZ_PROC_VARS[k] || ['—']));
  return { color: t.color, symbol: t.symbol, text };
}

// Persistent threat state — only rotates occasionally so the top-of-panel
// badge doesn't strobe every tick. Initialized to a random GREEN variant.
const AZ_STATE = {
  currentThreat: AZ_THREAT_LEVELS[0],
  popBaseline: 38_420_000_000,
  popLastRender: 0,
  shipsBaseline: 49_000,
};
// Seed an initial threat once the module loads.
AZ_STATE.currentThreat = pickWeighted(AZ_THREAT_LEVELS);
// Decide whether to rotate the threat level on a slow independent timer.
// Even when the timer fires, there's only a small chance we actually
// rotate — keeps GREEN sticky for minutes on end.
function maybeRotateAzThreat() {
  // 18% chance per slow tick of actually picking a new level; otherwise
  // stay on whatever we're on. This makes orange/red/purple/black visibly
  // rare even over long sessions.
  if (Math.random() < 0.18) {
    AZ_STATE.currentThreat = pickWeighted(AZ_THREAT_LEVELS);
  }
}
function generateAzulbrightStats() {
  // Threat is read from the persistent state, not re-rolled every tick.
  // That's what was making the top of the panel look like a strobe light
  // — GREEN → AMBER → GREEN → ORANGE inside a single breath.
  const threat = AZ_STATE.currentThreat;
  const courier = pick([
    'Star Chaser (Cosmos Crew flagship)',
    'S.P.A.C.E. Transit Division hauler',
    'Field Division courier',
    'Supply Division barge from Sharled',
    'Riftline Division jump-courier',
    'NTPD patrol cutter',
    'Cybercopter escort wing',
    'Solaris Division solar-skiff',
  ]);
  const dialect = pick([
    'Trade Standard', 'Old Andromadean', 'Nova Terris Common',
    'Sharled Market Cant', 'Astralex Field Code', 'Desolarato Miner Slang', 'High Cosmos',
  ]);
  // Prefer the user's selected division / handle so the panel is personalized.
  const userDivision = (typeof SESSION !== 'undefined' && SESSION.division) ? SESSION.division : null;
  const userName = (typeof SESSION !== 'undefined' && SESSION.firstName) ? SESSION.firstName : null;
  const division = userDivision || pick([
    'Solaris', 'Genesis', 'Horizon', 'Chronicle', 'Pioneer', 'Supply',
    'Transit', 'Riftline', 'Recruitment', 'Cipher', 'War', 'Earthbound',
    'Research', 'Field', 'Astralex',
  ]);
  const crewOnDuty = userName || pick([
    'Roetem', 'Tsudrats', 'Yruf', 'Aluben', 'Avonorepus',
    'Eralf Ralos', 'Omsoc', 'Msirp', 'Etyb',
  ]);
  const hyperballScore = `${randInt(0, 9)}–${randInt(0, 9)}`;
  const hyperballTeams = pick([
    'Nova Terris Comets vs Sharled Drifters',
    'Desolarato Miners vs Velmoria Vanguard',
    'Antrosa Pyramids vs Space Tree Orbiters',
    'Cybersquad Reserves vs Astralex All-Stars',
  ]);
  const quote = pickUnique(AZ_QUOTE_POOL, _quoteHistory, 60);
  // Build a rolling feed: 8 entries, newest first. Combines the static
  // incident pool with the procedural generator so we can run effectively
  // forever without repeats. Within a single feed snapshot, every entry
  // is guaranteed unique (no two identical entries at the same time).
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const feed = [];
  const seen = new Set();
  let attempts = 0;
  while (feed.length < 8 && attempts < 200) {
    attempts++;
    // 60% draw from static pool, 40% from procedural generator
    const hit = Math.random() < 0.85 ? pickIncidentWeighted() : azGenProcIncident();
    if (seen.has(hit.text)) continue;
    seen.add(hit.text);
    const i = feed.length;
    const when = new Date(now.getTime() - i * (60_000 + Math.floor(Math.random() * 240_000)));
    feed.push({
      ts: `${pad(when.getUTCHours())}:${pad(when.getUTCMinutes())}:${pad(when.getUTCSeconds())}`,
      color: hit.color,
      text: hit.text,
    });
  }
  const incident = feed[0].text; // keep the old scalar field for anywhere else that still reads it
  const incidentFeed = feed;

  // Random Andromadean cultural reading
  const harmonic = pick(['A♭ Resonant', 'C Tonic Drift', 'D Polar Echo', 'F♯ Stable', 'G Rift Hum']);

  return {
    // Header gauges
    sysTime: azulbrightNow() + ' AZT · CYC ' + azulbrightCycle(),
    // Stardate increments by exactly 1 every day at 12 PM Eastern (17:00 UTC).
    // Deterministic — every HALOS user sees the same stardate at the same moment.
    starDate: String(5230 + Math.floor((Date.now() - Date.UTC(2024, 0, 1, 17, 0, 0)) / 86400000)),
    // 4-planet civ, 1 gigacity + asteroid belts + moons. Baseline drifts
    // slowly (births/deaths/transits) and a small random jitter rides on
    // top so the counter visibly ticks without being noisy.
    population: fmtNum(AZ_STATE.popBaseline + randInt(-14_500, 18_900)),
    activeShips: fmtNum(randInt(48_120, 49_880)),
    threatLevel: threat.level + ' — ' + threat.subtitle, // kept for any legacy readers
    threat,
    incidentFeed,

    // Stellar — Azulbright (blue star)
    starOutput: rand(2.984, 3.017).toFixed(4) + ' SOL',
    dysonCoverage: rand(38.20, 38.61).toFixed(3) + '%',
    stellarEnginePush: rand(0.0009, 0.0014).toFixed(5) + ' km/s²',
    starMineYield: fmtNum(randInt(8_400, 9_950)) + ' kt/h',
    flareRisk: rand(0.10, 2.40).toFixed(2) + '%',

    // Desolarato (1st planet, S.A.T.U.R.N. Labs, Cybersquad training, mining)
    desolaratoTemp: randInt(412, 488) + '°C surface',
    desolaratoMiners: fmtNum(randInt(184_000, 197_000)),
    saturnLabsExp: randInt(38, 64) + ' active',
    cybersquadCadets: fmtNum(randInt(2_140, 2_360)),
    desolaratoIceMoon: rand(-198.4, -187.2).toFixed(2) + '°C',

    // Sharled (2nd, trader's market, 2 moons)
    sharledMarketIdx: (1000 + rand(-12, 12)).toFixed(2),
    dmdSpot: '◆ ' + fmtNum(randInt(48_900, 51_400)) + ' cr/ct',
    sharledStallsOpen: fmtNum(randInt(38_400, 41_900)),
    spaceHotelOcc: rand(91.2, 99.4).toFixed(1) + '%',
    waterMoonReserve: rand(82.1, 84.0).toFixed(2) + '%',

    // Antrosa (3rd, Nova Terris megacity, Cyber Pyramid HQ)
    novaTerrisPop: fmtNum(randInt(1_840_000_000, 1_840_009_999)),
    pyramidShield: rand(99.9991, 99.9999).toFixed(4) + '%',
    riverFlow: fmtNum(randInt(11_200, 11_900)) + ' m³/s',
    ntpdActive: fmtNum(randInt(48_120, 49_440)),
    dmdFactoryMoon: fmtNum(randInt(118_000, 134_000)) + ' ct/day',
    multiHubTraffic: randInt(140, 220) + ' transits/h',

    // Velmoria (4th, S.P.A.C.E. war base)
    velmoriaGarrison: fmtNum(randInt(412_000, 418_000)),
    cybertanksReady: randInt(840, 920),
    cybercoptersReady: randInt(310, 360),
    warDivAlert: pick(['DEFCON 5 — Standby', 'DEFCON 5 — Standby', 'DEFCON 5 — Standby', 'DEFCON 4 — Drill']),

    // Space Tree (between Desolarato and Sharled)
    treeElevators: randInt(38, 44) + ' / 44 active',
    treeResidents: fmtNum(randInt(412_000, 419_000)),
    treeOrbit: rand(0.9984, 1.0017).toFixed(4) + ' AU',

    // Traffic
    inboundShips: randInt(1_240, 1_640),
    outboundShips: randInt(1_180, 1_590),
    cargoTons: fmtNum(randInt(8_240_000, 9_980_000)),
    transitDelay: randInt(0, 11) + ' min',
    nextCourier: courier,
    nextCourierEta: randInt(2, 64) + ' min',

    // S.P.A.C.E. / HALOS
    halosUptime: (99.99 + rand(0.0001, 0.0099)).toFixed(5) + '%',
    haloProcesses: fmtNum(randInt(8_412_000, 8_458_000)),
    queuedRequests: randInt(3, 47),
    activeDivision: division,
    cosmosCrewOnDuty: crewOnDuty,
    openMissions: randInt(11, 38),
    riftlineMonitors: randInt(4, 14) + ' channels',
    b792Stability: rand(96.40, 99.10).toFixed(2) + '%',

    // Comms / cultural
    activeChannels: fmtNum(randInt(48_104, 48_988)),
    primaryDialect: dialect,
    hyperballScore,
    hyperballTeams,
    andromadeanHarmonic: harmonic,
    pactStatus: 'INTACT — All Meteors below 100%',

    // Vehicle market (book-canon prices)
    cybertankPrice: '$94.0M',
    cybercopterPrice: '$108.0M',
    cyberspeederPrice: '$21.5M',
    cyberbikePrice: '$16.3M',

    // Environmental / planetary
    azulbrightMagField: rand(0.84, 1.18).toFixed(3) + ' G',
    cosmicRayFlux: rand(1.2, 4.9).toFixed(2) + ' mSv/h',
    riftStabilityIdx: rand(94.0, 99.9).toFixed(2) + '%',
    darkMatterDensity: rand(0.238, 0.261).toFixed(4) + ' GeV/cm³',
    gravitationalDrift: rand(0.0001, 0.0012).toFixed(5) + ' m/s²',

    // S.P.A.C.E. network
    encryptionLoad: rand(87.4, 99.2).toFixed(1) + '%',
    cipherKeyRotation: randInt(8, 22) + ' min ago',
    riftlineLatency: randInt(12, 340) + ' ms',
    agentsOnline: fmtNum(randInt(14_200, 14_880)),
    activeMissions: randInt(11, 38),
    classBriefsToday: randInt(4, 28),

    // S.A.T.U.R.N. Labs
    saturnReactorOutput: rand(94.1, 99.9).toFixed(2) + '%',
    saturnContainment: rand(99.990, 99.999).toFixed(4) + '%',
    saturnNewDiscoveries: randInt(0, 4) + ' today',
    saturnProtocols: randInt(812, 940) + ' active',

    // Antrosa extra
    cyberPyramidPower: rand(98.0, 100.0).toFixed(3) + '%',
    ntpdIncidents: randInt(0, 7) + ' today',
    riverQualityIdx: rand(97.1, 99.8).toFixed(1) + '%',

    // Velmoria extra
    shieldGridCoverage: rand(99.0, 100.0).toFixed(2) + '%',
    warpReadyFleet: randInt(42, 84) + ' ships',
    interceptors: randInt(180, 240),

    incident,
    quote,
  };
}

function renderAzulbrightStats() {
  const body = $('azulbright-body');
  if (!body) return;
  const s = generateAzulbrightStats();

  body.innerHTML = `
    <div class="az-grid">
      <!-- HEADER GAUGES -->
      <div class="az-row az-row-header">
        <div class="az-gauge"><div class="az-gauge-label">Local Time</div><div class="az-gauge-val">${s.sysTime}</div></div>
        <div class="az-gauge"><div class="az-gauge-label">Stardate</div><div class="az-gauge-val">${s.starDate}</div></div>
        <div class="az-gauge az-gauge-population"><div class="az-gauge-label">System Pop.</div><div class="az-gauge-val">${s.population}</div></div>
        <div class="az-gauge"><div class="az-gauge-label">Active Ships</div><div class="az-gauge-val">${s.activeShips}</div></div>
        <div class="az-gauge az-gauge-threat az-threat-${s.threat.color}">
          <div class="az-gauge-label">Threat Level</div>
          <div class="az-gauge-val">${s.threat.level}</div>
          <div class="az-threat-sub">${escHtml(s.threat.subtitle)}</div>
        </div>
      </div>

      <!-- STELLAR -->
      <div class="az-card">
        <div class="az-card-title">AZULBRIGHT — Blue Star</div>
        <div class="az-card-rows">
          <div><span>Output</span><b>${s.starOutput}</b></div>
          <div><span>Dyson Swarm</span><b>${s.dysonCoverage}</b></div>
          <div><span>Stellar Engine Dv</span><b>${s.stellarEnginePush}</b></div>
          <div><span>Star Mine Yield</span><b>${s.starMineYield}</b></div>
          <div><span>Flare Risk</span><b>${s.flareRisk}</b></div>
        </div>
      </div>

      <!-- DESOLARATO -->
      <div class="az-card">
        <div class="az-card-title">DESOLARATO — Mining / S.A.T.U.R.N. Labs</div>
        <div class="az-card-rows">
          <div><span>Surface Temp</span><b>${s.desolaratoTemp}</b></div>
          <div><span>Active Miners</span><b>${s.desolaratoMiners}</b></div>
          <div><span>S.A.T.U.R.N. Experiments</span><b>${s.saturnLabsExp}</b></div>
          <div><span>Cybersquad Cadets</span><b>${s.cybersquadCadets}</b></div>
          <div class="az-row-wide"><span>Ice Moon Temp</span><b>${s.desolaratoIceMoon}</b></div>
        </div>
      </div>

      <!-- SPACE TREE -->
      <div class="az-card">
        <div class="az-card-title">SPACE TREE — Orbital Station</div>
        <div class="az-card-rows">
          <div><span>Elevators</span><b>${s.treeElevators}</b></div>
          <div><span>Residents</span><b>${s.treeResidents}</b></div>
          <div><span>Orbit Radius</span><b>${s.treeOrbit}</b></div>
        </div>
      </div>

      <!-- SHARLED -->
      <div class="az-card">
        <div class="az-card-title">SHARLED — Trader's Market</div>
        <div class="az-card-rows">
          <div><span>Market Index</span><b>${s.sharledMarketIdx}</b></div>
          <div><span>DMD Spot</span><b>${s.dmdSpot}</b></div>
          <div><span>Stalls Open</span><b>${s.sharledStallsOpen}</b></div>
          <div><span>Space Hotel Occ.</span><b>${s.spaceHotelOcc}</b></div>
          <div class="az-row-wide"><span>Water Moon Reserve</span><b>${s.waterMoonReserve}</b></div>
        </div>
      </div>

      <!-- ANTROSA / NOVA TERRIS -->
      <div class="az-card">
        <div class="az-card-title">ANTROSA — Nova Terris / Cyber Pyramid</div>
        <div class="az-card-rows">
          <div><span>Nova Terris Pop.</span><b>${s.novaTerrisPop}</b></div>
          <div><span>Pyramid Shield</span><b>${s.pyramidShield}</b></div>
          <div><span>River Flow</span><b>${s.riverFlow}</b></div>
          <div><span>NTPD On Duty</span><b>${s.ntpdActive}</b></div>
          <div><span>DMD Factory Moon</span><b>${s.dmdFactoryMoon}</b></div>
          <div><span>Multiversal Hub</span><b>${s.multiHubTraffic}</b></div>
        </div>
      </div>

      <!-- VELMORIA -->
      <div class="az-card">
        <div class="az-card-title">VELMORIA — S.P.A.C.E. War Base</div>
        <div class="az-card-rows">
          <div><span>Garrison</span><b>${s.velmoriaGarrison}</b></div>
          <div><span>Cybertanks Ready</span><b>${s.cybertanksReady}</b></div>
          <div><span>Cybercopters Ready</span><b>${s.cybercoptersReady}</b></div>
          <div class="az-row-wide"><span>War Div. Alert</span><b>${s.warDivAlert}</b></div>
        </div>
      </div>

      <!-- TRAFFIC -->
      <div class="az-card">
        <div class="az-card-title">ORBITAL TRAFFIC</div>
        <div class="az-card-rows">
          <div><span>Inbound</span><b>${s.inboundShips}</b></div>
          <div><span>Outbound</span><b>${s.outboundShips}</b></div>
          <div><span>Cargo Today</span><b>${s.cargoTons} tons</b></div>
          <div><span>Transit Delay</span><b>${s.transitDelay}</b></div>
          <div class="az-row-wide"><span>Next Courier</span><b>${s.nextCourier}</b></div>
          <div><span>ETA</span><b>${s.nextCourierEta}</b></div>
        </div>
      </div>

      <!-- HALOS / S.P.A.C.E. -->
      <div class="az-card">
        <div class="az-card-title">S.P.A.C.E. / HALOS</div>
        <div class="az-card-rows">
          <div><span>HALOS Uptime</span><b>${s.halosUptime}</b></div>
          <div><span>Processes</span><b>${s.haloProcesses}</b></div>
          <div><span>Queued Reqs</span><b>${s.queuedRequests}</b></div>
          <div><span>Active Division</span><b>${s.activeDivision}</b></div>
          <div><span>Agent On Duty</span><b>${s.cosmosCrewOnDuty}</b></div>
          <div><span>Open Missions</span><b>${s.openMissions}</b></div>
          <div><span>Riftline Monitors</span><b>${s.riftlineMonitors}</b></div>
          <div><span>B-792 Stability</span><b>${s.b792Stability}</b></div>
        </div>
      </div>

      <!-- COMMS / CULTURE -->
      <div class="az-card">
        <div class="az-card-title">COMMS &amp; CULTURE</div>
        <div class="az-card-rows">
          <div><span>Active Channels</span><b>${s.activeChannels}</b></div>
          <div><span>Primary Dialect</span><b>${s.primaryDialect}</b></div>
          <div class="az-row-wide"><span>Hyperball</span><b>${escHtml(s.hyperballTeams)} — ${s.hyperballScore}</b></div>
          <div><span>Andromadean Harmonic</span><b>${s.andromadeanHarmonic}</b></div>
          <div class="az-row-wide"><span>The Pact</span><b>${s.pactStatus}</b></div>
        </div>
      </div>

      <!-- ANDROMADEAN TRANSLATION KEY (placeholder — re-emitted below the quote) -->
      <div class="az-card az-card-wide az-card-lex" data-az-lex-hidden style="display:none">
        <div class="az-card-title">ANDROMADEAN TRANSLATION KEY</div>
        <div class="az-lex-grid" id="az-lex-grid">
          ${AZ_ANDROMADEAN_ALPHABET.map(g => `
            <div class="az-lex-cell">
              <div class="az-lex-glyph">${g.svg}</div>
              <div class="az-lex-en">${escHtml(g.en)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- VEHICLE MARKET -->
      <div class="az-card">
        <div class="az-card-title">CYBER VEHICLE MARKET</div>
        <div class="az-card-rows">
          <div><span>Cybertank</span><b>${s.cybertankPrice}</b></div>
          <div><span>Cybercopter</span><b>${s.cybercopterPrice}</b></div>
          <div><span>Cyberspeeder</span><b>${s.cyberspeederPrice}</b></div>
          <div><span>Cyberbike</span><b>${s.cyberbikePrice}</b></div>
        </div>
      </div>

      <!-- ENVIRONMENTAL -->
      <div class="az-card">
        <div class="az-card-title">SPACE ENVIRONMENT</div>
        <div class="az-card-rows">
          <div><span>Azulbright Mag Field</span><b>${s.azulbrightMagField}</b></div>
          <div><span>Cosmic Ray Flux</span><b>${s.cosmicRayFlux}</b></div>
          <div><span>Rift Stability Index</span><b>${s.riftStabilityIdx}</b></div>
          <div><span>Dark Matter Density</span><b>${s.darkMatterDensity}</b></div>
          <div><span>Gravitational Drift</span><b>${s.gravitationalDrift}</b></div>
        </div>
      </div>

      <!-- S.P.A.C.E. NETWORK -->
      <div class="az-card">
        <div class="az-card-title">S.P.A.C.E. NETWORK</div>
        <div class="az-card-rows">
          <div><span>Agents Online</span><b>${s.agentsOnline}</b></div>
          <div><span>Encryption Load</span><b>${s.encryptionLoad}</b></div>
          <div><span>Cipher Key Rotation</span><b>${s.cipherKeyRotation}</b></div>
          <div><span>Riftline Latency</span><b>${s.riftlineLatency}</b></div>
          <div><span>Active Missions</span><b>${s.activeMissions}</b></div>
          <div><span>Class Briefs Today</span><b>${s.classBriefsToday}</b></div>
        </div>
      </div>

      <!-- S.A.T.U.R.N. LABS -->
      <div class="az-card">
        <div class="az-card-title">S.A.T.U.R.N. LABS</div>
        <div class="az-card-rows">
          <div><span>Reactor Output</span><b>${s.saturnReactorOutput}</b></div>
          <div><span>Containment</span><b>${s.saturnContainment}</b></div>
          <div><span>New Discoveries</span><b>${s.saturnNewDiscoveries}</b></div>
          <div><span>Active Protocols</span><b>${s.saturnProtocols}</b></div>
        </div>
      </div>

      <!-- VELMORIA DEFENSE -->
      <div class="az-card">
        <div class="az-card-title">VELMORIA DEFENSE GRID</div>
        <div class="az-card-rows">
          <div><span>Shield Coverage</span><b>${s.shieldGridCoverage}</b></div>
          <div><span>Warp-Ready Fleet</span><b>${s.warpReadyFleet}</b></div>
          <div><span>Interceptors</span><b>${s.interceptors}</b></div>
          <div><span>NTPD Incidents</span><b>${s.ntpdIncidents}</b></div>
        </div>
      </div>

      <!-- ANTROSA EXTRA -->
      <div class="az-card">
        <div class="az-card-title">ANTROSA CITY SYSTEMS</div>
        <div class="az-card-rows">
          <div><span>Cyber Pyramid Power</span><b>${s.cyberPyramidPower}</b></div>
          <div><span>River Quality</span><b>${s.riverQualityIdx}</b></div>
          <div><span>Multiversal Hub</span><b>${s.multiHubTraffic} transits/h</b></div>
        </div>
      </div>

      <!-- THREAT LEGEND -->
      <div class="az-card az-card-wide">
        <div class="az-card-title">THREAT LEVEL LEGEND</div>
        <div class="az-threat-legend">
          ${Object.entries({ green:['GREEN','Nominal'], blue:['BLUE','Monitoring'], yellow:['YELLOW','Advisory'], orange:['ORANGE','Unscheduled'], red:['RED','Hostile Contact'], amber:['AMBER','Rift Anomaly'], purple:['PURPLE','Multiversal'], black:['BLACK','Multiverse Changing Event'] }).map(([color, [name, desc]]) => {
            return `<div class="az-tl-item az-threat-${color}"><span class="az-tl-name">${name}</span><span class="az-tl-desc">${desc}</span></div>`;
          }).join('')}
        </div>
      </div>

      <!-- INCIDENT FEED -->
      <div class="az-card az-card-wide az-card-feed">
        <div class="az-card-title">INCIDENT FEED · LIVE</div>
        <div class="az-incident-list">
          ${s.incidentFeed.map((e, i) => `
            <div class="az-incident-row az-threat-${e.color}${i === 0 ? ' az-incident-latest' : ''}">
              <span class="az-incident-ts">${e.ts}</span>
              <span class="az-incident-text">${escHtml(e.text)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- QUOTE -->
      <div class="az-card az-card-wide az-quote">
        ${escHtml(s.quote)}
      </div>

      <!-- ANDROMADEAN TRANSLATION KEY (re-rendered below the quote bar per spec) -->
      <div class="az-card az-card-wide az-card-lex">
        <div class="az-card-title">ANDROMADEAN TRANSLATION KEY</div>
        <div class="az-lex-grid">
          ${AZ_ANDROMADEAN_ALPHABET.map(g => `
            <div class="az-lex-cell">
              <div class="az-lex-glyph">${g.svg}</div>
              <div class="az-lex-en">${escHtml(g.en)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Tick cadences:
//   MAIN  — full panel re-render (all fields re-roll): every 14s
//   POP   — population gauge only: every 1.5s (so it "frequently changes")
//   THREAT — slow threat-level rotator: every 45s, and even then only
//           an 18% chance of actually swapping (see maybeRotateAzThreat)
// The previous 6s full re-render was way too fast and made the threat
// badge ping-pong every breath.
let azulbrightPopInterval = null;
let azulbrightThreatInterval = null;
let azulbrightClockInterval = null;
let azulbrightQuoteInterval = null;
let azulbrightIncidentInterval = null;
function smoothCountTo(el, targetVal, durationMs) {
  if (!el) return;
  const startText = el.textContent.replace(/,/g, '');
  const startVal = parseFloat(startText) || targetVal;
  const startTime = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - startTime) / durationMs);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out
    const cur = Math.round(startVal + (targetVal - startVal) * ease);
    el.textContent = fmtNum(cur);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updateAzPopulationOnly() {
  const popEl = document.querySelector('.az-gauge-population .az-gauge-val');
  if (popEl) {
    AZ_STATE.popBaseline += randInt(-620, 840);
    smoothCountTo(popEl, AZ_STATE.popBaseline + randInt(-14_500, 18_900), 1200);
  }
  // Also tick active ships
  const shipEls = document.querySelectorAll('.az-gauge-val');
  let shipsEl = null;
  shipEls.forEach(el => { if (el.previousElementSibling && el.previousElementSibling.textContent === 'Active Ships') shipsEl = el; });
  if (shipsEl) {
    AZ_STATE.shipsBaseline += randInt(-30, 45);
    AZ_STATE.shipsBaseline = Math.max(47000, Math.min(52000, AZ_STATE.shipsBaseline));
    smoothCountTo(shipsEl, AZ_STATE.shipsBaseline, 1000);
  }
}
// Update only the Local Time gauge (every 1s, completely independent).
function updateAzClockOnly() {
  const gauges = document.querySelectorAll('#azulbright-body .az-gauge');
  gauges.forEach(g => {
    const lbl = g.querySelector('.az-gauge-label');
    const val = g.querySelector('.az-gauge-val');
    if (lbl && val && lbl.textContent === 'Local Time') {
      val.textContent = azulbrightNow() + ' AZT · CYC ' + azulbrightCycle();
    }
  });
}

// Update only the quote (rotates independently from stats).
function updateAzQuoteOnly() {
  const q = document.querySelector('#azulbright-body .az-quote');
  if (!q) return;
  const next = pickUnique(AZ_QUOTE_POOL, _quoteHistory, 60);
  q.style.opacity = '0';
  setTimeout(() => { q.textContent = next; q.style.opacity = ''; }, 250);
}

// Prepend a single new incident to the live feed (independent from stats).
function updateAzIncidentsOnly() {
  const list = document.querySelector('#azulbright-body .az-incident-list');
  if (!list) return;
  const hit = Math.random() < 0.6 ? pickUnique(AZ_INCIDENT_POOL, _incidentHistory, 100) : azGenProcIncident();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  // Strip "latest" highlight from the previous top entry
  const prevLatest = list.querySelector('.az-incident-latest');
  if (prevLatest) prevLatest.classList.remove('az-incident-latest');
  const row = document.createElement('div');
  row.className = `az-incident-row az-threat-${hit.color} az-incident-latest az-incident-fade-in`;
  row.innerHTML = `<span class="az-incident-ts">${ts}</span><span class="az-incident-text">${escHtml(hit.text)}</span>`;
  list.insertBefore(row, list.firstChild);
  // Cap the list at 8 rows
  while (list.children.length > 8) list.removeChild(list.lastChild);
}

// Update only the per-stat <b> values inside cards (without touching titles, threat, quote, incidents, clock).
function updateAzStatsOnly() {
  const body = $('azulbright-body');
  if (!body) return;
  const s = generateAzulbrightStats();
  // Map each row by its label text, then write back the new value.
  const valueMap = {
    'Output': s.starOutput, 'Dyson Swarm': s.dysonCoverage, 'Stellar Engine Dv': s.stellarEnginePush,
    'Star Mine Yield': s.starMineYield, 'Flare Risk': s.flareRisk,
    'Surface Temp': s.desolaratoTemp, 'Active Miners': s.desolaratoMiners,
    'S.A.T.U.R.N. Experiments': s.saturnLabsExp, 'Cybersquad Cadets': s.cybersquadCadets,
    'Ice Moon Temp': s.desolaratoIceMoon,
    'Elevators': s.treeElevators, 'Residents': s.treeResidents, 'Orbit Radius': s.treeOrbit,
    'Market Index': s.sharledMarketIdx, 'DMD Spot': s.dmdSpot, 'Stalls Open': s.sharledStallsOpen,
    'Space Hotel Occ.': s.spaceHotelOcc, 'Water Moon Reserve': s.waterMoonReserve,
    'Nova Terris Pop.': s.novaTerrisPop, 'Pyramid Shield': s.pyramidShield, 'River Flow': s.riverFlow,
    'NTPD On Duty': s.ntpdActive, 'DMD Factory Moon': s.dmdFactoryMoon, 'Multiversal Hub': s.multiHubTraffic,
    'Garrison': s.velmoriaGarrison, 'Cybertanks Ready': s.cybertanksReady,
    'Cybercopters Ready': s.cybercoptersReady, 'War Div. Alert': s.warDivAlert,
    'Inbound': s.inboundShips, 'Outbound': s.outboundShips, 'Cargo Today': `${s.cargoTons} tons`,
    'Transit Delay': s.transitDelay, 'Next Courier': s.nextCourier, 'ETA': s.nextCourierEta,
    'HALOS Uptime': s.halosUptime, 'Processes': s.haloProcesses, 'Queued Reqs': s.queuedRequests,
    'Active Division': s.activeDivision, 'Agent On Duty': s.cosmosCrewOnDuty,
    'Open Missions': s.openMissions, 'Riftline Monitors': s.riftlineMonitors, 'B-792 Stability': s.b792Stability,
    'Active Channels': s.activeChannels, 'Primary Dialect': s.primaryDialect,
    'Andromadean Harmonic': s.andromadeanHarmonic, 'The Pact': s.pactStatus,
    'Cybertank': s.cybertankPrice, 'Cybercopter': s.cybercopterPrice,
    'Cyberspeeder': s.cyberspeederPrice, 'Cyberbike': s.cyberbikePrice,
    'Azulbright Mag Field': s.azulbrightMagField, 'Cosmic Ray Flux': s.cosmicRayFlux,
    'Rift Stability Index': s.riftStabilityIdx, 'Dark Matter Density': s.darkMatterDensity,
    'Gravitational Drift': s.gravitationalDrift,
    'Agents Online': s.agentsOnline, 'Encryption Load': s.encryptionLoad,
    'Cipher Key Rotation': s.cipherKeyRotation, 'Riftline Latency': s.riftlineLatency,
    'Active Missions': s.activeMissions, 'Class Briefs Today': s.classBriefsToday,
    'Reactor Output': s.saturnReactorOutput, 'Containment': s.saturnContainment,
    'New Discoveries': s.saturnNewDiscoveries, 'Active Protocols': s.saturnProtocols,
    'Shield Coverage': s.shieldGridCoverage, 'Warp-Ready Fleet': s.warpReadyFleet,
    'Interceptors': s.interceptors, 'NTPD Incidents': s.ntpdIncidents,
    'Cyber Pyramid Power': s.cyberPyramidPower, 'River Quality': s.riverQualityIdx,
  };
  body.querySelectorAll('.az-card-rows > div').forEach(row => {
    const span = row.querySelector('span');
    const b = row.querySelector('b');
    if (!span || !b) return;
    const label = span.textContent.trim();
    if (Object.prototype.hasOwnProperty.call(valueMap, label)) {
      const newVal = valueMap[label];
      if (newVal != null && String(b.textContent) !== String(newVal)) {
        b.textContent = newVal;
      }
    }
  });
}

function startAzulbrightFeed() {
  renderAzulbrightStats();
  stopAzulbrightFeed();
  // Independent update cadences:
  //  CLOCK    every 1s     - just the Local Time gauge
  //  POP      every 1.5s   - population + active ships smooth count
  //  INCIDENT every 6s     - prepend one new incident
  //  STATS    every 9s     - re-roll the per-row values (no full re-render)
  //  QUOTE    every 18s    - rotate quote string
  //  THREAT   every 45s    - chance to rotate threat level (full re-render)
  azulbrightClockInterval    = setInterval(updateAzClockOnly,     1000);
  azulbrightPopInterval      = setInterval(updateAzPopulationOnly, 1500);
  azulbrightIncidentInterval = setInterval(updateAzIncidentsOnly, 6000);
  azulbrightInterval         = setInterval(updateAzStatsOnly,     9000);
  azulbrightQuoteInterval    = setInterval(updateAzQuoteOnly,    18000);
  azulbrightThreatInterval   = setInterval(() => {
    const before = AZ_STATE.currentThreat;
    maybeRotateAzThreat();
    if (AZ_STATE.currentThreat !== before) renderAzulbrightStats();
  }, 45000);
}
function stopAzulbrightFeed() {
  if (azulbrightInterval) { clearInterval(azulbrightInterval); azulbrightInterval = null; }
  if (azulbrightPopInterval) { clearInterval(azulbrightPopInterval); azulbrightPopInterval = null; }
  if (azulbrightThreatInterval) { clearInterval(azulbrightThreatInterval); azulbrightThreatInterval = null; }
  if (azulbrightClockInterval) { clearInterval(azulbrightClockInterval); azulbrightClockInterval = null; }
  if (azulbrightQuoteInterval) { clearInterval(azulbrightQuoteInterval); azulbrightQuoteInterval = null; }
  if (azulbrightIncidentInterval) { clearInterval(azulbrightIncidentInterval); azulbrightIncidentInterval = null; }
}

/* ══════════════════════════════
   PWA + Notifications
══════════════════════════════ */
let SW_REG = null;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        SW_REG = reg;
        // If a new SW is found, tell it to skip waiting so updates land fast.
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
        // Check for updates every time the page comes back into view.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
  // When the new SW takes control, reload once so the page runs the fresh build.
  let _swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_swReloaded) return;
    _swReloaded = true;
    window.location.reload();
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'NOTIFICATION_CLICK') window.focus();
  });
}

async function requestNotificationPermission() {
  const status = $('notif-status');
  if (!('Notification' in window)) {
    if (status) { status.textContent = 'Notifications not supported on this device.'; status.className = 'dl-notif-status denied'; }
    return 'unsupported';
  }
  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); } catch {}
  }
  if (status) {
    if (perm === 'granted') { status.textContent = 'Notifications enabled.'; status.className = 'dl-notif-status granted'; }
    else if (perm === 'denied') { status.textContent = 'Notifications blocked. Enable them in your browser settings.'; status.className = 'dl-notif-status denied'; }
    else { status.textContent = 'Notifications not yet enabled.'; status.className = 'dl-notif-status'; }
  }
  return perm;
}

function notifyUser(title, body, opts = {}) {
  if (!('Notification' in window)) {
    console.warn('[halos] Notifications unsupported by this browser.');
    return;
  }
  if (Notification.permission !== 'granted') {
    console.warn('[halos] Notification permission is', Notification.permission, '— not showing.');
    return;
  }
  const payload = {
    title: title || 'HALOS',
    body: body || '',
    tag: opts.tag || 'halos-msg',
    url: opts.url || '/',
    // Default to auto-dismissing. Only calls should pin. Pinning every
    // message note caused the "no notifications on non-Chromebook" bug:
    // Chrome on Windows/Mac was silently dropping subsequent requireInteraction
    // notes that shared a tag.
    requireInteraction: !!opts.requireInteraction,
  };
  const noteOpts = {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag,
    data: { url: payload.url },
    vibrate: [120, 60, 120],
    // requireInteraction keeps the notification on screen until the user
    // clicks it. Without this, Chrome on Windows/Mac dismisses it after
    // a few seconds, which is why people thought nothing ever popped up.
    requireInteraction: payload.requireInteraction,
    // Let the same message re-notify even if the tag matches — otherwise
    // two pings with the same tag would silently replace each other.
    renotify: true,
  };
  // Always go through a service worker registration when one is
  // available. Modern Chrome/Edge flat-out refuse `new Notification()`
  // when a SW is registered — it throws an Illegal constructor error —
  // so the SW path is the only one that actually fires on desktop.
  const swReady = ('serviceWorker' in navigator)
    ? navigator.serviceWorker.ready.catch(() => null)
    : Promise.resolve(null);
  (async () => {
    let reg = null;
    try {
      reg = SW_REG || await swReady;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(payload.title, noteOpts);
        console.log('[halos] notification fired via SW:', payload.title);
        return;
      } else {
        console.warn('[halos] no SW registration available for notification; falling back');
      }
    } catch (err) {
      console.warn('[halos] SW showNotification failed:', err && err.message, err);
    }
    // Browsers without a service worker (rare) fall back to the legacy
    // constructor. Wrapped in try/catch because Chrome throws here when
    // a SW is registered.
    try {
      const n = new Notification(payload.title, {
        body: payload.body, icon: '/favicon.svg', tag: payload.tag,
      });
      n.onclick = () => { window.focus(); n.close(); };
      console.log('[halos] notification fired via Notification():', payload.title);
    } catch (err) {
      console.warn('[halos] Direct Notification constructor failed:', err && err.message, err);
    }
  })();
}

// Expose a manual test hook so users can diagnose the notification
// pipeline end-to-end from the downloads modal. Logs each step to the
// console so it's obvious why a platform isn't delivering.
window.testHalosNotification = async function testHalosNotification() {
  console.log('[halos-notif-test] Notification in window:', 'Notification' in window);
  console.log('[halos-notif-test] permission:', typeof Notification !== 'undefined' ? Notification.permission : 'n/a');
  console.log('[halos-notif-test] serviceWorker in navigator:', 'serviceWorker' in navigator);
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      console.log('[halos-notif-test] SW registration:', reg);
    } catch (e) { console.warn('[halos-notif-test] SW lookup failed:', e); }
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch {}
  }
  notifyUser('HALOS · Test', 'If you see this, desktop notifications work on this device.', { tag: 'halos-test', requireInteraction: false });
};

// Auto-request permission on the first user gesture after login. Browsers
// reject/throttle Notification.requestPermission() calls that aren't tied
// to a gesture, which is why the old 4-second timer silently did nothing.
// We also ping the user via an in-app toast if they end up denied so they
// know to flip the switch in browser settings.
function maybePromptNotifications() {
  if (!('Notification' in window)) {
    console.warn('[halos] Notification API missing — desktop alerts disabled.');
    return;
  }
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') {
    console.warn('[halos] Notifications are blocked; unblock via browser site settings.');
    return;
  }
  // permission === 'default' — wait for a real gesture, then ask.
  const ask = async () => {
    document.removeEventListener('click', ask, true);
    document.removeEventListener('keydown', ask, true);
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      console.warn('[halos] Notification permission result:', perm);
    }
  };
  document.addEventListener('click', ask, true);
  document.addEventListener('keydown', ask, true);
}

/* ── Downloads modal wiring ── */
window.addEventListener('DOMContentLoaded', () => {
  // NOTE: topbar-download is wired via initGlobalTopbarDelegation.
  const overlay = $('downloads-overlay');
  const closeBtn = $('downloads-close');
  const enableBtn = $('enable-notifications-btn');
  if (closeBtn && overlay) closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  if (enableBtn) enableBtn.addEventListener('click', () => requestNotificationPermission());
  const testBtn = $('test-notifications-btn');
  if (testBtn) testBtn.addEventListener('click', () => {
    if (typeof window.testHalosNotification === 'function') window.testHalosNotification();
  });

  // Wire per-platform install buttons (use beforeinstallprompt where possible)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  document.querySelectorAll('.dl-btn[data-platform]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const plat = btn.dataset.platform;
      if (deferredPrompt && (plat === 'windows' || plat === 'android' || plat === 'mac')) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch {}
        deferredPrompt = null;
        return;
      }
      // APK / iOS project generation — route the user through PWA Builder,
      // which turns this site's manifest + service worker into a real
      // signed Android APK (TWA) or an Xcode-ready iOS project. No Play
      // Store or App Store account required on the APK side.
      if (plat === 'android-apk' || plat === 'ios-xcode') {
        const origin = window.location.origin;
        const url = 'https://www.pwabuilder.com/reportcard?site=' + encodeURIComponent(origin);
        const label = plat === 'android-apk' ? 'Android APK' : 'iOS project';
        const msg = `We'll open PWA Builder with this site pre-loaded. Click "Package For Stores" → "${plat === 'android-apk' ? 'Android' : 'iOS'}" to download a signed ${label}. Continue?`;
        if (confirm(msg)) window.open(url, '_blank', 'noopener');
        return;
      }
      const msgs = {
        windows: 'In Edge or Chrome: click the install icon in the address bar, or open the browser menu → "Install HALOS Interface".',
        mac: 'In Safari: File → Add to Dock. In Chrome: click the install icon in the address bar.',
        ios: 'In Safari, tap the Share button (square with arrow), scroll down, then tap "Add to Home Screen". After installing, open the app and allow notifications.',
        android: 'In Chrome, tap the menu (⋮) and select "Install app" or "Add to Home screen". Allow notifications when prompted.',
      };
      alert(msgs[plat] || 'Open this site in your device browser and use its "Install" or "Add to Home Screen" option.');
    });
  });
});

/* ══════════════════════════════
   TOPBAR + IN-SITE NOTIFICATIONS
   Download/Help on the left, Notifications (bell) + Settings (gear)
   on the right. The bell opens an in-site dropdown; incoming alerts
   (new messages, calls, meet invites) also show as a brief toast at
   the bottom-center. These are separate from OS push notifications.
══════════════════════════════ */
const NOTIF_STATE = { items: [], unread: 0, open: false };
const NOTIF_MAX = 40;

function initTopbar() {
  // Topbar button handlers are bound via document-level event delegation
  // (see initGlobalTopbarDelegation below) so they always fire regardless of
  // when initTopbar runs relative to the DOM and don't double-register across
  // logout/login cycles.

  const panel = $('notif-panel');
  const markBtn = $('notif-mark-read');
  if (markBtn) markBtn.addEventListener('click', () => { markAllNotifRead(); renderNotifList(); });

  // Dynamically shift #topbar-right when the active panel has heavy
  // top-right chrome (share indicator, call btn, fullscreen btn).
  // We watch panel changes via a MutationObserver on the nav-btn active
  // state — cheap and reliable.
  const updateShift = () => {
    const active = document.querySelector('.panel.active');
    if (!active) return;
    const headerActions = active.querySelector('.header-actions, .call-header-actions');
    const topbarRight = $('topbar-right');
    if (!topbarRight) return;
    // If there's a big set of top-right buttons, nudge the topbar-right
    // slightly left so it doesn't visually stack on top of them.
    const hasHeavy = !!(headerActions && headerActions.querySelectorAll('button, .share-indicator').length >= 3);
    topbarRight.classList.toggle('topbar-right-shifted', hasHeavy);
  };
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => setTimeout(updateShift, 40)));
  updateShift();

  // Rotating broadcast line — flavor beats + system status. Runs
  // forever at a slow pace so it feels alive without being noisy.
  const TOPBAR_BEATS = [
    '◈ HALOS core nominal · all divisions reporting',
    '◉ Cipher Division: sweep clear on sector AZB-07',
    '⊥ Space Tree: elevator 7 passed bark inspection',
    '☍ B-792 polar drift within advisory band',
    '◆ Sharled DMD spot holding · trade lanes green',
    '▲ Pyramid Shield nominal · Nova Terris clear',
    '⇄ Orbital traffic: 1,412 inbound · 1,288 outbound',
    '✶ Astralex creed: Cosmos Crew goes first, comes back',
    ...COSMOS_CREW_STATUS_LINES.map(l => '· ' + l),
  ];
  const tbcMsg = $('tbc-msg');
  let beatIdx = 0;
  if (tbcMsg) {
    setInterval(() => {
      beatIdx = (beatIdx + 1) % TOPBAR_BEATS.length;
      tbcMsg.textContent = TOPBAR_BEATS[beatIdx];
    }, 7000);
  }
}

function addInSiteNotif({ title, body, kind = 'info', url = null }) {
  const item = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title: title || 'Alert',
    body: body || '',
    kind,
    url,
    ts: Date.now(),
    unread: true,
  };
  NOTIF_STATE.items.unshift(item);
  if (NOTIF_STATE.items.length > NOTIF_MAX) NOTIF_STATE.items.length = NOTIF_MAX;
  NOTIF_STATE.unread++;
  updateBellDot();
  renderNotifList();
  showToast({ title, body, kind });
  return item;
}

function markAllNotifRead() {
  NOTIF_STATE.items.forEach(i => i.unread = false);
  NOTIF_STATE.unread = 0;
  updateBellDot();
}

function updateBellDot() {
  const dot = $('topbar-bell-dot');
  if (!dot) return;
  dot.hidden = NOTIF_STATE.unread === 0;
}

function renderNotifList() {
  const list = $('notif-list');
  if (!list) return;
  if (!NOTIF_STATE.items.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
    return;
  }
  list.innerHTML = NOTIF_STATE.items.map(i => `
    <div class="notif-item${i.unread ? ' unread' : ''}" data-id="${i.id}">
      <div class="notif-item-title">${escHtml(i.title)}</div>
      ${i.body ? `<div class="notif-item-body">${escHtml(i.body)}</div>` : ''}
      <div class="notif-item-time">${new Date(i.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
    </div>
  `).join('');
  list.querySelectorAll('.notif-item').forEach(el => {
    el.addEventListener('click', () => {
      const it = NOTIF_STATE.items.find(x => x.id === el.dataset.id);
      if (it && it.url) { try { location.hash = it.url; } catch {} }
      if (it) { it.unread = false; NOTIF_STATE.unread = Math.max(0, NOTIF_STATE.unread - 1); updateBellDot(); el.classList.remove('unread'); }
    });
  });
}

function showToast({ title, body, kind = 'info', duration = 4500 }) {
  const stack = $('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  const kindClass = kind === 'warn' ? 'toast-warn' : kind === 'danger' ? 'toast-danger' : kind === 'purple' ? 'toast-purple' : '';
  el.className = 'toast ' + kindClass;
  el.innerHTML = `
    ${title ? `<div class="toast-title">${escHtml(title)}</div>` : ''}
    ${body ? `<div class="toast-body">${escHtml(body)}</div>` : ''}
  `;
  el.addEventListener('click', () => dismissToast(el));
  stack.appendChild(el);
  setTimeout(() => dismissToast(el), duration);
}
function dismissToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('toast-leaving');
  setTimeout(() => { try { el.remove(); } catch {} }, 300);
}

// Expose as a stable global so other modules can raise alerts.
window.halosNotify = addInSiteNotif;
window.halosToast = showToast;

/* ══════════════════════════════
   UTILS
══════════════════════════════ */
function escHtml(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtTime(ts){return new Date(ts).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true});}
function fmtBytes(b){if(b<1024)return b+' B';if(b<1024*1024)return(b/1024).toFixed(1)+' KB';return(b/(1024*1024)).toFixed(1)+' MB';}
function fileIcon(ext){const m={jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',svg:'🖼️',mp4:'🎬',webm:'🎬',mov:'🎬',mp3:'🎵',wav:'🎵',pdf:'📄',doc:'📝',docx:'📝',txt:'📝',md:'📝',json:'📋',js:'💻',py:'💻',html:'💻',css:'💻',zip:'📦',tar:'📦',csv:'📊',xls:'📊',xlsx:'📊'};return m[ext]||'📎';}
function detectPT(ext){if(['jpg','jpeg','png','gif','webp','svg'].includes(ext))return'image';if(['mp4','webm','mov'].includes(ext))return'video';if(['txt','md','json','js','py','html','css','csv'].includes(ext))return'text';return'link';}

/* ══════════════════════════════════════════════════════════════════
   HUD CHROME — decorative readouts threaded into the panel
   subheaders, sidebar sector block, and floating status pod. None
   of this is load-bearing; it just keeps the interface visibly alive.
   ══════════════════════════════════════════════════════════════════ */
const HUD_STATE = {
  sessionStartMs: Date.now(),
  lastFreq: 1729.4,
  txCount: 0,
  rxCount: 0,
  lastMsgCount: 0,
  lastSig: 94,
  lastLoad: 14,
  lastLat: 48,
  rtcRtt: null,
};
function initHudChrome() {
  // Collapse/expand for the floating pod
  const pod = document.getElementById('hud-status-pod');
  const collapseBtn = document.getElementById('hsp-collapse');
  if (pod && collapseBtn) {
    try { if (localStorage.getItem('halos_hud_collapsed') === '1') pod.classList.add('collapsed'); } catch {}
    if (pod.classList.contains('collapsed')) collapseBtn.textContent = '+';
    collapseBtn.addEventListener('click', e => {
      e.stopPropagation();
      pod.classList.toggle('collapsed');
      const isCollapsed = pod.classList.contains('collapsed');
      collapseBtn.textContent = isCollapsed ? '+' : '−';
      try { localStorage.setItem('halos_hud_collapsed', isCollapsed ? '1' : '0'); } catch {}
    });
  }

  // Click-and-drag the pod anywhere on screen. Uses Pointer Events with
  // setPointerCapture so the drag survives moving over iframes, other
  // stacking contexts, and text selections. Persists position to
  // localStorage so it survives refresh.
  if (pod && !pod.__dragWired) {
    pod.__dragWired = true;
    try {
      const raw = localStorage.getItem('halos_hud_pos');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.left === 'number' && typeof p.top === 'number') {
          pod.style.left = p.left + 'px';
          pod.style.top = p.top + 'px';
          pod.style.right = 'auto';
          pod.style.bottom = 'auto';
        }
      }
    } catch {}

    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, moved = false, activeId = null;

    const onDown = e => {
      if (e.target && e.target.closest && e.target.closest('.hsp-collapse')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = pod.getBoundingClientRect();
      pod.style.left = rect.left + 'px';
      pod.style.top = rect.top + 'px';
      pod.style.right = 'auto';
      pod.style.bottom = 'auto';
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      dragging = true; moved = false; activeId = e.pointerId;
      pod.classList.add('dragging');
      document.body.style.userSelect = 'none';
      try { pod.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    };
    const onMove = e => {
      if (!dragging || e.pointerId !== activeId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      const w = pod.offsetWidth, h = pod.offsetHeight;
      const maxLeft = window.innerWidth - w - 4;
      const maxTop = window.innerHeight - h - 4;
      const nl = Math.min(Math.max(4, startLeft + dx), Math.max(4, maxLeft));
      const nt = Math.min(Math.max(4, startTop + dy), Math.max(4, maxTop));
      pod.style.left = nl + 'px';
      pod.style.top = nt + 'px';
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = e => {
      if (!dragging || e.pointerId !== activeId) return;
      dragging = false; activeId = null;
      pod.classList.remove('dragging');
      document.body.style.userSelect = '';
      try { pod.releasePointerCapture(e.pointerId); } catch {}
      if (moved) {
        try {
          localStorage.setItem('halos_hud_pos', JSON.stringify({
            left: parseFloat(pod.style.left) || 0,
            top: parseFloat(pod.style.top) || 0,
          }));
        } catch {}
      }
    };

    pod.addEventListener('pointerdown', onDown);
    pod.addEventListener('pointermove', onMove);
    pod.addEventListener('pointerup', onEnd);
    pod.addEventListener('pointercancel', onEnd);

    const clamp = () => {
      const w = pod.offsetWidth, h = pod.offsetHeight;
      const l = parseFloat(pod.style.left) || 0;
      const t = parseFloat(pod.style.top) || 0;
      const nl = Math.min(Math.max(4, l), Math.max(4, window.innerWidth - w - 4));
      const nt = Math.min(Math.max(4, t), Math.max(4, window.innerHeight - h - 4));
      pod.style.left = nl + 'px';
      pod.style.top = nt + 'px';
    };
    window.addEventListener('resize', () => { if (pod.style.left) clamp(); });
  }

  // Boot the tick immediately, then hold 1Hz cadence. Cheap enough to
  // leave running; no-ops gracefully if elements vanish.
  hudTick();
  setInterval(hudTick, 1000);

  // Dedicated 1Hz clock interval — updates the AZT display and all psh-time
  // chips independently so they never stall or show stale values between tabs.
  function tickClock() {
    const azt = azulbrightNow();
    const tbcTime = document.getElementById('tbc-clock-time');
    if (tbcTime) tbcTime.textContent = azt;
    const tbcCycle = document.getElementById('tbc-clock-cycle');
    if (tbcCycle) tbcCycle.textContent = 'CYC ' + azulbrightCycle();
    document.querySelectorAll('.psh-time').forEach(el => { el.textContent = azt + ' AZT'; });
    const chatTime = document.getElementById('psh-chat-time');
    if (chatTime) chatTime.textContent = azt + ' AZT';
  }
  tickClock();
  setInterval(tickClock, 1000);
}
function hudFormatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
// Azulbright Central Time — a synced, fictional time that reads the same
// for every HALOS user at any given moment. Built from UTC + a fixed offset
// so it's locale-independent; returns h:MM:SS AM/PM (12h).
function azulbrightNow() {
  const ACT_OFFSET_MS = 4 * 60 * 60 * 1000;
  const d = new Date(Date.now() + ACT_OFFSET_MS);
  const pad = n => n.toString().padStart(2, '0');
  const h24 = d.getUTCHours();
  if ((typeof SESSION !== 'undefined' ? SESSION.clockFmt : null) === '24') {
    return `${pad(h24)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${ampm}`;
}
// Expanded display: "14:23:07 · CYCLE 42 · A.C.T." with cycle = days since
// a fixed epoch, so every HALOS interface agrees on the cycle number.
function azulbrightCycle() {
  const ACT_EPOCH = Date.UTC(2024, 0, 1); // fixed reference
  return Math.floor((Date.now() - ACT_EPOCH) / 86400000);
}

function hudTick() {
  const azt = azulbrightNow();
  // Floating status pod
  const setText = (id, text, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (cls) {
      el.classList.remove('warn', 'purple');
      if (cls !== 'ok') el.classList.add(cls);
    }
  };
  setText('hsp-session', hudFormatDuration(Date.now() - HUD_STATE.sessionStartMs));
  setText('hsp-azt', azt, 'purple');
  // Global Azulbright Central Time clock — shared by every HALOS user.
  const tbcTime = document.getElementById('tbc-clock-time');
  if (tbcTime) tbcTime.textContent = azt;
  const tbcCycle = document.getElementById('tbc-clock-cycle');
  if (tbcCycle) tbcCycle.textContent = 'CYC ' + azulbrightCycle();
  // Link status tracks the connection-status element
  const conn = document.getElementById('conn-status');
  let linkText = 'SECURE';
  let linkCls = 'ok';
  if (conn) {
    if (conn.classList.contains('disconnected')) { linkText = 'DEGRADED'; linkCls = 'warn'; }
    else if (conn.classList.contains('connecting')) { linkText = 'SYNCING'; linkCls = 'warn'; }
  }
  setText('hsp-link', linkText, linkCls);
  setText('hsp-halos', (typeof SESSION !== 'undefined' && SESSION.isAgent) ? 'AGENT CHANNEL' : 'CORE ONLINE');
  syncConnStatusMirrors();

  // Signal % readout — wanders between 84% and 99% with occasional dips.
  const sigEl = document.getElementById('hsp-signal-val');
  if (sigEl) {
    HUD_STATE.lastSignal = HUD_STATE.lastSignal != null ? HUD_STATE.lastSignal : 96;
    let next = HUD_STATE.lastSignal + (Math.random() - 0.5) * 3;
    if (Math.random() < 0.04) next -= 6 + Math.random() * 8; // occasional dip
    next = Math.max(78, Math.min(99, next));
    HUD_STATE.lastSignal = next;
    const pct = Math.round(next);
    const bars = sigEl.querySelector('.hsp-signal');
    sigEl.textContent = pct + '%';
    if (bars) sigEl.appendChild(bars);
    sigEl.classList.toggle('warn', pct < 88);
  }

  // Periodic glitch on a random value — feels like data refresh.
  if (Math.random() < 0.08) {
    const candidates = ['hsp-build', 'hsp-sector', 'hsp-link'];
    const pick = document.getElementById(candidates[Math.floor(Math.random() * candidates.length)]);
    if (pick) {
      pick.classList.add('glitch');
      setTimeout(() => pick.classList.remove('glitch'), 400);
    }
  }
  // Subheader time chips (all panels share `.psh-time`)
  // All panel-subheader time readouts show AZT (synced cluster-wide).
  document.querySelectorAll('.psh-time').forEach(el => { el.textContent = azt + ' AZT'; });
  const chatTime = document.getElementById('psh-chat-time'); if (chatTime) chatTime.textContent = azt + ' AZT';

  // Chat channel / message count
  const channel = (typeof STATE !== 'undefined' && STATE && STATE.activeChat) ? STATE.activeChat : 'general';
  const channelLabel = channel === 'general' ? 'GEN-01'
    : channel.startsWith && channel.startsWith('group-') ? 'GRP-' + channel.slice(-4).toUpperCase()
    : channel.startsWith && channel.startsWith('user-') ? 'DM-' + channel.slice(-4).toUpperCase()
    : 'AG-' + String(channel).slice(0, 4).toUpperCase();
  const chatChan = document.getElementById('psh-chat-channel'); if (chatChan) chatChan.textContent = channelLabel;
  const cimCh = document.getElementById('cim-ch'); if (cimCh) cimCh.textContent = channelLabel;
  const msgArr = (STATE && STATE.chats && STATE.chats[channel]) || [];
  const msgEl = document.getElementById('psh-chat-msgs'); if (msgEl) msgEl.textContent = String(msgArr.length);
  // Frequency gently wanders so the readout feels live
  HUD_STATE.lastFreq += (Math.random() - 0.5) * 0.04;
  if (HUD_STATE.lastFreq < 1728.5) HUD_STATE.lastFreq = 1728.5;
  if (HUD_STATE.lastFreq > 1730.5) HUD_STATE.lastFreq = 1730.5;
  const freqStr = HUD_STATE.lastFreq.toFixed(2);
  const freqA = document.getElementById('psh-chat-freq'); if (freqA) freqA.textContent = freqStr + ' MHz';
  const freqB = document.getElementById('cim-freq'); if (freqB) freqB.textContent = freqStr;
  // Latency: prefer real network data from the resource timing API
  let lat;
  try {
    const entries = performance.getEntriesByType('resource');
    const recent = entries.slice(-8).filter(e => e.duration > 0 && e.duration < 3000);
    if (recent.length) {
      const avg = recent.reduce((s, e) => s + e.duration, 0) / recent.length;
      lat = Math.round(avg);
    }
  } catch {}
  if (!lat) {
    HUD_STATE.lastLat = Math.max(18, Math.min(180, HUD_STATE.lastLat + (Math.random() - 0.5) * 8));
    lat = Math.round(HUD_STATE.lastLat);
  }
  const latEl = document.getElementById('psh-chat-latency'); if (latEl) latEl.textContent = lat + ' ms';

  // TX/RX count in chat-input meta — delta of messages since last tick
  if (msgArr.length > HUD_STATE.lastMsgCount) {
    const delta = msgArr.length - HUD_STATE.lastMsgCount;
    // Naive split: own-authored go to TX, rest to RX
    msgArr.slice(-delta).forEach(m => { if (m.incoming === false) HUD_STATE.txCount++; else HUD_STATE.rxCount++; });
    HUD_STATE.lastMsgCount = msgArr.length;
  }
  const txrx = document.getElementById('cim-txrx'); if (txrx) txrx.textContent = HUD_STATE.txCount + '/' + HUD_STATE.rxCount;

  // Workspace tile counters
  const scope = (STATE && STATE.workspace && STATE.workspace.current) ? STATE.workspace.current : 'universal';
  const scopeData = (STATE && STATE.workspace && STATE.workspace.scopes && STATE.workspace.scopes[scope]) || { assets: [], notes: [] };
  const setNum = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = String(n); };
  setNum('ws-hud-assets', (scopeData.assets || []).length);
  setNum('ws-hud-notes', (scopeData.notes || []).length);
  setNum('ws-hud-docs', ((STATE && STATE.documents) || []).length);
  const scopeLabel = document.getElementById('ws-hud-scope'); if (scopeLabel) scopeLabel.textContent = scope.toUpperCase();
  const pshScope = document.getElementById('psh-ws-scope'); if (pshScope) pshScope.textContent = scope.toUpperCase();

  // Project tiles
  const projs = (STATE && STATE.projects) || [];
  const active = projs.filter(p => (p.todos || []).length && !(p.todos || []).every(t => t.done)).length;
  const todos = projs.reduce((s, p) => s + (p.todos || []).filter(t => !t.done).length, 0);
  const agentSet = new Set();
  projs.forEach(p => (p.agents || []).forEach(a => agentSet.add(a)));
  setNum('ph-active', active);
  setNum('ph-total', projs.length);
  setNum('ph-todos', todos);
  setNum('ph-agents', agentSet.size);

  // Roster tiles — online count derived from last_seen timestamp (same logic as loadRoster)
  const users = (STATE && STATE.serverUsers) || [];
  const online = users.filter(u => u.last_seen && (Date.now() - new Date(u.last_seen)) < 5 * 60000).length;
  const agents = users.filter(u => u.is_agent).length;
  const humans = users.filter(u => !u.is_agent).length;
  const groups = Object.keys((STATE && STATE.groupChats) || {}).length;
  setNum('rhs-online', online);
  setNum('rhs-agents', agents);
  setNum('rhs-humans', humans);
  setNum('rhs-groups', groups);
  setNum('rhs-calls', (typeof CALL !== 'undefined' && CALL && CALL.state && CALL.state !== 'idle') ? 1 : 0);

  // Screen share telemetry — pull real WebRTC stats when a call is active
  (async () => {
    let rtcLat = null, rtcJit = null, rtcPkt = null;
    try {
      if (typeof CALL !== 'undefined' && CALL.pc && CALL.state === 'active') {
        const stats = await CALL.pc.getStats();
        stats.forEach(r => {
          if (r.type === 'remote-inbound-rtp' && r.kind === 'audio') {
            if (r.roundTripTime != null) rtcLat = Math.round(r.roundTripTime * 1000);
            if (r.jitter != null) rtcJit = Math.round(r.jitter * 1000);
            if (r.fractionLost != null) rtcPkt = (r.fractionLost * 100).toFixed(1);
          }
        });
      }
    } catch {}
    const ssFps = document.getElementById('psh-ss-fps');
    if (ssFps) ssFps.textContent = String(28 + Math.floor(Math.random() * 5));
    const ssBit = document.getElementById('psh-ss-bitrate');
    if (ssBit) ssBit.textContent = (2.1 + Math.random() * 0.7).toFixed(1) + ' Mbps';
    const sshLat = document.getElementById('ssh-latency');
    if (sshLat) sshLat.textContent = (rtcLat != null ? rtcLat : (38 + Math.floor(Math.random() * 22))) + ' ms';
    const sshJit = document.getElementById('ssh-jitter');
    if (sshJit) sshJit.textContent = (rtcJit != null ? rtcJit : (1 + Math.floor(Math.random() * 5))) + ' ms';
    const sshPkt = document.getElementById('ssh-packet');
    if (sshPkt) sshPkt.textContent = (rtcPkt != null ? rtcPkt : (Math.random() * 0.5).toFixed(1)) + '%';
  })();

  // Sidebar telemetry — uptime / signal / load
  const up = document.getElementById('sbtm-up');
  if (up) {
    const total = Math.floor((Date.now() - HUD_STATE.sessionStartMs) / 60000);
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    up.textContent = hh + ':' + mm;
  }
  // Signal wanders persistently so it doesn't jump wildly each tick
  HUD_STATE.lastSig = Math.max(82, Math.min(99, HUD_STATE.lastSig + (Math.random() - 0.5) * 2));
  const sig = document.getElementById('sbtm-sig');
  if (sig) sig.textContent = Math.round(HUD_STATE.lastSig) + '%';
  // Load: use navigator.hardwareConcurrency as a flavor seed, then wander
  HUD_STATE.lastLoad = Math.max(4, Math.min(68, HUD_STATE.lastLoad + (Math.random() - 0.48) * 3));
  const load = document.getElementById('sbtm-load');
  if (load) load.textContent = Math.round(HUD_STATE.lastLoad) + '%';
}
