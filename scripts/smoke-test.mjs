import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const url = process.env.SMOKE_URL ?? "http://127.0.0.1:4173";
const outputDir = path.resolve("output", "playwright");
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function isCanvasNonBlank(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const { width, height } = canvas;
    const samples = [
      [Math.floor(width * 0.5), Math.floor(height * 0.5)],
      [Math.floor(width * 0.34), Math.floor(height * 0.38)],
      [Math.floor(width * 0.62), Math.floor(height * 0.72)],
      [Math.floor(width * 0.8), Math.floor(height * 0.5)],
    ];
    return samples.some(([x, y]) => {
      const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
      return a > 0 && (r + g + b) > 25;
    });
  });
}

async function getState(page) {
  return page.evaluate(() => window.__TCP_TEST__?.getState());
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const failedRequests = [];

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (!request.url().includes("favicon")) {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`);
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__TCP_TEST__), null, { timeout: 15000 });

  assert(pageErrors.length === 0, `Console/page errors found: ${pageErrors.join(" | ")}`);
  assert(failedRequests.length === 0, `Failed requests found: ${failedRequests.join(" | ")}`);
  assert(await isCanvasNonBlank(page), "Canvas appears blank.");

  const initial = await getState(page);
  assert(initial?.runState === "playing", "Initial run state should be playing.");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyD");
  const moved = await getState(page);
  assert(moved.player.x > initial.player.x + 10, "Player did not move right after keyboard input.");

  await page.evaluate(() => window.__TCP_TEST__.spawnTrashAtPlayer("recycle"));
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(120);
  let afterPickup = await getState(page);
  assert(afterPickup.carried?.kind === "trash", "Pickup did not set carried trash state.");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(120);
  let afterDrop = await getState(page);
  assert(afterDrop.carried === null, "Drop did not clear carried state.");

  await page.evaluate(() => window.__TCP_TEST__.sortOneCorrect());
  const afterCorrect = await getState(page);
  assert(afterCorrect.sorted === 1, "Correct sort did not increment objective progress.");
  assert(afterCorrect.score > 0, "Correct sort did not increase score.");

  await page.evaluate(() => window.__TCP_TEST__.sortOneWrong());
  const afterWrong = await getState(page);
  assert(afterWrong.wrongSorts === 1, "Wrong sort did not increment wrong-sort count.");
  assert(afterWrong.pressure > afterCorrect.pressure, "Wrong sort did not increase pressure.");

  await page.waitForTimeout(1100);
  const later = await getState(page);
  assert(later.pressure > afterWrong.pressure, "Pressure did not rise over time.");

  await page.evaluate(() => window.__TCP_TEST__.placeCrateOnJam());
  const jammed = await getState(page);
  assert(jammed.jamActive === true, "Jam plate did not activate when crate was placed.");

  await page.evaluate(() => window.__TCP_TEST__.forceWin());
  await page.waitForSelector("#state-overlay:not(.is-hidden)");
  assert((await getState(page)).runState === "won", "Forced win did not set win state.");

  await page.evaluate(() => window.__TCP_TEST__.restart());
  await page.waitForFunction(() => window.__TCP_TEST__?.getState()?.runState === "playing");
  await page.evaluate(() => window.__TCP_TEST__.forcePressureFail());
  assert((await getState(page)).runState === "failed", "Forced pressure fail did not set failed state.");

  await page.evaluate(() => window.__TCP_TEST__.restart());
  await page.waitForFunction(() => window.__TCP_TEST__?.getState()?.runState === "playing");
  await page.evaluate(() => window.__TCP_TEST__.forceTimerFail());
  assert((await getState(page)).runState === "failed", "Forced timer fail did not set failed state.");

  await page.screenshot({ path: path.join(outputDir, "smoke-core-flow.png"), fullPage: true });
  await page.close();

  for (const viewport of viewports) {
    const viewportPage = await browser.newPage({ viewport });
    await viewportPage.goto(url, { waitUntil: "networkidle" });
    await viewportPage.waitForSelector("canvas");
    assert(await isCanvasNonBlank(viewportPage), `Canvas blank at ${viewport.width}x${viewport.height}.`);
    const hudVisible = await viewportPage.locator("#hud").isVisible();
    assert(hudVisible, `HUD not visible at ${viewport.width}x${viewport.height}.`);
    await viewportPage.screenshot({
      path: path.join(outputDir, `viewport-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    await viewportPage.close();
  }

  console.log(`Smoke test passed for ${url}`);
} finally {
  await browser.close();
}
