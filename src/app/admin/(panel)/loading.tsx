/** Affiche des le tap, le temps que le serveur reponde : sans lui, l'ecran reste fige entre deux pages. */
export default function Loading() {
  return (
    <div role="status" className="space-y-3 motion-safe:animate-pulse">
      <span className="sr-only">Chargement</span>
      <div className="mb-6 h-9 w-40 rounded-xl bg-surface-2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[72px] rounded-[var(--radius-card)] bg-surface-2" />
      ))}
    </div>
  );
}
