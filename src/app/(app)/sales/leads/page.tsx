import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeadPriority, LeadStage } from "@/lib/supabase/database.types";

const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  demo_scheduled: "Demo Scheduled",
  demo_done: "Demo Done",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const PRIORITY_VARIANT: Record<LeadPriority, "destructive" | "default" | "secondary" | "outline"> = {
  urgent: "destructive",
  high: "default",
  normal: "secondary",
  low: "outline",
};

interface SearchParams {
  stage?: string;
  priority?: string;
  state?: string;
  speciality?: string;
  q?: string;
}

interface LeadListRow {
  id: string;
  clinic_name: string;
  phone: string;
  city: string | null;
  state: string | null;
  speciality: string | null;
  stage: LeadStage;
  priority: LeadPriority;
  rating: number | null;
  owner: { name: string } | null;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select("id, clinic_name, phone, city, state, speciality, stage, priority, rating, owner:profiles(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.stage) query = query.eq("stage", params.stage as LeadStage);
  if (params.priority) query = query.eq("priority", params.priority as LeadPriority);
  if (params.state) query = query.eq("state", params.state);
  if (params.speciality) query = query.eq("speciality", params.speciality);
  if (params.q) query = query.ilike("clinic_name", `%${params.q}%`);

  const { data: rawLeads, error } = await query;
  const leads = rawLeads as unknown as LeadListRow[] | null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads?.length ?? 0} leads shown (max 100)</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Failed to load leads: {error.message}</p>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Speciality</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads ?? []).map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/sales/leads/${lead.id}`} className="hover:underline">
                      {lead.clinic_name}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    {lead.city ? `${lead.city}, ${lead.state ?? ""}` : lead.state ?? "-"}
                  </TableCell>
                  <TableCell>{lead.speciality ?? "-"}</TableCell>
                  <TableCell>{STAGE_LABEL[lead.stage]}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[lead.priority]}>{lead.priority}</Badge>
                  </TableCell>
                  <TableCell>{lead.rating ?? "-"}</TableCell>
                  <TableCell>{lead.owner?.name ?? "Unassigned"}</TableCell>
                </TableRow>
              ))}
              {(leads ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No leads yet. Import leads to get started.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
