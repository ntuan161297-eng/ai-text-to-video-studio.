/**
 * STORY ARCHITECT & STORYBOARD ENGINE (Section 6, 7 & 8)
 * Quản lý đa dạng cấu trúc Story Arc, tính toán nhịp điệu (speaking rate) và sinh Storyboard hoàn chỉnh.
 * Sử dụng SeniorScriptWriter để sinh lời bình tiếng Việt tự nhiên, 1 câu ≈ 1 ý, không rập khuôn mẫu cũ.
 */

import { CreativeBrief } from './creativeDirector.js';
import { CandidateHook } from './hookEngine.js';
import { VerifiedFact as OldVerifiedFact } from '../services/factLayer.js';
import { VerifiedFact as BrainVerifiedFact, ContentBrief } from '../types/contentBrain.js';
import { KnowledgeBriefBuilder } from '../brain/knowledgeBriefBuilder.js';
import { ContentStrategist } from '../brain/contentStrategist.js';
import { CreativeAngleEngine } from '../brain/creativeAngleEngine.js';
import { HookCandidateEngine } from '../brain/hookCandidateEngine.js';
import { SeniorScriptWriter } from '../brain/seniorScriptWriter.js';

export type StoryArcType =
  | 'HOOK_PROBLEM_EXPLANATION_PAYOFF'
  | 'HOOK_LIST_SURPRISE_CTA'
  | 'QUESTION_DISCOVERY_EVIDENCE_ANSWER'
  | 'BEFORE_CHANGE_AFTER'
  | 'MYTH_REALITY_EVIDENCE'
  | 'LOCATION_EXPERIENCE_CULTURE_PAYOFF'
  | 'DATA_MEANING_CONSEQUENCE';

export interface StoryboardSceneModel {
  sceneId: number;
  purpose: 'hook' | 'setup' | 'insight' | 'contrast' | 'reveal' | 'evidence' | 'payoff' | 'cta';
  voiceText: string;
  caption: string;
  expectedEntities: string[];
  visualType: 'photo' | 'b_roll' | 'map' | 'chart' | 'infographic' | 'number_card' | 'kinetic_typography' | 'quote' | 'diagram' | 'ui_visual' | 'generated_abstract';
  visualConcept: string;
  assetStrategy: string;
  motionStrategy: string;
  transitionStrategy: '3d_flycam' | '3d_tilt' | 'cinematic_zoom' | 'dynamic_whip';
  emotionalBeat: string;
  estimatedDuration: number;
}

export interface CompleteStoryboard {
  title: string;
  coreTopic: string;
  arcType: StoryArcType;
  selectedHook: CandidateHook;
  brief: CreativeBrief;
  scenes: StoryboardSceneModel[];
  totalEstimatedDuration: number;
}

export class StoryArchitect {
  /**
   * Lựa chọn cấu trúc Story Arc phù hợp nhất theo ContentType và Angle (Section 7)
   */
  public static selectStoryArc(brief: CreativeBrief): StoryArcType {
    switch (brief.contentType) {
      case 'TRAVEL':
      case 'LOCATION':
        return 'LOCATION_EXPERIENCE_CULTURE_PAYOFF';
      case 'FINANCE':
        return 'DATA_MEANING_CONSEQUENCE';
      case 'TECH':
      case 'PRODUCT':
        return brief.selectedAngle.id === 'problem_consequence'
          ? 'HOOK_PROBLEM_EXPLANATION_PAYOFF'
          : 'QUESTION_DISCOVERY_EVIDENCE_ANSWER';
      case 'REAL_ESTATE':
        return 'BEFORE_CHANGE_AFTER';
      case 'NEWS':
        return 'QUESTION_DISCOVERY_EVIDENCE_ANSWER';
      case 'LISTICLE':
        return 'HOOK_LIST_SURPRISE_CTA';
      case 'EXPLAINER':
        return 'MYTH_REALITY_EVIDENCE';
      default:
        return 'HOOK_PROBLEM_EXPLANATION_PAYOFF';
    }
  }

