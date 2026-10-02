/**
 * PipelineCoordinator - Central General-Purpose Engine Orchestrator
 * Coordinates:
 *   CreativeDirector → ResearchEngine → FactLayer → HookEngine → StoryArchitect →
 *   EntityGrounding → DesignSystem → SoundDirector → RetentionEditor → ContentReviewer →
 *   QualityScorer → PostRenderQA
 */

import { CreativeDirector, CreativeBrief } from './creativeDirector.js';
import { CreativeHistory } from './creativeHistory.js';
import { HookEngine, CandidateHook } from './hookEngine.js';
import { StoryArchitect, CompleteStoryboard, StoryboardSceneModel } from './storyArchitect.js';
import { EntityGroundingEngine, VisualGroundingResult } from './entityGrounding.js';
import { DESIGN_PRESETS, DesignPresetConfig } from './designSystem.js';
import { SoundDirector, AudioPlan } from './soundDirector.js';
import { EntityTopicExtractor } from './entityTopicExtractor.js';
import { ResearchEngine, ResearchOutput, SourceDocument } from '../services/researchEngine.js';
import { FactLayer, VerifiedFact } from '../services/factLayer.js';
import { ScriptPackage, StoryboardScene } from '../services/viralScriptEngine.js';
import { VideoCopywriter } from './videoCopywriter.js';
import { FinalContentSanitizer } from './finalContentSanitizer.js';
import {
  RetentionEditor,
  ContentReviewer,
  QualityScorer,
  ReviewResult,
  QualityScoreBreakdown,
} from '../services/qualityControlEngine.js';

export interface PipelineExecutionResult {
  jobId: string;
  brief: CreativeBrief;
  researchOutput: ResearchOutput | null;
  verifiedFacts: VerifiedFact[];
  hookCandidates: CandidateHook[];
  selectedHook: CandidateHook;
  storyboard: CompleteStoryboard;
  groundingResults: VisualGroundingResult[];
  designPreset: DesignPresetConfig;
  audioPlan: AudioPlan;
  scriptPackage: ScriptPackage;
  reviewResult: ReviewResult;
  qualityScore: QualityScoreBreakdown;
  scenes: Array<{
    tag: string;
    title: string;
    subtitle: string;
    metric: string;
    highlightText: string;
    iconKey: string;
    voiceOver: string;
    visualType?: string;
    mediaUrl?: string;
  }>;
}

export class PipelineCoordinator {
  /**
   * Orchestrates the general-purpose video generation pipeline across all 27 architectural points.
   */
  public static async execute(options: {
    jobId: string;
    prompt: string;
    targetDuration: number;
    url?: string;
    profile?: 'FAST' | 'BALANCED' | 'PREMIUM';
    extractedContext?: string;
    articleTitle?: string;
    articleImages?: string[];
    onProgress?: (stage: any, percent: number, message: string) => Promise<void> | void;
  }): Promise<PipelineExecutionResult> {
    const {
      jobId,
      prompt,
      targetDuration,
      url,
      profile = 'BALANCED',
      articleTitle = '',
      articleImages = [],
      onProgress,
    } = options;

    let extractedContext = options.extractedContext || '';

    // ==========================================
    // 1. CREATIVE DIRECTION (Section 1 & 2)
    // ==========================================
    await onProgress?.('writing_script', 5, 'Khởi tạo Giám đốc Sáng tạo (Creative Director)...');
    const brief = CreativeDirector.createBrief(prompt, targetDuration, url, profile);
    const avoidanceAdvice = CreativeHistory.getAvoidanceAdvice();

    // ==========================================
    // 2. RESEARCH & FACT GROUNDING (Section 4)
    // ==========================================
    await onProgress?.('writing_script', 12, 'Nghiên cứu nguồn tin chính thống và xác thực sự thật...');
    const topicInfo = EntityTopicExtractor.extract(prompt, articleTitle);
    const coreTopic = topicInfo.cleanTopic;
    let researchOutput: ResearchOutput | null = null;
    let verifiedFacts: VerifiedFact[] = [];

    if (!url || !extractedContext || extractedContext.length < 150) {
      researchOutput = await ResearchEngine.conductResearch(prompt);
      const factRes = FactLayer.extractFacts(researchOutput.approvedSources, coreTopic);
      verifiedFacts = factRes.facts;
      const approvedCtx = FactLayer.buildApprovedContext(verifiedFacts);
      if (approvedCtx.length > 50) {
        extractedContext = approvedCtx;
      }
    } else {
      let defaultDomain = 'chinhphu.vn';
      try {
        if (url) defaultDomain = new URL(url).hostname;
      } catch {
        // ignore
      }

      const paragraphs = extractedContext
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length >= 35);

      const mockDoc: SourceDocument = {
        title: articleTitle || topicInfo.displayTopic,
        url: url || '',
        domain: defaultDomain,
        sourceName: articleTitle || 'Báo điện tử',
        cleanedContent: extractedContext,
        keyPoints: paragraphs.slice(0, 8),
        images: articleImages,
        relevanceScore: 95,
        tier: 1,
        isApproved: true,
      };

      researchOutput = {
        query: prompt,
        coreTopic,
        searchQueries: topicInfo.searchQueries,
        rawSearchResults: [{ title: articleTitle || topicInfo.displayTopic, url: url || '', snippet: extractedContext.slice(0, 300) }],
        sources: [mockDoc],
        approvedSources: [mockDoc],
        topicCategory: 'general',
      };
      const factRes = FactLayer.extractFacts(researchOutput.approvedSources, coreTopic);
      verifiedFacts = factRes.facts;
    }

