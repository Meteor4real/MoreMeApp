import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { Youtube, GraduationCap, MessageCircle, ThumbsUp, Eye } from "lucide-react";

export default function Content() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// content stack"
        title="Content & Academy"
        description="YouTube performance, Academy enrollments, social pulse — all in one place."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Subscribers" value="3.9M" hint="+12k this week" glow />
        <Stat label="Views (7d)" value="2.1M" hint="across 4 videos" />
        <Stat label="Academy active" value="14,302" hint="paid seats" glow />
        <Stat label="Comments (7d)" value="8,142" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="YouTube — Latest Videos" subtitle="last 4 uploads" status="ok" hot>
          <ul className="space-y-3">
            {[
              ["I built an AI sysadmin (and it works)", "412k", "28k", "1.2k"],
              ["Hack the NETWORK (legally!)", "289k", "19k", "842"],
              ["Proxmox is BACK — and it's incredible", "654k", "44k", "2.1k"],
              ["Self-host EVERYTHING (2026 stack)", "722k", "51k", "3.4k"],
            ].map(([title, views, likes, comments]) => (
              <li
                key={title as string}
                className="flex items-center gap-3 rounded-sm border border-chuck-line/60 bg-black/30 p-3"
              >
                <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-sm border border-chuck-red/40 bg-gradient-to-br from-chuck-red/20 to-chuck-orange/10">
                  <Youtube className="h-5 w-5 text-chuck-pink" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-chuck-ink">{title}</div>
                  <div className="mt-1 flex gap-3 font-mono text-[10px] text-chuck-mute">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{views}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{comments}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="NetworkChuck Academy" subtitle="LMS · 14k active learners" status="ok">
          <ul className="space-y-2 font-mono text-xs">
            {[
              ["Linux for Hackers", 4128, "+82"],
              ["Python for Network Engineers", 3214, "+44"],
              ["Self-Hosting Mastery", 2980, "+71"],
              ["Cisco CCNA Path", 2104, "+19"],
              ["AI for SysAdmins", 1876, "+128"],
            ].map(([course, learners, delta]) => (
              <li
                key={course as string}
                className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-chuck-pink" />
                  {course}
                </span>
                <span className="text-chuck-mute">{learners.toLocaleString()} learners</span>
                <span className="chuck-glow-text">{delta}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
