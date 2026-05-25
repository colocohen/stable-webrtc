/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// SDP & ICE-candidate text parsing.

import { strip_brackets } from './util.js';

export function get_kind_from_sdp_by_mid(sdp, mid) {
    if (!sdp || !mid) return null;

    var lines = sdp.split(/\r?\n/);
    var inSection = false;
    var currentKind = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line.startsWith('m=')) {
        // m= line starts a new section, save kind
        var parts = line.split(' ');
        currentKind = parts[0].substring(2); // "video" or "audio"
        inSection = false; // don't know yet if this is our section
      }
      if (line.startsWith('a=mid:')) {
        var thisMid = line.substring(6);
        if (thisMid === mid) {
          // Found the section for the requested mid
          return currentKind;
        }
      }
    }
    return null;
  }


export function is_support_trickle_ice(sdp) {
    if (!sdp) return false;
    // Match any a=ice-options line and extract text to end of line
    var m = sdp.match(/^a=ice-options:(.*)$/m);
    if (m && m[1].indexOf('trickle') >= 0) {
        return true;
    }
    return false;
  }

export function get_fingerprint_from_sdp(sdp_str){
    var fingerprint_bytes=null;
    var match = sdp_str.match(/a=fingerprint:(\S+)\s+([0-9A-Fa-f:]+)/);
    if(match && match.length>=2){
      var fingerprint_str=match[2];
      var parts = fingerprint_str.trim().split(':');
      fingerprint_bytes = new Uint8Array(parts.length);
      
      for (var i = 0; i < parts.length; i++) {
        fingerprint_bytes[i] = parseInt(parts[i], 16);
      }
    }
    return fingerprint_bytes;
  }

export function get_ufrag_from_sdp(sdp){
    try {
      if(sdp){
        var s = typeof sdp=='object' && 'sdp' in sdp ? sdp.sdp : sdp;
        var m = s.match(/^a=ice-ufrag:(.+)$/m);
        return m ? m[1] : null;
      }else{
        return null;
      }
      
    } catch(e){
      return null; 
    }
  }

  
