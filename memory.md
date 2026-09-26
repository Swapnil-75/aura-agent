# Memory — Project Context Log

Purpose: a running log of decisions, current state, and open questions, so any
AI coding assistant (or human) picking this project back up mid-build has full
context without re-deriving it. Update this file at the end of each work
session — treat it as the project's short-term memory.

## Decisions Locked In

- **Voice pipeline:** Gemini Live API (free tier via Google AI Studio) — chosen
  over OpenAI Realtime API specifically because OpenAI no longer offers free API
  credits; Gemini's AI Studio free tier requires no card and includes a
  purpose-built Live (audio-to-audio) model.
- **Frontend/deploy:** Next.js on Vercel.
- **No paid TTS for Indian accent:** Deliberate trade-off to stay 100% free-tier.
  Persona/script carries the brand voice instead. Documented as a "next step"
  improvement, not a gap to hide.
- **No real database:** Static `orders.json`, 3 records exactly matching spec
  (ORD-101/102/103).
- **Summary generation is a separate, non-realtime call:** Same Gemini key, text
  mode, run only after the call ends — avoids overloading the realtime session
  with a structured-output task it doesn't need to do live.

## Current State

*(Update this section as work progresses — replace this placeholder with actual
status: which phase from `phases.md` is in progress, what's working, what's
broken.)*

- [ ] Phase 0 — Setup: not started
- [ ] Phase 1 — Core voice loop: not started
- [ ] Phase 2 — Tool calling & guardrails: not started
- [ ] Phase 3 — State indicator & test UI: not started
- [ ] Phase 4 — Transcript & summary: not started
- [ ] Phase 5 — Deployment: not started
- [ ] Phase 6 — Optional polish: not started
- [ ] Phase 7 — Submission package: not started

## Open Questions / Risks to Revisit

- Confirm exact current Gemini Live model name at build time — model names have
  been updating quickly (`gemini-2.5-flash-native-audio` vs
  `gemini-3.1-flash-live-preview` vs whatever is current); check AI Studio docs
  directly rather than trusting this file's naming once building starts.
- Confirm whether Gemini Live's function-calling event format requires a
  specific ack/response shape back to the model — verify against current docs
  before writing `tools.ts`, since tool-calling wire formats have changed across
  Live API versions.
- Watch free-tier rate limits (~15 RPM) during demo recording — don't rapid-fire
  test calls back-to-back right before recording the demo video, to avoid a 429
  mid-recording.
- Barge-in: verify whether it's genuinely automatic with Live API's VAD or needs
  explicit config (`explicitVadSignal` or similar) — don't assume it's free
  until confirmed in a real session.

## Reference Docs in This Project
- `architecture.md` — system design, component breakdown, rationale
- `rules.md` — Aria persona, brand policy text, guardrails, tool-usage rules,
  required test scenarios
- `phases.md` — build sequencing and time-boxed roadmap
- `design.md` — UI layout, state indicator design, voice/tone design

## Session Log

*(Append a short dated entry each session — what changed, what decisions were
made, what's next.)*

- **Session 1:** Planning docs created (architecture, rules, phases, design,
  memory). No code written yet. Next: Phase 0 setup.
