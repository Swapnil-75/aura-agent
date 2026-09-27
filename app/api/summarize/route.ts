import { NextResponse } from "next/server";
import { generateCallSummary, type TranscriptEntry } from "@/lib/generateSummary";

export async function POST(request: Request) {
  const { transcript } = (await request.json()) as { transcript: TranscriptEntry[] };
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  try {
    const summary = await generateCallSummary(transcript);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
