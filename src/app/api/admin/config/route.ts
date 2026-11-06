import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'src', 'data', 'portfolio-config.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'anwailkhairat5/kzn-visuals';

export async function GET() {
  try {
    // 1. If GITHUB_TOKEN is present, fetch the latest cloud state from GitHub API
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
            return NextResponse.json({ success: true, data: parsed });
          }
        }
      } catch (ghErr) {
        console.warn('GitHub API fetch failed, falling back to local file:', ghErr);
      }
    }

    // 2. Fallback to bundled local file
    const fileContent = await fs.readFile(configFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error reading config file:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membaca file konfigurasi.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedConfig = await req.json();
    if (!updatedConfig || typeof updatedConfig !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data konfigurasi tidak valid.' },
        { status: 400 }
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

        if (!putRes.ok) {
          const errBody = await putRes.text();
          console.error('GitHub API commit error:', putRes.status, errBody);
          // Don't throw — fall through to localSaved check below
        } else {
          return NextResponse.json({
            success: true,
            message: 'Konfigurasi berhasil disimpan dan disinkronkan ke GitHub!',
            data: updatedConfig
          });
        }
      } catch (ghErr: any) {
        console.error('Failed to commit config to GitHub:', ghErr);
        // Fall through to localSaved check
      }
    }

    if (localSaved) {
      return NextResponse.json({
        success: true,
        message: 'Konfigurasi berhasil disimpan secara lokal!',
        data: updatedConfig
      });
    }

    // On Vercel: neither local nor GitHub worked — still return success so the
    // admin UI can cache the config in localStorage on the client side.
    return NextResponse.json({
      success: true,
      message: 'Konfigurasi disimpan di sesi ini (sinkronisasi cloud tertunda).',
      data: updatedConfig,
      warning: 'GitHub sync failed. Config is cached client-side only.'
    });
  } catch (error: any) {
    console.error('Error writing config file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan konfigurasi.' },
      { status: 500 }
    );
  }
}
