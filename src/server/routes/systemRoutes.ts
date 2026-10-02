import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
export const systemRouter = Router();

/**
 * GET /api/system/info
 * Lấy thông tin phiên bản, trạng thái Git, môi trường máy
 */
systemRouter.get('/info', async (req: Request, res: Response) => {
  try {
    let gitCommit = 'unknown';
    let gitBranch = 'main';
    let hasGit = false;

    try {
      const commitRes = await execAsync('git rev-parse --short HEAD', { timeout: 3000 });
      gitCommit = commitRes.stdout.trim();
      const branchRes = await execAsync('git rev-parse --abbrev-ref HEAD', { timeout: 3000 });
      gitBranch = branchRes.stdout.trim();
      hasGit = true;
    } catch {
      hasGit = false;
    }

    const pkgPath = path.resolve('package.json');
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
      gitCommit,
      gitBranch,
      hasGit,
      platform: process.platform,
      nodeVersion: process.version,
      uptimeSec: Math.floor(process.uptime()),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system/update
 * Tự động get code mới nhất từ Git (git pull) và build lại
 */
systemRouter.post('/update', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [SystemUpdate] Nhận lệnh cập nhật từ người dùng qua Web UI...');

    // 1. Kiểm tra máy có cài Git không
    try {
      await execAsync('git --version', { timeout: 4000 });
    } catch {
      return res.status(200).json({
        success: false,
        message: 'Máy tính này chưa cài đặt Git. Để dùng tính năng tự động kéo code từ GitHub, bạn chỉ cần tải Git tại: https://git-scm.com/download/win (chọn 64-bit Git for Windows Setup và bấm Next liên tục).',
        error: 'Git is not installed.',
      });
    }

    let pullOutput = '';

    // 2. Nếu thư mục chưa có .git (bản cài .EXE), tự động khởi tạo kết nối tới GitHub
    if (!fs.existsSync(path.resolve('.git'))) {
      console.log('🔄 [SystemUpdate] Chưa có .git, đang tự động kết nối với repo GitHub...');
      await execAsync('git init', { timeout: 10000 });
      await execAsync('git remote add origin https://github.com/ntuan161297-eng/ai-text-to-video-studio..git', { timeout: 10000 });
      await execAsync('git fetch origin main', { timeout: 60000 });
      const resetRes = await execAsync('git reset --hard origin/main', { timeout: 30000 });
      pullOutput = (resetRes.stdout || resetRes.stderr || 'Đã đồng bộ thành công từ nhánh main.').trim();
    } else {
      // 3. Nếu đã có .git, chạy git pull
      console.log('📥 [SystemUpdate] Đang kéo code mới nhất (git pull origin main)...');
      const pullResult = await execAsync('git pull origin main', { timeout: 45000 });
      pullOutput = (pullResult.stdout || pullResult.stderr || '').trim();
    }

    console.log(`[SystemUpdate] Kết quả Git: ${pullOutput}`);

    const isAlreadyUpToDate = pullOutput.includes('Already up to date') || pullOutput.includes('đã cập nhật');

    // 4. Nếu có cập nhật mới, build lại web frontend ngầm
    if (!isAlreadyUpToDate) {
      console.log('📦 [SystemUpdate] Đang build lại giao diện Web...');
      exec('npm run build', { cwd: path.resolve('web'), timeout: 180000 }, (buildErr) => {
        if (buildErr) console.warn('[SystemUpdate] web build warning:', buildErr.message);
        console.log('✅ [SystemUpdate] Quá trình cập nhật hoàn tất!');
      });
    }

    return res.json({
      success: true,
      message: isAlreadyUpToDate ? 'Hệ thống đã ở phiên bản mới nhất từ Git!' : 'Đã tải bản cập nhật mới nhất từ GitHub thành công!',
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
