/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// Connection trace (opts.trace): a record of everything a connection did —
// the RTCPeerConnection calls and their results, its events, the engine's own
// signaling and decisions, getStats over time, and how loaded the machine was
// — as plain JSON, for debugging after the fact.
//
// Nothing here runs unless the option is on: no wrapping, no timers, no
// observers, no measuring. Same code in the browser and in Node.
//
// An entry: { t: Date.now(), ev: name, d: data }.
//   - opts.trace = true            keep entries; peer.getTrace() returns them
//   - opts.trace = function(entry) also call it with each entry as it is made
//                                  (to stream them — e.g. to a Service Worker,
//                                  so they survive the tab being closed)
//   - opts.trace = { onEntry, head, tail }   the same, with the limits below
//
// Bounded, as a head and a tail: the first `head` entries (how the connection
// came up — where most problems are) and the last `tail` (what happened just
// before the end), with a 'trace.dropped' entry between them saying how many
// in the middle were let go.

var DEFAULT_HEAD = 2000;
var DEFAULT_TAIL = 5000;

// getStats: every poll (~1s) for the first 30s and for 10s after anything
// noteworthy (a state change, an error, an ICE restart, a re-send), every
// ~5s in between. Only what changed since the last recorded report.
var STATS_FAST_MS = 900;
var STATS_SLOW_MS = 4900;
var STATS_FAST_START_MS = 30000;
var STATS_FAST_AFTER_EVENT_MS = 10000;

// While ICE is checking: candidate pairs, every 100ms.
var ICE_POLL_MS = 100;

// Report types worth keeping. Not 'certificate' (fixed, large) — and the
// delta drops what does not change anyway (a codec after its first time).
var STATS_TYPES = {
  'transport': 1, 'candidate-pair': 1, 'local-candidate': 1, 'remote-candidate': 1,
  'data-channel': 1, 'peer-connection': 1, 'codec': 1,
  'inbound-rtp': 1, 'outbound-rtp': 1, 'remote-inbound-rtp': 1, 'remote-outbound-rtp': 1,
  'media-source': 1, 'media-playout': 1
};

