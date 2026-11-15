import Image from "next/image";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { site } from "@/config/site";
import { cuts } from "@/config/cuts";
import { PostGrid } from "@/components/widgets/PostGrid";
import { getInstagramFeed } from "@/lib/instagram/feed";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

const EMPTY_SLOTS = 6;

/** Section Coupes : grille 2 colonnes (mobile) puis 3 (tablette+), cadrage portrait 4:5. */
export async function Cuts() {
  const { posts } = await getInstagramFeed();
  return (
    <section id="coupes" className="scroll-mt-4 border-t border-line px-5 py-24 nav:px-14 nav:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold tracking-[-0.04em]">Coupes</h2>
        <p className="mt-6 max-w-md border-l border-line-strong pl-4 text-[18px] leading-[1.5] text-fg-muted">
          <strong className="font-semibold text-fg">Dégradés</strong>,{" "}
          <strong className="font-semibold text-fg">coupes ciselées</strong>,{" "}
          <strong className="font-semibold text-fg">barbes</strong>.
          <br />
          Tous types de cheveux, du lisse aux <strong className="font-semibold text-fg">cheveux afro</strong>.
        </p>

        {posts.length > 0 ? (
          <PostGrid posts={posts.slice(0, 6)} />
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-3 nav:grid-cols-3 nav:gap-5">
            {cuts.length > 0
              ? cuts.map((c, i) => (
                  <Reveal as="li" key={c.src} delay={(i % 3) * 0.06} className="overflow-hidden rounded-card bg-surface">
                    <Image
                      src={c.src}
                      alt={c.alt}
                      width={c.width}
                      height={c.height}
                      sizes="(min-width: 700px) 33vw, 50vw"
                      className="aspect-[4/5] size-full object-cover"
                    />
                  </Reveal>
                ))
              : Array.from({ length: EMPTY_SLOTS }, (_, i) => (
                  <Reveal as="li" key={i} delay={(i % 3) * 0.06} className="aspect-[4/5] overflow-hidden rounded-card border border-line">
                    <PhotoPlaceholder tone={i % 2 ? "raised" : "base"} />
                  </Reveal>
                ))}
          </ul>
        )}

        <a
          href={site.social.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-[15px] font-semibold tracking-tight transition-colors duration-[var(--dur)] hover:bg-surface-2"
        >
          Voir plus sur Instagram
          <ArrowUpRightIcon className="size-4" aria-hidden />
        </a>
      </div>
    </section>
  );
}
