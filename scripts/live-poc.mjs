// Phase 0 proof-of-concept: minimal Gemini Live API round-trip.
// Sends one text turn, saves the returned audio to a WAV file, and prints
// the output transcription so the response can be verified without playback.
//
// Run with: node --env-file=.env.local scripts/live-poc.mjs

import { GoogleGenAI, Modality } from "@google/genai";
import { writeFileSync } from "node:fs";

const MODEL = "gemini-3.8-live";
const SAMPLE_RATE = 24000; // Live API audio output is 24kHz, 16-bit PCM, mono

function pcmToWav(pcmBuffer, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set — run with: node --env-file=.env.local scripts/live-poc.mjs");
  }

  const ai = new GoogleGenAI({ apiKey });
  const audioChunks = [];
  let transcript = "";
  let turnComplete = false;

  const session = await ai.live.connect({
    model: MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => console.log("[open] session established"),
      onmessage: (message) => {
        const parts = message.serverContent?.modelTurn?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            audioChunks.push(Buffer.from(part.inlineData.data, "base64"));
          }
        }
        const chunkText = message.serverContent?.outputTranscription?.text;
        if (chunkText) transcript += chunkText;

        if (message.serverContent?.turnComplete) {
          turnComplete = true;
        }
      },
      onerror: (e) => console.error("[error]", e.message),
      onclose: (e) => console.log("[close]", e.reason || "(no reason given)"),
    },
  });

  console.log("[send] sending text turn...");
  session.sendClientContent({
    turns: [{ role: "user", parts: [{ text: "In one short sentence, tell me a fun fact about vitamin C serum." }] }],
    turnComplete: true,
  });

  const start = Date.now();
  while (!turnComplete && Date.now() - start < 20000) {
    await new Promise((r) => setTimeout(r, 100));
  }

  session.close();

  if (!turnComplete) {
    throw new Error("Timed out waiting for turnComplete — no full response received in 20s");
  }

  console.log("[transcript]", transcript || "(no transcription text received)");
  console.log(`[audio] received ${audioChunks.length} chunk(s), total bytes:`, audioChunks.reduce((n, b) => n + b.length, 0));

  if (audioChunks.length > 0) {
    const pcm = Buffer.concat(audioChunks);
    const wav = pcmToWav(pcm, SAMPLE_RATE);
    writeFileSync("scripts/live-poc-output.wav", wav);
    console.log("[audio] wrote scripts/live-poc-output.wav");
  } else {
    console.warn("[audio] no audio data received — check responseModalities/model config");
  }
}

main().catch((err) => {
  console.error("POC FAILED:", err);
  process.exit(1);
});
