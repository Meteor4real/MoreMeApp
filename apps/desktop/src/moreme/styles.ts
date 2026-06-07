// MoreMe shared style tokens — Dude Perfect mint dark theme.

export const T = {
  bg: "#0F1318",
  elev: "#1A2028",
  sunk: "#070A0D",
  ink: "#FFFFFF",
  inkSoft: "#A8B3C0",
  inkTiny: "#6A7280",
  line: "#2A3038",
  mint: "#3EDBB5",
  mintDeep: "#00C896",
  mintHi: "#7FEBD0",
  warn: "#FF5C5F",
  cool: "#33B5FF",
};

export const MM_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap');
.moreme-embed { background: ${T.bg}; color: ${T.ink}; font-family: "Inter", system-ui, sans-serif; }
.moreme-embed .serif { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; letter-spacing: .01em; }
.moreme-embed .mm-card { background: ${T.elev}; border: 1px solid ${T.line}; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35); }
.moreme-embed .mm-card-mint { background: ${T.elev}; border: 1px solid ${T.mint}55; border-radius: 14px; box-shadow: 0 0 24px ${T.mint}11 inset, 0 8px 24px rgba(0,0,0,.35); }
.moreme-embed .mm-action { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid ${T.line}; border-radius: 10px; background: ${T.sunk}; transition: border-color .15s, background .15s; width: 100%; text-align: left; }
.moreme-embed .mm-action:hover:not(:disabled) { border-color: ${T.mint}; }
.moreme-embed .mm-action.done { opacity: .6; }
.moreme-embed .mm-action.locked { background: ${T.bg}; }
.moreme-embed .mm-tab { font-family: "Inter", sans-serif; font-size: 12px; padding: 5px 14px; border-radius: 999px; border: 1px solid ${T.line}; background: transparent; color: ${T.inkSoft}; cursor: pointer; transition: all .15s; text-transform: capitalize; }
.moreme-embed .mm-tab:hover { color: ${T.ink}; border-color: ${T.mint}; }
.moreme-embed .mm-tab.active { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn { font-family: "Inter", sans-serif; font-size: 12px; padding: 8px 14px; border-radius: 10px; border: 1px solid ${T.line}; background: ${T.sunk}; color: ${T.ink}; cursor: pointer; transition: all .15s; }
.moreme-embed .mm-btn:hover { border-color: ${T.mint}; }
.moreme-embed .mm-btn-primary { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn-danger { background: transparent; border-color: ${T.warn}; color: ${T.warn}; }
.moreme-embed .mm-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.moreme-embed input, .moreme-embed select, .moreme-embed textarea { background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 10px; color: ${T.ink}; padding: 8px 10px; font: inherit; outline: none; }
.moreme-embed input:focus, .moreme-embed select:focus, .moreme-embed textarea:focus { border-color: ${T.mint}; }
.moreme-embed .mm-h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; }
.moreme-embed .mm-progress { position: relative; height: 12px; background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 6px; overflow: hidden; }
.moreme-embed .mm-progress-fill { position: absolute; inset: 0; background: linear-gradient(90deg, ${T.mintHi}, ${T.mint}); transition: width .35s ease; }
.moreme-embed .mm-progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${T.inkSoft}; letter-spacing: .04em; mix-blend-mode: luminosity; }

/* calendar grid */
.moreme-embed .mm-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.moreme-embed .mm-dow { text-align: center; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: ${T.inkTiny}; padding-bottom: 4px; }
.moreme-embed .mm-day { position: relative; min-height: 86px; background: ${T.sunk}; border: 1px solid ${T.line}; border-radius: 10px; padding: 6px; cursor: pointer; transition: border-color .12s, background .12s; overflow: hidden; display: flex; flex-direction: column; gap: 3px; }
.moreme-embed .mm-day:hover { border-color: ${T.mint}; }
.moreme-embed .mm-day.other { opacity: .4; }
.moreme-embed .mm-day.today { border-color: ${T.mint}; box-shadow: 0 0 0 1px ${T.mint}, 0 0 16px ${T.mint}33; }
.moreme-embed .mm-day.selected { background: ${T.elev}; border-color: ${T.mintHi}; }
.moreme-embed .mm-daynum { font-size: 12px; font-weight: 700; color: ${T.inkSoft}; }
.moreme-embed .mm-day.today .mm-daynum { color: ${T.mint}; }
.moreme-embed .mm-chip { display: flex; align-items: center; gap: 4px; font-size: 10px; line-height: 1.2; padding: 1px 5px; border-radius: 5px; background: rgba(255,255,255,.04); border-left: 3px solid var(--c, ${T.mint}); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.moreme-embed .mm-chip.done { opacity: .45; text-decoration: line-through; }
.moreme-embed .mm-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c, ${T.mint}); flex: none; }
.moreme-embed .mm-modal-back { position: absolute; inset: 0; background: rgba(0,0,0,.62); display: grid; place-items: center; z-index: 50; padding: 20px; }
.moreme-embed .mm-modal { width: min(560px, 96%); max-height: 92%; overflow: auto; background: ${T.elev}; border: 1px solid ${T.mint}55; border-radius: 16px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.moreme-embed .mm-field { display: flex; flex-direction: column; gap: 5px; }
.moreme-embed .mm-field > label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: ${T.inkTiny}; }
.moreme-embed .mm-row { display: flex; gap: 10px; flex-wrap: wrap; }
.moreme-embed .mm-seg { display: inline-flex; border: 1px solid ${T.line}; border-radius: 8px; overflow: hidden; flex-wrap: wrap; }
.moreme-embed .mm-seg button { background: transparent; border: none; color: ${T.inkSoft}; padding: 6px 10px; font-size: 11px; cursor: pointer; }
.moreme-embed .mm-seg button.on { background: ${T.mint}; color: ${T.bg}; font-weight: 700; }
.moreme-embed .mm-conflict { border-color: ${T.warn} !important; box-shadow: 0 0 0 1px ${T.warn}55; }
.moreme-embed .mm-ach { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; border: 1px solid ${T.line}; background: ${T.sunk}; }
.moreme-embed .mm-ach.unlocked { border-color: ${T.mint}; background: ${T.mint}0d; }
.moreme-embed .mm-medal { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 18px; flex: none; background: ${T.bg}; border: 1px solid ${T.line}; color: ${T.inkTiny}; }
.moreme-embed .mm-ach.unlocked .mm-medal { background: ${T.mint}; color: ${T.bg}; border-color: ${T.mint}; }
.moreme-embed .scrolly { overflow: auto; }
.moreme-embed .scrolly::-webkit-scrollbar { width: 8px; height: 8px; }
.moreme-embed .scrolly::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 4px; }
`;

export const inp: React.CSSProperties = {
  flex: 1, background: "rgba(0,0,0,0.4)", border: `1px solid ${T.line}`, borderRadius: 10,
  color: T.ink, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%",
};
