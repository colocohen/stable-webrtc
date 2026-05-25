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

// Inflate to raw bytes. Single source of truth for both string and byte variants.
export function decompress_deflate_bytes(u8, callback){
  var input = asU8(u8);

  if (_HAS_STREAMS){
    try {
      var stream = new Response(input).body.pipeThrough(new DecompressionStream('deflate'));
      new Response(stream).arrayBuffer()
        .then(function(buf){ callback(new Uint8Array(buf)); })
        .catch(function(){ callback(null); });
      return;
    } catch(e) { /* fall through to Node */ }
  }

  var zlib = getZlib();
  if (zlib && zlib.inflate){
    zlib.inflate(Buffer.from(input), function(err, result){
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
