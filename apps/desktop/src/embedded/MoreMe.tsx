import { useEffect, useState } from "react";
import { buildMMStyle, subscribeTheme } from "../moreme/styles";
import { MoreMeUI } from "../moreme/ui";

// Embedded MoreMe — calendar-first life OS for a Mount Vernon student.
// Re-renders the class-based stylesheet on theme change so DP <-> Papatui
// switches the entire embed in place without a reload.
export function MoreMe() {
  const [css, setCss] = useState(() => buildMMStyle());
  useEffect(() => subscribeTheme(() => setCss(buildMMStyle())), []);
  return (
    <div className="stage moreme-embed" style={{ display: "flex", flexDirection: "column" }}>
      <style>{css}</style>
      <MoreMeUI />
    </div>
  );
}
