import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { MessagingProvider } from "@/features/messaging/providers/messaging-provider";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const themeBootstrap = `(() => {
  let preference = "system";
  try {
    const savedTheme = window.localStorage.getItem("relay-theme");
    preference =
      savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
        ? savedTheme
        : "system";
  } catch {
    preference = "system";
  }
  const theme =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = theme;
})();`;

export const metadata: Metadata = {
  title: "Relay — conversations, with room to breathe",
  description:
    "A more thoughtful space for private, one-to-one conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <Script
        dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        id="relay-theme-bootstrap"
        strategy="beforeInteractive"
      />
      <body>
        <ThemeProvider>
          <AuthProvider>
            <MessagingProvider>{children}</MessagingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
