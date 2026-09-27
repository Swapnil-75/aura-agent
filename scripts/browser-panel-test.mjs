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
const homeText = await page.evaluate(() => document.body.innerText);
console.log("home page has 'TEST ORDERS HELPER':", homeText.includes("TEST ORDERS HELPER"));
console.log("home page has 'ORD-101':", homeText.includes("ORD-101"));

// Nav link should navigate to /panel.
await page.getByText("Test Orders & Results").click();
await page.waitForURL("**/panel");
await page.waitForTimeout(500);
console.log("navigated to /panel:", page.url().endsWith("/panel"));
const panelTextBefore = await page.evaluate(() => document.body.innerText);
console.log("panel shows TEST ORDERS HELPER:", panelTextBefore.includes("TEST ORDERS HELPER"));

// Go back home and run a real call.
await page.goto("http://localhost:3000");
await page.getByText("Start Call").first().click();
await page.waitForTimeout(12000);
await page.getByText("⏹ End Call").click();
await page.waitForTimeout(6000);

const homeAfterCall = await page.evaluate(() => document.body.innerText);
console.log("home shows 'view your transcript' link after call:", homeAfterCall.includes("view your transcript"));
console.log("home still has no orders list:", !homeAfterCall.includes("TEST ORDERS HELPER"));

await page.getByText("view your transcript").click();
await page.waitForURL("**/panel");
await page.waitForTimeout(500);
const panelTextAfter = await page.evaluate(() => document.body.innerText);
console.log("panel shows latest transcript:", panelTextAfter.includes("TRANSCRIPT"));
console.log("panel shows call summary section:", panelTextAfter.includes("CALL SUMMARY"));

await browser.close();