export function parse_candidate(candidateString) {
    if (!candidateString || typeof candidateString !== 'string') return null;

    var s = candidateString.trim();
    // guard: end-of-candidates / empty
    if (s === '' || /^\s*a=?end-of-candidates\s*$/i.test(s)) return null;

    // Remove common prefixes
    if (s.indexOf('a=') === 0) s = s.substring(2);
    if (s.indexOf('candidate:') === 0) s = s.substring(10);

    // Must have at least up to "typ type"
    var parts = s.split(/\s+/);
    if (parts.length < 8) return null;

    // --- helpers ---
    function toInt(x){ var n = parseInt(x,10); return isNaN(n) ? null : (n|0); }
    function toU32(x){ var n = parseInt(x,10); return isNaN(n) ? 0 : (n>>>0); }
    function strip_brackets(a){
      if (!a) return a;
      if (a.charAt(0)==='[' && a.charAt(a.length-1)===']') return a.slice(1,-1);
      return a;
    }
    function strip_scope(a){
      if (!a) return a;
      var k = a.indexOf('%');        // IPv6 scope-id, e.g. fe80::1%eth0
      return (k>=0) ? a.slice(0,k) : a;
    }
    function isMdns(a){ return !!(a && /\.local$/i.test(a)); }

    // --- fixed layout: first 6 tokens + "typ type" ---
    var foundation   = parts[0];
    var component_id = toInt(parts[1]);
    var transport    = (parts[2]||'').toLowerCase();   // 'udp'/'tcp'/other
    var priority     = toU32(parts[3]);
    var address      = parts[4];
    var port         = toU32(parts[5]);

    if ((parts[6]||'').toLowerCase() !== 'typ') return null;
    var type         = (parts[7]||'').toLowerCase();

    // --- optionals as key/value (flexible order) ---
    var relatedAddress=null, relatedPort=null, tcptype=null, generation=null;
    var ufrag=null, network_id=null, network_cost=null;

    var extras = {}; // keep unrecognized extensions

    var i;
    for (i=8; i<parts.length; i++){
      var key = (parts[i]||'').toLowerCase();
      if (i+1 >= parts.length) break; // no value follows

      if (key==='raddr'){ relatedAddress = parts[++i]; continue; }
      if (key==='rport'){ relatedPort    = toU32(parts[++i]); continue; }
      if (key==='tcptype'){ tcptype      = (parts[++i]||'').toLowerCase(); continue; }
      if (key==='generation'){ generation= toInt(parts[++i]); continue; }
      if (key==='ufrag'){ ufrag          = parts[++i]; continue; }
      if (key==='network-id'){ network_id= toInt(parts[++i]); continue; }
      if (key==='network-cost'){ network_cost = toU32(parts[++i]); continue; }
      if (key==='typ'){ // already handled, but if appears again — read and continue
        type = (parts[++i]||'').toLowerCase();
        continue;
      }

      // Unrecognized? capture as key/value in extras
      var val = parts[i+1];
      if (val != null) { extras[key] = val; i++; }
    }

    // --- normalization: IPv6 brackets / scope-id; mDNS ---
    address = strip_brackets(address);
    if (relatedAddress) relatedAddress = strip_brackets(relatedAddress);
    address = strip_scope(address);
    if (relatedAddress) relatedAddress = strip_scope(relatedAddress);

    var addrIsMdns = isMdns(address);
    var relIsMdns  = relatedAddress ? isMdns(relatedAddress) : false;

    var ipFamily   = addrIsMdns ? 0 : (address && address.indexOf(':')>=0 ? 6 : 4);
    var relFamily  = (relatedAddress && !relIsMdns) ? (relatedAddress.indexOf(':')>=0 ? 6 : 4) : 0;

    // --- Enums to assist binary encoding ---
    var transportNum = (transport==='tcp') ? 1 : 0; // udp=0, tcp=1
    var candTypeNum  = (type==='host')?0 : (type==='srflx')?1 : (type==='prflx')?2 : 3; // relay=3
    var tcpTypeNum   = null;
    if (transportNum===1 && tcptype!=null){
      tcpTypeNum = (tcptype==='active')?0 : (tcptype==='passive')?1 : 2; // so=2
    }

    // raddr/rport "empty" means no rel
    var hasRel = !!(relatedAddress && !relIsMdns && relatedAddress!=='0.0.0.0' && relatedPort && relatedPort!==0);

    // Foundation numeric hint (saves space during encoding)
    var foundationIsNumeric = (/^\d+$/.test(foundation));
    var foundationU32 = foundationIsNumeric ? (parseInt(foundation,10)>>>0) : null;

    // Build final object
    var obj = {
      // Base
      foundation: foundation,
      foundationIsNumeric: foundationIsNumeric,
      foundationU32: foundationU32,

      component: (component_id==null?1:(component_id|0)),
      transport: transport,
      transportNum: transportNum,
      priority: priority>>>0,

      ip: address,
      ipFamily: ipFamily,      // 0=mdns/string, 4, 6
      isMdns: addrIsMdns,
      port: port>>>0,

      // Type
      type: type,
      typeNum: candTypeNum,

      // related (raddr/rport)
      hasRel: hasRel,
      relIp: hasRel ? relatedAddress : null,
      relIpFamily: hasRel ? relFamily : 0,
      relIsMdns: hasRel ? relIsMdns : false,
      relPort: hasRel ? (relatedPort>>>0) : 0,

      // TCP
      hasTcpType: (tcpTypeNum!=null),
      tcpType: (tcpTypeNum==null?null:(tcpTypeNum|0)), // 0 active,1 passive,2 so
      tcpTypeStr: tcptype,

      // Additional
      generation: (generation==null?null:(generation|0)),
      networkId: (network_id==null?null:(network_id|0)),
      networkCost: (network_cost==null?null:(network_cost>>>0)),
      ufrag: ufrag || null,

      // Backward-compatible field names
      localIP: address,
      localPort: port>>>0,
      remoteIP: hasRel ? relatedAddress : null,
      remotePort: hasRel ? (relatedPort>>>0) : null,

      // Unrecognized extensions (key->value)
      extras: extras
    };

    return obj;
  }


export function remove_all_ice_candidates(sdp) {
    // ICE Lite peers (e.g. SFU/relay servers) put ALL their candidates in the
    // SDP and never trickle. Stripping them here would lose them forever — the
    // remote side would receive an SDP with no candidates and no trickle to
    // follow. So when the SDP is ICE Lite, keep candidates inline.
    if (/^a=ice-lite\s*$/m.test(sdp)) {
      return sdp;
    }
    // Split the SDP by line breaks
    var sdpLines = sdp.split('\r\n');
    var filteredSdpLines = sdpLines.filter(line => !line.startsWith('a=candidate'));
    var filteredSdp = filteredSdpLines.join('\r\n');
    return filteredSdp;
  }




