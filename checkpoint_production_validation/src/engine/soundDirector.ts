/**
 * SoundDirector - Engine module for Sound Design & Audio Strategy (Section 15)
 * Controls BGM selection, audio ducking, fade curves, subtle SFX cues, and voice prioritization.
 */

export interface SoundCue {
  sceneId: number;
  timeOffsetMs: number;
  type: 'transition_whoosh' | 'impact_hit' | 'subtle_chime' | 'metric_tick' | 'ambient';
  volume: number; // 0.0 - 1.0
  description: string;
}

export interface AudioPlan {
  bgmGenre: string;
  bgmTempo: 'slow' | 'moderate' | 'upbeat' | 'dynamic';
  bgmVolume: number; // 0.08 - 0.20 when voice is active (ducked)
  duckingDb: number; // typically -12dB to -18dB
  fadeInDurationMs: number;
  fadeOutDurationMs: number;
  cues: SoundCue[];
  voicePriorityRatio: number; // 1.0 = speech always dominant
}

export class SoundDirector {
  /**
   * Plans the entire audio design for a video based on content type, tone, and scene transitions.
   */
  public static planAudio(
    contentType: string,
    tone: string,
    scenesCount: number,
    targetDurationSec: number
  ): AudioPlan {
    let bgmGenre = 'corporate_ambient';
    let bgmTempo: 'slow' | 'moderate' | 'upbeat' | 'dynamic' = 'moderate';
    let bgmVolume = 0.12;

    switch (contentType) {
      case 'NEWS':
      case 'FINANCE':
        bgmGenre = 'tech_news_pulse';
        bgmTempo = 'moderate';
        bgmVolume = 0.10;
        break;
      case 'TECH':
      case 'EDUCATION':
        bgmGenre = 'modern_synth_inspire';
        bgmTempo = 'upbeat';
        bgmVolume = 0.12;
        break;
      case 'REAL_ESTATE':
      case 'LUXURY':
        bgmGenre = 'cinematic_elegance';
        bgmTempo = 'slow';
        bgmVolume = 0.14;
        break;
      case 'TRAVEL':
      case 'LIFESTYLE':
        bgmGenre = 'acoustic_uplifting';
        bgmTempo = 'upbeat';
        bgmVolume = 0.13;
        break;
      case 'PRODUCT':
        bgmGenre = 'commercial_energetic';
        bgmTempo = 'dynamic';
        bgmVolume = 0.12;
        break;
      case 'DOCUMENTARY':
      case 'HISTORY':
      case 'STORY':
        bgmGenre = 'dramatic_orchestral_calm';
        bgmTempo = 'slow';
        bgmVolume = 0.11;
        break;
      default:
        bgmGenre = 'lofi_modern_beat';
        bgmTempo = 'moderate';
        bgmVolume = 0.12;
    }

    // Adjust tempo if tone demands
    if (tone.includes('urgent') || tone.includes('energetic')) {
      bgmTempo = 'dynamic';
    } else if (tone.includes('calm') || tone.includes('serious')) {
      bgmTempo = 'slow';
    }

    // Place subtle sound cues strategically - NOT on every single transition
    const cues: SoundCue[] = [];
    // Opening hook punch
    cues.push({
      sceneId: 1,
      timeOffsetMs: 150,
      type: 'impact_hit',
      volume: 0.25,
      description: 'Hook impact cue to grab initial attention',
    });

    // Mid-video highlight cue (around scene 3 or 4)
    if (scenesCount >= 4) {
      const midScene = Math.floor(scenesCount / 2);
      cues.push({
        sceneId: midScene,
        timeOffsetMs: 100,
        type: 'metric_tick',
        volume: 0.18,
        description: 'Key metric or climax data point accent',
      });
    }

    // Call-to-action transition
    if (scenesCount >= 3) {
      cues.push({
        sceneId: scenesCount,
        timeOffsetMs: 50,
        type: 'transition_whoosh',
        volume: 0.20,
        description: 'Clean sweep into concluding payoff / CTA',
      });
    }

    return {
      bgmGenre,
      bgmTempo,
      bgmVolume,
      duckingDb: -14, // Ducks music -14dB below speech level
      fadeInDurationMs: 800,
      fadeOutDurationMs: 1500,
      cues,
      voicePriorityRatio: 1.0,
    };
  }
}
