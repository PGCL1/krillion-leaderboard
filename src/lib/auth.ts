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

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** The user's own uploaded picture, or null for Clerk's blank placeholder (we show a pixel initial instead). */
function avatarOf(user: ClerkUser): string | null {
  return user.hasImage ? user.imageUrl : null;
}

async function getPlayer(userId: string): Promise<Player | null> {
  const { data } = await createAdminClient().from("players").select(PLAYER_COLS).eq("id", userId).maybeSingle();
  return (data as Player) ?? null;
}

/**
 * Makes sure the signed-in Clerk user is an approved player.
 * Admin usernames/emails are auto-approved; everyone else needs a valid invite code.
 */
export async function onboard(inviteCode: string | undefined): Promise<Player | null> {
  const user = await currentUser();
  if (!user) return null;
  const existing = await getPlayer(user.id);
  if (existing) return existing;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const username = user.username ?? "";
  const name = user.fullName || user.firstName || user.username || email.split("@")[0] || "Player";
  const avatar = avatarOf(user);
  const admin = createAdminClient();

  const isAdmin =
    (username && envList("ADMIN_USERNAMES").includes(username.toLowerCase())) ||
    (email && envList("ADMIN_EMAILS").includes(email.toLowerCase()));

  if (isAdmin) {
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

  const existing = await getPlayer(userId);
  if (!existing) {
    const invite = (await cookies()).get(INVITE_COOKIE)?.value;
    const player = await onboard(invite);
    if (player) return player;
    // Right after sign-up the browser fires several page loads at once; another one may have just
    // redeemed the invite. Look again before turning anyone away.
    const late = await getPlayer(userId);
    if (late) return late;
    console.warn(`not-invited: user=${userId} invite_cookie=${invite ? "present" : "missing"}`);
    redirect("/not-invited");
  }
  return syncAvatar(existing);
}

/** True if this signed-in user is already an approved player. */
export async function isPlayer(userId: string): Promise<boolean> {
  return (await getPlayer(userId)) !== null;
}

/** Keeps the stored picture in step with Clerk, so a photo added or changed later shows on the boards. */
async function syncAvatar(player: Player): Promise<Player> {
  const user = await currentUser();
  if (!user) return player;
  const avatar = avatarOf(user);
  if (avatar === player.avatar_url) return player;
  const { error } = await createAdminClient().from("players").update({ avatar_url: avatar }).eq("id", player.id);
  if (error) {
    console.error("avatar sync failed", error.message);
    return player;
  }
  return { ...player, avatar_url: avatar };
}
