import { MM_STYLE } from "../moreme/styles";
import { MoreMeUI } from "../moreme/ui";

// Embedded MoreMe — calendar-first life OS for a Mount Vernon Innovation
// Diploma student. A real month calendar of rich events (classes, iProject
// blocks, meetings, ARG stages, business, travel, hidden announcements) with
// times, people, sub-tasks, recurrence, priority and conflict detection;
// per-occurrence XP feeds a 20-level quadratic track; earnable achievements
// fire off real activity; projects, goals, and a standing zero-distraction
// expectation (logged, not gamified). No modes, focus blocks, or strikes.
export function MoreMe() {
  return (
    <div className="stage moreme-embed" style={{ background: "#0F1318", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{MM_STYLE}</style>
      <MoreMeUI />
    </div>
  );
}
