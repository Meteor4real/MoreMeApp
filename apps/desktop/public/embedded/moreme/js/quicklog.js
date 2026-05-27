/* ==========================================================================
   quicklog.js — Type-to-log. Search DAILY_ACTIONS, BONUS_ACTIONS, PENALTIES
   with a single box. No button hunting.
   ========================================================================== */

function allLoggableActions() {
  const out = [];
  for (const a of DAILY_ACTIONS)  out.push({ kind: 'daily',   id: a.id, label: a.label, xp: a.xp });
  for (const b of BONUS_ACTIONS)  out.push({ kind: 'bonus',   id: b.id, label: b.label, xp: b.xp });
  for (const p of PENALTIES)      out.push({ kind: 'penalty', id: p.id, label: p.label, xp: p.xp });
  return out;
}

// Simple scoring: prefix match beats substring match, label beats id.
function _score(item, q) {
  const L = item.label.toLowerCase();
  const I = item.id.toLowerCase();
  if (L.startsWith(q)) return 100 - (L.length - q.length);
  if (I.startsWith(q)) return 90  - (I.length - q.length);
  if (L.includes(q))   return 60  - (L.indexOf(q));
  if (I.includes(q))   return 50  - (I.indexOf(q));
  return -1;
}

function renderQuickLog() {
  const host = document.getElementById('quickLog');
  if (!host) return;

  host.innerHTML = `
    <div class="quicklog">
      <div class="quicklog-head">
        <span class="quicklog-cue">➜</span>
        <input type="text" id="qlInput" autocomplete="off" spellcheck="false"
               placeholder="Type to log — e.g. &quot;workout&quot;, &quot;focus&quot;, &quot;rule&quot;…">
      </div>
      <div class="quicklog-hint tiny">↑ ↓ to pick · Enter to log · Esc to clear</div>
      <div class="quicklog-suggestions" id="qlSug" role="listbox"></div>
    </div>
  `;

  const inp  = document.getElementById('qlInput');
  const sug  = document.getElementById('qlSug');
  const all  = allLoggableActions();
  let filtered = all.slice();
  let active = 0;

  function renderList() {
    sug.innerHTML = filtered.slice(0, 8).map((i, idx) => `
      <button type="button" class="ql-sug ${idx === active ? 'is-active' : ''}"
              data-idx="${idx}" role="option" aria-selected="${idx === active}">
        <span class="ql-kind ql-kind-${i.kind}">${i.kind}</span>
        <span class="ql-label">${i.label}</span>
        <span class="ql-xp ${i.xp < 0 ? 'is-neg' : ''}">${i.xp > 0 ? '+' : ''}${i.xp}</span>
      </button>
    `).join('');

    sug.querySelectorAll('.ql-sug').forEach(btn => {
      btn.addEventListener('mouseover', () => setActive(parseInt(btn.dataset.idx, 10)));
      btn.addEventListener('click', () => logActive());
    });
  }

  function update(q) {
    const qt = (q || '').trim().toLowerCase();
    if (!qt) {
      filtered = all.slice();
    } else {
      const scored = all.map(i => ({ i, s: _score(i, qt) })).filter(x => x.s >= 0);
      scored.sort((a, b) => b.s - a.s);
      filtered = scored.map(x => x.i);
    }
    active = 0;
    renderList();
  }

  function setActive(idx) {
    active = Math.max(0, Math.min(filtered.length - 1, idx));
    sug.querySelectorAll('.ql-sug').forEach((el, i) => {
      el.classList.toggle('is-active', i === active);
      el.setAttribute('aria-selected', i === active);
    });
  }

  function logActive() {
    const it = filtered[active];
    if (!it) return;
    if (it.kind === 'daily')   performDaily(it.id);
    else if (it.kind === 'bonus')   performBonus(it.id);
    else if (it.kind === 'penalty') performPenalty(it.id);
    inp.value = '';
    update('');
    inp.focus();
  }

  inp.addEventListener('input', () => update(inp.value));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter')     { e.preventDefault(); logActive(); }
    else if (e.key === 'Escape')    { inp.value = ''; update(''); }
  });

  update('');
}
