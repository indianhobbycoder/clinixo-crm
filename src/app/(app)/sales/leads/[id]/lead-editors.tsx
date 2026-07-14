"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadStage, updateLeadPriority, updateLeadOwner, addLeadNote, scheduleDemo } from "@/app/(app)/sales/leads/actions";
import type { LeadPriority, LeadStage, Profile } from "@/lib/supabase/database.types";

const STAGES: LeadStage[] = ["new", "contacted", "demo_scheduled", "demo_done", "negotiation", "won", "lost"];
const PRIORITIES: LeadPriority[] = ["urgent", "high", "normal", "low"];

export function StageEditor({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      key={stage}
      defaultValue={stage}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateLeadStage(leadId, value as LeadStage);
            toast.success("Stage updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update stage");
          }
        })
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PriorityEditor({ leadId, priority }: { leadId: string; priority: LeadPriority }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      key={priority}
      defaultValue={priority}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateLeadPriority(leadId, value as LeadPriority);
            toast.success("Priority updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update priority");
          }
        })
      }
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OwnerEditor({ leadId, ownerId, reps }: { leadId: string; ownerId: string | null; reps: Profile[] }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      key={ownerId ?? "unassigned"}
      defaultValue={ownerId ?? "unassigned"}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateLeadOwner(leadId, value === "unassigned" ? null : value);
            toast.success("Owner updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update owner");
          }
        })
      }
    >
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {reps.map((rep) => (
          <SelectItem key={rep.id} value={rep.id}>
            {rep.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DemoScheduler({ leadId }: { leadId: string }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="w-56" />
      <Button
        size="sm"
        disabled={!value || isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await scheduleDemo(leadId, new Date(value).toISOString());
              toast.success("Demo scheduled");
              setValue("");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to schedule demo");
            }
          })
        }
      >
        Schedule demo
      </Button>
    </div>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea placeholder="Log a call, email, or note..." value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        size="sm"
        disabled={!value.trim() || isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await addLeadNote(leadId, value);
              setValue("");
              toast.success("Note added");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to add note");
            }
          })
        }
      >
        Add note
      </Button>
    </div>
  );
}
