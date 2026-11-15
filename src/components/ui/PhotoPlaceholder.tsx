import { PhotoIcon } from "@heroicons/react/24/outline";

/** Cadre neutre en attendant les vraies photos (feed Instagram). Aucune image générée. */
export function PhotoPlaceholder({ label, tone = "base" }: { label?: string; tone?: "base" | "raised" }) {
  return (
    <div
      aria-hidden
      className={`relative flex size-full flex-col items-center justify-center gap-2 ${
        tone === "raised" ? "bg-surface-2" : "bg-surface"
      }`}
    >
      <PhotoIcon className="size-7 text-fg-muted/40" />
      {label ? <span className="text-[13px] text-fg-muted/60">{label}</span> : null}
    </div>
  );
}