export function createTrace(option) {
  if (!option) return null;
  var onEntry = null, headMax = DEFAULT_HEAD, tailMax = DEFAULT_TAIL;
  if (typeof option === 'function') onEntry = option;
  else if (typeof option === 'object') {
    if (typeof option.onEntry === 'function') onEntry = option.onEntry;
    if (option.head >= 0) headMax = option.head | 0;
    if (option.tail >= 0) tailMax = option.tail | 0;
  }

  var head = [];
  var tail = [];        // ring buffer once full
  var tailStart = 0;
  var dropped = 0;
  var startedAt = Date.now();
  var closed = false;

  var statsPrev = Object.create(null);     // report id → last recorded values
  var statsLastAt = 0;
  var statsFastUntil = startedAt + STATS_FAST_START_MS;
  var eluPrev = null;

  function rec(ev, d) {
    if (closed) return;
    var e = { t: Date.now(), ev: ev, d: d === undefined ? null : d };
    if (head.length < headMax) head.push(e);
    else if (tailMax > 0) {
      if (tail.length < tailMax) tail.push(e);
      else { tail[tailStart] = e; tailStart = (tailStart + 1) % tailMax; dropped++; }
    } else dropped++;
    if (onEntry) { try { onEntry(e); } catch (err) {} }
  }

  // Something worth looking closely around: stats at full rate for a while.
  function mark() {
    var until = Date.now() + STATS_FAST_AFTER_EVENT_MS;
    if (until > statsFastUntil) statsFastUntil = until;
  }

  function entries() {
    var out = head.slice();
    if (dropped > 0) out.push({ t: (tail[tailStart] || {}).t || Date.now(), ev: 'trace.dropped', d: { count: dropped } });
    for (var i = 0; i < tail.length; i++) out.push(tail[(tailStart + i) % tail.length]);
    return out;
  }

  // A getStats report (RTCStatsReport, or anything with forEach), and the
  // engine's own counters to go with it. Called on every poll; records only
  // at the rate above.
  function stats(report, extra, pc) {
    if (closed) return;
    media(report);   // every poll: a stream that stops is a moment, not a sample
    ice(report, pc); // every poll too: each pair's state, as it changes
    var now = Date.now();
    if (now - statsLastAt < (now < statsFastUntil ? STATS_FAST_MS : STATS_SLOW_MS)) return;
    statsLastAt = now;

    var all = Object.create(null);
    var selectedPair = null;
    report.forEach(function (r) {
      if (!STATS_TYPES[r.type]) return;
      all[r.id] = r;
      if (r.type === 'transport' && r.selectedCandidatePairId) selectedPair = r.selectedCandidatePairId;
    });
    // Pairs and candidates: the selected pair and its two candidates only
    // (its bytes, available bitrate, RTT). The state of every pair is in the
    // 'ice.pair' entries.
    var keepIds = Object.create(null);
    if (selectedPair && all[selectedPair]) {
      keepIds[selectedPair] = 1;
      if (all[selectedPair].localCandidateId) keepIds[all[selectedPair].localCandidateId] = 1;
      if (all[selectedPair].remoteCandidateId) keepIds[all[selectedPair].remoteCandidateId] = 1;
    }

    var delta = {}, any = false, id;
    for (id in all) {
      var r = all[id];
      if ((r.type === 'candidate-pair' || r.type === 'local-candidate' || r.type === 'remote-candidate') && !keepIds[id]) { delete statsPrev[id]; continue; }
      var prev = statsPrev[id], cur = {}, changed = {}, n = 0;
      for (var k in r) {
        if (k === 'id' || k === 'timestamp') continue;
        var v = r[k];
        if (typeof v === 'function') continue;
        cur[k] = v;
        if (!prev || !sameValue(prev[k], v)) { changed[k] = v; n++; }
      }
      statsPrev[id] = cur;
      if (n > 0) { delta[id] = changed; any = true; }
    }
    // Reports that went away (a candidate pair dropped, a channel closed).
    for (id in statsPrev) {
      if (!all[id]) { delete statsPrev[id]; delta[id] = null; any = true; }
    }

    var d = { reports: any ? delta : {} };
    if (extra) d.engine = extra;
    var load = cpuNode();
    if (load) d.cpu = load;
    rec('getStats', d);
  }

  // ── Media: is each stream flowing, in each direction ──
  //
  // One 'media' entry per RTP stream each time its picture changes — from
  // every getStats poll, not only the ones recorded: started flowing, stopped
  // ('stalled'), a new resolution, codec or quality limit, turned on or off.
  // A stream is an outbound-rtp (one per simulcast layer — `rid`) or an
  // inbound-rtp; it flows while its frame (video) or packet (audio) count
  // goes up between two polls. States: 'flowing'; 'stalled' (it was flowing
  // and stopped — a problem); 'off' (sending, switched off — active:false);
  // 'removed' (its stream taken off — the tag went away); 'none' (nothing
  // yet); 'gone' (the report itself went away).
  var mediaPrev = Object.create(null);   // report id → last picture
  var midToTag = null;                   // set by the engine: (mid, dir) → its tag

  function media(report) {
    var codecs = null, seen = Object.create(null);
    report.forEach(function (r) {
      if (r.type === 'codec') (codecs || (codecs = Object.create(null)))[r.id] = r.mimeType;
    });
    report.forEach(function (r) {
      var send = r.type === 'outbound-rtp';
      if (!send && r.type !== 'inbound-rtp') return;
      seen[r.id] = 1;
      var video = r.kind === 'video';
      // Frames for video, packets for audio — packets where a binding has no frame counts.
      var count = send ? (video && r.framesSent != null ? r.framesSent : r.packetsSent)
                       : (video && r.framesDecoded != null ? r.framesDecoded : r.packetsReceived);
      var prev = mediaPrev[r.id];
      var mid = r.mid != null ? r.mid : null;
      var tag = null;
      if (midToTag && mid != null) { try { tag = midToTag(mid, send ? 'send' : 'recv'); } catch (e) {} }
      var state;
      if (prev && count > prev.count) state = 'flowing';
      // A layer (or sender) switched off with setParameters({active:false}):
      // not sending on purpose — 'off', not a stall.
      else if (send && r.active === false) state = 'off';
      // Stopped with its stream taken off (the tag mapping went away — the
      // engine's MEDIASTREAM_MAP): removed on purpose, not a stall.
      else if (prev && prev.tagged && tag == null) state = 'removed';
      else if (prev && (prev.state === 'flowing' || prev.state === 'stalled')) state = 'stalled';
      else state = (count > 0 && !prev) ? 'flowing' : 'none';
      var pic = {
        dir: send ? 'send' : 'recv',
        kind: r.kind,
        mid: mid,
        state: state,
        codec: codecs && r.codecId ? (codecs[r.codecId] || null) : null
      };
      if (r.rid != null) pic.rid = r.rid;
      if (send && r.active !== undefined) pic.active = r.active;
      if (video) {
        pic.width = r.frameWidth != null ? r.frameWidth : null;
        pic.height = r.frameHeight != null ? r.frameHeight : null;
        pic.fps = r.framesPerSecond != null ? r.framesPerSecond : null;
      }
      if (send && r.qualityLimitationReason !== undefined) pic.limit = r.qualityLimitationReason;
      if (send && r.scalabilityMode) pic.scalabilityMode = r.scalabilityMode;
      var changed = !prev || prev.state !== state || prev.codec !== pic.codec || prev.width !== pic.width ||
                    prev.height !== pic.height || prev.limit !== pic.limit || prev.active !== pic.active;
      changed = changed || (prev && prev.tag !== tag);
      mediaPrev[r.id] = { count: count, state: state, codec: pic.codec, width: pic.width, height: pic.height,
                          limit: pic.limit, active: pic.active, dir: pic.dir, kind: pic.kind, mid: pic.mid, rid: pic.rid, tag: tag,
                          tagged: (prev && prev.tagged) || tag != null };
      if (!changed) return;
      if (tag != null) pic.tag = tag;
      pic.stream = r.id;
      rec('media', pic);
      if (state === 'stalled' && (!prev || prev.state !== 'stalled')) mark();
    });
    for (var id in mediaPrev) {
      if (seen[id]) continue;
      var p = mediaPrev[id];
      delete mediaPrev[id];
      rec('media', { dir: p.dir, kind: p.kind, mid: p.mid, rid: p.rid, state: 'gone', stream: id });
    }
  }

  // ── ICE: every candidate pair, each time its state changes ──
  //
  // One 'ice.pair' entry when a pair appears and each time its state
  // (frozen / waiting / in-progress / succeeded / failed), nominated or
  // selected changes; 'gone' when it goes away. Each entry carries both
  // candidates (type, protocol, address, port, relay) and the check
  // counters, so the entry reads on its own. Per connection: the engine may
  // replace the RTCPeerConnection.
  var icePerPc = typeof WeakMap === 'function' ? new WeakMap() : null;
  var iceDefault = { prev: Object.create(null), ts: 0 };

  function ice(report, pc) {
    if (closed || !report) return;
    var st = iceDefault;
    if (pc && icePerPc) {
      st = icePerPc.get(pc);
      if (!st) { st = { prev: Object.create(null), ts: 0 }; icePerPc.set(pc, st); }
    }
    var cands = Object.create(null), pairs = [], selected = null, ts = 0;
    report.forEach(function (r) {
      if (r.timestamp > ts) ts = r.timestamp;
      if (r.type === 'local-candidate' || r.type === 'remote-candidate') cands[r.id] = r;
      else if (r.type === 'candidate-pair') pairs.push(r);
      else if (r.type === 'transport' && r.selectedCandidatePairId) selected = r.selectedCandidatePairId;
    });
    // Two pollers (the one while ICE is checking, and the engine's): never
    // step back to an older report that resolved late.
    if (ts && ts < st.ts) return;
    if (ts) st.ts = ts;

    var seen = Object.create(null);
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      seen[p.id] = 1;
      var sel = selected ? p.id === selected : p.selected === true;
      var nom = p.nominated === true;
      var prev = st.prev[p.id];
      if (prev && prev.state === p.state && prev.nominated === nom && prev.selected === sel) continue;
      var d = { pair: p.id, state: p.state };
      if (prev) d.from = prev.state;
      d.nominated = nom;
      d.selected = sel;
      d.local = candInfo(cands[p.localCandidateId]);
      d.remote = candInfo(cands[p.remoteCandidateId]);
      st.prev[p.id] = { state: p.state, nominated: nom, selected: sel, local: d.local, remote: d.remote };
      if (p.currentRoundTripTime != null) d.rtt = Math.round(p.currentRoundTripTime * 1000);
      if (p.requestsSent != null) d.requestsSent = p.requestsSent;
      if (p.responsesReceived != null) d.responsesReceived = p.responsesReceived;
      if (p.requestsReceived != null) d.requestsReceived = p.requestsReceived;
      if (p.responsesSent != null) d.responsesSent = p.responsesSent;
      rec('ice.pair', d);
    }
    for (var id in st.prev) {
      if (seen[id]) continue;
      var g = st.prev[id];
      delete st.prev[id];
      rec('ice.pair', { pair: id, state: 'gone', from: g.state, nominated: g.nominated, selected: g.selected, local: g.local, remote: g.remote });
    }
  }

  // Node: how busy this thread's event loop was since the last sample
  // (0..1). Only while tracing, and only here — at the stats rate.
  function cpuNode() {
    var p = typeof performance !== 'undefined' ? performance : null;
    if (!p || typeof p.eventLoopUtilization !== 'function') return null;
    var cur = p.eventLoopUtilization();
    var u = eluPrev ? p.eventLoopUtilization(cur, eluPrev).utilization : cur.utilization;
    eluPrev = cur;
    return { elu: Math.round(u * 1000) / 1000 };
  }

  var self = {
    rec: rec,
    mark: mark,
    stats: stats,
    ice: ice,
    setMidToTag: function (fn) { midToTag = fn; },
    get: function () {
      return {
        format: 'stable-webrtc-trace',
        version: 1,
        startedAt: startedAt,
        dropped: dropped,
        entries: entries()
      };
    },
    close: function () {
      if (closed) return;
      rec('trace.end', null);
      closed = true;
      pressureRemove(self);
    }
  };
  pressureAdd(self);
  return self;
}

