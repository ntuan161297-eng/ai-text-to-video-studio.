/**
 * PART 32 — MOTION DIRECTOR
 * Determines primary motion dynamics that support storytelling without distracting chaos.
 * Enforces rule: Exactly one primary camera motion per shot.
 */

import { PrimaryMotion, ShotType } from '../types/productionEngine.js';

export class MotionDirector {
  /**
   * Assigns optimal motion based on shot type and emotional intention
   */
  public static assignMotion(shotType: ShotType, isHeroOpening = false): PrimaryMotion {
    if (isHeroOpening) {
      return 'SLOW_PUSH_IN';
    }

    switch (shotType) {
      case 'ESTABLISHING':
        return 'SLOW_PUSH_IN';
      case 'CLOSE_UP':
        return 'PAN_HORIZONTAL';
      case 'DETAIL':
        return 'TILT_VERTICAL';
      case 'DATA_CARD':
        return 'NUMBER_COUNT_UP';
      case 'DYNAMIC_ACTION':
        return 'DYNAMIC_WHIP';
      case 'KINETIC_TEXT':
        return 'TEXT_REVEAL';
      case 'MAP_VIEW':
        return 'SLOW_PULL_OUT';
      case 'SPLIT_VIEW':
        return 'PARALLAX_DEPTH';
      default:
        return 'SLOW_PUSH_IN';
    }
  }
}
