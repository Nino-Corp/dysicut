import "server-only";
import { site } from "@/config/site";
import { buildIcs } from "@/lib/booking/ics";
import { dayLabel, timeLabel } from "@/lib/booking/time";
import type { BookingRow } from "@/lib/booking/repo";
import type { Mail } from "./send";

// Les emails ne lisent pas les variables CSS : jetons équivalents à globals.css, centralisés ici.
// Le tricolore (pole) n'apparaît que dans la fine bande du haut : une seule signature par mail.
const C = {
  bg: "#0a0a0a",
  card: "#111111",
  panel: "#1a1a1a",
  fg: "#f5f5f7",
  muted: "#86868b",
  line: "#2a2a2c",
  red: "#d62839",
  white: "#f5f5f7",
  blue: "#1f4e9c",
};
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Helvetica,Arial,sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const manageUrl = (token: string) => `${site.url}/rdv/${token}`;
export const icsUrl = (token: string) => `${site.url}/api/booking/${token}/ics`;
const adminUrl = () => `${site.url}/admin`;

/** L'adresse provisoire n'est jamais envoyée à un client : tant qu'elle n'est pas confirmée, on renvoie vers le site. */
function addressLine(): { text: string; html: string } {
  if (site.address.confirmed) {
    const a = `${site.address.street}, ${site.address.postalCode} ${site.address.city}`;
    return { text: a, html: esc(a) };
  }
  const url = `${site.url}/#infos`;
  return { text: `Voir l'adresse sur ${url}`, html: `<a href="${url}" style="color:${C.fg};text-decoration:underline">Voir l'adresse sur le site</a>` };
}

type Btn = { label: string; href: string };
type Block = {
  /** Texte d'aperçu dans la liste de la boîte mail (masqué dans le corps). */
  preheader: string;
  /** Pastille d'état en haut à droite. */
  tag: string;
  /** Grand bloc "quand" : heure énorme + jour. `struck` barre l'heure (annulation). */
  hero: { time: string; day: string; hint?: string; struck?: boolean };
  title: string;
  intro: string;
  /** Petites cases d'info (2 par ligne), lisibles d'un coup d'oeil. */
  facts: [string, string][];
  /** Lignes complètes sous les cases (téléphone, adresse...). */
  rows?: [string, string][];
  primary?: Btn;
  secondary?: Btn[];
  after?: string[];
};

const strip = (s: string) =>
  s
    .replace(/<a [^>]*href="([^"]+)"[^>]*>[^<]*<\/a>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

