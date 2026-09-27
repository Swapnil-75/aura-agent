# Design — UI/UX & Voice Design

Functionality and clarity matter more than visual polish for this assignment.
This doc keeps design decisions simple, intentional, and easy to explain.

## 1. Screen Layout — Two Modes

**Revised (superseding the original single flat layout):** the page now has
two distinct visual modes rather than one static layout.

### Mode A — Idle / pre-call and post-call (default)
```
┌──────────────────────────────────────────────┐
│  Aura Skincare — Voice Support (Aria)         │
├──────────────────────────────────────────────┤
│                                                │
│              [ Start Call ]                   │
│                                                │
├───────────────────────┬────────────────────────┤
│  Test Orders Helper    │  Transcript / Summary  │
│  ─────────────────    │  ────────────────────  │
│  ORD-101 — Priya S.    │  (empty until a call    │
│   Vitamin C Serum      │   has ended, then       │
│   Out for Delivery     │   populated with the    │
│                        │   most recent call's     │
│  ORD-102 — Rahul V.    │   transcript + JSON      │
│   Sunscreen SPF50      │   summary)               │
│   Delivered            │                        │
│                        │                        │
│  ORD-103 — Ananya P.   │                        │
│   Face Wash + Toner    │                        │
│   Processing           │                        │
└───────────────────────┴────────────────────────┘
```

### Mode B — Active call (full-screen takeover, see Section 2 for the orb spec)
```
┌──────────────────────────────────────────────┐
│                   ◉                           │
│              "Listening…"                     │
│                                                │
│  ┌──────────────────────────────────────┐    │
│  │ Customer: Can you check ORD-101?      │    │
│  │ Aria: Your order is out for delivery  │    │
│  │       and expected by 6 PM today.     │    │
│  │ (live, auto-scrolling, updates as      │    │
│  │  each turn completes)                  │    │
│  └──────────────────────────────────────┘    │
│                                                │
│           [ 🔇 mute ]  [ ⏹ end call ]          │
└──────────────────────────────────────────────┘
```
**Revised:** the transcript is now shown live, during the call, not only
after it ends. This uses the exact same `inputTranscription`/
`outputTranscription` event stream already wired up in `lib/liveSession.ts`
since Phase 4 — the only change is rendering each turn as it arrives (e.g.
via the same `onStateChange`-style callback pattern, or a new
`onTranscriptUpdate` callback) instead of only reading the final accumulated
transcript on End Call. `TranscriptView.tsx` from Phase 4 can likely be
reused directly for this, just fed a live-updating array instead of a
final one.

Test Orders panel and the *previous* call's transcript/summary are hidden
while a call is active; Mode A reappears (with the now-finalized transcript +
generated JSON summary) immediately on End Call.

**Considered and rejected:** `react-speakup` (a Web Speech API wrapper) for
this — it would introduce an entirely separate STT/TTS pipeline running
alongside the already-working Gemini Live audio pipeline, with no natural way
to connect to tool-calling or the existing transcription events. The live
transcript data already exists from the Live API session itself; no
additional library is needed, only a rendering change.

## 2. State Indicator — Orb-Based Call UI (revised)

**Superseded the original three-badge design.** New direction: a single
central animated orb, similar in spirit to ChatGPT's voice-call interface —
full-screen (or full-panel) takeover during an active call, orb as the sole
visual focus, state communicated through motion/color rather than a labeled
badge.

### Layout during an active call
```
┌──────────────────────────────────────────────┐
│                                                │
│                                                │
│                                                │
│                   ◉                           │
│              (central orb)                    │
│                                                │
│                                                │
│                                                │
│           [ 🔇 mute ]  [ ⏹ end call ]          │
└──────────────────────────────────────────────┘
```
Everything else (Test Orders panel, transcript, summary) is hidden or faded
out while a call is active, and reappears/renders once the call ends.

### Orb states (still driven by the exact same real session events as before
— only the visual treatment changes, not the underlying event wiring)

| State | Visual treatment | Driven by |
|---|---|---|
| Listening | Slow, gentle idle pulse (scale 0.95↔1.0), calm accent color | `voiceActivity` ACTIVITY_START, mic open, no tool call in flight |
| Thinking | Subtle internal shimmer/rotation, slightly desaturated | tool call in flight, or model generating before first audio chunk |
| Speaking | More energetic ripple/waveform-reactive motion, full accent color, ideally reactive to actual output audio amplitude | first audio chunk arrived, through end of scheduled playback |

Implementation notes:
- Keep the animation to CSS/SVG (scale, opacity, a soft box-shadow "glow" pulsing
  at different speeds per state) — no need for a canvas-based audio visualizer
  unless there's time to spare; a good CSS pulse reads as "alive" without the
  complexity of true amplitude-reactive rendering.
- If time allows, driving actual speaking-state ripple amplitude off the real
  Web Audio output buffer (via an AnalyserNode) is a nice touch, but is
  Phase 6 polish, not required — a state-driven pulse (not truly
  amplitude-reactive) is a perfectly acceptable and honest v1.
- Still zero fake/simulated states — same underlying event wiring from
  `lib/liveSession.ts` (`onStateChange`) drives the orb; only the rendering
  changed from a labeled badge to a full-screen visual.
