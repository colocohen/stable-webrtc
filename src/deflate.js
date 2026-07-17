/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// Plain DEFLATE compression (browser CompressionStream / Node zlib).
// NOTE: the SDP *delta* encoding is unrelated — it lives in the external
// 'compact-delta' package and is called directly from engine.js.

var _TE = new TextEncoder();
var _TD = new TextDecoder();

var _zlib = null;
function getZlib(){
  if (!_zlib && typeof require !== 'undefined'){
    try { _zlib = require('zlib'); }
    catch(e){ _zlib = null; }
  }
  return _zlib;
}

// Normalize any byte-ish input to a Uint8Array view (no copy when possible).
function asU8(x){
  if (x instanceof Uint8Array) return x;
  if (x && x.buffer != null && x.byteLength != null) return new Uint8Array(x.buffer, x.byteOffset || 0, x.byteLength);
  return new Uint8Array(x || 0);
}

var _HAS_STREAMS = (typeof CompressionStream !== 'undefined' &&
                    typeof DecompressionStream !== 'undefined' &&
                    typeof Response !== 'undefined');

export function compress_deflate(text, callback){
  var inputU8 = (text instanceof Uint8Array) ? text : _TE.encode(String(text));

  if (_HAS_STREAMS){
    try {
      var stream = new Response(inputU8).body.pipeThrough(new CompressionStream('deflate'));
      new Response(stream).arrayBuffer()
        .then(function(buf){ callback(new Uint8Array(buf)); })
        .catch(function(){ callback(null); });
      return;
    } catch(e) { /* fall through to Node */ }
  }

  var zlib = getZlib();
  if (zlib && zlib.deflate){
    zlib.deflate(Buffer.from(inputU8), { level: 9 }, function(err, result){
      callback(err ? null : new Uint8Array(result));
    });
    return;
  }
  callback(null);
}

// Decompression-bomb guard. DEFLATE compresses repetitive input ~1000:1, so a
// 50KB wire payload can inflate to 50MB — and this function feeds on
// peer-supplied bytes. Without a cap, a hostile peer exhausts memory (and the
// resulting allocation + GC pauses stall the event loop). Legitimate payloads
// here are SDPs and SDP diffs — kilobytes; even pathological simulcast SDPs
// stay far under 1MB — so an 8MB ceiling is generous headroom, not a tradeoff.
var MAX_INFLATED_SIZE = 8 * 1024 * 1024;

// Inflate to raw bytes. Single source of truth for both string and byte variants.
// Returns null (via callback) on error OR when the output exceeds MAX_INFLATED_SIZE.
export function decompress_deflate_bytes(u8, callback){
  var input = asU8(u8);

  if (_HAS_STREAMS){
    try {
      var stream = new Response(input).body.pipeThrough(new DecompressionStream('deflate'));
      // Read chunk-by-chunk instead of Response(stream).arrayBuffer(): the
      // latter buffers the ENTIRE output before we can see its size, which is
      // exactly what a bomb exploits. A reader lets us abort mid-stream the
      // moment the running total crosses the cap.
      var reader = stream.getReader();
      var chunks = [];
      var total = 0;
      function pump_read(){
        reader.read().then(function(res){
          if (res.done){
            var out = new Uint8Array(total), off = 0;
            for (var i=0; i<chunks.length; i++){ out.set(chunks[i], off); off += chunks[i].byteLength; }
            callback(out);
            return;
          }
          total += res.value.byteLength;
          if (total > MAX_INFLATED_SIZE){
            try { reader.cancel(); } catch(e){}
            callback(null);
            return;
          }
          chunks.push(res.value);
          pump_read();
        }).catch(function(){ callback(null); });
      }
      pump_read();
      return;
    } catch(e) { /* fall through to Node */ }
  }

  var zlib = getZlib();
  if (zlib && zlib.inflate){
    // maxOutputLength makes zlib itself abort past the cap (ERR_BUFFER_TOO_LARGE)
    // instead of allocating the full bomb.
    zlib.inflate(Buffer.from(input), { maxOutputLength: MAX_INFLATED_SIZE }, function(err, result){
      callback(err ? null : new Uint8Array(result));
    });
    return;
  }
  callback(null);
}

// Inflate to a UTF-8 string (used for RAW/DEFLATE SDP payloads).
export function decompress_deflate(u8, callback){
  decompress_deflate_bytes(u8, function(bytes){
    callback(bytes === null ? null : _TD.decode(bytes));
  });
}
