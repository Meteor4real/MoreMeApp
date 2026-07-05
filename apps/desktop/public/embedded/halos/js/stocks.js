/* ═══════════════════════════════════════════════
   HALOS STOCKS — Azulbright Exchange (AZX)
   Full simulated trading platform: candlestick charts,
   indicators, order entry, portfolio, alerts, news.
   All companies are canon Cosmos Crew universe entities.
   ═══════════════════════════════════════════════ */
'use strict';

/* ──────── CANON COMPANIES ──────── */
const STK_COMPANIES = [
  { t:'SATN', n:'S.A.T.U.R.N. Industries',     s:'Aerospace / R&D',    base:842.50,  vol:0.012, ceo:'Dr. Vex Halloran',      emp:'48,200',   founded:'4988 AZ', desc:'Manufacturer of S.A.T.U.R.N. exo-suits and prime contractor for S.P.A.C.E. life-support systems. Headquartered on Desolarato.' },
  { t:'CYPR', n:'Cyber Pyramid Holdings',      s:'Defense / Shielding', base:1284.10, vol:0.008, ceo:'Director Anaris',       emp:'112,400',  founded:'4901 AZ', desc:'Operator of the planetary shield array protecting Antrosa. Government-linked, lowest-volatility blue chip on the AZX.' },
  { t:'NTRH', n:'Nova Terris Realty Group',    s:'Real Estate',         base:418.75,  vol:0.014, ceo:'Lyra Sundeck',          emp:'62,900',   founded:'4920 AZ', desc:'Owns and operates the majority of commercial space in the Nova Terris megacity. Famously survived three sea-creature breaches.' },
  { t:'ASTX', n:'Astralex Aerospace',          s:'Aerospace',           base:967.20,  vol:0.018, ceo:'Cmdr. Theo Vance',      emp:'31,700',   founded:'5012 AZ', desc:'Civilian arm of the Astralex Division. Builds the Star Chaser-class long-haul cruiser and licensed jump drives.' },
  { t:'DSLM', n:'Desolarato Mining Co.',       s:'Materials / Mining',  base:212.40,  vol:0.022, ceo:'Old Bram Kettle',       emp:'184,000',  founded:'4877 AZ', desc:'Largest operator on Desolarato. Extracts heavy isotopes and rare earths from the planet\'s scorched crust. Volatile, cyclical.' },
  { t:'SHLX', n:'Sharled Exchange Trust',      s:'Financials',          base:558.30,  vol:0.010, ceo:'Madame Orelin',         emp:'8,400',    founded:'4942 AZ', desc:'Operates the Sharled trader\'s market and clears every DMD transaction in the system. Levies 0.6% on all trades.' },
  { t:'VLMD', n:'Velmoria Defense Systems',    s:'Defense',             base:1098.60, vol:0.011, ceo:'Marshal Korr Vex',      emp:'94,300',   founded:'4955 AZ', desc:'Sole supplier of armor and ordnance to the S.P.A.C.E. War Division. Backlog runs 14 quarters deep.' },
  { t:'STOR', n:'Space Tree Orbital',          s:'Infrastructure',      base:621.80,  vol:0.009, ceo:'Engineer Halix Pell',   emp:'19,800',   founded:'4998 AZ', desc:'Owns and operates the Space Tree station between Desolarato and Sharled — 44 elevators, 412k residents.' },
  { t:'DMDX', n:'DMD Extraction Ltd.',         s:'Materials / DMD',     base:3284.00, vol:0.020, ceo:'Sera Owen-821N',        emp:'12,100',   founded:'5018 AZ', desc:'Mines Dark Matter Diamonds from the Owen-821N seam. The most expensive listed equity on the AZX.' },
  { t:'HLOS', n:'HALOS Systems Group',         s:'Tech / AI',           base:1742.30, vol:0.013, ceo:'(autonomous board)',    emp:'2,100',    founded:'5021 AZ', desc:'Self-managing AI systems integrator. Powers Cybertanks, Cybercopters, and most fleet-grade autonomy.' },
  { t:'CBTM', n:'Cybertech Motors',            s:'Vehicles',            base:489.10,  vol:0.016, ceo:'Rax Driveline',         emp:'78,200',   founded:'4970 AZ', desc:'Builds the Cybertank ($94M), Cybercopter ($108M), Cyberspeeder ($21.5M), and Cyberbike ($16.3M) lines.' },
  { t:'ANDM', n:'Andromadean Heritage Co.',    s:'Cultural / Tourism',  base:174.20,  vol:0.015, ceo:'Elder Vellis-Tor',      emp:'5,800',    founded:'5005 AZ', desc:'Custodian of pre-S.P.A.C.E. Andromadean ruins and cultural sites. Receives a fixed annual grant from S.P.A.C.E.' },
  { t:'RFLN', n:'Riftline Transport',          s:'Logistics',           base:702.40,  vol:0.019, ceo:'Pilot-Major Echo',      emp:'24,600',   founded:'4988 AZ', desc:'Only licensed jump-courier service. Moves cargo through stable rifts; revenue tied to dimensional weather.' },
  { t:'GNBR', n:'Genesis Bio-Research',        s:'Biotech',             base:356.80,  vol:0.017, ceo:'Dr. Mira Vossen',       emp:'14,200',   founded:'5009 AZ', desc:'Genesis Division\'s commercial spin-off. Discovered 1,200+ new microbes in the Desolarato ice moon core.' },
  { t:'HRZN', n:'Horizon Energy',              s:'Utilities',           base:284.50,  vol:0.009, ceo:'Cassia Wattline',       emp:'46,000',   founded:'4933 AZ', desc:'Operates the Dyson swarm power tap. Distributes ~38% of Azulbright\'s captured solar output.' },
  { t:'CPHR', n:'Cipher Cryptographics',       s:'Tech / Security',     base:912.10,  vol:0.014, ceo:'Agent Null',            emp:'3,200',    founded:'5001 AZ', desc:'Cipher Division spin-off. Provides quantum-locked comms for half the system. Always under audit, never indicted.' },
  { t:'SLRS', n:'Solaris Power Co.',           s:'Utilities',           base:198.30,  vol:0.011, ceo:'Helia Brand',           emp:'22,500',   founded:'4945 AZ', desc:'Direct competitor to Horizon. Operates the older sun-mining stations closer to Azulbright\'s photosphere.' },
  { t:'PNEER', n:'Pioneer Freight',            s:'Logistics',           base:142.60,  vol:0.018, ceo:'Captain Drell Bask',    emp:'38,900',   founded:'4961 AZ', desc:'Sub-light cargo runner. Slower than Riftline but cheaper. Competes hard on the Sharled–Antrosa lane.' },
  { t:'CHRN', n:'Chronicle Media Group',       s:'Media',               base:78.40,   vol:0.020, ceo:'Anchor Vey Sol',        emp:'9,400',    founded:'4988 AZ', desc:'Operates the Chronicle newswire, the only system-wide outlet that covers all four planets in real time.' },
  { t:'HYPL', n:'Hyperball League Inc.',       s:'Sports / Ent.',       base:124.80,  vol:0.025, ceo:'Commissioner Halix',    emp:'2,400',    founded:'4992 AZ', desc:'Operator of the eight-team Hyperball League. Most volatile name on the board — moves on every game result.' },
  { t:'METR', n:'Roetem Enterprises',          s:'Conglomerate',        base:5984.00, vol:0.007, ceo:'Roetem (S-rank)',       emp:'—',        founded:'5024 AZ', desc:'Personal holding company of Roetem (Astralex Division). Diversified across all four planets. Highest-priced share on the AZX. The Pact applies.' },
  /* ── 15 additional AZX-listed companies ── */
  { t:'NTPD', n:'Nova Terris Police Dept. Inc.',s:'Public Safety',      base:312.40,  vol:0.008, ceo:'Chief Maris Dov',       emp:'49,100',   founded:'4912 AZ', desc:'Publicly traded operational arm of the NTPD. Operates Nova Terris patrol craft, seawall defense, and the sea-creature rapid response fleet.' },
  { t:'SPHR', n:'Sharled Hotel & Resort',      s:'Hospitality',         base:228.60,  vol:0.013, ceo:'Luxe Calinda',          emp:'31,200',   founded:'4966 AZ', desc:'Operates the famous Space Hotel chain above Sharled and the orbital resort strip. Occupancy rarely drops below 91%.' },
  { t:'VSTR', n:'Velmoria Strike Corp',        s:'Defense Contractor',  base:844.20,  vol:0.017, ceo:'Col. Haris Drenn',      emp:'28,600',   founded:'4972 AZ', desc:'Sub-contractor to Velmoria Defense Systems. Specializes in precision munitions and cybertank field upgrades.' },
  { t:'HTRL', n:'Heart of the Void Labs',      s:'Fringe Research',     base:88.10,   vol:0.032, ceo:'Dr. Nox Ariss',         emp:'1,400',    founded:'5019 AZ', desc:'Only certified private lab studying Heart of the Void containment tech. Extremely high risk, extremely high reward.' },
  { t:'CYWG', n:'Cybercopter Wing Ind.',       s:'Aerospace / MFG',     base:614.90,  vol:0.015, ceo:'Hessa Lorne',           emp:'22,800',   founded:'4981 AZ', desc:'Manufactures Cybercopter airframes and rotorpacks under license from Cybertech Motors. Core supplier to S.P.A.C.E.' },
  { t:'DSLR', n:'Desolarato Launch Services',  s:'Launch / Cargo',      base:174.80,  vol:0.021, ceo:'Vera Igniss',           emp:'8,900',    founded:'5002 AZ', desc:'Operates the only certified heavy-lift launchpad on Desolarato. Moves 2.1M tonnes of mining ore per Azulbright year.' },
  { t:'ANTR', n:'Antrosa Terraforming Co.',    s:'Infrastructure',      base:296.30,  vol:0.012, ceo:'Geomancer Telos',       emp:'41,700',   founded:'4890 AZ', desc:'Built the Nova Terris seawall and riverway network. Currently contracted to stabilize three coastal sectors.' },
  { t:'HPBL', n:'Hyperball Properties Ltd.',   s:'Sports Real Estate',  base:188.50,  vol:0.016, ceo:'Arch Primen',           emp:'3,800',    founded:'5003 AZ', desc:'Owns and operates all eight Hyperball League stadiums and the championship arena on Antrosa\'s south bank.' },
  { t:'BRKX', n:'B-792 Research Exchange',     s:'Fringe / Speculative',base:42.30,   vol:0.045, ceo:'(classified)',          emp:'unknown',  founded:'5023 AZ', desc:'Fringe-market entity studying rift phenomena near B-792. Heavily restricted; only Cipher-cleared investors may hold.' },
  { t:'RFTP', n:'Rift Transit Partners',        s:'Logistics / Rift',   base:528.70,  vol:0.023, ceo:'Captain Selis Vane',    emp:'17,400',   founded:'4995 AZ', desc:'Competitors to Riftline. Uses older Class-II rift passages considered too unstable for government use. Risky but cheap.' },
  { t:'ACAD', n:'Astralex Cadet Academy',      s:'Education',           base:66.20,   vol:0.010, ceo:'Cmdr. Petra Koss',      emp:'4,200',    founded:'5008 AZ', desc:'Operates the official S.P.A.C.E. cadet training program across three campuses. Revenue from government tuition grants.' },
  { t:'GLXY', n:'Galactic Survey Group',       s:'Exploration',         base:394.10,  vol:0.024, ceo:'Survey-Lead Wen Alra',  emp:'9,100',    founded:'5011 AZ', desc:'Maps uncharted sectors beyond the Azulbright system. Revenue comes from exclusive survey rights sold to Pioneer Division.' },
  { t:'QNTM', n:'Quantum Sciences Corp.',      s:'Deep Tech / R&D',     base:1122.80, vol:0.019, ceo:'Dr. Yessa Prinn',       emp:'6,700',    founded:'5006 AZ', desc:'Develops entanglement-based communication relays and quantum-lock encryption modules. Patents expire in 5031 AZ.' },
  { t:'MDLX', n:'Multiversal Hub Authority',   s:'Infrastructure',      base:748.90,  vol:0.010, ceo:'Director Omak',         emp:'52,000',   founded:'4944 AZ', desc:'Operates the Multiversal Hub\'s transit floors, diplomatic suites, and dimensional gate array. Quasi-governmental status.' },
  { t:'WTRM', n:'Watermoon Reserves Ltd.',     s:'Resources / Utilities',base:108.40, vol:0.013, ceo:'Aqua-Chief Sirel',      emp:'11,800',   founded:'4958 AZ', desc:'Controls the water mining rights on Sharled\'s second moon. Supplies 84% of the system\'s processed drinking water.' },
];

