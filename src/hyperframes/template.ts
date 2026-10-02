import fs from 'fs';
import path from 'path';
import { HyperVideoProject } from './types.js';
import { AppPaths } from '../utils/appPaths.js';

let cachedGsapContent: string | null = null;
function getBundledGsap(): string {
  if (cachedGsapContent) return cachedGsapContent;
  const assetPath = path.join(AppPaths.APP_ROOT, 'src', 'hyperframes', 'assets', 'gsap.min.js');
  if (fs.existsSync(assetPath)) {
    try {
      cachedGsapContent = fs.readFileSync(assetPath, 'utf8');
      return cachedGsapContent;
    } catch {}
  }
  return '';
}

export function generateHyperFramesHtml(project: HyperVideoProject): string {
  const styleKey = (project.style || '').toLowerCase();
  const transitionEffect = project.transitionEffect || '3d_flycam';
  const isAffiliate = Boolean(project.isAffiliate || project.productData);

  const fontMap: Record<string, { family: string; cssFamily: string }> = {
    'Montserrat': {
      family: 'Montserrat:wght@600;700;800;900',
      cssFamily: "'Montserrat', sans-serif",
    },
    'Be Vietnam Pro': {
      family: 'Be+Vietnam+Pro:wght@600;700;800;900',
      cssFamily: "'Be Vietnam Pro', sans-serif",
    },
    'Nunito': {
      family: 'Nunito:wght@700;800;900',
      cssFamily: "'Nunito', sans-serif",
    },
    'Baloo 2': {
      family: 'Baloo+2:wght@700;800',
      cssFamily: "'Baloo 2', cursive, sans-serif",
    },
    'Inter': {
      family: 'Inter:wght@600;700;800;900',
      cssFamily: "'Inter', sans-serif",
    },
    'Playfair Display': {
      family: 'Playfair+Display:wght@700;800;900',
      cssFamily: "'Playfair Display', serif",
    },
    'Roboto': {
      family: 'Roboto:wght@500;700;900',
      cssFamily: "'Roboto', sans-serif",
    },
  };

  const selectedFont = fontMap[project.fontFamily || 'Montserrat'] || fontMap['Montserrat'];

  let colorThemes = [
    {
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
      accent: '#60a5fa',
      accentGlow: 'rgba(96, 165, 250, 0.4)',
      badgeBg: 'rgba(59, 130, 246, 0.25)',
    },
    {
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)',
      accent: '#34d399',
      accentGlow: 'rgba(52, 211, 153, 0.4)',
      badgeBg: 'rgba(16, 185, 129, 0.25)',
    },
    {
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)',
      accent: '#fbbf24',
      accentGlow: 'rgba(251, 191, 36, 0.4)',
      badgeBg: 'rgba(245, 158, 11, 0.25)',
    },
    {
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.4)',
      badgeBg: 'rgba(6, 182, 212, 0.25)',
    },
  ];

  if (isAffiliate) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #facc15 100%)',
        accent: '#facc15',
        accentGlow: 'rgba(250, 204, 21, 0.6)',
        badgeBg: 'rgba(249, 115, 22, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fbbf24 100%)',
        accent: '#fbbf24',
        accentGlow: 'rgba(251, 191, 36, 0.5)',
        badgeBg: 'rgba(236, 72, 153, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #facc15 100%)',
        accent: '#fde047',
        accentGlow: 'rgba(253, 224, 71, 0.5)',
        badgeBg: 'rgba(220, 38, 38, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)',
        accent: '#34d399',
        accentGlow: 'rgba(52, 211, 153, 0.5)',
        badgeBg: 'rgba(16, 185, 129, 0.35)',
      },
    ];
  } else if (styleKey.includes('bright') || styleKey.includes('sunrise') || styleKey.includes('nắng') || styleKey.includes('gold')) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fef08a 100%)',
        accent: '#f59e0b',
        accentGlow: 'rgba(245, 158, 11, 0.6)',
        badgeBg: 'rgba(254, 240, 138, 0.4)',
      },
      {
        gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fef08a 100%)',
        accent: '#f97316',
        accentGlow: 'rgba(249, 115, 22, 0.6)',
        badgeBg: 'rgba(254, 240, 138, 0.4)',
      },
      {
        gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #fef9c3 100%)',
        accent: '#facc15',
        accentGlow: 'rgba(250, 204, 21, 0.6)',
        badgeBg: 'rgba(254, 249, 195, 0.4)',
      },
      {
        gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #bae6fd 100%)',
        accent: '#38bdf8',
        accentGlow: 'rgba(56, 189, 248, 0.6)',
        badgeBg: 'rgba(186, 230, 253, 0.35)',
      },
    ];
  } else if (styleKey.includes('pastel') || styleKey.includes('sakura') || styleKey.includes('hồng')) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fbcfe8 100%)',
        accent: '#fda4af',
        accentGlow: 'rgba(251, 113, 133, 0.6)',
        badgeBg: 'rgba(253, 164, 175, 0.4)',
      },
      {
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fed7aa 100%)',
        accent: '#f472b6',
        accentGlow: 'rgba(244, 114, 182, 0.6)',
        badgeBg: 'rgba(254, 215, 170, 0.4)',
      },
      {
        gradient: 'linear-gradient(135deg, #a855f7 0%, #c084fc 50%, #fbcfe8 100%)',
        accent: '#c084fc',
        accentGlow: 'rgba(192, 132, 252, 0.6)',
        badgeBg: 'rgba(251, 207, 232, 0.4)',
      },
    ];
  } else if (styleKey.includes('ocean') || styleKey.includes('aqua') || styleKey.includes('biển')) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)',
        accent: '#38bdf8',
        accentGlow: 'rgba(14, 165, 233, 0.6)',
        badgeBg: 'rgba(186, 230, 253, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #ccfbf1 100%)',
        accent: '#22d3ee',
        accentGlow: 'rgba(34, 211, 238, 0.6)',
        badgeBg: 'rgba(204, 251, 241, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #99f6e4 100%)',
        accent: '#2dd4bf',
        accentGlow: 'rgba(45, 212, 191, 0.6)',
        badgeBg: 'rgba(153, 246, 228, 0.35)',
      },
    ];
  } else if (styleKey.includes('nature') || styleKey.includes('eco') || styleKey.includes('lá')) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #16a34a 0%, #4ade80 50%, #bbf7d0 100%)',
        accent: '#4ade80',
        accentGlow: 'rgba(74, 222, 128, 0.6)',
        badgeBg: 'rgba(187, 247, 208, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #6ee7b7 100%)',
        accent: '#34d399',
        accentGlow: 'rgba(52, 211, 153, 0.6)',
        badgeBg: 'rgba(110, 231, 183, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #65a30d 0%, #84cc16 50%, #d9f99d 100%)',
        accent: '#a3e635',
        accentGlow: 'rgba(163, 230, 53, 0.6)',
        badgeBg: 'rgba(217, 249, 157, 0.35)',
      },
    ];
  } else if (styleKey.includes('sport') || styleKey.includes('flame') || styleKey.includes('đỏ')) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #facc15 100%)',
        accent: '#facc15',
        accentGlow: 'rgba(250, 204, 21, 0.5)',
        badgeBg: 'rgba(220, 38, 38, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)',
        accent: '#fbbf24',
        accentGlow: 'rgba(249, 115, 22, 0.5)',
        badgeBg: 'rgba(234, 88, 12, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #b91c1c 0%, #e11d48 50%, #f59e0b 100%)',
        accent: '#fde047',
        accentGlow: 'rgba(225, 29, 72, 0.5)',
        badgeBg: 'rgba(185, 28, 28, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)',
        accent: '#38bdf8',
        accentGlow: 'rgba(14, 165, 233, 0.5)',
        badgeBg: 'rgba(2, 132, 199, 0.35)',
      },
    ];
  } else if (styleKey.includes('neon') || styleKey.includes('cyber')) {
    colorThemes = [
      {
        gradient: 'linear-gradient(135deg, #c026d3 0%, #ec4899 50%, #f43f5e 100%)',
        accent: '#f472b6',
        accentGlow: 'rgba(244, 114, 182, 0.5)',
        badgeBg: 'rgba(192, 38, 211, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #06b6d4 100%)',
        accent: '#22d3ee',
        accentGlow: 'rgba(34, 211, 238, 0.5)',
        badgeBg: 'rgba(139, 92, 246, 0.35)',
      },
      {
        gradient: 'linear-gradient(135deg, #84cc16 0%, #22c55e 50%, #06b6d4 100%)',
        accent: '#4ade80',
        accentGlow: 'rgba(74, 222, 128, 0.5)',
        badgeBg: 'rgba(132, 204, 22, 0.35)',
      },
    ];
  }

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

  // Render scenes HTML
  const scenesHtml = project.scenes
    .map((scene, index) => {
      const theme = colorThemes[index % colorThemes.length];
      const words = scene.voiceOver.trim().split(/\s+/).filter(Boolean);
      const chunkSize = 7;
      const chunks: { chunkIdx: number; words: { word: string; globalIdx: number }[] }[] = [];
      let currentChunk: { word: string; globalIdx: number }[] = [];

      words.forEach((w, wIdx) => {
        currentChunk.push({ word: w, globalIdx: wIdx });
        if (currentChunk.length >= chunkSize || wIdx === words.length - 1) {
          chunks.push({ chunkIdx: chunks.length, words: currentChunk });
          currentChunk = [];
        }
      });

      const wordsHtml = chunks
        .map(
          (ch) =>
            `<div id="sub-chunk-${scene.id}-${ch.chunkIdx}" class="sub-chunk" style="${ch.chunkIdx === 0 ? 'display: flex;' : 'display: none;'}">
              ${ch.words
                .map((w) => `<span id="sub-w-${scene.id}-${w.globalIdx}" class="sub-word">${escapeHtml(w.word)}</span>`)
                .join(' ')}
            </div>`
        )
        .join('\n');

      const imageSrc = scene.imageUrl || scene.imagePath || '';
      const isVideoMedia = /\.(mp4|webm|mov|m4v)($|\?)/i.test(imageSrc);
      const isCtaScene = index === project.scenes.length - 1;
      const isDealScene = index === project.scenes.length - 2 || isCtaScene;

      const cleanTitle = (scene.title || '').trim();
      const cleanTag = (scene.tag || '').trim();
      const isTagRedundant = cleanTag.toLowerCase() === cleanTitle.toLowerCase() || cleanTitle.toLowerCase().includes(cleanTag.toLowerCase());

      return `
      <!-- Scene ${scene.id} (Visual-First 3D Camera View) -->
      <div id="scene-${scene.id}" class="scene-container" style="opacity: 0;">
        ${
          imageSrc
            ? isVideoMedia
              ? `<!-- 1. Ambient Background Layer (Muted Video) -->
                 <video id="scene-bg-ambient-${scene.id}" src="${imageSrc}" class="scene-bg-ambient" autoplay muted loop playsinline style="object-fit: cover;"></video>
                 <div class="scene-bg-overlay"></div>

                 <!-- 2. Hero Visual Layer (Muted Review Video, Centered in Viewport) -->
                 <div class="scene-hero-wrapper">
                   <div id="scene-hero-frame-${scene.id}" class="scene-hero-frame">
                     <div id="scene-halo-${scene.id}" class="hero-halo-glow" style="background: radial-gradient(circle, ${theme.accentGlow} 0%, rgba(56, 189, 248, 0.15) 50%, transparent 80%);"></div>
                     <div id="scene-sheen-${scene.id}" class="hero-light-sheen"></div>
                     <video id="scene-img-${scene.id}" src="${imageSrc}" class="scene-hero-img" autoplay muted loop playsinline></video>
                   </div>
                 </div>`
              : `<!-- 1. Ambient Background Layer (Full-Bleed, Blurred, No Black Borders) -->
                 <div id="scene-bg-ambient-${scene.id}" class="scene-bg-ambient" style="background-image: url('${imageSrc}');"></div>
                 <div class="scene-bg-overlay"></div>

                 <!-- 2. Hero Visual Layer (100% Mathematically Centered in Viewport, Uncropped Landmark) -->
                 <div class="scene-hero-wrapper">
                   <div id="scene-hero-frame-${scene.id}" class="scene-hero-frame">
                     <div id="scene-halo-${scene.id}" class="hero-halo-glow" style="background: radial-gradient(circle, ${theme.accentGlow} 0%, rgba(56, 189, 248, 0.15) 50%, transparent 80%);"></div>
                     <div id="scene-sheen-${scene.id}" class="hero-light-sheen"></div>
                     <img id="scene-img-${scene.id}" src="${imageSrc}" class="scene-hero-img" alt="${escapeHtml(cleanTitle)}" />
                   </div>
                 </div>`
            : `<!-- Atmospheric Ambient Fallback -->
               <div id="scene-bg-ambient-${scene.id}" class="scene-bg-ambient" style="background: radial-gradient(circle at 50% 35%, #1e293b 0%, #090d16 100%);"></div>
               <div class="scene-bg-overlay"></div>`
        }

        <!-- Top Floating Minimal Header (Non-Obstructive) -->
        ${
          !project.hideTitle
            ? `<div id="scene-header-${scene.id}" class="top-header-area">
                ${
                  cleanTag && !isTagRedundant
                    ? `<div id="scene-badge-${scene.id}" class="header-badge" style="background: ${theme.badgeBg}; border: 1.5px solid ${theme.accent};">
                         <span style="color: ${theme.accent}; font-weight: 800; font-size: 20px; letter-spacing: 2px;">
                           ${cleanTag.toUpperCase()}
                         </span>
                       </div>`
                    : ''
                }

                <h2 id="scene-card-${scene.id}" class="scene-headline" style="background: ${theme.gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  ${cleanTitle}
                </h2>

                ${
                  scene.metric
                    ? `<div class="metric-pill" style="border: 1.5px solid ${theme.accent}; box-shadow: 0 0 20px ${theme.accentGlow};">
                         <span class="metric-text" style="color: #ffffff;">${scene.metric}</span>
                       </div>`
                    : ''
                }
              </div>`
            : ''
        }

        ${
          isAffiliate && isDealScene
            ? `<!-- Affiliate TikTok Shop Floating Action Pill -->
               <div class="affiliate-deal-box">
                 <span class="affiliate-cart-icon">🛒</span>
                 <span class="affiliate-deal-text">BẤM VÀO GIỎ HÀNG GÓC TRÁI HOẶC LINK DƯỚI BIO</span>
                 <span class="affiliate-deal-badge">FREESHIP</span>
               </div>`
            : ''
        }

        <!-- Subtitles Section (Synced with Voice at Bottom Safe Area) -->
        <div class="subtitles-container">
          <div class="subtitles-box">
            ${wordsHtml}
          </div>
        </div>
      </div>
      `;
    })
    .join('\n');

  // Audio tracks: Master voice track + ambient BGM track
  const audioTracksHtml = `
    <audio id="audio-voice" data-track-index="1" data-volume="1.0" src="voice_master.wav"></audio>
    <audio id="audio-bgm" data-track-index="2" data-volume="0.12" src="bgm.wav"></audio>
  `;

  // GSAP 3D Camera & Flycam animations script
  const gsapTimelineCode = project.scenes
    .map((scene) => {
      const enterStart = scene.startTime;
      const enterDur = transitionEffect === '3d_flycam' ? 0.85 : 0.65;
      const exitStart = Math.max(enterStart + 0.6, scene.startTime + scene.duration - 0.5);
      const exitDur = 0.5;

      const words = scene.voiceOver.trim().split(/\s+/).filter(Boolean);
      // Thời lượng phát âm thực tế từ TTS (nếu có audioDuration)
      const speechDuration = scene.audioDuration && scene.audioDuration > 0
        ? scene.audioDuration
        : Math.min(scene.duration, words.length * 0.32);

      // Tốc độ chuyển chữ highlight khớp chuẩn xác với nhịp đọc tiếng Việt (1 từ ~ 0.22 - 0.28s)
      const wordDur = Math.max(0.12, (speechDuration * 0.95) / Math.max(1, words.length));

      let wordAnimations = '';
      const chunkSize = 7;
      const numChunks = Math.ceil(words.length / chunkSize);

      for (let cIdx = 1; cIdx < numChunks; cIdx++) {
        const chunkStartWordIdx = cIdx * chunkSize;
        const chunkStartTime = enterStart + 0.05 + chunkStartWordIdx * wordDur;
        wordAnimations += `
        tl.set("#sub-chunk-${scene.id}-${cIdx - 1}", { display: "none" }, ${chunkStartTime.toFixed(2)});
        tl.set("#sub-chunk-${scene.id}-${cIdx}", { display: "flex" }, ${chunkStartTime.toFixed(2)});
        `;
      }

      words.forEach((_, wIdx) => {
        // Đồng bộ hoàn hảo: từ đầu tiên sáng ngay khi giọng đọc phát âm (0.05s)
        const wordTime = enterStart + 0.05 + wIdx * wordDur;
        wordAnimations += `
        tl.to("#sub-w-${scene.id}-${wIdx}", { color: "#facc15", scale: 1.12, textShadow: "0 0 16px rgba(250, 204, 21, 0.9)", duration: 0.08 }, ${wordTime.toFixed(2)});
        tl.to("#sub-w-${scene.id}-${wIdx}", { color: "#ffffff", scale: 1.0, textShadow: "none", duration: 0.08 }, ${(wordTime + wordDur).toFixed(2)});
        `;
      });

      let cameraMotionCode = '';

      // Ambient background slow ambient glide (always full-bleed)
      const ambientMotion = `
        tl.fromTo("#scene-bg-ambient-${scene.id}", 
          { scale: 1.06, opacity: 0 }, 
          { scale: 1.14, opacity: 1, duration: 0.6, ease: "power2.out" }, 
          ${enterStart.toFixed(2)}
        );
        tl.to("#scene-bg-ambient-${scene.id}", 
          { scale: 1.24, duration: ${(scene.duration - enterDur).toFixed(2)}, ease: "sine.inOut" }, 
          ${(enterStart + enterDur).toFixed(2)}
        );
        tl.to("#scene-bg-ambient-${scene.id}", 
          { opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );

        // Specular glossy sheen sweep across the hero visual on entry
        tl.fromTo("#scene-sheen-${scene.id}", 
          { left: "-120%" }, 
          { left: "220%", duration: 1.2, ease: "power2.inOut" }, 
          ${(enterStart + 0.1).toFixed(2)}
        );

        // Ambient halo glow behind hero frame
        tl.fromTo("#scene-halo-${scene.id}",
          { opacity: 0, scale: 0.8 },
          { opacity: 0.6, scale: 1.05, duration: 0.7, ease: "power2.out" },
          ${enterStart.toFixed(2)}
        );
        tl.to("#scene-halo-${scene.id}",
          { opacity: 0.32, scale: 0.98, duration: ${(scene.duration * 0.45).toFixed(2)}, yoyo: true, repeat: 1, ease: "sine.inOut" },
          ${(enterStart + 0.7).toFixed(2)}
        );
      `;

      if (transitionEffect === '3d_flycam') {
        // GÓC QUAY FLYCAM 3D LƯỢN TỪ TRÊN KHÔNG XUỐNG
        cameraMotionCode = `
        ${ambientMotion}

        // Hero card swoops in smoothly with 3D elevation
        tl.fromTo("#scene-hero-frame-${scene.id}", 
          { rotateX: 16, rotateY: -8, z: 70, scale: 0.90, opacity: 0, y: 35 }, 
          { rotateX: 0, rotateY: 0, z: 20, scale: 1.0, opacity: 1, y: 0, duration: ${enterDur}, ease: "power3.out" }, 
          ${enterStart.toFixed(2)}
        );

        // Smooth slow cinematic drifting
        tl.to("#scene-hero-frame-${scene.id}", 
          { rotateX: -3, rotateY: 3, z: 35, scale: 1.04, duration: ${(scene.duration - enterDur).toFixed(2)}, ease: "sine.inOut" }, 
          ${(enterStart + enterDur).toFixed(2)}
        );

        // 3D Card headline swoops in
        tl.fromTo("#scene-card-${scene.id}", 
          { rotateX: 20, rotateY: -10, z: -100, y: 50, opacity: 0 }, 
          { rotateX: 0, rotateY: 0, z: 30, y: 0, opacity: 1, duration: 0.75, ease: "back.out(1.3)" }, 
          ${(enterStart + 0.08).toFixed(2)}
        );

        // Floating hover in 3D space
        tl.to("#scene-card-${scene.id}", 
          { z: 55, rotateX: -2, duration: ${(scene.duration * 0.45).toFixed(2)}, yoyo: true, repeat: 1, ease: "sine.inOut" }, 
          ${(enterStart + 0.85).toFixed(2)}
        );

        // Exit flycam swoop away
        tl.to("#scene-hero-frame-${scene.id}", 
          { rotateX: -14, rotateY: 8, scale: 0.92, opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );

        tl.to("#scene-card-${scene.id}", 
          { rotateX: -20, rotateY: 10, z: -160, opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );
        `;
      } else if (transitionEffect === '3d_tilt') {
        // GÓC NGHIÊNG PARALLAX 3D
        cameraMotionCode = `
        ${ambientMotion}

        tl.fromTo("#scene-hero-frame-${scene.id}", 
          { rotateY: 20, z: -50, scale: 0.92, opacity: 0 }, 
          { rotateY: 0, z: 20, scale: 1.0, opacity: 1, duration: ${enterDur}, ease: "power3.out" }, 
          ${enterStart.toFixed(2)}
        );
        tl.to("#scene-hero-frame-${scene.id}", 
          { rotateY: -8, z: 35, scale: 1.04, duration: ${(scene.duration - enterDur).toFixed(2)}, ease: "sine.inOut" }, 
          ${(enterStart + enterDur).toFixed(2)}
        );
        tl.fromTo("#scene-card-${scene.id}", 
          { rotateY: 24, z: -60, opacity: 0 }, 
          { rotateY: 0, z: 35, opacity: 1, duration: 0.7, ease: "back.out(1.3)" }, 
          ${(enterStart + 0.08).toFixed(2)}
        );
        tl.to("#scene-hero-frame-${scene.id}", 
          { rotateY: -18, opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );
        tl.to("#scene-card-${scene.id}", 
          { rotateY: -22, z: -120, opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );
        `;
      } else if (transitionEffect === 'dynamic_whip') {
        // DYNAMIC WHIP XOAY LẬT 3D TIKTOK
        cameraMotionCode = `
        ${ambientMotion}

        tl.fromTo("#scene-card-${scene.id}", 
          { rotateY: 60, scale: 0.8, opacity: 0 }, 
          { rotateY: 0, scale: 1.0, opacity: 1, duration: 0.55, ease: "power3.out" }, 
          ${enterStart.toFixed(2)}
        );
        tl.fromTo("#scene-hero-frame-${scene.id}", 
          { scale: 0.82, rotateZ: 5, opacity: 0 }, 
          { scale: 1.0, rotateZ: 0, opacity: 1, duration: 0.55, ease: "power2.out" }, 
          ${enterStart.toFixed(2)}
        );
        tl.to("#scene-card-${scene.id}", 
          { rotateY: -60, scale: 0.8, opacity: 0, duration: ${exitDur}, ease: "power3.in" }, 
          ${exitStart.toFixed(2)}
        );
        tl.to("#scene-hero-frame-${scene.id}", 
          { scale: 0.82, rotateZ: -5, opacity: 0, duration: ${exitDur}, ease: "power3.in" }, 
          ${exitStart.toFixed(2)}
        );
        `;
      } else {
        // CINEMATIC SMOOTH ZOOM
        cameraMotionCode = `
        ${ambientMotion}

        tl.fromTo("#scene-hero-frame-${scene.id}", 
          { scale: 0.92, y: 25, opacity: 0 }, 
          { scale: 1.0, y: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, 
          ${enterStart.toFixed(2)}
        );
        tl.to("#scene-hero-frame-${scene.id}", 
          { scale: 1.06, y: -10, duration: ${(scene.duration - enterDur).toFixed(2)}, ease: "sine.inOut" }, 
          ${(enterStart + enterDur).toFixed(2)}
        );
        tl.fromTo("#scene-card-${scene.id}", 
          { y: 35, opacity: 0, scale: 0.96 }, 
          { y: 0, opacity: 1, scale: 1.0, duration: 0.6, ease: "power3.out" }, 
          ${(enterStart + 0.05).toFixed(2)}
        );
        tl.to("#scene-hero-frame-${scene.id}", 
          { scale: 1.09, opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );
        tl.to("#scene-card-${scene.id}", 
          { opacity: 0, y: -25, scale: 0.96, duration: ${exitDur}, ease: "power2.in" }, 
          ${exitStart.toFixed(2)}
        );
        `;
      }

      return `
      // --- 3D Animation for Scene ${scene.id} ---
      tl.fromTo("#scene-${scene.id}", 
        { opacity: 0 }, 
        { opacity: 1, duration: ${enterDur}, ease: "power2.out" }, 
        ${enterStart.toFixed(2)}
      );

      tl.fromTo("#scene-badge-${scene.id}", 
        { y: -35, opacity: 0, scale: 0.8 }, 
        { y: 0, opacity: 1, scale: 1.0, duration: 0.5, ease: "back.out(1.7)" }, 
        ${enterStart.toFixed(2)}
      );

      ${cameraMotionCode}

      ${wordAnimations}

      // Exit scene container
      tl.to("#scene-${scene.id}", 
        { opacity: 0, duration: ${exitDur}, ease: "power2.in" }, 
        ${exitStart.toFixed(2)}
      );
      `;
    })
    .join('\n');

  return `<!doctype html>
<html lang="vi" data-resolution="portrait">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${project.width || 1080}, height=${project.height || 1920}" />
  <title>${project.title}</title>
  <!-- GSAP Animation Library (Offline Bundled) -->
  <script>
    ${getBundledGsap() || '/* fallback cdn */'}
  </script>
  ${!getBundledGsap() ? '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>' : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }

    html, body {
      margin: 0;
      width: ${project.width || 1080}px;
      height: ${project.height || 1920}px;
      overflow: hidden;
      background: #08090d;
      font-family: 'Be Vietnam Pro', 'Inter', ${selectedFont.cssFamily}, sans-serif;
      color: #ffffff;
      perspective: 1200px;
      perspective-origin: 50% 45%;
      text-rendering: optimizeLegibility;
    }

    #root {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: radial-gradient(circle at 50% 20%, #151928 0%, #08090d 80%);
      transform-style: preserve-3d;
    }

    /* 1. Ambient Background Layer: Full-bleed, edge-to-edge dreamy glow with no black borders */
    .scene-bg-ambient {
      position: absolute;
      top: -25%;
      left: -25%;
      width: 150%;
      height: 150%;
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      filter: blur(55px) brightness(0.40) saturate(1.35);
      z-index: 1;
      transform-origin: center center;
      will-change: transform;
    }

    .scene-bg-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, rgba(6, 8, 14, 0.72) 0%, rgba(6, 8, 14, 0.08) 22%, rgba(6, 8, 14, 0.12) 68%, rgba(6, 8, 14, 0.90) 100%);
      z-index: 2;
      pointer-events: none;
    }

    /* 2. Hero Visual Layer: 100% Mathematically Centered in Viewport */
    .scene-hero-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 4;
      pointer-events: none;
    }

    .scene-hero-frame {
      position: relative;
      max-width: 960px;
      max-height: 960px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 40px 90px rgba(0, 0, 0, 0.85), 0 0 0 2px rgba(255, 255, 255, 0.18);
      background: rgba(12, 16, 26, 0.65);
      transform-origin: center center;
      transform-style: preserve-3d;
      will-change: transform, opacity;
      pointer-events: none;
    }

    .scene-hero-img {
      display: block;
      max-width: 960px;
      max-height: 960px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 28px;
      will-change: transform;
    }

    /* Specular Light Sheen */
    .hero-light-sheen {
      position: absolute;
      top: -60%;
      left: -120%;
      width: 50%;
      height: 220%;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.22) 50%, transparent 100%);
      transform: rotate(25deg);
      pointer-events: none;
      z-index: 6;
    }

    /* Ambient Halo Glow */
    .hero-halo-glow {
      position: absolute;
      inset: -25px;
      border-radius: 36px;
      filter: blur(35px);
      opacity: 0.45;
      z-index: -1;
      pointer-events: none;
    }

    #progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 0%;
      height: 8px;
      background: linear-gradient(90deg, #38bdf8 0%, #a855f7 50%, #ec4899 100%);
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
      z-index: 99;
    }

    .scene-container {
      position: absolute;
      inset: 0;
      width: 1080px;
      height: 1920px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 130px 40px 150px 40px;
      z-index: 10;
      transform-style: preserve-3d;
      will-change: transform, opacity;
    }

    .top-header-area {
      width: 1000px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      z-index: 15;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 24px;
      border-radius: 999px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      margin-bottom: 12px;
      text-align: center;
    }

    .scene-headline {
      font-size: 44px;
      font-weight: 900;
      line-height: 1.25;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      font-family: ${selectedFont.cssFamily};
      filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.9));
      padding: 4px 14px;
      margin-bottom: 10px;
      max-width: 920px;
    }

    .metric-pill {
      display: inline-block;
      padding: 6px 22px;
      background: rgba(10, 15, 26, 0.75);
      border-radius: 999px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      margin-bottom: 10px;
    }

    .metric-text {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      font-family: ${selectedFont.cssFamily};
    }

    .affiliate-deal-box {
      margin-top: 30px;
      width: 880px;
      padding: 14px 22px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(249, 115, 22, 0.35) 100%);
      border: 2px solid #f97316;
      border-radius: 20px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 0 30px rgba(249, 115, 22, 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: pulseGlow 1.8s infinite alternate ease-in-out;
      z-index: 25;
    }

    @keyframes pulseGlow {
      from {
        box-shadow: 0 0 15px rgba(249, 115, 22, 0.3);
      }
      to {
        box-shadow: 0 0 40px rgba(250, 204, 21, 0.65);
      }
    }

    .affiliate-cart-icon {
      font-size: 32px;
    }

    .affiliate-deal-text {
      font-size: 24px;
      font-weight: 800;
      color: #fef08a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: ${selectedFont.cssFamily};
    }

    .affiliate-deal-badge {
      background: #facc15;
      color: #000000;
      font-size: 20px;
      font-weight: 900;
      padding: 4px 12px;
      border-radius: 10px;
      letter-spacing: 1px;
    }

    .subtitles-container {
      position: absolute;
      bottom: 140px;
      left: 40px;
      right: 40px;
      display: flex;
      justify-content: center;
      z-index: 40;
    }

    .subtitles-box {
      background: rgba(5, 7, 12, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 20px;
      padding: 16px 28px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.75);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 10px 12px;
      max-width: 920px;
      text-align: center;
    }

    .sub-chunk {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 10px 12px;
      width: 100%;
    }

    .sub-word {
      font-size: 32px;
      font-weight: 800;
      color: #f1f5f9;
      line-height: 1.4;
      display: inline-block;
      letter-spacing: 0.2px;
      font-family: 'Be Vietnam Pro', 'Inter', ${selectedFont.cssFamily}, sans-serif;
      word-break: keep-all;
      overflow-wrap: break-word;
      text-rendering: optimizeLegibility;
      transition: color 0.08s ease, transform 0.08s ease;
    }
  </style>
</head>
<body>
  <div
    id="root"
    data-composition-id="main"
    data-start="0"
    data-duration="${project.totalDuration}"
    data-width="${project.width}"
    data-height="${project.height}"
  >
    <!-- Audio tracks -->
    ${audioTracksHtml}

    <!-- Top Progress Bar -->
    <div id="progress-bar"></div>

    <!-- Scenes with 3D Camera / Flycam Views -->
    ${scenesHtml}
  </div>

  <script>
    const tl = gsap.timeline({ paused: true });

    // Progress Bar Animation
    tl.to("#progress-bar", { width: "100%", duration: ${project.totalDuration}, ease: "none" }, 0);

    ${gsapTimelineCode}

    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = tl;
    tl.seek(0);
  </script>
</body>
</html>
`;
}
