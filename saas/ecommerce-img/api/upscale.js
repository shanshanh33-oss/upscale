import sharp from 'sharp';

async function multiPassUpscale(buffer, newW, newH, fitMode, outFmt, quality, enhance) {
  const meta = await sharp(buffer, { limitInputPixels: 0 }).metadata();
  const origW = meta.width;
  const origH = meta.height;
  const scaleX = newW / origW;
  const scaleY = newH / origH;
  const avgScale = Math.max(scaleX, scaleY);
  const passes =
    avgScale >= 8 ? 3 :
    avgScale >= 4 ? 2 :
    avgScale >= 2.5 ? 2 : 1;

  if (passes <= 1) {
    let pipeline = sharp(buffer, { limitInputPixels: 0 }).resize(newW, newH, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
      fit: fitMode,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
    if (enhance) {
      pipeline = pipeline.sharpen({ sigma: 0.8, m1: 0, m2: 3, x1: 0, y2: 8, y3: 4 });
    }
    return await pipeline.toFormat(outFmt, outFmt === 'jpeg' ? { quality } : {}).toBuffer();
  }

  let current = buffer;
  let cw = origW;
  let ch = origH;

  for (let i = 0; i < passes; i++) {
    const remaining = passes - i;
    const stepW = Math.round(cw * Math.pow(scaleX, 1 / remaining));
    const stepH = Math.round(ch * Math.pow(scaleY, 1 / remaining));
    let pipeline = sharp(current, { limitInputPixels: 0 }).resize(stepW, stepH, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
      fit: fitMode,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
    if (enhance || i > 0) {
      const ss = Math.max(0.3, 0.8 - i * 0.25);
      pipeline = pipeline.sharpen({
        sigma: ss, m1: 0, m2: 3, x1: 0,
        y2: enhance ? 8 : 4,
        y3: enhance ? 4 : 2,
      });
    }
    current = await pipeline.toBuffer();
    cw = stepW;
    ch = stepH;
  }

  return await sharp(current, { limitInputPixels: 0 }).toFormat(outFmt, outFmt === 'jpeg' ? { quality } : {}).toBuffer();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, mode, scale, targetWidth, targetHeight, format, enhance, fit } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image data' });
    }

    const buffer = Buffer.from(image, 'base64');
    const metadata = await sharp(buffer, { limitInputPixels: 0 }).metadata();

    let newW, newH;
    if (mode === 'target' && targetWidth && targetHeight) {
      newW = parseInt(targetWidth);
      newH = parseInt(targetHeight);
    } else {
      const s = parseInt(scale) || 2;
      newW = Math.round(metadata.width * s);
      newH = Math.round(metadata.height * s);
    }

    const MAX_DIM = 10000;
    if (newW > MAX_DIM || newH > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / newW, MAX_DIM / newH);
      newW = Math.round(newW * ratio);
      newH = Math.round(newH * ratio);
    }

    const outFmt = format === "jpeg" ? "jpeg" : format === "webp" ? "webp" : "png";
    const quality = 92;
    const fitMode = fit === 'fill' ? 'fill' : fit === 'cover' ? 'cover' : 'inside';

    const result = await multiPassUpscale(buffer, newW, newH, fitMode, outFmt, quality, enhance === true);

    res.json({
      image: result.toString('base64'),
      format: outFmt,
      width: newW,
      height: newH,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      scale: newW / metadata.width,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
