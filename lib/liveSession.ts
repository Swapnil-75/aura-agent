"use client";

import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { getOrderDetails, getOrderDetailsDeclaration } from "@/lib/tools";

const MODEL = "gemini-3.8-live";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export type CallState = "listening" | "thinking" | "speaking";

export interface TranscriptEntry {
  speaker: "Customer" | "Aria";
  text: string;
}

async function fetchEphemeralToken(): Promise<string> {
  const res = await fetch("/api/session", { method: "POST" });
  if (!res.ok) throw new Error(`Failed to fetch session token: ${res.status}`);
  const { token } = await res.json();
  return token;
}

export class LiveCall {
  private session: Session | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private nextPlaybackTime = 0;
  private speakingEndTimer: ReturnType<typeof setTimeout> | null = null;
  private state: CallState = "listening";
  private transcript: TranscriptEntry[] = [];
  private pendingCustomerText = "";
  private pendingAriaText = "";

  constructor(
    private onStateChange?: (state: CallState) => void,
    private onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void
  ) {}

  getTranscript(): TranscriptEntry[] {
    return [...this.transcript];
  }

  private setState(state: CallState) {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }

  async start(micStream: MediaStream): Promise<void> {
    this.micStream = micStream;
    const token = await fetchEphemeralToken();
    const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

    this.outputAudioContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    this.nextPlaybackTime = this.outputAudioContext.currentTime;

    this.session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [getOrderDetailsDeclaration] }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          console.log("[live] session open");
          this.setState("listening");
        },
        onmessage: (message) => this.handleServerMessage(message),
        onerror: (e) => console.error("[live] error", e.message),
        onclose: (e) => console.log("[live] closed", e.reason || "(no reason)"),
      },
    });

    this.inputAudioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    await this.inputAudioContext.audioWorklet.addModule("/pcm-recorder-worklet.js");

    const source = this.inputAudioContext.createMediaStreamSource(this.micStream);
    this.workletNode = new AudioWorkletNode(this.inputAudioContext, "pcm-recorder-processor");

    let chunkCount = 0;
    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const base64 = arrayBufferToBase64(event.data);
      this.session?.sendRealtimeInput({
        audio: { data: base64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
      });
      chunkCount += 1;
      if (chunkCount % 10 === 1) console.log(`[send-audio] chunk ${chunkCount}, ${event.data.byteLength} bytes`);
    };

    source.connect(this.workletNode);
  }

  private handleServerMessage(message: LiveServerMessage) {
    // The @google/genai types declare `voiceActivity.voiceActivityType`, but the
    // wire payload actually sends it as `voiceActivity.type` (verified against a
    // live session) — read both defensively in case the SDK types catch up.
    const voiceActivityType =
      message.voiceActivity?.voiceActivityType ?? (message.voiceActivity as { type?: string } | undefined)?.type;

    if (voiceActivityType === "ACTIVITY_START") {
      // Also covers barge-in: the user starting to speak always means "listening",
      // whether we were idle or mid-response (model audio already scheduled won't
      // stop early — a known limitation, see README/Phase 6 notes).
      this.setState("listening");
    } else if (voiceActivityType === "ACTIVITY_END") {
      this.setState("thinking");
    }

    const parts = message.serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        this.playAudioChunk(part.inlineData.data);
      }
    }

    const functionCalls = message.toolCall?.functionCalls ?? [];
    if (functionCalls.length > 0) this.setState("thinking");
    for (const fc of functionCalls) {
      if (fc.name === "get_order_details") {
        const orderId = String((fc.args as { order_id?: string } | undefined)?.order_id ?? "");
        const result = getOrderDetails(orderId);
        console.log("[tool] get_order_details", orderId, "->", result);
        this.session?.sendToolResponse({
          functionResponses: [{ id: fc.id, name: fc.name, response: result }],
        });
      }
    }

    if (message.serverContent?.interrupted) {
      if (this.speakingEndTimer) clearTimeout(this.speakingEndTimer);
      this.setState("listening");
    }

    const inputText = message.serverContent?.inputTranscription?.text;
    if (inputText) this.pendingCustomerText += inputText;

    const outputText = message.serverContent?.outputTranscription?.text;
    if (outputText) this.pendingAriaText += outputText;

    if (message.serverContent?.turnComplete) {
      this.flushTranscriptTurn();
    }
  }

  private flushTranscriptTurn() {
    let pushedAny = false;

    const customerText = this.pendingCustomerText.trim();
    if (customerText) {
      this.transcript.push({ speaker: "Customer", text: customerText });
      pushedAny = true;
    }
    this.pendingCustomerText = "";

    const ariaText = this.pendingAriaText.trim();
    if (ariaText) {
      this.transcript.push({ speaker: "Aria", text: ariaText });
      pushedAny = true;
    }
    this.pendingAriaText = "";

    if (pushedAny) this.onTranscriptUpdate?.(this.getTranscript());
  }

  private playAudioChunk(base64Data: string) {
    if (!this.outputAudioContext) return;
    const ctx = this.outputAudioContext;

    const pcm = base64ToInt16Array(base64Data);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 0x8000;
    }

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(ctx.destination);

    const startAt = Math.max(this.nextPlaybackTime, ctx.currentTime);
    sourceNode.start(startAt);
    this.nextPlaybackTime = startAt + buffer.duration;
    console.log(`[recv-audio] chunk played, ${float32.length} samples, startAt=${startAt.toFixed(2)}`);

    this.setState("speaking");
    if (this.speakingEndTimer) clearTimeout(this.speakingEndTimer);
    const remainingMs = (this.nextPlaybackTime - ctx.currentTime) * 1000;
    this.speakingEndTimer = setTimeout(() => this.setState("listening"), remainingMs + 50);
  }

  setMuted(muted: boolean): void {
    this.micStream?.getTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  stop(): void {
    this.flushTranscriptTurn();

    if (this.speakingEndTimer) clearTimeout(this.speakingEndTimer);
    this.speakingEndTimer = null;

    this.session?.close();
    this.session = null;

    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;

    this.workletNode?.disconnect();
    this.workletNode = null;

    this.inputAudioContext?.close();
    this.inputAudioContext = null;

    this.outputAudioContext?.close();
    this.outputAudioContext = null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}
