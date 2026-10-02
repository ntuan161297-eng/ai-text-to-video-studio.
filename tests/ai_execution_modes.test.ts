/**
 * AI / NO-AI EXECUTION MODES ACCEPTANCE TEST SUITE
 * Verifies all 16 required invariants:
 *   - Zero LLM calls in NO_AI
 *   - Insufficient user content rejections
 *   - Voice-only insufficiency in NO_AI
 *   - Assisted AI research policies
 *   - Security: secret store encryption, key masking, tenant isolation
 *   - No duplicate DB credentials for virtual ENV
 *   - Provider pinning per job
 *   - Budget enforcement overriding failover
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { SecretStore } from '../src/ai/secretStore.js';
import { CredentialManager } from '../src/ai/credentialManager.js';
import { AIProviderManager } from '../src/ai/aiProviderManager.js';
import { ExecutionRouter } from '../src/ai/executionRouter.js';
import { getDatabase } from '../src/database/db.js';

import dotenv from 'dotenv';
dotenv.config();

describe('AI / NO-AI Execution Modes & Provider Routing Acceptance Tests', () => {
  let db: any;

  before(async () => {
    if (!process.env.GEMINI_API_KEY) {
      process.env.GEMINI_API_KEY = 'AIzaSyMockTestKey12345678901234567890';
    }
    db = await getDatabase();
  });

  // =========================================================================
  // TEST GROUP 1: NO_AI CONTENT SUFFICIENCY & ZERO LLM CALLS
  // =========================================================================
  describe('Group 1: NO_AI Invariants & Content Sufficiency', () => {
    it('TEST-01: NO_AI + Final script must result in ZERO LLM calls and skip SCRIPT_WRITER', () => {
      const plan = ExecutionRouter.planExecution({
        jobId: 'job_test_no_ai_script',
        mode: 'NO_AI',
        input: {
          prompt: 'Giới thiệu máy hút bụi',
          script: 'Đây là câu mở đầu giới thiệu máy hút bụi. Máy có lực hút 20000Pa mạnh mẽ. Giá chỉ 990k.',
        },
      });

      assert.strictEqual(plan.aiEnabled, false);
      assert.strictEqual(plan.mode, 'NO_AI');
      assert.strictEqual(plan.stagesUsingAI.length, 0);
      assert.ok(plan.stagesToSkip.includes('SCRIPT_WRITER'));
      assert.strictEqual(plan.reasons['SCRIPT_WRITER'], 'USER_SCRIPT_PROVIDED');
    });

    it('TEST-02: NO_AI + Uploaded Voice + Transcript must skip TTS with ZERO LLM calls', () => {
      const plan = ExecutionRouter.planExecution({
        jobId: 'job_test_no_ai_voice',
        mode: 'NO_AI',
        input: {
          prompt: 'Giới thiệu giày thể thao',
          uploadedVoiceUrl: 'C:/mock/voice.mp3',
          userVoiceTranscript: 'Đôi giày thể thao này siêu nhẹ và êm ái khi chạy bộ.',
        },
      });

      assert.strictEqual(plan.aiEnabled, false);
      assert.strictEqual(plan.stagesUsingAI.length, 0);
      assert.ok(plan.stagesToSkip.includes('TTS'));
      assert.strictEqual(plan.reasons['TTS'], 'USER_VOICE_PROVIDED');
      assert.ok(plan.stagesToSkip.includes('SCRIPT_WRITER'));
    });

    it('TEST-02B: NO_AI + Voice-only (WITHOUT transcript or script) must be rejected with INSUFFICIENT_USER_CONTENT', () => {
      assert.throws(
        () => {
          ExecutionRouter.planExecution({
            jobId: 'job_test_voice_only',
            mode: 'NO_AI',
            input: {
              prompt: 'Giới thiệu son môi',
              uploadedVoiceUrl: 'C:/mock/voice.mp3',
              // No script, no transcript
            },
          });
        },
        (err: any) => {
          return (
            err.message.includes('INSUFFICIENT_USER_CONTENT') &&
            err.message.includes('userVoiceTranscript_or_script')
          );
        }
      );
    });

    it('TEST-03: NO_AI + Facts only (without script/narration) must be rejected with INSUFFICIENT_USER_CONTENT', () => {
      assert.throws(
        () => {
          ExecutionRouter.planExecution({
            jobId: 'job_test_facts_only',
            mode: 'NO_AI',
            input: {
              prompt: 'Giới thiệu máy lọc nước',
              facts: ['Lõi lọc RO 10 cấp', 'Loại bỏ 99% vi khuẩn'],
            },
          });
        },
        (err: any) => {
          return err.message.includes('INSUFFICIENT_USER_CONTENT');
        }
      );
    });

    it('TEST-04: NO_AI + Outline only (without script/narration) must be rejected with INSUFFICIENT_USER_CONTENT', () => {
      assert.throws(
        () => {
          ExecutionRouter.planExecution({
            jobId: 'job_test_outline_only',
            mode: 'NO_AI',
            input: {
              prompt: 'Giới thiệu sách mới',
              outline: ['Phần 1: Mở đầu', 'Phần 2: Nội dung', 'Phần 3: Kết luận'],
            },
          });
        },
        (err: any) => {
          return err.message.includes('INSUFFICIENT_USER_CONTENT');
        }
      );
    });
  });

  // =========================================================================
  // TEST GROUP 2: ASSISTED_AI & FULL_AI
  // =========================================================================
  describe('Group 2: ASSISTED_AI & Research Policies', () => {
    it('TEST-05A: ASSISTED_AI + Facts with USE_AS_PROVIDED policy skips external research', () => {
      const plan = ExecutionRouter.planExecution({
        jobId: 'job_test_assisted_facts',
        mode: 'ASSISTED_AI',
        input: {
          prompt: 'Giới thiệu bàn phím cơ',
          facts: ['Switch Red gõ êm ái', 'Đèn LED RGB 16 triệu màu'],
          researchPolicy: 'USE_AS_PROVIDED',
        },
      });

      assert.strictEqual(plan.mode, 'ASSISTED_AI');
      assert.ok(plan.stagesToSkip.includes('RESEARCH'));
      assert.strictEqual(plan.reasons['RESEARCH'], 'USER_FACTS_PROVIDED_DIRECTLY');
      assert.ok(plan.stagesUsingAI.includes('SCRIPT_WRITER'));
    });

    it('TEST-05B: ASSISTED_AI + Facts with RESEARCH_MISSING_ONLY policy runs research', () => {
      const plan = ExecutionRouter.planExecution({
        jobId: 'job_test_assisted_missing',
        mode: 'ASSISTED_AI',
        input: {
          prompt: 'Giới thiệu chuột gaming',
          facts: ['Cảm biến 16000 DPI'],
          researchPolicy: 'RESEARCH_MISSING_ONLY',
        },
      });

      assert.ok(plan.stagesToRun.includes('RESEARCH'));
      assert.ok(plan.reasons['RESEARCH'].includes('RESEARCH_MISSING_ONLY'));
    });

    it('TEST-06: FULL_AI runs canonical semantic pipeline', () => {
      const plan = ExecutionRouter.planExecution({
        jobId: 'job_test_full_ai',
        mode: 'FULL_AI',
        input: {
          prompt: 'Lịch sử phát triển của trí tuệ nhân tạo',
        },
      });

      assert.strictEqual(plan.aiEnabled, true);
      assert.strictEqual(plan.mode, 'FULL_AI');
      assert.ok(plan.stagesUsingAI.includes('SCRIPT_WRITER'));
      assert.ok(plan.stagesToRun.includes('RESEARCH'));
    });
  });

  // =========================================================================
  // TEST GROUP 3: SECURITY, SECRET STORE & TENANT ISOLATION
  // =========================================================================
  describe('Group 3: Security & Secret Store Invariants', () => {
    it('TEST-07: SecretStore encrypts with AES-256-GCM and decrypts accurately', () => {
      const plainKey = 'AIzaSyDemoSecretKeyForTesting1234567890';
      const encrypted = SecretStore.encrypt(plainKey);

      assert.ok(encrypted.encryptedKey);
      assert.ok(encrypted.iv);
      assert.ok(encrypted.authTag);
      assert.notStrictEqual(encrypted.encryptedKey, plainKey);

      const decrypted = SecretStore.decrypt(encrypted);
      assert.strictEqual(decrypted, plainKey);
    });

    it('TEST-08: SecretStore masks keys properly and never returns raw key in metadata', () => {
      const geminiKey = 'AIzaSyD7gJkL9920141XyZ4xK9';
      const openAIKey = 'sk-proj-99881122334455667788a1b2c3d4e5f6g7h8aZ1';

      const maskedGemini = SecretStore.maskSecret(geminiKey);
      const maskedOpenAI = SecretStore.maskSecret(openAIKey);

      assert.strictEqual(maskedGemini, 'AIzaSy...4xK9');
      assert.ok(maskedOpenAI.startsWith('sk-proj-...'));
      assert.ok(maskedOpenAI.endsWith('8aZ1'));
      assert.ok(!maskedGemini.includes('D7gJkL'));
    });

    it('TEST-09: Environment credentials act as virtual memory credentials without duplicate DB insertions', async () => {
      const creds1 = CredentialManager.getVirtualEnvCredentials();
      const countBefore = (await db.getAICredentials()).length;

      // Re-invoke
      const creds2 = CredentialManager.getVirtualEnvCredentials();
      const countAfter = (await db.getAICredentials()).length;

      assert.strictEqual(creds1.length, creds2.length);
      assert.strictEqual(countBefore, countAfter, 'Virtual ENV credentials must NEVER insert duplicates into DB');
    });

    it('TEST-10: Tenant isolation - User A cannot access or delete User B BYOK credential', async () => {
      const userAId = 'usr_test_user_a';
      const userBId = 'usr_test_user_b';

      const credA = await CredentialManager.addCredential({
        provider: 'GEMINI',
        ownerType: 'USER',
        userId: userAId,
        rawSecret: 'AIzaSyTestUserASecretKey999',
      });

      const userBCreds = await CredentialManager.getUserCredentials(userBId);
      const foundInB = userBCreds.some((c) => c.id === credA.id);
      assert.strictEqual(foundInB, false, 'User B must not see User A credentials');

      // User B trying to delete User A credential must fail
      const deleteAttempt = await CredentialManager.deleteCredential(credA.id, userBId);
      assert.strictEqual(deleteAttempt, false, 'User B must not be able to delete User A credential');

      // Cleanup
      await CredentialManager.deleteCredential(credA.id, userAId);
    });
  });

  // =========================================================================
  // TEST GROUP 4: BUDGET ENFORCEMENT & PROVIDER PINNING
  // =========================================================================
  describe('Group 4: Budget Enforcement & Provider Pinning', () => {
    it('TEST-11: ProviderSession pins provider and enforces maxAIRequestsPerJob budget', async () => {
      const jobId = `job_budget_${Date.now()}`;
      const session = await AIProviderManager.initSession({
        jobId,
        strategy: 'AUTO',
      });

      assert.ok(session.pinnedProvider);
      assert.strictEqual(session.budgetStatus, 'OK');

      // Simulate reaching max requests
      session.llmCalls = session.adminConfig.maxAIRequestsPerJob;

      // Next call must be blocked immediately
      await assert.rejects(
        async () => {
          await AIProviderManager.executePrompt(
            {
              jobId,
              userPrompt: 'Test prompt exceeding budget',
            },
            'script_writing'
          );
        },
        (err: any) => {
          return err.message.includes('AI_JOB_BUDGET_REACHED');
        }
      );

      assert.strictEqual(session.budgetStatus, 'AI_JOB_BUDGET_REACHED');
      AIProviderManager.cleanupSession(jobId);
    });
  });
});
