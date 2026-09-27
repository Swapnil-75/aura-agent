"use client";

import Link from "next/link";
import type { CallHistoryEntry } from "@/lib/callHistory";

function entryLabel(entry: CallHistoryEntry): string {
  if (entry.summary?.order_id) return `${entry.summary.customer_intent} — ${entry.summary.order_id}`;
  if (entry.summary?.customer_intent) return entry.summary.customer_intent;
  return "Call";
}

export default function HistoryPanel({
  entries,
  onClose,
  onClear,
}: {
  entries: CallHistoryEntry[];
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Call History</h2>
          <div className="flex gap-3">
            {entries.length > 0 && (
              <button onClick={onClear} className="text-sm text-red-600 hover:underline">
                Clear
              </button>
            )}
            <button onClick={onClose} className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
              Close
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No past calls yet — history is saved in this browser after each call ends.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/[.06] rounded-lg border border-black/[.08] dark:divide-white/10 dark:border-white/[.145]">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/call/${entry.id}`}
                  onClick={onClose}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                >
                  <span className="font-medium text-black dark:text-zinc-50">{entryLabel(entry)}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {new Date(entry.endedAt).toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
