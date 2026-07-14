import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from "@/lib/supabase/database.types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function SalesMetricsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase.from("leads").select("*, owner:profiles(name)");
  const all = (leads ?? []) as unknown as (Lead & { owner: { name: string } | null })[];

  const total = all.length;
  const contacted = all.filter((l) => l.stage !== "new").length;
  const demoed = all.filter((l) => ["demo_scheduled", "demo_done", "negotiation", "won", "lost"].includes(l.stage)).length;
  const won = all.filter((l) => l.stage === "won").length;

  const funnel = [
    { label: "Total leads", count: total, rate: 100 },
    { label: "Contacted", count: contacted, rate: total ? Math.round((contacted / total) * 100) : 0 },
    { label: "Demo'd", count: demoed, rate: contacted ? Math.round((demoed / contacted) * 100) : 0 },
    { label: "Won", count: won, rate: demoed ? Math.round((won / demoed) * 100) : 0 },
  ];

  const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const riskQueue = all.filter(
    (l) =>
      !["won", "lost"].includes(l.stage) &&
      (l.priority === "urgent" || l.priority === "high") &&
      new Date(l.updated_at) < staleThreshold,
  );

  const byRep = new Map<string, { name: string; total: number; won: number; value: number }>();
  for (const lead of all) {
    if (!lead.owner_id) continue;
    const key = lead.owner_id;
    const entry = byRep.get(key) ?? { name: lead.owner?.name ?? "Unknown", total: 0, won: 0, value: 0 };
    entry.total += 1;
    if (lead.stage === "won") {
      entry.won += 1;
      entry.value += Number(lead.deal_value);
    }
    byRep.set(key, entry);
  }
  const leaderboard = Array.from(byRep.values()).sort((a, b) => b.won - a.won || b.total - a.total);

  const byState = new Map<string, { total: number; won: number }>();
  for (const lead of all) {
    const key = lead.state ?? "Unknown";
    const entry = byState.get(key) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (lead.stage === "won") entry.won += 1;
    byState.set(key, entry);
  }
  const geography = Array.from(byState.entries())
    .map(([state, v]) => ({ state, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sales Metrics</h1>
        <p className="text-sm text-muted-foreground">Funnel, leaderboard, risk queue, and geography</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {funnel.map((stage) => (
              <div key={stage.label} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{stage.label}</p>
                <p className="text-xl font-semibold">{stage.count}</p>
                <p className="text-xs text-muted-foreground">{stage.rate}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk queue ({riskQueue.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {riskQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No high-priority leads stuck for 14+ days.</p>
          ) : (
            riskQueue.map((lead) => (
              <Link
                key={lead.id}
                href={`/sales/leads/${lead.id}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{lead.clinic_name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {lead.stage} · <Badge variant="destructive">{lead.priority}</Badge>
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rep leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead>Total leads</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Value won</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No assigned leads yet.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((rep) => (
                  <TableRow key={rep.name}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell>{rep.total}</TableCell>
                    <TableCell>{rep.won}</TableCell>
                    <TableCell>{currency.format(rep.value)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top geographies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Won</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {geography.map((g) => (
                <TableRow key={g.state}>
                  <TableCell className="font-medium">{g.state}</TableCell>
                  <TableCell>{g.total}</TableCell>
                  <TableCell>{g.won}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
