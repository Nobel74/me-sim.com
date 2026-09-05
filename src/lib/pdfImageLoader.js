import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Decodificador PNG nativo para PDF 1.4 (sin dependencias binarias externas)
 * Extrae anchura, altura, stream RGB (/Filter /FlateDecode) y canal Alfa opcional (/SMask)
 */
export function decodePngForPdf(pngBuffer) {
  // Verificar firma PNG: 137 80 78 71 13 10 26 10
  if (
    pngBuffer[0] !== 0x89 ||
    pngBuffer[1] !== 0x50 ||
    pngBuffer[2] !== 0x4e ||
    pngBuffer[3] !== 0x47
  ) {
    throw new Error('Not a valid PNG image');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6; // 6 = RGBA, 2 = RGB
  const idatChunks = [];

  while (offset < pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString('ascii', offset + 4, offset + 8);
    const data = pngBuffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length; // 4 length + 4 type + length + 4 crc
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported bit depth: ${bitDepth}`);
  }

  const compressedData = Buffer.concat(idatChunks);
  const uncompressedData = zlib.inflateSync(compressedData);

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const stride = width * bytesPerPixel;
  const rgbBuffer = Buffer.alloc(width * height * 3);
  let alphaBuffer = null;
  const hasAlpha = colorType === 6;
  if (hasAlpha) {
    alphaBuffer = Buffer.alloc(width * height);
  }

  // Deshacer filtros PNG por scanline
  const prevRow = Buffer.alloc(stride);
  const currRow = Buffer.alloc(stride);
  let srcOffset = 0;
  let destRgbOffset = 0;
  let destAlphaOffset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = uncompressedData[srcOffset++];
    for (let x = 0; x < stride; x++) {
      const rawByte = uncompressedData[srcOffset++];
      const left = x >= bytesPerPixel ? currRow[x - bytesPerPixel] : 0;
      const up = prevRow[x];
      const upLeft = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

      let val = 0;
      if (filterType === 0) {
        val = rawByte;
      } else if (filterType === 1) {
        // Sub
        val = (rawByte + left) & 0xff;
      } else if (filterType === 2) {
        // Up
        val = (rawByte + up) & 0xff;
      } else if (filterType === 3) {
        // Average
        val = (rawByte + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        // Paeth
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr = left;
        if (pb < pa && pb <= pc) pr = up;
        else if (pc < pa && pc <= pb) pr = upLeft;
        val = (rawByte + pr) & 0xff;
      } else {
        val = rawByte;
      }
      currRow[x] = val;
    }

    // Extraer canales RGB y Alfa
    for (let i = 0; i < width; i++) {
      const pxOffset = i * bytesPerPixel;
      rgbBuffer[destRgbOffset++] = currRow[pxOffset];
      rgbBuffer[destRgbOffset++] = currRow[pxOffset + 1];
      rgbBuffer[destRgbOffset++] = currRow[pxOffset + 2];
      if (hasAlpha) {
        alphaBuffer[destAlphaOffset++] = currRow[pxOffset + 3];
      }
    }

    currRow.copy(prevRow);
  }

  return {
    width,
    height,
    hasAlpha,
    rgbDeflated: zlib.deflateSync(rgbBuffer),
    alphaDeflated: hasAlpha ? zlib.deflateSync(alphaBuffer) : null,
  };
}

export function getJpegDimensions(jpegBuffer) {
  let offset = 2;
  while (offset < jpegBuffer.length) {
    if (jpegBuffer[offset] !== 0xff) break;
    const marker = jpegBuffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = jpegBuffer.readUInt16BE(offset + 5);
      const width = jpegBuffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    const length = jpegBuffer.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return { width: 400, height: 150 };
}

/**
 * Carga el buffer del logotipo corporativo configurado en la sección de configuración fiscal oficial
 * Soporta Data URLs (Base64) y rutas locales de public/
 */
export function loadCompanyLogoBuffer(logoPathOrDataUrl) {
  try {
    if (!logoPathOrDataUrl) return null;

    if (logoPathOrDataUrl.startsWith('data:image/')) {
      const base64Data = logoPathOrDataUrl.split(',')[1];
      if (!base64Data) return null;
      const buf = Buffer.from(base64Data, 'base64');
      if (logoPathOrDataUrl.includes('image/png')) {
        return { type: 'png', ...decodePngForPdf(buf) };
      }
      if (logoPathOrDataUrl.includes('image/jpeg') || logoPathOrDataUrl.includes('image/jpg')) {
        const { width, height } = getJpegDimensions(buf);
        return { type: 'jpeg', width, height, buffer: buf };
      }
    }

    // Ruta de archivo en el sistema (ej. /logos/Logo-me-sim-mail.png)
    let cleanPath = logoPathOrDataUrl.replace(/^\//, '');
    let fullPath = path.join(process.cwd(), 'public', cleanPath);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(process.cwd(), cleanPath);
    }

    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      if (fullPath.endsWith('.png')) {
        return { type: 'png', ...decodePngForPdf(buf) };
      }
      if (fullPath.endsWith('.jpg') || fullPath.endsWith('.jpeg')) {
        const { width, height } = getJpegDimensions(buf);
        return { type: 'jpeg', width, height, buffer: buf };
      }
    }
  } catch (err) {
    console.error('Error loading company logo for invoice:', err);
  }
  return null;
}
