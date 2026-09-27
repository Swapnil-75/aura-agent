import { chromium } from "playwright";

const browser = await chromium.launch();

const lightPage = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
await lightPage.goto("http://localhost:3000");
await lightPage.waitForTimeout(800);
await lightPage.screenshot({ path: "scripts/hero-light.png" });

const darkPage = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
await darkPage.goto("http://localhost:3000");
await darkPage.screenshot({ path: "scripts/hero-dark.png" });

await browser.close();
console.log("done");
