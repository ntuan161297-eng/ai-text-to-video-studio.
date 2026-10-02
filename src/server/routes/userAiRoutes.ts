/**
 * USER AI MANAGEMENT & CAPABILITIES ROUTES
 * Dedicated endpoints for authenticated users to:
 *   1. Discover AI capabilities (system availability, allowed modes, allowed providers).
 *   2. Manage own BYOK API keys (with strict tenant isolation, no access to other users' keys).
 *   3. Pre-validate input sufficiency before job dispatch.
 * Strictly protected by requireAuth middleware.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { getDatabase, DEFAULT_ADMIN_CONFIG } from '../../database/db.js';
import { CredentialManager } from '../../ai/credentialManager.js';
import { ExecutionRouter } from '../../ai/executionRouter.js';
import { AIProviderType, UserAICapabilities, UserInputData, AIExecutionMode } from '../../ai/types.js';

export const userAiRouter = Router();

userAiRouter.use(requireAuth);

const addBYOKSchema = z.object({
  provider: z.enum(['GEMINI', 'OPENAI']),
  rawSecret: z.string().min(5, 'API Key không hợp lệ'),
  priority: z.number().int().min(1).max(100).optional(),
});

const validateInputSchema = z.object({
  mode: z.enum(['FULL_AI', 'ASSISTED_AI', 'NO_AI']),
  input: z.object({
    prompt: z.string().optional(),
    topic: z.string().optional(),
    objective: z.string().optional(),
    duration: z.number().optional(),
    script: z.string().optional(),
    scriptBeats: z
      .array(
        z.object({
          narration: z.string(),
          onScreenText: z.string().optional(),
          estimatedSeconds: z.number().optional(),
        })
      )
      .optional(),
    facts: z.array(z.string()).optional(),
    outline: z.array(z.string()).optional(),
    uploadedVisuals: z.array(z.string()).optional(),
    uploadedVoiceUrl: z.string().optional(),
    userVoiceTranscript: z.string().optional(),
  }),
});

/**
 * GET /api/user/ai/capabilities
 * Normal user only receives high-level capabilities.
 * NEVER leaks system key count, masked system keys, or priority info.
 */
userAiRouter.get('/capabilities', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const config = await db.getAdminAIConfig().catch(() => DEFAULT_ADMIN_CONFIG);

    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    const systemCreds = await db.getAICredentials({ ownerType: 'SYSTEM' });
    const hasSystemDbCreds = systemCreds.some((c) => c.status === 'READY');

    const systemAIAvailable = config.aiEnabled && (hasGemini || hasOpenAI || hasSystemDbCreds);

    const capabilities: UserAICapabilities = {
      systemAIAvailable,
      allowedProviders: config.allowedProviders,
      allowedModes: config.allowedModes,
      allowUserBYOK: config.allowUserBYOK,
    };

    return res.json({ capabilities });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi đọc thông tin capabilities: ${err.message}` });
  }
});

/**
 * GET /api/user/ai/credentials
 * Returns only the requesting user's own BYOK keys.
 * Strictly isolates User A from User B.
 */
userAiRouter.get('/credentials', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng' });
    }

    const credentials = await CredentialManager.getUserCredentials(userId);
    return res.json({ credentials });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi lấy danh sách khóa cá nhân: ${err.message}` });
  }
});

/**
 * POST /api/user/ai/credentials
 * Adds a BYOK key for the requesting user
 */
userAiRouter.post('/credentials', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng' });
    }

    const db = await getDatabase();
    const config = await db.getAdminAIConfig().catch(() => DEFAULT_ADMIN_CONFIG);
    if (!config.allowUserBYOK) {
      return res.status(403).json({
        error: 'BYOK_DISABLED: Quản trị viên chưa cho phép người dùng sử dụng API Key cá nhân.',
      });
    }

    const parsed = addBYOKSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: (parsed.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ' });
    }

    const cred = await CredentialManager.addCredential({
      provider: parsed.data.provider as AIProviderType,
      ownerType: 'USER',
      userId,
      rawSecret: parsed.data.rawSecret,
      priority: parsed.data.priority,
    });

    return res.status(201).json({ message: 'Lưu khóa cá nhân thành công', credential: cred });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi lưu khóa: ${err.message}` });
  }
});

/**
 * DELETE /api/user/ai/credentials/:id
 * Deletes user's own BYOK key (enforcing tenant isolation)
 */
userAiRouter.delete('/credentials/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);

    const deleted = await CredentialManager.deleteCredential(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy khóa hoặc bạn không có quyền xóa khóa này' });
    }

    return res.json({ message: 'Xóa khóa cá nhân thành công' });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi xóa khóa: ${err.message}` });
  }
});

/**
 * POST /api/user/ai/credentials/test
 */
userAiRouter.post('/credentials/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, rawSecret } = req.body;
    if (!provider || !rawSecret) {
      return res.status(400).json({ error: 'Vui lòng cung cấp nhà cung cấp (provider) và API key' });
    }

    const result = await CredentialManager.testConnection(provider, rawSecret);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/user/ai/validate-input
 * Pre-validates user data sufficiency for the desired execution mode
 */
userAiRouter.post('/validate-input', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = validateInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: (parsed.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ' });
    }

    const { mode, input } = parsed.data;
    const result = ExecutionRouter.validateInputSufficiency(mode as AIExecutionMode, input as UserInputData);

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi kiểm tra tính đầy đủ: ${err.message}` });
  }
});