- A small text caption beneath the orb ("Listening…" / "Thinking…" /
  "Speaking…") is still worth keeping for accessibility/clarity — the orb
  carries the primary visual read, the caption is a fallback, not decoration.

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

## 5.5 Landing Page (Marketing/Informational Layout — supplements Mode A)

**Revised:** in addition to the functional Mode A layout (Start Call, Test
Orders panel, transcript/summary), the page now opens with a proper landing
page section above it, telling the evaluator what the agent does before they
even start a call:

1. **Hero** — persona intro ("Meet Aria, your Aura Skincare voice assistant"),
   one-line description, Start Call CTA.
2. **Feature cards** (reveal-on-scroll via `IntersectionObserver`, fade +
   slight translateY) — 4 cards: order tracking, shipping/returns,
   cancellations, call summary. Grid, `repeat(auto-fit, minmax(200px, 1fr))`.
3. **How it works** — a simple 3-step horizontal flow (you speak → Aria
   checks policy/order → Aria replies), connected with arrows.
4. **Functional panel** (Mode A as originally specced) — Test Orders +
   transcript/summary, below the marketing sections, not replacing them.

### Hero background texture (revised — v1 was too faint, barely visible in build)
Same two-blob concept as before (one large top-right, one smaller
bottom-left, sage-green), but the first implementation rendered almost
invisibly. Fix as follows:

- **Use `filter: blur(60-80px)` on the blob shapes**, not crisp edges. Crisp
  shapes at low opacity just disappear against a similar-toned background —
  a blurred soft glow reads clearly even at moderate opacity.
- **Increase blob size** so each one spans roughly a third to a half of the
  hero section's width/height — the original blobs were too small relative
  to the actual rendered page.
- **Increase opacity to ~35-45%** now that blur softens the edges (crisp
  50-60% opacity read as too subtle; blurred needs slightly more to still
  register).
- **Confirm the hero section itself has a transparent/no background-color**
  sitting on top of the blob layer — if a solid `--surface-*` background is
  applied to the hero container, it will fully mask the blobs regardless of
  their own opacity. The blobs should be a background layer (CSS
  `background`, an absolutely-positioned `<div>`, or an SVG placed behind
  content with `z-index: 0`), with the hero's actual content at `z-index: 1`
  and no opaque fill in between.
- Reference point for the general pattern (large, soft, blurred color blobs
  behind a transparent hero, not a busy pattern): the hero treatment used on
  latch.family — soft color glow behind bold typography, not a literal
  texture. Don't copy their actual colors/copy — just the "blurred glow,
  not crisp shapes" technique.

Still rejected: the original denser multi-leaf pattern (too busy). This is a
visibility/execution fix on the accepted minimal two-blob concept, not a
redesign back toward more shapes.

### Background scope (revised — was hero-only, now full-page fixed)
Reviewing the build: the blob background disappeared as soon as the user
scrolled past the hero, since it was scoped to the hero section's own
bounding box. Correct behavior: **the background should be pinned to the
viewport and stay static while the page content scrolls over it** — the
same two-blob visual, just repositioned:

- `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh` on the
  background layer, `z-index` below all page content (nav bar, hero,
  cards) but the layer itself spans the full viewport, not just the hero.
- Because it's `fixed`, it never scrolls — as the user scrolls the page,
  only the content (nav, hero, cards, test orders, transcript) moves; the
  two blurred blobs stay anchored to their position on screen throughout.
- The nav bar (Section 1.5) still needs a solid/opaque background so it
  doesn't visually clash with content scrolling underneath it — that's
  layered above the fixed blob background, not instead of it.
- Card sections (feature cards, test orders, transcript panel) keep their
  existing solid `--surface-2` backgrounds — the fixed blobs will show
  through in the gaps/margins around and between cards as the page scrolls,
  the same way they show behind the hero now, rather than needing every
  section to be transparent.
- This is a repositioning fix, not a redesign — same two blobs, same blur/
  opacity treatment from above, just `fixed` to the viewport instead of
  scoped to one section.

## 1.5 Navigation Bar (new — was missing/underbuilt in first landing page pass)

The build so far has only a thin hairline with a page title beneath it — not
a real nav bar. Add:

- A proper header bar, sticky or fixed to the top of the viewport as the
  page scrolls (`position: sticky; top: 0`), sitting above all page content
  including the hero background blobs (`z-index` above the hero layer).
- Left: a small brand mark (reuse the leaf icon already in the hero) +
  "Aura Skincare" wordmark, smaller/quieter than the hero heading (this is
  chrome, not the main message).
- Height around 56-64px, comfortable horizontal padding (24-32px), a subtle
  bottom border (`var(--border)`) or a very light shadow to separate it from
  scrolling content beneath.
- Background should be a solid or near-solid surface color (not transparent)
  so text/content scrolling underneath doesn't show through and clash —
  this is one place an opaque background is correct, unlike the hero.
- Keep it minimal — no additional nav links needed for a single-page
  testing interface; the brand mark + wordmark alone is enough to make it
  read as a real header rather than a stray title line.

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