export function parse_sdp_dc_only(sdp_str) {
    if (!sdp_str || typeof sdp_str !== 'string') return null;

    try {
      var lines = sdp_str.split(/\r?\n/);
      var sections = [];
      var current = { type: 'session', lines: [] };

      for (var i=0; i<lines.length; i++) {
        var L = (lines[i] || '').trim();
        if (!L) continue;
        if (L[0] === 'm') {
          sections.push(current);
          current = { type: 'media', lines: [L] };
        } else {
          current.lines.push(L);
        }
      }
      sections.push(current);

      // Only if there's exactly one media section
      var mediaSections = [];
      for (var j=0; j<sections.length; j++) {
        if (sections[j].type === 'media') mediaSections.push(sections[j]);
      }
      if (mediaSections.length !== 1) return null;

      // The single section must be datachannel
      var mline = mediaSections[0].lines[0] || '';
      var isApp = (mline.indexOf('m=application') === 0);
      var isDc = (mline.toLowerCase().indexOf('webrtc-datachannel') !== -1);
      if (!isApp || !isDc) return null;

      var origin = null;
      for (var i = 0; i < sections[0].lines.length; i++) {
        var L = sections[0].lines[i];
        if (L.indexOf('o=') === 0) {
          // o=<username> <sess-id> <sess-version> <nettype> <addrtype> <unicast-address>
          var p = L.substr(2).trim().split(/\s+/);
          if (p.length >= 6) {
            origin = {
              username: p[0],
              sessId: p[1],
              sessVersion: p[2],
              netType: p[3],
              addrType: p[4],
              address: p.slice(5).join(' ')
            };
          }
          break;
        }
      }

      var out = {
        schemaVersion: 1,
        session: { origin: origin || { username: '-', sessId: '0', sessVersion: '0', netType: 'IN', addrType: 'IP4', address: '127.0.0.1' } },
        bundle: { mids: [] },
        msidSemantic: null,
        ice: { ufrag: '', pwd: '', lite: false, trickle: false },
        dtls: { setup: '', fingerprint: { alg: '', value: '' } },
        data: { mid: '', proto: 'UDP/DTLS/SCTP', sctpPort: 5000, maxMessageSize: null }
      };

      // session-level
      for (var si=0; si<sections[0].lines.length; si++) {
        var S = sections[0].lines[si];
        if (S.indexOf('a=group:BUNDLE') === 0) {
          // Matches even without space after BUNDLE
          var m = /^a=group:BUNDLE\s*(.*)$/i.exec(S);
          var mids = m && m[1] ? m[1].trim().split(/\s+/).filter(Boolean) : [];
          out.bundle.mids = mids;
        } else if (S.indexOf('a=msid-semantic:') === 0) {
          out.msidSemantic = S.substr(16).trim();
        } else if (S.indexOf('a=ice-lite') === 0) {
          out.ice.lite = true;
        }
      }

      // media-level
      for (var mi=1; mi<mediaSections[0].lines.length; mi++) {
        var M = mediaSections[0].lines[mi];

        if (M.indexOf('a=mid:') === 0) {
          out.data.mid = M.substr(6).trim() || 'data';
        } else if (M.indexOf('a=ice-ufrag:') === 0) {
          out.ice.ufrag = M.substr(12).trim();
        } else if (M.indexOf('a=ice-pwd:') === 0) {
          out.ice.pwd = M.substr(10).trim();
        } else if (M.indexOf('a=ice-options:') === 0 && M.indexOf('trickle') >= 0) {
          out.ice.trickle = true;
        } else if (M.indexOf('a=setup:') === 0) {
          out.dtls.setup = M.substr(8).trim();
        } else if (M.indexOf('a=fingerprint:') === 0) {
          var rest = M.substr(14).trim();
          var sp = rest.split(/\s+/);
          var alg = (sp[0] || '').toLowerCase();
          if (alg === 'sha256') alg = 'sha-256';
          out.dtls.fingerprint.alg = alg;
          var val = rest.substr(sp[0].length).trim();
          out.dtls.fingerprint.value = val.toUpperCase();
        } else if (M.indexOf('a=sctp-port:') === 0) {
          out.data.sctpPort = parseInt(M.substr(12).trim(), 10) || 5000;
        } else if (M.indexOf('a=max-message-size:') === 0) {
          out.data.maxMessageSize = parseInt(M.substr(19).trim(), 10) || null;
        }
      }

      // Defaults
      if (!out.data.mid) out.data.mid = 'data';

      // Critical conditions — return null if anything is missing
      if (!out.ice.ufrag || !out.ice.pwd) return null;
      if (!out.dtls.fingerprint.value) return null;
      if (!out.dtls.setup) return null;

      return out;
    } catch (e) {
      return null; // any error → null
    }
  }

