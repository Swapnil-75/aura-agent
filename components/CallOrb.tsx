import type { CallState } from "@/lib/liveSession";

const CAPTIONS: Record<CallState, string> = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const ORB_ANIMATION: Record<CallState, string> = {
  listening: "animate-[orb-listening_2.5s_ease-in-out_infinite]",
  thinking: "animate-[orb-thinking_1.4s_linear_infinite]",
  speaking: "animate-[orb-speaking_0.6s_ease-in-out_infinite]",
};

export default function CallOrb({ state }: { state: CallState }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-40 w-40 items-center justify-center">
        {state === "speaking" && (
          <>
            <span className="absolute h-40 w-40 rounded-full bg-[#6b9080] animate-[orb-ripple_1.2s_ease-out_infinite]" />
            <span
              className="absolute h-40 w-40 rounded-full bg-[#6b9080] animate-[orb-ripple_1.2s_ease-out_infinite]"
              style={{ animationDelay: "0.4s" }}
            />
          </>
        )}
        <div className={`relative h-28 w-28 rounded-full bg-[#6b9080] ${ORB_ANIMATION[state]}`} />
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{CAPTIONS[state]}</p>
    </div>
  );
}
