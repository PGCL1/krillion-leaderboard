"use client";

import { useActionState } from "react";
import { submitScore, type SubmitState } from "@/app/actions";

export function SubmitForm({ gameNumber }: { gameNumber: number }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitScore, undefined);

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <label htmlFor="raw" className="block font-semibold">
        Submit today&apos;s score <span className="text-muted font-normal">· Krillion #{gameNumber}</span>
      </label>
      <p className="text-muted text-sm mt-1">Paste the share text from Krillion. You only get one shot.</p>
      <textarea
        id="raw"
        name="raw"
        required
        rows={4}
        placeholder={`Krillion #${gameNumber} 🦐\n180\n\n🦑⬛⬛🐟🐟🦑⬛`}
        className="mt-3 w-full rounded-xl border border-line bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2 font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
        {state?.message && (
          <p className={`text-sm ${state.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
