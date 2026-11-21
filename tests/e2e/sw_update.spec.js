// @ts-check
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

test.describe("Baseerah PWA Service Worker Automatic Cache Version Upgrade", () => {
  const swPath = path.join(__dirname, "../../sw.js");
  let swBackup = "";

  test.beforeEach(() => {
    swBackup = fs.readFileSync(swPath, "utf-8");
  });

  test.afterEach(() => {
    if (swBackup) {
      fs.writeFileSync(swPath, swBackup, "utf-8");
    }
  });

  test("Deploying Build A then Build B automatically activates Build B, evicts Build A cache, and reloads page", async ({ page }) => {
    // 1. Deploy Build A on server
    const swBuildA = swBackup.replace(
      /const CACHE_NAME\s*=\s*["'][^"']+["'];/,
      'const CACHE_NAME = "baseerah-v1.0.0-buildA";'
    );
    fs.writeFileSync(swPath, swBuildA, "utf-8");

    await page.goto("http://127.0.0.1:8080/index.html#home");
    await page.waitForTimeout(1000);

    // Wait for SW Build A to install and activate
    const stateA = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return null;
      const reg = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      return { active: !!reg.active, keys };
    });

    expect(stateA).not.toBeNull();
    expect(stateA?.active).toBe(true);
    expect(stateA?.keys).toContain("baseerah-v1.0.0-buildA");

    // 2. Deploy Build B on server
    const swBuildB = swBackup.replace(
      /const CACHE_NAME\s*=\s*["'][^"']+["'];/,
      'const CACHE_NAME = "baseerah-v1.0.0-buildB";'
    );
    fs.writeFileSync(swPath, swBuildB, "utf-8");

    // Trigger update check and listen for automatic page reload via controllerchange
    const navigationPromise = page.waitForEvent("framenavigated", { timeout: 10000 });
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    });

    // Wait for the automatic reload to happen
    await navigationPromise;
    await page.waitForTimeout(1000);

    // 3. Verify Version B took over completely
    const stateB = await page.evaluate(async () => {
      const keys = await caches.keys();
      const reg = await navigator.serviceWorker.ready;
      return {
        keys,
        controllerActive: !!navigator.serviceWorker.controller
      };
    });

    expect(stateB.controllerActive).toBe(true);
    // Stale buildA cache MUST be deleted on activate
    expect(stateB.keys).not.toContain("baseerah-v1.0.0-buildA");
    // New buildB cache MUST exist
    expect(stateB.keys).toContain("baseerah-v1.0.0-buildB");
  });
});
