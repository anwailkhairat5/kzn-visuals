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
    // 1. If GITHUB_TOKEN is present, fetch the absolute latest live state from GitHub Cloud
    if (GITHUB_TOKEN) {
      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/src/data/portfolio-config.json?ref=main&_nocache=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'KZN-Visuals-Admin',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              'If-None-Match': ''
            },
            cache: 'no-store'
          }
        );

        if (ghRes.ok) {
          const ghData = await ghRes.json();
          let parsedData: any = null;

          // GitHub API contents returns base64 content for files <= 1MB
          if (ghData.content && ghData.content.trim().length > 0) {
            const decoded = Buffer.from(ghData.content, 'base64').toString('utf-8');
            parsedData = JSON.parse(decoded);
          } else if (ghData.download_url) {
            // For files > 1MB, GitHub omits content and provides download_url
            const rawRes = await fetch(`${ghData.download_url}?_t=${Date.now()}`, {
              headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'KZN-Visuals-Admin'
              },
              cache: 'no-store'
            });
            if (rawRes.ok) {
              parsedData = await rawRes.json();
            }
          }

          if (parsedData) {
            return NextResponse.json(
              { success: true, data: parsedData, source: 'github', sha: ghData.sha },
              { headers: NO_CACHE_HEADERS }
            );
          }
        } else {
          console.warn('GitHub API contents endpoint returned status:', ghRes.status);
        }

        // Direct raw fallback from raw.githubusercontent.com
        const rawFallbackRes = await fetch(
          `https://raw.githubusercontent.com/${GITHUB_REPO}/main/src/data/portfolio-config.json?_t=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              'User-Agent': 'KZN-Visuals-Admin'
            },
            cache: 'no-store'
          }
        );
        if (rawFallbackRes.ok) {
          const parsedData = await rawFallbackRes.json();
          return NextResponse.json(
            { success: true, data: parsedData, source: 'github-raw' },
            { headers: NO_CACHE_HEADERS }
          );
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

    // Timestamp this configuration save
    updatedConfig._updatedAt = Date.now();

    const jsonString = JSON.stringify(updatedConfig, null, 2);

    // 1. Try local filesystem write (works on localhost development)
    let localSaved = false;
    try {
      await fs.writeFile(configFilePath, jsonString, 'utf-8');
      localSaved = true;
    } catch {
      // Expected on Vercel read-only runtime
    }

    // 2. If GITHUB_TOKEN exists, commit directly to GitHub repository with automatic retry on 409 Conflict
    let githubSaved = false;
    let githubError: string | null = null;
    let finalSha: string | undefined = undefined;

    if (GITHUB_TOKEN) {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Always fetch current live file SHA directly from GitHub with fresh cache-busting
          const getFileRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/src/data/portfolio-config.json?ref=main&_t=${Date.now()}_${attempt}`,
            {
              headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'KZN-Visuals-Admin',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                'If-None-Match': ''
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
                message: `Admin CMS: Update portfolio configuration (${new Date().toLocaleTimeString('id-ID')})`,
                content: base64Content,
                branch: 'main',
                ...(currentSha ? { sha: currentSha } : {})
              })
            }
          );

          if (putRes.ok) {
            const putData = await putRes.json();
            githubSaved = true;
            finalSha = putData.content?.sha;
            githubError = null;
            break; // Success!
          } else {
            const errBody = await putRes.text();
            githubError = `GitHub HTTP ${putRes.status}: ${errBody}`;
            console.warn(`GitHub commit attempt ${attempt} failed: ${putRes.status}`, errBody);

            if (putRes.status === 409 && attempt < maxRetries) {
              // SHA mismatch / concurrent commit, wait 350ms and retry
              await new Promise((r) => setTimeout(r, 350 * attempt));
              continue;
            }
          }
        } catch (ghErr: any) {
          githubError = ghErr.message;
          console.error(`GitHub commit attempt ${attempt} network error:`, ghErr);
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 350 * attempt));
          }
        }
      }
    }

    if (githubSaved) {
      return NextResponse.json({
        success: true,
        message: 'Konfigurasi berhasil disimpan dan disinkronkan permanen ke Cloud (GitHub)!',
        data: updatedConfig,
        sha: finalSha,
        synced: { github: true, local: localSaved }
      }, { headers: NO_CACHE_HEADERS });
    }

    if (localSaved) {
      return NextResponse.json({
        success: true,
        message: 'Konfigurasi berhasil disimpan di disk lokal!' + (githubError ? ` (Peringatan Cloud: ${githubError})` : ''),
        data: updatedConfig,
        synced: { github: false, local: true }
      }, { headers: NO_CACHE_HEADERS });
    }

    // If both failed (e.g. running on Vercel without a working GitHub token):
    return NextResponse.json({
      success: false,
      error: `Gagal menyimpan ke Cloud (GitHub): ${githubError || 'Token GitHub tidak valid atau tidak memiliki izin repo'}. Perubahan tidak tersimpan di server!`,
      data: updatedConfig,
      synced: { github: false, local: false }
    }, { status: 500, headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error writing config file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan konfigurasi.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
