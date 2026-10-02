'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Key, Shield, CheckCircle2, AlertCircle, Trash2, Plus, RefreshCw, X } from 'lucide-react';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
  const [capabilities, setCapabilities] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<'GEMINI' | 'OPENAI'>('GEMINI');
  const [rawSecret, setRawSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [caps, creds] = await Promise.all([
        api.getAICapabilities().catch(() => null),
        api.getUserAICredentials().catch(() => []),
      ]);
      setCapabilities(caps);
      setCredentials(creds);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!rawSecret.trim()) {
      setErrorMsg('Vui lòng nhập API key để kiểm tra');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);
    try {
      const res = await api.testCredential(provider, rawSecret.trim());
      setTestResult({
        success: res.success,
        message: res.message || (res.success ? 'Kết nối thành công!' : 'Kết nối thất bại'),
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawSecret.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.addBYOKCredential(provider, rawSecret.trim());
      setRawSecret('');
      setTestResult(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa API key này?')) return;
    try {
      await api.deleteBYOKCredential(id);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="studio-card w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto flex flex-col space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b studio-border">
          <div className="p-2 rounded-xl bg-violet-600/15 text-violet-400 border border-violet-500/30 shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Cấu hình AI & API Keys (BYOK)</h2>
            <p className="text-xs text-slate-400">
              Nhập API Key để sinh kịch bản và xử lý video không giới hạn
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Thêm Key */}
        <div className="p-4 rounded-2xl studio-elevated studio-border border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Thêm Khóa API Mới</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {provider === 'GEMINI' ? 'aistudio.google.com' : 'platform.openai.com'}
            </span>
          </div>

          <form onSubmit={handleAddKey} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="studio-input p-2 text-xs font-semibold"
              >
                <option value="GEMINI">Google Gemini</option>
                <option value="OPENAI">OpenAI</option>
              </select>

              <input
                type="password"
                placeholder={provider === 'GEMINI' ? 'Dán API Key: AIzaSy...' : 'Dán API Key: sk-proj-...'}
                value={rawSecret}
                onChange={(e) => setRawSecret(e.target.value)}
                className="sm:col-span-2 studio-input px-3 py-2 text-xs font-mono"
              />
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !rawSecret.trim()}
                className="studio-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Thử kết nối
              </button>

              <button
                type="submit"
                disabled={saving || !rawSecret.trim()}
                className="studio-btn-primary px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu khóa bảo mật'}
              </button>
            </div>
          </form>

          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            🔒 <span>Mã hóa AES-256 an toàn, không hiển thị lại cho bất kỳ ai.</span>
          </p>
        </div>

        {/* Khóa API đã lưu */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              Khóa API đã lưu ({credentials.length})
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Hệ thống:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full ${
                  capabilities?.systemAIAvailable
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {capabilities?.systemAIAvailable ? 'Sẵn sàng' : 'Chưa có'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Đang tải danh sách khóa...
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-3 px-3 studio-elevated studio-border border rounded-xl">
              Chưa lưu khóa riêng nào. Nhập khóa ở trên để kích hoạt.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-2.5 studio-elevated studio-border border rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-violet-400 text-[11px]">{cred.provider}</span>
                    <span className="font-mono text-slate-400 text-[11px]">{cred.maskedIdentifier}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {cred.status}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Xóa khóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
