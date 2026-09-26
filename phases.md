# Phases — Build Roadmap

Target: ~1.5–2 focused days of work, 4-day deadline. Sequenced so that a working
end-to-end demo exists as early as possible, with polish layered on after.

## Phase 0 — Setup (30–45 min)
- [ ] Create Google AI Studio account, generate free Gemini API key
- [ ] Scaffold Next.js app (`create-next-app`)
- [ ] Set up `.env.local` with `GEMINI_API_KEY`, create `.env.example`
- [ ] Init git repo, push skeleton to GitHub
- [ ] Confirm Gemini Live API access works with a minimal "hello world" audio
      round-trip before building anything else

## Phase 1 — Core Voice Loop (3–4 hrs)
- [ ] Mic capture via `getUserMedia` + audio worklet/processor for streaming
- [ ] WebSocket connection to Gemini Live API
- [ ] Send system prompt (Aria persona, from `rules.md`) at session start
- [ ] Stream audio in, receive + play audio out
- [ ] Basic Start Call / End Call buttons wired to session open/close
- [ ] Milestone: can have a spoken back-and-forth with the agent, no tools yet

## Phase 2 — Tool Calling & Brand Guardrails (2–3 hrs)
- [ ] Write `orders.json` mock database (ORD-101/102/103, exact values from spec)
- [ ] Define `get_order_details` function schema, register with Live session
- [ ] Handle tool-call events from Gemini, execute lookup, return result to model
- [ ] Embed full brand policy text into system prompt
- [ ] Test: order lookup, invalid order ID, policy pushback, out-of-scope request
- [ ] Milestone: all 6 test scenarios in `rules.md` §6 pass

## Phase 3 — State Indicator & Test UI (1.5–2 hrs)
- [ ] Live state indicator (Listening / Thinking / Speaking) wired to session
      events (turn start/end, tool-call-in-progress)
- [ ] Test Orders Helper panel — visible card with ORD-101/102/103 + details
- [ ] Basic layout pass (doesn't need to be polished, just usable)

## Phase 4 — Transcript & Structured Summary (1.5–2 hrs)
- [ ] Accumulate transcript client-side during the call (speaker-labeled turns)
- [ ] On End Call: send transcript to `/api/summarize` route
- [ ] `/api/summarize` calls Gemini Flash (text mode) with strict JSON-output
      instructions, matching the schema in `rules.md` §5
- [ ] Render transcript + JSON summary in the UI post-call
- [ ] Milestone: full call → transcript → structured summary works end-to-end

## Phase 5 — Deployment (30–45 min)
- [ ] Deploy to Vercel, add env vars in dashboard
- [ ] Test the live public URL fresh (new browser, mic permissions from scratch)
- [ ] Confirm it works without any local dev environment running

## Phase 6 — Polish / Optional (remaining time, budget-permitting)
Only pick items that add real value — don't pad for feature count:
- [ ] Barge-in / interruption handling (may come free with Live API's native VAD
      — verify and just confirm it, rather than building custom)
- [ ] Better ambiguous-request handling
- [ ] UI polish pass
- [ ] Hinglish support (only if genuinely comfortable testing it well)

## Phase 7 — Submission Package (1–2 hrs)
- [ ] Write README.md including Section 9 answers (architecture rationale,
      hardest part, what you'd improve with a week, scaling to 1,000 calls/day)
- [ ] Record 3–5 min demo video: agent working, one order lookup, one
      policy-conversation, transcript + summary, brief architecture walkthrough
- [ ] Write 2–3 sentence approach note
- [ ] Confirm LinkedIn link works
- [ ] Send submission email with correct subject line and all links

## Sequencing Notes
- Do NOT start UI polish before Phase 2 guardrails work — grading cares far more
  about correct agent behavior than visual design.
- Get a working voice round-trip (Phase 1) before writing any tool-calling code —
  isolate pipeline risk first, since it's the least familiar part.
- Leave Phase 5 (deployment) earlier rather than later if time allows — better to
  discover deployment issues on day 2 than day 4.
