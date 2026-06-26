const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 5179;
const WAIFU2X_PATH = __dirname + "/../waifu2x/waifu2x-ncnn-vulkan";
const MODEL_PATH = __dirname + "/../waifu2x/models-upconv_7_photo";

function processImage(imageBase64, scale) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2x-'));
    const inputPath = path.join(tmpDir, 'input.png');
    const outputPath = path.join(tmpDir, 'output.png');
    
    try {
      const buf = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(inputPath, buf);
      
      const proc = spawn(WAIFU2X_PATH, [
        '-i', inputPath,
        '-o', outputPath,
        '-m', MODEL_PATH,
        '-s', String(scale || 2),
        '-n', '-1',
        '-t', '0'
      ]);
      
      let stderr = '';
      proc.stderr.on('data', d => stderr += d.toString());
      
      proc.on('close', (code) => {
        if (code !== 0 || !fs.existsSync(outputPath)) {
          reject(new Error(`waifu2x failed (${code}): ${stderr.slice(0,200)}`));
          return;
        }
        const outBuf = fs.readFileSync(outputPath);
        const resultBase64 = outBuf.toString('base64');
        // Cleanup
        try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
        resolve(resultBase64);
      });
    } catch(e) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch(e2) {}
      reject(e);
    }
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method !== 'POST' || req.url !== '/process') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { image, scale } = JSON.parse(body);
      if (!image) throw new Error('No image data');
      
      const result = await processImage(image, scale);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ image: result }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Waifu2x server running on http://localhost:${PORT}`);
  console.log(`Model: ${MODEL_PATH}`);
});
