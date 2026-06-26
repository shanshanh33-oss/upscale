// waifu2x AI 放大模块
const MODEL_PATH = '/models/waifu2x.onnx';
const SERVER_URL = 'http://localhost:5179';
let session = null;
let useLocalModel = false;

export async function loadModel() {
  // 先试本地服务（效果最好）
  try {
    var r = await fetch(SERVER_URL + '/process', { method: 'OPTIONS', signal: AbortSignal.timeout(2000) });
    if (r.ok) { useLocalModel = false; return true; }
  } catch(e) {}
  // 再试浏览器 ONNX 模型
  try {
    var res = await fetch(MODEL_PATH);
    if (res.ok) {
      var ort = await import('onnxruntime-web/wasm');
      var buf = await res.arrayBuffer();
      session = await ort.InferenceSession.create(buf);
      useLocalModel = true; return true;
    }
  } catch(e) {}
  return false;
}
export function isModelLoaded() { return true; }
export function getModelStatus() { return session ? 'loaded' : (useLocalModel === false ? 'server' : 'unloaded'); }

export async function upscaleWithAI(imageData, scale) {
  if (!useLocalModel) return runServer(imageData, scale);
  if (session) return runLocal(imageData);
  throw new Error('AI model not available');
}

async function runLocal(imageData) {
  var { data, width, height } = imageData;
  var inLen = 3 * height * width;
  var inputData = new Float32Array(inLen);
  for (var y = 0; y < height; y++)
    for (var x = 0; x < width; x++) {
      var si = (y * width + x) * 4;
      for (var c = 0; c < 3; c++)
        inputData[c * height * width + y * width + x] = data[si + c] / 255;
    }
  var ort = await import('onnxruntime-web/wasm');
  var t = new ort.Tensor('float32', inputData, [1, 3, height, width]);
  var r = await session.run({ Input1: t });
  var o = r.output; var oh = o.dims[2], ow = o.dims[3];
  var out = new Uint8ClampedArray(oh * ow * 4);
  for (var y = 0; y < oh; y++)
    for (var x = 0; x < ow; x++) {
      var di = (y * ow + x) * 4;
      for (var c = 0; c < 3; c++) {
        var v = o.data[c * oh * ow + y * ow + x];
        out[di + c] = Math.max(0, Math.min(255, Math.round(v * 255)));
      }
      out[di + 3] = 255;
    }
  return new ImageData(out, ow, oh);
}
async function runServer(imageData, scale) {
  var c = document.createElement('canvas');
  c.width = imageData.width; c.height = imageData.height;
  c.getContext('2d').putImageData(imageData, 0, 0);
  var b64 = c.toDataURL('image/png').split(',')[1];
  var res = await fetch(SERVER_URL + '/process', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: b64, scale })
  });
  if (!res.ok) throw new Error('Server error');
  var d = await res.json();
  var img = new Image();
  await new Promise(function(rs, rj) { img.onload = rs; img.onerror = rj; img.src = 'data:image/png;base64,' + d.image; });
  var oc = document.createElement('canvas');
  oc.width = img.width; oc.height = img.height;
  oc.getContext('2d').drawImage(img, 0, 0);
  return oc.getContext('2d').getImageData(0, 0, img.width, img.height);
}
export { upscaleWithAI as processWithAI };
