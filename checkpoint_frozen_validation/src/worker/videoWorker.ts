import fs from 'fs';
import path from 'path';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getDatabase } from '../database/db.js';
import { StorageFactory } from '../storage/storageFactory.js';
import { generateVideo } from '../services/videoGenerator.js';
import { VideoJobPayload, VIDEO_QUEUE_NAME, getLocalQueueInstance } from '../queue/videoQueue.js';
import { VideoStatus } from '../types/video.js';

export async function processVideoJob(payload: VideoJobPayload, reportProgress?: (percent: number) => Promise<void>) {
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

  // Section 16: Versioned destination path: {videoId}/v{versionNumber}/final.mp4
  const destinationKey = path.join(videoId, `v${vNum}`, 'final.mp4').replace(/\\/g, '/');

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

    // Bước Uploading
    console.log(`[Job ${jobId}] 📤 Đang upload MP4 lên storage provider (${storage.name})...`);
    await db.updateVideoProgress(videoId, 95, 'uploading', 'uploading');

    const outputUrl = await storage.uploadFile(result.videoPath, destinationKey);
    console.log(`[Job ${jobId}] 🔗 Video Output URL: ${outputUrl}`);

    // Cập nhật trạng thái hoàn thành vào Database
    await db.updateVideoCompleted(videoId, outputUrl);
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

    return { success: true, videoId, versionId, versionNumber: vNum, outputUrl };
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
      console.log(`🧹 [Cleanup] Đang xoá thư mục tạm: ${tempDir}`);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (cleanupErr: any) {
    console.warn(`⚠️ [Cleanup] Không thể xoá thư mục tạm ${tempDir}:`, cleanupErr.message);
  }
}

export async function startWorker() {
  const concurrency = parseInt(process.env.VIDEO_WORKER_CONCURRENCY || '1', 10);
  console.log(`👷 Đang khởi chạy Video Worker (Concurrency: ${concurrency})...`);

  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;

  let bullWorker: Worker | null = null;

  if (redisUrl || redisHost) {
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
      console.warn(`⚠️ Không thể kết nối Redis Worker (${err.message}). Sử dụng In-Process Queue Worker.`);
    }
  }

  // Kết nối Local Queue Processor
  const localQueue = getLocalQueueInstance();
  if (localQueue) {
    localQueue.setHandler(async (payload) => {
      await processVideoJob(payload);
    });
    console.log(`✅ In-Process Worker Handler đã sẵn sàng nhận jobs.`);
  }

  return null;
}
