import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewComplaintDialog } from "./new-complaint";
import type { Ticket } from "@/lib/supabase/database.types";

type TicketRow = Ticket & { account: { clinic_name: string; phone: string } | null; assigned: { name: string } | null };

export default async function TicketsPage() {
  const supabase = await createClient();

  const { data: rawTickets } = await supabase
    .from("tickets")
    .select("*, account:accounts(clinic_name, phone), assigned:profiles!tickets_assigned_agent_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const tickets = rawTickets as unknown as TicketRow[] | null;

  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">{tickets?.length ?? 0} tickets</p>
        </div>
        <NewComplaintDialog />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tickets ?? []).map((ticket) => {
              const account = ticket.account;
              const assigned = ticket.assigned;
              const breached = !["resolved", "closed"].includes(ticket.status) && new Date(ticket.sla_due_at).getTime() < now;
              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link href={`/service/tickets/${ticket.id}`} className="hover:underline">
                      {account?.clinic_name ?? "Unknown"}
                    </Link>
                  </TableCell>
                  <TableCell>{ticket.category.replace("_", " ")}</TableCell>
                  <TableCell>{ticket.channel}</TableCell>
                  <TableCell>
                    <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>{ticket.priority}</Badge>
                  </TableCell>
                  <TableCell>{ticket.status.replace("_", " ")}</TableCell>
                  <TableCell>
                    {breached ? (
                      <Badge variant="destructive">Breached</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{new Date(ticket.sla_due_at).toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell>{assigned?.name ?? "Unassigned"}</TableCell>
                </TableRow>
              );
            })}
            {(tickets ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No tickets yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
