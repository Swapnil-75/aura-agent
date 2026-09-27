import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:3000");
await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(500);
await page.screenshot({ path: "scripts/scrolled.png" });
await browser.close();
console.log("done");
