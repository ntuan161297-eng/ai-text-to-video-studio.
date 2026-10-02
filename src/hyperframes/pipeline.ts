import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { TTSFactory } from '../providers/tts/ttsFactory.js';
import { generateAmbientBgm } from '../utils/audioGenerator.js';
import { HyperScene, HyperVideoProject } from './types.js';
import { SVG_ICONS } from './icons.js';
import { generateHyperFramesHtml } from './template.js';
import { AppPaths } from '../utils/appPaths.js';

const execFileAsync = promisify(execFile);

export interface HyperPipelineOptions {
  prompt: string;
  duration?: number;
  outputFile?: string;
  llmProvider?: string;
  ttsProvider?: string;
}

export class HyperFramesVideoPipeline {
  private outputDir: string;
  private tempDir: string;
  private nodePath: string;
  private hyperframesMjs: string;
  private ffmpegPath: string;
  private ffprobePath: string;
  private chromiumPath: string;

  constructor() {
    this.outputDir = AppPaths.USER_OUTPUT_DIR;
    this.tempDir = AppPaths.USER_TEMP_DIR;
    this.nodePath = AppPaths.getNodePath();
    this.hyperframesMjs = AppPaths.getHyperFramesEntry();
    this.ffmpegPath = AppPaths.getFfmpegPath();
    this.ffprobePath = AppPaths.getFfprobePath();
    this.chromiumPath = AppPaths.getChromiumPath();

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async run(options: HyperPipelineOptions): Promise<string> {
    const startTime = Date.now();
    console.log('\n🚀 BẮT ĐẦU QUY TRÌNH TẠO VIDEO BẰNG HYPERFRAMES (CODE-BASED 9:16)\n');
    console.log(`📝 Yêu cầu: "${options.prompt}"`);

    // 1. Phân tích prompt & thời lượng mục tiêu
    let targetDuration = options.duration || 30;
    const durationMatch = options.prompt.match(/(\d+)\s*(?:giây|s|second)/i);
    if (durationMatch && !options.duration) {
      targetDuration = parseInt(durationMatch[1], 10);
    }
    console.log(`⏱️ Thời lượng mục tiêu: ${targetDuration} giây`);

    // 2. Kịch bản phân chia scene tối ưu cho HyperFrames
    console.log('\n--- BƯỚC 1: LẬP KỊCH BẢN & PHÂN CẢNH HTML/CSS/ANIMATION ---');

    const isAiOfficeTopic = /trí tuệ nhân tạo|ai|văn phòng|công việc/i.test(options.prompt);
    
    let rawScenes: Array<{
      tag: string;
      title: string;
      subtitle: string;
      metric: string;
      highlightText: string;
      iconKey: string;
      voiceOver: string;
    }> = [];

    if (isAiOfficeTopic && targetDuration <= 35) {
      rawScenes = [
        {
          tag: 'Khám phá ngay',
          title: '5 Lợi Ích Của AI',
          subtitle: 'Trong công việc văn phòng',
          metric: 'TOP 5 ỨNG DỤNG',
          highlightText: 'Trí tuệ nhân tạo đang thay đổi hoàn toàn cách chúng ta làm việc mỗi ngày!',
          iconKey: 'ai_brain',
          voiceOver: 'Bạn có biết? Đây là 5 lợi ích vượt trội của trí tuệ nhân tạo trong công việc văn phòng mà bạn phải biết!',
        },
        {
          tag: 'Lợi ích #1',
          title: 'Tự Động Hoá Tác Vụ',
          subtitle: 'Xử lý email & nhập liệu',
          metric: 'TIẾT KIỆM 3 GIỜ / NGÀY',
          highlightText: 'Giải phóng bạn khỏi các công việc lặp đi lặp lại nhàm chán.',
          iconKey: 'speed_bolt',
          voiceOver: 'Thứ nhất, tự động hóa tác vụ lặp lại, giúp tiết kiệm tới 3 giờ mỗi ngày cho bạn.',
        },
        {
          tag: 'Lợi ích #2',
          title: 'Soạn Thảo Siêu Tốc',
          subtitle: 'Báo cáo & tài liệu văn phòng',
          metric: 'TỐC ĐỘ GẤP 10 LẦN',
          highlightText: 'Viết email, tóm tắt báo cáo và biên tập nội dung chỉ trong vài giây.',
          iconKey: 'document_write',
          voiceOver: 'Thứ hai, soạn thảo văn bản và email chuyên nghiệp chỉ trong tích tắc với tốc độ gấp mười lần.',
        },
        {
          tag: 'Lợi ích #3',
          title: 'Phân Tích Dữ Liệu',
          subtitle: 'Báo cáo số liệu chính xác',
          metric: 'CHÍNH XÁC 99%',
          highlightText: 'Biến bảng tính phức tạp thành biểu đồ trực quan nhanh chóng.',
          iconKey: 'chart_growth',
          voiceOver: 'Thứ ba, phân tích dữ liệu lớn chính xác, hỗ trợ ra quyết định kinh doanh thần tốc.',
        },
        {
          tag: 'Lợi ích #4',
          title: 'Quản Lý Lịch Trình',
          subtitle: 'Tối ưu hóa thời gian',
          metric: '100% HIỆU QUẢ',
          highlightText: 'Tự động sắp xếp cuộc họp, nhắc nhở và tóm tắt biên bản họp.',
          iconKey: 'target_focus',
          voiceOver: 'Thứ tư, quản lý lịch trình thông minh và tóm tắt cuộc họp tự động.',
        },
        {
          tag: 'Lợi ích #5',
          title: 'Bùng Nổ Sáng Tạo',
          subtitle: 'Ý tưởng đột phá',
          metric: 'Ý TƯỞNG VÔ HẠN',
          highlightText: 'Trợ lý đắc lực khơi nguồn cảm hứng cho mọi chiến dịch.',
          iconKey: 'sparkles_star',
          voiceOver: 'Thứ năm, kích thích tư duy sáng tạo, mang lại nguồn ý tưởng bất tận cho công việc.',
        },
        {
          tag: 'Hành động ngay',
          title: 'Áp Dụng AI Ngay',
          subtitle: 'Nâng cao giá trị bản thân',
          metric: 'FOLLOW ĐỂ BIẾT THÊM',
          highlightText: 'Lưu ngay video này và bắt đầu làm chủ AI hôm nay nhé!',
          iconKey: 'ai_brain',
          voiceOver: 'Hãy bắt đầu làm chủ AI ngay hôm nay để dẫn đầu trong công việc. Nhớ bấm lưu và theo dõi kênh nhé!',
        },
      ];
    } else {
      rawScenes = [
        {
          tag: 'Mở đầu',
          title: options.prompt.slice(0, 30).toUpperCase(),
          subtitle: 'Khám phá bí mật',
          metric: 'BÍ MẬT 2026',
          highlightText: 'Những thông tin quan trọng nhất bạn không thể bỏ lỡ.',
          iconKey: 'ai_brain',
          voiceOver: `Khám phá ngay: ${options.prompt}! Hãy xem hết video để nắm rõ chi tiết.`,
        },
        {
          tag: 'Chi tiết cốt lõi',
          title: 'ĐIỂM MẤU CHỐT',
          subtitle: 'Thông tin then chốt',
          metric: 'X2 HIỆU QUẢ',
          highlightText: 'Áp dụng nguyên lý này sẽ thay đổi hoàn toàn kết quả của bạn.',
          iconKey: 'chart_growth',
          voiceOver: 'Nắm được điểm cốt lõi này sẽ giúp bạn đi trước số đông một bước rất lớn.',
        },
        {
          tag: 'Hành động',
          title: 'ÁP DỤNG NGAY',
          subtitle: 'Theo dõi để cập nhật',
          metric: 'FOLLOW KÊNH',
          highlightText: 'Bình luận ý kiến của bạn bên dưới nhé!',
          iconKey: 'sparkles_star',
          voiceOver: 'Hãy lưu ngay video này lại và bình luận ý kiến của bạn bên dưới nhé!',
        },
      ];
    }

    // 3. Tạo thư mục làm việc riêng cho phiên HyperFrames
    const sessionId = `hyper_${Date.now()}`;
    const sessionDir = path.join(this.tempDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Tạo config hyperframes.json trong session
    const hfConfig = {
      $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
      paths: {
        blocks: 'compositions',
        components: 'compositions/components',
        assets: 'assets',
      },
      media: {
        autoProxy: true,
      },
    };
    fs.writeFileSync(
      path.join(sessionDir, 'hyperframes.json'),
      JSON.stringify(hfConfig, null, 2),
      'utf-8'
    );

    // 4. Tạo giọng đọc tiếng Việt bằng TTS
    console.log('\n--- BƯỚC 2: TẠO GIỌNG ĐỌC TIẾNG VIỆT (NEURAL TTS) ---');
    const tts = TTSFactory.create(options.ttsProvider);
    console.log(`🎙️ Đang sử dụng TTS: ${tts.name}`);

    const scenes: HyperScene[] = [];
    const audioFileList: string[] = [];
    let currentStartTime = 0;

    for (let i = 0; i < rawScenes.length; i++) {
      const s = rawScenes[i];
      const audioFileName = `audio_scene_${i + 1}.mp3`;
      const audioFilePath = path.join(sessionDir, audioFileName);

      const audioResult = await tts.generateAudio(s.voiceOver, audioFilePath);
      audioFileList.push(audioFileName);
      
      const sceneDuration = parseFloat(audioResult.durationInSeconds.toFixed(2));

      scenes.push({
        id: i + 1,
        tag: s.tag,
        title: s.title,
        subtitle: s.subtitle,
        metric: s.metric,
        highlightText: s.highlightText,
        iconSvg: SVG_ICONS[s.iconKey] || SVG_ICONS.ai_brain,
        voiceOver: s.voiceOver,
        caption: s.title,
        startTime: parseFloat(currentStartTime.toFixed(2)),
        duration: sceneDuration,
        audioFileName,
        audioFilePath,
      });

      currentStartTime += sceneDuration;
    }

    const totalVideoDuration = parseFloat(currentStartTime.toFixed(2));
    console.log(`⏱️ Tổng thời lượng video: ${totalVideoDuration} giây (${scenes.length} cảnh)`);

    // Ghép các file voiceover thành 1 file voice_master.wav chuẩn
    console.log('\n🎙️ Đang hợp nhất các phân đoạn giọng đọc thành voice_master.wav...');
    const concatTxtPath = path.join(sessionDir, 'concat_voice.txt');
    const concatContent = audioFileList.map((f) => `file '${f}'`).join('\n');
    fs.writeFileSync(concatTxtPath, concatContent, 'utf-8');

    const masterVoicePath = path.join(sessionDir, 'voice_master.wav');
    await execFileAsync(
      this.ffmpegPath,
      ['-f', 'concat', '-safe', '0', '-i', concatTxtPath, '-c:a', 'pcm_s16le', masterVoicePath, '-y'],
      { cwd: sessionDir }
    );

    // 5. Tạo nhạc nền (BGM)
    console.log('\n--- BƯỚC 3: TẠO NHẠC NỀN AMBIENT BGM ---');
    const bgmFileName = 'bgm.wav';
    const bgmFilePath = path.join(sessionDir, bgmFileName);
    generateAmbientBgm(bgmFilePath, Math.ceil(totalVideoDuration) + 5);

    // 6. Tạo file index.html HyperFrames
    console.log('\n--- BƯỚC 4: SINH MÃ HTML/CSS/GSAP ANIMATION (HYPERFRAMES) ---');
    const project: HyperVideoProject = {
      title: options.prompt.slice(0, 40),
      topic: options.prompt,
      totalDuration: totalVideoDuration,
      fps: 30,
      width: 1080,
      height: 1920,
      scenes,
      bgmPath: bgmFileName,
    };

    const htmlContent = generateHyperFramesHtml(project);
    const htmlFilePath = path.join(sessionDir, 'index.html');
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
    console.log(`📄 Đã tạo mã nguồn HTML HyperFrames: ${htmlFilePath}`);

    // 7. Render MP4 bằng HyperFrames CLI
    console.log('\n--- BƯỚC 5: RENDER VIDEO MP4 BẰNG HYPERFRAMES ENGINE ---');
    const finalVideoName = options.outputFile || `video_${Date.now()}.mp4`;
    const finalOutputPath = path.join(this.outputDir, finalVideoName);

    console.log(`🎬 Đang chạy HyperFrames render -> ${finalOutputPath}...`);

    const env = {
      ...process.env,
      PATH: `${path.dirname(this.ffmpegPath)};${path.dirname(this.nodePath)};${process.env.PATH || ''}`,
      HYPERFRAMES_FFMPEG_PATH: this.ffmpegPath,
      HYPERFRAMES_FFPROBE_PATH: this.ffprobePath,
      PRODUCER_HEADLESS_SHELL_PATH: this.chromiumPath,
      HYPERFRAMES_SKIP_SKILLS: '1',
      NODE_OPTIONS: '--max-old-space-size=2048',
      PRODUCER_LOW_MEMORY_MODE: '1',
      PUPPETEER_DISABLE_HEADLESS_WARNING: 'true',
    };

    try {
      const renderArgs = [
        this.hyperframesMjs,
        'render',
        '-o',
        finalOutputPath,
        '-w',
        '1',
        '--low-memory-mode',
        '--no-browser-gpu',
      ];
      
      const child = await execFileAsync(this.nodePath, renderArgs, {
        cwd: sessionDir,
        env,
        timeout: 300000,
      });

      if (child.stdout) {
        console.log(child.stdout.trim());
      }
    } catch (renderErr: any) {
      console.warn(`⚠️ Lỗi khi render bằng hyperframes CLI: ${renderErr.message}`);
      if (renderErr.stdout) console.log(renderErr.stdout);
      if (renderErr.stderr) console.error(renderErr.stderr);
      throw renderErr;
    }

    if (!fs.existsSync(finalOutputPath)) {
      throw new Error(`File video đầu ra không tồn tại tại: ${finalOutputPath}`);
    }

    const stats = fs.statSync(finalOutputPath);
    const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n🎉 ==============================================');
    console.log(`✅ VIDEO HYPERFRAMES ĐÃ ĐƯỢC TẠO THÀNH CÔNG!`);
    console.log(`📁 Đường dẫn file: ${finalOutputPath}`);
    console.log(`📦 Kích thước file: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`⏱️ Thời lượng video: ${totalVideoDuration} giây`);
    console.log(`⚡ Tổng thời gian xử lý: ${totalTimeSec} giây`);
    console.log('==============================================\n');

    return finalOutputPath;
  }
}
