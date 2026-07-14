"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { LeadPriority, LeadStage } from "@/lib/supabase/database.types";

async function logActivity(leadId: string, actorId: string, type: string, note?: string) {
  const supabase = await createClient();
  await supabase.from("activities").insert({
    subject_type: "lead",
    subject_id: leadId,
    actor_id: actorId,
    type,
    note: note ?? null,
  });
}

export async function updateLeadStage(leadId: string, stage: LeadStage) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ stage }).eq("id", leadId);
  if (error) throw new Error(error.message);

  await logActivity(leadId, session.userId, "stage_change", `Stage changed to ${stage}`);
  revalidatePath(`/sales/leads/${leadId}`);
  revalidatePath("/sales/leads");
}

export async function updateLeadPriority(leadId: string, priority: LeadPriority) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ priority }).eq("id", leadId);
  if (error) throw new Error(error.message);

  await logActivity(leadId, session.userId, "priority_change", `Priority changed to ${priority}`);
  revalidatePath(`/sales/leads/${leadId}`);
  revalidatePath("/sales/leads");
}

export async function updateLeadOwner(leadId: string, ownerId: string | null) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ owner_id: ownerId }).eq("id", leadId);
  if (error) throw new Error(error.message);

  await logActivity(leadId, session.userId, "owner_change", ownerId ? "Owner reassigned" : "Owner unassigned");
  revalidatePath(`/sales/leads/${leadId}`);
  revalidatePath("/sales/leads");
}

export async function addLeadNote(leadId: string, note: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");
  if (!note.trim()) return;

  await logActivity(leadId, session.userId, "note", note.trim());
  revalidatePath(`/sales/leads/${leadId}`);
}

export async function logLeadCall(leadId: string, note: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  await logActivity(leadId, session.userId, "call", note.trim() || "Call logged");
  revalidatePath(`/sales/leads/${leadId}`);
  revalidatePath("/sales/dashboard");
}

export async function scheduleDemo(leadId: string, scheduledAt: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error: demoError } = await supabase.from("demos").insert({ lead_id: leadId, scheduled_at: scheduledAt });
  if (demoError) throw new Error(demoError.message);

  const { error: leadError } = await supabase
    .from("leads")
    .update({ stage: "demo_scheduled", demo_date: scheduledAt })
    .eq("id", leadId);
  if (leadError) throw new Error(leadError.message);

  await logActivity(leadId, session.userId, "demo_scheduled", `Demo scheduled for ${new Date(scheduledAt).toLocaleString()}`);
  revalidatePath(`/sales/leads/${leadId}`);
  revalidatePath("/sales/demos");
  revalidatePath("/sales/leads");
}

export async function recordDemoResult(leadId: string, demoId: string, result: "won" | "lost" | "no_show" | "rescheduled") {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error: demoError } = await supabase.from("demos").update({ result }).eq("id", demoId);
  if (demoError) throw new Error(demoError.message);

  const nextStage: LeadStage = result === "won" ? "won" : result === "lost" ? "lost" : "demo_done";
  const { error: leadError } = await supabase.from("leads").update({ stage: nextStage, demo_result: result }).eq("id", leadId);
  if (leadError) throw new Error(leadError.message);

  await logActivity(leadId, session.userId, "demo_result", `Demo result: ${result}`);
  revalidatePath(`/sales/leads/${leadId}`);
  revalidatePath("/sales/demos");
  revalidatePath("/sales/leads");
}
