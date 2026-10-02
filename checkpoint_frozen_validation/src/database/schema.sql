-- Schema PostgreSQL cho Multi-user AI Video Generation Web Application

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  url TEXT,
  duration INT NOT NULL DEFAULT 30,
  aspect_ratio VARCHAR(10) NOT NULL DEFAULT '9:16',
  voice VARCHAR(64) NOT NULL DEFAULT 'vi-VN-HoaiMyNeural',
  style VARCHAR(64) NOT NULL DEFAULT 'Modern Tech',
  caption_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  bgm_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  engine VARCHAR(32) NOT NULL DEFAULT 'hyperframes',
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  progress INT NOT NULL DEFAULT 0,
  current_step VARCHAR(64) NOT NULL DEFAULT 'queued',
  output_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_jobs (
  id VARCHAR(64) PRIMARY KEY,
  video_id VARCHAR(64) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  bull_job_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_versions (
  id VARCHAR(64) PRIMARY KEY,
  video_id VARCHAR(64) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  parent_version_id VARCHAR(64) REFERENCES video_versions(id) ON DELETE SET NULL,
  original_prompt TEXT NOT NULL,
  feedback TEXT,
  revision_scope VARCHAR(32),
  approved_script JSONB,
  storyboard JSONB,
  assets JSONB,
  audio_report JSONB,
  render_manifest JSONB,
  output_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_video_id ON video_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_versions_video_id ON video_versions(video_id);

