# Architecture — Aura Skincare AI Voice Agent

## 1. Overview

A browser-based voice customer support agent ("Aria") for a fictional D2C skincare
brand, Aura Skincare. The customer speaks into their mic; the agent understands,
reasons, optionally calls a tool to look up order data, and responds with speech —
all in a single low-latency loop.

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Voice pipeline | **Gemini Live API** (`gemini-3.1-flash-live-preview` or latest live model) | Free tier via Google AI Studio, native audio-in/audio-out, native function calling, native barge-in / VAD |
| Frontend | **Next.js (React)** | Fast to scaffold, deploys cleanly to Vercel, good mic/audio APIs support |
| Backend | Thin Next.js API routes | Issue ephemeral session config, serve mock order data, run post-call summary generation |
| Mock DB | Static JSON (no real database) | Only 3 orders needed — overkill to stand up a DB |
| Deployment | **Vercel** | Free, zero-config Next.js hosting |
| Summary generation | Gemini Flash (text mode, same free key) | Cheap, non-realtime, batch call after transcript is complete |

## 3. High-Level Flow

```
[Browser Mic] 
    → getUserMedia() captures audio
    → PCM/streamed audio sent over WebSocket to Gemini Live API
    → Gemini Live: does STT understanding + reasoning + (optional) tool call + TTS
    → Audio stream returned to browser
    → Browser plays response through speakers
    → Loop continues, maintaining session context
    → On "End Call": full transcript compiled client-side
    → Transcript sent to a Gemini Flash text call → structured JSON summary generated
    → UI renders transcript + summary
```

## 4. Components

### 4.1 Frontend (`/app`)
- `CallInterface` — Start Call / End Call buttons, mic permission handling
- `StateIndicator` — Listening / Thinking / Speaking, driven by Live API session
  events (e.g. `turn_start`, `turn_complete`, tool-call-in-progress)
- `TestOrdersPanel` — static card showing ORD-101/102/103 and their details
- `TranscriptView` — renders chronological transcript after call ends
- `SummaryView` — renders the structured JSON call outcome

### 4.2 Live Session Manager (`/lib/liveSession.ts`)
- Opens WebSocket connection to Gemini Live API
- Sends system prompt (Aria persona + brand policy + guardrails) at session start
- Registers `get_order_details` as a callable tool
- Streams mic audio in, streams response audio out
- Emits UI state events (listening/thinking/speaking)
- Accumulates a running transcript (both user and agent turns)

### 4.3 Tool: `get_order_details(order_id)` (`/lib/tools.ts`)
- Looks up `order_id` in the mock JSON database
- Returns order data, or a clear "not found" result if the ID doesn't exist
- Model receives the tool result and phrases the reply naturally

### 4.4 Mock Order Database (`/data/orders.json`)
Three records: ORD-101 (Out for Delivery), ORD-102 (Delivered), ORD-103
(Processing, cancellation-eligible) — matching the assignment spec exactly.

### 4.5 Post-Call Summary Service (`/app/api/summarize/route.ts`)
- Takes the full transcript as input
- Calls Gemini Flash (text-only, non-live) with a prompt instructing strict JSON
  output matching the required schema:
  ```json
  {
    "customer_intent": "ORDER_TRACKING",
    "order_id": "ORD-101",
    "resolution_status": "RESOLVED",
    "call_summary": "..."
  }
  ```
- Parses and returns JSON to the frontend

## 5. Why This Architecture (for the README / interview questions)

- **Single realtime loop over a stitched pipeline**: Gemini Live handles
  STT + reasoning + tool-calling + TTS in one connection, which minimizes latency
  and integration surface area given the time budget.
- **Free-tier-only by design**: no paid services anywhere in the loop — a
  deliberate trade-off, sacrificing a true Indian-accented voice for zero cost and
  simplicity (documented as a "next improvement" in the README).
- **Text model reused for summary**: no need for a second vendor; same Gemini key,
  different (non-realtime) call, since summary generation isn't latency-sensitive.
- **No real database**: three static records is proportionate to the assignment
  scope; a real DB would be over-engineering here.

## 6. Known Limitations
- Gemini free tier is rate-limited (~15 RPM) — fine for a single demo call, would
  need a paid tier for concurrent/production traffic.
- No persistent conversation history across sessions (each call is stateless from
  a data-storage perspective; only in-session context is maintained).
- Built-in Gemini Live voices are not Indian-accented; persona/script carries the
  brand voice instead of true accent-matched TTS.
