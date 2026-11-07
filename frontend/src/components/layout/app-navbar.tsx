import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PageContainer } from "@/components/layout/page-container";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { SiteBrand } from "@/components/layout/site-brand";
import { appNavigation } from "@/lib/site";

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
      <PageContainer className="flex min-h-16 items-center justify-between gap-4 py-3">
        <SiteBrand />

        <SignOutButton />
        <MobileNavigation
          ariaLabel="Application navigation"
          items={appNavigation}
        />
      </PageContainer>
    </header>
  );
}
