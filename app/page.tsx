"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveCall, type CallState, type TranscriptEntry } from "@/lib/liveSession";
import CallOrb from "@/components/CallOrb";
import TranscriptView from "@/components/TranscriptView";
import PageBackground from "@/components/PageBackground";
import NavBar from "@/components/NavBar";
import LandingHero from "@/components/LandingHero";
import FeatureCards from "@/components/FeatureCards";
import HowItWorks from "@/components/HowItWorks";
import HistoryPanel from "@/components/HistoryPanel";
import { addCallToHistory, getCallHistory, clearCallHistory, type CallHistoryEntry } from "@/lib/callHistory";

type CallStatus = "idle" | "requesting-mic" | "connecting" | "active" | "ending" | "error";

export default function Home() {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callState, setCallState] = useState<CallState>("listening");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  const callRef = useRef<LiveCall | null>(null);

  const handleStart = async () => {
    setErrorMessage(null);
    setLiveTranscript([]);
    setIsMuted(false);
    setCallStatus("requesting-mic");

    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage("Microphone access was denied or unavailable. Please allow mic access and try again.");
      setCallStatus("error");
      return;
    }

    setCallStatus("connecting");
    try {
      const call = new LiveCall(
        (s) => setCallState(s),
        (t) => setLiveTranscript(t)
      );
      await call.start(micStream);
      callRef.current = call;
      setCallStatus("active");
    } catch (err) {
      console.error(err);
      micStream.getTracks().forEach((t) => t.stop());
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong connecting the call. Please try again."
      );
      setCallStatus("error");
    }
  };

  const handleEnd = async () => {
    const call = callRef.current;
    call?.stop();
    callRef.current = null;

    const finalTranscript = call?.getTranscript() ?? [];
    if (finalTranscript.length === 0) {
      setCallStatus("idle");
      return;
    }

    // Stay on a transitional "ending" screen instead of dropping straight back
    // to the marketing homepage while the summary is generated — avoids the
    // "flashes back to home" feel, then routes to the call's own results page.
    setCallStatus("ending");

    let record: CallHistoryEntry;
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Call summary request failed: ${res.status}`);
      record = data as CallHistoryEntry;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate call summary.";
      // Save the transcript to history even when summary generation fails —
      // losing the whole call record to a transient/quota API error is worse
      // than storing it with summary: null and the error attached.
      record = {
        id: crypto.randomUUID(),
        endedAt: new Date().toISOString(),
        transcript: finalTranscript,
        summary: null,
        summaryError: message,
      };
    }
    setHistory(addCallToHistory(record));
    setCallStatus("idle");
    router.push(`/call/${record.id}`);
  };

  const openHistory = () => {
    setHistory(getCallHistory());
    setHistoryOpen(true);
  };

  const handleClearHistory = () => {
    clearCallHistory();
    setHistory([]);
  };

  const toggleMute = () => {
    const next = !isMuted;
    callRef.current?.setMuted(next);
    setIsMuted(next);
  };

  const isCallActive = callStatus === "active";

  if (callStatus === "ending") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 font-sans dark:bg-black">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Wrapping up your call...</p>
      </div>
    );
  }

  if (isCallActive) {
    // Mode B — full-screen active-call takeover (design.md Section 1/2).
    return (
      <div className="flex flex-1 flex-col items-center justify-between bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
        <div />
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <CallOrb state={callState} />
          <TranscriptView
            transcript={liveTranscript}
            autoScroll
            maxHeightClassName="max-h-64 w-full max-w-lg"
          />
        </div>
        <div className="flex gap-4">
          <button
            onClick={toggleMute}
            className="rounded-full border border-black/[.08] px-5 py-3 dark:border-white/[.145]"
          >
            {isMuted ? "🔇 Unmute" : "🎙️ Mute"}
          </button>
          <button onClick={handleEnd} className="rounded-full bg-red-600 px-5 py-3 text-white">
            ⏹ End Call
          </button>
        </div>
      </div>
    );
  }

  // Mode A — idle / pre-call and post-call (design.md Section 1).
  return (
    <div className="relative flex flex-col flex-1 font-sans">
      <PageBackground />
      <NavBar onHistoryClick={openHistory} />

      {historyOpen && (
        <HistoryPanel entries={history} onClose={() => setHistoryOpen(false)} onClear={handleClearHistory} />
      )}

      <LandingHero onStartCall={handleStart} disabled={callStatus === "requesting-mic" || callStatus === "connecting"} />

      <section className="relative z-10 px-6 pb-12">
        <FeatureCards />
      </section>

      <section className="relative z-10 px-6 pb-12">
        <HowItWorks />
      </section>

      <main className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 py-8">
        {callStatus === "requesting-mic" && (
          <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
            Aria needs microphone access to hear you — your browser will ask for permission next.
            Please allow it to start the call.
          </p>
        )}
        {callStatus === "connecting" && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Connecting to Aria...</p>
        )}
        {errorMessage && (
          <p className="max-w-md text-center text-sm text-red-600">
            Couldn&apos;t start the call: {errorMessage}
          </p>
        )}
      </main>
    </div>
  );
}
