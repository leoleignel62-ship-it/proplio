import Image from "next/image";
import type { ReactNode } from "react";

export function PublicPageHeader({
  children,
  className = "",
  maxWidthClass = "max-w-4xl",
}: {
  children: ReactNode;
  className?: string;
  /** e.g. max-w-3xl for article pages */
  maxWidthClass?: string;
}) {
  return (
    <header
      className={`mx-auto mb-8 ${maxWidthClass} space-y-6 rounded-2xl border border-gray-100 border-t-4 border-t-[#7c3aed] bg-white px-8 py-10 text-center shadow-sm ${className}`}
    >
      <Image
        src="/logos/logomark-couleur.svg"
        alt=""
        width={40}
        height={40}
        className="mx-auto mb-4"
      />
      {children}
    </header>
  );
}
