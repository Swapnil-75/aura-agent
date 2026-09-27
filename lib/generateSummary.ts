import { GoogleGenAI, Type } from "@google/genai";

// Plain (non-Live) text model. gemini-3.8-live (used for the voice session)
// only supports AUDIO output — using it here would silently fail the same
// way Modality.TEXT did during Phase 2 testing. This module must never
// import or reference the Live model.
//
// Using the Flash-Lite tier rather than plain gemini-3.8-flash: the standard
// Flash free tier is capped at 20 requests/day, which this project hit
// repeatedly during testing. Flash-Lite carries a much higher free-tier daily
// cap — this task doesn't need Flash-level reasoning, just reliable
// structured-JSON extraction from a short transcript.
const SUMMARY_MODEL = "gemini-3.5-flash-lite";

// Gemini occasionally returns a transient 503 "model currently experiencing
// high demand" — Google's own docs describe this as usually short-lived, so a
// couple of short retries clears it in practice rather than failing the whole
// call summary outright. A 429 daily-quota exhaustion is NOT transient and
// will keep failing every attempt until the quota resets — retries can't fix
// that, only avoid giving up on a genuinely recoverable blip too early.
const MAX_ATTEMPTS = 3;

export interface TranscriptEntry {
  speaker: "Customer" | "Aria";
  text: string;
}

export interface CallSummary {
  customer_intent: string;
  order_id: string | null;
  resolution_status: string;
  call_summary: string;
}

const SUMMARY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    customer_intent: {
      type: Type.STRING,
      format: "enum",
      enum: ["ORDER_TRACKING", "RETURN_REQUEST", "CANCELLATION_REQUEST", "POLICY_QUESTION", "OUT_OF_SCOPE"],
      description: "Short enum-like tag for what the customer wanted.",
    },
    order_id: {
      type: Type.STRING,
      nullable: true,
      description:
        'The exact order ID discussed in the call, preserving its original format verbatim (e.g. "ORD-101", with the hyphen and no spaces) — or null if none was referenced.',
    },
    resolution_status: {
      type: Type.STRING,
      format: "enum",
      enum: ["RESOLVED", "UNRESOLVED", "ESCALATED", "OUT_OF_SCOPE"],
      description: "How the call ended.",
    },
    call_summary: {
      type: Type.STRING,
      description: "1-3 factual sentences, no speculation beyond what was actually said in the call.",
    },
  },
  required: ["customer_intent", "order_id", "resolution_status", "call_summary"],
};

function buildPrompt(transcript: TranscriptEntry[]): string {
  const formatted = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
  return `You are analyzing a completed customer support call transcript for Aura Skincare, a D2C skincare brand. Read the transcript below and produce a strictly factual structured summary — do not speculate beyond what was actually said.

Transcript:
${formatted}

Summarize this call according to the required JSON schema.`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Safety net: even with an explicit prompt/schema instruction, LLMs
// occasionally normalize "ORD-101" to "ORD 101" (dropping the hyphen).
// Restoring it here guarantees the id always matches the real order records
// in data/orders.json regardless of what the model actually returned.
function normalizeOrderId(orderId: string | null): string | null {
  if (!orderId) return orderId;
  return orderId.replace(/^(ORD)[\s_]+(\d+)$/i, "$1-$2");
}

export async function generateCallSummary(transcript: TranscriptEntry[]): Promise<CallSummary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: SUMMARY_MODEL,
        contents: buildPrompt(transcript),
        config: {
          responseMimeType: "application/json",
          responseSchema: SUMMARY_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No summary returned from model");

      const parsed = JSON.parse(text) as CallSummary;
      return { ...parsed, order_id: normalizeOrderId(parsed.order_id) };
    } catch (err) {
      lastError = err;
      const isTransient = err instanceof Error && /503|UNAVAILABLE|overloaded|high demand/i.test(err.message);
      if (!isTransient || attempt === MAX_ATTEMPTS) break;
      await sleep(attempt * 1000);
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`Summary generation failed after ${MAX_ATTEMPTS} attempts: ${message}`);
}
