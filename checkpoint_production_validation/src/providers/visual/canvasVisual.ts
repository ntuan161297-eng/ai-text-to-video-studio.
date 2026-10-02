import fs from 'fs';
import path from 'path';
import { IVisualProvider } from '../../types/index.js';

export class CanvasVisualProvider implements IVisualProvider {
  readonly name = 'CanvasVisual';

  private colorPalettes = [
    { bg1: '#0f172a', bg2: '#1e1b4b', accent: '#6366f1', glow: '#a855f7' }, // Indigo Neon
    { bg1: '#090d16', bg2: '#064e3b', accent: '#10b981', glow: '#34d399' }, // Emerald Cyber
    { bg1: '#18181b', bg2: '#7f1d1d', accent: '#ef4444', glow: '#f97316' }, // Crimson Fire
    { bg1: '#0b0f19', bg2: '#312e81', accent: '#38bdf8', glow: '#818cf8' }, // Cyber Blue
    { bg1: '#172554', bg2: '#581c87', accent: '#f43f5e', glow: '#e879f9' }, // Sunset Violet
  ];

  async generateVisual(prompt: string, outputPath: string, sceneIndex: number): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const palette = this.colorPalettes[sceneIndex % this.colorPalettes.length];
    const cleanPrompt = prompt.replace(/[<>&"']/g, '').slice(0, 100);

    // Create high-res 1080x1920 SVG graphic
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="60%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${palette.bg1}" stop-opacity="0" />
    </radialGradient>
    <filter id="blurFilter">
      <feGaussianBlur stdDeviation="80" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#bgGrad)" />

  <!-- Dynamic Glowing Orbs -->
  <circle cx="540" cy="700" r="420" fill="url(#glowGrad)" filter="url(#blurFilter)" />
  <circle cx="200" cy="1400" r="300" fill="${palette.accent}" opacity="0.25" filter="url(#blurFilter)" />
  <circle cx="850" cy="350" r="280" fill="${palette.glow}" opacity="0.3" filter="url(#blurFilter)" />

  <!-- Modern Grid Texture -->
  <g opacity="0.08" stroke="#ffffff" stroke-width="1.5">
    ${Array.from({ length: 15 })
      .map((_, i) => `<line x1="0" y1="${i * 140}" x2="1080" y2="${i * 140}" />`)
      .join('\n')}
    ${Array.from({ length: 9 })
      .map((_, i) => `<line x1="${i * 135}" y1="0" x2="${i * 135}" y2="1920" />`)
      .join('\n')}
  </g>

  <!-- Modern Central Card Frame -->
  <g transform="translate(540, 850)">
    <rect x="-420" y="-350" width="840" height="700" rx="40" fill="#ffffff" fill-opacity="0.04" stroke="${palette.accent}" stroke-width="2" stroke-opacity="0.4" />
    
    <!-- Scene Badge -->
    <rect x="-100" y="-310" width="200" height="50" rx="25" fill="${palette.accent}" fill-opacity="0.3" stroke="${palette.accent}" stroke-width="1.5" />
    <text x="0" y="-278" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="3">SCENE ${sceneIndex + 1}</text>
    
    <!-- Central Icon / Symbol -->
    <circle cx="0" cy="-60" r="90" fill="${palette.accent}" fill-opacity="0.2" stroke="${palette.glow}" stroke-width="3" />
    <polygon points="-25,-105 45,-60 -25,-15" fill="#ffffff" opacity="0.9" />

    <!-- Prompt / Description -->
    <text x="0" y="160" font-family="system-ui, sans-serif" font-size="34" font-weight="600" fill="#f8fafc" text-anchor="middle" opacity="0.95">
      ${cleanPrompt.slice(0, 40)}
    </text>
    <text x="0" y="215" font-family="system-ui, sans-serif" font-size="26" font-weight="400" fill="#cbd5e1" text-anchor="middle" opacity="0.75">
      ${cleanPrompt.slice(40, 90)}
    </text>
  </g>
</svg>`;

    const finalPath = outputPath.endsWith('.svg') ? outputPath : outputPath.replace(/\.[^/.]+$/, '.svg');
    fs.writeFileSync(finalPath, svg, 'utf-8');
    return finalPath;
  }
}
