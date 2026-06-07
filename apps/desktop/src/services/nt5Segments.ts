// NT5 live segment data. Real, no-API-key sources so the broadcast has actual
// data behind it — weather, markets (crypto + indices), space, and sports.
// Everything degrades to an honest "unavailable" state; nothing is faked.
//
// Sources (all key-free, public):
//   weather  — open-meteo.com (geocode + forecast)
//   crypto   — api.coingecko.com (simple price)
//   indices  — stooq.com (CSV quotes for ^SPX, ^NDX, etc.)
//   space    — api.le-systeme-solaire / ISS now (open-notify mirror) + NASA APOD (DEMO_KEY)
//   sports   — site.api.espn.com hidden scoreboard JSON

const net = (url: string) => window.hub.net({ method: "GET", url, headers: { "User-Agent": "Mozilla/5.0 MoreMe" } });

// ── Weather ─────────────────────────────────────────────────────────────────
export type Weather = {
  place: string;
  tempC: number; tempF: number;
  code: number; desc: string;
  windKph: number; humidity: number;
  hi: number; lo: number;
  updatedAt: number;
};

const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Severe thunderstorm",
};

export async function fetchWeather(place: string): Promise<Weather | null> {
  const where = (place || "").trim() || "New York";
  // 1) Geocode the place name.
  const g = await net(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(where)}&count=1`);
  const geo = (g.data as { results?: { latitude: number; longitude: number; name: string; admin1?: string; country_code?: string }[] } | null)?.results?.[0];
  if (!geo) return null;
  // 2) Current + daily forecast.
  const f = await net(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=1&timezone=auto`);
  const d = f.data as { current?: { temperature_2m: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number }; daily?: { temperature_2m_max: number[]; temperature_2m_min: number[] } } | null;
  if (!d?.current) return null;
  const c = d.current;
  const label = [geo.name, geo.admin1, geo.country_code].filter(Boolean).join(", ");
  return {
    place: label,
    tempC: Math.round(c.temperature_2m),
    tempF: Math.round(c.temperature_2m * 9 / 5 + 32),
    code: c.weather_code, desc: WMO[c.weather_code] || "—",
    windKph: Math.round(c.wind_speed_10m), humidity: Math.round(c.relative_humidity_2m),
    hi: Math.round(d.daily?.temperature_2m_max?.[0] ?? c.temperature_2m),
    lo: Math.round(d.daily?.temperature_2m_min?.[0] ?? c.temperature_2m),
    updatedAt: Date.now(),
  };
}

// ── Markets ─────────────────────────────────────────────────────────────────
export type Quote = { symbol: string; name: string; price: number; changePct: number; kind: "crypto" | "index" };

export async function fetchMarkets(): Promise<Quote[]> {
  const out: Quote[] = [];
  // Crypto via CoinGecko (no key).
  try {
    const r = await net("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
    const d = r.data as Record<string, { usd: number; usd_24h_change: number }> | null;
    if (d) {
      const map: [string, string][] = [["bitcoin", "BTC"], ["ethereum", "ETH"], ["solana", "SOL"]];
      for (const [id, sym] of map) {
        const e = d[id]; if (!e) continue;
        out.push({ symbol: sym, name: sym, price: e.usd, changePct: e.usd_24h_change ?? 0, kind: "crypto" });
      }
    }
  } catch { /* ignore */ }
  // Indices via stooq CSV (no key): ^spx (S&P 500), ^ndq (Nasdaq), ^dji (Dow).
  try {
    const r = await net("https://stooq.com/q/l/?s=^spx+^ndq+^dji&f=sd2t2ohlcv&h&e=csv");
    if (typeof r.data === "string") {
      const lines = r.data.trim().split("\n").slice(1);
      const names: Record<string, string> = { "^SPX": "S&P 500", "^NDQ": "Nasdaq", "^DJI": "Dow Jones" };
      for (const line of lines) {
        const cols = line.split(",");
        const sym = (cols[0] || "").toUpperCase();
        const close = Number(cols[6]); const open = Number(cols[3]);
        if (!close || !open) continue;
        out.push({ symbol: sym, name: names[sym] || sym, price: close, changePct: ((close - open) / open) * 100, kind: "index" });
      }
    }
  } catch { /* ignore */ }
  return out;
}

// ── Space ───────────────────────────────────────────────────────────────────
export type SpaceData = {
  iss: { lat: number; lon: number } | null;
  peopleInSpace: number | null;
  apod: { title: string; url: string; explanation: string; mediaType: string } | null;
};

export async function fetchSpace(): Promise<SpaceData> {
  const data: SpaceData = { iss: null, peopleInSpace: null, apod: null };
  try {
    const r = await net("https://api.wheretheiss.at/v1/satellites/25544");
    const d = r.data as { latitude?: number; longitude?: number } | null;
    if (d?.latitude != null) data.iss = { lat: d.latitude, lon: d.longitude! };
  } catch { /* ignore */ }
  try {
    const r = await net("http://api.open-notify.org/astros.json");
    const d = r.data as { number?: number } | null;
    if (d?.number != null) data.peopleInSpace = d.number;
  } catch { /* ignore */ }
  try {
    const r = await net("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY");
    const d = r.data as { title?: string; url?: string; explanation?: string; media_type?: string } | null;
    if (d?.title) data.apod = { title: d.title, url: d.url || "", explanation: d.explanation || "", mediaType: d.media_type || "image" };
  } catch { /* ignore */ }
  return data;
}

// ── Sports ──────────────────────────────────────────────────────────────────
export type Game = { league: string; home: string; away: string; homeScore: string; awayScore: string; state: string; detail: string };

const ESPN_LEAGUES: { league: string; path: string }[] = [
  { league: "NFL", path: "football/nfl" },
  { league: "NBA", path: "basketball/nba" },
  { league: "MLB", path: "baseball/mlb" },
  { league: "NHL", path: "hockey/nhl" },
  { league: "EPL", path: "soccer/eng.1" },
];

export async function fetchSports(): Promise<Game[]> {
  const out: Game[] = [];
  await Promise.all(ESPN_LEAGUES.map(async ({ league, path }) => {
    try {
      const r = await net(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`);
      const events = (r.data as { events?: unknown[] } | null)?.events || [];
      for (const ev of events.slice(0, 4)) {
        const comp = (ev as { competitions?: { competitors?: { homeAway: string; team?: { abbreviation?: string; displayName?: string }; score?: string }[]; status?: { type?: { state?: string; shortDetail?: string } } }[] }).competitions?.[0];
        if (!comp?.competitors) continue;
        const home = comp.competitors.find((c) => c.homeAway === "home");
        const away = comp.competitors.find((c) => c.homeAway === "away");
        if (!home || !away) continue;
        out.push({
          league,
          home: home.team?.abbreviation || home.team?.displayName || "HOME",
          away: away.team?.abbreviation || away.team?.displayName || "AWAY",
          homeScore: home.score ?? "0", awayScore: away.score ?? "0",
          state: comp.status?.type?.state || "pre",
          detail: comp.status?.type?.shortDetail || "",
        });
      }
    } catch { /* ignore per-league */ }
  }));
  return out;
}
