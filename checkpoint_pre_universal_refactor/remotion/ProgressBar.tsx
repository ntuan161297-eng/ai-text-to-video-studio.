import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = Math.min(100, Math.max(0, (frame / durationInFrames) * 100));

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.8)',
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
};
