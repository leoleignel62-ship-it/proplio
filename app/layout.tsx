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
  title: "Locavio — Logiciel de gestion locative en ligne pour propriétaires",
  description:
    "Locavio simplifie la gestion locative des propriétaires bailleurs. Quittances PDF en 1 clic, baux conformes loi ALUR, états des lieux, révision IRL automatique. Gratuit pour commencer.",
  keywords: [
    "gestion locative",
    "logiciel gestion locative",
    "quittance de loyer",
    "bail location",
    "état des lieux",
    "révision IRL",
    "propriétaire bailleur",
  ],
  openGraph: {
    title: "Locavio — Logiciel de gestion locative en ligne",
    description:
      "Simplifiez votre gestion locative. Quittances, baux, états des lieux, révision IRL — tout automatisé en quelques clics.",
    url: "https://locavio.fr",
    siteName: "Locavio",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://locavio.fr/og-image.png",
        width: 1200,
        height: 630,
        alt: "Locavio — Gestion locative simplifiée",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locavio — Logiciel de gestion locative en ligne",
    description:
      "Simplifiez votre gestion locative. Quittances, baux, états des lieux, révision IRL — tout automatisé.",
    images: ["https://locavio.fr/og-image.png"],
  },
  icons: {
    icon: "/logos/favicon.svg",
    shortcut: "/logos/favicon.svg",
    apple: "/logos/favicon.svg",
  },
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
