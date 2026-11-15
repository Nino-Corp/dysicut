import { Nav } from "@/components/sections/Nav";
import { MyBookingBanner } from "@/components/booking/MyBookingBanner";
import { StickyBookBar } from "@/components/sections/StickyBookBar";
import { Hero } from "@/components/sections/Hero";
import { PoleIntro } from "@/components/sections/PoleIntro";
import { Cuts } from "@/components/sections/Cuts";
import { Social } from "@/components/sections/Social";
import { Pricing } from "@/components/sections/Pricing";
import { Info } from "@/components/sections/Info";
import { Reviews } from "@/components/sections/Reviews";
import { Footer } from "@/components/sections/Footer";

// Régénère la page toutes les 15 min : un échec d'Instagram est ainsi réessayé rapidement.
export const revalidate = 900;

export default function Home() {
  return (
    <>
      <PoleIntro />
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
    </>
  );
}
