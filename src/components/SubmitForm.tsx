"use client";

import { useActionState } from "react";
import { submitScore, type SubmitState } from "@/app/actions";

export function SubmitForm({ gameNumber }: { gameNumber: number }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitScore, undefined);

  return (
    <form action={action} className="kr-panel">
      <span className="kr-tag">today · dive #{gameNumber}</span>
      <label htmlFor="raw" className="block text-2xl">
        submit today&apos;s score
      </label>
      <p className="text-muted mt-1 text-base tracking-[0.1em]">paste krillion&apos;s share text · one shot per dive</p>
      <textarea
        id="raw"
        name="raw"
        required
        rows={4}
        placeholder={`krillion #${gameNumber} 🦐\n180\n\n🦑⬛⬛🐟🐟🦑⬛`}
        className="kr-field mt-4"
      />
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <button type="submit" disabled={pending} className="kr-btn">
          {pending ? "diving…" : "▼ submit ▼"}
        </button>
        {state?.message && <p className={state.ok ? "kr-ok" : "kr-error"}>{state.message}</p>}
      </div>
    </form>
  );
}
