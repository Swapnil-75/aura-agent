// Confirms: (1) feature cards start hidden and reveal via IntersectionObserver
// as the page is scrolled to them, (2) the hero's Start Call CTA still
// triggers a real call (mic permission -> Mode B takeover).
import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});

const page = await browser.newPage();
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000");

const cardOpacityBeforeScroll = await page.locator("text=Order Tracking").locator("..").evaluate(
  (el) => getComputedStyle(el).opacity
);
console.log("card opacity before scroll:", cardOpacityBeforeScroll);

await page.locator("text=Order Tracking").scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);

const cardOpacityAfterScroll = await page.locator("text=Order Tracking").locator("..").evaluate(
  (el) => getComputedStyle(el).opacity
);
console.log("card opacity after scroll:", cardOpacityAfterScroll);

// Scroll back to top and use the hero's own Start Call button.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

const heroStartButtons = await page.getByText("Start Call").all();
console.log("Start Call buttons found on page:", heroStartButtons.length);
await heroStartButtons[0].click();

await page.waitForTimeout(10000);
const bodyText = await page.evaluate(() => document.body.innerText);
console.log("Mode B reached (End Call visible):", bodyText.includes("End Call"));

await browser.close();
