import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Account, Activity, Ticket } from "@/lib/supabase/database.types";

type AccountWithSoldBy = Account & { sold_by: { name: string } | null };
type ActivityWithActor = Activity & { actor: { name: string } | null };
type TicketWithAssigned = Ticket & { assigned: { name: string } | null };

export default async function AccountProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rawAccount }, { data: rawActivities }, { data: rawTickets }] = await Promise.all([
    supabase.from("accounts").select("*, sold_by:profiles(name)").eq("id", id).single(),
    supabase.from("activities").select("*, actor:profiles(name)").eq("subject_type", "account").eq("subject_id", id).order("created_at", { ascending: false }),
    supabase.from("tickets").select("*, assigned:profiles!tickets_assigned_agent_id_fkey(name)").eq("account_id", id).order("created_at", { ascending: false }),
  ]);

  const account = rawAccount as unknown as AccountWithSoldBy | null;
  const activities = rawActivities as unknown as ActivityWithActor[] | null;
  const tickets = rawTickets as unknown as TicketWithAssigned[] | null;

  if (!account) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{account.clinic_name}</h1>
        <p className="text-sm text-muted-foreground">
          {account.phone} · Sold by {account.sold_by?.name ?? "-"} · MRR ₹
          {Number(account.mrr).toLocaleString("en-IN")}
        </p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales history</TabsTrigger>
          <TabsTrigger value="service">Service history</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {account.converted_from_lead_id ? (
                <Link href={`/sales/leads/${account.converted_from_lead_id}`} className="text-sm text-primary hover:underline">
                  View originating lead
                </Link>
              ) : null}
              {(activities ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales activity recorded on this account yet.</p>
              ) : (
                (activities ?? []).map((activity) => (
                  <div key={activity.id} className="text-sm">
                    <p className="text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()} · {activity.actor?.name ?? "System"}
                    </p>
                    <p>{activity.note ?? activity.type}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(tickets ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No support tickets for this account.</p>
              ) : (
                (tickets ?? []).map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/service/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{ticket.category.replace("_", " ")}</p>
                      <p className="text-muted-foreground">{ticket.description.slice(0, 80)}</p>
                    </div>
                    <Badge variant="outline">{ticket.status.replace("_", " ")}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
