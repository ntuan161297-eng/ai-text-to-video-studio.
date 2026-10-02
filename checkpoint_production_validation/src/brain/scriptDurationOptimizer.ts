/**
 * PART 11 — DURATION STRATEGY & SCRIPT OPTIMIZER
 * Manages speaking rates (~2.5 to 2.8 words/second for Vietnamese neural TTS).
 * Calculates word budgets for 30s, 45s, 60s, 90s, 120s, 180s.
 * Solves duration at the CONTENT layer so the renderer never has to artificially pad or cut audio.
 */

export interface DurationBudget {
  targetDurationSec: number;
  targetBeatCount: number;
  targetTotalWords: number;
  minWords: number;
  maxWords: number;
  avgWordsPerBeat: number;
  structure: 'SHORT_ARC' | 'BEAT_CHAPTERS' | 'MULTI_ACT';
}

export class ScriptDurationOptimizer {
  // Average speaking rate in natural Vietnamese conversational TTS: ~2.65 words/second
  public static readonly SPEAKING_RATE_WPS = 2.65;

  /**
   * Calculates duration budget and structure based on target duration in seconds
   */
  public static getBudget(durationSec: number, measuredSpeakingRate?: number): DurationBudget {
    let dur = durationSec || 60;
    if (dur <= 35) dur = 30;
    else if (dur <= 50) dur = 45;
    else if (dur <= 75) dur = 60;
    else if (dur <= 105) dur = 90;
    else if (dur <= 150) dur = 120;
    else dur = 180;

    let targetBeatCount = 4;
    let structure: DurationBudget['structure'] = 'SHORT_ARC';

    if (dur <= 30) {
      targetBeatCount = 3; // Hook -> Core Insight -> Payoff & CTA
      structure = 'SHORT_ARC';
    } else if (dur <= 45) {
      targetBeatCount = 4; // Hook -> Setup -> Core Proof -> Payoff & CTA
      structure = 'SHORT_ARC';
    } else if (dur <= 60) {
      targetBeatCount = 5; // Hook -> Context -> Breakthrough -> Evidence -> Payoff & CTA
      structure = 'SHORT_ARC';
    } else if (dur <= 90) {
      targetBeatCount = 7;
      structure = 'BEAT_CHAPTERS';
    } else if (dur <= 120) {
      targetBeatCount = 9;
      structure = 'BEAT_CHAPTERS';
    } else {
      targetBeatCount = 12;
      structure = 'MULTI_ACT';
    }

    const effectiveRate = measuredSpeakingRate && measuredSpeakingRate > 1.5 && measuredSpeakingRate < 4.5
      ? measuredSpeakingRate
      : this.SPEAKING_RATE_WPS;

    const targetTotalWords = Math.round(dur * effectiveRate);
    const minWords = Math.round(targetTotalWords * 0.9);
    const maxWords = Math.round(targetTotalWords * 1.08);
    const avgWordsPerBeat = Math.round(targetTotalWords / targetBeatCount);

    return {
      targetDurationSec: dur,
      targetBeatCount,
      targetTotalWords,
      minWords,
      maxWords,
      avgWordsPerBeat,
      structure,
    };
  }

  /**
   * Validates if a beat narration falls within acceptable speaking rate boundaries
   */
  public static validateBeatNarration(narration: string, targetDurationSec: number): {
    wordCount: number;
    estimatedDurationSec: number;
    isOptimal: boolean;
    recommendation?: string;
  } {
    const words = narration.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const estimatedDurationSec = parseFloat((wordCount / this.SPEAKING_RATE_WPS).toFixed(1));

    const diff = estimatedDurationSec - targetDurationSec;
    if (Math.abs(diff) <= 1.5) {
      return { wordCount, estimatedDurationSec, isOptimal: true };
    }

    if (diff > 1.5) {
      const excessWords = Math.ceil(diff * this.SPEAKING_RATE_WPS);
      return {
        wordCount,
        estimatedDurationSec,
        isOptimal: false,
        recommendation: `Đoạn thoại dài hơn dự kiến (~${estimatedDurationSec}s). Cần rút ngắn khoảng ${excessWords} từ.`,
      };
    }

    const deficitWords = Math.ceil(-diff * this.SPEAKING_RATE_WPS);
    return {
      wordCount,
      estimatedDurationSec,
      isOptimal: false,
      recommendation: `Đoạn thoại ngắn hơn dự kiến (~${estimatedDurationSec}s). Có thể bổ sung chi tiết giá trị khoảng ${deficitWords} từ.`,
    };
  }
}
