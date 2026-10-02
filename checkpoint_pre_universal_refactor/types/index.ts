export interface SubtitleWord {
  word: string;
  startFrame: number;
  endFrame: number;
  highlight?: boolean;
}

export interface Scene {
  id: number;
  durationInSeconds: number;
  durationInFrames: number;
  voiceOver: string;
  caption: string;
  visualPrompt: string;
  audioPath?: string;
  audioDuration?: number;
  imagePath?: string;
  subtitles?: SubtitleWord[];
}

export interface VideoScript {
  title: string;
  topic: string;
  targetDuration: number;
  scenes: Scene[];
  backgroundMusicStyle?: string;
}

export interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  outputDir: string;
  tempDir: string;
}

export interface VideoCompositionProps extends Record<string, unknown> {
  script: VideoScript;
  fps: number;
  musicAudioPath?: string;
  musicVolume?: number;
}

// Provider interfaces
export interface ILLMProvider {
  readonly name: string;
  generateScript(prompt: string, targetDuration: number, contextText?: string): Promise<VideoScript>;
}

export interface ITTSProvider {
  readonly name: string;
  generateAudio(text: string, outputPath: string): Promise<{ audioPath: string; durationInSeconds: number }>;
}

export interface IVisualProvider {
  readonly name: string;
  generateVisual(prompt: string, outputPath: string, sceneIndex: number): Promise<string>;
}

export interface IArticleExtractor {
  readonly name: string;
  extract(url: string): Promise<{ title: string; summary?: string; content: string; keyPoints?: string[]; images?: string[] }>;
}
