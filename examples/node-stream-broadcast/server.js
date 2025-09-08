// server.js
// HTTP static + WS signaling + multi-client StableWebRTC peers
// Sends synthetic I420 video (RTCVideoSource.onFrame) from Node to each browser peer.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const wrtc = require('@roamhq/wrtc');
const Peer = require('stable-webrtc');

// ---------- HTTP static server ----------
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    let filePath = path.join(PUBLIC_DIR, u.pathname === '/' ? 'index.html' : u.pathname);
    // מניעת יציאה מהתיקיה (basic)
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(filePath, (err, buf) => {
      if (err) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const ctype =
        ext === '.html' ? 'text/html; charset=utf-8' :
        ext === '.js'   ? 'application/javascript; charset=utf-8' :
        ext === '.css'  ? 'text/css; charset=utf-8' :
        ext === '.json' ? 'application/json; charset=utf-8' :
        'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ctype });
      res.end(buf);
    });
  } catch (e) {
    res.writeHead(500); res.end('Server error');
  }
});

// ---------- WebSocket signaling ----------
const wss = new WebSocketServer({ server, path: '/ws' });

// clients: Map<id, { ws, peer, videoSource, videoTrack, frameTimer }>
const clients = new Map();
let nextId = 1;

// --- Nonstandard video API (I420) helpers ---
const nonstd = wrtc.nonstandard || {};
const { RTCVideoSource /*, RTCVideoSink, i420ToRgba, rgbaToI420*/ } = nonstd;

if (!RTCVideoSource) {
  console.error('[FATAL] nonstandard.RTCVideoSource required. Check @roamhq/wrtc install/version.');
  process.exit(1);
}

/**
 * Create a synthetic I420 video track (using RTCVideoSource).
 * @returns {{ videoSource: any, track: MediaStreamTrack }}
 */
function createSyntheticVideoTrack() {
  const videoSource = new RTCVideoSource();
  const track = videoSource.createTrack();
  return { videoSource, track };
}

/**
 * Pump I420 frames into RTCVideoSource.onFrame({width,height,data}),
 * where `data` is a single Uint8ClampedArray (Y then U then V).
 * @param {*} videoSource
 * @param {number} fps
 * @param {number} width
 * @param {number} height
 * @returns {NodeJS.Timer} interval handle
 */
function startVideoPump_I420(videoSource, fps = 20, width = 640, height = 360) {
  const ySize = width * height;
  const uSize = (width >> 1) * (height >> 1);
  const vSize = uSize;

  // Single reusable buffer per stream (efficient)
  const data = new Uint8ClampedArray(ySize + uSize + vSize);
  const Y = data.subarray(0, ySize);
  const U = data.subarray(ySize, ySize + uSize);
  const V = data.subarray(ySize + uSize);

  let t = 0;
  const intervalMs = Math.max(1, Math.round(1000 / fps));

  const timer = setInterval(() => {
    // Fill Y with horizontal gradient that animates over time
    const base = (Math.sin(t / 20) * 0.5 + 0.5) * 255;
    for (let row = 0; row < height; row++) {
      const rowBase = Math.min(255, Math.max(0, base + (row - height / 2) * 0.30));
      const off = row * width;
      for (let col = 0; col < width; col++) {
        const colAdj = Math.min(255, Math.max(0, rowBase + (col - width / 2) * 0.10));
        Y[off + col] = colAdj | 0;
      }
    }
    // U/V tints
    const uVal = (128 + 40 * Math.sin(t / 15)) | 0;
    const vVal = (128 + 40 * Math.cos(t / 17)) | 0;
    U.fill(uVal);
    V.fill(vVal);

    // Push frame (IMPORTANT: data is a single contiguous I420 buffer)
    videoSource.onFrame({ width, height, data });

    t++;
  }, intervalMs);

  return timer;
}

function stopVideoPump(timer) {
  if (timer) clearInterval(timer);
}



wss.on('connection', (ws) => {
  const id = String(nextId++);
  console.log(`[WS] client ${id} connected`);

  // New Peer for this browser client
  const peer = new Peer({ wrtc });

  // Synthetic video track per peer
  const { videoSource, track } = createSyntheticVideoTrack();
  const frameTimer = startVideoPump_I420(videoSource, 20, 640, 360);

  // stable-webrtc → browser: forward signaling
  peer.on('signal', (sig) => {
    let payload;
    if (sig instanceof Uint8Array || ArrayBuffer.isView(sig)) {
        payload = { bin: true, data: Buffer.from(sig).toString('base64') };
    } else if (sig instanceof ArrayBuffer) {
        payload = { bin: true, data: Buffer.from(new Uint8Array(sig)).toString('base64') };
    } else {
        payload = { bin: false, data: sig };
    }
    ws.send(JSON.stringify({ type: 'signal', data: payload }));
  });

  peer.on('connect', () => {
    console.log(`[peer:${id}] connected`);
    try { peer.send(`hello from server to ${id}`); } catch {}
  });

  peer.on('data', (buf) => {
    try {
      const txt = new TextDecoder().decode(buf);
      console.log(`[peer:${id}] data:`, txt);
    } catch {
      console.log(`[peer:${id}] binary data len=${buf?.byteLength}`);
    }
  });

  peer.on('error', (err) => {
    console.error(`[peer:${id}] error:`, err);
  });

  peer.on('close', () => {
    console.log(`[peer:${id}] closed`);
    cleanupClient(id);
  });

  clients.set(id, { ws, peer, videoSource, videoTrack: track, frameTimer });

  // Browser → stable-webrtc: feed signaling in; also 'ready' to attach track
  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }

    if (data?.type === 'signal') {
        peer.signal(new Uint8Array(Buffer.from(data.data, 'base64')));

    } else if (data?.type === 'ready') {

        console.log(track);

        peer.stream('test_video', {
            video_track: track,
            audio_track: null
        });
    }
  });

  ws.on('close', () => {
    console.log(`[WS] client ${id} disconnected`);
    cleanupClient(id);
  });
});

function cleanupClient(id) {
  const entry = clients.get(id);
  if (!entry) return;
  try { entry.peer.destroy?.(); } catch {}
  try { stopVideoPump(entry.frameTimer); } catch {}
  try { entry.videoTrack?.stop?.(); } catch {}
  try { entry.ws?.close?.(); } catch {}
  clients.delete(id);
}

// ---------- Start ----------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`HTTP+WS up:  http://localhost:${PORT}`);
  console.log(`WS signaling: ws://localhost:${PORT}/ws`);
});

/*
Client protocol (see your public/index.html):
- Browser opens WS to /ws
- Browser instantiates new Peer() (from stable-webrtc browser bundle)
- Browser forwards peer.on('signal') to WS:   { type:'signal', data:sig }
- Browser feeds WS {type:'signal'} into peer.signal(...)
- Browser sends {type:'ready'} once UI is up → server attaches synthetic video track
- On 'connect', DataChannel is ready; remote video appears via ontrack/stream in the browser
*/