    const approvedSources = researchOutput?.approvedSources || [];

    // ==========================================
    // 3. HOOK ENGINE (Section 3)
    // ==========================================
    await onProgress?.('writing_script', 18, 'Sinh các phương án Hook và chọn Hook tối ưu...');
    const hookResult = HookEngine.generateAndSelectHook(coreTopic, brief, verifiedFacts);
    const hookCandidates = hookResult.allCandidates;
    const selectedHook = hookResult.selectedHook;

    // ==========================================
    // 4. STORY ARCHITECT & STORYBOARD (Section 6, 7 & 8)
    // ==========================================
    await onProgress?.('writing_script', 24, 'Thiết kế kịch bản phân cảnh (Storyboard Engine)...');
    const storyboard = StoryArchitect.constructStoryboard(
      coreTopic,
      brief,
      selectedHook,
      targetDuration,
      verifiedFacts
    );

    // ==========================================
    // 5. VISUAL DIRECTOR & ENTITY GROUNDING (Section 5, 9, 10)
    // ==========================================
    await onProgress?.('generating_visuals', 30, 'Kiểm chứng thực thể và chỉ đạo hình ảnh...');
    const groundingResults: VisualGroundingResult[] = [];
    const designPreset = DESIGN_PRESETS[brief.designPreset] || DESIGN_PRESETS.MODERN;

    storyboard.scenes.forEach((scene: StoryboardSceneModel, idx: number) => {
      const candidateImage = articleImages[idx] || undefined;
      const grounding = EntityGroundingEngine.evaluateAssetGrounding(
        scene.sceneId,
        scene.voiceText,
        coreTopic,
        candidateImage,
        Boolean(candidateImage && url)
      );
      groundingResults.push(grounding);
    });

    // ==========================================
    // 6. SOUND DIRECTOR (Section 15)
    // ==========================================
    const audioPlan = SoundDirector.planAudio(
      brief.contentType,
      brief.tone,
      storyboard.scenes.length,
      targetDuration
    );

    // ==========================================
    // 7. SCRIPT PACKAGE & RETENTION REVIEW (Section 16, 17)
    // ==========================================
    await onProgress?.('writing_script', 36, 'Biên tập tỷ lệ giữ chân người xem (Retention Editor)...');
    let scriptPackage: ScriptPackage = {
      title: storyboard.title,
      chosenHook: {
        id: selectedHook.id,
        type: 'curiosity_gap',
        hookText: selectedHook.text,
        score: selectedHook.scoreBreakdown.totalScore,
        reason: selectedHook.selectionRationale,
      },
      allHooks: hookCandidates.map((h) => ({
        id: h.id,
        type: 'curiosity_gap',
        hookText: h.text,
        score: h.scoreBreakdown.totalScore,
        reason: h.selectionRationale,
      })),
      scenes: storyboard.scenes.map((s: StoryboardSceneModel, idx: number) => {
        const copy = VideoCopywriter.craftSceneCopy({
          sceneIndex: idx,
          totalScenes: storyboard.scenes.length,
          purpose: s.purpose,
          coreTopic,
          voiceText: s.voiceText,
          contentType: brief.contentType,
        });

        return {
          sceneId: s.sceneId,
          purpose: s.purpose === 'hook' ? 'hook' : s.purpose === 'cta' ? 'cta' : 'key_insight_1',
          badgeTag: copy.badge,
          headline: copy.headline,
          caption: copy.supportingText,
          metricBadge: copy.metric || '',
          voiceText: FinalContentSanitizer.sanitizeString(s.voiceText),
          visualConcept: s.visualConcept,
          visualPrompt: s.visualConcept,
          visualType: s.visualType as any,
          sourceEvidence: verifiedFacts.map((f) => f.evidence),
          transition: s.transitionStrategy,
          estimatedDuration: s.estimatedDuration,
        };
      }),
      totalEstimatedDuration: targetDuration,
    };

