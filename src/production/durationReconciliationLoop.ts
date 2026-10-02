/**
 * DURATION RECONCILIATION LOOP
 * Solves duration strictly through the CONTENT layer.
 * Flow: Approved Script → TTS → measure actual audio → compare DurationContract.
 * - If audio > maxAccepted: Trims / shortens text at content layer and regenerates audio.
 * - If audio < minAccepted: Enriches content with verified facts from KnowledgeBrief and regenerates audio.
 * - Actual audio timestamps become the immutable timeline source of truth.
 */

import fs from 'fs';
import path from 'path';
import {
  ApprovedScript,
  DurationContract,
  KnowledgeBrief,
  ScriptBeat,
} from '../types/universalContracts.js';
import { VoiceDirector } from './voiceDirector.js';

export interface ReconciledAudioTimeline {
  audioMasterPath: string;
  totalActualDurationSec: number;
  approvedScript: ApprovedScript;
  sceneTimestamps: Array<{
    sceneId: number;
    beatId: number;
    startTime: number;
    duration: number;
    voiceText: string;
  }>;
  iterations: number;
}

export class DurationReconciliationLoop {
  private static readonly MAX_ITERATIONS = 3;

  /**
   * Reconciles script narration with actual voice synthesis duration
   */
  public static async reconcile(options: {
    script: ApprovedScript;
    durationContract: DurationContract;
    knowledge: KnowledgeBrief;
    audioDir: string;
    voiceName?: string;
    onProgress?: (msg: string) => Promise<void>;
  }): Promise<ReconciledAudioTimeline> {
    const { durationContract, knowledge, audioDir, voiceName, onProgress } = options;
    let currentScript = { ...options.script };
    let iteration = 0;

    while (iteration < this.MAX_ITERATIONS) {
      iteration++;
      await onProgress?.(`Đang phát âm kịch bản thật (Vòng ${iteration}/${this.MAX_ITERATIONS})...`);

      // 1. Synthesize audio via VoiceDirector using current beats
      const pkg: any = {
        title: currentScript.title,
        contentType: 'OTHER',
        targetDurationSec: durationContract.requestedSeconds,
        targetWords: currentScript.totalWords,
        allBeats: currentScript.beats.map((b) => ({
          beatId: b.beatId,
          purpose: b.purpose,
          viewerQuestion: '',
          newInformation: b.narration,
          whyItMatters: '',
          retentionFunction: '',
          factIds: b.factIds,
          narration: b.narration,
          expectedEntities: b.expectedEntities,
          targetDurationSec: b.targetDurationSec,
          displayCopy: {
            headline: b.displayHeadline,
            supportingText: b.supportingText,
            metricBadge: b.metricBadge,
          },
          visualPromptSuggestion: b.narration,
        })),
        fullNarration: currentScript.fullNarration,
        approvalReport: {
          reviewerScore: currentScript.fidelityScore,
          zeroCriticalIssues: true,
          timestamp: new Date().toISOString(),
        },
      };

      const voiceReport = await VoiceDirector.synthesizeBeats({
        scriptPackage: pkg,
        outputDir: audioDir,
        ttsVoice: voiceName || 'vi-VN-HoaiMyNeural',
      });

      const actualDuration = voiceReport.totalDurationSec;
      console.log(
        `[DurationLoop] Vòng ${iteration}: Audio thực tế = ${actualDuration.toFixed(2)}s (Yêu cầu: ${durationContract.requestedSeconds}s, Khoảng hợp lệ: ${durationContract.minimumAcceptedSeconds}s - ${durationContract.maximumAcceptedSeconds}s)`
      );

      // 2. Check if actual duration conforms to DurationContract
      if (
        actualDuration >= durationContract.minimumAcceptedSeconds &&
        actualDuration <= durationContract.maximumAcceptedSeconds
      ) {
        console.log(`[DurationLoop] ✅ Hoàn tất khớp thời lượng chuẩn xác (${actualDuration.toFixed(2)}s).`);
        return this.buildTimeline(currentScript, voiceReport, actualDuration, iteration);
      }

      // 3. If too long, trim / shorten sentences at content layer
      if (actualDuration > durationContract.maximumAcceptedSeconds) {
        const excessRatio = actualDuration / durationContract.requestedSeconds;
        console.log(`[DurationLoop] ⚠️ Audio quá dài (vượt ${(actualDuration - durationContract.maximumAcceptedSeconds).toFixed(1)}s). Rút gọn nội dung (hệ số ${excessRatio.toFixed(2)})...`);
        
        currentScript = this.shortenScriptContent(currentScript, excessRatio);
        continue;
      }

      // 4. If too short, enrich content from KnowledgeBrief
      if (actualDuration < durationContract.minimumAcceptedSeconds) {
        const deficitSec = durationContract.requestedSeconds - actualDuration;
        console.log(`[DurationLoop] ℹ️ Audio ngắn hơn yêu cầu (${deficitSec.toFixed(1)}s). Bổ sung thông tin xác thực từ KnowledgeBrief...`);
        
        currentScript = this.enrichScriptContent(currentScript, knowledge, deficitSec);
        continue;
      }
    }

    // Final fallback after max iterations
    const finalPkg: any = {
      title: currentScript.title,
      contentType: 'OTHER',
      targetDurationSec: durationContract.requestedSeconds,
      targetWords: currentScript.totalWords,
      allBeats: currentScript.beats.map((b) => ({
        beatId: b.beatId,
        purpose: b.purpose,
        viewerQuestion: '',
        newInformation: b.narration,
        whyItMatters: '',
        retentionFunction: '',
        factIds: b.factIds,
        narration: b.narration,
        expectedEntities: b.expectedEntities,
        targetDurationSec: b.targetDurationSec,
        displayCopy: {
          headline: b.displayHeadline,
          supportingText: b.supportingText,
          metricBadge: b.metricBadge,
        },
        visualPromptSuggestion: b.narration,
      })),
      fullNarration: currentScript.fullNarration,
      approvalReport: {
        reviewerScore: currentScript.fidelityScore,
        zeroCriticalIssues: true,
        timestamp: new Date().toISOString(),
      },
    };

    const finalReport = await VoiceDirector.synthesizeBeats({
      scriptPackage: finalPkg,
      outputDir: audioDir,
      ttsVoice: voiceName || 'vi-VN-HoaiMyNeural',
    });

    return this.buildTimeline(currentScript, finalReport, finalReport.totalDurationSec, iteration);
  }

