"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { FeedPost } from "@/lib/instagram/feed";
import { VideoPlayer } from "./VideoPlayer";

const EASE = [0.22, 1, 0.36, 1] as const;
const iconBtn =
  "flex size-11 items-center justify-center rounded-full border border-line-strong text-fg transition-colors duration-[var(--dur)] hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent";

type Cursor = { post: number; slide: number };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Visionneuse plein écran : glisser, flèches ou tap pour passer de slide en slide, puis de post en post.
 * Utilise <dialog> natif (focus piégé, Échap, fond inerte). Montée seulement à l'ouverture.
 */
export default function PostViewer({ posts, start, onClose }: { posts: FeedPost[]; start: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [cur, setCur] = useState<Cursor>({ post: start, slide: 0 });
  const [dir, setDir] = useState(1);
  const [muted, setMuted] = useState(true);

  // Suite à plat de toutes les slides : la navigation traverse les carrousels puis passe au post suivant.
  const seq = useMemo(() => posts.flatMap((p, pi) => p.slides.map((_, si) => ({ post: pi, slide: si }))), [posts]);
  const pos = seq.findIndex((c) => c.post === cur.post && c.slide === cur.slide);

  const go = (delta: number) => {
    const n = seq[pos + delta];
    if (!n) return;
    setDir(delta);
    setCur(n);
  };
  const jump = (slide: number) => {
    setDir(slide > cur.slide ? 1 : -1);
    setCur({ post: cur.post, slide });
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Précharge les slides du post en cours puis les 2 suivantes, avec l'URL exacte affichée (cache navigateur).
  const warm = useRef(new Set<string>());
  const hold = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    const urls = [
      ...(posts[cur.post]?.slides ?? []).map((s) => s.src),
      ...[1, 2].map((d) => seq[pos + d]).map((n) => (n ? posts[n.post]?.slides[n.slide]?.src : undefined)),
    ];
    for (const u of urls) {
      if (!u || warm.current.has(u)) continue;
      warm.current.add(u);
      const img = new window.Image();
      img.decoding = "async";
      img.src = u;
      hold.current.push(img);
    }
  }, [cur.post, pos, seq, posts]);

  const post = posts[cur.post];
  const slide = post?.slides[cur.slide];
  if (!post || !slide) return null;

  const title = post.alt;
  const playable = slide.kind === "video" && slide.videoSrc;

  return (
    <MotionConfig reducedMotion="user">
      <dialog
        ref={dialog}
        aria-label="Publication Instagram"
        onClose={onClose}
        onCancel={onClose}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          else if (e.key === "ArrowLeft") go(-1);
        }}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-bg p-0 text-fg backdrop:bg-bg"
      >
        <div className="mx-auto flex h-full max-w-[1100px] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] nav:px-8">
          {/* Segments : une barre par slide du post en cours */}
          {post.slides.length > 1 ? (
            <ol className="flex gap-1.5" aria-label="Médias de la publication">
              {post.slides.map((_, i) => (
                <li key={i} className="flex-1">
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    aria-label={`Média ${i + 1} sur ${post.slides.length}`}
                    aria-current={i === cur.slide}
                    className="group flex h-5 w-full items-center"
                  >
                    <span className={`block h-0.5 w-full transition-colors duration-[var(--dur)] ${i <= cur.slide ? "bg-fg" : "bg-fg/25 group-hover:bg-fg/50"}`} />
                  </button>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="flex items-center justify-between gap-4 py-2">
            <p className="min-w-0 text-[13px] tabular-nums text-fg-muted">
              <span className="text-fg">{String(cur.post + 1).padStart(2, "0")}</span> / {String(posts.length).padStart(2, "0")}
              {post.takenAt > 0 ? <span className="ml-3">{dateFmt.format(new Date(post.takenAt * 1000))}</span> : null}
            </p>
            <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Fermer" className={iconBtn}>
              <XMarkIcon className="size-5" />
            </button>
          </div>

          {/* Scène */}
          <div className="relative min-h-0 flex-1">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={`${cur.post}-${cur.slide}`}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 48 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -48 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: EASE }}
                drag="x"
                dragSnapToOrigin
                dragElastic={0.18}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -500) go(1);
                  else if (info.offset.x > 60 || info.velocity.x > 500) go(-1);
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative size-full overflow-hidden rounded-card bg-surface">
                  {playable ? (
                    <VideoPlayer
                      key={slide.videoSrc}
                      src={slide.videoSrc!}
                      poster={slide.src}
                      durationHint={slide.durationS}
                      muted={muted}
                      onMutedChange={setMuted}
                      label={title}
                    />
                  ) : (
                    <>
                      {/* unoptimized : on sert directement l'image du proxy (déjà en 1080 px, cachée par le CDN) pour que le préchargement colle exactement à l'URL affichée. */}
                      <Image src={slide.src} alt={title} fill unoptimized priority sizes="100vw" className="object-contain" draggable={false} />
                      {slide.kind === "video" ? (
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-bg/80 px-6 py-5 text-center backdrop-blur-sm">
                          <p className="max-w-xs text-[15px] text-fg-muted">Cette vidéo se lit uniquement sur Instagram.</p>
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-[15px] font-semibold tracking-tight text-bg"
                          >
                            Voir la vidéo
                            <ArrowUpRightIcon className="size-4" aria-hidden />
                          </a>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Flèches latérales (desktop) */}
            <button type="button" onClick={() => go(-1)} disabled={pos <= 0} aria-label="Précédent" className={`${iconBtn} absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 bg-bg/70 backdrop-blur-sm nav:flex`}>
              <ChevronLeftIcon className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} disabled={pos >= seq.length - 1} aria-label="Suivant" className={`${iconBtn} absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 bg-bg/70 backdrop-blur-sm nav:flex`}>
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

          {/* Pied : lien Instagram + précédent/suivant (mobile) */}
          <div className="flex items-center justify-between gap-3 pt-3">
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold tracking-tight text-fg"
            >
              Voir sur Instagram
              <ArrowUpRightIcon className="size-4" aria-hidden />
            </a>
            <div className="flex gap-2 nav:hidden">
              <button type="button" onClick={() => go(-1)} disabled={pos <= 0} aria-label="Précédent" className={iconBtn}>
                <ChevronLeftIcon className="size-5" />
              </button>
              <button type="button" onClick={() => go(1)} disabled={pos >= seq.length - 1} aria-label="Suivant" className={iconBtn}>
                <ChevronRightIcon className="size-5" />
              </button>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            Publication {cur.post + 1} sur {posts.length}, média {cur.slide + 1} sur {post.slides.length}
          </p>
        </div>
      </dialog>
    </MotionConfig>
  );
}
