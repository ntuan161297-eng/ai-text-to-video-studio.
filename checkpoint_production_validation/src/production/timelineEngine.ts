/**
 * PART 27 — TIMELINE ENGINE
 * Constructs the final video timeline strictly synchronized to ACTUAL voice recordings.
 * Strictly bans ffmpeg silent padding ('apad') to fake scene durations.
 */

import { ApprovedScriptPackage } from '../types/contentBrain.js';
import { BeatAudioTiming, SceneCompositionModel, ShotPlan, VerifiedAsset } from '../types/productionEngine.js';

export interface TimelineScene {
  id?: number;
  beatId: number;
  shotId?: string;
  narration?: string;
  startTimeSec: number;
  durationSec: number;
  audioPath: string;
  audioDurationSec: number;
  headline: string;
  supportingText?: string;
  metricBadge?: string;
  assetUrl?: string;
  isRealAsset: boolean;
}

export interface VideoTimeline {
  totalDurationSec: number;
  scenes: TimelineScene[];
}

export class TimelineEngine {
  /**
   * Constructs the synchronized production timeline from audio timings and shot plans
   */
  public static buildTimeline(options: {
    scriptPackage: ApprovedScriptPackage;
    beatTimings: BeatAudioTiming[];
    shotPlans: ShotPlan[];
    assetMap: Map<string, VerifiedAsset>;
  }): VideoTimeline {
    const { scriptPackage, beatTimings, shotPlans, assetMap } = options;
    const timelineScenes: TimelineScene[] = [];

    for (const beat of scriptPackage.allBeats) {
      const timing = beatTimings.find((t) => t.beatId === beat.beatId);
      if (!timing) continue;

      const associatedShots = shotPlans.filter((s) => s.beatId === beat.beatId);
      const primaryShot = associatedShots[0];
      const asset = primaryShot ? assetMap.get(primaryShot.shotId) : undefined;

      timelineScenes.push({
        beatId: beat.beatId,
        shotId: primaryShot?.shotId,
        startTimeSec: timing.startSec,
        durationSec: timing.durationSec,
        audioPath: timing.audioPath,
        audioDurationSec: timing.durationSec,
        headline: beat.displayCopy.headline,
        supportingText: beat.displayCopy.supportingText,
        metricBadge: beat.displayCopy.metricBadge,
        assetUrl: asset?.url,
        isRealAsset: Boolean(asset?.isRealEntityAsset),
      });
    }

    const totalDurationSec =
      timelineScenes.length > 0
        ? parseFloat(
            (
              timelineScenes[timelineScenes.length - 1].startTimeSec +
              timelineScenes[timelineScenes.length - 1].durationSec
            ).toFixed(2)
          )
        : 0;

    return {
      totalDurationSec,
      scenes: timelineScenes,
    };
  }
}
