// Verifies the call-history feature without spending Gemini quota: mocks
// /api/calls to return instantly, then drives a real mic-in call through the
// actual UI, confirms the History button/panel show the saved record, and
// confirms it survives a page reload (i.e. actually persisted to
// localStorage, not just in-memory React state).
import { chromium } from "playwright";
import path from "node:path";

const fakeAudioFile = path.resolve("scripts/fake-mic-order-lookup-padded.wav");
const MOCK_RECORD = {
  id: "test-id-123",
  endedAt: new Date().toISOString(),
  transcript: [
    { speaker: "Customer", text: "Can you check order ORD-101?" },
    { speaker: "Aria", text: "Your order is out for delivery, expected by 6 PM today." },
  ],
  summary: {
    customer_intent: "ORDER_TRACKING",
    order_id: "ORD-101",
    resolution_status: "RESOLVED",
    call_summary: "Customer asked about ORD-101; agent confirmed it is out for delivery.",
  },
};

const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--use-file-for-fake-audio-capture=${fakeAudioFile}`,
  ],
});

const page = await browser.newPage();
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.route("**/api/calls", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RECORD) });
});

await page.goto("http://localhost:3000");

// History should be empty at first.
await page.getByText("History").click();
const emptyText = await page.locator("text=No past calls yet").isVisible();
console.log("history empty initially:", emptyText);
await page.getByText("Close").click();

// Run a real mic-driven call (mocked /api/calls response on End Call).
await page.getByText("Start Call").first().click();
await page.waitForTimeout(12000);
await page.getByText("⏹ End Call").click();
await page.waitForTimeout(2000);

// Open history right after the call.
await page.getByText("History").click();
await page.waitForTimeout(500);
const panelText = await page.evaluate(() => document.body.innerText);
console.log("panel contains ORDER_TRACKING:", panelText.includes("ORDER_TRACKING"));
console.log("panel contains 'No past calls yet':", panelText.includes("No past calls yet"));
await page.getByText("Close").click();

// Reload the page entirely — history must survive via localStorage.
await page.reload();
await page.getByText("History").click();
const survivedReload = await page.locator("text=ORDER_TRACKING").first().isVisible().catch(() => false);
console.log("history survived reload:", survivedReload);

// Clear and confirm it's gone.
await page.getByRole("button", { name: "Clear" }).click();
const clearedText = await page.locator("text=No past calls yet").isVisible().catch(() => false);
console.log("history cleared:", clearedText);

await browser.close();
