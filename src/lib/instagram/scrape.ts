/**
 * Lecture des derniers posts PUBLICS d'un compte Instagram, sans token.
 * Source : la page d'embed de profil (https://www.instagram.com/<user>/embed/), qui contient
 * les ~6 derniers posts dans un JSON embarqué. Endpoint non officiel : il peut changer ou
 * bloquer sans préavis, d'où la stratégie de repli (voir feed.ts) et la double extraction ci-dessous.
 *
 * Fichier pur : aucun import de Next ni d'alias, pour pouvoir aussi être lancé par scripts/.
 */

export type IgSlide = {
  kind: "image" | "video";
  imageUrl: string; // image (ou affiche de la vidéo), URL CDN signée
  videoUrl: string | null; // null = vidéo non diffusable hors Instagram (ex. musique sous droits)
  width: number;
  height: number;
  durationS: number; // 0 si inconnue
};

export type IgPost = {
  shortcode: string;
  permalink: string;
  caption: string;
  isVideo: boolean;
  isCarousel: boolean;
  width: number;
  height: number;
  takenAt: number; // timestamp Unix (s)
  imageUrl: string; // URL CDN signée, expire : ne jamais la persister
  slides: IgSlide[]; // au moins 1 ; un carrousel en a plusieurs
};

const UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

const SHORTCODE_RE = /^[A-Za-z0-9_-]{6,20}$/;
const MAX_POSTS = 12;

/** Seuls les CDN d'Instagram/Meta sont autorisés (évite qu'une réponse piégée serve de relais SSRF). */
export function isAllowedMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname.endsWith(".cdninstagram.com") || u.hostname === "cdninstagram.com" || u.hostname.endsWith(".fbcdn.net"));
  } catch {
    return false;
  }
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Extrait le littéral de chaîne JSON qui suit `"contextJSON":` (guillemets et échappements gérés à la main). */
function extractContextLiteral(html: string): string | null {
  const key = '"contextJSON":"';
  const start = html.indexOf(key);
  if (start < 0) return null;
  let i = start + key.length;
  while (i < html.length) {
    const c = html[i];
    if (c === "\\") i += 2;
    else if (c === '"') return html.slice(start + key.length - 1, i + 1);
    else i += 1;
  }
  return null;
}

function pickImage(media: Json): string | null {
  const res = Array.isArray(media.display_resources) ? media.display_resources.filter(isObj) : [];
  const sized = res
    .map((r) => ({ w: num(r.config_width), src: typeof r.src === "string" ? r.src : "" }))
    .filter((r) => r.src && isAllowedMediaUrl(r.src))
    .sort((a, b) => a.w - b.w);
  // Plus grande définition disponible (le viewer plein écran en a besoin ; next/image redimensionne la grille).
  const ok = sized[sized.length - 1];
  if (ok) return ok.src;
  const d = media.display_url;
  return typeof d === "string" && isAllowedMediaUrl(d) ? d : null;
}

function toSlide(node: Json): IgSlide | null {
  const imageUrl = pickImage(node);
  if (!imageUrl) return null;
  const dims = isObj(node.dimensions) ? node.dimensions : {};
  const isVideo = node.is_video === true;
  const videoUrl = typeof node.video_url === "string" && isAllowedMediaUrl(node.video_url) ? node.video_url : null;
  return {
    kind: isVideo ? "video" : "image",
    imageUrl,
    videoUrl: isVideo ? videoUrl : null,
    width: num(dims.width, 1080),
    height: num(dims.height, 1350),
    durationS: num(node.video_duration),
  };
}

function childSlides(media: Json): IgSlide[] {
  const edges = isObj(media.edge_sidecar_to_children) && Array.isArray(media.edge_sidecar_to_children.edges) ? media.edge_sidecar_to_children.edges : [];
  const out: IgSlide[] = [];
  for (const e of edges) {
    const node = isObj(e) && isObj(e.node) ? e.node : null;
    const slide = node ? toSlide(node) : null;
    if (slide) out.push(slide);
  }
  return out;
}

function toPost(media: Json): IgPost | null {
  const shortcode = media.shortcode;
  if (typeof shortcode !== "string" || !SHORTCODE_RE.test(shortcode)) return null;
  const imageUrl = pickImage(media);
  if (!imageUrl) return null;
  const dims = isObj(media.dimensions) ? media.dimensions : {};
  const edges = isObj(media.edge_media_to_caption) && Array.isArray(media.edge_media_to_caption.edges) ? media.edge_media_to_caption.edges : [];
  const first = edges[0];
  const caption = isObj(first) && isObj(first.node) && typeof first.node.text === "string" ? first.node.text : "";
  return {
    shortcode,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    caption,
    isVideo: media.is_video === true,
    isCarousel: media.__typename === "GraphSidecar",
    width: num(dims.width, 1080),
    height: num(dims.height, 1350),
    takenAt: num(media.taken_at_timestamp),
    imageUrl,
    slides: (() => {
      const kids = childSlides(media);
      if (kids.length > 0) return kids;
      return [toSlide(media) ?? { kind: "image" as const, imageUrl, videoUrl: null, width: num(dims.width, 1080), height: num(dims.height, 1350), durationS: 0 }];
    })(),
  };
}

