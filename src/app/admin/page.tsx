/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState<'general' | 'depth' | 'theme' | 'lanyard' | 'nav' | 'content'>('general');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // File upload state
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadField, setCurrentUploadField] = useState<string | null>(null);

  // Check saved session PIN
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('kzn_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch config
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/config');
        const json = await res.json();
        if (json.success && json.data) {
          setConfig(json.data);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === 'admin123' || pinInput === 'anwail123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('kzn_admin_auth', 'true');
      setPinError('');
    } else {
      setPinError('PIN salah! Silakan coba lagi (Default PIN: admin123).');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        setSaveMessage({ text: '✓ Semua perubahan berhasil disimpan & langsung aktif!', type: 'success' });
      } else {
        setSaveMessage({ text: `Gagal menyimpan: ${json.error}`, type: 'error' });
      }
    } catch (err: any) {
      setSaveMessage({ text: `Terjadi error: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const triggerUpload = (fieldPath: string) => {
    setCurrentUploadField(fieldPath);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadField) return;

    try {
      setUploadingTarget(currentUploadField);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (json.success && json.url) {
        // Update nested config key
        const parts = currentUploadField.split('.');
        setConfig((prev: any) => {
          const next = { ...prev };
          let curr = next;
          for (let i = 0; i < parts.length - 1; i++) {
            curr[parts[i]] = { ...curr[parts[i]] };
            curr = curr[parts[i]];
          }
          curr[parts[parts.length - 1]] = json.url;
          return next;
        });
        setSaveMessage({ text: `✓ Gambar berhasil diunggah (${json.fileName})! Klik "Simpan" untuk menerapkan.`, type: 'success' });
      } else {
        setSaveMessage({ text: `Gagal mengunggah: ${json.error}`, type: 'error' });
      }
    } catch (err: any) {
      setSaveMessage({ text: `Error upload: ${err.message}`, type: 'error' });
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const updateConfigValue = (path: string, value: any) => {
    const parts = path.split('.');
    setConfig((prev: any) => {
      const next = { ...prev };
      let curr = next;
      for (let i = 0; i < parts.length - 1; i++) {
        curr[parts[i]] = { ...curr[parts[i]] };
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      return next;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#04050d] text-[#f4f6ff] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0b1238]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#2f77ff]/20 text-[#18d3ff] border border-[#2f77ff]/40 mb-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">KZN Portal Admin</h1>
            <p className="text-sm text-[#aab3d1] mt-1">Kelola seluruh teks, warna 3D, dan gambar website</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#aab3d1]">
                Masukkan PIN Admin
              </label>
              <input
                type="password"
                placeholder="PIN (Default: admin123)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-[#04050d]/80 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#18d3ff] transition-colors"
                autoFocus
              />
            </div>

            {pinError && <p className="text-sm text-red-400 font-medium">{pinError}</p>}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-blue-500/25"
            >
              Buka Panel Admin
            </button>

            <div className="pt-2 text-center">
              <Link href="/" className="text-xs text-[#aab3d1] hover:text-white transition-colors">
                ← Kembali ke Website Utama
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-[#04050d] text-[#f4f6ff] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#18d3ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#aab3d1] font-medium">Memuat data konfigurasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04050d] text-[#f4f6ff]">
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#080d24]/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2f77ff] to-[#18d3ff] flex items-center justify-center font-black text-black">
              K
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">KZN Visuals Studio — Admin</h1>
              <p className="text-xs text-[#aab3d1]">Live CMS & Visual Configurator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <span>Lihat Website</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/25 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Save feedback toast */}
        {saveMessage && (
          <div
            className={`max-w-7xl mx-auto mt-3 py-2 px-4 rounded-lg text-xs font-medium border ${
              saveMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {saveMessage.text}
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT & TABS ── */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {[
            { id: 'general', label: '👤 Identitas & Teks' },
            { id: 'depth', label: '💎 3D DepthText (Judul 3D)' },
            { id: 'theme', label: '🎨 Warna & DarkVeil' },
            { id: 'lanyard', label: '🪪 3D Lanyard & Upload Gambar' },
            { id: 'nav', label: '🧭 GooeyNav' },
            { id: 'content', label: '📁 Konten & Proyek' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/5 text-[#aab3d1] hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: IDENTITAS & TEKS UTAMA ── */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Profil Utama</h2>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={config.general.fullName}
                  onChange={(e) => updateConfigValue('general.fullName', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Teks Brand / Logo Navigasi</label>
                <input
                  type="text"
                  value={config.general.brandLogo}
                  onChange={(e) => updateConfigValue('general.brandLogo', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Eyebrow Hero (Teks Kecil di Atas Judul)</label>
                <input
                  type="text"
                  value={config.general.eyebrow}
                  onChange={(e) => updateConfigValue('general.eyebrow', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Role / Headline Profesi</label>
                <input
                  type="text"
                  value={config.general.role}
                  onChange={(e) => updateConfigValue('general.role', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Lead Paragraf (Bio Singkat di Hero)</label>
                <textarea
                  rows={4}
                  value={config.general.lead}
                  onChange={(e) => updateConfigValue('general.lead', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>
            </div>

            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Kontak & Tautan</h2>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Email Kontak</label>
                <input
                  type="email"
                  value={config.general.contactEmail}
                  onChange={(e) => updateConfigValue('general.contactEmail', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Link Download CV (URL atau File)</label>
                <input
                  type="text"
                  value={config.general.cvUrl}
                  onChange={(e) => updateConfigValue('general.cvUrl', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">URL GitHub</label>
                <input
                  type="text"
                  value={config.general.githubUrl}
                  onChange={(e) => updateConfigValue('general.githubUrl', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">URL LinkedIn</label>
                <input
                  type="text"
                  value={config.general.linkedinUrl}
                  onChange={(e) => updateConfigValue('general.linkedinUrl', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Teks Copyright Footer</label>
                <input
                  type="text"
                  value={config.general.footerText}
                  onChange={(e) => updateConfigValue('general.footerText', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: 3D DEPTHTEXT ── */}
        {activeTab === 'depth' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Pengaturan Teks 3D</h2>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Teks Judul 3D</label>
                <input
                  type="text"
                  value={config.depthText.text}
                  onChange={(e) => updateConfigValue('depthText.text', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Depan (Face Color)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.depthText.faceColor}
                      onChange={(e) => updateConfigValue('depthText.faceColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.depthText.faceColor}
                      onChange={(e) => updateConfigValue('depthText.faceColor', e.target.value)}
                      className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Kedalaman (Depth Color)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.depthText.depthColor}
                      onChange={(e) => updateConfigValue('depthText.depthColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.depthText.depthColor}
                      onChange={(e) => updateConfigValue('depthText.depthColor', e.target.value)}
                      className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                  <span>Jumlah Layer Ekstrusi ({config.depthText.layers})</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  value={config.depthText.layers}
                  onChange={(e) => updateConfigValue('depthText.layers', Number(e.target.value))}
                  className="w-full accent-[#2f77ff]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                  <span>Jarak Ketebalan Kedalaman ({config.depthText.depth}px)</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="4.0"
                  step="0.1"
                  value={config.depthText.depth}
                  onChange={(e) => updateConfigValue('depthText.depth', Number(e.target.value))}
                  className="w-full accent-[#2f77ff]"
                />
              </div>
            </div>

            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Fisika & Gerakan 3D</h2>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                  <span>Sudut Kemiringan / Tilt ({config.depthText.tilt}°)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={config.depthText.tilt}
                  onChange={(e) => updateConfigValue('depthText.tilt', Number(e.target.value))}
                  className="w-full accent-[#2f77ff]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                  <span>Sensasi Membal saat Ditekan / HoverPush ({config.depthText.hoverPush})</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={config.depthText.hoverPush}
                  onChange={(e) => updateConfigValue('depthText.hoverPush', Number(e.target.value))}
                  className="w-full accent-[#2f77ff]"
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.depthText.float}
                    onChange={(e) => updateConfigValue('depthText.float', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2f77ff]"
                  />
                  <span className="text-xs font-medium text-[#e3e8fb]">Aktifkan Efek Mengayun Halus (Float Motion)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.depthText.autoOrbit}
                    onChange={(e) => updateConfigValue('depthText.autoOrbit', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2f77ff]"
                  />
                  <span className="text-xs font-medium text-[#e3e8fb]">Aktifkan Auto Orbit saat Mouse Idle</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.depthText.shadow}
                    onChange={(e) => updateConfigValue('depthText.shadow', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2f77ff]"
                  />
                  <span className="text-xs font-medium text-[#e3e8fb]">Aktifkan Bayangan Teks 3D (Text Shadow)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: TEMA & DARKVEIL ── */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Palet Warna Utama</h2>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Sapphire Primer</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.theme.primaryColor}
                    onChange={(e) => updateConfigValue('theme.primaryColor', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.theme.primaryColor}
                    onChange={(e) => updateConfigValue('theme.primaryColor', e.target.value)}
                    className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Cyan Sekunder</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.theme.accentCyan}
                    onChange={(e) => updateConfigValue('theme.accentCyan', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.theme.accentCyan}
                    onChange={(e) => updateConfigValue('theme.accentCyan', e.target.value)}
                    className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">DarkVeil WebGL Aurora Background</h2>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                  <span>Kecepatan Aliran Nebula ({config.theme.veilSpeed})</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.theme.veilSpeed}
                  onChange={(e) => updateConfigValue('theme.veilSpeed', Number(e.target.value))}
                  className="w-full accent-[#2f77ff]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                  <span>Tingkat Kecerahan / Brightness ({config.theme.veilBrightness})</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.6"
                  step="0.05"
                  value={config.theme.veilBrightness}
                  onChange={(e) => updateConfigValue('theme.veilBrightness', Number(e.target.value))}
                  className="w-full accent-[#2f77ff]"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.theme.mouseInteraction}
                    onChange={(e) => updateConfigValue('theme.mouseInteraction', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2f77ff]"
                  />
                  <span className="text-xs font-medium text-[#e3e8fb]">Aktifkan Reaksi Ripple Mengikuti Gerakan Mouse</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: 3D LANYARD & UPLOAD GAMBAR ── */}
        {activeTab === 'lanyard' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gambar Kartu Depan */}
              <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#18d3ff] mb-2">Gambar Kartu Depan</h3>
                  <p className="text-xs text-[#aab3d1] mb-4">Tekstur sisi depan kartu ID Card</p>

                  <div className="w-full aspect-[3/4] bg-[#04050d] rounded-xl border border-white/15 overflow-hidden flex items-center justify-center relative mb-4">
                    {config.lanyard.frontImage ? (
                      <img src={config.lanyard.frontImage} alt="Card Front" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-white/30">Belum ada gambar</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerUpload('lanyard.frontImage')}
                  disabled={uploadingTarget === 'lanyard.frontImage'}
                  className="w-full bg-white/10 hover:bg-white/15 text-xs font-semibold py-2.5 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  {uploadingTarget === 'lanyard.frontImage' ? 'Mengunggah...' : 'Ganti Gambar Depan'}
                </button>
              </div>

              {/* Gambar Kartu Belakang */}
              <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#18d3ff] mb-2">Gambar Kartu Belakang</h3>
                  <p className="text-xs text-[#aab3d1] mb-4">Tekstur sisi belakang kartu ID Card</p>

                  <div className="w-full aspect-[3/4] bg-[#04050d] rounded-xl border border-white/15 overflow-hidden flex items-center justify-center relative mb-4">
                    {config.lanyard.backImage ? (
                      <img src={config.lanyard.backImage} alt="Card Back" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-white/30">Belum ada gambar</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerUpload('lanyard.backImage')}
                  disabled={uploadingTarget === 'lanyard.backImage'}
                  className="w-full bg-white/10 hover:bg-white/15 text-xs font-semibold py-2.5 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  {uploadingTarget === 'lanyard.backImage' ? 'Mengunggah...' : 'Ganti Gambar Belakang'}
                </button>
              </div>

              {/* Gambar Tali Lanyard */}
              <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#18d3ff] mb-2">Gambar Pita / Strap</h3>
                  <p className="text-xs text-[#aab3d1] mb-4">Tekstur tali pengait lanyard</p>

                  <div className="w-full aspect-[3/4] bg-[#04050d] rounded-xl border border-white/15 overflow-hidden flex items-center justify-center relative mb-4">
                    {config.lanyard.strapImage ? (
                      <img src={config.lanyard.strapImage} alt="Strap Band" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-white/30">Belum ada gambar</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerUpload('lanyard.strapImage')}
                  disabled={uploadingTarget === 'lanyard.strapImage'}
                  className="w-full bg-white/10 hover:bg-white/15 text-xs font-semibold py-2.5 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  {uploadingTarget === 'lanyard.strapImage' ? 'Mengunggah...' : 'Ganti Gambar Tali'}
                </button>
              </div>
            </div>

            {/* Fisika & Warna Kartu */}
            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Warna & Fisika Lanyard</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Dasar Kartu</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.lanyard.cardColor}
                      onChange={(e) => updateConfigValue('lanyard.cardColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.lanyard.cardColor}
                      onChange={(e) => updateConfigValue('lanyard.cardColor', e.target.value)}
                      className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Dasar Tali Strap</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.lanyard.strapColor}
                      onChange={(e) => updateConfigValue('lanyard.strapColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.lanyard.strapColor}
                      onChange={(e) => updateConfigValue('lanyard.strapColor', e.target.value)}
                      className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Finishing Bahan</label>
                  <select
                    value={config.lanyard.finish}
                    onChange={(e) => updateConfigValue('lanyard.finish', e.target.value)}
                    className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="glossy">Glossy (Kilap Mewah)</option>
                    <option value="matte">Matte (Doff Halus)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: GOOEYNAV ── */}
        {activeTab === 'nav' && (
          <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md max-w-2xl flex flex-col gap-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-4">Pengaturan Navigasi Cairan (GooeyNav)</h2>

            <div>
              <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Warna Pill Navigasi Aktif</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.gooeyNav.color}
                  onChange={(e) => updateConfigValue('gooeyNav.color', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={config.gooeyNav.color}
                  onChange={(e) => updateConfigValue('gooeyNav.color', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[#aab3d1] mb-1.5">
                <span>Kelenturan Tetesan Cairan / Gooeyness ({config.gooeyNav.gooeyness})</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={config.gooeyNav.gooeyness}
                onChange={(e) => updateConfigValue('gooeyNav.gooeyness', Number(e.target.value))}
                className="w-full accent-[#2f77ff]"
              />
            </div>
          </div>
        )}

        {/* ── TAB 6: KONTEN ABOUT & PROYEK ── */}
        {activeTab === 'content' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff] mb-2">Bagian About Me</h2>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Judul About</label>
                <input
                  type="text"
                  value={config.about.heading}
                  onChange={(e) => updateConfigValue('about.heading', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Paragraf Utama</label>
                <textarea
                  rows={3}
                  value={config.about.lead}
                  onChange={(e) => updateConfigValue('about.lead', e.target.value)}
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aab3d1] mb-1.5">Daftar Software & Skills (Dipisah koma)</label>
                <input
                  type="text"
                  value={config.about.skills.join(', ')}
                  onChange={(e) =>
                    updateConfigValue(
                      'about.skills',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className="w-full bg-[#04050d] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>
            </div>

            {/* Proyek Portofolio */}
            <div className="bg-[#0b1238]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#18d3ff]">Daftar Proyek Unggulan</h2>
                <button
                  type="button"
                  onClick={() => {
                    const newProj = {
                      id: `proj-${Date.now()}`,
                      title: 'Proyek Baru',
                      category: '3D Modeling & VFX',
                      description: 'Deskripsi proyek baru Anda di sini.',
                      tags: ['Blender', 'Unreal Engine'],
                      link: '#'
                    };
                    setConfig((prev: any) => ({
                      ...prev,
                      projects: [...prev.projects, newProj]
                    }));
                  }}
                  className="bg-[#2f77ff]/20 hover:bg-[#2f77ff]/30 text-[#18d3ff] border border-[#2f77ff]/40 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Tambah Proyek
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {config.projects.map((proj: any, idx: number) => (
                  <div key={proj.id} className="bg-[#04050d] border border-white/10 rounded-xl p-4 flex flex-col gap-3 relative group">
                    <button
                      type="button"
                      onClick={() => {
                        setConfig((prev: any) => ({
                          ...prev,
                          projects: prev.projects.filter((_: any, i: number) => i !== idx)
                        }));
                      }}
                      className="absolute top-2 right-2 text-white/40 hover:text-red-400 p-1 text-xs"
                      title="Hapus Proyek"
                    >
                      ✕
                    </button>

                    <div>
                      <label className="text-[10px] uppercase font-semibold text-[#aab3d1]">Judul Proyek</label>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].title = e.target.value;
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-semibold text-[#aab3d1]">Kategori</label>
                      <input
                        type="text"
                        value={proj.category}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].category = e.target.value;
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-semibold text-[#aab3d1]">Deskripsi</label>
                      <textarea
                        rows={2}
                        value={proj.description}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].description = e.target.value;
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
