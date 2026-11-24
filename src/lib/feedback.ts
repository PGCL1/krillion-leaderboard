import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SentBottle } from "@/app/feedback-actions";

/** A player's last few messages, for "bottles you've sent". Empty if the table isn't there yet. */
export async function recentFeedback(playerId: string): Promise<SentBottle[]> {
  const { data, error } = await createAdminClient()
    .from("feedback")
    .select("id, kind, message, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return [];
  return (data ?? []) as SentBottle[];
}

export type FeedbackRow = SentBottle & { page: string | null; players: { display_name: string } | null };

/** Everything sent, newest first, for the admin page. */
export async function allFeedback(): Promise<FeedbackRow[]> {
  const { data, error } = await createAdminClient()
    .from("feedback")
    .select("id, kind, message, created_at, page, players(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []) as unknown as FeedbackRow[];
}
