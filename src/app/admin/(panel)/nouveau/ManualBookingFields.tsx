"use client";

import { useState } from "react";
import { input, label } from "@/components/admin/ui";

type Svc = { id: string; name: string; minutes: number };

/** Prestation + horaire + duree : la duree se cale sur la prestation choisie, mais reste modifiable. */
export function ManualBookingFields({ services, date }: { services: Svc[]; date: string }) {
  const [id, setId] = useState(services[0]?.id ?? "");
  const [minutes, setMinutes] = useState(services[0]?.minutes ?? 40);
  return (
    <>
      <div>
        <label htmlFor="serviceId" className={label}>Prestation</label>
        <select
          id="serviceId"
          name="serviceId"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setMinutes(services.find((s) => s.id === e.target.value)?.minutes ?? minutes);
          }}
          className={input}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className={label}>Jour</label>
          <input id="date" name="date" type="date" required defaultValue={date} className={input} />
        </div>
        <div>
          <label htmlFor="time" className={label}>Heure</label>
          <input id="time" name="time" type="time" required step={300} className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="minutes" className={label}>Durée (minutes)</label>
        <input id="minutes" name="minutes" type="number" inputMode="numeric" min={5} max={480} step={5} required value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={input} />
      </div>
    </>
  );
}
