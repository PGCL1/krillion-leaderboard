"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseKrillion } from "@/lib/parse";
import { dateForGameNumber } from "@/lib/game";

export type SubmitState = { ok?: boolean; message?: string } | undefined;

export async function submitScore(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const player = await requirePlayer();
  const raw = String(formData.get("raw") ?? "").slice(0, 2000);

  const parsed = parseKrillion(raw);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  // Accept whatever game the share text names: Krillion can roll over at a different time for a
  // player than our KRILLION_TIMEZONE math does, and the group trusts each other.
  const { gameNumber, score } = parsed.value;

  const { error } = await createAdminClient().from("scores").insert({
    player_id: player.username,
    game_number: gameNumber,
    score,
    raw: raw.trim(),
    played_on: dateForGameNumber(gameNumber),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: `You've already submitted #${gameNumber}.` };
    console.error(error);
    return { ok: false, message: "Something went wrong saving your score." };
  }

  revalidatePath("/");
  return { ok: true, message: `Saved: ${score} on Krillion #${gameNumber}.` };
}