/* ──────── STATE ──────── */
// Market clock: one simulated trading day passes every 20 real minutes.
// The 1d series grows by one bar on each rollover so daily history is
// actually logged instead of sitting at a fixed length forever.
const STK_DAY_MS = 20 * 60 * 1000;      // real-time length of one sim day
const STK_TICK_MS = 4000;               // how often prices update (ms)

const STK_STATE = {
  tick: 0,
  prices: {},      // ticker -> { last, prevClose, dayOpen, dayHigh, dayLow, volume }
  bars: {},        // ticker -> { '1d': [...] }  (all TF views derived by aggregating daily bars)
  selected: 'METR',
  tf: '3mo',
  zoom: 1.0,       // chart zoom level: >1 = fewer bars (zoomed in), <1 = more bars (zoomed out)
  ind: { sma: true, ema: false, bb: false, vol: true, rsi: false },
  orderSide: 'buy',
  portfolio: { cash: 1000000, positions: {} },  // 1M starting credits
  orders: [],
  alerts: [],
  news: [],
  interval: null,
  dayStartMs: 0,   // wall-clock ms when the current sim day opened
  dayCount: 0,     // how many sim days have rolled over this session
};

/* ──────── PERSISTENCE ──────── */
function stkPayload() {
  return {
    portfolio: STK_STATE.portfolio,
    orders: STK_STATE.orders.slice(-50),
    alerts: STK_STATE.alerts,
    selected: STK_STATE.selected,
    tf: STK_STATE.tf,
    ind: STK_STATE.ind,
    dayCount: STK_STATE.dayCount,
    dayStartMs: STK_STATE.dayStartMs,
    daily: Object.fromEntries(
      STK_COMPANIES.map(co => [co.t, (STK_STATE.bars[co.t] || {})['1d'] || []])
    ),
  };
}
function stkSave() {
  try { localStorage.setItem('halos_stocks', JSON.stringify(stkPayload())); } catch {}
  // Cloud sync per-user (portfolio + orders are personal, not shared across all accounts)
  stkCloudSave();
}
let _stkCloudSaveTimer = null;
function stkCloudSave() {
  // Debounce cloud writes — stocks tick every ~2s, only push every 15s max
  if (_stkCloudSaveTimer) return;
  _stkCloudSaveTimer = setTimeout(async () => {
    _stkCloudSaveTimer = null;
    try {
      if (typeof SESSION === 'undefined' || !SESSION.email || !SESSION.code) return;
      const value = JSON.stringify(stkPayload());
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', email: SESSION.email, code: SESSION.code, key: 'stocks', value }),
      });
    } catch {}
  }, 15000);
}
async function stkCloudLoad() {
  try {
    if (typeof SESSION === 'undefined' || !SESSION.email || !SESSION.code) return;
    const r = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_all', email: SESSION.email, code: SESSION.code }),
    });
    if (!r.ok) return;
    const data = await r.json();
    const raw = data.stocks;
    if (!raw) return;
    const d = JSON.parse(raw);
    // Only apply cloud data if it has more orders than local (cloud wins on richer data)
    const localOrders = STK_STATE.orders.length;
    const cloudOrders = (d.orders || []).length;
    if (cloudOrders > localOrders || (d.portfolio && d.portfolio.cash !== 1000000 && STK_STATE.portfolio.cash === 1000000)) {
      if (d.portfolio) STK_STATE.portfolio = d.portfolio;
      if (d.orders) STK_STATE.orders = d.orders;
      if (d.alerts) STK_STATE.alerts = d.alerts;
      if (d.selected) STK_STATE.selected = d.selected;
      if (d.tf && STK_TF_CONFIG[d.tf]) STK_STATE.tf = d.tf;
      if (d.ind) Object.assign(STK_STATE.ind, d.ind);
      if (typeof d.dayCount === 'number') STK_STATE.dayCount = d.dayCount;
      if (typeof d.dayStartMs === 'number') STK_STATE.dayStartMs = d.dayStartMs;
      if (d.daily) STK_STATE._savedDaily = d.daily;
      try { stkRenderAll(); } catch {}
    }
  } catch {}
}
function stkLoad() {
  try {
    const s = localStorage.getItem('halos_stocks');
    if (!s) return;
    const d = JSON.parse(s);
    if (d.portfolio) STK_STATE.portfolio = d.portfolio;
    if (d.orders) STK_STATE.orders = d.orders;
    if (d.alerts) STK_STATE.alerts = d.alerts;
    if (d.selected) STK_STATE.selected = d.selected;
    if (d.tf && STK_TF_CONFIG[d.tf]) STK_STATE.tf = d.tf;
    if (d.ind) Object.assign(STK_STATE.ind, d.ind);
    if (typeof d.dayCount === 'number') STK_STATE.dayCount = d.dayCount;
    if (typeof d.dayStartMs === 'number') STK_STATE.dayStartMs = d.dayStartMs;
    if (d.daily) STK_STATE._savedDaily = d.daily;
  } catch {}
}

