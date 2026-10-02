import { SubtitleWord } from '../types/index.js';

export interface CaptionChunk {
  text: string;
  startFrame: number;
  endFrame: number;
  words: {
    word: string;
    startFrame: number;
    endFrame: number;
  }[];
}

export function generateSynchronizedSubtitles(
  voiceOverText: string,
  totalDurationInFrames: number,
  wordsPerChunk: number = 4
): CaptionChunk[] {
  const rawWords = voiceOverText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (rawWords.length === 0) return [];

  // Allocate 85% of scene time to words, leaving small buffer at start and end
  const startOffset = Math.round(totalDurationInFrames * 0.05);
  const speakingDuration = Math.round(totalDurationInFrames * 0.9);
  const framePerWord = speakingDuration / rawWords.length;

  const wordTimings: { word: string; startFrame: number; endFrame: number }[] =
    rawWords.map((word, i) => {
      const s = Math.round(startOffset + i * framePerWord);
      const e = Math.round(startOffset + (i + 1) * framePerWord);
      return { word, startFrame: s, endFrame: e };
    });

  const chunks: CaptionChunk[] = [];
  for (let i = 0; i < wordTimings.length; i += wordsPerChunk) {
    const slice = wordTimings.slice(i, i + wordsPerChunk);
    const startFrame = slice[0].startFrame;
    const endFrame = slice[slice.length - 1].endFrame;
    const text = slice.map((item) => item.word).join(' ');

    chunks.push({
      text,
      startFrame,
      endFrame,
      words: slice,
    });
  }

  return chunks;
}
