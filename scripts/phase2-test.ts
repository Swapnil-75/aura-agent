// Runs the 6 required test scenarios (rules.md Section 6) against the real
// system prompt + tool wiring, in text mode. Text mode isolates persona /
// guardrail / tool-calling behavior from audio-pipeline concerns, which
// Phase 1 already validated separately.
//
// Run with: npx tsx --env-file=.env.local scripts/phase2-test.ts
import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";
import { SYSTEM_PROMPT } from "../lib/systemPrompt";
import { getOrderDetails, getOrderDetailsDeclaration } from "../lib/tools";

const SCENARIOS = [
  { name: "1. Valid order lookup (ORD-101)", text: "Hi, can you tell me the status of order ORD-101?" },
  { name: "2. Invalid order ID", text: "Can you check on order ORD-999 for me?" },
  {
    name: "3. Return outside 7-day window",
    text: "I want to return the product from order ORD-102. I opened it and it's been 20 days since delivery.",
  },
  { name: "4. Out-of-scope request", text: "Can you help me book a flight ticket to Mumbai?" },
  { name: "5. Cancellation on non-cancellable order", text: "Please cancel order ORD-102 for me." },
  { name: "6. Mumbled/unclear input", text: "uhh mmph so like my thing, the, uh... yeah." },
];

async function runScenario(ai: GoogleGenAI, scenario: (typeof SCENARIOS)[number]) {
  let responseText = "";
  let turnComplete = false;

  const session = await ai.live.connect({
    model: "gemini-3.8-live",
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: [getOrderDetailsDeclaration] }],
    },
    callbacks: {
      onmessage: (message: LiveServerMessage) => {
        const chunkText = message.serverContent?.outputTranscription?.text;
        if (chunkText) responseText += chunkText;

        const functionCalls = message.toolCall?.functionCalls ?? [];
        for (const fc of functionCalls) {
          if (fc.name === "get_order_details") {
            const orderId = String((fc.args as { order_id?: string } | undefined)?.order_id ?? "");
            const result = getOrderDetails(orderId);
            console.log(`   [tool call] get_order_details("${orderId}") ->`, JSON.stringify(result));
            session.sendToolResponse({
              functionResponses: [{ id: fc.id, name: fc.name, response: result }],
            });
          }
        }

        if (message.serverContent?.turnComplete) turnComplete = true;
      },
      onerror: (e) => console.error("   [error]", e.message),
      onclose: (e) => {
        if (!turnComplete) console.error("   [closed early]", e.reason || "(no reason)");
      },
    },
  });

  session.sendClientContent({
    turns: [{ role: "user", parts: [{ text: scenario.text }] }],
    turnComplete: true,
  });

  const start = Date.now();
  while (!turnComplete && Date.now() - start < 20000) {
    await new Promise((r) => setTimeout(r, 100));
  }
  session.close();

  return responseText || "(no response received)";
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const ai = new GoogleGenAI({ apiKey });

  for (const scenario of SCENARIOS) {
    console.log(`\n=== ${scenario.name} ===`);
    console.log(`   customer: "${scenario.text}"`);
    const response = await runScenario(ai, scenario);
    console.log(`   aria: "${response}"`);
  }
}

main().catch((err) => {
  console.error("TEST RUN FAILED:", err);
  process.exit(1);
});
