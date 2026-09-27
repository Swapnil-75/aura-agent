// Confirms the Mode B live transcript panel updates progressively during the
// call (not all-at-once at the end), then confirms End Call still produces
// the finalized Mode A transcript + JSON summary.
import { chromium } from "playwright";
import path from "node:path";

const fakeAudioFile = path.resolve("scripts/fake-mic-order-lookup-padded.wav");

const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--use-file-for-fake-audio-capture=${fakeAudioFile}`,
  ],
});

const page = await browser.newPage();
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("console", (msg) => console.log("[console]", msg.text()));
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
page.on("response", (res) => {
  if (res.url().includes("/api/summarize")) console.log("[response] /api/summarize", res.status());
});

await page.goto("http://localhost:3000");
await page.getByText("Start Call").click();

const snapshots = [];
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(3000);
  const text = await page
    .locator("text=Transcript")
    .locator("..")
    .innerText()
    .catch(() => "(transcript panel not found)");
  snapshots.push(text.replace(/\s+/g, " ").trim());
}

console.log("--- LIVE TRANSCRIPT SNAPSHOTS (every 3s during the call) ---");
snapshots.forEach((s, i) => console.log(`[t=${(i + 1) * 3}s]`, s));

await page.getByText("⏹ End Call").click();
await page.waitForTimeout(15000);

const finalTranscript = await page.locator("text=Transcript").locator("..").innerText().catch(() => "(not found)");
const summaryJson = await page.locator("pre").innerText().catch(() => "(not found)");

console.log("\n--- MODE A: FINAL TRANSCRIPT AFTER END CALL ---");
console.log(finalTranscript);
console.log("\n--- MODE A: JSON SUMMARY ---");
console.log(summaryJson);

await browser.close();
