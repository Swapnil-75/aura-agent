"use client";

import type { TranscriptEntry } from "@/lib/liveSession";
import type { CallSummary } from "@/lib/generateSummary";

export interface CallFeedback {
  rating: number;
  comment?: string;
}

export interface CallHistoryEntry {
  id: string;
  endedAt: string;
  transcript: TranscriptEntry[];
  summary: CallSummary | null;
  summaryError?: string | null;
  feedback?: CallFeedback | null;
}

const STORAGE_KEY = "aura_call_history";
const MAX_ENTRIES = 20;

export function getCallHistory(): CallHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCallById(id: string): CallHistoryEntry | null {
  return getCallHistory().find((entry) => entry.id === id) ?? null;
}

export function addCallToHistory(entry: CallHistoryEntry): CallHistoryEntry[] {
  const next = [entry, ...getCallHistory()].slice(0, MAX_ENTRIES);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function updateCallFeedback(id: string, feedback: CallFeedback): CallHistoryEntry[] {
  const next = getCallHistory().map((entry) => (entry.id === id ? { ...entry, feedback } : entry));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearCallHistory(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
