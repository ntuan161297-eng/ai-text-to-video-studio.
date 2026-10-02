import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../../database/db.js';
import { getVideoQueue } from '../../queue/videoQueue.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { AspectRatio, VideoDuration, VideoEngine } from '../../types/video.js';
import { CheerioArticleExtractor } from '../../providers/scraper/cheerioExtractor.js';
import { EcommerceExtractor } from '../../providers/scraper/ecommerceExtractor.js';
import { RevisionIntentClassifier } from '../../engine/revisionIntentClassifier.js';
import { RevisionEngine } from '../../engine/revisionEngine.js';
import { VideoVersionRecord } from '../../types/jobContext.js';

export const videoRouter = Router();

// Endpoint trích xuất bài viết hoặc link sản phẩm Shopee/TMĐT để người dùng xem trước và tạo video Affiliate
videoRouter.post('/extract-url', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'URL không hợp lệ hoặc thiếu giao thức http/https' });
    }

    // Nếu là link sản phẩm TMĐT (Shopee, TikTok Shop, Lazada,...)
    if (EcommerceExtractor.isEcommerceUrl(url)) {
      const ecom = new EcommerceExtractor();
      const product = await ecom.extract(url);
      return res.json({
        success: true,
        isEcommerce: true,
        title: product.name,
        summary: `Giá: ${product.price} • ${product.discount} • ${product.rating}`,
        content: product.description,
        keyPoints: product.keyFeatures,
        productData: product,
        suggestedPrompt: product.suggestedPrompt,
      });
    }

    const extractor = new CheerioArticleExtractor();
    const result = await extractor.extract(url);

    return res.json({
      success: true,
      isEcommerce: false,
      title: result.title,
      summary: result.summary || '',
      content: result.content,
      keyPoints: result.keyPoints || [],
    });
  } catch (error: any) {
    console.error('[VideoRoutes] Lỗi trích xuất URL:', error);
    return res.status(500).json({ error: 'Không thể trích xuất thông tin từ URL này' });
  }
});

// Middleware xác thực tất cả routes video
videoRouter.use(requireAuth);

// Validation schema cho tạo và chỉnh sửa video (Section 1)
const createVideoSchema = z.object({
  operation: z.enum(['CREATE_NEW', 'REVISE_EXISTING']).default('CREATE_NEW'),
  baseVideoId: z.string().optional(),
  baseVersionId: z.string().optional(),
  feedback: z.string().optional(),
  revisionScope: z.enum(['AUTO', 'SCRIPT', 'VISUAL', 'VOICE', 'CAPTION', 'FULL']).optional(),
  prompt: z
    .string()
    .max(2000, 'Nội dung tối đa 2000 ký tự')
    .optional()
    .default(''),
  url: z
    .string()
    .url('Đường dẫn URL bài viết không hợp lệ')
    .or(z.literal(''))
    .nullish()
    .refine((val) => !val || /^https?:\/\//i.test(val), {
      message: 'Chỉ chấp nhận giao thức http:// hoặc https://',
    }),
  duration: z
    .union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)])
    .default(45),
  aspectRatio: z
    .enum(['9:16', '16:9', '1:1'])
    .default('9:16'),
  voice: z.string().default('vi-VN-NamMinhNeural'),
  style: z.string().default('Sports / Crimson Flame'),
  caption: z.boolean().default(true),
  bgm: z.boolean().default(true),
  engine: z.enum(['hyperframes', 'remotion']).default('hyperframes'),
  fontFamily: z.string().default('Montserrat'),
  ecoMode: z.boolean().default(true),
  hideTitle: z.boolean().default(true),
  transitionEffect: z.enum(['3d_flycam', '3d_tilt', 'cinematic_zoom', 'dynamic_whip']).default('3d_flycam'),
  visualStyle: z.enum(['realistic', 'animation', 'bright', 'ecommerce']).default('realistic'),
  isAffiliate: z.boolean().default(false),
  productData: z
    .object({
      name: z.string().nullish(),
      price: z.string().nullish(),
      discount: z.string().nullish(),
      imageUrl: z.string().nullish(),
      affiliateUrl: z.string().nullish(),
    })
    .passthrough()
    .nullish(),
});

