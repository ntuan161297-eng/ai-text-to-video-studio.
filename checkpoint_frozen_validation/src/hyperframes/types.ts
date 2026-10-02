export interface HyperScene {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  metric?: string;
  highlightText: string;
  iconSvg?: string;
  imageUrl?: string;
  imagePath?: string;
  productImageUrl?: string;
  voiceOver: string;
  caption: string;
  startTime: number;
  duration: number;
  audioDuration?: number;
  audioFileName?: string;
  audioFilePath?: string;
}

export interface HyperVideoProject {
  title: string;
  topic: string;
  totalDuration: number;
  fps: number;
  width: number;
  height: number;
  scenes: HyperScene[];
  bgmPath?: string;
  style?: string;
  fontFamily?: string;
  hideTitle?: boolean;
  transitionEffect?: '3d_flycam' | '3d_tilt' | 'cinematic_zoom' | 'dynamic_whip';
  isAffiliate?: boolean;
  productData?: {
    name?: string;
    price?: string;
    discount?: string;
    imageUrl?: string;
    affiliateUrl?: string;
  };
}
