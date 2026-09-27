"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import PageBackground from "@/components/PageBackground";
import TranscriptView from "@/components/TranscriptView";
import SummaryView from "@/components/SummaryView";
import { getCallById, updateCallFeedback, type CallFeedback, type CallHistoryEntry } from "@/lib/callHistory";

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  // Reading localStorage can't happen during server rendering, so the first
  // render (server AND client, before hydration) must be identical — loading
  // the real entry has to wait for a client-only effect, or the server's
  // "not found" render mismatches the client's real data and React throws a
  // hydration error.
  const [loaded, setLoaded] = useState(false);
  const [entry, setEntry] = useState<CallHistoryEntry | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Deliberate: localStorage is an external system that only exists client-
    // side, so this read has to happen post-hydration in an effect rather
    // than during render — the lint rule's usual concern (avoidable derived
    // state) doesn't apply to genuinely external data sources.
    const found = getCallById(params.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry(found);
    setSubmitted(!!found?.feedback);
    setLoaded(true);
  }, [params.id]);

  if (!loaded) {
    return (
      <div className="relative flex min-h-screen flex-col font-sans">
        <PageBackground />
        <NavBar />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="relative flex min-h-screen flex-col font-sans">
        <PageBackground />
        <NavBar />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Call not found.</p>
          <Link href="/" className="text-sm underline">
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  const handleSubmitFeedback = () => {
    if (rating === 0) return;
    const feedback: CallFeedback = { rating, comment: comment.trim() || undefined };
    updateCallFeedback(entry.id, feedback);
    setEntry({ ...entry, feedback });
    setSubmitted(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col font-sans">
      <PageBackground />
      <NavBar />

      <main className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 py-10">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Call Summary</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(entry.endedAt).toLocaleString()}</p>

        <div className="flex w-full max-w-lg flex-col gap-6">
          <TranscriptView transcript={entry.transcript} maxHeightClassName="max-h-72" />
          <SummaryView
            summary={entry.summary}
            error={entry.summary ? null : entry.summaryError || "Summary unavailable for this call."}
          />

          <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
              How was your experience with Aria?
            </h2>
            {submitted ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Thanks for your feedback!</p>
            ) : (
              <>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      className={`text-2xl leading-none ${
                        star <= rating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Anything you'd like to add? (optional)"
                  rows={3}
                  className="w-full rounded-md border border-black/[.08] bg-white p-2 text-sm dark:border-white/[.145] dark:bg-zinc-900"
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0}
                  className="self-start rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
                >
                  Submit Feedback
                </button>
              </>
            )}
          </div>

          <Link href="/" className="text-center text-sm text-zinc-600 underline dark:text-zinc-400">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
