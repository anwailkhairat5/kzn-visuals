/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ImageCropperModal from '@/components/ImageCropperModal';
import { parseMediaUrl } from '@/utils/mediaParser';

type TabType =
  | 'general'
  | 'profile'
  | 'lanyard'
  | 'depth'
  | 'theme'
  | 'nav'
  | 'skills'
  | 'projects'
  | 'experience';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live Preview States
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // File upload & crop states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadField, setCurrentUploadField] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [cropTargetTitle, setCropTargetTitle] = useState('Potong & Sesuaikan Gambar');
  const [cropDefaultAspect, setCropDefaultAspect] = useState<'idcard' | 'strap' | 'square' | 'wide' | 'free'>('idcard');
  const [isUploading, setIsUploading] = useState(false);

  // Inputs for new items
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

        const res = await fetch(`/api/admin/config?t=${Date.now()}`, { cache: 'no-store' });
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

  // Broadcast config to live preview iframe whenever config changes
  useEffect(() => {
    if (!config) return;
    try {
      localStorage.setItem('kzn_portfolio_config', JSON.stringify(config));
    } catch {}

    if (previewIframeRef.current?.contentWindow) {
      previewIframeRef.current.contentWindow.postMessage(
        {
          type: 'KZN_PREVIEW_CONFIG',
          config: config
        },
        '*'
      );
    }
  }, [config]);

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
        setSaveMessage({
          text: '✓ ' + (json.message || 'Semua perubahan berhasil disimpan & disinkronkan ke Cloud!'),
          type: 'success'
        });
      } else {
        setSaveMessage({ text: `Gagal menyimpan: ${json.error}`, type: 'error' });
      }
    } catch (err: any) {
      setSaveMessage({ text: `Terjadi error: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 6000);
    }
  };

  const updateConfigValue = (pathStr: string, value: any) => {
    const parts = pathStr.split('.');
    setConfig((prev: any) => {
      const next = { ...prev };
      let curr = next;
      for (let i = 0; i < parts.length - 1; i++) {
        curr[parts[i]] = { ...(curr[parts[i]] || {}) };
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      return next;
    });
  };

  // Direct HD File Upload (No crop, preserves original 100% 4K/HD quality)
  const triggerDirectUpload = (fieldPath: string) => {
    setCurrentUploadField(fieldPath);
    directFileInputRef.current?.click();
  };

  const onDirectFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadField) return;

    try {
      setIsUploading(true);
      // Instant local preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateConfigValue(currentUploadField, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Upload raw file to API
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success && (json.url || json.githubUrl)) {
        const finalUrl = json.githubUrl || json.url;
        updateConfigValue(currentUploadField, finalUrl);
        setSaveMessage({
          text: '✓ Foto HD asli berhasil diunggah dengan resolusi penuh! Klik "Simpan Perubahan" untuk sinkronisasi.',
          type: 'success'
        });
      } else {
        setSaveMessage({ text: '✓ Foto diterapkan lokal.', type: 'success' });
      }
    } catch (err: any) {
      setSaveMessage({ text: 'Gagal upload: ' + err.message, type: 'error' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Trigger file picker for cropping
  const triggerCropUpload = (fieldPath: string, title: string, aspect: 'idcard' | 'strap' | 'square' | 'wide' | 'free' = 'idcard') => {
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
  const triggerCropExisting = (fieldPath: string, currentImgUrl: string, title: string, aspect: 'idcard' | 'strap' | 'square' | 'wide' | 'free' = 'idcard') => {
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
        const finalUrl = json.githubUrl || json.url || croppedDataUrl;
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

  // Add skill
  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const currentSkills = config.about?.skills || [];
    if (!currentSkills.includes(newSkillInput.trim())) {
      updateConfigValue('about.skills', [...currentSkills, newSkillInput.trim()]);
    }
    setNewSkillInput('');
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove: string) => {
    const currentSkills = config.about?.skills || [];
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
      projects: [newProj, ...(prev.projects || [])]
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

  // Add Experience
  const handleAddExperience = () => {
    const newExp = {
      id: `exp-${Date.now()}`,
      title: 'Posisi / Proyek Baru',
      subtitle: 'Instansi / Organisasi',
      period: '2025 — Sekarang',
      description: 'Deskripsi tanggung jawab, proses kerja, dan pencapaian.',
      tag: 'New Role'
    };
    setConfig((prev: any) => ({
      ...prev,
      experience: [newExp, ...(prev.experience || [])]
    }));
  };

  // Delete Experience
  const handleDeleteExperience = (index: number) => {
    if (!confirm('Hapus pengalaman ini?')) return;
    setConfig((prev: any) => ({
      ...prev,
      experience: prev.experience.filter((_: any, i: number) => i !== index)
    }));
  };

  // Add Certificate
  const handleAddCertificate = () => {
    const newCert = {
      id: `cert-${Date.now()}`,
      title: 'Nama Sertifikat Baru',
      issuer: 'Lembaga Penerbit Sertifikasi',
      period: '2025',
      description: 'Deskripsi kompetensi yang diverifikasi dalam sertifikasi.',
      tag: 'Certified',
      link: '#'
    };
    setConfig((prev: any) => ({
      ...prev,
      certificates: [newCert, ...(prev.certificates || [])]
    }));
  };

  // Delete Certificate
  const handleDeleteCertificate = (index: number) => {
    if (!confirm('Hapus sertifikat ini?')) return;
    setConfig((prev: any) => ({
      ...prev,
      certificates: prev.certificates.filter((_: any, i: number) => i !== index)
    }));
  };

  // Add About Stat Badge
  const handleAddAboutStat = () => {
    const newStat = {
      id: `stat-${Date.now()}`,
      number: '10+',
      label: 'Kategori Keahlian'
    };
    const currentStats = config.about?.stats || [];
    updateConfigValue('about.stats', [...currentStats, newStat]);
  };

  // Delete About Stat Badge
  const handleDeleteAboutStat = (index: number) => {
    const currentStats = config.about?.stats || [];
    updateConfigValue('about.stats', currentStats.filter((_: any, i: number) => i !== index));
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
            <p className="text-xs text-white/50 mt-1 font-medium">Panel Admin CMS & Live Visual Configurator</p>
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
    <div className="min-h-screen bg-[#07090e] text-[#f4f6ff] selection:bg-[#2f77ff]/30 flex flex-col">
      {/* Hidden File Picker for Crop / Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />
      {/* Hidden File Picker for Direct Full-HD Upload (No Compression) */}
      <input
        ref={directFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onDirectFileSelected}
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
      <header className="sticky top-0 z-40 bg-[#0d101c]/95 backdrop-blur-xl border-b border-white/10 px-4 lg:px-6 py-3 shadow-xl">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2f77ff] to-[#18d3ff] flex items-center justify-center font-black text-black shadow-md shadow-blue-500/20">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white">KZN Studio CMS</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-white/40 font-medium">Visual Configurator & Asset Manager</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Live Preview Toggle */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                showPreview
                  ? 'bg-[#18d3ff]/20 text-[#18d3ff] border-[#18d3ff]/40 shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
              title="Tampilkan atau sembunyikan preview langsung"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{showPreview ? 'Tutup Preview' : 'Buka Preview'}</span>
            </button>

            {/* Link to Main Site */}
            <Link
              href="/"
              target="_blank"
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-white/80 hover:text-white"
            >
              <span>Website</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#2f77ff] to-[#18d3ff] text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Save Notification Banner */}
        {saveMessage && (
          <div
            className={`mt-2.5 px-4 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              saveMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{saveMessage.text}</span>
            <button onClick={() => setSaveMessage(null)} className="text-white/40 hover:text-white ml-2 text-sm">
              ✕
            </button>
          </div>
        )}
      </header>

      {/* ── MOBILE TAB SELECTOR (DROPDOWN) ── */}
      <div className="lg:hidden bg-[#0a0d18] border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3 z-30">
        <label className="text-xs font-bold text-[#18d3ff] whitespace-nowrap flex items-center gap-1.5">
          <span>⚙️ Bagian:</span>
        </label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabType)}
          className="flex-1 bg-[#121829] border border-[#18d3ff]/30 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#18d3ff] shadow-inner"
        >
          <option value="profile">🪪 About Me & 3D ProfileCard (Foto & Bio)</option>
          <option value="lanyard">🪢 3D Lanyard Card (Kartu Gantung 3D)</option>
          <option value="general">👤 Identitas, Teks Hero & Kontak</option>
          <option value="depth">💎 3D DepthText (Judul Berkedalaman 3D)</option>
          <option value="theme">🌌 Warna & DarkVeil Background</option>
          <option value="nav">🔘 GooeyNav Menu Navigasi</option>
          <option value="skills">🛠 Skills & Keahlian</option>
          <option value="projects">🚀 Projects (Portofolio Karya)</option>
          <option value="experience">💼 Pengalaman & Sertifikat</option>
        </select>
      </div>

      {/* ── DESKTOP & TABLET NAVIGATION TABS BAR ── */}
      <div className="w-full bg-[#0d1222] border-b border-white/15 px-4 lg:px-6 py-2.5 overflow-x-auto flex items-center gap-2 z-30 shadow-lg shrink-0 scrollbar-thin scrollbar-thumb-white/20">
        {[
          { id: 'profile', label: '🪪 About & ProfileCard', desc: 'Kartu 3D, foto & bio' },
          { id: 'lanyard', label: '🪢 3D Lanyard Card', desc: 'Kartu gantung 3D' },
          { id: 'general', label: '👤 Identitas & Teks Hero', desc: 'Nama, bio & kontak' },
          { id: 'depth', label: '💎 3D DepthText', desc: 'Judul berkedalaman 3D' },
          { id: 'theme', label: '🌌 Warna & DarkVeil', desc: 'Warna tema & background' },
          { id: 'nav', label: '🔘 GooeyNav', desc: 'Navigasi menu utama' },
          { id: 'skills', label: '🛠 Skills', desc: 'Daftar keahlian' },
          { id: 'projects', label: '🚀 Projects', desc: 'Portofolio karya' },
          { id: 'experience', label: '💼 Pengalaman & Sertifikat', desc: 'Pengalaman & sertifikasi' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex flex-col items-start gap-0.5 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#2f77ff]/30 to-[#18d3ff]/30 text-[#18d3ff] border border-[#18d3ff]/60 shadow-md shadow-blue-500/20 ring-1 ring-[#18d3ff]/40'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-normal opacity-50">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ── MAIN WORKSPACE: SPLIT VIEW (EDITOR + LIVE PREVIEW) ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT PANE: CONFIGURATION EDITOR */}
        <div
          className={`flex-1 overflow-y-auto p-4 lg:p-6 transition-all ${
            showPreview ? 'lg:max-w-[55%] xl:max-w-[50%]' : 'w-full max-w-6xl mx-auto'
          }`}
        >
          {/* TAB 1: ABOUT ME & 3D PROFILECARD */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-[#101422] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span>🪪 Foto Utama ProfileCard</span>
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Ubah foto potret, atur posisi fokus, dan hilangkan bayangan hitam bawah jika foto tampak terpotong setengah.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Photo Preview & Upload Buttons */}
                  <div className="flex flex-col items-center p-4 bg-[#080a12] border border-white/10 rounded-xl">
                    <div className="w-44 h-56 rounded-xl overflow-hidden border-2 border-white/20 bg-[#161a29] relative mb-3 shadow-xl">
                      {config.profileCard?.avatarUrl ? (
                        <img
                          src={config.profileCard.avatarUrl}
                          alt="Profile Portrait"
                          className="w-full h-full"
                          style={{
                            objectFit: config.profileCard.photoFit || 'cover',
                            objectPosition: config.profileCard.photoPosition || 'center 20%'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                          Belum ada foto
                        </div>
                      )}
                      {/* Simulated bottom scrim preview */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(to top, rgba(0,0,0,${config.profileCard?.scrimOpacity ?? 0.35}) 0%, transparent 60%)`
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center w-full">
                      <button
                        type="button"
                        onClick={() => triggerCropUpload('profileCard.avatarUrl', 'Potong Foto ProfileCard', 'free')}
                        disabled={isUploading}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-[#2f77ff] hover:bg-[#3d82ff] text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Ganti & Potong Foto</span>
                      </button>

                      {config.profileCard?.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => triggerCropExisting('profileCard.avatarUrl', config.profileCard.avatarUrl, 'Sesuaikan Ulang Foto ProfileCard', 'free')}
                          className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                          </svg>
                          <span>Potong Ulang</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fitting & Scrim Adjustments */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                        Kerapian Tampilan Foto (Photo Fit)
                      </label>
                      <select
                        value={config.profileCard?.photoFit || 'cover'}
                        onChange={(e) => updateConfigValue('profileCard.photoFit', e.target.value)}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                      >
                        <option value="cover">Cover (Penuh memenuhi kartu — Rekomendasi)</option>
                        <option value="contain">Contain (Utuh semua terlihat tanpa terpotong)</option>
                        <option value="fill">Fill (Regang mengikuti kartu)</option>
                      </select>
                      <p className="text-[10px] text-white/40 mt-1">
                        Pilih &quot;Contain&quot; jika kamu ingin seluruh foto terlihat utuh tanpa ada bagian yang terpotong.
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                        Posisi Fokus Foto (Photo Position)
                      </label>
                      <select
                        value={config.profileCard?.photoPosition || 'center 20%'}
                        onChange={(e) => updateConfigValue('profileCard.photoPosition', e.target.value)}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                      >
                        <option value="center top">Atas (Fokus wajah / kepala)</option>
                        <option value="center 15%">Atas Halus (15% dari atas — Ideal)</option>
                        <option value="center 25%">Sedikit ke Atas (25%)</option>
                        <option value="center center">Tengah-tengah (Center)</option>
                        <option value="center bottom">Bawah (Fokus bawah)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                          Kegelapan Bayangan Bawah (Scrim Opacity)
                        </label>
                        <span className="text-xs font-mono text-[#18d3ff]">
                          {Math.round((config.profileCard?.scrimOpacity ?? 0.35) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.profileCard?.scrimOpacity ?? 0.35}
                        onChange={(e) => updateConfigValue('profileCard.scrimOpacity', parseFloat(e.target.value))}
                        className="w-full accent-[#18d3ff]"
                      />
                      <p className="text-[10px] text-emerald-400 mt-1">
                        💡 Turunkan slider ini ke 0% atau 15% jika kamu merasa bagian bawah gambar terlalu gelap / tertutup bayangan hitam.
                      </p>
                    </div>

                    {/* Mini Avatar Upload */}
                    <div className="pt-2 border-t border-white/10">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                        Foto Mini Avatar (Bulat di Footer Kartu)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/20 bg-black flex-shrink-0">
                          {config.profileCard?.miniAvatarUrl ? (
                            <img src={config.profileCard.miniAvatarUrl} alt="Mini avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40">1:1</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerCropUpload('profileCard.miniAvatarUrl', 'Potong Mini Avatar Bulat', 'square')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                        >
                          Ganti Mini Avatar (1:1)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Identitas ProfileCard */}
              <div className="bg-[#101422] border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-black text-white mb-4 pb-2 border-b border-white/10">
                  Data Identitas & Footer ProfileCard
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Nama di Kartu
                    </label>
                    <input
                      type="text"
                      value={config.profileCard?.name || ''}
                      onChange={(e) => updateConfigValue('profileCard.name', e.target.value)}
                      placeholder="Anwail Khairat"
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Jabatan / Role di Kartu
                    </label>
                    <input
                      type="text"
                      value={config.profileCard?.title || ''}
                      onChange={(e) => updateConfigValue('profileCard.title', e.target.value)}
                      placeholder="Multimedia Engineering Student"
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Handle Username (tanpa @)
                    </label>
                    <input
                      type="text"
                      value={config.profileCard?.handle || ''}
                      onChange={(e) => updateConfigValue('profileCard.handle', e.target.value)}
                      placeholder="anwailkhairat5"
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Status Badge (cth: Open to Work, Online)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.profileCard?.status || ''}
                        onChange={(e) => updateConfigValue('profileCard.status', e.target.value)}
                        placeholder="Open to Work"
                        className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                      />
                      <input
                        type="color"
                        value={config.profileCard?.statusColor || '#22c55e'}
                        onChange={(e) => updateConfigValue('profileCard.statusColor', e.target.value)}
                        className="w-9 h-9 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                        title="Pilih warna titik status"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Teks Tombol Kontak di Kartu
                    </label>
                    <input
                      type="text"
                      value={config.profileCard?.contactText || ''}
                      onChange={(e) => updateConfigValue('profileCard.contactText', e.target.value)}
                      placeholder="Email Me"
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Tema Kartu
                    </label>
                    <select
                      value={config.profileCard?.theme || 'dark'}
                      onChange={(e) => updateConfigValue('profileCard.theme', e.target.value)}
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    >
                      <option value="dark">Dark Theme (Futuristik Gelap)</option>
                      <option value="light">Light Theme (Terang)</option>
                    </select>
                  </div>
                </div>

                {/* 3D Hologram Sliders */}
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70 font-semibold">Efek Hologram Foil</span>
                      <span className="text-[#18d3ff] font-mono">{config.profileCard?.holo ?? 0.85}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.profileCard?.holo ?? 0.85}
                      onChange={(e) => updateConfigValue('profileCard.holo', parseFloat(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70 font-semibold">Pantulan Glare</span>
                      <span className="text-[#18d3ff] font-mono">{config.profileCard?.glare ?? 0.55}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.profileCard?.glare ?? 0.55}
                      onChange={(e) => updateConfigValue('profileCard.glare', parseFloat(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70 font-semibold">Sudut Miring (Tilt)</span>
                      <span className="text-[#18d3ff] font-mono">{config.profileCard?.tiltStrength ?? 14}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={config.profileCard?.tiltStrength ?? 14}
                      onChange={(e) => updateConfigValue('profileCard.tiltStrength', parseInt(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Teks Deskripsi About Me */}
              <div className="bg-[#101422] border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-black text-white mb-4 pb-2 border-b border-white/10">
                  Teks Deskripsi Bagian About Me
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                        Eyebrow (Teks Kecil di Atas Judul)
                      </label>
                      <input
                        type="text"
                        value={config.about?.eyebrow || 'ABOUT THE CREATOR'}
                        onChange={(e) => updateConfigValue('about.eyebrow', e.target.value)}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                        Judul Heading (cth: About Me)
                      </label>
                      <input
                        type="text"
                        value={config.about?.heading || 'About Me'}
                        onChange={(e) => updateConfigValue('about.heading', e.target.value)}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Paragraf Utama (Lead Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={config.about?.lead || ''}
                      onChange={(e) => updateConfigValue('about.lead', e.target.value)}
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Paragraf Penjelas (Subtext Bio)
                    </label>
                    <textarea
                      rows={2}
                      value={config.about?.sub || ''}
                      onChange={(e) => updateConfigValue('about.sub', e.target.value)}
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                    />
                  </div>

                  {/* Badges Statistik Singkat */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                        Kartu Statistik Singkat (Stats Badges)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddAboutStat}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#2f77ff]/30 text-[#18d3ff] hover:bg-[#2f77ff]/50 transition-all"
                      >
                        + Tambah Statistik
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(config.about?.stats || []).map((stat: any, idx: number) => (
                        <div key={stat.id || idx} className="p-3 bg-[#080a12] border border-white/10 rounded-xl relative group">
                          <button
                            type="button"
                            onClick={() => handleDeleteAboutStat(idx)}
                            className="absolute top-2 right-2 text-white/30 hover:text-rose-400 text-xs font-bold"
                            title="Hapus statistik ini"
                          >
                            ✕
                          </button>
                          <input
                            type="text"
                            value={stat.number || ''}
                            onChange={(e) => {
                              const updated = [...(config.about?.stats || [])];
                              updated[idx] = { ...updated[idx], number: e.target.value };
                              updateConfigValue('about.stats', updated);
                            }}
                            placeholder="3D / AI / Film"
                            className="w-full font-black text-sm text-[#18d3ff] bg-transparent border-b border-white/15 focus:outline-none focus:border-[#18d3ff] pb-1 mb-1"
                          />
                          <input
                            type="text"
                            value={stat.label || ''}
                            onChange={(e) => {
                              const updated = [...(config.about?.stats || [])];
                              updated[idx] = { ...updated[idx], label: e.target.value };
                              updateConfigValue('about.stats', updated);
                            }}
                            placeholder="Kategori / Label"
                            className="w-full text-[11px] text-white/70 bg-transparent border-b border-transparent focus:border-white/20 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D LANYARD CARD */}
          {activeTab === 'lanyard' && (
            <div className="space-y-6">
              <div className="bg-[#101422] border border-white/10 rounded-2xl p-5">
                <h2 className="text-base font-black text-white mb-2">🪢 Gambar & Tampilan 3D Lanyard Card</h2>
                <p className="text-xs text-white/50 mb-5">
                  Ganti gambar depan, belakang, dan pita lanyard dengan alat pemotong gambar (crop) bawaan.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Front Image */}
                  <div className="p-4 bg-[#080a12] border border-white/10 rounded-xl flex flex-col items-center">
                    <span className="text-[11px] font-bold text-white/70 mb-2">Sisi Depan Kartu (Front)</span>
                    <div className="w-28 h-40 rounded-lg overflow-hidden border border-white/20 bg-black mb-3">
                      <img src={config.lanyard?.frontImage || '/card-front.png'} alt="Front" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => triggerCropUpload('lanyard.frontImage', 'Potong Gambar Depan Lanyard', 'idcard')}
                        className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg bg-[#2f77ff] hover:bg-[#3d82ff] text-white transition-all shadow-md shadow-blue-500/20"
                      >
                        ✂️ Potong (HD)
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDirectUpload('lanyard.frontImage')}
                        className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition-all"
                      >
                        📁 File Asli HD
                      </button>
                    </div>
                  </div>

                  {/* Back Image */}
                  <div className="p-4 bg-[#080a12] border border-white/10 rounded-xl flex flex-col items-center">
                    <span className="text-[11px] font-bold text-white/70 mb-2">Sisi Belakang Kartu (Back)</span>
                    <div className="w-28 h-40 rounded-lg overflow-hidden border border-white/20 bg-black mb-3">
                      <img src={config.lanyard?.backImage || '/card-back.png'} alt="Back" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => triggerCropUpload('lanyard.backImage', 'Potong Gambar Belakang Lanyard', 'idcard')}
                        className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg bg-[#2f77ff] hover:bg-[#3d82ff] text-white transition-all shadow-md shadow-blue-500/20"
                      >
                        ✂️ Potong (HD)
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDirectUpload('lanyard.backImage')}
                        className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition-all"
                      >
                        📁 File Asli HD
                      </button>
                    </div>
                  </div>

                  {/* Strap Image */}
                  <div className="p-4 bg-[#080a12] border border-white/10 rounded-xl flex flex-col items-center">
                    <span className="text-[11px] font-bold text-white/70 mb-2">Tekstur Tali Strap</span>
                    <div className="w-28 h-40 rounded-lg overflow-hidden border border-white/20 bg-black mb-3 flex items-center justify-center p-2">
                      <img src={config.lanyard?.strapImage || '/band.png'} alt="Strap" className="w-12 h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => triggerCropUpload('lanyard.strapImage', 'Potong Tekstur Tali Lanyard', 'strap')}
                        className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg bg-[#2f77ff] hover:bg-[#3d82ff] text-white transition-all shadow-md shadow-blue-500/20"
                      >
                        ✂️ Potong (HD)
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDirectUpload('lanyard.strapImage')}
                        className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition-all"
                      >
                        📁 File Asli HD
                      </button>
                    </div>
                  </div>
                </div>

                {/* Colors & Physics */}
                <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Warna Pinggiran Kartu
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.lanyard?.cardColor || '#0d6f9d'}
                        onChange={(e) => updateConfigValue('lanyard.cardColor', e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.lanyard?.cardColor || '#0d6f9d'}
                        onChange={(e) => updateConfigValue('lanyard.cardColor', e.target.value)}
                        className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                      Warna Dasar Pita Tali (Strap)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.lanyard?.strapColor || '#04050d'}
                        onChange={(e) => updateConfigValue('lanyard.strapColor', e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.lanyard?.strapColor || '#04050d'}
                        onChange={(e) => updateConfigValue('lanyard.strapColor', e.target.value)}
                        className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">Gravitasi Kartu</span>
                      <span className="text-[#18d3ff] font-mono">{config.lanyard?.gravity ?? 1}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={config.lanyard?.gravity ?? 1}
                      onChange={(e) => updateConfigValue('lanyard.gravity', parseFloat(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">Redaman (Damping)</span>
                      <span className="text-[#18d3ff] font-mono">{config.lanyard?.damping ?? 0.5}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={config.lanyard?.damping ?? 0.5}
                      onChange={(e) => updateConfigValue('lanyard.damping', parseFloat(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">Kelenturan (Elasticity)</span>
                      <span className="text-[#18d3ff] font-mono">{config.lanyard?.elasticity ?? 0.5}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.lanyard?.elasticity ?? 0.5}
                      onChange={(e) => updateConfigValue('lanyard.elasticity', parseFloat(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">Hembusan Angin (Breeze)</span>
                      <span className="text-[#18d3ff] font-mono">{config.lanyard?.breeze ?? 0.4}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.lanyard?.breeze ?? 0.4}
                      onChange={(e) => updateConfigValue('lanyard.breeze', parseFloat(e.target.value))}
                      className="w-full accent-[#18d3ff]"
                    />
                  </div>
                </div>
                {/* UKURAN & PANJANG TALI RESPOCIF */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                    📏 Ukuran & Panjang Tali Lanyard (Responsif)
                  </h3>
                  <p className="text-[11px] text-white/50 mb-4">
                    Atur besar kartu dan panjang gantungan tali secara terpisah untuk tampilan HP / iPad dan Laptop.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">Ukuran Kartu (HP/iPad)</span>
                        <span className="text-[#18d3ff] font-mono">{config.lanyard?.cardSizeMobile ?? 0.52}</span>
                      </div>
                      <input
                        type="range"
                        min="0.35"
                        max="0.80"
                        step="0.02"
                        value={config.lanyard?.cardSizeMobile ?? 0.52}
                        onChange={(e) => updateConfigValue('lanyard.cardSizeMobile', parseFloat(e.target.value))}
                        className="w-full accent-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">Panjang Tali (HP/iPad)</span>
                        <span className="text-[#18d3ff] font-mono">{config.lanyard?.strapLengthMobile ?? 0.34}</span>
                      </div>
                      <input
                        type="range"
                        min="0.15"
                        max="0.60"
                        step="0.02"
                        value={config.lanyard?.strapLengthMobile ?? 0.34}
                        onChange={(e) => updateConfigValue('lanyard.strapLengthMobile', parseFloat(e.target.value))}
                        className="w-full accent-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">Ukuran Kartu (Laptop)</span>
                        <span className="text-[#18d3ff] font-mono">{config.lanyard?.cardSizeDesktop ?? 0.38}</span>
                      </div>
                      <input
                        type="range"
                        min="0.30"
                        max="0.70"
                        step="0.02"
                        value={config.lanyard?.cardSizeDesktop ?? 0.38}
                        onChange={(e) => updateConfigValue('lanyard.cardSizeDesktop', parseFloat(e.target.value))}
                        className="w-full accent-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">Panjang Tali (Laptop)</span>
                        <span className="text-[#18d3ff] font-mono">{config.lanyard?.strapLengthDesktop ?? 0.28}</span>
                      </div>
                      <input
                        type="range"
                        min="0.15"
                        max="0.50"
                        step="0.02"
                        value={config.lanyard?.strapLengthDesktop ?? 0.28}
                        onChange={(e) => updateConfigValue('lanyard.strapLengthDesktop', parseFloat(e.target.value))}
                        className="w-full accent-[#18d3ff]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">Posisi Kanan Kartu (Laptop)</span>
                        <span className="text-[#18d3ff] font-mono">{config.lanyard?.anchorDesktop ?? 0.74}</span>
                      </div>
                      <input
                        type="range"
                        min="0.65"
                        max="0.90"
                        step="0.01"
                        value={config.lanyard?.anchorDesktop ?? 0.74}
                        onChange={(e) => updateConfigValue('lanyard.anchorDesktop', parseFloat(e.target.value))}
                        className="w-full accent-[#18d3ff]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3D DEPTHTEXT */}
          {activeTab === 'depth' && (
            <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="text-base font-black text-white">💎 3D DepthText (Judul Berkedalaman 3D)</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Atur teks judul 3D pada halaman hero, warna gradasi ekstrusi, dan efek interaksi kursor.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                  Teks Judul 3D
                </label>
                <input
                  type="text"
                  value={config.depthText?.text || ''}
                  onChange={(e) => updateConfigValue('depthText.text', e.target.value)}
                  placeholder="Anwail Khairat"
                  className="w-full bg-[#080a12] border border-white/15 rounded-xl px-4 py-2.5 text-sm font-black text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Warna Depan (Face Color)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.depthText?.faceColor || '#00e1ff'}
                      onChange={(e) => updateConfigValue('depthText.faceColor', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.depthText?.faceColor || '#00e1ff'}
                      onChange={(e) => updateConfigValue('depthText.faceColor', e.target.value)}
                      className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Warna Kedalaman (Depth Color)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.depthText?.depthColor || '#822eff'}
                      onChange={(e) => updateConfigValue('depthText.depthColor', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.depthText?.depthColor || '#822eff'}
                      onChange={(e) => updateConfigValue('depthText.depthColor', e.target.value)}
                      className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Jumlah Layer Ekstrusi</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText?.layers ?? 30}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="2"
                    value={config.depthText?.layers ?? 30}
                    onChange={(e) => updateConfigValue('depthText.layers', parseInt(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Ketebalan Kedalaman</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText?.depth ?? 2}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.25"
                    value={config.depthText?.depth ?? 2}
                    onChange={(e) => updateConfigValue('depthText.depth', parseFloat(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Sudut Miring (Tilt)</span>
                    <span className="text-[#18d3ff] font-mono">{config.depthText?.tilt ?? 7.5}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={config.depthText?.tilt ?? 7.5}
                    onChange={(e) => updateConfigValue('depthText.tilt', parseFloat(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={config.depthText?.float ?? true}
                    onChange={(e) => updateConfigValue('depthText.float', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#18d3ff]"
                  />
                  <span>Aktifkan Efek Mengayun Halus (Float Motion)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={config.depthText?.autoOrbit ?? true}
                    onChange={(e) => updateConfigValue('depthText.autoOrbit', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#18d3ff]"
                  />
                  <span>Aktifkan Auto Orbit saat Mouse Diam</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: IDENTITAS & UMUM */}
          {activeTab === 'general' && (
            <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-black text-white pb-2 border-b border-white/10">
                👤 Identitas Pribadi & Informasi Umum
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={config.general?.fullName || ''}
                    onChange={(e) => updateConfigValue('general.fullName', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Logo / Brand Name (di Navbar)
                  </label>
                  <input
                    type="text"
                    value={config.general?.brandLogo || ''}
                    onChange={(e) => updateConfigValue('general.brandLogo', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Teks Sambutan Atas (Eyebrow)
                  </label>
                  <input
                    type="text"
                    value={config.general?.eyebrow || ''}
                    onChange={(e) => updateConfigValue('general.eyebrow', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Peran / Status Utama (Hero Role)
                  </label>
                  <input
                    type="text"
                    value={config.general?.role || ''}
                    onChange={(e) => updateConfigValue('general.role', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                  Paragraf Pengantar Utama (Hero Lead)
                </label>
                <textarea
                  rows={3}
                  value={config.general?.lead || ''}
                  onChange={(e) => updateConfigValue('general.lead', e.target.value)}
                  className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    value={config.general?.contactEmail || ''}
                    onChange={(e) => updateConfigValue('general.contactEmail', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Link Download CV
                  </label>
                  <input
                    type="text"
                    value={config.general?.cvUrl || ''}
                    onChange={(e) => updateConfigValue('general.cvUrl', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    WhatsApp URL (Pesan Otomatis)
                  </label>
                  <input
                    type="text"
                    value={config.general?.whatsappUrl || ''}
                    placeholder="https://wa.me/6285136304385?text=Halo..."
                    onChange={(e) => updateConfigValue('general.whatsappUrl', e.target.value)}
                    className="w-full bg-[#080a12] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-pink-400 block mb-1">
                    Instagram URL (@kzn.visuals)
                  </label>
                  <input
                    type="text"
                    value={config.general?.instagramUrl || ''}
                    placeholder="https://www.instagram.com/kzn.visuals"
                    onChange={(e) => updateConfigValue('general.instagramUrl', e.target.value)}
                    className="w-full bg-[#080a12] border border-pink-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#18d3ff] block mb-1">
                    Lynk.id / Linktree URL
                  </label>
                  <input
                    type="text"
                    value={config.general?.lynkUrl || ''}
                    placeholder="https://lynk.id/kznvisuals"
                    onChange={(e) => updateConfigValue('general.lynkUrl', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={config.general?.phone || ''}
                    placeholder="085136304385"
                    onChange={(e) => updateConfigValue('general.phone', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Kota / Domisili
                  </label>
                  <input
                    type="text"
                    value={config.general?.location || ''}
                    placeholder="Lhokseumawe, Aceh"
                    onChange={(e) => updateConfigValue('general.location', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Link Profil LinkedIn
                  </label>
                  <input
                    type="text"
                    value={config.general?.linkedinUrl || ''}
                    onChange={(e) => updateConfigValue('general.linkedinUrl', e.target.value)}
                    className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                  Teks Hak Cipta Footer
                </label>
                <input
                  type="text"
                  value={config.general?.footerText || ''}
                  onChange={(e) => updateConfigValue('general.footerText', e.target.value)}
                  className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                />
              </div>
            </div>
          )}

          {/* TAB 5: WARNA & DARKVEIL */}
          {activeTab === 'theme' && (
            <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-black text-white pb-2 border-b border-white/10">
                🌌 Warna Tema & DarkVeil WebGL Background
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Warna Primer Website (Primary Theme)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.theme?.primaryColor || '#2f77ff'}
                      onChange={(e) => updateConfigValue('theme.primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme?.primaryColor || '#2f77ff'}
                      onChange={(e) => updateConfigValue('theme.primaryColor', e.target.value)}
                      className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Warna Aksen Neon (Cyan Glow)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.theme?.accentCyan || '#18d3ff'}
                      onChange={(e) => updateConfigValue('theme.accentCyan', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme?.accentCyan || '#18d3ff'}
                      onChange={(e) => updateConfigValue('theme.accentCyan', e.target.value)}
                      className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/10">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Kecepatan Aliran Veil</span>
                    <span className="text-[#18d3ff] font-mono">{config.theme?.veilSpeed ?? 0.45}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={config.theme?.veilSpeed ?? 0.45}
                    onChange={(e) => updateConfigValue('theme.veilSpeed', parseFloat(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Intensitas Kilau (Glow)</span>
                    <span className="text-[#18d3ff] font-mono">{config.theme?.veilGlow ?? 0.55}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={config.theme?.veilGlow ?? 0.55}
                    onChange={(e) => updateConfigValue('theme.veilGlow', parseFloat(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Tingkat Kecerahan</span>
                    <span className="text-[#18d3ff] font-mono">{config.theme?.veilBrightness ?? 1.15}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={config.theme?.veilBrightness ?? 1.15}
                    onChange={(e) => updateConfigValue('theme.veilBrightness', parseFloat(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={config.theme?.mouseInteraction ?? true}
                    onChange={(e) => updateConfigValue('theme.mouseInteraction', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#18d3ff]"
                  />
                  <span>Interaksi Gelombang Reaktif terhadap Gerakan Mouse</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: GOOEYNAV */}
          {activeTab === 'nav' && (
            <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-black text-white pb-2 border-b border-white/10">
                🔘 Pengaturan Navigasi GooeyNav
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Warna Tombol Aktif
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.gooeyNav?.color || '#2f77ff'}
                      onChange={(e) => updateConfigValue('gooeyNav.color', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.gooeyNav?.color || '#2f77ff'}
                      onChange={(e) => updateConfigValue('gooeyNav.color', e.target.value)}
                      className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
                    Warna Teks Tombol Aktif
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.gooeyNav?.activeTextColor || '#ffffff'}
                      onChange={(e) => updateConfigValue('gooeyNav.activeTextColor', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.gooeyNav?.activeTextColor || '#ffffff'}
                      onChange={(e) => updateConfigValue('gooeyNav.activeTextColor', e.target.value)}
                      className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Efek Gelombang (Gooeyness)</span>
                    <span className="text-[#18d3ff] font-mono">{config.gooeyNav?.gooeyness ?? 0.55}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.9"
                    step="0.05"
                    value={config.gooeyNav?.gooeyness ?? 0.55}
                    onChange={(e) => updateConfigValue('gooeyNav.gooeyness', parseFloat(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Jarak Sebaran Partikel (Spread)</span>
                    <span className="text-[#18d3ff] font-mono">{config.gooeyNav?.spread ?? 48}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="2"
                    value={config.gooeyNav?.spread ?? 48}
                    onChange={(e) => updateConfigValue('gooeyNav.spread', parseInt(e.target.value))}
                    className="w-full accent-[#18d3ff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SKILLS */}
          {activeTab === 'skills' && (
            <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-black text-white pb-2 border-b border-white/10">
                🛠 Daftar Skills & Software Kreatif
              </h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik skill baru (cth: Blender, Unreal Engine, Tripo AI)"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="flex-1 bg-[#080a12] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#18d3ff]"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="bg-[#2f77ff] hover:bg-[#3d82ff] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  + Tambah Skill
                </button>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Skill yang ditampilkan saat ini ({config.about?.skills?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {(config.about?.skills || []).map((skill: string) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white group hover:border-rose-400/40 transition-all"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-white/40 hover:text-rose-400 font-bold text-xs"
                        title="Hapus skill"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white">🚀 Portofolio Projects</h2>
                  <p className="text-xs text-white/50">Kelola daftar karya dan proyek unggulan kamu.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-[#2f77ff] hover:bg-[#3d82ff] text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/25"
                >
                  + Tambah Project Baru
                </button>
              </div>

              {(config.projects || []).map((proj: any, idx: number) => (
                <div key={proj.id || idx} className="bg-[#101422] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-[#18d3ff]">Project #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(idx)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Hapus Project
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Image & Accent Row */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#080a12] rounded-xl border border-white/10">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-[#18d3ff] block">
                          🖼 URL Gambar / Thumbnail Proyek (ChromaGrid)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://... atau /uploads/..."
                            value={proj.image || ''}
                            onChange={(e) => {
                              const updated = [...(config.projects || [])];
                              updated[idx] = { ...updated[idx], image: e.target.value };
                              updateConfigValue('projects', updated);
                            }}
                            className="flex-1 bg-[#101422] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => triggerDirectUpload(`projects[${idx}].image`)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white shrink-0"
                          >
                            Upload File
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-white/60 block">
                          ✨ Warna Aksen Glow
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={proj.accent || '#22d3ee'}
                            onChange={(e) => {
                              const updated = [...(config.projects || [])];
                              updated[idx] = { ...updated[idx], accent: e.target.value };
                              updateConfigValue('projects', updated);
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={proj.accent || '#22d3ee'}
                            onChange={(e) => {
                              const updated = [...(config.projects || [])];
                              updated[idx] = { ...updated[idx], accent: e.target.value };
                              updateConfigValue('projects', updated);
                            }}
                            className="flex-1 bg-[#101422] border border-white/15 rounded-lg px-2 py-1 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Judul Project</label>
                      <input
                        type="text"
                        value={proj.title || ''}
                        onChange={(e) => {
                          const updated = [...(config.projects || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          updateConfigValue('projects', updated);
                        }}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Kategori</label>
                      <input
                        type="text"
                        value={proj.category || ''}
                        onChange={(e) => {
                          const updated = [...(config.projects || [])];
                          updated[idx] = { ...updated[idx], category: e.target.value };
                          updateConfigValue('projects', updated);
                        }}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Deskripsi Singkat</label>
                    <textarea
                      rows={2}
                      value={proj.description || ''}
                      onChange={(e) => {
                        const updated = [...(config.projects || [])];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        updateConfigValue('projects', updated);
                      }}
                      className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                        Tags (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={(proj.tags || []).join(', ')}
                        onChange={(e) => {
                          const updated = [...(config.projects || [])];
                          updated[idx] = {
                            ...updated[idx],
                            tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                          };
                          updateConfigValue('projects', updated);
                        }}
                        className="w-full bg-[#080a12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="md:col-span-2 bg-[#080a12] p-3 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase text-[#18d3ff] flex items-center gap-1.5">
                          <span>🔗 Link Video / Media (Instagram Reel/Post, Google Drive, YouTube)</span>
                        </label>
                        {proj.link && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${parseMediaUrl(proj.link).badgeColor}`}>
                            {parseMediaUrl(proj.link).badgeText}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Paste link: https://www.instagram.com/reel/XXXX/ atau https://drive.google.com/file/d/XXXX/view"
                        value={proj.link || ''}
                        onChange={(e) => {
                          const updated = [...(config.projects || [])];
                          const val = e.target.value;
                          const parsed = parseMediaUrl(val);
                          updated[idx] = { 
                            ...updated[idx], 
                            link: val,
                            mediaType: parsed.type,
                            embedUrl: parsed.embedUrl
                          };
                          updateConfigValue('projects', updated);
                        }}
                        className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#18d3ff] font-mono"
                      />
                      <p className="text-[10px] text-white/40">
                        ⚡ Cukup paste link Instagram atau Google Drive, video otomatis ter-embed dan pengunjung dapat menonton langsung di website atau membukanya di aplikasi.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 9: PENGALAMAN & SERTIFIKAT */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              {/* Experience Items */}
              <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-sm font-black text-white">💼 Pengalaman Kerja & Produksi</h3>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2f77ff] hover:bg-[#3d82ff] text-white"
                  >
                    + Tambah Pengalaman
                  </button>
                </div>

                {(config.experience || []).map((exp: any, idx: number) => (
                  <div key={exp.id || idx} className="p-3 bg-[#080a12] border border-white/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#18d3ff]">Pengalaman #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExperience(idx)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Hapus
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={exp.title || ''}
                        placeholder="Posisi / Judul"
                        onChange={(e) => {
                          const updated = [...(config.experience || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          updateConfigValue('experience', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={exp.subtitle || ''}
                        placeholder="Instansi / Tempat"
                        onChange={(e) => {
                          const updated = [...(config.experience || [])];
                          updated[idx] = { ...updated[idx], subtitle: e.target.value };
                          updateConfigValue('experience', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={exp.period || ''}
                        placeholder="Tahun (2024 — Sekarang)"
                        onChange={(e) => {
                          const updated = [...(config.experience || [])];
                          updated[idx] = { ...updated[idx], period: e.target.value };
                          updateConfigValue('experience', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <textarea
                        rows={2}
                        value={exp.description || ''}
                        placeholder="Deskripsi pekerjaan"
                        onChange={(e) => {
                          const updated = [...(config.experience || [])];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          updateConfigValue('experience', updated);
                        }}
                        className="sm:col-span-3 bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={exp.tag || ''}
                        placeholder="Badge / Tag"
                        onChange={(e) => {
                          const updated = [...(config.experience || [])];
                          updated[idx] = { ...updated[idx], tag: e.target.value };
                          updateConfigValue('experience', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white self-start"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Certificates Items */}
              <div className="bg-[#101422] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-sm font-black text-white">📜 Sertifikasi & Lisensi</h3>
                  <button
                    type="button"
                    onClick={handleAddCertificate}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2f77ff] hover:bg-[#3d82ff] text-white"
                  >
                    + Tambah Sertifikat
                  </button>
                </div>

                {(config.certificates || []).map((cert: any, idx: number) => (
                  <div key={cert.id || idx} className="p-3 bg-[#080a12] border border-white/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#18d3ff]">Sertifikat #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCertificate(idx)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Hapus
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={cert.title || ''}
                        placeholder="Nama Sertifikasi"
                        onChange={(e) => {
                          const updated = [...(config.certificates || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          updateConfigValue('certificates', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={cert.issuer || ''}
                        placeholder="Lembaga Penerbit (BNSP, dsb)"
                        onChange={(e) => {
                          const updated = [...(config.certificates || [])];
                          updated[idx] = { ...updated[idx], issuer: e.target.value };
                          updateConfigValue('certificates', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={cert.period || ''}
                        placeholder="Tahun (2025)"
                        onChange={(e) => {
                          const updated = [...(config.certificates || [])];
                          updated[idx] = { ...updated[idx], period: e.target.value };
                          updateConfigValue('certificates', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <textarea
                        rows={2}
                        value={cert.description || ''}
                        placeholder="Deskripsi sertifikasi"
                        onChange={(e) => {
                          const updated = [...(config.certificates || [])];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          updateConfigValue('certificates', updated);
                        }}
                        className="sm:col-span-3 bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={cert.tag || ''}
                        placeholder="Badge (🏆 Juara 1)"
                        onChange={(e) => {
                          const updated = [...(config.certificates || [])];
                          updated[idx] = { ...updated[idx], tag: e.target.value };
                          updateConfigValue('certificates', updated);
                        }}
                        className="bg-[#121625] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white self-start"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: REALTIME LIVE PREVIEW (0MS DELAY) */}
        {showPreview && (
          <div className="flex-1 lg:flex flex-col bg-[#05060b] border-t lg:border-t-0 lg:border-l border-white/10 h-[600px] lg:h-auto overflow-hidden">
            {/* Preview Toolbar */}
            <div className="bg-[#0b0e19] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">Live Website Preview</span>
                <span className="text-[10px] text-white/40">(Update Otomatis saat diedit)</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Device Switcher */}
                <div className="bg-white/5 rounded-lg p-0.5 flex border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                      previewDevice === 'desktop' ? 'bg-[#2f77ff] text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    🖥️ Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                      previewDevice === 'mobile' ? 'bg-[#2f77ff] text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    📱 Mobile
                  </button>
                </div>

                {/* Refresh Preview */}
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
                  title="Muat ulang preview"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Iframe Viewport Container */}
            <div className="flex-1 bg-[#04050d] p-3 flex items-center justify-center overflow-auto relative">
              <div
                className={`transition-all duration-300 relative shadow-2xl overflow-hidden ${
                  previewDevice === 'desktop'
                    ? 'w-full h-full rounded-xl border border-white/10'
                    : 'w-[390px] h-[720px] max-h-full rounded-[40px] border-[8px] border-[#22283a] shadow-2xl shadow-blue-500/10'
                }`}
              >
                <iframe
                  ref={previewIframeRef}
                  key={previewKey}
                  src={`/?preview=true&k=${previewKey}`}
                  className="w-full h-full border-none bg-[#04050d]"
                  title="Live Website Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
