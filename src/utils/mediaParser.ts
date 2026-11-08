/**
 * Utility to detect and convert Instagram, Google Drive, YouTube, and direct video links
 * into playable embed URLs and metadata.
 */

export interface ParsedMedia {
  type: 'instagram' | 'gdrive' | 'youtube' | 'video' | 'web';
  embedUrl: string;
  originalUrl: string;
  label: string;
  badgeText: string;
  badgeColor: string;
  id?: string;
}

export function parseMediaUrl(url: string | undefined): ParsedMedia {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      type: 'web',
      embedUrl: '',
      originalUrl: '#',
      label: 'Website Link',
      badgeText: 'Web',
      badgeColor: 'bg-white/10 text-white/70'
    };
  }

  const clean = url.trim();

  // 1. Instagram: https://www.instagram.com/reel/C-abc123/ or /p/C-abc123/
  const igMatch = clean.match(/(?:instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+))/i);
  if (igMatch) {
    const id = igMatch[1];
    return {
      type: 'instagram',
      id,
      embedUrl: `https://www.instagram.com/p/${id}/embed/`,
      originalUrl: clean,
      label: 'Instagram Reel / Post',
      badgeText: '📸 Instagram Reel',
      badgeColor: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-pink-500/40 text-pink-300'
    };
  }

  // 2. Google Drive: https://drive.google.com/file/d/1A2B3C.../view or /open?id=1A2B3C...
  const gdriveMatch = clean.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    const id = gdriveMatch[1];
    return {
      type: 'gdrive',
      id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      originalUrl: clean,
      label: 'Google Drive Video',
      badgeText: '📁 Google Drive',
      badgeColor: 'bg-blue-500/20 border-blue-500/40 text-blue-300'
    };
  }

  // 3. YouTube: https://www.youtube.com/watch?v=... or https://youtu.be/... or /shorts/...
  const ytMatch = clean.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
      originalUrl: clean,
      label: 'YouTube Video',
      badgeText: '▶️ YouTube',
      badgeColor: 'bg-red-500/20 border-red-500/40 text-red-300'
    };
  }

  // 4. Direct video file (.mp4, .webm, .mov)
  if (clean.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i)) {
    return {
      type: 'video',
      embedUrl: clean,
      originalUrl: clean,
      label: 'Video File',
      badgeText: '🎬 Video Reel',
      badgeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
    };
  }

  // 5. Standard web link
  return {
    type: 'web',
    embedUrl: clean,
    originalUrl: clean,
    label: 'Tautan Project',
    badgeText: '🔗 Link',
    badgeColor: 'bg-white/10 border-white/20 text-white/70'
  };
}
