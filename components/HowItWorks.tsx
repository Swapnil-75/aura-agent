const STEPS = [
  { title: "You speak", description: "Ask about an order, a return, or a policy." },
  { title: "Aria checks", description: "Looks up the order or brand policy in real time." },
  { title: "Aria replies", description: "Answers naturally, out loud, in seconds." },
];

export default function HowItWorks() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-4">
      {STEPS.map((step, i) => (
        <div key={step.title} className="flex items-center gap-4">
          <div className="flex w-40 flex-col items-center gap-1 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b9080] font-semibold text-white">
              {i + 1}
            </div>
            <p className="text-sm font-semibold text-black dark:text-zinc-50">{step.title}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.description}</p>
          </div>
          {i < STEPS.length - 1 && (
            <span className="hidden text-2xl text-zinc-400 sm:inline" aria-hidden>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
