import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getDatabase } from '../database/db.js';
import { StorageFactory } from '../storage/storageFactory.js';
import { generateVideo } from '../services/videoGenerator.js';
import { VideoJobPayload, VIDEO_QUEUE_NAME, getLocalQueueInstance } from '../queue/videoQueue.js';
import { VideoStatus } from '../types/video.js';
import { AppPaths } from '../utils/appPaths.js';

/**
 * Chuyển tiêu đề tiếng Việt thành slug an toàn cho tên file video xuất ra
 */
export function slugifyVideoTitle(title?: string | null, fallback: string = 'video'): string {
  if (!title || !title.trim()) {
    title = fallback;
  }
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  let slug = normalized
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

  if (!slug || slug === '-') {
    slug = 'video';
  }
  if (slug.length > 70) {
    slug = slug.substring(0, 70).replace(/-$/, '');
  }
  return slug;
}

/**
 * Trích xuất ảnh đại diện (Thumbnail / Poster) từ video đã render
 */
async function extractThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
  const ffmpegCmd = AppPaths.getFfmpegPath();

  return new Promise((resolve) => {
    // Trích xuất khung hình tại giây 1.5 của video với chất lượng cao
    const proc = spawn(ffmpegCmd, [
      '-ss', '00:00:01.500',
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2',
      outputPath,
      '-y',
    ]);

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        resolve(true);
      } else {
        // Fallback: trích xuất tại giây 0.1 nếu video quá ngắn hoặc frame đầu
        const fallbackProc = spawn(ffmpegCmd, [
          '-ss', '00:00:00.100',
          '-i', videoPath,
          '-vframes', '1',
          '-q:v', '2',
          outputPath,
          '-y',
        ]);
        fallbackProc.on('close', (fCode) => {
          resolve(fCode === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0);
        });
        fallbackProc.on('error', () => resolve(false));
      }
    });
    proc.on('error', () => resolve(false));
  });
}

/**
 * Làm sạch mọi tiền tố câu lệnh, số giây, hoặc ký tự rác từ prompt của người dùng
 */
export function cleanVideoTitle(raw?: string | null): string {
  if (!raw) return 'Khám Phá Đặc Sản Đất Việt';
  let t = raw.trim();
  // Bỏ các tiền tố câu lệnh tạo video
  t = t.replace(/^Tạo video\s*\d*s?:\s*/i, '');
  t = t.replace(/^Video\s*\d*s?:\s*/i, '');
  t = t.replace(/^Tạo video giới thiệu:\s*/i, '');
  t = t.replace(/^Giới thiệu\s*(về)?:\s*/i, '');
  // Bỏ phần metadata bài viết nếu bị dính
  t = t.replace(/\[Chi tiết từ bài viết[^\]]*\][\s\S]*$/gi, '');
  t = t.replace(/ContentsCó liên quan[\s\S]*$/gi, '');
  // Bỏ dòng thứ 2 trở đi nếu prompt có nhiều dòng
  t = t.split('\n')[0].trim();
  // Bỏ dấu câu cụt ở cuối
  t = t.replace(/[,;–\-\.\:\s]+$/, '').trim();
  if (!t) return 'Khám Phá Đặc Sản Đất Việt';
  return t;
}

/**
 * Tự động tạo caption TikTok chuyên nghiệp, sáng tạo, giàu cảm xúc và chuẩn SEO
 */
