import "server-only";
import { unstable_cache } from "next/cache";
import { site } from "@/config/site";
import snapshot from "@/config/instagram-snapshot.json";
import { altFromCaption, scrapePublicPosts, type IgPost } from "./scrape";

export type FeedSlide = {
  kind: "image" | "video";
  src: string; // image, ou affiche de la vidéo
  videoSrc: string | null; // null = lecture impossible hors Instagram
  width: number;
  height: number;
  durationS: number;
};

export type FeedPost = {
  id: string;
  permalink: string;
  src: string; // route proxy (live) ou fichier local (snapshot)
  alt: string;
  isVideo: boolean;
  isCarousel: boolean;
  width: number;
  height: number;
  takenAt: number; // 0 si inconnu
  slides: FeedSlide[];
};

export const IG_REVALIDATE_S = 3600;

/**
 * Cache partagé 1 h. Une erreur n'est jamais mise en cache : le prochain rendu réessaie.
 * Les URLs d'image Instagram expirent, on ne garde donc que l'identité des posts ici ;
 * les octets des images sont servis et mis en cache par /api/ig/media/[shortcode].
 */
export const getCachedPosts = unstable_cache(
  async (): Promise<IgPost[]> => scrapePublicPosts(site.social.instagramHandle),
  ["instagram-posts-v3"],
  { revalidate: IG_REVALIDATE_S, tags: ["instagram"] },
);

// Dernier résultat valide en mémoire de l'instance : repli si une actualisation échoue.
let lastGood: IgPost[] | null = null;

const FALLBACK_ALT = "Coupe réalisée par Dysicut, Marseille";

function fromLive(p: IgPost): FeedPost {
  return {
    id: p.shortcode,
    permalink: p.permalink,
    src: `/api/ig/media/${p.shortcode}/0`,
    alt: altFromCaption(p.caption, FALLBACK_ALT),
    isVideo: p.isVideo,
    isCarousel: p.isCarousel,
    width: p.width,
    height: p.height,
    takenAt: p.takenAt,
    slides: p.slides.map((sl, i) => ({
      kind: sl.kind,
      src: `/api/ig/media/${p.shortcode}/${i}`,
      videoSrc: sl.kind === "video" && sl.videoUrl ? `/api/ig/video/${p.shortcode}/${i}` : null,
      width: sl.width,
      height: sl.height,
      durationS: sl.durationS,
    })),
  };
}

type SnapshotPost = (typeof snapshot.posts)[number];
function fromSnapshot(p: SnapshotPost): FeedPost {
  return {
    id: p.shortcode,
    permalink: `https://www.instagram.com/p/${p.shortcode}/`,
    src: p.src,
    alt: p.alt || FALLBACK_ALT,
    isVideo: p.isVideo,
    isCarousel: p.isCarousel,
    width: p.width,
    height: p.height,
    takenAt: 0,
    slides: [{ kind: p.isVideo ? "video" : "image", src: p.src, videoSrc: null, width: p.width, height: p.height, durationS: 0 }],
  };
}

/** Live, sinon dernier résultat connu, sinon photos figées dans le dépôt (peut être vide). Ne lève jamais. */
export async function getInstagramFeed(): Promise<{ posts: FeedPost[]; source: "live" | "memory" | "snapshot" }> {
  try {
    const live = await getCachedPosts();
    // slides absentes = entrée de cache d'une ancienne version du format : on l'ignore.
    if (live.length > 0 && live.every((p) => Array.isArray(p.slides) && p.slides.length > 0)) {
      lastGood = live;
      return { posts: live.map(fromLive), source: "live" };
    }
  } catch {
    // repli ci-dessous
  }
  if (lastGood) return { posts: lastGood.map(fromLive), source: "memory" };
  return { posts: snapshot.posts.map(fromSnapshot), source: "snapshot" };
}
