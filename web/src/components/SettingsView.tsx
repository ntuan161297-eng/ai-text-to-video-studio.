'use client';

import React, { useState, useEffect } from 'react';
import { User, api } from '../lib/api';
import {
  User as UserIcon,
  Zap,
  Mic,
  Film,
  Shield,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Laptop,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { AiSettingsModal } from './AiSettingsModal';

interface SettingsViewProps {
  user: User | null;
  onOpenAuth: () => void;
}

export function SettingsView({ user, onOpenAuth }: SettingsViewProps) {
  const [activeNav, setActiveNav] = useState<'ai' | 'account' | 'voice' | 'defaults' | 'security' | 'system'>('ai');
  const [useAI, setUseAI] = useState(true);
  const [provider, setProvider] = useState<'AUTO' | 'GEMINI' | 'OPENAI'>('AUTO');
  const [maxCalls, setMaxCalls] = useState('20');
  const [maxCost, setMaxCost] = useState('1.00');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

  // System & Update states
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string; output?: string } | null>(null);

  useEffect(() => {
    if (activeNav === 'system') {
      fetchSystemInfo();
    }
  }, [activeNav]);

  const fetchSystemInfo = async () => {
    setLoadingInfo(true);
    try {
      const res = await api.getSystemInfo();
      if (res.success) {
        setSystemInfo(res);
      }
    } catch {}
    finally {
      setLoadingInfo(false);
    }
  };

  const handleUpdateSystem = async () => {
    setUpdating(true);
    setUpdateResult(null);
    try {
      const res = await api.triggerSystemUpdate();
      setUpdateResult(res);
      if (res.success) {
        await fetchSystemInfo();
      }
    } catch (err: any) {
      setUpdateResult({ success: false, message: err.message || 'Lỗi khi kết nối với máy chủ cập nhật' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('studio_settings_useAI', String(useAI));
    localStorage.setItem('studio_settings_provider', provider);
    localStorage.setItem('studio_settings_maxCalls', maxCalls);
    localStorage.setItem('studio_settings_maxCost', maxCost);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <AiSettingsModal isOpen={isAiSettingsOpen} onClose={() => setIsAiSettingsOpen(false)} />

      {/* Header matching Mockup Bottom Right */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Cài đặt
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-1">
          Quản lý cấu hình hệ thống, AI, tài khoản và cập nhật phiên bản.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar Navigation matching Mockup */}
        <div className="studio-card p-2 space-y-1 border border-[#DDE3EE] dark:border-white/10">
          <button
            onClick={() => setActiveNav('account')}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
              activeNav === 'account'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Tài khoản</span>
          </button>

          <button
            id="settings-api-tab-btn"
            onClick={() => setActiveNav('ai')}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
              activeNav === 'ai'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4 text-[#6D4AFF] dark:text-violet-400" />
            <span>AI & API</span>
          </button>

          <button
            onClick={() => setActiveNav('voice')}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
              activeNav === 'voice'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <Mic className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Giọng đọc (TTS)</span>
          </button>

          <button
            onClick={() => setActiveNav('defaults')}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
              activeNav === 'defaults'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span>Mặc định video</span>
          </button>

          <button
            onClick={() => setActiveNav('security')}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
              activeNav === 'security'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4 text-[#12B76A] dark:text-emerald-400" />
            <span>Bảo mật</span>
          </button>

          <button
            onClick={() => setActiveNav('system')}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
              activeNav === 'system'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <Download className="w-4 h-4 text-[#6D4AFF]" />
            <span>Hệ thống & Cập nhật</span>
          </button>
        </div>

        {/* Right Main Settings Panel matching Mockup */}
        <div id="settings-api-card" className="md:col-span-3 studio-card p-6 sm:p-7 space-y-6 border border-[#DDE3EE] dark:border-white/10">
          {activeNav === 'system' ? (
            /* Tab: Hệ thống & Cập nhật code từ Git */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DDE3EE] dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-[#6D4AFF]" />
                    <span>Hệ thống & Cập nhật phiên bản</span>
                  </h2>
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                    Quản lý phiên bản mã nguồn, cập nhật từ Git và triển khai sang máy mới.
                  </p>
                </div>

                <button
                  onClick={handleUpdateSystem}
                  disabled={updating}
                  className="mockup-gradient-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50 shadow-md shadow-violet-500/25"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
                  <span>{updating ? 'Đang cập nhật...' : 'Cập nhật từ Git'}</span>
                </button>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl studio-elevated studio-border border">
                  <span className="text-[11px] text-[#8A94A6] block">Phiên bản</span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                    v{systemInfo?.version || '1.0.0'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl studio-elevated studio-border border">
                  <span className="text-[11px] text-[#8A94A6] block">Git Commit</span>
                  <p className="text-sm font-extrabold text-[#6D4AFF] font-mono mt-0.5">
                    {systemInfo?.gitCommit || 'latest'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl studio-elevated studio-border border">
                  <span className="text-[11px] text-[#8A94A6] block">Nhánh (Branch)</span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                    {systemInfo?.gitBranch || 'main'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl studio-elevated studio-border border">
                  <span className="text-[11px] text-[#8A94A6] block">Môi trường</span>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {systemInfo?.nodeVersion || 'Node.js'}
                  </p>
                </div>
              </div>

              {/* Update Feedback */}
              {updateResult && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                  updateResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {updateResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="font-bold">{updateResult.message || (updateResult as any).error || 'Thông báo cập nhật'}</p>
                    {updateResult.output && (
                      <pre className="text-[11px] font-mono p-2 bg-black/10 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {updateResult.output}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Guide Card for Other Machines */}
              <div className="p-4 sm:p-5 rounded-2xl studio-elevated studio-border border space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Terminal className="w-4 h-4 text-[#6D4AFF]" />
                  <span>Bộ cài 1-Click cho máy tính mới</span>
                </div>
                <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
                  Khi bạn chia sẻ mã nguồn sang máy tính khác, người dùng chỉ cần chạy 3 file batch có sẵn:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border studio-border">
                    <p className="font-bold text-[#6D4AFF]">1_Cai_Dat_Lan_Dau.bat</p>
                    <span className="text-[11px] text-[#667085] dark:text-slate-400 font-sans mt-0.5 block">Tự cài thư viện & build app</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border studio-border">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">2_Khoi_Dong_Studio.bat</p>
                    <span className="text-[11px] text-[#667085] dark:text-slate-400 font-sans mt-0.5 block">Tự bật server & mở trình duyệt</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border studio-border">
                    <p className="font-bold text-amber-600 dark:text-amber-400">3_Cap_Nhat_Phien_Ban_Moi.bat</p>
                    <span className="text-[11px] text-[#667085] dark:text-slate-400 font-sans mt-0.5 block">Kéo code mới từ Git trong 10s</span>
                  </div>
                </div>
              </div>

              {/* Free Gemini Key Guide */}
              <div className="p-4 sm:p-5 rounded-2xl bg-violet-500/10 border border-[#6D4AFF]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#6D4AFF] flex items-center gap-1.5 uppercase tracking-wider">
                    <Key className="w-3.5 h-3.5" />
                    Google Gemini API Key Miễn Phí (0đ)
                  </span>
                  <p className="text-xs text-[#667085] dark:text-slate-300">
                    Người dùng máy mới tự lấy key miễn phí trong 1 phút bằng tài khoản Gmail thông thường, không cần thẻ visa.
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6D4AFF] text-white hover:bg-[#5B3FE3] transition-colors shrink-0 flex items-center gap-1.5 shadow-md shadow-violet-500/25"
                >
                  <span>Lấy Key Miễn Phí</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            /* Tab: Cấu hình AI thông thường */
            <>
              {/* Card Header with API Key CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DDE3EE] dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Cấu hình AI</h2>
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                    Thiết lập cách thức hệ thống sử dụng AI để tạo nội dung.
                  </p>
                </div>

                <button
                  onClick={() => setIsAiSettingsOpen(true)}
                  className="mockup-gradient-btn px-4 py-2 text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md shadow-violet-500/25"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Quản lý API Key</span>
                </button>
              </div>

          {/* Section: Sử dụng AI */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Sử dụng AI</span>
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
            </div>
            <p className="text-xs text-[#667085] dark:text-slate-400">
              Tắt để sử dụng nội dung do bạn cung cấp, không gọi API AI.
            </p>
          </div>

          {/* Section: Nhà cung cấp AI matching Mockup */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              Nhà cung cấp AI
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Auto */}
              <div
                onClick={() => setProvider('AUTO')}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  provider === 'AUTO'
                    ? 'bg-[#EEE9FF] dark:bg-violet-950/40 border-[#6D4AFF] shadow-md shadow-violet-500/20'
                    : 'bg-white dark:bg-[#161e31] border-[#DDE3EE] dark:border-white/10 hover:border-[#B9C3D6]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${provider === 'AUTO' ? 'border-[#6D4AFF]' : 'border-slate-400'}`}>
                    {provider === 'AUTO' && <div className="w-2 h-2 rounded-full bg-[#6D4AFF]" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Tự động (Khuyến nghị)</span>
                </div>
                <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-2">
                  Tự động chọn nhà cung cấp tốt nhất và dự phòng khi nghẽn mạng.
                </p>
              </div>

              {/* Option 2: Gemini */}
              <div
                onClick={() => setProvider('GEMINI')}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  provider === 'GEMINI'
                    ? 'bg-[#EEE9FF] dark:bg-violet-950/40 border-[#6D4AFF] shadow-md shadow-violet-500/20'
                    : 'bg-white dark:bg-[#161e31] border-[#DDE3EE] dark:border-white/10 hover:border-[#B9C3D6]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${provider === 'GEMINI' ? 'border-[#6D4AFF]' : 'border-slate-400'}`}>
                    {provider === 'GEMINI' && <div className="w-2 h-2 rounded-full bg-[#6D4AFF]" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Gemini</span>
                </div>
                <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-2">
                  Sử dụng Google Gemini 2.5 cho tốc độ cao và thấu hiểu ngữ cảnh Việt.
                </p>
              </div>

              {/* Option 3: OpenAI */}
              <div
                onClick={() => setProvider('OPENAI')}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  provider === 'OPENAI'
                    ? 'bg-[#EEE9FF] dark:bg-violet-950/40 border-[#6D4AFF] shadow-md shadow-violet-500/20'
                    : 'bg-white dark:bg-[#161e31] border-[#DDE3EE] dark:border-white/10 hover:border-[#B9C3D6]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${provider === 'OPENAI' ? 'border-[#6D4AFF]' : 'border-slate-400'}`}>
                    {provider === 'OPENAI' && <div className="w-2 h-2 rounded-full bg-[#6D4AFF]" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">OpenAI</span>
                </div>
                <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-2">
                  Sử dụng OpenAI GPT-4o-mini cho các tác vụ biên kịch nâng cao.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Giới hạn sử dụng (tùy chọn) matching Mockup */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              Giới hạn sử dụng (tùy chọn)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#667085] dark:text-slate-400 block mb-1.5">
                  Số lần gọi tối đa / video
                </span>
                <input
                  type="number"
                  value={maxCalls}
                  onChange={(e) => setMaxCalls(e.target.value)}
                  className="w-full px-3.5 py-2.5 studio-input text-xs font-mono"
                />
              </div>

              <div>
                <span className="text-xs text-[#667085] dark:text-slate-400 block mb-1.5">
                  Chi phí tối đa / video (USD)
                </span>
                <input
                  type="text"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                  className="w-full px-3.5 py-2.5 studio-input text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[#12B76A] dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã lưu cấu hình thành công!</span>
            </div>
          )}

          {/* Bottom Save Button matching Mockup */}
          <div className="pt-3 border-t border-[#DDE3EE] dark:border-white/10 flex justify-end">
            <button
              onClick={handleSave}
              className="mockup-gradient-btn px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/30"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu cấu hình</span>
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
