import Link from "next/link";
import LeafIcon from "@/components/LeafIcon";

export default function NavBar({ onHistoryClick }: { onHistoryClick?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[.08] bg-zinc-50 px-6 shadow-sm sm:px-8 dark:border-white/[.145] dark:bg-black">
      <Link href="/" className="flex items-center">
        <LeafIcon className="h-6 w-6" />
        <span className="ml-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Aura Skincare</span>
      </Link>
      <div className="flex items-center gap-3">
        {onHistoryClick && (
          <button
            onClick={onHistoryClick}
            className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
          >
            History
          </button>
        )}
      </div>
    </header>
  );
}
