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
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto("http://localhost:3000");
await page.getByText("Start Call").first().click();
await page.waitForTimeout(20000);
await page.getByText("⏹ End Call").click();
await page.waitForURL("**/call/**", { timeout: 20000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "scripts/summary-card.png", fullPage: true });
await browser.close();
console.log("done");
