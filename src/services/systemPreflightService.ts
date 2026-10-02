import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { AppPaths } from '../utils/appPaths.js';
import { EdgeTTSProvider } from '../providers/tts/edgeTTS.js';
import { getDatabase } from '../database/db.js';
import { RenderCanaryService, CanaryResult } from './renderCanaryService.js';

const execFileAsync = promisify(execFile);

export interface DiagnosticItem {
  id: string;
  name: string;
  category: 'runtime' | 'storage' | 'database' | 'media' | 'render';
  status: 'READY' | 'WARNING' | 'FAILED';
  version?: string;
  path?: string;
  details?: string;
  errorCode?: string;
  latencyMs?: number;
}

export interface DiagnosticReport {
  timestamp: string;
  appVersion: string;
  buildNumber: string;
  gitCommit: string;
  gitBranch: string;
  overallStatus: 'READY' | 'WARNING' | 'FAILED';
  items: DiagnosticItem[];
  canaryResult?: CanaryResult;
}

export class SystemPreflightService {
  private static getBuildInfo() {
    try {
      const buildInfoPath = path.join(AppPaths.APP_ROOT, 'build_info.json');
      if (fs.existsSync(buildInfoPath)) {
        return JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      }
    } catch {
      // ignore
    }
    return {
      appVersion: '1.0.0',
      buildNumber: 'dev',
      gitCommit: 'unknown',
      gitBranch: 'main',
      buildTimestamp: new Date().toISOString()
    };
  }

