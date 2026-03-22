import { chromium } from 'playwright';
import { logger } from '../../utils/logger';
import { ScreenshotSet } from '../../types/analysis';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

export async function captureScreenshots(url: string): Promise<ScreenshotSet> {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const safeUrl = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const paths = {
    desktop: path.join(SCREENSHOT_DIR, `${safeUrl}_${timestamp}_desktop.png`),
    tablet: path.join(SCREENSHOT_DIR, `${safeUrl}_${timestamp}_tablet.png`),
    mobile: path.join(SCREENSHOT_DIR, `${safeUrl}_${timestamp}_mobile.png`)
  };

  logger.info(`Capturing screenshots for ${url}`);
  
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    
    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: paths.desktop, fullPage: true }).catch(() => { paths.desktop = ''; });

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: paths.tablet, fullPage: true }).catch(() => { paths.tablet = ''; });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: paths.mobile, fullPage: true }).catch(() => { paths.mobile = ''; });

  } catch (error: any) {
    logger.error('Screenshot capture failed:', error.message);
  } finally {
    await browser.close();
  }

  return {
    desktop: fs.existsSync(paths.desktop) ? paths.desktop : null,
    tablet: fs.existsSync(paths.tablet) ? paths.tablet : null,
    mobile: fs.existsSync(paths.mobile) ? paths.mobile : null
  };
}
