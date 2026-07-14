"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileRole, updateProfileTerritory, bulkAssignTerritory } from "./actions";
import type { UserRole, Profile } from "@/lib/supabase/database.types";

const ROLES: UserRole[] = ["admin", "sales_manager", "sales_rep", "support_agent", "support_lead"];

export function RoleEditor({ profileId, role, canEdit }: { profileId: string; role: UserRole; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (!canEdit) return <span className="text-sm">{role.replace("_", " ")}</span>;

  return (
    <Select
      key={role}
      defaultValue={role}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateProfileRole(profileId, value as UserRole);
            toast.success("Role updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update role");
          }
        })
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TerritoryEditor({ profileId, territory }: { profileId: string; territory: string | null }) {
  const [value, setValue] = useState(territory ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="State"
        className="w-32"
        onBlur={() =>
          startTransition(async () => {
            try {
              await updateProfileTerritory(profileId, value || null);
              toast.success("Territory updated");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to update territory");
            }
          })
        }
        disabled={isPending}
      />
    </div>
  );
}

export function BulkAssignForm({ reps }: { reps: Profile[] }) {
  const [state, setState] = useState("");
  const [repId, setRepId] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">State</p>
        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Karnataka" className="w-40" />
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Assign to</p>
        <Select value={repId} onValueChange={(value) => setRepId(value ?? "")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select rep" />
          </SelectTrigger>
          <SelectContent>
            {reps.map((rep) => (
              <SelectItem key={rep.id} value={rep.id}>
                {rep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        disabled={!state || !repId || isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await bulkAssignTerritory(state, repId);
              toast.success(`Unassigned leads in ${state} assigned`);
              setState("");
              setRepId("");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Bulk assign failed");
            }
          })
        }
      >
        Bulk assign
      </Button>
    </div>
  );
}
