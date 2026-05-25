/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// Binary codecs (litepack): ICE candidate + min-viable SDP.

import litepack from 'litepack';
import { ipToBytes } from './util.js';
import { parse_sdp_dc_only } from './sdp.js';
import { SCHEMA_CANDIDATE, SCHEMA_SDP_MIN } from './schemas.js';

  function mapTransportNum(s){ return (s && s.toLowerCase()==='tcp') ? 1 : 0; } // udp=0
  function mapTypeNum(s){
    var a=(s||'').toLowerCase();
    return a==='host'?0 : a==='srflx'?1 : a==='prflx'?2 : 3; // relay=3
  }
  function mapTcpTypeNum(s){
    var a=(s||'').toLowerCase();
    return a==='active'?0 : a==='passive'?1 : 2; // so=2
  }

export function encode_candidate_binary(p, sdpMid, sdpMLineIndex, usernameFragment){
    if (!p) return new Uint8Array(0);

    var component = (p.component_id!=null) ? (p.component_id|0)
                  : (p.component!=null)    ? (p.component|0) : 1;
    var trNum  = (p.transportNum!=null) ? (p.transportNum|0) : mapTransportNum(p.transport);
    var tyNum  = (p.typeNum!=null)      ? (p.typeNum|0)
               : (p.candTypeNum!=null)  ? (p.candTypeNum|0)
               : mapTypeNum(p.type||p.candType);
    var priority  = (p.priority>>>0) || 0;
    var ipFamily  = (p.ipFamily!=null) ? (p.ipFamily|0)
                  : (p.isMdns ? 0 : ((p.ip&&p.ip.indexOf(':')>=0)?6:4));
    var addrIsStr = (ipFamily===0) ? 1 : 0;
    var port      = (p.port>>>0) || 0;
    var hasRel    = !!p.hasRel;
    var relIsStr  = (hasRel && p.relIsMdns) ? 1 : 0;
    var relFamily = (p.relIpFamily|0) || 0;
    var relPort   = hasRel ? ((p.relPort>>>0)||0) : 0;
    var hasTcpType    = !!p.hasTcpType;
    var tcpType       = hasTcpType ? ((p.tcpType!=null)?(p.tcpType|0):mapTcpTypeNum(p.tcpTypeStr)) : undefined;
    var hasGen        = (p.generation!=null);
    var generation    = hasGen ? (p.generation|0) : undefined;
    var hasNetCost    = (p.networkCost!=null);
    var netCost       = hasNetCost ? (p.networkCost>>>0) : undefined;
    var foundIsNum    = !!p.foundationIsNumeric;
    var foundationNum = foundIsNum ? (p.foundationU32>>>0) : undefined;
    var foundationStr = foundIsNum ? undefined : (p.foundation||'');
    var mline   = (sdpMLineIndex==null) ? (p.mlineIndex|0) : (sdpMLineIndex|0);
    if (!(mline>=0 && mline<=255)) mline = 0;
    var midStr  = (sdpMid!=null)             ? (''+sdpMid)             : (p.sdpMid!=null?(''+p.sdpMid):'');
    var ufragStr= (usernameFragment!=null)   ? (''+usernameFragment)   : (p.ufrag!=null?(''+p.ufrag):'');

    var obj = {
      flags: {
        transport: trNum & 0x03,
        candType:  tyNum & 0x03,
        isIPv6:    (ipFamily===6) ? 1 : 0,
        hasRel:    hasRel ? 1 : 0,
        addrIsStr: addrIsStr,
        relIsStr:  (hasRel && relIsStr) ? 1 : 0,
        _reserved: 0
      },
      component: component & 0xFF,
      mline:     mline    & 0xFF,
      priority:  priority >>> 0,
      port:      port     >>> 0,
      tcpType:      hasTcpType ? (tcpType & 0xFF) : undefined,
      generation:   hasGen     ? (generation & 0xFF) : undefined,
      netCost:      hasNetCost ? (netCost & 0xFFFF) : undefined,
      foundationNum:foundIsNum ? (foundationNum >>> 0) : undefined,
      ipBytes:   (!addrIsStr) ? ipToBytes(p.ip, ipFamily) : undefined,
      relIpBytes:(hasRel && !relIsStr) ? ipToBytes(p.relIp, relFamily) : undefined,
      relPort:   hasRel ? (relPort >>> 0) : undefined,
      foundation:!foundIsNum ? (foundationStr||'') : undefined,
      addrStr:   addrIsStr   ? (p.ip||'') : undefined,
      relAddrStr:(hasRel && relIsStr) ? (p.relIp||'') : undefined,
      sdpMid:    (midStr   && midStr.length>0)   ? midStr   : undefined,
      ufrag:     (ufragStr && ufragStr.length>0) ? ufragStr : undefined
    };

    return litepack.encode(SCHEMA_CANDIDATE, obj);
  }

