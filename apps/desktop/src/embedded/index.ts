import type { ComponentType } from "react";
import { MoreMe } from "./MoreMe";
import { SignalFinder } from "./signalfinder/SignalFinderShell";
import { NT5 } from "./NT5";
import { HALOS } from "./HALOS";
import { DigitalBlueprint } from "./DigitalBlueprint";
import { BroBot } from "./BroBot";

// Sidebar apps that have a purpose-built in-app version (vs. loading the live
// site in a browser tab). Keyed by the SITE_APPS id.
export const EMBEDDED: Record<string, ComponentType> = {
  moreme: MoreMe,
  signalfinder: SignalFinder,
  nt5: NT5,
  halos: HALOS,
  blueprint: DigitalBlueprint,
  brobot: BroBot,
};
