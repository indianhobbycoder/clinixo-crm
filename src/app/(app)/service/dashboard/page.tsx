import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Ticket } from "@/lib/supabase/database.types";

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default async function ServiceDashboardPage() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, account:accounts(clinic_name), assigned:profiles!tickets_assigned_agent_id_fkey(name)");

  const all = (tickets ?? []) as unknown as (Ticket & {
    account: { clinic_name: string } | null;
    assigned: { name: string } | null;
  })[];

  const now = Date.now();
  const open = all.filter((t) => !["resolved", "closed"].includes(t.status));
  const breached = open.filter((t) => new Date(t.sla_due_at).getTime() < now);
  const aging24 = open.filter((t) => now - new Date(t.created_at).getTime() > 24 * 60 * 60 * 1000);
  const aging72 = open.filter((t) => now - new Date(t.created_at).getTime() > 72 * 60 * 60 * 1000);

  const categoryCounts = new Map<string, number>();
  for (const t of all) categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  const topCategories = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentByAccount = new Map<string, { name: string; count: number }>();
  for (const t of all) {
    if (new Date(t.created_at).getTime() < thirtyDaysAgo) continue;
    const entry = recentByAccount.get(t.account_id) ?? { name: t.account?.clinic_name ?? "Unknown", count: 0 };
    entry.count += 1;
    recentByAccount.set(t.account_id, entry);
  }
  const repeatComplainants = Array.from(recentByAccount.entries())
    .map(([accountId, v]) => ({ accountId, ...v }))
    .filter((v) => v.count >= 2)
    .sort((a, b) => b.count - a.count);

  const byAgent = new Map<string, { name: string; resolved: number; totalCsat: number; csatCount: number; avgResolutionHrs: number[] }>();
  for (const t of all) {
    if (!t.assigned_agent_id || t.status !== "resolved" || !t.resolved_at) continue;
    const entry = byAgent.get(t.assigned_agent_id) ?? {
      name: t.assigned?.name ?? "Unknown",
      resolved: 0,
      totalCsat: 0,
      csatCount: 0,
      avgResolutionHrs: [],
    };
    entry.resolved += 1;
    if (t.csat) {
      entry.totalCsat += t.csat;
      entry.csatCount += 1;
    }
    entry.avgResolutionHrs.push((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000);
    byAgent.set(t.assigned_agent_id, entry);
  }
  const agentPerformance = Array.from(byAgent.values()).map((a) => ({
    ...a,
    avgCsat: a.csatCount ? (a.totalCsat / a.csatCount).toFixed(1) : "-",
    avgHrs: a.avgResolutionHrs.length ? Math.round(a.avgResolutionHrs.reduce((s, v) => s + v, 0) / a.avgResolutionHrs.length) : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Dashboard</h1>
        <p className="text-sm text-muted-foreground">Support queue health</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile label="Open tickets" value={String(open.length)} />
        <KpiTile label="SLA breached" value={String(breached.length)} />
        <KpiTile label="Open > 24h" value={String(aging24.length)} />
        <KpiTile label="Open > 72h" value={String(aging72.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA breach queue ({breached.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {breached.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets past their SLA due date.</p>
          ) : (
            breached.map((t) => (
              <Link key={t.id} href={`/service/tickets/${t.id}`} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50">
                <span className="font-medium">{t.account?.clinic_name ?? "Unknown"}</span>
                <Badge variant="destructive">Due {new Date(t.sla_due_at).toLocaleString()}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repeat complainants (2+ tickets in 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {repeatComplainants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repeat complainants — no churn-risk flags right now.</p>
          ) : (
            repeatComplainants.map((rc) => (
              <Link
                key={rc.accountId}
                href={`/service/accounts/${rc.accountId}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{rc.name}</span>
                <Badge variant="destructive">{rc.count} tickets</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top complaint categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              topCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span>{category.replace("_", " ")}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agentPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resolved tickets yet.</p>
            ) : (
              agentPerformance.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">
                    {a.resolved} resolved · avg {a.avgHrs}h · CSAT {a.avgCsat}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
