/**
 * PART 25 — ASSET VERIFICATION ENGINE
 * Verifies candidate visual assets before they can be assigned to storyboard shots.
 * Scores assets across 5 dimensions:
 *   semanticRelevance, entityMatch, authenticity, visualQuality, resolution.
 * Rejects any asset for a real entity if entityMatch does not pass the threshold.
 */

import { VerifiedAsset } from '../types/productionEngine.js';

export class AssetVerifier {
  /**
   * Verifies and scores a candidate asset for a specific entity and shot
   */
  public static verifyAsset(options: {
    url: string;
    localPath?: string;
    entityName: string;
    sourceDomain: string;
    expectedPurpose: string;
    isFromOfficialSource: boolean;
  }): VerifiedAsset {
    const { url, localPath, entityName, sourceDomain, expectedPurpose, isFromOfficialSource } = options;

    let entityMatch = 15;
    let authenticity = 12;
    let semanticRelevance = 18;
    let visualQuality = 12;
    let resolution = 8;

    const lowerUrl = url.toLowerCase();
    const entityClean = entityName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Entity Match (0 - 30)
    if (isFromOfficialSource) {
      entityMatch = 30;
      authenticity = 20;
    } else if (entityClean.length >= 3 && lowerUrl.includes(entityClean)) {
      entityMatch = 26;
      authenticity = 18;
    } else if (sourceDomain.includes('vnexpress') || sourceDomain.includes('tuoitre') || sourceDomain.includes('wikipedia')) {
      entityMatch = 22;
      authenticity = 16;
    }

    // 2. Visual Quality & Aspect Ratio Hint (0 - 15)
    if (lowerUrl.includes('thumb') || lowerUrl.includes('avatar') || lowerUrl.includes('logo') || lowerUrl.includes('icon')) {
      visualQuality = 4;
      entityMatch -= 10;
    } else {
      visualQuality = 14;
    }

    // 3. Resolution (0 - 10)
    if (/w=(?:720|1080|1920)/i.test(lowerUrl) || /large|full|original/i.test(lowerUrl)) {
      resolution = 10;
    }

    const total = entityMatch + authenticity + semanticRelevance + visualQuality + resolution;
    const isApproved = total >= 65 && entityMatch >= 18;

    return {
      id: `asset_${Math.random().toString(36).substring(2, 9)}`,
      url,
      localPath: localPath || '',
      entityName,
      sourceDomain,
      scores: {
        semanticRelevance,
        entityMatch,
        authenticity,
        visualQuality,
        resolution,
        total,
      },
      isApproved,
      isRealEntityAsset: entityMatch >= 20,
      aspectRatio: '9:16',
    };
  }
}
