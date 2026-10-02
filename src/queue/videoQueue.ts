import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { GenerateVideoOptions } from '../types/video.js';

export interface VideoJobPayload {
  jobId: string;
  videoId: string;
  userId: string;
  versionId?: string;
  versionNumber?: number;
  operation?: 'CREATE_NEW' | 'REVISE_EXISTING';
  baseVideoId?: string;
  baseVersionId?: string;
  feedback?: string;
  revisionScope?: 'AUTO' | 'SCRIPT' | 'VISUAL' | 'VOICE' | 'CAPTION' | 'FULL';
  options: GenerateVideoOptions;
}

export const VIDEO_QUEUE_NAME = 'video-generation-queue';

export interface IVideoQueue {
  addJob(jobId: string, payload: VideoJobPayload): Promise<void>;
  close(): Promise<void>;
}

class BullMQVideoQueue implements IVideoQueue {
  private queue: Queue;

  constructor(redisConnection: Redis) {
    this.queue = new Queue(VIDEO_QUEUE_NAME, {
      // @ts-ignore
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  async addJob(jobId: string, payload: VideoJobPayload): Promise<void> {
    await this.queue.add(jobId, payload, { jobId });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

class LocalVideoQueue implements IVideoQueue {
  private handler?: (payload: VideoJobPayload) => Promise<void>;
  private queueItems: VideoJobPayload[] = [];
  private isProcessing = false;

  public setHandler(handler: (payload: VideoJobPayload) => Promise<void>) {
    this.handler = handler;
    this.processNext();
  }

  async addJob(jobId: string, payload: VideoJobPayload): Promise<void> {
    console.log(`[LocalQueue] Thêm job ${jobId} vào hàng đợi xử lý...`);
    this.queueItems.push(payload);
    setTimeout(() => this.processNext(), 100);
  }

  private async processNext() {
    if (this.isProcessing || !this.handler || this.queueItems.length === 0) {
      return;
    }
    this.isProcessing = true;
    const item = this.queueItems.shift();
    if (item) {
      try {
        await this.handler(item);
      } catch (err: any) {
        console.error(`[LocalQueue] Lỗi khi xử lý job ${item.jobId}:`, err.message);
      }
    }
    this.isProcessing = false;
    if (this.queueItems.length > 0) {
      setTimeout(() => this.processNext(), 100);
    }
  }

  async close(): Promise<void> {
    this.queueItems = [];
  }
}

let queueInstance: IVideoQueue | null = null;
let localQueueInstance: LocalVideoQueue | null = null;

export async function getVideoQueue(): Promise<IVideoQueue> {
  if (queueInstance) {
    return queueInstance;
  }

  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl || (redisHost && process.env.USE_REDIS === 'true')) {
    try {
      console.log('🔴 Đang kết nối tới Redis cho BullMQ...');
      const redis = redisUrl
        ? new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            connectTimeout: 2000,
            retryStrategy: () => null,
            lazyConnect: true,
          })
        : new Redis({
            host: redisHost || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            maxRetriesPerRequest: null,
            connectTimeout: 2000,
            retryStrategy: () => null,
            lazyConnect: true,
          });

      redis.on('error', () => {
        // Tránh unhandled error event trong môi trường standalone không có Redis
      });

      await Promise.race([
        redis.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000)),
      ]);

      await redis.ping();

      console.log('✅ Đã kết nối Redis BullMQ thành công!');
      queueInstance = new BullMQVideoQueue(redis);
      return queueInstance;
    } catch (err: any) {
      console.warn(`⚠️ Không thể kết nối Redis (${err.message}). Chuyển sang In-Process Queue.`);
    }
  }

  console.log('⚡ Sử dụng In-Process Queue cho development/local.');
  localQueueInstance = new LocalVideoQueue();
  queueInstance = localQueueInstance;
  return queueInstance;
}

export function getLocalQueueInstance(): LocalVideoQueue | null {
  return localQueueInstance;
}
