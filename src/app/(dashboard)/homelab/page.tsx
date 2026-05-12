import { PageHeader } from "@/components/PageHeader";
import { Panel, Stat } from "@/components/Panel";
import { Server, Container, HardDrive, Camera, Shield, Cpu } from "lucide-react";

const VMS = [
  { id: 101, name: "pve-router", node: "node-01", cpu: 12, ram: 28, status: "running" },
  { id: 102, name: "n8n-prod", node: "node-01", cpu: 34, ram: 52, status: "running" },
  { id: 103, name: "supabase-mirror", node: "node-02", cpu: 18, ram: 41, status: "running" },
  { id: 204, name: "kali-lab", node: "node-02", cpu: 4, ram: 12, status: "running" },
  { id: 205, name: "gns3-server", node: "node-02", cpu: 22, ram: 38, status: "running" },
  { id: 301, name: "frigate", node: "node-03", cpu: 56, ram: 68, status: "running" },
  { id: 302, name: "pi-hole", node: "node-03", cpu: 3, ram: 8, status: "running" },
  { id: 303, name: "media-stack", node: "node-03", cpu: 14, ram: 22, status: "running" },
];

export default function Homelab() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="// homelab"
        title="Infrastructure"
        description="Proxmox · Docker · ZimaCube · Frigate · Pi-hole. The rack speaks fluent fan-noise."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Proxmox VMs" value="14" hint="3 nodes" glow />
        <Stat label="LXC" value="8" />
        <Stat label="Containers" value="42" hint="38 ↑ · 4 ⏸" glow />
        <Stat label="NAS used" value="42 TB" hint="of 96 TB" />
        <Stat label="Cameras" value="6" hint="Frigate" />
        <Stat label="DNS blocked" value="12.4k" hint="today · Pi-hole" glow />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Proxmox Cluster"
          subtitle="3 nodes · qm/lxc"
          status="ok"
          className="xl:col-span-2"
        >
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-chuck-line/60 text-[10px] uppercase tracking-widest text-chuck-mute">
                <th className="py-2 font-mono font-normal">VMID</th>
                <th className="py-2 font-mono font-normal">Name</th>
                <th className="py-2 font-mono font-normal">Node</th>
                <th className="py-2 font-mono font-normal">CPU</th>
                <th className="py-2 font-mono font-normal">RAM</th>
                <th className="py-2 font-mono font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {VMS.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-chuck-line/30 font-mono text-xs hover:bg-black/30"
                >
                  <td className="py-2.5 text-chuck-mute">{v.id}</td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <Server className="h-3.5 w-3.5 text-chuck-pink" />
                      {v.name}
                    </span>
                  </td>
                  <td className="py-2.5 text-chuck-mute">{v.node}</td>
                  <td className="py-2.5">
                    <BarCell value={v.cpu} />
                  </td>
                  <td className="py-2.5">
                    <BarCell value={v.ram} />
                  </td>
                  <td className="py-2.5">
                    <span className="chuck-chip-live">{v.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="space-y-4">
          <Panel title="ZimaCube Pro" subtitle="ZimaOS · 6×16TB" status="ok">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-chuck-pink" />
              <div className="flex-1">
                <div className="font-mono text-xs text-chuck-mute">
                  42 TB / 96 TB
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-black">
                  <div
                    className="chuck-strip h-full"
                    style={{ width: "44%" }}
                  />
                </div>
                <div className="mt-2 font-mono text-[10px] text-chuck-mute">
                  RAIDZ2 · all disks healthy
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Frigate NVR" subtitle="6 cams · AI detection" status="live" hot>
            <div className="grid grid-cols-3 gap-2">
              {["front", "drive", "garage", "porch", "back", "studio"].map((c) => (
                <div
                  key={c}
                  className="relative aspect-video overflow-hidden rounded-sm border border-chuck-line bg-black"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-chuck-red/20 via-transparent to-chuck-orange/10" />
                  <Camera className="absolute left-1 top-1 h-3 w-3 text-chuck-pink animate-pulseGlow" />
                  <div className="absolute bottom-1 right-1 font-mono text-[9px] uppercase text-chuck-mute">
                    {c}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Pi-hole" subtitle="DNS sinkhole" status="ok">
            <ul className="space-y-1 font-mono text-xs">
              <li className="flex justify-between">
                <span>Queries today</span>
                <span className="chuck-glow-text">98,231</span>
              </li>
              <li className="flex justify-between">
                <span>Blocked</span>
                <span>12,430 (12.6%)</span>
              </li>
              <li className="flex justify-between">
                <span>Blocklist</span>
                <span className="text-chuck-mute">138,452 entries</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Docker / Portainer" subtitle="42 containers across nodes" status="ok">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {[
            "traefik", "portainer", "n8n", "supabase", "homepage", "frigate",
            "pihole", "uptime-kuma", "watchtower", "vaultwarden", "code-server",
            "grafana", "prometheus", "loki", "speedtest", "qbittorrent",
            "sonarr", "radarr", "ollama", "open-webui", "homeassistant",
            "esphome", "zigbee2mqtt", "mosquitto",
          ].map((c) => (
            <div
              key={c}
              className="flex items-center gap-2 rounded-sm border border-chuck-line/60 bg-black/30 px-2 py-1.5"
            >
              <Container className="h-3 w-3 text-chuck-pink" />
              <span className="font-mono text-[11px]">{c}</span>
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BarCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black">
        <div
          className="h-full"
          style={{
            width: `${value}%`,
            background:
              value > 70
                ? "linear-gradient(90deg,#ff2d4a,#ff7a2d)"
                : "linear-gradient(90deg,#5577ff,#ff5577)",
            boxShadow: value > 70 ? "0 0 8px rgba(255,51,85,0.7)" : undefined,
          }}
        />
      </div>
      <span className="w-8 text-right text-chuck-mute">{value}%</span>
    </div>
  );
}
