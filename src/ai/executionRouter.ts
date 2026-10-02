/**
 * EXECUTION ROUTER & INPUT SUFFICIENCY VERIFIER
 * Determines whether user-supplied input is sufficient for video generation.
 * Generates an isolated ExecutionPlan per job, marking stages to run/skip with strict reasons.
 * Enforces NO_AI content sufficiency (zero hallucination / zero template narration).
 */

import {
  AIExecutionMode,
  AIProviderStrategy,
  UserInputData,
  InputSufficiencyCheck,
  ExecutionPlan,
  UserFactResearchPolicy,
} from './types.js';

export class ExecutionRouter {
  /**
   * Validates if user input data is sufficient for the requested execution mode
   */
  public static validateInputSufficiency(
    mode: AIExecutionMode,
    input: UserInputData
  ): InputSufficiencyCheck {
    const missing: string[] = [];

    const hasPrompt = Boolean(input.prompt?.trim() || input.topic?.trim());
    const hasScript = Boolean(
      (input.script && input.script.trim().length > 20) ||
      (input.scriptBeats && input.scriptBeats.length > 0)
    );
    const hasVoice = Boolean(input.uploadedVoiceUrl?.trim());
    const hasVoiceTranscript = Boolean(input.userVoiceTranscript?.trim());
    const hasFacts = Boolean(input.facts && input.facts.length > 0);
    const hasOutline = Boolean(input.outline && input.outline.length > 0);

    // MODE: NO_AI (Strict semantic content sufficiency)
    if (mode === 'NO_AI') {
      // In NO_AI, narration cannot be invented or synthesized from templates.
      // Must satisfy CASE A (final script) or CASE B (voice + transcript/beats).
      // Voice-only is strictly insufficient because system cannot perform STT/semantic inferencing.
      if (hasVoice && !hasScript && !hasVoiceTranscript) {
        missing.push(
          'userVoiceTranscript_or_script: Trong chế độ Không dùng AI (NO_AI), file giọng đọc thu âm một mình là không đủ. Vui lòng cung cấp thêm kịch bản chữ (transcript/script beats) để hệ thống tạo phụ đề và căn chỉnh hình ảnh chính xác.'
        );
      } else if (!hasScript && !hasVoice) {
        missing.push(
          'script_or_voice_with_transcript: Chế độ Không dùng AI yêu cầu kịch bản hoàn chỉnh (hoặc file giọng đọc kèm bản kịch bản phân cảnh). Dữ kiện (facts) hoặc dàn ý (outline) đơn thuần không thể tự động biến thành lời bình nếu không có AI.'
        );
      }

      if (!hasPrompt && !hasScript) {
        missing.push('topic_or_script: Chủ đề hoặc kịch bản video không được để trống.');
      }

      if (missing.length > 0) {
        return {
          isSufficient: false,
          missingRequirements: missing,
          suggestedMode: (hasFacts || hasOutline) ? 'ASSISTED_AI' : 'FULL_AI',
          message: 'Dữ liệu đầu vào chưa đủ để sản xuất video mà không dùng AI. Vui lòng bổ sung kịch bản chi tiết hoặc chuyển sang chế độ Có hỗ trợ AI.',
        };
      }

      return {
        isSufficient: true,
        missingRequirements: [],
        message: 'Dữ liệu đầu vào đầy đủ cho chế độ NO_AI.',
      };
    }

    // MODE: ASSISTED_AI
    if (mode === 'ASSISTED_AI') {
      if (!hasPrompt && !hasScript && !hasFacts && !hasOutline) {
        missing.push('topic_or_facts: Vui lòng cung cấp ít nhất chủ đề, dàn ý hoặc các dữ kiện (facts) để AI hỗ trợ phát triển nội dung.');
      }

      if (missing.length > 0) {
        return {
          isSufficient: false,
          missingRequirements: missing,
          suggestedMode: 'FULL_AI',
          message: 'Chế độ Trợ lý AI (ASSISTED_AI) cần thông tin nền tảng (chủ đề, facts hoặc dàn ý) từ người dùng.',
        };
      }

      return {
        isSufficient: true,
        missingRequirements: [],
        message: 'Dữ liệu đầu vào hợp lệ cho chế độ ASSISTED_AI.',
      };
    }

    // MODE: FULL_AI
    if (!hasPrompt && !hasScript) {
      missing.push('prompt: Vui lòng nhập chủ đề hoặc ý tưởng video cần tạo.');
    }

    if (missing.length > 0) {
      return {
        isSufficient: false,
        missingRequirements: missing,
        message: 'Vui lòng cung cấp yêu cầu hoặc ý tưởng ban đầu.',
      };
    }

    return {
      isSufficient: true,
      missingRequirements: [],
      message: 'Dữ liệu đầy đủ cho chế độ FULL_AI.',
    };
  }

