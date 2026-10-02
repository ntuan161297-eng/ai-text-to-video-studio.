'use client';

import React, { useEffect, useState } from 'react';
import { User } from '../lib/api';
import { Sparkles, Video, Film, LogOut, User as UserIcon, Sun, Moon, LayoutDashboard, Settings } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: 'create' | 'videos' | 'dashboard' | 'settings';
  setActiveTab: (tab: 'create' | 'videos' | 'dashboard' | 'settings') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('app_theme') as 'dark' | 'light' | null;
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('app_theme', next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[#DDE3EE] dark:border-white/10 backdrop-blur-md">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo matching mockup */}
        <div
          className="flex items-center space-x-3 cursor-pointer group select-none"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6D4AFF] via-indigo-600 to-[#D946EF] flex items-center justify-center text-white shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                AI Video <span className="text-[#6D4AFF] dark:text-violet-400">Gen</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-violet-500/20 text-[#6D4AFF] dark:text-violet-300 border border-violet-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#667085] dark:text-slate-400 leading-none">
              AI Creative Video Studio
            </p>
          </div>
        </div>

        {/* Center Navigation Capsule */}
        <nav className="flex items-center space-x-1 p-1 rounded-2xl bg-[#F9FAFC] dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 font-medium'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tổng quan</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 font-medium'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
            <span>Tạo video</span>
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 font-medium'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video của tôi</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-violet-900/60 border border-[#DDE3EE] dark:border-violet-500/50 text-[#6D4AFF] dark:text-white shadow-sm font-bold'
                : 'text-[#667085] hover:text-[#111827] hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 font-medium'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài đặt</span>
          </button>
        </nav>

        {/* Right User Actions & Status Badges */}
        <div className="flex items-center space-x-3">
          {/* AI Ready Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-[#12B76A] dark:text-emerald-400 font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#12B76A] dark:bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">AI Ready</span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="p-2 rounded-xl bg-white dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10 hover:border-[#6D4AFF] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-[#6D4AFF] hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* User Account Pill */}
          {user ? (
            <div className="flex items-center space-x-2.5 pl-1">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white dark:bg-[#161e31] border border-[#DDE3EE] dark:border-white/10">
                <div className="w-6 h-6 rounded-full bg-[#6D4AFF] flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-none pr-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</span>
                  <span className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">Gemini 2.5</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-1.5 rounded-lg text-[#8A94A6] hover:text-[#E5484D] hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold mockup-gradient-btn flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
