"use client";

import { useEffect, useRef } from "react";
import type { TranscriptEntry } from "@/lib/liveSession";

export default function TranscriptView({
  transcript,
  autoScroll = false,
  maxHeightClassName = "",
}: {
  transcript: TranscriptEntry[];
  autoScroll?: boolean;
  maxHeightClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll, transcript]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Transcript
      </h2>
      <div
        ref={scrollRef}
        className={`flex flex-col divide-y divide-black/[.06] overflow-y-auto rounded-lg border border-black/[.08] bg-white dark:divide-white/10 dark:border-white/[.145] dark:bg-zinc-900 ${maxHeightClassName}`}
      >
        {transcript.map((entry, i) => (
          <p
            key={i}
            className={`px-3 py-2 text-sm ${i % 2 === 0 ? "bg-transparent" : "bg-black/[.02] dark:bg-white/[.03]"}`}
          >
            <span className="font-semibold">{entry.speaker}:</span> {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}
