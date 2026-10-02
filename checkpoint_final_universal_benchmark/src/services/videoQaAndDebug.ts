import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface VideoQaReport {
  passed: boolean;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  hasVideoStream: boolean;
  hasAudioStream: boolean;
  fileSizeBytes: number;
  errors: string[];
}

export class VideoQaAndDebug {
  /**
   * PHASE 12 — POST-RENDER VIDEO QA (Dùng ffprobe kiểm tra tính toàn vẹn)
   */
  public static async runPostRenderQa(
    videoPath: string,
    expectedDuration: number,
    expectedWidth = 1080,
    expectedHeight = 1920
  ): Promise<VideoQaReport> {
    const errors: string[] = [];

    if (!fs.existsSync(videoPath)) {
      return {
        passed: false,
        durationSeconds: 0,
        width: 0,
        height: 0,
        fps: 0,
        hasVideoStream: false,
        hasAudioStream: false,
        fileSizeBytes: 0,
        errors: [`File video không tồn tại tại ${videoPath}`],
      };
    }

    const stats = fs.statSync(videoPath);
    if (stats.size < 500000) {
      errors.push(`Kích thước file video quá nhỏ (${stats.size} bytes), có thể bị hỏng khi render.`);
    }

    let durationSeconds = 0;
    let width = 0;
    let height = 0;
    let fps = 30;
    let hasVideoStream = false;
    let hasAudioStream = false;

    try {
      const { stdout } = await execFileAsync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'stream=codec_type,width,height,r_frame_rate:format=duration',
          '-of',
          'json',
          videoPath,
        ],
        { timeout: 15000 }
      );

      const probeData = JSON.parse(stdout);
      durationSeconds = parseFloat(probeData.format?.duration || '0');

      const streams = probeData.streams || [];
      for (const st of streams) {
        if (st.codec_type === 'video') {
          hasVideoStream = true;
          width = st.width || 0;
          height = st.height || 0;
          if (st.r_frame_rate) {
            const [num, den] = st.r_frame_rate.split('/').map(Number);
            if (den && den > 0) fps = Math.round(num / den);
          }
        } else if (st.codec_type === 'audio') {
          hasAudioStream = true;
        }
      }

      if (!hasVideoStream) errors.push('Video thiếu stream hình ảnh (video stream).');
      if (!hasAudioStream) errors.push('Video thiếu stream âm thanh (audio stream).');

      // Kiểm tra độ phân giải
      if (width !== expectedWidth || height !== expectedHeight) {
        errors.push(`Độ phân giải thực tế (${width}x${height}) không khớp yêu cầu (${expectedWidth}x${expectedHeight}).`);
      }

      // Kiểm tra thời lượng (sai số không quá 2 giây)
      if (Math.abs(durationSeconds - expectedDuration) > 2.5) {
        errors.push(`Thời lượng thực tế (${durationSeconds.toFixed(1)}s) lệch quá nhiều so với mục tiêu (${expectedDuration}s).`);
      }
    } catch (err: any) {
      errors.push(`Lỗi khi phân tích ffprobe: ${err.message}`);
    }

    const passed = errors.length === 0;
    console.log(`🎬 [VideoQA] Kết quả kiểm tra MP4: ${passed ? '✅ ĐẠT CHUẨN' : '❌ CÓ LỖI'} (${durationSeconds.toFixed(1)}s, ${width}x${height}, ${fps}fps)`);

    return {
      passed,
      durationSeconds,
      width,
      height,
      fps,
      hasVideoStream,
      hasAudioStream,
      fileSizeBytes: stats.size,
      errors,
    };
  }

  /**
   * PHASE 13 — DEBUG ARTIFACTS (Tạo debug/{jobId}/ với 14 file snapshot)
   */
  public static saveDebugArtifacts(jobId: string, artifacts: {
    input: any;
    searchQueries: any;
    searchResults: any;
    sources: any;
    cleanContent: any;
    verifiedFacts: any;
    hooks: any;
    script: any;
    storyboard: any;
    voiceTiming: any;
    visualPrompts: any;
    review: any;
    qualityScore: any;
    renderReport: any;
  }): string {
    const debugDir = path.resolve('./debug', jobId);
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const files: Array<[string, any]> = [
      ['01_input.json', artifacts.input],
      ['02_search_queries.json', artifacts.searchQueries],
      ['03_search_results.json', artifacts.searchResults],
      ['04_sources.json', artifacts.sources],
      ['05_clean_content.json', artifacts.cleanContent],
      ['06_verified_facts.json', artifacts.verifiedFacts],
      ['07_hooks.json', artifacts.hooks],
      ['08_script.json', artifacts.script],
      ['09_storyboard.json', artifacts.storyboard],
      ['10_voice_timing.json', artifacts.voiceTiming],
      ['11_visual_prompts.json', artifacts.visualPrompts],
      ['12_review.json', artifacts.review],
      ['13_quality_score.json', artifacts.qualityScore],
      ['14_render_report.json', artifacts.renderReport],
    ];

    for (const [filename, content] of files) {
      fs.writeFileSync(
        path.join(debugDir, filename),
        JSON.stringify(content || {}, null, 2),
        'utf-8'
      );
    }

    // Section 24 Observability Standard File Names
    const stdFiles: Array<[string, any]> = [
      ['creative_brief.json', artifacts.input],
      ['research.json', { queries: artifacts.searchQueries, results: artifacts.searchResults, sources: artifacts.sources }],
      ['verified_facts.json', artifacts.verifiedFacts],
      ['hook_candidates.json', artifacts.hooks],
      ['selected_hook.json', Array.isArray(artifacts.hooks) ? artifacts.hooks[0] : artifacts.hooks],
      ['script.json', artifacts.script],
      ['storyboard.json', artifacts.storyboard],
      ['assets.json', artifacts.visualPrompts],
      ['visual_grounding.json', artifacts.visualPrompts],
      ['voice_timing.json', artifacts.voiceTiming],
      ['retention_review.json', artifacts.review],
      ['quality_report.json', artifacts.qualityScore],
      ['render_report.json', artifacts.renderReport],
    ];

    for (const [stdName, content] of stdFiles) {
      fs.writeFileSync(
        path.join(debugDir, stdName),
        JSON.stringify(content || {}, null, 2),
        'utf-8'
      );
    }

    console.log(`📁 [DebugArtifacts] Đã lưu 14 snapshot debug và standard Section 24 artifacts tại: ${debugDir}`);
    return debugDir;
  }
}
