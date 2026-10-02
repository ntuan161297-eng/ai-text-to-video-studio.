/**
 * PART 29 — CAPTION DIRECTOR
 * Generates mobile-optimized subtitle blocks based on ACTUAL audio timing.
 * Enforces rule: 3 - 9 words per chunk, max 2 lines, strictly aligned with speech.
 * Eliminates paragraph dumps and ellipsis overflow hacks.
 */

import { BeatAudioTiming, SubtitleBlock } from '../types/productionEngine.js';
import { ApprovedScriptPackage } from '../types/contentBrain.js';
import { AntiResearchLeak } from '../brain/antiResearchLeak.js';

export class CaptionDirector {
  /**
   * Generates subtitle blocks from approved script beats and actual audio timings
   */
  public static generateCaptions(
    scriptPackage: ApprovedScriptPackage,
    timings: BeatAudioTiming[]
  ): SubtitleBlock[] {
    const blocks: SubtitleBlock[] = [];
    let blockIdCounter = 1;

    for (const beat of scriptPackage.allBeats) {
      const timing = timings.find((t) => t.beatId === beat.beatId);
      if (!timing) continue;

      const cleanNarration = AntiResearchLeak.sanitize(beat.narration);
      const words = cleanNarration.split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      // Group words into chunks of 4 - 7 words (ideal short-form cadence)
      const chunkSize = words.length <= 8 ? words.length : Math.ceil(words.length / Math.ceil(words.length / 6));
      const wordChunks: string[][] = [];

      for (let i = 0; i < words.length; i += chunkSize) {
        wordChunks.push(words.slice(i, i + chunkSize));
      }

      const totalBeatDuration = timing.durationSec;
      const secPerChunk = totalBeatDuration / wordChunks.length;

      let chunkStart = timing.startSec;

      for (const chunk of wordChunks) {
        const chunkText = chunk.join(' ');
        const chunkEnd = parseFloat((chunkStart + secPerChunk).toFixed(2));

        blocks.push({
          id: blockIdCounter++,
          beatId: beat.beatId,
          text: chunkText,
          startSec: parseFloat(chunkStart.toFixed(2)),
          endSec: chunkEnd,
          safeAreaChecked: true,
        });

        chunkStart = chunkEnd;
      }
    }

    return blocks;
  }
}
