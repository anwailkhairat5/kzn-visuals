import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL tidak boleh kosong.' }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // 1. YouTube Video
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
      let videoId = '';
      if (trimmedUrl.includes('youtu.be/')) {
        videoId = trimmedUrl.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
      } else {
        const match = trimmedUrl.match(/[?&]v=([^&#]+)/);
        videoId = match ? match[1] : '';
      }

      let title = 'YouTube Video Production';
      let author = 'KzN Visuals';
      let thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(trimmedUrl)}&format=json`);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) title = oembedData.title;
          if (oembedData.author_name) author = oembedData.author_name;
          if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url;
        }
      } catch (e) {
        console.warn('YouTube oembed fetch failed:', e);
      }

      return NextResponse.json({
        success: true,
        mediaType: 'youtube',
        title: title,
        category: 'Sinematografi & YouTube Showcase',
        client: author,
        description: `Produksi video sinematik dengan visual effects, color grading profesional, dan komposisi audio dinamis untuk tayangan berkualitas tinggi.`,
        tags: ['YouTube', 'Cinematography', 'Color Grading', 'After Effects'],
        embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : trimmedUrl,
        thumbnail: thumbnail,
        originalUrl: trimmedUrl
      });
    }

    // 2. Google Drive Video
    if (trimmedUrl.includes('drive.google.com')) {
      let fileId = '';
      const match = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      } else {
        const idMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) fileId = idMatch[1];
      }

      const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : trimmedUrl;

      return NextResponse.json({
        success: true,
        mediaType: 'gdrive',
        title: 'Video Showcase (Google Drive High-Bitrate)',
        category: 'Full HD / 4K Master Video',
        client: 'KzN Studio Showcase',
        description: `Video master kualitas penuh tanpa kompresi yang dihosting melalui Google Drive. Menyajikan kejernihan visual terbaik dengan grading warna presisi dan dynamic sound design.`,
        tags: ['Google Drive', 'Master 4K', 'High Bitrate', 'VFX Compositing'],
        embedUrl: previewUrl,
        thumbnail: '',
        originalUrl: trimmedUrl
      });
    }

    // 3. Instagram Reel or Post
    if (trimmedUrl.includes('instagram.com')) {
      let shortcode = '';
      let isReel = false;

      const reelMatch = trimmedUrl.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      const postMatch = trimmedUrl.match(/\/p\/([a-zA-Z0-9_-]+)/i);

      if (reelMatch) {
        shortcode = reelMatch[1];
        isReel = true;
      } else if (postMatch) {
        shortcode = postMatch[1];
        isReel = false;
      }

      const embedUrl = shortcode
        ? `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${shortcode}/embed/captioned/`
        : trimmedUrl;

      const shortLabel = shortcode ? shortcode.slice(0, 6).toUpperCase() : 'NEW';

      return NextResponse.json({
        success: true,
        mediaType: 'instagram',
        title: isReel ? `Reels Video Promotion #${shortLabel}` : `Instagram Visual Project #${shortLabel}`,
        category: isReel ? 'Instagram Reels & Video Promosi' : 'Instagram Visual Campaign',
        client: 'Instagram (@kzn.visuals)',
        description: `Produksi video reels dan konten promosi vertikal (9:16) dengan transisi mulus, auto caption dinamis, color grading sinematik, serta penerapan visual effects (VFX) untuk memaksimalkan engagement audiens.`,
        tags: ['Instagram Reels', 'Social Media Video', 'Premiere Pro', 'After Effects', 'AI Workflow'],
        embedUrl: embedUrl,
        thumbnail: '',
        originalUrl: trimmedUrl
      });
    }

    // 4. Direct Video file (.mp4, .webm)
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(trimmedUrl)) {
      return NextResponse.json({
        success: true,
        mediaType: 'video',
        title: 'Produksi Video Sinematik Asli',
        category: 'Direct Video Master',
        client: 'KzN Visuals',
        description: `Pemutaran video resolusi tinggi langsung dalam website dengan pemutar video native HTML5 beresolusi penuh tanpa batas pihak ketiga.`,
        tags: ['Native Video', 'Full HD', 'Cinematography', 'VFX'],
        embedUrl: trimmedUrl,
        thumbnail: '',
        originalUrl: trimmedUrl
      });
    }

    // 5. Generic Web Link
    return NextResponse.json({
      success: true,
      mediaType: 'link',
      title: 'Tautan Media & Showcase Eksternal',
      category: 'External Project Media',
      client: 'KzN Visuals Partner',
      description: `Dokumentasi dan publikasi proyek kreatif yang dapat ditinjau langsung melalui tautan resmi yang disediakan.`,
      tags: ['Portfolio', 'Showcase', 'Multimedia'],
      embedUrl: trimmedUrl,
      thumbnail: '',
      originalUrl: trimmedUrl
    });
  } catch (error: any) {
    console.error('Error parsing media URL:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses URL media.' },
      { status: 500 }
    );
  }
}
