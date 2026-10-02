'use client';

import React, { useState, useMemo } from 'react';
import { VideoItem, api } from '../lib/api';
import {
  Film,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Sliders,
  Copy,
  Check,
  X,
  Search,
  LayoutGrid,
  List,
  Download,
  Eye,
  MoreVertical,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface MyVideosGridProps {
  videos: VideoItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectVideo: (videoId: string) => void;
  onCreateNew: () => void;
}

export function MyVideosGrid({
  videos,
  isLoading,
  onRefresh,
  onSelectVideo,
  onCreateNew,
}: MyVideosGridProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [paramsModalVideo, setParamsModalVideo] = useState<VideoItem | null>(null);
  const [copied, setCopied] = useState(false);

  const completedCount = videos.filter((v) => v.status === 'completed').length;
  const processingCount = videos.filter(
    (v) => v.status !== 'completed' && v.status !== 'failed'
  ).length;
  const failedCount = videos.filter((v) => v.status === 'failed').length;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xoá video này?')) return;
    setDeletingId(id);
    try {
      await api.deleteVideo(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xoá video');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenParams = (e: React.MouseEvent, video: VideoItem) => {
    e.stopPropagation();
    setParamsModalVideo(video);
  };

  const handleCopyParams = (video: VideoItem) => {
    const info = [
      `[THÔNG SỐ VIDEO AI - ID: ${video.id}]`,
      `• Ý tưởng / Prompt: ${video.prompt || 'Không có'}`,
      video.url ? `• Link nguồn: ${video.url}` : null,
      `• Thời lượng: ${video.duration}s`,
      `• Tỷ lệ: ${video.aspect_ratio}`,
      `• Giọng đọc: ${video.voice}`,
      `• Phong cách: ${video.style}`,
      `• Phông chữ: ${video.font_family || 'Montserrat'}`,
      `• Chuyển cảnh: ${video.transition_effect || '3d_flycam'}`,
      `• Phong cách ảnh: ${video.visual_style || 'realistic'}`,
      `• Động cơ: ${video.engine || 'HyperFrames'}`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredVideos = useMemo(() => {
    let result = videos.filter((v) => {
      if (filter === 'completed') return v.status === 'completed';
      if (filter === 'failed') return v.status === 'failed';
      if (filter === 'processing') return v.status !== 'completed' && v.status !== 'failed';
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          (v.title && v.title.toLowerCase().includes(q)) ||
          (v.prompt && v.prompt.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'duration') {
        return (b.duration || 0) - (a.duration || 0);
      }
      return 0;
    });
  }, [videos, filter, searchQuery, sortBy]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#12B76A] border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 backdrop-blur-md shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-[#12B76A] dark:text-emerald-400" />
            <span>Hoàn thành</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#E5484D] border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 backdrop-blur-md shadow-sm">
            <AlertCircle className="w-3 h-3 text-[#E5484D] dark:text-rose-400" />
            <span>Thất bại</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-[#6D4AFF] border border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 backdrop-blur-md shadow-sm">
            <Loader2 className="w-3 h-3 animate-spin text-[#6D4AFF] dark:text-violet-400" />
            <span>Đang tạo</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header matching Mockup Top Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-[#6D4AFF] dark:text-violet-400" />
            <span>Video của tôi ({videos.length})</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-1">
            Quản lý, xem lại và tải xuống tất cả video của bạn.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="mockup-gradient-btn px-5 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-violet-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo video mới</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Media Library Toolbar matching Mockup */}
      <div className="studio-card p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border border-[#DDE3EE] dark:border-white/10">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8A94A6] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm video theo tiêu đề, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm studio-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A94A6] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills, Sort & View Switches */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Capsule Pills */}
          <div className="p-1 rounded-2xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10 flex text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'all'
                  ? 'bg-[#6D4AFF] text-white font-semibold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Tất cả ({videos.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'completed'
                  ? 'bg-[#6D4AFF] text-white font-semibold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Hoàn thành ({completedCount})
            </button>
            <button
              onClick={() => setFilter('processing')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'processing'
                  ? 'bg-[#6D4AFF] text-white font-semibold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Đang tạo ({processingCount})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'failed'
                  ? 'bg-[#6D4AFF] text-white font-semibold shadow-sm'
                  : 'text-[#667085] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Lỗi ({failedCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="pl-3 pr-7 py-2 text-xs font-semibold studio-input cursor-pointer"
            >
              <option value="newest">Mới nhất ⌄</option>
              <option value="oldest">Cũ nhất</option>
              <option value="duration">Thời lượng</option>
            </select>
          </div>

          {/* Grid / List Switch */}
          <div className="p-1 rounded-2xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10 hidden sm:flex text-[#667085] dark:text-slate-400">
            <button
              onClick={() => setViewMode('grid')}
              title="Dạng lưới"
              className={`p-2 rounded-xl transition-colors ${
                viewMode === 'grid' ? 'bg-[#6D4AFF] text-white shadow-sm' : 'hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Dạng danh sách"
              className={`p-2 rounded-xl transition-colors ${
                viewMode === 'list' ? 'bg-[#6D4AFF] text-white shadow-sm' : 'hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content matching Mockup 4 Columns */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#667085] dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D4AFF] dark:text-violet-500 mb-3" />
          <p className="text-sm">Đang tải danh sách video...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="studio-card p-12 text-center space-y-3 border border-[#DDE3EE] dark:border-white/10">
          <div className="w-12 h-12 rounded-2xl studio-elevated mx-auto flex items-center justify-center text-[#8A94A6] dark:text-slate-500">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Không tìm thấy video nào</h3>
          <p className="text-xs text-[#667085] dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Không có kết quả khớp với từ khoá tìm kiếm của bạn.'
              : 'Bạn chưa tạo video nào ở trạng thái này.'}
          </p>
          <div className="pt-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="studio-btn-secondary px-4 py-2 text-xs"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            ) : (
              <button
                onClick={onCreateNew}
                className="mockup-gradient-btn px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tạo video ngay
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredVideos.map((video) => {
            const durationDisplay = video.duration
              ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
              : '1:00';

            return (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video.id)}
                className="studio-card-interactive overflow-hidden cursor-pointer flex flex-col group relative border border-[#DDE3EE] dark:border-white/10"
              >
                {/* Thumbnail Container matching Mockup */}
                <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-[#DDE3EE] dark:border-white/10">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title || 'Thumbnail'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : video.output_url ? (
                    <video
                      src={video.output_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      playsInline
                    />
                  ) : (
                    <Film className="w-8 h-8 text-slate-600" />
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-75" />

                  {/* Top-Left Status Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    {getStatusBadge(video.status)}
                  </div>

                  {/* Bottom-Right Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-black/80 text-white font-mono backdrop-blur-sm">
                    {durationDisplay}
                  </div>
                </div>

                {/* Card Meta Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#6D4AFF] dark:group-hover:text-violet-400 transition-colors">
                      {video.title || video.prompt}
                    </h3>
                    <p className="text-[11px] text-[#667085] dark:text-slate-400 font-mono mt-1">
                      {video.created_at ? new Date(video.created_at).toLocaleDateString('vi-VN') : '1/10/2026'} • {video.duration || 60}s • {video.aspect_ratio || '9:16'}
                    </p>
                  </div>

                  {/* Action Buttons Bar matching Mockup: [ ▶ ] [ 👁 ] [ ⬇ ] [ ⋮ ] */}
                  <div className="pt-2 border-t border-[#DDE3EE] dark:border-white/10 flex items-center justify-between gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVideo(video.id);
                      }}
                      className="w-8 h-8 rounded-xl bg-[#6D4AFF] hover:bg-[#5B3FE3] text-white flex items-center justify-center shadow-md shadow-violet-600/25 transition-transform active:scale-95 cursor-pointer"
                      title="Xem video"
                    >
                      <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                    </button>

                    <button
                      onClick={(e) => handleOpenParams(e, video)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800/80 border border-[#DDE3EE] dark:border-slate-700 hover:border-[#B9C3D6] text-[#667085] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Xem thông số kỹ thuật"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>

                    {video.output_url ? (
                      <a
                        href={video.output_url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800/80 border border-[#DDE3EE] dark:border-slate-700 hover:border-[#B9C3D6] text-[#667085] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Tải video xuống máy"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800/80 border border-[#DDE3EE] dark:border-slate-700 opacity-40 flex items-center justify-center">
                        <Download className="w-3.5 h-3.5 text-[#8A94A6] dark:text-slate-500" />
                      </div>
                    )}

                    <button
                      onClick={(e) => handleDelete(e, video.id)}
                      disabled={deletingId === video.id}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800/80 border border-[#DDE3EE] dark:border-slate-700 hover:border-rose-300 text-[#667085] hover:text-[#E5484D] dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xoá video"
                    >
                      {deletingId === video.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="studio-card divide-y border border-[#DDE3EE] dark:border-white/10 divide-[#DDE3EE] dark:divide-white/10 overflow-hidden">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => onSelectVideo(video.id)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-[#F9FAFC] dark:hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center relative border border-[#DDE3EE] dark:border-white/10">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title || 'Thumbnail'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-[#6D4AFF] dark:hover:text-violet-400 transition-colors">
                    {video.title || video.prompt}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#667085] dark:text-slate-400 mt-0.5 font-mono">
                    <span>{video.aspect_ratio || '9:16'}</span>
                    <span>•</span>
                    <span>{video.duration || 60}s</span>
                    <span>•</span>
                    <span>
                      {video.created_at
                        ? new Date(video.created_at).toLocaleDateString('vi-VN')
                        : '1/10/2026'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {getStatusBadge(video.status)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVideo(video.id);
                  }}
                  className="w-8 h-8 rounded-xl bg-[#6D4AFF] text-white flex items-center justify-center shadow-sm"
                  title="Xem video"
                >
                  <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                </button>
                <button
                  onClick={(e) => handleOpenParams(e, video)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800/80 border border-[#DDE3EE] dark:border-slate-700 text-[#667085] dark:text-slate-300 flex items-center justify-center hover:border-[#B9C3D6]"
                  title="Thông số"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, video.id)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800/80 border border-[#DDE3EE] dark:border-slate-700 hover:border-rose-300 text-[#667085] hover:text-[#E5484D] dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center"
                  title="Xoá video"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parameters Modal */}
      {paramsModalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="studio-card w-full max-w-lg p-6 shadow-2xl relative space-y-4 border border-[#DDE3EE] dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE3EE] dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#6D4AFF] dark:text-violet-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Thông số video đã chọn</h3>
              </div>
              <button
                onClick={() => setParamsModalVideo(null)}
                className="p-1 rounded-lg text-[#8A94A6] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10 space-y-1">
                <span className="text-[#667085] dark:text-slate-400 font-medium">Ý tưởng / Prompt:</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{paramsModalVideo.prompt}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10">
                  <span className="text-[#667085] dark:text-slate-400">Thời lượng:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{paramsModalVideo.duration}s</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10">
                  <span className="text-[#667085] dark:text-slate-400">Tỷ lệ khung hình:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{paramsModalVideo.aspect_ratio || '9:16'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10">
                  <span className="text-[#667085] dark:text-slate-400">Giọng đọc:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">{paramsModalVideo.voice}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10">
                  <span className="text-[#667085] dark:text-slate-400">Động cơ render:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{paramsModalVideo.engine || 'HyperFrames'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDE3EE] dark:border-white/10">
              <button
                onClick={() => handleCopyParams(paramsModalVideo)}
                className="studio-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#12B76A]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép thông số'}
              </button>
              <button
                onClick={() => setParamsModalVideo(null)}
                className="mockup-gradient-btn px-4 py-2 text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
