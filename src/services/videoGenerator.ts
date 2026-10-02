import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  GenerateVideoOptions,
  GenerateVideoResult,
  ProgressCallback,
  AspectRatio,
} from '../types/video.js';
import { CheerioArticleExtractor } from '../providers/scraper/cheerioExtractor.js';
import { TTSFactory } from '../providers/tts/ttsFactory.js';
import { LLMFactory } from '../providers/llm/llmFactory.js';
import { VisualFactory } from '../providers/visual/visualFactory.js';
import { generateAmbientBgm } from '../utils/audioGenerator.js';
import { HyperScene, HyperVideoProject } from '../hyperframes/types.js';
import { SVG_ICONS } from '../hyperframes/icons.js';
import { generateHyperFramesHtml } from '../hyperframes/template.js';
import { VideoPipeline } from '../pipeline.js';
import { downloadRealisticVisuals } from '../utils/realisticVisuals.js';
import { EcommerceExtractor } from '../providers/scraper/ecommerceExtractor.js';
import { WebResearcher, ResearchDossier } from './webResearcher.js';
import { ResearchEngine, ResearchOutput } from './researchEngine.js';
import { FactLayer, VerifiedFact } from './factLayer.js';
import { ViralScriptEngine, ScriptPackage, StoryboardScene } from './viralScriptEngine.js';
import { RetentionEditor, ContentReviewer, QualityScorer, ReviewResult, QualityScoreBreakdown } from './qualityControlEngine.js';
import { VideoQaAndDebug, VideoQaReport } from './videoQaAndDebug.js';
import { PipelineCoordinator, PipelineExecutionResult } from '../engine/pipelineCoordinator.js';
import { FinalContentSanitizer } from '../engine/finalContentSanitizer.js';
import { MasterVideoEngine } from '../engine/masterVideoEngine.js';
import { JobIsolation } from '../engine/jobIsolation.js';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/db.js';
import { VideoVersionRecord } from '../types/jobContext.js';
import { ExecutionRouter } from '../ai/executionRouter.js';
import { AIProviderManager } from '../ai/aiProviderManager.js';
import { UserInputData } from '../ai/types.js';

const execFileAsync = promisify(execFile);

export function getResolutionForAspectRatio(aspectRatio: AspectRatio = '9:16'): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
}

/**
 * Trích xuất tiêu đề ngắn gọn (3-5 từ), chuẩn tiếng Việt, giữ nguyên đầy đủ từ ngữ, không cắt cụt chữ
 */
function formatVietnameseHeadline(text: string, maxWords = 5): string {
  if (!text) return 'THÔNG TIN NỔI BẬT';
  let clean = text.normalize('NFC').replace(/https?:\/\/\S+/g, '').replace(/\[.*?\]/g, '').trim();
  clean = clean.replace(/^(tạo video|video tiktok|hãy tạo|giới thiệu|khám phá|tìm hiểu).*?:/i, '').trim();

  // Tách từ theo khoảng trắng, bảo toàn 100% các từ tiếng Việt
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ĐIỂM NHẤN QUAN TRỌNG';

  let headline = words.slice(0, Math.min(words.length, maxWords)).join(' ');
  headline = headline.replace(/[,;:.!?\-–—]+$/, '').trim();

  return headline.toUpperCase();
}

/**
 * Reusable function để sinh video từ prompt / options.
 * Tái sử dụng nguyên vẹn video engine hiện có (HyperFrames & Remotion).
 */
