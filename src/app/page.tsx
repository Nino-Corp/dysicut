import { Nav } from "@/components/sections/Nav";
import { StickyBookBar } from "@/components/sections/StickyBookBar";
import { Hero } from "@/components/sections/Hero";
import { PoleIntro } from "@/components/sections/PoleIntro";
import { Footer } from "@/components/sections/Footer";

// Placeholders : les sections arrivent à l'étape 5.
const sections = [
  { id: "coupes", title: "Coupes" },
  { id: "tarifs", title: "Tarifs" },
  { id: "infos", title: "Infos" },
];

export default function Home() {
  return (
    <>
      <PoleIntro />
      <Nav />
      <main>
        <Hero />
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="flex min-h-[70dvh] scroll-mt-4 items-center border-t border-line px-5 nav:px-14">
            <h2 className="text-5xl">{s.title}</h2>
          </section>
        ))}
      </main>
      <Footer />
      <StickyBookBar />
    </>
  );
}
