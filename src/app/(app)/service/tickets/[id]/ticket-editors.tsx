"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  updateTicketStatus,
  assignTicket,
  resolveTicket,
  reopenTicket,
  addTicketNote,
} from "@/app/(app)/service/tickets/actions";
import type { Profile, TicketStatus } from "@/lib/supabase/database.types";

const STATUSES: TicketStatus[] = ["new", "acknowledged", "in_progress", "resolved", "closed"];

export function StatusEditor({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      key={status}
      defaultValue={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateTicketStatus(ticketId, value as TicketStatus);
            toast.success("Status updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update status");
          }
        })
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AgentEditor({ ticketId, agentId, agents }: { ticketId: string; agentId: string | null; agents: Profile[] }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      key={agentId ?? "unassigned"}
      defaultValue={agentId ?? "unassigned"}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await assignTicket(ticketId, value === "unassigned" ? null : value);
            toast.success("Agent updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to assign");
          }
        })
      }
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ResolveForm({ ticketId }: { ticketId: string }) {
  const [notes, setNotes] = useState("");
  const [csat, setCsat] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea placeholder="Resolution notes (required)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Input
        type="number"
        min={1}
        max={5}
        placeholder="CSAT 1-5 (optional)"
        value={csat}
        onChange={(e) => setCsat(e.target.value)}
        className="w-40"
      />
      <Button
        size="sm"
        disabled={!notes.trim() || isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await resolveTicket(ticketId, notes, csat ? Number(csat) : null);
              toast.success("Ticket resolved");
              setNotes("");
              setCsat("");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to resolve");
            }
          })
        }
      >
        Resolve ticket
      </Button>
    </div>
  );
}

export function ReopenButton({ ticketId }: { ticketId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await reopenTicket(ticketId);
            toast.success("Ticket reopened");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to reopen");
          }
        })
      }
    >
      Reopen
    </Button>
  );
}

export function TicketNoteForm({ ticketId }: { ticketId: string }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea placeholder="Log a note..." value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        size="sm"
        disabled={!value.trim() || isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await addTicketNote(ticketId, value);
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
