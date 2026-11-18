import Image from "next/image";
import { HoverButton } from "@/components/ui/HoverButton";
import { site } from "@/config/site";
import { cuts } from "@/config/cuts";
import { PostGrid } from "@/components/widgets/PostGrid";
import { getInstagramFeed } from "@/lib/instagram/feed";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";

const EMPTY_SLOTS = 6;

/** Section Coupes : grille 2 colonnes (mobile) puis 3 (tablette+), cadrage portrait 4:5. */
export async function Cuts() {
  const { posts } = await getInstagramFeed();
  return (
    <section
      id="coupes"
      className="scroll-mt-4 border-t border-line px-5 py-24 nav:flex nav:min-h-dvh nav:flex-col nav:justify-center nav:px-14 nav:py-20 "
    >
      <div className="mx-auto w-full max-w-[1400px] lg:grid lg:grid-cols-[minmax(0,1fr)_min(62%,calc((100dvh-19rem)*1.2))] lg:grid-rows-[1fr_1fr] lg:gap-x-14">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <SectionHead n="01" label="Coupes" />
          <p className="mt-6 text-[17px] text-fg-muted">
            Dégradés · Barbes · Tous types de cheveux
          </p>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {posts.length > 0 ? (
            <PostGrid posts={posts.slice(0, 6)} />
          ) : (
            <ul className="mt-12 lg:mt-0 grid nav:[&>li:nth-child(3n+2)]:mt-10 grid-cols-2 gap-3 nav:grid-cols-3 nav:gap-5">
              {cuts.length > 0
                ? cuts.map((c, i) => (
                    <Reveal
                      as="li"
                      key={c.src}
                      delay={(i % 3) * 0.06}
                      className="overflow-hidden rounded-card bg-surface"
                    >
                      <Image
                        src={c.src}
                        alt={c.alt}
                        width={c.width}
                        height={c.height}
                        sizes="(min-width: 1024px) 25vw, (min-width: 700px) 33vw, 50vw"
                        className="aspect-[4/5] size-full object-cover"
                      />
                    </Reveal>
                  ))
                : Array.from({ length: EMPTY_SLOTS }, (_, i) => (
                    <Reveal
                      as="li"
                      key={i}
                      delay={(i % 3) * 0.06}
                      className="aspect-[4/5] overflow-hidden rounded-card border border-line"
                    >
                      <PhotoPlaceholder tone={i % 2 ? "raised" : "base"} />
                    </Reveal>
                  ))}
            </ul>
          )}
        </div>

        <HoverButton
          href={site.social.instagramUrl}
          target="_blank"
          variant="ghost"
          className="mt-10 lg:mt-8 lg:self-start"
        >
          Voir plus sur Instagram
        </HoverButton>
      </div>
    </section>
  );
}