export async function generateVideo(
  options: GenerateVideoOptions,
  onProgress?: ProgressCallback
): Promise<GenerateVideoResult> {
  const startTime = Date.now();
  const engine = options.engine || 'hyperframes';
  const aspectRatio: AspectRatio = options.aspectRatio || '9:16';
  const { width, height } = getResolutionForAspectRatio(aspectRatio);

  // Mandatory Single Job ID for this generation
  const activeJobId = options.jobId || `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  // Initialize pristine isolated job workspace
  const workspace = JobIsolation.initWorkspace({
    jobId: activeJobId,
    prompt: options.prompt,
    url: options.url,
    duration: options.duration || 60,
    baseOutputDir: options.outputDir,
    baseTempDir: options.tempDir,
    settings: {
      aspectRatio,
      engine,
      ttsProvider: options.ttsProvider,
      voice: options.voice,
      visualStyle: options.visualStyle,
    },
  });

  const baseTempDir = workspace.tempDir;
  const baseOutputDir = workspace.outputDir;

  const finalVideoName = options.outputFile || `video_${activeJobId}.mp4`;
  const finalOutputPath = path.isAbsolute(finalVideoName)
    ? finalVideoName
    : path.join(baseOutputDir, path.basename(finalVideoName));

  await onProgress?.('queued', 5, 'Job đã được tiếp nhận và bắt đầu xử lý...');

  // Xử lý URL nếu người dùng nhập URL bài viết hoặc URL Shopee / TMĐT
  let extractedContext = '';
  let articleTitle = '';
  let articleSummary = '';
  let articleImages: string[] = [];
  let fullPrompt = options.prompt || '';
  let isAffiliate = Boolean(options.isAffiliate);
  let productData = options.productData;

  if (options.url) {
    if (EcommerceExtractor.isEcommerceUrl(options.url)) {
      try {
        await onProgress?.('writing_script', 10, `Đang phân tích sản phẩm Thương Mại Điện Tử từ ${options.url}...`);
        const ecomExtractor = new EcommerceExtractor();
        const extractedProd = await ecomExtractor.extract(options.url);
        isAffiliate = true;
        productData = {
          name: extractedProd.name,
          price: extractedProd.price,
          discount: extractedProd.discount,
          imageUrl: extractedProd.imageUrl,
          images: extractedProd.images,
          videoUrl: extractedProd.videoUrl,
          affiliateUrl: extractedProd.affiliateUrl,
        };

        if (extractedProd.images && extractedProd.images.length > 0) {
          articleImages = extractedProd.images;
          console.log(`[VideoGenerator] 📸 Kế thừa ${articleImages.length} ảnh thực tế từ bài đăng sản phẩm.`);
        } else if (extractedProd.imageUrl) {
          articleImages = [extractedProd.imageUrl];
        }

        extractedContext = `${extractedProd.name}. Giá: ${extractedProd.price}. ${extractedProd.discount}. ${extractedProd.description}`;
        fullPrompt = `[Sản phẩm TMĐT]: ${extractedProd.name} - Giá: ${extractedProd.price} (${extractedProd.discount})\n${options.prompt}`;
      } catch (ecomErr: any) {
        console.warn(`[VideoGenerator] Không thể phân tích link TMĐT:`, ecomErr.message);
      }
    } else {
      try {
        await onProgress?.('writing_script', 10, `Đang trích xuất nội dung từ ${options.url}...`);
        const extractor = new CheerioArticleExtractor();
        const extracted = await extractor.extract(options.url);
        if (extracted.content) {
          extractedContext = extracted.content;
          articleTitle = extracted.title || '';
          articleSummary = extracted.summary || '';
          articleImages = extracted.images || [];

          if (!options.prompt.trim()) {
            fullPrompt = `${articleTitle}`;
          } else {
            fullPrompt = options.prompt;
          }
        }
      } catch (urlErr: any) {
        console.warn(`[VideoGenerator] Không thể trích xuất URL (${options.url}):`, urlErr.message);
      }
    }
  }

  // Legacy ResearchEngine pre-pipeline decoupled in favor of Canonical Universal Engine
  fullPrompt = options.prompt || '';

  // Phân tích thời lượng
  let targetDuration = options.duration || 45;
  if (!options.duration) {
    const match = fullPrompt.match(/(\d+)\s*(?:giây|s|second)/i);
    if (match) {
      targetDuration = parseInt(match[1], 10);
    }
  }

  // === NẾU CHỌN REMOTION ENGINE ===
  if (engine === 'remotion') {
    await onProgress?.('writing_script', 20, 'Đang viết kịch bản phân cảnh cho Remotion...');
    const pipeline = new VideoPipeline();
    const renderedPath = await pipeline.run({
      prompt: fullPrompt,
      duration: targetDuration,
      outputFile: finalVideoName,
      ttsProvider: options.ttsProvider,
      llmProvider: options.llmProvider,
      visualProvider: options.visualProvider,
    });

    const stats = fs.statSync(renderedPath);
    await onProgress?.('completed', 100, 'Video Remotion đã hoàn thành!');

    return {
      videoPath: renderedPath,
      fileName: path.basename(renderedPath),
      duration: targetDuration,
      width,
      height,
      fileSizeBytes: stats.size,
    };
  }

  // Section 3: If REVISE_EXISTING, fetch base version
  let baseVersionRecord: VideoVersionRecord | null = null;
  if (options.operation === 'REVISE_EXISTING') {
    try {
      const db = await getDatabase();
      if (options.baseVersionId) {
        baseVersionRecord = await db.getVersionById(options.baseVersionId);
      }
      if (!baseVersionRecord && options.baseVideoId) {
        baseVersionRecord = await db.getLatestVersionByVideoId(options.baseVideoId);
      }
      if (baseVersionRecord) {
        console.log(`[VideoGenerator] 🎯 Loaded baseVersion ${baseVersionRecord.id} (v${baseVersionRecord.versionNumber}) for revision.`);
      }
    } catch (dbErr: any) {
      console.warn('[VideoGenerator] Không thể truy vấn baseVersion từ DB:', dbErr.message);
    }
  }

  // === AI / NO-AI EXECUTION ROUTING & PLAN GENERATION ===
  const aiMode = options.aiMode || 'FULL_AI';
  const resolvedPrompt = (
    options.userInputData?.prompt ||
    options.userInputData?.topic ||
    fullPrompt ||
    options.prompt ||
    options.url ||
    'Video mới'
  ).trim();

  const userInput: UserInputData = {
    ...options.userInputData,
    prompt: resolvedPrompt,
    topic: resolvedPrompt,
    duration: options.userInputData?.duration || targetDuration,
  };

  const executionPlan = ExecutionRouter.planExecution({
    jobId: activeJobId,
    mode: aiMode,
    input: userInput,
    providerStrategy: options.aiProviderStrategy || 'AUTO',
  });

  if (executionPlan.aiEnabled) {
    await AIProviderManager.initSession({
      jobId: activeJobId,
      strategy: options.aiProviderStrategy || 'AUTO',
      userId: options.userId,
      useUserBYOK: options.useUserBYOK,
    });
  }

  // === MASTER VIDEO ENGINE (GRAND ORCHESTRATOR) ===
  const masterResult = await MasterVideoEngine.execute({
    jobId: activeJobId,
    prompt: fullPrompt,
    targetDuration,
    url: options.url,
    extractedContext,
    articleTitle,
    articleImages,
    outputDir: baseTempDir,
    finalVideoPath: finalOutputPath,
    ttsVoice: options.voice || (options.ttsProvider && options.ttsProvider !== 'edge' && options.ttsProvider !== 'openai' ? options.ttsProvider : 'vi-VN-HoaiMyNeural'),
    width,
    height,
    aspectRatio,
    bgm: options.bgm !== false,
    executionPlan,
    userInputData: userInput,
    style: options.style,
    fontFamily: options.fontFamily,
    hideTitle: options.hideTitle !== false,
    transitionEffect: options.transitionEffect,
    isAffiliate,
    productData,
    ecoMode: options.ecoMode !== false,
    revision: baseVersionRecord ? {
      baseVersion: baseVersionRecord,
      revisionScope: options.revisionScope,
      feedback: options.feedback || '',
    } : undefined,
    onProgress: onProgress ? (stage, percent, msg) => onProgress(stage as any, percent, msg) : undefined,
  });

  return {
    videoPath: masterResult.videoPath,
    fileName: path.basename(masterResult.videoPath),
    duration: masterResult.duration,
    width: masterResult.width,
    height: masterResult.height,
    fileSizeBytes: masterResult.fileSizeBytes,
    approvedScript: masterResult.approvedPackage,
    storyboard: masterResult.timeline,
    assets: masterResult.assetMap ? Object.fromEntries(masterResult.assetMap.entries()) : {},
    audioReport: masterResult.audioReport,
    renderManifest: {
      compositions: masterResult.compositions,
      captions: masterResult.captions,
      shotPlans: masterResult.shotPlans,
    },
  };
}
