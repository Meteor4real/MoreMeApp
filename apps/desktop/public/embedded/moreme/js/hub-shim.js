// NetworkChuck Hub offline shim for the embedded More Me site. Persists the
// site's /api/auth + /api/data calls to on-device localStorage (no server).
(function () {
  const realFetch = window.fetch.bind(window);
  function ok(obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }));
  }
  const ACCT = (email) => "memeacct:" + (email || "").toLowerCase();
  const DATA = (email, key) => "memedata:" + (email || "").toLowerCase() + ":" + key;

  function handleAuth(b) {
    switch (b.action) {
      case "check_exists":
        return ok({ exists: !!localStorage.getItem(ACCT(b.email)) });
      case "register_human": {
        const user = {
          email: b.email,
          username: b.firstName || b.email,
          firstName: b.firstName || b.email,
          code: b.code,
        };
        localStorage.setItem(ACCT(b.email), JSON.stringify(user));
        return ok({ success: true, user });
      }
      case "login": {
        const a = localStorage.getItem(ACCT(b.email));
        if (!a) return ok({ success: false, error: "Invalid credentials" });
        const user = JSON.parse(a);
        if (String(user.code) !== String(b.code)) return ok({ success: false, error: "Invalid credentials" });
        return ok({ success: true, user });
      }
      case "update_profile": {
        const a = localStorage.getItem(ACCT(b.email));
        if (a) localStorage.setItem(ACCT(b.email), JSON.stringify(Object.assign(JSON.parse(a), b.updates || b)));
        return ok({ success: true });
      }
      default:
        return ok({ success: true });
    }
  }

  function handleData(b) {
    if (b.action === "save") {
      localStorage.setItem(DATA(b.email, b.key), JSON.stringify(b.value));
      return ok({ success: true });
    }
    if (b.action === "load") {
      const v = localStorage.getItem(DATA(b.email, b.key));
      return ok({ value: v ? JSON.parse(v) : null });
    }
    return ok({ success: true });
  }

  window.fetch = function (url, opts) {
    const u = typeof url === "string" ? url : (url && url.url) || "";
    if (u.indexOf("/api/auth") !== -1) { let b = {}; try { b = JSON.parse((opts && opts.body) || "{}"); } catch (e) {} return handleAuth(b); }
    if (u.indexOf("/api/data") !== -1) { let b = {}; try { b = JSON.parse((opts && opts.body) || "{}"); } catch (e) {} return handleData(b); }
    if (u.indexOf("/api/") !== -1) return ok({ success: true });
    return realFetch(url, opts);
  };
})();
