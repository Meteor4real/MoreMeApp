import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { Cloud, Network, Lock, ArrowRightLeft } from "lucide-react";

export default function Networking() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// edge & overlay"
        title="Networking"
        description="Twingate · Tailscale · Cloudflare · Traefik. Zero-trust tunnels and reverse proxies."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Twingate peers" value="11 / 11" glow />
        <Stat label="Tailscale" value="23" hint="devices online" />
        <Stat label="CF tunnels" value="7" hint="all healthy" glow />
        <Stat label="Traefik routers" value="34" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Twingate" subtitle="zero-trust · sponsor" status="ok" hot>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-chuck-red/40 bg-black shadow-glowSoft">
              <Lock className="h-5 w-5 text-chuck-pink" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-xs text-chuck-mute">
                Remote network access without VPN headaches. 4 resources mapped:
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                <li className="flex justify-between"><span>homelab.internal</span><span className="chuck-glow-text">↑</span></li>
                <li className="flex justify-between"><span>nas.internal</span><span className="chuck-glow-text">↑</span></li>
                <li className="flex justify-between"><span>kali-lab.internal</span><span className="chuck-glow-text">↑</span></li>
                <li className="flex justify-between"><span>frigate.internal</span><span className="chuck-glow-text">↑</span></li>
              </ul>
            </div>
          </div>
        </Panel>

        <Panel title="Tailscale" subtitle="mesh · funnel" status="ok">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
                <th className="py-2 font-mono font-normal">Device</th>
                <th className="py-2 font-mono font-normal">IP</th>
                <th className="py-2 font-mono font-normal">OS</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["studio-mac", "100.64.0.2", "darwin"],
                ["vps-01", "100.64.0.3", "linux"],
                ["vps-02", "100.64.0.4", "linux"],
                ["zimacube", "100.64.0.5", "zimaos"],
                ["pixel-9", "100.64.0.7", "android"],
                ["iphone", "100.64.0.8", "ios"],
              ].map(([d, ip, os]) => (
                <tr key={d} className="border-b border-chuck-line/30 font-mono text-xs">
                  <td className="py-2">{d}</td>
                  <td className="py-2 text-chuck-mute">{ip}</td>
                  <td className="py-2 text-chuck-mute">{os}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Cloudflare" subtitle="DNS · tunnels · zones" status="ok">
          <ul className="space-y-2 font-mono text-xs">
            {[
              ["networkchuck.dev", "92 records", "Tunnel ↑"],
              ["chuckhub.app", "12 records", "Tunnel ↑"],
              ["chuck.coffee", "4 records", "Tunnel ↑"],
            ].map(([zone, recs, tun]) => (
              <li key={zone as string} className="flex items-center justify-between rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Cloud className="h-3.5 w-3.5 text-chuck-pink" />
                  <span>{zone}</span>
                </div>
                <span className="text-chuck-mute">{recs}</span>
                <span className="chuck-chip-live">{tun}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Traefik" subtitle="reverse proxy · 34 routers" status="ok">
          <div className="space-y-1.5 font-mono text-xs">
            {[
              "n8n.chuck.dev → n8n-prod:5678",
              "portainer.chuck.dev → portainer:9000",
              "supabase.chuck.dev → supabase-mirror:8000",
              "frigate.chuck.dev → frigate:5000",
              "code.chuck.dev → code-server:8443",
              "hub.chuck.dev → chuckhub:3000",
            ].map((r) => (
              <div key={r} className="flex items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-3 py-1.5">
                <ArrowRightLeft className="h-3 w-3 text-chuck-pink" />
                <span>{r}</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
