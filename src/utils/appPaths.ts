import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

/**
 * CENTRALIZED APPLICATION PATH RESOLVER
 * Production-hardened path resolution for standalone Windows distribution.
 * Strictly avoids process.cwd() dependencies and developer-machine assumptions.
 */

// Determine __filename and __dirname in ES modules
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

function findAppRoot(): string {
  if (process.env.APP_DIR && fs.existsSync(process.env.APP_DIR)) {
    return path.resolve(process.env.APP_DIR);
  }

  // Walk up from currentDir looking for package.json
  let dir = currentDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback to currentDir parent if not found
  return path.resolve(currentDir, '..', '..');
}

const APP_ROOT = findAppRoot();
const APP_RESOURCES_DIR = APP_ROOT;

// Windows per-user Application Data Directory: %LOCALAPPDATA%\AI_Text_To_Video_Studio
function resolveUserDataDir(): string {
  if (process.env.AI_STUDIO_USER_DATA_DIR && process.env.AI_STUDIO_USER_DATA_DIR.trim().length > 0) {
    return path.resolve(process.env.AI_STUDIO_USER_DATA_DIR.trim());
  }

  const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (localAppData && fs.existsSync(localAppData)) {
    return path.join(localAppData, 'AI_Text_To_Video_Studio');
  }

  return path.join(os.homedir(), '.ai_text_to_video_studio');
}

const USER_DATA_DIR = resolveUserDataDir();
const USER_CONFIG_DIR = path.join(USER_DATA_DIR, 'config');
const USER_SECURITY_DIR = path.join(USER_DATA_DIR, 'security');
const USER_PROJECT_DIR = path.join(USER_DATA_DIR, 'projects');
const USER_OUTPUT_DIR = process.env.OUTPUT_DIR && process.env.OUTPUT_DIR.trim().length > 0
  ? path.resolve(process.env.OUTPUT_DIR.trim())
  : path.join(USER_DATA_DIR, 'output');
const USER_LOG_DIR = path.join(USER_DATA_DIR, 'logs');
const USER_CACHE_DIR = path.join(USER_DATA_DIR, 'cache');
const USER_TEMP_DIR = path.join(USER_DATA_DIR, 'temp');

const DATABASE_PATH = path.join(USER_DATA_DIR, 'local_db.json');
const MASTER_KEY_PATH = path.join(USER_SECURITY_DIR, 'master.key');
const BUILD_INFO_PATH = path.join(APP_ROOT, 'build_info.json');

// Binary Resolution
function resolveNodePath(): string {
  const bundled = path.join(APP_ROOT, 'runtime', 'node.exe');
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return process.execPath;
}

function resolveFfmpegPath(): string {
  // 1. Check bundled Remotion compositor package
  const bundledCompositor = path.join(
    APP_ROOT,
    'node_modules',
    '@remotion',
    'compositor-win32-x64-msvc',
    'ffmpeg.exe'
  );
  if (fs.existsSync(bundledCompositor)) {
    return bundledCompositor;
  }

  // 2. Check runtime/bin/ffmpeg.exe
  const runtimeBin = path.join(APP_ROOT, 'runtime', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(runtimeBin)) {
    return runtimeBin;
  }

  // 3. Check environment override
  if (process.env.HYPERFRAMES_FFMPEG_PATH && fs.existsSync(process.env.HYPERFRAMES_FFMPEG_PATH)) {
    return process.env.HYPERFRAMES_FFMPEG_PATH;
  }

  return 'ffmpeg';
}

function resolveFfprobePath(): string {
  // 1. Check bundled Remotion compositor package
  const bundledCompositor = path.join(
    APP_ROOT,
    'node_modules',
    '@remotion',
    'compositor-win32-x64-msvc',
    'ffprobe.exe'
  );
  if (fs.existsSync(bundledCompositor)) {
    return bundledCompositor;
  }

  // 2. Check runtime/bin/ffprobe.exe
  const runtimeBin = path.join(APP_ROOT, 'runtime', 'bin', 'ffprobe.exe');
  if (fs.existsSync(runtimeBin)) {
    return runtimeBin;
  }

  // 3. Check environment override
  if (process.env.HYPERFRAMES_FFPROBE_PATH && fs.existsSync(process.env.HYPERFRAMES_FFPROBE_PATH)) {
    return process.env.HYPERFRAMES_FFPROBE_PATH;
  }

  return 'ffprobe';
}

