import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StageEditor, PriorityEditor, OwnerEditor, DemoScheduler, NoteForm } from "./lead-editors";
import type { Activity, Lead, Profile } from "@/lib/supabase/database.types";

type LeadWithOwner = Lead & { owner: { id: string; name: string } | null };
type ActivityWithActor = Activity & { actor: { name: string } | null };

export default async function LeadWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rawLead }, { data: reps }, { data: rawActivities }, { data: demos }] = await Promise.all([
    supabase.from("leads").select("*, owner:profiles(id, name)").eq("id", id).single(),
    supabase.from("profiles").select("*").in("role", ["sales_rep", "sales_manager", "admin"]).order("name"),
    supabase
      .from("activities")
      .select("*, actor:profiles(name)")
      .eq("subject_type", "lead")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("demos").select("*").eq("lead_id", id).order("scheduled_at", { ascending: false }),
  ]);

  const lead = rawLead as unknown as LeadWithOwner | null;
  const activities = rawActivities as unknown as ActivityWithActor[] | null;

  if (!lead) notFound();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-semibold">{lead.clinic_name}</h1>
          <p className="text-sm text-muted-foreground">
            {lead.phone} · {lead.address ?? `${lead.city ?? ""}, ${lead.state ?? ""}`}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Speciality</p>
              <p>{lead.speciality ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rating</p>
              <p>
                {lead.rating ?? "-"} ({lead.review_count} reviews)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Priority score</p>
              <p>{lead.priority_score}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Deal value</p>
              <p>₹{Number(lead.deal_value).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Source</p>
              <p>{lead.source}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule a demo</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoScheduler leadId={lead.id} />
            {demos && demos.length > 0 ? (
              <div className="mt-4 space-y-2">
                {demos.map((demo) => (
                  <div key={demo.id} className="flex items-center justify-between text-sm">
                    <span>{new Date(demo.scheduled_at).toLocaleString()}</span>
                    <Badge variant="outline">{demo.result}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NoteForm leadId={lead.id} />
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
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Stage</p>
              <StageEditor leadId={lead.id} stage={lead.stage} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Priority</p>
              <PriorityEditor leadId={lead.id} priority={lead.priority} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Owner</p>
              <OwnerEditor leadId={lead.id} ownerId={lead.owner_id} reps={(reps ?? []) as Profile[]} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
