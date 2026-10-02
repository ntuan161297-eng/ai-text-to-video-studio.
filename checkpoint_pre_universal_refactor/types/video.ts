export type VideoStatus =
  | 'queued'
  | 'writing_script'
  | 'generating_voice'
  | 'generating_visuals'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'failed';

export type VideoProgressStep =
  | 'queued'
  | 'writing_script'
  | 'generating_voice'
  | 'generating_visuals'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'failed';

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type VideoDuration = 15 | 30 | 45 | 60;
export type VideoEngine = 'hyperframes' | 'remotion';

export interface GenerateVideoOptions {
  prompt: string;
  url?: string;
  duration?: number;
  aspectRatio?: AspectRatio;
  voice?: string;
  style?: string;
  caption?: boolean;
  bgm?: boolean;
  engine?: VideoEngine;
  fontFamily?: string;
  ecoMode?: boolean;
  hideTitle?: boolean;
  transitionEffect?: '3d_flycam' | '3d_tilt' | 'cinematic_zoom' | 'dynamic_whip';
  visualStyle?: 'realistic' | 'animation' | 'bright' | 'ecommerce';
  isAffiliate?: boolean;
  productData?: {
    name?: string;
    price?: string;
    discount?: string;
    imageUrl?: string;
    affiliateUrl?: string;
  };
  outputFile?: string;
  outputDir?: string;
  tempDir?: string;
  jobId?: string;
  ttsProvider?: string;
  llmProvider?: string;
  visualProvider?: string;
  operation?: 'CREATE_NEW' | 'REVISE_EXISTING';
  versionId?: string;
  versionNumber?: number;
  baseVideoId?: string;
  baseVersionId?: string;
  feedback?: string;
  revisionScope?: 'AUTO' | 'SCRIPT' | 'VISUAL' | 'VOICE' | 'CAPTION' | 'FULL';
}

export interface ProgressCallback {
  (step: VideoProgressStep, percent: number, message?: string): Promise<void> | void;
}

export interface GenerateVideoResult {
  videoPath: string;
  fileName: string;
  duration: number;
  width: number;
  height: number;
  fileSizeBytes: number;
  approvedScript?: any;
  storyboard?: any;
  assets?: any;
  audioReport?: any;
  renderManifest?: any;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface VideoRecord {
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
  visual_style?: string;
  hide_title?: boolean;
  eco_mode?: boolean;
  is_affiliate?: boolean;
  product_data?: any;
  status: VideoStatus;
  progress: number;
  current_step: string;
  output_url?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoJobRecord {
  id: string;
  video_id: string;
  bull_job_id?: string | null;
  status: VideoStatus;
  attempts: number;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
}
