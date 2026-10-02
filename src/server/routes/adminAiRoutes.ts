/**
 * ADMIN AI MANAGEMENT ROUTES
 * Dedicated endpoints for administrators to configure global AI settings,
 * provider strategy, system credentials, and budget controls.
 * Strictly protected by requireAdmin middleware.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAdmin, AuthenticatedRequest } from '../auth.js';
import { getDatabase, DEFAULT_ADMIN_CONFIG } from '../../database/db.js';
import { CredentialManager } from '../../ai/credentialManager.js';
import { AIProviderType, CredentialState } from '../../ai/types.js';

export const adminAiRouter = Router();

// Apply requireAdmin to all routes in this router
adminAiRouter.use(requireAdmin);

const updateSettingsSchema = z.object({
  aiEnabled: z.boolean().optional(),
  allowedModes: z.array(z.enum(['FULL_AI', 'ASSISTED_AI', 'NO_AI'])).optional(),
  allowedProviders: z.array(z.enum(['GEMINI', 'OPENAI'])).optional(),
  defaultStrategy: z.enum(['GEMINI', 'OPENAI', 'AUTO']).optional(),
  allowUserBYOK: z.boolean().optional(),
  providerFailover: z.boolean().optional(),
  maxAIRequestsPerJob: z.number().int().min(1).max(50).optional(),
  maxEstimatedCostPerJob: z.number().min(0).optional(),
});

const addCredentialSchema = z.object({
  provider: z.enum(['GEMINI', 'OPENAI']),
  rawSecret: z.string().min(5, 'API Key không hợp lệ'),
  priority: z.number().int().min(1).max(100).optional(),
});

const updateCredentialSchema = z.object({
  status: z
    .enum([
      'READY',
      'TEMPORARILY_UNAVAILABLE',
      'RATE_LIMITED',
      'QUOTA_EXHAUSTED',
      'AUTH_INVALID',
      'BILLING_DISABLED',
      'DISABLED',
    ])
    .optional(),
  priority: z.number().int().min(1).max(100).optional(),
  newRawSecret: z.string().min(5).optional(),
});

/**
 * GET /api/admin/ai/settings
 */
adminAiRouter.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const config = await db.getAdminAIConfig().catch(() => DEFAULT_ADMIN_CONFIG);
    return res.json({ config });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi đọc cấu hình: ${err.message}` });
  }
});

/**
 * PUT /api/admin/ai/settings
 */
adminAiRouter.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: (parsed.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ' });
    }

    const db = await getDatabase();
    const updated = await db.updateAdminAIConfig(parsed.data);
    return res.json({ message: 'Cập nhật cấu hình AI thành công', config: updated });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi lưu cấu hình: ${err.message}` });
  }
});

/**
 * GET /api/admin/ai/credentials
 * Returns masked metadata of all system credentials (Virtual ENV + System DB)
 */
adminAiRouter.get('/credentials', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const credentials = await CredentialManager.getAdminCredentials();
    return res.json({ credentials });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi lấy danh sách khóa: ${err.message}` });
  }
});

/**
 * POST /api/admin/ai/credentials
 */
adminAiRouter.post('/credentials', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = addCredentialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: (parsed.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ' });
    }

    const { provider, rawSecret, priority } = parsed.data;
    const cred = await CredentialManager.addCredential({
      provider: provider as AIProviderType,
      ownerType: 'SYSTEM',
      rawSecret,
      priority,
    });

    return res.status(201).json({ message: 'Thêm khóa hệ thống thành công', credential: cred });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi thêm khóa: ${err.message}` });
  }
});

/**
 * PUT /api/admin/ai/credentials/:id
 */
adminAiRouter.put('/credentials/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = updateCredentialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: (parsed.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ' });
    }

    await CredentialManager.updateCredential(id, {
      status: parsed.data.status as CredentialState,
      priority: parsed.data.priority,
      newRawSecret: parsed.data.newRawSecret,
    });

    return res.json({ message: 'Cập nhật khóa thành công' });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi cập nhật khóa: ${err.message}` });
  }
});

/**
 * DELETE /api/admin/ai/credentials/:id
 */
adminAiRouter.delete('/credentials/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = await CredentialManager.deleteCredential(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy khóa hoặc không thể xóa khóa môi trường' });
    }
    return res.json({ message: 'Xóa khóa thành công' });
  } catch (err: any) {
    return res.status(500).json({ error: `Lỗi xóa khóa: ${err.message}` });
  }
});

/**
 * POST /api/admin/ai/credentials/test
 */
adminAiRouter.post('/credentials/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, rawSecret, credentialId } = req.body;

    let secretToTest = rawSecret;
    let targetProvider = provider;

    if (!secretToTest && credentialId) {
      if (credentialId === 'env_gemini') {
        secretToTest = process.env.GEMINI_API_KEY;
        targetProvider = 'GEMINI';
      } else if (credentialId === 'env_openai') {
        secretToTest = process.env.OPENAI_API_KEY;
        targetProvider = 'OPENAI';
      } else {
        const db = await getDatabase();
        const cred = await db.getAICredentialById(credentialId);
        if (cred) {
          targetProvider = cred.provider;
          const { SecretStore } = await import('../../ai/secretStore.js');
          secretToTest = SecretStore.decrypt({
            encryptedKey: cred.encryptedKey,
            iv: cred.iv,
            authTag: cred.authTag,
          });
        }
      }
    }

    if (!secretToTest || !targetProvider) {
      return res.status(400).json({ error: 'Vui lòng cung cấp khóa API hoặc ID khóa để kiểm tra' });
    }

    const testRes = await CredentialManager.testConnection(targetProvider, secretToTest);
    return res.json(testRes);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
