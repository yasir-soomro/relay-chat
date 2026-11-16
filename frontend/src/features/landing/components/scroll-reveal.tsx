"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function ScrollReveal({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (
      !element ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      element.getBoundingClientRect().top < window.innerHeight
    ) {
      return;
    }

    element.classList.add("landing-reveal-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          element.classList.remove("landing-reveal-pending");
          element.classList.add("landing-reveal-visible");
          observer.unobserve(element);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={elementRef}>{children}</div>;
}
