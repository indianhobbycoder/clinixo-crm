import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusEditor, AgentEditor, ResolveForm, ReopenButton, TicketNoteForm } from "./ticket-editors";
import type { Account, Activity, Profile, Ticket } from "@/lib/supabase/database.types";

type TicketWithAccount = Ticket & { account: Account | null };
type ActivityWithActor = Activity & { actor: { name: string } | null };

export default async function TicketWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rawTicket }, { data: agents }, { data: rawActivities }] = await Promise.all([
    supabase.from("tickets").select("*, account:accounts(*)").eq("id", id).single(),
    supabase.from("profiles").select("*").in("role", ["support_agent", "support_lead", "admin"]).order("name"),
    supabase
      .from("activities")
      .select("*, actor:profiles(name)")
      .eq("subject_type", "ticket")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const ticket = rawTicket as unknown as TicketWithAccount | null;
  const activities = rawActivities as unknown as ActivityWithActor[] | null;

  if (!ticket) notFound();

  const account = ticket.account;
  const breached = !["resolved", "closed"].includes(ticket.status) && new Date(ticket.sla_due_at).getTime() < Date.now();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.category.replace("_", " ")} complaint</h1>
          <p className="text-sm text-muted-foreground">
            {account ? (
              <Link href={`/service/accounts/${account.id}`} className="hover:underline">
                {account.clinic_name}
              </Link>
            ) : (
              "Unknown account"
            )}{" "}
            · {account?.phone} · via {ticket.channel}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{ticket.description}</p>
          </CardContent>
        </Card>

        {ticket.status === "resolved" || ticket.status === "closed" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{ticket.resolution_notes}</p>
              {ticket.csat ? <p className="text-sm text-muted-foreground">CSAT: {ticket.csat}/5</p> : null}
              <ReopenButton ticketId={ticket.id} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolve ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <ResolveForm ticketId={ticket.id} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TicketNoteForm ticketId={ticket.id} />
            <Separator />
            <div className="space-y-3">
              {(activities ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
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
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Status</p>
              <StatusEditor ticketId={ticket.id} status={ticket.status} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Priority</p>
              <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>{ticket.priority}</Badge>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">SLA due</p>
              {breached ? (
                <Badge variant="destructive">Breached {new Date(ticket.sla_due_at).toLocaleString()}</Badge>
              ) : (
                <p className="text-sm">{new Date(ticket.sla_due_at).toLocaleString()}</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Assigned agent</p>
              <AgentEditor ticketId={ticket.id} agentId={ticket.assigned_agent_id} agents={(agents ?? []) as Profile[]} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
