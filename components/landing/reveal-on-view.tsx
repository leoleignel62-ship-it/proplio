"use client";

import type { ReactNode } from "react";
import { useInView } from "@/components/hooks/use-in-view";

const revealClass = (inView: boolean) =>
  `${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"} transition-all duration-700 ease-out`;

type RevealOnViewProps = {
  children: ReactNode;
  className?: string;
};

/** Section / bloc avec apparition au scroll (IntersectionObserver). */
export function RevealOnView({ children, className = "" }: RevealOnViewProps) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`${revealClass(inView)} ${className}`.trim()}>
      {children}
    </div>
  );
}