export function decode_candidate_binary(u8){
    if (!u8 || u8.length < 2) return null;
    u8 = (u8 instanceof Uint8Array) ? u8
       : (u8 instanceof ArrayBuffer) ? new Uint8Array(u8) : new Uint8Array(0);

    var d;
    try { d = litepack.decode(SCHEMA_CANDIDATE, u8); } catch(e) { return null; }
    if (!d) return null;

    var flags     = d.flags;
    var trNum     = flags.transport & 0x03;
    var tyNum     = flags.candType  & 0x03;
    var isIPv6    = flags.isIPv6;
    var hasRel    = flags.hasRel;
    var addrIsStr = flags.addrIsStr;
    var relIsStr  = flags.relIsStr;

    var transport = (trNum===1)?'tcp':'udp';
    var typeStr   = ['host','srflx','prflx','relay'][tyNum] || 'host';
    var tcpTypeStr= (d.tcpType!=null) ? (d.tcpType===0?'active':d.tcpType===1?'passive':'so') : null;

    function bytesToIp(bytes){
      if (!bytes) return null;
      if (bytes.length===4) return bytes[0]+'.'+bytes[1]+'.'+bytes[2]+'.'+bytes[3];
      if (bytes.length===16){
        var groups=[];
        for(var i=0;i<16;i+=2) groups.push(((bytes[i]<<8)|bytes[i+1]).toString(16));
        var bestStart=-1,bestLen=0,curStart=-1,curLen=0;
        for(var g=0;g<8;g++){
          if(groups[g]==='0'){
            if(curStart<0)curStart=g;
            curLen=g-curStart+1;
            if(curLen>bestLen){bestStart=curStart;bestLen=curLen;}
          }else{curStart=-1;curLen=0;}
        }
        if(bestLen>=2){
          return (groups.slice(0,bestStart).join(':')||'')+'::'+(groups.slice(bestStart+bestLen).join(':')||'');
        }
        return groups.join(':');
      }
      return null;
    }

    var ipStr    = addrIsStr ? (d.addrStr||null) : bytesToIp(d.ipBytes);
    var relIpStr = !hasRel   ? null
                 : (relIsStr ? (d.relAddrStr||null) : bytesToIp(d.relIpBytes));

    return {
      foundation:  (d.foundationNum!=null) ? (''+d.foundationNum) : (d.foundation||null),
      foundationU32: d.foundationNum!=null ? d.foundationNum : null,
      component_id: d.component,
      transport:    transport,
      transportNum: trNum,
      priority:     d.priority,
      address:      ipStr,
      port:         d.port,
      type:         typeStr,
      typeNum:      tyNum,
      relatedAddress: relIpStr,
      relatedPort:    hasRel ? (d.relPort||0) : 0,
      tcptype:      tcpTypeStr,
      generation:   d.generation!=null ? d.generation : null,
      network_cost: d.netCost!=null    ? d.netCost    : null,
      sdpMid:       d.sdpMid  || null,
      sdpMLineIndex:d.mline,
      ufrag:        d.ufrag   || null
    };
  }

export function stringify_candidate_line(dec){
  var foundation = (dec.foundation != null) ? String(dec.foundation) : '0';
  var component  = (dec.component_id != null) ? (dec.component_id|0) : 1;
  var transport  = (dec.transport || 'udp').toLowerCase(); // "udp"/"tcp" — match what browsers emit
  var priority   = (dec.priority>>>0) || 0;
  var address    = dec.address || '0.0.0.0';
  var port       = (dec.port>>>0) || 0;
  var type       = (dec.type || 'host').toLowerCase();

  var parts = [
    'candidate:' + foundation,
    String(component),
    transport,
    String(priority),
    address,
    String(port),
    'typ',
    type
  ];

  // --- Fix: srflx requires raddr/rport even without real values ---
  if (type === 'srflx'){
    var raddr = dec.relatedAddress || '0.0.0.0';
    var rport = (dec.relatedPort != null) ? (dec.relatedPort>>>0) : 0;
    parts.push('raddr', raddr, 'rport', String(rport));
  } else {
    // For other types: append only if present
    if (dec.relatedAddress && dec.relatedPort != null){
      parts.push('raddr', dec.relatedAddress, 'rport', String(dec.relatedPort>>>0));
    }
  }

  if (transport === 'tcp' && dec.tcptype){
    parts.push('tcptype', dec.tcptype);
  }
  if (dec.generation != null){
    parts.push('generation', String(dec.generation|0));
  }
  if (dec.network_id != null){
    parts.push('network-id', String(dec.network_id|0));
  }
  if (dec.network_cost != null){
    parts.push('network-cost', String(dec.network_cost>>>0));
  }
  return parts.join(' ');
}

  // Build a full RTCIceCandidateInit object for direct use with addIceCandidate
