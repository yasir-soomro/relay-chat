import { PageContainer } from "@/components/layout/page-container";

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <PageContainer className="flex flex-col gap-3 py-7 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold tracking-[-0.03em] text-ink">relay</p>
        <p>Thoughtful conversations start with a little more room.</p>
      </PageContainer>
    </footer>
  );
}