export function generateTikTokCaption(params: {
  title: string;
  sourceUrl?: string | null;
  beats?: Array<{ beatNumber?: number; narration?: string; visualIdea?: string; displayHeadline?: string }>;
  fullNarration?: string;
  prompt?: string;
  isAffiliate?: boolean;
  productData?: any;
}): string {
  const { title, sourceUrl, beats, fullNarration, prompt, isAffiliate, productData } = params;

  // 1. Chuẩn hóa tiêu đề sạch sẽ
  const cleanTitle = cleanVideoTitle(title) || cleanVideoTitle(prompt);

  // 2. Nhận diện chủ đề thông minh
  const textCorpus = `${cleanTitle} ${prompt || ''} ${fullNarration || ''}`.toLowerCase();
  const isFood =
    textCorpus.includes('nem') ||
    textCorpus.includes('bánh') ||
    textCorpus.includes('banh') ||
    textCorpus.includes('phở') ||
    textCorpus.includes('pho') ||
    textCorpus.includes('ẩm thực') ||
    textCorpus.includes('am thuc') ||
    textCorpus.includes('đặc sản') ||
    textCorpus.includes('dac san') ||
    textCorpus.includes('món ngon') ||
    textCorpus.includes('kẹo') ||
    textCorpus.includes('keo') ||
    textCorpus.includes('trà') ||
    textCorpus.includes('cà phê');

  const isTravel =
    textCorpus.includes('chùa') ||
    textCorpus.includes('đền') ||
    textCorpus.includes('du lịch') ||
    textCorpus.includes('di tích') ||
    textCorpus.includes('danh thắng') ||
    textCorpus.includes('ninh bình') ||
    textCorpus.includes('tràng an') ||
    textCorpus.includes('cổ kính');

  // 3. Hook mở đầu giật tít chuyên nghiệp chuẩn TikTok (Gây tò mò & giữ chân người xem)
  let hook = '';
  if (isFood) {
    hook = `🥢 [TINH HOA ẨM THỰC] ${cleanTitle.toUpperCase()} 🥢\n🔥 Hương vị thơm ngon nức tiếng, đã ăn một lần là nhớ mãi không quên!`;
  } else if (isTravel) {
    hook = `✨ [ĐIỂM ĐẾN NỔI TIẾNG] ${cleanTitle.toUpperCase()} ✨\n📍 Nơi lưu giữ giá trị lịch sử ngàn năm cùng cảnh sắc tuyệt mỹ!`;
  } else if (isAffiliate || productData) {
    const pName = productData?.name ? cleanVideoTitle(productData.name) : cleanTitle;
    hook = `🛍️ [GÓC REVIEW CHẤT LƯỢNG] ${pName.toUpperCase()} 🛍️\n⚡ Trải nghiệm thực tế cực kỳ đáng tiền, chốt đơn không hối tiếc!`;
  } else {
    hook = `🔥 KHÁM PHÁ NGAY: ${cleanTitle.toUpperCase()} 🔥\n✨ Câu chuyện thú vị và những điều đặc biệt mà bạn nhất định phải biết!`;
  }

  // 4. Thu thập các câu nội dung giá trị từ lời bình (Loại bỏ hoàn toàn vết tích câu lệnh code)
  const candidatePoints: string[] = [];

  if (beats && beats.length > 0) {
    for (const b of beats) {
      const nar = b.narration?.trim();
      if (!nar) continue;
      // Bỏ câu lệnh hoặc metadata
      if (
        nar.toLowerCase().includes('tạo video') ||
        nar.toLowerCase().includes('kịch bản') ||
        nar.toLowerCase().includes('phân cảnh') ||
        nar.toLowerCase().includes('giây:')
      ) {
        continue;
      }
      // Tách câu ngắn gọn
      const sentences = nar.split(/[\.\!\?]/).map((s) => s.trim()).filter((s) => s.length >= 25 && s.length <= 150);
      for (const sent of sentences) {
        if (!candidatePoints.some((p) => p.includes(sent.slice(0, 20)))) {
          candidatePoints.push(sent);
        }
      }
      if (candidatePoints.length >= 3) break;
    }
  }

  // Nếu beats chưa đủ, lấy từ fullNarration hoặc trích xuất từ bài viết một cách tự nhiên
  if (candidatePoints.length < 2 && fullNarration) {
    const sents = fullNarration.split(/[\.\!\?]/).map((s) => s.trim()).filter((s) => s.length >= 30 && s.length <= 140);
    for (const s of sents) {
      if (!candidatePoints.some((p) => p.includes(s.slice(0, 20)))) {
        candidatePoints.push(s);
      }
      if (candidatePoints.length >= 3) break;
    }
  }

  // Nếu vẫn chưa có, trích xuất thông minh từ prompt (loại bỏ sạch tiền tố)
  if (candidatePoints.length < 2 && prompt) {
    const cleanedPrompt = cleanVideoTitle(prompt);
    const pSents = cleanedPrompt.split(/[\.\!\?]/).map((s) => s.trim()).filter((s) => s.length >= 25);
    for (const s of pSents) {
      if (!candidatePoints.some((p) => p.includes(s.slice(0, 20)))) {
        candidatePoints.push(s);
      }
      if (candidatePoints.length >= 3) break;
    }
  }

  // Tạo phần bullet points hấp dẫn
  let bodyContent = '';
  if (candidatePoints.length > 0) {
    const icons = isFood ? ['🍲', '🌿', '🌾'] : isTravel ? ['🏛️', '🌿', '📍'] : ['✨', '💡', '💎'];
    bodyContent =
      `✨ Điểm đặc sắc khiến bạn không thể rời mắt:\n` +
      candidatePoints
        .slice(0, 3)
        .map((p, idx) => `${icons[idx % icons.length]} ${p}.`)
        .join('\n');
  }

  // 5. Call To Action (Kêu gọi hành động) tự nhiên, tăng tương tác
  let cta = '';
  if (isFood) {
    cta = `👉 Bạn đã thưởng thức món này bao giờ chưa? Để lại cảm nhận của bạn dưới phần bình luận nhé!\n❤️ Thả tim và Follow kênh để cùng mình khám phá trọn vẹn ẩm thực 3 miền!`;
  } else if (isTravel) {
    cta = `👉 Lưu ngay video này để lên kế hoạch ghé thăm cùng hội bạn thân nhé!\n❤️ Thả tim và Follow kênh để đón xem những địa điểm tuyệt đẹp tiếp theo!`;
  } else if (isAffiliate || productData) {
    cta = `👉 Tham khảo thông tin chi tiết và link ưu đãi tại phần bình luận / bio nhé!\n❤️ Nhớ Thả tim và Follow kênh để săn thêm nhiều sản phẩm chất lượng!`;
  } else {
    cta = `👉 Bạn thấy điều này như thế nào? Bình luận chia sẻ góc nhìn cùng mình nhé!\n❤️ Thả tim và Follow kênh để cập nhật những video mới nhất mỗi ngày!`;
  }

  // 6. Ghi rõ nguồn bài viết tham khảo trang trọng, minh bạch
  let sourceText = '';
  if (sourceUrl && sourceUrl.trim()) {
    try {
      const urlObj = new URL(sourceUrl.trim());
      const domain = urlObj.hostname.replace(/^www\./, '');
      sourceText = `\n📖 Nguồn thông tin tham khảo từ ${domain}:\n🔗 ${sourceUrl.trim()}`;
    } catch {
      sourceText = `\n📖 Nguồn bài viết tham khảo:\n🔗 ${sourceUrl.trim()}`;
    }
  }

  // 7. Tạo bộ Hashtags phân cấp chuẩn thuật toán TikTok
  const hashtags = new Set<string>(['#xuhuong', '#fyp', '#viral', '#trending']);

  if (isFood) {
    hashtags.add('#amthucvietnam');
    hashtags.add('#dacsanvietnam');
    hashtags.add('#reviewamthuc');
    hashtags.add('#monngondatviet');
    hashtags.add('#foodfestontiktok');
    hashtags.add('#anngonmoingay');
    if (textCorpus.includes('nam dinh') || textCorpus.includes('nam định') || textCorpus.includes('giao thuy') || textCorpus.includes('giao thủy')) {
      hashtags.add('#dacsannamdinh');
      hashtags.add('#nemnamgiaothuy');
    }
    if (textCorpus.includes('ninh binh') || textCorpus.includes('ninh bình')) {
      hashtags.add('#dacsanninhbinh');
    }
    if (textCorpus.includes('banh nhan') || textCorpus.includes('bánh nhãn')) {
      hashtags.add('#banhnhan');
    }
    if (textCorpus.includes('pho') || textCorpus.includes('phở')) {
      hashtags.add('#phovietnam');
    }
  } else if (isTravel) {
    hashtags.add('#dulichvietnam');
    hashtags.add('#canhdepvietnam');
    hashtags.add('#khamphavietnam');
    hashtags.add('#traveltiktok');
    hashtags.add('#diadiemdulich');
  } else if (isAffiliate || productData) {
    hashtags.add('#reviewhang');
    hashtags.add('#giamgia');
    hashtags.add('#affiliatemarketing');
    hashtags.add('#shopeehaul');
    hashtags.add('#sanphamhot');
  } else {
    hashtags.add('#khampha');
    hashtags.add('#tintuc');
    hashtags.add('#kienthucthuvi');
    hashtags.add('#chuyendocla');
  }

  return `${hook}\n\n${bodyContent ? bodyContent + '\n\n' : ''}${cta}${sourceText}\n\n${Array.from(hashtags).join(' ')}`;
}

