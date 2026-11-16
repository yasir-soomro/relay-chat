import Link from "next/link";
import { SiteBrand } from "@/components/layout/site-brand";

type AuthNavbarProps = {
  mode: "login" | "register";
};

export function AuthNavbar({ mode }: AuthNavbarProps) {
  const isRegistration = mode === "register";

  return (
    <header
      className={`auth-navbar relative z-10 grid grid-cols-2 border-b border-line/70 ${
        isRegistration ? "auth-navbar-register" : "auth-navbar-login"
      }`}
    >
      <div className="auth-nav-brand flex min-h-16 items-center px-5 sm:min-h-[4.5rem] sm:px-10 lg:px-11 xl:px-16">
        <SiteBrand inverse={isRegistration} />
      </div>
      <div className="auth-nav-actions flex min-h-16 items-center justify-end gap-1.5 px-4 sm:min-h-[4.5rem] sm:gap-3 sm:px-8 lg:px-11 xl:px-16">
        <span className="hidden text-sm text-muted md:inline">
          {isRegistration ? "Already on Relay?" : "New to Relay?"}
        </span>
        <Link
          className={`inline-flex min-h-10 items-center justify-center rounded-full px-3 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:px-4 sm:text-sm ${
            isRegistration
              ? "border border-line bg-surface text-primary hover:bg-soft"
              : "bg-primary text-primary-foreground hover:bg-primary-hover"
          }`}
          href={isRegistration ? "/login" : "/register"}
        >
          {isRegistration ? "Sign in" : "Create account"}
        </Link>
      </div>
    </header>
  );
}
