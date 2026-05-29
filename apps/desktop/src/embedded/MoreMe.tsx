import { MM_STYLE } from "../moreme/styles";
import { MoreMeUI } from "../moreme/ui";

// Embedded MoreMe — Hub-native rebuild to the blueprint: three modes
// (Semester / Vacation / Exam / Travel + auto-weekend), strict time-blocked
// daily checklist (blocks only check during or after their window), yearly
// Calendar that marks school weeks / breaks / trips / events and drives the
// mode automatically, weekly + semester + yearly + identity goals, projects
// dashboard (3-active cap), Battlepass with user-set rewards across 50
// levels, Achievements (5 categories), seasons + prestige, and a tighter
// XP economy (200 XP per level — earlier "way too easy" 100 retired).
export function MoreMe() {
  return (
    <div className="stage moreme-embed" style={{ background: "#0F1318", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{MM_STYLE}</style>
      <MoreMeUI />
    </div>
  );
}
