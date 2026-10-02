/**
 * PART 27 & 28 — VOICE DIRECTOR & AUDIO INTEGRITY
 * Generates neural TTS for approved script beats and measures ACTUAL duration.
 * Strictly guarantees that audio is NEVER chopped, clipped, or artificially padded with silence.
 */

import fs from 'fs';
import path from 'path';
import { ApprovedScriptPackage, ScriptBeat } from '../types/contentBrain.js';
import { AudioTimingReport, BeatAudioTiming } from '../types/productionEngine.js';
import { TTSFactory } from '../providers/tts/ttsFactory.js';
import { ScriptDurationOptimizer } from '../brain/scriptDurationOptimizer.js';
import { generateAmbientBgm } from '../utils/audioGenerator.js';

export class VoiceDirector {
  /**
   * Generates audio for each beat in the approved script package and measures real timing
   */
  public static async synthesizeBeats(options: {
    scriptPackage: ApprovedScriptPackage;
    outputDir: string;
    ttsVoice?: string;
    jobId?: string;
    syntheticAudio?: boolean;
  }): Promise<AudioTimingReport> {
    const { scriptPackage, outputDir, ttsVoice, jobId, syntheticAudio } = options;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const prefix = jobId ? `${jobId.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
    const beatTimings: BeatAudioTiming[] = [];
    let currentStartSec = 0;

    if (syntheticAudio) {
      for (const beat of scriptPackage.allBeats) {
        const audioFileName = `${prefix}audio_beat_${beat.beatId}.wav`;
        const audioFilePath = path.join(outputDir, audioFileName);
        const measuredSec = beat.targetDurationSec || 6;
        generateAmbientBgm(audioFilePath, measuredSec, 'lofi');

        const wordCount = beat.narration.trim().split(/\s+/).filter(Boolean).length;
        const speakingRate = parseFloat((wordCount / (measuredSec || 1)).toFixed(2));

        beatTimings.push({
          beatId: beat.beatId,
          audioPath: audioFilePath,
          durationSec: measuredSec,
          wordCount,
          speakingRateWordsPerSec: speakingRate,
          startSec: parseFloat(currentStartSec.toFixed(2)),
          endSec: parseFloat((currentStartSec + measuredSec).toFixed(2)),
        });

        currentStartSec += measuredSec;
      }
    } else {
      const tts = TTSFactory.create(ttsVoice ? 'edge' : 'edge', ttsVoice);

      for (const beat of scriptPackage.allBeats) {
        const audioFileName = `${prefix}audio_beat_${beat.beatId}.mp3`;
        const audioFilePath = path.join(outputDir, audioFileName);

        // Generate actual audio using Neural TTS
        const audioResult = await tts.generateAudio(beat.narration, audioFilePath);
        const measuredSec = parseFloat(audioResult.durationInSeconds.toFixed(2));
        const wordCount = beat.narration.trim().split(/\s+/).filter(Boolean).length;
        const speakingRate = parseFloat((wordCount / (measuredSec || 1)).toFixed(2));

        beatTimings.push({
          beatId: beat.beatId,
          audioPath: audioResult.audioPath,
          durationSec: measuredSec,
          wordCount,
          speakingRateWordsPerSec: speakingRate,
          startSec: parseFloat(currentStartSec.toFixed(2)),
          endSec: parseFloat((currentStartSec + measuredSec).toFixed(2)),
        });

        currentStartSec += measuredSec;
      }
    }

    const totalDurationSec = parseFloat(currentStartSec.toFixed(2));
    const targetDurationSec = scriptPackage.targetDuration;
    const deviationPercent = parseFloat(
      (((totalDurationSec - targetDurationSec) / targetDurationSec) * 100).toFixed(1)
    );

    // If deviation exceeds 15%, script needs content adjustment rather than fake audio padding
    const actionNeeded = Math.abs(deviationPercent) > 15 ? 'RE_OPTIMIZE_SCRIPT' : 'PROCEED';
    const wordDiff = Math.round((targetDurationSec - totalDurationSec) * ScriptDurationOptimizer.SPEAKING_RATE_WPS);

    return {
      totalDurationSec,
      targetDurationSec,
      deviationPercent,
      beatTimings,
      actionNeeded,
      recommendedLengthAdjustmentWords: wordDiff,
    };
  }

  /**
   * Verifies audio integrity across all generated beats
   */
  public static verifyAudioIntegrity(report: AudioTimingReport): {
    passed: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const bt of report.beatTimings) {
      if (!fs.existsSync(bt.audioPath)) {
        errors.push(`File audio phân cảnh ${bt.beatId} không tồn tại tại: ${bt.audioPath}`);
      }
      if (bt.durationSec < 1.0) {
        errors.push(`Thời lượng audio phân cảnh ${bt.beatId} quá ngắn (< 1s): ${bt.durationSec}s`);
      }
      if (bt.speakingRateWordsPerSec > 4.5) {
        errors.push(`Tốc độ nói phân cảnh ${bt.beatId} quá gấp gáp (${bt.speakingRateWordsPerSec} từ/s)`);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  }
}
