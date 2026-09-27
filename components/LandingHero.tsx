import LeafIcon from "@/components/LeafIcon";

export default function LandingHero({
  onStartCall,
  disabled,
}: {
  onStartCall: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="relative z-10 min-h-[320px] px-6 py-10 text-center">
      {/* Background texture lives in the page-level, viewport-fixed
          PageBackground component (design.md "Background scope, revised")
          so it stays anchored while content scrolls, rather than being
          scoped to this section. */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <LeafIcon className="h-10 w-10" />
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Meet Aria, your Aura Skincare voice assistant
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Ask about an order, a return, or our policies — out loud, and get an answer in seconds.
        </p>
        <button
          onClick={onStartCall}
          disabled={disabled}
          className="mt-2 rounded-full bg-foreground px-6 py-3 text-background disabled:opacity-40"
        >
          Start Call
        </button>
      </div>
    </section>
  );
}
