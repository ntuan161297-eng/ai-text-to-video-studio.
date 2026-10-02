import fs from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { CheerioArticleExtractor } from './providers/scraper/cheerioExtractor.js';
import { LLMFactory } from './providers/llm/llmFactory.js';
import { TTSFactory } from './providers/tts/ttsFactory.js';
import { VisualFactory } from './providers/visual/visualFactory.js';
import { generateAmbientBgm } from './utils/audioGenerator.js';
import { VideoScript, VideoCompositionProps } from './types/index.js';

export interface PipelineOptions {
  prompt: string;
  duration?: number;
  outputFile?: string;
  llmProvider?: string;
  ttsProvider?: string;
  visualProvider?: string;
}

export class VideoPipeline {
  private outputDir: string;
  private tempDir: string;
  private fps: number = 30;
  private width: number = 1080;
  private height: number = 1920;

  constructor() {
    this.outputDir = path.resolve(process.env.OUTPUT_DIR || './output');
    this.tempDir = path.resolve(process.env.TEMP_DIR || './temp');

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async run(options: PipelineOptions): Promise<string> {
    const startTime = Date.now();
    console.log('\n🚀 BẮT ĐẦU QUY TRÌNH TỰ ĐỘNG TẠO VIDEO TIKTOK (9:16)\n');
    console.log(`📝 Yêu cầu: "${options.prompt}"`);

    // 1. Phân tích prompt & trích xuất nội dung nếu có URL
    const urlMatch = options.prompt.match(/https?:\/\/[^\s]+/i);
    let contextText = '';
    let extractedTitle = '';

    if (urlMatch) {
      const targetUrl = urlMatch[0];
      console.log(`\n--- BƯỚC 1: LẤY NỘI DUNG TỪ BÀI VIẾT (${targetUrl}) ---`);
      const extractor = new CheerioArticleExtractor();
      const extracted = await extractor.extract(targetUrl);
      contextText = extracted.content;
      extractedTitle = extracted.title;
    }

    // Thời lượng mục tiêu (mặc định 60 giây hoặc theo options / prompt)
    let targetDuration = options.duration || 60;
    const durationMatch = options.prompt.match(/(\d+)\s*(?:giây|s|second)/i);
    if (durationMatch && !options.duration) {
      targetDuration = parseInt(durationMatch[1], 10);
    }
    console.log(`⏱️ Thời lượng mục tiêu: ${targetDuration} giây`);

    // 2. Tạo kịch bản video qua LLM Provider
    console.log('\n--- BƯỚC 2: PHÂN TÍCH VÀ VIẾT KỊCH BẢN VIDEO ---');
    const llm = LLMFactory.create(options.llmProvider);
    console.log(`🧠 Đang sử dụng LLM: ${llm.name}`);
    const script = await llm.generateScript(options.prompt, targetDuration, contextText);

    console.log(`📋 Kịch bản: "${script.title}" gồm ${script.scenes.length} scene:`);
    script.scenes.forEach((s) => {
      console.log(`  [Scene ${s.id}] (${s.durationInSeconds}s) ${s.caption}: "${s.voiceOver.slice(0, 50)}..."`);
    });

    // Tạo thư mục tạm riêng cho phiên tạo video này
    const sessionId = `video_${Date.now()}`;
    const sessionDir = path.join(this.tempDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    // 3. Tạo giọng đọc tiếng Việt (TTS) cho từng scene
    console.log('\n--- BƯỚC 3: TẠO GIỌNG ĐỌC TIẾNG VIỆT (TTS) ---');
    const tts = TTSFactory.create(options.ttsProvider);
    console.log(`🎙️ Đang sử dụng TTS: ${tts.name}`);

    for (const scene of script.scenes) {
      const audioFile = path.join(sessionDir, `audio_scene_${scene.id}.mp3`);
      const audioResult = await tts.generateAudio(scene.voiceOver, audioFile);
      
      // Chuyển audio sang data URI để Remotion nhúng trực tiếp an toàn
      const audioBuffer = fs.readFileSync(audioResult.audioPath);
      const audioMime = audioResult.audioPath.endsWith('.wav') ? 'audio/wav' : 'audio/mp3';
      scene.audioPath = `data:${audioMime};base64,${audioBuffer.toString('base64')}`;
      
      // Đồng bộ thời lượng scene thực tế theo độ dài audio voiceover (+0.5s đệm)
      const adjustedDuration = Math.max(audioResult.durationInSeconds + 0.5, 3.5);
      scene.durationInSeconds = adjustedDuration;
      scene.durationInFrames = Math.round(adjustedDuration * this.fps);
    }

    // 4. Tạo hình ảnh (Visuals) cho từng scene
    console.log('\n--- BƯỚC 4: TẠO HÌNH ẢNH MINH HOẠ CHO TỪNG SCENE ---');
    const visualProvider = VisualFactory.create(options.visualProvider);
    console.log(`🎨 Đang sử dụng Visual Provider: ${visualProvider.name}`);

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const imagePath = path.join(sessionDir, `visual_scene_${scene.id}.jpg`);
      const savedPath = await visualProvider.generateVisual(scene.visualPrompt, imagePath, i);

      // Chuyển hình ảnh sang data URI để Remotion hiển thị không lỗi
      const imgBuffer = fs.readFileSync(savedPath);
      const isSvg = savedPath.endsWith('.svg');
      const mime = isSvg ? 'image/svg+xml' : 'image/jpeg';
      scene.imagePath = `data:${mime};base64,${imgBuffer.toString('base64')}`;
    }

    // 5. Tạo nhạc nền (BGM)
    console.log('\n--- BƯỚC 5: TẠO VÀ GHÉP NHẠC NỀN ---');
    const bgmPath = path.join(sessionDir, 'bgm.wav');
    const totalVideoSeconds = script.scenes.reduce((sum, s) => sum + s.durationInSeconds, 0);
    generateAmbientBgm(bgmPath, Math.ceil(totalVideoSeconds) + 5);
    const bgmBuffer = fs.readFileSync(bgmPath);
    const bgmDataUri = `data:audio/wav;base64,${bgmBuffer.toString('base64')}`;

    // 6. Đóng gói và Render Video bằng Remotion
    console.log('\n--- BƯỚC 6: BUNDLE VÀ RENDER VIDEO BẰNG REMOTION ---');
    const entryPoint = path.resolve('src/remotion/index.ts');
    console.log('📦 Đang đóng gói Remotion bundle...');
    const bundleLocation = await bundle({
      entryPoint,
      onProgress: (progress) => {
        if (progress % 25 === 0) {
          console.log(`  Đóng gói: ${progress}%`);
        }
      },
    });

    const compositionId = 'TikTokVideo';
    const inputProps: VideoCompositionProps = {
      script,
      fps: this.fps,
      musicAudioPath: bgmDataUri,
      musicVolume: 0.12,
    };

    console.log('🎬 Đang chọn composition và tính toán frame...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    const finalVideoName = options.outputFile || `video_${Date.now()}.mp4`;
    const finalOutputPath = path.join(this.outputDir, finalVideoName);

    console.log(`🎥 Đang render video MP4 9:16 (${composition.durationInFrames} frames, ~${(composition.durationInFrames / this.fps).toFixed(1)}s)...`);
    
    let lastLoggedPercent = 0;
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: finalOutputPath,
      inputProps,
      concurrency: 1, // Tối ưu CPU, giới hạn 1 worker tránh đóng băng hệ thống
      chromiumOptions: {
        gl: 'angle',
      },
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 100);
        if (percent >= lastLoggedPercent + 10 || percent === 100) {
          lastLoggedPercent = percent;
          console.log(`  Rendering: ${percent}%`);
        }
      },
    });

    const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n🎉 ==============================================');
    console.log(`✅ VIDEO ĐÃ ĐƯỢC TẠO THÀNH CÔNG!`);
    console.log(`📁 Đường dẫn file: ${finalOutputPath}`);
    console.log(`⏱️ Thời lượng video: ${(composition.durationInFrames / this.fps).toFixed(1)} giây`);
    console.log(`⚡ Tổng thời gian xử lý: ${totalTimeSec} giây`);
    console.log('==============================================\n');

    return finalOutputPath;
  }
}
