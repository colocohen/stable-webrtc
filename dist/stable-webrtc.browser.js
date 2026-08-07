var StableWebRTCModule = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../litepack/litepack.js
  var require_litepack = __commonJS({
    "../litepack/litepack.js"(exports, module) {
      (function(root, factory) {
        if (typeof exports === "object" && typeof module !== "undefined") module.exports = factory();
        else if (typeof define === "function" && define.amd) define(factory);
        else root.litepack = factory();
      })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : exports, function() {
        "use strict";
        var MAX_VARINT_BYTES = 8;
        function truncErr(msg) {
          var e = new Error(msg);
          e.truncated = true;
          return e;
        }
        function writeVarint(val, buf, pos) {
          if (typeof val !== "number") val = 0;
          else if (val < 0) throw new Error("litepack: varint cannot encode negative value " + val + " (use 'svarint' for signed)");
          else if (val > 9007199254740991) throw new Error("litepack: varint value " + val + " exceeds 2^53-1 (use uint64)");
          val = Math.floor(val);
          var start = pos;
          while (val > 127) {
            buf[pos++] = val % 128 | 128;
            val = Math.floor(val / 128);
          }
          buf[pos++] = val;
          return pos - start;
        }
        function readVarint(buf, pos) {
          var val = 0, n = 0, b, mul = 1;
          do {
            if (n >= MAX_VARINT_BYTES) throw new Error("litepack: malformed varint (too long) at byte " + (pos - n));
            b = buf[pos++];
            if (b === void 0) throw truncErr("litepack: truncated varint at byte " + (pos - 1));
            val += (b & 127) * mul;
            mul *= 128;
            n++;
          } while (b & 128);
          return { value: val, bytesRead: n };
        }
        function varintSize(val) {
          if (typeof val !== "number" || val < 0) val = 0;
          val = Math.floor(val);
          var n = 1;
          while (val > 127) {
            n++;
            val = Math.floor(val / 128);
          }
          return n;
        }
        function zigzag(v) {
          return v >= 0 ? v * 2 : -v * 2 - 1;
        }
        function unzigzag(v) {
          return v % 2 === 0 ? v / 2 : -(v + 1) / 2;
        }
        var _enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
        var _dec = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
        function utf8Encode2(str) {
          if (_enc) return _enc.encode(str);
          var arr = [];
          for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
              arr.push(c);
            } else if (c < 2048) {
              arr.push(192 | c >> 6, 128 | c & 63);
            } else if (c >= 55296 && c <= 56319 && i + 1 < str.length) {
              var next = str.charCodeAt(i + 1);
              if (next >= 56320 && next <= 57343) {
                c = (c - 55296 << 10) + (next - 56320) + 65536;
                i++;
                arr.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
              }
            } else {
              arr.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
            }
          }
          return new Uint8Array(arr);
        }
        function utf8ByteLength(str) {
          var bytes = 0;
          for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) bytes += 1;
            else if (c < 2048) bytes += 2;
            else if (c >= 55296 && c <= 56319 && i + 1 < str.length && str.charCodeAt(i + 1) >= 56320 && str.charCodeAt(i + 1) <= 57343) {
              bytes += 4;
              i++;
            } else bytes += 3;
          }
          return bytes;
        }
        function utf8Decode2(buf, offset, length) {
          if (_dec) return _dec.decode(buf.subarray(offset, offset + length));
          var str = "", end = offset + length, i = offset;
          while (i < end) {
            var c = buf[i++];
            if (c < 128) {
              str += String.fromCharCode(c);
            } else if (c < 224) {
              str += String.fromCharCode((c & 31) << 6 | buf[i++] & 63);
            } else if (c < 240) {
              str += String.fromCharCode((c & 15) << 12 | (buf[i++] & 63) << 6 | buf[i++] & 63);
            } else {
              var cp = (c & 7) << 18 | (buf[i++] & 63) << 12 | (buf[i++] & 63) << 6 | buf[i++] & 63;
              cp -= 65536;
              str += String.fromCharCode(55296 + (cp >> 10), 56320 + (cp & 1023));
            }
          }
          return str;
        }
        var _ab = new ArrayBuffer(8);
        var _dv = new DataView(_ab);
        var _u8 = new Uint8Array(_ab);
        var _codecs = {};
        var TYPES = {};
        TYPES.uint8 = {
          size: 1,
          write: function(v, buf, pos) {
            buf[pos] = v & 255;
            return 1;
          },
          read: function(buf, pos) {
            return { value: buf[pos], bytesRead: 1 };
          }
        };
        TYPES.int8 = {
          size: 1,
          write: function(v, buf, pos) {
            buf[pos] = v & 255;
            return 1;
          },
          read: function(buf, pos) {
            var x = buf[pos];
            return { value: x > 127 ? x - 256 : x, bytesRead: 1 };
          }
        };
        TYPES.uint16 = {
          size: 2,
          write: function(v, buf, pos) {
            buf[pos] = v >> 8 & 255;
            buf[pos + 1] = v & 255;
            return 2;
          },
          read: function(buf, pos) {
            return { value: buf[pos] << 8 | buf[pos + 1], bytesRead: 2 };
          }
        };
        TYPES.int16 = {
          size: 2,
          write: function(v, buf, pos) {
            buf[pos] = v >> 8 & 255;
            buf[pos + 1] = v & 255;
            return 2;
          },
          read: function(buf, pos) {
            var x = buf[pos] << 8 | buf[pos + 1];
            return { value: x > 32767 ? x - 65536 : x, bytesRead: 2 };
          }
        };
        TYPES.uint32 = {
          size: 4,
          write: function(v, buf, pos) {
            buf[pos] = v >>> 24 & 255;
            buf[pos + 1] = v >>> 16 & 255;
            buf[pos + 2] = v >>> 8 & 255;
            buf[pos + 3] = v & 255;
            return 4;
          },
          read: function(buf, pos) {
            return { value: (buf[pos] << 24 | buf[pos + 1] << 16 | buf[pos + 2] << 8 | buf[pos + 3]) >>> 0, bytesRead: 4 };
          }
        };
        TYPES.int32 = {
          size: 4,
          write: function(v, buf, pos) {
            buf[pos] = v >> 24 & 255;
            buf[pos + 1] = v >> 16 & 255;
            buf[pos + 2] = v >> 8 & 255;
            buf[pos + 3] = v & 255;
            return 4;
          },
          read: function(buf, pos) {
            return { value: buf[pos] << 24 | buf[pos + 1] << 16 | buf[pos + 2] << 8 | buf[pos + 3], bytesRead: 4 };
          }
        };
        TYPES.uint64 = {
          size: 8,
          write: function(v, buf, pos) {
            var hi, lo;
            if (typeof v === "bigint") {
              hi = Number(v >> BigInt(32)) >>> 0;
              lo = Number(v & BigInt(4294967295)) >>> 0;
            } else {
              hi = v / 4294967296 >>> 0;
              lo = v >>> 0;
            }
            buf[pos] = hi >>> 24 & 255;
            buf[pos + 1] = hi >>> 16 & 255;
            buf[pos + 2] = hi >>> 8 & 255;
            buf[pos + 3] = hi & 255;
            buf[pos + 4] = lo >>> 24 & 255;
            buf[pos + 5] = lo >>> 16 & 255;
            buf[pos + 6] = lo >>> 8 & 255;
            buf[pos + 7] = lo & 255;
            return 8;
          },
          read: function(buf, pos) {
            var hi = (buf[pos] << 24 | buf[pos + 1] << 16 | buf[pos + 2] << 8 | buf[pos + 3]) >>> 0;
            var lo = (buf[pos + 4] << 24 | buf[pos + 5] << 16 | buf[pos + 6] << 8 | buf[pos + 7]) >>> 0;
            var v = hi * 4294967296 + lo;
            if (v > 9007199254740991 && typeof BigInt !== "undefined") {
              v = BigInt(hi) << BigInt(32) | BigInt(lo);
            }
            return { value: v, bytesRead: 8 };
          }
        };
        TYPES.int64 = {
          size: 8,
          write: function(v, buf, pos) {
            var hi, lo;
            if (typeof v === "bigint") {
              var u = BigInt.asUintN(64, v);
              hi = Number(u >> BigInt(32)) >>> 0;
              lo = Number(u & BigInt(4294967295)) >>> 0;
            } else {
              v = v || 0;
              lo = (v % 4294967296 + 4294967296) % 4294967296;
              hi = Math.floor(v / 4294967296);
              if (hi < 0) hi += 4294967296;
            }
            return writeI64(hi, lo, buf, pos);
          },
          read: function(buf, pos) {
            var hi = (buf[pos] << 24 | buf[pos + 1] << 16 | buf[pos + 2] << 8 | buf[pos + 3]) >>> 0;
            var lo = (buf[pos + 4] << 24 | buf[pos + 5] << 16 | buf[pos + 6] << 8 | buf[pos + 7]) >>> 0;
            var v;
            if (hi & 2147483648) {
              v = -((4294967295 - hi) * 4294967296 + (4294967296 - lo));
              if (v < -9007199254740991 && typeof BigInt !== "undefined") {
                v = BigInt.asIntN(64, BigInt(hi) << BigInt(32) | BigInt(lo));
              }
            } else {
              v = hi * 4294967296 + lo;
              if (v > 9007199254740991 && typeof BigInt !== "undefined") {
                v = BigInt(hi) << BigInt(32) | BigInt(lo);
              }
            }
            return { value: v, bytesRead: 8 };
          }
        };
        function writeI64(hi, lo, buf, pos) {
          buf[pos] = hi >>> 24 & 255;
          buf[pos + 1] = hi >>> 16 & 255;
          buf[pos + 2] = hi >>> 8 & 255;
          buf[pos + 3] = hi & 255;
          buf[pos + 4] = lo >>> 24 & 255;
          buf[pos + 5] = lo >>> 16 & 255;
          buf[pos + 6] = lo >>> 8 & 255;
          buf[pos + 7] = lo & 255;
          return 8;
        }
        TYPES.float32 = {
          size: 4,
          write: function(v, buf, pos) {
            _dv.setFloat32(0, v, false);
            buf[pos] = _u8[0];
            buf[pos + 1] = _u8[1];
            buf[pos + 2] = _u8[2];
            buf[pos + 3] = _u8[3];
            return 4;
          },
          read: function(buf, pos) {
            _u8[0] = buf[pos];
            _u8[1] = buf[pos + 1];
            _u8[2] = buf[pos + 2];
            _u8[3] = buf[pos + 3];
            return { value: _dv.getFloat32(0, false), bytesRead: 4 };
          }
        };
        TYPES.float64 = {
          size: 8,
          write: function(v, buf, pos) {
            _dv.setFloat64(0, v, false);
            for (var i = 0; i < 8; i++) buf[pos + i] = _u8[i];
            return 8;
          },
          read: function(buf, pos) {
            for (var i = 0; i < 8; i++) _u8[i] = buf[pos + i];
            return { value: _dv.getFloat64(0, false), bytesRead: 8 };
          }
        };
        TYPES.bool = {
          size: 1,
          write: function(v, buf, pos) {
            buf[pos] = v ? 1 : 0;
            return 1;
          },
          read: function(buf, pos) {
            return { value: buf[pos] !== 0, bytesRead: 1 };
          }
        };
        TYPES.varint = {
          size: null,
          write: function(v, buf, pos) {
            return writeVarint(v, buf, pos);
          },
          read: function(buf, pos) {
            return readVarint(buf, pos);
          }
        };
        TYPES.uuid = {
          size: 16,
          write: function(v, buf, pos) {
            if (v && v.length) buf.set(v.subarray ? v.subarray(0, 16) : v, pos);
            else for (var i = 0; i < 16; i++) buf[pos + i] = 0;
            return 16;
          },
          read: function(buf, pos) {
            if (pos + 16 > buf.length) throw truncErr("litepack: truncated uuid at byte " + pos);
            return { value: buf.subarray(pos, pos + 16), bytesRead: 16 };
          }
        };
        TYPES.svarint = {
          size: null,
          write: function(v, buf, pos) {
            if (typeof v !== "number") v = 0;
            return writeVarint(zigzag(Math.round(v)), buf, pos);
          },
          read: function(buf, pos) {
            var r = readVarint(buf, pos);
            return { value: unzigzag(r.value), bytesRead: r.bytesRead };
          }
        };
        var _hasEncodeInto = _enc && typeof _enc.encodeInto === "function";
        TYPES.string = {
          size: null,
          write: function(v, buf, pos) {
            var s = v == null ? "" : String(v);
            var len = utf8ByteLength(s);
            var lb = writeVarint(len, buf, pos);
            if (_hasEncodeInto) {
              _enc.encodeInto(s, buf.subarray(pos + lb, pos + lb + len));
            } else {
              buf.set(utf8Encode2(s), pos + lb);
            }
            return lb + len;
          },
          read: function(buf, pos) {
            var l = readVarint(buf, pos);
            if (pos + l.bytesRead + l.value > buf.length) {
              throw truncErr("litepack: truncated string at byte " + pos + " (declared " + l.value + " bytes, " + (buf.length - pos - l.bytesRead) + " remain)");
            }
            return { value: utf8Decode2(buf, pos + l.bytesRead, l.value), bytesRead: l.bytesRead + l.value };
          }
        };
        TYPES.bytes = {
          size: null,
          write: function(v, buf, pos) {
            var d = v || new Uint8Array(0);
            var lb = writeVarint(d.length, buf, pos);
            buf.set(d, pos + lb);
            return lb + d.length;
          },
          read: function(buf, pos) {
            var l = readVarint(buf, pos);
            var s = pos + l.bytesRead;
            if (s + l.value > buf.length) {
              throw truncErr("litepack: truncated bytes at byte " + pos + " (declared " + l.value + " bytes, " + (buf.length - s) + " remain)");
            }
            return { value: buf.subarray(s, s + l.value), bytesRead: l.bytesRead + l.value };
          }
        };
        TYPES.uint8s = TYPES.bytes;
        TYPES.tail = {
          size: null,
          isTail: true,
          write: function(v, buf, pos) {
            var d = v || new Uint8Array(0);
            buf.set(d, pos);
            return d.length;
          },
          read: function(buf, pos, end) {
            return { value: buf.subarray(pos, end), bytesRead: end - pos };
          }
        };
        TYPES.bits = { size: null };
        TYPES.enum = { size: null };
        TYPES.set = { size: null };
        TYPES.fixed = { size: null };
        TYPES.struct = { size: null };
        TYPES.array = { size: null };
        var MAX_OPTIONAL_FIELDS = 52;
        var NEEDS_DEF = { bits: 1, "enum": 1, set: 1, fixed: 1, struct: 1, array: 1, map: 1, "const": 1 };
        var KNOWN_OPTIONS = { "default": 1 };
        function isOptionsObject(o) {
          var any = false;
          for (var k in o) {
            if (!o.hasOwnProperty(k)) continue;
            if (!KNOWN_OPTIONS[k]) return false;
            any = true;
          }
          return any;
        }
        function cloneDefault(v) {
          if (Array.isArray(v)) return v.slice();
          if (v && typeof v === "object") {
            var o = {};
            for (var k in v) if (v.hasOwnProperty(k)) o[k] = v[k];
            return o;
          }
          return v;
        }
        function compileFields(fieldDefs, nested) {
          var fields = [];
          var optionalCount = 0;
          for (var i = 0; i < fieldDefs.length; i++) {
            var fd = fieldDefs[i];
            var fname = fd[0];
            var ftype = fd[1];
            var optional = false;
            var f0default, f0hasDefault = false;
            if (typeof ftype !== "string") {
              throw new Error("litepack: field '" + fname + "' \u2014 type must be a string, got " + typeof ftype);
            }
            if (fd.length > 2) {
              var lastEl = fd[fd.length - 1];
              if (lastEl && typeof lastEl === "object" && !Array.isArray(lastEl) && isOptionsObject(lastEl)) {
                fd = fd.slice(0, -1);
                if (lastEl.hasOwnProperty("default")) {
                  f0default = lastEl["default"];
                  f0hasDefault = true;
                }
              }
            }
            if (ftype === "timestamp") ftype = "varint";
            else if (ftype === "timestamp?") ftype = "varint?";
            else if (ftype === "uint8s") ftype = "bytes";
            else if (ftype === "uint8s?") ftype = "bytes?";
            if (ftype.charAt(ftype.length - 1) === "?") {
              optional = true;
              ftype = ftype.substring(0, ftype.length - 1);
            }
            if (ftype === "tail") {
              if (nested) {
                throw new Error("litepack: field '" + fname + "' \u2014 'tail' is not allowed inside a nested struct or array item (no defined end); use 'bytes' (length-prefixed) instead");
              }
              if (i !== fieldDefs.length - 1) {
                throw new Error("litepack: field '" + fname + "' \u2014 'tail' must be the last field in the schema");
              }
            }
            if (NEEDS_DEF[ftype] && fd[2] === void 0) {
              throw new Error("litepack: field '" + fname + "' \u2014 type '" + ftype + "' requires a definition (third element), e.g. ['" + fname + "', '" + ftype + "', ...]");
            }
            if (ftype === "const" && fd.length < 4) {
              throw new Error("litepack: field '" + fname + "' \u2014 const requires a base type AND a value: ['" + fname + "', 'const', 'uint8', 64]");
            }
            if (ftype === "map" && typeof fd[3] !== "string") {
              throw new Error("litepack: field '" + fname + "' \u2014 map requires key and value types: ['" + fname + "', 'map', 'string', 'varint']");
            }
            var f = {
              name: fname,
              type: ftype,
              optional,
              hasDefault: f0hasDefault,
              defaultValue: f0default,
              optionalIndex: optional ? optionalCount : -1,
              optionalBit: optional ? Math.pow(2, optionalCount) : 0,
              isTail: ftype === "tail",
              bitsDef: null,
              variants: null,
              fixedSize: null,
              write: null,
              read: null
            };
            if (optional) {
              optionalCount++;
              if (optionalCount > MAX_OPTIONAL_FIELDS) {
                throw new Error("litepack: more than " + MAX_OPTIONAL_FIELDS + " optional fields in one struct (bitmask limit) \u2014 split into nested structs");
              }
            }
            if (ftype === "bits" && fd[2]) {
              f.bitsDef = compileBits(fd[2]);
              f.fixedSize = f.bitsDef.totalBytes;
              f.write = createBitsWriter(f.bitsDef);
              f.read = createBitsReader(f.bitsDef);
            } else if (ftype === "enum" && fd[2]) {
              f.enumOpts = fd[2];
              f.write = createEnumWriter(fd[2], fname);
              f.read = createEnumReader(fd[2]);
            } else if (ftype === "set" && fd[2]) {
              if (fd[2].length > MAX_SET_OPTIONS) {
                throw new Error("litepack: field '" + fname + "' \u2014 set supports up to " + MAX_SET_OPTIONS + " options, got " + fd[2].length);
              }
              f.setOpts = fd[2];
              f.write = createSetWriter(fd[2], fname);
              f.read = createSetReader(fd[2]);
            } else if (ftype === "map" && fd[2]) {
              f.mapDef = compileMap(fd, fname);
              f.write = createMapWriter(f.mapDef, fname);
              f.read = createMapReader(f.mapDef);
            } else if (ftype === "const" && fd.length >= 4) {
              var cBase = resolveType(fd[2], fname);
              var cVal = fd[3];
              if (!cBase.write || !cBase.read) {
                throw new Error("litepack: field '" + fname + "' \u2014 const base type '" + fd[2] + "' is not a simple type");
              }
              f.constValue = cVal;
              f.constBaseType = fd[2];
              f.fixedSize = cBase.size;
              f.write = /* @__PURE__ */ (function(base, cv) {
                return function(val, buf, pos) {
                  return base.write(cv, buf, pos);
                };
              })(cBase, cVal);
              f.read = /* @__PURE__ */ (function(base, cv, nm) {
                return function(buf, pos) {
                  var r = base.read(buf, pos);
                  if (r.value !== cv) {
                    throw new Error("litepack: field '" + nm + "' \u2014 const mismatch (expected " + JSON.stringify(cv) + ", got " + JSON.stringify(r.value) + ")");
                  }
                  return r;
                };
              })(cBase, cVal, fname);
            } else if (ftype === "fixed" && fd[2]) {
              f.fixedLen = fd[2];
              f.fixedSize = fd[2];
              f.write = createFixedWriter(fd[2]);
              f.read = createFixedReader(fd[2]);
            } else if (ftype === "struct" && fd[2]) {
              f.structDef = compileFields(fd[2], true);
              f.write = createStructWriter(f.structDef);
              f.read = createStructReader(f.structDef);
            } else if (ftype === "array" && fd[2]) {
              var arr = compileArrayItem(fd);
              f.arrayItem = arr.itemField;
              f.arrayFixedCount = arr.fixedCount;
              f.write = createArrayWriter(arr.itemField, arr.fixedCount);
              f.read = createArrayReader(arr.itemField, arr.fixedCount);
            } else if (fd[2] && typeof fd[2] === "object" && !Array.isArray(fd[2])) {
              var typeDef = resolveType(ftype, fname);
              f.write = typeDef.write;
              f.read = typeDef.read;
              f.fixedSize = typeDef.size;
              f.variants = {};
              for (var key in fd[2]) {
                if (fd[2].hasOwnProperty(key)) f.variants[key] = compileFields(fd[2][key], nested);
              }
            } else {
              var typeDef = resolveType(ftype, fname);
              f.write = typeDef.write;
              f.read = typeDef.read;
              f.fixedSize = typeDef.size;
            }
            fields.push(f);
          }
          return { fields, optionalCount };
        }
        function resolveType(name, fieldName) {
          var t = TYPES[name];
          if (t) return t;
          var codec2 = _codecs[name];
          if (codec2) return codec2;
          throw new Error("litepack: unknown type '" + name + "'" + (fieldName ? " for field '" + fieldName + "'" : "") + " \u2014 known types: " + Object.keys(TYPES).join(", "));
        }
        function compileBits(bitsDef) {
          var subFields = [];
          var totalBits = 0;
          for (var i = 0; i < bitsDef.length; i++) {
            var w = bitsDef[i][1];
            if (typeof w !== "number" || w < 1 || w > 32) {
              throw new Error("litepack: bits field '" + bitsDef[i][0] + "' has invalid width " + w + " (must be 1-32)");
            }
            subFields.push({ name: bitsDef[i][0], width: w });
            totalBits += w;
          }
          return { subFields, totalBits, totalBytes: Math.ceil(totalBits / 8) };
        }
        function createBitsWriter(def) {
          if (def.totalBits <= 31) return function(val, buf, pos) {
            var packed = 0;
            for (var i = 0; i < def.subFields.length; i++) {
              var sf = def.subFields[i];
              var v = val && val[sf.name] || 0;
              packed = packed << sf.width | v & (1 << sf.width) - 1;
            }
            for (var b = def.totalBytes - 1; b >= 0; b--) {
              buf[pos + b] = packed & 255;
              packed = packed >>> 8;
            }
            return def.totalBytes;
          };
          return function(val, buf, pos) {
            for (var b = 0; b < def.totalBytes; b++) buf[pos + b] = 0;
            var bitPos = 0;
            for (var i = 0; i < def.subFields.length; i++) {
              var sf = def.subFields[i];
              var v = (val && val[sf.name] || 0) >>> 0;
              for (var w = sf.width - 1; w >= 0; w--) {
                if ((w < 31 ? v >>> w : Math.floor(v / 2147483648)) & 1) {
                  buf[pos + (bitPos >> 3)] |= 128 >> (bitPos & 7);
                }
                bitPos++;
              }
            }
            return def.totalBytes;
          };
        }
        function createBitsReader(def) {
          if (def.totalBits <= 31) return function(buf, pos) {
            var packed = 0;
            for (var b = 0; b < def.totalBytes; b++) packed = packed << 8 | buf[pos + b];
            var result = {};
            var remaining = def.totalBits;
            for (var i = 0; i < def.subFields.length; i++) {
              var sf = def.subFields[i];
              remaining -= sf.width;
              result[sf.name] = packed >>> remaining & (1 << sf.width) - 1;
            }
            return { value: result, bytesRead: def.totalBytes };
          };
          return function(buf, pos) {
            var result = {};
            var bitPos = 0;
            for (var i = 0; i < def.subFields.length; i++) {
              var sf = def.subFields[i];
              var v = 0;
              for (var w = 0; w < sf.width; w++) {
                v = v * 2 + (buf[pos + (bitPos >> 3)] >> 7 - (bitPos & 7) & 1);
                bitPos++;
              }
              result[sf.name] = v;
            }
            return { value: result, bytesRead: def.totalBytes };
          };
        }
        function buildIndexMap(opts) {
          var m = {};
          for (var i = 0; i < opts.length; i++) m[opts[i]] = i;
          return m;
        }
        function createEnumWriter(opts, fieldName) {
          var idxMap = buildIndexMap(opts);
          return function(val, buf, pos) {
            var idx = idxMap[val] !== void 0 ? idxMap[val] : -1;
            if (idx === -1) {
              if (typeof val === "number" && val >= 0) return writeVarint(val, buf, pos);
              if (val === void 0 || val === null) return writeVarint(0, buf, pos);
              throw new Error("litepack: field '" + fieldName + "' \u2014 unknown enum value " + JSON.stringify(val) + " (options: " + opts.join(", ") + ")");
            }
            return writeVarint(idx, buf, pos);
          };
        }
        function createEnumReader(opts) {
          return function(buf, pos) {
            var r = readVarint(buf, pos);
            return { value: r.value < opts.length ? opts[r.value] : r.value, bytesRead: r.bytesRead };
          };
        }
        var MAX_SET_OPTIONS = 52;
        function createSetWriter(opts, fieldName) {
          var idxMap = buildIndexMap(opts);
          return function(val, buf, pos) {
            var mask = 0;
            if (val) {
              for (var i = 0; i < val.length; i++) {
                var idx = idxMap[val[i]] !== void 0 ? idxMap[val[i]] : -1;
                if (idx === -1) {
                  throw new Error("litepack: field '" + fieldName + "' \u2014 unknown set value " + JSON.stringify(val[i]) + " (options: " + opts.join(", ") + ")");
                }
                var bit = Math.pow(2, idx);
                if (Math.floor(mask / bit) % 2 === 0) mask += bit;
              }
            }
            return writeVarint(mask, buf, pos);
          };
        }
        function createSetReader(opts) {
          return function(buf, pos) {
            var r = readVarint(buf, pos);
            var arr = [];
            var mask = r.value;
            for (var i = 0; i < opts.length && mask > 0; i++) {
              if (mask % 2 === 1) arr.push(opts[i]);
              mask = Math.floor(mask / 2);
            }
            return { value: arr, bytesRead: r.bytesRead };
          };
        }
        function createFixedWriter(len) {
          return function(val, buf, pos) {
            var d = val || new Uint8Array(len);
            buf.set(d.length > len ? d.subarray(0, len) : d, pos);
            if (d.length < len) for (var i = d.length; i < len; i++) buf[pos + i] = 0;
            return len;
          };
        }
        function compileMap(fd, fname) {
          var keyType = fd[2];
          var valType = fd[3];
          var def = { keyField: makeSimpleField(keyType, fname + ".<key>"), numericKeys: keyType !== "string" };
          if (valType === "struct") {
            if (!Array.isArray(fd[4])) {
              throw new Error("litepack: field '" + fname + "' \u2014 map with struct values needs a schema: ['" + fname + "', 'map', '" + keyType + "', 'struct', [...]]");
            }
            var sd = compileFields(fd[4], true);
            def.valField = {
              type: "struct",
              fixedSize: null,
              structDef: sd,
              write: createStructWriter(sd),
              read: createStructReader(sd)
            };
          } else {
            def.valField = makeSimpleField(valType, fname + ".<value>");
          }
          return def;
        }
        function makeSimpleField(typeName, ctx) {
          if (typeName === "array" || typeName === "map" || typeName === "bits" || typeName === "tail" || typeName === "const" || typeName === "fixed") {
            throw new Error("litepack: '" + typeName + "' is not supported here (" + ctx + ") \u2014 wrap it in a struct");
          }
          var t = resolveType(typeName, ctx);
          return { type: typeName, fixedSize: t.size, write: t.write, read: t.read };
        }
        function createMapWriter(def, fieldName) {
          return function(val, buf, pos) {
            var keys = val ? Object.keys(val) : [];
            var start = pos;
            pos += writeVarint(keys.length, buf, pos);
            for (var i = 0; i < keys.length; i++) {
              var k = def.numericKeys ? Number(keys[i]) : keys[i];
              pos += def.keyField.write(k, buf, pos);
              pos += def.valField.write(val[keys[i]], buf, pos);
            }
            return pos - start;
          };
        }
        function createMapReader(def) {
          var minPair = (def.keyField.fixedSize || 1) + (def.valField.fixedSize || 1);
          return function(buf, pos) {
            var start = pos;
            var cr = readVarint(buf, pos);
            pos += cr.bytesRead;
            if (cr.value * minPair > buf.length - pos) {
              throw truncErr("litepack: map at byte " + start + " needs more bytes (count " + cr.value + ", " + (buf.length - pos) + " remain)");
            }
            var out = {};
            for (var i = 0; i < cr.value; i++) {
              var kr = def.keyField.read(buf, pos);
              pos += kr.bytesRead;
              var vr = def.valField.read(buf, pos);
              pos += vr.bytesRead;
              out[kr.value] = vr.value;
            }
            return { value: out, bytesRead: pos - start };
          };
        }
        function createFixedReader(len) {
          return function(buf, pos) {
            if (pos + len > buf.length) {
              throw truncErr("litepack: truncated fixed(" + len + ") at byte " + pos);
            }
            return { value: buf.subarray(pos, pos + len), bytesRead: len };
          };
        }
        function createStructWriter(compiled) {
          return function(val, buf, pos) {
            var start = pos;
            pos = encodeFields(compiled.fields, compiled.optionalCount, val || {}, buf, pos);
            return pos - start;
          };
        }
        function createStructReader(compiled) {
          return function(buf, pos) {
            var start = pos;
            var data = {};
            pos = decodeFields(compiled.fields, compiled.optionalCount, buf, pos, data, buf.length);
            return { value: data, bytesRead: pos - start };
          };
        }
        var UNSUPPORTED_ARRAY_ITEM = { array: 1, map: 1, bits: 1, fixed: 1, tail: 1, "const": 1 };
        function compileArrayItem(fd) {
          var itemType = fd[2];
          if (typeof itemType !== "string") {
            throw new Error("litepack: field '" + fd[0] + "' \u2014 array requires an item type, e.g. ['" + fd[0] + "', 'array', 'uint16']");
          }
          if (UNSUPPORTED_ARRAY_ITEM[itemType]) {
            throw new Error("litepack: field '" + fd[0] + "' \u2014 '" + itemType + "' is not supported directly as an array item; wrap it in a struct, e.g. ['" + fd[0] + "', 'array', 'struct', [['inner', '" + itemType + "', ...]]]");
          }
          var itemField = { type: itemType, fixedSize: null };
          var nextIdx = 3;
          var fixedCount = null;
          if (itemType === "struct" && Array.isArray(fd[nextIdx])) {
            itemField.structDef = compileFields(fd[nextIdx], true);
            itemField.write = createStructWriter(itemField.structDef);
            itemField.read = createStructReader(itemField.structDef);
            nextIdx++;
          } else if (itemType === "enum" && Array.isArray(fd[nextIdx])) {
            itemField.enumOpts = fd[nextIdx];
            itemField.write = createEnumWriter(fd[nextIdx], fd[0]);
            itemField.read = createEnumReader(fd[nextIdx]);
            nextIdx++;
          } else if (itemType === "set" && Array.isArray(fd[nextIdx])) {
            itemField.setOpts = fd[nextIdx];
            itemField.write = createSetWriter(fd[nextIdx], fd[0]);
            itemField.read = createSetReader(fd[nextIdx]);
            nextIdx++;
          } else if (itemType === "bits" && Array.isArray(fd[nextIdx])) {
            var def = compileBits(fd[nextIdx]);
            itemField.bitsDef = def;
            itemField.fixedSize = def.totalBytes;
            itemField.write = createBitsWriter(def);
            itemField.read = createBitsReader(def);
            nextIdx++;
          } else if (itemType === "fixed" && typeof fd[nextIdx] === "number") {
            itemField.fixedLen = fd[nextIdx];
            itemField.fixedSize = fd[nextIdx];
            itemField.write = createFixedWriter(fd[nextIdx]);
            itemField.read = createFixedReader(fd[nextIdx]);
            nextIdx++;
          } else {
            var t = resolveType(itemType, fd[0]);
            itemField.write = t.write;
            itemField.read = t.read;
            itemField.fixedSize = t.size;
          }
          if (typeof fd[nextIdx] === "number") fixedCount = fd[nextIdx];
          return { itemField, fixedCount };
        }
        function createArrayWriter(itemField, fixedCount) {
          return function(val, buf, pos) {
            var a = val || [];
            var start = pos;
            if (fixedCount === null) pos += writeVarint(a.length, buf, pos);
            var count = fixedCount !== null ? fixedCount : a.length;
            for (var i = 0; i < count; i++) {
              pos += itemField.write(a[i], buf, pos);
            }
            return pos - start;
          };
        }
        function createArrayReader(itemField, fixedCount) {
          var minItemSize = itemField.fixedSize || 1;
          return function(buf, pos) {
            var start = pos;
            var count;
            if (fixedCount !== null) {
              count = fixedCount;
            } else {
              var cr = readVarint(buf, pos);
              count = cr.value;
              pos += cr.bytesRead;
            }
            if (count * minItemSize > buf.length - pos) {
              throw truncErr("litepack: array at byte " + start + " needs more bytes (count " + count + ", " + (buf.length - pos) + " remain)");
            }
            var arr = new Array(count);
            for (var i = 0; i < count; i++) {
              var r = itemField.read(buf, pos);
              arr[i] = r.value;
              pos += r.bytesRead;
            }
            return { value: arr, bytesRead: pos - start };
          };
        }
        function buildBitmask(fields, data) {
          var bitmask = 0;
          for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.optional) {
              var val = data[f.name];
              if (val !== void 0 && val !== null) bitmask += f.optionalBit;
            }
          }
          return bitmask;
        }
        function bitmaskHas(bitmask, f) {
          return Math.floor(bitmask / f.optionalBit) % 2 === 1;
        }
        function encodeFields(fields, optionalCount, data, buf, pos) {
          if (optionalCount > 0) pos += writeVarint(buildBitmask(fields, data), buf, pos);
          for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.optional) {
              var val = data[f.name];
              if (val === void 0 || val === null) continue;
            }
            pos += f.write(data[f.name], buf, pos);
            if (f.variants) {
              var key = String(data[f.name]);
              var vd = f.variants[key];
              if (vd) pos = encodeFields(vd.fields, vd.optionalCount, data, buf, pos);
            }
          }
          return pos;
        }
        function decodeFields(fields, optionalCount, buf, pos, data, bufEnd) {
          var bitmask = 0;
          if (optionalCount > 0) {
            var br = readVarint(buf, pos);
            bitmask = br.value;
            pos += br.bytesRead;
          }
          for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.optional && !bitmaskHas(bitmask, f)) {
              if (f.hasDefault) data[f.name] = cloneDefault(f.defaultValue);
              continue;
            }
            if (pos >= bufEnd && !f.isTail) {
              throw truncErr("litepack: truncated input \u2014 buffer ended before field '" + f.name + "'");
            }
            var result = f.isTail ? f.read(buf, pos, bufEnd) : f.read(buf, pos);
            data[f.name] = result.value;
            pos += result.bytesRead;
            if (pos > bufEnd) {
              throw truncErr("litepack: truncated input \u2014 field '" + f.name + "' ran past end of buffer");
            }
            if (f.variants) {
              var key = String(result.value);
              var vd = f.variants[key];
              if (vd) {
                pos = decodeFields(vd.fields, vd.optionalCount, buf, pos, data, bufEnd);
              } else {
                data._unknownVariant = true;
              }
            }
          }
          return pos;
        }
        function estimateSingleField(f, val) {
          if (f.fixedSize) return f.fixedSize;
          if (f.isTail) return val && val.length || 0;
          switch (f.type) {
            case "string":
              var slen = utf8ByteLength(val == null ? "" : String(val));
              return varintSize(slen) + slen;
            case "bytes":
              var len = val && val.length || 0;
              return varintSize(len) + len;
            case "varint":
              return varintSize(val || 0);
            case "svarint":
              return varintSize(zigzag(Math.round(typeof val === "number" ? val : 0)));
            case "enum":
              var idx = f.enumOpts ? f.enumOpts.indexOf(val) : 0;
              if (idx === -1 && typeof val === "number" && val >= 0) return varintSize(val);
              return varintSize(idx === -1 ? 0 : idx);
            case "set":
              var mask = 0;
              if (val && f.setOpts) {
                for (var j = 0; j < val.length; j++) {
                  var fi = f.setOpts.indexOf(val[j]);
                  if (fi !== -1) {
                    var bit = Math.pow(2, fi);
                    if (Math.floor(mask / bit) % 2 === 0) mask += bit;
                  }
                }
              }
              return varintSize(mask);
            case "fixed":
              return f.fixedLen;
            case "const":
              return estimateSingleField({ type: f.constBaseType, fixedSize: f.fixedSize }, f.constValue);
            case "map":
              var mk = val ? Object.keys(val) : [];
              var ms = varintSize(mk.length);
              for (var j = 0; j < mk.length; j++) {
                ms += estimateSingleField(f.mapDef.keyField, f.mapDef.numericKeys ? Number(mk[j]) : mk[j]);
                ms += estimateSingleField(f.mapDef.valField, val[mk[j]]);
              }
              return ms;
            case "struct":
              return estimateFieldSize(f.structDef.fields, f.structDef.optionalCount, val || {});
            case "array":
              var a = val || [];
              var count = f.arrayFixedCount !== null ? f.arrayFixedCount : a.length;
              var s = f.arrayFixedCount !== null ? 0 : varintSize(count);
              for (var j = 0; j < count; j++) {
                s += estimateSingleField(f.arrayItem, a[j]);
              }
              return s;
            default:
              var codec2 = _codecs[f.type];
              if (codec2 && codec2.estimateSize) return codec2.estimateSize(val);
              if (codec2) {
                var tmp = new Uint8Array(65536);
                return codec2.write(val, tmp, 0);
              }
              return 0;
          }
        }
        function estimateFieldSize(fields, optionalCount, data) {
          var size = 0;
          if (optionalCount > 0) size += varintSize(buildBitmask(fields, data));
          for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.optional) {
              var val = data[f.name];
              if (val === void 0 || val === null) continue;
            }
            size += estimateSingleField(f, data[f.name]);
            if (f.variants) {
              var key = String(data[f.name]);
              var vd = f.variants[key];
              if (vd) size += estimateFieldSize(vd.fields, vd.optionalCount, data);
            }
          }
          return size;
        }
        var litepack2 = {};
        var _compiled = typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : null;
        function compileDef(schema) {
          if (_compiled) {
            var c = _compiled.get(schema);
            if (!c) {
              c = compileFields(schema);
              _compiled.set(schema, c);
            }
            return c;
          }
          if (schema._lp) return schema._lp;
          schema._lp = compileFields(schema);
          return schema._lp;
        }
        litepack2.encode = function(schema, data) {
          var c = compileDef(schema);
          data = data || {};
          var buf = new Uint8Array(estimateFieldSize(c.fields, c.optionalCount, data) + 16);
          var pos = encodeFields(c.fields, c.optionalCount, data, buf, 0);
          if (pos > buf.length) throw new Error("litepack: encoded size exceeded estimate \u2014 custom codec with non-deterministic encode()?");
          return buf.subarray(0, pos);
        };
        function normalizeBuf(buf, opts) {
          if (buf instanceof ArrayBuffer) buf = new Uint8Array(buf);
          if (opts && opts.copy) buf = new Uint8Array(buf);
          return buf;
        }
        litepack2.decode = function(schema, buf, opts) {
          buf = normalizeBuf(buf, opts);
          var c = compileDef(schema);
          var data = {};
          decodeFields(c.fields, c.optionalCount, buf, 0, data, buf.length);
          return data;
        };
        litepack2.codec = function(name, codec2) {
          if (!codec2 || typeof codec2.encode !== "function" || typeof codec2.decode !== "function") {
            throw new Error("litepack.codec: requires { encode, decode }");
          }
          TYPES[name] = _codecs[name] = {
            size: null,
            write: function(val, buf, pos) {
              var encoded = codec2.encode(val);
              var lb = writeVarint(encoded.length, buf, pos);
              buf.set(encoded, pos + lb);
              return lb + encoded.length;
            },
            read: function(buf, pos) {
              var l = readVarint(buf, pos);
              var s = pos + l.bytesRead;
              return { value: codec2.decode(buf.subarray(s, s + l.value)), bytesRead: l.bytesRead + l.value };
            },
            estimateSize: function(val) {
              var encoded = codec2.encode(val);
              return varintSize(encoded.length) + encoded.length;
            }
          };
        };
        litepack2.compile = function(schema) {
          var c = compileFields(schema);
          return {
            encode: function(data) {
              data = data || {};
              var buf = new Uint8Array(estimateFieldSize(c.fields, c.optionalCount, data) + 16);
              var pos = encodeFields(c.fields, c.optionalCount, data, buf, 0);
              if (pos > buf.length) throw new Error("litepack: encoded size exceeded estimate \u2014 custom codec with non-deterministic encode()?");
              return buf.subarray(0, pos);
            },
            decode: function(buf, opts) {
              buf = normalizeBuf(buf, opts);
              var data = {};
              decodeFields(c.fields, c.optionalCount, buf, 0, data, buf.length);
              return data;
            },
            byteLength: function(data) {
              return estimateFieldSize(c.fields, c.optionalCount, data || {});
            }
          };
        };
        litepack2.tryDecode = function(schema, buf, opts) {
          try {
            return litepack2.decode(schema, buf, opts);
          } catch (e) {
            return null;
          }
        };
        litepack2.byteLength = function(schema, data) {
          var c = compileDef(schema);
          return estimateFieldSize(c.fields, c.optionalCount, data || {});
        };
        litepack2.decodeFrom = function(schema, buf, offset, opts) {
          buf = normalizeBuf(buf, opts);
          offset = offset || 0;
          var c = compileDef(schema);
          var data = {};
          var end = decodeFields(c.fields, c.optionalCount, buf, offset, data, buf.length);
          return { value: data, bytesRead: end - offset };
        };
        litepack2.encodeInto = function(schema, data, buf, offset) {
          offset = offset || 0;
          data = data || {};
          var c = compileDef(schema);
          var need = estimateFieldSize(c.fields, c.optionalCount, data);
          if (offset + need > buf.length) {
            throw new Error("litepack: encodeInto needs " + need + " bytes at offset " + offset + ", buffer has " + (buf.length - offset));
          }
          return encodeFields(c.fields, c.optionalCount, data, buf, offset) - offset;
        };
        litepack2.concat = function(list) {
          var total = 0, i;
          for (i = 0; i < list.length; i++) total += list[i].length;
          var out = new Uint8Array(total);
          var pos = 0;
          for (i = 0; i < list.length; i++) {
            out.set(list[i], pos);
            pos += list[i].length;
          }
          return out;
        };
        litepack2.reader = function(buf, opts) {
          buf = normalizeBuf(buf, opts);
          var r = {
            offset: 0,
            read: function(schema) {
              var res = litepack2.decodeFrom(schema, buf, r.offset);
              r.offset += res.bytesRead;
              return res.value;
            },
            tryRead: function(schema) {
              try {
                return r.read(schema);
              } catch (e) {
                return null;
              }
            },
            peek: function(schema) {
              return litepack2.decodeFrom(schema, buf, r.offset).value;
            },
            skip: function(n) {
              r.offset += n;
              return r;
            },
            remaining: function() {
              return buf.length - r.offset;
            },
            eof: function() {
              return r.offset >= buf.length;
            }
          };
          return r;
        };
        litepack2.writer = function() {
          var parts = [];
          var total = 0;
          var w = {
            write: function(schema, data) {
              var c = compileDef(schema);
              data = data || {};
              var size = estimateFieldSize(c.fields, c.optionalCount, data);
              parts.push([c, data, size]);
              total += size;
              return w;
            },
            raw: function(bytes) {
              parts.push([null, bytes, bytes.length]);
              total += bytes.length;
              return w;
            },
            byteLength: function() {
              return total;
            },
            bytes: function() {
              var buf = new Uint8Array(total);
              var pos = 0;
              for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                if (p[0] === null) {
                  buf.set(p[1], pos);
                  pos += p[2];
                } else pos = encodeFields(p[0].fields, p[0].optionalCount, p[1], buf, pos);
              }
              if (pos > buf.length) throw new Error("litepack: writer overflow \u2014 custom codec with non-deterministic encode()?");
              return pos === total ? buf : buf.subarray(0, pos);
            }
          };
          return w;
        };
        litepack2.assertComplete = function(schema, data, _path) {
          var c = compileDef(schema);
          var path = _path || "";
          data = data || {};
          for (var i = 0; i < c.fields.length; i++) {
            var f = c.fields[i];
            var val = data[f.name];
            if (f.optional) continue;
            if (val === void 0 || val === null) {
              throw new Error("litepack: missing required field '" + path + f.name + "'");
            }
            if (f.type === "struct" && f.structDef) {
              litepack2.assertComplete._check(f.structDef, val, path + f.name + ".");
            }
          }
          return true;
        };
        litepack2.assertComplete._check = function(compiled, data, path) {
          for (var i = 0; i < compiled.fields.length; i++) {
            var f = compiled.fields[i];
            var val = (data || {})[f.name];
            if (f.optional) continue;
            if (val === void 0 || val === null) {
              throw new Error("litepack: missing required field '" + path + f.name + "'");
            }
            if (f.type === "struct" && f.structDef) {
              litepack2.assertComplete._check(f.structDef, val, path + f.name + ".");
            }
          }
        };
        litepack2.codec("json", {
          encode: function(v) {
            return utf8Encode2(JSON.stringify(v === void 0 ? null : v));
          },
          decode: function(b) {
            return JSON.parse(utf8Decode2(b, 0, b.length));
          }
        });
        litepack2.version = "1.2.0";
        return litepack2;
      });
    }
  });

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    default: () => stdin_default
  });

  // ../litepack/litepack.mjs
  var import_litepack = __toESM(require_litepack(), 1);
  var litepack_default = import_litepack.default;
  var encode = import_litepack.default.encode;
  var decode = import_litepack.default.decode;
  var codec = import_litepack.default.codec;

  // ../compact-delta/dist/compact-delta.mjs
  var M_RAW = 0;
  var M_BYTEDIFF = 1;
  var M_LCS = 2;
  var TE = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  var TD = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
  function utf8Encode(s) {
    if (TE) return TE.encode(s);
    return new Uint8Array(Buffer.from(s, "utf8"));
  }
  function utf8Decode(u8) {
    if (TD) return TD.decode(u8);
    return Buffer.from(u8).toString("utf8");
  }
  function isU8(x) {
    return x != null && Object.prototype.toString.call(x) === "[object Uint8Array]";
  }
  function toU8(x) {
    if (isU8(x)) return x;
    if (typeof x === "string") return utf8Encode(x);
    if (x && x.buffer instanceof ArrayBuffer) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
    throw new TypeError("compact-delta: expected Uint8Array or string");
  }
  function bytesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function Writer() {
    this.buf = new Uint8Array(256);
    this.len = 0;
  }
  Writer.prototype._ensure = function(extra) {
    var need = this.len + extra;
    if (need <= this.buf.length) return;
    var cap = this.buf.length;
    while (cap < need) cap *= 2;
    var next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  };
  Writer.prototype.byte = function(b) {
    this._ensure(1);
    this.buf[this.len++] = b & 255;
  };
  Writer.prototype.varint = function(n) {
    this._ensure(5);
    n = n >>> 0;
    while (n >= 128) {
      this.buf[this.len++] = n & 127 | 128;
      n >>>= 7;
    }
    this.buf[this.len++] = n;
  };
  Writer.prototype.bytes = function(u8, start, length) {
    this._ensure(length);
    this.buf.set(u8.subarray(start, start + length), this.len);
    this.len += length;
  };
  Writer.prototype.finish = function() {
    return this.buf.subarray(0, this.len);
  };
  function Reader(u8) {
    this.u8 = u8;
    this.pos = 0;
  }
  Reader.prototype.byte = function() {
    if (this.pos >= this.u8.length) throw new Error("compact-delta: truncated delta");
    return this.u8[this.pos++];
  };
  Reader.prototype.varint = function() {
    var r = 0, sh = 0, b;
    do {
      if (this.pos >= this.u8.length) throw new Error("compact-delta: truncated varint");
      b = this.u8[this.pos++];
      if (sh === 28 && b & 240) throw new Error("compact-delta: varint overflow");
      r |= (b & 127) << sh;
      sh += 7;
    } while (b & 128);
    return r >>> 0;
  };
  Reader.prototype.eof = function() {
    return this.pos >= this.u8.length;
  };
  var DEFAULT_WINDOW = 16;
  var RK_BASE = 257;
  var MAX_CHAIN = 32;
  var HASH_MIX = 15;
  var POW_CACHE = /* @__PURE__ */ Object.create(null);
  function rkPow(win) {
    var p = POW_CACHE[win];
    if (p === void 0) {
      p = 1;
      for (var i = 0; i < win - 1; i++) p = Math.imul(p, RK_BASE) >>> 0;
      POW_CACHE[win] = p;
    }
    return p;
  }
  var OP_COPY = 0;
  var OP_INSERT = 1;
  function buildChains(base, win) {
    var n = base.length;
    if (n < win) return null;
    var count = n - win + 1;
    var tsize = 1;
    while (tsize < count * 2 && tsize < 1 << 24) tsize <<= 1;
    var mask = tsize - 1;
    var head = new Int32Array(tsize).fill(-1);
    var next = new Int32Array(count);
    var pow = rkPow(win);
    var h = 0, i;
    for (i = 0; i < win; i++) h = Math.imul(h, RK_BASE) + base[i] >>> 0;
    var slot = (h ^ h >>> HASH_MIX) & mask;
    next[0] = head[slot];
    head[slot] = 0;
    for (var off = 1; off < count; off++) {
      h = Math.imul(h - Math.imul(base[off - 1], pow) >>> 0, RK_BASE) + base[off + win - 1] >>> 0;
      slot = (h ^ h >>> HASH_MIX) & mask;
      next[off] = head[slot];
      head[slot] = off;
    }
    return { head, next, mask };
  }
  function matchLength(base, baseOff, target, targetOff, win) {
    var n = 0;
    if (Math.min(base.length - baseOff, target.length - targetOff) < win) return 0;
    for (; n < win; n++) if (base[baseOff + n] !== target[targetOff + n]) return 0;
    var bLen = base.length, tLen = target.length;
    while (baseOff + n < bLen && targetOff + n < tLen && base[baseOff + n] === target[targetOff + n]) n++;
    return n;
  }
  function bytediffEncode(base, target, win) {
    win = win || DEFAULT_WINDOW;
    var chains = buildChains(base, win);
    var w = new Writer();
    var tLen = target.length, bLen = base.length;
    var pow = rkPow(win);
    var i = 0, pendingStart = 0, h = 0, primed = false;
    function flush(upTo) {
      if (upTo > pendingStart) {
        w.byte(OP_INSERT);
        var len = upTo - pendingStart;
        w.varint(len);
        w.bytes(target, pendingStart, len);
      }
    }
    if (chains) {
      var head = chains.head, next = chains.next, mask = chains.mask;
      while (i < tLen) {
        if (i + win <= tLen) {
          if (!primed) {
            h = 0;
            for (var k = 0; k < win; k++) h = Math.imul(h, RK_BASE) + target[i + k] >>> 0;
            primed = true;
          }
          var e = head[(h ^ h >>> HASH_MIX) & mask];
          var best = 0, bestOff = -1, tries = MAX_CHAIN;
          while (e !== -1 && tries-- > 0) {
            if (i + best >= tLen) break;
            if (e + best < bLen && base[e + best] === target[i + best]) {
              var ml = matchLength(base, e, target, i, win);
              if (ml > best) {
                best = ml;
                bestOff = e;
              }
            }
            e = next[e];
          }
          if (best >= win) {
            while (bestOff > 0 && i > pendingStart && base[bestOff - 1] === target[i - 1]) {
              bestOff--;
              i--;
              best++;
            }
            flush(i);
            w.byte(OP_COPY);
            w.varint(bestOff);
            w.varint(best);
            i += best;
            pendingStart = i;
            primed = false;
            continue;
          }
          if (i + win < tLen) {
            h = Math.imul(h - Math.imul(target[i], pow) >>> 0, RK_BASE) + target[i + win] >>> 0;
          } else primed = false;
          i++;
        } else i++;
      }
    } else {
      i = tLen;
    }
    flush(tLen);
    return w.finish();
  }
  function bytediffDecode(base, r, out) {
    while (!r.eof()) {
      var op = r.byte();
      if (op === OP_COPY) {
        var off = r.varint(), len = r.varint();
        if (off + len > base.length) throw new Error("compact-delta: COPY out of base bounds");
        out.bytes(base, off, len);
      } else if (op === OP_INSERT) {
        var ilen = r.varint();
        if (r.pos + ilen > r.u8.length) throw new Error("compact-delta: truncated INSERT");
        out.bytes(r.u8, r.pos, ilen);
        r.pos += ilen;
      } else throw new Error("delta: corrupt bytediff op " + op);
    }
  }
  var DIFF_DELETE = -1;
  var DIFF_INSERT = 1;
  var DIFF_EQUAL = 0;
  function myersDiff(a, b, deadline) {
    if (deadline == null) deadline = Date.now() + 1e3;
    if (a === b) return a ? [[DIFF_EQUAL, a]] : [];
    var pre = commonPrefix(a, b);
    var cp = a.substring(0, pre);
    a = a.substring(pre);
    b = b.substring(pre);
    var suf = commonSuffix(a, b);
    var cs = a.substring(a.length - suf);
    a = a.substring(0, a.length - suf);
    b = b.substring(0, b.length - suf);
    var diffs = myersCompute(a, b, deadline);
    if (cp) diffs.unshift([DIFF_EQUAL, cp]);
    if (cs) diffs.push([DIFF_EQUAL, cs]);
    cleanupMerge(diffs);
    return diffs;
  }
  function commonPrefix(a, b) {
    var n = Math.min(a.length, b.length);
    for (var i = 0; i < n; i++) if (a[i] !== b[i]) return i;
    return n;
  }
  function commonSuffix(a, b) {
    var n = Math.min(a.length, b.length);
    for (var i = 1; i <= n; i++) if (a[a.length - i] !== b[b.length - i]) return i - 1;
    return n;
  }
  function myersCompute(a, b, deadline) {
    if (!a) return [[DIFF_INSERT, b]];
    if (!b) return [[DIFF_DELETE, a]];
    var lt = a.length > b.length ? a : b, st = a.length > b.length ? b : a;
    var idx = lt.indexOf(st);
    if (idx !== -1) {
      var d = [[DIFF_INSERT, lt.substring(0, idx)], [DIFF_EQUAL, st], [DIFF_INSERT, lt.substring(idx + st.length)]];
      if (a.length > b.length) {
        d[0][0] = d[2][0] = DIFF_DELETE;
      }
      return d;
    }
    if (st.length === 1) return [[DIFF_DELETE, a], [DIFF_INSERT, b]];
    return myersBisect(a, b, deadline);
  }
  function myersBisect(a, b, deadline) {
    var n = a.length, m = b.length, max = Math.ceil((n + m) / 2), vo = max, vl = 2 * max;
    var v1 = new Int32Array(vl).fill(-1);
    var v2 = new Int32Array(vl).fill(-1);
    v1[vo + 1] = 0;
    v2[vo + 1] = 0;
    var delta = n - m, front = delta % 2 !== 0;
    for (var d = 0; d < max; d++) {
      if (Date.now() > deadline) break;
      for (var k1 = -d; k1 <= d; k1 += 2) {
        var k1o = vo + k1, x1;
        if (k1 === -d || k1 !== d && v1[k1o - 1] < v1[k1o + 1]) x1 = v1[k1o + 1];
        else x1 = v1[k1o - 1] + 1;
        var y1 = x1 - k1;
        while (x1 < n && y1 < m && a.charCodeAt(x1) === b.charCodeAt(y1)) {
          x1++;
          y1++;
        }
        v1[k1o] = x1;
        if (x1 > n) continue;
        if (front) {
          var k2o = vo + delta - k1;
          if (k2o >= 0 && k2o < vl && v2[k2o] !== -1 && x1 >= n - v2[k2o]) return myersSplit(a, b, x1, y1, deadline);
        }
      }
      for (var k2 = -d; k2 <= d; k2 += 2) {
        var k2o2 = vo + k2, x2;
        if (k2 === -d || k2 !== d && v2[k2o2 - 1] < v2[k2o2 + 1]) x2 = v2[k2o2 + 1];
        else x2 = v2[k2o2 - 1] + 1;
        var y2 = x2 - k2;
        while (x2 < n && y2 < m && a.charCodeAt(n - x2 - 1) === b.charCodeAt(m - y2 - 1)) {
          x2++;
          y2++;
        }
        v2[k2o2] = x2;
        if (!front) {
          var k1o2 = vo + delta - k2;
          if (k1o2 >= 0 && k1o2 < vl && v1[k1o2] !== -1) {
            var xx = v1[k1o2], yy = xx - (k1o2 - vo);
            if (xx >= n - x2) return myersSplit(a, b, xx, yy, deadline);
          }
        }
      }
    }
    return [[DIFF_DELETE, a], [DIFF_INSERT, b]];
  }
  function myersSplit(a, b, x, y, deadline) {
    return myersDiff(a.substring(0, x), b.substring(0, y), deadline).concat(myersDiff(a.substring(x), b.substring(y), deadline));
  }
  function cleanupMerge(diffs) {
    diffs.push([DIFF_EQUAL, ""]);
    var ptr = 0, countDelete = 0, countInsert = 0, textDelete = "", textInsert = "", commonlength;
    while (ptr < diffs.length) {
      switch (diffs[ptr][0]) {
        case DIFF_INSERT:
          countInsert++;
          textInsert += diffs[ptr][1];
          ptr++;
          break;
        case DIFF_DELETE:
          countDelete++;
          textDelete += diffs[ptr][1];
          ptr++;
          break;
        case DIFF_EQUAL:
          if (countDelete + countInsert > 1) {
            if (countDelete !== 0 && countInsert !== 0) {
              commonlength = commonPrefix(textInsert, textDelete);
              if (commonlength !== 0) {
                if (ptr - countDelete - countInsert > 0 && diffs[ptr - countDelete - countInsert - 1][0] === DIFF_EQUAL) {
                  diffs[ptr - countDelete - countInsert - 1][1] += textInsert.substring(0, commonlength);
                } else {
                  diffs.splice(0, 0, [DIFF_EQUAL, textInsert.substring(0, commonlength)]);
                  ptr++;
                }
                textInsert = textInsert.substring(commonlength);
                textDelete = textDelete.substring(commonlength);
              }
              commonlength = commonSuffix(textInsert, textDelete);
              if (commonlength !== 0) {
                diffs[ptr][1] = textInsert.substring(textInsert.length - commonlength) + diffs[ptr][1];
                textInsert = textInsert.substring(0, textInsert.length - commonlength);
                textDelete = textDelete.substring(0, textDelete.length - commonlength);
              }
            }
            ptr -= countDelete + countInsert;
            diffs.splice(ptr, countDelete + countInsert);
            if (textDelete.length) {
              diffs.splice(ptr, 0, [DIFF_DELETE, textDelete]);
              ptr++;
            }
            if (textInsert.length) {
              diffs.splice(ptr, 0, [DIFF_INSERT, textInsert]);
              ptr++;
            }
            ptr++;
          } else if (ptr !== 0 && diffs[ptr - 1][0] === DIFF_EQUAL) {
            diffs[ptr - 1][1] += diffs[ptr][1];
            diffs.splice(ptr, 1);
          } else ptr++;
          countInsert = 0;
          countDelete = 0;
          textDelete = "";
          textInsert = "";
          break;
      }
    }
    if (diffs.length && diffs[diffs.length - 1][1] === "") diffs.pop();
  }
  function bytesToLatin1(u8) {
    var CHUNK = 32768, parts = [];
    for (var i = 0; i < u8.length; i += CHUNK) parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK)));
    return parts.join("");
  }
  var LCS_EQUAL = 0;
  var LCS_INSERT = 1;
  var LCS_DELETE = 2;
  function lcsEncode(base, target, budgetMs) {
    var deadline = Date.now() + (typeof budgetMs === "number" ? budgetMs : 1e3);
    var diffs = myersDiff(bytesToLatin1(base), bytesToLatin1(target), deadline);
    while (diffs.length && diffs[diffs.length - 1][0] === DIFF_DELETE) diffs.pop();
    var w = new Writer();
    for (var i = 0; i < diffs.length; i++) {
      var op = diffs[i][0], s = diffs[i][1], len = s.length;
      if (op === DIFF_EQUAL) {
        w.byte(LCS_EQUAL);
        w.varint(len);
      } else if (op === DIFF_DELETE) {
        w.byte(LCS_DELETE);
        w.varint(len);
      } else {
        w.byte(LCS_INSERT);
        w.varint(len);
        for (var j = 0; j < len; j++) w.byte(s.charCodeAt(j));
      }
    }
    return w.finish();
  }
  function lcsDecode(base, r, out) {
    var basePos = 0;
    while (!r.eof()) {
      var op = r.byte(), len = r.varint();
      if (op === LCS_EQUAL) {
        if (basePos + len > base.length) throw new Error("compact-delta: EQUAL out of base bounds");
        out.bytes(base, basePos, len);
        basePos += len;
      } else if (op === LCS_DELETE) {
        basePos += len;
      } else if (op === LCS_INSERT) {
        if (r.pos + len > r.u8.length) throw new Error("compact-delta: truncated INSERT");
        out.bytes(r.u8, r.pos, len);
        r.pos += len;
      } else throw new Error("delta: corrupt lcs op " + op);
    }
  }
  var METHOD_NAMES = { 0: "raw", 1: "bytediff", 2: "lcs" };
  var LCS_MIN_BUDGET_MS = 5;
  var LCS_SKIP_BELOW = 64;
  function tryEncodeSync(baseInput, targetInput, options) {
    var base = toU8(baseInput), target = toU8(targetInput);
    if (typeof options === "string") options = { method: options };
    options = options || {};
    var minRatio = typeof options.minRatio === "number" ? options.minRatio : 1;
    var method = options.method || "auto";
    var strict = options.strict === true;
    var win = typeof options.window === "number" ? options.window : DEFAULT_WINDOW;
    var lcsMs = typeof options.lcsMs === "number" ? options.lcsMs : 1e3;
    var exhaustive = options.exhaustive === true;
    if (method !== "auto" && method !== "bytediff" && method !== "lcs" && method !== "raw") {
      throw new TypeError("compact-delta: method must be 'auto', 'bytediff', 'lcs', or 'raw'");
    }
    if (win < 4 || win > 1024) {
      throw new TypeError("compact-delta: window must be between 4 and 1024");
    }
    var tag, payload, candidates = null;
    if (method === "auto" && target.length >= 2 && bytesEqual(base, target)) {
      var we = new Writer();
      we.byte(LCS_EQUAL);
      we.varint(base.length);
      tag = M_LCS;
      payload = we.finish();
    } else if (method === "auto" && base.length === 0) {
      tag = M_RAW;
      payload = target;
    } else if (method === "raw") {
      tag = M_RAW;
      payload = target;
    } else if (method === "bytediff" || method === "lcs") {
      payload = method === "bytediff" ? bytediffEncode(base, target, win) : lcsEncode(base, target, lcsMs);
      tag = method === "bytediff" ? M_BYTEDIFF : M_LCS;
      if (!strict && payload.length >= target.length) {
        tag = M_RAW;
        payload = target;
      }
    } else {
      var bd = bytediffEncode(base, target, win);
      tag = M_RAW;
      payload = target;
      if (bd.length < payload.length) {
        tag = M_BYTEDIFF;
        payload = bd;
      }
      candidates = { raw: 1 + target.length, bytediff: 1 + bd.length };
      var bestRatio = target.length ? payload.length / target.length : 0;
      var budget = exhaustive ? lcsMs : Math.min(lcsMs, lcsMs * bestRatio);
      var runLcs = exhaustive || budget >= LCS_MIN_BUDGET_MS && payload.length > LCS_SKIP_BELOW;
      if (runLcs) {
        var lcs = lcsEncode(base, target, budget);
        candidates.lcs = 1 + lcs.length;
        if (lcs.length < payload.length) {
          tag = M_LCS;
          payload = lcs;
        }
      }
    }
    var deltaBytes = prepend(tag, payload);
    var worthwhile = tag !== M_RAW && deltaBytes.length < minRatio * target.length;
    return {
      method: METHOD_NAMES[tag],
      delta: deltaBytes,
      worthwhile,
      size: deltaBytes.length,
      raw: target.length,
      ratio: target.length ? deltaBytes.length / target.length : 0,
      candidates
    };
  }
  var schedule = typeof queueMicrotask === "function" ? queueMicrotask : function(fn) {
    Promise.resolve().then(fn);
  };
  function runAsync(cb, work) {
    if (typeof cb !== "function") {
      throw new TypeError("compact-delta: a callback function is required as the last argument");
    }
    schedule(function() {
      var err = null, result;
      try {
        result = work();
      } catch (e) {
        err = e;
      }
      cb(err, result);
    });
  }
  function splitOptsCb(opt, cb) {
    if (typeof opt === "function") {
      return { options: void 0, cb: opt };
    }
    return { options: opt, cb };
  }
  function encodeString(base, target, opt, cb) {
    var a = splitOptsCb(opt, cb);
    runAsync(a.cb, function() {
      if (typeof base !== "string" || typeof target !== "string") {
        throw new TypeError("compact-delta: encodeString expects string arguments (use encode for bytes)");
      }
      return tryEncodeSync(utf8Encode(base), utf8Encode(target), a.options).delta;
    });
  }
  function decodeString(base, delta, cb) {
    runAsync(cb, function() {
      if (typeof base !== "string") {
        throw new TypeError("compact-delta: decodeString expects a string base (use decode for bytes)");
      }
      return utf8Decode(decodeSync(utf8Encode(base), delta));
    });
  }
  function prepend(tag, payload) {
    var out = new Uint8Array(payload.length + 1);
    out[0] = tag;
    out.set(payload, 1);
    return out;
  }
  function decodeSync(baseInput, deltaInput) {
    var base = toU8(baseInput), delta = toU8(deltaInput);
    if (delta.length === 0) throw new Error("compact-delta: empty input");
    var tag = delta[0];
    var r = new Reader(delta);
    r.pos = 1;
    var out = new Writer();
    if (tag === M_RAW) out.bytes(delta, 1, delta.length - 1);
    else if (tag === M_BYTEDIFF) bytediffDecode(base, r, out);
    else if (tag === M_LCS) lcsDecode(base, r, out);
    else throw new Error("compact-delta: unknown method tag 0x" + tag.toString(16));
    return out.finish();
  }

  // src/util.js
  var _TE = new TextEncoder();
  function toU82(x) {
    if (x == null) return new Uint8Array(0);
    if (x instanceof Uint8Array) return x;
    if (x instanceof ArrayBuffer) return new Uint8Array(x);
    if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset || 0, x.byteLength || 0);
    if (typeof x === "string") return _TE.encode(x);
    return _TE.encode(String(x));
  }
  function parseIPv6Word(w) {
    var n = parseInt(w || "0", 16) >>> 0;
    return [n >>> 8 & 255, n & 255];
  }
  function ipv6ToBytes(str) {
    var s = str || "";
    var pct = s.indexOf("%");
    if (pct >= 0) s = s.slice(0, pct);
    var parts = s.split("::");
    var head = parts[0] ? parts[0].split(":") : [];
    var tail = parts[1] ? parts[1].split(":") : [];
    var missing = 8 - (head.length + tail.length);
    var bytes = [], i;
    for (i = 0; i < head.length; i++) {
      bytes = bytes.concat(parseIPv6Word(head[i]));
    }
    for (i = 0; i < missing; i++) {
      bytes.push(0, 0);
    }
    for (i = 0; i < tail.length; i++) {
      bytes = bytes.concat(parseIPv6Word(tail[i]));
    }
    return new Uint8Array(bytes);
  }
  function ipv4ToBytes(str) {
    var p = (str || "").split(".");
    var out = new Uint8Array(4);
    out[0] = p[0] | 0;
    out[1] = p[1] | 0;
    out[2] = p[2] | 0;
    out[3] = p[3] | 0;
    return out;
  }
  function ipToBytes(str, family) {
    if (family === 6) return ipv6ToBytes(str);
    if (family === 4) return ipv4ToBytes(str);
    return null;
  }
  function murmurhash3_str(text) {
    var key = String(text);
    var remainder = key.length & 3;
    var bytes = key.length - remainder;
    var h1 = 0;
    var c1 = 3432918353;
    var c2 = 461845907;
    var i = 0, k1 = 0;
    while (i < bytes) {
      k1 = key.charCodeAt(i) & 255 | (key.charCodeAt(++i) & 255) << 8 | (key.charCodeAt(++i) & 255) << 16 | (key.charCodeAt(++i) & 255) << 24;
      ++i;
      k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
      k1 = k1 << 15 | k1 >>> 17;
      k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
      h1 ^= k1;
      h1 = h1 << 13 | h1 >>> 19;
      var h1b = (h1 & 65535) * 5 + (((h1 >>> 16) * 5 & 65535) << 16) & 4294967295;
      h1 = (h1b & 65535) + 27492 + (((h1b >>> 16) + 58964 & 65535) << 16);
    }
    k1 = 0;
    if (remainder === 3) {
      k1 ^= (key.charCodeAt(i + 2) & 255) << 16;
    }
    if (remainder >= 2) {
      k1 ^= (key.charCodeAt(i + 1) & 255) << 8;
    }
    if (remainder >= 1) {
      k1 ^= key.charCodeAt(i) & 255;
      k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
      k1 = k1 << 15 | k1 >>> 17;
      k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
      h1 ^= k1;
    }
    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = (h1 & 65535) * 2246822507 + (((h1 >>> 16) * 2246822507 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 13;
    h1 = (h1 & 65535) * 3266489909 + (((h1 >>> 16) * 3266489909 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
  }
  function murmurhash3_data(key) {
    var remainder = key.length & 3;
    var bytes = key.length - remainder;
    var h1 = 0;
    var c1 = 3432918353;
    var c2 = 461845907;
    var i = 0, k1 = 0;
    while (i < bytes) {
      k1 = key[i] & 255 | (key[++i] & 255) << 8 | (key[++i] & 255) << 16 | (key[++i] & 255) << 24;
      ++i;
      k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
      k1 = k1 << 15 | k1 >>> 17;
      k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
      h1 ^= k1;
      h1 = h1 << 13 | h1 >>> 19;
      var h1b = (h1 & 65535) * 5 + (((h1 >>> 16) * 5 & 65535) << 16) & 4294967295;
      h1 = (h1b & 65535) + 27492 + (((h1b >>> 16) + 58964 & 65535) << 16);
    }
    k1 = 0;
    if (remainder === 3) {
      k1 ^= (key[i + 2] & 255) << 16;
    }
    if (remainder >= 2) {
      k1 ^= (key[i + 1] & 255) << 8;
    }
    if (remainder >= 1) {
      k1 ^= key[i] & 255;
      k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
      k1 = k1 << 15 | k1 >>> 17;
      k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
      h1 ^= k1;
    }
    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = (h1 & 65535) * 2246822507 + (((h1 >>> 16) * 2246822507 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 13;
    h1 = (h1 & 65535) * 3266489909 + (((h1 >>> 16) * 3266489909 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
  }
  function Emitter() {
    var listeners = {};
    return {
      on: function(name, fn) {
        (listeners[name] = listeners[name] || []).push(fn);
      },
      off: function(name, fn) {
        var arr = listeners[name];
        if (arr) {
          for (var i = arr.length - 1; i >= 0; i--) {
            if (arr[i] === fn) arr.splice(i, 1);
          }
        }
      },
      emit: function(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        var arr = listeners[name] || [];
        for (var i = 0; i < arr.length; i++) {
          try {
            arr[i].apply(null, args);
          } catch (e) {
          }
        }
      }
    };
  }
  function isMediaStream(x) {
    try {
      if (typeof MediaStream !== "undefined" && x instanceof MediaStream) {
        return true;
      }
    } catch (e) {
    }
    return !!x && typeof x.getTracks === "function";
  }
  function isMediaStreamTrack(x) {
    try {
      if (typeof MediaStreamTrack !== "undefined" && x instanceof MediaStreamTrack) {
        return true;
      }
    } catch (e) {
    }
    return !!x && typeof x.stop === "function" && typeof x.kind === "string";
  }
  function isTrackEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a === b) return true;
    var aHasId = typeof a.id === "string" && a.id.trim() !== "";
    var bHasId = typeof b.id === "string" && b.id.trim() !== "";
    if (aHasId && bHasId && a.id === b.id) {
      return true;
    }
    return false;
  }
  function is_ipv6_addr(addr) {
    return addr && addr.indexOf(":") !== -1;
  }
  function strip_brackets(a) {
    if (!a) return a;
    if (a.charAt(0) === "[" && a.charAt(a.length - 1) === "]") return a.substring(1, a.length - 1);
    return a;
  }
  function is_private_ipv4(a) {
    var parts = a.split(".");
    if (parts.length !== 4) return true;
    var p0 = Number(parts[0]), p1 = Number(parts[1]);
    if (p0 === 10) return true;
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    if (p0 === 192 && p1 === 168) return true;
    if (p0 === 169 && p1 === 254) return true;
    return false;
  }
  function is_private_ipv6(a) {
    a = a.toLowerCase();
    if (a.indexOf("::1") === 0) return true;
    if (a.indexOf("fe80:") === 0) return true;
    if (a.indexOf("fc00:") === 0 || a.indexOf("fd00:") === 0) return true;
    return false;
  }
  function is_ip(a) {
    if (!a || a === "0.0.0.0" || a === "::" || a === "[::]" || a === "::1" || a === "[::1]") return false;
    if (a.indexOf(".local") !== -1) return false;
    return true;
  }
  function is_public_ip(a) {
    if (!is_ip(a)) return false;
    var v6 = is_ipv6_addr(a);
    a = strip_brackets(a);
    if (v6) return !is_private_ipv6(a);
    return !is_private_ipv4(a);
  }

  // src/deflate.js
  var _TE2 = new TextEncoder();
  var _TD = new TextDecoder();
  var _zlib = null;
  function getZlib() {
    if (!_zlib && typeof __require !== "undefined") {
      try {
        _zlib = __require("zlib");
      } catch (e) {
        _zlib = null;
      }
    }
    return _zlib;
  }
  function asU8(x) {
    if (x instanceof Uint8Array) return x;
    if (x && x.buffer != null && x.byteLength != null) return new Uint8Array(x.buffer, x.byteOffset || 0, x.byteLength);
    return new Uint8Array(x || 0);
  }
  var _HAS_STREAMS = typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined" && typeof Response !== "undefined";
  function compress_deflate(text, callback) {
    var inputU8 = text instanceof Uint8Array ? text : _TE2.encode(String(text));
    if (_HAS_STREAMS) {
      try {
        var stream = new Response(inputU8).body.pipeThrough(new CompressionStream("deflate"));
        new Response(stream).arrayBuffer().then(function(buf) {
          callback(new Uint8Array(buf));
        }).catch(function() {
          callback(null);
        });
        return;
      } catch (e) {
      }
    }
    var zlib = getZlib();
    if (zlib && zlib.deflate) {
      zlib.deflate(Buffer.from(inputU8), { level: 9 }, function(err, result) {
        callback(err ? null : new Uint8Array(result));
      });
      return;
    }
    callback(null);
  }
  var MAX_INFLATED_SIZE = 8 * 1024 * 1024;
  function decompress_deflate_bytes(u8, callback) {
    var input = asU8(u8);
    if (_HAS_STREAMS) {
      try {
        let pump_read = function() {
          reader.read().then(function(res) {
            if (res.done) {
              var out = new Uint8Array(total), off = 0;
              for (var i = 0; i < chunks.length; i++) {
                out.set(chunks[i], off);
                off += chunks[i].byteLength;
              }
              callback(out);
              return;
            }
            total += res.value.byteLength;
            if (total > MAX_INFLATED_SIZE) {
              try {
                reader.cancel();
              } catch (e) {
              }
              callback(null);
              return;
            }
            chunks.push(res.value);
            pump_read();
          }).catch(function() {
            callback(null);
          });
        };
        var stream = new Response(input).body.pipeThrough(new DecompressionStream("deflate"));
        var reader = stream.getReader();
        var chunks = [];
        var total = 0;
        pump_read();
        return;
      } catch (e) {
      }
    }
    var zlib = getZlib();
    if (zlib && zlib.inflate) {
      zlib.inflate(Buffer.from(input), { maxOutputLength: MAX_INFLATED_SIZE }, function(err, result) {
        callback(err ? null : new Uint8Array(result));
      });
      return;
    }
    callback(null);
  }
  function decompress_deflate(u8, callback) {
    decompress_deflate_bytes(u8, function(bytes) {
      callback(bytes === null ? null : _TD.decode(bytes));
    });
  }

  // src/schemas.js
  var SCHEMA_SIGNAL_FRAME = [["kind", "uint8"], ["body", "tail"]];
  var SCHEMA_SIGNAL_CHUNK = [["msg_id", "uint16"], ["index", "varint"], ["total", "varint"], ["payload", "tail"]];
  var SCHEMA_SIGNAL_ENVELOPE = [["checksum", "uint32"], ["payload", "tail"]];
  var SCHEMA_SIGNAL_INNER = [["local_nonce", "uint16"], ["remote_nonce", "uint16"], ["type", "uint8"], ["data", "tail"]];
  var SCHEMA_DC_MSG = [["type", "uint8"], ["data", "tail"]];
  var SCHEMA_SEQ_PAYLOAD = [["seq", "uint16"], ["payload", "tail"]];
  var SCHEMA_SEQ_HASH_HASH_PAYLOAD = [
    ["seq", "uint16"],
    ["base_hash", "uint32"],
    ["result_hash", "uint32"],
    ["payload", "tail"]
  ];
  var SCHEMA_NEG_DONE = [["seq", "uint16"], ["epoch", "uint16"]];
  var SCHEMA_FAILED_DECOMPRESS = [["failed_type", "uint8"], ["seq", "uint16"]];
  var SCHEMA_TOTAL_ICE = [["total", "uint16"], ["ufrag", "tail"]];
  var SCHEMA_ACK = [["seq", "uint16"]];
  var SCHEMA_PING = [["timestamp", "varint"]];
  var SCHEMA_SDP_MIN = [
    ["setup", "enum", ["actpass", "active", "passive"]],
    ["maxMessageSize", "uint32"],
    ["ufrag", "string"],
    ["pwd", "string"],
    ["fingerprint", "fixed", 32]
  ];
  var SCHEMA_CANDIDATE = [
    // Packed semantic flags (16 bits → 2 bytes)
    ["flags", "bits", [
      ["transport", 2],
      // 0=udp  1=tcp
      ["candType", 2],
      // 0=host 1=srflx 2=prflx 3=relay
      ["isIPv6", 1],
      ["hasRel", 1],
      ["addrIsStr", 1],
      // mDNS / non-IP main address
      ["relIsStr", 1],
      // mDNS / non-IP related address
      ["_reserved", 8]
    ]],
    // Fixed mandatory fields
    ["component", "uint8"],
    ["mline", "uint8"],
    ["priority", "uint32"],
    ["port", "uint16"],
    // Optional extras — litepack tracks presence via a leading bitmask
    ["tcpType", "uint8?"],
    ["generation", "uint8?"],
    ["netCost", "uint16?"],
    ["foundationNum", "uint32?"],
    // Binary IP bytes (4 = IPv4, 16 = IPv6); absent when address is a string (mDNS)
    ["ipBytes", "bytes?"],
    ["relIpBytes", "bytes?"],
    ["relPort", "uint16?"],
    // String fields (foundation string, mDNS addresses, sdpMid, ufrag)
    ["foundation", "string?"],
    ["addrStr", "string?"],
    ["relAddrStr", "string?"],
    ["sdpMid", "string?"],
    ["ufrag", "string?"]
  ];

  // src/chunking.js
  var CHUNK_HEADER_BUDGET = 16;
  var CHUNK_REASSEMBLY_TIMEOUT = 5e3;
  var CHUNK_MAX_OPEN = 16;
  var CHUNK_MAX_TOTAL = 65536;
  function build_chunks(bytes, limit, msg_id) {
    var payloadSize = Math.max(1, limit - CHUNK_HEADER_BUDGET);
    var total = Math.ceil(bytes.byteLength / payloadSize) || 1;
    var out = [];
    for (var i = 0; i < total; i++) {
      var slice = bytes.subarray(i * payloadSize, Math.min((i + 1) * payloadSize, bytes.byteLength));
      out.push(litepack_default.encode(SCHEMA_SIGNAL_CHUNK, { msg_id, index: i, total, payload: slice }));
    }
    return out;
  }
  function reassemble_chunk(chunkBody, store, now) {
    now = now || Date.now();
    for (var key in store) {
      if (now - store[key].ts > CHUNK_REASSEMBLY_TIMEOUT) delete store[key];
    }
    var ch = litepack_default.decode(SCHEMA_SIGNAL_CHUNK, chunkBody);
    if (ch.total <= 0 || ch.total > CHUNK_MAX_TOTAL || ch.index >= ch.total) return null;
    var entry = store[ch.msg_id];
    if (!entry) {
      var keys = Object.keys(store);
      if (keys.length >= CHUNK_MAX_OPEN) {
        var oldest = keys[0], oldestTs = store[keys[0]].ts;
        for (var k = 1; k < keys.length; k++) {
          if (store[keys[k]].ts < oldestTs) {
            oldest = keys[k];
            oldestTs = store[keys[k]].ts;
          }
        }
        delete store[oldest];
      }
      entry = store[ch.msg_id] = { parts: new Array(ch.total), received: 0, total: ch.total, ts: now };
    } else if (entry.total !== ch.total) {
      return null;
    }
    entry.ts = now;
    if (!entry.parts[ch.index]) {
      entry.parts[ch.index] = ch.payload;
      entry.received++;
    }
    if (entry.received === entry.total) {
      var totalLen = 0, j;
      for (j = 0; j < entry.total; j++) {
        if (!entry.parts[j]) {
          delete store[ch.msg_id];
          return null;
        }
        totalLen += entry.parts[j].byteLength;
      }
      var full = new Uint8Array(totalLen), off = 0;
      for (j = 0; j < entry.total; j++) {
        full.set(entry.parts[j], off);
        off += entry.parts[j].byteLength;
      }
      delete store[ch.msg_id];
      return full;
    }
    return null;
  }

  // src/sdp.js
  function is_support_trickle_ice(sdp) {
    if (!sdp) return false;
    var m = sdp.match(/^a=ice-options:(.*)$/m);
    if (m && m[1].indexOf("trickle") >= 0) {
      return true;
    }
    return false;
  }
  function get_fingerprint_from_sdp(sdp_str) {
    var fingerprint_bytes = null;
    var match = sdp_str.match(/a=fingerprint:(\S+)\s+([0-9A-Fa-f:]+)/);
    if (match && match.length >= 2) {
      var fingerprint_str = match[2];
      var parts = fingerprint_str.trim().split(":");
      fingerprint_bytes = new Uint8Array(parts.length);
      for (var i = 0; i < parts.length; i++) {
        fingerprint_bytes[i] = parseInt(parts[i], 16);
      }
    }
    return fingerprint_bytes;
  }
  function get_ufrag_from_sdp(sdp) {
    try {
      if (sdp) {
        var s = typeof sdp == "object" && "sdp" in sdp ? sdp.sdp : sdp;
        var m = s.match(/^a=ice-ufrag:(.+)$/m);
        return m ? m[1] : null;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  function parse_candidate(candidateString) {
    if (!candidateString || typeof candidateString !== "string") return null;
    var s = candidateString.trim();
    if (s === "" || /^\s*a=?end-of-candidates\s*$/i.test(s)) return null;
    if (s.indexOf("a=") === 0) s = s.substring(2);
    if (s.indexOf("candidate:") === 0) s = s.substring(10);
    var parts = s.split(/\s+/);
    if (parts.length < 8) return null;
    function toInt(x) {
      var n = parseInt(x, 10);
      return isNaN(n) ? null : n | 0;
    }
    function toU32(x) {
      var n = parseInt(x, 10);
      return isNaN(n) ? 0 : n >>> 0;
    }
    function strip_brackets2(a) {
      if (!a) return a;
      if (a.charAt(0) === "[" && a.charAt(a.length - 1) === "]") return a.slice(1, -1);
      return a;
    }
    function strip_scope(a) {
      if (!a) return a;
      var k = a.indexOf("%");
      return k >= 0 ? a.slice(0, k) : a;
    }
    function isMdns(a) {
      return !!(a && /\.local$/i.test(a));
    }
    var foundation = parts[0];
    var component_id = toInt(parts[1]);
    var transport = (parts[2] || "").toLowerCase();
    var priority = toU32(parts[3]);
    var address = parts[4];
    var port = toU32(parts[5]);
    if ((parts[6] || "").toLowerCase() !== "typ") return null;
    var type = (parts[7] || "").toLowerCase();
    var relatedAddress = null, relatedPort = null, tcptype = null, generation = null;
    var ufrag = null, network_id = null, network_cost = null;
    var extras = {};
    var i;
    for (i = 8; i < parts.length; i++) {
      var key = (parts[i] || "").toLowerCase();
      if (i + 1 >= parts.length) break;
      if (key === "raddr") {
        relatedAddress = parts[++i];
        continue;
      }
      if (key === "rport") {
        relatedPort = toU32(parts[++i]);
        continue;
      }
      if (key === "tcptype") {
        tcptype = (parts[++i] || "").toLowerCase();
        continue;
      }
      if (key === "generation") {
        generation = toInt(parts[++i]);
        continue;
      }
      if (key === "ufrag") {
        ufrag = parts[++i];
        continue;
      }
      if (key === "network-id") {
        network_id = toInt(parts[++i]);
        continue;
      }
      if (key === "network-cost") {
        network_cost = toU32(parts[++i]);
        continue;
      }
      if (key === "typ") {
        type = (parts[++i] || "").toLowerCase();
        continue;
      }
      var val = parts[i + 1];
      if (val != null) {
        extras[key] = val;
        i++;
      }
    }
    address = strip_brackets2(address);
    if (relatedAddress) relatedAddress = strip_brackets2(relatedAddress);
    address = strip_scope(address);
    if (relatedAddress) relatedAddress = strip_scope(relatedAddress);
    var addrIsMdns = isMdns(address);
    var relIsMdns = relatedAddress ? isMdns(relatedAddress) : false;
    var ipFamily = addrIsMdns ? 0 : address && address.indexOf(":") >= 0 ? 6 : 4;
    var relFamily = relatedAddress && !relIsMdns ? relatedAddress.indexOf(":") >= 0 ? 6 : 4 : 0;
    var transportNum = transport === "tcp" ? 1 : 0;
    var candTypeNum = type === "host" ? 0 : type === "srflx" ? 1 : type === "prflx" ? 2 : 3;
    var tcpTypeNum = null;
    if (transportNum === 1 && tcptype != null) {
      tcpTypeNum = tcptype === "active" ? 0 : tcptype === "passive" ? 1 : 2;
    }
    var hasRel = !!(relatedAddress && !relIsMdns && relatedAddress !== "0.0.0.0" && relatedPort && relatedPort !== 0);
    var foundationIsNumeric = /^\d+$/.test(foundation);
    var foundationU32 = foundationIsNumeric ? parseInt(foundation, 10) >>> 0 : null;
    var obj = {
      // Base
      foundation,
      foundationIsNumeric,
      foundationU32,
      component: component_id == null ? 1 : component_id | 0,
      transport,
      transportNum,
      priority: priority >>> 0,
      ip: address,
      ipFamily,
      // 0=mdns/string, 4, 6
      isMdns: addrIsMdns,
      port: port >>> 0,
      // Type
      type,
      typeNum: candTypeNum,
      // related (raddr/rport)
      hasRel,
      relIp: hasRel ? relatedAddress : null,
      relIpFamily: hasRel ? relFamily : 0,
      relIsMdns: hasRel ? relIsMdns : false,
      relPort: hasRel ? relatedPort >>> 0 : 0,
      // TCP
      hasTcpType: tcpTypeNum != null,
      tcpType: tcpTypeNum == null ? null : tcpTypeNum | 0,
      // 0 active,1 passive,2 so
      tcpTypeStr: tcptype,
      // Additional
      generation: generation == null ? null : generation | 0,
      networkId: network_id == null ? null : network_id | 0,
      networkCost: network_cost == null ? null : network_cost >>> 0,
      ufrag: ufrag || null,
      // Backward-compatible field names
      localIP: address,
      localPort: port >>> 0,
      remoteIP: hasRel ? relatedAddress : null,
      remotePort: hasRel ? relatedPort >>> 0 : null,
      // Unrecognized extensions (key->value)
      extras
    };
    return obj;
  }
  function remove_all_ice_candidates(sdp) {
    if (/^a=ice-lite\s*$/m.test(sdp)) {
      return sdp;
    }
    var sdpLines = sdp.split("\r\n");
    var filteredSdpLines = sdpLines.filter((line) => !line.startsWith("a=candidate"));
    var filteredSdp = filteredSdpLines.join("\r\n");
    return filteredSdp;
  }
  function parse_sdp_dc_only(sdp_str) {
    if (!sdp_str || typeof sdp_str !== "string") return null;
    try {
      var lines = sdp_str.split(/\r?\n/);
      var sections = [];
      var current = { type: "session", lines: [] };
      for (var i = 0; i < lines.length; i++) {
        var L = (lines[i] || "").trim();
        if (!L) continue;
        if (L[0] === "m") {
          sections.push(current);
          current = { type: "media", lines: [L] };
        } else {
          current.lines.push(L);
        }
      }
      sections.push(current);
      var mediaSections = [];
      for (var j = 0; j < sections.length; j++) {
        if (sections[j].type === "media") mediaSections.push(sections[j]);
      }
      if (mediaSections.length !== 1) return null;
      var mline = mediaSections[0].lines[0] || "";
      var isApp = mline.indexOf("m=application") === 0;
      var isDc = mline.toLowerCase().indexOf("webrtc-datachannel") !== -1;
      if (!isApp || !isDc) return null;
      var origin = null;
      for (var i = 0; i < sections[0].lines.length; i++) {
        var L = sections[0].lines[i];
        if (L.indexOf("o=") === 0) {
          var p = L.substr(2).trim().split(/\s+/);
          if (p.length >= 6) {
            origin = {
              username: p[0],
              sessId: p[1],
              sessVersion: p[2],
              netType: p[3],
              addrType: p[4],
              address: p.slice(5).join(" ")
            };
          }
          break;
        }
      }
      var out = {
        schemaVersion: 1,
        session: { origin: origin || { username: "-", sessId: "0", sessVersion: "0", netType: "IN", addrType: "IP4", address: "127.0.0.1" } },
        bundle: { mids: [] },
        msidSemantic: null,
        ice: { ufrag: "", pwd: "", lite: false, trickle: false },
        dtls: { setup: "", fingerprint: { alg: "", value: "" } },
        data: { mid: "", proto: "UDP/DTLS/SCTP", sctpPort: 5e3, maxMessageSize: null }
      };
      for (var si = 0; si < sections[0].lines.length; si++) {
        var S = sections[0].lines[si];
        if (S.indexOf("a=group:BUNDLE") === 0) {
          var m = /^a=group:BUNDLE\s*(.*)$/i.exec(S);
          var mids = m && m[1] ? m[1].trim().split(/\s+/).filter(Boolean) : [];
          out.bundle.mids = mids;
        } else if (S.indexOf("a=msid-semantic:") === 0) {
          out.msidSemantic = S.substr(16).trim();
        } else if (S.indexOf("a=ice-lite") === 0) {
          out.ice.lite = true;
        }
      }
      for (var mi = 1; mi < mediaSections[0].lines.length; mi++) {
        var M = mediaSections[0].lines[mi];
        if (M.indexOf("a=mid:") === 0) {
          out.data.mid = M.substr(6).trim() || "data";
        } else if (M.indexOf("a=ice-ufrag:") === 0) {
          out.ice.ufrag = M.substr(12).trim();
        } else if (M.indexOf("a=ice-pwd:") === 0) {
          out.ice.pwd = M.substr(10).trim();
        } else if (M.indexOf("a=ice-options:") === 0 && M.indexOf("trickle") >= 0) {
          out.ice.trickle = true;
        } else if (M.indexOf("a=setup:") === 0) {
          out.dtls.setup = M.substr(8).trim();
        } else if (M.indexOf("a=fingerprint:") === 0) {
          var rest = M.substr(14).trim();
          var sp = rest.split(/\s+/);
          var alg = (sp[0] || "").toLowerCase();
          if (alg === "sha256") alg = "sha-256";
          out.dtls.fingerprint.alg = alg;
          var val = rest.substr(sp[0].length).trim();
          out.dtls.fingerprint.value = val.toUpperCase();
        } else if (M.indexOf("a=sctp-port:") === 0) {
          out.data.sctpPort = parseInt(M.substr(12).trim(), 10) || 5e3;
        } else if (M.indexOf("a=max-message-size:") === 0) {
          out.data.maxMessageSize = parseInt(M.substr(19).trim(), 10) || null;
        }
      }
      if (!out.data.mid) out.data.mid = "data";
      if (!out.ice.ufrag || !out.ice.pwd) return null;
      if (!out.dtls.fingerprint.value) return null;
      if (!out.dtls.setup) return null;
      return out;
    } catch (e) {
      return null;
    }
  }

  // src/codec.js
  function mapTransportNum(s) {
    return s && s.toLowerCase() === "tcp" ? 1 : 0;
  }
  function mapTypeNum(s) {
    var a = (s || "").toLowerCase();
    return a === "host" ? 0 : a === "srflx" ? 1 : a === "prflx" ? 2 : 3;
  }
  function mapTcpTypeNum(s) {
    var a = (s || "").toLowerCase();
    return a === "active" ? 0 : a === "passive" ? 1 : 2;
  }
  function encode_candidate_binary(p, sdpMid, sdpMLineIndex, usernameFragment) {
    if (!p) return new Uint8Array(0);
    var component = p.component_id != null ? p.component_id | 0 : p.component != null ? p.component | 0 : 1;
    var trNum = p.transportNum != null ? p.transportNum | 0 : mapTransportNum(p.transport);
    var tyNum = p.typeNum != null ? p.typeNum | 0 : p.candTypeNum != null ? p.candTypeNum | 0 : mapTypeNum(p.type || p.candType);
    var priority = p.priority >>> 0 || 0;
    var ipFamily = p.ipFamily != null ? p.ipFamily | 0 : p.isMdns ? 0 : p.ip && p.ip.indexOf(":") >= 0 ? 6 : 4;
    var addrIsStr = ipFamily === 0 ? 1 : 0;
    var port = p.port >>> 0 || 0;
    var hasRel = !!p.hasRel;
    var relIsStr = hasRel && p.relIsMdns ? 1 : 0;
    var relFamily = p.relIpFamily | 0 || 0;
    var relPort = hasRel ? p.relPort >>> 0 || 0 : 0;
    var hasTcpType = !!p.hasTcpType;
    var tcpType = hasTcpType ? p.tcpType != null ? p.tcpType | 0 : mapTcpTypeNum(p.tcpTypeStr) : void 0;
    var hasGen = p.generation != null;
    var generation = hasGen ? p.generation | 0 : void 0;
    var hasNetCost = p.networkCost != null;
    var netCost = hasNetCost ? p.networkCost >>> 0 : void 0;
    var foundIsNum = !!p.foundationIsNumeric;
    var foundationNum = foundIsNum ? p.foundationU32 >>> 0 : void 0;
    var foundationStr = foundIsNum ? void 0 : p.foundation || "";
    var mline = sdpMLineIndex == null ? p.mlineIndex | 0 : sdpMLineIndex | 0;
    if (!(mline >= 0 && mline <= 255)) mline = 0;
    var midStr = sdpMid != null ? "" + sdpMid : p.sdpMid != null ? "" + p.sdpMid : "";
    var ufragStr = usernameFragment != null ? "" + usernameFragment : p.ufrag != null ? "" + p.ufrag : "";
    var obj = {
      flags: {
        transport: trNum & 3,
        candType: tyNum & 3,
        isIPv6: ipFamily === 6 ? 1 : 0,
        hasRel: hasRel ? 1 : 0,
        addrIsStr,
        relIsStr: hasRel && relIsStr ? 1 : 0,
        _reserved: 0
      },
      component: component & 255,
      mline: mline & 255,
      priority: priority >>> 0,
      port: port >>> 0,
      tcpType: hasTcpType ? tcpType & 255 : void 0,
      generation: hasGen ? generation & 255 : void 0,
      netCost: hasNetCost ? netCost & 65535 : void 0,
      foundationNum: foundIsNum ? foundationNum >>> 0 : void 0,
      ipBytes: !addrIsStr ? ipToBytes(p.ip, ipFamily) : void 0,
      relIpBytes: hasRel && !relIsStr ? ipToBytes(p.relIp, relFamily) : void 0,
      relPort: hasRel ? relPort >>> 0 : void 0,
      foundation: !foundIsNum ? foundationStr || "" : void 0,
      addrStr: addrIsStr ? p.ip || "" : void 0,
      relAddrStr: hasRel && relIsStr ? p.relIp || "" : void 0,
      sdpMid: midStr && midStr.length > 0 ? midStr : void 0,
      ufrag: ufragStr && ufragStr.length > 0 ? ufragStr : void 0
    };
    return litepack_default.encode(SCHEMA_CANDIDATE, obj);
  }
  function decode_candidate_binary(u8) {
    if (!u8 || u8.length < 2) return null;
    u8 = u8 instanceof Uint8Array ? u8 : u8 instanceof ArrayBuffer ? new Uint8Array(u8) : new Uint8Array(0);
    var d;
    try {
      d = litepack_default.decode(SCHEMA_CANDIDATE, u8);
    } catch (e) {
      return null;
    }
    if (!d) return null;
    var flags = d.flags;
    var trNum = flags.transport & 3;
    var tyNum = flags.candType & 3;
    var isIPv6 = flags.isIPv6;
    var hasRel = flags.hasRel;
    var addrIsStr = flags.addrIsStr;
    var relIsStr = flags.relIsStr;
    var transport = trNum === 1 ? "tcp" : "udp";
    var typeStr = ["host", "srflx", "prflx", "relay"][tyNum] || "host";
    var tcpTypeStr = d.tcpType != null ? d.tcpType === 0 ? "active" : d.tcpType === 1 ? "passive" : "so" : null;
    function bytesToIp(bytes) {
      if (!bytes) return null;
      if (bytes.length === 4) return bytes[0] + "." + bytes[1] + "." + bytes[2] + "." + bytes[3];
      if (bytes.length === 16) {
        var groups = [];
        for (var i = 0; i < 16; i += 2) groups.push((bytes[i] << 8 | bytes[i + 1]).toString(16));
        var bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
        for (var g = 0; g < 8; g++) {
          if (groups[g] === "0") {
            if (curStart < 0) curStart = g;
            curLen = g - curStart + 1;
            if (curLen > bestLen) {
              bestStart = curStart;
              bestLen = curLen;
            }
          } else {
            curStart = -1;
            curLen = 0;
          }
        }
        if (bestLen >= 2) {
          return (groups.slice(0, bestStart).join(":") || "") + "::" + (groups.slice(bestStart + bestLen).join(":") || "");
        }
        return groups.join(":");
      }
      return null;
    }
    var ipStr = addrIsStr ? d.addrStr || null : bytesToIp(d.ipBytes);
    var relIpStr = !hasRel ? null : relIsStr ? d.relAddrStr || null : bytesToIp(d.relIpBytes);
    return {
      foundation: d.foundationNum != null ? "" + d.foundationNum : d.foundation || null,
      foundationU32: d.foundationNum != null ? d.foundationNum : null,
      component_id: d.component,
      transport,
      transportNum: trNum,
      priority: d.priority,
      address: ipStr,
      port: d.port,
      type: typeStr,
      typeNum: tyNum,
      relatedAddress: relIpStr,
      relatedPort: hasRel ? d.relPort || 0 : 0,
      tcptype: tcpTypeStr,
      generation: d.generation != null ? d.generation : null,
      network_cost: d.netCost != null ? d.netCost : null,
      sdpMid: d.sdpMid || null,
      sdpMLineIndex: d.mline,
      ufrag: d.ufrag || null
    };
  }
  function stringify_candidate_line(dec) {
    var foundation = dec.foundation != null ? String(dec.foundation) : "0";
    var component = dec.component_id != null ? dec.component_id | 0 : 1;
    var transport = (dec.transport || "udp").toLowerCase();
    var priority = dec.priority >>> 0 || 0;
    var address = dec.address || "0.0.0.0";
    var port = dec.port >>> 0 || 0;
    var type = (dec.type || "host").toLowerCase();
    var parts = [
      "candidate:" + foundation,
      String(component),
      transport,
      String(priority),
      address,
      String(port),
      "typ",
      type
    ];
    if (type === "srflx") {
      var raddr = dec.relatedAddress || "0.0.0.0";
      var rport = dec.relatedPort != null ? dec.relatedPort >>> 0 : 0;
      parts.push("raddr", raddr, "rport", String(rport));
    } else {
      if (dec.relatedAddress && dec.relatedPort != null) {
        parts.push("raddr", dec.relatedAddress, "rport", String(dec.relatedPort >>> 0));
      }
    }
    if (transport === "tcp" && dec.tcptype) {
      parts.push("tcptype", dec.tcptype);
    }
    if (dec.generation != null) {
      parts.push("generation", String(dec.generation | 0));
    }
    if (dec.network_id != null) {
      parts.push("network-id", String(dec.network_id | 0));
    }
    if (dec.network_cost != null) {
      parts.push("network-cost", String(dec.network_cost >>> 0));
    }
    return parts.join(" ");
  }
  function to_RTCIceCandidateInit_from_decoded(dec) {
    if (!dec) return null;
    var candidateLine = stringify_candidate_line(dec);
    var out = {
      candidate: candidateLine,
      sdpMid: dec.sdpMid != null ? String(dec.sdpMid) : null,
      sdpMLineIndex: dec.sdpMLineIndex != null ? dec.sdpMLineIndex | 0 : 0,
      usernameFragment: dec.ufrag || null
    };
    return out;
  }
  function compress_sdp_min_viable(sdp_str) {
    var sdp_obj = parse_sdp_dc_only(sdp_str);
    if (!sdp_obj) return null;
    if (!Array.isArray(sdp_obj.bundle.mids) || sdp_obj.bundle.mids.length !== 1) return null;
    if (sdp_obj.bundle.mids[0] !== "0") return null;
    if (sdp_obj.data.mid !== "0") return null;
    if (sdp_obj.data.proto !== "UDP/DTLS/SCTP") return null;
    if (sdp_obj.data.sctpPort !== 5e3) return null;
    if (sdp_obj.msidSemantic !== "WMS") return null;
    if (sdp_obj.ice.lite) return null;
    if (!sdp_obj.ice.trickle) return null;
    if (sdp_obj.dtls.fingerprint.alg !== "sha-256") return null;
    var ufrag = sdp_obj.ice.ufrag || "";
    var pwd = sdp_obj.ice.pwd || "";
    var fpStr = sdp_obj.dtls.fingerprint.value || "";
    var setup = sdp_obj.dtls.setup || "";
    if (!ufrag || !pwd || !fpStr || !setup) return null;
    var setup_lc = setup.toLowerCase();
    if (["actpass", "active", "passive"].indexOf(setup_lc) === -1) return null;
    var parts = fpStr.trim().split(":");
    var fingerprint_bytes = new Uint8Array(parts.length);
    for (var i = 0; i < parts.length; i++) {
      var v = parseInt(parts[i], 16);
      if (isNaN(v)) return null;
      fingerprint_bytes[i] = v;
    }
    if (fingerprint_bytes.length !== 32) return null;
    var DEFAULT_MMS = 262144 >>> 0;
    var mms = typeof sdp_obj.data.maxMessageSize === "number" && sdp_obj.data.maxMessageSize > 0 ? sdp_obj.data.maxMessageSize >>> 0 : DEFAULT_MMS;
    try {
      return litepack_default.encode(SCHEMA_SDP_MIN, {
        setup: setup_lc,
        maxMessageSize: mms,
        ufrag,
        pwd,
        fingerprint: fingerprint_bytes
      });
    } catch (e) {
      return null;
    }
  }
  function decompress_sdp_min_viable(data) {
    var d;
    try {
      d = litepack_default.decode(SCHEMA_SDP_MIN, data);
    } catch (e) {
      return null;
    }
    if (!d || !d.setup || !d.ufrag || !d.pwd || !d.fingerprint) return null;
    var fp_u8 = d.fingerprint;
    if (fp_u8.length !== 32) return null;
    var fp_hex = "", i, b;
    for (i = 0; i < fp_u8.length; i++) {
      if (i) fp_hex += ":";
      b = fp_u8[i].toString(16).toUpperCase();
      if (b.length < 2) b = "0" + b;
      fp_hex += b;
    }
    var DEFAULT_MMS = 262144 >>> 0;
    var mms = d.maxMessageSize && d.maxMessageSize > 0 ? d.maxMessageSize : DEFAULT_MMS;
    var setup = d.setup;
    var ufrag = d.ufrag;
    var pwd = d.pwd;
    var s = "";
    s += "v=0\r\n";
    s += "o=- 0 0 IN IP4 127.0.0.1\r\n";
    s += "s=-\r\n";
    s += "t=0 0\r\n";
    s += "a=group:BUNDLE 0\r\n";
    s += "a=msid-semantic: WMS\r\n";
    s += "m=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n";
    s += "c=IN IP4 0.0.0.0\r\n";
    s += "a=mid:0\r\n";
    s += "a=ice-ufrag:" + ufrag + "\r\n";
    s += "a=ice-pwd:" + pwd + "\r\n";
    s += "a=ice-options:trickle\r\n";
    s += "a=setup:" + d.setup + "\r\n";
    s += "a=fingerprint:sha-256 " + fp_hex + "\r\n";
    s += "a=sctp-port:5000\r\n";
    s += "a=max-message-size:" + String(mms >>> 0) + "\r\n";
    return s;
  }

  // src/engine.js
  var engine_default = StableWebRTC;
  var _TE3 = new TextEncoder();
  var _TD2 = new TextDecoder();
  var cert_wrtc_state = "idle";
  var cert_wrtc_obj = null;
  var cert_wrtc_waiters = [];
  var cert_wrtc_expires_at = 0;
  function cert_wrtc_is_valid() {
    if (!cert_wrtc_obj) return false;
    var exp = typeof cert_wrtc_obj.expires === "number" ? cert_wrtc_obj.expires : cert_wrtc_expires_at;
    if (!exp) return true;
    var safetyMs = 60 * 1e3;
    return Date.now() + safetyMs < exp;
  }
  function cert_wrtc_flush_waiters(err, cert) {
    for (var i = 0; i < cert_wrtc_waiters.length; i++) {
      try {
        cert_wrtc_waiters[i](err, cert);
      } catch (e) {
      }
    }
    cert_wrtc_waiters.length = 0;
  }
  function cert_wrtc_start_generate() {
    cert_wrtc_state = "generating";
    var genParams = { name: "ECDSA", namedCurve: "P-256" };
    var p;
    try {
      p = RTCPeerConnection.generateCertificate(genParams);
    } catch (e) {
      cert_wrtc_state = "failed";
      cert_wrtc_flush_waiters(e, null);
      return;
    }
    p.then(function(cert) {
      cert_wrtc_obj = cert;
      cert_wrtc_expires_at = typeof cert.expires === "number" ? cert.expires | 0 : 0;
      cert_wrtc_state = "ready";
      cert_wrtc_flush_waiters(null, cert);
    }, function(err) {
      cert_wrtc_state = "failed";
      cert_wrtc_flush_waiters(err, null);
    });
  }
  function cert_wrtc_acquire_shared_certificate(callback) {
    if (!callback) callback = function() {
    };
    if (cert_wrtc_state === "ready" && cert_wrtc_is_valid()) {
      callback(null, cert_wrtc_obj);
      return;
    }
    cert_wrtc_waiters.push(callback);
    if (cert_wrtc_state === "generating") {
      return;
    }
    cert_wrtc_start_generate();
  }
  var MSGCODE_TYPE_MAP = {
    DATA: 0,
    OFFER_RAW: 1,
    OFFER_COMPACT: 2,
    OFFER_DEFLATE: 3,
    OFFER_DIFF: 4,
    OFFER_DIFF_DEFLATE: 5,
    ANSWER_RAW: 6,
    ANSWER_COMPACT: 7,
    ANSWER_DEFLATE: 8,
    ANSWER_DIFF: 9,
    ANSWER_DIFF_DEFLATE: 10,
    ICE_CANDIDATE_RAW: 11,
    ICE_CANDIDATE_COMPACT: 12,
    TOTAL_ICE_CANDIDATE: 13,
    NEGOTIATION_DONE: 14,
    MEDIASTREAM_MAP: 15,
    FAILED_DECOMPRESS: 16,
    PING: 17,
    MEDIASTREAM_MAP_ACK: 18,
    SIGNAL_CHUNK: 19,
    PONG: 20
  };
  function StableWebRTC(opts) {
    if (!(this instanceof StableWebRTC)) return new StableWebRTC(opts);
    opts = opts || {};
    if (opts.wrtc && typeof opts.wrtc === "object") {
      var wrtc = opts.wrtc;
      if (typeof wrtc.MediaStream !== "undefined" && typeof global.MediaStream === "undefined") {
        global.MediaStream = wrtc.MediaStream;
      }
      if (typeof wrtc.MediaStreamTrack !== "undefined" && typeof global.MediaStreamTrack === "undefined") {
        global.MediaStreamTrack = wrtc.MediaStreamTrack;
      }
      if (typeof wrtc.RTCDataChannel !== "undefined" && typeof global.RTCDataChannel === "undefined") {
        global.RTCDataChannel = wrtc.RTCDataChannel;
      }
      if (typeof wrtc.RTCDataChannelEvent !== "undefined" && typeof global.RTCDataChannelEvent === "undefined") {
        global.RTCDataChannelEvent = wrtc.RTCDataChannelEvent;
      }
      if (typeof wrtc.RTCDtlsTransport !== "undefined" && typeof global.RTCDtlsTransport === "undefined") {
        global.RTCDtlsTransport = wrtc.RTCDtlsTransport;
      }
      if (typeof wrtc.RTCIceCandidate !== "undefined" && typeof global.RTCIceCandidate === "undefined") {
        global.RTCIceCandidate = wrtc.RTCIceCandidate;
      }
      if (typeof wrtc.RTCIceTransport !== "undefined" && typeof global.RTCIceTransport === "undefined") {
        global.RTCIceTransport = wrtc.RTCIceTransport;
      }
      if (typeof wrtc.RTCPeerConnection !== "undefined" && typeof global.RTCPeerConnection === "undefined") {
        global.RTCPeerConnection = wrtc.RTCPeerConnection;
      }
      if (typeof wrtc.RTCPeerConnectionIceEvent !== "undefined" && typeof global.RTCPeerConnectionIceEvent === "undefined") {
        global.RTCPeerConnectionIceEvent = wrtc.RTCPeerConnectionIceEvent;
      }
      if (typeof wrtc.RTCRtpReceiver !== "undefined" && typeof global.RTCRtpReceiver === "undefined") {
        global.RTCRtpReceiver = wrtc.RTCRtpReceiver;
      }
      if (typeof wrtc.RTCRtpSender !== "undefined" && typeof global.RTCRtpSender === "undefined") {
        global.RTCRtpSender = wrtc.RTCRtpSender;
      }
      if (typeof wrtc.RTCRtpTransceiver !== "undefined" && typeof global.RTCRtpTransceiver === "undefined") {
        global.RTCRtpTransceiver = wrtc.RTCRtpTransceiver;
      }
      if (typeof wrtc.RTCSctpTransport !== "undefined" && typeof global.RTCSctpTransport === "undefined") {
        global.RTCSctpTransport = wrtc.RTCSctpTransport;
      }
      if (typeof wrtc.RTCSessionDescription !== "undefined" && typeof global.RTCSessionDescription === "undefined") {
        global.RTCSessionDescription = wrtc.RTCSessionDescription;
      }
    }
    var ev = Emitter();
    var connection = {
      create_time: Date.now(),
      pc_config: {},
      pc: null,
      local_public_ipv4: [],
      local_public_ipv6: [],
      local_relay_ipv4: [],
      local_relay_ipv6: [],
      local_support_udp: null,
      local_support_tcp: null,
      // null = couldn't characterize, true = symmetric (problematic), false = fine
      local_symmetric_nat: null,
      _last_network_profile: null,
      local_support_trickle_ice: null,
      remote_support_trickle_ice: null,
      current_local_protocol: null,
      current_remote_protocol: null,
      current_local_relay: null,
      current_remote_relay: null,
      current_local_ip: null,
      current_remote_ip: null,
      current_local_port: null,
      current_remote_port: null,
      current_local_candidate_type: null,
      current_remote_candidate_type: null,
      current_rtt: null,
      current_ping_rtt: null,
      current_bandwidth_outgoing: null,
      current_connection_type: "unknown",
      // Application-level ping/pong keepalive + RTT probe (over the signal
      // channel, i.e. the data channel once open). Mirrors the WS manager:
      // PING carries a timestamp, the peer echoes it back as PONG, and we
      // compute RTT against our own clock. Random interval avoids lockstep.
      ping_timer: null,
      ping_enabled: true,
      ping_interval_min: 1e3,
      ping_interval_max: 3e3,
      // Liveness watchdog. ICE-lite peers (e.g. a webrtc-server answerer) run
      // NO connectivity checks of their own, so their iceConnectionState rarely
      // moves to 'disconnected'/'failed' when the link dies — they just sit in
      // 'connected' forever. We therefore detect death independently: any
      // inbound DC traffic (data/signal/pong) refreshes last_recv_time, and a
      // watchdog declares the link dead if nothing arrives within the timeout.
      // Recovery then goes through the same ICE-restart path; if that is
      // exhausted, we close. Needs to outlast a few ping intervals.
      liveness_timer: null,
      liveness_enabled: true,
      liveness_timeout_ms: 1e4,
      last_recv_time: 0,
      // Track previous ice state for disconnect/reconnect events
      _prev_ice_connection_state: null,
      signaling_state: "new",
      signaling_channel_state: "new",
      negotiation_state: 0,
      //0 — STABLE
      //1 — MAKING_LOCAL_OFFER
      //2 — WAITING_FOR_ANSWER
      //3 — APPLYING_REMOTE_ANSWER
      //4 — HANDLING_REMOTE_OFFER
      create_offer_timer: null,
      create_offer_failures: 0,
      auth_verified: false,
      local_nonce: Math.floor(Math.random() * 65534) + 1,
      remote_nonce: 0,
      // Remote-restart detection. remote_nonce locks on the first message and
      // any other nonce is rejected — correct against stale/replayed frames,
      // but a peer that RESTARTED (crash, refresh) generates a fresh nonce and
      // would be rejected forever, leaving both sides in a zombie re-offer
      // loop. We count consecutive rejections that carry the SAME unfamiliar
      // nonce; a consistent streak is the signature of a restart (random junk
      // wouldn't repeat), and at the threshold we close so the app can create
      // a fresh instance and reconnect.
      nonce_mismatch_streak_nonce: 0,
      nonce_mismatch_streak_count: 0,
      nonce_mismatch_close_threshold: 5,
      create_data_channel_timer: null,
      list_data_channels: [],
      list_remote_candidates: {},
      list_gathered_local_candidates: {},
      remote_fingerprint: null,
      local_fingerprint: null,
      getstats_running: false,
      getstats_timer: null,
      last_local_ufrag: null,
      last_remote_ufrag: null,
      need_ice_restart: false,
      need_reoffer: false,
      ice_restart_timer: null,
      ice_restart_count: 0,
      ice_restart_max_retries: 5,
      ice_restart_delay_ms: 3e3,
      // Restart-budget refund requires proven stability (see the
      // iceconnectionstatechange handler): a brief 'connected' blip on a
      // flapping path must not refund the full retry budget, or the
      // flap loop never exhausts and the connection zombies forever.
      ice_restart_reset_timer: null,
      ice_restart_stable_window_ms: 3e4,
      gathering_timeout_ms: 8e3,
      gathering_max_retries: 3,
      gathering_timeout_timer: null,
      gathering_retry_count: 0,
      wait_for_answer_timeout_timer: null,
      negotiation_done_timeout_timer: null,
      making_rollback: false,
      polite_defer_started: null,
      pending_remote_offer_sdp: null,
      sent_local_offer_sdp: null,
      sent_local_answer_sdp: null,
      base_offer_sdp: null,
      local_offer_history: [],
      seq_remote_offer: 0,
      seq_local_mediastream_map: 0,
      seq_remote_mediastream_map: 0,
      // --- signaling chunking (size-based; reassembly is all-or-nothing) ---
      max_signal_chunk_size: typeof opts.max_signal_chunk_size === "number" && opts.max_signal_chunk_size > 0 ? opts.max_signal_chunk_size : 1024,
      // Perfect-negotiation role. Apps with a known topology (client↔server,
      // caller↔callee) should say so — it makes the polite/impolite split
      // deterministic from t=0 with zero handshake latency:
      //   'lead'   → impolite: offers immediately, never yields in glare
      //   'follow' → polite: defers opening offers, yields in glare
      //   'auto'   → (default) derive from the nonce comparison once the
      //              first remote frame arrives; bounded-deadline fallback.
      // Discovered the hard way: 'auto' alone is chicken-and-egg in the
      // OPENING (politeness needs nonces, nonces ride frames, Rule A
      // holds the frames) — both sides sat out the full deadline. An
      // explicit role costs the app one word and removes the standoff.
      negotiation_role: opts.negotiationRole === "lead" || opts.negotiationRole === "follow" ? opts.negotiationRole : "auto",
      chunk_send_id_internal: 0,
      // rolling msg_id for the SCTP pipe
      chunk_send_id_external: 0,
      // rolling msg_id for the emit('signal') pipe
      chunk_reasm_internal: {},
      // msg_id -> partial {parts,received,total,ts}
      chunk_reasm_external: {},
      // --- MEDIASTREAM_MAP reliability (ACK + retransmit) ---
      mediastream_map_pending: null,
      // {seq, bytes, attempts}
      mediastream_map_ack_timer: null,
      epoch_negotiation_success: 0,
      best_candidate_pair_priority: 0,
      data_channel_primary_index: null,
      data_channel_state: "new",
      data_channel_connect_time: null,
      sctp_dtls_state: "new",
      sctp_ice_state: "new",
      sctp_state: "new",
      sctp: null,
      remove_unused_tracks_timer: null,
      created_transceivers: [],
      list_sending_live_mediastream: {},
      list_receiving_live_mediastream: {},
      data_channel_sending_messages_queue: [],
      // Head index into the queue above — QUICO's pn-history pattern: the queue
      // is drained by ADVANCING THIS INDEX (O(1)) instead of Array.shift (O(n),
      // which made large drains O(n²) — measured as an 8-second event-loop stall
      // at 80K queued tiny messages). The consumed prefix is physically freed by
      // an occasional splice once the head crosses a threshold: amortized O(1).
      data_q_head: 0,
      // Running sum of payload bytes currently queued (unsent) — kept in sync by
      // push/drain/expire/close so the public bufferedAmount getter is O(1)
      // instead of O(queue) per read.
      data_channel_queued_bytes: 0,
      // Priority lane for library signaling once the DC is open (offers, answers,
      // candidates, ping/pong, acks). Drained by the pump BEFORE the data queue,
      // exempt from the user rate limits and from pause(): app-data throttling
      // must never starve the traffic that keeps the connection alive and
      // recoverable. Entries are {data, ts} — no callbacks; stale signaling is
      // recovered by the message-level machinery, not by the queue.
      signal_sending_messages_queue: [],
      signal_q_head: 0,
      // head-pointer drain, same pattern as data_q_head
      // pause()/resume() valve. Gates ONLY the data-lane send loop inside the
      // pump — never the pump tick itself (the expiry sweep and the signal lane
      // must keep running while paused).
      data_channel_sending_messages_paused: false,
      data_channel_min_buffered_amount: 64 * 1024,
      data_channel_max_buffered_amount: 1 * 1024 * 1024,
      // Rate limits are OPT-IN. Infinity (the default; users set it via 0 in
      // options) means "no cap" — only the buffer watermarks below govern
      // outgoing throughput. Any positive value is a hard ceiling, read live
      // by the send pump, so it can be tuned at runtime via setConfiguration.
      // NOTE: never apply |0 to these fields — Infinity|0 === 0.
      data_channel_max_sending_messages_per_sec: Infinity,
      data_channel_max_sending_bytes_per_sec: Infinity,
      // A queued message that still hasn't reached the wire after this long is dropped
      // and its callback settled as failed. Defaults to liveness_timeout_ms: if nothing
      // has moved for that long the peer is already being declared dead, so a message
      // still sitting in the queue is never going out.
      data_channel_max_queue_age: 1e4,
      data_channel_pump_queue_timer: null,
      // Sliding 1s windows. Same head-pointer pattern as the queues; the sent
      // window additionally keeps RUNNING SUMS so the rate limiter reads its
      // totals in O(1) instead of re-summing the window per message.
      data_channel_sent_events: [],
      sent_events_head: 0,
      sent_window_count: 0,
      sent_window_bytes: 0,
      data_channel_recv_events: [],
      recv_events_head: 0,
      // ICE server failures, deduped by "url|errorCode" so a broken TURN can't
      // spam events: { "url|code": {url, code, text, count, first_ts, last_ts} }
      ice_server_errors: {},
      // Malformed inbound frames that were dropped rather than allowed to throw.
      stats_dropped_malformed: 0,
      last_malformed_emit_ts: 0,
      // Queued outbound messages dropped because they aged past data_channel_max_queue_age.
      stats_dropped_expired: 0,
      last_expired_emit_ts: 0,
      // Signal-lane entries dropped by the same TTL sweep. Counted silently (no
      // event, no callback): signaling has its own recovery paths.
      stats_dropped_expired_signals: 0,
      // Remote ICE candidates dropped by the anti-flood caps (see
      // add_remote_candidates): a hostile peer can spam candidates, and both the
      // dedup indexOf and the priority sort are O(n)+ per insert.
      stats_dropped_candidates: 0,
      // Send attempts that threw but left the message queued for a later retry.
      stats_send_failures: 0,
      last_send_failure_emit_ts: 0
    };
    function pc_alive() {
      return connection.pc !== null && connection.pc.connectionState !== "closed";
    }
    function report_malformed_frame(source, error) {
      connection.stats_dropped_malformed++;
      var now = Date.now();
      if (now - connection.last_malformed_emit_ts >= 1e3) {
        connection.last_malformed_emit_ts = now;
        ev.emit("error", "malformed inbound frame on " + source + " \u2014 dropped (" + connection.stats_dropped_malformed + " total): " + (error && error.message ? error.message : String(error)));
      }
    }
    function drain_pending_remote_candidates() {
      if (pc_alive() && connection.pc.remoteDescription && connection.pc.remoteDescription.type) {
        var current_remote_ufrag = get_ufrag_from_sdp(connection.pc.remoteDescription.sdp);
        var buckets = [];
        if (current_remote_ufrag && current_remote_ufrag in connection.list_remote_candidates) buckets.push(current_remote_ufrag);
        if ("default" in connection.list_remote_candidates && current_remote_ufrag !== "default") buckets.push("default");
        for (var bi = 0; bi < buckets.length; bi++) {
          var bucket = connection.list_remote_candidates[buckets[bi]];
          if (bucket.pending.length > 0) {
            var candidate = bucket.pending.shift();
            bucket.drained++;
            connection.pc.addIceCandidate(candidate).then(function() {
              setTimeout(drain_pending_remote_candidates, 0);
            }).catch(function(error) {
              ev.emit("error", error);
              setTimeout(drain_pending_remote_candidates, 0);
            });
            return;
          } else if (bucket.total > 0 && bucket.drained == bucket.total) {
            connection.pc.addIceCandidate(null);
          }
        }
      }
    }
    var MAX_REMOTE_UFRAG_BUCKETS = 8;
    var MAX_REMOTE_CANDIDATES_PER_UFRAG = 256;
    function add_remote_candidates(candidate) {
      if (connection.remote_support_trickle_ice == null) {
        connection.remote_support_trickle_ice = true;
      }
      var of_ufrag = "default";
      if (candidate && typeof candidate.usernameFragment === "string" && candidate.usernameFragment.length > 0) {
        of_ufrag = candidate.usernameFragment;
      } else {
        var c = parse_candidate(candidate.candidate);
        if (typeof c.ufrag === "string" && c.ufrag.length > 0) {
          of_ufrag = c.ufrag;
        }
      }
      if (!(of_ufrag in connection.list_remote_candidates)) {
        if (Object.keys(connection.list_remote_candidates).length >= MAX_REMOTE_UFRAG_BUCKETS) {
          connection.stats_dropped_candidates++;
          return;
        }
        connection.list_remote_candidates[of_ufrag] = {
          total: 0,
          drained: 0,
          pending: [],
          all: []
        };
      }
      if (connection.list_remote_candidates[of_ufrag].all.length >= MAX_REMOTE_CANDIDATES_PER_UFRAG) {
        connection.stats_dropped_candidates++;
        return;
      }
      if (connection.list_remote_candidates[of_ufrag].all.indexOf(candidate.candidate) < 0) {
        connection.list_remote_candidates[of_ufrag].all.push(candidate.candidate);
        connection.list_remote_candidates[of_ufrag].pending.push(candidate);
        if (connection.list_remote_candidates[of_ufrag].pending.length >= 2) {
          connection.list_remote_candidates[of_ufrag].pending.sort(function(a, b) {
            var obj_a = parse_candidate(a.candidate);
            var obj_b = parse_candidate(b.candidate);
            var aPriority = obj_a.priority + (obj_a.transport === "tcp" ? 1 : 0);
            var bPriority = obj_b.priority + (obj_b.transport === "tcp" ? 1 : 0);
            if (aPriority === bPriority && "foundation" in obj_a && "foundation" in obj_b && obj_a.foundation !== null && obj_b.foundation !== null) {
              return obj_a.foundation.localeCompare(obj_b.foundation);
            } else {
              return bPriority - aPriority;
            }
          });
        }
        drain_pending_remote_candidates();
      }
    }
    function set_remote_total_candidates(total, ufrag) {
      if (!(ufrag in connection.list_remote_candidates)) {
        connection.list_remote_candidates[ufrag] = {
          total: 0,
          drained: 0,
          pending: [],
          all: []
        };
      }
      ;
      connection.list_remote_candidates[ufrag].total = total;
      if (connection.list_remote_candidates[ufrag].total > 0 && connection.list_remote_candidates[ufrag].total == connection.list_remote_candidates[ufrag].drained) {
        drain_pending_remote_candidates();
      }
    }
    function adopt_primary_data_channel() {
      if (pc_alive()) {
        var winner_index = null;
        var winner_id = null;
        for (var i = 0; i < connection.list_data_channels.length; i++) {
          var dc = connection.list_data_channels[i];
          if (dc && dc.readyState == "open") {
            if (typeof dc.id == "number") {
              if (winner_id === null || dc.id < winner_id) {
                winner_id = dc.id;
                winner_index = i;
              }
            }
          }
        }
        if (winner_index == null) {
          connection.data_channel_primary_index = null;
          set_connection_state({
            data_channel_state: "closed"
          });
          if (connection.data_channel_connect_time != null && connection.create_data_channel_timer == null) {
            var any_still_alive = false;
            for (var di = 0; di < connection.list_data_channels.length; di++) {
              var ddc = connection.list_data_channels[di];
              if (ddc && ddc.readyState !== "closed" && ddc.readyState !== "closing") {
                any_still_alive = true;
                break;
              }
            }
            if (!any_still_alive) {
              connection.create_data_channel_timer = setTimeout(function() {
                connection.create_data_channel_timer = null;
                if (pc_alive() && connection.data_channel_primary_index == null) {
                  ev.emit("log", "all data channels died while the connection is alive \u2014 recreating");
                  create_data_channel();
                }
              }, 50);
            }
          }
        } else {
          connection.data_channel_primary_index = winner_index;
          set_connection_state({
            data_channel_state: String(connection.list_data_channels[connection.data_channel_primary_index].readyState) + ""
          });
          for (var i = 0; i < connection.list_data_channels.length; i++) {
            var dc = connection.list_data_channels[i];
            if (dc && i !== winner_index) {
              if (dc.readyState == "open") {
                try {
                  dc.close();
                } catch (e) {
                }
              }
            }
          }
        }
      }
    }
    function is_negotiation_needed() {
      var for_datachannel = false;
      var count_dc_open = 0;
      var count_dc_connecting = 0;
      for (var i = 0; i < connection.list_data_channels.length; i++) {
        var dc = connection.list_data_channels[i];
        if (dc) {
          if (dc.readyState !== "closed" && dc.readyState !== "closing") {
            if (dc.readyState == "open") {
              count_dc_open++;
            } else {
              count_dc_connecting++;
            }
          }
        }
      }
      if (count_dc_connecting > 0) {
        if (connection.pc && (!connection.pc.currentRemoteDescription || connection.pc.currentRemoteDescription.sdp.indexOf("m=application") < 0)) {
          for_datachannel = true;
        }
      }
      var for_media = false;
      for (var ti = 0; ti < connection.created_transceivers.length; ti++) {
        var ctc = connection.created_transceivers[ti].tc;
        if (ctc) {
          if (!ctc.stopped && ctc.direction == "sendonly" && ctc.mid == null) {
            for_media = true;
            break;
          }
          if (!ctc.stopped && ctc.mid !== null && ctc.currentDirection !== null && ctc.direction !== ctc.currentDirection) {
            for_media = true;
            break;
          }
        }
      }
      if (!for_media) {
        for (var tag_id in connection.list_sending_live_mediastream) {
          var rec = connection.list_sending_live_mediastream[tag_id];
          if (rec.video_track && !rec.video_mid) {
            for_media = true;
            break;
          }
          if (rec.audio_track && !rec.audio_mid) {
            for_media = true;
            break;
          }
        }
      }
      if (!for_media && connection.pc && typeof connection.pc.getTransceivers === "function") {
        var all_tcs = connection.pc.getTransceivers();
        for (var ati = 0; ati < all_tcs.length; ati++) {
          var atc = all_tcs[ati];
          if (atc && !atc.stopped) {
            if ((atc.direction == "sendonly" || atc.direction == "sendrecv") && (atc.mid == null || atc.currentDirection == null)) {
              for_media = true;
              break;
            }
            if (atc.mid !== null && atc.currentDirection !== null && atc.direction !== atc.currentDirection) {
              for_media = true;
              break;
            }
          }
        }
      }
      if (for_datachannel == true || for_media == true || connection.need_ice_restart == true || connection.need_reoffer == true) {
        return true;
      } else {
        return false;
      }
    }
    var _engine_diag = typeof process !== "undefined" && process.env && process.env.WEBRTC_DEBUG ? function(m) {
      console.log("[engine-diag] " + m);
    } : function() {
    };
    var POLITE_DEFER_MAX_MS = 2500;
    function politeness() {
      if (connection.negotiation_role === "lead") {
        return false;
      }
      if (connection.negotiation_role === "follow") {
        return true;
      }
      if (!connection.remote_nonce) {
        return null;
      }
      if (connection.local_nonce === connection.remote_nonce) {
        return null;
      }
      return connection.local_nonce < connection.remote_nonce;
    }
    function opening_phase() {
      if (!connection.pc) {
        return true;
      }
      return connection.pc.currentLocalDescription == null && connection.pc.currentRemoteDescription == null;
    }
    function create_offer_schedule() {
      clearTimeout(connection.create_offer_timer);
      connection.create_offer_timer = null;
      if (connection.create_offer_failures >= 10) {
        _engine_diag("offer_schedule: LOCKED OUT (failures=" + connection.create_offer_failures + ")");
        return;
      }
      var base_delay = 5 + Math.floor(Math.random() * 15);
      var delay = Math.min(base_delay * Math.pow(2, connection.create_offer_failures), 5e3);
      _engine_diag("offer_schedule: armed, delay=" + delay + "ms failures=" + connection.create_offer_failures);
      connection.create_offer_timer = setTimeout(function offer_timer_body() {
        connection.create_offer_timer = null;
        if (opening_phase()) {
          var _pol = politeness();
          if (_pol === true || _pol === null) {
            if (connection.polite_defer_started == null) {
              connection.polite_defer_started = Date.now();
              _engine_diag("RULE-A: " + (_pol === true ? "polite" : "politeness-unknown") + " \u2014 deferring opening offer (deadline " + POLITE_DEFER_MAX_MS + "ms)");
            }
            if (Date.now() - connection.polite_defer_started < POLITE_DEFER_MAX_MS) {
              connection.create_offer_timer = setTimeout(offer_timer_body, 120);
              return;
            }
            _engine_diag("RULE-A: defer deadline passed \u2014 offering anyway (liveness)");
          }
        }
        if (connection.pc && connection.negotiation_state == 0) {
          var _needed = is_negotiation_needed();
          _engine_diag("offer_timer fired: neg=0, is_negotiation_needed=" + _needed);
          if (_needed == true) {
            create_offer();
          }
        } else {
          _engine_diag("offer_timer fired: SKIPPED (pc=" + !!connection.pc + " neg=" + connection.negotiation_state + ")");
        }
      }, delay);
    }
    function set_connection_state(options) {
      var has_changed = false;
      var fields = [
        "sctp_state",
        "sctp_ice_state",
        "sctp_dtls_state",
        "data_channel_state",
        "negotiation_state",
        "signaling_state",
        "current_remote_protocol",
        "current_local_protocol",
        "current_remote_relay",
        "current_local_relay",
        "current_local_ip",
        "current_remote_ip",
        "current_local_port",
        "current_remote_port",
        "current_local_candidate_type",
        "current_remote_candidate_type",
        "current_rtt",
        "current_bandwidth_outgoing",
        "current_connection_type"
      ];
      var prev = {};
      for (var fi = 0; fi < fields.length; fi++) {
        prev[fields[fi]] = connection[fields[fi]];
      }
      if (options && typeof options === "object") {
        for (var fi2 = 0; fi2 < fields.length; fi2++) {
          if (fields[fi2] in options) {
            if (connection[fields[fi2]] !== options[fields[fi2]]) {
              connection[fields[fi2]] = options[fields[fi2]];
              has_changed = true;
            }
          }
        }
      }
      if (has_changed == true) {
        ev.emit("statechange", build_state_snapshot());
        if (connection["data_channel_state"] == "open" && connection["data_channel_state"] !== prev["data_channel_state"]) {
          if (connection.data_channel_connect_time == null || connection.data_channel_connect_time == 0) {
            connection.data_channel_connect_time = Date.now();
            ev.emit("connect");
          }
          connection_getstats();
          data_channel_schedule_pump();
          start_ping();
          start_liveness();
        }
        if (connection.negotiation_state !== prev["negotiation_state"]) {
          if (connection.negotiation_state !== 2) {
            clearTimeout(connection.wait_for_answer_timeout_timer);
            connection.wait_for_answer_timeout_timer = null;
          }
          if (connection.negotiation_state == 0) {
            sctp_events();
            update_all_mediastream_senders();
            update_all_mediastream_receivers();
            if (connection.renegotiation_pending == true && connection.create_offer_timer == null) {
              _engine_diag("neg\u21920 cascade: re-arming latched renegotiation");
              connection.renegotiation_pending = false;
              create_offer_schedule();
            }
            if (connection.pending_remote_offer_sdp !== null) {
              if (connection.pc && (connection.negotiation_state == 0 || connection.negotiation_state == 2 || connection.negotiation_state == 5)) {
                set_remote_offer();
              }
            } else if (connection.create_offer_timer == null) {
              create_offer_schedule();
            }
          }
          if (connection.negotiation_state == 5) {
            clearTimeout(connection.negotiation_done_timeout_timer);
            connection.negotiation_done_timeout_timer = null;
            connection.negotiation_done_timeout_timer = setTimeout(function() {
              connection.negotiation_done_timeout_timer = null;
              if (connection.negotiation_state == 5) {
                set_connection_state({
                  negotiation_state: 0
                });
              }
            }, 3e3);
          } else {
            if (connection.negotiation_done_timeout_timer !== null) {
              clearTimeout(connection.negotiation_done_timeout_timer);
              connection.negotiation_done_timeout_timer = null;
            }
          }
        }
        if (connection.signaling_state !== prev["signaling_state"]) {
          if (connection.signaling_state == "stable" || connection.signaling_state == "have-remote-offer") {
            var emit_fingerprints_available = false;
            if (connection.pc.remoteDescription && connection.pc.remoteDescription.type && connection.remote_fingerprint == null) {
              connection.remote_fingerprint = get_fingerprint_from_sdp(connection.pc.remoteDescription.sdp);
              if (connection.local_fingerprint !== null) {
                emit_fingerprints_available = true;
              }
            }
            if (connection.pc.localDescription && connection.pc.localDescription.type && connection.local_fingerprint == null) {
              connection.local_fingerprint = get_fingerprint_from_sdp(connection.pc.localDescription.sdp);
              if (connection.remote_fingerprint !== null) {
                emit_fingerprints_available = true;
              }
            }
            if (emit_fingerprints_available) {
              ev.emit("fingerprints", connection.local_fingerprint, connection.remote_fingerprint);
            }
            if (connection.signaling_state == "stable") {
              if (connection.pc.currentRemoteDescription && connection.pc.currentRemoteDescription.type && connection.pc.currentLocalDescription && connection.pc.currentLocalDescription.type) {
                var current_remote_ufrag = get_ufrag_from_sdp(connection.pc.currentRemoteDescription.sdp);
                var current_local_ufrag = get_ufrag_from_sdp(connection.pc.currentLocalDescription.sdp);
                if (current_local_ufrag && current_remote_ufrag) {
                  var local_ufrag_changed = false;
                  var remote_ufrag_changed = false;
                  if (connection.last_local_ufrag == null || connection.last_local_ufrag !== current_local_ufrag) {
                    connection.last_local_ufrag = current_local_ufrag;
                    local_ufrag_changed = true;
                  }
                  if (connection.last_remote_ufrag == null || connection.last_remote_ufrag !== current_remote_ufrag) {
                    connection.last_remote_ufrag = current_remote_ufrag;
                    remote_ufrag_changed = true;
                  }
                  if (local_ufrag_changed) {
                    if (connection.need_ice_restart == true) {
                      connection.need_ice_restart = false;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    function add_data_channel(dc) {
      if (pc_alive()) {
        var dc_index = connection.list_data_channels.push(dc);
        dc.binaryType = "arraybuffer";
        dc.bufferedAmountLowThreshold = connection.data_channel_min_buffered_amount;
        dc.onopen = function(event) {
          adopt_primary_data_channel();
        };
        dc.onmessage = function(event) {
          var now = Date.now();
          connection.last_recv_time = now;
          var bytes = event.data.byteLength || event.data.length || 0;
          var rvs = connection.data_channel_recv_events;
          rvs.push([now, bytes]);
          while (connection.recv_events_head < rvs.length && now - rvs[connection.recv_events_head][0] > 1e3) {
            connection.recv_events_head++;
          }
          if (rvs.length - connection.recv_events_head > 65536) {
            connection.recv_events_head = rvs.length - 65536;
          }
          if (connection.recv_events_head >= 4096) {
            rvs.splice(0, connection.recv_events_head);
            connection.recv_events_head = 0;
          }
          try {
            var _dcmsg = litepack_default.decode(SCHEMA_DC_MSG, event.data);
            if (_dcmsg.type == MSGCODE_TYPE_MAP["SIGNAL_CHUNK"]) {
              var _whole = reassemble_chunk(_dcmsg.data, connection.chunk_reasm_internal);
              if (_whole !== null) {
                var _inner = litepack_default.decode(SCHEMA_DC_MSG, _whole);
                if (_inner.type == MSGCODE_TYPE_MAP["DATA"]) {
                  ev.emit("data", _inner.data);
                } else {
                  process_income_signal(_inner.type, _inner.data);
                }
              }
            } else if (_dcmsg.type == MSGCODE_TYPE_MAP["DATA"]) {
              ev.emit("data", _dcmsg.data);
            } else {
              process_income_signal(_dcmsg.type, _dcmsg.data);
            }
          } catch (error) {
            report_malformed_frame("datachannel", error);
          }
        };
        dc.onbufferedamountlow = function() {
          data_channel_schedule_pump();
        };
        dc.onclosing = function(event) {
          adopt_primary_data_channel();
        };
        dc.onclose = function(event) {
          adopt_primary_data_channel();
          if (pc_alive()) {
          }
        };
        dc.onerror = function(error) {
          adopt_primary_data_channel();
          if (pc_alive()) {
            var msg = error;
            if (error && error.error && error.error.message) msg = error.error.message;
            else if (error && error.message) msg = error.message;
            ev.emit("error", msg);
          }
        };
      }
    }
    function create_data_channel(schedule_offer) {
      if (pc_alive()) {
        try {
          var dc = connection.pc.createDataChannel("dc", {
            reliable: false,
            maxRetransmits: 0,
            //maxPacketLifeTime:0,
            ordered: false,
            //negotiated: true,
            //id: Number(0),
            maxMessageSize: 16 * 1024
          });
          add_data_channel(dc);
          if (schedule_offer !== false) {
            create_offer_schedule();
          }
        } catch (error) {
          ev.emit("error", error);
        }
      }
    }
    function connection_getstats() {
      if (pc_alive() && connection.pc.getStats) {
        if (connection.getstats_running == false) {
          connection.getstats_running = true;
          if (connection.getstats_timer !== null) {
            clearTimeout(connection.getstats_timer);
            connection.getstats_timer = null;
          }
          connection.pc.getStats().then(function(stats) {
            try {
              connection.getstats_running = false;
              var obj_reports = {};
              stats.forEach(function(report) {
                if (!(report.type in obj_reports)) {
                  obj_reports[report.type] = {};
                }
                obj_reports[report.type][report.id] = report;
              });
              if ("transport" in obj_reports) {
                for (var i in obj_reports["transport"]) {
                  if ("selectedCandidatePairId" in obj_reports["transport"][i]) {
                    var selectedCandidatePairId = obj_reports["transport"][i].selectedCandidatePairId;
                    var local_candidate = null;
                    var remote_candidate = null;
                    var this_candidate_pair = null;
                    if ("local-candidate" in obj_reports && "candidate-pair" in obj_reports && selectedCandidatePairId in obj_reports["candidate-pair"]) {
                      local_candidate = obj_reports["local-candidate"][obj_reports["candidate-pair"][selectedCandidatePairId].localCandidateId];
                    }
                    if ("remote-candidate" in obj_reports && "candidate-pair" in obj_reports && selectedCandidatePairId in obj_reports["candidate-pair"]) {
                      remote_candidate = obj_reports["remote-candidate"][obj_reports["candidate-pair"][selectedCandidatePairId].remoteCandidateId];
                    }
                    if ("candidate-pair" in obj_reports && selectedCandidatePairId in obj_reports["candidate-pair"]) {
                      this_candidate_pair = obj_reports["candidate-pair"][selectedCandidatePairId];
                    }
                    if (local_candidate !== null && remote_candidate !== null && this_candidate_pair !== null) {
                      var local_protocol = local_candidate.protocol;
                      var remote_protocol = remote_candidate.protocol;
                      var current_rtt = null;
                      if ("currentRoundTripTime" in this_candidate_pair) {
                        current_rtt = Number(this_candidate_pair.currentRoundTripTime) * 1e3;
                      }
                      var local_relay = false;
                      var remote_relay = false;
                      if (local_candidate.candidateType == "relay") {
                        local_relay = true;
                      }
                      if (remote_candidate.candidateType == "relay") {
                        remote_relay = true;
                      }
                      var this_candidate_priority = Number(this_candidate_pair.priority);
                      var this_candidate_state = this_candidate_pair.state;
                      var local_ip = null;
                      var local_port = null;
                      var remote_ip = null;
                      var remote_port = null;
                      var local_candidate_type = local_candidate.candidateType || null;
                      var remote_candidate_type = remote_candidate.candidateType || null;
                      if ("ip" in local_candidate) local_ip = local_candidate.ip;
                      else if ("address" in local_candidate) local_ip = local_candidate.address;
                      if ("port" in local_candidate) local_port = local_candidate.port;
                      if ("ip" in remote_candidate) remote_ip = remote_candidate.ip;
                      else if ("address" in remote_candidate) remote_ip = remote_candidate.address;
                      if ("port" in remote_candidate) remote_port = remote_candidate.port;
                      var bandwidth_outgoing = null;
                      if ("availableOutgoingBitrate" in this_candidate_pair) {
                        bandwidth_outgoing = Number(this_candidate_pair.availableOutgoingBitrate) || null;
                      }
                      var conn_type = "unknown";
                      if (local_protocol && remote_protocol) {
                        if (local_relay || remote_relay) {
                          conn_type = "relayed";
                        } else if (local_protocol === "udp" && remote_protocol === "udp") {
                          conn_type = "direct-udp";
                        } else if (local_protocol === "tcp" || remote_protocol === "tcp") {
                          conn_type = "direct-tcp";
                        } else {
                          conn_type = "direct";
                        }
                      }
                      if (this_candidate_state == "succeeded") {
                        var prev_conn_type = connection.current_connection_type;
                        set_connection_state({
                          current_local_protocol: local_protocol,
                          current_remote_protocol: remote_protocol,
                          current_local_relay: local_relay,
                          current_remote_relay: remote_relay,
                          current_local_ip: local_ip,
                          current_remote_ip: remote_ip,
                          current_local_port: local_port,
                          current_remote_port: remote_port,
                          current_local_candidate_type: local_candidate_type,
                          current_remote_candidate_type: remote_candidate_type,
                          current_rtt,
                          current_bandwidth_outgoing: bandwidth_outgoing,
                          current_connection_type: conn_type
                        });
                        if (prev_conn_type !== conn_type || prev_conn_type === "unknown") {
                          ev.emit("connectioninfo", build_connection_info());
                        }
                        if (connection.best_candidate_pair_priority < this_candidate_priority) {
                          connection.best_candidate_pair_priority = this_candidate_priority;
                        } else if (connection.best_candidate_pair_priority > this_candidate_priority) {
                          connection.best_candidate_pair_priority = this_candidate_priority;
                        }
                      }
                    }
                  }
                  if ("iceState" in obj_reports["transport"][i]) {
                    var iceState = obj_reports["transport"][i].iceState;
                    set_connection_state({
                      sctp_ice_state: iceState
                    });
                  }
                  if ("dtlsState" in obj_reports["transport"][i]) {
                    var dtlsState = obj_reports["transport"][i].dtlsState;
                    set_connection_state({
                      sctp_dtls_state: dtlsState
                    });
                  }
                }
              }
              if ("data-channel" in obj_reports) {
                for (var i in obj_reports["data-channel"]) {
                }
                adopt_primary_data_channel();
              }
              if ("candidate-pair" in obj_reports) {
                for (var i in obj_reports["candidate-pair"]) {
                }
              }
              if ("outbound-rtp" in obj_reports) {
                for (var i in obj_reports["outbound-rtp"]) {
                  var codec_mime_type = null;
                  if ("codec" in obj_reports) {
                    if ("codecId" in obj_reports["outbound-rtp"][i]) {
                      if (obj_reports["outbound-rtp"][i].codecId in obj_reports["codec"]) {
                        if ("mimeType" in obj_reports["codec"][obj_reports["outbound-rtp"][i].codecId]) {
                          codec_mime_type = obj_reports["codec"][obj_reports["outbound-rtp"][i].codecId].mimeType;
                        }
                      }
                    }
                  }
                  if ("mid" in obj_reports["outbound-rtp"][i]) {
                    var sending_status = 0;
                    if (obj_reports["outbound-rtp"][i].active == true) {
                      sending_status = 1;
                    }
                    var rtp_bytes_sent = obj_reports["outbound-rtp"][i].bytesSent || 0;
                    for (var tag_id in connection.list_sending_live_mediastream) {
                      if (String(obj_reports["outbound-rtp"][i].mid) === String(connection.list_sending_live_mediastream[tag_id].video_mid)) {
                        var srec = connection.list_sending_live_mediastream[tag_id];
                        srec.video_active = sending_status === 1;
                        if ("frameHeight" in obj_reports["outbound-rtp"][i]) {
                          srec.current_video_frame_height = obj_reports["outbound-rtp"][i].frameHeight;
                        }
                        if ("frameWidth" in obj_reports["outbound-rtp"][i]) {
                          srec.current_video_frame_width = obj_reports["outbound-rtp"][i].frameWidth;
                        }
                        if ("framesPerSecond" in obj_reports["outbound-rtp"][i]) {
                          srec.current_video_fps = obj_reports["outbound-rtp"][i].framesPerSecond;
                        }
                        if (codec_mime_type !== null) {
                          srec.current_video_mime_type = codec_mime_type;
                        }
                        var now_ts = Date.now();
                        if (srec._prev_video_stats_time > 0 && rtp_bytes_sent >= srec._prev_video_bytes_sent) {
                          var dt = (now_ts - srec._prev_video_stats_time) / 1e3;
                          if (dt > 0) srec.video_bitrate = Math.round((rtp_bytes_sent - srec._prev_video_bytes_sent) * 8 / dt);
                        }
                        srec._prev_video_bytes_sent = rtp_bytes_sent;
                        srec._prev_video_stats_time = now_ts;
                      } else if (String(obj_reports["outbound-rtp"][i].mid) === String(connection.list_sending_live_mediastream[tag_id].audio_mid)) {
                        var srec_a = connection.list_sending_live_mediastream[tag_id];
                        srec_a.audio_active = sending_status === 1;
                        if (codec_mime_type !== null) {
                          srec_a.audio_mime_type = codec_mime_type;
                        }
                        var now_ts_a = Date.now();
                        if (srec_a._prev_audio_stats_time > 0 && rtp_bytes_sent >= srec_a._prev_audio_bytes_sent) {
                          var dt_a = (now_ts_a - srec_a._prev_audio_stats_time) / 1e3;
                          if (dt_a > 0) srec_a.audio_bitrate = Math.round((rtp_bytes_sent - srec_a._prev_audio_bytes_sent) * 8 / dt_a);
                        }
                        srec_a._prev_audio_bytes_sent = rtp_bytes_sent;
                        srec_a._prev_audio_stats_time = now_ts_a;
                      }
                    }
                  }
                }
              }
              if ("inbound-rtp" in obj_reports) {
                for (var i in obj_reports["inbound-rtp"]) {
                  var codec_mime_type = null;
                  if ("codec" in obj_reports) {
                    if ("codecId" in obj_reports["inbound-rtp"][i]) {
                      if (obj_reports["inbound-rtp"][i].codecId in obj_reports["codec"]) {
                        if ("mimeType" in obj_reports["codec"][obj_reports["inbound-rtp"][i].codecId]) {
                          codec_mime_type = obj_reports["codec"][obj_reports["inbound-rtp"][i].codecId].mimeType;
                        }
                      }
                    }
                  }
                  if ("mid" in obj_reports["inbound-rtp"][i]) {
                    var rtp_bytes_recv = obj_reports["inbound-rtp"][i].bytesReceived || 0;
                    var rtp_packets_lost = obj_reports["inbound-rtp"][i].packetsLost || 0;
                    var rtp_packets_recv = obj_reports["inbound-rtp"][i].packetsReceived || 0;
                    var rtp_jitter = obj_reports["inbound-rtp"][i].jitter || 0;
                    var rtp_fps = obj_reports["inbound-rtp"][i].framesPerSecond || 0;
                    for (var tag_id in connection.list_receiving_live_mediastream) {
                      if (String(obj_reports["inbound-rtp"][i].mid) === String(connection.list_receiving_live_mediastream[tag_id].video_mid)) {
                        var rrec = connection.list_receiving_live_mediastream[tag_id];
                        if ("frameHeight" in obj_reports["inbound-rtp"][i]) {
                          rrec.current_video_frame_height = obj_reports["inbound-rtp"][i].frameHeight;
                        }
                        if ("frameWidth" in obj_reports["inbound-rtp"][i]) {
                          rrec.current_video_frame_width = obj_reports["inbound-rtp"][i].frameWidth;
                        }
                        if (rtp_fps) rrec.current_video_fps = rtp_fps;
                        if (codec_mime_type !== null) rrec.current_video_mime_type = codec_mime_type;
                        rrec.video_active = rtp_fps > 0;
                        rrec.video_jitter = rtp_jitter;
                        var now_rv = Date.now();
                        if (rrec._prev_video_stats_time > 0 && rtp_bytes_recv >= rrec._prev_video_bytes_received) {
                          var dt_rv = (now_rv - rrec._prev_video_stats_time) / 1e3;
                          if (dt_rv > 0) rrec.video_bitrate = Math.round((rtp_bytes_recv - rrec._prev_video_bytes_received) * 8 / dt_rv);
                        }
                        rrec._prev_video_bytes_received = rtp_bytes_recv;
                        rrec._prev_video_stats_time = now_rv;
                        var total_v = rtp_packets_recv + rtp_packets_lost;
                        if (total_v > 0) {
                          var prev_total_v = rrec._prev_video_packets_received + rrec._prev_video_packets_lost;
                          var delta_recv_v = rtp_packets_recv - rrec._prev_video_packets_received;
                          var delta_lost_v = rtp_packets_lost - rrec._prev_video_packets_lost;
                          var delta_total_v = delta_recv_v + delta_lost_v;
                          rrec.video_packet_loss = delta_total_v > 0 ? Math.round(delta_lost_v / delta_total_v * 1e4) / 100 : 0;
                        }
                        rrec._prev_video_packets_received = rtp_packets_recv;
                        rrec._prev_video_packets_lost = rtp_packets_lost;
                      } else if (String(obj_reports["inbound-rtp"][i].mid) === String(connection.list_receiving_live_mediastream[tag_id].audio_mid)) {
                        var rrec_a = connection.list_receiving_live_mediastream[tag_id];
                        if (codec_mime_type !== null) rrec_a.current_audio_mime_type = codec_mime_type;
                        rrec_a.audio_active = rtp_packets_recv > rrec_a._prev_audio_packets_received;
                        rrec_a.audio_jitter = rtp_jitter;
                        var now_ra = Date.now();
                        if (rrec_a._prev_audio_stats_time > 0 && rtp_bytes_recv >= rrec_a._prev_audio_bytes_received) {
                          var dt_ra = (now_ra - rrec_a._prev_audio_stats_time) / 1e3;
                          if (dt_ra > 0) rrec_a.audio_bitrate = Math.round((rtp_bytes_recv - rrec_a._prev_audio_bytes_received) * 8 / dt_ra);
                        }
                        rrec_a._prev_audio_bytes_received = rtp_bytes_recv;
                        rrec_a._prev_audio_stats_time = now_ra;
                        var total_a = rtp_packets_recv + rtp_packets_lost;
                        if (total_a > 0) {
                          var delta_recv_a = rtp_packets_recv - rrec_a._prev_audio_packets_received;
                          var delta_lost_a = rtp_packets_lost - rrec_a._prev_audio_packets_lost;
                          var delta_total_a = delta_recv_a + delta_lost_a;
                          rrec_a.audio_packet_loss = delta_total_a > 0 ? Math.round(delta_lost_a / delta_total_a * 1e4) / 100 : 0;
                        }
                        rrec_a._prev_audio_packets_received = rtp_packets_recv;
                        rrec_a._prev_audio_packets_lost = rtp_packets_lost;
                      }
                    }
                  }
                }
              }
              emit_stream_stats();
              connection.getstats_timer = setTimeout(connection_getstats, 1e3);
            } catch (error) {
              ev.emit("error", error);
              connection.getstats_running = false;
            }
          }).catch(function(error) {
            ev.emit("error", error);
            connection.getstats_running = false;
          });
        }
      }
    }
    function schedule_ping() {
      if (connection.ping_enabled === false) return;
      clearTimeout(connection.ping_timer);
      var span = Math.max(0, connection.ping_interval_max - connection.ping_interval_min);
      var delay = connection.ping_interval_min + Math.floor(Math.random() * span);
      connection.ping_timer = setTimeout(function() {
        connection.ping_timer = null;
        if (pc_alive() && connection.data_channel_state === "open") {
          try {
            send_signal(MSGCODE_TYPE_MAP["PING"], litepack_default.encode(SCHEMA_PING, { timestamp: Date.now() }));
          } catch (error) {
          }
          schedule_ping();
        }
      }, delay);
    }
    function start_ping() {
      if (connection.ping_enabled === false) return;
      if (connection.ping_timer !== null) return;
      schedule_ping();
    }
    function liveness_period() {
      return Math.max(1e3, Math.floor(connection.liveness_timeout_ms / 3));
    }
    function check_liveness() {
      connection.liveness_timer = null;
      if (!pc_alive()) return;
      if (connection.liveness_enabled === false) return;
      var idle = Date.now() - connection.last_recv_time;
      if (connection.last_recv_time > 0 && idle >= connection.liveness_timeout_ms) {
        var ice = connection.pc.iceConnectionState;
        if (ice === "connected" || ice === "completed") {
          ev.emit("disconnect", { reason: "timeout", restartCount: connection.ice_restart_count });
          if (connection.ice_restart_count < connection.ice_restart_max_retries) {
            connection.ice_restart_count++;
            connection.last_recv_time = Date.now();
            restartIce();
          } else {
            ev.emit("error", "connection lost \u2014 no inbound traffic for " + idle + "ms; closing after " + connection.ice_restart_max_retries + " recovery attempts");
            close_connection();
            return;
          }
        }
      }
      connection.liveness_timer = setTimeout(check_liveness, liveness_period());
    }
    function start_liveness() {
      if (connection.liveness_enabled === false) return;
      if (connection.liveness_timer !== null) return;
      connection.last_recv_time = Date.now();
      connection.liveness_timer = setTimeout(check_liveness, liveness_period());
    }
    function build_connection_info() {
      return {
        type: connection.current_connection_type || "unknown",
        rtt: connection.current_rtt,
        // ICE/DTLS-level (from getStats; may be null on some bindings)
        ping_rtt: connection.current_ping_rtt,
        // app-level DataChannel round-trip (from ping/pong)
        bandwidth_outgoing: connection.current_bandwidth_outgoing,
        local: {
          ip: connection.current_local_ip,
          port: connection.current_local_port,
          protocol: connection.current_local_protocol,
          relay: connection.current_local_relay,
          candidateType: connection.current_local_candidate_type
        },
        remote: {
          ip: connection.current_remote_ip,
          port: connection.current_remote_port,
          protocol: connection.current_remote_protocol,
          relay: connection.current_remote_relay,
          candidateType: connection.current_remote_candidate_type
        }
      };
    }
    function build_state_snapshot() {
      var snap = {
        negotiation_state: connection.negotiation_state,
        signaling_state: connection.signaling_state,
        data_channel_state: connection.data_channel_state,
        ice_connection_state: connection.pc ? connection.pc.iceConnectionState : null,
        connection_state: connection.pc ? connection.pc.connectionState : null,
        ice_gathering_state: connection.pc ? connection.pc.iceGatheringState : null,
        sctp_state: connection.sctp_state,
        sctp_dtls_state: connection.sctp_dtls_state,
        sctp_ice_state: connection.sctp_ice_state,
        connection_type: connection.current_connection_type,
        rtt: connection.current_rtt,
        ping_rtt: connection.current_ping_rtt,
        bandwidth_outgoing: connection.current_bandwidth_outgoing,
        need_ice_restart: connection.need_ice_restart,
        ice_restart_count: connection.ice_restart_count,
        gathering_retry_count: connection.gathering_retry_count,
        epoch: connection.epoch_negotiation_success
      };
      return snap;
    }
    function build_stream_stats_obj(rec) {
      return {
        video: {
          active: rec.video_active || false,
          width: rec.current_video_frame_width || 0,
          height: rec.current_video_frame_height || 0,
          fps: rec.current_video_fps || 0,
          codec: rec.current_video_mime_type || null,
          bitrate: rec.video_bitrate || 0,
          packetLoss: rec.video_packet_loss || 0,
          jitter: rec.video_jitter || 0
        },
        audio: {
          active: rec.audio_active || false,
          codec: rec.audio_mime_type || rec.current_audio_mime_type || null,
          bitrate: rec.audio_bitrate || 0,
          packetLoss: rec.audio_packet_loss || 0,
          jitter: rec.audio_jitter || 0
        }
      };
    }
    var _prev_stream_snapshots = {};
    function emit_stream_stats() {
      for (var tag_id in connection.list_sending_live_mediastream) {
        var rec = connection.list_sending_live_mediastream[tag_id];
        var key = "s:" + tag_id;
        var stats = build_stream_stats_obj(rec);
        var snap = JSON.stringify(stats);
        if (_prev_stream_snapshots[key] !== snap) {
          _prev_stream_snapshots[key] = snap;
          ev.emit("streamstats", tag_id, "sending", stats);
        }
      }
      for (var tag_id in connection.list_receiving_live_mediastream) {
        var rec = connection.list_receiving_live_mediastream[tag_id];
        var key = "r:" + tag_id;
        var stats = build_stream_stats_obj(rec);
        var snap = JSON.stringify(stats);
        if (_prev_stream_snapshots[key] !== snap) {
          _prev_stream_snapshots[key] = snap;
          ev.emit("streamstats", tag_id, "receiving", stats);
        }
      }
    }
    function sctp_events() {
      if (pc_alive()) {
        if (connection.pc.sctp && connection.sctp == null) {
          connection.sctp = connection.pc.sctp;
          adopt_primary_data_channel();
          try {
            if (connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport) {
              set_connection_state({
                sctp_ice_state: String(connection.pc.sctp.transport.iceTransport.state) + ""
              });
            }
          } catch (error) {
            ev.emit("error", error);
          }
          try {
            if (connection.pc.sctp.transport) {
              set_connection_state({
                sctp_dtls_state: String(connection.pc.sctp.transport.state) + ""
              });
            }
          } catch (error) {
            ev.emit("error", error);
          }
          try {
            set_connection_state({
              sctp_state: String(connection.pc.sctp.state) + ""
            });
          } catch (error) {
            ev.emit("error", error);
          }
          try {
            if (connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport && "onstatechange" in connection.pc.sctp.transport.iceTransport) {
              connection.pc.sctp.transport.iceTransport.onstatechange = function() {
                if (pc_alive()) {
                  set_connection_state({
                    sctp_ice_state: String(connection.pc.sctp.transport.iceTransport.state) + ""
                  });
                  adopt_primary_data_channel();
                }
              };
            }
          } catch (error) {
            ev.emit("error", error);
          }
          try {
            if (connection.pc.sctp.transport && "onstatechange" in connection.pc.sctp.transport) {
              connection.pc.sctp.transport.onstatechange = function() {
                if (pc_alive()) {
                  set_connection_state({
                    sctp_dtls_state: String(connection.pc.sctp.transport.state) + ""
                  });
                  adopt_primary_data_channel();
                }
              };
            }
          } catch (error) {
            ev.emit("error", error);
          }
          try {
            if ("onstatechange" in connection.pc.sctp) {
              connection.pc.sctp.onstatechange = function() {
                if (pc_alive()) {
                  set_connection_state({
                    sctp_state: String(connection.pc.sctp.state) + ""
                  });
                  adopt_primary_data_channel();
                }
              };
            }
          } catch (error) {
            ev.emit("error", error);
          }
          try {
            if (connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport && "onselectedcandidatepairchange" in connection.pc.sctp.transport.iceTransport) {
              connection.pc.sctp.transport.iceTransport.onselectedcandidatepairchange = function() {
                if (pc_alive()) {
                  var selected_candidate_pair = connection.pc.sctp.transport.iceTransport.getSelectedCandidatePair();
                  set_connection_state({
                    local_protocol: selected_candidate_pair.local.protocol,
                    remote_protocol: selected_candidate_pair.remote.protocol
                  });
                  connection_getstats();
                }
              };
            }
          } catch (error) {
            ev.emit("error", error);
          }
        }
      }
    }
    function send_negotiation_done(seq) {
      var uint8buffer = litepack_default.encode(SCHEMA_NEG_DONE, { seq, epoch: connection.epoch_negotiation_success });
      send_signal(MSGCODE_TYPE_MAP["NEGOTIATION_DONE"], uint8buffer);
    }
    function process_income_answer(sdp, seq_offer) {
      if (connection.remote_support_trickle_ice == null) {
        connection.remote_support_trickle_ice = is_support_trickle_ice(sdp);
      }
      if (seq_offer >= 1 && seq_offer <= connection.local_offer_history.length) {
        if (connection.local_offer_history[seq_offer - 1][1] == 0) {
          connection.local_offer_history[seq_offer - 1][1] = Date.now();
        }
      }
      if (pc_alive() && connection.negotiation_state == 2 && connection.pc.signalingState == "have-local-offer") {
        if (seq_offer == connection.local_offer_history.length) {
          set_connection_state({
            negotiation_state: 3
          });
          connection.pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp })).then(function() {
            if (!pc_alive()) return;
            drain_pending_remote_candidates();
            if (connection.negotiation_state == 3 && seq_offer == connection.local_offer_history.length) {
              connection.base_offer_sdp = String(connection.sent_local_offer_sdp) + "";
              connection.epoch_negotiation_success++;
              if (connection.local_offer_history[seq_offer - 1][2] == 0) {
                connection.local_offer_history[seq_offer - 1][2] = Date.now();
              }
              send_negotiation_done(seq_offer);
              set_connection_state({
                negotiation_state: 0
              });
            }
          }).catch(function(error) {
            if (connection.negotiation_state == 3 && seq_offer == connection.local_offer_history.length) {
              rollback_signaling_to_stable(function() {
                set_connection_state({
                  negotiation_state: 0
                });
              });
            }
            ev.emit("error", error);
          });
        } else {
          ev.emit("error", "answer for old offer");
        }
      } else {
      }
    }
    function set_negotiation_done(seq, epoch) {
      if (connection.seq_remote_offer == seq) {
        connection.epoch_negotiation_success = epoch;
        if (connection.negotiation_state == 5) {
          clearTimeout(connection.negotiation_done_timeout_timer);
          connection.negotiation_done_timeout_timer = null;
          set_connection_state({
            negotiation_state: 0
          });
        }
      }
    }
    var pending_rollback_callbacks = [];
    function rollback_signaling_to_stable(callback) {
      if (connection.pc) {
        if (connection.pc.signalingState == "stable") {
          if (typeof callback == "function") {
            callback(true);
          }
        } else {
          if (connection.making_rollback == false) {
            connection.making_rollback = true;
            if (connection.data_channel_connect_time == null && (connection.pc.sctp == null || connection.pc.sctp.state !== "connected")) {
              var _had = connection.list_data_channels.length;
              var _closed = 0;
              for (var _di = connection.list_data_channels.length - 1; _di >= 0; _di--) {
                var _dc = connection.list_data_channels[_di];
                if (_dc && _dc.readyState === "connecting") {
                  try {
                    _dc.close();
                  } catch (_e) {
                  }
                  connection.list_data_channels.splice(_di, 1);
                  _closed++;
                }
              }
              if (_closed > 0) {
                if (connection.list_data_channels.length === 0) {
                  connection.data_channel_primary_index = null;
                }
                ev.emit("log", "app-glare rollback: closed " + _closed + "/" + _had + " never-opened data channel(s) before rollback (Chrome SCTP-wedge workaround)");
              }
            }
            connection.pc.setLocalDescription({ type: "rollback" }).then(function() {
              connection.making_rollback = false;
              if (typeof callback == "function") {
                callback(true);
              }
              var queued = pending_rollback_callbacks.slice();
              pending_rollback_callbacks = [];
              for (var i = 0; i < queued.length; i++) {
                try {
                  queued[i](true);
                } catch (e) {
                }
              }
            }).catch(function(error) {
              connection.making_rollback = false;
              if (typeof callback == "function") {
                callback(false);
              }
              var queued = pending_rollback_callbacks.slice();
              pending_rollback_callbacks = [];
              for (var i = 0; i < queued.length; i++) {
                try {
                  queued[i](false);
                } catch (e) {
                }
              }
              ev.emit("error", error);
            });
          } else {
            if (typeof callback == "function") {
              pending_rollback_callbacks.push(callback);
            }
          }
        }
      }
    }
    function set_remote_offer() {
      if (connection.pending_remote_offer_sdp !== null) {
        let create_answer = function() {
          if (pc_alive() && connection.negotiation_state == 4 && connection.pc.signalingState == "have-remote-offer") {
            var this_answer_for_seq = Number(connection.seq_remote_offer) + 0;
            connection.pc.createAnswer().then(function(answer) {
              if (pc_alive() && connection.negotiation_state == 4 && connection.pc.signalingState == "have-remote-offer" && this_answer_for_seq == connection.seq_remote_offer) {
                if ("toJSON" in answer && typeof answer.toJSON == "function") {
                  var answer_json = answer.toJSON();
                } else {
                  var answer_json = answer;
                }
                var answer_modified = remove_all_ice_candidates(answer_json.sdp);
                connection.pc.setLocalDescription(new RTCSessionDescription({ type: "answer", sdp: answer_modified })).then(function() {
                  if (!pc_alive()) return;
                  if (connection.local_support_trickle_ice == null) {
                    connection.local_support_trickle_ice = is_support_trickle_ice(connection.pc.localDescription.sdp);
                  }
                  if (this_answer_for_seq == connection.seq_remote_offer) {
                    connection.sent_local_answer_sdp = answer_modified;
                    send_answer(this_answer_for_seq, connection.pending_remote_offer_sdp, answer_modified);
                    connection.base_offer_sdp = String(connection.pending_remote_offer_sdp) + "";
                    connection.pending_remote_offer_sdp = null;
                    set_connection_state({
                      negotiation_state: 5
                    });
                  } else {
                  }
                }).catch(function(error) {
                  if (this_answer_for_seq == connection.seq_remote_offer) {
                    connection.pending_remote_offer_sdp = null;
                    rollback_signaling_to_stable(function() {
                      set_connection_state({
                        negotiation_state: 0
                      });
                    });
                  }
                  var _msg = error && error.message ? String(error.message) : String(error);
                  if (/SCTP/i.test(_msg)) {
                    ev.emit("log", "FATAL-FOR-DATA: pc SCTP transport wedged (" + _msg + ") \u2014 this pc will fail all future data-channel answers; peer recreation required");
                  }
                  ev.emit("error", error);
                });
              } else {
              }
            }).catch(function(error) {
              if (this_answer_for_seq == connection.seq_remote_offer) {
                connection.pending_remote_offer_sdp = null;
                rollback_signaling_to_stable(function() {
                  set_connection_state({
                    negotiation_state: 0
                  });
                });
              }
              ev.emit("error", error);
            });
          }
        }, applyRemoteOffer = function() {
          if (!pc_alive()) return;
          connection.pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: connection.pending_remote_offer_sdp })).then(function() {
            if (!pc_alive()) return;
            drain_pending_remote_candidates();
            if (this_seq_remote_offer == connection.seq_remote_offer) {
              create_answer();
            }
          }).catch(function(error) {
            if (connection.negotiation_state == 4 && this_seq_remote_offer == connection.seq_remote_offer) {
              connection.pending_remote_offer_sdp = null;
              connection.base_offer_sdp = null;
              rollback_signaling_to_stable(function() {
                set_connection_state({
                  negotiation_state: 0
                });
              });
            }
            ev.emit("error", error);
          });
        };
        if (connection.negotiation_state !== 0 && connection.negotiation_state !== 2 && connection.negotiation_state !== 5) {
          return;
        }
        if (connection.negotiation_state === 2 && !opening_phase() && politeness() === false) {
          _engine_diag("RULE-B: impolite \u2014 ignoring incoming offer while ours is in flight (peer will rollback & answer)");
          connection.pending_remote_offer_sdp = null;
          return;
        }
        var pre_state = connection.negotiation_state;
        set_connection_state({
          negotiation_state: 4
        });
        var this_seq_remote_offer = Number(connection.seq_remote_offer) + 0;
        rollback_signaling_to_stable(function(ok) {
          if (!ok) {
            connection.pending_remote_offer_sdp = null;
            set_connection_state({ negotiation_state: 0 });
            return;
          }
          applyRemoteOffer();
        });
      }
    }
    function process_income_offer(sdp, seq_offer) {
      if (connection.remote_support_trickle_ice == null) {
        connection.remote_support_trickle_ice = is_support_trickle_ice(sdp);
      }
      if (seq_offer > connection.seq_remote_offer) {
        connection.seq_remote_offer = seq_offer;
        connection.pending_remote_offer_sdp = null;
        var base_remote_polite;
        if (connection.remote_nonce !== connection.local_nonce) {
          base_remote_polite = connection.remote_nonce > connection.local_nonce;
        } else {
          base_remote_polite = false;
          var tie_remote_fp = get_fingerprint_from_sdp(sdp);
          var tie_local_fp = connection.local_fingerprint;
          if (tie_local_fp == null && connection.pc && connection.pc.localDescription && connection.pc.localDescription.sdp) {
            tie_local_fp = get_fingerprint_from_sdp(connection.pc.localDescription.sdp);
          }
          if (tie_remote_fp && tie_local_fp) {
            for (var fb = 0; fb < tie_remote_fp.length && fb < tie_local_fp.length; fb++) {
              if (tie_remote_fp[fb] !== tie_local_fp[fb]) {
                base_remote_polite = tie_remote_fp[fb] > tie_local_fp[fb];
                break;
              }
            }
          }
        }
        var even_epoch = connection.epoch_negotiation_success % 2 === 0;
        var polite_now = even_epoch ? base_remote_polite : !base_remote_polite;
        if (connection.negotiation_state == 0 || polite_now == true) {
          connection.pending_remote_offer_sdp = sdp;
          if (connection.pc && (connection.negotiation_state == 0 || connection.negotiation_state == 2 || connection.negotiation_state == 5)) {
            set_remote_offer();
          }
        } else {
        }
      } else {
        ev.emit("error", "offer is old or already processed");
      }
    }
    function restartIce() {
      if (connection.need_ice_restart == false) {
        connection.need_ice_restart = true;
        create_offer_schedule();
      }
    }
    function send_answer_raw(seq, raw_answer_sdp) {
      var uint8buffer = litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(raw_answer_sdp) });
      send_signal(MSGCODE_TYPE_MAP["ANSWER_RAW"], uint8buffer);
    }
    function send_answer(seq, base_sdp, raw_answer_sdp) {
      var base_hash = null;
      var result_hash = null;
      var min_viable_answer_sdp = null;
      var deflate_answer_sdp = null;
      var diff_answer_sdp = null;
      var diff_deflate_answer_sdp = null;
      var finish_count = 2;
      function choose_best_payload() {
        var candidates = [];
        candidates.push([1, raw_answer_sdp.length]);
        if (min_viable_answer_sdp !== null) {
          candidates.push([2, min_viable_answer_sdp.byteLength]);
        }
        if (deflate_answer_sdp !== null) {
          candidates.push([3, deflate_answer_sdp.byteLength]);
        }
        if (diff_deflate_answer_sdp !== null) {
          candidates.push([4, diff_deflate_answer_sdp.byteLength]);
        }
        if (diff_answer_sdp !== null) {
          candidates.push([5, diff_answer_sdp.byteLength]);
        }
        candidates.sort(function(a, b) {
          if (a[1] !== b[1]) {
            return a[1] - b[1];
          }
          return a[0] - b[0];
        });
        var best = candidates[0][0];
        var _payload_names = { 1: "RAW", 2: "COMPACT", 3: "DEFLATE", 4: "DIFF_DEFLATE", 5: "DIFF" };
        ev.emit("log", "answer payload: " + _payload_names[best] + " " + candidates[0][1] + "B  (" + candidates.map(function(c) {
          return _payload_names[c[0]] + ":" + c[1];
        }).join(" ") + ")");
        if (best == 1) {
          send_signal(
            MSGCODE_TYPE_MAP["ANSWER_RAW"],
            litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(raw_answer_sdp) })
          );
        } else if (best == 2) {
          send_signal(
            MSGCODE_TYPE_MAP["ANSWER_COMPACT"],
            litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(min_viable_answer_sdp) })
          );
        } else if (best == 3) {
          send_signal(
            MSGCODE_TYPE_MAP["ANSWER_DEFLATE"],
            litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(deflate_answer_sdp) })
          );
        } else if (best == 4) {
          send_signal(
            MSGCODE_TYPE_MAP["ANSWER_DIFF_DEFLATE"],
            litepack_default.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD, { seq, base_hash: base_hash >>> 0, result_hash: result_hash >>> 0, payload: toU82(diff_deflate_answer_sdp) })
          );
        } else if (best == 5) {
          send_signal(
            MSGCODE_TYPE_MAP["ANSWER_DIFF"],
            litepack_default.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD, { seq, base_hash: base_hash >>> 0, result_hash: result_hash >>> 0, payload: toU82(diff_answer_sdp) })
          );
        }
      }
      min_viable_answer_sdp = compress_sdp_min_viable(raw_answer_sdp);
      if (min_viable_answer_sdp !== null) {
        choose_best_payload();
      } else {
        compress_deflate(raw_answer_sdp, function(result) {
          if (result !== null && result.byteLength < raw_answer_sdp.length) {
            deflate_answer_sdp = result;
          }
          finish_count++;
          if (finish_count == 5) {
            choose_best_payload();
          }
        });
        if (base_sdp !== null) {
          base_hash = murmurhash3_str(base_sdp);
          result_hash = murmurhash3_str(raw_answer_sdp);
          encodeString(base_sdp, raw_answer_sdp, function(err, delta) {
            if (!err && delta) {
              diff_answer_sdp = delta;
              finish_count++;
              compress_deflate(diff_answer_sdp, function(result) {
                if (result !== null && result.byteLength < diff_answer_sdp.byteLength) {
                  diff_deflate_answer_sdp = result;
                }
                finish_count++;
                if (finish_count == 5) {
                  choose_best_payload();
                }
              });
            } else {
              finish_count++;
              finish_count++;
              if (finish_count == 5) {
                choose_best_payload();
              }
            }
          });
        } else {
          finish_count++;
          finish_count++;
          if (finish_count == 5) {
            choose_best_payload();
          }
        }
      }
    }
    function send_offer_raw(seq, raw_offer_sdp) {
      var uint8buffer = litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(raw_offer_sdp) });
      send_signal(MSGCODE_TYPE_MAP["OFFER_RAW"], uint8buffer);
    }
    function send_offer(seq, base_sdp, raw_offer_sdp) {
      var base_hash = null;
      var result_hash = null;
      var min_viable_offer_sdp = null;
      var deflate_offer_sdp = null;
      var diff_offer_sdp = null;
      var diff_deflate_offer_sdp = null;
      var finish_count = 2;
      function choose_best_payload() {
        var candidates = [];
        candidates.push([1, raw_offer_sdp.length]);
        if (min_viable_offer_sdp !== null) {
          candidates.push([2, min_viable_offer_sdp.byteLength]);
        }
        if (deflate_offer_sdp !== null) {
          candidates.push([3, deflate_offer_sdp.byteLength]);
        }
        if (diff_deflate_offer_sdp !== null) {
          candidates.push([4, diff_deflate_offer_sdp.byteLength]);
        }
        if (diff_offer_sdp !== null) {
          candidates.push([5, diff_offer_sdp.byteLength]);
        }
        candidates.sort(function(a, b) {
          if (a[1] !== b[1]) {
            return a[1] - b[1];
          }
          return a[0] - b[0];
        });
        var best = candidates[0][0];
        var _payload_names = { 1: "RAW", 2: "COMPACT", 3: "DEFLATE", 4: "DIFF_DEFLATE", 5: "DIFF" };
        ev.emit("log", "offer payload: " + _payload_names[best] + " " + candidates[0][1] + "B  (" + candidates.map(function(c) {
          return _payload_names[c[0]] + ":" + c[1];
        }).join(" ") + ")");
        if (best == 1) {
          send_signal(
            MSGCODE_TYPE_MAP["OFFER_RAW"],
            litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(raw_offer_sdp) })
          );
        } else if (best == 2) {
          send_signal(
            MSGCODE_TYPE_MAP["OFFER_COMPACT"],
            litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(min_viable_offer_sdp) })
          );
        } else if (best == 3) {
          send_signal(
            MSGCODE_TYPE_MAP["OFFER_DEFLATE"],
            litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq, payload: toU82(deflate_offer_sdp) })
          );
        } else if (best == 4) {
          send_signal(
            MSGCODE_TYPE_MAP["OFFER_DIFF_DEFLATE"],
            litepack_default.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD, { seq, base_hash: base_hash >>> 0, result_hash: result_hash >>> 0, payload: toU82(diff_deflate_offer_sdp) })
          );
        } else if (best == 5) {
          send_signal(
            MSGCODE_TYPE_MAP["OFFER_DIFF"],
            litepack_default.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD, { seq, base_hash: base_hash >>> 0, result_hash: result_hash >>> 0, payload: toU82(diff_offer_sdp) })
          );
        }
      }
      min_viable_offer_sdp = compress_sdp_min_viable(raw_offer_sdp);
      if (min_viable_offer_sdp !== null) {
        choose_best_payload();
      } else {
        compress_deflate(raw_offer_sdp, function(result) {
          if (result !== null && result.byteLength < raw_offer_sdp.length) {
            deflate_offer_sdp = result;
          }
          finish_count++;
          if (finish_count == 5) {
            choose_best_payload();
          }
        });
        if (base_sdp !== null) {
          base_hash = murmurhash3_str(base_sdp);
          result_hash = murmurhash3_str(raw_offer_sdp);
          encodeString(base_sdp, raw_offer_sdp, function(err, delta) {
            if (!err && delta) {
              diff_offer_sdp = delta;
              finish_count++;
              compress_deflate(diff_offer_sdp, function(result) {
                if (result !== null && result.byteLength < diff_offer_sdp.byteLength) {
                  diff_deflate_offer_sdp = result;
                }
                finish_count++;
                if (finish_count == 5) {
                  choose_best_payload();
                }
              });
            } else {
              finish_count++;
              finish_count++;
              if (finish_count == 5) {
                choose_best_payload();
              }
            }
          });
        } else {
          finish_count++;
          finish_count++;
          if (finish_count == 5) {
            choose_best_payload();
          }
        }
      }
    }
    function ensure_transceivers_for_sending() {
      if (!connection.pc || typeof connection.pc.getTransceivers !== "function") return;
      var ts = connection.pc.getTransceivers();
      function inferKindLocal(tc2) {
        for (var i2 = 0; i2 < connection.created_transceivers.length; i2++) {
          if (connection.created_transceivers[i2].tc === tc2) return connection.created_transceivers[i2].kind;
        }
        return null;
      }
      function tcIsSendingLocal(tc2) {
        return tc2.direction === "sendonly" || tc2.direction === "sendrecv";
      }
      var sendVideoCount = 0, sendAudioCount = 0;
      for (var i = 0; i < ts.length; i++) {
        var tc = ts[i];
        if (!tc || !tcIsSendingLocal(tc)) continue;
        var k2 = inferKindLocal(tc);
        if (k2 === "video") sendVideoCount++;
        else if (k2 === "audio") sendAudioCount++;
      }
      var neededVideo = 0, neededAudio = 0;
      for (var tag_id in connection.list_sending_live_mediastream) {
        var rec = connection.list_sending_live_mediastream[tag_id];
        if (rec.video_track) neededVideo++;
        if (rec.audio_track) neededAudio++;
      }
      var toCreateV = neededVideo - sendVideoCount;
      for (var v = 0; v < toCreateV; v++) {
        create_transceiver("video");
      }
      var toCreateA = neededAudio - sendAudioCount;
      for (var a = 0; a < toCreateA; a++) {
        create_transceiver("audio");
      }
    }
    function create_offer() {
      _engine_diag("create_offer: alive=" + pc_alive() + " neg=" + connection.negotiation_state + " sigState=" + (connection.pc ? connection.pc.signalingState : "-") + " rollback=" + connection.making_rollback);
      if (pc_alive()) {
        if (connection.negotiation_state == 0 && connection.pc.signalingState !== "have-remote-offer" && connection.making_rollback == false) {
          set_connection_state({
            negotiation_state: 1
          });
          connection.local_offer_history.push([0, 0, 0]);
          var this_offer_for_seq = Number(connection.local_offer_history.length) + 0;
          var offer_options = {};
          if (connection.need_ice_restart == true) {
            offer_options.iceRestart = true;
          }
          if (connection.pc.sctp == null || connection.pc.sctp.state !== "connected") {
            if (connection.list_data_channels.length == 0) {
              create_data_channel(false);
            }
          }
          ensure_transceivers_for_sending();
          connection.pc.createOffer(offer_options).then(function(offer) {
            if (pc_alive() && connection.negotiation_state == 1 && connection.pc.signalingState !== "have-remote-offer" && this_offer_for_seq == connection.local_offer_history.length) {
              if ("toJSON" in offer && typeof offer.toJSON == "function") {
                var offer_json = offer.toJSON();
              } else {
                var offer_json = offer;
              }
              var offer_modified = remove_all_ice_candidates(offer_json.sdp);
              connection.pc.setLocalDescription(new RTCSessionDescription({ type: "offer", sdp: offer_modified })).then(function() {
                if (!pc_alive()) return;
                if (connection.local_support_trickle_ice == null) {
                  connection.local_support_trickle_ice = is_support_trickle_ice(connection.pc.localDescription.sdp);
                }
                if (connection.negotiation_state == 1 && connection.pc.localDescription && this_offer_for_seq == connection.local_offer_history.length) {
                  connection.sent_local_offer_sdp = offer_modified;
                  connection.local_offer_history[this_offer_for_seq - 1][0] = Date.now();
                  send_offer(this_offer_for_seq, connection.base_offer_sdp, offer_modified);
                  clearTimeout(connection.wait_for_answer_timeout_timer);
                  connection.wait_for_answer_timeout_timer = null;
                  var max_wait_time = 7e3;
                  var hist_start = Math.max(0, connection.local_offer_history.length - 32);
                  for (var hi = hist_start; hi < connection.local_offer_history.length; hi++) {
                    if (connection.local_offer_history[hi][1] > 0) {
                      var time_to_get_answer = connection.local_offer_history[hi][1] - connection.local_offer_history[hi][0];
                      if (time_to_get_answer + 2e3 > max_wait_time) {
                        max_wait_time = time_to_get_answer + 2e3;
                      }
                    }
                  }
                  max_wait_time += Math.floor(Math.random() * 500);
                  connection.wait_for_answer_timeout_timer = setTimeout(function() {
                    connection.wait_for_answer_timeout_timer = null;
                    if (connection.negotiation_state == 2) {
                      connection.base_offer_sdp = null;
                      rollback_signaling_to_stable(function() {
                        set_connection_state({
                          negotiation_state: 0
                        });
                      });
                    }
                  }, max_wait_time);
                  connection.create_offer_failures = 0;
                  connection.need_reoffer = false;
                  set_connection_state({
                    negotiation_state: 2
                  });
                } else {
                }
              }).catch(function(error) {
                if (connection.negotiation_state == 1 && this_offer_for_seq == connection.local_offer_history.length) {
                  connection.create_offer_failures++;
                  connection.base_offer_sdp = null;
                  rollback_signaling_to_stable(function() {
                    set_connection_state({
                      negotiation_state: 0
                    });
                  });
                }
                ev.emit("error", error);
              });
            }
          }).catch(function(error) {
            if (connection.negotiation_state == 1 && this_offer_for_seq == connection.local_offer_history.length) {
              connection.create_offer_failures++;
              connection.base_offer_sdp = null;
              rollback_signaling_to_stable(function() {
                set_connection_state({
                  negotiation_state: 0
                });
              });
            }
            ev.emit("error", error);
          });
        }
      }
    }
    function send_failed_decompress(type, seq) {
      var uint8buffer = litepack_default.encode(SCHEMA_FAILED_DECOMPRESS, { failed_type: type, seq });
      send_signal(MSGCODE_TYPE_MAP["FAILED_DECOMPRESS"], uint8buffer);
    }
    function chunk_limit_internal() {
      var mms = 900;
      if (connection.pc && connection.pc.sctp && connection.pc.sctp.maxMessageSize > 0) {
        mms = connection.pc.sctp.maxMessageSize;
      }
      return Math.min(connection.max_signal_chunk_size, mms);
    }
    function send_signal(type, data) {
      var ice_state = connection.pc ? connection.pc.iceConnectionState : null;
      var transport_down = ice_state === "disconnected" || ice_state === "failed";
      var data_channel_open = transport_down === false && connection.data_channel_primary_index !== null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState == "open" && connection.data_channel_state == "open";
      if (data_channel_open == true) {
        var uint8buffer = litepack_default.encode(SCHEMA_DC_MSG, { type, data: data instanceof Uint8Array ? data : toU82(data) });
        var ilimit = chunk_limit_internal();
        if (uint8buffer.byteLength <= ilimit) {
          data_channel_send_signal(uint8buffer);
        } else {
          var mid_i = connection.chunk_send_id_internal = connection.chunk_send_id_internal + 1 & 65535;
          var pieces_i = build_chunks(uint8buffer, ilimit, mid_i);
          for (var pi = 0; pi < pieces_i.length; pi++) {
            data_channel_send_signal(litepack_default.encode(SCHEMA_DC_MSG, { type: MSGCODE_TYPE_MAP["SIGNAL_CHUNK"], data: pieces_i[pi] }));
          }
        }
      } else {
        var data1 = litepack_default.encode(SCHEMA_SIGNAL_INNER, { local_nonce: connection.local_nonce, remote_nonce: connection.remote_nonce, type, data: data instanceof Uint8Array ? data : toU82(data) });
        var checksum_hash = murmurhash3_data(data1);
        var data2 = litepack_default.encode(SCHEMA_SIGNAL_ENVELOPE, { checksum: checksum_hash >>> 0, payload: data1 });
        var elimit = connection.max_signal_chunk_size;
        if (data2.byteLength + 1 <= elimit) {
          ev.emit("signal", litepack_default.encode(SCHEMA_SIGNAL_FRAME, { kind: 0, body: data2 }));
        } else {
          var mid_e = connection.chunk_send_id_external = connection.chunk_send_id_external + 1 & 65535;
          var pieces_e = build_chunks(data2, elimit, mid_e);
          for (var pe = 0; pe < pieces_e.length; pe++) {
            ev.emit("signal", litepack_default.encode(SCHEMA_SIGNAL_FRAME, { kind: 1, body: pieces_e[pe] }));
          }
        }
      }
    }
    function process_income_signal(type, data) {
      if (type >= MSGCODE_TYPE_MAP["OFFER_RAW"] && type <= MSGCODE_TYPE_MAP["OFFER_DIFF_DEFLATE"]) {
        if (type == MSGCODE_TYPE_MAP["OFFER_DIFF_DEFLATE"] || type == MSGCODE_TYPE_MAP["OFFER_DIFF"]) {
          var b = litepack_default.decode(SCHEMA_SEQ_HASH_HASH_PAYLOAD, data);
          var seq = b.seq;
          if (murmurhash3_str(connection.base_offer_sdp) == b.base_hash) {
            if (type == MSGCODE_TYPE_MAP["OFFER_DIFF_DEFLATE"]) {
              decompress_deflate_bytes(b.payload, function(deltaBytes) {
                if (deltaBytes !== null) {
                  decodeString(connection.base_offer_sdp, deltaBytes, function(err, sdp) {
                    if (!err && murmurhash3_str(sdp) == b.result_hash) {
                      process_income_offer(sdp, seq);
                    } else {
                      send_failed_decompress(type, seq);
                    }
                  });
                } else {
                  send_failed_decompress(type, seq);
                }
              });
            } else {
              decodeString(connection.base_offer_sdp, b.payload, function(err, sdp) {
                if (!err && murmurhash3_str(sdp) == b.result_hash) {
                  process_income_offer(sdp, seq);
                } else {
                  send_failed_decompress(type, seq);
                }
              });
            }
          } else {
            send_failed_decompress(type, seq);
          }
        } else {
          var b = litepack_default.decode(SCHEMA_SEQ_PAYLOAD, data);
          var seq = b.seq;
          if (type == MSGCODE_TYPE_MAP["OFFER_RAW"]) {
            process_income_offer(_TD2.decode(b.payload), seq);
          } else if (type == MSGCODE_TYPE_MAP["OFFER_COMPACT"]) {
            process_income_offer(decompress_sdp_min_viable(b.payload), seq);
          } else {
            decompress_deflate(b.payload, function(result) {
              if (result !== null) {
                process_income_offer(result, seq);
              } else {
                send_failed_decompress(type, seq);
              }
            });
          }
        }
      } else if (type >= MSGCODE_TYPE_MAP["ANSWER_RAW"] && type <= MSGCODE_TYPE_MAP["ANSWER_DIFF_DEFLATE"]) {
        if (type == MSGCODE_TYPE_MAP["ANSWER_DIFF_DEFLATE"] || type == MSGCODE_TYPE_MAP["ANSWER_DIFF"]) {
          var b = litepack_default.decode(SCHEMA_SEQ_HASH_HASH_PAYLOAD, data);
          var seq = b.seq;
          if (murmurhash3_str(connection.sent_local_offer_sdp) == b.base_hash) {
            if (type == MSGCODE_TYPE_MAP["ANSWER_DIFF_DEFLATE"]) {
              decompress_deflate_bytes(b.payload, function(deltaBytes) {
                if (deltaBytes !== null) {
                  decodeString(connection.sent_local_offer_sdp, deltaBytes, function(err, sdp) {
                    if (!err && murmurhash3_str(sdp) == b.result_hash) {
                      process_income_answer(sdp, seq);
                    } else {
                      send_failed_decompress(type, seq);
                    }
                  });
                } else {
                  send_failed_decompress(type, seq);
                }
              });
            } else {
              decodeString(connection.sent_local_offer_sdp, b.payload, function(err, sdp) {
                if (!err && murmurhash3_str(sdp) == b.result_hash) {
                  process_income_answer(sdp, seq);
                } else {
                  send_failed_decompress(type, seq);
                }
              });
            }
          } else {
            send_failed_decompress(type, seq);
          }
        } else {
          var b = litepack_default.decode(SCHEMA_SEQ_PAYLOAD, data);
          var seq = b.seq;
          if (type == MSGCODE_TYPE_MAP["ANSWER_RAW"]) {
            process_income_answer(_TD2.decode(b.payload), seq);
          } else if (type == MSGCODE_TYPE_MAP["ANSWER_COMPACT"]) {
            process_income_answer(decompress_sdp_min_viable(b.payload), seq);
          } else {
            decompress_deflate(b.payload, function(result) {
              if (result !== null) {
                process_income_answer(result, seq);
              } else {
                send_failed_decompress(type, seq);
              }
            });
          }
        }
      } else if (type == MSGCODE_TYPE_MAP["ICE_CANDIDATE_RAW"]) {
        try {
          var candidate_json = JSON.parse(_TD2.decode(data));
          add_remote_candidates(candidate_json);
        } catch (error) {
          ev.emit("error", error);
        }
      } else if (type == MSGCODE_TYPE_MAP["ICE_CANDIDATE_COMPACT"]) {
        try {
          var dec = decode_candidate_binary(data);
          var candidate_json = to_RTCIceCandidateInit_from_decoded(dec);
          add_remote_candidates(candidate_json);
        } catch (error) {
          ev.emit("error", error);
        }
      } else if (type == MSGCODE_TYPE_MAP["TOTAL_ICE_CANDIDATE"]) {
        var b = litepack_default.decode(SCHEMA_TOTAL_ICE, data);
        set_remote_total_candidates(b.total, _TD2.decode(b.ufrag));
      } else if (type == MSGCODE_TYPE_MAP["NEGOTIATION_DONE"]) {
        var b = litepack_default.decode(SCHEMA_NEG_DONE, data);
        set_negotiation_done(b.seq, b.epoch);
      } else if (type == MSGCODE_TYPE_MAP["MEDIASTREAM_MAP"]) {
        try {
          var b = litepack_default.decode(SCHEMA_SEQ_PAYLOAD, data);
          var map_obj = JSON.parse(_TD2.decode(b.payload));
          set_remote_mediastream_map(map_obj, b.seq);
          send_signal(MSGCODE_TYPE_MAP["MEDIASTREAM_MAP_ACK"], litepack_default.encode(SCHEMA_ACK, { seq: b.seq }));
        } catch (error) {
          ev.emit("error", error);
        }
      } else if (type == MSGCODE_TYPE_MAP["MEDIASTREAM_MAP_ACK"]) {
        try {
          var ackb = litepack_default.decode(SCHEMA_ACK, data);
          var pend = connection.mediastream_map_pending;
          if (pend && ackb.seq >= pend.seq) {
            connection.mediastream_map_pending = null;
            if (connection.mediastream_map_ack_timer) {
              clearTimeout(connection.mediastream_map_ack_timer);
              connection.mediastream_map_ack_timer = null;
            }
          }
        } catch (error) {
        }
      } else if (type == MSGCODE_TYPE_MAP["FAILED_DECOMPRESS"]) {
        var b = litepack_default.decode(SCHEMA_FAILED_DECOMPRESS, data);
        var seq = b.seq;
        if (b.failed_type >= MSGCODE_TYPE_MAP["OFFER_RAW"] && b.failed_type <= MSGCODE_TYPE_MAP["OFFER_DIFF_DEFLATE"]) {
          if (seq == connection.local_offer_history.length) {
            send_offer_raw(seq, connection.sent_local_offer_sdp);
          } else {
          }
        } else if (b.failed_type >= MSGCODE_TYPE_MAP["ANSWER_RAW"] && b.failed_type <= MSGCODE_TYPE_MAP["ANSWER_DIFF_DEFLATE"]) {
          if (seq == connection.seq_remote_offer) {
            if (connection.sent_local_answer_sdp !== null) {
              send_answer_raw(seq, connection.sent_local_answer_sdp);
            }
          } else {
          }
        }
      } else if (type == MSGCODE_TYPE_MAP["PING"]) {
        try {
          var pingb = litepack_default.decode(SCHEMA_PING, data);
          send_signal(MSGCODE_TYPE_MAP["PONG"], litepack_default.encode(SCHEMA_PING, { timestamp: pingb.timestamp }));
        } catch (error) {
        }
      } else if (type == MSGCODE_TYPE_MAP["PONG"]) {
        try {
          var pongb = litepack_default.decode(SCHEMA_PING, data);
          var rtt = Date.now() - pongb.timestamp;
          if (rtt >= 0 && rtt < 6e5) {
            connection.current_ping_rtt = rtt;
            ev.emit("rtt", rtt);
          }
        } catch (error) {
        }
      }
    }
    function on_signal_channel(data) {
      try {
        var _frame = litepack_default.decode(SCHEMA_SIGNAL_FRAME, data);
        var envBytes;
        if (_frame.kind === 1) {
          envBytes = reassemble_chunk(_frame.body, connection.chunk_reasm_external);
          if (envBytes === null) return;
        } else {
          envBytes = _frame.body;
        }
        var _env = litepack_default.decode(SCHEMA_SIGNAL_ENVELOPE, envBytes);
        if (_env.checksum == murmurhash3_data(_env.payload)) {
          var _inn = litepack_default.decode(SCHEMA_SIGNAL_INNER, _env.payload);
          if (connection.remote_nonce == 0 && _inn.local_nonce > 0) {
            connection.remote_nonce = _inn.local_nonce;
          }
          var sctp_not_ready = !connection.pc || !connection.pc.sctp || !connection.pc.sctp.maxChannels || connection.pc.sctp.maxMessageSize === Infinity || !connection.pc.sctp.maxMessageSize;
          if (_inn.local_nonce == connection.remote_nonce && (_inn.remote_nonce == 0 && sctp_not_ready || _inn.remote_nonce == connection.local_nonce)) {
            connection.nonce_mismatch_streak_count = 0;
            connection.nonce_mismatch_streak_nonce = 0;
            process_income_signal(_inn.type, _inn.data);
          } else {
            if (_inn.local_nonce > 0 && _inn.local_nonce !== connection.remote_nonce) {
              if (connection.nonce_mismatch_streak_nonce === _inn.local_nonce) {
                connection.nonce_mismatch_streak_count++;
              } else {
                connection.nonce_mismatch_streak_nonce = _inn.local_nonce;
                connection.nonce_mismatch_streak_count = 1;
              }
              if (connection.nonce_mismatch_streak_count >= connection.nonce_mismatch_close_threshold) {
                ev.emit("error", "remote peer appears to have restarted (a new session nonce arrived " + connection.nonce_mismatch_streak_count + " times in a row) \u2014 closing this connection; create a new instance to reconnect");
                close_connection();
                return;
              }
            }
            report_malformed_frame("signal/nonce", "nonce mismatch");
          }
        } else {
          report_malformed_frame("signal/checksum", "checksum mismatch");
        }
      } catch (error) {
        report_malformed_frame("signal", error);
      }
    }
    function update_all_mediastream_receivers() {
      if (connection.pc && typeof connection.pc.getTransceivers === "function") {
        var ts = connection.pc.getTransceivers();
        for (var tag_id in connection.list_receiving_live_mediastream) {
          var video_track = null;
          var audio_track = null;
          if (connection.list_receiving_live_mediastream[tag_id].video_mid !== null) {
            for (var i = 0; i < ts.length; i++) {
              var tc = ts[i];
              if (tc && tc.receiver && tc.receiver.track && tc.receiver.track.readyState !== "ended" && tc.receiver.track.kind === "video") {
                if (String(connection.list_receiving_live_mediastream[tag_id].video_mid) == String(tc.mid)) {
                  video_track = tc.receiver.track;
                }
              }
            }
          }
          if (connection.list_receiving_live_mediastream[tag_id].audio_mid !== null) {
            for (var i = 0; i < ts.length; i++) {
              var tc = ts[i];
              if (tc && tc.receiver && tc.receiver.track && tc.receiver.track.readyState !== "ended" && tc.receiver.track.kind === "audio") {
                if (String(connection.list_receiving_live_mediastream[tag_id].audio_mid) == String(tc.mid)) {
                  audio_track = tc.receiver.track;
                }
              }
            }
          }
          set_receiving_stream(tag_id, {
            video_track,
            audio_track
          });
        }
      }
    }
    function set_receiving_stream(tag_id, options) {
      if (!(tag_id in connection.list_receiving_live_mediastream)) {
        connection.list_receiving_live_mediastream[tag_id] = {
          video_track: null,
          audio_track: null,
          video_mid: null,
          audio_mid: null,
          mediastream: new MediaStream(),
          current_video_frame_height: 0,
          current_video_frame_width: 0,
          current_video_fps: 0,
          current_video_mime_type: null,
          current_audio_mime_type: null,
          video_active: false,
          video_bitrate: 0,
          video_packet_loss: 0,
          video_jitter: 0,
          audio_active: false,
          audio_bitrate: 0,
          audio_packet_loss: 0,
          audio_jitter: 0,
          // Internal delta tracking — per-kind timestamps (see the sending record)
          _prev_video_bytes_received: 0,
          _prev_audio_bytes_received: 0,
          _prev_video_packets_lost: 0,
          _prev_video_packets_received: 0,
          _prev_audio_packets_lost: 0,
          _prev_audio_packets_received: 0,
          _prev_video_stats_time: 0,
          _prev_audio_stats_time: 0
        };
      }
      var rec = connection.list_receiving_live_mediastream[tag_id];
      var need_update = false;
      var need_check_receivers = false;
      if (options && typeof options === "object") {
        if ("video_mid" in options) {
          var new_vmid = options.video_mid != null && String(options.video_mid).length ? String(options.video_mid) : null;
          if (rec.video_mid !== new_vmid) {
            rec.video_mid = new_vmid;
            need_update = true;
            need_check_receivers = true;
            if (new_vmid == null && rec.video_track != null) {
              rec.video_track = null;
              need_update = true;
            }
          }
        }
        if ("audio_mid" in options) {
          var new_amid = options.audio_mid != null && String(options.audio_mid).length ? String(options.audio_mid) : null;
          if (rec.audio_mid !== new_amid) {
            rec.audio_mid = new_amid;
            need_update = true;
            need_check_receivers = true;
            if (new_amid == null && rec.audio_track != null) {
              rec.audio_track = null;
              need_update = true;
            }
          }
        }
        if ("video_track" in options) {
          if (rec.video_track == null && options.video_track !== null || rec.video_track !== null && options.video_track == null || isTrackEqual(rec.video_track, options.video_track) == false) {
            var all_video_tracks = rec.mediastream.getVideoTracks();
            for (var vi = 0; vi < all_video_tracks.length; vi++) {
              rec.mediastream.removeTrack(all_video_tracks[vi]);
            }
            if (options.video_track !== null) {
              rec.mediastream.addTrack(options.video_track);
            }
            rec.video_track = options.video_track;
            need_update = true;
          }
        }
        if ("audio_track" in options) {
          if (rec.audio_track == null && options.audio_track !== null || rec.audio_track !== null && options.audio_track == null || isTrackEqual(rec.audio_track, options.audio_track) == false) {
            var all_audio_tracks = rec.mediastream.getAudioTracks();
            for (var ai = 0; ai < all_audio_tracks.length; ai++) {
              rec.mediastream.removeTrack(all_audio_tracks[ai]);
            }
            if (options.audio_track !== null) {
              rec.mediastream.addTrack(options.audio_track);
            }
            rec.audio_track = options.audio_track;
            need_update = true;
          }
        }
      }
      if (need_check_receivers == true) {
        update_all_mediastream_receivers();
      }
      if (need_update == true) {
        ev.emit("stream", rec.mediastream, {
          tag_id,
          video_track: rec.video_track,
          audio_track: rec.audio_track,
          video_mid: rec.video_mid,
          audio_mid: rec.audio_mid
        });
      }
    }
    function set_remote_mediastream_map(map_obj, seq) {
      if (seq > connection.seq_remote_mediastream_map) {
        connection.seq_remote_mediastream_map = seq;
        for (var tag_id in connection.list_receiving_live_mediastream) {
          var need_remove = true;
          for (var tag_id2 in map_obj) {
            if (String(tag_id2) == String(tag_id)) {
              need_remove = false;
            }
          }
          if (need_remove == true) {
            set_receiving_stream(tag_id, {
              video_mid: null,
              audio_mid: null
            });
          }
        }
        for (var tag_id in map_obj) {
          set_receiving_stream(tag_id, {
            video_mid: map_obj[tag_id].video_mid,
            audio_mid: map_obj[tag_id].audio_mid
          });
        }
        update_all_mediastream_receivers();
      }
    }
    function send_mediastream_map() {
      var out = {};
      for (var tag_id5 in connection.list_sending_live_mediastream) {
        out[tag_id5] = {
          video_mid: connection.list_sending_live_mediastream[tag_id5].video_mid || null,
          audio_mid: connection.list_sending_live_mediastream[tag_id5].audio_mid || null
        };
      }
      var json_str = JSON.stringify(out);
      if (json_str === connection._last_sent_mediastream_map) return;
      connection._last_sent_mediastream_map = json_str;
      connection.seq_local_mediastream_map++;
      var uint8buffer = litepack_default.encode(SCHEMA_SEQ_PAYLOAD, { seq: connection.seq_local_mediastream_map, payload: toU82(json_str) });
      send_signal(MSGCODE_TYPE_MAP["MEDIASTREAM_MAP"], uint8buffer);
      connection.mediastream_map_pending = { seq: connection.seq_local_mediastream_map, bytes: uint8buffer, attempts: 0 };
      schedule_mediastream_map_retransmit();
    }
    var MEDIASTREAM_MAP_BACKOFF = [500, 1e3, 2e3, 4e3, 4e3];
    function schedule_mediastream_map_retransmit() {
      if (connection.mediastream_map_ack_timer) {
        clearTimeout(connection.mediastream_map_ack_timer);
        connection.mediastream_map_ack_timer = null;
      }
      var p = connection.mediastream_map_pending;
      if (!p) return;
      if (p.attempts >= MEDIASTREAM_MAP_BACKOFF.length) {
        connection.mediastream_map_pending = null;
        return;
      }
      var delay = MEDIASTREAM_MAP_BACKOFF[p.attempts];
      connection.mediastream_map_ack_timer = setTimeout(function() {
        connection.mediastream_map_ack_timer = null;
        var pp = connection.mediastream_map_pending;
        if (!pp) return;
        pp.attempts++;
        send_signal(MSGCODE_TYPE_MAP["MEDIASTREAM_MAP"], pp.bytes);
        schedule_mediastream_map_retransmit();
      }, delay);
    }
    function remove_unused_tracks() {
      clearTimeout(connection.remove_unused_tracks_timer);
      connection.remove_unused_tracks_timer = null;
      if (!pc_alive()) return;
      var used = /* @__PURE__ */ Object.create(null), k2, rec;
      for (k2 in connection.list_sending_live_mediastream) {
        rec = connection.list_sending_live_mediastream[k2];
        if (!rec) continue;
        if (rec.video_mid) used[rec.video_mid] = true;
        if (rec.audio_mid) used[rec.audio_mid] = true;
      }
      var ts = connection.pc.getTransceivers();
      for (var i = 0; i < ts.length; i++) {
        var t = ts[i];
        if (!t || !t.sender) continue;
        var isOurs = false;
        for (var j = 0; j < connection.created_transceivers.length; j++) {
          if (connection.created_transceivers[j].tc === t) {
            isOurs = true;
            break;
          }
        }
        if (!isOurs) continue;
        var mid = typeof t.mid === "string" && t.mid.length ? t.mid : null;
        if (!mid) continue;
        var noTrack = !t.sender.track;
        var notUsedLogically = !used[mid];
        if (noTrack && notUsedLogically) {
          for (k2 in connection.list_sending_live_mediastream) {
            rec = connection.list_sending_live_mediastream[k2];
            if (!rec) continue;
            if (rec.video_mid === mid) rec.video_mid = null;
            if (rec.audio_mid === mid) rec.audio_mid = null;
          }
        }
      }
    }
    function create_transceiver(kind, options) {
      var tv = connection.pc.addTransceiver(kind, { direction: "sendonly" });
      connection.created_transceivers.push({ tc: tv, kind });
      return tv;
    }
    function update_all_mediastream_senders() {
      if (connection.pc && typeof connection.pc.getTransceivers === "function") {
        let tcIsSending = function(tc4) {
          return tc4.direction === "sendonly" || tc4.direction === "sendrecv";
        }, tcIsFree = function(tc4) {
          return !(tc4.sender && tc4.sender.track);
        }, inferKind = function(tc4) {
          for (var i3 = 0; i3 < connection.created_transceivers.length; i3++) {
            if (connection.created_transceivers[i3].tc === tc4) return connection.created_transceivers[i3].kind;
          }
          return null;
        }, findTcByMid = function(mid, kind2) {
          if (!mid) return null;
          for (var i3 = 0; i3 < ts.length; i3++) {
            var t = ts[i3];
            if (t && t.mid === mid && t.sender && (!kind2 || t.sender.track && t.sender.track.kind === kind2)) return t;
          }
          return null;
        }, shallowEqualEnc = function(a3, b) {
          function pick(x) {
            return {
              active: x.active,
              maxBitrate: x.maxBitrate | 0,
              maxFramerate: x.maxFramerate | 0,
              scaleResolutionDownBy: x.scaleResolutionDownBy == null ? 1 : x.scaleResolutionDownBy
            };
          }
          if (!a3 && !b) return true;
          if (!a3 || !b) return false;
          if (a3.length !== b.length) return false;
          for (var i3 = 0; i3 < a3.length; i3++) {
            var pa = pick(a3[i3] || {}), pb = pick(b[i3] || {});
            if (pa.active !== pb.active || pa.maxBitrate !== pb.maxBitrate || pa.maxFramerate !== pb.maxFramerate || pa.scaleResolutionDownBy !== pb.scaleResolutionDownBy) return false;
          }
          return true;
        }, findInactiveTC = function(kind2) {
          for (var fi = 0; fi < ts.length; fi++) {
            var ftc = ts[fi];
            if (!ftc || ftc.stopped) continue;
            if (inferKind(ftc) !== kind2) continue;
            if (ftc.direction === "inactive" && !(ftc.sender && ftc.sender.track)) {
              return ftc;
            }
          }
          return null;
        }, buildFree = function(list) {
          var out = [];
          for (var i3 = 0; i3 < list.length; i3++) {
            if (tcIsFree(list[i3])) out.push(list[i3]);
          }
          return out;
        };
        var neededVideo = 0, neededAudio = 0, tagList = [];
        for (var tag_id in connection.list_sending_live_mediastream) {
          var rec0 = connection.list_sending_live_mediastream[tag_id];
          if (rec0.video_track) neededVideo++;
          if (rec0.audio_track) neededAudio++;
          tagList.push(tag_id);
        }
        var sendV = [], sendA = [];
        var ts = connection.pc.getTransceivers();
        for (var i = 0; i < ts.length; i++) {
          var tc = ts[i];
          if (!tc || !tcIsSending(tc)) continue;
          var kind = inferKind(tc);
          if (kind === "video") sendV.push(tc);
          else if (kind === "audio") sendA.push(tc);
        }
        var createdAny = false;
        var removedAny = false;
        var stateChanged = false;
        if (neededVideo > sendV.length) {
          var toAddV = neededVideo - sendV.length;
          for (var a = 0; a < toAddV; a++) {
            var reusedV = findInactiveTC("video");
            if (reusedV) {
              try {
                reusedV.direction = "sendonly";
              } catch (e) {
              }
              sendV.push(reusedV);
              createdAny = true;
            } else {
              createdAny = true;
            }
          }
        }
        if (neededAudio > sendA.length) {
          var toAddA = neededAudio - sendA.length;
          for (var a2 = 0; a2 < toAddA; a2++) {
            var reusedA = findInactiveTC("audio");
            if (reusedA) {
              try {
                reusedA.direction = "sendonly";
              } catch (e) {
              }
              sendA.push(reusedA);
              createdAny = true;
            } else {
              createdAny = true;
            }
          }
        }
        for (var tgi = 0; tgi < tagList.length; tgi++) {
          var id = tagList[tgi];
          var r = connection.list_sending_live_mediastream[id];
          if (r.video_mid != null) {
            var tcv = findTcByMid(r.video_mid, "video");
            var detachV = !r.video_track || (!tcv || !tcIsSending(tcv));
            if (detachV && tcv && tcv.sender) {
              var hadV = !!tcv.sender.track;
              try {
                tcv.sender.replaceTrack(null);
              } catch (e) {
              }
              removedAny = true;
              if (hadV) stateChanged = true;
            }
            if (detachV) {
              r.video_mid = null;
              stateChanged = true;
            }
          }
          if (r.audio_mid != null) {
            var tca = findTcByMid(r.audio_mid, "audio");
            var detachA = !r.audio_track || (!tca || !tcIsSending(tca));
            if (detachA && tca && tca.sender) {
              var hadA = !!tca.sender.track;
              try {
                tca.sender.replaceTrack(null);
              } catch (e) {
              }
              removedAny = true;
              if (hadA) stateChanged = true;
            }
            if (detachA) {
              r.audio_mid = null;
              stateChanged = true;
            }
          }
        }
        for (var tag_id2 in connection.list_sending_live_mediastream) {
          var rr = connection.list_sending_live_mediastream[tag_id2];
          if (!rr.video_mid && rr.video_track) {
            for (var i2 = 0; i2 < ts.length; i2++) {
              var tc2 = ts[i2];
              if (tc2 && tc2.sender && tc2.sender.track === rr.video_track && inferKind(tc2) === "video") {
                if (typeof tc2.mid === "string" && tc2.mid.length) {
                  rr.video_mid = tc2.mid;
                  stateChanged = true;
                  break;
                }
              }
            }
          }
          if (!rr.audio_mid && rr.audio_track) {
            for (var j2 = 0; j2 < ts.length; j2++) {
              var tc3 = ts[j2];
              if (tc3 && tc3.sender && tc3.sender.track === rr.audio_track && inferKind(tc3) === "audio") {
                if (typeof tc3.mid === "string" && tc3.mid.length) {
                  rr.audio_mid = tc3.mid;
                  stateChanged = true;
                  break;
                }
              }
            }
          }
        }
        var freeV = buildFree(sendV);
        var freeA = buildFree(sendA);
        for (var tgi2 = 0; tgi2 < tagList.length; tgi2++) {
          var id2 = tagList[tgi2];
          var r2 = connection.list_sending_live_mediastream[id2];
          if (r2.video_track && r2.video_mid == null && freeV.length) {
            var tv2 = freeV.shift();
            var prevV = tv2 && tv2.sender ? tv2.sender.track : null;
            try {
              tv2.sender.replaceTrack(r2.video_track);
            } catch (e) {
            }
            if (prevV !== r2.video_track) stateChanged = true;
            if (typeof tv2.mid === "string" && tv2.mid.length && r2.video_mid !== tv2.mid) {
              r2.video_mid = tv2.mid;
              stateChanged = true;
            }
          }
          if (r2.audio_track && r2.audio_mid == null && freeA.length) {
            var ta2 = freeA.shift();
            var prevA = ta2 && ta2.sender ? ta2.sender.track : null;
            try {
              ta2.sender.replaceTrack(r2.audio_track);
            } catch (e) {
            }
            if (prevA !== r2.audio_track) stateChanged = true;
            if (typeof ta2.mid === "string" && ta2.mid.length && r2.audio_mid !== ta2.mid) {
              r2.audio_mid = ta2.mid;
              stateChanged = true;
            }
          }
        }
        for (var tag_id4 in connection.list_sending_live_mediastream) {
          if (!connection.list_sending_live_mediastream.hasOwnProperty(tag_id4)) continue;
          var rec4 = connection.list_sending_live_mediastream[tag_id4];
          if (rec4.video_mid && rec4.video_track) {
            var tcv4 = findTcByMid(rec4.video_mid, "video");
            if (tcv4 && tcv4.sender && typeof tcv4.sender.getParameters == "function" && typeof window !== "undefined" && typeof window.document !== "undefined") {
              var s = tcv4.sender;
              var p = s.getParameters() || {};
              if (!p.encodings || !p.encodings.length) p.encodings = [{}];
              var maxBR = (rec4.max_video_bitrate | 0) > 0 ? rec4.max_video_bitrate | 0 : 0;
              var maxFPS = (rec4.max_video_fps | 0) > 0 ? rec4.max_video_fps | 0 : 0;
              var scale = rec4.video_scale_down > 1 ? rec4.video_scale_down : 1;
              var desired = [];
              for (var ei = 0; ei < p.encodings.length; ei++) {
                var enc = {};
                var cur = p.encodings[ei] || {};
                enc.active = cur.active !== false;
                if (maxBR) enc.maxBitrate = maxBR;
                if (maxFPS) enc.maxFramerate = maxFPS;
                if (scale && scale !== 1) enc.scaleResolutionDownBy = scale;
                desired.push(enc);
              }
              var needSet = !shallowEqualEnc(p.encodings, desired) || p.degradationPreference !== (rec4.degradation || "balanced");
              if (needSet && typeof s.setParameters == "function") {
                p.encodings = desired;
                p.degradationPreference = rec4.degradation || "balanced";
                try {
                  s.setParameters(p);
                } catch (e) {
                }
                try {
                  if (typeof s.requestKeyFrame === "function") s.requestKeyFrame();
                } catch (e) {
                }
              }
            }
          }
          if (rec4.audio_mid && rec4.audio_track) {
            var tca4 = findTcByMid(rec4.audio_mid, "audio");
          }
        }
        if (stateChanged) {
          send_mediastream_map();
        }
        if (removedAny) {
          if (connection.remove_unused_tracks_timer == null) {
            connection.remove_unused_tracks_timer = setTimeout(remove_unused_tracks, 1500);
          }
        }
        if (createdAny) {
          create_offer_schedule();
        }
      }
    }
    function set_sending_stream(tag_id, options) {
      if (!(tag_id in connection.list_sending_live_mediastream)) {
        connection.list_sending_live_mediastream[tag_id] = {
          video_track: null,
          audio_track: null,
          video_mid: null,
          audio_mid: null,
          mediastream_id: null,
          current_video_frame_height: 0,
          current_video_frame_width: 0,
          current_video_fps: 0,
          current_video_mime_type: null,
          video_active: false,
          video_bitrate: 0,
          audio_active: false,
          audio_bitrate: 0,
          audio_mime_type: null,
          // Internal delta tracking — timestamps are PER KIND: video and audio
          // stats arrive as separate reports in the same getStats pass, and a
          // shared timestamp let whichever ran second compute its bitrate delta
          // against the other's clock reading.
          _prev_video_bytes_sent: 0,
          _prev_audio_bytes_sent: 0,
          _prev_video_stats_time: 0,
          _prev_audio_stats_time: 0,
          max_video_fps: 0,
          max_video_bitrate: 0,
          video_scale_down: 1,
          audio_channel: 1
        };
      }
      var rec = connection.list_sending_live_mediastream[tag_id];
      var need_update = false;
      if (options && typeof options === "object") {
        if ("video_track" in options) {
          var prevV = rec.video_track, nextV = options.video_track;
          if (prevV == null !== (nextV == null)) need_update = true;
          else if (prevV && nextV && isTrackEqual(prevV, nextV) == false) need_update = true;
          rec.video_track = nextV;
          if (nextV == null && rec.video_mid != null) {
            need_update = true;
          }
        }
        if ("audio_track" in options) {
          var prevA = rec.audio_track, nextA = options.audio_track;
          if (prevA == null !== (nextA == null)) need_update = true;
          else if (prevA && nextA && isTrackEqual(prevA, nextA) == false) need_update = true;
          rec.audio_track = nextA;
          if (nextA == null && rec.audio_mid != null) {
            need_update = true;
          }
        }
        if ("mediastream_id" in options) {
          if (connection.list_sending_live_mediastream[tag_id].mediastream_id !== options.mediastream_id) {
            connection.list_sending_live_mediastream[tag_id].mediastream_id = options.mediastream_id;
          }
        }
        if ("max_video_fps" in options) {
        }
        if ("max_video_bitrate" in options) {
        }
        if ("video_scale_down" in options) {
        }
      }
      if (need_update == true) {
        if (connection.pc) {
          update_all_mediastream_senders();
        }
      }
    }
    function stream(tag_id, options) {
      set_sending_stream(tag_id, options);
    }
    function addStream(stream2, options) {
      if (stream2 && isMediaStream(stream2)) {
        var mediastream_id = null;
        if (typeof stream2.id === "string" && stream2.id.length > 0) {
          mediastream_id = stream2.id;
        }
        var for_tag_id = mediastream_id;
        for (var tag_id in connection.list_sending_live_mediastream) {
          if (connection.list_sending_live_mediastream[tag_id].mediastream_id !== null) {
            if (connection.list_sending_live_mediastream[tag_id].mediastream_id == mediastream_id) {
              for_tag_id = tag_id;
              break;
            }
          }
        }
        var video_track = null;
        var audio_track = null;
        var all_tracks = stream2.getTracks();
        for (var ti = 0; ti < all_tracks.length; ti++) {
          if (video_track == null && all_tracks[ti].kind == "video") {
            video_track = all_tracks[ti];
          }
          if (audio_track == null && all_tracks[ti].kind == "audio") {
            audio_track = all_tracks[ti];
          }
        }
        set_sending_stream(for_tag_id, {
          video_track,
          audio_track
        });
      }
    }
    function removeStream(stream2) {
      if (stream2 && isMediaStream(stream2)) {
        var mediastream_id = null;
        if (typeof stream2.id === "string" && stream2.id.length > 0) {
          mediastream_id = stream2.id;
        }
        for (var tag_id in connection.list_sending_live_mediastream) {
          if (connection.list_sending_live_mediastream[tag_id].mediastream_id !== null) {
            if (connection.list_sending_live_mediastream[tag_id].mediastream_id == mediastream_id) {
              set_sending_stream(tag_id, {
                video_track: null,
                audio_track: null
              });
              break;
            }
          }
        }
      }
    }
    function addTrack(track, stream2, options) {
      if (stream2 && isMediaStream(stream2)) {
        var mediastream_id = null;
        if (typeof stream2.id === "string" && stream2.id.length > 0) {
          mediastream_id = stream2.id;
        }
        var for_tag_id = mediastream_id;
        for (var tag_id in connection.list_sending_live_mediastream) {
          if (connection.list_sending_live_mediastream[tag_id].mediastream_id !== null) {
            if (connection.list_sending_live_mediastream[tag_id].mediastream_id == mediastream_id) {
              for_tag_id = tag_id;
              break;
            }
          }
        }
        if (track && isMediaStreamTrack(track)) {
          if ("kind" in track) {
            if (track.kind == "audio") {
              set_sending_stream(for_tag_id, {
                audio_track: track
              });
            } else if (track.kind == "video") {
              set_sending_stream(for_tag_id, {
                video_track: track
              });
            }
          }
        }
      }
    }
    function removeTrack(track, stream2) {
      var mediastream_id = null;
      if (stream2 && isMediaStream(stream2)) {
        if (typeof stream2.id === "string" && stream2.id.length > 0) {
          mediastream_id = stream2.id;
        }
      }
      if (track && isMediaStreamTrack(track)) {
        for (var tag_id in connection.list_sending_live_mediastream) {
          if (mediastream_id !== null) {
            if (connection.list_sending_live_mediastream[tag_id].mediastream_id !== null && connection.list_sending_live_mediastream[tag_id].mediastream_id == mediastream_id) {
              if ("kind" in track) {
                if (track.kind == "audio") {
                  set_sending_stream(tag_id, {
                    audio_track: null
                  });
                } else if (track.kind == "video") {
                  set_sending_stream(tag_id, {
                    video_track: null
                  });
                }
              }
              break;
            }
          } else {
            if (connection.list_sending_live_mediastream[tag_id].video_track !== null && isTrackEqual(track, connection.list_sending_live_mediastream[tag_id].video_track) == true) {
              set_sending_stream(tag_id, {
                video_track: null
              });
            }
            if (connection.list_sending_live_mediastream[tag_id].audio_track !== null && isTrackEqual(track, connection.list_sending_live_mediastream[tag_id].audio_track) == true) {
              set_sending_stream(tag_id, {
                audio_track: null
              });
            }
          }
        }
      }
    }
    function send_total_candidates() {
      if (connection.pc.localDescription && connection.pc.localDescription.type) {
        var current_local_ufrag = get_ufrag_from_sdp(connection.pc.localDescription.sdp);
        if (current_local_ufrag && current_local_ufrag in connection.list_gathered_local_candidates && connection.list_gathered_local_candidates[current_local_ufrag].length > 0) {
          var total = connection.list_gathered_local_candidates[current_local_ufrag].length;
          var uint8buffer = litepack_default.encode(SCHEMA_TOTAL_ICE, { total, ufrag: toU82(current_local_ufrag) });
          send_signal(MSGCODE_TYPE_MAP["TOTAL_ICE_CANDIDATE"], uint8buffer);
        }
      }
    }
    function analyze_local_candidates() {
      if (connection.pc.localDescription && connection.pc.localDescription.type) {
        var current_local_ufrag = get_ufrag_from_sdp(connection.pc.localDescription.sdp);
        if (current_local_ufrag) {
          var candidates = connection.list_gathered_local_candidates[current_local_ufrag] || [];
          var list_ipv6 = [];
          var list_ipv4 = [];
          var relay_ipv6 = [];
          var relay_ipv4 = [];
          var supports_udp = false;
          var supports_tcp = false;
          var seen_host = false;
          var seen_srflx = false;
          var seen_prflx = false;
          var seen_relay = false;
          var host_ipv4 = [];
          var public_host = false;
          var map_local_to_srflx = /* @__PURE__ */ new Map();
          for (var ci = 0; ci < candidates.length; ci++) {
            var candidate = candidates[ci];
            if (!candidate) continue;
            var cand_str = candidate.candidate || "";
            var address = candidate.address || "";
            var port = typeof candidate.port !== "undefined" && candidate.port !== null ? Number(candidate.port) : 0;
            var rel_addr = candidate.relatedAddress || "";
            var rel_port = typeof candidate.relatedPort !== "undefined" && candidate.relatedPort !== null ? Number(candidate.relatedPort) : 0;
            var protocol = (candidate.protocol || "").toLowerCase();
            var ctype = candidate.type || "";
            if (!address || !port) {
              try {
                var parts = cand_str.split(" ");
                if (parts.length > 6) {
                  if (!address) address = parts[4];
                  if (!port) port = Number(parts[5]) | 0;
                }
                for (var j = 0; j < parts.length - 1; j++) {
                  if (parts[j] === "raddr" && !rel_addr) rel_addr = parts[j + 1];
                  if (parts[j] === "rport" && !rel_port) rel_port = Number(parts[j + 1]) | 0;
                  if (parts[j] === "typ" && !ctype && j + 1 < parts.length) ctype = parts[j + 1];
                }
              } catch (e) {
              }
            }
            if (address) address = strip_brackets(address);
            if (rel_addr) rel_addr = strip_brackets(rel_addr);
            if (protocol === "udp") supports_udp = true;
            if (protocol === "tcp") supports_tcp = true;
            if (ctype === "host") seen_host = true;
            else if (ctype === "srflx") seen_srflx = true;
            else if (ctype === "prflx") seen_prflx = true;
            else if (ctype === "relay") seen_relay = true;
            if (ctype === "host" && address && address.indexOf(".local") < 0 && !is_ipv6_addr(address)) {
              if (host_ipv4.indexOf(address) === -1) host_ipv4.push(address);
              if (is_public_ip(address)) public_host = true;
            }
            if (is_public_ip(address)) {
              if (ctype === "relay") {
                if (is_ipv6_addr(address)) {
                  if (relay_ipv6.indexOf(address) === -1) relay_ipv6.push(address);
                } else {
                  if (relay_ipv4.indexOf(address) === -1) relay_ipv4.push(address);
                }
              } else {
                if (is_ipv6_addr(address)) {
                  if (list_ipv6.indexOf(address) === -1) list_ipv6.push(address);
                } else {
                  if (list_ipv4.indexOf(address) === -1) list_ipv4.push(address);
                }
              }
            }
            if (is_public_ip(rel_addr) && ctype !== "relay") {
              if (is_ipv6_addr(rel_addr)) {
                if (list_ipv6.indexOf(rel_addr) === -1) list_ipv6.push(rel_addr);
              } else {
                if (list_ipv4.indexOf(rel_addr) === -1) list_ipv4.push(rel_addr);
              }
            }
            if ((ctype === "srflx" || ctype === "prflx") && rel_addr && rel_port) {
              var localKey = rel_addr + "(" + rel_port + ")";
              var mapped = address && port ? address + "(" + port + ")" : "";
              if (mapped) {
                if (!map_local_to_srflx.has(localKey)) map_local_to_srflx.set(localKey, /* @__PURE__ */ new Set());
                map_local_to_srflx.get(localKey).add(mapped);
              }
            }
          }
          var symmetric_detected = false;
          var cone_detected = false;
          var it = map_local_to_srflx.values();
          var itn = it.next ? it.next() : { done: true };
          while (!itn.done) {
            var s = itn.value;
            if (s && s.size > 1) symmetric_detected = true;
            if (s && s.size === 1) cone_detected = true;
            itn = it.next();
          }
          var symmetric_nat = null;
          if (symmetric_detected) symmetric_nat = true;
          else if (cone_detected || public_host) symmetric_nat = false;
          connection.local_public_ipv4 = list_ipv4;
          connection.local_public_ipv6 = list_ipv6;
          connection.local_relay_ipv4 = relay_ipv4;
          connection.local_relay_ipv6 = relay_ipv6;
          connection.local_support_udp = supports_udp;
          connection.local_support_tcp = supports_tcp;
          connection.local_symmetric_nat = symmetric_nat;
          var needs_relay = symmetric_nat === true || supports_udp === false;
          var profile = {
            public_ipv4: list_ipv4[0] || null,
            public_ipv6: list_ipv6[0] || null,
            all_public_ipv4: list_ipv4.slice(),
            all_public_ipv6: list_ipv6.slice(),
            local_ipv4: host_ipv4[0] || null,
            symmetric_nat,
            // true=problematic, false=fine, null=unknown
            supports_udp,
            supports_tcp,
            needs_relay
          };
          var profile_sig = JSON.stringify(profile);
          if (profile_sig !== connection._last_network_profile) {
            connection._last_network_profile = profile_sig;
            ev.emit("networkprofile", profile);
          }
        }
      }
    }
    var QUEUE_COMPACT_THRESHOLD = 4096;
    var SENDS_MAX_PER_TICK = 512;
    function data_queue_length() {
      return connection.data_channel_sending_messages_queue.length - connection.data_q_head;
    }
    function signal_queue_length() {
      return connection.signal_sending_messages_queue.length - connection.signal_q_head;
    }
    function compact_data_queue() {
      if (connection.data_q_head >= QUEUE_COMPACT_THRESHOLD) {
        connection.data_channel_sending_messages_queue.splice(0, connection.data_q_head);
        connection.data_q_head = 0;
      }
    }
    function compact_signal_queue() {
      if (connection.signal_q_head >= QUEUE_COMPACT_THRESHOLD) {
        connection.signal_sending_messages_queue.splice(0, connection.signal_q_head);
        connection.signal_q_head = 0;
      }
    }
    function data_channel_get_send_rate() {
      var now = Date.now();
      var cutoff = now - 1e3;
      var evs = connection.data_channel_sent_events;
      while (connection.sent_events_head < evs.length && evs[connection.sent_events_head][0] < cutoff) {
        connection.sent_window_bytes -= evs[connection.sent_events_head][1];
        connection.sent_window_count--;
        connection.sent_events_head++;
      }
      if (connection.sent_events_head >= QUEUE_COMPACT_THRESHOLD) {
        evs.splice(0, connection.sent_events_head);
        connection.sent_events_head = 0;
      }
      return [connection.sent_window_count, connection.sent_window_bytes];
    }
    function rate_limits_active() {
      return connection.data_channel_max_sending_messages_per_sec !== Infinity || connection.data_channel_max_sending_bytes_per_sec !== Infinity;
    }
    function data_channel_schedule_pump() {
      if (connection.data_channel_pump_queue_timer !== null) return;
      var has_signal = signal_queue_length() > 0;
      var has_data = data_queue_length() > 0;
      if (!has_signal && !has_data) return;
      var wait_time = 0;
      var now = Date.now();
      if (!has_signal && rate_limits_active()) {
        var [sent_count, sent_bytes] = data_channel_get_send_rate();
        if (sent_count >= connection.data_channel_max_sending_messages_per_sec) {
          var oldest_ts = connection.data_channel_sent_events[0][0];
          wait_time = Math.max(wait_time, 1e3 - (now - oldest_ts));
        }
        if (sent_bytes >= connection.data_channel_max_sending_bytes_per_sec && sent_count > 0) {
          var sumFwd = sent_bytes;
          var j = 0;
          while (j < sent_count && sumFwd > connection.data_channel_max_sending_bytes_per_sec) {
            sumFwd -= connection.data_channel_sent_events[j][1];
            j++;
          }
          var ts_to_expire = connection.data_channel_sent_events[j - 1 >= 0 ? j - 1 : 0][0];
          var w = 1e3 - (now - ts_to_expire);
          if (w > wait_time) {
            wait_time = w;
          }
        }
      }
      if (wait_time < 0) {
        wait_time = 0;
      }
      if (wait_time > 60) {
        wait_time = 60;
      }
      if (wait_time <= 0) {
        var data_channel_open = connection.data_channel_primary_index !== null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState == "open" && connection.data_channel_state == "open";
        if (data_channel_open == true) {
          var next_msg = has_signal ? connection.signal_sending_messages_queue[connection.signal_q_head] : connection.data_channel_sending_messages_queue[connection.data_q_head];
          if (connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount + next_msg.data.byteLength > connection.data_channel_max_buffered_amount) {
            wait_time = 10;
          }
        } else {
          wait_time = 20;
        }
      }
      if (connection.data_channel_sending_messages_paused === true && !has_signal) {
        wait_time = Math.max(wait_time, 250);
      }
      connection.data_channel_pump_queue_timer = setTimeout(function() {
        connection.data_channel_pump_queue_timer = null;
        data_channel_pump_queue();
      }, wait_time);
    }
    var EXPIRE_MAX_PER_TICK = 4096;
    function expire_queued_messages() {
      var now = Date.now();
      var budget = EXPIRE_MAX_PER_TICK;
      var sq = connection.signal_sending_messages_queue;
      while (budget > 0 && connection.signal_q_head < sq.length && now - sq[connection.signal_q_head].ts > connection.data_channel_max_queue_age) {
        connection.signal_q_head++;
        connection.stats_dropped_expired_signals++;
        budget--;
      }
      compact_signal_queue();
      var q = connection.data_channel_sending_messages_queue;
      if (data_queue_length() == 0) return;
      var expired = [];
      while (budget > 0 && connection.data_q_head < q.length && now - q[connection.data_q_head].ts > connection.data_channel_max_queue_age) {
        var ex = q[connection.data_q_head];
        connection.data_q_head++;
        connection.data_channel_queued_bytes -= ex.data.byteLength;
        expired.push(ex);
        budget--;
      }
      compact_data_queue();
      if (expired.length == 0) return;
      connection.stats_dropped_expired += expired.length;
      for (var i = 0; i < expired.length; i++) {
        if (typeof expired[i].callback == "function") {
          try {
            expired[i].callback(false);
          } catch (cb_error) {
            ev.emit("error", cb_error);
          }
        }
      }
      if (now - connection.last_expired_emit_ts >= 1e3) {
        connection.last_expired_emit_ts = now;
        ev.emit("error", "dropped " + expired.length + " queued message(s) still unsent after " + connection.data_channel_max_queue_age + "ms (" + connection.stats_dropped_expired + " total)");
      }
    }
    function data_channel_pump_queue() {
      expire_queued_messages();
      function primary_dc_open() {
        return connection.data_channel_primary_index !== null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState == "open" && connection.data_channel_state == "open";
      }
      if (primary_dc_open()) {
        var sig_sent_this_tick = 0;
        while (signal_queue_length() > 0) {
          if (sig_sent_this_tick >= SENDS_MAX_PER_TICK) break;
          if (!primary_dc_open()) break;
          var sig_dc = connection.list_data_channels[connection.data_channel_primary_index];
          var sig_data = connection.signal_sending_messages_queue[connection.signal_q_head].data;
          if (sig_dc.bufferedAmount + sig_data.byteLength > connection.data_channel_max_buffered_amount) {
            break;
          }
          try {
            sig_dc.send(sig_data);
            connection.signal_q_head++;
            sig_sent_this_tick++;
          } catch (error) {
            connection.stats_send_failures++;
            var sig_fail_now = Date.now();
            if (sig_fail_now - connection.last_send_failure_emit_ts >= 1e3) {
              connection.last_send_failure_emit_ts = sig_fail_now;
              ev.emit("log", "datachannel send failed, message stays queued for retry (" + connection.stats_send_failures + " total): " + (error && error.message ? error.message : String(error)));
            }
            break;
          }
        }
        compact_signal_queue();
        if (connection.data_channel_sending_messages_paused === false && primary_dc_open() && connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount < connection.data_channel_max_buffered_amount) {
          var callbacks_sent_ok = [];
          var sent_any_data = false;
          var data_sent_this_tick = 0;
          while (data_queue_length() > 0) {
            if (data_sent_this_tick >= SENDS_MAX_PER_TICK) break;
            if (!primary_dc_open()) break;
            var head = connection.data_channel_sending_messages_queue[connection.data_q_head];
            var data_to_send = head.data;
            if (Date.now() - head.ts > connection.data_channel_max_queue_age) {
              connection.data_q_head++;
              connection.data_channel_queued_bytes -= data_to_send.byteLength;
              connection.stats_dropped_expired++;
              if (typeof head.callback == "function") {
                try {
                  head.callback(false);
                } catch (cb_error) {
                  ev.emit("error", cb_error);
                }
              }
              data_sent_this_tick++;
              continue;
            }
            if (connection.pc && connection.pc.sctp && connection.pc.sctp.maxMessageSize > 0 && data_to_send.byteLength > connection.pc.sctp.maxMessageSize) {
              connection.data_q_head++;
              connection.data_channel_queued_bytes -= data_to_send.byteLength;
              if (typeof head.callback == "function") {
                try {
                  head.callback(false);
                } catch (cb_error) {
                  ev.emit("error", cb_error);
                }
              }
              ev.emit("error", "message must be less than " + connection.pc.sctp.maxMessageSize + " bytes (got " + data_to_send.byteLength + ")");
              continue;
            }
            if (connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount + data_to_send.byteLength > connection.data_channel_max_buffered_amount) {
              break;
            }
            if (rate_limits_active()) {
              var [sent_count, sent_bytes] = data_channel_get_send_rate();
              if (sent_count >= connection.data_channel_max_sending_messages_per_sec || sent_bytes >= connection.data_channel_max_sending_bytes_per_sec) {
                break;
              }
            }
            try {
              var now = Date.now();
              connection.list_data_channels[connection.data_channel_primary_index].send(data_to_send);
              sent_any_data = true;
              data_sent_this_tick++;
              if (rate_limits_active()) {
                connection.data_channel_sent_events.push([now, data_to_send.byteLength]);
                connection.sent_window_count++;
                connection.sent_window_bytes += data_to_send.byteLength;
              }
              if (head.callback !== null) {
                callbacks_sent_ok.push(head.callback);
              }
              connection.data_q_head++;
              connection.data_channel_queued_bytes -= data_to_send.byteLength;
            } catch (error) {
              connection.stats_send_failures++;
              var fail_now = Date.now();
              if (fail_now - connection.last_send_failure_emit_ts >= 1e3) {
                connection.last_send_failure_emit_ts = fail_now;
                ev.emit("log", "datachannel send failed, message stays queued for retry (" + connection.stats_send_failures + " total): " + (error && error.message ? error.message : String(error)));
              }
              break;
            }
          }
          if (callbacks_sent_ok.length > 0) {
            for (var ci = 0; ci < callbacks_sent_ok.length; ci++) {
              try {
                callbacks_sent_ok[ci](true);
              } catch (cb_error) {
                ev.emit("error", cb_error);
              }
            }
          }
          compact_data_queue();
          if (sent_any_data && data_queue_length() == 0) {
            ev.emit("drain");
          }
        }
      }
      if (signal_queue_length() > 0 || data_queue_length() > 0) {
        data_channel_schedule_pump();
      }
    }
    function data_channel_send_data(data, callback) {
      var uint8buffer = litepack_default.encode(SCHEMA_DC_MSG, { type: 0, data: data instanceof Uint8Array ? data : toU82(data) });
      data_channel_send(uint8buffer, callback);
    }
    function data_channel_send(data, callback) {
      if (typeof data == "string") {
        data = _TE3.encode(data);
      }
      if (connection.pc && connection.pc.sctp && connection.pc.sctp.maxMessageSize > 0 && data.byteLength > connection.pc.sctp.maxMessageSize) {
        if (typeof callback == "function") {
          callback(false);
        }
        ev.emit("error", "message must be less than " + connection.pc.sctp.maxMessageSize + " bytes (got " + data.byteLength + ")");
        return;
      }
      connection.data_channel_sending_messages_queue.push({
        data,
        callback: typeof callback == "function" ? callback : null,
        ts: Date.now()
      });
      connection.data_channel_queued_bytes += data.byteLength;
      data_channel_schedule_pump();
    }
    function data_channel_send_signal(data) {
      connection.signal_sending_messages_queue.push({
        data,
        ts: Date.now()
      });
      if (connection.data_channel_pump_queue_timer !== null) {
        clearTimeout(connection.data_channel_pump_queue_timer);
        connection.data_channel_pump_queue_timer = null;
      }
      data_channel_schedule_pump();
    }
    function pause_sending() {
      connection.data_channel_sending_messages_paused = true;
    }
    function resume_sending() {
      if (connection.data_channel_sending_messages_paused === true) {
        connection.data_channel_sending_messages_paused = false;
        if (connection.data_channel_pump_queue_timer !== null) {
          clearTimeout(connection.data_channel_pump_queue_timer);
          connection.data_channel_pump_queue_timer = null;
        }
        data_channel_schedule_pump();
      }
    }
    function close_connection() {
      clearTimeout(connection.create_data_channel_timer);
      connection.create_data_channel_timer = null;
      clearTimeout(connection.create_offer_timer);
      connection.create_offer_timer = null;
      clearTimeout(connection.wait_for_answer_timeout_timer);
      connection.wait_for_answer_timeout_timer = null;
      clearTimeout(connection.negotiation_done_timeout_timer);
      connection.negotiation_done_timeout_timer = null;
      clearTimeout(connection.getstats_timer);
      connection.getstats_timer = null;
      clearTimeout(connection.data_channel_pump_queue_timer);
      connection.data_channel_pump_queue_timer = null;
      clearTimeout(connection.remove_unused_tracks_timer);
      connection.remove_unused_tracks_timer = null;
      clearTimeout(connection.ice_restart_timer);
      connection.ice_restart_timer = null;
      clearTimeout(connection.ice_restart_reset_timer);
      connection.ice_restart_reset_timer = null;
      clearTimeout(connection.gathering_timeout_timer);
      connection.gathering_timeout_timer = null;
      clearTimeout(connection.mediastream_map_ack_timer);
      connection.mediastream_map_ack_timer = null;
      connection.mediastream_map_pending = null;
      clearTimeout(connection.ping_timer);
      connection.ping_timer = null;
      clearTimeout(connection.liveness_timer);
      connection.liveness_timer = null;
      connection.chunk_reasm_internal = {};
      connection.chunk_reasm_external = {};
      if (connection.pc) {
        if (connection.pc.sctp) {
          connection.pc.sctp.onstatechange = null;
          if (connection.pc.sctp.transport) {
            connection.pc.sctp.transport.onstatechange = null;
            if (connection.pc.sctp.transport.iceTransport) {
              connection.pc.sctp.transport.iceTransport.onstatechange = null;
            }
          }
        }
        for (var i = 0; i < connection.list_data_channels.length; i++) {
          if (connection.list_data_channels[i] && connection.list_data_channels[i] !== null) {
            connection.list_data_channels[i].onopen = null;
            connection.list_data_channels[i].onmessage = null;
            connection.list_data_channels[i].onerror = null;
            connection.list_data_channels[i].onclosing = null;
            connection.list_data_channels[i].onclose = null;
            connection.list_data_channels[i].onbufferedamountlow = null;
            if (connection.list_data_channels[i].readyState == "open" || connection.list_data_channels[i].readyState !== "connected" && connection.list_data_channels[i].readyState !== "connecting") {
              try {
                if (typeof connection.list_data_channels[i].close == "function") {
                  connection.list_data_channels[i].close();
                }
              } catch (error) {
              }
            }
          }
        }
        connection.pc.ondatachannel = null;
        connection.pc.onicecandidate = null;
        connection.pc.onicecandidateerror = null;
        connection.pc.onconnectionstatechange = null;
        connection.pc.oniceconnectionstatechange = null;
        connection.pc.onicegatheringstatechange = null;
        connection.pc.onnegotiationneeded = null;
        connection.pc.onsignalingstatechange = null;
        connection.pc.ontrack = null;
        if (typeof connection.pc.close == "function" && connection.pc.connectionState !== "closed") {
          try {
            connection.pc.close();
          } catch (error) {
            ev.emit("error", error);
          }
        }
        connection.pc = null;
        connection.data_channel_state = "closed";
        connection.data_channel_primary_index = null;
        connection.sctp = null;
        connection.list_data_channels.length = 0;
        connection.signal_sending_messages_queue.length = 0;
        connection.signal_q_head = 0;
        var pending = connection.data_channel_sending_messages_queue;
        var pending_head = connection.data_q_head;
        connection.data_channel_sending_messages_queue = [];
        connection.data_q_head = 0;
        connection.data_channel_queued_bytes = 0;
        for (var qi = pending_head; qi < pending.length; qi++) {
          if (typeof pending[qi].callback == "function") {
            try {
              pending[qi].callback(false);
            } catch (cb_error) {
              ev.emit("error", cb_error);
            }
          }
        }
        ev.emit("close");
      }
    }
    function set_auth_verified(is_ok) {
      if (is_ok == true) {
        connection.auth_verified = true;
      }
    }
    function setConfiguration(opts2) {
      if ("iceServers" in opts2 && opts2.iceServers.length > 0) {
        connection.pc_config.iceServers = opts2.iceServers;
      } else {
        connection.pc_config.iceServers = [{ urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun.stunprotocol.org:3478",
          "stun:global.stun.twilio.com:3478"
        ] }];
      }
      if ("certificates" in opts2) {
        connection.pc_config.certificates = opts2.certificates;
      }
      if ("iceCandidatePoolSize" in opts2) {
        connection.pc_config.iceCandidatePoolSize = opts2.iceCandidatePoolSize;
      } else {
        connection.pc_config.iceCandidatePoolSize = 1;
      }
      if ("bundlePolicy" in opts2) {
        connection.pc_config.bundlePolicy = opts2.bundlePolicy;
      } else {
        connection.pc_config.bundlePolicy = "balanced";
      }
      if ("rtcpMuxPolicy" in opts2) {
        connection.pc_config.rtcpMuxPolicy = opts2.rtcpMuxPolicy;
      } else {
        connection.pc_config.rtcpMuxPolicy = "require";
      }
      if ("sdpSemantics" in opts2) {
        connection.pc_config.sdpSemantics = opts2.sdpSemantics;
      } else {
        connection.pc_config.sdpSemantics = "unified-plan";
      }
      if ("portRange" in opts2) {
        connection.pc_config.portRange = opts2.portRange;
      }
      if ("gatheringTimeout" in opts2) {
        connection.gathering_timeout_ms = Math.max(0, opts2.gatheringTimeout | 0);
      }
      if ("gatheringMaxRetries" in opts2) {
        connection.gathering_max_retries = Math.max(0, opts2.gatheringMaxRetries | 0);
      }
      if ("ping" in opts2) {
        connection.ping_enabled = opts2.ping !== false;
        if (connection.ping_enabled === false && !("liveness" in opts2) && connection.liveness_enabled === true) {
          connection.liveness_enabled = false;
          setTimeout(function() {
            ev.emit("log", "ping disabled \u2014 liveness watchdog auto-disabled with it (idle connections would falsely time out); pass liveness:true explicitly to keep it");
          }, 0);
        }
      }
      if ("pingIntervalMin" in opts2) {
        connection.ping_interval_min = Math.max(100, opts2.pingIntervalMin | 0);
      }
      if ("pingIntervalMax" in opts2) {
        connection.ping_interval_max = Math.max(connection.ping_interval_min, opts2.pingIntervalMax | 0);
      }
      if ("liveness" in opts2) {
        connection.liveness_enabled = opts2.liveness !== false;
      }
      if ("livenessTimeout" in opts2) {
        connection.liveness_timeout_ms = Math.max(2e3, opts2.livenessTimeout | 0);
      }
      if ("maxSendingMessagesPerSec" in opts2) {
        connection.data_channel_max_sending_messages_per_sec = opts2.maxSendingMessagesPerSec === 0 ? Infinity : Math.max(1, opts2.maxSendingMessagesPerSec | 0);
      }
      if ("maxSendingBytesPerSec" in opts2) {
        connection.data_channel_max_sending_bytes_per_sec = opts2.maxSendingBytesPerSec === 0 ? Infinity : Math.max(1024, opts2.maxSendingBytesPerSec | 0);
      }
      if ("minBufferedAmount" in opts2) {
        connection.data_channel_min_buffered_amount = Math.max(1024, opts2.minBufferedAmount | 0);
        for (var dci = 0; dci < connection.list_data_channels.length; dci++) {
          var _dc = connection.list_data_channels[dci];
          if (_dc) {
            try {
              _dc.bufferedAmountLowThreshold = connection.data_channel_min_buffered_amount;
            } catch (e) {
            }
          }
        }
      }
      if ("maxBufferedAmount" in opts2) {
        connection.data_channel_max_buffered_amount = Math.max(connection.data_channel_min_buffered_amount, opts2.maxBufferedAmount | 0);
      }
      if ("maxQueueAge" in opts2) {
        connection.data_channel_max_queue_age = Math.max(1e3, opts2.maxQueueAge | 0);
      }
      if (connection.pc) {
        connection.pc.setConfiguration(connection.pc_config);
      }
    }
    if (typeof opts == "object") {
      setConfiguration(opts);
    }
    function send_candidate(candidate_json) {
      if (candidate_json.candidate && candidate_json.candidate.length > 0) {
        try {
          var p = parse_candidate(candidate_json.candidate);
          if (p.ufrag == null && typeof candidate_json.usernameFragment === "string" && candidate_json.usernameFragment.length > 0) {
            p.ufrag = candidate_json.usernameFragment;
          }
          var uint8buffer = encode_candidate_binary(p, candidate_json.sdpMid, candidate_json.sdpMLineIndex, candidate_json.ufrag);
          send_signal(MSGCODE_TYPE_MAP["ICE_CANDIDATE_COMPACT"], uint8buffer);
        } catch (error) {
          var uint8buffer = _TE3.encode(JSON.stringify(candidate_json));
          send_signal(MSGCODE_TYPE_MAP["ICE_CANDIDATE_RAW"], uint8buffer);
        }
      }
    }
    cert_wrtc_acquire_shared_certificate(function(error, cert) {
      if (!error && cert && !("certificates" in connection.pc_config)) {
        connection.pc_config.certificates = [cert];
      }
      try {
        connection.pc = new RTCPeerConnection(connection.pc_config);
        connection.pc.onicecandidate = function(event) {
          if (connection.pc) {
            if (event.candidate == null || event.candidate && typeof event.candidate.usernameFragment === "string" && event.candidate.usernameFragment.length <= 0) {
              send_total_candidates();
            } else {
              if (connection.local_support_trickle_ice == null) {
                connection.local_support_trickle_ice = true;
              }
              if ("toJSON" in event.candidate && typeof event.candidate.toJSON == "function") {
                var candidate_json = event.candidate.toJSON();
              } else {
                var candidate_json = event.candidate;
              }
              if (opts.exclude_host_candidates !== true || event.candidate.type !== "host") {
                send_candidate(candidate_json);
              }
              var of_ufrag = "default";
              if (typeof candidate_json.usernameFragment === "string" && candidate_json.usernameFragment.length > 0) {
                of_ufrag = candidate_json.usernameFragment;
              } else {
                var c = parse_candidate(candidate_json.candidate);
                if (typeof c.ufrag === "string" && c.ufrag.length > 0) {
                  of_ufrag = c.ufrag;
                }
              }
              if (!(of_ufrag in connection.list_gathered_local_candidates)) {
                connection.list_gathered_local_candidates[of_ufrag] = [];
              }
              connection.list_gathered_local_candidates[of_ufrag].push(event.candidate);
              analyze_local_candidates();
            }
          }
        };
        connection.pc.onicecandidateerror = function(event) {
          var code = Number(event.errorCode) || 0;
          var url = event.url || "unknown";
          var text = event.errorText || "";
          var key = url + "|" + code;
          var rec = connection.ice_server_errors[key];
          if (rec) {
            rec.count++;
            rec.last_ts = Date.now();
            return;
          }
          connection.ice_server_errors[key] = {
            url,
            code,
            text,
            count: 1,
            first_ts: Date.now(),
            last_ts: Date.now()
          };
          var msg = "ICE " + (code === 701 ? "server unreachable" : "error " + code) + " from " + url + (text ? " (" + text + ")" : "");
          if (code === 401 || code === 403 || code === 441 || code === 486 || code === 508) {
            ev.emit("error", msg);
          } else {
            ev.emit("log", msg);
          }
        };
        connection.pc.oniceconnectionstatechange = function() {
          if (!connection.pc) return;
          var state = connection.pc.iceConnectionState;
          var prev_state = connection._prev_ice_connection_state;
          connection._prev_ice_connection_state = state;
          if (state == "closed") {
            close_connection();
            return;
          }
          if (state == "connected" || state == "completed") {
            clearTimeout(connection.ice_restart_timer);
            connection.ice_restart_timer = null;
            clearTimeout(connection.ice_restart_reset_timer);
            connection.ice_restart_reset_timer = setTimeout(function() {
              connection.ice_restart_reset_timer = null;
              if (!pc_alive()) return;
              var s = connection.pc.iceConnectionState;
              if (s === "connected" || s === "completed") {
                connection.ice_restart_count = 0;
              }
            }, connection.ice_restart_stable_window_ms);
            clearTimeout(connection.gathering_timeout_timer);
            connection.gathering_timeout_timer = null;
            connection.gathering_retry_count = 0;
            if (prev_state === "disconnected" || prev_state === "failed") {
              ev.emit("reconnect");
            }
          }
          if (state == "failed") {
            if (prev_state === "connected" || prev_state === "completed" || prev_state === "disconnected") {
              ev.emit("disconnect", { reason: "failed", restartCount: connection.ice_restart_count });
            }
            clearTimeout(connection.ice_restart_timer);
            connection.ice_restart_timer = null;
            if (connection.ice_restart_count < connection.ice_restart_max_retries) {
              connection.ice_restart_count++;
              restartIce();
            } else {
              ev.emit("error", "ICE failed \u2014 closing after " + connection.ice_restart_max_retries + " restart attempts");
              close_connection();
              return;
            }
          }
          if (state == "disconnected") {
            if (prev_state === "connected" || prev_state === "completed") {
              ev.emit("disconnect", { reason: "disconnected", restartCount: connection.ice_restart_count });
            }
            if (connection.ice_restart_timer == null) {
              connection.ice_restart_timer = setTimeout(function() {
                connection.ice_restart_timer = null;
                if (connection.pc && connection.pc.iceConnectionState == "disconnected") {
                  if (connection.ice_restart_count < connection.ice_restart_max_retries) {
                    connection.ice_restart_count++;
                    restartIce();
                  } else {
                    ev.emit("error", "ICE disconnected \u2014 closing after " + connection.ice_restart_max_retries + " restart attempts");
                    close_connection();
                  }
                }
              }, connection.ice_restart_delay_ms);
            }
          }
          ev.emit("statechange", build_state_snapshot());
        };
        connection.pc.onconnectionstatechange = function() {
          if (!connection.pc) return;
          var state = connection.pc.connectionState;
          if (state == "closed") {
            close_connection();
            return;
          }
          ev.emit("statechange", build_state_snapshot());
        };
        connection.pc.onicegatheringstatechange = function(event) {
          if (pc_alive()) {
            var gatherState = connection.pc.iceGatheringState;
            if (gatherState === "complete") {
              clearTimeout(connection.gathering_timeout_timer);
              connection.gathering_timeout_timer = null;
              connection.gathering_retry_count = 0;
              send_total_candidates();
            }
            if (gatherState === "gathering") {
              if (connection.gathering_timeout_timer == null && connection.gathering_timeout_ms > 0) {
                connection.gathering_timeout_timer = setTimeout(function() {
                  connection.gathering_timeout_timer = null;
                  if (!connection.pc) return;
                  if (connection.pc.iceGatheringState === "gathering") {
                    connection.gathering_retry_count++;
                    ev.emit("log", "ICE gathering stuck \u2014 retry " + connection.gathering_retry_count + "/" + connection.gathering_max_retries);
                    if (connection.gathering_retry_count <= connection.gathering_max_retries) {
                      connection.pending_remote_offer_sdp = null;
                      rollback_signaling_to_stable(function() {
                        set_connection_state({ negotiation_state: 0 });
                        restartIce();
                      });
                    } else {
                      ev.emit("error", "ICE gathering failed after " + connection.gathering_max_retries + " retries");
                      close_connection();
                    }
                  }
                }, connection.gathering_timeout_ms);
              }
            }
            if (gatherState === "new") {
              clearTimeout(connection.gathering_timeout_timer);
              connection.gathering_timeout_timer = null;
            }
          }
          ev.emit("statechange", build_state_snapshot());
        };
        connection.pc.onnegotiationneeded = function() {
          _engine_diag("onnegotiationneeded: neg=" + connection.negotiation_state + " timer=" + (connection.create_offer_timer != null) + " \u2192 " + (connection.negotiation_state == 0 && connection.create_offer_timer == null ? "SCHEDULE" : "LATCH"));
          if (connection.negotiation_state == 0 && connection.create_offer_timer == null) {
            create_offer_schedule();
          } else {
            connection.renegotiation_pending = true;
          }
        };
        connection.pc.onsignalingstatechange = function() {
          set_connection_state({
            signaling_state: String(connection.pc.signalingState) + ""
          });
        };
        connection.pc.ondatachannel = function(event) {
          add_data_channel(event.channel);
        };
        connection.pc.ontrack = function(event) {
        };
        set_connection_state({
          signaling_state: String(connection.pc.signalingState) + ""
        });
        if (connection.pending_remote_offer_sdp !== null && connection.signaling_state == "stable" && connection.negotiation_state == 0) {
          set_remote_offer();
        } else {
          let try_create_dc = function() {
            connection.create_data_channel_timer = null;
            if (pc_alive()) {
              var sctp_not_up = connection.pc.sctp == null || connection.pc.sctp.state !== "connected";
              var need_dc = sctp_not_up && connection.list_data_channels.length == 0 && connection.negotiation_state == 0 && connection.pending_remote_offer_sdp == null;
              if (need_dc) {
                create_data_channel();
              } else if (sctp_not_up && connection.list_data_channels.length == 0) {
                connection.create_data_channel_timer = setTimeout(try_create_dc, 100);
              }
            }
          };
          var random_delay = 8 + Math.floor(Math.random() * 55);
          connection.create_data_channel_timer = setTimeout(try_create_dc, random_delay);
        }
      } catch (error2) {
        ev.emit("error", error2);
        ev.emit("close");
      }
    });
    var api = {
      connection,
      on: function(name, fn) {
        ev.on(name, fn);
      },
      off: function(name, fn) {
        ev.off(name, fn);
      },
      signal: on_signal_channel,
      stream,
      addStream,
      removeStream,
      addTrack,
      removeTrack,
      send: data_channel_send_data,
      write: data_channel_send_data,
      pause: pause_sending,
      resume: resume_sending,
      set_auth_verified,
      setConfiguration,
      restartIce,
      close: close_connection,
      destroy: close_connection,
      getConnectionInfo: function() {
        return build_connection_info();
      },
      getStreams: function(direction) {
        var result = {};
        if (!direction || direction === "sending") {
          for (var tag_id in connection.list_sending_live_mediastream) {
            var rec = connection.list_sending_live_mediastream[tag_id];
            if (!result[tag_id]) result[tag_id] = {};
            result[tag_id].sending = {
              video_track: rec.video_track,
              audio_track: rec.audio_track,
              video_mid: rec.video_mid,
              audio_mid: rec.audio_mid,
              video: {
                active: rec.video_active || false,
                width: rec.current_video_frame_width || 0,
                height: rec.current_video_frame_height || 0,
                fps: rec.current_video_fps || 0,
                codec: rec.current_video_mime_type || null,
                bitrate: rec.video_bitrate || 0
              },
              audio: {
                active: rec.audio_active || false,
                codec: rec.audio_mime_type || null,
                bitrate: rec.audio_bitrate || 0
              }
            };
          }
        }
        if (!direction || direction === "receiving") {
          for (var tag_id in connection.list_receiving_live_mediastream) {
            var rec = connection.list_receiving_live_mediastream[tag_id];
            if (!result[tag_id]) result[tag_id] = {};
            result[tag_id].receiving = {
              video_track: rec.video_track,
              audio_track: rec.audio_track,
              video_mid: rec.video_mid,
              audio_mid: rec.audio_mid,
              mediastream: rec.mediastream,
              video: {
                active: rec.video_active || false,
                width: rec.current_video_frame_width || 0,
                height: rec.current_video_frame_height || 0,
                fps: rec.current_video_fps || 0,
                codec: rec.current_video_mime_type || null,
                bitrate: rec.video_bitrate || 0,
                packetLoss: rec.video_packet_loss || 0,
                jitter: rec.video_jitter || 0
              },
              audio: {
                active: rec.audio_active || false,
                codec: rec.current_audio_mime_type || null,
                bitrate: rec.audio_bitrate || 0,
                packetLoss: rec.audio_packet_loss || 0,
                jitter: rec.audio_jitter || 0
              }
            };
          }
        }
        return result;
      }
    };
    for (var k in api) {
      if (Object.prototype.hasOwnProperty.call(api, k)) this[k] = api[k];
    }
    var self2 = this;
    Object.defineProperty(self2, "connected", {
      get: function() {
        return connection.data_channel_state === "open";
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(self2, "paused", {
      get: function() {
        return connection.data_channel_sending_messages_paused === true;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(self2, "bufferedAmount", {
      get: function() {
        var total = connection.data_channel_queued_bytes;
        var pidx = connection.data_channel_primary_index;
        if (pidx !== null && connection.list_data_channels[pidx]) {
          total += connection.list_data_channels[pidx].bufferedAmount || 0;
        }
        return total;
      },
      enumerable: true,
      configurable: true
    });
    return this;
  }

  // <stdin>
  if (typeof window !== "undefined") window.StableWebRTC = engine_default;
  var stdin_default = engine_default;
  return __toCommonJS(stdin_exports);
})();
