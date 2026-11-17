"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Square2StackIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import type { FeedPost } from "@/lib/instagram/feed";
import { Reveal } from "@/components/ui/Reveal";

// Le lecteur n'est chargé qu'au premier tap : rien d'inutile dans le bundle initial.
const PostViewer = dynamic(() => import("./PostViewer"), { ssr: false });

/** Grille des posts : chaque tuile ouvre la visionneuse ; sans JS, le lien mène au post Instagram. */
export function PostGrid({ posts }: { posts: FeedPost[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const warmed = useRef(new Set<number>());
  const trigger = useRef<HTMLAnchorElement | null>(null);

  // Rend le focus a la tuile qui a ouvert la visionneuse (le dialog est demonte avant la restauration native).
  const close = () => {
    setOpen(null);
    const t = trigger.current;
    if (t) window.setTimeout(() => t.focus({ preventScroll: true }), 80);
  };

  // Dès le toucher (avant le tap complet), on commence à charger les slides du post.
  const warm = (i: number) => {
    if (warmed.current.has(i)) return;
    warmed.current.add(i);
    for (const sl of posts[i]?.slides ?? []) {
      new window.Image().src = sl.src;
    }
  };

  return (
    <>
      <ul className="mt-12 grid grid-cols-2 gap-3 nav:grid-cols-3 nav:gap-5">
        {posts.map((p, i) => (
          <Reveal as="li" key={p.id} delay={(i % 3) * 0.06} className="relative overflow-hidden rounded-card bg-surface">
            <a
              href={p.permalink}
              target="_blank"
              rel="noopener noreferrer"
              aria-haspopup="dialog"
              onPointerDown={() => warm(i)}
              onMouseEnter={() => warm(i)}
              aria-label={`Publication ${i + 1} sur ${posts.length}${p.isVideo ? ", vidéo" : p.isCarousel ? ", plusieurs médias" : ""} : ${p.alt}. Ouvrir`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                trigger.current = e.currentTarget;
                setOpen(i);
              }}
              className="group block"
            >
              <Image
                src={p.src}
                alt=""
                width={p.width}
                height={p.height}
                sizes="(min-width: 700px) 33vw, 50vw"
                className="aspect-[4/5] size-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.03]"
              />
              {p.isVideo || p.isCarousel ? (
                <span aria-hidden className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-bg/70 text-fg">
                  {p.isVideo ? <PlayIcon className="size-4" /> : <Square2StackIcon className="size-4" />}
                </span>
              ) : null}
            </a>
          </Reveal>
        ))}
      </ul>
      {open !== null ? <PostViewer posts={posts} start={open} onClose={close} /> : null}
    </>
  );
}
