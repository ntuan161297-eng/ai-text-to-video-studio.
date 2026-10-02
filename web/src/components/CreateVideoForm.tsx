'use client';

import React, { useState, useEffect } from 'react';
import { CreateVideoInput, api } from '../lib/api';
import {
  Sparkles,
  Link as LinkIcon,
  Clock,
  Smartphone,
  Monitor,
  Square,
  Mic,
  Palette,
  Subtitles,
  Music,
  Zap,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  Flame,
  Type,
  Cpu,
  Image as ImageIcon,
  Layers,
  Key,
  RefreshCw,
  FileUp,
  Settings2,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { AiSettingsModal } from './AiSettingsModal';

interface CreateVideoFormProps {
  onSubmit: (data: CreateVideoInput) => void;
  isLoading: boolean;
}

export function CreateVideoForm({ onSubmit, isLoading }: CreateVideoFormProps) {
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState<15 | 30 | 45 | 60 | 90 | 120 | 180>(60);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [voice, setVoice] = useState('vi-VN-NamMinhNeural');
  const [style, setStyle] = useState('Sports / Crimson Flame');
  const [bgmStyle, setBgmStyle] = useState<'lofi' | 'sports' | 'dramatic' | 'none'>('sports');
  const [caption, setCaption] = useState(true);
  const [engine, setEngine] = useState<'hyperframes' | 'remotion'>('hyperframes');
  const [fontFamily, setFontFamily] = useState('Montserrat');
  const [ecoMode, setEcoMode] = useState(true);
  const [hideTitle, setHideTitle] = useState(true);
  const [transitionEffect, setTransitionEffect] = useState<
    '3d_flycam' | '3d_tilt' | 'cinematic_zoom' | 'dynamic_whip'
  >('3d_flycam');
  const [visualStyle, setVisualStyle] = useState<'realistic' | 'animation' | 'bright' | 'ecommerce'>('realistic');

  // AI execution controls
  const [useAI, setUseAI] = useState(true);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'advanced'>('basic');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

  // Quick resource attachments active state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showScriptInput, setShowScriptInput] = useState(false);
  const [showAssetsInput, setShowAssetsInput] = useState(false);
  const [showDocInput, setShowDocInput] = useState(false);

  // Rich inputs
  const [richScript, setRichScript] = useState('');
  const [richFacts, setRichFacts] = useState('');
  const [userVoiceUrl, setUserVoiceUrl] = useState('');
  const [userVoiceTranscript, setUserVoiceTranscript] = useState('');
  const [richVisuals, setRichVisuals] = useState('');

  // URL extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    title: string;
    summary: string;
    content: string;
    keyPoints: string[];
    isEcommerce?: boolean;
    productData?: any;
    suggestedPrompt?: string;
    images?: string[];
    videoUrl?: string;
  } | null>(null);

  const isShopeeOrEcommerceUrl = (link: string) => {
    return /shopee\.(vn|com|ph|sg)|s\.shopee|tiktok\.com|lazada|tiki\.vn/i.test(link);
  };

  const handleExtractUrl = async () => {
    if (!url.trim() || !/^https?:\/\//i.test(url.trim())) {
      setExtractError('Vui lòng nhập đúng định dạng link (bắt đầu bằng http:// hoặc https://)');
      return;
    }
    setExtractError(null);
    setIsExtracting(true);
    try {
      const data = await api.extractUrl(url.trim());
      setExtractedData(data);

      if (data.isEcommerce || isShopeeOrEcommerceUrl(url.trim())) {
        setVisualStyle('ecommerce');
        setDuration(45);
        setAspectRatio('9:16');
        if (data.suggestedPrompt) {
          setPrompt(data.suggestedPrompt);
        } else {
          setPrompt(`Tạo video giới thiệu "${data.title}": Đánh giá chi tiết tính năng, độ bền và deal giá hời.`);
        }
      } else {
        setVisualStyle('realistic');
        const suggestedPrompt = `Tạo video ${duration}s: ${data.title}. ${data.summary || ''}`.trim();
        setPrompt(suggestedPrompt);
      }
    } catch (err: any) {
      setExtractError(err.message || 'Không thể trích xuất nội dung từ liên kết này');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveMode = useAI ? 'FULL_AI' : 'NO_AI';
    let finalPrompt = prompt.trim();
    if (!finalPrompt && richScript.trim()) {
      finalPrompt = richScript.slice(0, 80).trim();
    }
    if (!finalPrompt && url.trim()) {
      if (extractedData?.title) {
        finalPrompt = `Tạo video ${duration}s: ${extractedData.title}. ${extractedData.summary || ''}`.trim();
      } else {
        finalPrompt = `Tạo video ${duration}s phân tích chi tiết nội dung từ liên kết: ${url.trim()}`;
      }
    }

    if (!finalPrompt && !url.trim() && !richScript.trim()) {
      alert('Vui lòng nhập ý tưởng video hoặc dán liên kết bài viết.');
      return;
    }

    if (!useAI && !richScript.trim() && !(userVoiceUrl.trim() && userVoiceTranscript.trim())) {
      alert('Chế độ Không dùng AI yêu cầu bạn cung cấp kịch bản phân cảnh hoặc file giọng đọc kèm bản chép lời.');
      return;
    }

    const isEcom = Boolean(extractedData?.isEcommerce || isShopeeOrEcommerceUrl(url.trim()));
    const resolvedPrompt = (finalPrompt || prompt.trim() || extractedData?.title || 'Video mới').trim();

    onSubmit({
      operation: 'CREATE_NEW',
      prompt: resolvedPrompt,
      url: url.trim() || undefined,
      duration,
      aspectRatio,
      voice,
      style: bgmStyle === 'none' ? `${style} (Muted)` : style,
      caption,
      bgm: bgmStyle !== 'none',
      engine,
      fontFamily,
      ecoMode,
      hideTitle,
      transitionEffect,
      visualStyle,
      isAffiliate: isEcom,
      productData: extractedData?.productData || undefined,
      aiMode: effectiveMode,
      aiProviderStrategy: 'AUTO',
      userInputData: {
        prompt: resolvedPrompt,
        topic: resolvedPrompt,
        script: richScript.trim() || undefined,
        facts: richFacts ? richFacts.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
        uploadedVoiceUrl: userVoiceUrl.trim() || undefined,
        userVoiceTranscript: userVoiceTranscript.trim() || undefined,
        uploadedVisuals: richVisuals ? richVisuals.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
      },
    });
  };

  return (
    <div className="max-w-[1080px] mx-auto py-5 space-y-6">
      <AiSettingsModal isOpen={isAiSettingsOpen} onClose={() => setIsAiSettingsOpen(false)} />

      {/* Header Workspace Title matching Mockup Bottom Left */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Tạo video mới
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-1">
          Nhập ý tưởng và tùy chỉnh cấu hình để tạo video chuyên nghiệp.
        </p>
      </div>

      {/* AI Toggle Bar matching Mockup */}
      <div className="studio-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#DDE3EE] dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#6D4AFF] dark:text-violet-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Sử dụng AI</span>
          </div>

          {/* iOS-Style Toggle Switch */}
          <button
            type="button"
            onClick={() => setUseAI(!useAI)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              useAI ? 'bg-[#6D4AFF]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                useAI ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          <span className="text-xs font-semibold text-[#6D4AFF] dark:text-violet-400">
            {useAI ? 'Bật' : 'Tắt'}
          </span>

          <span className="text-xs text-[#667085] dark:text-slate-400 hidden sm:inline-block">
            {useAI
              ? 'AI sẽ hỗ trợ nghiên cứu, viết kịch bản và tạo nội dung cho video.'
              : 'Tắt AI: Dựng video trực tiếp từ kịch bản phân cảnh của bạn.'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsAiSettingsOpen(true)}
          className="studio-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5 text-[#667085] dark:text-slate-400" />
          <span>Cấu hình AI</span>
        </button>
      </div>

      {/* Tab Pills: [ ✦ Ý tưởng cơ bản ] [ Tùy chọn nâng cao ] */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10 w-fit text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveFormTab('basic')}
          className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
            activeFormTab === 'basic'
              ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
              : 'text-[#667085] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
          <span>Ý tưởng cơ bản</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFormTab('advanced')}
          className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
            activeFormTab === 'advanced'
              ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
              : 'text-[#667085] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#667085] dark:text-slate-400" />
          <span>Tùy chọn nâng cao</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Prompt Card matching Mockup */}
        <div className="studio-card p-5 sm:p-6 space-y-3 border border-[#DDE3EE] dark:border-white/10">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            Bạn muốn tạo video về điều gì?
          </label>

          <div className="relative">
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Giới thiệu đặc sản bánh chóp Giao Tiến, Nam Định với lớp vỏ vàng giòn rụm và truyền thống làng nghề hơn 100 năm..."
              className="w-full p-4 studio-input text-sm leading-relaxed resize-none font-normal"
            />
            <div className="absolute right-3 bottom-3 text-xs text-[#8A94A6] dark:text-slate-500 font-mono flex items-center gap-1">
              <span>{prompt.length}/2000</span>
              <span className="text-[10px] opacity-60">⤢</span>
            </div>
          </div>

          {/* Quick Resource Attachment Buttons Row matching Mockup */}
          <div className="pt-2 border-t border-[#DDE3EE] dark:border-white/10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setShowDocInput(!showDocInput)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showDocInput
                    ? 'border-[#6D4AFF] text-[#6D4AFF] bg-[#EEE9FF] dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-500'
                    : 'bg-white dark:bg-slate-800/60 border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <FileUp className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                <span>Tài liệu / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showUrlInput || url
                    ? 'border-[#6D4AFF] text-[#6D4AFF] bg-[#EEE9FF] dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-500'
                    : 'bg-white dark:bg-slate-800/60 border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Thêm URL</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAssetsInput(!showAssetsInput)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showAssetsInput
                    ? 'border-[#6D4AFF] text-[#6D4AFF] bg-[#EEE9FF] dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-500'
                    : 'bg-white dark:bg-slate-800/60 border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#12B76A] dark:text-emerald-400" />
                <span>Hình ảnh / Video</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScriptInput(!showScriptInput)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showScriptInput || richScript
                    ? 'border-[#6D4AFF] text-[#6D4AFF] bg-[#EEE9FF] dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-500'
                    : 'bg-white dark:bg-slate-800/60 border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Kịch bản có sẵn</span>
              </button>
            </div>

            {/* Smooth URL Input Attachment Drawer */}
            {(showUrlInput || url) && (
              <div className="mt-3 p-3.5 rounded-2xl bg-[#F9FAFC] dark:bg-slate-800/40 border border-[#DDE3EE] dark:border-white/10 space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Đường dẫn liên kết nguồn (Báo chí, Blog ẩm thực, Shopee, TikTok Shop):
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://vov.vn/... hoặc https://laodong.vn/... hoặc link Shopee"
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm studio-input"
                  />
                  <button
                    type="button"
                    onClick={handleExtractUrl}
                    disabled={isExtracting || !url.trim()}
                    className="studio-btn-secondary px-4 py-2 text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tải nội dung...</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Trích xuất link</span>
                      </>
                    )}
                  </button>
                </div>

                {extractError && (
                  <div className="text-xs text-[#E5484D] dark:text-rose-400 flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{extractError}</span>
                  </div>
                )}

                {extractedData && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-[#12B76A] dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{extractedData.title}</span>
                    </div>
                    {extractedData.summary && (
                      <p className="text-[#667085] dark:text-slate-300 text-[11px] line-clamp-2">
                        {extractedData.summary}
                      </p>
                    )}

                    {/* Inherited Images Gallery Preview */}
                    {extractedData.images && extractedData.images.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-300 font-medium">
                          <span>📸 Đã kế thừa {extractedData.images.length} ảnh thực tế từ sản phẩm:</span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          {extractedData.images.slice(0, 6).map((imgUrl, idx) => (
                            <img
                              key={idx}
                              src={imgUrl}
                              alt={`Ảnh sản phẩm ${idx + 1}`}
                              className="w-11 h-11 object-cover rounded-lg border border-[#DDE3EE] dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ))}
                          {extractedData.images.length > 6 && (
                            <span className="text-[10px] text-[#667085] dark:text-slate-400 shrink-0 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#DDE3EE] dark:border-slate-700">
                              +{extractedData.images.length - 6} ảnh nữa
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inherited Video Badge */}
                    {extractedData.videoUrl && (
                      <div className="flex items-center gap-1.5 text-[11px] text-sky-600 dark:text-sky-400 font-medium pt-0.5">
                        <span>🎥 Đã kế thừa video review sản phẩm (âm thanh gốc sẽ được tắt để hòa âm AI voice & BGM)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Script Input Attachment Drawer */}
            {(showScriptInput || richScript) && (
              <div className="mt-3 p-3.5 rounded-2xl bg-[#F9FAFC] dark:bg-slate-800/40 border border-[#DDE3EE] dark:border-white/10 space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Kịch bản phân cảnh cụ thể:
                </span>
                <textarea
                  rows={4}
                  value={richScript}
                  onChange={(e) => setRichScript(e.target.value)}
                  placeholder="Nhập toàn văn kịch bản hoặc lời thoại theo từng phân cảnh..."
                  className="w-full p-3 studio-input text-xs"
                />
              </div>
            )}

            {/* Document Input Drawer */}
            {showDocInput && (
              <div className="mt-3 p-3.5 rounded-2xl bg-[#F9FAFC] dark:bg-slate-800/40 border border-[#DDE3EE] dark:border-white/10 space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <FileUp className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                  Dữ kiện văn bản / Tài liệu tham khảo (Facts):
                </span>
                <textarea
                  rows={3}
                  value={richFacts}
                  onChange={(e) => setRichFacts(e.target.value)}
                  placeholder="Mỗi dòng một thông tin, số liệu xác thực về chủ đề..."
                  className="w-full p-3 studio-input text-xs"
                />
              </div>
            )}

            {/* Image/Video Assets Drawer */}
            {showAssetsInput && (
              <div className="mt-3 p-3.5 rounded-2xl bg-[#F9FAFC] dark:bg-slate-800/40 border border-[#DDE3EE] dark:border-white/10 space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#12B76A] dark:text-emerald-400" />
                  Đường dẫn hình ảnh / video tư liệu riêng:
                </span>
                <textarea
                  rows={2}
                  value={richVisuals}
                  onChange={(e) => setRichVisuals(e.target.value)}
                  placeholder="Dán link ảnh hoặc đường dẫn file trên máy (mỗi dòng một link)..."
                  className="w-full p-3 studio-input text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Primary Controls: Thời lượng & Tỷ lệ khung hình matching Mockup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Thời lượng */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#12B76A] dark:text-emerald-400" />
              <span>Thời lượng</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { sec: 30, label: '30s' },
                { sec: 45, label: '45s' },
                { sec: 60, label: '60s', star: true },
                { sec: 90, label: 'Tùy chỉnh' },
              ].map((item) => (
                <button
                  key={item.sec}
                  type="button"
                  onClick={() => setDuration(item.sec as any)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    duration === item.sec
                      ? 'bg-[#6D4AFF] text-white shadow-md shadow-violet-600/25'
                      : 'bg-white dark:bg-slate-800/60 border border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.star && <span className="text-amber-400 text-[11px]">★</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Tỷ lệ khung hình */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#6D4AFF] dark:text-violet-400" />
              <span>Tỷ lệ khung hình</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-[#6D4AFF] text-white shadow-md shadow-violet-600/25'
                    : 'bg-white dark:bg-slate-800/60 border border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-[#6D4AFF] text-white shadow-md shadow-violet-600/25'
                    : 'bg-white dark:bg-slate-800/60 border border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>16:9</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'bg-[#6D4AFF] text-white shadow-md shadow-violet-600/25'
                    : 'bg-white dark:bg-slate-800/60 border border-[#DDE3EE] dark:border-slate-700 text-[#667085] hover:text-[#111827] hover:border-[#B9C3D6] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>1:1</span>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Options Tab Content */}
        {activeFormTab === 'advanced' && (
          <div className="studio-card p-5 space-y-4 animate-in fade-in duration-150 border border-[#DDE3EE] dark:border-white/10">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#6D4AFF] dark:text-violet-400" />
              <span>Tùy chọn phong cách, giọng đọc & chuyển cảnh</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[#667085] dark:text-slate-300 font-semibold block mb-1.5">Giọng đọc</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full p-2.5 studio-input"
                >
                  <option value="vi-VN-NamMinhNeural">Nam Minh (Nam miền Bắc)</option>
                  <option value="vi-VN-HoaiMyNeural">Hoài My (Nữ miền Bắc)</option>
                </select>
              </div>

              <div>
                <label className="text-[#667085] dark:text-slate-300 font-semibold block mb-1.5">Phong cách ảnh</label>
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value as any)}
                  className="w-full p-2.5 studio-input"
                >
                  <option value="realistic">📸 Báo chí & Đời thực</option>
                  <option value="animation">🎨 Hoạt hình 3D Pixar</option>
                  <option value="bright">☀️ Phong cảnh tươi sáng</option>
                  <option value="ecommerce">🛍️ Sản phẩm & Affiliate</option>
                </select>
              </div>

              <div>
                <label className="text-[#667085] dark:text-slate-300 font-semibold block mb-1.5">Chuyển cảnh 3D</label>
                <select
                  value={transitionEffect}
                  onChange={(e) => setTransitionEffect(e.target.value as any)}
                  className="w-full p-2.5 studio-input"
                >
                  <option value="3d_flycam">🛸 Flycam 3D Drone</option>
                  <option value="3d_tilt">📐 3D Parallax Tilt</option>
                  <option value="cinematic_zoom">🔍 Zoom Điện Ảnh</option>
                  <option value="dynamic_whip">⚡ Dynamic Whip</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="text-[#667085] dark:text-slate-300 font-semibold block mb-1.5">Phông chữ</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full p-2.5 studio-input"
                >
                  <option value="Montserrat">Montserrat</option>
                  <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                  <option value="Nunito">Nunito</option>
                  <option value="Inter">Inter</option>
                </select>
              </div>

              <div>
                <label className="text-[#667085] dark:text-slate-300 font-semibold block mb-1.5">Nhạc nền BGM</label>
                <select
                  value={bgmStyle}
                  onChange={(e) => setBgmStyle(e.target.value as any)}
                  className="w-full p-2.5 studio-input"
                >
                  <option value="sports">Thể thao / Nhiệt huyết</option>
                  <option value="dramatic">Hùng tráng</option>
                  <option value="lofi">Lofi nhẹ nhàng</option>
                  <option value="none">Không nhạc</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-4 text-xs text-[#667085] dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caption}
                  onChange={(e) => setCaption(e.target.checked)}
                  className="rounded text-[#6D4AFF] focus:ring-[#6D4AFF]"
                />
                <span>Phụ đề karaoke từng từ phát sáng</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ecoMode}
                  onChange={(e) => setEcoMode(e.target.checked)}
                  className="rounded text-[#6D4AFF] focus:ring-[#6D4AFF]"
                />
                <span>Chế độ êm ái CPU & RAM (Eco Mode)</span>
              </label>
            </div>
          </div>
        )}

        {/* Large Full-Width Mockup CTA Button */}
        <button
          type="submit"
          disabled={isLoading || (!prompt.trim() && !url.trim() && !richScript.trim())}
          className="w-full py-3.5 px-6 mockup-gradient-btn text-base flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-600/30"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Đang kết nối hệ thống và phân bổ worker...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Tạo video ngay</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
