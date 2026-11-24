"use server";

import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackKind = "feedback" | "idea" | "bug";
export type SentBottle = { id: number; kind: FeedbackKind; message: string; created_at: string };
export type FeedbackResult = { ok: true; bottle: SentBottle } | { ok: false; message: string };

const KINDS: FeedbackKind[] = ["feedback", "idea", "bug"];
const MAX = 2000;

export async function sendFeedback(kind: string, message: string, page: string): Promise<FeedbackResult> {
  const player = await requirePlayer();
  const text = String(message ?? "").trim();
  if (!text) return { ok: false, message: "the bottle is empty. write something first." };
  if (text.length > MAX) return { ok: false, message: `keep it under ${MAX} characters.` };
  const k: FeedbackKind = KINDS.includes(kind as FeedbackKind) ? (kind as FeedbackKind) : "feedback";

  const { data, error } = await createAdminClient()
    .from("feedback")
    .insert({ player_id: player.id, kind: k, message: text, page: String(page ?? "").slice(0, 200) || null })
    .select("id, kind, message, created_at")
    .single();
  if (error) {
    console.error("feedback insert failed", error.message);
    return { ok: false, message: "the bottle sank. please try again in a moment." };
  }
  return { ok: true, bottle: data as SentBottle };
}
