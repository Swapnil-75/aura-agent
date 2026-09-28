# Architecture — Aura Skincare AI Voice Agent

"Aria" is a browser-based voice support agent for a fictional D2C skincare brand.
The customer speaks into their mic; a single Gemini Live session understands the
speech, reasons over brand policy, optionally looks up order data, and replies in
audio — all in one realtime loop. When the call ends, a second model turns the
transcript into a structured summary, and the result is saved to call history.

```
Browser mic (getUserMedia + AudioWorklet)
  → 16kHz PCM streamed over WebSocket to Gemini Live (gemini-3.8-live)
  → Gemini: understands speech, reasons, optionally calls get_order_details, replies in audio
  → 24kHz PCM streamed back, played via Web Audio API
  → Live transcript accumulated turn-by-turn as the call happens
  → On End Call: transcript sent to /api/calls
  → /api/calls calls gemini-3.5-flash-lite for a structured JSON summary
  → Result (transcript + summary) saved to localStorage and shown on a
    per-call results page, with a feedback form
```

**Voice pipeline — Gemini Live API (`gemini-3.8-live`).** One realtime
WebSocket session handles STT, reasoning, native function calling, and TTS, so
there's no stitched multi-vendor pipeline to keep in sync. `lib/liveSession.ts`
owns this session end-to-end: it opens the connection with a server-minted
ephemeral token (never the real API key — minted per-call by
`app/api/session/route.ts`), sends Aria's persona and brand guardrails from
`lib/systemPrompt.ts` as the system instruction, captures mic audio through an
`AudioWorklet` (`public/pcm-recorder-worklet.js`) that converts it to 16kHz PCM,
plays the returned 24kHz audio via the Web Audio API, and emits the
Listening/Thinking/Speaking state that drives `components/CallOrb.tsx`. It also
registers `get_order_details(order_id)` (`lib/tools.ts`) as a callable tool,
which looks up the id in the mock database (`data/orders.json` — three real
records plus two placeholders) and returns order data or a clear "not found."

**Post-call summary — a separate, non-Live model.** Once the call ends, the
accumulated transcript goes to `/api/calls`, which calls
`lib/generateSummary.ts` — a `gemini-3.5-flash-lite` text call with a prompt
enforcing strict JSON output and retry-on-transient-error handling. This is
deliberately a different model and a different code path from the live voice
loop: it isn't latency-sensitive, it needs deterministic structured output, and
keeping it independent means a summary failure can't destabilize an in-progress
call. (`app/api/summarize/route.ts` exposes the same summary generation as a
standalone, bare-summary route for isolated use.) The bundled record — id,
timestamp, transcript, summary — is persisted client-side via
`lib/callHistory.ts` into `localStorage`; if summary generation fails, the
transcript is still saved with the real error attached rather than losing the
call. `app/page.tsx` renders the landing page and the active-call view;
`app/call/[id]/page.tsx` renders a finished call's transcript, summary, and
feedback form; `components/HistoryPanel.tsx` lists past calls from
`localStorage`.

**Why this shape.** No real database — `localStorage` plus a static JSON file
match the actual scope (a handful of sample orders, a demo call history) and
avoid persistence infrastructure this project doesn't need; it's also the
approach that survives Vercel's non-persistent-filesystem serverless model.
Next.js on Vercel keeps frontend and backend as one deployable project instead
of provisioning a separate server.

**Known limitations.** Gemini's free tier is rate-limited (the summary model
caps out in the tens of requests per minute/day) — fine for a demo, not
production volume. Gemini's built-in voices aren't Indian-accented; the brand's
Indian conversational register comes from the persona/script, not true
accent-matched TTS. Barge-in updates the UI state correctly, but audio already
queued in the Web Audio playback buffer isn't forcibly cut off. Call history is
per-browser, not shared across devices.

See `README.md` for setup instructions and deployment steps.