function sameValue(a, b) {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }
  return false;
}

// ── Browser: how loaded the device's CPU is (Compute Pressure API) ──
//
// One observer for the page, while at least one connection is traced; each
// change of state goes into every traced connection, and a trace starting
// gets the current state. Chromium only (and secure contexts); elsewhere
// there is simply no 'cpu' entry.
var pressureTraces = [];
var pressureObserver = null;
var pressureState = null;

function pressureAdd(t) {
  if (typeof PressureObserver === 'undefined') return;
  pressureTraces.push(t);
  if (pressureState) t.rec('cpu', { state: pressureState });
  if (pressureObserver) return;
  try {
    pressureObserver = new PressureObserver(function (records) {
      var last = records[records.length - 1];
      if (!last || last.state === pressureState) return;
      pressureState = last.state;
      for (var i = 0; i < pressureTraces.length; i++) {
        pressureTraces[i].rec('cpu', { state: pressureState });
        pressureTraces[i].mark();
      }
    });
    var p = pressureObserver.observe('cpu', { sampleInterval: 1000 });
    if (p && typeof p.catch === 'function') p.catch(function () {});
  } catch (e) {
    pressureObserver = null;
  }
}

function pressureRemove(t) {
  var i = pressureTraces.indexOf(t);
  if (i === -1) return;
  pressureTraces.splice(i, 1);
  if (pressureTraces.length === 0 && pressureObserver) {
    try { pressureObserver.disconnect(); } catch (e) {}
    pressureObserver = null;
    pressureState = null;
  }
}

