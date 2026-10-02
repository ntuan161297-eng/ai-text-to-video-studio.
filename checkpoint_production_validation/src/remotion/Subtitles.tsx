import React from 'react';
import { useCurrentFrame } from 'remotion';
import { generateSynchronizedSubtitles } from '../utils/subtitles';

interface SubtitlesProps {
  voiceOver: string;
  durationInFrames: number;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ voiceOver, durationInFrames }) => {
  const frame = useCurrentFrame();
  const chunks = React.useMemo(() => {
    return generateSynchronizedSubtitles(voiceOver, durationInFrames, 4);
  }, [voiceOver, durationInFrames]);

  // Find active chunk
  const currentChunk = chunks.find(
    (c: any) => frame >= c.startFrame && frame <= c.endFrame
  );

  if (!currentChunk) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '260px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px 14px',
          padding: '16px 28px',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          borderRadius: '24px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
        }}
      >
        {currentChunk.words.map((w: any, index: number) => {
          const isActive = frame >= w.startFrame && frame <= w.endFrame;
          return (
            <span
              key={index}
              style={{
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                fontSize: isActive ? '52px' : '46px',
                fontWeight: 900,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: isActive ? '#facc15' : '#ffffff',
                textShadow: isActive
                  ? '0 0 20px #eab308, 0 4px 8px rgba(0,0,0,0.9)'
                  : '0 4px 8px rgba(0,0,0,0.9)',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.08s ease-in-out',
                display: 'inline-block',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
