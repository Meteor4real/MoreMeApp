// NetworkChuck Hub offline shim for the embedded HALOS interface.
// The real site talks to /api/auth and /api/data (a Postgres backend on
// Vercel). Inside the Hub there is no server, so we intercept those calls and
// persist everything to localStorage on-device. Same request/response shapes
// the app expects — accounts, per-user data, and shared data all work offline.
(function () {
  const realFetch = window.fetch.bind(window);
  function ok(obj) {
    return Promise.resolve(
      new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } })
    );
  }
  function fail(status, error) {
    return Promise.resolve(
      new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } })
    );
  }
  const ACCT = (email) => "halosacct:" + (email || "").toLowerCase();
  const DATA = (email, key) => "halosdata:" + (email || "").toLowerCase() + ":" + key;
  const SHARED = (key) => "halosshared:" + key;

  function handleAuth(b) {
    switch (b.action) {
      case "check_exists":
      case "check_exists_agent": {
        const a = localStorage.getItem(ACCT(b.email));
        return ok({ exists: !!a });
      }
      case "register_human":
      case "register_agent": {
        const existing = localStorage.getItem(ACCT(b.email));
        if (existing) {
          const acc = JSON.parse(existing);
          if (acc.is_agent !== (b.action === "register_agent"))
            return fail(409, "Email already registered");
        }
        const user = {
          email: b.email,
          username: b.firstName || b.agentName || b.email,
          is_agent: b.action === "register_agent",
          interests: "[]",
          status: "online",
          accent: "#00e5ff",
          code: b.code,
        };
        localStorage.setItem(ACCT(b.email), JSON.stringify(user));
        return ok({ success: true, user });
      }
      case "login": {
        const a = localStorage.getItem(ACCT(b.email));
        if (!a) return fail(401, "Invalid credentials");
        const user = JSON.parse(a);
        if (String(user.code) !== String(b.code)) return fail(401, "Invalid credentials");
        return ok({ success: true, user });
      }
      case "update_profile": {
        const a = localStorage.getItem(ACCT(b.email));
        if (a) {
          const user = Object.assign(JSON.parse(a), b.updates || {});
          localStorage.setItem(ACCT(b.email), JSON.stringify(user));
        }
        return ok({ success: true });
      }
      case "list_users": {
        const users = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("halosacct:")) {
            const u = JSON.parse(localStorage.getItem(k));
            users.push({ email: u.email, username: u.username, is_agent: u.is_agent, status: u.status, accent: u.accent });
          }
        }
        return ok({ users });
      }
      default:
        return ok({ success: true });
    }
  }

  function handleData(b) {
    switch (b.action) {
      case "save":
        localStorage.setItem(DATA(b.email, b.key), JSON.stringify(b.value));
        return ok({ success: true });
      case "load": {
        const v = localStorage.getItem(DATA(b.email, b.key));
        return ok({ value: v ? JSON.parse(v) : null });
      }
      case "load_all": {
        const data = {};
        const prefix = "halosdata:" + (b.email || "").toLowerCase() + ":";
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) data[k.slice(prefix.length)] = JSON.parse(localStorage.getItem(k));
        }
        return ok({ data });
      }
      case "save_shared":
        localStorage.setItem(SHARED(b.key), JSON.stringify(b.value));
        return ok({ success: true });
      case "load_shared": {
        const data = {};
        const prefix = "halosshared:";
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) data[k.slice(prefix.length)] = JSON.parse(localStorage.getItem(k));
        }
        return ok({ data });
      }
      default:
        return fail(400, "Unknown action");
    }
  }

  window.fetch = function (url, opts) {
    const u = typeof url === "string" ? url : (url && url.url) || "";
    if (u.indexOf("/api/auth") !== -1 || u.indexOf("/api/data") !== -1) {
      let b = {};
      try { b = JSON.parse((opts && opts.body) || "{}"); } catch (e) { /* ignore */ }
      return u.indexOf("/api/auth") !== -1 ? handleAuth(b) : handleData(b);
    }
    if (u.indexOf("/api/") !== -1) return ok({}); // voice/calls/messages — soft no-op offline
    return realFetch(url, opts);
  };
})();
