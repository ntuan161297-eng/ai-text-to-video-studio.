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

    // Kiểm tra xem thư mục có phải là Git repository không
    if (!fs.existsSync(path.resolve('.git'))) {
      return res.status(200).json({
        success: false,
        message: 'Bạn đang sử dụng Bản cài đặt đóng gói (.EXE) hoạt động độc lập không kèm Git. Khi có bản cập nhật mới, bạn chỉ cần tải và cài đè file AI_Studio_Setup_v1.0.exe mới lên máy là xong.',
        error: 'Standalone installation does not use Git.',
      });
    }

    // 1. Kiểm tra môi trường Git
    try {
      await execAsync('git --version', { timeout: 4000 });
    } catch {
      return res.status(200).json({
        success: false,
        message: 'Máy tính này chưa cài Git. Nếu muốn dùng tính năng tự động kéo code từ Git, vui lòng cài đặt Git for Windows tại git-scm.com.',
        error: 'Git is not installed.',
      });
    }

    // 2. Chạy git pull
    console.log('📥 [SystemUpdate] Đang kéo code mới nhất (git pull)...');
    const pullResult = await execAsync('git pull origin main', { timeout: 30000 });
    const pullOutput = (pullResult.stdout || pullResult.stderr || '').trim();
    console.log(`[SystemUpdate] Git pull: ${pullOutput}`);

    const isAlreadyUpToDate = pullOutput.includes('Already up to date') || pullOutput.includes('đã cập nhật');

    // 3. Nếu có cập nhật, chạy npm install và build lại frontend ngầm
    if (!isAlreadyUpToDate) {
      console.log('📦 [SystemUpdate] Đang cài đặt gói phụ thuộc mới...');
      exec('npm install', { timeout: 60000 }, (instErr) => {
        if (instErr) console.warn('[SystemUpdate] npm install warning:', instErr.message);
        console.log('🔨 [SystemUpdate] Đang build lại giao diện Web...');
        exec('npm run build', { cwd: path.resolve('web'), timeout: 120000 }, (buildErr) => {
          if (buildErr) console.warn('[SystemUpdate] web build warning:', buildErr.message);
          console.log('✅ [SystemUpdate] Quá trình cập nhật hoàn tất!');
        });
      });
    }

    return res.json({
      success: true,
      message: isAlreadyUpToDate ? 'Hệ thống đã ở phiên bản mới nhất!' : 'Đã tải bản cập nhật thành công! Hệ thống đang cập nhật tài nguyên...',
      output: pullOutput,
      updated: !isAlreadyUpToDate,
    });
  } catch (error: any) {
    console.error('❌ [SystemUpdate] Lỗi khi cập nhật:', error.message);
    return res.status(500).json({
      success: false,
      error: `Lỗi cập nhật: ${error.message}. Bạn có thể chạy file Cap_Nhat_Code.bat để cập nhật bằng tay.`,
    });
  }
});
