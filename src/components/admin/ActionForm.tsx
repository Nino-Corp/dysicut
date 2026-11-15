"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/types";
import { btnGhost, btnPrimary } from "./ui";

type Props = {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
};

/** Formulaire branche sur une action serveur, avec message de retour accessible. */
export function ActionForm({ action, children, className = "space-y-4" }: Props) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <div aria-live="polite">
        {state?.error ? <p className="text-[15px] text-fg">{state.error}</p> : null}
        {state?.ok ? <p className="text-[15px] text-fg-muted">{state.ok}</p> : null}
      </div>
    </form>
  );
}

export function SubmitButton({ children, ghost = false }: { children: React.ReactNode; ghost?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={ghost ? btnGhost : btnPrimary}>
      {pending ? "..." : children}
    </button>
  );
}

/** Action destructive en deux temps : un premier tap arme, le second confirme. */
export function ConfirmSubmit({ children, confirmLabel }: { children: React.ReactNode; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={btnGhost}>
        {children}
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => setArmed(false)} className={btnGhost}>
        Retour
      </button>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "..." : confirmLabel}
      </button>
    </div>
  );
}
