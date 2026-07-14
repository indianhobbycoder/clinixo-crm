"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { LeadPriority, TicketCategory, TicketChannel, TicketStatus } from "@/lib/supabase/database.types";

async function logTicketActivity(ticketId: string, actorId: string, type: string, note?: string) {
  const supabase = await createClient();
  await supabase.from("activities").insert({
    subject_type: "ticket",
    subject_id: ticketId,
    actor_id: actorId,
    type,
    note: note ?? null,
  });
}

export async function lookupAccountByPhone(phone: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("*").eq("phone", phone.trim()).maybeSingle();
  return data;
}

export async function sendPhoneToSalesAsLead(phone: string, clinicName: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    clinic_name: clinicName || "Unknown (from Service CRM)",
    phone: phone.trim(),
    source: "service_referral",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/sales/leads");
}

export async function createTicket(
  accountId: string,
  channel: TicketChannel,
  category: TicketCategory,
  description: string,
  priority: LeadPriority,
) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { data: account } = await supabase.from("accounts").select("sold_by_rep_id").eq("id", accountId).single();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      account_id: accountId,
      channel,
      category,
      description,
      priority,
      sold_by_rep_id: account?.sold_by_rep_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logTicketActivity(ticket.id, session.userId, "created", `Ticket opened via ${channel}`);
  await supabase.from("activities").insert({
    subject_type: "account",
    subject_id: accountId,
    actor_id: session.userId,
    type: "ticket_opened",
    note: `Ticket opened: ${category}`,
  });

  revalidatePath("/service/tickets");
  revalidatePath("/service/dashboard");
  return ticket;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const update: { status: TicketStatus; resolved_at?: string | null } = { status };
  if (status === "resolved") update.resolved_at = new Date().toISOString();
  if (status !== "resolved" && status !== "closed") update.resolved_at = null;

  const { error } = await supabase.from("tickets").update(update).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logTicketActivity(ticketId, session.userId, "status_change", `Status changed to ${status}`);
  revalidatePath(`/service/tickets/${ticketId}`);
  revalidatePath("/service/tickets");
  revalidatePath("/service/dashboard");
}

export async function assignTicket(ticketId: string, agentId: string | null) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("tickets").update({ assigned_agent_id: agentId }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logTicketActivity(ticketId, session.userId, "assigned", agentId ? "Ticket assigned" : "Ticket unassigned");
  revalidatePath(`/service/tickets/${ticketId}`);
  revalidatePath("/service/tickets");
}

export async function resolveTicket(ticketId: string, resolutionNotes: string, csat: number | null) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");
  if (!resolutionNotes.trim()) throw new Error("Resolution notes are required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_notes: resolutionNotes, csat })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logTicketActivity(ticketId, session.userId, "resolved", resolutionNotes);
  revalidatePath(`/service/tickets/${ticketId}`);
  revalidatePath("/service/tickets");
  revalidatePath("/service/dashboard");
}

export async function reopenTicket(ticketId: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("tickets").update({ status: "in_progress", resolved_at: null }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logTicketActivity(ticketId, session.userId, "reopened", "Customer reopened ticket");
  revalidatePath(`/service/tickets/${ticketId}`);
  revalidatePath("/service/tickets");
  revalidatePath("/service/dashboard");
}

export async function addTicketNote(ticketId: string, note: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");
  if (!note.trim()) return;

  await logTicketActivity(ticketId, session.userId, "note", note.trim());
  revalidatePath(`/service/tickets/${ticketId}`);
}
