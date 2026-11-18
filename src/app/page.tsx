import { Nav } from "@/components/sections/Nav";
import { MyBookingBanner } from "@/components/booking/MyBookingBanner";
import { StickyBookBar } from "@/components/sections/StickyBookBar";
import { InstallPrompt } from "@/components/widgets/InstallPrompt";
import { Hero } from "@/components/sections/Hero";
import { CutIntro } from "@/components/sections/CutIntro";
import { Cuts } from "@/components/sections/Cuts";
import { Social } from "@/components/sections/Social";
import { Pricing } from "@/components/sections/Pricing";
import { Info } from "@/components/sections/Info";
import { Reviews } from "@/components/sections/Reviews";
import { Footer } from "@/components/sections/Footer";
import { getConfig } from "@/lib/booking/repo";
import { barberShopJsonLd } from "@/lib/jsonld";

// Régénère la page toutes les 15 min : un échec d'Instagram est ainsi réessayé rapidement.
export const revalidate = 900;

export default async function Home() {
  // Horaires en base (éditables dans /admin) pour le JSON-LD ; repli sur les valeurs initiales.
  const hours = await getConfig().then((c) => c.hours).catch(() => undefined);
  const jsonLd = JSON.stringify(barberShopJsonLd(hours)).replace(/</g, "\\u003c");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <CutIntro />
      <Nav />
      <MyBookingBanner />
      <main>
        <Hero />
        <Cuts />
        <Social />
        <Pricing />
        <Info />
        <Reviews />
      </main>
      <Footer />
      <StickyBookBar />
      <InstallPrompt />
    </>
  );
}
