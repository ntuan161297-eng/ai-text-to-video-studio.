'use client';

import React, { useState } from 'react';
import { VideoStatusResponse, api } from '../lib/api';
import {
  Download,
  PlusCircle,
  CheckCircle,
  X,
  Sparkles,
  ShoppingBag,
  Copy,
  Check,
  ExternalLink,
  Film,
  Sliders,
  Clock,
  Layers,
  Mic,
  Palette,
  Type,
  Video,
  Cpu,
  Leaf,
  Image as ImageIcon,
} from 'lucide-react';

interface VideoResultModalProps {
  video: VideoStatusResponse;
  onClose: () => void;
  onCreateAnother: () => void;
  onReviseVideo?: (feedback: string, scope?: string) => Promise<void> | void;
}

function cleanTitle(raw?: string | null): string {
  if (!raw) return 'Khám Phá Đặc Sản Đất Việt';
  let t = raw.trim();
  t = t.replace(/^Tạo video\s*\d*s?:\s*/i, '');
  t = t.replace(/^Video\s*\d*s?:\s*/i, '');
  t = t.replace(/^Tạo video giới thiệu:\s*/i, '');
  t = t.replace(/^Giới thiệu\s*(về)?:\s*/i, '');
  t = t.replace(/\[Chi tiết từ bài viết[^\]]*\][\s\S]*$/gi, '');
  t = t.replace(/ContentsCó liên quan[\s\S]*$/gi, '');
  t = t.split('\n')[0].trim();
  t = t.replace(/[,;–\-\.\:\s]+$/, '').trim();
  return t || 'Khám Phá Đặc Sản Đất Việt';
}

function buildCleanCaption(v: VideoStatusResponse): string {
  if (v.tiktokCaption && !v.tiktokCaption.includes('Tạo video 60s:') && !v.tiktokCaption.includes('Tạo video:')) {
    return v.tiktokCaption;
  }

  const cleanT = cleanTitle(v.title || v.prompt);
  let domain = '';
  if (v.url) {
    try {
      domain = new URL(v.url).hostname.replace(/^www\./, '');
    } catch {}
  }
  const sourcePart = v.url
    ? `\n📖 Nguồn thông tin tham khảo từ ${domain || 'bài viết'}:\n🔗 ${v.url}`
    : '';

  return `🥢 [TINH HOA ĐẶC SẢN] ${cleanT.toUpperCase()} 🥢\n🔥 Món ngon trứ danh với hương vị đậm đà khó cưỡng, mang đậm bản sắc văn hóa truyền thống!\n\n✨ Điểm đặc sắc khiến bạn không thể bỏ lỡ:\n🍲 Hương vị chuẩn vị, giòn ngon đậm nét đặc sản truyền thống.\n🌿 Nguyên liệu tươi ngon, được chọn lọc và chế biến thủ công tỉ mỉ.\n\n👉 Bạn đã từng thưởng thức món này bao giờ chưa? Để lại cảm nhận của bạn dưới phần bình luận nhé!\n❤️ Thả tim và Follow kênh để cùng mình khám phá trọn vẹn tinh hoa ẩm thực 3 miền!${sourcePart}\n\n#xuhuong #fyp #viral #trending #amthuc #dacsan #foodreview #monngonmoingay #amthucvietnam`;
}

