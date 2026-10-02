/**
 * CreativeHistory - Anti-Repetition System (Section 18)
 * Tracks the creative decisions of recent video generations to prevent 
 * template fatigue and monotonous outputs across multiple jobs.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface VideoCreativeRecord {
  jobId: string;
  createdAt: string;
  contentType: string;
  hookArchetype: string;
  storyArc: string;
  designPreset: string;
  bgmGenre: string;
  visualTypesUsed: string[];
}

export interface AntiRepetitionAdvice {
  avoidHookArchetypes: string[];
  avoidStoryArcs: string[];
  avoidDesignPresets: string[];
  recommendAlternative: boolean;
}

export class CreativeHistory {
  private static readonly HISTORY_FILE = path.resolve(process.cwd(), 'output', 'creative_history.json');
  private static readonly MAX_HISTORY_RECORDS = 50;

  /**
   * Loads recent creative records from disk
   */
  public static loadHistory(): VideoCreativeRecord[] {
    try {
      if (fs.existsSync(this.HISTORY_FILE)) {
        const raw = fs.readFileSync(this.HISTORY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[CreativeHistory] Failed to read history file, starting fresh.');
    }
    return [];
  }

  /**
   * Inspects the last N generations (default: 3) to provide avoidance advice
   */
  public static getAvoidanceAdvice(lookbackCount = 3): AntiRepetitionAdvice {
    const history = this.loadHistory();
    const recent = history.slice(-lookbackCount);

    const avoidHookArchetypes: string[] = [];
    const avoidStoryArcs: string[] = [];
    const avoidDesignPresets: string[] = [];

    // Collect frequently repeated patterns in the immediate past
    for (const record of recent) {
      if (record.hookArchetype) avoidHookArchetypes.push(record.hookArchetype);
      if (record.storyArc) avoidStoryArcs.push(record.storyArc);
      if (record.designPreset) avoidDesignPresets.push(record.designPreset);
    }

    return {
      avoidHookArchetypes: Array.from(new Set(avoidHookArchetypes)),
      avoidStoryArcs: Array.from(new Set(avoidStoryArcs)),
      avoidDesignPresets: Array.from(new Set(avoidDesignPresets)),
      recommendAlternative: recent.length > 0,
    };
  }

  /**
   * Records a successfully planned video generation into history
   */
  public static recordGeneration(record: VideoCreativeRecord): void {
    try {
      const history = this.loadHistory();
      history.push(record);

      // Keep only recent records
      const trimmed = history.slice(-this.MAX_HISTORY_RECORDS);

      const dir = path.dirname(this.HISTORY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[CreativeHistory] Failed to save creative record:', err.message);
    }
  }
}
