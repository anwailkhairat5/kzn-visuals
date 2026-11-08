import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'src', 'data', 'portfolio-config.json');

const rawToken = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
const GITHUB_TOKEN = rawToken.replace(/[^\x20-\x7E]/g, '').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || 'anwailkhairat5/kzn-visuals').replace(/[^\x20-\x7E]/g, '').trim();

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0'
};

export async function GET() {
  try {
    // 1. If GITHUB_TOKEN is present, fetch the latest live state from GitHub API
    if (GITHUB_TOKEN) {
      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/src/data/portfolio-config.json?ref=main`,
          {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'KZN-Visuals-Admin'
            },
            cache: 'no-store'
          }
        );
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData.content) {
            const decoded = Buffer.from(ghData.content, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);
            return NextResponse.json(
              { success: true, data: parsed, source: 'github' },
              { headers: NO_CACHE_HEADERS }
            );
          }
        }
      } catch (ghErr) {
        console.warn('GitHub API fetch failed, falling back to local file:', ghErr);
      }
    }

    // 2. Fallback to bundled local file
    const fileContent = await fs.readFile(configFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(
      { success: true, data, source: 'local' },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error reading config file:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membaca file konfigurasi.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedConfig = await req.json();
    if (!updatedConfig || typeof updatedConfig !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data konfigurasi tidak valid.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const jsonString = JSON.stringify(updatedConfig, null, 2);

    // 1. Try local filesystem write (works in localhost)
    let localSaved = false;
    try {
      await fs.writeFile(configFilePath, jsonString, 'utf-8');
      localSaved = true;
    } catch (fsErr: any) {
      console.warn('Local fs.writeFile failed (expected on Vercel):', fsErr.message);
    }

    // 2. If GITHUB_TOKEN exists, commit directly to GitHub repository!
    let githubSaved = false;
    let githubError: string | null = null;
    if (GITHUB_TOKEN) {
      try {
        // Fetch current file SHA
        const getFileRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/src/data/portfolio-config.json?ref=main`,
          {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'KZN-Visuals-Admin'
            },
            cache: 'no-store'
          }
        );

        let currentSha: string | undefined;
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          currentSha = fileData.sha;
        }

        const base64Content = Buffer.from(jsonString).toString('base64');
        const putRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/src/data/portfolio-config.json`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'KZN-Visuals-Admin'
            },
            body: JSON.stringify({
              message: 'Admin CMS: Update portfolio configuration',
              content: base64Content,
              branch: 'main',
              ...(currentSha ? { sha: currentSha } : {})
            })
          }
        );

        if (putRes.ok) {
          githubSaved = true;
        } else {
          const errBody = await putRes.text();
          githubError = `GitHub HTTP ${putRes.status}: ${errBody}`;
          console.error('GitHub API commit error:', putRes.status, errBody);
        }
      } catch (ghErr: any) {
        githubError = ghErr.message;
        console.error('Failed to commit config to GitHub:', ghErr);
      }
    }

    if (githubSaved) {
      return NextResponse.json({
        success: true,
        message: 'Konfigurasi berhasil disimpan dan disinkronkan ke Cloud (GitHub)!',
        data: updatedConfig,
        synced: { github: true, local: localSaved }
      }, { headers: NO_CACHE_HEADERS });
    }

    if (localSaved) {
      return NextResponse.json({
        success: true,
        message: 'Konfigurasi berhasil disimpan secara lokal!' + (githubError ? ` (Cloud sync pending: ${githubError})` : ''),
        data: updatedConfig,
        synced: { github: false, local: true }
      }, { headers: NO_CACHE_HEADERS });
    }

    // Client-side cache fallback
    return NextResponse.json({
      success: true,
      message: 'Konfigurasi disimpan di sesi ini (browser cache aktif).',
      data: updatedConfig,
      warning: githubError || 'Cloud token belum terhubung.',
      synced: { github: false, local: false }
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error writing config file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan konfigurasi.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
