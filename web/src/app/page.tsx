'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import { Dashboard } from '../components/Dashboard';
import { CreateVideoForm } from '../components/CreateVideoForm';
import { VideoProcessingModal } from '../components/VideoProcessingModal';
import { VideoResultModal } from '../components/VideoResultModal';
import { MyVideosGrid } from '../components/MyVideosGrid';
import { SettingsView } from '../components/SettingsView';
import { OnboardingTour, WelcomeTourModal } from '../components/OnboardingTour';
import { api, User, VideoItem, CreateVideoInput, VideoStatusResponse } from '../lib/api';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'videos' | 'dashboard' | 'settings'>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  // Check if first-time visitor to prompt onboarding tour
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem('studio_onboarding_completed');
    if (!completed) {
      const timer = setTimeout(() => {
        setWelcomeOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Video creation & modals state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<VideoStatusResponse | null>(null);

  // Videos list state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(1);

  // Section 7: Explicit blank state reset for CREATE_NEW
  const handleNavigateCreate = () => {
    setCreateFormKey((prev) => prev + 1);
    setActiveTab('create');
    if (typeof window !== 'undefined') window.location.hash = 'create';
  };

  useEffect(() => {
    const handleHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace('#', '');
      if (['create', 'videos', 'dashboard', 'settings'].includes(hash)) {
        setActiveTab(hash as any);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Initial user load
  useEffect(() => {
    const savedUser = api.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
      // Validate session with backend
      api.getMe()
        .then((me) => setUser(me))
        .catch(() => {
          api.logout();
          setUser(null);
        });
    }
  }, []);

  // Fetch videos whenever user changes
  const fetchVideos = async () => {
    if (!user) return;
    setLoadingVideos(true);
    try {
      const data = await api.getMyVideos();
      setVideos(data);
    } catch (err: any) {
      console.warn('Lỗi tải video:', err.message);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVideos();
    } else {
      setVideos([]);
    }
  }, [user]);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleCreateVideo = async (input: CreateVideoInput) => {
    let currentUser = user;
    if (!currentUser) {
      try {
        const guestRes = await api.login('creator@local.ai', 'password123').catch(async () => {
          return await api.register('creator@local.ai', 'password123', 'Nhà sáng tạo');
        });
        currentUser = guestRes.user;
        setUser(guestRes.user);
      } catch {
        setAuthModalOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await api.createVideo({
        ...input,
        operation: 'CREATE_NEW',
      });
      setProcessingVideoId(res.videoId);
      fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviseVideo = async (feedback: string, scope?: string) => {
    if (!resultVideo) return;
    try {
      const res = await api.reviseVideo({
        baseVideoId: resultVideo.id,
        feedback,
        revisionScope: scope,
      });
      setResultVideo(null);
      setProcessingVideoId(res.videoId);
      fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Không thể tạo bản chỉnh sửa');
    }
  };

  const handleSelectVideo = async (videoId: string) => {
    try {
      const statusRes = await api.getVideoStatus(videoId);
      if (statusRes.status === 'completed') {
        setResultVideo(statusRes);
      } else {
        setProcessingVideoId(videoId);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể mở video');
    }
  };

  return (
    <div className="min-h-screen studio-bg flex flex-col selection:bg-violet-600 selection:text-white transition-colors duration-200">
      {/* Navigation Bar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'create') {
            handleNavigateCreate();
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onStartTour={() => setTourOpen(true)}
      />

      {/* Main Content Areas */}
      <main className="flex-1 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            videos={videos}
            onNavigateCreate={handleNavigateCreate}
            onNavigateVideos={() => setActiveTab('videos')}
            onSelectVideo={handleSelectVideo}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'create' && (
          <div className="px-4 sm:px-6 lg:px-8">
            <CreateVideoForm key={createFormKey} onSubmit={handleCreateVideo} isLoading={isSubmitting} />
          </div>
        )}

        {activeTab === 'videos' && (
          <MyVideosGrid
            videos={videos}
            isLoading={loadingVideos}
            onRefresh={fetchVideos}
            onSelectVideo={handleSelectVideo}
            onCreateNew={handleNavigateCreate}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 AI Text to Video Engine • HyperFrames & Remotion Rendering • BullMQ Queue</p>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          fetchVideos();
        }}
      />

      {/* Video Processing Modal */}
      {processingVideoId && (
        <VideoProcessingModal
          videoId={processingVideoId}
          onClose={() => {
            setProcessingVideoId(null);
            fetchVideos();
          }}
          onCompleted={(result) => {
            setProcessingVideoId(null);
            setResultVideo(result);
            fetchVideos();
          }}
        />
      )}

      {/* Video Result Modal */}
      {resultVideo && (
        <VideoResultModal
          video={resultVideo}
          onClose={() => setResultVideo(null)}
          onCreateAnother={() => {
            setResultVideo(null);
            handleNavigateCreate();
          }}
          onReviseVideo={handleReviseVideo}
        />
      )}

      {/* Onboarding Interactive Tour */}
      <OnboardingTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        activeTab={activeTab}
        onNavigateTab={(tab) => {
          if (tab === 'create') {
            handleNavigateCreate();
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* First-time Welcome Prompt Modal */}
      <WelcomeTourModal
        isOpen={welcomeOpen}
        onStartTour={() => {
          setWelcomeOpen(false);
          setTourOpen(true);
        }}
        onDismiss={() => {
          setWelcomeOpen(false);
          localStorage.setItem('studio_onboarding_completed', 'true');
        }}
      />
    </div>
  );
}
