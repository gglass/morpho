import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
  headless: true
});
const page = await browser.newPage();
await page.goto('http://localhost:5173');
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/dashboard.png', fullPage: true });
console.log('Screenshot saved to /tmp/dashboard.png');
await browser.close();
