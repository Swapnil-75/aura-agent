// End-to-end Phase 4 check: drives a real call through the actual UI with
// fake mic audio, presses End Call, and reads the rendered transcript +
// JSON summary straight out of the DOM (not console logs) so this exercises
// the exact same render path a real user would see.
import { chromium } from "playwright";
import path from "node:path";

const fakeAudioFile = path.resolve(process.argv[2] ?? "scripts/fake-mic-order-lookup-padded.wav");
const waitMs = Number(process.argv[3] ?? 30000);

const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--use-file-for-fake-audio-capture=${fakeAudioFile}`,
  ],
});

const page = await browser.newPage();
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.text().includes("summar")) console.log("[console]", msg.text());
});
page.on("response", (res) => {
  if (res.url().includes("/api/summarize")) console.log("[response] /api/summarize", res.status());
});

await page.goto("http://localhost:3000");
await page.getByText("Start Call").first().click();
await page.waitForTimeout(waitMs);
await page.getByText("End Call").click();
await page.waitForTimeout(15000);

const transcriptText = await page.locator("text=Transcript").locator("..").innerText().catch(() => "(not found)");
const summaryText = await page.locator("pre").innerText().catch(() => "(not found)");

console.log("\n--- TRANSCRIPT (rendered) ---");
console.log(transcriptText);
console.log("\n--- SUMMARY JSON (rendered) ---");
console.log(summaryText);

await browser.close();
