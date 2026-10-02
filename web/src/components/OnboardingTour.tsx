'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Key,
  FileText,
  Sliders,
  Play,
  HelpCircle,
  User as UserIcon,
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  tab?: 'create' | 'videos' | 'dashboard' | 'settings';
  title: string;
  badge: string;
  description: string;
  tip?: string;
  icon: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'create' | 'videos' | 'dashboard' | 'settings';
  onNavigateTab: (tab: 'create' | 'videos' | 'dashboard' | 'settings') => void;
  onOpenAuth?: () => void;
}

export function OnboardingTour({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  onOpenAuth,
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      id: 'step-auth',
      targetSelector: '#nav-user-account',
      title: 'Đăng ký & Đăng nhập tài khoản',
      badge: 'Bước 1 / 5',
      icon: <UserIcon className="w-5 h-5 text-indigo-500" />,
      description:
        'Sử dụng tài khoản cá nhân để lưu trữ toàn bộ lịch sử video, kịch bản sáng tạo và tự động lưu lại các cấu hình API Key an toàn.',
      tip: 'Mẹo: Đăng ký cực nhanh chỉ mất 10 giây (chỉ cần nhập Email và Mật khẩu).',
      actionText: 'Mở cửa sổ Đăng nhập',
      onAction: onOpenAuth,
    },
    {
      id: 'step-settings',
      targetSelector: '#nav-settings-tab',
      tab: 'settings',
      title: 'Cấu hình AI & API Key (Miễn phí 0đ)',
      badge: 'Bước 2 / 5',
      icon: <Key className="w-5 h-5 text-amber-500" />,
      description:
        'Truy cập mục Cài đặt -> Cấu hình AI để nhập Google Gemini API Key. AI phụ trách nghiên cứu sự thật, viết kịch bản và sáng tạo nội dung. Giọng đọc tiếng Việt (Edge-TTS) đã được tích hợp sẵn 100% miễn phí không cần cấu hình thêm!',
      tip: 'Mẹo: Bạn có thể lấy Gemini API Key miễn phí tại Google AI Studio bằng tài khoản Gmail thông thường, không cần thẻ visa.',
    },
    {
      id: 'step-input',
      targetSelector: '#create-prompt-card',
      tab: 'create',
      title: 'Nhập nội dung hoặc dán link bài báo',
      badge: 'Bước 3 / 5',
      icon: <FileText className="w-5 h-5 text-cyan-500" />,
      description:
        'Dán link bài báo (VnExpress, Dân Trí, Tuổi Trẻ...) hoặc gõ vài dòng ý tưởng. Bạn cũng có thể bấm "Tài liệu / PDF", "Thêm URL", "Kịch bản có sẵn" để AI đối chiếu và trích xuất hình ảnh thực tế.',
      tip: 'Mẹo: Nếu bài viết có sẵn ảnh đẹp, hệ thống sẽ tự động kế thừa ảnh gốc để video chân thực nhất.',
    },
    {
      id: 'step-options',
      targetSelector: '#create-options-card',
      tab: 'create',
      title: 'Tùy chỉnh Thời lượng, Tỷ lệ & Giọng đọc',
      badge: 'Bước 4 / 5',
      icon: <Sliders className="w-5 h-5 text-pink-500" />,
      description:
        'Chọn thời lượng (30s, 45s, 60s), tỷ lệ 9:16 (TikTok, Reels, Shorts) hoặc 16:9 (YouTube). Mở mục "Tùy chọn nâng cao" để chọn giọng đọc Nam/Nữ miền Bắc hoặc Nam và phong cách đồ họa.',
      tip: 'Mẹo: Chế độ "Eco Mode" giúp máy render êm ái, không bị giật lag CPU và RAM.',
    },
    {
      id: 'step-submit',
      targetSelector: '#create-submit-btn',
      tab: 'create',
      title: 'Bắt đầu tạo Video & Xem thành phẩm',
      badge: 'Bước 5 / 5',
      icon: <Play className="w-5 h-5 text-emerald-500" />,
      description:
        'Bấm "Tạo video ngay"! Hệ thống sẽ tự động phối hợp nghiên cứu, lồng tiếng, tạo hiệu ứng chuyển cảnh và xuất video MP4. Sau khi hoàn thành, bạn có thể xem lại hoặc tải về trong tab "Video của tôi".',
      tip: 'Mẹo: Bạn có thể chỉnh sửa lại video bằng cách gõ nhận xét (ví dụ: "giọng đọc nhanh hơn", "thay đổi góc nhìn").',
    },
  ];

  const currentStep = steps[currentStepIndex];

  // Update target rectangle calculation
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Handle tab switching if required by step
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.tab && activeTab !== currentStep.tab) {
      onNavigateTab(currentStep.tab);
      // Wait for layout to mount
      const timer = setTimeout(() => {
        updateTargetRect();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      updateTargetRect();
    }
  }, [isOpen, currentStepIndex, currentStep, activeTab, onNavigateTab, updateTargetRect]);

  // Update rect on resize or scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleRecalc = () => updateTargetRect();
    window.addEventListener('resize', handleRecalc);
    window.addEventListener('scroll', handleRecalc, true);
    return () => {
      window.removeEventListener('resize', handleRecalc);
      window.removeEventListener('scroll', handleRecalc, true);
    };
  }, [isOpen, updateTargetRect]);

  if (!isOpen || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('studio_onboarding_completed', 'true');
    onClose();
  };

  // Calculate tooltip placement relative to target
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  const pad = 10;
  const tooltipWidth = 400;

  if (targetRect) {
    const spaceBelow = window.innerHeight - (targetRect.bottom + pad);
    const spaceAbove = targetRect.top - pad;

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    // Keep horizontally on screen
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    if (spaceBelow > 320 || spaceBelow >= spaceAbove) {
      // Place below
      tooltipStyle.top = `${targetRect.bottom + pad + 10}px`;
      tooltipStyle.left = `${left}px`;
    } else {
      // Place above
      tooltipStyle.bottom = `${window.innerHeight - targetRect.top + pad + 10}px`;
      tooltipStyle.left = `${left}px`;
    }
  } else {
    // Center of screen fallback
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden">
      {/* Semi-transparent Backdrop with Cutout Spotlight */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto" onClick={onClose} />

      {/* Spotlight cutout border */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out rounded-2xl ring-4 ring-[#6D4AFF] ring-offset-4 ring-offset-transparent shadow-[0_0_40px_rgba(109,74,255,0.7)] animate-pulse"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
            zIndex: 9995,
          }}
        />
      )}

      {/* Floating Tour Card */}
      <div
        style={tooltipStyle}
        className="w-[calc(100vw-32px)] max-w-[420px] bg-white dark:bg-[#121927] border-2 border-[#6D4AFF] dark:border-violet-500 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white transition-all duration-300 animate-in fade-in zoom-in-95 pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#DDE3EE] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center shrink-0">
              {currentStep.icon}
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6D4AFF] dark:text-violet-400 block">
                {currentStep.badge}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold leading-tight tracking-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            title="Đóng hướng dẫn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description Body */}
        <div className="py-4 space-y-3">
          <p className="text-xs sm:text-sm text-[#475467] dark:text-slate-300 leading-relaxed font-normal">
            {currentStep.description}
          </p>

          {currentStep.tip && (
            <div className="p-3 rounded-2xl bg-[#EEE9FF] dark:bg-violet-950/40 border border-[#6D4AFF]/20 text-xs text-[#5B3FE3] dark:text-violet-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
              <p className="leading-snug">{currentStep.tip}</p>
            </div>
          )}

          {currentStep.actionText && currentStep.onAction && (
            <button
              type="button"
              onClick={() => {
                currentStep.onAction?.();
              }}
              className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-violet-50 dark:bg-violet-900/30 text-[#6D4AFF] dark:text-violet-300 border border-[#6D4AFF]/30 hover:bg-[#6D4AFF] hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{currentStep.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-3 border-t border-[#DDE3EE] dark:border-white/10 flex items-center justify-between gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-[#6D4AFF]'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Chuyển đến bước ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#DDE3EE] dark:border-slate-700 text-[#475467] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-3 py-1.5 text-xs font-medium text-[#667085] hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                Bỏ qua
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-bold rounded-xl mockup-gradient-btn text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/25"
            >
              <span>
                {currentStepIndex === steps.length - 1 ? 'Bắt đầu dùng ngay' : 'Tiếp theo'}
              </span>
              {currentStepIndex === steps.length - 1 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Welcome Banner Popup shown automatically on first visit
export function WelcomeTourModal({
  isOpen,
  onStartTour,
  onDismiss,
}: {
  isOpen: boolean;
  onStartTour: () => void;
  onDismiss: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9980] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#121927] border-2 border-[#6D4AFF] dark:border-violet-500 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-in zoom-in-95">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#6D4AFF] to-[#D946EF] flex items-center justify-center text-white shadow-xl shadow-violet-500/30">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Chào mừng bạn đến với AI Studio! 👋
          </h2>
          <p className="text-xs sm:text-sm text-[#475467] dark:text-slate-300 leading-relaxed">
            Hệ thống tạo video tự động 9:16 chuyên nghiệp từ văn bản và liên kết báo chí. Khám phá nhanh 5 bước để bắt đầu tạo video đầu tiên của bạn!
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F9FAFC] dark:bg-slate-800/40 border border-[#DDE3EE] dark:border-white/10 text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
            <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-[#6D4AFF] dark:text-violet-300 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Đăng ký / Đăng nhập tài khoản cá nhân</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
            <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-[#6D4AFF] dark:text-violet-300 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Nhập Google Gemini API Key miễn phí (0đ)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
            <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-[#6D4AFF] dark:text-violet-300 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Dán link báo hoặc ý tưởng → Bấm Tạo Video</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onStartTour}
            className="w-full py-3 px-4 rounded-xl mockup-gradient-btn text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Xem hướng dẫn từng bước (1 phút)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-semibold text-[#667085] hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
