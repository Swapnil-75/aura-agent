export default function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 4C10 4 4 10 4 18v2h2c8 0 14-6 14-16V4Z"
        fill="#6b9080"
      />
      <path
        d="M6 20C6 12 12 6 20 4"
        stroke="#e1f5ee"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
