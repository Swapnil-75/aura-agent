"use client";

import { useState } from "react";
import type { CallSummary } from "@/lib/generateSummary";

export type { CallSummary };

const INTENT_LABELS: Record<string, string> = {
  ORDER_TRACKING: "Order Tracking",
  RETURN_REQUEST: "Return Request",
  CANCELLATION_REQUEST: "Cancellation Request",
  POLICY_QUESTION: "Policy Question",
  OUT_OF_SCOPE: "Out of Scope",
};

const STATUS_STYLES: Record<string, string> = {
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  UNRESOLVED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ESCALATED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  OUT_OF_SCOPE: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function SummaryView({ summary, error }: { summary: CallSummary | null; error?: string | null }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Call Summary
      </h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && (
        <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/[.05] px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300">
              {INTENT_LABELS[summary.customer_intent] ?? summary.customer_intent}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_STYLES[summary.resolution_status] ?? "bg-black/[.05] text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300"
              }`}
            >
              {summary.resolution_status}
            </span>
            {summary.order_id && (
              <span className="rounded-full bg-black/[.05] px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300">
                {summary.order_id}
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-800 dark:text-zinc-200">{summary.call_summary}</p>

          <button
            onClick={() => setShowRaw((v) => !v)}
            className="self-start text-xs text-zinc-500 underline dark:text-zinc-400"
          >
            {showRaw ? "Hide raw JSON" : "View raw JSON"}
          </button>
          {showRaw && (
            <pre className="overflow-x-auto rounded-md bg-black/[.03] p-3 text-xs dark:bg-white/[.05]">
              {JSON.stringify(summary, null, 2)}
            </pre>
          )}
        </div>
      )}
      {!summary && !error && <p className="text-sm text-zinc-500 dark:text-zinc-400">Generating summary...</p>}
    </div>
  );
}
