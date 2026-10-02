const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface VideoItem {
  id: string;
  title?: string | null;
  prompt: string;
  url?: string | null;
  duration: number;
  aspect_ratio: '9:16' | '16:9' | '1:1';
  voice: string;
  style: string;
  caption_enabled: boolean;
  bgm_enabled: boolean;
  engine: string;
  font_family?: string;
  transition_effect?: string;
  visual_style?: string;
  hide_title?: boolean;
  eco_mode?: boolean;
  is_affiliate?: boolean;
  product_data?: any;
  status:
    | 'queued'
    | 'writing_script'
    | 'generating_voice'
    | 'generating_visuals'
    | 'rendering'
    | 'uploading'
    | 'completed'
    | 'failed';
  progress: number;
  current_step: string;
  output_url?: string | null;
  thumbnail_url?: string | null;
  tiktok_caption?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface VideoStatusResponse {
  id: string;
  status: string;
  progress: number;
  currentStep: string;
  outputUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string | null;
  tiktokCaption?: string | null;
  error?: string | null;
  prompt?: string;
  url?: string | null;
  duration?: number;
  aspectRatio?: string;
  voice?: string;
  style?: string;
  caption_enabled?: boolean;
  bgm_enabled?: boolean;
  engine?: string;
  fontFamily?: string;
  transitionEffect?: string;
  visualStyle?: string;
  hideTitle?: boolean;
  ecoMode?: boolean;
  isAffiliate?: boolean;
  productData?: any;
  createdAt?: string;
}

export interface CreateVideoInput {
  prompt: string;
  url?: string;
  duration: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  voice: string;
  style: string;
  caption: boolean;
  bgm: boolean;
  engine?: 'hyperframes' | 'remotion';
  fontFamily?: string;
  ecoMode?: boolean;
  hideTitle?: boolean;
  transitionEffect?: '3d_flycam' | '3d_tilt' | 'cinematic_zoom' | 'dynamic_whip';
  visualStyle?: 'realistic' | 'animation' | 'bright' | 'ecommerce';
  isAffiliate?: boolean;
  productData?: any;
  operation?: 'CREATE_NEW' | 'REVISE_EXISTING';
  baseVideoId?: string;
  baseVersionId?: string;
  feedback?: string;
  revisionScope?: 'AUTO' | 'SCRIPT' | 'VISUAL' | 'VOICE' | 'CAPTION' | 'FULL';
  aiMode?: 'FULL_AI' | 'ASSISTED_AI' | 'NO_AI';
  aiProviderStrategy?: 'GEMINI' | 'OPENAI' | 'AUTO';
  useUserBYOK?: boolean;
  userInputData?: any;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async register(email: string, password: string, name: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem('user');
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Phiên làm việc hết hạn');
    return data.user;
  },

  async extractUrl(url: string): Promise<{
    title: string;
    summary: string;
    content: string;
    keyPoints: string[];
    isEcommerce?: boolean;
    productData?: any;
    suggestedPrompt?: string;
  }> {
    const res = await fetch(`${API_BASE}/videos/extract-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể trích xuất nội dung từ URL này');
    return data;
  },

  async createVideo(payload: CreateVideoInput) {
    const res = await fetch(`${API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể tạo video');
    return data as { jobId: string; videoId: string; status: string; progress: number };
  },

  async getVideoStatus(id: string): Promise<VideoStatusResponse> {
    const res = await fetch(`${API_BASE}/videos/${id}`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể lấy thông tin video');
    return data;
  },

  async getMyVideos(): Promise<VideoItem[]> {
    const res = await fetch(`${API_BASE}/videos`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi tải danh sách video');
    return data.videos || [];
  },

  async retryVideo(id: string) {
    const res = await fetch(`${API_BASE}/videos/${id}/retry`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể retry video');
    return data;
  },

  async deleteVideo(id: string) {
    const res = await fetch(`${API_BASE}/videos/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể xoá video');
    return data;
  },

  async submitFeedback(videoId: string, feedback: string) {
    const res = await fetch(`${API_BASE}/videos/${videoId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ feedback }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể gửi phản hồi góp ý');
    return data as {
      success: boolean;
      videoId: string;
      currentVersionNumber: number;
      baseVersionId: string | null;
      analysis: {
        intent: string;
        detectedScope: 'AUTO' | 'SCRIPT' | 'VISUAL' | 'VOICE' | 'CAPTION' | 'FULL';
        issuesIdentified: string[];
        affectedStages: string[];
        unaffectedStages: string[];
        explanation: string;
      };
    };
  },

  async reviseVideo(payload: {
    baseVideoId: string;
    baseVersionId?: string;
    feedback: string;
    revisionScope?: string;
  }) {
    const res = await fetch(`${API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        operation: 'REVISE_EXISTING',
        baseVideoId: payload.baseVideoId,
        baseVersionId: payload.baseVersionId,
        feedback: payload.feedback,
        revisionScope: payload.revisionScope || 'AUTO',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể tạo bản chỉnh sửa');
    return data as {
      jobId: string;
      videoId: string;
      versionId: string;
      versionNumber: number;
      scope: string;
      status: string;
    };
  },

  async getVideoVersions(videoId: string) {
    const res = await fetch(`${API_BASE}/videos/${videoId}/versions`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể tải danh sách versions');
    return data.versions || [];
  },

  // AI Capabilities & BYOK
  async getAICapabilities() {
    const res = await fetch(`${API_BASE}/user/ai/capabilities`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    return data.capabilities;
  },

  async getUserAICredentials() {
    const res = await fetch(`${API_BASE}/user/ai/credentials`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    return data.credentials || [];
  },

  async addBYOKCredential(provider: 'GEMINI' | 'OPENAI', rawSecret: string, priority?: number) {
    const res = await fetch(`${API_BASE}/user/ai/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ provider, rawSecret, priority }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể thêm khóa API');
    return data.credential;
  },

  async deleteBYOKCredential(id: string) {
    const res = await fetch(`${API_BASE}/user/ai/credentials/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể xóa khóa API');
    return data;
  },

  async testCredential(provider: 'GEMINI' | 'OPENAI', rawSecret: string) {
    const res = await fetch(`${API_BASE}/user/ai/credentials/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ provider, rawSecret }),
    });
    return await res.json();
  },

  async validateInputSufficiency(mode: string, input: any) {
    const res = await fetch(`${API_BASE}/user/ai/validate-input`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ mode, input }),
    });
    return await res.json();
  },

  async getSystemInfo() {
    const res = await fetch(`${API_BASE}/system/info`);
    return await res.json();
  },

  async triggerSystemUpdate() {
    const res = await fetch(`${API_BASE}/system/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return await res.json();
  },
};
