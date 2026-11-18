import { bookingHref } from "@/config/nav";
import { HoverButton } from "./HoverButton";

type Props = { size?: "md" | "lg"; className?: string; children?: React.ReactNode };

/** CTA principal : pill blanc sur noir. */
export function BookButton({ size = "md", className = "", children = "Prendre RDV" }: Props) {
  return (
    <HoverButton href={bookingHref} size={size === "lg" ? "lg" : "sm"} className={className}>
      {children}
    </HoverButton>
  );
}
