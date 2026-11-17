"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { input, label } from "@/components/admin/ui";
import { HoverButton } from "@/components/ui/HoverButton";


export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor="feed" className={label}>Lien d&apos;abonnement</label>
      <input id="feed" readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={`${input} text-sm`} />
      <HoverButton
        variant="ghost"
        icon={copied ? CheckIcon : ClipboardDocumentIcon}
        className="w-full"
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
        {copied ? "Copié" : "Copier le lien"}
      </HoverButton>
    </div>
  );
}
