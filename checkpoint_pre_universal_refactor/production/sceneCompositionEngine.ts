/**
 * PART 30 & 31 — SCENE COMPOSITION & VISUAL HIERARCHY ENGINE
 * Assigns one of 14 purposeful composition archetypes to each shot:
 *   FULL_BLEED, PRODUCT_HERO, DETAIL_CLOSEUP, SPLIT_SCREEN, STAT_CARD, MAP, CHART,
 *   DOCUMENTARY_BROLL, KINETIC_TYPE, QUOTE, BEFORE_AFTER, UI_DEMO, TIMELINE, MONTAGE.
 * Enforces strict visual hierarchy: Primary Focus -> Secondary Info -> Caption.
 */

import { ApprovedScriptPackage, ScriptBeat } from '../types/contentBrain.js';
import { CompositionArchetype, SceneCompositionModel, ShotPlan, VerifiedAsset } from '../types/productionEngine.js';

export class SceneCompositionEngine {
  /**
   * Selects purposeful composition archetype based on beat purpose, content type, and shot plan
   */
  public static selectArchetype(
    beat: ScriptBeat,
    contentType: string,
    shot: ShotPlan
  ): CompositionArchetype {
    if (beat.purpose === 'cta') {
      return 'KINETIC_TYPE';
    }

    if (beat.displayCopy.metricBadge || shot.shotType === 'DATA_CARD') {
      return 'STAT_CARD';
    }

    switch (contentType) {
      case 'REAL_PRODUCT':
        if (shot.shotType === 'CLOSE_UP' || shot.shotType === 'DETAIL') {
          return 'DETAIL_CLOSEUP';
        }
        return 'PRODUCT_HERO';

      case 'REAL_LOCATION':
      case 'TRAVEL':
        if (shot.shotType === 'MAP_VIEW') {
          return 'MAP';
        }
        return 'DOCUMENTARY_BROLL';

      case 'FINANCE':
      case 'BUSINESS':
        return 'CHART';

      case 'TECH':
        if (shot.shotType === 'DYNAMIC_ACTION') {
          return 'SPLIT_SCREEN';
        }
        return 'FULL_BLEED';

      default:
        return 'FULL_BLEED';
    }
  }

  /**
   * Composes complete models for all scenes in the timeline
   */
  public static composeScenes(options: {
    scriptPackage: ApprovedScriptPackage;
    shotPlans: ShotPlan[];
    assetMap: Map<string, VerifiedAsset>;
  }): SceneCompositionModel[] {
    const { scriptPackage, shotPlans, assetMap } = options;
    const models: SceneCompositionModel[] = [];

    for (const beat of scriptPackage.allBeats) {
      const associatedShots = shotPlans.filter((s) => s.beatId === beat.beatId);
      const shot = associatedShots[0] || {
        shotId: `shot_${beat.beatId}`,
        beatId: beat.beatId,
        shotType: 'ESTABLISHING',
        durationSec: beat.targetDurationSec,
        primaryVisual: '',
        expectedEntities: [],
        assetMode: 'SEMANTIC_FALLBACK',
        motion: 'SLOW_PUSH_IN',
        purpose: '',
      };

      const asset = assetMap.get(shot.shotId);
      const archetype = this.selectArchetype(beat, scriptPackage.contentType, shot);

      models.push({
        beatId: beat.beatId,
        archetype,
        headline: beat.displayCopy.headline,
        supportingText: beat.displayCopy.supportingText,
        metricBadge: beat.displayCopy.metricBadge,
        primaryAssetPath: asset?.url,
        motion: shot.motion,
        audioPath: '',
        durationSec: beat.targetDurationSec,
        startSec: 0,
      });
    }

    return models;
  }
}
