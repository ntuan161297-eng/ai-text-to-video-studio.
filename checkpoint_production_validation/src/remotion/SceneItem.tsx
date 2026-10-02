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
      {/* Background Visual with Ken Burns Motion */}
      {scene.imagePath && (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            transform: `scale(${scale}) translateY(${translateY}px)`,
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
