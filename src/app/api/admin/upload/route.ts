import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada file yang diunggah.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Sanitize filename and add timestamp
    const ext = path.extname(file.name) || '.png';
    const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanName}_${Date.now()}${ext}`;
    const destinationPath = path.join(uploadsDir, fileName);

    await fs.writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      message: 'File berhasil diunggah!',
      url: publicUrl,
      fileName
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengunggah file.' },
      { status: 500 }
    );
  }
}
