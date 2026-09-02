import { chromium } from 'playwright-core';
import fs from 'fs';
const BASE = 'http://localhost:3001';
const OUT = 'C:/Users/TL-77057/AppData/Local/Temp/accessai-shots';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${BASE}/en/login`, { waitUntil: 'networkidle', timeout: 45000 });
await page.locator('input[type="tel"]').first().fill('01512345678');
await page.locator('input[type="password"]').first().fill('4321');
await page.locator('button[type="submit"]').first().click();
await page.waitForURL(/dashboard/, { timeout: 45000 });
await page.goto(`${BASE}/en/admin`, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
await page.screenshot({
  path: `${OUT}/19b-admin-overview-health-only.jpg`,
  type: 'jpeg', quality: 85,
  clip: { x: 0, y: 0, width: 1280, height: 600 }
});
console.log('done', fs.statSync(`${OUT}/19b-admin-overview-health-only.jpg`).size);
await browser.close();
