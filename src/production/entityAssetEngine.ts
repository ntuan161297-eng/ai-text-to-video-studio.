/**
 * PART 24 — REAL ASSET RETRIEVAL ENGINE
 * Retrieves authentic real-world assets based on specific entities.
 * Prohibits voiceover paragraph scraping for search.
 * When real assets are unavailable, falls back to semantic cards, maps, charts, or kinetic typography.
 */

import { ApprovedScriptPackage } from '../types/contentBrain.js';
import { MediaPolicyRouter } from './mediaPolicyRouter.js';
import { AssetVerifier } from './assetVerifier.js';
import { ShotPlan, VerifiedAsset } from '../types/productionEngine.js';

export class EntityAssetEngine {
  /**
   * Resolves verified visual assets for a set of shot plans
   */
  public static resolveAssetsForShots(options: {
    scriptPackage: ApprovedScriptPackage;
    shotPlans: ShotPlan[];
    candidateImages?: string[];
  }): Map<string, VerifiedAsset> {
    const { scriptPackage, shotPlans, candidateImages = [] } = options;
    const policy = MediaPolicyRouter.getPolicy(scriptPackage.contentType);
    const mainEntity = scriptPackage.primaryEntities[0] || scriptPackage.title;

    const resultMap = new Map<string, VerifiedAsset>();
    let candidateIndex = 0;

    for (const shot of shotPlans) {
      // 1. Try real entity candidate images if provided from approved articles
      if (candidateImages.length > 0) {
        const candidateUrl = candidateImages[candidateIndex % candidateImages.length];
        candidateIndex++;
        const verified = AssetVerifier.verifyAsset({
          url: candidateUrl,
          entityName: mainEntity,
          sourceDomain: 'approved_source',
          expectedPurpose: shot.purpose,
          isFromOfficialSource: true,
        });

        if (verified.isApproved) {
          resultMap.set(shot.shotId, verified);
          continue;
        }
      }

      // 2. If real asset is required but not found in candidates, create a semantic fallback asset
      // (NEVER a random cartoon!)
      let fallbackMode = policy.fallbackType;
      if (shot.shotType === 'DATA_CARD') fallbackMode = 'METRIC_CARD';
      if (shot.shotType === 'KINETIC_TEXT') fallbackMode = 'TYPOGRAPHY';

      const fallbackAsset: VerifiedAsset = {
        id: `semantic_${shot.shotId}`,
        url: `data:semantic/${fallbackMode.toLowerCase()}`,
        localPath: '',
        entityName: mainEntity,
        sourceDomain: 'internal_design_system',
        scores: {
          semanticRelevance: 25,
          entityMatch: 25,
          authenticity: 20,
          visualQuality: 15,
          resolution: 10,
          total: 95,
        },
        isApproved: true,
        isRealEntityAsset: false,
        aspectRatio: '9:16',
      };

      resultMap.set(shot.shotId, fallbackAsset);
    }

    return resultMap;
  }
}