  /**
   * Builds an isolated ExecutionPlan for a specific Job
   */
  public static planExecution(options: {
    jobId: string;
    mode: AIExecutionMode;
    input: UserInputData;
    providerStrategy?: AIProviderStrategy;
    pinnedProvider?: 'GEMINI' | 'OPENAI' | 'NONE';
  }): ExecutionPlan {
    const { jobId, mode, input, providerStrategy = 'AUTO', pinnedProvider = 'NONE' } = options;

    const validation = this.validateInputSufficiency(mode, input);
    if (!validation.isSufficient) {
      throw new Error(
        `INSUFFICIENT_USER_CONTENT: ${validation.message} (Thiếu: ${validation.missingRequirements.join(', ')})`
      );
    }

    const stagesToRun: string[] = [];
    const stagesToSkip: string[] = [];
    const stagesUsingAI: string[] = [];
    const stagesUsingUserInput: string[] = [];
    const stagesUsingDeterministicProcessing: string[] = [];
    const reasons: Record<string, string> = {};

    const hasUserScript = Boolean(
      (input.script && input.script.trim().length > 20) ||
      (input.scriptBeats && input.scriptBeats.length > 0) ||
      Boolean(input.userVoiceTranscript?.trim())
    );
    const hasUserVoice = Boolean(input.uploadedVoiceUrl?.trim());
    const hasUserVisuals = Boolean(input.uploadedVisuals && input.uploadedVisuals.length > 0);
    const hasUserFacts = Boolean(input.facts && input.facts.length > 0);

    const researchPolicy: UserFactResearchPolicy =
      input.researchPolicy || (hasUserFacts ? 'RESEARCH_MISSING_ONLY' : 'RESEARCH_MISSING_ONLY');

    // =========================================================================
    // 1. INTENT & PLANNING STAGES
    // =========================================================================
    stagesToRun.push('INTENT_RESOLUTION');
    stagesUsingDeterministicProcessing.push('INTENT_RESOLUTION');
    reasons['INTENT_RESOLUTION'] = 'CANONICAL_SPEC_REQUIRED';

    // =========================================================================
    // 2. RESEARCH STAGE
    // =========================================================================
    if (mode === 'NO_AI') {
      stagesToSkip.push('RESEARCH');
      stagesUsingUserInput.push('RESEARCH');
      reasons['RESEARCH'] = 'NO_AI_MODE_RESEARCH_SKIPPED';
    } else if (hasUserFacts && researchPolicy === 'USE_AS_PROVIDED') {
      stagesToSkip.push('RESEARCH');
      stagesUsingUserInput.push('RESEARCH');
      reasons['RESEARCH'] = 'USER_FACTS_PROVIDED_DIRECTLY';
    } else {
      stagesToRun.push('RESEARCH');
      stagesUsingDeterministicProcessing.push('RESEARCH');
      reasons['RESEARCH'] = hasUserFacts
        ? `RESEARCH_WITH_POLICY_${researchPolicy}`
        : 'CANONICAL_RESEARCH_REQUIRED';
    }

    // =========================================================================
    // 3. SCRIPT WRITING STAGE
    // =========================================================================
    if (hasUserScript) {
      stagesToSkip.push('SCRIPT_WRITER');
      stagesUsingUserInput.push('SCRIPT_WRITER');
      reasons['SCRIPT_WRITER'] = 'USER_SCRIPT_PROVIDED';
    } else {
      if (mode === 'NO_AI') {
        throw new Error('INSUFFICIENT_USER_CONTENT: Không có kịch bản trong chế độ NO_AI');
      }
      stagesToRun.push('SCRIPT_WRITER');
      stagesUsingAI.push('SCRIPT_WRITER');
      reasons['SCRIPT_WRITER'] = mode === 'ASSISTED_AI'
        ? 'AI_ASSISTED_SCRIPT_GENERATION'
        : 'FULL_AI_SCRIPT_GENERATION';
    }

    // =========================================================================
    // 4. TTS / VOICE STAGE
    // =========================================================================
    if (hasUserVoice) {
      stagesToSkip.push('TTS');
      stagesUsingUserInput.push('TTS');
      reasons['TTS'] = 'USER_VOICE_PROVIDED';
    } else {
      stagesToRun.push('TTS');
      stagesUsingDeterministicProcessing.push('TTS');
      reasons['TTS'] = 'SYNTHESIZE_VOICE_VIA_EDGE_TTS';
    }

    // =========================================================================
    // 5. ASSETS & PRODUCTION STAGES
    // =========================================================================
    if (hasUserVisuals) {
      stagesToRun.push('ENTITY_ASSETS');
      stagesUsingUserInput.push('ENTITY_ASSETS');
      reasons['ENTITY_ASSETS'] = 'PRIORITIZE_USER_UPLOADED_ASSETS';
    } else {
      stagesToRun.push('ENTITY_ASSETS');
      stagesUsingDeterministicProcessing.push('ENTITY_ASSETS');
      reasons['ENTITY_ASSETS'] = 'RETRIEVE_REALISTIC_STOCK_VISUALS';
    }

    // Storyboard & Composition & Rendering are deterministic
    stagesToRun.push('STORYBOARD', 'SCENE_COMPOSITION', 'RENDER_MP4');
    stagesUsingDeterministicProcessing.push('STORYBOARD', 'SCENE_COMPOSITION', 'RENDER_MP4');
    reasons['RENDER_MP4'] = 'CANONICAL_RENDERER_EXECUTION';

    const aiEnabled = mode !== 'NO_AI' && stagesUsingAI.length > 0;

    return {
      jobId,
      aiEnabled,
      mode,
      stagesToRun,
      stagesToSkip,
      stagesUsingAI,
      stagesUsingUserInput,
      stagesUsingDeterministicProcessing,
      pinnedProvider: aiEnabled ? (pinnedProvider !== 'NONE' ? pinnedProvider : 'GEMINI') : 'NONE',
      providerStrategy,
      reasons,
      researchPolicy,
      userScriptProvided: hasUserScript,
      userVoiceProvided: hasUserVoice,
      userVisualsProvided: hasUserVisuals,
    };
  }
}
