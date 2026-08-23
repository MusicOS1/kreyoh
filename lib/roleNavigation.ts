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
  | "Super Admin"
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
  {
    label: "Workspace",
    href: "/workspace",
    icon: HomeIcon,
    roles: "all",
    activeMatch: (p) => p === "/workspace",
  },

  /*
   * PEOPLE
   * Everybody in the project should know
   * who is in the room.
   *
   * Add/edit/remove permissions are handled
   * inside the People page.
   */
  {
    label: "People",
    href: "/people",
    icon: UsersIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/people"),
  },

  /*
   * BEATS
   * Project members can see the music pool.
   * Individual actions remain role controlled.
   */
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
    badge: "P2",
  },

  {
    label: "Studio Sessions",
    href: "/studio-sessions",
    icon: MicIcon,
    roles: "all",
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

  /*
   * SPLITS
   * Contributors need visibility into rights
   * affecting their work.
   */
  {
    label: "Splits",
    href: "/splits",
    icon: LayersIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/splits"),
    badge: "P2",
  },

  /*
   * OPPORTUNITIES
   * Visible project-wide.
   * Creation/approval can still be limited
   * to A&R / Lead / Admin inside the page.
   */
  {
    label: "Opportunities",
    href: "/opportunities",
    icon: BriefcaseIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/opportunities"),
    badge: "P2",
  },

  /*
   * FINANCE stays controlled.
   */
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
  {
    label: "Notifications",
    href: "/notifications",
    icon: ActivityIcon,
    roles: "all",
    activeMatch: (p) => p.startsWith("/notifications"),
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