    scriptPackage = RetentionEditor.optimizeStoryboard(scriptPackage, brief.contentType.toLowerCase());

    // ==========================================
    // 8. INDEPENDENT QUALITY GATE & REPAIR LOOP (Section 20)
    // ==========================================
    await onProgress?.('writing_script', 42, 'Hội đồng kiểm định chất lượng độc lập...');
    let reviewResult = ContentReviewer.reviewContent(
      prompt,
      approvedSources,
      verifiedFacts,
      scriptPackage
    );

    let qualityScore = QualityScorer.evaluateQuality(
      approvedSources,
      verifiedFacts,
      scriptPackage,
      reviewResult,
      brief.contentType === 'TRAVEL' || brief.contentType === 'LOCATION'
    );

    let repairLoop = 0;
    while (!qualityScore.passedProductionGate && repairLoop < 3) {
      repairLoop++;
      console.warn(`⚠️ [PipelineCoordinator] Quality loop ${repairLoop}: Điểm ${qualityScore.totalScore}/100. Đang tự động tinh chỉnh...`);
      scriptPackage = RetentionEditor.optimizeStoryboard(scriptPackage, brief.contentType.toLowerCase());
      reviewResult = ContentReviewer.reviewContent(
        prompt,
        approvedSources,
        verifiedFacts,
        scriptPackage
      );
      qualityScore = QualityScorer.evaluateQuality(
        approvedSources,
        verifiedFacts,
        scriptPackage,
        reviewResult,
        brief.contentType === 'TRAVEL' || brief.contentType === 'LOCATION'
      );
    }

    // ==========================================
    // 9. ANTI-REPETITION HISTORY (Section 18)
    // ==========================================
    CreativeHistory.recordGeneration({
      jobId,
      createdAt: new Date().toISOString(),
      contentType: brief.contentType,
      hookArchetype: selectedHook.archetype,
      storyArc: storyboard.arcType,
      designPreset: brief.designPreset,
      bgmGenre: audioPlan.bgmGenre,
      visualTypesUsed: storyboard.scenes.map((s: StoryboardSceneModel) => s.visualType),
    });

    // ==========================================
    // 10. MAP TO RENDERER SCENES (Sanitized & Visual-First)
    // ==========================================
    const scenes = scriptPackage.scenes.map((s: StoryboardScene, idx: number) => {
      const g = groundingResults[idx];
      const sanitized = FinalContentSanitizer.sanitizeScene({
        tag: s.badgeTag,
        title: s.headline,
        subtitle: s.caption,
        metric: s.metricBadge || undefined,
        highlightText: '', // Không đổ đoạn văn bản dài lên màn hình
        voiceOver: s.voiceText,
        caption: s.headline,
      });

      return {
        tag: sanitized.tag,
        title: sanitized.title,
        subtitle: sanitized.subtitle || '',
        metric: sanitized.metric || '',
        highlightText: '',
        iconKey: s.purpose === 'hook' ? 'sparkles_star' : s.purpose === 'cta' ? 'trophy' : 'chart_growth',
        voiceOver: sanitized.voiceOver,
        visualType: s.visualType,
        mediaUrl: g?.isAuthenticAssetApproved ? g.assetUrl : undefined,
      };
    });

    return {
      jobId,
      brief,
      researchOutput,
      verifiedFacts,
      hookCandidates,
      selectedHook,
      storyboard,
      groundingResults,
      designPreset,
      audioPlan,
      scriptPackage,
      reviewResult,
      qualityScore,
      scenes,
    };
  }
}
