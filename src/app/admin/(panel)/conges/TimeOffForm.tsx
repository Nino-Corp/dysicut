"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { input, label } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/types";

export function TimeOffForm({ action, today }: { action: (p: ActionState, d: FormData) => Promise<ActionState>; today: string }) {
  const [allDay, setAllDay] = useState(true);
  return (
    <ActionForm action={action}>
      <h2 className="text-lg font-semibold tracking-tight">Bloquer une période</h2>
      <label className="flex min-h-11 items-center gap-3 text-[16px]">
        <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-5 accent-[var(--fg)]" />
        Journées entières
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startDate" className={label}>Du</label>
          <input id="startDate" name="startDate" type="date" required defaultValue={today} className={input} />
        </div>
        <div>
          <label htmlFor="endDate" className={label}>Au (inclus)</label>
          <input id="endDate" name="endDate" type="date" required defaultValue={today} className={input} />
        </div>
        {!allDay ? (
          <>
            <div>
              <label htmlFor="startTime" className={label}>De</label>
              <input id="startTime" name="startTime" type="time" required step={300} className={input} />
            </div>
            <div>
              <label htmlFor="endTime" className={label}>À</label>
              <input id="endTime" name="endTime" type="time" required step={300} className={input} />
            </div>
          </>
        ) : null}
      </div>
      <div>
        <label htmlFor="reason" className={label}>Motif (facultatif, visible de toi seul)</label>
        <input id="reason" name="reason" maxLength={120} className={input} />
      </div>
      <SubmitButton>Bloquer</SubmitButton>
    </ActionForm>
  );
}
