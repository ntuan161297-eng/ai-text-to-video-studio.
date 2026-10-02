/**
 * PART 23 — MEDIA POLICY ROUTER
 * Enforces strict asset policies:
 *   FACTUAL_NEWS, REAL_PERSON, REAL_PRODUCT, REAL_LOCATION, REAL_EVENT
 *   --> REAL ASSET FIRST. Absolute ban on fake anime/cartoon/illustrations.
 *   CONCEPTUAL / EXPLAINER ABSTRACT --> high quality illustrative/diagram permitted.
 * Priority: FACTUAL AUTHENTICITY > SEMANTIC RELEVANCE > STYLE.
 */

import { ContentType } from '../types/contentBrain.js';
import { MediaPolicy } from '../types/productionEngine.js';

export class MediaPolicyRouter {
  private static readonly FACTUAL_TYPES: ContentType[] = [
    'REAL_PRODUCT',
    'REAL_LOCATION',
    'REAL_PERSON',
    'REAL_ESTATE',
    'NEWS',
    'CURRENT_EVENT',
    'TRAVEL',
    'DOCUMENTARY',
    'HISTORY',
    'BUSINESS',
  ];

  /**
   * Evaluates media policy for a given content type
   */
  public static getPolicy(contentType: ContentType): MediaPolicy {
    const isFactual = this.FACTUAL_TYPES.includes(contentType);

    if (isFactual) {
      return {
        contentType,
        requiresRealAsset: true,
        allowGenerated: false,
        bannedVisualStyles: [
          'anime',
          'cartoon',
          'pixar',
          '3d_stylized',
          'comic',
          'fantasy',
          'cyberpunk',
        ],
        fallbackType:
          contentType === 'REAL_LOCATION' || contentType === 'TRAVEL'
            ? 'MAP'
            : contentType === 'REAL_PRODUCT' || contentType === 'REAL_ESTATE'
            ? 'METRIC_CARD'
            : 'TYPOGRAPHY',
      };
    }

    return {
      contentType,
      requiresRealAsset: false,
      allowGenerated: true,
      bannedVisualStyles: [],
      fallbackType: 'CHART',
    };
  }

  /**
   * Validates if a proposed visual style violates media policy
   */
  public static validateStyle(contentType: ContentType, proposedStyle?: string): {
    isValid: boolean;
    reason?: string;
  } {
    const policy = this.getPolicy(contentType);
    if (!proposedStyle) return { isValid: true };

    const styleLower = proposedStyle.toLowerCase();
    for (const banned of policy.bannedVisualStyles) {
      if (styleLower.includes(banned)) {
        return {
          isValid: false,
          reason: `Chủ đề ${contentType} mang tính hiện thực xác thực (factual), nghiêm cấm sử dụng phong cách ${banned}. Bắt buộc sử dụng hình ảnh thực tế hoặc đồ họa dữ liệu/bản đồ/typography.`,
        };
      }
    }

    return { isValid: true };
  }
}
