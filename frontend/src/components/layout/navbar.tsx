import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { NavigationLinks } from "@/components/layout/navigation-links";
import { PageContainer } from "@/components/layout/page-container";
import { SiteBrand } from "@/components/layout/site-brand";
import { siteNavigation } from "@/lib/site";

export function Navbar() {
  return (
    <header className="relative z-10 border-b border-line/70 bg-canvas/90 backdrop-blur">
      <PageContainer className="flex min-h-16 items-center justify-between gap-4 py-3 sm:min-h-[4.5rem] sm:py-4">
        <SiteBrand />

        <nav aria-label="Main navigation" className="hidden md:block">
          <NavigationLinks items={siteNavigation} />
        </nav>

        <div className="md:hidden">
          <MobileNavigation ariaLabel="Main navigation" items={siteNavigation} />
        </div>
      </PageContainer>
    </header>
  );
}