export async function processVideoJob(payload: VideoJobPayload, reportProgress?: (percent: number) => Promise<void>) {
  dotenv.config({ override: true });
  const { jobId, videoId, options } = payload;
  const db = await getDatabase();
  const storage = StorageFactory.getProvider();

  console.log(`\n======================================================`);
  console.log(`🚀 [Worker] Bắt đầu xử lý Video Job: ${jobId} (Video: ${videoId})`);
  console.log(`======================================================\n`);

  // Tạo thư mục tạm riêng biệt cho từng job: temp/video-jobs/{jobId}
  const baseTempRoot = path.resolve(process.env.TEMP_DIR || './temp');
  const jobTempDir = path.join(baseTempRoot, 'video-jobs', jobId);

  if (!fs.existsSync(jobTempDir)) {
    fs.mkdirSync(jobTempDir, { recursive: true });
  }

  const vNum = payload.versionNumber || 1;
  const versionId = payload.versionId;

  try {
    // Cập nhật trạng thái bắt đầu
    await db.updateVideoProgress(videoId, 5, 'queued', 'queued');
    const jobRecord = await db.getJobByVideoId(videoId);
    if (jobRecord) {
      await db.updateJobStatus(jobRecord.id, 'queued');
    }

    // Chạy generateVideo
    const result = await generateVideo(
      {
        ...options,
        jobId,
        operation: payload.operation || options.operation,
        versionId: payload.versionId || options.versionId,
        versionNumber: payload.versionNumber || options.versionNumber,
        baseVideoId: payload.baseVideoId || options.baseVideoId,
        baseVersionId: payload.baseVersionId || options.baseVersionId,
        feedback: payload.feedback || options.feedback,
        revisionScope: payload.revisionScope || options.revisionScope,
        tempDir: jobTempDir,
        outputFile: `final.mp4`,
      },
      async (step: VideoStatus, percent: number, message?: string) => {
        console.log(`[Job ${jobId}] [${percent}%] (${step}): ${message || ''}`);
        await db.updateVideoProgress(videoId, percent, step, step);
        if (reportProgress) {
          await reportProgress(percent);
        }
      }
    );

    // Xác định tiêu đề video chuẩn hóa từ approvedScript hoặc prompt (loại bỏ mọi tiền tố kỹ thuật)
    const rawTitle =
      result.approvedScript?.title ||
      options.userInputData?.topic ||
      options.prompt ||
      'video';
    const videoTitle = cleanVideoTitle(rawTitle);

    // Đặt tên file video riêng theo tiêu đề video (không còn dùng final.mp4 chung chung)
    const titleSlug = slugifyVideoTitle(videoTitle);
    const customVideoFileName = `${titleSlug}.mp4`;
    const customThumbFileName = `${titleSlug}_thumb.jpg`;

    // Destination paths trong storage
    const destinationKey = path.join(videoId, `v${vNum}`, customVideoFileName).replace(/\\/g, '/');
    const thumbDestinationKey = path.join(videoId, `v${vNum}`, customThumbFileName).replace(/\\/g, '/');

    // Bước Uploading Video
    console.log(`[Job ${jobId}] 📤 Đang upload MP4 với tên riêng (${customVideoFileName}) lên storage provider (${storage.name})...`);
    await db.updateVideoProgress(videoId, 92, 'uploading', 'uploading');

    const outputUrl = await storage.uploadFile(result.videoPath, destinationKey);
    console.log(`[Job ${jobId}] 🔗 Video Output URL: ${outputUrl}`);

    // Bước tạo và upload ảnh đại diện (Thumbnail) của video
    let thumbnailUrl: string | null = null;
    try {
      console.log(`[Job ${jobId}] 📸 Đang trích xuất ảnh đại diện thumbnail từ video...`);
      const localThumbPath = path.join(jobTempDir, customThumbFileName);
      const thumbSuccess = await extractThumbnail(result.videoPath, localThumbPath);
      if (thumbSuccess && fs.existsSync(localThumbPath)) {
        thumbnailUrl = await storage.uploadFile(localThumbPath, thumbDestinationKey);
        console.log(`[Job ${jobId}] 🖼️ Video Thumbnail URL: ${thumbnailUrl}`);
      }
    } catch (thumbErr: any) {
      console.warn(`[Job ${jobId}] ⚠️ Không thể tạo ảnh thumbnail:`, thumbErr.message);
    }

    // Tự động tạo caption đăng TikTok chuyên nghiệp, sáng tạo kèm trích dẫn nguồn bài viết
    const beatsForCaption =
      result.approvedScript?.allBeats ||
      result.approvedScript?.beats ||
      (result.approvedScript?.opening
        ? [result.approvedScript.opening, ...(result.approvedScript.beats || []), result.approvedScript.ending].filter(Boolean)
        : []) ||
      options.userInputData?.scriptBeats ||
      [];

    const tiktokCaption = generateTikTokCaption({
      title: videoTitle,
      sourceUrl: options.url,
      beats: beatsForCaption,
      fullNarration: result.approvedScript?.fullNarration,
      prompt: options.prompt,
      isAffiliate: options.isAffiliate,
      productData: options.productData,
    });

    // Cập nhật trạng thái hoàn thành vào Database kèm thumbnail, tiêu đề và caption TikTok
    await db.updateVideoCompleted(videoId, outputUrl, {
      thumbnailUrl,
      title: videoTitle,
      tiktokCaption,
    });

    if (versionId) {
      await db.updateVersionCompleted(versionId, outputUrl, {
        approvedScript: result.approvedScript,
        storyboard: result.storyboard,
        assets: result.assets,
        audioReport: result.audioReport,
        renderManifest: result.renderManifest,
      });
    }
    if (jobRecord) {
      await db.updateJobStatus(jobRecord.id, 'completed');
    }

    console.log(`✅ [Job ${jobId}] Video đã hoàn thành thành công 100%!`);

    // Dọn dẹp thư mục tạm của job
    cleanupTempDirectory(jobTempDir);

    return { success: true, videoId, versionId, versionNumber: vNum, outputUrl, thumbnailUrl, title: videoTitle, tiktokCaption };
  } catch (error: any) {
    const errorMsg = error.message || 'Lỗi không xác định khi tạo video';
    console.error(`❌ [Job ${jobId}] Thất bại: ${errorMsg}`);

    await db.updateVideoFailed(videoId, errorMsg);
    if (versionId) {
      await db.updateVersionFailed(versionId, errorMsg);
    }
    const jobRecord = await db.getJobByVideoId(videoId);
    if (jobRecord) {
      await db.updateJobStatus(jobRecord.id, 'failed', errorMsg);
    }

    // Dọn dẹp thư mục tạm ngay cả khi thất bại
    cleanupTempDirectory(jobTempDir);

    throw error;
  }
}