export function to_RTCIceCandidateInit_from_decoded(dec){
    if (!dec) return null;

    var candidateLine = stringify_candidate_line(dec);

    // Meta fields: sdpMid / sdpMLineIndex / usernameFragment
    // decode_candidate_binary already returned these if transmitted; otherwise fill externally
    var out = {
      candidate: candidateLine,
      sdpMid: (dec.sdpMid != null) ? String(dec.sdpMid) : null,
      sdpMLineIndex: (dec.sdpMLineIndex != null) ? (dec.sdpMLineIndex|0) : 0,
      usernameFragment: dec.ufrag || null
    };

    // Cleanup null fields if desired (not required; addIceCandidate handles null/undefined)
    // Can leave as-is.

    return out;
}

export function compress_sdp_min_viable(sdp_str){
    var sdp_obj = parse_sdp_dc_only(sdp_str);
    if (!sdp_obj) return null;

    // Hard defaults (any deviation → null, fall back to RAW/DEFLATE)
    if (!Array.isArray(sdp_obj.bundle.mids) || sdp_obj.bundle.mids.length !== 1) return null;
    if (sdp_obj.bundle.mids[0] !== "0") return null;
    if (sdp_obj.data.mid !== "0") return null;
    if (sdp_obj.data.proto !== "UDP/DTLS/SCTP") return null;
    if (sdp_obj.data.sctpPort !== 5000) return null;
    if (sdp_obj.msidSemantic !== "WMS") return null;
    if (sdp_obj.ice.lite) return null;
    if (!sdp_obj.ice.trickle) return null;
    if (sdp_obj.dtls.fingerprint.alg !== "sha-256") return null;

    // Required fields — note the nested shape returned by parse_sdp_dc_only:
    //   ice: { ufrag, pwd }, dtls: { setup, fingerprint: { alg, value } }
    var ufrag = sdp_obj.ice.ufrag || "";
    var pwd   = sdp_obj.ice.pwd   || "";
    var fpStr = sdp_obj.dtls.fingerprint.value || "";
    var setup = sdp_obj.dtls.setup || "";
    if (!ufrag || !pwd || !fpStr || !setup) return null;

    var setup_lc = setup.toLowerCase();
    if (['actpass','active','passive'].indexOf(setup_lc) === -1) return null;

    // Fingerprint as 32 bytes (sha-256)
    var parts = fpStr.trim().split(':');
    var fingerprint_bytes = new Uint8Array(parts.length);
    for (var i = 0; i < parts.length; i++) {
      var v = parseInt(parts[i], 16);
      if (isNaN(v)) return null;
      fingerprint_bytes[i] = v;
    }
    if (fingerprint_bytes.length !== 32) return null;

    var DEFAULT_MMS = 262144 >>> 0;
    var mms = (typeof sdp_obj.data.maxMessageSize === "number" && sdp_obj.data.maxMessageSize > 0)
                ? (sdp_obj.data.maxMessageSize >>> 0)
                : DEFAULT_MMS;

    try {
      return litepack.encode(SCHEMA_SDP_MIN, {
        setup:          setup_lc,
        maxMessageSize: mms,
        ufrag:          ufrag,
        pwd:            pwd,
        fingerprint:    fingerprint_bytes
      });
    } catch(e) { return null; }
  }

export function decompress_sdp_min_viable(data){
    var d;
    try { d = litepack.decode(SCHEMA_SDP_MIN, data); } catch(e){ return null; }
    if (!d || !d.setup || !d.ufrag || !d.pwd || !d.fingerprint) return null;

    var fp_u8 = d.fingerprint;
    if (fp_u8.length !== 32) return null;

    var fp_hex='', i, b;
    for (i=0;i<fp_u8.length;i++){
      if(i) fp_hex+=':';
      b=fp_u8[i].toString(16).toUpperCase();
      if(b.length<2) b='0'+b;
      fp_hex+=b;
    }

    var DEFAULT_MMS = 262144 >>> 0;
    var mms = (d.maxMessageSize && d.maxMessageSize>0) ? d.maxMessageSize : DEFAULT_MMS;

    var setup  = d.setup;
    var ufrag  = d.ufrag;
    var pwd    = d.pwd;

    // Build full SDP (DC-only) with "hard" defaults
    var s = '';
    s += 'v=0\r\n';
    s += 'o=- 0 0 IN IP4 127.0.0.1\r\n';
    s += 's=-\r\n';
    s += 't=0 0\r\n';
    s += 'a=group:BUNDLE 0\r\n';
    s += 'a=msid-semantic: WMS\r\n';

    s += 'm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
    s += 'c=IN IP4 0.0.0.0\r\n';
    s += 'a=mid:0\r\n';

    // ICE
    s += 'a=ice-ufrag:' + ufrag + '\r\n';
    s += 'a=ice-pwd:'   + pwd   + '\r\n';
    s += 'a=ice-options:trickle\r\n';

    // DTLS
    s += 'a=setup:' + d.setup + '\r\n';
    s += 'a=fingerprint:sha-256 ' + fp_hex + '\r\n';

    // SCTP / DataChannel
    s += 'a=sctp-port:5000\r\n';
    s += 'a=max-message-size:' + String(mms >>> 0) + '\r\n';

    return s;
  }


  
