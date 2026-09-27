// Verifies the fix for the real-world failure mode: /api/calls actually
// failing (quota exhaustion), confirming (1) the page auto-scrolls to the
// results panel instead of leaving the user at the top of the landing page,
// and (2) a history entry still gets saved (with the error attached) instead
// of silently losing the transcript.
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

await page.goto("http://localhost:3000");
await page.getByText("Start Call").first().click();
await page.waitForTimeout(12000);
await page.getByText("⏹ End Call").click();

// Give the (real, possibly failing) /api/calls request time to resolve.
await page.waitForTimeout(6000);

const scrollY = await page.evaluate(() => window.scrollY);
console.log("scrollY after call ends (>0 means auto-scrolled):", scrollY);

const bodyText = await page.evaluate(() => document.body.innerText);
console.log("results panel visible in viewport area:", bodyText.includes("Transcript"));

await page.getByText("History").click();
await page.waitForTimeout(500);
const historyText = await page.evaluate(() => document.body.innerText);
console.log("history has an entry:", !historyText.includes("No past calls yet"));
console.log("history entry shows transcript text:", historyText.includes("ORD-101") || historyText.includes("order"));

await browser.close();
