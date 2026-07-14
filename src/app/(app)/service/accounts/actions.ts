"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { AccountStatus } from "@/lib/supabase/database.types";

export async function updateAccountStatus(accountId: string, status: AccountStatus) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ status }).eq("id", accountId);
  if (error) throw new Error(error.message);

  await supabase.from("activities").insert({
    subject_type: "account",
    subject_id: accountId,
    actor_id: session.userId,
    type: "status_change",
    note: status === "churned" ? "Account marked as churned" : "Account reactivated",
  });

  revalidatePath(`/service/accounts/${accountId}`);
  revalidatePath("/sales/dashboard");
}