function resolveChromiumPath(): string {
  // 1. Bundled chrome-headless-shell
  const bundledShell = path.join(
    APP_ROOT,
    'node_modules',
    '.remotion',
    'chrome-headless-shell',
    'win64',
    'chrome-headless-shell-win64',
    'chrome-headless-shell.exe'
  );
  if (fs.existsSync(bundledShell)) {
    return bundledShell;
  }

  // 2. Environment variable override
  if (process.env.PRODUCER_HEADLESS_SHELL_PATH && fs.existsSync(process.env.PRODUCER_HEADLESS_SHELL_PATH)) {
    return process.env.PRODUCER_HEADLESS_SHELL_PATH;
  }

  // 3. Standard Windows browser locations
  const standardLocations = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const loc of standardLocations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  return '';
}

function resolveHyperFramesEntry(): string {
  return path.join(APP_ROOT, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs');
}

/**
 * Ensures all required user directories exist with full read/write permissions
 */
export function ensureUserDirectories(): void {
  const dirs = [
    USER_DATA_DIR,
    USER_CONFIG_DIR,
    USER_SECURITY_DIR,
    USER_PROJECT_DIR,
    USER_OUTPUT_DIR,
    USER_LOG_DIR,
    USER_CACHE_DIR,
    USER_TEMP_DIR,
  ];

  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      try {
        fs.mkdirSync(d, { recursive: true });
      } catch (err: any) {
        console.warn(`[AppPaths] Warning creating directory ${d}:`, err.message);
      }
    }
  }
}

/**
 * One-time idempotent migration from legacy {APP_ROOT}/data to USER_DATA_DIR
 */
export function migrateLegacyUserData(): void {
  const legacyDataDir = path.join(APP_ROOT, 'data');
  const legacyDbFile = path.join(legacyDataDir, 'local_db.json');

  if (!fs.existsSync(legacyDbFile)) {
    return;
  }

  ensureUserDirectories();

  // If new DB does not exist yet, copy legacy DB safely with backup
  if (!fs.existsSync(DATABASE_PATH)) {
    try {
      console.log(`[AppPaths] 🔄 Di chuyển cơ sở dữ liệu từ legacy: ${legacyDbFile} -> ${DATABASE_PATH}`);
      fs.copyFileSync(legacyDbFile, DATABASE_PATH);
      fs.copyFileSync(legacyDbFile, `${DATABASE_PATH}.migration_bak`);
    } catch (err: any) {
      console.error(`[AppPaths] ❌ Lỗi khi di chuyển legacy DB:`, err.message);
    }
  }

  // Also check legacy output dir
  const legacyOutputDir = path.join(APP_ROOT, 'output');
  if (fs.existsSync(legacyOutputDir) && legacyOutputDir !== USER_OUTPUT_DIR) {
    console.log(`[AppPaths] Thư mục output hiện tại: ${USER_OUTPUT_DIR} (Legacy output: ${legacyOutputDir})`);
  }
}

export function sanitizePath(rawPath: string): string {
  if (!rawPath) return '';
  const userProfile = process.env.USERPROFILE || '';
  if (userProfile && rawPath.startsWith(userProfile)) {
    return rawPath.replace(userProfile, '%USERPROFILE%');
  }
  const localAppData = process.env.LOCALAPPDATA || '';
  if (localAppData && rawPath.startsWith(localAppData)) {
    return rawPath.replace(localAppData, '%LOCALAPPDATA%');
  }
  return rawPath;
}

export const AppPaths = {
  APP_ROOT,
  APP_RESOURCES_DIR,
  USER_DATA_DIR,
  USER_CONFIG_DIR,
  USER_SECURITY_DIR,
  USER_PROJECT_DIR,
  USER_OUTPUT_DIR,
  USER_LOG_DIR,
  USER_CACHE_DIR,
  USER_TEMP_DIR,
  DATABASE_PATH,
  MASTER_KEY_PATH,
  BUILD_INFO_PATH,
  getNodePath: resolveNodePath,
  getFfmpegPath: resolveFfmpegPath,
  getFfprobePath: resolveFfprobePath,
  getChromiumPath: resolveChromiumPath,
  getHyperFramesEntry: resolveHyperFramesEntry,
  getHyperFramesPath: resolveHyperFramesEntry,
  sanitizePath,
  ensureUserDirectories,
  migrateLegacyUserData,
};