  /**
   * Xây dựng Storyboard chi tiết với SeniorScriptWriter (Section 6, 8, 9, 10, 12, 13)
   */
  public static constructStoryboard(
    rawTopic: string,
    brief: CreativeBrief,
    selectedHook: CandidateHook,
    targetDuration: number,
    facts: OldVerifiedFact[]
  ): CompleteStoryboard {
    const arcType = this.selectStoryArc(brief);
    
    // Làm sạch core topic
    let coreTopic = rawTopic.trim();
    if (coreTopic.toLowerCase().startsWith('nói về ') || coreTopic.toLowerCase().includes('bạn chưa biết')) {
      coreTopic = coreTopic
        .replace(/^(?:hãy\s+)?(?:nói|kể|chia sẻ)\s+về\s+/i, '')
        .replace(/^(?:những\s+)?(?:điều|sự thật|bí mật)\s+(?:có thể\s+)?(?:bạn\s+)?(?:chưa biết\s+)?về\s+/i, '')
        .replace(/\s*(?:mà rất ít người để ý|mà bạn chưa biết)\s*$/i, '')
        .trim();
    }

    // Adapt facts to BrainVerifiedFact format
    const brainFacts: BrainVerifiedFact[] = facts.map((f, idx) => ({
      id: `fact_${idx + 1}`,
      claim: f.claim,
      evidenceText: f.evidence,
      sourceUrl: f.sourceUrl,
      sourceName: f.sourceName,
      sourceType: 'REPUTABLE_JOURNALISM',
      confidence: f.confidence,
      relevance: f.relevance,
      freshness: 'STANDARD',
      entities: [coreTopic],
      isSensitiveNumber: /\d+[\d.,]*\s*(?:km|km\/h|triệu|tỷ|usd|w|kw|%)/i.test(f.claim),
    }));

    const contentBrief: ContentBrief = {
      originalRequest: coreTopic,
      topic: coreTopic,
      primaryEntities: [coreTopic],
      contentType: (brief.contentType as any) || 'OTHER',
      targetAudience: brief.targetAudience,
      viewerIntent: 'Nắm bắt thông tin cốt lõi',
      creatorGoal: brief.viewerPromise,
      targetPlatform: 'tiktok',
      targetDuration,
      language: 'vi',
      tone: brief.tone,
      factualSensitivity: 'HIGH',
      freshnessRequirement: 'RECENT',
      researchRequired: false,
    };

    const knowledge = KnowledgeBriefBuilder.build(contentBrief, brainFacts);
    const strategy = ContentStrategist.formulateStrategy(contentBrief, knowledge);
    const { selectedAngle } = CreativeAngleEngine.generateAngles(contentBrief, knowledge, strategy);
    const { selectedHook: brainHook } = HookCandidateEngine.generateHooks(contentBrief, knowledge, selectedAngle);

    // Use SeniorScriptWriter to generate conversational beats
    const scriptDraft = SeniorScriptWriter.writeScript({
      brief: contentBrief,
      knowledge,
      strategy,
      selectedAngle,
      selectedHook: {
        id: selectedHook.id,
        mechanism: 'question',
        hookText: selectedHook.text,
        screenHeadline: coreTopic.toUpperCase(),
        visualIdea: selectedHook.visualIdea,
        retentionRationale: selectedHook.selectionRationale,
        score: selectedHook.scoreBreakdown.totalScore,
      },
      verifiedFacts: brainFacts,
    });

    const scenes: StoryboardSceneModel[] = [];

    for (let i = 0; i < scriptDraft.allBeats.length; i++) {
      const beat = scriptDraft.allBeats[i];
      let visualType: StoryboardSceneModel['visualType'] = 'photo';
      let transitionStrategy: StoryboardSceneModel['transitionStrategy'] = '3d_flycam';
      let purpose: StoryboardSceneModel['purpose'] = 'insight';

      if (beat.purpose === 'opening_hook') {
        purpose = 'hook';
        visualType = brief.contentType === 'FINANCE' ? 'chart' : 'photo';
        transitionStrategy = '3d_flycam';
      } else if (beat.purpose === 'setup') {
        purpose = 'setup';
        visualType = brief.contentType === 'TRAVEL' || brief.contentType === 'LOCATION' ? 'map' : 'infographic';
        transitionStrategy = '3d_tilt';
      } else if (beat.purpose === 'body_progression') {
        purpose = 'insight';
        visualType = 'b_roll';
        transitionStrategy = 'dynamic_whip';
      } else if (beat.purpose === 'rehook_reveal') {
        purpose = 'evidence';
        visualType = 'number_card';
        transitionStrategy = 'cinematic_zoom';
      } else if (beat.purpose === 'ending') {
        purpose = 'payoff';
        visualType = 'photo';
        transitionStrategy = '3d_flycam';
      } else if (beat.purpose === 'cta') {
        purpose = 'cta';
        visualType = 'kinetic_typography';
        transitionStrategy = '3d_flycam';
      }

      scenes.push({
        sceneId: beat.beatId,
        purpose,
        voiceText: beat.narration,
        caption: beat.displayCopy.headline,
        expectedEntities: [coreTopic],
        visualType,
        visualConcept: beat.visualPromptSuggestion,
        assetStrategy: 'Ưu tiên hình ảnh thực tế chất lượng cao của thực thể.',
        motionStrategy: 'Cinematic camera motion hỗ trợ nhịp kể chuyện.',
        transitionStrategy,
        emotionalBeat: beat.whyItMatters,
        estimatedDuration: beat.targetDurationSec,
      });
    }

    return {
      title: coreTopic.toUpperCase(),
      coreTopic,
      arcType,
      selectedHook,
      brief,
      scenes,
      totalEstimatedDuration: targetDuration,
    };
  }
}
