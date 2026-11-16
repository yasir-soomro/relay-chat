"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { SiteBrand } from "@/components/layout/site-brand";

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/register" || pathname === "/login") {
    return null;
  }

  return (
    <footer className="landing-public-footer bg-ink text-surface">
      <PageContainer className="py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-[1.2fr_2fr] sm:gap-12">
          <div>
            <SiteBrand inverse />
            <p className="mt-4 max-w-xs text-sm leading-6 text-surface/75">
              A little closer, one conversation at a time. Connect by choice;
              keep the conversation personal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <nav aria-label="Explore Relay">
              <h2 className="text-xs font-semibold text-surface">Explore</h2>
              <ul className="mt-4 space-y-3">
                <li><Link className="text-sm text-surface/75 hover:text-surface" href="/how-it-works">How it works</Link></li>
                <li><Link className="text-sm text-surface/75 hover:text-surface" href="/why-relay">Why Relay</Link></li>
                <li><Link className="text-sm text-surface/75 hover:text-surface" href="/faqs">FAQs</Link></li>
              </ul>
            </nav>
            <nav aria-label="Your account">
              <h2 className="text-xs font-semibold text-surface">Your account</h2>
              <ul className="mt-4 space-y-3">
                <li><Link className="text-sm text-surface/75 hover:text-surface" href="/register">Create an account</Link></li>
                <li><Link className="text-sm text-surface/75 hover:text-surface" href="/login">Sign in</Link></li>
              </ul>
            </nav>
            <div className="col-span-2 sm:col-span-1">
              <h2 className="text-xs font-semibold text-surface">Made for connection</h2>
              <p className="mt-4 text-sm leading-6 text-surface/75">
                Public profiles, mutual connections, and private messaging.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-surface/15 pt-5 text-xs text-surface/65 sm:flex-row sm:items-center sm:justify-between">
          <p>Relay · Private, one-to-one conversations.</p>
          <Link className="w-fit hover:text-surface" href="/">
            Back to top
          </Link>
        </div>
      </PageContainer>
    </footer>
  );
}
