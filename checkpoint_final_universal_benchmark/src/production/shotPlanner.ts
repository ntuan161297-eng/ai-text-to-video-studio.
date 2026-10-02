/**
 * PART 22 — STORYBOARD & SHOT PLANNER
 * Breaks approved script beats into multi-shot cinematic visual plans.
 * Replaces the obsolete 1-scene = 1-photo paradigm with dynamic editor cuts.
 */

import { ApprovedScriptPackage, ScriptBeat } from '../types/contentBrain.js';
import { MediaPolicyRouter } from './mediaPolicyRouter.js';
import { ShotPlan } from '../types/productionEngine.js';

export class ShotPlanner {
  /**
   * Plans multi-shot cuts for each beat in the approved script
   */
  public static planShots(approvedPackage: ApprovedScriptPackage): {
    totalShots: number;
    shotPlans: ShotPlan[];
  } {
    const policy = MediaPolicyRouter.getPolicy(approvedPackage.contentType);
    const plans: ShotPlan[] = [];

    let shotCounter = 1;

    for (const beat of approvedPackage.allBeats) {
      const duration = beat.targetDurationSec || 7;
      const entities = beat.expectedEntities;
      const mainEntity = entities[0] || approvedPackage.title;

      if (beat.purpose === 'opening_hook') {
        // Opening: Quick 2-shot cut (Establishing -> Dynamic Push)
        const shot1Dur = parseFloat((duration * 0.45).toFixed(1));
        const shot2Dur = parseFloat((duration - shot1Dur).toFixed(1));

        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'ESTABLISHING',
          durationSec: shot1Dur,
          primaryVisual: `Toàn cảnh góc rộng trực diện của ${mainEntity}`,
          expectedEntities: entities,
          assetMode: policy.requiresRealAsset ? 'REAL_ASSET' : 'SEMANTIC_FALLBACK',
          motion: 'SLOW_PUSH_IN',
          purpose: 'Định vị rõ ràng thực thể ngay trong 2 giây đầu tiên',
        });

        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'DYNAMIC_ACTION',
          durationSec: shot2Dur,
          primaryVisual: `Cận cảnh chuyển động làm nổi bật tiêu đề: "${beat.displayCopy.headline}"`,
          expectedEntities: entities,
          assetMode: policy.requiresRealAsset ? 'REAL_ASSET' : 'SEMANTIC_FALLBACK',
          motion: 'DYNAMIC_WHIP',
          purpose: 'Tăng nhịp cắt (visual pacing) kích thích giữ chân',
        });
      } else if (beat.displayCopy.metricBadge) {
        // Beat has a prominent metric: Shot 1 context -> Shot 2 data card
        const shot1Dur = parseFloat((duration * 0.5).toFixed(1));
        const shot2Dur = parseFloat((duration - shot1Dur).toFixed(1));

        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'CLOSE_UP',
          durationSec: shot1Dur,
          primaryVisual: `Cận cảnh trải nghiệm thực tế liên quan đến ${beat.displayCopy.metricBadge}`,
          expectedEntities: entities,
          assetMode: policy.requiresRealAsset ? 'REAL_ASSET' : 'SEMANTIC_FALLBACK',
          motion: 'PAN_HORIZONTAL',
          purpose: 'Tạo bối cảnh trực quan cho con số',
        });

        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'DATA_CARD',
          durationSec: shot2Dur,
          primaryVisual: `Thẻ số liệu kích thước lớn: ${beat.displayCopy.metricBadge} đính kèm kiểm chứng`,
          expectedEntities: entities,
          assetMode: 'SEMANTIC_FALLBACK',
          motion: 'NUMBER_COUNT_UP',
          purpose: 'Làm nổi bật thông số then chốt bằng chuyển động số trực quan',
        });
      } else if (beat.purpose === 'cta') {
        // CTA Screen: Kinetic Typography & Interactive Badge
        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'KINETIC_TEXT',
          durationSec: duration,
          primaryVisual: `Bố cục kết thúc tương tác kêu gọi: "${beat.displayCopy.headline}"`,
          expectedEntities: entities,
          assetMode: 'SEMANTIC_FALLBACK',
          motion: 'TEXT_REVEAL',
          purpose: 'Kêu gọi hành động rõ ràng không che khuất safe area',
        });
      } else {
        // Standard body beat: Shot 1 Establishing -> Shot 2 Detail
        const shot1Dur = parseFloat((duration * 0.55).toFixed(1));
        const shot2Dur = parseFloat((duration - shot1Dur).toFixed(1));

        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'ESTABLISHING',
          durationSec: shot1Dur,
          primaryVisual: `Góc máy trung cảnh minh họa: ${beat.newInformation.slice(0, 60)}`,
          expectedEntities: entities,
          assetMode: policy.requiresRealAsset ? 'REAL_ASSET' : 'SEMANTIC_FALLBACK',
          motion: 'SLOW_PUSH_IN',
          purpose: 'Minh họa tiến trình thông tin',
        });

        plans.push({
          shotId: `shot_${shotCounter++}`,
          beatId: beat.beatId,
          shotType: 'DETAIL',
          durationSec: shot2Dur,
          primaryVisual: `Góc cận cảnh chi tiết hoặc góc nhìn bổ trợ cho ${mainEntity}`,
          expectedEntities: entities,
          assetMode: policy.requiresRealAsset ? 'REAL_ASSET' : 'SEMANTIC_FALLBACK',
          motion: 'TILT_VERTICAL',
          purpose: 'Tạo chiều sâu điện ảnh 9:16',
        });
      }
    }

    return {
      totalShots: plans.length,
      shotPlans: plans,
    };
  }
}