// ── RTCPeerConnection: its calls and their results, and its events ──
//
// Wraps the methods of this one instance (not the prototype) — only for a
// traced connection. SDP: in full the first time in each direction, then as
// the lines added and removed since the previous one.
export function tracePeerConnection(pc, T) {
  var lastSdp = { local: null, remote: null };
  var traced = typeof WeakSet === 'function' ? new WeakSet() : null;
  function once(o) {
    if (!o || !traced) return false;
    if (traced.has(o)) return false;
    traced.add(o);
    return true;
  }
  // Every transceiver the connection has — ours (addTrack/addTransceiver)
  // and those a remote offer created — once each.
  function sweepTransceivers() {
    if (typeof pc.getTransceivers !== 'function') return;
    var list;
    try { list = pc.getTransceivers(); } catch (e) { return; }
    for (var i = 0; i < list.length; i++) traceTransceiver(list[i], T, once);
  }

  function sdpRecord(dir, desc) {
    if (!desc) return desc === undefined ? undefined : null;
    var type = desc.type, sdp = desc.sdp;
    if (typeof sdp !== 'string') return { type: type };
    var prev = lastSdp[dir];
    lastSdp[dir] = sdp;
    if (prev === null) return { type: type, sdp: sdp };
    if (prev === sdp) return { type: type, same: true };
    return { type: type, diff: lineDiff(prev, sdp) };
  }

  function wrap(name, argFn, resFn) {
    var orig = pc[name];
    if (typeof orig !== 'function') return;
    pc[name] = function () {
      var args = arguments;
      T.rec(name, argFn ? argFn.apply(null, args) : null);
      var r;
      try {
        r = orig.apply(pc, args);
      } catch (err) {
        T.rec(name + 'OnFailure', errText(err));
        T.mark();
        throw err;
      }
      if (r && typeof r.then === 'function') {
        return r.then(function (v) {
          T.rec(name + 'OnSuccess', resFn ? resFn(v) : null);
          return v;
        }, function (err) {
          T.rec(name + 'OnFailure', errText(err));
          T.mark();
          throw err;
        });
      }
      if (resFn) T.rec(name + 'OnSuccess', resFn(r));
      return r;
    };
  }

  wrap('createOffer', function (o) { return o || null; }, function (d) { return sdpRecord('local', d); });
  wrap('createAnswer', function (o) { return o || null; }, function (d) { return sdpRecord('local', d); });
  wrap('setLocalDescription', function (d) {
    if (!d) return null;   // implicit: the result is in localDescription
    return d.sdp === lastSdp.local ? { type: d.type, same: true } : sdpRecord('local', d);
  }, function () { return sdpRecord('local', pc.localDescription); });
  wrap('setRemoteDescription', function (d) { return sdpRecord('remote', d); }, function () { sweepTransceivers(); return null; });
  wrap('addIceCandidate', function (c) { return candText(c); }, null);
  wrap('restartIce', null, null);
  wrap('setConfiguration', function (c) { return configText(c); }, null);
  wrap('close', null, null);
  wrap('createDataChannel', function (label, init) { return { label: label, init: init || null }; }, function (dc) {
    traceDataChannel(dc, T);
    return { id: dc && dc.id, label: dc && dc.label };
  });
  wrap('addTrack', function (track) { return trackText(track); }, function (sender) {
    sweepTransceivers();
    if (sender) traceSender(sender, null, T, once);
    return null;
  });
  wrap('removeTrack', function (sender) { return { track: sender && trackText(sender.track) }; }, null);
  wrap('addTransceiver', function (t, init) {
    return { what: typeof t === 'string' ? t : trackText(t), init: init ? encodingsInit(init) : null };
  }, function (tc) {
    if (tc) traceTransceiver(tc, T, once);
    return tc ? { mid: tc.mid } : null;
  });

  function on(name, fn) {
    if (typeof pc.addEventListener === 'function') pc.addEventListener(name, fn);
  }
  on('icecandidate', function (e) {
    var c = e && e.candidate;
    if (!c) { T.rec('onicecandidate', null); return; }
    var d = candText(c);
    if (c.url) d.url = c.url;
    if (c.relayProtocol) d.relayProtocol = c.relayProtocol;
    T.rec('onicecandidate', d);
  });
  on('icecandidateerror', function (e) {
    T.rec('onicecandidateerror', { address: e.address, port: e.port, url: e.url, errorCode: e.errorCode, errorText: e.errorText });
  });
  ['signalingState', 'iceConnectionState', 'connectionState', 'iceGatheringState'].forEach(function (s) {
    on(s.toLowerCase() + 'change', function () { T.rec('on' + s.toLowerCase() + 'change', pc[s]); T.mark(); });
  });

  // While ICE is checking (or disconnected, looking for a path again) pair
  // states change within milliseconds, and the engine does not poll getStats
  // yet (it starts once the data channel opens): sample here, often, only
  // then. One more sample just after it leaves (connected / failed), for the pairs'
  // state at that moment.
  var icePollTimer = null, icePollBusy = false, icePollAgain = false;
  function iceChecking() {
    var s = pc.iceConnectionState;
    return s === 'checking' || s === 'disconnected';
  }
  function icePoll() {
    icePollTimer = null;
    if (icePollBusy) { icePollAgain = true; return; }   // a state change while a sample is out
    if (typeof pc.getStats !== 'function' || pc.signalingState === 'closed') return;
    var r;
    try { r = pc.getStats(); } catch (e) { return; }
    if (!r || typeof r.then !== 'function') return;
    icePollBusy = true;
    r.then(function (report) {
      icePollBusy = false;
      T.ice(report, pc);
      if (icePollAgain) { icePollAgain = false; icePollTimer = setTimeout(icePoll, ICE_POLL_MS); }
      else icePollNext();
    }, function () { icePollBusy = false; icePollAgain = false; });
  }
  function icePollNext() {
    if (icePollTimer === null && iceChecking()) icePollTimer = setTimeout(icePoll, ICE_POLL_MS);
  }
  on('iceconnectionstatechange', function () {
    var s = pc.iceConnectionState;
    if (s === 'closed') {
      if (icePollTimer !== null) { clearTimeout(icePollTimer); icePollTimer = null; }
      return;
    }
    // A little after the change, not at once: getStats answers from a
    // short-lived cache, which would still hold the pairs as they were.
    if (icePollTimer !== null) { clearTimeout(icePollTimer); icePollTimer = null; }
    if (icePollBusy) icePollAgain = true;
    else icePollTimer = setTimeout(icePoll, ICE_POLL_MS);   // continues while checking
  });
  on('negotiationneeded', function () { T.rec('onnegotiationneeded', null); });
  on('datachannel', function (e) {
    var dc = e && e.channel;
    T.rec('ondatachannel', { id: dc && dc.id, label: dc && dc.label });
    if (dc) traceDataChannel(dc, T);
  });
  on('track', function (e) {
    T.rec('ontrack', { mid: e.transceiver ? e.transceiver.mid : null, track: trackText(e.track), streams: (e.streams || []).map(function (s) { return s.id; }) });
    if (e.track) traceTrack(e.track, 'remote', T, once);
    if (e.transceiver) traceTransceiver(e.transceiver, T, once);
  });
}