// POST /api/videos -> Phân tách rõ rệt CREATE_NEW vs REVISE_EXISTING
videoRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createVideoSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errMsg = (parseResult.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ';
      return res.status(400).json({
        error: errMsg,
        details: (parseResult.error as any).issues,
      });
    }

    const data = parseResult.data;
    const userId = req.user!.id;
    const db = await getDatabase();

    // =========================================================================
    // CASE 1: REVISE_EXISTING (Sections 1, 3, 4, 11)
    // =========================================================================
    if (data.operation === 'REVISE_EXISTING') {
      if (!data.baseVideoId) {
        return res.status(400).json({ error: 'baseVideoId là bắt buộc khi chọn REVISE_EXISTING' });
      }
      if (!data.feedback || !data.feedback.trim()) {
        return res.status(400).json({ error: 'Nội dung phản hồi (feedback) là bắt buộc khi chỉnh sửa video' });
      }

      const baseVideo = await db.getVideoById(data.baseVideoId, userId);
      if (!baseVideo) {
        return res.status(404).json({ error: 'Không tìm thấy video gốc để chỉnh sửa' });
      }

      let baseVersion = data.baseVersionId ? await db.getVersionById(data.baseVersionId) : null;
      if (!baseVersion) {
        baseVersion = await db.getLatestVersionByVideoId(baseVideo.id);
      }

      // Khởi tạo base v1 nếu video cũ được tạo trước khi có bảng version
      if (!baseVersion) {
        baseVersion = await db.createVersion({
          id: `ver_${baseVideo.id}_v1_init`,
          videoId: baseVideo.id,
          versionNumber: 1,
          parentVersionId: null,
          originalPrompt: baseVideo.prompt,
          outputUrl: baseVideo.output_url,
          status: 'completed',
          createdAt: baseVideo.created_at,
        });
      }

      const analysis = RevisionIntentClassifier.analyzeFeedback(data.feedback);
      const chosenScope = data.revisionScope && data.revisionScope !== 'AUTO' ? data.revisionScope : analysis.detectedScope;

      const newVersionNumber = baseVersion.versionNumber + 1;
      const newVersionId = `ver_${baseVideo.id}_v${newVersionNumber}_${uuidv4().slice(0, 8)}`;
      const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

      // Lưu version mới trong DB (Copy-on-write, không ghi đè version cũ)
      await db.createVersion({
        id: newVersionId,
        videoId: baseVideo.id,
        versionNumber: newVersionNumber,
        parentVersionId: baseVersion.id,
        originalPrompt: baseVideo.prompt,
        feedback: data.feedback,
        revisionScope: chosenScope,
        approvedScript: baseVersion.approvedScript,
        storyboard: baseVersion.storyboard,
        assets: baseVersion.assets,
        status: 'processing',
        createdAt: new Date().toISOString(),
      });

      await db.createJob({
        id: jobId,
        video_id: baseVideo.id,
      });

      const queue = await getVideoQueue();
      await queue.addJob(jobId, {
        jobId,
        videoId: baseVideo.id,
        userId,
        versionId: newVersionId,
        versionNumber: newVersionNumber,
        operation: 'REVISE_EXISTING',
        baseVideoId: baseVideo.id,
        baseVersionId: baseVersion.id,
        feedback: data.feedback,
        revisionScope: chosenScope,
        options: {
          prompt: baseVideo.prompt,
          url: baseVideo.url || undefined,
          duration: baseVideo.duration,
          aspectRatio: baseVideo.aspect_ratio,
          voice: baseVideo.voice,
          style: baseVideo.style,
          caption: baseVideo.caption_enabled,
          bgm: baseVideo.bgm_enabled,
          engine: baseVideo.engine,
          fontFamily: baseVideo.font_family,
          transitionEffect: (baseVideo.transition_effect as any) || '3d_flycam',
          hideTitle: baseVideo.hide_title,
          ecoMode: baseVideo.eco_mode,
          visualStyle: (baseVideo.visual_style as any) || 'realistic',
          isAffiliate: baseVideo.is_affiliate,
          productData: (baseVideo.product_data as any) || undefined,
          operation: 'REVISE_EXISTING',
          versionId: newVersionId,
          versionNumber: newVersionNumber,
          baseVideoId: baseVideo.id,
          baseVersionId: baseVersion.id,
          feedback: data.feedback,
          revisionScope: chosenScope,
        },
      });

      return res.status(202).json({
        message: `Đã tạo phiên bản chỉnh sửa v${newVersionNumber} (${chosenScope}) thành công`,
        operation: 'REVISE_EXISTING',
        jobId,
        videoId: baseVideo.id,
        versionId: newVersionId,
        versionNumber: newVersionNumber,
        scope: chosenScope,
        status: 'queued',
      });
    }

    // =========================================================================
    // CASE 2: CREATE_NEW (Sections 1, 2) -> BLANK SLATE
    // =========================================================================
    if (!data.prompt || data.prompt.trim().length < 3) {
      return res.status(400).json({ error: 'Nội dung ý tưởng video mới phải có ít nhất 3 ký tự' });
    }

    const videoId = `vid_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const versionId = `ver_${videoId}_v1_${uuidv4().slice(0, 8)}`;
    const jobId = `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    // Tạo video record độc lập
    const video = await db.createVideo({
      id: videoId,
      user_id: userId,
      prompt: data.prompt,
      url: data.url || null,
      duration: data.duration as VideoDuration,
      aspect_ratio: data.aspectRatio as AspectRatio,
      voice: data.voice,
      style: data.style,
      caption_enabled: data.caption,
      bgm_enabled: data.bgm,
      engine: data.engine as VideoEngine,
      font_family: data.fontFamily,
      transition_effect: data.transitionEffect,
      hide_title: data.hideTitle,
      eco_mode: data.ecoMode,
      visual_style: data.visualStyle,
      is_affiliate: data.isAffiliate,
      product_data: data.productData,
    });

    // Tạo version 1 record
    await db.createVersion({
      id: versionId,
      videoId: videoId,
      versionNumber: 1,
      parentVersionId: null,
      originalPrompt: data.prompt,
      status: 'processing',
      createdAt: new Date().toISOString(),
    });

    // Tạo job record
    await db.createJob({
      id: jobId,
      video_id: videoId,
    });

    const queue = await getVideoQueue();
    await queue.addJob(jobId, {
      jobId,
      videoId,
      userId,
      versionId,
      versionNumber: 1,
      operation: 'CREATE_NEW',
      options: {
        prompt: data.prompt,
        url: data.url || undefined,
        duration: data.duration,
        aspectRatio: data.aspectRatio as AspectRatio,
        voice: data.voice,
        style: data.style,
        caption: data.caption,
        bgm: data.bgm,
        engine: data.engine as VideoEngine,
        fontFamily: data.fontFamily,
        ecoMode: data.ecoMode,
        hideTitle: data.hideTitle,
        transitionEffect: data.transitionEffect,
        visualStyle: data.visualStyle,
        isAffiliate: data.isAffiliate,
        productData: (data.productData as any) || undefined,
        operation: 'CREATE_NEW',
        versionId,
        versionNumber: 1,
      },
    });

    return res.status(202).json({
      message: 'Video mới đã được khởi tạo và đang trong hàng đợi xử lý',
      operation: 'CREATE_NEW',
      jobId,
      videoId,
      versionId,
      versionNumber: 1,
      status: video.status,
      currentStep: video.current_step,
      progress: video.progress,
    });
  } catch (error: any) {
    console.error('[Videos] Error creating/revising video:', error);
    return res.status(500).json({ error: 'Không thể xử lý yêu cầu video. Vui lòng thử lại sau.' });
  }
});

