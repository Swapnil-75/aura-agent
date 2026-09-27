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

// Run a real call so there's at least one history entry to click through.
await page.getByText("Start Call").first().click();
await page.waitForTimeout(20000);
await page.getByText("⏹ End Call").click();
await page.waitForTimeout(6000);

await page.getByText("History").click();
await page.waitForTimeout(300);

let text = await page.evaluate(() => document.body.innerText);
console.log("no order details in list view:", !text.includes("TEST ORDERS HELPER") && !text.includes("ORD-101"));
console.log("no transcript shown before clicking:", !text.includes("TRANSCRIPT"));
console.log("list shows a clickable row:", text.includes("ORDER_TRACKING") || text.includes("Call"));

// Click the first row to open detail view.
await page.locator("ul li button").first().click();
await page.waitForTimeout(300);
text = await page.evaluate(() => document.body.innerText);
console.log("detail view shows transcript after click:", text.includes("TRANSCRIPT"));
console.log("detail view shows summary after click:", text.includes("CALL SUMMARY") || text.includes("Summary unavailable"));
console.log("detail view has a Back button:", text.includes("Back"));

// Back button should return to the list.
await page.getByText("Back").click();
await page.waitForTimeout(300);
text = await page.evaluate(() => document.body.innerText);
console.log("back to list, transcript hidden again:", !text.includes("TRANSCRIPT"));

await browser.close();
