"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { btnGhost, input, label } from "@/components/admin/ui";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor="feed" className={label}>Lien d&apos;abonnement</label>
      <input id="feed" readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={`${input} text-sm`} />
      <button
        type="button"
        className={btnGhost}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* le champ reste selectionnable a la main */
          }
        }}
      >
        {copied ? <CheckIcon className="size-5" aria-hidden /> : <ClipboardDocumentIcon className="size-5" aria-hidden />}
        {copied ? "Copié" : "Copier le lien"}
      </button>
    </div>
  );
}
