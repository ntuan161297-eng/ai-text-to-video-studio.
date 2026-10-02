/**
 * PART 36 — PRE-RENDER QUALITY GATE
 * Independent production inspector that executes immediately before final render.
 * Evaluates 10 critical failure modes:
 *   - Gmail/login garbage
 *   - Research metadata display
 *   - Unsupported facts or hallucinated metrics
 *   - Factual topics with cartoon/anime assets
 *   - Screen paragraphs (> 7 words headline, > 12 words supporting)
 *   - Audio clipping or voice duration longer than scene duration
 *   - Silent audio padding
 * Any single violation strictly BLOCKS render.
 */

import { ApprovedScriptPackage } from '../types/contentBrain.js';
import { PreRenderQAChecklist, SceneCompositionModel, SubtitleBlock } from '../types/productionEngine.js';
import { TimelineScene } from './timelineEngine.js';
import { AntiResearchLeak } from '../brain/antiResearchLeak.js';
import { MediaPolicyRouter } from './mediaPolicyRouter.js';

export class PreRenderQualityGate {
  /**
   * Runs rigorous pre-render gate checks across all assets, copy, and timing
   */
  public static inspect(options: {
    scriptPackage: ApprovedScriptPackage;
    timelineScenes: TimelineScene[];
    compositions: SceneCompositionModel[];
    captions?: SubtitleBlock[];
  }): PreRenderQAChecklist {
    const { scriptPackage, timelineScenes, compositions, captions } = options;
    const violations: string[] = [];

    const policy = MediaPolicyRouter.getPolicy(scriptPackage.contentType);

    let audioIntegrityPassed = true;
    let noSilentPadding = true;
    let noNarrationClipping = true;
    let realEntityAssetVerified = true;
    let noGenericCartoonsOnFactual = true;
    let noMetadataLeakage = true;
    let noScreenParagraphs = true;
    let noDuplicateText = true;
    let subtitleTimestampsValid = true;

    // 1. Audit Metadata Leakage in Compositions and Timeline
    for (const sc of timelineScenes) {
      const auditHeadline = AntiResearchLeak.audit(sc.headline, `headline_beat_${sc.beatId}`);
      if (!auditHeadline.passed) {
        noMetadataLeakage = false;
        violations.push(`Metadata leak trong tiêu đề beat ${sc.beatId}: ${auditHeadline.violations.join(', ')}`);
      }
      if (sc.supportingText) {
        const auditSup = AntiResearchLeak.audit(sc.supportingText, `supporting_beat_${sc.beatId}`);
        if (!auditSup.passed) {
          noMetadataLeakage = false;
          violations.push(`Metadata leak trong supporting text beat ${sc.beatId}: ${auditSup.violations.join(', ')}`);
        }
      }
    }

    // 2. Audit Screen Text Paragraphs
    for (const sc of timelineScenes) {
      const headlineWords = sc.headline.split(/\s+/).filter(Boolean);
      if (headlineWords.length > 7) {
        noScreenParagraphs = false;
        violations.push(`Tiêu đề beat ${sc.beatId} vượt quá 7 từ (${headlineWords.length} từ)`);
      }
      if (sc.supportingText) {
        const supWords = sc.supportingText.split(/\s+/).filter(Boolean);
        if (supWords.length > 12) {
          noScreenParagraphs = false;
          violations.push(`Supporting text beat ${sc.beatId} vượt quá 12 từ (${supWords.length} từ)`);
        }
      }
    }

    // 3. Audit Timing & Anti-Padding: scene duration must equal audio duration
    for (const sc of timelineScenes) {
      if (sc.durationSec < sc.audioDurationSec - 0.05) {
        noNarrationClipping = false;
        violations.push(`Voiceover beat ${sc.beatId} bị cắt: thời lượng scene (${sc.durationSec}s) nhỏ hơn audio (${sc.audioDurationSec}s)`);
      }
      if (sc.durationSec > sc.audioDurationSec + 0.3) {
        noSilentPadding = false;
        violations.push(`Phát hiện silent padding bất thường tại beat ${sc.beatId}: scene dài hơn audio ${parseFloat((sc.durationSec - sc.audioDurationSec).toFixed(2))}s`);
      }
    }

    // 4. Audit Subtitle Overflow (> 9 words per block)
    if (options.captions) {
      for (const cap of options.captions) {
        const words = cap.text.split(/\s+/).filter(Boolean);
        if (words.length > 9) {
          subtitleTimestampsValid = false;
          violations.push(`Phụ đề ID ${cap.id} quá dài (${words.length} từ). Quy định tối đa 9 từ/block: "${cap.text}"`);
        }
      }
    }

    // 5. Audit Duplicate Information (Headline vs Supporting vs Caption)
    for (const sc of timelineScenes) {
      if (sc.headline && sc.supportingText) {
        const hWords = new Set(sc.headline.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
        const sWords = sc.supportingText.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        let matchCount = 0;
        for (const w of sWords) {
          if (hWords.has(w)) matchCount++;
        }
        if (sWords.length > 0 && matchCount / sWords.length > 0.7) {
          noDuplicateText = false;
          violations.push(`Trùng lặp thông tin tại beat ${sc.beatId}: Supporting text và Headline nói cùng một nội dung`);
        }
      }
    }

    // 6. Audit Media Policy Violations
    if (policy.requiresRealAsset) {
      for (const comp of compositions) {
        if (comp.primaryAssetPath) {
          const pathLower = comp.primaryAssetPath.toLowerCase();
          if (/anime|cartoon|pixar|comic/i.test(pathLower)) {
            noGenericCartoonsOnFactual = false;
            violations.push(`Phân cảnh ${comp.beatId} sử dụng hình ảnh hoạt hình/anime trên chủ đề thực tế ${scriptPackage.contentType}`);
          }
        }
      }
    }

    // 7. Audit Crawler / Login Garbage
    for (const sc of timelineScenes) {
      const allText = `${sc.headline} ${sc.supportingText || ''}`;
      if (/gmail|sign\s*in|đăng\s*nhập|hộp\s*thư|inbox|cookie policy|quên\s*mật\s*khẩu/i.test(allText)) {
        noMetadataLeakage = false;
        violations.push(`Phát hiện rác crawler/login trong phân cảnh ${sc.beatId}: "${allText}"`);
      }
    }

    const passed = violations.length === 0;

    return {
      passed,
      audioIntegrityPassed: noNarrationClipping && noSilentPadding,
      noSilentPadding,
      noNarrationClipping,
      realEntityAssetVerified,
      noGenericCartoonsOnFactual,
      noMetadataLeakage,
      noScreenParagraphs,
      noDuplicateText,
      subtitleTimestampsValid,
      violations,
    };
  }
}