/* ──────── UTILS ──────── */
function stkRand() { return Math.random(); }
function stkRandN() { // approx normal via central limit
  let s = 0;
  for (let i = 0; i < 6; i++) s += Math.random();
  return (s - 3) / 1.5;
}
function stkFmt(n, dec) { dec = dec == null ? 2 : dec; return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function stkFmtBig(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}
function stkCo(ticker) { return STK_COMPANIES.find(c => c.t === ticker); }

/* ──────── PRICE SIM ENGINE ──────── */
// Generate historical daily bars (count = number of sim days back from now)
function stkGenBars(co, tf, count) {
  const bars = [];
  let price = co.base * (0.85 + Math.random() * 0.3);
  const now = Date.now();
  const SEC_PER_DAY = 86400;
  // All timeframes share the same daily bar resolution in simulation
  const sec = SEC_PER_DAY;
  for (let i = count; i > 0; i--) {
    const t = now - i * sec * 1000;
    const o = price;
    const drift = (co.base - price) * 0.015;
    const noise = stkRandN() * co.vol * price * 0.6;
    const c = Math.max(0.5, o + drift + noise);
    const range = Math.abs(c - o) + Math.abs(stkRandN()) * co.vol * price * 0.3;
    const h = Math.max(o, c) + range * 0.4;
    const l = Math.min(o, c) - range * 0.4;
    const v = Math.floor(50000 + Math.random() * 200000 + Math.abs(c - o) / o * 800000);
    bars.push({ t, o, h, l, c: Math.max(0.5, c), v });
    price = c;
  }
  return bars;
}

// Aggregate daily bars into larger candles (for 6mo/1y/10y views)
function stkAggregateBars(bars, groupSize) {
  const out = [];
  for (let i = 0; i < bars.length; i += groupSize) {
    const slice = bars.slice(i, i + groupSize);
    if (!slice.length) continue;
    out.push({
      t: slice[0].t,
      o: slice[0].o,
      h: Math.max(...slice.map(b => b.h)),
      l: Math.min(...slice.map(b => b.l)),
      c: slice[slice.length - 1].c,
      v: slice.reduce((s, b) => s + b.v, 0),
    });
  }
  return out;
}

// TF config: how many daily bars to slice and how many to group per candle
const STK_TF_CONFIG = {
  '1w':  { days: 7,    group: 1  },
  '1mo': { days: 30,   group: 1  },
  '3mo': { days: 90,   group: 1  },
  '6mo': { days: 180,  group: 3  },
  '1y':  { days: 365,  group: 5  },
  '10y': { days: 1825, group: 25 },
};

function stkInitMarket() {
  const savedDaily = STK_STATE._savedDaily || null;
  STK_COMPANIES.forEach(co => {
    // Restore logged daily bars if available; otherwise seed with 1825 days
    // (5 simulated years) so every timeframe view has rich history from the start.
    let daily;
    if (savedDaily && Array.isArray(savedDaily[co.t]) && savedDaily[co.t].length >= 30) {
      daily = savedDaily[co.t];
      // Pad with more history if less than 1825 days
      if (daily.length < 1825) {
        const extra = stkGenBars(co, '1d', 1825 - daily.length);
        daily = extra.concat(daily);
      }
    } else {
      daily = stkGenBars(co, '1d', 1825);
    }
    STK_STATE.bars[co.t] = { '1d': daily };
    const dArr = daily;
    const lastBar = dArr[dArr.length - 1];
    STK_STATE.prices[co.t] = {
      last: lastBar.c,
      prevClose: dArr[dArr.length - 2]?.c ?? lastBar.o,
      dayOpen: lastBar.o,
      dayHigh: lastBar.h,
      dayLow: lastBar.l,
      volume: lastBar.v,
    };
  });
  STK_STATE._savedDaily = null;
}

// One simulation tick — updates the live close on the daily bar for every ticker.
function stkTickMarket() {
  STK_STATE.tick++;
  const now = Date.now();
  STK_COMPANIES.forEach(co => {
    const px = STK_STATE.prices[co.t];
    if (!px) return;
    const drift = (co.base - px.last) * 0.005;
    const noise = stkRandN() * co.vol * px.last * 0.07;
    const newPx = Math.max(0.5, px.last + drift + noise);
    px.last = newPx;
    if (newPx > px.dayHigh) px.dayHigh = newPx;
    if (newPx < px.dayLow) px.dayLow = newPx;

    // Update the last daily bar's live close
    const arr = STK_STATE.bars[co.t]['1d'];
    const last = arr[arr.length - 1];
    last.c = newPx;
    if (newPx > last.h) last.h = newPx;
    if (newPx < last.l) last.l = newPx;
    last.v += Math.floor(400 + Math.random() * 1200);
  });

  // Day rollover — every STK_DAY_MS of real time, finalize the current
  // '1d' bar for every ticker and push a brand-new one. This is how the
  // daily history actually grows session-over-session.
  if (STK_STATE.dayStartMs && now - STK_STATE.dayStartMs >= STK_DAY_MS) {
    stkRollNewDay(now);
    stkSave();
  }

  // News roughly every 30 ticks (~2 min) and only 40% of the time, so
  // the headline feed isn't a firehose.
  if (STK_STATE.tick % 30 === 0 && Math.random() < 0.4) stkGenNews();

  // Check alerts
  stkCheckAlerts();
}

// Finalize every ticker's current '1d' bar and start a fresh one.
// Also bumps prevClose so % change resets against the prior session.
function stkRollNewDay(now) {
  STK_STATE.dayStartMs = now;
  STK_STATE.dayCount++;
  STK_COMPANIES.forEach(co => {
    const tfs = STK_STATE.bars[co.t];
    if (!tfs || !tfs['1d']) return;
    const arr1d = tfs['1d'];
    const prev = arr1d[arr1d.length - 1];
    const px = STK_STATE.prices[co.t];
    if (!px) return;
    // The previous day's close becomes the new prevClose baseline.
    px.prevClose = prev.c;
    px.dayOpen = prev.c;
    px.dayHigh = prev.c;
    px.dayLow = prev.c;
    // Push a new day bar starting at the previous close.
    arr1d.push({ t: now, o: prev.c, h: prev.c, l: prev.c, c: prev.c, v: 0 });
    // Keep a generous backlog — days accumulate indefinitely but we
    // cap at 365 sim days per ticker so memory doesn't creep.
    if (arr1d.length > 365) arr1d.shift();
  });
}

/* ──────── NEWS GENERATOR ──────── */
const STK_NEWS_BULL = [
  '%s reports record quarterly earnings, beats consensus by 14%',
  '%s wins exclusive S.P.A.C.E. supply contract',
  '%s signs joint venture with Astralex Division',
  '%s announces buyback program worth 200M credits',
  '%s discovers new high-yield deposit on Desolarato',
  '%s receives upgraded credit rating from Sharled Trust',
  '%s expands fleet by 14 vessels',
  '%s launches new flagship product line',
  '%s clears regulatory review on Antrosa',
  '%s reports breakthrough in DMD refinement',
  '%s lands multi-year contract with the War Division',
  '%s opens new operations hub on the Space Tree',
  '%s patents next-gen quantum lock — analysts call it transformative',
  '%s announces 18% workforce expansion',
  '%s acquires controlling stake in mid-cap rival',
  '%s reports record uptime on its primary facility',
  '%s unveils flagship product at the Sharled Expo',
  '%s posts surprise dividend for shareholders',
  '%s wins Genesis Division research grant',
  '%s reports fastest jump-courier turnaround in AZX history',
  '%s receives strong buy rating from three major desks',
  '%s announces partnership with Riftline Transport',
  '%s expands footprint into Velmoria garrison contracts',
  '%s reports successful field trial — orders surge',
  '%s discloses unexpected DMD reserve discovery',
  '%s appointed primary contractor on Cyber Pyramid retrofit',
  '%s signs ten-year exclusive with Astralex Aerospace',
  '%s files patent on novel rift-stabilization technique',
  '%s books largest single order in company history',
  '%s confirms profitability ahead of analyst forecasts',
  '%s opens new R&D wing at S.A.T.U.R.N. Labs',
  '%s wins contract to supply Hyperball League stadiums',
  '%s reports 22% YoY revenue growth on Sharled rev surge',
  '%s upgraded to A+ credit by Sharled Exchange Trust',
  '%s clears NTPD safety audit with zero infractions',
  '%s reports breakthrough in deep-rift telemetry',
  '%s announces orbital infrastructure expansion',
  '%s confirms successful test of Class-III drive prototype',
  '%s announces strategic merger talks with smaller competitor',
  '%s reports doubling of margins in mining operations',
  '%s receives commendation from S.P.A.C.E. War Division',
  '%s extends supply line to all four planets',
  '%s announces secured Multiversal Hub berth lease',
  '%s reports first-ever profitable quarter on B-792 ops',
];
const STK_NEWS_BEAR = [
  '%s misses earnings — guidance lowered for next quarter',
  '%s under investigation by Cipher Division',
  '%s recalls flagship product after Velmoria field test',
  '%s loses key contract to rival',
  '%s reports fatal incident at Desolarato facility',
  '%s downgraded by Sharled Trust analysts',
  '%s warns of supply disruption from rift weather',
  '%s sees insider sell-off',
  '%s misses production targets for third quarter',
  '%s shares halt briefly on volatility circuit-breaker',
  '%s announces unexpected CEO departure',
  '%s flagged in NTPD criminal review — shares slide',
  '%s warns of cost overruns on Velmoria contract',
  '%s reports labor strike at Desolarato facility',
  '%s shares plunge on rift weather disruption alert',
  '%s loses primary supplier — production frozen',
  '%s under audit by Cipher Cryptographics review board',
  '%s announces unexpected restatement of last 4 quarters',
  '%s warns shareholders of impending dividend cut',
  '%s reports critical equipment failure — outlook bleak',
  '%s loses Multiversal Hub berthing rights',
  '%s warns of upcoming write-down on Antrosa assets',
  '%s placed on credit watch by Sharled Trust',
  '%s sees board resignation amid fraud probe',
  '%s halts Hyperball League sponsorship — shares drop',
  '%s reports unauthorized DMD shipment seizure',
  '%s warns of B-792 contamination at remote site',
  '%s sees mass departure of senior engineering staff',
  '%s reports fleet grounding — Riftline weather risk',
  '%s loses key government contract to rival firm',
  '%s announces unexpected layoffs at Sharled HQ',
  '%s reports unrecovered cargo from rift-pass attempt',
  '%s under Cipher Division audit — books frozen',
  '%s warns of indefinite delay on flagship project',
  '%s posts widening losses for fourth straight quarter',
  '%s reports critical shield failure at primary site',
  '%s loses major customer to Velmoria Strike Corp',
  '%s warns Genesis grant under review',
  '%s sees Hyperball League sponsorship withdrawn',
  '%s reports critical incident on Cybertank assembly line',
  '%s loses Antrosa city operations license',
  '%s sees stock removed from primary AZX index',
  '%s announces forensic audit by Sharled Trust',
  '%s reports B-792 monitoring station offline',
];
function stkGenNews() {
  const co = STK_COMPANIES[Math.floor(Math.random() * STK_COMPANIES.length)];
  const bull = Math.random() < 0.55;
  const tpl = bull ? STK_NEWS_BULL : STK_NEWS_BEAR;
  const headline = tpl[Math.floor(Math.random() * tpl.length)].replace('%s', co.n);
  STK_STATE.news.unshift({ t: Date.now(), sym: co.t, headline, kind: bull ? 'bull' : 'bear' });
  if (STK_STATE.news.length > 60) STK_STATE.news.pop();
  // Tiny price nudge
  const px = STK_STATE.prices[co.t];
  if (px) px.last *= (bull ? 1 + Math.random() * 0.006 : 1 - Math.random() * 0.006);
}

function stkCheckAlerts() {
  STK_STATE.alerts.forEach(a => {
    if (a.triggered) return;
    const px = STK_STATE.prices[a.sym];
    if (!px) return;
    if ((a.dir === 'above' && px.last >= a.px) || (a.dir === 'below' && px.last <= a.px)) {
      a.triggered = true;
      STK_STATE.news.unshift({ t: Date.now(), sym: a.sym, headline: `ALERT: ${a.sym} crossed ${a.dir} ${stkFmt(a.px)}`, kind: 'bull' });
      stkSave();
    }
  });
}

/* ──────── INDICATORS ──────── */
function stkSMA(closes, period) {
  const out = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}
function stkEMA(closes, period) {
  const out = new Array(closes.length).fill(null);
  const k = 2 / (period + 1);
  let ema = closes[0];
  out[0] = ema;
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}
function stkBB(closes, period, mult) {
  mult = mult || 2;
  const sma = stkSMA(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (closes[j] - sma[i]) ** 2;
    const sd = Math.sqrt(sum / period);
    upper[i] = sma[i] + mult * sd;
    lower[i] = sma[i] - mult * sd;
  }
  return { mid: sma, upper, lower };
}
function stkRSI(closes, period) {
  period = period || 14;
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  out[period] = 100 - 100 / (1 + (avgL ? avgG / avgL : 100));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d >= 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out[i] = 100 - 100 / (1 + (avgL ? avgG / avgL : 100));
  }
  return out;
}

