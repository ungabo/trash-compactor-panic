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

function installErrorListeners(page, pageErrors, failedRequests) {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) {
      pageErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    if (!request.url().includes("favicon")) {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`);
    }
  });
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

async function getPipeState(page) {
  return page.evaluate(() => window.__TCP_PIPE_TEST__?.getState());
}

async function getChamberState(page) {
  return page.evaluate(() => window.__TCP_CHAMBER_TEST__?.getState());
}

async function getSortState(page) {
  return page.evaluate(() => window.__TCP_SORT_TEST__?.getState());
}

async function verifyRootMenu(page) {
  await page.waitForSelector("#menu-screen", { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__TCP_APP__), null, { timeout: 15000 });
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "menu", "Root should open to the game menu.");
  assert(await page.locator("#menu-chamber-button").isVisible(), "Main Chamber menu button should be visible.");
  assert(await page.locator("#menu-pipe-button").isVisible(), "Pipe Lab menu button should be visible.");
  assert(await page.locator("#menu-sort-button").isVisible(), "Sorting Sprint menu button should be visible.");
  const menuText = (await page.locator("#menu-screen").innerText()).toLowerCase();
  assert(menuText.includes("touch / click"), "Touch/click support should be visible on the menu.");
  assert(menuText.includes("keyboard drill"), "Keyboard-only Sorting Sprint should be identified on the menu.");
}

async function verifyConceptChamber(page, inputMethod = "click") {
  await page.evaluate(() => window.__TCP_APP__.selectMode("chamber"));
  await page.waitForSelector(".concept-stage img", { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__TCP_CHAMBER_TEST__), null, { timeout: 15000 });
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "chamber", "Main Chamber mode did not activate.");
  assert(await page.locator("#concept-screen").isVisible(), "Concept chamber should be visible.");
  assert(
    (await page.locator("#concept-next-action").innerText()).includes("Tap"),
    "Main Chamber should show a clear next action.",
  );

  const imageLoaded = await page.locator(".concept-stage img").evaluate((img) => img.complete && img.naturalWidth > 1000);
  assert(imageLoaded, "Concept chamber image did not load.");

  const initial = await getChamberState(page);
  assert(initial?.runState === "playing", "Concept chamber should start in playing state.");

  const activate = async (selector) => {
    const target = page.locator(selector);
    if (inputMethod === "tap") await target.tap({ force: true });
    else await target.click({ force: true });
    await page.waitForTimeout(100);
  };

  await activate('.concept-hotspot[data-hotspot="crate-left"]');
  let afterCrate = await getChamberState(page);
  assert(afterCrate.cratesHeld === initial.cratesHeld + 1, "Tapping a crate did not collect it.");

  await activate('.concept-hotspot[data-hotspot="jam-1"]');
  let afterJam = await getChamberState(page);
  assert(afterJam.jammed === 1, "Tapping a jam plate with a crate did not jam it.");

  await activate('.concept-hotspot[data-hotspot="purple-route"]');
  let afterPipe = await getChamberState(page);
  assert(afterPipe.routed === 3, "Tapping a broken pipe did not reroute it.");

  await activate('.concept-hotspot[data-hotspot="emergency-jam"]');
  let afterEmergency = await getChamberState(page);
  assert(afterEmergency.emergencyUsed === true, "Emergency Jam hotspot did not activate.");

  await page.evaluate(() => window.__TCP_CHAMBER_TEST__.forceFail());
  await page.waitForSelector("#concept-overlay:not(.is-hidden)");
  const failed = await getChamberState(page);
  assert(failed.runState === "failed", "Concept chamber forced fail did not set failed state.");
  assert(await page.locator("#concept-menu-button").isVisible(), "Concept end state should expose a Menu button.");
  await page.locator("#concept-menu-button").click();
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "menu", "Concept end-state Menu button did not return to menu.");
  await page.evaluate(() => window.__TCP_APP__.selectMode("chamber"));
  await page.evaluate(() => window.__TCP_CHAMBER_TEST__.reset());
  await page.waitForFunction(() => window.__TCP_CHAMBER_TEST__?.getState()?.runState === "playing");
}

async function verifyPipeGame(page, inputMethod = "click") {
  await page.evaluate(() => window.__TCP_APP__.selectMode("pipes"));
  await page.waitForSelector("#pipe-board", { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__TCP_PIPE_TEST__), null, { timeout: 15000 });
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "pipes", "Pipe Lab mode did not activate.");

  const boardVisible = await page.locator("#pipe-board").isVisible();
  assert(boardVisible, "Pipe board should be visible.");
  assert((await page.locator(".pipe-sheet-image").count()) > 0, "Pipe tiles should render from the original pipe sheet.");
  assert(
    (await page.locator(".pipe-sheet-image").first().getAttribute("src"))?.includes("pipe-sheet.png"),
    "Pipe tile source should be the original pipe sheet.",
  );
  const pipeObjectiveText = await page.locator("#pipe-objective-text").innerText();
  assert(pipeObjectiveText.toLowerCase().includes("tap"), "Pipe objective should tell touch users to tap tiles.");
  assert(pipeObjectiveText.includes("INLET") && pipeObjectiveText.includes("OUTLET"), "Pipe objective should name the endpoints.");

  const initial = await getPipeState(page);
  assert(initial?.runState === "playing", "Pipe game should start in playing state.");
  assert(initial.poweredCount >= 1, "Pipe game should show flow from the source.");
  assert(await page.locator(".pipe-leak-marker").first().isVisible(), "Open pipe leaks should be visible on the board.");
  assert((await page.locator(".pipe-edge-connector").count()) > 0, "Pipe openings should render edge connectors.");

  await page.locator("#pipe-new-button").click();
  await page.waitForTimeout(120);
  const afterNewLevel = await getPipeState(page);
  assert(afterNewLevel.levelIndex !== initial.levelIndex, "New Scramble should advance to a different pipe level.");
  assert(
    JSON.stringify(afterNewLevel.source) !== JSON.stringify(initial.source) ||
      JSON.stringify(afterNewLevel.sink) !== JSON.stringify(initial.sink),
    "Different pipe levels should move the inlet or outlet.",
  );

  const targetTile = page.locator(".pipe-tile:not([disabled])").first();
  const tileBox = await targetTile.boundingBox();
  assert(tileBox && tileBox.width >= 48 && tileBox.height >= 48, "Pipe tile touch target is too small.");
  const targetRow = Number(await targetTile.getAttribute("data-row"));
  const targetCol = Number(await targetTile.getAttribute("data-col"));
  if (inputMethod === "tap") {
    await targetTile.tap();
  } else {
    await targetTile.click();
  }
  await page.waitForTimeout(120);
  const afterTap = await getPipeState(page);
  assert(afterTap.moves === afterNewLevel.moves + 1, "Tapping a pipe did not rotate it.");
  assert(afterTap.rotations[targetRow][targetCol] !== afterNewLevel.rotations[targetRow][targetCol], "Tapped pipe rotation did not change.");

  await page.evaluate(() => window.__TCP_PIPE_TEST__.solve());
  await page.waitForSelector("#pipe-overlay:not(.is-hidden)");
  const solved = await getPipeState(page);
  assert(solved.runState === "won" && solved.solved === true, "Solved pipe route did not trigger win state.");
  assert(await page.locator("#pipe-menu-button").isVisible(), "Pipe end state should expose a Menu button.");
  await page.locator("#pipe-menu-button").click();
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "menu", "Pipe end-state Menu button did not return to menu.");
  await page.evaluate(() => window.__TCP_APP__.selectMode("pipes"));

  await page.evaluate(() => window.__TCP_PIPE_TEST__.reset());
  await page.waitForFunction(() => window.__TCP_PIPE_TEST__?.getState()?.runState === "playing");
  await page.evaluate(() => window.__TCP_PIPE_TEST__.forceFail());
  const failed = await getPipeState(page);
  assert(failed.runState === "failed", "Forced pipe pressure failure did not set failed state.");
}

async function verifySortingMiniGame(page) {
  await page.evaluate(() => window.__TCP_APP__.selectMode("sort"));
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__TCP_SORT_TEST__), null, { timeout: 15000 });
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "sort", "Sorting Sprint mode did not activate.");
  assert(await isCanvasNonBlank(page), "Sorting mini-game canvas appears blank.");
  assert(
    (await page.locator(".objective-panel").innerText()).includes("Keyboard sub-game"),
    "Sorting Sprint should clearly identify keyboard-first controls.",
  );

  const initial = await getSortState(page);
  assert(initial?.runState === "playing", "Sorting mini-game should start in playing state.");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyD");
  const moved = await getSortState(page);
  assert(moved.player.x > initial.player.x + 10, "Sorting player did not move right after keyboard input.");

  await page.evaluate(() => window.__TCP_SORT_TEST__.spawnTrashAtPlayer("recycle"));
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(120);
  const afterPickup = await getSortState(page);
  assert(afterPickup.carried?.kind === "trash", "Sorting pickup did not set carried trash state.");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(120);
  const afterDrop = await getSortState(page);
  assert(afterDrop.carried === null, "Sorting drop did not clear carried state.");

  await page.evaluate(() => window.__TCP_SORT_TEST__.sortOneCorrect());
  const afterCorrect = await getSortState(page);
  assert(afterCorrect.sorted === 1, "Correct sort did not increment objective progress.");

  await page.evaluate(() => window.__TCP_SORT_TEST__.placeCrateOnJam());
  const jammed = await getSortState(page);
  assert(jammed.jamActive === true, "Jam plate did not activate in sorting mini-game.");

  await page.evaluate(() => window.__TCP_SORT_TEST__.forceWin());
  await page.waitForSelector("#state-overlay:not(.is-hidden)");
  assert(await page.locator("#sort-menu-button").isVisible(), "Sorting end state should expose a Menu button.");
  await page.locator("#sort-menu-button").click();
  assert((await page.evaluate(() => window.__TCP_APP__?.getMode())) === "menu", "Sorting end-state Menu button did not return to menu.");
  await page.evaluate(() => {
    window.__TCP_APP__.selectMode("sort");
    window.__TCP_SORT_TEST__.restart();
  });
  await page.waitForFunction(() => window.__TCP_SORT_TEST__?.getState()?.runState === "playing");
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const pageErrors = [];
  const failedRequests = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  installErrorListeners(page, pageErrors, failedRequests);

  await page.goto(url, { waitUntil: "networkidle" });
  assert(pageErrors.length === 0, `Console/page errors found: ${pageErrors.join(" | ")}`);
  assert(failedRequests.length === 0, `Failed requests found: ${failedRequests.join(" | ")}`);

  await verifyRootMenu(page);
  await page.screenshot({ path: path.join(outputDir, "root-menu.png"), fullPage: true });
  await verifyConceptChamber(page);
  await page.screenshot({ path: path.join(outputDir, "concept-chamber-main.png"), fullPage: true });
  await verifyPipeGame(page);
  await page.evaluate(() => window.__TCP_PIPE_TEST__.reset());
  await page.waitForFunction(() => window.__TCP_PIPE_TEST__?.getState()?.runState === "playing");
  await page.screenshot({ path: path.join(outputDir, "pipe-lab-sub-game.png"), fullPage: true });
  await verifySortingMiniGame(page);
  await page.screenshot({ path: path.join(outputDir, "sorting-mini-game.png"), fullPage: true });
  await page.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  const mobileErrors = [];
  const mobileFailedRequests = [];
  installErrorListeners(mobilePage, mobileErrors, mobileFailedRequests);
  await mobilePage.goto(url, { waitUntil: "networkidle" });
  await verifyRootMenu(mobilePage);
  await verifyConceptChamber(mobilePage, "tap");
  await mobilePage.screenshot({ path: path.join(outputDir, "mobile-concept-chamber.png"), fullPage: true });
  await verifyPipeGame(mobilePage, "tap");
  await mobilePage.evaluate(() => window.__TCP_PIPE_TEST__.reset());
  await mobilePage.waitForFunction(() => window.__TCP_PIPE_TEST__?.getState()?.runState === "playing");
  assert(mobileErrors.length === 0, `Mobile console/page errors found: ${mobileErrors.join(" | ")}`);
  assert(mobileFailedRequests.length === 0, `Mobile failed requests found: ${mobileFailedRequests.join(" | ")}`);
  await mobilePage.screenshot({ path: path.join(outputDir, "mobile-pipe-touch.png"), fullPage: true });
  await mobileContext.close();

  for (const viewport of viewports) {
    const viewportPage = await browser.newPage({ viewport });
    await viewportPage.goto(url, { waitUntil: "networkidle" });
    await verifyRootMenu(viewportPage);
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
