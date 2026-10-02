import React from 'react';
import { interpolate, useCurrentFrame, Img } from 'remotion';
import { Scene } from '../types/index';
import { Subtitles } from './Subtitles';

interface SceneItemProps {
  scene: Scene;
}

export const SceneItem: React.FC<SceneItemProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const duration = scene.durationInFrames;

  // Ken Burns subtle zoom effect (1.0 -> 1.12)
  const scale = interpolate(frame, [0, duration], [1.0, 1.12], {
    extrapolateRight: 'clamp',
  });

  // Gentle translation pan
  const translateY = interpolate(frame, [0, duration], [0, -25], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0a0a0c',
      }}
    >
      {/* Dual-Layer Image Presentation: Ambient Blur Backdrop + Hero Uncropped Landmark */}
      {scene.imagePath && (
        <>
          {/* Layer 1: Ambient Atmospheric Glow (Zero Letterbox / Edge-to-Edge) */}
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-15%',
              width: '130%',
              height: '130%',
              transform: `scale(${scale * 1.05})`,
              filter: 'blur(50px) brightness(0.38) saturate(1.35)',
              transformOrigin: 'center center',
            }}
          >
            <Img
              src={scene.imagePath}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Layer 2: Hero Visual (100% Full Uncropped Landmark/Subject Display) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${scale}) translateY(${translateY}px)`,
              maxWidth: '92%',
              maxHeight: '58%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8), 0 0 0 1.5px rgba(255, 255, 255, 0.16)',
              backgroundColor: 'rgba(12, 16, 26, 0.5)',
              zIndex: 3,
            }}
          >
            <Img
              src={scene.imagePath}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 24,
                display: 'block',
              }}
            />
          </div>
        </>
      )}

      {/* Cinematic Vignette & Bottom Dimming Gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, transparent 20%, transparent 60%, rgba(0, 0, 0, 0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Synced Karaoke Subtitles */}
      <Subtitles voiceOver={scene.voiceOver} durationInFrames={scene.durationInFrames} />
    </div>
  );
};