/* ──────── CHART RENDER ──────── */
function stkDrawChart() {
  const canvas = document.getElementById('stk-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cssW, H = cssH;
  ctx.clearRect(0, 0, W, H);

  const sym = STK_STATE.selected;
  const tf = STK_STATE.tf;
  const allDaily = (STK_STATE.bars[sym] || {})['1d'] || [];
  if (!allDaily.length) return;
  const cfg = STK_TF_CONFIG[tf] || STK_TF_CONFIG['3mo'];
  const sliced = allDaily.slice(-cfg.days);
  const aggregated = cfg.group > 1 ? stkAggregateBars(sliced, cfg.group) : sliced;
  // Apply zoom: zoom>1 shows fewer bars (zoomed in), zoom<1 shows more (zoomed out)
  const zoomCount = Math.max(8, Math.round(aggregated.length / STK_STATE.zoom));
  const bars = aggregated.slice(-Math.min(zoomCount, aggregated.length));
  const visibleN = bars.length;
  if (!bars.length) return;

  // Layout
  const padL = 8, padR = 60, padT = 8, padB = 18;
  const showVol = STK_STATE.ind.vol;
  const showRSI = STK_STATE.ind.rsi;
  const subH = (showVol ? 50 : 0) + (showRSI ? 50 : 0);
  const priceH = H - padT - padB - subH;
  const chartW = W - padL - padR;

  // Price range (with indicators considered)
  const closes = bars.map(b => b.c);
  let minP = Math.min(...bars.map(b => b.l));
  let maxP = Math.max(...bars.map(b => b.h));
  if (STK_STATE.ind.bb) {
    const bb = stkBB(closes, 20);
    bb.upper.forEach(v => { if (v != null && v > maxP) maxP = v; });
    bb.lower.forEach(v => { if (v != null && v < minP) minP = v; });
  }
  const padP = (maxP - minP) * 0.08 || 1;
  minP -= padP; maxP += padP;
  const range = maxP - minP || 1;
  const yToPx = p => padT + (1 - (p - minP) / range) * priceH;
  const barW = chartW / visibleN;
  const bodyW = Math.max(2, barW * 0.62);

  // Background grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i <= 5; i++) {
    const y = padT + (priceH / 5) * i;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
    const p = maxP - (range / 5) * i;
    ctx.fillText(p.toFixed(2), padL + chartW + 4, y + 3);
  }

  // Candles
  bars.forEach((b, i) => {
    const x = padL + i * barW + barW / 2;
    const up = b.c >= b.o;
    const color = up ? '#39ff14' : '#ff3b5c';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    // Wick
    ctx.beginPath();
    ctx.moveTo(x, yToPx(b.h));
    ctx.lineTo(x, yToPx(b.l));
    ctx.stroke();
    // Body
    const yO = yToPx(b.o), yC = yToPx(b.c);
    const top = Math.min(yO, yC), bot = Math.max(yO, yC);
    ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(1, bot - top));
  });

  // SMA(20)
  if (STK_STATE.ind.sma) {
    const sma = stkSMA(closes, 20);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    sma.forEach((v, i) => {
      if (v == null) return;
      const x = padL + i * barW + barW / 2;
      const y = yToPx(v);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  // EMA(12)
  if (STK_STATE.ind.ema) {
    const ema = stkEMA(closes, 12);
    ctx.strokeStyle = '#ffb800';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    ema.forEach((v, i) => {
      if (v == null) return;
      const x = padL + i * barW + barW / 2;
      const y = yToPx(v);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  // Bollinger
  if (STK_STATE.ind.bb) {
    const bb = stkBB(closes, 20);
    ['upper', 'lower'].forEach(k => {
      ctx.strokeStyle = 'rgba(124,63,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      bb[k].forEach((v, i) => {
        if (v == null) return;
        const x = padL + i * barW + barW / 2;
        const y = yToPx(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  // Sub-panels
  let subY = padT + priceH + 4;
  if (showVol) {
    const maxV = Math.max(...bars.map(b => b.v));
    bars.forEach((b, i) => {
      const x = padL + i * barW;
      const h = (b.v / maxV) * 44;
      ctx.fillStyle = b.c >= b.o ? 'rgba(57,255,20,0.5)' : 'rgba(255,59,92,0.5)';
      ctx.fillRect(x + 1, subY + (50 - h), bodyW, h);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('VOL', padL + 2, subY + 10);
    subY += 50;
  }
  if (showRSI) {
    const rsi = stkRSI(closes, 14);
    // Background bands
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.moveTo(padL, subY + 10); ctx.lineTo(padL + chartW, subY + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, subY + 40); ctx.lineTo(padL + chartW, subY + 40); ctx.stroke();
    ctx.strokeStyle = '#7c3fff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let started = false;
    rsi.forEach((v, i) => {
      if (v == null) return;
      const x = padL + i * barW + barW / 2;
      const y = subY + (1 - v / 100) * 50;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('RSI', padL + 2, subY + 10);
    ctx.fillText('70', padL + chartW + 4, subY + 13);
    ctx.fillText('30', padL + chartW + 4, subY + 43);
  }

  // Last price line
  const lastBar = bars[bars.length - 1];
  const lastY = yToPx(lastBar.c);
  ctx.strokeStyle = lastBar.c >= lastBar.o ? '#39ff14' : '#ff3b5c';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(padL, lastY); ctx.lineTo(padL + chartW, lastY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = lastBar.c >= lastBar.o ? '#39ff14' : '#ff3b5c';
  ctx.fillRect(padL + chartW, lastY - 7, 56, 14);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(stkFmt(lastBar.c), padL + chartW + 4, lastY + 3);
}

/* ──────── UI RENDER ──────── */
function stkEsc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function stkChgColor(n) { return n > 0 ? 'stk-up' : n < 0 ? 'stk-down' : 'stk-flat'; }
function stkChgArrow(n) { return n > 0 ? '▲' : n < 0 ? '▼' : '·'; }

function stkRenderTape() {
  const el = document.getElementById('stk-tape');
  if (!el) return;
  const items = STK_COMPANIES.map(co => {
    const px = STK_STATE.prices[co.t];
    if (!px) return '';
    const chg = px.last - px.prevClose;
    const pct = (chg / px.prevClose) * 100;
    const cls = stkChgColor(chg);
    return `<span class="stk-tape-item"><span class="stk-tape-sym">${co.t}</span><span class="stk-tape-px">${stkFmt(px.last)}</span><span class="${cls}">${stkChgArrow(chg)}${stkFmt(Math.abs(pct))}%</span></span>`;
  }).join('');
  el.innerHTML = `<div class="stk-tape-inner">${items}${items}</div>`;
}

function stkRenderWatchlist() {
  const el = document.getElementById('stk-watchlist');
  if (!el) return;
  el.innerHTML = STK_COMPANIES.map(co => {
    const px = STK_STATE.prices[co.t];
    if (!px) return '';
    const chg = px.last - px.prevClose;
    const pct = (chg / px.prevClose) * 100;
    const active = co.t === STK_STATE.selected ? 'active' : '';
    return `<div class="stk-wl-row ${active}" data-sym="${co.t}">
      <span class="stk-wl-sym">${co.t}</span>
      <span class="stk-wl-px">${stkFmt(px.last)}</span>
      <span class="stk-wl-chg ${stkChgColor(chg)}">${stkChgArrow(chg)}${stkFmt(Math.abs(pct))}%</span>
    </div>`;
  }).join('');
  el.querySelectorAll('.stk-wl-row').forEach(row => {
    row.addEventListener('click', () => stkSelect(row.dataset.sym));
  });
}

function stkRenderSymbolBar() {
  const el = document.getElementById('stk-symbol-bar');
  if (!el) return;
  const co = stkCo(STK_STATE.selected);
  const px = STK_STATE.prices[STK_STATE.selected];
  if (!co || !px) return;
  const chg = px.last - px.prevClose;
  const pct = (chg / px.prevClose) * 100;
  const cls = stkChgColor(chg);
  el.innerHTML = `
    <span class="stk-sb-sym">${co.t}</span>
    <span class="stk-sb-name">${stkEsc(co.n)}</span>
    <span class="stk-sb-px">${stkFmt(px.last)}</span>
    <span class="stk-sb-chg ${cls}">${stkChgArrow(chg)} ${stkFmt(chg)} (${stkFmt(pct)}%)</span>
    <span class="stk-sb-meta">
      <span>O ${stkFmt(px.dayOpen)}</span>
      <span>H ${stkFmt(px.dayHigh)}</span>
      <span>L ${stkFmt(px.dayLow)}</span>
      <span>VOL ${stkFmtBig(px.volume)}</span>
    </span>
  `;
}

function stkRenderCompany() {
  const el = document.getElementById('stk-company');
  if (!el) return;
  const co = stkCo(STK_STATE.selected);
  const px = STK_STATE.prices[STK_STATE.selected];
  if (!co || !px) return;
  const mcap = px.last * (parseFloat(String(co.emp).replace(/,/g, '')) || 10000) * 1000;
  el.innerHTML = `
    <div class="stk-co-name">${stkEsc(co.n)}</div>
    <div class="stk-co-sector">${stkEsc(co.s)}</div>
    <div class="stk-co-row"><span>CEO</span><span>${stkEsc(co.ceo)}</span></div>
    <div class="stk-co-row"><span>Employees</span><span>${stkEsc(co.emp)}</span></div>
    <div class="stk-co-row"><span>Founded</span><span>${stkEsc(co.founded)}</span></div>
    <div class="stk-co-row"><span>Mkt Cap</span><span>${stkFmtBig(mcap)} cr</span></div>
    <div style="margin-top:8px; opacity:0.85; font-size:0.62rem;">${stkEsc(co.desc)}</div>
  `;
}

function stkRenderPortfolio() {
  const sumEl = document.getElementById('stk-portfolio-summary');
  const posEl = document.getElementById('stk-positions');
  if (!sumEl || !posEl) return;
  let posValue = 0;
  let costBasis = 0;
  Object.entries(STK_STATE.portfolio.positions).forEach(([sym, pos]) => {
    const px = STK_STATE.prices[sym];
    if (!px) return;
    posValue += px.last * pos.qty;
    costBasis += pos.avgCost * pos.qty;
  });
  const totalEq = STK_STATE.portfolio.cash + posValue;
  const dayPL = posValue - costBasis;
  const dayPct = costBasis ? (dayPL / costBasis) * 100 : 0;
  sumEl.innerHTML = `
    <div class="stk-ps-row"><span>Net Liquidity</span><span>${stkFmt(totalEq)} cr</span></div>
    <div class="stk-ps-row"><span>Cash</span><span>${stkFmt(STK_STATE.portfolio.cash)} cr</span></div>
    <div class="stk-ps-row"><span>Positions</span><span>${stkFmt(posValue)} cr</span></div>
    <div class="stk-ps-row"><span>Open P/L</span><span class="${stkChgColor(dayPL)}">${stkChgArrow(dayPL)} ${stkFmt(Math.abs(dayPL))} (${stkFmt(dayPct)}%)</span></div>
  `;
  const positions = Object.entries(STK_STATE.portfolio.positions).filter(([_, p]) => p.qty > 0);
  if (!positions.length) {
    posEl.innerHTML = '<div style="color:var(--text3);font-size:0.65rem;font-family:var(--font-m);padding:6px;text-align:center;">No open positions</div>';
    return;
  }
  posEl.innerHTML = positions.map(([sym, pos]) => {
    const px = STK_STATE.prices[sym];
    if (!px) return '';
    const pl = (px.last - pos.avgCost) * pos.qty;
    const plPct = ((px.last / pos.avgCost) - 1) * 100;
    return `<div class="stk-pos-row" data-sym="${sym}">
      <span class="stk-pos-sym">${sym}</span>
      <span class="stk-pos-qty">${pos.qty}@${stkFmt(pos.avgCost)}</span>
      <span class="stk-pos-pl ${stkChgColor(pl)}">${stkChgArrow(pl)}${stkFmt(Math.abs(pl))} (${stkFmt(plPct)}%)</span>
    </div>`;
  }).join('');
  posEl.querySelectorAll('.stk-pos-row').forEach(r => r.addEventListener('click', () => stkSelect(r.dataset.sym)));
}

function stkRenderOrders() {
  const el = document.getElementById('stk-orders');
  if (!el) return;
  if (!STK_STATE.orders.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:0.62rem;font-family:var(--font-m);padding:6px;text-align:center;">No orders yet</div>';
    return;
  }
  el.innerHTML = STK_STATE.orders.slice().reverse().slice(0, 30).map(o => {
    const time = new Date(o.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    return `<div class="stk-order-row ${o.side}">${time} · ${o.side.toUpperCase()} ${o.qty} ${o.sym} @ ${stkFmt(o.fillPx)} <span style="opacity:0.6;">(${o.type})</span></div>`;
  }).join('');
}

function stkRenderAlerts() {
  const el = document.getElementById('stk-alerts');
  if (!el) return;
  if (!STK_STATE.alerts.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:0.62rem;font-family:var(--font-m);padding:6px;text-align:center;">No alerts set</div>';
    return;
  }
  el.innerHTML = STK_STATE.alerts.map((a, i) => `
    <div class="stk-alert-row ${a.triggered ? 'triggered' : ''}">
      <span>${a.sym} ${a.dir} ${stkFmt(a.px)}</span>
      <span class="stk-alert-x" data-i="${i}">✕</span>
    </div>
  `).join('');
  el.querySelectorAll('.stk-alert-x').forEach(x => x.addEventListener('click', () => {
    STK_STATE.alerts.splice(+x.dataset.i, 1);
    stkSave();
    stkRenderAlerts();
  }));
}

function stkRenderNews() {
  const el = document.getElementById('stk-news');
  if (!el) return;
  if (!STK_STATE.news.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:0.65rem;font-family:var(--font-m);padding:6px;">Newswire idle…</div>';
    return;
  }
  el.innerHTML = STK_STATE.news.slice(0, 25).map(n => {
    const time = new Date(n.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `<div class="stk-news-item ${n.kind}"><span class="stk-news-time">${time}</span><span class="stk-news-sym">${n.sym}</span>${stkEsc(n.headline)}</div>`;
  }).join('');
}

function stkRenderOrderForm() {
  document.getElementById('stk-order-sym').value = STK_STATE.selected;
  stkUpdateOrderCost();
}
function stkUpdateOrderCost() {
  const qty = +document.getElementById('stk-order-qty').value || 0;
  const px = STK_STATE.prices[STK_STATE.selected];
  if (!px) return;
  const type = document.getElementById('stk-order-type').value;
  const limitPxEl = document.getElementById('stk-order-limit');
  const usePx = (type === 'limit' && limitPxEl.value) ? +limitPxEl.value : px.last;
  document.getElementById('stk-order-cost').value = stkFmt(qty * usePx) + ' cr';
}

function stkRenderDeepDive() {
  const el = document.getElementById('stk-deep-dive');
  if (!el) return;
  const sym = STK_STATE.selected;
  const co = stkCo(sym);
  const px = STK_STATE.prices[sym];
  const daily = (STK_STATE.bars[sym] || {})['1d'] || [];
  if (!px || !co) { el.innerHTML = ''; return; }

  // 52-week window
  const w52 = daily.slice(-365);
  const hi52 = w52.length ? Math.max(...w52.map(b => b.h)) : px.last;
  const lo52 = w52.length ? Math.min(...w52.map(b => b.l)) : px.last;
  const avgVol = w52.length ? Math.round(w52.reduce((s, b) => s + (b.v || 0), 0) / w52.length) : px.volume;

  // Market cap: shares seeded per company from ticker+base for stable display
  const seed2 = sym.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const sharesM = 50_000_000 + (seed2 % 30) * 10_000_000 + Math.round(co.base * 80_000);
  const mcap = px.last * sharesM;
  // Synthetic P/E: 12-35 range, seeded from ticker
  const seed = sym.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pe = (12 + (seed % 24) + (px.last % 3)).toFixed(1);
  // Beta: 0.4-1.8 from vol
  const beta = (co.vol * 40).toFixed(2);

  const chg = px.last - px.prevClose;
  const dayRangePct = px.dayHigh ? ((px.dayHigh - px.dayLow) / px.dayLow * 100).toFixed(2) : '0.00';
  const w52pct = ((px.last - lo52) / (hi52 - lo52 + 0.001) * 100).toFixed(0);

  el.innerHTML = `
    <div class="stk-dd-grid">
      <div class="stk-dd-row"><span>52W High</span><b class="stk-up">${stkFmt(hi52)}</b></div>
      <div class="stk-dd-row"><span>52W Low</span><b class="stk-down">${stkFmt(lo52)}</b></div>
      <div class="stk-dd-row"><span>52W Position</span><b>${w52pct}%</b></div>
      <div class="stk-dd-row"><span>Market Cap</span><b>${stkFmtBig(mcap)} cr</b></div>
      <div class="stk-dd-row"><span>P/E Ratio</span><b>${pe}×</b></div>
      <div class="stk-dd-row"><span>Beta</span><b>${beta}</b></div>
      <div class="stk-dd-row"><span>Day Range</span><b>${px.dayLow ? stkFmt(px.dayLow) : '—'} – ${px.dayHigh ? stkFmt(px.dayHigh) : '—'}</b></div>
      <div class="stk-dd-row"><span>Day Swing</span><b>${dayRangePct}%</b></div>
      <div class="stk-dd-row"><span>Day Volume</span><b>${stkFmtBig(px.volume || 0)}</b></div>
      <div class="stk-dd-row"><span>Avg Volume</span><b>${stkFmtBig(avgVol)}</b></div>
      <div class="stk-dd-row"><span>Sector</span><b>${stkEsc(co.s)}</b></div>
      <div class="stk-dd-row"><span>CEO</span><b>${stkEsc(co.ceo)}</b></div>
    </div>
    <div class="stk-dd-bar-wrap" title="${w52pct}% of 52W range">
      <div class="stk-dd-bar-track"><div class="stk-dd-bar-fill" style="width:${w52pct}%"></div></div>
      <div class="stk-dd-bar-labels"><span>${stkFmt(lo52)}</span><span style="color:var(--text2)">52W range</span><span>${stkFmt(hi52)}</span></div>
    </div>
  `;
}

function stkRenderOHB() {
  const tbody = document.getElementById('stk-ohb-body');
  if (!tbody) return;
  const orders = STK_STATE.orders.slice().reverse();
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:16px;font-family:var(--font-m);font-size:0.65rem;">No orders placed this session</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => {
    const time = new Date(o.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const total = stkFmt(o.qty * o.fillPx);
    const sideClass = o.side === 'buy' ? 'stk-ohb-buy' : 'stk-ohb-sell';
    return `<tr>
      <td>${time}</td>
      <td class="${sideClass}">${o.side.toUpperCase()}</td>
      <td>${o.qty}</td>
      <td class="stk-ohb-sym">${stkEsc(o.sym)}</td>
      <td>${stkFmt(o.fillPx)}</td>
      <td>${total} cr</td>
    </tr>`;
  }).join('');
}

function stkRenderAll() {
  stkRenderTape();
  stkRenderWatchlist();
  stkRenderSymbolBar();
  stkRenderCompany();
  stkRenderPortfolio();
  stkRenderOrders();
  stkRenderAlerts();
  stkRenderNews();
  stkRenderOrderForm();
  stkRenderDeepDive();
  stkRenderOHB();
  stkDrawChart();
  // Update zoom level display
  const zl = document.getElementById('stk-zoom-level');
  if (zl) zl.textContent = STK_STATE.zoom.toFixed(1) + 'x';
  const clk = document.getElementById('stk-market-clock');
  if (clk) clk.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) + ' AZT';
}

/* ──────── ACTIONS ──────── */
function stkSelect(sym) {
  STK_STATE.selected = sym;
  stkSave();
  stkRenderAll();
}

function stkSubmitOrder() {
  const sym = STK_STATE.selected;
  const qty = Math.floor(+document.getElementById('stk-order-qty').value);
  const type = document.getElementById('stk-order-type').value;
  const side = STK_STATE.orderSide;
  const msg = document.getElementById('stk-order-msg');
  msg.className = 'stk-order-msg';
  msg.textContent = '';
  const px = STK_STATE.prices[sym];
  if (!px) return;
  if (!qty || qty < 1) { msg.textContent = 'Invalid quantity.'; msg.classList.add('err'); return; }
  let fillPx = px.last;
  if (type === 'limit') {
    const lp = +document.getElementById('stk-order-limit').value;
    if (!lp) { msg.textContent = 'Set a limit price.'; msg.classList.add('err'); return; }
    if (side === 'buy' && lp < px.last) { msg.textContent = 'Limit not reached (buy below market).'; msg.classList.add('err'); return; }
    if (side === 'sell' && lp > px.last) { msg.textContent = 'Limit not reached (sell above market).'; msg.classList.add('err'); return; }
    fillPx = lp;
  }
  const cost = qty * fillPx;
  const pos = STK_STATE.portfolio.positions[sym] || { qty: 0, avgCost: 0 };
  if (side === 'buy') {
    if (cost > STK_STATE.portfolio.cash) { msg.textContent = 'Insufficient cash.'; msg.classList.add('err'); return; }
    STK_STATE.portfolio.cash -= cost;
    const newQty = pos.qty + qty;
    pos.avgCost = ((pos.avgCost * pos.qty) + cost) / newQty;
    pos.qty = newQty;
    STK_STATE.portfolio.positions[sym] = pos;
  } else {
    if (qty > pos.qty) { msg.textContent = 'Not enough shares to sell.'; msg.classList.add('err'); return; }
    STK_STATE.portfolio.cash += cost;
    pos.qty -= qty;
    if (pos.qty === 0) delete STK_STATE.portfolio.positions[sym];
    else STK_STATE.portfolio.positions[sym] = pos;
  }
  STK_STATE.orders.push({ t: Date.now(), sym, side, qty, type, fillPx });
  if (STK_STATE.orders.length > 100) STK_STATE.orders.shift();
  msg.textContent = `${side.toUpperCase()} ${qty} ${sym} @ ${stkFmt(fillPx)} filled.`;
  msg.classList.add('ok');
  stkSave();
  stkRenderAll();
}

function stkAddAlert() {
  const dir = document.getElementById('stk-alert-dir').value;
  const px = +document.getElementById('stk-alert-px').value;
  if (!px) return;
  STK_STATE.alerts.push({ sym: STK_STATE.selected, dir, px, triggered: false });
  document.getElementById('stk-alert-px').value = '';
  stkSave();
  stkRenderAlerts();
}

/* ──────── INIT / TICK ──────── */
let stkInited = false;
let stkMarketInited = false;
function stkInitMarketOnce() {
  if (stkMarketInited) return;
  stkMarketInited = true;
  stkLoad();
  stkInitMarket();
  const now = Date.now();
  if (!STK_STATE.dayStartMs) STK_STATE.dayStartMs = now;
  // Catch-up: if the app was closed across one or more sim days, roll
  // forward so the daily history reflects the elapsed wall time instead
  // of pretending the old bar is still open.
  let rolled = 0;
  while (now - STK_STATE.dayStartMs >= STK_DAY_MS && rolled < 50) {
    stkRollNewDay(STK_STATE.dayStartMs + STK_DAY_MS);
    rolled++;
  }
  if (rolled) stkSave();
}
function stkInitOnce() {
  if (stkInited) return;
  stkInited = true;
  stkInitMarketOnce();

  // Wire events (only once)
  document.getElementById('stk-tf-group').addEventListener('click', e => {
    const b = e.target.closest('.stk-tf-btn');
    if (!b) return;
    document.querySelectorAll('.stk-tf-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    STK_STATE.tf = b.dataset.tf;
    stkSave();
    stkDrawChart();
  });
  ['sma','ema','bb','vol','rsi'].forEach(k => {
    const el = document.getElementById('stk-ind-' + k);
    if (!el) return;
    el.checked = STK_STATE.ind[k];
    el.addEventListener('change', () => {
      STK_STATE.ind[k] = el.checked;
      stkSave();
      stkDrawChart();
    });
  });
  document.querySelectorAll('.stk-ot-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.stk-ot-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STK_STATE.orderSide = b.dataset.side;
      const submit = document.getElementById('stk-submit');
      submit.classList.remove('buy', 'sell');
      submit.classList.add(b.dataset.side);
      submit.textContent = (b.dataset.side === 'buy' ? 'BUY ' : 'SELL ') + STK_STATE.selected;
    });
  });
  document.getElementById('stk-order-type').addEventListener('change', e => {
    document.getElementById('stk-limit-row').style.display = e.target.value === 'limit' ? '' : 'none';
    stkUpdateOrderCost();
  });
  document.getElementById('stk-order-qty').addEventListener('input', stkUpdateOrderCost);
  document.getElementById('stk-order-limit').addEventListener('input', stkUpdateOrderCost);
  document.getElementById('stk-submit').addEventListener('click', stkSubmitOrder);
  document.getElementById('stk-alert-add').addEventListener('click', stkAddAlert);
  // Set initial active TF button
  document.querySelectorAll('.stk-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === STK_STATE.tf));

  // Zoom buttons
  const zoomIn = document.getElementById('stk-zoom-in');
  const zoomOut = document.getElementById('stk-zoom-out');
  if (zoomIn) zoomIn.addEventListener('click', () => {
    STK_STATE.zoom = Math.min(8, parseFloat((STK_STATE.zoom * 1.5).toFixed(1)));
    stkDrawChart();
    const zl = document.getElementById('stk-zoom-level');
    if (zl) zl.textContent = STK_STATE.zoom.toFixed(1) + 'x';
  });
  if (zoomOut) zoomOut.addEventListener('click', () => {
    STK_STATE.zoom = Math.max(0.25, parseFloat((STK_STATE.zoom / 1.5).toFixed(2)));
    stkDrawChart();
    const zl = document.getElementById('stk-zoom-level');
    if (zl) zl.textContent = STK_STATE.zoom.toFixed(1) + 'x';
  });

  // Collapsible sidebars
  const leftToggle = document.getElementById('stk-col-left-toggle');
  const rightToggle = document.getElementById('stk-col-right-toggle');
  if (leftToggle) leftToggle.addEventListener('click', () => {
    document.getElementById('stk-col-left').classList.toggle('collapsed');
  });
  if (rightToggle) rightToggle.addEventListener('click', () => {
    document.getElementById('stk-col-right').classList.toggle('collapsed');
  });
}

// Background engine — once started, prices keep ticking and saving
// regardless of whether the stocks panel is visible. This is what
// makes the market feel alive across panel switches and across reloads.
let stkBgInterval = null;
let stkAutosaveInterval = null;
function startStocksBackground() {
  stkInitMarketOnce();
  if (stkBgInterval) return;
  stkBgInterval = setInterval(() => {
    stkTickMarket();
    // If the panel happens to be mounted, repaint it too. Otherwise
    // we just advance the simulation silently.
    if (stkInited && document.getElementById('stk-market-clock')) {
      try { stkRenderAll(); } catch (e) {}
    }
  }, STK_TICK_MS);
  // Explicit 20-minute autosave — safety net on top of the per-day
  // rollover save, so a long-running session survives a hard close.
  if (stkAutosaveInterval) clearInterval(stkAutosaveInterval);
  stkAutosaveInterval = setInterval(() => {
    try { stkSave(); } catch (e) {}
  }, STK_DAY_MS);
}
function stopStocksBackground() {
  if (stkBgInterval) { clearInterval(stkBgInterval); stkBgInterval = null; }
  if (stkAutosaveInterval) { clearInterval(stkAutosaveInterval); stkAutosaveInterval = null; }
}

// Called when the stocks panel becomes visible — wires up DOM events
// and triggers the first paint. The background engine is expected to
// already be running (launched from app boot).
let _stkCloudLoaded = false;
function startStocksFeed() {
  stkInitOnce();
  startStocksBackground();
  stkRenderAll();
  // Sync cloud portfolio once per session on first open
  if (!_stkCloudLoaded) { _stkCloudLoaded = true; stkCloudLoad(); }
}
function stopStocksFeed() {
  // We intentionally do NOT stop the background engine here — the
  // market should keep moving while the user is elsewhere. This is
  // kept as a no-op hook for backward compatibility with the old
  // panel-teardown path.
}

window.startStocksFeed = startStocksFeed;
window.stopStocksFeed = stopStocksFeed;
window.startStocksBackground = startStocksBackground;
window.stopStocksBackground = stopStocksBackground;
