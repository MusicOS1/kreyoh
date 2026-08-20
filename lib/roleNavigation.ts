import {
  ActivityIcon,
  BriefcaseIcon,
  CheckIcon,
  DiscIcon,
  HomeIcon,
  LayersIcon,
  MicIcon,
  MusicIcon,
  UsersIcon,
  WalletIcon,
} from "../components/Icons";

export type KreyohRole =
  | "Admin"
  | "Project Lead"
  | "Artist"
  | "Producer"
  | "Engineer"
  | "A&R"
  | "Finance";

type NavItem = {
  label: string;
  href: string;
  icon: typeof HomeIcon;
  roles: KreyohRole[] | "all";
  activeMatch: (pathname: string) => boolean;
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: HomeIcon, roles: "all", activeMatch: (p) => p === "/" },
  {
    label: "People",
    href: "/people",
    icon: UsersIcon,
    roles: ["Admin", "Project Lead", "Artist", "Producer", "Engineer", "A&R"],
    activeMatch: (p) => p.startsWith("/people"),
  },
  {
    label: "Beats",
    href: "/beats",
    icon: MusicIcon,
    roles: ["Admin", "Project Lead", "Artist", "Producer", "A&R"],
    activeMatch: (p) => p.startsWith("/beats"),
    badge: "LIVE",
  },
  {
    label: "Tracks",
    href: "/tracks",
    icon: DiscIcon,
    roles: ["Admin", "Project Lead", "Artist", "Producer", "Engineer", "A&R"],
    activeMatch: (p) => p.startsWith("/tracks"),
    badge: "P2",
  },
  {
    label: "Studio Sessions",
    href: "/studio-sessions",
    icon: MicIcon,
    roles: ["Admin", "Project Lead", "Artist", "Producer", "Engineer"],
    activeMatch: (p) => p.startsWith("/studio-sessions"),
    badge: "P2",
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/tasks"),
    badge: "P2",
  },
  {
    label: "Splits",
    href: "/splits",
    icon: LayersIcon,
    roles: ["Admin", "Project Lead", "Artist", "Producer", "Engineer", "Finance"],
    activeMatch: (p) => p.startsWith("/splits"),
    badge: "P2",
  },
  {
    label: "Opportunities",
    href: "/opportunities",
    icon: BriefcaseIcon,
    roles: ["Admin", "Project Lead", "A&R", "Finance"],
    activeMatch: (p) => p.startsWith("/opportunities"),
    badge: "P2",
  },
  {
    label: "Finance",
    href: "/finance",
    icon: WalletIcon,
    roles: ["Admin", "Project Lead", "Finance"],
    activeMatch: (p) => p.startsWith("/finance"),
    badge: "P2",
  },
  {
    label: "Activity",
    href: "/activity",
    icon: ActivityIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/activity"),
  },
];

export function getNavigationForRoles(roles: string[]) {
  const normalized = new Set(roles.map((role) => role.trim()));
  const effectiveRoles = normalized as Set<string>;

  return NAV_ITEMS.filter((item) => {
    if (item.roles === "all") return true;
    return item.roles.some((role) => effectiveRoles.has(role));
  });
}

export function hasManagementRole(roles: string[]) {
  return roles.includes("Admin") || roles.includes("Project Lead");
}
