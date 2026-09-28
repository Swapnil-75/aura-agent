# Aura Skincare — Voice Support (Aria)

A browser-based AI voice customer support agent for a fictional D2C skincare brand, Aura Skincare. Speak into your mic, and "Aria" answers using the brand's real policies, looks up live order data, follows brand guardrails, and produces a transcript + structured summary once the call ends.

**Live demo:** https://aura.swapie.in

## Architecture & Approach

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Voice pipeline | **Gemini Live API** (`gemini-3.8-live`) | Single realtime WebSocket session handles STT, reasoning, native function calling, and TTS — no stitched pipeline to keep in sync |
| Frontend/backend | **Next.js (App Router)** on **Vercel** | One deployable project, no separate backend to provision |
| Auth to Gemini | Server-minted **ephemeral tokens** | The real API key never reaches the browser — see `app/api/session/route.ts` |
| Summary generation | **Gemini Flash-Lite** (`gemini-3.5-flash-lite`), non-Live | Separate model call after the transcript is complete — not latency-sensitive, needs strict structured JSON, and keeping it independent means it can't break the live voice session |
| Mock order DB | Static JSON (`data/orders.json`) | Only 3 (+2 placeholder) records — a real database would be over-engineering here |
| Call history | Browser `localStorage` | No server-side persistence needed; also the only storage approach that survives Vercel's serverless (non-persistent-filesystem) deployment model |

### High-level flow

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

### Key files

| Path | Responsibility |
|---|---|
| `lib/liveSession.ts` | Owns the Gemini Live WebSocket session: mic capture, audio playback, tool-call handling, live state (Listening/Thinking/Speaking), turn-by-turn transcript |
| `lib/systemPrompt.ts` | Aria's persona, Aura Skincare's brand policies, and hard guardrails — sent as the Live session's system instruction |
| `lib/tools.ts` | `get_order_details(order_id)` function-calling schema + lookup against `data/orders.json` |
| `lib/generateSummary.ts` | Calls the non-Live summary model with a strict JSON schema, with retry-on-transient-error handling |
| `lib/callHistory.ts` | `localStorage`-backed read/write for past calls (transcript, summary, feedback) |
| `app/api/session/route.ts` | Mints a short-lived, single-use ephemeral token so the browser never sees the real `GEMINI_API_KEY` |
| `app/api/calls/route.ts` | Takes a finished call's transcript, generates its summary, returns the bundled record for storage |
| `app/page.tsx` | Landing page (Mode A) + full-screen active-call view (Mode B) |
| `app/call/[id]/page.tsx` | Per-call results page: transcript, summary, feedback form |
| `components/CallOrb.tsx` | The Listening/Thinking/Speaking state indicator, driven by real session events |
| `components/HistoryPanel.tsx` | List of past calls (localStorage), links to each one's results page |
| `public/pcm-recorder-worklet.js` | AudioWorklet processor: converts mic Float32 samples to Int16 PCM on the audio thread |

### Why this architecture

- **One realtime loop over a stitched pipeline** — Gemini Live's native audio-in/audio-out plus function calling collapses STT + reasoning + tool-calling + TTS into a single connection, minimizing both latency and integration surface area.
- **Ephemeral tokens, not a proxied key** — the browser needs *a* credential to open the Live WebSocket directly (for latency), but never the permanent one; a server route mints a single-use, 30-minute-max token per call instead.
- **A second, separate model for summaries** — summary generation isn't latency-sensitive and needs deterministic structured JSON, so it's a distinct code path that can't destabilize the live call.
- **No real database** — `localStorage` for history and a static JSON file for orders match the actual scope (three sample orders, a demo call history), and avoid standing up persistence infrastructure a project this size doesn't need.

### Known limitations

- Gemini's free tier is rate-limited (the summary model in particular caps out in the tens of requests per minute/day depending on model) — fine for a demo, not for production volume.
- Gemini's built-in voices aren't Indian-accented; the brand's Indian conversational register comes from the persona/system-prompt script, not true accent-matched TTS.
- Barge-in updates the UI state correctly, but audio already queued in the Web Audio playback buffer isn't forcibly cut off — a known, deliberately-deferred polish item.
- Call history is per-browser (`localStorage`), not shared across devices.

## Setup Instructions

1. **Clone and install:**
   ```bash
   git clone https://github.com/Swapnil-75/aura-agent.git
   cd aura-agent
   npm install
   ```

