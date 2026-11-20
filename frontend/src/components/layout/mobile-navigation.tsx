"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { NavigationLinks } from "@/components/layout/navigation-links";
import { SiteBrand } from "@/components/layout/site-brand";
import { RelayIcon } from "@/components/ui/relay-icon";
import type { SiteNavigationItem } from "@/types/site";
import type { ReactNode, AnimationEvent } from "react";

const focusableSelector =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type MobileNavigationProps = {
  actions?: ReactNode;
  ariaLabel: string;
  desktopMinWidth?: number;
  items?: readonly SiteNavigationItem[];
  navigation?: ReactNode;
  renderIcon?: (item: SiteNavigationItem) => ReactNode;
};

export function MobileNavigation({
  actions,
  ariaLabel,
  desktopMinWidth = 1024,
  items = [],
  navigation,
  renderIcon,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isOpenRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const drawerId = useId();
  const titleId = `${drawerId}-title`;

  const finishClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
  }, []);

  const closeMenu = useCallback(() => {
    if (!isOpenRef.current) {
      return;
    }
    isOpenRef.current = false;
    setIsOpen(false);
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(finishClose, 260);
  }, [finishClose]);

  function openMenu() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    isOpenRef.current = true;
    setIsOpen(true);
  }

  useEffect(() => {
    closeMenu();
  }, [closeMenu, pathname]);

  useEffect(() => {
    function closeAtDesktopWidth() {
      if (window.innerWidth >= desktopMinWidth) {
        closeMenu();
      }
    }

    window.addEventListener("resize", closeAtDesktopWidth);
    return () => window.removeEventListener("resize", closeAtDesktopWidth);
  }, [closeMenu, desktopMinWidth]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) {
        return;
      }

      const focusableElements = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          !drawerRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement ||
          !drawerRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [closeMenu, isOpen]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  function handleBackdropAnimationEnd(
    event: AnimationEvent<HTMLDivElement>,
  ) {
    if (
      event.target === event.currentTarget &&
      isClosing &&
      event.animationName === "mobile-navigation-fade-out"
    ) {
      finishClose();
    }
  }

  const isMounted = isOpen || isClosing;

  return (
    <div className="mobile-navigation">
      <button
        aria-controls={drawerId}
        aria-expanded={isOpen}
        aria-label={
          isOpen ? "Close navigation menu" : "Open navigation menu"
        }
        className="mobile-navigation-toggle inline-grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink shadow-card transition-[background-color,box-shadow,transform] duration-150 hover:bg-soft active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        ref={menuButtonRef}
        type="button"
      >
        <span aria-hidden="true" className={`mobile-menu-icon ${isOpen ? "is-open" : ""}`}>
          <span className="mobile-menu-line mobile-menu-line-first" />
          <span className="mobile-menu-line mobile-menu-line-middle" />
          <span className="mobile-menu-line mobile-menu-line-last" />
        </span>
      </button>

      {isMounted && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-hidden={isClosing}
              className={`mobile-navigation-backdrop ${isClosing ? "mobile-navigation-backdrop-closing" : "mobile-navigation-backdrop-open"}`}
              inert={isClosing}
              onAnimationEnd={handleBackdropAnimationEnd}
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeMenu();
                }
              }}
            >
              <div
                aria-labelledby={titleId}
                aria-modal="true"
                className={`mobile-navigation-panel ${isClosing ? "mobile-navigation-panel-closing" : "mobile-navigation-panel-open"}`}
                id={drawerId}
                ref={drawerRef}
                role="dialog"
              >
                <header className="mobile-navigation-header flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <SiteBrand compact />
                    <h2 className="sr-only" id={titleId}>{ariaLabel}</h2>
                  </div>
                  <button
                    aria-label="Close menu"
                    className="inline-grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-[background-color,color,transform] duration-150 hover:bg-soft hover:text-ink active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    data-mobile-navigation-close
                    onClick={closeMenu}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <RelayIcon className="size-5" name="close" />
                  </button>
                </header>

                <nav
                  aria-label={ariaLabel}
                  className="mobile-navigation-links min-h-0 flex-1 overflow-y-auto px-4 py-2"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a")
                    ) {
                      closeMenu();
                    }
                  }}
                >
                  {navigation ?? (
                    <NavigationLinks
                      direction="vertical"
                      items={items}
                      renderIcon={renderIcon}
                    />
                  )}
                </nav>

                {actions ? (
                  <div className="mobile-navigation-actions border-t border-line px-4 py-4">
                    {actions}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
