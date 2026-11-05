import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'src', 'data', 'portfolio-config.json');

export async function GET() {
  try {
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

    await fs.writeFile(configFilePath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    return NextResponse.json({
      success: true,
      message: 'Konfigurasi berhasil disimpan dan diperbarui!',
      data: updatedConfig
    });
  } catch (error) {
    console.error('Error writing config file:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan konfigurasi.' },
      { status: 500 }
    );
  }
}
