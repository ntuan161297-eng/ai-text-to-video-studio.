import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { VideoCompositionProps } from '../types/index';

const defaultProps: VideoCompositionProps = {
  fps: 30,
  script: {
    title: 'Video Mẫu',
    topic: 'Khám phá công nghệ AI',
    targetDuration: 15,
    scenes: [
      {
        id: 1,
        durationInSeconds: 5,
        durationInFrames: 150,
        voiceOver: 'Chào mừng bạn đến với thế giới video tự động hóa bằng AI!',
        caption: 'XIN CHÀO BẠN',
        visualPrompt: 'Futuristic AI neon cityscape 9:16 vertical',
      },
      {
        id: 2,
        durationInSeconds: 5,
        durationInFrames: 150,
        voiceOver: 'Tất cả mọi thứ từ kịch bản, giọng đọc đến hình ảnh đều tự động.',
        caption: 'TỰ ĐỘNG HOÁ 100%',
        visualPrompt: 'Robotic brain digital matrix 9:16 vertical',
      },
      {
        id: 3,
        durationInSeconds: 5,
        durationInFrames: 150,
        voiceOver: 'Hãy bắt đầu tạo video của riêng bạn ngay hôm nay nhé!',
        caption: 'BẮT ĐẦU NGAY',
        visualPrompt: 'Call to action glowing smartphone button 9:16',
      },
    ],
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TikTokVideo"
        component={MainVideo as any}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps as any}
        calculateMetadata={async ({ props }: { props: any }) => {
          const totalFrames =
            props.script?.scenes?.reduce(
              (sum: number, s: any) => sum + (s.durationInFrames || 150),
              0
            ) || 450;
          return {
            durationInFrames: Math.max(30, totalFrames),
            fps: props.fps || 30,
          };
        }}
      />
    </>
  );
};
