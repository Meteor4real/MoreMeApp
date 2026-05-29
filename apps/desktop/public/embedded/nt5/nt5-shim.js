// NetworkChuck Hub offline shim for the embedded NT5 / S.P.A.C.E. News site.
// The real site fetches /api/articles, /api/ticker, /api/stats, /api/broadcast
// from a server. Inside the Hub there is no server, so we serve the wire from
// an on-device store (localStorage), seeded with a starter set on first run.
(function () {
  const realFetch = window.fetch.bind(window);
  const KEY = "nt5wire.articles";
  const ANCH = { voss: "Voss Calloway", zara: "Zara Kindle", dex: "Dex Morrow", lena: "Lena Faust", orin: "Orin Vale" };
  const H = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

  const SEED_RAW = [
    ["cc_lore", "voss", "NT5 Sign-On: The Wire Is Live", "Good evening from the NT5 control deck. The network is on air at nominal output across every band the Strategic Planetary Alliance broadcasts on. This is the unified wire — real events, filed by the anchor desk. We do not run filler.", 0.2],
    ["breaking", "lena", "Solar Flare Inbound — Antrosa Braces for Impact", "A massive Class-X solar flare is tracking toward the Antrosa colonial belt, Solaris Division confirms. Shielding is at full and transit is paused. Tune in for Voss Calloway's special report at the top of the hour.", 0.5],
    ["space", "orin", "Azulbright Engines Hold Nominal — Third Cycle Running", "Stellar engine output across the Azulbright array is holding at one hundred percent for the third consecutive cycle, per Solaris telemetry filed to NT5 this hour. No orbital adjustments are queued.", 1.5],
    ["gaming", "dex", "Origin Realms Drops a New Season — Servers Slammed", "Origin Realms rolled a new competitive season overnight and the queues are stacked deep. Early reads say the meta shake-up is real. Dex has hands-on impressions filing within the hour.", 2.4],
    ["earth_trending", "zara", "A Creator Moment Crosses the Wire", "The culture desk is tracking a fast-moving creator story rippling across feeds tonight. Zara has the context on why it landed and where it goes next.", 3.1],
    ["tech", "orin", "Dyson Swarm Panel Cluster 7 Rebalanced", "Engineers completed a rebalance of Dyson swarm panel cluster 7; output is steady and the maintenance window closed early. Orin breaks down what the adjustment means for the grid.", 4.6],
    ["latest", "voss", "NTPD Clears Transit Hub Incident in Sector 9", "Nova Terris Planetary Defense reports a transit hub incident in sector 9 fully cleared with no injuries. The hub is back to normal throughput.", 5.8],
    ["space", "lena", "Riftline Division Logs Micro-Breach Near B-792", "A micro-breach was detected and contained near grid B-792, Riftline Division confirms. Threat level returned to green within minutes. NT5 stays on it.", 7.2],
  ];
  function build() {
    return SEED_RAW.map((r, i) => ({
      id: "seed-" + i,
      slug: slug(r[2]),
      title: r[2],
      body: r[3],
      category: r[0],
      anchor_id: r[1],
      author_display: ANCH[r[1]] || "NT5 Desk",
      voice_audio_url: null,
      is_broadcast: false,
      broadcast_segment: null,
      source_urls: [],
      topics: [],
      published_at: H(r[4]),
      created_at: H(r[4]),
    }));
  }
  function articles() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (Array.isArray(s) && s.length) return s;
    } catch (e) { /* ignore */ }
    const seed = build();
    try { localStorage.setItem(KEY, JSON.stringify(seed)); } catch (e) {}
    return seed;
  }
  // The Hub's in-app wire posts fresh items in here on each scheduler tick.
  // Merge them (newest first, dedup by title) so the bundled NT5 stays live.
  window.addEventListener("message", function (ev) {
    var m = ev.data || {};
    if (m && m.type === "nt5-add-articles" && Array.isArray(m.articles)) {
      var have = articles();
      var seen = {};
      have.forEach(function (a) { seen[(a.title || "").toLowerCase()] = true; });
      var add = m.articles.filter(function (a) { return a && a.title && !seen[a.title.toLowerCase()]; });
      if (add.length) {
        var merged = add.concat(have).slice(0, 80);
        try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (e) {}
      }
    }
  });
  function ok(obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }));
  }

  window.fetch = function (url, opts) {
    const u = typeof url === "string" ? url : (url && url.url) || "";
    if (u.indexOf("/api/") === -1) return realFetch(url, opts);
    const q = u.indexOf("?") !== -1 ? new URLSearchParams(u.slice(u.indexOf("?") + 1)) : new URLSearchParams();
    const all = articles();
    if (u.indexOf("/api/articles") !== -1) {
      const cat = q.get("category");
      const limit = Math.min(parseInt(q.get("limit") || "50", 10), 100);
      const rows = (cat ? all.filter((a) => a.category === cat) : all).slice(0, limit);
      return ok(rows);
    }
    if (u.indexOf("/api/ticker") !== -1) {
      return ok(all.slice(0, 10).map((a) => ({
        id: "t-" + a.id,
        text: (a.category === "breaking" ? "BREAKING: " : "") + a.title,
        type: a.category === "breaking" ? "breaking" : a.category === "cc_lore" ? "cc_lore" : "real_world",
        expires_at: null,
        created_at: a.created_at,
      })));
    }
    if (u.indexOf("/api/stats") !== -1) {
      return ok({ articles_24h: all.length, ticker_active: Math.min(all.length, 10), last_article_at: all[0] ? all[0].published_at : null });
    }
    if (u.indexOf("/api/broadcast") !== -1) {
      const breaking = all.find((a) => a.category === "breaking") || null;
      return ok({ segment: "evening", broadcast: null, current_story: all[0] || null, breaking });
    }
    if (u.indexOf("/api/health") !== -1) return ok({ ok: true });
    if (u.indexOf("/api/cron") !== -1) return ok({ ok: true, ran: false });
    return ok({});
  };
})();
