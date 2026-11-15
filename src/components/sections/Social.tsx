import { site } from "@/config/site";
import { TikTokEmbed } from "@/components/widgets/TikTokEmbed";

/** TikTok : affichée seulement quand le handle est renseigné dans site.ts. */
export function Social() {
  const url = site.social.tiktokUrl;
  if (!url) return null;
  return (
    <section id="tiktok" className="scroll-mt-4 border-t border-line px-5 py-24 nav:px-14 nav:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold tracking-[-0.04em]">TikTok</h2>
        <div className="mt-12 max-w-[780px]">
          <TikTokEmbed profileUrl={url} />
        </div>
      </div>
    </section>
  );
}
