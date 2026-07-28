import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  const { filename } = params;
  
  // Safe filename sanitization
  const safeFilename = path.basename(filename);
  const primaryPath = path.join(process.cwd(), 'flags', safeFilename);
  const publicPath = path.join(process.cwd(), 'public', 'flags', safeFilename);

  let targetPath = primaryPath;
  if (!fs.existsSync(targetPath)) {
    targetPath = publicPath;
  }

  if (fs.existsSync(targetPath)) {
    try {
      const fileBuffer = fs.readFileSync(targetPath);
      const ext = path.extname(safeFilename).toLowerCase();
      let contentType = 'image/webp';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      if (ext === '.gif') contentType = 'image/gif';
      if (ext === '.svg') contentType = 'image/svg+xml';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error(`Error reading flag ${safeFilename}:`, error);
    }
  }

  return new NextResponse('Flag not found', { status: 404 });
}
