import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function SalesDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalLeads },
    { count: assignedLeads },
    { count: unassignedLeads },
    { count: freshLeads },
    { count: demosToday },
    { count: demosWeek },
    { count: demoDoneCount },
    { count: wonCount },
    { count: followUpsDue },
    { data: openLeads },
    { data: accounts },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).not("owner_id", "is", null),
    supabase.from("leads").select("*", { count: "exact", head: true }).is("owner_id", null),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("demos").select("*", { count: "exact", head: true }).gte("scheduled_at", todayStart).lt("scheduled_at", todayEnd),
    supabase.from("demos").select("*", { count: "exact", head: true }).gte("scheduled_at", todayStart).lt("scheduled_at", weekEnd),
    supabase.from("leads").select("*", { count: "exact", head: true }).in("stage", ["demo_done", "negotiation", "won", "lost"]),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "won"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "demo_scheduled").lt("demo_date", now.toISOString()),
    supabase.from("leads").select("deal_value, stage").not("stage", "in", "(won,lost)"),
    supabase.from("accounts").select("mrr"),
  ]);

  const pipelineValue = (openLeads ?? []).reduce((sum, l) => sum + Number(l.deal_value ?? 0), 0);
  const stageWeights: Record<string, number> = {
    new: 0.05,
    contacted: 0.15,
    demo_scheduled: 0.35,
    demo_done: 0.55,
    negotiation: 0.75,
  };
  const weightedForecast = (openLeads ?? []).reduce(
    (sum, l) => sum + Number(l.deal_value ?? 0) * (stageWeights[l.stage as string] ?? 0),
    0,
  );
  const mrr = (accounts ?? []).reduce((sum, a) => sum + Number(a.mrr ?? 0), 0);
  const demoToConversion = demoDoneCount ? Math.round(((wonCount ?? 0) / demoDoneCount) * 100) : 0;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rawRecentTickets } = await supabase
    .from("tickets")
    .select("account_id, account:accounts(clinic_name, sold_by_rep_id, sold_by:profiles(name))")
    .gte("created_at", thirtyDaysAgo);
  const recentTickets = rawRecentTickets as unknown as
    | { account_id: string; account: { clinic_name: string; sold_by_rep_id: string | null; sold_by: { name: string } | null } | null }[]
    | null;

  const riskCounts = new Map<string, { name: string; count: number; repName: string | null }>();
  for (const t of recentTickets ?? []) {
    const acc = t.account;
    if (!acc) continue;
    const entry = riskCounts.get(t.account_id) ?? { name: acc.clinic_name, count: 0, repName: acc.sold_by?.name ?? null };
    entry.count += 1;
    riskCounts.set(t.account_id, entry);
  }
  const atRiskAccounts = Array.from(riskCounts.entries())
    .map(([accountId, v]) => ({ accountId, ...v }))
    .filter((v) => v.count >= 2)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sales Dashboard</h1>
        <p className="text-sm text-muted-foreground">Acquisition pipeline overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiTile label="Total leads" value={String(totalLeads ?? 0)} />
        <KpiTile label="Assigned" value={String(assignedLeads ?? 0)} />
        <KpiTile label="Unassigned" value={String(unassignedLeads ?? 0)} />
        <KpiTile label="Fresh (7d)" value={String(freshLeads ?? 0)} />
        <KpiTile label="Demos today" value={String(demosToday ?? 0)} />
        <KpiTile label="Demos this week" value={String(demosWeek ?? 0)} />
        <KpiTile label="Follow-ups due" value={String(followUpsDue ?? 0)} sub="Demo date passed, awaiting result" />
        <KpiTile label="Demo-to-win rate" value={`${demoToConversion}%`} />
        <KpiTile label="Pipeline value" value={currency.format(pipelineValue)} sub="Flat sum, open leads" />
        <KpiTile label="Weighted forecast" value={currency.format(weightedForecast)} sub="Stage-weighted" />
        <KpiTile label="MRR" value={currency.format(mrr)} sub="Closed-won accounts" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">At-risk accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {atRiskAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts with 2+ complaints in the last 30 days.</p>
          ) : (
            atRiskAccounts.map((a) => (
              <Link
                key={a.accountId}
                href={`/service/accounts/${a.accountId}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{a.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  Sold by {a.repName ?? "-"} · <Badge variant="destructive">{a.count} tickets</Badge>
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