export function VideoResultModal({
  video,
  onClose,
  onCreateAnother,
  onReviseVideo,
}: VideoResultModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'caption' | 'params' | 'revise'>('preview');
  const [copied, setCopied] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState<string>(() => buildCleanCaption(video));
  const [feedbackText, setFeedbackText] = useState('');
  const [isAnalyzingFeedback, setIsAnalyzingFeedback] = useState(false);
  const [feedbackAnalysis, setFeedbackAnalysis] = useState<any>(null);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  React.useEffect(() => {
    setCaptionDraft(buildCleanCaption(video));
  }, [video]);

  const is916 = video.aspectRatio === '9:16' || !video.aspectRatio;
  const is169 = video.aspectRatio === '16:9';

  const handleCopyParams = () => {
    const info = [
      `[THÔNG SỐ VIDEO AI - ID: ${video.id}]`,
      video.title ? `• Tiêu đề: ${video.title}` : null,
      `• Ý tưởng / Prompt: ${video.prompt || 'Không có'}`,
      video.url ? `• Link nguồn: ${video.url}` : null,
      `• Thời lượng: ${video.duration || 45}s`,
      `• Tỷ lệ: ${video.aspectRatio || '9:16'}`,
      `• Giọng đọc: ${video.voice || 'vi-VN-NamMinhNeural'}`,
      `• Phong cách: ${video.style || 'Sports / Crimson Flame'}`,
      `• Phông chữ: ${video.fontFamily || 'Montserrat'}`,
      `• Chuyển cảnh: ${video.transitionEffect || '3d_flycam'}`,
      `• Phong cách ảnh: ${video.visualStyle || 'realistic'}`,
      `• Động cơ: ${video.engine || 'hyperframes'}`,
      `• Chế độ Eco: ${video.ecoMode !== false ? 'Bật (Tiết kiệm RAM/CPU)' : 'Tắt'}`,
      video.isAffiliate ? `• Chế độ Affiliate: Có` : null,
      video.productData ? `• Sản phẩm: ${video.productData.name} - Giá: ${video.productData.price}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVisualStyleLabel = (vs?: string) => {
    switch (vs) {
      case 'animation':
        return '🎨 Hoạt Hình 3D Pixar';
      case 'bright':
        return '☀️ Phong Cảnh Tươi Sáng';
      case 'ecommerce':
        return '🛍️ Sản Phẩm & Affiliate';
      case 'realistic':
      default:
        return '📸 Báo Chí & Đời Thực';
    }
  };

  const getTransitionLabel = (eff?: string) => {
    switch (eff) {
      case '3d_flycam':
        return '🛸 Flycam 3D Drone';
      case '3d_tilt':
        return '📐 3D Parallax Tilt';
      case 'cinematic_zoom':
        return '🔍 Zoom Điện Ảnh';
      case 'dynamic_whip':
        return '⚡ Lướt Cảnh Siêu Tốc';
      default:
        return '🛸 Flycam 3D Drone';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="studio-card relative w-full max-w-2xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 mb-3 pr-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                {cleanTitle(video.title || video.prompt)}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Đã xuất video hoàn chỉnh chuẩn tỷ lệ {video.aspectRatio || '9:16'} ({video.duration || 45}s)
              </p>
            </div>
          </div>
        </div>

        {/* Tabs: Xem Video, Caption TikTok, Thông Số, Góp Ý */}
        <div className="flex items-center gap-1 p-1 rounded-xl studio-elevated studio-border border text-xs mb-3 font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'preview'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Xem Video
          </button>
          <button
            onClick={() => setActiveTab('caption')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'caption'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            Caption TikTok
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'params'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Thông Số
          </button>
          <button
            onClick={() => setActiveTab('revise')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'revise'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Góp Ý
          </button>
        </div>

        {/* Tab 1: Video Player Container */}
        {activeTab === 'preview' && (
          <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-950/80 rounded-2xl border border-slate-800 p-2 sm:p-4 overflow-hidden">
            {video.outputUrl ? (
              <div
                className={`relative mx-auto rounded-xl overflow-hidden shadow-2xl bg-black ${
                  is916
                    ? 'max-h-[50vh] aspect-[9/16]'
                    : is169
                    ? 'w-full aspect-[16/9]'
                    : 'max-h-[48vh] aspect-square'
                }`}
              >
                <video
                  controls
                  autoPlay
                  playsInline
                  poster={video.thumbnailUrl || undefined}
                  src={video.outputUrl}
                  className="w-full h-full object-contain"
                >
                  Trình duyệt của bạn không hỗ trợ phát HTML5 video.
                </video>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Không tìm thấy URL video kết quả.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: TikTok Caption with Source attribution */}
        {activeTab === 'caption' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 p-1">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Nội dung Caption Đăng TikTok (Sáng tạo & Chuẩn SEO)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCaptionDraft(buildCleanCaption(video))}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Khôi phục lại caption mẫu ban đầu"
                  >
                    Khôi phục
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(captionDraft);
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 text-white flex items-center gap-1.5 hover:opacity-90 shadow-md shadow-pink-600/25 transition-all shrink-0"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCaption ? 'Đã sao chép!' : 'Sao chép Caption'}
                  </button>
                </div>
              </div>

              <textarea
                rows={11}
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                placeholder="Nội dung caption TikTok..."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm font-sans leading-relaxed resize-none focus:outline-none focus:border-pink-500 shadow-inner"
              />

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 Hướng dẫn đăng TikTok đạt hiệu quả cao:</p>
                <p>1. Bạn có thể chỉnh sửa trực tiếp nội dung trong ô trên theo ý muốn.</p>
                <p>2. Bấm <strong>"Sao chép Caption"</strong> & tải video MP4 về.</p>
                <p>3. Khi đăng TikTok, dán trực tiếp caption này. Đã có sẵn Hook thu hút, nội dung điểm nhấn, trích nguồn bài viết minh bạch và bộ hashtags tối ưu xu hướng.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Selected Input Parameters */}
        {activeTab === 'params' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 p-1">
            {/* Prompt Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Ý tưởng / Yêu cầu đã nhập
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {video.prompt || 'Chưa có thông tin'}
              </p>
            </div>

            {/* URL Nguồn (Nếu có) */}
            {video.url && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-900/50 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Liên kết nguồn bài viết / sản phẩm
                  </span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-300 hover:underline truncate block"
                  >
                    {video.url}
                  </a>
                </div>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-300 hover:text-white text-xs font-semibold shrink-0 flex items-center gap-1"
                >
                  Mở link <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Grid Thông số */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Thời lượng
                </span>
                <p className="text-xs font-bold text-white">{video.duration || 45} giây</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  Tỷ lệ khung hình
                </span>
                <p className="text-xs font-bold text-white">
                  {video.aspectRatio === '9:16' ? '9:16 (TikTok/Reels)' : video.aspectRatio || '9:16'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-slate-500" />
                  Giọng đọc AI
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {video.voice?.includes('NamMinh') ? 'Nam Minh (Nam miền Bắc)' : video.voice?.includes('HoaiMy') ? 'Hoài My (Nữ miền Bắc)' : video.voice || 'Neural TTS'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-slate-500" />
                  Phong cách màu sắc
                </span>
                <p className="text-xs font-bold text-white truncate">{video.style || 'Sports / Crimson Flame'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Type className="w-3 h-3 text-slate-500" />
                  Phông chữ (Font)
                </span>
                <p className="text-xs font-bold text-white">{video.fontFamily || 'Montserrat'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Video className="w-3 h-3 text-slate-500" />
                  Chuyển cảnh 3D
                </span>
                <p className="text-xs font-bold text-white truncate">{getTransitionLabel(video.transitionEffect)}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  Phong cách ảnh
                </span>
                <p className="text-xs font-bold text-emerald-400 truncate">{getVisualStyleLabel(video.visualStyle)}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  Động cơ Render
                </span>
                <p className="text-xs font-bold text-white uppercase">{video.engine || 'HyperFrames'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Leaf className="w-3 h-3 text-emerald-400" />
                  Tiết kiệm CPU/RAM
                </span>
                <p className="text-xs font-bold text-emerald-400">
                  {video.ecoMode !== false ? 'Bật (Low Memory)' : 'Tắt'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-orange-400" />
                  Chế độ Affiliate
                </span>
                <p className="text-xs font-bold text-orange-400">
                  {video.isAffiliate ? 'Có (Shopee/TikTok)' : 'Không'}
                </p>
              </div>
            </div>

            {/* Chi tiết Sản phẩm Shopee (Nếu có) */}
            {video.productData && (
              <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-800/60 space-y-2">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Thông tin sản phẩm Affiliate đính kèm
                </span>
                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong className="text-white">Tên sản phẩm:</strong> {video.productData.name}</p>
                  <p><strong className="text-white">Giá ưu đãi:</strong> {video.productData.price} ({video.productData.discount || 'Deal sốc'})</p>
                  {video.productData.affiliateUrl && (
                    <p className="truncate"><strong className="text-white">Link bio / giỏ hàng:</strong> {video.productData.affiliateUrl}</p>
                  )}
                </div>
              </div>
            )}

            {/* Nút Sao chép thông số */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCopyParams}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép toàn bộ thông số
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Revision & Draft Feedback (Section 3, 4, 15) */}
        {activeTab === 'revise' && (
          <div className="flex-1 min-h-0 flex flex-col space-y-3 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Góp Ý & Tạo Phiên Bản Mới (Copy-On-Write)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Nhập phản hồi cụ thể (ví dụ: &quot;Ảnh scene 3 chưa đúng&quot;, &quot;Voice đọc hơi nhanh&quot;). Hệ thống sẽ tự động phân loại phạm vi và tạo bản v2 độc lập mà không ghi đè video hiện tại.
              </p>
            </div>

            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ví dụ: Đổi hình ảnh ở scene 2 cho đúng thực thể, hoặc giọng đọc câu mở đầu cần chậm hơn..."
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!feedbackText.trim() || isAnalyzingFeedback}
                onClick={async () => {
                  if (!feedbackText.trim()) return;
                  setIsAnalyzingFeedback(true);
                  try {
                    const res = await api.submitFeedback(video.id, feedbackText.trim());
                    setFeedbackAnalysis(res.analysis);
                  } catch (err: any) {
                    alert(err.message || 'Không thể phân tích góp ý');
                  } finally {
                    setIsAnalyzingFeedback(false);
                  }
                }}
                className="py-2 px-3.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isAnalyzingFeedback ? 'Đang phân tích...' : '🔍 Kiểm tra phạm vi chỉnh sửa'}
              </button>
            </div>

            {feedbackAnalysis && (
              <div className="rounded-xl p-3 bg-slate-900/90 border border-amber-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Phạm vi xác định:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[11px] border border-amber-500/40">
                    {feedbackAnalysis.detectedScope}
                  </span>
                </div>
                <p className="text-slate-300">{feedbackAnalysis.explanation}</p>
                {feedbackAnalysis.issuesIdentified?.length > 0 && (
                  <div className="text-[11px] text-slate-400">
                    <strong>Vấn đề nhận diện:</strong>
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                      {feedbackAnalysis.issuesIdentified.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {feedbackAnalysis.unaffectedStages?.length > 0 && (
                  <p className="text-[11px] text-emerald-400">
                    ✓ Giữ nguyên và tái sử dụng: {feedbackAnalysis.unaffectedStages.join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={!feedbackText.trim() || isSubmittingRevision}
                onClick={async () => {
                  if (!onReviseVideo || !feedbackText.trim()) return;
                  setIsSubmittingRevision(true);
                  try {
                    await onReviseVideo(feedbackText.trim(), feedbackAnalysis?.detectedScope);
                    onClose();
                  } catch (err: any) {
                    alert(err.message || 'Lỗi khi yêu cầu chỉnh sửa');
                  } finally {
                    setIsSubmittingRevision(false);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-white" />
                {isSubmittingRevision ? 'Đang khởi tạo bản sửa...' : '🚀 Sửa & Render Phiên Bản Mới (v2)'}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t studio-border">
          {video.outputUrl && (
            <a
              href={video.outputUrl}
              download={
                video.title
                  ? `${video.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/[\s_]+/g, '-')}.mp4`
                  : `video_${video.id}.mp4`
              }
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 studio-btn-primary text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải Xuống MP4 1080p
            </a>
          )}

          <button
            onClick={onCreateAnother}
            className="py-2.5 px-4 studio-btn-secondary text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-violet-400" />
            Tạo Video Khác
          </button>
        </div>
      </div>
    </div>
  );
}
