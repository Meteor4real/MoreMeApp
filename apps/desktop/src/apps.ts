// The left-rail registry. `icon` is a temporary glyph; per-app real logos
// (recolored NetworkChuck mark, MoreMe peaks, etc.) get swapped in later.
// `url` is the live deployment we load into a browser tab until each app has
// a purpose-built embedded version inside the hub.

export type HubView = "control" | "terminal" | "browser";

export type AppEntry = {
  id: string;
  label: string;
  url?: string;
  note?: string;
};

export const SITE_APPS: AppEntry[] = [
  {
    id: "nt5",
    label: "NT5 News",
    url: "https://nt5-news.vercel.app",
    note: "S.P.A.C.E. News — live broadcast",
  },
  {
    id: "halos",
    label: "HALOS Interface",
    url: "https://halos-interface.vercel.app",
    note: "S.P.A.C.E. collaboration console",
  },
  {
    id: "blueprint",
    label: "DigitalBlueprint",
    url: "https://digital-blueprint.vercel.app",
    note: "3D worldbuilding",
  },
  {
    id: "moreme",
    label: "MoreMe",
    url: "https://more-me.vercel.app",
    note: "Routines · XP · projects",
  },
  {
    id: "brobot",
    label: "BroBot",
    url: "https://brobot.vercel.app",
    note: "Local image companion",
  },
  {
    id: "signalfinder",
    label: "SignalFinder",
    note: "Opportunity radar — not built yet",
  },
  {
    id: "documents",
    label: "Documents",
    note: "Your Google Docs, NCH-skinned",
  },
];
