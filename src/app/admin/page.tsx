import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { createInvite, revokeInvite } from "./actions";

export const dynamic = "force-dynamic";

type Invite = {
  code: string;
  created_at: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  revoked: boolean;
};

export default async function Admin() {
  const me = await requirePlayer();
  if (!me.is_admin) redirect("/");

  const admin = createAdminClient();
  const [{ data: invites }, { data: players }] = await Promise.all([
    admin.from("invites").select("*").order("created_at", { ascending: false }),
    admin.from("players").select("id, email, display_name, avatar_url, is_admin, joined_at").order("joined_at"),
  ]);

  const h = await headers();
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const now = Date.now();
  const active = (i: Invite) =>
    !i.revoked && (i.max_uses == null || i.uses < i.max_uses) && (!i.expires_at || Date.parse(i.expires_at) > now);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Header player={me} />

      <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
        <h2 className="font-semibold">New invite link</h2>
        <form action={createInvite} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-muted">Max uses</span>
            <input name="max_uses" type="number" min={1} placeholder="Unlimited" className="w-28 rounded-lg border border-line bg-background px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Expires in (days)</span>
            <input name="expires_days" type="number" min={1} placeholder="Never" className="w-28 rounded-lg border border-line bg-background px-2 py-1.5" />
          </label>
          <button className="rounded-full bg-accent px-4 py-2 font-semibold text-white">Create link</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Invites</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card text-sm">
          {(invites as Invite[] | null)?.length ? (
            (invites as Invite[]).map((i) => {
              const url = `${base}/invite/${i.code}`;
              const ok = active(i);
              return (
                <li key={i.code} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${ok ? "" : "opacity-50"}`}>
                  <code className="flex-1 min-w-0 truncate">{url}</code>
                  <span className="text-muted">
                    {i.uses}/{i.max_uses ?? "∞"} used
                    {i.expires_at && ` · expires ${i.expires_at.slice(0, 10)}`}
                    {i.revoked && " · revoked"}
                  </span>
                  {ok && (
                    <>
                      <CopyButton text={url} />
                      <form action={revokeInvite}>
                        <input type="hidden" name="code" value={i.code} />
                        <button className="text-red-600 hover:underline">Revoke</button>
                      </form>
                    </>
                  )}
                </li>
              );
            })
          ) : (
            <li className="text-muted px-4 py-3">No invites yet.</li>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Players ({players?.length ?? 0})</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card text-sm">
          {players?.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={p.avatar_url} name={p.display_name} />
              <span className="flex-1 truncate">
                {p.display_name} <span className="text-muted">{p.email}</span>
              </span>
              {p.is_admin && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">admin</span>}
              <span className="text-muted">joined {p.joined_at.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