function cleanupTempDirectory(tempDir: string) {
  try {
    if (fs.existsSync(tempDir)) {
      console.log(`🧹 [Cleanup] Đang dọn dẹp file render video tạm: ${tempDir}`);
      const items = fs.readdirSync(tempDir);
      for (const item of items) {
        if (item === 'audio' || item === 'assets' || item === 'artifacts') {
          // Bảo lưu audio, assets và artifacts cho các phiên revision kế tiếp
          continue;
        }
        const fullPath = path.join(tempDir, item);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  } catch (cleanupErr: any) {
    console.warn(`⚠️ [Cleanup] Không thể xoá thư mục tạm ${tempDir}:`, cleanupErr.message);
  }
}

export async function startWorker() {
  const concurrency = parseInt(process.env.VIDEO_WORKER_CONCURRENCY || '1', 10);
  console.log(`👷 Đang khởi chạy Video Worker (Concurrency: ${concurrency})...`);

  // Nếu hệ thống đang dùng Local In-Process Queue, không kết nối Redis BullMQ Worker
  const localQueue = getLocalQueueInstance();
  if (localQueue) {
    localQueue.setHandler(async (payload) => {
      await processVideoJob(payload);
    });
    console.log(`✅ In-Process Worker Handler đã sẵn sàng nhận jobs.`);
    return null;
  }

  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;

  let bullWorker: Worker | null = null;

  if (redisUrl || (redisHost && process.env.USE_REDIS === 'true')) {
    try {
      const redis = redisUrl
        ? new Redis(redisUrl, { maxRetriesPerRequest: null })
        : new Redis({
            host: redisHost || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            maxRetriesPerRequest: null,
          });

      bullWorker = new Worker(
        VIDEO_QUEUE_NAME,
        async (job: Job<VideoJobPayload>) => {
          return processVideoJob(job.data, async (percent) => {
            await job.updateProgress(percent);
          });
        },
        {
          // @ts-ignore
          connection: redis,
          concurrency,
        }
      );

      bullWorker.on('completed', (job) => {
        console.log(`🎉 [BullMQ Worker] Job ${job.id} đã hoàn thành.`);
      });

      bullWorker.on('failed', (job, err) => {
        console.error(`💥 [BullMQ Worker] Job ${job?.id} thất bại: ${err.message}`);
      });

      console.log(`✅ BullMQ Worker đã sẵn sàng nhận jobs từ Redis!`);
      return bullWorker;
    } catch (err: any) {
      console.warn(`⚠️ Không thể kết nối Redis Worker (${err.message}).`);
    }
  }

  return null;
}