/** Fine bande barber pole : cellules alternées rouge / blanc / bleu (compatible tous clients mail). */
function poleBand(): string {
  const colors = [C.red, C.white, C.blue];
  const n = 30;
  const cells = Array.from({ length: n }, (_, i) => `<td width="${(100 / n).toFixed(3)}%" height="4" bgcolor="${colors[i % 3]}" style="background:${colors[i % 3]};font-size:0;line-height:0;height:4px">&nbsp;</td>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${cells}</tr></table>`;
}

function button(btn: Btn, kind: "primary" | "ghost"): string {
  const bg = kind === "primary" ? C.fg : "transparent";
  const fg = kind === "primary" ? C.bg : C.fg;
  const border = kind === "primary" ? C.fg : "#3a3a3c";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 8px 8px 0"><tr><td bgcolor="${kind === "primary" ? C.fg : C.card}" style="background:${bg};border:1px solid ${border};border-radius:999px"><a href="${btn.href}" style="display:inline-block;padding:14px 24px;color:${fg};font-family:${FONT};font-size:16px;font-weight:600;text-decoration:none;letter-spacing:-.01em">${esc(btn.label)}</a></td></tr></table>`;
}

function layout(b: Block): { html: string; text: string } {
  // Cases d'info : 2 par ligne.
  const factRows: string[] = [];
  for (let i = 0; i < b.facts.length; i += 2) {
    const pair = b.facts.slice(i, i + 2);
    const tds = pair
      .map(
        ([k, v]) =>
          `<td width="50%" valign="top" style="padding:0 6px 12px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${C.panel};border-radius:14px;padding:14px 16px"><div style="color:${C.muted};font-family:${FONT};font-size:12px;letter-spacing:.08em;text-transform:uppercase">${esc(k)}</div><div style="margin-top:6px;color:${C.fg};font-family:${FONT};font-size:18px;font-weight:600;letter-spacing:-.01em">${v}</div></td></tr></table></td>`,
      )
      .join("");
    factRows.push(`<tr>${tds}${pair.length === 1 ? '<td width="50%"></td>' : ""}</tr>`);
  }
  const rows = (b.rows ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:12px 0;border-top:1px solid ${C.line};color:${C.muted};font-family:${FONT};font-size:14px;width:32%" valign="top">${esc(k)}</td><td style="padding:12px 0;border-top:1px solid ${C.line};color:${C.fg};font-family:${FONT};font-size:16px" valign="top">${v}</td></tr>`,
    )
    .join("");
  const buttons = b.primary || b.secondary?.length ? `<div style="margin:24px 0 0">${b.primary ? button(b.primary, "primary") : ""}${(b.secondary ?? []).map((s) => button(s, "ghost")).join("")}</div>` : "";
  const after = (b.after ?? []).map((p) => `<p style="margin:16px 0 0;color:${C.muted};font-family:${FONT};font-size:14px;line-height:1.55">${p}</p>`).join("");
  const timeStyle = b.hero.struck ? `color:${C.muted};text-decoration:line-through;text-decoration-thickness:3px` : `color:${C.fg}`;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(b.title)}</title></head>
<body style="margin:0;background:${C.bg};font-family:${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(b.preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="max-width:540px;background:${C.card};border:1px solid ${C.line};border-radius:24px;overflow:hidden"><tr><td>
${poleBand()}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 28px 8px">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="${site.url}/brand/logo-email.png" width="96" alt="${esc(site.name)}" style="display:block;border:0;width:96px;height:auto;color:${C.fg};font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:.22em;text-transform:uppercase"></td>
<td align="right"><span style="display:inline-block;border:1px solid #3a3a3c;border-radius:999px;padding:5px 12px;color:${C.fg};font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase">${esc(b.tag)}</span></td>
</tr></table>

<div style="margin:36px 0 0;color:${C.muted};font-family:${FONT};font-size:15px;letter-spacing:-.005em">${esc(b.hero.day)}${b.hero.hint ? ` &nbsp;&middot;&nbsp; <span style="color:${C.fg}">${esc(b.hero.hint)}</span>` : ""}</div>
<div style="margin:4px 0 0;${timeStyle};font-family:${FONT};font-size:72px;line-height:1;font-weight:700;letter-spacing:-.05em">${esc(b.hero.time)}</div>

<div style="margin:6px 0 0;height:1px;width:56px;background:${C.fg};opacity:.9"></div>

<h1 style="margin:26px 0 0;color:${C.fg};font-family:${FONT};font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-.02em">${esc(b.title)}</h1>
<p style="margin:8px 0 24px;color:${C.muted};font-family:${FONT};font-size:16px;line-height:1.5">${b.intro}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${factRows.join("")}</table>
${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">${rows}</table>` : ""}
${buttons}${after}
</td></tr>
<tr><td style="padding:24px 28px 28px"><div style="border-top:1px solid ${C.line};padding-top:16px;color:${C.muted};font-family:${FONT};font-size:12px;letter-spacing:.04em">${esc(site.name)} &middot; Marseille &middot; ${esc(site.address.district)} &middot; Sur rendez-vous</div></td></tr></table>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `${b.tag.toUpperCase()} - ${b.title}`,
    "",
    `${b.hero.day}${b.hero.hint ? ` (${b.hero.hint})` : ""}, ${b.hero.time}`,
    "",
    strip(b.intro),
    "",
    ...b.facts.map(([k, v]) => `${k} : ${strip(v)}`),
    ...(b.rows ?? []).map(([k, v]) => `${k} : ${strip(v)}`),
    ...(b.primary ? ["", `${b.primary.label} : ${b.primary.href}`] : []),
    ...(b.secondary ?? []).map((s) => `${s.label} : ${s.href}`),
    ...(b.after ?? []).flatMap((p) => ["", strip(p)]),
    "",
    site.name,
  ].join("\n");
  return { html, text };
}

