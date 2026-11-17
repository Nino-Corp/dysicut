import { defaultOpeningHours, site, type Weekday } from "@/config/site";
import type { HoursByDay } from "@/lib/booking/slots";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/**
 * Données structurées BarberShop. L'adresse de rue n'y figure que si site.address.confirmed est vrai ;
 * sinon uniquement la ville (aucune fausse adresse dans Google).
 */
export function barberShopJsonLd(hours: HoursByDay = defaultOpeningHours) {
  const a = site.address;
  return {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    "@id": `${site.url}/#barbershop`,
    name: site.name,
    url: site.url,
    image: `${site.url}/opengraph-image`,
    logo: `${site.url}/brand/logo-email.png`,
    description: `Barber homme à ${site.city}, sur rendez-vous.`,
    areaServed: { "@type": "City", name: site.city },
    address: a.confirmed
      ? { "@type": "PostalAddress", streetAddress: a.street, postalCode: a.postalCode, addressLocality: a.city, addressCountry: "FR" }
      : { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "FR" },
    ...(a.confirmed ? { geo: { "@type": "GeoCoordinates", latitude: a.coords.lat, longitude: a.coords.lon } } : {}),
    openingHoursSpecification: (Object.entries(hours) as [string, { start: string; end: string }][]).map(([d, h]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAYS[Number(d) as Weekday],
      opens: h.start,
      closes: h.end,
    })),
    sameAs: [site.social.instagramUrl, site.social.tiktokUrl].filter(Boolean),
    ...(site.social.phone ? { telephone: site.social.phone } : {}),
  };
}