2. **Get a Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) (free tier works, no card required).

3. **Configure your environment:**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and set:
   ```
   GEMINI_API_KEY=your_key_here
   ```

4. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000), click **Start Call**, and allow microphone access.

5. **Production build check (optional, before deploying):**
   ```bash
   npm run build
   ```

### Deploying (Vercel)

1. Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: Next.js (auto-detected).
3. Add environment variable `GEMINI_API_KEY` in **Settings → Environment Variables**.
4. Deploy. For a custom domain, add it under **Settings → Domains** and follow the DNS record Vercel provides (an `A` record for an apex domain, a `CNAME` for a subdomain).

## Section 9 — How I Think About This

**1. Why did you choose your particular architecture and technology stack?**

I went with the Gemini Live API (`gemini-3.8-live`) for a single realtime speech-to-speech loop instead of stitching together separate STT, LLM, and TTS services. Given the timeline, I didn't want to be debugging audio hand-offs between three different vendors — one WebSocket session with native function calling built in meant fewer moving parts and lower latency by construction, not by careful tuning. Next.js let me keep the frontend and backend in one deployable project on Vercel, with no separate server to stand up. I also made sure the browser never sees my real Gemini API key — the server mints a short-lived, single-use ephemeral token per call, and that's what the client actually connects with.

For the post-call summary, I deliberately used a *different*, non-Live text model (`gemini-3.5-flash-lite`) rather than reusing the Live model. It's not latency-sensitive, needs clean structured JSON output, and keeping it separate meant I could tweak the summary schema without any risk of breaking the live voice session. And for storing call history, I just used the browser's `localStorage` instead of standing up a real database — three mock orders and a handful of test calls don't justify that, and it kept the whole thing deployable on Vercel with zero persistence infrastructure to manage.

**2. What was the most difficult part of the assignment, and how did you solve it?**

The trickiest bug wasn't really a coding problem — it was that the post-call summary would just quietly fail, with the transcript showing up fine but no summary ever appearing. Digging into the actual server error, it turned out the model I was using for summaries, `gemini-3.8-flash`, has a hard free-tier cap of only 20 requests per day. Between my own testing and normal use, I burned through that limit fast, and once it was gone, every summary failed until the next day — no retry was going to fix that, since it wasn't a temporary blip, it was a wall.

So I fixed it two ways. First, I switched the summary call to `gemini-3.5-flash-lite` instead, which doesn't need Flash-level reasoning for a short structured-JSON extraction task anyway, and its free tier gives far more breathing room — the failure mode there is a 15-requests-per-minute cap rather than a 20-a-day one, so it actually recovers within a minute instead of locking me out for a day. Second, I made the error handling itself more honest: instead of letting a failed summary silently swallow the whole call, the app now saves the transcript to history either way and attaches the real error message if the summary genuinely couldn't be generated, so a quota hiccup costs you the summary, not the entire record of the call.

**3. If you had one more week, what would you improve first and why?**

Probably the voice itself. Right now Aria's Indian-ness comes entirely from the persona and script — Gemini's built-in voices aren't actually Indian-accented, and that's the gap I noticed most while testing. After that, I'd fix barge-in properly. The state indicator already reflects when a user interrupts, but any audio already queued up in the Web Audio playback buffer keeps playing anyway — so it *looks* right on screen a beat before it *sounds* right, which is a real experience issue, not just a cosmetic one. Third, I'd move call history off `localStorage` into an actual database, so a call isn't tied to whichever browser happened to take it — useful if more than one person ever needs to review the same conversation.

**4. Imagine this agent is handling 1,000 customer conversations a day. What would need to change?**

The free tier would have to go first — I hit its limits more than once just during development, and at 1,000 conversations a day it wouldn't survive an hour. That alone forces a move to a paid tier with real rate-limit headroom. Past that, I'd want a real shared database instead of per-browser `localStorage`, so order data and call history are centrally queryable rather than living in whichever browser happened to run the call. I'd also want actual observability — logging, error tracking, and per-call latency/cost visibility — because at that volume, "something's failing" isn't useful information; you need to know *which* calls and *why*. I'd add rate limiting on the token-minting endpoint so it can't be abused at scale. And longer-term, Live API sessions are long-lived WebSocket connections, which serverless functions aren't really built to hold in the thousands concurrently — at real scale I'd look at a dedicated realtime gateway instead of routing every call through a Vercel function.