  public static async runDiagnostics(includeCanary = false): Promise<DiagnosticReport> {
    const items: DiagnosticItem[] = [];
    const buildInfo = this.getBuildInfo();

    // 1. Bundled Node
    const nodePath = AppPaths.getNodePath();
    const nodeStart = Date.now();
    try {
      const { stdout } = await execFileAsync(nodePath, ['-v']);
      items.push({
        id: 'node',
        name: 'Node.js Runtime',
        category: 'runtime',
        status: 'READY',
        version: stdout.trim(),
        path: AppPaths.sanitizePath(nodePath),
        latencyMs: Date.now() - nodeStart
      });
    } catch (err: any) {
      items.push({
        id: 'node',
        name: 'Node.js Runtime',
        category: 'runtime',
        status: 'FAILED',
        path: AppPaths.sanitizePath(nodePath),
        errorCode: 'ERR_NODE_EXECUTION_FAILED',
        details: err?.message || String(err)
      });
    }

    // 2. FFmpeg
    const ffmpegPath = AppPaths.getFfmpegPath();
    const ffmpegStart = Date.now();
    try {
      const { stdout } = await execFileAsync(ffmpegPath, ['-version']);
      const firstLine = stdout.split('\n')[0].trim();
      items.push({
        id: 'ffmpeg',
        name: 'FFmpeg Muxer/Encoder',
        category: 'media',
        status: 'READY',
        version: firstLine,
        path: AppPaths.sanitizePath(ffmpegPath),
        latencyMs: Date.now() - ffmpegStart
      });
    } catch (err: any) {
      items.push({
        id: 'ffmpeg',
        name: 'FFmpeg Muxer/Encoder',
        category: 'media',
        status: 'FAILED',
        path: AppPaths.sanitizePath(ffmpegPath),
        errorCode: 'ERR_FFMPEG_EXECUTION_FAILED',
        details: err?.message || String(err)
      });
    }

    // 3. FFprobe
    const ffprobePath = AppPaths.getFfprobePath();
    const ffprobeStart = Date.now();
    try {
      const { stdout } = await execFileAsync(ffprobePath, ['-version']);
      const firstLine = stdout.split('\n')[0].trim();
      items.push({
        id: 'ffprobe',
        name: 'FFprobe Media Analyzer',
        category: 'media',
        status: 'READY',
        version: firstLine,
        path: AppPaths.sanitizePath(ffprobePath),
        latencyMs: Date.now() - ffprobeStart
      });
    } catch (err: any) {
      items.push({
        id: 'ffprobe',
        name: 'FFprobe Media Analyzer',
        category: 'media',
        status: 'FAILED',
        path: AppPaths.sanitizePath(ffprobePath),
        errorCode: 'ERR_FFPROBE_EXECUTION_FAILED',
        details: err?.message || String(err)
      });
    }

    // 4. Chromium Headless Shell
    const chromiumPath = AppPaths.getChromiumPath();
    const chromiumStart = Date.now();
    try {
      const { stdout } = await execFileAsync(chromiumPath, ['--version']);
      items.push({
        id: 'chromium',
        name: 'Chromium Headless Shell',
        category: 'render',
        status: 'READY',
        version: stdout.trim(),
        path: AppPaths.sanitizePath(chromiumPath),
        latencyMs: Date.now() - chromiumStart
      });
    } catch (err: any) {
      items.push({
        id: 'chromium',
        name: 'Chromium Headless Shell',
        category: 'render',
        status: 'FAILED',
        path: AppPaths.sanitizePath(chromiumPath),
        errorCode: 'ERR_CHROMIUM_EXECUTION_FAILED',
        details: err?.message || String(err)
      });
    }

    // 5. HyperFrames CLI
    const hyperframesPath = AppPaths.getHyperFramesPath();
    const hfStart = Date.now();
    try {
      if (!fs.existsSync(hyperframesPath)) {
        throw new Error(`HyperFrames entry not found at ${hyperframesPath}`);
      }
      const { stdout } = await execFileAsync(nodePath, [hyperframesPath, '--version']);
      items.push({
        id: 'hyperframes',
        name: 'HyperFrames Engine',
        category: 'render',
        status: 'READY',
        version: stdout.trim() || 'v1.0.0',
        path: AppPaths.sanitizePath(hyperframesPath),
        latencyMs: Date.now() - hfStart
      });
    } catch (err: any) {
      items.push({
        id: 'hyperframes',
        name: 'HyperFrames Engine',
        category: 'render',
        status: 'FAILED',
        path: AppPaths.sanitizePath(hyperframesPath),
        errorCode: 'ERR_HYPERFRAMES_EXECUTION_FAILED',
        details: err?.message || String(err)
      });
    }

    // 6. Native TTS Engine Execution
    const ttsStart = Date.now();
    try {
      const testAudioPath = path.join(AppPaths.USER_TEMP_DIR, `preflight_tts_${Date.now()}.mp3`);
      const tts = new EdgeTTSProvider('vi-VN-HoaiMyNeural', '+0%', '+0Hz');
      const ttsRes = await tts.generateAudio('Kiểm tra hệ thống âm thanh.', testAudioPath);
      const stats = fs.statSync(testAudioPath);
      if (stats.size < 500) {
        throw new Error(`TTS output size too small (${stats.size} bytes)`);
      }
      // cleanup
      try { fs.unlinkSync(testAudioPath); } catch {}
      items.push({
        id: 'tts',
        name: 'EdgeTTS Speech Engine',
        category: 'media',
        status: 'READY',
        version: 'Native Node.js WebSocket (Zero Python)',
        details: `Synthesized verified sample in ${Date.now() - ttsStart}ms (${stats.size} bytes, ${ttsRes.durationInSeconds.toFixed(2)}s)`,
        latencyMs: Date.now() - ttsStart
      });
    } catch (err: any) {
      items.push({
        id: 'tts',
        name: 'EdgeTTS Speech Engine',
        category: 'media',
        status: 'FAILED',
        errorCode: 'ERR_TTS_SYNTHESIS_FAILED',
        details: err?.message || String(err)
      });
    }

    // 7. Database Engine
    const dbStart = Date.now();
    try {
      const db = await getDatabase();
      const adminConfig = await db.getAdminAIConfig();
      const credentials = await db.getAICredentials();
      items.push({
        id: 'database',
        name: 'Local Database (JSON)',
        category: 'database',
        status: 'READY',
        version: 'schemaVersion: 2',
        path: AppPaths.sanitizePath(AppPaths.DATABASE_PATH),
        details: `${credentials.length} AI credentials stored, local schema v2 active`,
        latencyMs: Date.now() - dbStart
      });
    } catch (err: any) {
      items.push({
        id: 'database',
        name: 'Local Database (JSON)',
        category: 'database',
        status: 'FAILED',
        path: AppPaths.sanitizePath(AppPaths.DATABASE_PATH),
        errorCode: 'ERR_DATABASE_ACCESS_FAILED',
        details: err?.message || String(err)
      });
    }

    // 8. Storage Permissions (UserData, Temp, Output)
    const storagePaths = [
      { name: 'User Data Directory', path: AppPaths.USER_DATA_DIR },
      { name: 'Temp Directory', path: AppPaths.USER_TEMP_DIR },
      { name: 'Output Directory', path: AppPaths.USER_OUTPUT_DIR }
    ];

    for (const sp of storagePaths) {
      const probeFile = path.join(sp.path, `.probe_${Date.now()}`);
      try {
        fs.mkdirSync(sp.path, { recursive: true });
        fs.writeFileSync(probeFile, 'read-write-probe');
        const readBack = fs.readFileSync(probeFile, 'utf8');
        fs.unlinkSync(probeFile);
        if (readBack !== 'read-write-probe') {
          throw new Error('Read back content mismatch');
        }
        items.push({
          id: `storage_${sp.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: sp.name,
          category: 'storage',
          status: 'READY',
          path: AppPaths.sanitizePath(sp.path),
          details: 'Read/Write verified'
        });
      } catch (err: any) {
        items.push({
          id: `storage_${sp.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: sp.name,
          category: 'storage',
          status: 'FAILED',
          path: AppPaths.sanitizePath(sp.path),
          errorCode: 'ERR_STORAGE_NOT_WRITABLE',
          details: err?.message || String(err)
        });
      }
    }

    // 9. Render Canary (Optional or executed on demand)
    let canaryResult: CanaryResult | undefined;
    if (includeCanary) {
      canaryResult = await RenderCanaryService.runCanary();
      items.push({
        id: 'render_canary',
        name: 'Render Canary (Full Pipeline)',
        category: 'render',
        status: canaryResult.ok ? 'READY' : 'FAILED',
        details: canaryResult.ok 
          ? `Rendered ${canaryResult.durationSec}s canary MP4 (${canaryResult.fileSizeBytes} bytes, ${canaryResult.videoCodec}/${canaryResult.audioCodec})`
          : `Canary failed at stage: ${canaryResult.stageFailed} (${canaryResult.error})`,
        errorCode: canaryResult.ok ? undefined : 'ERR_RENDER_CANARY_FAILED'
      });
    }

    // Determine overall status
    const hasFailed = items.some(i => i.status === 'FAILED');
    const hasWarning = items.some(i => i.status === 'WARNING');
    const overallStatus = hasFailed ? 'FAILED' : (hasWarning ? 'WARNING' : 'READY');

    return {
      timestamp: new Date().toISOString(),
      appVersion: buildInfo.appVersion,
      buildNumber: buildInfo.buildNumber,
      gitCommit: buildInfo.gitCommit,
      gitBranch: buildInfo.gitBranch,
      overallStatus,
      items,
      canaryResult
    };
  }
}
