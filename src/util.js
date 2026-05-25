/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// Pure helpers: byte/U64 ops, IP encoding, murmurhash, Emitter, media guards.

// Reusable encoder — TextEncoder is stateless; allocating one per call (toU8 runs
// on every outgoing payload) is pure waste.
var _TE = new TextEncoder();

export function toU8(x){
    if (x == null) return new Uint8Array(0);
    if (x instanceof Uint8Array) return x;
    if (x instanceof ArrayBuffer) return new Uint8Array(x);
    if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset||0, x.byteLength||0);
    if (typeof x === 'string') return _TE.encode(x);
    // Anything else — convert to string
    return _TE.encode(String(x));
  }

export function parseIPv6Word(w){
    var n = parseInt(w||'0',16)>>>0;
    return [(n>>>8)&0xFF, n&0xFF];
  }
export function ipv6ToBytes(str){
    // Supports :: and missing groups
    var s = str || '';
    var pct = s.indexOf('%'); // strip scope-id if present
    if (pct>=0) s = s.slice(0,pct);
    var parts = s.split('::');
    var head = parts[0] ? parts[0].split(':') : [];
    var tail = parts[1] ? parts[1].split(':') : [];
    var missing = 8 - (head.length + tail.length);
    var bytes = [], i;
    for(i=0;i<head.length;i++){ bytes = bytes.concat(parseIPv6Word(head[i])); }
    for(i=0;i<missing;i++){ bytes.push(0,0); }
    for(i=0;i<tail.length;i++){ bytes = bytes.concat(parseIPv6Word(tail[i])); }
    return new Uint8Array(bytes);
  }
export function ipv4ToBytes(str){
    var p = (str||'').split('.');
    var out = new Uint8Array(4);
    out[0]=p[0]|0; out[1]=p[1]|0; out[2]=p[2]|0; out[3]=p[3]|0;
    return out;
  }
export function ipToBytes(str, family){
    if (family===6) return ipv6ToBytes(str);
    if (family===4) return ipv4ToBytes(str);
    return null;
  }

  // MurmurHash3 (x86, 32-bit). Two variants kept separate on purpose: the hot
  // loop reads charCodeAt for strings vs indexed bytes for Uint8Array, and
  // inlining avoids a per-iteration branch.
export function murmurhash3_str(text) {
    var key = String(text);
    var remainder = key.length & 3; // % 4
    var bytes = key.length - remainder;
    var h1 = 0;               // seed=0
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var i = 0, k1 = 0;

    while (i < bytes) {
      k1 = (key.charCodeAt(i) & 0xff) |
          ((key.charCodeAt(++i) & 0xff) << 8) |
          ((key.charCodeAt(++i) & 0xff) << 16) |
          ((key.charCodeAt(++i) & 0xff) << 24);
      ++i;

      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      var h1b = (((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;
    if (remainder === 3) {
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    }
    if (remainder >= 2) {
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    }
    if (remainder >= 1) {
      k1 ^= (key.charCodeAt(i) & 0xff);
      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= key.length;

    // fmix32
    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = (((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0; // convert to unsigned (0..4294967295)
  }

export function murmurhash3_data(key) {
    var remainder = key.length & 3; // % 4
    var bytes = key.length - remainder;
    var h1 = 0;               // seed=0
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var i = 0, k1 = 0;

    while (i < bytes) {
      k1 = (key[i] & 0xff) |
          ((key[++i] & 0xff) << 8) |
          ((key[++i] & 0xff) << 16) |
          ((key[++i] & 0xff) << 24);
      ++i;

      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      var h1b = (((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;
    if (remainder === 3) {
      k1 ^= (key[i + 2] & 0xff) << 16;
    }
    if (remainder >= 2) {
      k1 ^= (key[i + 1] & 0xff) << 8;
    }
    if (remainder >= 1) {
      k1 ^= (key[i] & 0xff);
      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= key.length;

    // fmix32
    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = (((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0; // unsigned 32bit
  }




  // --------- Simple Emitter ----------
export function Emitter(){
    var listeners = {};
    return {
      on: function(name, fn){ (listeners[name] = listeners[name] || []).push(fn); },
      off: function(name, fn){
        var arr = listeners[name];
        if(arr){ for(var i=arr.length-1;i>=0;i--){ if(arr[i]===fn) arr.splice(i,1); } }
      },
      emit: function(name){
        var args = Array.prototype.slice.call(arguments, 1);
        var arr = listeners[name] || [];
        for (var i=0;i<arr.length;i++){ try{ arr[i].apply(null, args); }catch(e){} }
      }
    };
  }


export function isMediaStream(x) {
    try {
      if (typeof MediaStream !== "undefined" && x instanceof MediaStream) {
        return true;
      }
    } catch (e) {}
    return !!x && typeof x.getTracks === "function";
  }

export function isMediaStreamTrack(x) {
    try {
      if (typeof MediaStreamTrack !== "undefined" && x instanceof MediaStreamTrack) {
        return true;
      }
    } catch (e) {}
    return !!x && typeof x.stop === "function" && typeof x.kind === "string";
  }

export function isTrackEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a === b) return true;

    var aHasId = (typeof a.id === 'string' && a.id.trim() !== '');
    var bHasId = (typeof b.id === 'string' && b.id.trim() !== '');

    if (aHasId && bHasId && a.id === b.id) {
      return true;
    }

    return false;
  }


export function is_ipv6_addr(addr) { return addr && addr.indexOf(':') !== -1; }

export function strip_brackets(a) {
    if (!a) return a;
    if (a.charAt(0) === '[' && a.charAt(a.length - 1) === ']') return a.substring(1, a.length - 1);
    return a;
  }

export function is_private_ipv4(a) {
    var parts = a.split('.');
    if (parts.length !== 4) return true;
    var p0 = Number(parts[0]), p1 = Number(parts[1]);
    if (p0 === 10) return true;
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    if (p0 === 192 && p1 === 168) return true;
    if (p0 === 169 && p1 === 254) return true; // link-local
    return false;
  }

export function is_private_ipv6(a) {
    a = a.toLowerCase();
    if (a.indexOf('::1') === 0) return true;
    if (a.indexOf('fe80:') === 0) return true; // link-local
    if (a.indexOf('fc00:') === 0 || a.indexOf('fd00:') === 0) return true; // unique-local
    return false;
  }

export function is_ip(a) {
    if (!a || a === '0.0.0.0' || a === '::' || a === '[::]' || a === '::1' || a === '[::1]') return false;
    if (a.indexOf('.local') !== -1) return false;
    return true;
  }

export function is_public_ip(a) {
    if (!is_ip(a)) return false;
    var v6 = is_ipv6_addr(a);
    a = strip_brackets(a);
    if (v6) return !is_private_ipv6(a);
    return !is_private_ipv4(a);
  }


