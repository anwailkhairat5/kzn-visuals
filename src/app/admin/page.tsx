/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ImageCropperModal from '@/components/ImageCropperModal';

type TabType = 'general' | 'depth' | 'theme' | 'lanyard' | 'nav' | 'content';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // File upload & crop states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadField, setCurrentUploadField] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [cropTargetTitle, setCropTargetTitle] = useState('Potong & Sesuaikan Gambar');
  const [cropDefaultAspect, setCropDefaultAspect] = useState<'idcard' | 'strap' | 'square' | 'wide' | 'free'>('idcard');
  const [isUploading, setIsUploading] = useState(false);

  // New skill tag input
  const [newSkillInput, setNewSkillInput] = useState('');

  // Check saved session PIN
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('kzn_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch initial config
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        // Optimistic local cache first
        try {
          const cached = localStorage.getItem('kzn_portfolio_config');
          if (cached) {
            setConfig(JSON.parse(cached));
          }
        } catch {}

        const res = await fetch('/api/admin/config');
        const json = await res.json();
        if (json.success && json.data) {
          setConfig(json.data);
          try {
            localStorage.setItem('kzn_portfolio_config', JSON.stringify(json.data));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
    if (!config) return;
    try {
      setSaving(true);
      setSaveMessage(null);

      // Save locally to localStorage for zero-latency instant preview
      try {
        localStorage.setItem('kzn_portfolio_config', JSON.stringify(config));
      } catch {}

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        setSaveMessage({ text: '✓ ' + (json.message || 'Semua perubahan berhasil disimpan & disinkronkan ke Cloud!'), type: 'success' });
      } else {
        setSaveMessage({ text: `Gagal menyimpan: ${json.error}`, type: 'error' });
      }
    } catch (err: any) {
      setSaveMessage({ text: `Terjadi error: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
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

  // Trigger file picker for cropping
  const triggerImagePicker = (fieldPath: string, title: string, aspect: 'idcard' | 'strap' | 'square' | 'wide' | 'free') => {
    setCurrentUploadField(fieldPath);
    setCropTargetTitle(title);
    setCropDefaultAspect(aspect);
    fileInputRef.current?.click();
  };

  // Handle local file selected -> send to Crop Modal
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImageForCrop(event.target?.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Crop directly from existing image
  const triggerCropExisting = (fieldPath: string, currentImgUrl: string, title: string, aspect: 'idcard' | 'strap' | 'square' | 'wide' | 'free') => {
    setCurrentUploadField(fieldPath);
    setCropTargetTitle(title);
    setCropDefaultAspect(aspect);
    setRawImageForCrop(currentImgUrl);
    setCropModalOpen(true);
  };

  // When crop complete -> Upload cropped base64 & apply
  const handleCropComplete = async (croppedDataUrl: string) => {
    if (!currentUploadField) return;

    try {
      setIsUploading(true);

      // Directly apply cropped image locally for instant UI update
      updateConfigValue(currentUploadField, croppedDataUrl);

      // Convert base64 dataUrl to blob and send to API
      const resBlob = await fetch(croppedDataUrl);
      const blob = await resBlob.blob();

      const formData = new FormData();
      formData.append('file', blob, `crop_${Date.now()}.png`);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (json.success && (json.url || json.githubUrl)) {
        const finalUrl = json.url || json.githubUrl || croppedDataUrl;
        updateConfigValue(currentUploadField, finalUrl);
        setSaveMessage({
          text: `✓ Gambar berhasil dipotong & diunggah! Klik "Simpan Perubahan" untuk sinkronisasi cloud.`,
          type: 'success'
        });
      } else {
        setSaveMessage({
          text: `✓ Gambar dipotong & tersimpan lokal.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.warn('Upload error, using local cropped dataUrl:', err);
    } finally {
      setIsUploading(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // Add new skill
  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const currentSkills = config.about.skills || [];
    if (!currentSkills.includes(newSkillInput.trim())) {
      updateConfigValue('about.skills', [...currentSkills, newSkillInput.trim()]);
    }
    setNewSkillInput('');
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove: string) => {
    const currentSkills = config.about.skills || [];
    updateConfigValue(
      'about.skills',
      currentSkills.filter((s: string) => s !== skillToRemove)
    );
  };

  // Add Project
  const handleAddProject = () => {
    const newProj = {
      id: `proj-${Date.now()}`,
      title: 'Proyek Baru',
      category: '3D Production & Visuals',
      description: 'Deskripsi proyek kreatif atau rekayasa multimedia baru.',
      tags: ['Blender 3D', 'Unreal Engine'],
      link: '#'
    };
    setConfig((prev: any) => ({
      ...prev,
      projects: [newProj, ...prev.projects]
    }));
  };

  // Delete Project
  const handleDeleteProject = (index: number) => {
    if (!confirm('Yakin ingin menghapus proyek ini?')) return;
    setConfig((prev: any) => ({
      ...prev,
      projects: prev.projects.filter((_: any, i: number) => i !== index)
    }));
  };

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#f4f6ff] flex items-center justify-center p-4 selection:bg-[#2f77ff]/30">
        <div className="max-w-md w-full bg-[#101422]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-gradient-to-b from-[#2f77ff]/30 to-transparent blur-3xl pointer-events-none" />

          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2f77ff]/30 to-[#18d3ff]/20 text-[#18d3ff] border border-white/15 mb-4 shadow-lg shadow-blue-500/10">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">KZN Visuals Studio</h1>
            <p className="text-xs text-white/50 mt-1 font-medium">Panel Admin CMS & Visual Configurator</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 relative">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Kunci Akses PIN Admin
              </label>
              <input
                type="password"
                placeholder="Masukkan PIN (Default: admin123)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-[#090b14] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#18d3ff] focus:ring-1 focus:ring-[#18d3ff] transition-all"
                autoFocus
              />
            </div>

            {pinError && <p className="text-xs text-rose-400 font-medium">{pinError}</p>}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 mt-2"
            >
              Buka Studio Admin
            </button>

            <div className="pt-3 text-center">
              <Link href="/" className="text-xs text-white/40 hover:text-white transition-colors">
                ← Kembali ke Website Utama
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading || !config) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#f4f6ff] flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 border-3 border-[#18d3ff] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-sm font-bold tracking-wider text-white">Memuat Data Studio...</h2>
          <p className="text-xs text-white/40 mt-1">Menyinkronkan konfigurasi cloud & visual 3D</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f4f6ff] selection:bg-[#2f77ff]/30">
      {/* Hidden File Picker for Crop / Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Interactive Crop Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={rawImageForCrop}
        targetTitle={cropTargetTitle}
        defaultAspect={cropDefaultAspect}
        onCropComplete={handleCropComplete}
        onClose={() => {
          setCropModalOpen(false);
          setRawImageForCrop(null);
        }}
      />

      {/* ── TOP STICKY COMMAND BAR ── */}
      <header className="sticky top-0 z-40 bg-[#0d101c]/95 backdrop-blur-xl border-b border-white/10 px-6 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2f77ff] to-[#18d3ff] flex items-center justify-center font-black text-black shadow-md shadow-blue-500/20">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white">KZN Visuals Studio</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cloud Synced
                </span>
              </div>
              <p className="text-[11px] text-white/40 font-medium">Live Visual Editor & Asset Manager</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              target="_blank"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-white/80 hover:text-white"
            >
              <span>Lihat Website</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <button
              onClick={handleSave}
              disabled={saving || isUploading}
              className="bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-bold text-xs px-5 py-2 rounded-xl shadow-lg shadow-blue-500/25 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              title="Shortcut: Tekan Ctrl + S untuk menyimpan"
            >
              {saving || isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Simpan Perubahan</span>
                  <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-white/80 font-mono">
                    Ctrl+S
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Save feedback toast */}
        {saveMessage && (
          <div
            className={`max-w-7xl mx-auto mt-2.5 py-2 px-4 rounded-xl text-xs font-semibold border flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
              saveMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{saveMessage.text}</span>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0e1220]/80 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
          {[
            { id: 'general', label: 'Identitas & Profil', icon: '👤' },
            { id: 'depth', label: 'Judul 3D DepthText', icon: '💎' },
            { id: 'theme', label: 'Warna & DarkVeil', icon: '🎨' },
            { id: 'lanyard', label: '3D Lanyard & Crop Gambar', icon: '🪪' },
            { id: 'nav', label: 'GooeyNav Liquid Bar', icon: '🧭' },
            { id: 'content', label: 'Tentang & Proyek', icon: '📁' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white shadow-md shadow-blue-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB 1: IDENTITAS & PROFIL ── */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profil Card */}
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                  01
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Profil & Identitas Utama</h2>
                  <p className="text-[11px] text-white/40">Teks yang tampil di banner utama (Hero)</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={config.general.fullName}
                  onChange={(e) => updateConfigValue('general.fullName', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Teks Brand / Logo Navigasi</label>
                <input
                  type="text"
                  value={config.general.brandLogo}
                  onChange={(e) => updateConfigValue('general.brandLogo', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Eyebrow Hero (Teks Kecil di Atas Judul)</label>
                <input
                  type="text"
                  value={config.general.eyebrow}
                  onChange={(e) => updateConfigValue('general.eyebrow', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Role / Headline Profesi</label>
                <input
                  type="text"
                  value={config.general.role}
                  onChange={(e) => updateConfigValue('general.role', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Bio Singkat (Paragraf Hero)</label>
                <textarea
                  rows={4}
                  value={config.general.lead}
                  onChange={(e) => updateConfigValue('general.lead', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Kontak & Social Media */}
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-[#18d3ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                  02
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Kontak, Tautan, & Footer</h2>
                  <p className="text-[11px] text-white/40">Alamat email dan profil sosial media</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Email Kontak Resmi</label>
                <input
                  type="email"
                  value={config.general.contactEmail}
                  onChange={(e) => updateConfigValue('general.contactEmail', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Link Download CV (URL atau Berkas)</label>
                <input
                  type="text"
                  value={config.general.cvUrl}
                  onChange={(e) => updateConfigValue('general.cvUrl', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">URL Profil GitHub</label>
                <input
                  type="text"
                  value={config.general.githubUrl}
                  onChange={(e) => updateConfigValue('general.githubUrl', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">URL Profil LinkedIn</label>
                <input
                  type="text"
                  value={config.general.linkedinUrl}
                  onChange={(e) => updateConfigValue('general.linkedinUrl', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Teks Copyright Footer</label>
                <input
                  type="text"
                  value={config.general.footerText}
                  onChange={(e) => updateConfigValue('general.footerText', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: 3D DEPTHTEXT ── */}
        {activeTab === 'depth' && (
          <div className="flex flex-col gap-6">
            {/* Live Visual Preview of DepthText */}
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 absolute top-4 left-6">
                Live Preview Visual Teks 3D
              </div>
              <div
                className="text-4xl md:text-5xl font-black tracking-tight select-none mt-4 transition-all"
                style={{
                  color: config.depthText.faceColor,
                  textShadow: `0 1px 0 ${config.depthText.depthColor}, 0 2px 0 ${config.depthText.depthColor}, 0 3px 0 ${config.depthText.depthColor}, 0 4px 0 ${config.depthText.depthColor}, 0 6px 12px rgba(0,0,0,0.6)`
                }}
              >
                {config.depthText.text || 'Anwail Khairat'}
              </div>
              <div className="text-[11px] text-white/40 mt-3 font-mono">
                Face: {config.depthText.faceColor} • Depth: {config.depthText.depthColor} • {config.depthText.layers} Layers
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Parameter Teks */}
              <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                    💎
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Teks & Warna Ekstrusi</h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Kata / Kalimat Judul 3D</label>
                  <input
                    type="text"
                    value={config.depthText.text}
                    onChange={(e) => updateConfigValue('depthText.text', e.target.value)}
                    className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Depan (Face)</label>
                    <div className="flex items-center gap-2 bg-[#080b14] p-1.5 rounded-xl border border-white/15">
                      <input
                        type="color"
                        value={config.depthText.faceColor}
                        onChange={(e) => updateConfigValue('depthText.faceColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={config.depthText.faceColor}
                        onChange={(e) => updateConfigValue('depthText.faceColor', e.target.value)}
                        className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Samping (Depth)</label>
                    <div className="flex items-center gap-2 bg-[#080b14] p-1.5 rounded-xl border border-white/15">
                      <input
                        type="color"
                        value={config.depthText.depthColor}
                        onChange={(e) => updateConfigValue('depthText.depthColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={config.depthText.depthColor}
                        onChange={(e) => updateConfigValue('depthText.depthColor', e.target.value)}
                        className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                    <span>Jumlah Lapisan Ekstrusi</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText.layers} layers</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="45"
                    value={config.depthText.layers}
                    onChange={(e) => updateConfigValue('depthText.layers', Number(e.target.value))}
                    className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                    <span>Ketebalan Jarak Antar Layer</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText.depth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="4.0"
                    step="0.1"
                    value={config.depthText.depth}
                    onChange={(e) => updateConfigValue('depthText.depth', Number(e.target.value))}
                    className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Fisika & Gerakan */}
              <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-[#18d3ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                    🕹️
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Fisika & Gerakan Parallax</h3>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                    <span>Sudut Kemiringan Maksimal (Tilt)</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText.tilt}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={config.depthText.tilt}
                    onChange={(e) => updateConfigValue('depthText.tilt', Number(e.target.value))}
                    className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                    <span>Sensasi Pegas saat Ditekan (HoverPush)</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText.hoverPush}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={config.depthText.hoverPush}
                    onChange={(e) => updateConfigValue('depthText.hoverPush', Number(e.target.value))}
                    className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  {[
                    { key: 'depthText.float', label: 'Efek Mengayun Halus (Float Motion)', checked: config.depthText.float },
                    { key: 'depthText.autoOrbit', label: 'Auto Orbit saat Kursor Mouse Diam', checked: config.depthText.autoOrbit },
                    { key: 'depthText.shadow', label: 'Bayangan 3D Lembut (Text Shadow)', checked: config.depthText.shadow },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-[#080b14] border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                      <span className="text-xs font-semibold text-white/80">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => updateConfigValue(item.key, e.target.checked)}
                        className="w-4 h-4 rounded accent-[#18d3ff] cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: WARNA & DARKVEIL ── */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                  🎨
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Palet Warna Utama Studio</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Aksen Primer (Sapphire Blue)</label>
                <div className="flex items-center gap-2 bg-[#080b14] p-2 rounded-xl border border-white/15">
                  <input
                    type="color"
                    value={config.theme.primaryColor}
                    onChange={(e) => updateConfigValue('theme.primaryColor', e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.theme.primaryColor}
                    onChange={(e) => updateConfigValue('theme.primaryColor', e.target.value)}
                    className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Aksen Sekunder (Cyan Glow)</label>
                <div className="flex items-center gap-2 bg-[#080b14] p-2 rounded-xl border border-white/15">
                  <input
                    type="color"
                    value={config.theme.accentCyan}
                    onChange={(e) => updateConfigValue('theme.accentCyan', e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.theme.accentCyan}
                    onChange={(e) => updateConfigValue('theme.accentCyan', e.target.value)}
                    className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Preset Palettes */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-2">Preset Palet Cepat:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Sapphire & Cyan', primary: '#2f77ff', accent: '#18d3ff' },
                    { name: 'Cyberpunk Violet', primary: '#8b5cf6', accent: '#ec4899' },
                    { name: 'Emerald Nebula', primary: '#10b981', accent: '#34d399' },
                    { name: 'Solar Amber', primary: '#f59e0b', accent: '#fbbf24' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        updateConfigValue('theme.primaryColor', preset.primary);
                        updateConfigValue('theme.accentCyan', preset.accent);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 flex items-center gap-2 transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-[#18d3ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                  🌌
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">DarkVeil WebGL Aurora Fluid</h3>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                  <span>Kecepatan Aliran Aurora Nebula</span>
                  <span className="text-[#18d3ff] font-mono">{config.theme.veilSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.theme.veilSpeed}
                  onChange={(e) => updateConfigValue('theme.veilSpeed', Number(e.target.value))}
                  className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                  <span>Intensitas Kecerahan (Brightness)</span>
                  <span className="text-[#18d3ff] font-mono">{config.theme.veilBrightness}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.05"
                  value={config.theme.veilBrightness}
                  onChange={(e) => updateConfigValue('theme.veilBrightness', Number(e.target.value))}
                  className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#080b14] border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                  <span className="text-xs font-semibold text-white/80">Reaksi Gelombang Ripple saat Kursor Bergerak</span>
                  <input
                    type="checkbox"
                    checked={config.theme.mouseInteraction}
                    onChange={(e) => updateConfigValue('theme.mouseInteraction', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#18d3ff] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: 3D LANYARD & CROP GAMBAR ── */}
        {activeTab === 'lanyard' && (
          <div className="flex flex-col gap-6">
            {/* Kartu Gambar dengan Alat Crop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gambar Depan */}
              <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl group">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white tracking-wide uppercase">Kartu ID (Sisi Depan)</h3>
                    <span className="text-[10px] font-mono text-white/40">Rasio 2:3</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-4">Tekstur foto depan kartu tanda pengenal 3D</p>

                  <div className="w-full aspect-[2/3] bg-[#080b14] rounded-2xl border border-white/15 overflow-hidden flex items-center justify-center relative mb-4 shadow-inner">
                    {config.lanyard.frontImage ? (
                      <img
                        src={config.lanyard.frontImage}
                        alt="Card Front"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-xs text-white/30">Belum ada gambar</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => triggerImagePicker('lanyard.frontImage', 'Potong Gambar Kartu Depan (2:3)', 'idcard')}
                    className="w-full bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>📁 Upload Foto Baru & Crop</span>
                  </button>

                  {config.lanyard.frontImage && (
                    <button
                      type="button"
                      onClick={() => triggerCropExisting('lanyard.frontImage', config.lanyard.frontImage, 'Sesuaikan Ulang Crop Kartu Depan', 'idcard')}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>✂️ Crop Ulang Gambar Ini</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Gambar Belakang */}
              <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl group">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white tracking-wide uppercase">Kartu ID (Sisi Belakang)</h3>
                    <span className="text-[10px] font-mono text-white/40">Rasio 2:3</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-4">Tekstur foto belakang kartu tanda pengenal 3D</p>

                  <div className="w-full aspect-[2/3] bg-[#080b14] rounded-2xl border border-white/15 overflow-hidden flex items-center justify-center relative mb-4 shadow-inner">
                    {config.lanyard.backImage ? (
                      <img
                        src={config.lanyard.backImage}
                        alt="Card Back"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-xs text-white/30">Belum ada gambar</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => triggerImagePicker('lanyard.backImage', 'Potong Gambar Kartu Belakang (2:3)', 'idcard')}
                    className="w-full bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>📁 Upload Foto Baru & Crop</span>
                  </button>

                  {config.lanyard.backImage && (
                    <button
                      type="button"
                      onClick={() => triggerCropExisting('lanyard.backImage', config.lanyard.backImage, 'Sesuaikan Ulang Crop Kartu Belakang', 'idcard')}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>✂️ Crop Ulang Gambar Ini</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Gambar Pita / Strap */}
              <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl group">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white tracking-wide uppercase">Pita Tali Lanyard (Strap)</h3>
                    <span className="text-[10px] font-mono text-white/40">Rasio 1:4</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-4">Tekstur pola pita tali gantungan lanyard</p>

                  <div className="w-full aspect-[2/3] bg-[#080b14] rounded-2xl border border-white/15 overflow-hidden flex items-center justify-center relative mb-4 shadow-inner">
                    {config.lanyard.strapImage ? (
                      <img
                        src={config.lanyard.strapImage}
                        alt="Strap Band"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-xs text-white/30">Belum ada gambar</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => triggerImagePicker('lanyard.strapImage', 'Potong Pita Tali Strap (1:4)', 'strap')}
                    className="w-full bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>📁 Upload Pita Baru & Crop</span>
                  </button>

                  {config.lanyard.strapImage && (
                    <button
                      type="button"
                      onClick={() => triggerCropExisting('lanyard.strapImage', config.lanyard.strapImage, 'Sesuaikan Ulang Crop Tali Strap', 'strap')}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>✂️ Crop Ulang Gambar Ini</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Warna & Fisika Lanyard */}
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-2.5 pb-2 mb-4 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                  ⚙️
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Finishing & Karakteristik Fisika Lanyard</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Pinggiran Kartu</label>
                  <div className="flex items-center gap-2 bg-[#080b14] p-2 rounded-xl border border-white/15">
                    <input
                      type="color"
                      value={config.lanyard.cardColor}
                      onChange={(e) => updateConfigValue('lanyard.cardColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.lanyard.cardColor}
                      onChange={(e) => updateConfigValue('lanyard.cardColor', e.target.value)}
                      className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Dasar Tali Lanyard</label>
                  <div className="flex items-center gap-2 bg-[#080b14] p-2 rounded-xl border border-white/15">
                    <input
                      type="color"
                      value={config.lanyard.strapColor}
                      onChange={(e) => updateConfigValue('lanyard.strapColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.lanyard.strapColor}
                      onChange={(e) => updateConfigValue('lanyard.strapColor', e.target.value)}
                      className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Tekstur Finishing</label>
                  <select
                    value={config.lanyard.finish}
                    onChange={(e) => updateConfigValue('lanyard.finish', e.target.value)}
                    className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-[#18d3ff]"
                  >
                    <option value="glossy">Glossy (Kilap Reflektif Mewah)</option>
                    <option value="matte">Matte (Doff Halus Minimalis)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: GOOEYNAV LIQUID BAR ── */}
        {activeTab === 'nav' && (
          <div className="max-w-3xl bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-6 shadow-xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                🧭
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Navigasi Cairan WebGL (GooeyNav)</h3>
                <p className="text-[11px] text-white/40">Menu header mengambang dengan efek lelehan cairan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Pill Navigasi Aktif</label>
                <div className="flex items-center gap-2 bg-[#080b14] p-2 rounded-xl border border-white/15">
                  <input
                    type="color"
                    value={config.gooeyNav.color}
                    onChange={(e) => updateConfigValue('gooeyNav.color', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.gooeyNav.color}
                    onChange={(e) => updateConfigValue('gooeyNav.color', e.target.value)}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Warna Teks di dalam Pill Aktif</label>
                <div className="flex items-center gap-2 bg-[#080b14] p-2 rounded-xl border border-white/15">
                  <input
                    type="color"
                    value={config.gooeyNav.activeTextColor || '#ffffff'}
                    onChange={(e) => updateConfigValue('gooeyNav.activeTextColor', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.gooeyNav.activeTextColor || '#ffffff'}
                    onChange={(e) => updateConfigValue('gooeyNav.activeTextColor', e.target.value)}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-white/70 mb-1.5">
                <span>Kelenturan Lelehan Cairan (Gooeyness)</span>
                <span className="text-[#18d3ff] font-mono">{config.gooeyNav.gooeyness}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={config.gooeyNav.gooeyness}
                onChange={(e) => updateConfigValue('gooeyNav.gooeyness', Number(e.target.value))}
                className="w-full accent-[#2f77ff] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ── TAB 6: ABOUT & PROYEK ── */}
        {activeTab === 'content' && (
          <div className="flex flex-col gap-6">
            {/* Bagian About Me */}
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-[#2f77ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                  📖
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Bagian Tentang Saya (About Section)</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Judul Heading</label>
                <input
                  type="text"
                  value={config.about.heading}
                  onChange={(e) => updateConfigValue('about.heading', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Paragraf Deskripsi Utama</label>
                <textarea
                  rows={3}
                  value={config.about.lead}
                  onChange={(e) => updateConfigValue('about.lead', e.target.value)}
                  className="w-full bg-[#080b14] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#18d3ff] resize-none leading-relaxed"
                />
              </div>

              {/* Skills Tags Manager */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-white/70 mb-2">Daftar Software & Skill Keahlian</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {config.about.skills?.map((skill: string) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2f77ff]/15 text-[#18d3ff] border border-[#2f77ff]/30"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-rose-400 transition-colors text-sm leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tambah keahlian (misal: Houdini, Cinema 4D)..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    className="flex-1 bg-[#080b14] border border-white/15 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors border border-white/10"
                  >
                    + Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* Proyek Portofolio */}
            <div className="bg-[#0f1424]/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#18d3ff]/20 text-[#18d3ff] flex items-center justify-center text-xs font-bold">
                    💼
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Daftar Karya & Proyek Unggulan</h3>
                    <p className="text-[11px] text-white/40">Kelola portofolio karya 3D, film pendek, dan riset</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddProject}
                  className="bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  + Tambah Proyek Baru
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {config.projects?.map((proj: any, idx: number) => (
                  <div
                    key={proj.id}
                    className="bg-[#080b14] border border-white/10 rounded-2xl p-5 flex flex-col gap-3 relative group hover:border-[#18d3ff]/40 transition-all shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-white/50">
                        Proyek #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(idx)}
                        className="text-white/30 hover:text-rose-400 p-1 text-xs transition-colors"
                        title="Hapus Proyek"
                      >
                        🗑️ Hapus
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">Judul Proyek</label>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].title = e.target.value;
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">Kategori</label>
                      <input
                        type="text"
                        value={proj.category}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].category = e.target.value;
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">Deskripsi Singkat</label>
                      <textarea
                        rows={2}
                        value={proj.description}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].description = e.target.value;
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#18d3ff] resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">Tags (Dipisah Koma)</label>
                      <input
                        type="text"
                        value={proj.tags?.join(', ') || ''}
                        onChange={(e) => {
                          const updated = [...config.projects];
                          updated[idx].tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                          setConfig({ ...config, projects: updated });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
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
