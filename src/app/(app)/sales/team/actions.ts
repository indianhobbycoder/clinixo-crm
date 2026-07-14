"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/database.types";

export async function updateProfileRole(profileId: string, role: UserRole) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") throw new Error("Only admins can change roles");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/sales/team");
}

export async function updateProfileTerritory(profileId: string, territoryState: string | null) {
  const session = await getCurrentProfile();
  if (!session || !["admin", "sales_manager"].includes(session.profile.role)) throw new Error("Not authorized");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ territory_state: territoryState }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/sales/team");
}

export async function bulkAssignTerritory(state: string, repId: string) {
  const session = await getCurrentProfile();
  if (!session || !["admin", "sales_manager"].includes(session.profile.role)) throw new Error("Not authorized");

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ owner_id: repId }).eq("state", state).is("owner_id", null);
  if (error) throw new Error(error.message);
  revalidatePath("/sales/team");
  revalidatePath("/sales/leads");
}
