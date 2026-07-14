import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleEditor, TerritoryEditor, BulkAssignForm } from "./team-editors";
import type { Profile } from "@/lib/supabase/database.types";

export default async function TeamPage() {
  const supabase = await createClient();
  const session = await getCurrentProfile();

  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  const reps = (profiles ?? []).filter((p) => p.role === "sales_rep") as Profile[];
  const canEditRole = session?.profile.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">{profiles?.length ?? 0} team members</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk territory assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Assign every unassigned lead in a state to a rep in one action.
          </p>
          <BulkAssignForm reps={reps} />
        </CardContent>
      </Card>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Territory</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles ?? []).map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.name}</TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>
                  <RoleEditor profileId={profile.id} role={profile.role} canEdit={canEditRole} />
                </TableCell>
                <TableCell>
                  <TerritoryEditor profileId={profile.id} territory={profile.territory_state} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
