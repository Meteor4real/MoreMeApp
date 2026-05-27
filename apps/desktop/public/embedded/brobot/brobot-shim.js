// NetworkChuck Hub bridge for the embedded BroBot app. The real BroBot desktop
// renderer talks to its Electron preload as window.brobot (drive, search, chat,
// llm). Inside the Hub iframe there is no preload, so we provide window.brobot:
//   - drive  -> on-device localStorage gallery
//   - search -> Openverse (key-free) directly
//   - chat/llm -> bridged via postMessage to the Hub host, which runs the
//     local house model (window.hub.llm) on the parent side.
(function () {
  var persona =
    "You are BroBot — a homie from high school who happens to live in a quiet, gold-trimmed estate. " +
    "Voice is casual and real, never preachy or corporate. Use slang naturally, talk like a friend. " +
    "You help the user find and curate images they're hyped about — their gallery (saved images, tags, " +
    "interests, house rules) is your context. If a site blocks you, say so straight. Don't lecture or " +
    "add disclaimers nobody asked for. Be helpful and direct.";
  var LS_IMG = "brobotdrive:images", LS_PREF = "brobotdrive:prefs";
  function loadImages() { try { return JSON.parse(localStorage.getItem(LS_IMG) || "[]"); } catch (e) { return []; } }
  function saveImages(a) { try { localStorage.setItem(LS_IMG, JSON.stringify(a)); } catch (e) {} }
  function defPrefs() { return { driveName: "My Drive", interests: [], guidelines: "", personaOverrides: "", filters: { excludeTags: [] } }; }
  function loadPrefs() { try { return JSON.parse(localStorage.getItem(LS_PREF) || "null") || defPrefs(); } catch (e) { return defPrefs(); } }
  function savePrefs(p) { try { localStorage.setItem(LS_PREF, JSON.stringify(p)); } catch (e) {} return p; }

  var pending = {}, progressCbs = [];
  window.addEventListener("message", function (e) {
    var m = e.data || {};
    if (m.type === "brobot-host-reply" && pending[m.id]) { var r = pending[m.id]; delete pending[m.id]; r(m); }
    if (m.type === "brobot-host-progress") { for (var i = 0; i < progressCbs.length; i++) progressCbs[i](m.progress || 0); }
  });
  function host(action, payload) {
    return new Promise(function (res) {
      var id = Math.random().toString(36).slice(2);
      pending[id] = res;
      var msg = { type: "brobot-host", action: action, id: id };
      if (payload) for (var k in payload) msg[k] = payload[k];
      parent.postMessage(msg, "*");
    });
  }

  async function chatReply(history, userText) {
    var prefs = loadPrefs();
    var system = persona;
    if (prefs.personaOverrides) system += "\n" + prefs.personaOverrides;
    if (prefs.guidelines) system += "\n" + prefs.guidelines;
    if (prefs.interests && prefs.interests.length) system += "\nUser interests: " + prefs.interests.join(", ") + ".";
    var convo = (history || []).map(function (m) { return (m.role === "user" ? "User: " : "BroBot: ") + m.content; }).join("\n");
    var prompt = (convo ? convo + "\n" : "") + "User: " + userText + "\nBroBot:";
    var r = await host("chat", { system: system, prompt: prompt });
    return { id: String(Date.now()), role: "assistant", content: r.ok ? (r.text || "(no reply)") : ("[error] " + (r.error || "chat failed")), createdAt: Date.now() };
  }

  window.brobot = {
    drive: {
      list: async function () { return loadImages(); },
      rename: async function (id, displayName) { var a = loadImages(), it = a.find(function (x) { return x.id === id; }); if (it) it.displayName = displayName; saveImages(a); return it; },
      remove: async function (id) { saveImages(loadImages().filter(function (x) { return x.id !== id; })); },
      setTags: async function (id, tags) { var a = loadImages(), it = a.find(function (x) { return x.id === id; }); if (it) it.tags = tags; saveImages(a); return it; },
      save: async function (req) {
        var a = loadImages(), dup = a.find(function (x) { return x.sourceUrl === req.url; });
        if (dup) return dup;
        var img = { id: String(Date.now()) + Math.random().toString(36).slice(2, 5), filename: (req.url.split("/").pop() || "image").split("?")[0], displayName: req.query || "Saved image", absolutePath: req.url, sourceUrl: req.url, query: req.query, tags: req.tags || [], bytes: 0, addedAt: Date.now() };
        a.unshift(img); saveImages(a); return img;
      },
      importLocal: async function () { return []; },
      getPreferences: async function () { return loadPrefs(); },
      setPreferences: async function (p) { return savePrefs(p); },
      revealInFolder: async function () {},
    },
    search: {
      run: async function (req) {
        try {
          var r = await fetch("https://api.openverse.org/v1/images/?q=" + encodeURIComponent(req.query) + "&page_size=" + (req.limit || 24));
          if (!r.ok) return { results: [], blocked: true, blockedReason: "Search unavailable (" + r.status + ")", source: "openverse" };
          var j = await r.json();
          var results = (j.results || []).map(function (x) { return { url: x.url, thumbnailUrl: x.thumbnail || x.url, source: x.source || "openverse", title: x.title, width: x.width, height: x.height }; });
          return { results: results, blocked: false, source: "openverse" };
        } catch (e) { return { results: [], blocked: true, blockedReason: String(e), source: "openverse" }; }
      },
    },
    chat: {
      send: function (history, userText) { return chatReply(history, userText); },
      stream: async function (history, userText, onToken) { var msg = await chatReply(history, userText); if (onToken && msg.content) onToken(msg.content); return msg; },
    },
    llm: {
      status: async function () { var r = await host("status"); return { ready: !!r.ready, modelName: r.modelName, downloading: !!r.downloading, progress: r.progress || 0 }; },
      ensureModel: async function () { await host("ensure"); },
      onProgress: function (cb) { progressCbs.push(cb); return function () { progressCbs = progressCbs.filter(function (f) { return f !== cb; }); }; },
    },
    app: { chooseDirectory: async function () { return null; } },
  };
})();