// A transceiver: its direction (set by the application or the engine, which
// recycles transceivers), stop(), codec preferences; and its sender.
function traceTransceiver(tc, T, once) {
  if (!once(tc)) return;
  wrapMethod(tc, 'stop', T, 'transceiver.stop', function () { return { mid: tc.mid }; }, null);
  wrapMethod(tc, 'setCodecPreferences', T, 'setCodecPreferences', function (codecs) {
    return { mid: tc.mid, codecs: (codecs || []).map(function (c) { return c.mimeType + (c.sdpFmtpLine ? ';' + c.sdpFmtpLine : ''); }) };
  }, null);
  watchProperty(tc, 'direction', function (from, to) {
    if (from !== to) T.rec('transceiver.direction', { mid: tc.mid, from: from, to: to });
  });
  if (tc.sender) traceSender(tc.sender, tc, T, once);
  if (tc.receiver && tc.receiver.track) traceTrack(tc.receiver.track, 'remote', T, once);
}

// A sender: replaceTrack (how the engine swaps media without renegotiating)
// and setParameters — the encodings in full, which is what turns simulcast
// layers on and off and caps their bitrate, frame rate and resolution.
function traceSender(sender, tc, T, once) {
  if (!once(sender)) return;
  var mid = function () { return tc ? tc.mid : null; };
  wrapMethod(sender, 'replaceTrack', T, 'replaceTrack', function (track) {
    if (track) traceTrack(track, 'local', T, once);
    return { mid: mid(), from: trackText(sender.track), to: trackText(track) };
  }, null);
  wrapMethod(sender, 'setParameters', T, 'setParameters', function (p) {
    return { mid: mid(), encodings: p && p.encodings ? p.encodings.map(encodingText) : null,
             degradationPreference: p && p.degradationPreference || null };
  }, null);
  if (sender.track) traceTrack(sender.track, 'local', T, once);
}

