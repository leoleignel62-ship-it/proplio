import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PC } from "@/lib/locavio-colors";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Locavio — Gestion locative",
  description: "Locavio : plateforme premium de gestion locative pour propriétaires bailleurs.",
};

/** Équivaut à <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /> */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shellBg: CSSProperties = {
    backgroundColor: PC.bg,
    color: PC.text,
  };

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={shellBg}
      suppressHydrationWarning
    >
      <body className="min-h-full" style={shellBg} suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
