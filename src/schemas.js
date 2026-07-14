/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// litepack wire-format schemas — single source of truth.

  // Outermost transport frame (wraps EVERYTHING on both signaling pipes).
  // [ kind(uint8) | body(tail) ]   kind 0 = whole message, kind 1 = a chunk.
  // kind 0 lets small messages travel with a single byte of overhead.
export var SCHEMA_SIGNAL_FRAME = [['kind','uint8'],['body','tail']];

  // A single fragment of an oversized signaling message.
  // [ msg_id(uint16) | index(varint) | total(varint) | payload(tail) ]
  // varint index/total → effectively unbounded chunk counts at ~zero cost.
export var SCHEMA_SIGNAL_CHUNK = [['msg_id','uint16'],['index','varint'],['total','varint'],['payload','tail']];

  // Outer signal envelope sent over the external signaling channel:
  // [ checksum(uint32) | payload(tail) ]
export var SCHEMA_SIGNAL_ENVELOPE = [['checksum','uint32'],['payload','tail']];

  // Inner signal frame (inside the envelope payload):
  // [ local_nonce(uint16) | remote_nonce(uint16) | type(uint8) | data(tail) ]
export var SCHEMA_SIGNAL_INNER = [['local_nonce','uint16'],['remote_nonce','uint16'],['type','uint8'],['data','tail']];

  // Data-channel message frame:
  // [ type(uint8) | data(tail) ]
export var SCHEMA_DC_MSG = [['type','uint8'],['data','tail']];

  // SDP offer/answer messages that carry just a seq + binary payload:
  // [ seq(uint16) | payload(tail) ]
export var SCHEMA_SEQ_PAYLOAD = [['seq','uint16'],['payload','tail']];

  // SDP diff messages that carry seq + two MurmurHash3 checksums + payload:
  // [ seq(uint16) | base_hash(uint32) | result_hash(uint32) | payload(tail) ]
export var SCHEMA_SEQ_HASH_HASH_PAYLOAD = [
    ['seq','uint16'],['base_hash','uint32'],['result_hash','uint32'],['payload','tail']
  ];

  // NEGOTIATION_DONE message: [ seq(uint16) | epoch(uint16) ]
export var SCHEMA_NEG_DONE = [['seq','uint16'],['epoch','uint16']];

  // FAILD_DECOMPRESS message: [ failed_type(uint8) | seq(uint16) ]
export var SCHEMA_FAILD_DECOMPRESS = [['failed_type','uint8'],['seq','uint16']];

  // TOTAL_ICE_CANDIDATE message: [ total(uint16) | ufrag(tail) ]
export var SCHEMA_TOTAL_ICE = [['total','uint16'],['ufrag','tail']];

  // Bare acknowledgement: [ seq(uint16) ]  (used by MEDIASTREAM_MAP_ACK)
export var SCHEMA_ACK = [['seq','uint16']];

  // Ping/pong RTT probe. The same schema is used for both PING and PONG:
  // the responder echoes back the exact timestamp it received, so the original
  // sender can compute round-trip time against its own clock (no clock sync
  // needed). 'varint' comfortably holds a Date.now() value.
export var SCHEMA_PING = [['timestamp','varint']];

  // SDP "min-viable" compact encoding for data-channel-only peers
export var SCHEMA_SDP_MIN = [
    ['setup',          'enum',  ['actpass','active','passive']],
    ['maxMessageSize', 'uint32'],
    ['ufrag',          'string'],
    ['pwd',            'string'],
    ['fingerprint',    'fixed', 32]
  ];

  // ICE candidate compact encoding
export var SCHEMA_CANDIDATE = [
    // Packed semantic flags (16 bits → 2 bytes)
    ['flags', 'bits', [
      ['transport',  2],  // 0=udp  1=tcp
      ['candType',   2],  // 0=host 1=srflx 2=prflx 3=relay
      ['isIPv6',     1],
      ['hasRel',     1],
      ['addrIsStr',  1],  // mDNS / non-IP main address
      ['relIsStr',   1],  // mDNS / non-IP related address
      ['_reserved',  8]
    ]],
    // Fixed mandatory fields
    ['component',    'uint8'],
    ['mline',        'uint8'],
    ['priority',     'uint32'],
    ['port',         'uint16'],
    // Optional extras — litepack tracks presence via a leading bitmask
    ['tcpType',      'uint8?'],
    ['generation',   'uint8?'],
    ['netCost',      'uint16?'],
    ['foundationNum','uint32?'],
    // Binary IP bytes (4 = IPv4, 16 = IPv6); absent when address is a string (mDNS)
    ['ipBytes',      'bytes?'],
    ['relIpBytes',   'bytes?'],
    ['relPort',      'uint16?'],
    // String fields (foundation string, mDNS addresses, sdpMid, ufrag)
    ['foundation',   'string?'],
    ['addrStr',      'string?'],
    ['relAddrStr',   'string?'],
    ['sdpMid',       'string?'],
    ['ufrag',        'string?']
  ];

  // ===== Utility helpers =====