const TZ = "Europe/Paris";
const dateKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** "Aujourd'hui", "Demain", "Dans 3 jours" : repère immédiat pour savoir si c'est urgent. */
function relativeDay(d: Date): string {
  const diff = Math.round((Date.parse(dateKey(d)) - Date.parse(dateKey(new Date()))) / 86_400_000);
  if (diff <= 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return `Dans ${diff} jours`;
}

const when = (b: BookingRow) => {
  const s = new Date(b.starts_at);
  return `${cap(dayLabel(s))}, ${timeLabel(s)}`;
};
const minutes = (b: BookingRow) => Math.round((new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60000);
const euros = (cents: number) => `${cents / 100} €`;
const hero = (b: BookingRow, extra: { hint?: string; struck?: boolean } = {}) => {
  const s = new Date(b.starts_at);
  return { time: timeLabel(s), day: cap(dayLabel(s)), ...extra };
};

/** Ligne "Acompte" (rien si aucun acompte). `barber` : formulation côté studio. */
const depositRow = (b: BookingRow, barber = false): [string, string][] => {
  if (b.deposit_cents <= 0) return [];
  const rest = euros(b.price_cents - b.deposit_cents);
  if (barber) return [["Acompte", `${euros(b.deposit_cents)} payé en ligne, reste ${rest} sur place`]];
  return [["Acompte", `${euros(b.deposit_cents)} payé, reste ${rest} sur place`]];
};

export function calendarFile(b: BookingRow, token: string) {
  return buildIcs(
    [
      {
        uid: `${b.id}@dysicut`,
        start: new Date(b.starts_at),
        end: new Date(b.ends_at),
        summary: `${b.service_name} - ${site.name}`,
        description: `Pour annuler : ${manageUrl(token)}`,
        location: site.address.confirmed ? `${site.address.street}, ${site.address.postalCode} ${site.address.city}` : undefined,
        url: manageUrl(token),
        alarmMin: 120,
      },
    ],
    { name: site.name },
  );
}

/** Client : confirmation, avec le lien d'annulation et le fichier .ics en pièce jointe. */
export function clientConfirmation(b: BookingRow, token: string): Mail {
  const { html, text } = layout({
    preheader: `${when(b)} : ${b.service_name}. Garde ce mail pour pouvoir annuler.`,
    tag: "Confirmé",
    hero: hero(b),
    title: "Ton rdv est confirmé",
    intro: `Salut ${esc(b.first_name)}, c'est noté. À bientôt au studio.`,
    facts: [
      ["Prestation", esc(b.service_name)],
      ["Durée", `${minutes(b)} min`],
    ],
    rows: [["Adresse", addressLine().html], ...depositRow(b)],
    primary: { label: "Ajouter au calendrier", href: icsUrl(token) },
    secondary: [{ label: "Gérer ou annuler", href: manageUrl(token) }],
    after: [
      "Garde ce mail : le bouton Gérer ou annuler est le seul moyen d'annuler en ligne. Le fichier .ics joint ajoute aussi le rdv à ton calendrier.",
      "En cas d'empêchement, annule dès que possible pour libérer le créneau.",
      ...(b.deposit_cents > 0 ? ["L'acompte t'est rendu si tu annules dans les délais. En cas d'absence sans prévenir, il est conservé."] : []),
    ],
  });
  return { to: b.email!, subject: `Rdv confirmé : ${when(b)}`, html, text, attachments: [{ filename: "rdv-dysicut.ics", content: calendarFile(b, token), contentType: "text/calendar" }] };
}

/** Client : rappel la veille, avec le bouton de confirmation de présence. */
export function clientReminder(b: BookingRow, token: string | null): Mail {
  const { html, text } = layout({
    preheader: `Demain, ${timeLabel(new Date(b.starts_at))} : confirme ta venue.`,
    tag: "Rappel",
    hero: hero(b, { hint: "Demain" }),
    title: "On se voit demain ?",
    intro: token
      ? `Salut ${esc(b.first_name)}, confirme ta venue en un tap. Sans réponse avant demain 7h30, le créneau est libéré pour quelqu'un d'autre.`
      : `Salut ${esc(b.first_name)}, petit rappel de ton rdv.`,
    facts: [
      ["Prestation", esc(b.service_name)],
      ["Durée", `${minutes(b)} min`],
    ],
    rows: [["Adresse", addressLine().html]],
    ...(token
      ? { primary: { label: "Je confirme ma venue", href: `${manageUrl(token)}?confirmer=1` }, secondary: [{ label: "Annuler mon rdv", href: manageUrl(token) }] }
      : {}),
    after: ["Si tu ne peux pas venir, annule pour libérer le créneau. Les absences répétées sans prévenir bloquent la réservation en ligne."],
  });
  return { to: b.email!, subject: `Confirme ton rdv de demain, ${timeLabel(new Date(b.starts_at))}`, html, text };
}

/** Client : annulation (par le barber, ou confirmation d'une annulation faite par le client). */
export function clientCancelled(b: BookingRow, by: "barber" | "client" | "unconfirmed", refunded = false): Mail {
  const { html, text } = layout({
    preheader: `Rdv du ${when(b)} annulé.`,
    tag: "Annulé",
    hero: hero(b, { struck: true }),
    title: "Rdv annulé",
    intro:
      by === "barber"
        ? `Salut ${esc(b.first_name)}, ce rdv est annulé. Désolé pour le dérangement.`
        : by === "unconfirmed"
          ? `Salut ${esc(b.first_name)}, on n'a pas reçu ta confirmation : ton créneau a été libéré. Tu viens quand même ? Reprends rdv, il reste peut-être de la place.`
          : `Salut ${esc(b.first_name)}, ton rdv est bien annulé.`,
    facts: [["Prestation", esc(b.service_name)]],
    primary: { label: "Reprendre RDV", href: `${site.url}/reserver` },
    ...(refunded ? { after: [`Ton acompte de ${euros(b.deposit_cents)} est remboursé. Il apparaît sur ton relevé sous quelques jours.`] } : {}),
  });
  return { to: b.email!, subject: `Rdv annulé : ${when(b)}`, html, text };
}

/** Barber : nouvelle réservation ou annulation. Pensé pour être lu et actionné d'un coup de pouce. */
export function barberNotice(kind: "new" | "cancelled", b: BookingRow, to: string): Mail {
  const isNew = kind === "new";
  const phone = b.phone.replace(/\s+/g, "");
  const { html, text } = layout({
    preheader: `${b.first_name} - ${b.service_name} - ${when(b)}`,
    tag: isNew ? "Nouveau rdv" : "Annulé",
    hero: hero(b, { hint: relativeDay(new Date(b.starts_at)), struck: !isNew }),
    title: b.first_name,
    intro: isNew ? "vient de réserver sur le site." : "a annulé. Le créneau est de nouveau libre.",
    facts: [
      ["Prestation", esc(b.service_name)],
      ["Prix", euros(b.price_cents)],
      ["Durée", `${minutes(b)} min`],
      ["Réservé", isNew ? "Via le site" : "Annulé par le client"],
    ],
    rows: [
      ["Téléphone", `<a href="tel:${esc(phone)}" style="color:${C.fg};text-decoration:underline">${esc(b.phone)}</a>`],
      ...depositRow(b, true),
      ["Email", b.email ? `<a href="mailto:${esc(b.email)}" style="color:${C.fg};text-decoration:underline">${esc(b.email)}</a>` : `<span style="color:${C.muted}">non renseigné</span>`],
    ],
    ...(isNew
      ? {
          primary: { label: "Appeler", href: `tel:${phone}` },
          secondary: [
            { label: "SMS", href: `sms:${phone}` },
            { label: "Ouvrir l'agenda", href: adminUrl() },
          ],
        }
      : { primary: { label: "Ouvrir l'agenda", href: adminUrl() }, secondary: [{ label: "Appeler", href: `tel:${phone}` }] }),
  });
  return { to, subject: `${isNew ? "Nouveau rdv" : "Rdv annulé"} : ${when(b)} - ${b.first_name}`, html, text };
}
