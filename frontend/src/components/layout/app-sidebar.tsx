import { SiteBrand } from "@/components/layout/site-brand";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation";
import { WorkspaceSidebarFooter } from "@/components/layout/workspace-sidebar-footer";

export function AppSidebar() {
  return (
    <aside className="workspace-sidebar hidden min-w-0 border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:px-5 lg:py-7">
      <SiteBrand />
      <p className="mb-3 mt-10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Your workspace
      </p>
      <WorkspaceNavigation />
      <WorkspaceSidebarFooter />
    </aside>
  );
}
