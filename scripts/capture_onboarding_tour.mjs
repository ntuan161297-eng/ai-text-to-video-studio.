import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity-ide/brain/b2cc7be1-e52a-4805-97d9-a621cadc56f4';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  console.log('Launching browser via Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1050'],
    defaultViewport: {
      width: 1440,
      height: 1050,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();

  // Navigate to root
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Clear tour completed flag to test welcome modal
  await page.evaluate(() => {
    localStorage.removeItem('studio_onboarding_completed');
    localStorage.setItem('app_theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Capture Welcome Modal
  console.log('Capturing Welcome Tour Modal...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'tour_welcome_modal.png'),
    fullPage: false,
  });

  // Click start tour in the modal
  console.log('Clicking Start Tour in modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Xem hướng dẫn'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Capture Step 1: User Auth Focus
  console.log('Capturing Step 1 (Auth Focus)...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'tour_step_1_auth.png'),
    fullPage: false,
  });

  // Click Next -> Step 2
  console.log('Clicking Next to Step 2...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nextBtn = btns.find(b => b.textContent && b.textContent.includes('Tiếp theo'));
    if (nextBtn) nextBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 3. Capture Step 2: Settings & API Focus
  console.log('Capturing Step 2 (API Settings Focus)...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'tour_step_2_settings.png'),
    fullPage: false,
  });

  // Click Next -> Step 3
  console.log('Clicking Next to Step 3...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nextBtn = btns.find(b => b.textContent && b.textContent.includes('Tiếp theo'));
    if (nextBtn) nextBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 4. Capture Step 3: Prompt & Link Input Focus
  console.log('Capturing Step 3 (Prompt Input Focus)...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'tour_step_3_prompt.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('All tour screenshots captured successfully!');
}

main().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