// POST /api/videos/:id/feedback -> Ghi nhận và phân tích phản hồi (Draft Feedback State, Section 15)
videoRouter.post('/:id/feedback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { feedback } = req.body;
    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
      return res.status(400).json({ error: 'Nội dung phản hồi góp ý không được để trống' });
    }

    const db = await getDatabase();
    const video = await db.getVideoById(videoId, req.user!.id);
    if (!video) {
      return res.status(404).json({ error: 'Video không tồn tại hoặc bạn không có quyền truy cập' });
    }

    const analysis = RevisionIntentClassifier.analyzeFeedback(feedback);
    const latestVersion = await db.getLatestVersionByVideoId(videoId);

    return res.json({
      success: true,
      videoId,
      currentVersionNumber: latestVersion ? latestVersion.versionNumber : 1,
      baseVersionId: latestVersion ? latestVersion.id : null,
      analysis,
    });
  } catch (err: any) {
    console.error('[Feedback] Error analyzing feedback:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi phân tích phản hồi' });
  }
});

// GET /api/videos/:id/versions -> Lấy danh sách toàn bộ các phiên bản đã tạo của video (Section 11, 12)
videoRouter.get('/:id/versions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const db = await getDatabase();
    const video = await db.getVideoById(videoId, req.user!.id);
    if (!video) {
      return res.status(404).json({ error: 'Video không tồn tại hoặc bạn không có quyền truy cập' });
    }

    const versions = await db.getVersionsByVideoId(videoId);
    return res.json({ videoId, versions });
  } catch (err: any) {
    console.error('[Versions] Error fetching video versions:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách versions' });
  }
});

