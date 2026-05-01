export function LandingAnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08),transparent_55%)]" />
      <div className="absolute left-[6%] top-[8%] h-[640px] w-[640px] rounded-full bg-[#7c3aed] opacity-[0.25] blur-[120px] animate-[locavio-orbit-1_35s_linear_infinite]" />
      <div className="absolute right-[6%] top-[10%] h-[800px] w-[800px] rounded-full bg-[#4f46e5] opacity-[0.25] blur-[130px] animate-[locavio-orbit-2_35s_linear_infinite]" />
      <div className="absolute left-[18%] bottom-[4%] h-[560px] w-[560px] rounded-full bg-[#a78bfa] opacity-[0.25] blur-[110px] animate-[locavio-orbit-3_35s_linear_infinite]" />
      <div className="absolute right-[14%] bottom-[8%] h-[500px] w-[500px] rounded-full bg-[#6366f1] opacity-[0.25] blur-[105px] animate-[locavio-orbit-4_35s_linear_infinite]" />
    </div>
  );
}
