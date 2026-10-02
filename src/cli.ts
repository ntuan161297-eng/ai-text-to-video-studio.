import 'dotenv/config';
import { Command } from 'commander';
import { generateVideo } from './services/videoGenerator.js';
import { VideoEngine } from './types/video.js';

const program = new Command();

program
  .name('ai-text-to-video')
  .description('Tạo video TikTok / Shorts / Web bằng code: AI -> HTML/CSS/GSAP Animation -> HyperFrames / Remotion -> MP4')
  .version('2.1.0')
  .requiredOption('-p, --prompt <prompt>', 'Prompt ý tưởng, yêu cầu hoặc URL bài viết')
  .option('-d, --duration <seconds>', 'Thời lượng video mong muốn (giây)', '30')
  .option('-o, --output <filename>', 'Tên file video đầu ra (VD: ai_office_benefits.mp4)')
  .option('-e, --engine <engine>', 'Engine render video: hyperframes (mặc định) | remotion', 'hyperframes')
  .option('--tts <provider>', 'TTS Provider: edge | openai | fallback', 'edge')
  .option('--aspect <ratio>', 'Tỷ lệ khung hình: 9:16 | 16:9 | 1:1', '9:16')
  .action(async (options) => {
    try {
      const duration = parseInt(options.duration, 10) || 30;
      const engine = (options.engine.toLowerCase() === 'remotion' ? 'remotion' : 'hyperframes') as VideoEngine;

      console.log(`🎬 Đang khởi chạy Video Generator (Engine: ${engine}, Aspect: ${options.aspect})...`);

      const result = await generateVideo(
        {
          prompt: options.prompt,
          duration,
          outputFile: options.output,
          engine,
          ttsProvider: options.tts,
          aspectRatio: options.aspect,
        },
        (step, percent, msg) => {
          console.log(`  [${percent}%] (${step}) ${msg || ''}`);
        }
      );

      console.log('\n🎉 ==============================================');
      console.log(`✅ VIDEO ĐÃ HOÀN THÀNH: ${result.videoPath}`);
      console.log(`📦 Kích thước: ${(result.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`⏱️ Thời lượng: ${result.duration}s (${result.width}x${result.height})`);
      console.log('==============================================\n');

      process.exit(0);
    } catch (error: any) {
      console.error('\n❌ Đã xảy ra lỗi trong quá trình tạo video:');
      console.error(error.message || error);
      if (error.stack) {
        console.error('\nChi tiết stack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
