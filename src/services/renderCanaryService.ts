import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { AppPaths } from '../utils/appPaths.js';

const execFileAsync = promisify(execFile);

export interface CanaryResult {
  ok: boolean;
  status: 'RENDER_ENGINE_READY' | 'RENDER_CANARY_FAILED';
  durationSec?: number;
  fileSizeBytes?: number;
  videoCodec?: string;
  audioCodec?: string;
  outputPath?: string;
  error?: string;
  stageFailed?: string;
}

export class RenderCanaryService {
  /**
   * Deterministic Real Production Render Canary Test.
   * Completely offline, 0 LLM, 0 Web Search, 0 CDN.
   * Renders a 2.5-second test video using the exact production rendering engine.
   */
  public static async runCanary(): Promise<CanaryResult> {
    const canaryDir = path.join(AppPaths.USER_TEMP_DIR, 'render_canary');
    const finalMp4 = path.join(canaryDir, 'canary_test.mp4');

    if (!fs.existsSync(canaryDir)) {
      fs.mkdirSync(canaryDir, { recursive: true });
    }

    // Clean old canary file if exists
    if (fs.existsSync(finalMp4)) {
      try { fs.unlinkSync(finalMp4); } catch {}
    }

    const ffmpegPath = AppPaths.getFfmpegPath();
    const ffprobePath = AppPaths.getFfprobePath();
    const nodeBin = AppPaths.getNodePath();
    const chromiumPath = AppPaths.getChromiumPath();
    const hyperframesMjs = AppPaths.getHyperFramesEntry();

    if (!fs.existsSync(ffmpegPath) && ffmpegPath !== 'ffmpeg') {
      return { ok: false, status: 'RENDER_CANARY_FAILED', stageFailed: 'FFMPEG_MISSING', error: `FFmpeg binary not found at ${ffmpegPath}` };
    }
    if (!fs.existsSync(chromiumPath)) {
      return { ok: false, status: 'RENDER_CANARY_FAILED', stageFailed: 'CHROMIUM_MISSING', error: `Chromium binary not found at ${chromiumPath}` };
    }

    try {
      // 1. Generate 2.5s silent audio tone using bundled FFmpeg (PCM 16-bit WAV for HyperFrames mixer)
      const tonePath = path.join(canaryDir, 'canary_audio.wav');
      await execFileAsync(ffmpegPath, [
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=2.5',
        '-c:a', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        tonePath,
        '-y'
      ], { timeout: 15000 });

      // 2. Generate minimal offline HTML with embedded GSAP
      const htmlPath = path.join(canaryDir, 'index.html');
      const gsapAssetPath = path.join(AppPaths.APP_ROOT, 'src', 'hyperframes', 'assets', 'gsap.min.js');
      const gsapContent = fs.existsSync(gsapAssetPath) ? fs.readFileSync(gsapAssetPath, 'utf8') : '';

      const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Canary Render Test</title>
  <script>${gsapContent}</script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px; height: 1920px; overflow: hidden;
      background: #0f172a; color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .badge {
      font-size: 32px; font-weight: 800; color: #38bdf8;
      background: rgba(56, 189, 248, 0.15); border: 2px solid #38bdf8;
      padding: 12px 32px; border-radius: 9999px; margin-bottom: 24px;
    }
    .title {
      font-size: 64px; font-weight: 900; text-align: center;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body>
  <div id="badge" class="badge">SYSTEM VERIFICATION</div>
  <div id="title" class="title">RENDER ENGINE READY</div>
  <audio id="audio-voice" data-track-index="1" data-volume="1.0" src="canary_audio.wav"></audio>
  <script>
    if (window.gsap) {
      const tl = gsap.timeline();
      tl.from("#badge", { scale: 0.5, opacity: 0, duration: 0.8, ease: "back.out(1.7)" }, 0.2);
      tl.from("#title", { y: 40, opacity: 0, duration: 0.8, ease: "power2.out" }, 0.5);
    }
  </script>
</body>
</html>`;
      fs.writeFileSync(htmlPath, html, 'utf8');

      // 3. Render HTML using bundled Node and local hyperframes.mjs
      const env = {
        ...process.env,
        PATH: `${path.dirname(ffmpegPath)};${path.dirname(nodeBin)};${process.env.PATH || ''}`,
        HYPERFRAMES_FFMPEG_PATH: ffmpegPath,
        HYPERFRAMES_FFPROBE_PATH: ffprobePath,
        PRODUCER_HEADLESS_SHELL_PATH: chromiumPath,
        HYPERFRAMES_SKIP_SKILLS: '1',
        NODE_OPTIONS: '--max-old-space-size=2048',
        PRODUCER_LOW_MEMORY_MODE: '1',
        PUPPETEER_DISABLE_HEADLESS_WARNING: 'true',
      };

      const renderArgs = [
        hyperframesMjs,
        'render',
        '-o', finalMp4,
        '-w', '1',
        '--low-memory-mode',
        '--no-browser-gpu',
        '--protocol-timeout=120000',
      ];

      await execFileAsync(nodeBin, renderArgs, {
        cwd: canaryDir,
        env,
        timeout: 180000,
      });

      if (!fs.existsSync(finalMp4)) {
        return { ok: false, status: 'RENDER_CANARY_FAILED', stageFailed: 'OUTPUT_MISSING', error: 'File video MP4 không xuất hiện sau lệnh render' };
      }

      const stats = fs.statSync(finalMp4);
      if (stats.size < 10000) {
        return { ok: false, status: 'RENDER_CANARY_FAILED', stageFailed: 'OUTPUT_CORRUPTED', error: `File video tạo ra quá nhỏ (${stats.size} bytes)` };
      }

      // 4. Validate output with FFprobe
      const probeArgs = [
        '-v', 'error',
        '-show_entries', 'stream=codec_type,codec_name:format=duration,size',
        '-of', 'json',
        finalMp4,
      ];

      const probeResult = await execFileAsync(ffprobePath, probeArgs, { timeout: 15000 });
      const probeJson = JSON.parse(probeResult.stdout || '{}');

      const streams = probeJson.streams || [];
      const videoStream = streams.find((s: any) => s.codec_type === 'video');
      const audioStream = streams.find((s: any) => s.codec_type === 'audio');
      const duration = parseFloat(probeJson.format?.duration || '0');

      if (!videoStream) {
        return { ok: false, status: 'RENDER_CANARY_FAILED', stageFailed: 'PROBE_NO_VIDEO_STREAM', error: 'Video stream missing from output MP4' };
      }

      return {
        ok: true,
        status: 'RENDER_ENGINE_READY',
        durationSec: duration,
        fileSizeBytes: stats.size,
        videoCodec: videoStream.codec_name,
        audioCodec: audioStream?.codec_name,
        outputPath: finalMp4,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 'RENDER_CANARY_FAILED',
        stageFailed: 'EXECUTION_ERROR',
        error: err.message,
      };
    }
  }
}