/** Stratégie A : JSON `contextJSON` de la page d'embed du profil. */
export function parseProfileEmbed(html: string): IgPost[] {
  const literal = extractContextLiteral(html);
  if (!literal) return [];
  try {
    const ctx = JSON.parse(JSON.parse(literal) as string) as unknown;
    const context = isObj(ctx) && isObj(ctx.context) ? ctx.context : null;
    const list = context && Array.isArray(context.graphql_media) ? context.graphql_media : [];
    const posts: IgPost[] = [];
    for (const item of list) {
      const media = isObj(item) && isObj(item.shortcode_media) ? item.shortcode_media : null;
      const post = media ? toPost(media) : null;
      if (post) posts.push(post);
    }
    return posts;
  } catch {
    return [];
  }
}

/** Codes de posts présents dans la page (utile à la stratégie B si le format du JSON change). */
export function extractShortcodes(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/shortcode\\?"\s*:\s*\\?"([A-Za-z0-9_-]{6,20})\\?"/g)) if (m[1]) found.add(m[1]);
  for (const m of html.matchAll(/\/p\/([A-Za-z0-9_-]{6,20})\//g)) if (m[1]) found.add(m[1]);
  return [...found].slice(0, MAX_POSTS);
}

/** Stratégie B : embed d'un post seul (image + légende dans le HTML). */
export function parsePostEmbed(html: string, shortcode: string): IgPost | null {
  const img = html.match(/<img[^>]+class="[^"]*EmbeddedMediaImage[^"]*"[^>]+src="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  if (!img || !isAllowedMediaUrl(img)) return null;
  const caption = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  return {
    shortcode,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    caption,
    isVideo: /Video|video/.test(html.match(/class="[^"]*Embed[^"]*"/)?.[0] ?? "") && html.includes("data-video"),
    isCarousel: html.includes("SidecarNavigationButton") || html.includes("Sidecar"),
    width: 1080,
    height: 1350,
    takenAt: 0,
    imageUrl: img,
    slides: [{ kind: "image", imageUrl: img, videoUrl: null, width: 1080, height: 1350, durationS: 0 }],
  };
}

/** media (gql_data.shortcode_media) de l'embed d'un post seul : seul endroit qui donne les video_url. */
export function parsePostMedia(html: string): Json | null {
  const literal = extractContextLiteral(html);
  if (!literal) return null;
  try {
    const ctx = JSON.parse(JSON.parse(literal) as string) as unknown;
    const gql = isObj(ctx) && isObj(ctx.gql_data) ? ctx.gql_data : null;
    return gql && isObj(gql.shortcode_media) ? gql.shortcode_media : null;
  } catch {
    return null;
  }
}

/** Complète un post avec les URLs vidéo et les vrais enfants de carrousel. Ne lève jamais : on garde le post tel quel en cas d'échec. */
async function enrichPost(post: IgPost, ua: string, timeoutMs: number): Promise<IgPost> {
  const html = await getText(`https://www.instagram.com/p/${post.shortcode}/embed/`, ua, timeoutMs);
  const media = html ? parsePostMedia(html) : null;
  if (!media) return post;
  const kids = childSlides(media);
  if (kids.length > 0) return { ...post, slides: kids };
  const single = toSlide(media);
  return single ? { ...post, slides: [single] } : post;
}

async function getText(url: string, ua: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": ua, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5", Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Page de connexion / challenge : pas de données utiles.
    if (text.length < 5000) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Récupère les derniers posts publics. Essaie plusieurs user-agents, puis la stratégie B.
 * Lève une erreur si rien d'exploitable : l'appelant doit alors utiliser son repli.
 */
export async function scrapePublicPosts(username: string, opts: { timeoutMs?: number } = {}): Promise<IgPost[]> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const base = `https://www.instagram.com/${encodeURIComponent(username)}`;
  let shortcodes: string[] = [];

  for (const ua of UAS) {
    const html = await getText(`${base}/embed/`, ua, timeoutMs);
    if (!html) continue;
    const posts = parseProfileEmbed(html);
    if (posts.length > 0) return sortPosts(await Promise.all(posts.map((p) => enrichPost(p, ua, timeoutMs))));
    if (shortcodes.length === 0) shortcodes = extractShortcodes(html);
  }

  // Stratégie B : si on connaît au moins des codes de posts, lire chaque embed individuel.
  if (shortcodes.length > 0) {
    const ua = UAS[0]!;
    const results = await Promise.all(
      shortcodes.map(async (code) => {
        const html = await getText(`https://www.instagram.com/p/${code}/embed/`, ua, timeoutMs);
        return html ? parsePostEmbed(html, code) : null;
      }),
    );
    const posts = results.filter((p): p is IgPost => p !== null);
    if (posts.length > 0) return sortPosts(posts);
  }

  throw new Error("Instagram: aucun post exploitable (bloqué ou format modifié)");
}

function sortPosts(posts: IgPost[]): IgPost[] {
  return [...posts].sort((a, b) => b.takenAt - a.takenAt).slice(0, MAX_POSTS);
}

/** Texte alternatif lisible : légende sans hashtags ni mentions, tronquée. */
export function altFromCaption(caption: string, fallback: string): string {
  const clean = caption.replace(/[#@][\p{L}\p{N}_.]+/gu, "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 110 ? `${clean.slice(0, 107).trimEnd()}...` : clean;
}
