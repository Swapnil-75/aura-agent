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
console.log("no 'Test Orders & Results' nav link:", !(await page.evaluate(() => document.body.innerText)).includes("Test Orders & Results"));

// History button alone should show both the static order list and past calls.
await page.getByText("History").click();
await page.waitForTimeout(300);
let text = await page.evaluate(() => document.body.innerText);
console.log("History panel shows TEST ORDERS HELPER:", text.includes("TEST ORDERS HELPER"));
console.log("History panel shows ORD-101:", text.includes("ORD-101"));
await page.getByText("Close").click();

// Run a real call, then confirm the post-call link opens History directly (no navigation).
await page.getByText("Start Call").first().click();
await page.waitForTimeout(12000);
await page.getByText("⏹ End Call").click();
await page.waitForTimeout(6000);

await page.getByText("view your transcript").click();
await page.waitForTimeout(500);
console.log("stayed on home (no navigation):", page.url() === "http://localhost:3000/");
text = await page.evaluate(() => document.body.innerText);
console.log("History panel shows the new call's transcript:", text.includes("TRANSCRIPT"));
console.log("History panel still shows TEST ORDERS HELPER:", text.includes("TEST ORDERS HELPER"));

await browser.close();
