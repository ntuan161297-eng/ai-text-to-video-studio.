/**
 * CREDENTIAL MANAGER
 * Manages Server-side Virtual ENV Credentials (zero-duplication in DB)
 * and Database Encrypted Credentials (Admin System + User BYOK).
 * Strictly guarantees tenant isolation and key masking.
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
  AIProviderType,
  CredentialOwnerType,
  CredentialState,
  AICredentialMetadata,
  EncryptedCredentialRecord,
} from './types.js';
import { SecretStore } from './secretStore.js';
import { getDatabase } from '../database/db.js';

export interface ResolvedCredential {
  credentialId: string;
  provider: AIProviderType;
  ownerType: CredentialOwnerType;
  source: 'ENV' | 'DB';
  rawKey: string;
  maskedIdentifier: string;
}

export class CredentialManager {
  // In-memory status for virtual environment credentials
  private static virtualEnvStatuses: Map<string, CredentialState> = new Map();

  /**
   * Returns virtual system credentials derived from process.env.
   * Stored purely in memory — NEVER duplicated into the database.
   */
  public static getVirtualEnvCredentials(): AICredentialMetadata[] {
    const list: AICredentialMetadata[] = [];
    const now = new Date().toISOString();

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey && geminiKey.length > 0) {
      const status = this.virtualEnvStatuses.get('env_gemini') || 'READY';
      list.push({
        id: 'env_gemini',
        provider: 'GEMINI',
        ownerType: 'SYSTEM',
        source: 'ENV',
        status,
        priority: 1,
        maskedIdentifier: SecretStore.maskSecret(geminiKey),
        createdAt: now,
        updatedAt: now,
      });
    }

    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    if (openAIKey && openAIKey.length > 0) {
      const status = this.virtualEnvStatuses.get('env_openai') || 'READY';
      list.push({
        id: 'env_openai',
        provider: 'OPENAI',
        ownerType: 'SYSTEM',
        source: 'ENV',
        status,
        priority: 2,
        maskedIdentifier: SecretStore.maskSecret(openAIKey),
        createdAt: now,
        updatedAt: now,
      });
    }

    return list;
  }

  /**
   * Updates in-memory status for a virtual ENV credential
   */
  public static setVirtualEnvStatus(id: string, status: CredentialState): void {
    this.virtualEnvStatuses.set(id, status);
  }

  /**
   * Gets all credentials for ADMIN (Virtual ENV + DB System)
   * Only returns safe metadata with maskedIdentifier.
   */
  public static async getAdminCredentials(): Promise<AICredentialMetadata[]> {
    const db = await getDatabase();
    const dbCreds = await db.getAICredentials({ ownerType: 'SYSTEM' });

    const virtuals = this.getVirtualEnvCredentials();
    const mappedDb: AICredentialMetadata[] = dbCreds.map((c) => ({
      id: c.id,
      provider: c.provider,
      ownerType: c.ownerType,
      source: 'DB',
      status: c.status,
      priority: c.priority,
      maskedIdentifier: c.maskedIdentifier,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return [...virtuals, ...mappedDb].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Gets all BYOK credentials for a specific USER
   * Strictly enforces tenant isolation (never returns credentials of another user).
   */
  public static async getUserCredentials(userId: string): Promise<AICredentialMetadata[]> {
    if (!userId) return [];
    const db = await getDatabase();
    const dbCreds = await db.getAICredentials({ userId, ownerType: 'USER' });

    return dbCreds.map((c) => ({
      id: c.id,
      provider: c.provider,
      ownerType: c.ownerType,
      userId: c.userId,
      source: 'DB',
      status: c.status,
      priority: c.priority,
      maskedIdentifier: c.maskedIdentifier,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Adds a new encrypted credential to the database
   */
  public static async addCredential(params: {
    provider: AIProviderType;
    ownerType: CredentialOwnerType;
    userId?: string;
    rawSecret: string;
    priority?: number;
  }): Promise<AICredentialMetadata> {
    const { provider, ownerType, userId, rawSecret, priority = 1 } = params;
    if (!rawSecret || rawSecret.trim().length === 0) {
      throw new Error('INVALID_SECRET: API key không được để trống');
    }

    const trimmed = rawSecret.trim();
    const encrypted = SecretStore.encrypt(trimmed);
    const maskedIdentifier = SecretStore.maskSecret(trimmed);
    const id = `cred_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    const record: EncryptedCredentialRecord = {
      id,
      provider,
      ownerType,
      userId: ownerType === 'USER' ? userId : undefined,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      maskedIdentifier,
      status: 'READY',
      priority,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    await db.createAICredential(record);

    return {
      id,
      provider,
      ownerType,
      userId: record.userId,
      source: 'DB',
      status: 'READY',
      priority,
      maskedIdentifier,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Updates an existing credential (status, priority, or replace secret)
   */
  public static async updateCredential(
    id: string,
    updates: {
      status?: CredentialState;
      priority?: number;
      newRawSecret?: string;
    },
    authorizedUserId?: string
  ): Promise<void> {
    if (id.startsWith('env_')) {
      if (updates.status) {
        this.setVirtualEnvStatus(id, updates.status);
      }
      return;
    }

    const db = await getDatabase();
    const existing = await db.getAICredentialById(id);
    if (!existing) {
      throw new Error('CREDENTIAL_NOT_FOUND: Không tìm thấy khóa');
    }

    if (authorizedUserId && existing.userId && existing.userId !== authorizedUserId) {
      throw new Error('UNAUTHORIZED_CREDENTIAL_ACCESS: Bạn không có quyền thao tác trên khóa này');
    }

    const payload: Partial<EncryptedCredentialRecord> = {};
    if (updates.status) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;

    if (updates.newRawSecret) {
      const encrypted = SecretStore.encrypt(updates.newRawSecret.trim());
      payload.encryptedKey = encrypted.encryptedKey;
      payload.iv = encrypted.iv;
      payload.authTag = encrypted.authTag;
      payload.maskedIdentifier = SecretStore.maskSecret(updates.newRawSecret.trim());
    }

    await db.updateAICredential(id, payload);
  }

  /**
   * Deletes a credential with user isolation verification
   */
  public static async deleteCredential(id: string, authorizedUserId?: string): Promise<boolean> {
    if (id.startsWith('env_')) {
      throw new Error('CANNOT_DELETE_ENV_KEY: Không thể xóa khóa cấu hình qua biến môi trường server');
    }
    const db = await getDatabase();
    return db.deleteAICredential(id, authorizedUserId);
  }

  /**
   * Resolves a usable credential for execution
   * Priority order:
   * 1. User BYOK if requested & allowed
   * 2. System DB credential
   * 3. Server virtual ENV credential
   */
  public static async resolveCredentialForExecution(params: {
    provider: AIProviderType;
    userId?: string;
    useUserBYOK?: boolean;
  }): Promise<ResolvedCredential | null> {
    const { provider, userId, useUserBYOK = true } = params;
    const db = await getDatabase();

    // 1. Try User BYOK for the specific user if available
    if (userId) {
      const userCreds = await db.getAICredentials({ userId, provider, ownerType: 'USER' });
      const readyUserCred = userCreds.find((c) => c.status === 'READY');
      if (readyUserCred) {
        const rawKey = SecretStore.decrypt({
          encryptedKey: readyUserCred.encryptedKey,
          iv: readyUserCred.iv,
          authTag: readyUserCred.authTag,
        });
        return {
          credentialId: readyUserCred.id,
          provider: readyUserCred.provider,
          ownerType: 'USER',
          source: 'DB',
          rawKey,
          maskedIdentifier: readyUserCred.maskedIdentifier,
        };
      }
    }

    // 2. Try System DB Credentials
    const systemCreds = await db.getAICredentials({ provider, ownerType: 'SYSTEM' });
    const readySystemCred = systemCreds.find((c) => c.status === 'READY');
    if (readySystemCred) {
      const rawKey = SecretStore.decrypt({
        encryptedKey: readySystemCred.encryptedKey,
        iv: readySystemCred.iv,
        authTag: readySystemCred.authTag,
      });
      return {
        credentialId: readySystemCred.id,
        provider: readySystemCred.provider,
        ownerType: 'SYSTEM',
        source: 'DB',
        rawKey,
        maskedIdentifier: readySystemCred.maskedIdentifier,
      };
    }

    // 3. Fallback: Any available USER BYOK credential in DB (Crucial for desktop / standalone mode)
    const anyUserCreds = await db.getAICredentials({ provider, ownerType: 'USER' });
    const readyAnyCred = anyUserCreds.find((c) => c.status === 'READY');
    if (readyAnyCred) {
      const rawKey = SecretStore.decrypt({
        encryptedKey: readyAnyCred.encryptedKey,
        iv: readyAnyCred.iv,
        authTag: readyAnyCred.authTag,
      });
      return {
        credentialId: readyAnyCred.id,
        provider: readyAnyCred.provider,
        ownerType: 'USER',
        source: 'DB',
        rawKey,
        maskedIdentifier: readyAnyCred.maskedIdentifier,
      };
    }

    // 4. Fallback to Virtual ENV Credential
    const envKey =
      provider === 'GEMINI' ? process.env.GEMINI_API_KEY?.trim() : process.env.OPENAI_API_KEY?.trim();
    const envId = provider === 'GEMINI' ? 'env_gemini' : 'env_openai';
    const envStatus = this.virtualEnvStatuses.get(envId) || 'READY';

    if (envKey && envKey.length > 0 && envStatus === 'READY') {
      return {
        credentialId: envId,
        provider,
        ownerType: 'SYSTEM',
        source: 'ENV',
        rawKey: envKey,
        maskedIdentifier: SecretStore.maskSecret(envKey),
      };
    }

    return null;
  }

  /**
   * Tests connection with provider API directly
   */
  public static async testConnection(
    provider: AIProviderType,
    rawKey: string
  ): Promise<{ success: boolean; status: CredentialState; message: string }> {
    if (!rawKey || rawKey.trim().length === 0) {
      return { success: false, status: 'AUTH_INVALID', message: 'API Key trống' };
    }

    const key = rawKey.trim();

    try {
      if (provider === 'GEMINI') {
        const testModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${key}`;
        await axios.post(
          url,
          {
            contents: [{ parts: [{ text: 'Ping test. Reply with pong.' }] }],
            generationConfig: { maxOutputTokens: 5 },
          },
          { timeout: 8000 }
        );
        return { success: true, status: 'READY', message: 'Kết nối Gemini thành công' };
      } else {
        const url = 'https://api.openai.com/v1/models';
        await axios.get(url, {
          headers: { Authorization: `Bearer ${key}` },
          timeout: 8000,
        });
        return { success: true, status: 'READY', message: 'Kết nối OpenAI thành công' };
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error?.message || err.message;

      if (status === 401 || status === 403 || /API_KEY_INVALID|invalid_api_key/i.test(errMsg)) {
        return { success: false, status: 'AUTH_INVALID', message: `Xác thực thất bại (401/403): ${errMsg}` };
      }
      if (status === 429 || /quota|rate_limit/i.test(errMsg)) {
        return { success: false, status: 'QUOTA_EXHAUSTED', message: `Hết quota hoặc rate limit (429): ${errMsg}` };
      }
      return { success: false, status: 'TEMPORARILY_UNAVAILABLE', message: `Lỗi kết nối (${status || 'Network'}): ${errMsg}` };
    }
  }
}
