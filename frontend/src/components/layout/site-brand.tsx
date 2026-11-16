import Image from "next/image";
import Link from "next/link";

export function SiteBrand({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link
      aria-label="Relay home"
      className="site-brand-link inline-flex items-center rounded-md"
      href="/"
    >
      <span
        className={`site-brand-frame relative block h-10 overflow-hidden sm:h-12 ${
          compact ? "site-brand-frame-compact" : ""
        }`}
      >
        <Image
          alt=""
          className={`site-brand-image object-cover ${
            inverse ? "site-brand-image-inverse" : ""
          }`}
          fill
          priority
          sizes="(max-width: 640px) 140px, 176px"
          src="/images/Relay%20Chat%20Minimalist%20Logo.png"
        />
      </span>
    </Link>
  );
}
