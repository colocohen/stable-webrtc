/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// Signaling chunking — size-based splitting + all-or-nothing reassembly.
// Pure (depends only on litepack + the chunk schema); the engine owns the
// per-pipe state (stores, msg_id counters) and the pipe-specific framing.
// On an unreliable/unordered channel a lost chunk simply fails reassembly;
// there is NO per-chunk retransmit — the message-level logic re-sends the whole.

import litepack from 'litepack';
import { SCHEMA_SIGNAL_CHUNK } from './schemas.js';

export var CHUNK_HEADER_BUDGET = 16;        // bytes reserved per chunk for headers
export var CHUNK_REASSEMBLY_TIMEOUT = 5000; // drop partials older than this (ms)
export var CHUNK_MAX_OPEN = 16;             // cap concurrent partial reassemblies
export var CHUNK_MAX_TOTAL = 65536;         // reject absurd chunk counts (defensive)

// Split `bytes` into encoded SIGNAL_CHUNK bodies for a given msg_id.
export function build_chunks(bytes, limit, msg_id){
  var payloadSize = Math.max(1, limit - CHUNK_HEADER_BUDGET);
  var total = Math.ceil(bytes.byteLength / payloadSize) || 1;
  var out = [];
  for (var i=0;i<total;i++){
    var slice = bytes.subarray(i*payloadSize, Math.min((i+1)*payloadSize, bytes.byteLength));
    out.push(litepack.encode(SCHEMA_SIGNAL_CHUNK,{msg_id:msg_id,index:i,total:total,payload:slice}));
  }
  return out;
}

// Feed one encoded SIGNAL_CHUNK body into a per-pipe store object.
// Returns the complete Uint8Array when the final piece lands, else null.
// `now` is injectable for testing; defaults to Date.now().
export function reassemble_chunk(chunkBody, store, now){
  now = now || Date.now();
  for (var key in store){ if (now - store[key].ts > CHUNK_REASSEMBLY_TIMEOUT) delete store[key]; }

  var ch = litepack.decode(SCHEMA_SIGNAL_CHUNK, chunkBody);
  if (ch.total <= 0 || ch.total > CHUNK_MAX_TOTAL || ch.index >= ch.total) return null;

  var entry = store[ch.msg_id];
  if (!entry){
    var keys = Object.keys(store);
    if (keys.length >= CHUNK_MAX_OPEN){
      var oldest=keys[0], oldestTs=store[keys[0]].ts;
      for (var k=1;k<keys.length;k++){ if (store[keys[k]].ts<oldestTs){ oldest=keys[k]; oldestTs=store[keys[k]].ts; } }
      delete store[oldest];
    }
    entry = store[ch.msg_id] = { parts:new Array(ch.total), received:0, total:ch.total, ts:now };
  } else if (entry.total !== ch.total){
    // This chunk claims a different `total` than the one that opened the entry.
    // The guard above only validates index against the chunk's OWN claimed total, so
    // without this check a peer could send {total:2,index:0} then {total:99,index:50}:
    // received would reach entry.total(2) while parts[1] is still a hole, and the
    // assembly loop below would throw on undefined.byteLength — an unhandled throw
    // inside an event handler, i.e. a remote-triggerable crash.
    // Drop the chunk rather than resetting the entry: resetting would let a peer wipe
    // an in-flight reassembly. A genuinely stale entry (uint16 msg_id wraparound)
    // expires via the timeout sweep above.
    return null;
  }
  entry.ts = now;
  if (!entry.parts[ch.index]){ entry.parts[ch.index]=ch.payload; entry.received++; }

  if (entry.received === entry.total){
    var totalLen=0, j;
    for (j=0;j<entry.total;j++){
      if (!entry.parts[j]){ delete store[ch.msg_id]; return null; }   // defensive: never assemble over a hole
      totalLen += entry.parts[j].byteLength;
    }
    var full=new Uint8Array(totalLen), off=0;
    for (j=0;j<entry.total;j++){ full.set(entry.parts[j], off); off += entry.parts[j].byteLength; }
    delete store[ch.msg_id];
    return full;
  }
  return null;
}
