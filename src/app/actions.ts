"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseKrillion } from "@/lib/parse";
import { today } from "@/lib/game";

export type SubmitState = { ok?: boolean; message?: string } | undefined;

export async function submitScore(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const player = await requirePlayer();
  const raw = String(formData.get("raw") ?? "").slice(0, 2000);

  const parsed = parseKrillion(raw);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const { date, gameNumber } = today();
  const { gameNumber: submitted, score } = parsed.value;
  if (submitted !== gameNumber) {
    return {
      ok: false,
      message:
        submitted < gameNumber
          ? `That's Krillion #${submitted}. Only today's game (#${gameNumber}) can be submitted.`
          : `Krillion #${submitted} isn't out yet. Today's game is #${gameNumber}.`,
    };
  }

  const { error } = await createAdminClient().from("scores").insert({
    player_id: player.id,
    game_number: gameNumber,
    score,
    raw: raw.trim(),
    played_on: date,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: `You've already submitted #${gameNumber} today.` };
    console.error(error);
    return { ok: false, message: "Something went wrong saving your score." };
  }

  revalidatePath("/");
  return { ok: true, message: `Saved: ${score} on Krillion #${gameNumber}.` };
}
