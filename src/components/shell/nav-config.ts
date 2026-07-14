import type { UserRole } from "@/lib/supabase/database.types";

export type Mode = "sales" | "service";

export interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

export const SALES_NAV: NavItem[] = [
  { label: "Dashboard", href: "/sales/dashboard", roles: ["admin", "sales_manager", "sales_rep"] },
  { label: "Leads", href: "/sales/leads", roles: ["admin", "sales_manager", "sales_rep"] },
  { label: "Demos", href: "/sales/demos", roles: ["admin", "sales_manager", "sales_rep"] },
  { label: "Import", href: "/sales/import", roles: ["admin", "sales_manager", "sales_rep"] },
  { label: "Team", href: "/sales/team", roles: ["admin", "sales_manager"] },
  { label: "Metrics", href: "/sales/metrics", roles: ["admin", "sales_manager", "sales_rep"] },
];

export const SERVICE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/service/dashboard", roles: ["admin", "sales_manager", "support_agent", "support_lead"] },
  { label: "Tickets", href: "/service/tickets", roles: ["admin", "sales_manager", "support_agent", "support_lead"] },
];

export const ROLES_WITH_SALES: UserRole[] = ["admin", "sales_manager", "sales_rep"];
export const ROLES_WITH_SERVICE: UserRole[] = ["admin", "sales_manager", "support_agent", "support_lead"];

export function navForMode(mode: Mode, role: UserRole): NavItem[] {
  const items = mode === "sales" ? SALES_NAV : SERVICE_NAV;
  return items.filter((item) => item.roles.includes(role));
}
