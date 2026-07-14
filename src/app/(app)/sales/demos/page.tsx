import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Demo } from "@/lib/supabase/database.types";

type DemoWithLead = Demo & { lead: { id: string; clinic_name: string; phone: string; owner: { name: string } | null } | null };

export default async function DemosPage() {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [{ data: rawUpcoming }, { data: rawPast }] = await Promise.all([
    supabase
      .from("demos")
      .select("*, lead:leads(id, clinic_name, phone, owner:profiles(name))")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("demos")
      .select("*, lead:leads(id, clinic_name, phone, owner:profiles(name))")
      .lt("scheduled_at", now)
      .order("scheduled_at", { ascending: false })
      .limit(50),
  ]);

  const upcoming = rawUpcoming as unknown as DemoWithLead[] | null;
  const past = rawPast as unknown as DemoWithLead[] | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Demos</h1>
        <p className="text-sm text-muted-foreground">Scheduled product demos across the pipeline</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming ({upcoming?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(upcoming ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming demos scheduled.</p>
          ) : (
            (upcoming ?? []).map((demo) => {
              const lead = demo.lead;
              return (
                <Link
                  key={demo.id}
                  href={lead ? `/sales/leads/${lead.id}` : "#"}
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{lead?.clinic_name ?? "Unknown lead"}</p>
                    <p className="text-muted-foreground">{lead?.phone} · Owner: {lead?.owner?.name ?? "Unassigned"}</p>
                  </div>
                  <div className="text-right">
                    <p>{new Date(demo.scheduled_at).toLocaleString()}</p>
                    <Badge variant="outline">{demo.result}</Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past ({past?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(past ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No past demos.</p>
          ) : (
            (past ?? []).map((demo) => {
              const lead = demo.lead;
              return (
                <Link
                  key={demo.id}
                  href={lead ? `/sales/leads/${lead.id}` : "#"}
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{lead?.clinic_name ?? "Unknown lead"}</p>
                    <p className="text-muted-foreground">{lead?.phone} · Owner: {lead?.owner?.name ?? "Unassigned"}</p>
                  </div>
                  <div className="text-right">
                    <p>{new Date(demo.scheduled_at).toLocaleString()}</p>
                    <Badge variant={demo.result === "won" ? "default" : demo.result === "lost" ? "destructive" : "outline"}>
                      {demo.result}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
