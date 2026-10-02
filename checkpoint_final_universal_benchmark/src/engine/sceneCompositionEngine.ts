/**
 * SceneCompositionEngine (Section F & G)
 * Determines creative composition layouts and visual hierarchy for each scene.
 * Enforces visual-first presentation, preventing repetitive card layouts and ensuring
 * the primary visual (product/location/footage) remains dominant and unobstructed.
 */

export type CompositionLayout =
  | 'FULL_BLEED_HERO'
  | 'PRODUCT_CLOSEUP'
  | 'STAT_CARD'
  | 'FEATURE_CALLOUT'
  | 'CINEMATIC_BROLL'
  | 'SPLIT_SCREEN'
  | 'MAP_OVERVIEW'
  | 'CHART_GRAPHIC';

export interface SceneComposition {
  sceneId: number;
  layout: CompositionLayout;
  visualDominancePercent: number; // 60 - 100% of frame
  textPosition: 'top_floating' | 'bottom_floating' | 'side_accent';
  overlayStyle: 'subtle_vignette' | 'minimal_gradient' | 'clean_unobstructed';
  animationMotion: 'camera_push' | 'slow_pan' | 'drone_swoop' | 'subtle_float';
}

export class SceneCompositionEngine {
  /**
   * Plans dynamic composition across all scenes, preventing consecutive layout repetition
   */
  public static planCompositions(
    scenes: Array<{ sceneId: number; purpose: string; visualType?: string; metric?: string }>,
    contentType: string
  ): SceneComposition[] {
    const compositions: SceneComposition[] = [];
    let lastLayout: CompositionLayout | null = null;
    let consecutiveCount = 0;

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      let layout: CompositionLayout = 'FULL_BLEED_HERO';

      if (i === 0) {
        layout = contentType === 'PRODUCT' ? 'PRODUCT_CLOSEUP' : 'FULL_BLEED_HERO';
      } else if (s.metric && s.metric.length > 0) {
        layout = 'STAT_CARD';
      } else if (s.visualType === 'map') {
        layout = 'MAP_OVERVIEW';
      } else if (s.visualType === 'chart') {
        layout = 'CHART_GRAPHIC';
      } else if (contentType === 'PRODUCT') {
        const productLayouts: CompositionLayout[] = [
          'FEATURE_CALLOUT',
          'PRODUCT_CLOSEUP',
          'CINEMATIC_BROLL',
          'FULL_BLEED_HERO',
        ];
        layout = productLayouts[(i - 1) % productLayouts.length];
      } else {
        const generalLayouts: CompositionLayout[] = [
          'FULL_BLEED_HERO',
          'FEATURE_CALLOUT',
          'CINEMATIC_BROLL',
          'FULL_BLEED_HERO',
        ];
        layout = generalLayouts[(i - 1) % generalLayouts.length];
      }

      // Enforce: No layout repeats more than 2 times consecutively (Section F)
      if (layout === lastLayout) {
        consecutiveCount++;
        if (consecutiveCount >= 2) {
          layout = layout === 'FULL_BLEED_HERO' ? 'FEATURE_CALLOUT' : 'FULL_BLEED_HERO';
          consecutiveCount = 1;
        }
      } else {
        lastLayout = layout;
        consecutiveCount = 1;
      }

      let visualDominance = 85;
      let textPos: SceneComposition['textPosition'] = 'top_floating';
      let overlay: SceneComposition['overlayStyle'] = 'minimal_gradient';
      let motion: SceneComposition['animationMotion'] = 'camera_push';

      switch (layout) {
        case 'PRODUCT_CLOSEUP':
          visualDominance = 90;
          textPos = 'top_floating';
          overlay = 'clean_unobstructed';
          motion = 'subtle_float';
          break;
        case 'STAT_CARD':
          visualDominance = 75;
          textPos = 'top_floating';
          overlay = 'minimal_gradient';
          motion = 'slow_pan';
          break;
        case 'CINEMATIC_BROLL':
          visualDominance = 95;
          textPos = 'top_floating';
          overlay = 'subtle_vignette';
          motion = 'drone_swoop';
          break;
        case 'FEATURE_CALLOUT':
          visualDominance = 80;
          textPos = 'top_floating';
          overlay = 'minimal_gradient';
          motion = 'camera_push';
          break;
        default:
          visualDominance = 85;
          textPos = 'top_floating';
          overlay = 'minimal_gradient';
          motion = 'camera_push';
      }

      compositions.push({
        sceneId: s.sceneId,
        layout,
        visualDominancePercent: visualDominance,
        textPosition: textPos,
        overlayStyle: overlay,
        animationMotion: motion,
      });
    }

    return compositions;
  }
}
