import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:3000");

await page.screenshot({ path: "scripts/fixedbg-top.png" });

await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/fixedbg-mid.png" });

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/fixedbg-bottom.png" });

await browser.close();
console.log("done");
