import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PageContainer } from "@/components/layout/page-container";
import { SiteBrand } from "@/components/layout/site-brand";
import { appNavigation } from "@/lib/site";

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
      <PageContainer className="flex min-h-16 items-center justify-between gap-4 py-3">
        <SiteBrand />

        <MobileNavigation
          ariaLabel="Application navigation"
          items={appNavigation}
        />
      </PageContainer>
    </header>
  );
}
