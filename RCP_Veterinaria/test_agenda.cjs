const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/login', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.fill('#email', 'igneel.2@gmail.com');
  await page.fill('#password', '123456');
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:5173/#/agenda', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.fill('input[type=date]', '2026-11-19');
  await page.waitForTimeout(2500);
  const body = (await page.textContent('body')) || '';
  console.log('JUEVES:', body.replace(/\s+/g, ' ').slice(0, 500));
  await browser.close();
})();
