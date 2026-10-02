/**
 * AI PROVIDER MANAGER & CENTRALIZED LLM DISPATCHER
 * Grand centralized dispatcher for all semantic LLM calls.
 * Enforces:
 *   1. Per-job provider pinning (no stage ping-pong).
 *   2. Bounded failover (Primary -> Secondary pinned upon failure).
 *   3. Strict budget guards (maxAIRequestsPerJob).
 *   4. Zero secret leaks in telemetry or logs.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {
  AIProviderType,
  AIProviderStrategy,
  AIExecutionTrace,
  AdminAIConfig,
} from './types.js';
import { CredentialManager, ResolvedCredential } from './credentialManager.js';
import { getDatabase, DEFAULT_ADMIN_CONFIG } from '../database/db.js';

export interface ProviderCallParams {
  jobId: string;
  systemPrompt?: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  workspaceDir?: string;
}

export interface ProviderSession {
  jobId: string;
  pinnedProvider: AIProviderType;
  primaryProvider: AIProviderType;
  secondaryProvider?: AIProviderType;
  activeCredential: ResolvedCredential;
  actualProvidersUsed: Set<AIProviderType>;
  llmCalls: number;
  retryCount: number;
  failoverCount: number;
  failoverReasons: string[];
  stagesUsingAI: Set<string>;
  stagesSkipped: Set<string>;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  budgetStatus: 'OK' | 'AI_JOB_BUDGET_REACHED';
  adminConfig: AdminAIConfig;
}

export class AIProviderManager {
  // Map of active job sessions (isolated per job)
  private static sessions: Map<string, ProviderSession> = new Map();

  /**
   * Gets an active session for a job
   */
  public static getSession(jobId: string): ProviderSession | undefined {
    return this.sessions.get(jobId);
  }

  /**
   * Initializes or retrieves an isolated ProviderSession pinned for a specific Job
   */
  public static async initSession(options: {
    jobId: string;
    strategy?: AIProviderStrategy;
    userId?: string;
    useUserBYOK?: boolean;
  }): Promise<ProviderSession> {
    const { jobId, strategy = 'AUTO', userId, useUserBYOK = true } = options;

    if (this.sessions.has(jobId)) {
      return this.sessions.get(jobId)!;
    }

    const db = await getDatabase();
    const adminConfig = await db.getAdminAIConfig().catch(() => DEFAULT_ADMIN_CONFIG);

    // Resolve Primary & Secondary providers according to strategy & config
    let primary: AIProviderType = 'GEMINI';
    let secondary: AIProviderType | undefined = 'OPENAI';

    if (strategy === 'OPENAI') {
      primary = 'OPENAI';
      secondary = 'GEMINI';
    } else if (strategy === 'GEMINI') {
      primary = 'GEMINI';
      secondary = 'OPENAI';
    } else {
      // AUTO strategy
      if (adminConfig.defaultStrategy === 'OPENAI') {
        primary = 'OPENAI';
        secondary = 'GEMINI';
      } else {
        primary = 'GEMINI';
        secondary = 'OPENAI';
      }
    }

    // Resolve credential for Primary Provider
    let credential = await CredentialManager.resolveCredentialForExecution({
      provider: primary,
      userId,
      useUserBYOK,
    });

    // If primary not usable and failover enabled, check secondary
    let pinned = primary;
    if (!credential && adminConfig.providerFailover && secondary) {
      credential = await CredentialManager.resolveCredentialForExecution({
        provider: secondary,
        userId,
        useUserBYOK,
      });
      if (credential) {
        pinned = secondary;
      }
    }

    if (!credential) {
      throw new Error(
        'AI_PROVIDER_POOL_UNAVAILABLE: Không có credential khả dụng cho bất kỳ AI provider nào (Gemini / OpenAI). Vui lòng cấu hình API Key.'
      );
    }

    const session: ProviderSession = {
      jobId,
      pinnedProvider: pinned,
      primaryProvider: primary,
      secondaryProvider: secondary,
      activeCredential: credential,
      actualProvidersUsed: new Set([pinned]),
      llmCalls: 0,
      retryCount: 0,
      failoverCount: 0,
      failoverReasons: [],
      stagesUsingAI: new Set(),
      stagesSkipped: new Set(),
      inputTokens: null,
      outputTokens: null,
      estimatedCost: null,
      budgetStatus: 'OK',
      adminConfig,
    };

    this.sessions.set(jobId, session);

    // Dong bo khoa rawKey vao process.env de cac module he thong luon truy cap duoc
    if (credential?.rawKey) {
      if (credential.provider === 'GEMINI') {
        process.env.GEMINI_API_KEY = credential.rawKey;
      } else if (credential.provider === 'OPENAI') {
        process.env.OPENAI_API_KEY = credential.rawKey;
      }
    }

    return session;
  }

  /**
   * Executes a central semantic LLM call for a job
   */
  public static async executePrompt(
    params: ProviderCallParams,
    stageName = 'semantic_generation'
  ): Promise<string> {
    const { jobId, systemPrompt, userPrompt, jsonMode = false, temperature = 0.7, maxTokens = 4000, workspaceDir } = params;

    let session = this.sessions.get(jobId);
    if (!session) {
      session = await this.initSession({ jobId });
    }

    // 1. BUDGET CHECK: Application budget overrides failover
    if (session.llmCalls >= session.adminConfig.maxAIRequestsPerJob) {
      session.budgetStatus = 'AI_JOB_BUDGET_REACHED';
      this.writeTelemetryTrace(session, workspaceDir);
      throw new Error(
        `AI_JOB_BUDGET_REACHED: Đã đạt giới hạn tối đa ${session.adminConfig.maxAIRequestsPerJob} cuộc gọi AI cho một video job. Ngừng gọi AI thêm.`
      );
    }

    session.stagesUsingAI.add(stageName);

    // 2. Execute call with Pinned Provider & Bounded Failover
    try {
      const response = await this.callProviderApi({
        provider: session.pinnedProvider,
        rawKey: session.activeCredential.rawKey,
        systemPrompt,
        userPrompt,
        jsonMode,
        temperature,
        maxTokens,
      });

      session.llmCalls += 1;
      session.actualProvidersUsed.add(session.pinnedProvider);
      this.writeTelemetryTrace(session, workspaceDir);
      return response;
    } catch (primaryErr: any) {
      console.warn(`[AIProviderManager] Primary provider ${session.pinnedProvider} failed: ${primaryErr.message}`);

      // Check if failover is allowed
      const canFailover =
        session.adminConfig.providerFailover &&
        session.secondaryProvider &&
        session.pinnedProvider !== session.secondaryProvider;

      if (!canFailover) {
        this.writeTelemetryTrace(session, workspaceDir);
        throw primaryErr;
      }

      // Mark primary credential as temporarily unavailable if applicable
      CredentialManager.setVirtualEnvStatus(session.activeCredential.credentialId, 'TEMPORARILY_UNAVAILABLE');

      // Attempt Failover to Secondary Provider
      console.log(`[AIProviderManager] 🔄 Bắt đầu failover từ ${session.pinnedProvider} sang ${session.secondaryProvider}...`);
      const secondaryCred = await CredentialManager.resolveCredentialForExecution({
        provider: session.secondaryProvider!,
      });

      if (!secondaryCred) {
        console.warn(`[AIProviderManager] Secondary provider ${session.secondaryProvider} has no available credentials.`);
        this.writeTelemetryTrace(session, workspaceDir);
        throw primaryErr;
      }

      // PIN SECONDARY PROVIDER FOR REMAINDER OF JOB
      session.pinnedProvider = session.secondaryProvider!;
      session.activeCredential = secondaryCred;
      session.failoverCount += 1;
      session.failoverReasons.push(`Failover from ${session.primaryProvider}: ${primaryErr.message}`);
      session.actualProvidersUsed.add(session.secondaryProvider!);

      // Execute on Secondary Provider
      try {
        const secondaryResponse = await this.callProviderApi({
          provider: session.pinnedProvider,
          rawKey: session.activeCredential.rawKey,
          systemPrompt,
          userPrompt,
          jsonMode,
          temperature,
          maxTokens,
        });

        session.llmCalls += 1;
        this.writeTelemetryTrace(session, workspaceDir);
        return secondaryResponse;
      } catch (secondaryErr: any) {
        console.error(`[AIProviderManager] Secondary provider ${session.pinnedProvider} also failed: ${secondaryErr.message}`);
        this.writeTelemetryTrace(session, workspaceDir);
        throw secondaryErr;
      }
    }
  }

  /**
   * Internal HTTP invocation to provider endpoints (Gemini / OpenAI)
   * With bounded transient retry (max 1 retry for network/5xx; 0 for 401/403).
   */
  private static async callProviderApi(params: {
    provider: AIProviderType;
    rawKey: string;
    systemPrompt?: string;
    userPrompt: string;
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { provider, rawKey, systemPrompt, userPrompt, jsonMode, temperature, maxTokens } = params;

    let attempt = 0;
    const maxAttempts = 2; // Bounded retry

    while (attempt < maxAttempts) {
      attempt++;
      try {
        if (provider === 'GEMINI') {
          return await this.callGemini({ rawKey, systemPrompt, userPrompt, jsonMode, temperature, maxTokens });
        } else {
          return await this.callOpenAI({ rawKey, systemPrompt, userPrompt, jsonMode, temperature, maxTokens });
        }
      } catch (err: any) {
        const status = err.response?.status;
        const isTransient = !status || status >= 500 || status === 408 || status === 429;

        // If permanent error (401, 403, invalid key) -> DO NOT RETRY
        if (!isTransient || attempt >= maxAttempts) {
          throw err;
        }

        const waitTime = status === 429 ? 2500 * attempt : 1000 * attempt;
        console.warn(`[AIProviderManager] Tạm thời gặp lỗi (${status || 'Network'}). Tự động thử lại sau ${waitTime}ms (lần ${attempt}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('PROVIDER_CALL_FAILED_AFTER_RETRIES');
  }

  private static async callGemini(params: {
    rawKey: string;
    systemPrompt?: string;
    userPrompt: string;
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { rawKey, systemPrompt, userPrompt, jsonMode, temperature, maxTokens } = params;
    const cleanKey = (rawKey || '').trim();
    let configuredModel = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim();
    if (configuredModel.includes('3.5')) {
      configuredModel = 'gemini-1.5-flash';
    }

    const candidateModels = [configuredModel, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    let lastError: any = null;
    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

      const parts: any[] = [];
      if (systemPrompt) {
        parts.push({ text: `[System Instruction]:\n${systemPrompt}` });
      }
      parts.push({ text: userPrompt });

      const payload: any = {
        contents: [{ parts }],
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens ?? 4000,
        },
      };

      if (jsonMode) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      try {
        const res = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        });

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('GEMINI_EMPTY_RESPONSE: Provider không trả về nội dung text');
        }
        return text.trim();
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const isLastModel = model === candidateModels[candidateModels.length - 1];

        if ((status === 404 || status === 429) && !isLastModel) {
          console.warn(`[AIProviderManager] Model "${model}" trả về mã lỗi ${status} (${status === 429 ? 'Vượt hạn mức/Rate limit' : 'Không tìm thấy model'}). Tự động chuyển sang model thay thế...`);
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }

        const detailedMsg = err.response?.data?.error?.message || err.message;
        throw new Error(`GEMINI_API_ERROR (${status || 'Network'}): ${detailedMsg}`);
      }
    }

    throw lastError || new Error('GEMINI_CALL_FAILED');
  }

  private static async callOpenAI(params: {
    rawKey: string;
    systemPrompt?: string;
    userPrompt: string;
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { rawKey, systemPrompt, userPrompt, jsonMode, temperature, maxTokens } = params;
    const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const payload: any = {
      model,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 4000,
    };

    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(rawKey || '').trim()}`,
        },
        timeout: 30000,
      });

      const text = res.data?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('OPENAI_EMPTY_RESPONSE: Provider không trả về nội dung');
      }
      return text.trim();
    } catch (err: any) {
      const status = err.response?.status;
      const detailedMsg = err.response?.data?.error?.message || err.message;
      throw new Error(`OPENAI_API_ERROR (${status || 'Network'}): ${detailedMsg}`);
    }
  }

  /**
   * Writes telemetry trace to workspace without exposing secrets
   */
  public static writeTelemetryTrace(session: ProviderSession, workspaceDir?: string): AIExecutionTrace {
    const trace: AIExecutionTrace = {
      jobId: session.jobId,
      aiEnabled: true,
      mode: 'FULL_AI',
      providerStrategy: session.adminConfig.defaultStrategy,
      primaryProvider: session.primaryProvider,
      actualProvidersUsed: Array.from(session.actualProvidersUsed),
      keySource: session.activeCredential.source === 'ENV' ? 'ENV' : session.activeCredential.ownerType === 'USER' ? 'USER' : 'SYSTEM',
      llmCalls: session.llmCalls,
      stagesUsingAI: Array.from(session.stagesUsingAI),
      stagesSkipped: Array.from(session.stagesSkipped),
      retryCount: session.retryCount,
      failoverCount: session.failoverCount,
      failoverReasons: session.failoverReasons,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      estimatedCost: session.estimatedCost,
      budgetStatus: session.budgetStatus,
    };

    if (workspaceDir && fs.existsSync(workspaceDir)) {
      try {
        const tracePath = path.join(workspaceDir, 'ai_execution_trace.json');
        fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2), 'utf-8');
      } catch (err: any) {
        console.warn('[AIProviderManager] Could not write telemetry trace:', err.message);
      }
    }

    return trace;
  }

  /**
   * Cleans up job session state after completion
   */
  public static cleanupSession(jobId: string): void {
    this.sessions.delete(jobId);
  }
}
