import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const rawToken = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
const GITHUB_TOKEN = rawToken.replace(/[^\x20-\x7E]/g, '').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || 'anwailkhairat5/kzn-visuals').replace(/[^\x20-\x7E]/g, '').trim();

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0'
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada file yang diunggah.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and add timestamp
    const ext = path.extname(file.name) || '.png';
    const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanName}_${Date.now()}${ext}`;

    const mimeType = file.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    // 1. Try local filesystem upload (works in localhost)
    let localSaved = false;
    const localUrl = `/uploads/${fileName}`;
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, fileName), buffer);
      localSaved = true;
    } catch (fsErr: any) {
      console.warn('Local file write failed (expected on Vercel):', fsErr.message);
    }

    // 2. If GITHUB_TOKEN is available, commit file directly to GitHub repo!
    let githubUrl: string | null = null;
    if (GITHUB_TOKEN) {
      try {
        const base64Content = buffer.toString('base64');
        const uploadRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/public/uploads/${fileName}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'KZN-Visuals-Admin'
            },
            body: JSON.stringify({
              message: `Admin CMS: Upload ${fileName}`,
              content: base64Content,
              branch: 'main'
            })
          }
        );

        if (uploadRes.ok) {
          githubUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/uploads/${fileName}`;
        } else {
          console.warn('GitHub image upload non-ok status:', uploadRes.status);
        }
      } catch (ghErr) {
        console.warn('GitHub upload error:', ghErr);
      }
    }

    // Return the best available URL:
    // Prefer githubUrl (globally accessible CDN), then localUrl (if localhost), then dataUrl
    const chosenUrl = githubUrl || (localSaved ? localUrl : dataUrl);

    return NextResponse.json({
      success: true,
      message: githubUrl
        ? 'File berhasil diunggah & disinkronkan ke Cloud (GitHub)!'
        : (localSaved ? 'File tersimpan secara lokal.' : 'File diproses.'),
      url: chosenUrl,
      githubUrl: githubUrl || undefined,
      localUrl: localSaved ? localUrl : undefined,
      dataUrl: dataUrl,
      fileName
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat mengunggah file.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
