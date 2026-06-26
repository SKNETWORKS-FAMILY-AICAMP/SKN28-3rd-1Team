import { CategoriesSection } from "@/page/home/components/categories-section";
import { CharacterSection } from "@/page/home/components/character-section";
import { CtaSection } from "@/page/home/components/cta-section";
import { FeaturesSection } from "@/page/home/components/features-section";
import { HeroSection } from "@/page/home/components/hero-section";
import { HowItWorks } from "@/page/home/components/how-it-works";
import { SiteFooter } from "@/ui/components/site-footer";
import { SiteHeader } from "@/ui/components/site-header";

export function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <CharacterSection />
        <FeaturesSection />
        <HowItWorks />
        <CategoriesSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
