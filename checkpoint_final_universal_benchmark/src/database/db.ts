import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { User, VideoRecord, VideoJobRecord, VideoStatus, AspectRatio, VideoEngine } from '../types/video.js';
import { VideoVersionRecord } from '../types/jobContext.js';

const { Pool } = pg;

export interface IDatabaseService {
  init(): Promise<void>;
  // Users
  createUser(user: { id: string; email: string; password_hash: string; name: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;

  // Videos
  createVideo(video: {
    id: string;
    user_id: string;
    prompt: string;
    url?: string | null;
    duration: number;
    aspect_ratio: AspectRatio;
    voice: string;
    style: string;
    caption_enabled: boolean;
    bgm_enabled: boolean;
    engine: VideoEngine;
    font_family?: string;
    transition_effect?: string;
    hide_title?: boolean;
    eco_mode?: boolean;
    visual_style?: string;
    is_affiliate?: boolean;
    product_data?: any;
  }): Promise<VideoRecord>;

  getVideoById(id: string, userId?: string): Promise<VideoRecord | null>;
  getVideosByUserId(userId: string): Promise<VideoRecord[]>;
  updateVideoProgress(id: string, progress: number, currentStep: string, status?: VideoStatus): Promise<void>;
  updateVideoCompleted(id: string, outputUrl: string): Promise<void>;
  updateVideoFailed(id: string, errorMessage: string): Promise<void>;
  deleteVideo(id: string, userId: string): Promise<boolean>;

  // Video Jobs
  createJob(job: { id: string; video_id: string; bull_job_id?: string }): Promise<VideoJobRecord>;
  getJobByVideoId(videoId: string): Promise<VideoJobRecord | null>;
  updateJobStatus(id: string, status: VideoStatus, error?: string): Promise<void>;

  // Video Versions (Section 12)
  createVersion(version: VideoVersionRecord): Promise<VideoVersionRecord>;
  getVersionById(id: string): Promise<VideoVersionRecord | null>;
  getVersionsByVideoId(videoId: string): Promise<VideoVersionRecord[]>;
  getLatestVersionByVideoId(videoId: string): Promise<VideoVersionRecord | null>;
  updateVersionCompleted(id: string, outputUrl: string, data?: Partial<VideoVersionRecord>): Promise<void>;
  updateVersionFailed(id: string, error: string): Promise<void>;
}

/**
 * PostgreSQL Database Service
 */
export class PostgresDatabaseService implements IDatabaseService {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_video_db',
    });
  }

  async init(): Promise<void> {
    const schemaPath = path.resolve('src/database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await this.pool.query(sql);
    }
  }

  async createUser(u: { id: string; email: string; password_hash: string; name: string }): Promise<User> {
    const res = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [u.id, u.email.toLowerCase(), u.password_hash, u.name]
    );
    return res.rows[0];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    return res.rows[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await this.pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async createVideo(v: {
    id: string;
    user_id: string;
    prompt: string;
    url?: string | null;
    duration: number;
    aspect_ratio: AspectRatio;
    voice: string;
    style: string;
    caption_enabled: boolean;
    bgm_enabled: boolean;
    engine: VideoEngine;
  }): Promise<VideoRecord> {
    const res = await this.pool.query(
      `INSERT INTO videos (
        id, user_id, prompt, url, duration, aspect_ratio, voice, style,
        caption_enabled, bgm_enabled, engine, status, progress, current_step,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'queued', 0, 'queued', NOW(), NOW())
      RETURNING *`,
      [
        v.id,
        v.user_id,
        v.prompt,
        v.url || null,
        v.duration,
        v.aspect_ratio,
        v.voice,
        v.style,
        v.caption_enabled,
        v.bgm_enabled,
        v.engine,
      ]
    );
    return res.rows[0];
  }

  async getVideoById(id: string, userId?: string): Promise<VideoRecord | null> {
    let query = `SELECT * FROM videos WHERE id = $1`;
    const params: any[] = [id];
    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }
    const res = await this.pool.query(query, params);
    return res.rows[0] || null;
  }

  async getVideosByUserId(userId: string): Promise<VideoRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM videos WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  async updateVideoProgress(id: string, progress: number, currentStep: string, status?: VideoStatus): Promise<void> {
    await this.pool.query(
      `UPDATE videos
       SET progress = $1, current_step = $2, status = COALESCE($3, status), updated_at = NOW()
       WHERE id = $4`,
      [progress, currentStep, status || null, id]
    );
  }

  async updateVideoCompleted(id: string, outputUrl: string): Promise<void> {
    await this.pool.query(
      `UPDATE videos
       SET status = 'completed', progress = 100, current_step = 'completed', output_url = $1, updated_at = NOW()
       WHERE id = $2`,
      [outputUrl, id]
    );
  }

  async updateVideoFailed(id: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `UPDATE videos
       SET status = 'failed', current_step = 'failed', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [errorMessage, id]
    );
  }

  async deleteVideo(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM videos WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (res.rowCount || 0) > 0;
  }

  async createJob(job: { id: string; video_id: string; bull_job_id?: string }): Promise<VideoJobRecord> {
    const res = await this.pool.query(
      `INSERT INTO video_jobs (id, video_id, bull_job_id, status, attempts, created_at)
       VALUES ($1, $2, $3, 'queued', 1, NOW())
       RETURNING *`,
      [job.id, job.video_id, job.bull_job_id || null]
    );
    return res.rows[0];
  }

  async getJobByVideoId(videoId: string): Promise<VideoJobRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM video_jobs WHERE video_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [videoId]
    );
    return res.rows[0] || null;
  }

  async updateJobStatus(id: string, status: VideoStatus, error?: string): Promise<void> {
    await this.pool.query(
      `UPDATE video_jobs
       SET status = $1, error = $2, finished_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [status, error || null, id]
    );
  }

  async createVersion(v: VideoVersionRecord): Promise<VideoVersionRecord> {
    const res = await this.pool.query(
      `INSERT INTO video_versions (
         id, video_id, version_number, parent_version_id, original_prompt,
         feedback, revision_scope, approved_script, storyboard, assets,
         audio_report, render_manifest, output_url, status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *`,
      [
        v.id,
        v.videoId,
        v.versionNumber,
        v.parentVersionId || null,
        v.originalPrompt,
        v.feedback || null,
        v.revisionScope || null,
        v.approvedScript ? JSON.stringify(v.approvedScript) : null,
        v.storyboard ? JSON.stringify(v.storyboard) : null,
        v.assets ? JSON.stringify(v.assets) : null,
        v.audioReport ? JSON.stringify(v.audioReport) : null,
        v.renderManifest ? JSON.stringify(v.renderManifest) : null,
        v.outputUrl || null,
        v.status,
      ]
    );
    return res.rows[0];
  }

  async getVersionById(id: string): Promise<VideoVersionRecord | null> {
    const res = await this.pool.query(`SELECT * FROM video_versions WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async getVersionsByVideoId(videoId: string): Promise<VideoVersionRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM video_versions WHERE video_id = $1 ORDER BY version_number ASC`,
      [videoId]
    );
    return res.rows;
  }

  async getLatestVersionByVideoId(videoId: string): Promise<VideoVersionRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM video_versions WHERE video_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [videoId]
    );
    return res.rows[0] || null;
  }

  async updateVersionCompleted(
    id: string,
    outputUrl: string,
    data?: Partial<VideoVersionRecord>
  ): Promise<void> {
    if (data) {
      await this.pool.query(
        `UPDATE video_versions SET
           output_url = $1,
           status = 'completed',
           approved_script = COALESCE($3, approved_script),
           storyboard = COALESCE($4, storyboard),
           assets = COALESCE($5, assets),
           audio_report = COALESCE($6, audio_report),
           render_manifest = COALESCE($7, render_manifest)
         WHERE id = $2`,
        [
          outputUrl,
          id,
          data.approvedScript ? JSON.stringify(data.approvedScript) : null,
          data.storyboard ? JSON.stringify(data.storyboard) : null,
          data.assets ? JSON.stringify(data.assets) : null,
          data.audioReport ? JSON.stringify(data.audioReport) : null,
          data.renderManifest ? JSON.stringify(data.renderManifest) : null,
        ]
      );
    } else {
      await this.pool.query(
        `UPDATE video_versions SET output_url = $1, status = 'completed' WHERE id = $2`,
        [outputUrl, id]
      );
    }
  }

  async updateVersionFailed(id: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE video_versions SET status = 'failed' WHERE id = $1`,
      [id]
    );
  }
}

/**
 * File/Memory-backed Database Service (Fallback cho local development khi PostgreSQL chưa cài)
 */
export class LocalJsonDatabaseService implements IDatabaseService {
  private filePath: string;
  private data: {
    users: User[];
    videos: VideoRecord[];
    video_jobs: VideoJobRecord[];
    video_versions: VideoVersionRecord[];
  };

  constructor(dbPath?: string) {
    this.filePath = path.resolve(dbPath || './data/local_db.json');
    this.data = { users: [], videos: [], video_jobs: [], video_versions: [] };
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
        if (!this.data.video_versions) this.data.video_versions = [];
      } catch {
        this.data = { users: [], videos: [], video_jobs: [], video_versions: [] };
      }
    } else {
      this.save();
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async createUser(u: { id: string; email: string; password_hash: string; name: string }): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: u.id,
      email: u.email.toLowerCase(),
      password_hash: u.password_hash,
      name: u.name,
      created_at: now,
      updated_at: now,
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.data.users.find((u) => u.id === id) || null;
  }

  async createVideo(v: {
    id: string;
    user_id: string;
    prompt: string;
    url?: string | null;
    duration: number;
    aspect_ratio: AspectRatio;
    voice: string;
    style: string;
    caption_enabled: boolean;
    bgm_enabled: boolean;
    engine: VideoEngine;
    font_family?: string;
    transition_effect?: string;
    hide_title?: boolean;
    eco_mode?: boolean;
    visual_style?: string;
    is_affiliate?: boolean;
    product_data?: any;
  }): Promise<VideoRecord> {
    const now = new Date().toISOString();
    const video: VideoRecord = {
      id: v.id,
      user_id: v.user_id,
      prompt: v.prompt,
      url: v.url || null,
      duration: v.duration,
      aspect_ratio: v.aspect_ratio,
      voice: v.voice,
      style: v.style,
      caption_enabled: v.caption_enabled,
      bgm_enabled: v.bgm_enabled,
      engine: v.engine,
      font_family: v.font_family,
      transition_effect: v.transition_effect,
      hide_title: v.hide_title,
      eco_mode: v.eco_mode,
      visual_style: v.visual_style,
      is_affiliate: v.is_affiliate,
      product_data: v.product_data,
      status: 'queued',
      progress: 0,
      current_step: 'queued',
      output_url: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    };
    this.data.videos.unshift(video);
    this.save();
    return video;
  }

  async getVideoById(id: string, userId?: string): Promise<VideoRecord | null> {
    const video = this.data.videos.find((v) => v.id === id);
    if (!video) return null;
    if (userId && video.user_id !== userId) return null;
    return video;
  }

  async getVideosByUserId(userId: string): Promise<VideoRecord[]> {
    return this.data.videos.filter((v) => v.user_id === userId);
  }

  async updateVideoProgress(id: string, progress: number, currentStep: string, status?: VideoStatus): Promise<void> {
    const video = this.data.videos.find((v) => v.id === id);
    if (video) {
      video.progress = progress;
      video.current_step = currentStep;
      if (status) video.status = status;
      video.updated_at = new Date().toISOString();
      this.save();
    }
  }

  async updateVideoCompleted(id: string, outputUrl: string): Promise<void> {
    const video = this.data.videos.find((v) => v.id === id);
    if (video) {
      video.status = 'completed';
      video.progress = 100;
      video.current_step = 'completed';
      video.output_url = outputUrl;
      video.updated_at = new Date().toISOString();
      this.save();
    }
  }

  async updateVideoFailed(id: string, errorMessage: string): Promise<void> {
    const video = this.data.videos.find((v) => v.id === id);
    if (video) {
      video.status = 'failed';
      video.current_step = 'failed';
      video.error_message = errorMessage;
      video.updated_at = new Date().toISOString();
      this.save();
    }
  }

  async deleteVideo(id: string, userId: string): Promise<boolean> {
    const index = this.data.videos.findIndex((v) => v.id === id && v.user_id === userId);
    if (index >= 0) {
      this.data.videos.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  async createJob(job: { id: string; video_id: string; bull_job_id?: string }): Promise<VideoJobRecord> {
    const record: VideoJobRecord = {
      id: job.id,
      video_id: job.video_id,
      bull_job_id: job.bull_job_id || null,
      status: 'queued',
      attempts: 1,
      error: null,
      started_at: null,
      finished_at: null,
      created_at: new Date().toISOString(),
    };
    this.data.video_jobs.push(record);
    this.save();
    return record;
  }

  async getJobByVideoId(videoId: string): Promise<VideoJobRecord | null> {
    const jobs = this.data.video_jobs.filter((j) => j.video_id === videoId);
    return jobs[jobs.length - 1] || null;
  }

  async updateJobStatus(id: string, status: VideoStatus, error?: string): Promise<void> {
    const job = this.data.video_jobs.find((j) => j.id === id);
    if (job) {
      job.status = status;
      if (error) job.error = error;
      if (status === 'completed' || status === 'failed') {
        job.finished_at = new Date().toISOString();
      }
      this.save();
    }
  }

  async createVersion(v: VideoVersionRecord): Promise<VideoVersionRecord> {
    if (!this.data.video_versions) this.data.video_versions = [];
    this.data.video_versions.push(v);
    this.save();
    return v;
  }

  async getVersionById(id: string): Promise<VideoVersionRecord | null> {
    if (!this.data.video_versions) return null;
    return this.data.video_versions.find((v) => v.id === id) || null;
  }

  async getVersionsByVideoId(videoId: string): Promise<VideoVersionRecord[]> {
    if (!this.data.video_versions) return [];
    return this.data.video_versions
      .filter((v) => v.videoId === videoId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async getLatestVersionByVideoId(videoId: string): Promise<VideoVersionRecord | null> {
    const list = await this.getVersionsByVideoId(videoId);
    return list[list.length - 1] || null;
  }

  async updateVersionCompleted(
    id: string,
    outputUrl: string,
    data?: Partial<VideoVersionRecord>
  ): Promise<void> {
    if (!this.data.video_versions) return;
    const v = this.data.video_versions.find((x) => x.id === id);
    if (v) {
      v.outputUrl = outputUrl;
      v.status = 'completed';
      if (data?.approvedScript) v.approvedScript = data.approvedScript;
      if (data?.storyboard) v.storyboard = data.storyboard;
      if (data?.assets) v.assets = data.assets;
      if (data?.audioReport) v.audioReport = data.audioReport;
      if (data?.renderManifest) v.renderManifest = data.renderManifest;
      await this.save();
    }
  }

  async updateVersionFailed(id: string, error: string): Promise<void> {
    if (!this.data.video_versions) return;
    const v = this.data.video_versions.find((x) => x.id === id);
    if (v) {
      v.status = 'failed';
      this.save();
    }
  }
}

let dbInstance: IDatabaseService | null = null;

export async function getDatabase(): Promise<IDatabaseService> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    try {
      console.log('🐘 Đang kết nối tới PostgreSQL...');
      const pgDb = new PostgresDatabaseService(dbUrl);
      await pgDb.init();
      console.log('✅ Đã kết nối PostgreSQL thành công!');
      dbInstance = pgDb;
      return dbInstance;
    } catch (err: any) {
      console.warn(`⚠️ Không thể kết nối PostgreSQL (${err.message}). Chuyển sang Local Database fallback.`);
    }
  }

  console.log('💾 Khởi động Local Database (data/local_db.json)...');
  const localDb = new LocalJsonDatabaseService();
  await localDb.init();
  dbInstance = localDb;
  return dbInstance;
}