  private static shortenScriptContent(script: ApprovedScript, excessRatio: number): ApprovedScript {
    const shortenedBeats: ScriptBeat[] = script.beats.map((beat, bIdx) => {
      const isLastBeat = bIdx === script.beats.length - 1;
      const rawSentences = beat.narration.match(/[^.!?]+[.!?]+/g) || [beat.narration];
      if (rawSentences.length <= 1) {
        // Single sentence: NEVER cut in the middle of words or clauses. Keep full sentence.
        return beat;
      }

      if (isLastBeat) {
        // PHÂN CẢNH KẾT: BẮT BUỘC BẢO TỒN LỜI KÊU GỌI (CTA)
        const ctaSentence = rawSentences.find((s) => /(?:lưu|theo\s+dõi|bình\s+luận|follow|đăng\s+ký|chia\s+sẻ)/i.test(s));
        const nonCtaSentences = rawSentences.filter((s) => s !== ctaSentence);

        let result = (nonCtaSentences[0] || '').trim();
        if (ctaSentence) {
          result = result ? `${result} ${ctaSentence.trim()}` : ctaSentence.trim();
        } else {
          result = `${result.replace(/[.!?\s]+$/, '')}. Nếu bạn thấy video hữu ích, hãy lưu lại, để lại bình luận và ấn theo dõi kênh nhé!`;
        }

        return {
          ...beat,
          narration: result,
          targetDurationSec: parseFloat((beat.targetDurationSec / excessRatio).toFixed(1)),
        };
      }

      const targetWords = Math.max(12, Math.round(beat.narration.split(/\s+/).filter(Boolean).length / excessRatio));
      let result = rawSentences[0].trim();
      for (let sIdx = 1; sIdx < rawSentences.length; sIdx++) {
        const candidate = `${result} ${rawSentences[sIdx].trim()}`;
        const count = candidate.split(/\s+/).filter(Boolean).length;
        if (count <= targetWords + 4) {
          result = candidate;
        } else {
          break;
        }
      }

      result = result.replace(/[,;:\-\s]+$/, '').trim();
      result = result.replace(/\s+(?:để|và|với|khi|của|cho|là|rằng|do|như|văn|ở|tại|thì|mà)[.!?\s]*$/i, '.');
      if (!/[.!?]$/.test(result)) result += '.';

      return {
        ...beat,
        narration: result,
        targetDurationSec: parseFloat((beat.targetDurationSec / excessRatio).toFixed(1)),
      };
    });

    return {
      ...script,
      beats: shortenedBeats,
      allBeats: shortenedBeats,
      fullNarration: shortenedBeats.map((b) => b.narration).join(' '),
    };
  }

  private static enrichScriptContent(
    script: ApprovedScript,
    knowledge: KnowledgeBrief,
    deficitSec: number
  ): ApprovedScript {
    const facts = knowledge.strongestFacts;
    if (facts.length === 0) return script;

    const enrichedBeats: ScriptBeat[] = [...script.beats];
    // Add additional factual nuance to a middle beat
    const middleIndex = Math.floor(enrichedBeats.length / 2);
    const extraFact = facts.slice().reverse().find((f) => {
      const words = f.claim.split(/\s+/).filter(Boolean).length;
      return words >= 5 && words <= 20 && !f.claim.includes('chủ đề trọng tâm');
    });

    if (extraFact && !enrichedBeats[middleIndex].narration.includes(extraFact.claim)) {
      enrichedBeats[middleIndex] = {
        ...enrichedBeats[middleIndex],
        narration: `${enrichedBeats[middleIndex].narration.replace(/[.!?\s]+$/, '')}. Cụ thể, ${extraFact.claim.replace(/^[A-ZĐ]/, (c) => c.toLowerCase())}`,
        targetDurationSec: enrichedBeats[middleIndex].targetDurationSec + deficitSec,
      };
    }

    return {
      ...script,
      beats: enrichedBeats,
      allBeats: enrichedBeats,
      fullNarration: enrichedBeats.map((b) => b.narration).join(' '),
    };
  }

  private static buildTimeline(
    script: ApprovedScript,
    voiceResult: any,
    totalDuration: number,
    iterations: number
  ): ReconciledAudioTimeline {
    let currentStart = 0;
    const sceneTimestamps = script.beats.map((b, idx) => {
      const track = voiceResult.tracks[idx];
      const sceneDur = track?.duration && track.duration > 0 ? track.duration : b.targetDurationSec;
      const start = currentStart;
      currentStart += sceneDur;

      return {
        sceneId: idx + 1,
        beatId: b.beatId,
        startTime: parseFloat(start.toFixed(2)),
        duration: parseFloat(sceneDur.toFixed(2)),
        voiceText: b.narration,
      };
    });

    return {
      audioMasterPath: voiceResult.masterAudioPath,
      totalActualDurationSec: parseFloat(totalDuration.toFixed(2)),
      approvedScript: script,
      sceneTimestamps,
      iterations,
    };
  }
}
