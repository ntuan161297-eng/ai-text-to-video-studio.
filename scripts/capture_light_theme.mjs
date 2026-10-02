import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity-ide/brain/b2cc7be1-e52a-4805-97d9-a621cadc56f4';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  console.log('Logging in via API...');
  let token = null;
  let user = null;

  try {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'creator@local.ai', password: 'password123' }),
    });
    if (res.ok) {
      const data = await res.json();
      token = data.token;
      user = data.user;
    }
  } catch (e) {
    console.warn('API login skipped:', e.message);
  }

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

  // Set user auth & Light theme
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('app_theme', 'light');
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, { token, user });

  // Reload to fetch videos with auth
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Dashboard Light Theme Screenshot
  console.log('Capturing Dashboard in Light Theme...');
  await page.evaluate(() => {
    window.location.hash = 'dashboard';
    const navButtons = document.querySelectorAll('nav button');
    if (navButtons[0]) navButtons[0].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const dashboardPath = path.join(ARTIFACT_DIR, 'dashboard_light_theme.png');
  await page.screenshot({ path: dashboardPath, fullPage: false });
  console.log('Saved dashboard screenshot to', dashboardPath);

  // 2. Video Library Light Theme Screenshot
  console.log('Capturing Video Library in Light Theme...');
  await page.evaluate(() => {
    window.location.hash = 'videos';
    const navButtons = document.querySelectorAll('nav button');
    if (navButtons[2]) navButtons[2].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const videosPath = path.join(ARTIFACT_DIR, 'video_library_light_theme.png');
  await page.screenshot({ path: videosPath, fullPage: false });
  console.log('Saved videos screenshot to', videosPath);

  // 3. Create Video Light Theme Screenshot
  console.log('Capturing Create Video in Light Theme...');
  await page.evaluate(() => {
    window.location.hash = 'create';
    const navButtons = document.querySelectorAll('nav button');
    if (navButtons[1]) navButtons[1].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const createPath = path.join(ARTIFACT_DIR, 'create_video_light_theme.png');
  await page.screenshot({ path: createPath, fullPage: false });
  console.log('Saved create video screenshot to', createPath);

  await browser.close();
  console.log('All 3 light theme screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
