import type { ComponentType } from "react";
import { MoreMe } from "./MoreMe";
import { NT5 } from "./NT5";

// The only two surfaces the Hub ships now: MoreMe (the product) and NT5 News
// (the bonus wire). Everything else was retired.
export const EMBEDDED: Record<string, ComponentType> = {
  moreme: MoreMe,
  nt5: NT5,
};
