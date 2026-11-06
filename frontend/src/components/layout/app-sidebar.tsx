import { NavigationLinks } from "@/components/layout/navigation-links";
import { SiteBrand } from "@/components/layout/site-brand";
import { appNavigation } from "@/lib/site";

export function AppSidebar() {
  return (
    <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-7">
      <SiteBrand />
      <p className="mb-3 mt-12 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Workspace
      </p>
      <nav aria-label="Application navigation">
        <NavigationLinks
          currentHref="/app"
          direction="vertical"
          items={appNavigation}
        />
      </nav>
    </aside>
  );
}
