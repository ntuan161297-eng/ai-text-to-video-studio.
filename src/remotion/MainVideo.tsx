import React from 'react';
import { Sequence, Audio } from 'remotion';
import { VideoCompositionProps } from '../types/index';
import { SceneItem } from './SceneItem';
import { ProgressBar } from './ProgressBar';

export const MainVideo: React.FC<VideoCompositionProps> = ({
  script,
  musicAudioPath,
  musicVolume = 0.1,
}) => {
  let accumulatedFrames = 0;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
      }}
    >
      {/* Background Music if provided */}
      {musicAudioPath && (
        <Audio
          src={musicAudioPath}
          volume={musicVolume}
          loop
        />
      )}

      {/* Video Scenes Sequence */}
      {script.scenes.map((scene: any) => {
        const from = accumulatedFrames;
        accumulatedFrames += scene.durationInFrames;

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={scene.durationInFrames}
            name={`Scene ${scene.id}`}
          >
            <SceneItem scene={scene} />
            {scene.audioPath && (
              <Audio src={scene.audioPath} volume={1.0} />
            )}
          </Sequence>
        );
      })}

      {/* Top Progress Bar */}
      <ProgressBar />
    </div>
  );
};