function traceTrack(track, side, T, once) {
  if (!once(track) || typeof track.addEventListener !== 'function') return;
  ['mute', 'unmute', 'ended'].forEach(function (n) {
    track.addEventListener(n, function () {
      T.rec('track.' + n, { side: side, id: track.id, kind: track.kind });
      T.mark();
    });
  });
}

function encodingText(e) {
  var o = {};
  ['rid', 'active', 'maxBitrate', 'maxFramerate', 'scaleResolutionDownBy', 'scalabilityMode', 'priority', 'networkPriority'].forEach(function (k) {
    if (e[k] !== undefined) o[k] = e[k];
  });
  return o;
}

function encodingsInit(init) {
  var o = {};
  if (init.direction) o.direction = init.direction;
  if (init.sendEncodings) o.sendEncodings = init.sendEncodings.map(encodingText);
  if (init.streams) o.streams = init.streams.map(function (s) { return s.id; });
  return o;
}

// The method `name` of this one object, recorded with its result.
function wrapMethod(obj, name, T, label, argFn, resFn) {
  var orig = obj[name];
  if (typeof orig !== 'function') return;
  obj[name] = function () {
    var args = arguments;
    T.rec(label, argFn ? argFn.apply(null, args) : null);
    var r;
    try { r = orig.apply(obj, args); }
    catch (err) { T.rec(label + 'OnFailure', errText(err)); T.mark(); throw err; }
    if (r && typeof r.then === 'function') {
      return r.then(function (v) { T.rec(label + 'OnSuccess', resFn ? resFn(v) : null); return v; },
                    function (err) { T.rec(label + 'OnFailure', errText(err)); T.mark(); throw err; });
    }
    return r;
  };
}

