"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const p = await requirePlayer();
  if (!p.is_admin) throw new Error("Admins only");
  return p;
}

export async function createInvite(formData: FormData) {
  const me = await requireAdmin();
  const maxUses = Number(formData.get("max_uses")) || null;
  const days = Number(formData.get("expires_days")) || null;
  const { error } = await createAdminClient()
    .from("invites")
    .insert({
      code: randomBytes(9).toString("base64url"),
      created_by: me.username,
      max_uses: maxUses,
      expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    });
  if (error) throw error;
  revalidatePath("/admin");
}

export async function revokeInvite(formData: FormData) {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("invites")
    .update({ revoked: true })
    .eq("code", String(formData.get("code")));
  if (error) throw error;
  revalidatePath("/admin");
}
