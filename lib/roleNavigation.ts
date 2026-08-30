import {
  ActivityIcon,
  BriefcaseIcon,
  CheckIcon,
  DiscIcon,
  FileIcon,
  HomeIcon,
  LayersIcon,
  MicIcon,
  MusicIcon,
  UsersIcon,
  WalletIcon,
} from "../components/Icons";

export type KreyohRole =
  | "Super Admin"
  | "Admin"
  | "Project Lead"
  | "Artist"
  | "Producer"
  | "Engineer"
  | "A&R"
  | "Finance"
  | "Manager"
  | "Project Admin";

type NavItem = {
  label: string;
  href: string;
  icon: typeof HomeIcon;
  roles: KreyohRole[] | "all";
  activeMatch: (pathname: string) => boolean;
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Workspace",
    href: "/workspace",
    icon: HomeIcon,
    roles: "all",
    activeMatch: (p) => p === "/workspace",
  },

  {
    label: "People",
    href: "/people",
    icon: UsersIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/people"),
  },

  {
    label: "Beats",
    href: "/beats",
    icon: MusicIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/beats"),
    badge: "LIVE",
  },

  {
    label: "Tracks",
    href: "/tracks",
    icon: DiscIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/tracks"),
  },

  {
    label: "Studio Sessions",
    href: "/studio-sessions",
    icon: MicIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/studio-sessions"),
  },

  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/tasks"),
  },

  {
    label: "Documents",
    href: "/documents",
    icon: FileIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/documents"),
  },

  {
    label: "Splits",
    href: "/splits",
    icon: LayersIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/splits"),
  },

  {
    label: "Opportunities",
    href: "/opportunities",
    icon: BriefcaseIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/opportunities"),
  },

  {
    label: "Finance",
    href: "/finance",
    icon: WalletIcon,
    roles: ["Super Admin", "Admin", "Project Lead", "Finance"],
    activeMatch: (p) => p.startsWith("/finance"),
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
  const normalizedRoles = new Set(
    roles.map((role) => role.trim())
  );

  return NAV_ITEMS.filter((item) => {
    if (item.roles === "all") {
      return true;
    }

    return item.roles.some((role) =>
      normalizedRoles.has(role)
    );
  });
}

export function hasManagementRole(roles: string[]) {
  return (
    roles.includes("Super Admin") ||
    roles.includes("Admin") ||
    roles.includes("Project Lead")
  );
}

export function canManagePeople(roles: string[]) {
  return hasManagementRole(roles);
}

export function canManageProject(roles: string[]) {
  return hasManagementRole(roles);
}

export function canManageFinance(roles: string[]) {
  return (
    roles.includes("Super Admin") ||
    roles.includes("Admin") ||
    roles.includes("Project Lead") ||
    roles.includes("Finance")
  );
}

export function canManageOpportunities(roles: string[]) {
  return (
    roles.includes("Super Admin") ||
    roles.includes("Admin") ||
    roles.includes("Project Lead") ||
    roles.includes("A&R")
  );
}
