import { Router, Request, Response } from 'express';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { AppPaths } from '../../utils/appPaths.js';
import { SystemPreflightService } from '../../services/systemPreflightService.js';
import { RenderCanaryService } from '../../services/renderCanaryService.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
export const systemRouter = Router();

interface GitScanResult {
  gitInstalled: boolean;
  gitPath?: string;
  inProcessPath: boolean;
  isGitRepo: boolean;
  remoteConfigured: boolean;
  status: 'GIT_READY' | 'GIT_NOT_INSTALLED' | 'GIT_NOT_IN_PROCESS_PATH' | 'NOT_A_GIT_REPOSITORY' | 'GIT_REMOTE_NOT_CONFIGURED';
  gitCommit: string;
  gitBranch: string;
}

/**
 * Scan Git installation across Windows common directories
 */
async function scanGit(): Promise<GitScanResult> {
  const candidatePaths = [
    'git', // check system PATH
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'git.exe'),
  ];

  let resolvedGitBin: string | null = null;
  let inProcessPath = false;

  for (const candidate of candidatePaths) {
    if (candidate === 'git') {
      try {
        await execAsync('git --version', { timeout: 3000 });
        resolvedGitBin = 'git';
        inProcessPath = true;
        break;
      } catch {}
    } else if (fs.existsSync(candidate)) {
      resolvedGitBin = candidate;
      inProcessPath = false;
      break;
    }
  }

  // Load build_info.json fallback
  let fallbackCommit = 'unknown';
  let fallbackBranch = 'main';
  let appVersion = '1.0.0';
  const buildInfoPath = path.join(AppPaths.APP_ROOT, 'build_info.json');
  if (fs.existsSync(buildInfoPath)) {
    try {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      fallbackCommit = buildInfo.gitCommit || fallbackCommit;
      fallbackBranch = buildInfo.gitBranch || fallbackBranch;
      appVersion = buildInfo.appVersion || appVersion;
    } catch {}
  }

  if (!resolvedGitBin) {
    return {
      gitInstalled: false,
      inProcessPath: false,
      isGitRepo: false,
      remoteConfigured: false,
      status: 'GIT_NOT_INSTALLED',
      gitCommit: fallbackCommit,
      gitBranch: fallbackBranch,
    };
  }

  const gitDir = path.join(AppPaths.APP_ROOT, '.git');
  const isGitRepo = fs.existsSync(gitDir);

  if (!isGitRepo) {
    return {
      gitInstalled: true,
      gitPath: resolvedGitBin,
      inProcessPath,
      isGitRepo: false,
      remoteConfigured: false,
      status: 'NOT_A_GIT_REPOSITORY',
      gitCommit: fallbackCommit,
      gitBranch: fallbackBranch,
    };
  }

  // Application is a git repository, test commit and remote
  try {
    const { stdout: commitOut } = await execFileAsync(resolvedGitBin, ['rev-parse', '--short', 'HEAD'], { cwd: AppPaths.APP_ROOT });
    const { stdout: branchOut } = await execFileAsync(resolvedGitBin, ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: AppPaths.APP_ROOT });
    const { stdout: remoteOut } = await execFileAsync(resolvedGitBin, ['remote'], { cwd: AppPaths.APP_ROOT });

    const remoteConfigured = remoteOut.trim().length > 0;
    const finalStatus = !inProcessPath
      ? 'GIT_NOT_IN_PROCESS_PATH'
      : (!remoteConfigured ? 'GIT_REMOTE_NOT_CONFIGURED' : 'GIT_READY');

    return {
      gitInstalled: true,
      gitPath: resolvedGitBin,
      inProcessPath,
      isGitRepo: true,
      remoteConfigured,
      status: finalStatus,
      gitCommit: commitOut.trim() || fallbackCommit,
      gitBranch: branchOut.trim() || fallbackBranch,
    };
  } catch {
    return {
      gitInstalled: true,
      gitPath: resolvedGitBin,
      inProcessPath,
      isGitRepo: true,
      remoteConfigured: false,
      status: 'GIT_REMOTE_NOT_CONFIGURED',
      gitCommit: fallbackCommit,
      gitBranch: fallbackBranch,
    };
  }
}

/**
 * GET /api/system/info
 */
systemRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const gitScan = await scanGit();
    const pkgPath = path.join(AppPaths.APP_ROOT, 'package.json');
    let version = '1.0.0';
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        version = pkg.version || version;
      } catch {}
    }

    res.json({
      success: true,
      version,
      gitCommit: gitScan.gitCommit,
      gitBranch: gitScan.gitBranch,
      hasGit: gitScan.gitInstalled,
      gitStatus: gitScan.status,
      isGitRepo: gitScan.isGitRepo,
      platform: process.platform,
      nodeVersion: process.version,
      uptimeSec: Math.floor(process.uptime()),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system/doctor
 * Runs comprehensive real execution diagnostics for all components
 */
systemRouter.get('/doctor', async (req: Request, res: Response) => {
  try {
    const includeCanary = req.query.canary === 'true';
    const report = await SystemPreflightService.runDiagnostics(includeCanary);
    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system/doctor/canary
 * Executes full Render Canary MP4 test on demand
 */
systemRouter.post('/doctor/canary', async (req: Request, res: Response) => {
  try {
    const canaryResult = await RenderCanaryService.runCanary();
    res.json({
      success: canaryResult.ok,
      canaryResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system/doctor/export
 * Exports sanitized diagnostic report (zero secrets)
 */
systemRouter.get('/doctor/export', async (req: Request, res: Response) => {
  try {
    const report = await SystemPreflightService.runDiagnostics(false);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=system_diagnostics_${Date.now()}.json`);
    res.send(JSON.stringify(report, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system/check-updates
 * Versioned release update check (Non-Git dependent)
 */
systemRouter.get('/check-updates', async (req: Request, res: Response) => {
  try {
    const manifestPath = path.join(AppPaths.APP_ROOT, 'release_manifest.json');
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {}
    }

    const pkgPath = path.join(AppPaths.APP_ROOT, 'package.json');
    let currentVersion = '1.0.0';
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        currentVersion = pkg.version || currentVersion;
      } catch {}
    }

    const hasUpdate = manifest ? manifest.version !== currentVersion : false;

    res.json({
      success: true,
      currentVersion,
      latestVersion: manifest ? manifest.version : currentVersion,
      hasUpdate,
      manifest,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system/update
 * Universal updater: supports Git Pull if in dev repo, otherwise versioned release installer guidance
 */
systemRouter.post('/update', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [SystemUpdate] Nhận lệnh cập nhật từ người dùng...');

    const gitScan = await scanGit();

    // If client is not a git repo, do NOT execute git commands
    if (!gitScan.isGitRepo) {
      return res.json({
        success: true,
        isGitRepo: false,
        message: 'Ứng dụng đã chạy từ bản cài đặt chuẩn (Standalone Distribution). Để cập nhật, vui lòng tải và chạy bộ cài update hoặc kiểm tra phiên bản mới nhất.',
        version: '1.0.0',
        updated: false,
      });
    }

    if (!gitScan.gitInstalled || !gitScan.gitPath) {
      return res.status(200).json({
        success: false,
        message: 'Không tìm thấy Git trên máy tính. Để cập nhật trong chế độ mã nguồn, vui lòng cài đặt Git.',
        error: 'Git is not installed.',
      });
    }

    // Git pull workflow for developer mode
    const gitBin = gitScan.gitPath;
    console.log(`📥 [SystemUpdate] Đang kéo code mới nhất bằng ${gitBin}...`);
    const { stdout: pullStdout, stderr: pullStderr } = await execFileAsync(gitBin, ['pull', 'origin', 'main'], { cwd: AppPaths.APP_ROOT, timeout: 45000 });
    const pullOutput = (pullStdout || pullStderr || '').trim();

    const isAlreadyUpToDate = pullOutput.includes('Already up to date') || pullOutput.includes('đã cập nhật');

    return res.json({
      success: true,
      isGitRepo: true,
      message: isAlreadyUpToDate ? 'Hệ thống đã ở phiên bản mới nhất!' : 'Đã tải bản cập nhật mới nhất từ Git thành công!',
      output: pullOutput,
      updated: !isAlreadyUpToDate,
    });
  } catch (error: any) {
    console.error('❌ [SystemUpdate] Lỗi khi cập nhật:', error.message);
    return res.status(200).json({
      success: false,
      message: `Lỗi cập nhật: ${error.message}`,
      error: error.message,
    });
  }
});
