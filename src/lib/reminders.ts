import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/database.types";

export interface Reminder {
  id: string;
  label: string;
  sub: string;
  href: string;
  urgent: boolean;
}

const SALES_ROLES = ["admin", "sales_manager", "sales_rep"];
const SUPPORT_ROLES = ["admin", "support_agent", "support_lead"];

export async function getReminders(profile: Profile): Promise<Reminder[]> {
  const supabase = await createClient();
  const reminders: Reminder[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  if (SALES_ROLES.includes(profile.role)) {
    let followUpsQuery = supabase
      .from("leads")
      .select("id, clinic_name, demo_date")
      .eq("stage", "demo_scheduled")
      .lt("demo_date", now.toISOString())
      .order("demo_date", { ascending: true })
      .limit(5);
    if (profile.role === "sales_rep") followUpsQuery = followUpsQuery.eq("owner_id", profile.id);
    const { data: followUps } = await followUpsQuery;
    for (const lead of followUps ?? []) {
      reminders.push({
        id: `followup-${lead.id}`,
        label: `Follow-up overdue: ${lead.clinic_name}`,
        sub: "Demo date passed, no result logged",
        href: `/sales/leads/${lead.id}`,
        urgent: true,
      });
    }

    const demosQuery = supabase
      .from("demos")
      .select("id, scheduled_at, lead:leads(id, clinic_name, owner_id)")
      .gte("scheduled_at", todayStart)
      .lt("scheduled_at", todayEnd)
      .order("scheduled_at", { ascending: true })
      .limit(5);
    const { data: rawDemosToday } = await demosQuery;
    const demosToday = rawDemosToday as unknown as
      | { id: string; scheduled_at: string; lead: { id: string; clinic_name: string; owner_id: string | null } | null }[]
      | null;
    for (const demo of demosToday ?? []) {
      const lead = demo.lead;
      if (!lead) continue;
      if (profile.role === "sales_rep" && lead.owner_id !== profile.id) continue;
      reminders.push({
        id: `demo-${demo.id}`,
        label: `Demo today: ${lead.clinic_name}`,
        sub: new Date(demo.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        href: `/sales/leads/${lead.id}`,
        urgent: false,
      });
    }
  }

  if (SUPPORT_ROLES.includes(profile.role)) {
    const breachQuery = supabase
      .from("tickets")
      .select("id, category, sla_due_at, account:accounts(clinic_name), assigned_agent_id")
      .not("status", "in", "(resolved,closed)")
      .lt("sla_due_at", now.toISOString())
      .order("sla_due_at", { ascending: true })
      .limit(5);
    const { data: rawBreaches } = await breachQuery;
    const breaches = rawBreaches as unknown as
      | { id: string; category: string; sla_due_at: string; assigned_agent_id: string | null; account: { clinic_name: string } | null }[]
      | null;
    for (const ticket of breaches ?? []) {
      if (profile.role === "support_agent" && ticket.assigned_agent_id !== profile.id) continue;
      const account = ticket.account;
      reminders.push({
        id: `sla-${ticket.id}`,
        label: `SLA breached: ${account?.clinic_name ?? "Unknown"}`,
        sub: ticket.category.replace("_", " "),
        href: `/service/tickets/${ticket.id}`,
        urgent: true,
      });
    }
  }

  return reminders;
}