// GET /api/videos -> Lấy danh sách video của user đang đăng nhập
videoRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const videos = await db.getVideosByUserId(req.user!.id);
    return res.json({ videos });
  } catch (error: any) {
    console.error('[Videos] Error fetching user videos:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách video' });
  }
});

// GET /api/videos/:id -> Trả về status, progress, currentStep, outputUrl, error
videoRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const db = await getDatabase();

    // Không cho user đọc video của user khác
    const video = await db.getVideoById(videoId, req.user!.id);
    if (!video) {
      return res.status(404).json({
        error: 'Video không tồn tại hoặc bạn không có quyền truy cập',
      });
    }

    return res.json({
      id: video.id,
      status: video.status,
      progress: video.progress,
      currentStep: video.current_step,
      outputUrl: video.output_url || null,
      error: video.error_message || null,
      prompt: video.prompt,
      url: video.url || null,
      duration: video.duration,
      aspectRatio: video.aspect_ratio,
      voice: video.voice,
      style: video.style,
      caption_enabled: video.caption_enabled,
      bgm_enabled: video.bgm_enabled,
      engine: video.engine,
      fontFamily: video.font_family || 'Montserrat',
      transitionEffect: video.transition_effect || '3d_flycam',
      visualStyle: (video as any).visual_style || 'realistic',
      hideTitle: video.hide_title !== false,
      ecoMode: video.eco_mode !== false,
      isAffiliate: video.is_affiliate || false,
      productData: video.product_data || null,
      createdAt: video.created_at,
    });
  } catch (error: any) {
    console.error('[Videos] Error getting video by id:', error);
    return res.status(500).json({ error: 'Lỗi khi tra cứu trạng thái video' });
  }
});

// POST /api/videos/:id/retry -> Cho phép retry nếu video bị failed
videoRouter.post('/:id/retry', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const db = await getDatabase();

    const video = await db.getVideoById(videoId, req.user!.id);
    if (!video) {
      return res.status(404).json({ error: 'Video không tồn tại hoặc bạn không có quyền truy cập' });
    }

    if (video.status !== 'failed') {
      return res.status(400).json({ error: 'Chỉ có thể retry video đã bị thất bại' });
    }

    const newJobId = `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    await db.updateVideoProgress(videoId, 0, 'queued', 'queued');
    await db.createJob({ id: newJobId, video_id: videoId });

    const queue = await getVideoQueue();
    await queue.addJob(newJobId, {
      jobId: newJobId,
      videoId,
      userId: req.user!.id,
      options: {
        prompt: video.prompt,
        url: video.url || undefined,
        duration: video.duration,
        aspectRatio: video.aspect_ratio,
        voice: video.voice,
        style: video.style,
        caption: video.caption_enabled,
        bgm: video.bgm_enabled,
        engine: video.engine,
      },
    });

    return res.json({
      message: 'Video job đã được đưa lại vào hàng đợi xử lý',
      jobId: newJobId,
      videoId,
      status: 'queued',
    });
  } catch (error: any) {
    console.error('[Videos] Error retrying video:', error);
    return res.status(500).json({ error: 'Lỗi khi retry video' });
  }
});

// DELETE /api/videos/:id -> Xoá video của user
videoRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const db = await getDatabase();

    const deleted = await db.deleteVideo(videoId, req.user!.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Video không tồn tại hoặc không thể xoá' });
    }

    return res.json({ message: 'Đã xoá video thành công' });
  } catch (error: any) {
    console.error('[Videos] Error deleting video:', error);
    return res.status(500).json({ error: 'Lỗi khi xoá video' });
  }
});
