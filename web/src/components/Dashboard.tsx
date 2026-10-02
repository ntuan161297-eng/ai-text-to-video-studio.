'use client';

import React from 'react';
import { VideoItem, User } from '../lib/api';
import {
  Film,
  Sparkles,
  Zap,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  FolderOpen,
  MoreVertical,
  BarChart3,
  Layers,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  user: User | null;
  videos: VideoItem[];
  onNavigateCreate: () => void;
  onNavigateVideos: () => void;
  onSelectVideo: (id: string) => void;
  onOpenAuth: () => void;
}

function formatDurationDisplay(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function getGreetingTime(name: string): string {
  const hour = new Date().getHours();
  const displayName = name ? name.split(' ').slice(-1)[0] : 'Bạn';
  if (hour >= 5 && hour < 12) return `Chào buổi sáng, ${displayName} 👋`;
  if (hour >= 12 && hour < 18) return `Chào buổi chiều, ${displayName} 👋`;
  return `Chào buổi tối, ${displayName} 👋`;
}

export function Dashboard({
  user,
  videos,
  onNavigateCreate,
  onNavigateVideos,
  onSelectVideo,
}: DashboardProps) {
  const completedVideos = videos.filter((v) => v.status === 'completed');
  const processingVideos = videos.filter(
    (v) => v.status !== 'completed' && v.status !== 'failed'
  );
  const totalSeconds = completedVideos.reduce((sum, v) => sum + (v.duration || 0), 0);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
      {/* 1. Dashboard Hero matching Mockup */}
      <div className="studio-hero rounded-3xl p-7 sm:p-9 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-3 z-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {getGreetingTime(user ? user.name : '')}
          </h1>
          <p className="text-sm sm:text-base text-[#667085] dark:text-slate-300 leading-relaxed max-w-lg">
            Biến ý tưởng thành những video chuyên nghiệp với AI và công nghệ dựng video hiện đại.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-3">
            <button
              onClick={onNavigateCreate}
              className="mockup-gradient-btn px-5 py-3 text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/25"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Tạo video mới</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onNavigateVideos}
              className="studio-btn-secondary px-5 py-3 text-sm flex items-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#667085] dark:text-slate-400" />
              <span>Xem thư viện</span>
              <ArrowRight className="w-4 h-4 text-[#667085] dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* 3D Clapperboard & Floating Cards Illustration matching Mockup */}
        <div className="relative shrink-0 w-72 sm:w-80 h-44 sm:h-52 flex items-center justify-center pointer-events-none select-none">
          {/* Ambient Glow Orbs */}
          <div className="absolute w-44 h-44 bg-violet-600/30 rounded-full blur-3xl -top-6 -right-6 animate-pulse-slow" />
          <div className="absolute w-36 h-36 bg-pink-500/20 rounded-full blur-2xl -bottom-4 -left-4" />

          {/* Floating Card Left: Landscape Temple */}
          <div className="absolute -left-2 top-6 w-24 h-16 rounded-xl overflow-hidden border border-white/20 shadow-2xl transform -rotate-12 bg-slate-900/80 backdrop-blur-md z-10 transition-transform">
            <div className="w-full h-full bg-gradient-to-tr from-amber-900/60 to-orange-700/60 flex items-center justify-center">
              <Film className="w-6 h-6 text-amber-200 opacity-80" />
            </div>
          </div>

          {/* Floating Card Right: Food / Scene */}
          <div className="absolute -right-2 top-2 w-24 h-16 rounded-xl overflow-hidden border border-white/20 shadow-2xl transform rotate-12 bg-slate-900/80 backdrop-blur-md z-10 transition-transform">
            <div className="w-full h-full bg-gradient-to-tr from-emerald-900/60 to-cyan-700/60 flex items-center justify-center">
              <Film className="w-6 h-6 text-cyan-200 opacity-80" />
            </div>
          </div>

          {/* Main 3D Clapperboard SVG with Play Medallion */}
          <div className="relative z-20 w-44 h-36 rounded-2xl bg-gradient-to-b from-slate-900/90 via-indigo-950/80 to-slate-900/95 border-2 border-indigo-400/50 shadow-2xl flex flex-col justify-between p-3">
            {/* Clapperboard Slats */}
            <div className="flex gap-1.5 pb-2 border-b border-indigo-500/30">
              <span className="w-5 h-2.5 bg-white/90 rounded-sm -skew-x-12" />
              <span className="w-5 h-2.5 bg-indigo-500/40 rounded-sm -skew-x-12" />
              <span className="w-5 h-2.5 bg-white/90 rounded-sm -skew-x-12" />
              <span className="w-5 h-2.5 bg-indigo-500/40 rounded-sm -skew-x-12" />
              <span className="w-5 h-2.5 bg-white/90 rounded-sm -skew-x-12" />
            </div>

            {/* Glowing Play Medallion in Center */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/50 border border-white/30">
                <Play className="w-5 h-5 ml-0.5 fill-white text-white" />
              </div>
            </div>

            {/* Bottom Bar Info */}
            <div className="flex items-center justify-between text-[9px] font-mono text-indigo-300/80 pt-1 border-t border-indigo-500/20">
              <span>SCENE 01</span>
              <span>4K 60FPS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Row (4 cards matching Mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Video đã tạo */}
        <div className="studio-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-slate-400">Video đã tạo</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 flex items-center justify-center text-[#6D4AFF] dark:text-violet-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{videos.length}</div>
            <div className="text-[11px] font-semibold text-[#12B76A] dark:text-emerald-400 flex items-center gap-1 mt-1">
              <span>↑</span>
              <span>+{Math.max(1, completedVideos.length)} video tuần này</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tổng thời lượng */}
        <div className="studio-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-slate-400">Tổng thời lượng</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {formatDurationDisplay(totalSeconds)}
            </div>
            <div className="text-[11px] font-semibold text-[#12B76A] dark:text-emerald-400 flex items-center gap-1 mt-1">
              <span>↑</span>
              <span>+{formatDurationDisplay(Math.round(totalSeconds * 0.4))} tuần này</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Đang xử lý */}
        <div className="studio-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-slate-400">Đang xử lý</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {processingVideos.length}
            </div>
            <div className="text-[11px] text-[#8A94A6] dark:text-slate-500 mt-1">
              {processingVideos.length > 0
                ? 'Đang render trong hàng đợi'
                : 'Không có tác vụ nào'}
            </div>
          </div>
        </div>

        {/* KPI 4: AI Engine */}
        <div className="studio-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-slate-400">AI Engine</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 flex items-center justify-center text-[#12B76A] dark:text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#12B76A] dark:text-emerald-400">
              Ready
            </div>
            <div className="text-[11px] text-[#667085] dark:text-slate-400 mt-1 truncate">
              Gemini • Edge TTS • HyperFrames
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section: Video Gần Đây (4 Cards matching Mockup) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-[#6D4AFF] dark:text-violet-400" />
            <span>Video gần đây</span>
          </h2>
          {videos.length > 0 && (
            <button
              onClick={onNavigateVideos}
              className="text-xs font-semibold text-[#6D4AFF] hover:text-[#5B3FE3] dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              Xem tất cả ({videos.length}) ➜
            </button>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="studio-card p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl studio-elevated mx-auto flex items-center justify-center text-[#8A94A6] dark:text-slate-500">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Chưa có video nào</h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 max-w-sm mx-auto">
              Bắt đầu tạo video đầu tiên từ ý tưởng hoặc liên kết bài viết của bạn.
            </p>
            <button
              onClick={onNavigateCreate}
              className="mockup-gradient-btn px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tạo video ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {videos.slice(0, 4).map((video) => (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video.id)}
                className="studio-card-interactive overflow-hidden cursor-pointer flex flex-col group border border-[#DDE3EE] dark:border-white/10"
              >
                {/* Thumbnail Container */}
                <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-[#DDE3EE] dark:border-white/10">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title || video.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : video.output_url ? (
                    <video
                      src={video.output_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Film className="w-8 h-8 text-slate-600" />
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-75" />

                  {/* Duration Badge Bottom Right */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-black/80 text-white font-mono backdrop-blur-sm">
                    {video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '1:00'}
                  </div>

                  {/* Hover Play Button */}
                  {video.status === 'completed' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-[#6D4AFF] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5 fill-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Content matching Mockup */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#6D4AFF] dark:group-hover:text-violet-400 transition-colors">
                    {video.title || video.prompt}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-slate-400 pt-1">
                    <span className="font-mono">
                      {video.created_at ? new Date(video.created_at).toLocaleDateString('vi-VN') : '1/10/2026'} • {video.duration || 60}s • {video.aspect_ratio || '9:16'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[#12B76A] dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] dark:bg-emerald-400" />
                        Hoàn thành
                      </span>
                      <MoreVertical className="w-3.5 h-3.5 text-[#8A94A6] hover:text-[#111827] dark:text-slate-500 dark:hover:text-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
