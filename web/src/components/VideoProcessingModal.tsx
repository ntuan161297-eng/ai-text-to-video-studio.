'use client';

import React, { useEffect, useState } from 'react';
import { api, VideoStatusResponse } from '../lib/api';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Film,
  X,
  Ban,
  Clock,
} from 'lucide-react';

interface VideoProcessingModalProps {
  videoId: string;
  onCompleted: (result: VideoStatusResponse) => void;
  onClose: () => void;
}

const PIPELINE_STEPS = [
  { key: 'queued', label: 'Phân tích yêu cầu', est: '10s' },
  { key: 'writing_script', label: 'Nghiên cứu thông tin & Kịch bản', est: '25s' },
  { key: 'generating_voice', label: 'Lập kế hoạch & Tạo giọng đọc', est: '30s' },
  { key: 'generating_visuals', label: 'Tìm kiếm và xử lý hình ảnh', est: '35s' },
  { key: 'rendering', label: 'Dựng video (HyperFrames 4K)', est: '45s' },
  { key: 'uploading', label: 'Xuất video MP4', est: '15s' },
];

export function VideoProcessingModal({
  videoId,
  onCompleted,
  onClose,
}: VideoProcessingModalProps) {
  const [data, setData] = useState<VideoStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await api.getVideoStatus(videoId);
        if (!isMounted) return;

        setData(res);

        if (res.status === 'completed') {
          onCompleted(res);
          return;
        }

        if (res.status === 'failed') {
          setError(res.error || 'Quá trình tạo video thất bại');
          return;
        }

        timer = setTimeout(poll, 1500);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Lỗi khi kiểm tra tiến trình video');
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [videoId, onCompleted]);

  const currentStep = data?.currentStep || data?.status || 'queued';
  const progress = Math.min(100, Math.max(8, data?.progress || 12));

  const getStepStatus = (stepKey: string) => {
    const stepKeys = PIPELINE_STEPS.map((s) => s.key);
    const currentIndex = stepKeys.indexOf(currentStep);
    const stepIndex = stepKeys.indexOf(stepKey);

    if (data?.status === 'completed') return 'completed';
    if (data?.status === 'failed' && stepIndex === currentIndex) return 'failed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const handleCancel = () => {
    if (confirm('Bạn có chắc muốn hủy tiến trình tạo video này?')) {
      setCancelling(true);
      onClose();
    }
  };

  // SVG Circular Gauge Math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="studio-card w-full max-w-2xl p-6 sm:p-7 relative shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header matching Mockup Bottom Center */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span>Đang tạo video</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Hệ thống đang xử lý yêu cầu của bạn. Vui lòng chờ trong giây lát...
          </p>
        </div>

        {/* Video Metadata Card matching Mockup */}
        <div className="p-3.5 rounded-2xl studio-elevated studio-border border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border studio-border overflow-hidden shrink-0 flex items-center justify-center">
              {data?.thumbnailUrl ? (
                <img src={data.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
              ) : (
                <Film className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {data?.title || data?.prompt || 'Khởi tạo kịch bản video...'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {data?.aspectRatio || '9:16'} • {data?.duration || 60}s • Tiếng Việt
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>Đang xử lý</span>
          </div>
        </div>

        {/* Body: Left Vertical Timeline + Right Circular Progress Ring */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Left: 8 Stages Timeline */}
          <div className="md:col-span-3 space-y-2.5">
            {PIPELINE_STEPS.map((step) => {
              const status = getStepStatus(step.key);

              return (
                <div
                  key={step.key}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    ) : status === 'active' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-violet-600 dark:border-violet-500 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-ping" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                    )}

                    <span
                      className={`font-medium ${
                        status === 'active'
                          ? 'text-[#6D4AFF] dark:text-violet-300 font-bold'
                          : status === 'completed'
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {step.est}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Circular Progress Ring matching Mockup */}
          <div className="md:col-span-2 flex flex-col items-center justify-center p-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Progress Ring with Gradient */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="url(#progressGradient)"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 ease-out"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {progress}%
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Đang xử lý
                </span>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-mono">
              Ước tính còn 1-2 phút
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Cancel Action matching Mockup */}
        <div className="pt-3 border-t studio-border flex justify-center">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Hủy tạo video</span>
          </button>
        </div>
      </div>
    </div>
  );
}
