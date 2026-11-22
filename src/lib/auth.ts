import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const INVITE_COOKIE = "krillion_invite";

export type Player = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
};

const PLAYER_COLS = "id, email, display_name, avatar_url, is_admin";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function getPlayer(userId: string): Promise<Player | null> {
  const { data } = await createAdminClient().from("players").select(PLAYER_COLS).eq("id", userId).maybeSingle();
  return (data as Player) ?? null;
}

/**
 * Makes sure the signed-in Clerk user is an approved player.
 * Admin emails are auto-approved; everyone else needs a valid invite code.
 */
export async function onboard(inviteCode: string | undefined): Promise<Player | null> {
  const user = await currentUser();
  if (!user) return null;
  const existing = await getPlayer(user.id);
  if (existing) return existing;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = user.fullName || user.firstName || user.username || email.split("@")[0] || "Player";
  const avatar = user.imageUrl || null;
  const admin = createAdminClient();

  if (email && adminEmails().includes(email.toLowerCase())) {
    const { error } = await admin
      .from("players")
      .upsert({ id: user.id, email, display_name: name, avatar_url: avatar, is_admin: true }, { onConflict: "id" });
    if (error) throw error;
  } else if (inviteCode) {
    const { data, error } = await admin.rpc("redeem_invite", {
      p_code: inviteCode,
      p_user: user.id,
      p_email: email,
      p_name: name,
      p_avatar: avatar,
    });
    if (error) throw error;
    if (data !== true) return null;
  } else {
    return null;
  }
  return getPlayer(user.id);
}

/** For pages/actions: returns the signed-in approved player, or redirects. */
export async function requirePlayer(): Promise<Player> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const player =
    (await getPlayer(userId)) ?? (await onboard((await cookies()).get(INVITE_COOKIE)?.value));
  if (!player) redirect("/not-invited");
  return player;
}
