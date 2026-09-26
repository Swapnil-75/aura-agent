# Design — UI/UX & Voice Design

Functionality and clarity matter more than visual polish for this assignment.
This doc keeps design decisions simple, intentional, and easy to explain.

## 1. Screen Layout (single page)

```
┌──────────────────────────────────────────────┐
│  Aura Skincare — Voice Support (Aria)         │
├──────────────────────────────────────────────┤
│                                                │
│   [ State Indicator: ● Listening ]            │
│                                                │
│        [ Start Call ]   [ End Call ]          │
│                                                │
├───────────────────────┬────────────────────────┤
│  Test Orders Helper    │  Transcript / Summary  │
│  ─────────────────    │  ────────────────────  │
│  ORD-101 — Priya S.    │  (empty until call     │
│   Vitamin C Serum      │   ends, then populated │
│   Out for Delivery     │   with transcript +    │
│                        │   JSON summary)        │
│  ORD-102 — Rahul V.    │                        │
│   Sunscreen SPF50      │                        │
│   Delivered            │                        │
│                        │                        │
│  ORD-103 — Ananya P.   │                        │
│   Face Wash + Toner    │                        │
│   Processing           │                        │
└───────────────────────┴────────────────────────┘
```

## 2. State Indicator

Three states, visually distinct (color + label + simple icon/animation):

| State | Color | Meaning |
|---|---|---|
| Listening | blue, pulsing dot | mic open, agent waiting on / receiving customer audio |
| Thinking | amber, subtle spinner | agent processing, possibly calling a tool |
| Speaking | green, animated waveform bars | agent's audio is playing back |

Driven directly off Live API session events — no fake/simulated states.

## 3. Test Orders Helper Panel

Always visible (not hidden behind a click) per the spec's requirement that
evaluators can test immediately without external docs. Each card shows:
customer name, product, value, status, and one relevant note (e.g. tracking ID
or cancellation eligibility) — pulled directly from the mock DB, not hardcoded
twice, so it can't drift out of sync with the actual tool data.

## 4. Transcript View

- Chronological, speaker-labeled: "Customer:" / "Aria:"
- Simple alternating background shading for readability, no chat-bubble
  over-design needed
- Appears only after End Call is pressed (keeps the live-call view uncluttered)

## 5. Summary View

- Rendered as a labeled JSON block (monospace, syntax-highlighted if easy to add,
  plain `<pre>` if not — clarity over decoration)
- Placed directly below/beside the transcript, not on a separate tab, so an
  evaluator sees both without extra navigation

## 6. Visual Style

- Neutral, clean palette echoing a premium skincare brand: soft off-white
  background, one accent color (muted sage/green — organic skincare
  association), dark neutral text
- One clear sans-serif font, no more than 2 weights
- No unnecessary chrome, animations, or decorative elements — every visual
  element should map to a functional requirement in the spec

## 7. Voice Design

- Persona script (see `rules.md`) carries the "Indian, friendly, professional"
  brand feel, since Gemini Live's built-in voices aren't Indian-accented
- Responses kept short by explicit system-prompt instruction (1–3 sentences),
  since long spoken responses feel unnatural and increase perceived latency
- No filler/hedging language ("um," "so basically") — concise and direct,
  matching a real support agent's efficient phone manner

## 8. Accessibility / Practical Considerations
- Mic permission request handled with a clear pre-call prompt, not a silent
  browser popup with no context
- Clear error state if mic access is denied or Live API connection fails —
  never a silent hang
- Works in latest Chrome (primary target; note this in README rather than
  over-engineering cross-browser audio-worklet compatibility given the timeline)
