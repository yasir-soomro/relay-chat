import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Link
        className="sr-only z-50 rounded-full bg-surface px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to content
      </Link>
      <Navbar />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
