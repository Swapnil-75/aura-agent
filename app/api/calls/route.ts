import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { generateCallSummary, type TranscriptEntry } from "@/lib/generateSummary";

// Dedicated "finished call" route: takes the client-captured transcript,
// generates its summary, and returns both bundled into a single record
// (id + timestamp included) — the exact shape lib/callHistory.ts persists to
// localStorage. Distinct from /api/summarize, which just returns a bare
// summary and is kept for the isolated summary-only use case.
export async function POST(request: Request) {
  const { transcript } = (await request.json()) as { transcript: TranscriptEntry[] };
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  try {
    const summary = await generateCallSummary(transcript);
    return NextResponse.json({
      id: randomUUID(),
      endedAt: new Date().toISOString(),
      transcript,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
