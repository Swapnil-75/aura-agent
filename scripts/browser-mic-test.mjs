// One-off automated check for the mic-in -> speaker-out loop, using Chrome's
// fake media device flags so it can run headlessly without a real mic/speaker.
// Feeds a pre-recorded WAV as the "microphone" input and watches console logs
// for evidence that audio was captured, sent, and a response played back.
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
const logs = [];
page.on("console", (msg) => {
  const text = msg.text();
  logs.push(text);
  console.log("[browser]", text);
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000");
await page.getByText("Start Call").click();

await page.waitForTimeout(28000);

await page.getByText("End Call").click();
await page.waitForTimeout(1000);

await browser.close();

const opened = logs.some((l) => l.includes("session open"));
const audioSentEvidence = logs.some((l) => l.includes("[send-audio]"));
const audioReceivedEvidence = logs.some((l) => l.includes("[recv-audio]"));
const stateTransitions = logs.filter((l) => l.startsWith("[state]")).map((l) => l.replace("[state] ", ""));

console.log("\n--- RESULT ---");
console.log("session opened:", opened);
console.log("mic audio sent:", audioSentEvidence);
console.log("audio played back:", audioReceivedEvidence);
console.log("state transitions:", stateTransitions.join(" -> "));

const hitAllStates = ["listening", "thinking", "speaking"].every((s) => stateTransitions.includes(s));

if (!opened || !audioSentEvidence || !audioReceivedEvidence || !hitAllStates) {
  process.exit(1);
}
