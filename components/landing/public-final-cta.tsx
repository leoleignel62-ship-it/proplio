import type { ReactNode } from "react";

export function PublicFinalCta({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="relative my-12 mb-0 overflow-hidden rounded-2xl px-8 py-10 text-center"
      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" }}
    >
      <div
        className="pointer-events-none absolute -left-16 top-8 h-44 w-44 rounded-full bg-white opacity-10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -right-10 h-52 w-52 rounded-full bg-white opacity-10"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {description ? <p className="mt-4 text-sm text-white/90">{description}</p> : null}
        <div className="mt-6 flex flex-col items-center justify-center gap-4">{children}</div>
      </div>
    </section>
  );
}
