import { BookButton } from "@/components/ui/BookButton";

/** Barre de rdv en bas de l'écran, mobile uniquement (zone du pouce). */
export function StickyBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md nav:hidden">
      <BookButton size="lg" className="w-full" />
    </div>
  );
}
