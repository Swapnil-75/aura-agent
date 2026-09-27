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
await page.waitForTimeout(20000);
await page.getByText("⏹ End Call").click();

// Should show the transitional "ending" screen briefly.
await page.waitForTimeout(500);
const transitionalText = await page.evaluate(() => document.body.innerText);
console.log("shows 'Wrapping up' transitional screen:", transitionalText.includes("Wrapping up"));

// Wait for navigation to the call detail page.
await page.waitForURL("**/call/**", { timeout: 20000 });
console.log("navigated to a /call/[id] page:", /\/call\/[^/]+$/.test(page.url()));

await page.waitForTimeout(500);
let text = await page.evaluate(() => document.body.innerText);
console.log("shows transcript:", text.includes("TRANSCRIPT"));
console.log("shows call summary section:", text.includes("CALL SUMMARY"));
console.log("asks for feedback:", text.includes("How was your experience"));

// Submit feedback: click the 4th star, add a comment, submit.
const stars = page.locator('button[aria-label*="star"]');
await stars.nth(3).click();
await page.locator("textarea").fill("Very smooth experience.");
await page.getByText("Submit Feedback").click();
await page.waitForTimeout(300);
text = await page.evaluate(() => document.body.innerText);
console.log("shows thank-you after submitting feedback:", text.includes("Thanks for your feedback"));

// Reload the page — feedback should persist (it's saved to localStorage).
await page.reload();
await page.waitForTimeout(500);
text = await page.evaluate(() => document.body.innerText);
console.log("feedback persisted after reload:", text.includes("Thanks for your feedback"));

// History list should link to the same page.
await page.goto("http://localhost:3000");
await page.getByText("History").click();
await page.waitForTimeout(300);
await page.locator("ul li a").first().click();
await page.waitForURL("**/call/**");
console.log("History row navigates to call detail page:", /\/call\/[^/]+$/.test(page.url()));

await browser.close();
