"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { LandingAnimatedBackground } from "@/components/landing/landing-animated-background";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { PC } from "@/lib/locavio-colors";

const pageBg: CSSProperties = {
  backgroundColor: PC.bg,
  backgroundImage: `${PC.gradientBg}, radial-gradient(circle at 0% 100%, rgba(79, 70, 229, 0.08), transparent 45%)`,
  backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
  color: PC.text,
  minHeight: "100vh",
};

export function MarketingPublicShell({ children }: { children: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative isolate" style={pageBg}>
      <LandingAnimatedBackground />
      <LandingNavbar isScrolled={isScrolled} />
      {children}
    </div>
  );
}
