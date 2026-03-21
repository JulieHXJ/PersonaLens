const { chromium } = require('playwright');
(async () => {
  try {
    console.log("Launching...");
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    console.log("Launched!");
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
