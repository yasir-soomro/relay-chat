import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import "./globals.css";

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
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
