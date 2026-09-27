"use client";

import { useEffect, useRef, useState } from "react";

const FEATURES = [
  { title: "Order Tracking", description: "Ask about any order and get its live status and tracking details." },
  { title: "Shipping & Returns", description: "Clear answers on delivery fees, timelines, and the 7-day return window." },
  { title: "Cancellations", description: "Cancel while an order is still processing, or learn why it's too late." },
  { title: "Call Summary", description: "Every call ends with a structured, factual summary of what happened." },
];

export default function FeatureCards() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(() => FEATURES.map(() => false));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setVisible((prev) => {
            if (prev[index]) return prev;
            const next = [...prev];
            next[index] = true;
            return next;
          });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {FEATURES.map((feature, i) => (
        <div
          key={feature.title}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          data-index={i}
          className={`min-h-[160px] rounded-xl border border-black/[.08] bg-white p-6 transition-all duration-700 ease-out dark:border-white/[.145] dark:bg-zinc-900 ${
            visible[i] ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">{feature.title}</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