// Hear every assignment to obj[prop] on this one object: the prototype's
// accessor (browsers), or the plain value it holds (some bindings).
function watchProperty(obj, prop, fn) {
  var proto = obj, desc = null;
  while (proto && !desc) { desc = Object.getOwnPropertyDescriptor(proto, prop); if (!desc) proto = Object.getPrototypeOf(proto); }
  if (!desc) return;
  try {
    if (desc.get || desc.set) {
      if (!desc.set) return;
      Object.defineProperty(obj, prop, {
        configurable: true, enumerable: desc.enumerable,
        get: function () { return desc.get ? desc.get.call(obj) : undefined; },
        set: function (v) { var from = desc.get ? desc.get.call(obj) : undefined; desc.set.call(obj, v); fn(from, v); }
      });
    } else if (proto === obj && desc.configurable && desc.writable) {
      var value = desc.value;
      Object.defineProperty(obj, prop, {
        configurable: true, enumerable: desc.enumerable,
        get: function () { return value; },
        set: function (v) { var from = value; value = v; fn(from, v); }
      });
    }
  } catch (e) {}
}

function traceDataChannel(dc, T) {
  if (!dc || typeof dc.addEventListener !== 'function') return;
  var who = { id: dc.id, label: dc.label };
  ['open', 'closing', 'close'].forEach(function (n) {
    dc.addEventListener(n, function () { T.rec('datachannel.' + n, who); T.mark(); });
  });
  dc.addEventListener('error', function (e) {
    var err = e && (e.error || e);
    T.rec('datachannel.error', { id: who.id, label: who.label, error: errText(err) });
    T.mark();
  });
}

function candInfo(c) {
  if (!c) return null;
  var o = { type: c.candidateType, protocol: c.protocol, address: c.address != null ? c.address : (c.ip != null ? c.ip : null), port: c.port };
  if (c.relayProtocol) o.relayProtocol = c.relayProtocol;
  if (c.url) o.url = c.url;
  if (c.networkType) o.networkType = c.networkType;
  return o;
}

function candText(c) {
  if (!c) return null;
  return { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment };
}

function trackText(t) {
  if (!t || typeof t !== 'object') return t || null;
  return { id: t.id, kind: t.kind, label: t.label, enabled: t.enabled, muted: t.muted, readyState: t.readyState };
}

function configText(c) {
  if (!c) return null;
  var out = {};
  for (var k in c) {
    if (k === 'certificates') { out[k] = (c[k] || []).length; continue; }
    if (k === 'iceServers') {
      // Credentials stay out of the trace; the servers themselves stay in.
      out[k] = (c[k] || []).map(function (s) { return { urls: s.urls, username: s.username ? '(set)' : undefined }; });
      continue;
    }
    out[k] = c[k];
  }
  return out;
}

export function errText(err) {
  if (!err) return null;
  if (typeof err === 'string') return err;
  return (err.name ? err.name + ': ' : '') + (err.message || String(err));
}

// The lines of `b` not in `a`, and of `a` not in `b` (as multisets) — enough
// to see what a renegotiation changed.
function lineDiff(a, b) {
  var la = a.split(/\r?\n/), lb = b.split(/\r?\n/);
  var count = Object.create(null), i;
  for (i = 0; i < la.length; i++) count[la[i]] = (count[la[i]] || 0) + 1;
  var add = [];
  for (i = 0; i < lb.length; i++) {
    if (count[lb[i]] > 0) count[lb[i]]--;
    else if (lb[i] !== '') add.push(lb[i]);
  }
  var del = [];
  for (var line in count) {
    for (var n = 0; n < count[line]; n++) if (line !== '') del.push(line);
  }
  return { add: add, del: del };
}
