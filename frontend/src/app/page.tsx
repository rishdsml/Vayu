import { Nav } from "@/components/Nav";
import { Story, Beat } from "@/components/Story";
import { Hero } from "@/components/sections/Hero";
import { LogoStrip } from "@/components/sections/LogoStrip";
import { Stats } from "@/components/sections/Stats";
import { Problem } from "@/components/sections/Problem";
import { Agents } from "@/components/sections/Agents";
import { Features } from "@/components/sections/Features";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Faq } from "@/components/sections/Faq";
import { Cta } from "@/components/sections/Cta";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="page-in">
      <a
        href="#main"
        className="fixed left-4 top-4 z-60 -translate-y-24 rounded-md bg-ink px-4 py-2 text-raised focus:translate-y-0"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <LogoStrip />
        {/* One continuous scroll: figures → problem → solution → the agents */}
        <Story>
          <Beat ground="stats">
            <Stats />
          </Beat>
          {/* Problem and solution carry their own grounds (statement → intro) */}
          <Problem />
          <Agents />
        </Story>
        <Features />
        <HowItWorks />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
