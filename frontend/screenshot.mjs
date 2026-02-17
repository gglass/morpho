import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
  headless: true
});
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 }
});

// Capture console logs
page.on('console', msg => console.log('Browser console:', msg.text()));
page.on('pageerror', err => console.log('Browser error:', err.message));

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Wait for the sidebar to appear
await page.waitForSelector('aside', { timeout: 10000 });
console.log('Sidebar found');

// Check for specific elements
const hasDashboard = await page.$eval('h1', el => el.textContent);
console.log('Dashboard title:', hasDashboard);

await page.screenshot({ path: '/tmp/dashboard.png', fullPage: true });
console.log('Screenshot saved');

// Navigate to other pages
await page.goto('http://localhost:5173/transactions', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/transactions.png', fullPage: true });
console.log('Transactions screenshot saved');

await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/analytics.png', fullPage: true });
console.log('Analytics screenshot saved');

await page.goto('http://localhost:5173/import', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/import.png', fullPage: true });
console.log('Import screenshot saved');

await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/settings.png', fullPage: true });
console.log('Settings screenshot saved');

await browser.close();
