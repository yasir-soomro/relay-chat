import type { ReactNode } from "react";

export type RelayIconName =
  | "steps"
  | "why-relay"
  | "faq"
  | "spacehub"
  | "discover"
  | "request"
  | "messages"
  | "profile"
  | "notification"
  | "lock"
  | "sign-in"
  | "sign-out"
  | "create-account"
  | "arrow-right"
  | "close"
  | "eye"
  | "eye-off";

const iconContent: Record<RelayIconName, ReactNode> = {
  steps: (
    <>
      <circle cx="5" cy="5" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="5" cy="19" r="1.5" />
      <path d="M10 5h9M10 12h9M10 19h9" />
    </>
  ),
  "why-relay": (
    <path d="M20.8 8.7c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />
  ),
  faq: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.3 2.3 0 1 1 3.9 1.6c-1 .9-1.7 1.1-1.7 2.6M12 16.8h.01" />
    </>
  ),
  spacehub: (
    <>
      <circle cx="12" cy="12" r="2.3" />
      <circle cx="5" cy="6" r="1.5" />
      <circle cx="19" cy="6" r="1.5" />
      <circle cx="5" cy="18" r="1.5" />
      <circle cx="19" cy="18" r="1.5" />
      <path d="m10.3 10.6-4-3.3m7.4 3.3 4-3.3m-7.4 6.1-4 3.3m7.4-3.3 4 3.3" />
    </>
  ),
  discover: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  request: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20v-1a6 6 0 0 1 6-6h1m7-1v6m-3-3h6" />
    </>
  ),
  messages: (
    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z" />
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  notification: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="14" x="5" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2" />
    </>
  ),
  "sign-in": (
    <>
      <path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
      <path d="m10 17 5-5-5-5M15 12H4" />
    </>
  ),
  "sign-out": (
    <>
      <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
      <path d="m14 17 5-5-5-5m5 5H8" />
    </>
  ),
  "create-account": (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20v-1a6 6 0 0 1 6-6h1M19 14v6m-3-3h6" />
    </>
  ),
  "arrow-right": <path d="M4 12h15m-6-6 6 6-6 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.3 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.8M6.2 6.8C3.8 8.3 2.5 12 2.5 12s3.2 6 9.5 6a10.5 10.5 0 0 0 3-.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
};

export function RelayIcon({
  className = "size-4",
  name,
}: {
  className?: string;
  name: RelayIconName;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {iconContent[name]}
    </svg>
  );
}
