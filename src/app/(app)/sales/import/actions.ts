"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export interface RawLeadRow {
  clinic_name: string;
  phone: string;
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  speciality?: string | null;
  city_tier?: number | null;
}

export interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  duplicatePhones: string[];
}

export async function importLeads(fileName: string, rows: RawLeadRow[]): Promise<ImportResult> {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not authenticated");

  const supabase = await createClient();

  const phones = rows.map((r) => r.phone).filter(Boolean);
  const { data: existing } = await supabase.from("leads").select("phone").in("phone", phones);
  const existingPhones = new Set((existing ?? []).map((r) => r.phone));

  const newRows = rows.filter((r) => r.phone && !existingPhones.has(r.phone));
  const duplicatePhones = rows.filter((r) => existingPhones.has(r.phone)).map((r) => r.phone);

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({ kind: "lead_import", file_name: fileName, row_count: newRows.length, created_by: session.userId })
    .select()
    .single();
  if (batchError) throw new Error(batchError.message);

  if (newRows.length > 0) {
    const { error: insertError } = await supabase.from("leads").insert(
      newRows.map((r) => ({
        clinic_name: r.clinic_name,
        phone: r.phone,
        rating: r.rating ?? null,
        review_count: r.review_count ?? 0,
        address: r.address ?? null,
        city: r.city ?? null,
        state: r.state ?? null,
        speciality: r.speciality ?? null,
        city_tier: r.city_tier ?? 3,
        import_batch_id: batch.id,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/sales/leads");
  revalidatePath("/sales/dashboard");

  return {
    total: rows.length,
    inserted: newRows.length,
    duplicates: duplicatePhones.length,
    duplicatePhones,
  };
}
