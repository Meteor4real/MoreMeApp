import {
  LayoutDashboard,
  Terminal,
  Workflow,
  Server,
  Network,
  GitBranch,
  ShieldAlert,
  Youtube,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/ai", label: "AI Terminal", icon: Terminal, badge: "LIVE" },
  { href: "/automation", label: "Automation", icon: Workflow },
  { href: "/homelab", label: "Homelab", icon: Server },
  { href: "/networking", label: "Networking", icon: Network },
  { href: "/dev", label: "Dev & Deploy", icon: GitBranch },
  { href: "/security", label: "Security Lab", icon: ShieldAlert },
  { href: "/content", label: "Content", icon: Youtube },
  { href: "/settings", label: "Settings", icon: Settings },
];
