import type { ComponentType } from "react";
import { MoreMe } from "./MoreMe";
import { SignalFinder } from "./SignalFinder";

// Sidebar apps that have a purpose-built in-app version (vs. loading the live
// site in a browser tab). Keyed by the SITE_APPS id.
export const EMBEDDED: Record<string, ComponentType> = {
  moreme: MoreMe,
  signalfinder: SignalFinder,
};
