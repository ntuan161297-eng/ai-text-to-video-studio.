/**
 * PART 21 — SCRIPT QUALITY GATE & APPROVED SCRIPT PACKAGE BUILDER
 * The final security checkpoint of the Content Brain.
 * If the review report passes, produces the immutable ApprovedScriptPackage.
 * If review fails with fixable issues, applies an automated repair loop before signing.
 * Strictly blocks any script with unresolvable CRITICAL issues from entering production.
 */

import {
  ApprovedScriptPackage,
  AudienceStrategy,
  ContentBrief,
  KnowledgeBrief,
  ScriptReviewReport,
  VerifiedFact,
} from '../types/contentBrain.js';
import { ScriptWriterOutput } from './seniorScriptWriter.js';
import { IndependentScriptReviewer } from './independentScriptReviewer.js';
import { AntiResearchLeak } from './antiResearchLeak.js';

export class ScriptQualityGate {
  /**
   * Evaluates review report, runs self-repair loop if needed, and packages the approved script
   */
  public static processGate(options: {
    brief: ContentBrief;
    knowledge: KnowledgeBrief;
    strategy: AudienceStrategy;
    verifiedFacts: VerifiedFact[];
    script: ScriptWriterOutput;
  }): { approvedPackage: ApprovedScriptPackage | null; finalReport: ScriptReviewReport } {
    const { brief, knowledge, strategy, verifiedFacts } = options;
    let currentScript = options.script;
    let report = IndependentScriptReviewer.review({
      brief,
      knowledge,
      strategy,
      verifiedFacts,
      script: currentScript,
    });

    let repairAttempts = 0;

    // Self-repair loop (max 3 iterations)
    while (!report.passed && repairAttempts < 3) {
      repairAttempts++;
      console.warn(`⚠️ [ScriptQualityGate] Lần sửa ${repairAttempts}: ${report.criticalCount} lỗi critical, điểm ${report.score}. Đang tự động chuẩn hóa...`);

      // 1. Sanitize all beats narration and display copy
      for (const b of currentScript.allBeats) {
        b.narration = AntiResearchLeak.sanitize(b.narration);
        b.displayCopy.headline = AntiResearchLeak.sanitize(b.displayCopy.headline);
        const headWords = b.displayCopy.headline.split(/\s+/).filter(Boolean);
        if (headWords.length > 7) {
          b.displayCopy.headline = headWords.slice(0, 6).join(' ');
        }
        if (b.displayCopy.supportingText) {
          b.displayCopy.supportingText = AntiResearchLeak.sanitize(b.displayCopy.supportingText);
          const supWords = b.displayCopy.supportingText.split(/\s+/).filter(Boolean);
          if (supWords.length > 12) {
            b.displayCopy.supportingText = supWords.slice(0, 10).join(' ');
          }
        }
      }

      currentScript.fullNarration = currentScript.allBeats.map((b) => b.narration).join(' ');

      // Re-review after automated repairs
      report = IndependentScriptReviewer.review({
        brief,
        knowledge,
        strategy,
        verifiedFacts,
        script: currentScript,
      });
    }

    if (!report.passed || report.criticalCount > 0) {
      console.error(`❌ [ScriptQualityGate] Kịch bản bị từ chối phê duyệt do không vượt qua Quality Gate:`, report.issues);
      return { approvedPackage: null, finalReport: report };
    }

    // Assemble immutable ApprovedScriptPackage
    const approvedPackage: ApprovedScriptPackage = {
      title: currentScript.title,
      viewerPromise: strategy.viewerPromise,
      selectedAngle: strategy.storyOpportunity,
      targetDuration: brief.targetDuration,
      contentType: brief.contentType,
      primaryEntities: brief.primaryEntities,
      ctaType: currentScript.ctaType,
      opening: currentScript.opening,
      beats: currentScript.beats,
      ending: currentScript.ending,
      cta: currentScript.cta,
      allBeats: currentScript.allBeats,
      fullNarration: currentScript.fullNarration,
      estimatedDuration: currentScript.estimatedDurationSec,
      approved: true,
      approvalReport: {
        reviewerScore: report.score,
        zeroCriticalIssues: report.criticalCount === 0,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`✅ [ScriptQualityGate] Kịch bản đã được phê duyệt chính thức (Điểm đánh giá: ${report.score}/100, 0 Critical).`);

    return { approvedPackage, finalReport: report };
  }
}
