/*
 * stable-webrtc — Apache-2.0 — https://github.com/colocohen/stable-webrtc
 */

// The connection engine: shared-certificate cache, message codes, and the
// StableWebRTC constructor (all per-connection state lives in its closure).

import litepack from 'litepack';
import * as compactDelta from 'compact-delta';
import {
  toU8, murmurhash3_str, murmurhash3_data, Emitter,
  isMediaStream, isMediaStreamTrack, isTrackEqual,
  is_ipv6_addr, strip_brackets, is_public_ip
} from './util.js';
import {
  compress_deflate, decompress_deflate, decompress_deflate_bytes
} from './deflate.js';
import { build_chunks, reassemble_chunk } from './chunking.js';
import {
  is_support_trickle_ice, get_fingerprint_from_sdp, get_ufrag_from_sdp,
  parse_candidate, remove_all_ice_candidates
} from './sdp.js';
import {
  encode_candidate_binary, decode_candidate_binary,
  to_RTCIceCandidateInit_from_decoded,
  compress_sdp_min_viable, decompress_sdp_min_viable
} from './codec.js';
import {
  SCHEMA_SIGNAL_ENVELOPE, SCHEMA_SIGNAL_INNER, SCHEMA_DC_MSG,
  SCHEMA_SEQ_PAYLOAD, SCHEMA_SEQ_HASH_HASH_PAYLOAD, SCHEMA_NEG_DONE,
  SCHEMA_FAILED_DECOMPRESS, SCHEMA_TOTAL_ICE,
  SCHEMA_SIGNAL_FRAME, SCHEMA_SIGNAL_CHUNK, SCHEMA_ACK, SCHEMA_PING
} from './schemas.js';

export default StableWebRTC;

// Reusable codecs — TextEncoder/TextDecoder are stateless; share one each
// instead of allocating per message.
var _TE = new TextEncoder();
var _TD = new TextDecoder();

  var cert_wrtc_state = "idle";
  var cert_wrtc_obj = null;
  var cert_wrtc_waiters = [];   // array of callbacks (err, cert)
  var cert_wrtc_expires_at = 0; // millis (Date.now())

  function cert_wrtc_is_valid(){
    if (!cert_wrtc_obj) return false;
    var exp = (typeof cert_wrtc_obj.expires === "number") ? cert_wrtc_obj.expires : cert_wrtc_expires_at;
    if (!exp) return true; // If no expiration date — treat as valid
    var safetyMs = 60 * 1000; // 1 minute safety margin
    return (Date.now() + safetyMs) < exp;
  }

  function cert_wrtc_flush_waiters(err, cert){
    for (var i=0;i<cert_wrtc_waiters.length;i++){
      try { cert_wrtc_waiters[i](err, cert); } catch (e) { /* don't block others */ }
    }
    cert_wrtc_waiters.length = 0;
  }

  function cert_wrtc_start_generate(){
    cert_wrtc_state = "generating";

    // Fast and common default
    var genParams = { name: "ECDSA", namedCurve: "P-256" };

    var p;
    try {
      p = RTCPeerConnection.generateCertificate(genParams);
    } catch (e){
      cert_wrtc_state = "failed";
      cert_wrtc_flush_waiters(e, null);
      return;
    }

    p.then(function(cert){
      cert_wrtc_obj = cert;
      // If browser has expires — use it; otherwise leave 0 (unknown)
      cert_wrtc_expires_at = (typeof cert.expires === "number") ? (cert.expires|0) : 0;
      cert_wrtc_state = "ready";
      cert_wrtc_flush_waiters(null, cert);
    }, function(err){
      cert_wrtc_state = "failed";
      cert_wrtc_flush_waiters(err, null);
    });
  }

  // Main API: returns shared certificate (callback(err, cert))
  function cert_wrtc_acquire_shared_certificate(callback){
    if (!callback) callback = function(){};

    if (cert_wrtc_state === "ready" && cert_wrtc_is_valid()){
      callback(null, cert_wrtc_obj);
      return;
    }
    
    cert_wrtc_waiters.push(callback);

    if (cert_wrtc_state === "generating"){
      return;
    }

    cert_wrtc_start_generate();
  }

  var MSGCODE_TYPE_MAP={
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

export function StableWebRTC(opts){
    if (!(this instanceof StableWebRTC)) return new StableWebRTC(opts);


    opts = opts || {};


    if (opts.wrtc && typeof opts.wrtc === 'object') {
      var wrtc = opts.wrtc;

      if (typeof wrtc.MediaStream !== 'undefined' && typeof global.MediaStream === 'undefined') {
        global.MediaStream = wrtc.MediaStream;
      }
      if (typeof wrtc.MediaStreamTrack !== 'undefined' && typeof global.MediaStreamTrack === 'undefined') {
        global.MediaStreamTrack = wrtc.MediaStreamTrack;
      }
      if (typeof wrtc.RTCDataChannel !== 'undefined' && typeof global.RTCDataChannel === 'undefined') {
        global.RTCDataChannel = wrtc.RTCDataChannel;
      }
      if (typeof wrtc.RTCDataChannelEvent !== 'undefined' && typeof global.RTCDataChannelEvent === 'undefined') {
        global.RTCDataChannelEvent = wrtc.RTCDataChannelEvent;
      }
      if (typeof wrtc.RTCDtlsTransport !== 'undefined' && typeof global.RTCDtlsTransport === 'undefined') {
        global.RTCDtlsTransport = wrtc.RTCDtlsTransport;
      }
      if (typeof wrtc.RTCIceCandidate !== 'undefined' && typeof global.RTCIceCandidate === 'undefined') {
        global.RTCIceCandidate = wrtc.RTCIceCandidate;
      }
      if (typeof wrtc.RTCIceTransport !== 'undefined' && typeof global.RTCIceTransport === 'undefined') {
        global.RTCIceTransport = wrtc.RTCIceTransport;
      }
      if (typeof wrtc.RTCPeerConnection !== 'undefined' && typeof global.RTCPeerConnection === 'undefined') {
        global.RTCPeerConnection = wrtc.RTCPeerConnection;
      }
      if (typeof wrtc.RTCPeerConnectionIceEvent !== 'undefined' && typeof global.RTCPeerConnectionIceEvent === 'undefined') {
        global.RTCPeerConnectionIceEvent = wrtc.RTCPeerConnectionIceEvent;
      }
      if (typeof wrtc.RTCRtpReceiver !== 'undefined' && typeof global.RTCRtpReceiver === 'undefined') {
        global.RTCRtpReceiver = wrtc.RTCRtpReceiver;
      }
      if (typeof wrtc.RTCRtpSender !== 'undefined' && typeof global.RTCRtpSender === 'undefined') {
        global.RTCRtpSender = wrtc.RTCRtpSender;
      }
      if (typeof wrtc.RTCRtpTransceiver !== 'undefined' && typeof global.RTCRtpTransceiver === 'undefined') {
        global.RTCRtpTransceiver = wrtc.RTCRtpTransceiver;
      }
      if (typeof wrtc.RTCSctpTransport !== 'undefined' && typeof global.RTCSctpTransport === 'undefined') {
        global.RTCSctpTransport = wrtc.RTCSctpTransport;
      }
      if (typeof wrtc.RTCSessionDescription !== 'undefined' && typeof global.RTCSessionDescription === 'undefined') {
        global.RTCSessionDescription = wrtc.RTCSessionDescription;
      }
    }

    


    var ev = Emitter();
    
    

    var connection={
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
      current_connection_type: 'unknown',

      // Application-level ping/pong keepalive + RTT probe (over the signal
      // channel, i.e. the data channel once open). Mirrors the WS manager:
      // PING carries a timestamp, the peer echoes it back as PONG, and we
      // compute RTT against our own clock. Random interval avoids lockstep.
      ping_timer: null,
      ping_enabled: true,
      ping_interval_min: 1000,
      ping_interval_max: 3000,

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
      liveness_timeout_ms: 10000,
      last_recv_time: 0,

      // Track previous ice state for disconnect/reconnect events
      _prev_ice_connection_state: null,

      signaling_state: 'new',
      
      signaling_channel_state: 'new',

      negotiation_state: 0,
      //0 — STABLE
      //1 — MAKING_LOCAL_OFFER
      //2 — WAITING_FOR_ANSWER
      //3 — APPLYING_REMOTE_ANSWER
      //4 — HANDLING_REMOTE_OFFER

      create_offer_timer: null,
      create_offer_failures: 0,

      auth_verified: false,

      local_nonce: (Math.floor(Math.random() * 0xFFFE) + 1),
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
      ice_restart_delay_ms: 3000,
      gathering_timeout_ms: 8000,
      gathering_max_retries: 3,
      gathering_timeout_timer: null,
      gathering_retry_count: 0,
      wait_for_answer_timeout_timer: null,
      negotiation_done_timeout_timer: null,
      
      making_rollback: false,

      pending_remote_offer_sdp: null,
      sent_local_offer_sdp: null,
      sent_local_answer_sdp: null,

      base_offer_sdp: null,

      local_offer_history: [],
      seq_remote_offer: 0,

      seq_local_mediastream_map: 0,
      seq_remote_mediastream_map: 0,

      // --- signaling chunking (size-based; reassembly is all-or-nothing) ---
      max_signal_chunk_size: (typeof opts.max_signal_chunk_size==='number' && opts.max_signal_chunk_size>0) ? opts.max_signal_chunk_size : 1024,
      chunk_send_id_internal: 0,      // rolling msg_id for the SCTP pipe
      chunk_send_id_external: 0,      // rolling msg_id for the emit('signal') pipe
      chunk_reasm_internal: {},       // msg_id -> partial {parts,received,total,ts}
      chunk_reasm_external: {},

      // --- MEDIASTREAM_MAP reliability (ACK + retransmit) ---
      mediastream_map_pending: null,  // {seq, bytes, attempts}
      mediastream_map_ack_timer: null,

      epoch_negotiation_success: 0,

      best_candidate_pair_priority: 0,
      
      data_channel_primary_index: null,
      data_channel_state: 'new',
      data_channel_connect_time: null,

      sctp_dtls_state: 'new',
      sctp_ice_state: 'new',
      sctp_state: 'new',
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
      signal_q_head: 0,   // head-pointer drain, same pattern as data_q_head

      // pause()/resume() valve. Gates ONLY the data-lane send loop inside the
      // pump — never the pump tick itself (the expiry sweep and the signal lane
      // must keep running while paused).
      data_channel_sending_messages_paused: false,

      data_channel_min_buffered_amount: 64*1024,
      data_channel_max_buffered_amount: 1*1024*1024,

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
      data_channel_max_queue_age: 10000,

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
      last_send_failure_emit_ts: 0,
    };

    // Guard used before any access to connection.pc.<prop> in code paths that
    // may run after cleanup (async callbacks, timers, promise .then handlers).
    // Cleanup sets connection.pc=null after calling pc.close(), so returning
    // false here means the peer connection is either not yet created or gone.
    function pc_alive(){
      return connection.pc!==null && connection.pc.connectionState!=='closed';
    }

    // A malformed inbound frame is a routine event, not a fatal one: a buggy or
    // hostile peer can put arbitrary bytes on the wire, and litepack.decode throws
    // on garbage. Dropping the frame is the correct response — but the throw must
    // never escape an event handler, or it kills the whole process.
    // Every drop is counted; the 'error' emit is rate-limited to once per second so
    // a flood of bad frames cannot drown the app in events.
    function report_malformed_frame(source, error){
      connection.stats_dropped_malformed++;

      var now=Date.now();
      if(now-connection.last_malformed_emit_ts>=1000){
        connection.last_malformed_emit_ts=now;
        ev.emit('error','malformed inbound frame on '+source+' — dropped ('+connection.stats_dropped_malformed+' total): '+((error && error.message) ? error.message : String(error)));
      }
    }

    function drain_pending_remote_candidates(){
      if (pc_alive() && connection.pc.remoteDescription && connection.pc.remoteDescription.type) {
        var current_remote_ufrag=get_ufrag_from_sdp(connection.pc.remoteDescription.sdp);

        // Candidates are bucketed by ufrag. Browsers tag each trickled candidate
        // with its usernameFragment, so it lands under the real remote ufrag.
        // Some Node bindings (e.g. webrtc-server) trickle candidates with no
        // ufrag at all — those land under 'default'. Drain BOTH against the
        // current remote session, or candidates without a ufrag would never be
        // applied and ICE would stay stuck in 'new'.
        var buckets=[];
        if(current_remote_ufrag && (current_remote_ufrag in connection.list_remote_candidates)) buckets.push(current_remote_ufrag);
        if('default' in connection.list_remote_candidates && current_remote_ufrag!=='default') buckets.push('default');

        for(var bi=0; bi<buckets.length; bi++){
          var bucket=connection.list_remote_candidates[buckets[bi]];

          if(bucket.pending.length>0){
            var candidate = bucket.pending.shift();
            bucket.drained++;

            connection.pc.addIceCandidate(candidate).then(function(){
              setTimeout(drain_pending_remote_candidates,0);
            }).catch(function(error){
              ev.emit('error', error);
              setTimeout(drain_pending_remote_candidates,0);
            });

            return; // one at a time; the .then() re-invokes us

          }else if(bucket.total>0 && bucket.drained==bucket.total){
            connection.pc.addIceCandidate(null);
          }
        }

      }
    }

    // Anti-flood bounds for peer-supplied candidates. A legitimate session sees
    // a handful of ufrags (one per ICE generation) and tens of candidates each;
    // these caps are far above that while bounding the O(n) dedup scan, the
    // O(n log n) priority sort, and memory against a hostile flood.
    var MAX_REMOTE_UFRAG_BUCKETS = 8;
    var MAX_REMOTE_CANDIDATES_PER_UFRAG = 256;

    function add_remote_candidates(candidate){
      if(connection.remote_support_trickle_ice==null){
        connection.remote_support_trickle_ice=true;
      }

      var of_ufrag='default';

      if(candidate && typeof candidate.usernameFragment==='string' && candidate.usernameFragment.length>0){
        of_ufrag=candidate.usernameFragment;
      }else{
        var c=parse_candidate(candidate.candidate);
        if(typeof c.ufrag==='string' && c.ufrag.length>0){
          of_ufrag=c.ufrag;
        }
      }
      if(!(of_ufrag in connection.list_remote_candidates)){
        if(Object.keys(connection.list_remote_candidates).length>=MAX_REMOTE_UFRAG_BUCKETS){
          connection.stats_dropped_candidates++;
          return;
        }
        connection.list_remote_candidates[of_ufrag]={
          total: 0,
          drained: 0,
          pending: [],
          all: [],
        };
      }

      if(connection.list_remote_candidates[of_ufrag].all.length>=MAX_REMOTE_CANDIDATES_PER_UFRAG){
        connection.stats_dropped_candidates++;
        return;
      }

      if(connection.list_remote_candidates[of_ufrag].all.indexOf(candidate.candidate)<0){
        connection.list_remote_candidates[of_ufrag].all.push(candidate.candidate);

        connection.list_remote_candidates[of_ufrag].pending.push(candidate);

        if(connection.list_remote_candidates[of_ufrag].pending.length>=2){
          connection.list_remote_candidates[of_ufrag].pending.sort(function(a, b){
            var obj_a = parse_candidate(a.candidate);
            var obj_b = parse_candidate(b.candidate);

            var aPriority = obj_a.priority + (obj_a.transport === 'tcp' ? 1 : 0);
            var bPriority = obj_b.priority + (obj_b.transport === 'tcp' ? 1 : 0);
            if (aPriority === bPriority && 'foundation' in obj_a && 'foundation' in obj_b && obj_a.foundation!==null && obj_b.foundation!==null) {
            return obj_a.foundation.localeCompare(obj_b.foundation);
            } else {
            return bPriority - aPriority;
            }
          });
        }


        drain_pending_remote_candidates();
      }

      
    }

    function set_remote_total_candidates(total,ufrag){
      if(!(ufrag in connection.list_remote_candidates)){
        connection.list_remote_candidates[ufrag]={
          total: 0,
          drained: 0,
          pending: [],
          all: []
        };
      };

      connection.list_remote_candidates[ufrag].total=total;

      if(connection.list_remote_candidates[ufrag].total>0 && connection.list_remote_candidates[ufrag].total==connection.list_remote_candidates[ufrag].drained){
        drain_pending_remote_candidates();
      }
    }

    function adopt_primary_data_channel(){
      if(pc_alive()){

        var winner_index = null;
        var winner_id = null;

        // Step 1: find winner — the open channel with the lowest ID (SID)
        for (var i = 0; i < connection.list_data_channels.length; i++) {
          var dc = connection.list_data_channels[i];
          if(dc && dc.readyState == 'open'){
            if (typeof dc.id == 'number'){
              if (winner_id === null || dc.id < winner_id) {
                winner_id = dc.id;
                winner_index = i;
              }
            }
          }
        }


        if (winner_index == null) {
          
          connection.data_channel_primary_index=null;
          set_connection_state({
            data_channel_state: 'closed'
          });

          // Mid-life death recovery. Startup DC creation (try_create_dc) runs once
          // and never again, so a channel that dies later (SCTP stream reset, a
          // binding bug) used to leave the connection with no forward path except
          // the liveness watchdog burning through its restart budget and closing —
          // even when ICE itself was perfectly healthy. Recreate instead.
          // Guards: connect_time!=null proves a channel HAD opened (so this never
          // fires during normal startup, where winner==null is routine), and we
          // stand down if any channel is still connecting — its onopen re-runs
          // adopt and the normal path takes over.
          if(connection.data_channel_connect_time!=null && connection.create_data_channel_timer==null){
            var any_still_alive=false;
            for(var di=0; di<connection.list_data_channels.length; di++){
              var ddc=connection.list_data_channels[di];
              if(ddc && ddc.readyState!=='closed' && ddc.readyState!=='closing'){ any_still_alive=true; break; }
            }
            if(!any_still_alive){
              connection.create_data_channel_timer=setTimeout(function(){
                connection.create_data_channel_timer=null;
                if(pc_alive() && connection.data_channel_primary_index==null){
                  ev.emit('log','all data channels died while the connection is alive — recreating');
                  create_data_channel();   // also schedules the renegotiation offer
                }
              }, 50);
            }
          }

        }else{
          connection.data_channel_primary_index = winner_index;

          set_connection_state({
            data_channel_state: String(connection.list_data_channels[connection.data_channel_primary_index].readyState)+""
          });

          for (var i = 0; i < connection.list_data_channels.length; i++) {
            var dc = connection.list_data_channels[i];
            if(dc && i !== winner_index){
              // Only close losers that are OPEN — never 'connecting'.
              // A connecting channel hasn't been seen open by BOTH ends yet, so the
              // lowest-id decision isn't global at that moment. Closing it is what
              // allowed the two ends to adopt DIFFERENT primaries under startup
              // glare (each killing the other's choice → crossed half-open channels
              // → one side's send pump starves silently while the other direction
              // keeps flowing). A connecting loser either opens later — adopt
              // re-runs on its onopen, both ends then see both channels open,
              // compute the SAME winner and close the SAME loser — or it never
              // opens and dies with the connection.
              if(dc.readyState == 'open'){// || dc.readyState == 'connecting'
                try { dc.close(); } catch (e) {}
              }
            }
          }

        }
        

      }
    }

    function is_negotiation_needed(){

      var for_datachannel=false;

      var count_dc_open=0;
      var count_dc_connecting=0;

      for (var i = 0; i < connection.list_data_channels.length; i++) {
        var dc = connection.list_data_channels[i];
        if(dc){
          if(dc.readyState !== 'closed' && dc.readyState !== 'closing'){
            if(dc.readyState == 'open'){
              count_dc_open++;
            }else{
              count_dc_connecting++;
            }
          }
        }
      }

      if(count_dc_connecting>0){
        if(connection.pc && (!connection.pc.currentRemoteDescription || (connection.pc.currentRemoteDescription.sdp).indexOf('m=application')<0)){
          for_datachannel=true;
        }
      }


      var for_media=false;
      for(var ti=0; ti<connection.created_transceivers.length; ti++){
        var ctc=connection.created_transceivers[ti].tc;
        if(ctc){
          // New transceiver without MID — needs initial negotiation
          if(!ctc.stopped && ctc.direction=='sendonly' && ctc.mid==null){
            for_media=true;
            break;
          }
          // Direction changed since last negotiation — needs renegotiation
          if(!ctc.stopped && ctc.mid!==null && ctc.currentDirection!==null && ctc.direction!==ctc.currentDirection){
            for_media=true;
            break;
          }
        }
      }

      // Also check: tracks that need a transceiver (deferred creation)
      if(!for_media){
        for(var tag_id in connection.list_sending_live_mediastream){
          var rec=connection.list_sending_live_mediastream[tag_id];
          if(rec.video_track && !rec.video_mid){ for_media=true; break; }
          if(rec.audio_track && !rec.audio_mid){ for_media=true; break; }
        }
      }

      if(for_datachannel==true || for_media==true || connection.need_ice_restart==true || connection.need_reoffer==true){
        return true;
      }else{
        return false;
      }
    }

    function create_offer_schedule(){
      clearTimeout(connection.create_offer_timer);
      connection.create_offer_timer=null;

      // Exponential backoff on consecutive failures, max 10 retries
      if(connection.create_offer_failures>=10) return;
      var base_delay = 5 + Math.floor(Math.random() * 15);
      var delay = Math.min(base_delay * Math.pow(2, connection.create_offer_failures), 5000);

      connection.create_offer_timer=setTimeout(function(){
        connection.create_offer_timer=null;

        if(connection.pc && (connection.negotiation_state==0)){
          if(is_negotiation_needed()==true){
            create_offer();
          }
        }
      }, delay);
    }

    function set_connection_state(options){
      var has_changed=false;

      var fields=[
        'sctp_state',
        'sctp_ice_state',
        'sctp_dtls_state',
        'data_channel_state',
        'negotiation_state',
        'signaling_state',
        'current_remote_protocol',
        'current_local_protocol',
        'current_remote_relay',
        'current_local_relay',
        'current_local_ip',
        'current_remote_ip',
        'current_local_port',
        'current_remote_port',
        'current_local_candidate_type',
        'current_remote_candidate_type',
        'current_rtt',
        'current_bandwidth_outgoing',
        'current_connection_type',
      ];

      var prev={};
      // All tracked fields are primitives (strings/numbers/booleans/null) —
      // plain assignment snapshots them; structuredClone was pure overhead.
      for(var fi=0; fi<fields.length; fi++){
        prev[fields[fi]]=connection[fields[fi]];
      }
      
      if (options && typeof options === 'object'){

        for(var fi2=0; fi2<fields.length; fi2++){
          if(fields[fi2] in options){
            if(connection[fields[fi2]]!==options[fields[fi2]]){
              connection[fields[fi2]]=options[fields[fi2]];
              has_changed=true;
            }
          }
        }
        
      }

      if(has_changed==true){

        ev.emit('statechange', build_state_snapshot());

        if(connection['data_channel_state']=='open' && connection['data_channel_state']!==prev['data_channel_state']){
          if(connection.data_channel_connect_time==null || connection.data_channel_connect_time==0){
            connection.data_channel_connect_time=Date.now();
            ev.emit('connect');
          }

          connection_getstats();

          data_channel_schedule_pump();

          start_ping();
          start_liveness();
        }

        if(connection.negotiation_state!==prev['negotiation_state']){

          //console.log(connection.local_nonce+' negotiation_state: '+connection.negotiation_state);

          if(connection.negotiation_state!==2){
            clearTimeout(connection.wait_for_answer_timeout_timer);
            connection.wait_for_answer_timeout_timer=null;
          }

          if(connection.negotiation_state==0){
            
            sctp_events();

            update_all_mediastream_senders();
            update_all_mediastream_receivers();

            if(connection.pending_remote_offer_sdp!==null){
              if(connection.pc && (connection.negotiation_state==0 || connection.negotiation_state==2 || connection.negotiation_state==5)){
                set_remote_offer();
              }
            }else if(connection.create_offer_timer==null){
              create_offer_schedule();
            }
          }


          if(connection.negotiation_state==5){
            clearTimeout(connection.negotiation_done_timeout_timer);
            connection.negotiation_done_timeout_timer=null;

            connection.negotiation_done_timeout_timer=setTimeout(function(){
              connection.negotiation_done_timeout_timer=null;
              if(connection.negotiation_state==5){
                //console.log('not get "nego done"...');
                set_connection_state({
                  negotiation_state: 0
                });
              }
            },3000);
            
          }else{
            if(connection.negotiation_done_timeout_timer!==null){
              clearTimeout(connection.negotiation_done_timeout_timer);
              connection.negotiation_done_timeout_timer=null;
            }
          }
          
          
        }

        if(connection.signaling_state!==prev['signaling_state']){
          //console.log('change in signaling_state...');

          if(connection.signaling_state=='stable' || connection.signaling_state=='have-remote-offer'){

            var emit_fingerprints_available=false;
            if(connection.pc.remoteDescription && connection.pc.remoteDescription.type && connection.remote_fingerprint==null){
              connection.remote_fingerprint=get_fingerprint_from_sdp(connection.pc.remoteDescription.sdp);
              if(connection.local_fingerprint!==null){
                emit_fingerprints_available=true;
              }
            }

            if(connection.pc.localDescription && connection.pc.localDescription.type && connection.local_fingerprint==null){
              connection.local_fingerprint=get_fingerprint_from_sdp(connection.pc.localDescription.sdp);
              if(connection.remote_fingerprint!==null){
                emit_fingerprints_available=true;
              }
            }

            if(emit_fingerprints_available){
              ev.emit('fingerprints',connection.local_fingerprint,connection.remote_fingerprint);
            }

            if (connection.signaling_state=='stable'){

              if(connection.pc.currentRemoteDescription && connection.pc.currentRemoteDescription.type && connection.pc.currentLocalDescription && connection.pc.currentLocalDescription.type){
                var current_remote_ufrag=get_ufrag_from_sdp(connection.pc.currentRemoteDescription.sdp);
                var current_local_ufrag=get_ufrag_from_sdp(connection.pc.currentLocalDescription.sdp);
                if(current_local_ufrag && current_remote_ufrag){

                  var local_ufrag_changed=false;
                  var remote_ufrag_changed=false;
                  if(connection.last_local_ufrag==null || connection.last_local_ufrag!==current_local_ufrag){
                    connection.last_local_ufrag=current_local_ufrag;
                    local_ufrag_changed=true;
                  }
                  if(connection.last_remote_ufrag==null || connection.last_remote_ufrag!==current_remote_ufrag){
                    connection.last_remote_ufrag=current_remote_ufrag;
                    remote_ufrag_changed=true;
                  }

                  if(local_ufrag_changed){
                    if(connection.need_ice_restart==true){
                      connection.need_ice_restart=false;
                    }
                  }
                }
                
              }

            }

          }

        }


        /*
        if (connection.pending_remote_offer_sdp!==null && connection.signaling_state=='stable' && connection.negotiation_state==0){
          set_remote_offer();
        }
        */


      }
    }

    function add_data_channel(dc){
      if(pc_alive()){
        
        var dc_index=connection.list_data_channels.push(dc);

        dc.binaryType = "arraybuffer";
        dc.bufferedAmountLowThreshold = connection.data_channel_min_buffered_amount;

        dc.onopen=function(event){
          adopt_primary_data_channel();
        };

        dc.onmessage=function(event){
          var now = Date.now();
          connection.last_recv_time = now;   // any inbound traffic proves the peer is alive
          var bytes=event.data.byteLength||event.data.length||0;
          var rvs=connection.data_channel_recv_events;
          rvs.push([now,bytes]);
          // Head-pointer trim (no shift): the first message after a big burst
          // used to pay O(window²) shifting the whole burst out one by one.
          while (connection.recv_events_head < rvs.length && (now - rvs[connection.recv_events_head][0]) > 1000){
            connection.recv_events_head++;
          }
          // Hard cap: an inbound flood can't grow the window without bound.
          if (rvs.length - connection.recv_events_head > 65536){
            connection.recv_events_head = rvs.length - 65536;
          }
          if (connection.recv_events_head >= 4096){
            rvs.splice(0, connection.recv_events_head);
            connection.recv_events_head = 0;
          }

          // Everything below decodes peer-supplied bytes. litepack.decode throws on
          // garbage, and this is an event handler — an escaping throw is unhandled and
          // takes the process with it. Drop the frame instead.
          // (last_recv_time is refreshed above, outside the try: even a corrupt frame
          // proves the transport is still delivering, which is all liveness cares about.)
          try{
            var _dcmsg=litepack.decode(SCHEMA_DC_MSG,event.data);
            if(_dcmsg.type==MSGCODE_TYPE_MAP['SIGNAL_CHUNK']){
              // A fragment of an oversized signaling message. Reassemble; once the
              // whole DC_MSG is back, decode and dispatch it by its real type.
              var _whole=reassemble_chunk(_dcmsg.data,connection.chunk_reasm_internal);
              if(_whole!==null){
                var _inner=litepack.decode(SCHEMA_DC_MSG,_whole);
                if(_inner.type==MSGCODE_TYPE_MAP['DATA']){
                  ev.emit('data', _inner.data);
                }else{
                  process_income_signal(_inner.type,_inner.data);
                }
              }
            }else if(_dcmsg.type==MSGCODE_TYPE_MAP['DATA']){
              ev.emit('data', _dcmsg.data);
            }else{
              process_income_signal(_dcmsg.type,_dcmsg.data);
            }
          }catch(error){
            report_malformed_frame('datachannel', error);
          }

        };

        dc.onbufferedamountlow=function(){
          data_channel_schedule_pump();
        };

        dc.onclosing=function(event){
          adopt_primary_data_channel();
        };

        dc.onclose=function(event){
          adopt_primary_data_channel();

          if(pc_alive()){
            //connection.list_data_channels.splice(dc_index, 1);
          }
        };

        dc.onerror=function(error){
          adopt_primary_data_channel();

          if(pc_alive()){
            // Extract meaningful error message from RTCErrorEvent
            var msg = error;
            if(error && error.error && error.error.message) msg = error.error.message;
            else if(error && error.message) msg = error.message;
            ev.emit('error', msg);
          }
        };
      
      }
    }

    function create_data_channel(){
      if(pc_alive()){
        try{
          
          // Unreliable + unordered ON PURPOSE — speed over delivery guarantees;
          // reliability, if needed, is the application's layer to add.
          // The standard fields that actually produce this behaviour are
          // maxRetransmits:0 (no retransmissions) and ordered:false.
          // 'reliable' (legacy pre-standard Chrome) and 'maxMessageSize' (a
          // read-only SCTP-negotiated value, not an RTCDataChannelInit member)
          // are ignored by spec-compliant browsers; kept intentionally for
          // older non-browser bindings that may still read them.
          var dc=connection.pc.createDataChannel("dc", {
            reliable:false,
            maxRetransmits:0,
            //maxPacketLifeTime:0,
            ordered:false,
            //negotiated: true,
            //id: Number(0),
            maxMessageSize: 16*1024
          });

          add_data_channel(dc);

          create_offer_schedule();

        } catch (error) { 
          ev.emit('error', error);
        }
      }   
    }

    function connection_getstats(){
      if(pc_alive() && connection.pc.getStats){

        if(connection.getstats_running==false){
          connection.getstats_running=true;
          if(connection.getstats_timer!==null){
            clearTimeout(connection.getstats_timer);
            connection.getstats_timer=null;
          }

          connection.pc.getStats().then(function(stats) {
            try{
              connection.getstats_running=false;
  
              var obj_reports={};
  
              stats.forEach(function(report){
                if(!(report.type in obj_reports)){
                    obj_reports[report.type]={};
                }
                obj_reports[report.type][report.id]=report;
                //Object.keys(report).forEach(function(statName){
                //    console.log(statName+': '+report[statName]);
                //});

              });


              //console.log(obj_reports);

              if('transport' in obj_reports){
                for(var i in obj_reports['transport']){
                  if('selectedCandidatePairId' in obj_reports['transport'][i]){
                    var selectedCandidatePairId=obj_reports['transport'][i].selectedCandidatePairId;

                    var local_candidate=null;
                    var remote_candidate=null;
                    var this_candidate_pair=null;


                    if('local-candidate' in obj_reports && 'candidate-pair' in obj_reports && selectedCandidatePairId in obj_reports['candidate-pair']){
                      local_candidate=obj_reports['local-candidate'][obj_reports['candidate-pair'][selectedCandidatePairId].localCandidateId];
                    }

                    if('remote-candidate' in obj_reports && 'candidate-pair' in obj_reports && selectedCandidatePairId in obj_reports['candidate-pair']){
                      remote_candidate=obj_reports['remote-candidate'][obj_reports['candidate-pair'][selectedCandidatePairId].remoteCandidateId];
                    }

                    if('candidate-pair' in obj_reports && selectedCandidatePairId in obj_reports['candidate-pair']){
                      this_candidate_pair=obj_reports['candidate-pair'][selectedCandidatePairId];
                    }
                    
                    if(local_candidate!==null && remote_candidate!==null && this_candidate_pair!==null){

                      var local_protocol=local_candidate.protocol;
                      var remote_protocol=remote_candidate.protocol;

                      var current_rtt=null;
                      
                      if('currentRoundTripTime' in this_candidate_pair){
                        current_rtt=Number(this_candidate_pair.currentRoundTripTime)*1000;
                      }
                      

                      var local_relay=false;
                      var remote_relay=false;
                      if(local_candidate.candidateType=='relay'){
                        local_relay=true;
                      }
                      if(remote_candidate.candidateType=='relay'){
                        remote_relay=true;
                      }

                      var this_candidate_priority=Number(this_candidate_pair.priority);
                      var this_candidate_state=this_candidate_pair.state;

                      
                      var local_ip=null;
                      var local_port=null;
                      var remote_ip=null;
                      var remote_port=null;
                      var local_candidate_type=local_candidate.candidateType||null;
                      var remote_candidate_type=remote_candidate.candidateType||null;

                      // Extract IP/port for all candidate types (not just srflx)
                      if('ip' in local_candidate) local_ip=local_candidate.ip;
                      else if('address' in local_candidate) local_ip=local_candidate.address;
                      if('port' in local_candidate) local_port=local_candidate.port;

                      if('ip' in remote_candidate) remote_ip=remote_candidate.ip;
                      else if('address' in remote_candidate) remote_ip=remote_candidate.address;
                      if('port' in remote_candidate) remote_port=remote_candidate.port;

                      // Bandwidth estimate from candidate pair
                      var bandwidth_outgoing=null;
                      if('availableOutgoingBitrate' in this_candidate_pair){
                        bandwidth_outgoing=Number(this_candidate_pair.availableOutgoingBitrate)||null;
                      }

                      // Compute connection type
                      var conn_type='unknown';
                      if(local_protocol && remote_protocol){
                        if(local_relay || remote_relay){
                          conn_type='relayed';
                        }else if(local_protocol==='udp' && remote_protocol==='udp'){
                          conn_type='direct-udp';
                        }else if(local_protocol==='tcp' || remote_protocol==='tcp'){
                          conn_type='direct-tcp';
                        }else{
                          conn_type='direct';
                        }
                      }


                      /*
                      


                      
                      */
                      
                      if(this_candidate_state=='succeeded'){
                        
                        var prev_conn_type=connection.current_connection_type;
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
                          current_rtt: current_rtt,
                          current_bandwidth_outgoing: bandwidth_outgoing,
                          current_connection_type: conn_type
                        });

                        // Emit connectioninfo when connection type or candidate pair changes
                        if(prev_conn_type!==conn_type || prev_conn_type==='unknown'){
                          ev.emit('connectioninfo', build_connection_info());
                        }
                        
                        if(connection.best_candidate_pair_priority<this_candidate_priority){
                          connection.best_candidate_pair_priority=this_candidate_priority;

                          /*


                          */

                        }else if(connection.best_candidate_pair_priority>this_candidate_priority){

                          /*



                          
                          */
                          
                          //console.log(local_candidate);
                          //console.log(remote_candidate);

                          connection.best_candidate_pair_priority=this_candidate_priority;

                          //send_restartIce(wrtc_connection_id);
                          
                        }
                      }
                    }

                  }


                  if('iceState' in obj_reports['transport'][i]){
                    var iceState=obj_reports['transport'][i].iceState;

                    set_connection_state({
                      sctp_ice_state: iceState
                    });

                  }

                  if('dtlsState' in obj_reports['transport'][i]){
                    var dtlsState=obj_reports['transport'][i].dtlsState;

                    set_connection_state({
                      sctp_dtls_state: dtlsState
                    });

                  }
                }
              }

              if('data-channel' in obj_reports){
                for(var i in obj_reports['data-channel']){

                  

                }

                adopt_primary_data_channel();
              }

              if('candidate-pair' in obj_reports){
                for(var i in obj_reports['candidate-pair']){
                  //console.log('state: '+obj_reports['candidate-pair'][i].state);
                  //console.log('priority: '+obj_reports['candidate-pair'][i].priority);

                  //console.log('localCandidateId: '+obj_reports['candidate-pair'][i].localCandidateId);
                  //console.log('remoteCandidateId: '+obj_reports['candidate-pair'][i].remoteCandidateId);

                  //console.log('local protocol: '+obj_reports['local-candidate'][obj_reports['candidate-pair'][i].localCandidateId].protocol);

                  //console.log('remote protocol: '+obj_reports['remote-candidate'][obj_reports['candidate-pair'][i].remoteCandidateId].protocol);

                  /*
                  if(obj_reports['candidate-pair'][i].state=='succeeded'){
                      if(best_candidate_pair_priority<Number(obj_reports['candidate-pair'][i].priority)){
                          best_candidate_pair_priority=Number(obj_reports['candidate-pair'][i].priority);
                      }
                  }
                  */
                    
                }
              }

              if('outbound-rtp' in obj_reports){
                for(var i in obj_reports['outbound-rtp']){

                  var codec_mime_type=null;
                  
                  if('codec' in obj_reports){
                    if('codecId' in obj_reports['outbound-rtp'][i]){
                      if(obj_reports['outbound-rtp'][i].codecId in obj_reports['codec']){
                        if('mimeType' in obj_reports['codec'][obj_reports['outbound-rtp'][i].codecId]){
                            codec_mime_type=obj_reports['codec'][obj_reports['outbound-rtp'][i].codecId].mimeType;
                        }
                      }
                    }
                  }

                  if('mid' in obj_reports['outbound-rtp'][i]){

                    var sending_status=0;
                    if(obj_reports['outbound-rtp'][i].active==true){
                      sending_status=1;
                    }

                    var rtp_bytes_sent=obj_reports['outbound-rtp'][i].bytesSent||0;

                    for(var tag_id in connection.list_sending_live_mediastream){
                      if(Number(obj_reports['outbound-rtp'][i].mid)==connection.list_sending_live_mediastream[tag_id].video_mid){

                        var srec=connection.list_sending_live_mediastream[tag_id];
                        srec.video_active=(sending_status===1);

                        if('frameHeight' in obj_reports['outbound-rtp'][i]){
                          srec.current_video_frame_height=obj_reports['outbound-rtp'][i].frameHeight;
                        }
                        if('frameWidth' in obj_reports['outbound-rtp'][i]){
                          srec.current_video_frame_width=obj_reports['outbound-rtp'][i].frameWidth;
                        }
                        if('framesPerSecond' in obj_reports['outbound-rtp'][i]){
                          srec.current_video_fps=obj_reports['outbound-rtp'][i].framesPerSecond;
                        }
                        if(codec_mime_type!==null){
                          srec.current_video_mime_type=codec_mime_type;
                        }

                        // Bitrate delta
                        var now_ts=Date.now();
                        if(srec._prev_video_stats_time>0 && rtp_bytes_sent>=srec._prev_video_bytes_sent){
                          var dt=(now_ts-srec._prev_video_stats_time)/1000;
                          if(dt>0) srec.video_bitrate=Math.round(((rtp_bytes_sent-srec._prev_video_bytes_sent)*8)/dt);
                        }
                        srec._prev_video_bytes_sent=rtp_bytes_sent;
                        srec._prev_video_stats_time=now_ts;

                      }else if(Number(obj_reports['outbound-rtp'][i].mid)==connection.list_sending_live_mediastream[tag_id].audio_mid){

                        var srec_a=connection.list_sending_live_mediastream[tag_id];
                        srec_a.audio_active=(sending_status===1);

                        if(codec_mime_type!==null){
                          srec_a.audio_mime_type=codec_mime_type;
                        }

                        // Bitrate delta
                        var now_ts_a=Date.now();
                        if(srec_a._prev_audio_stats_time>0 && rtp_bytes_sent>=srec_a._prev_audio_bytes_sent){
                          var dt_a=(now_ts_a-srec_a._prev_audio_stats_time)/1000;
                          if(dt_a>0) srec_a.audio_bitrate=Math.round(((rtp_bytes_sent-srec_a._prev_audio_bytes_sent)*8)/dt_a);
                        }
                        srec_a._prev_audio_bytes_sent=rtp_bytes_sent;
                        srec_a._prev_audio_stats_time=now_ts_a;

                      }
                    }
                      
                  }
                }
              }



              if('inbound-rtp' in obj_reports){
                for(var i in obj_reports['inbound-rtp']){

                  var codec_mime_type=null;
                  
                  if('codec' in obj_reports){
                    if('codecId' in obj_reports['inbound-rtp'][i]){
                      if(obj_reports['inbound-rtp'][i].codecId in obj_reports['codec']){
                        if('mimeType' in obj_reports['codec'][obj_reports['inbound-rtp'][i].codecId]){
                          codec_mime_type=obj_reports['codec'][obj_reports['inbound-rtp'][i].codecId].mimeType;
                        }
                      }
                    }
                  }

                  if('mid' in obj_reports['inbound-rtp'][i]){

                    var rtp_bytes_recv=obj_reports['inbound-rtp'][i].bytesReceived||0;
                    var rtp_packets_lost=obj_reports['inbound-rtp'][i].packetsLost||0;
                    var rtp_packets_recv=obj_reports['inbound-rtp'][i].packetsReceived||0;
                    var rtp_jitter=obj_reports['inbound-rtp'][i].jitter||0;
                    var rtp_fps=obj_reports['inbound-rtp'][i].framesPerSecond||0;
                    
                    for(var tag_id in connection.list_receiving_live_mediastream){
                      if(Number(obj_reports['inbound-rtp'][i].mid)==connection.list_receiving_live_mediastream[tag_id].video_mid){

                        var rrec=connection.list_receiving_live_mediastream[tag_id];

                        if('frameHeight' in obj_reports['inbound-rtp'][i]){
                          rrec.current_video_frame_height=obj_reports['inbound-rtp'][i].frameHeight;
                        }
                        if('frameWidth' in obj_reports['inbound-rtp'][i]){
                          rrec.current_video_frame_width=obj_reports['inbound-rtp'][i].frameWidth;
                        }
                        if(rtp_fps) rrec.current_video_fps=rtp_fps;
                        if(codec_mime_type!==null) rrec.current_video_mime_type=codec_mime_type;

                        rrec.video_active=(rtp_fps>0);
                        rrec.video_jitter=rtp_jitter;

                        // Bitrate delta
                        var now_rv=Date.now();
                        if(rrec._prev_video_stats_time>0 && rtp_bytes_recv>=rrec._prev_video_bytes_received){
                          var dt_rv=(now_rv-rrec._prev_video_stats_time)/1000;
                          if(dt_rv>0) rrec.video_bitrate=Math.round(((rtp_bytes_recv-rrec._prev_video_bytes_received)*8)/dt_rv);
                        }
                        rrec._prev_video_bytes_received=rtp_bytes_recv;
                        rrec._prev_video_stats_time=now_rv;

                        // Packet loss
                        var total_v=rtp_packets_recv+rtp_packets_lost;
                        if(total_v>0){
                          var prev_total_v=rrec._prev_video_packets_received+rrec._prev_video_packets_lost;
                          var delta_recv_v=rtp_packets_recv-rrec._prev_video_packets_received;
                          var delta_lost_v=rtp_packets_lost-rrec._prev_video_packets_lost;
                          var delta_total_v=delta_recv_v+delta_lost_v;
                          rrec.video_packet_loss=(delta_total_v>0)?Math.round((delta_lost_v/delta_total_v)*10000)/100:0;
                        }
                        rrec._prev_video_packets_received=rtp_packets_recv;
                        rrec._prev_video_packets_lost=rtp_packets_lost;

                      }else if(Number(obj_reports['inbound-rtp'][i].mid)==connection.list_receiving_live_mediastream[tag_id].audio_mid){

                        var rrec_a=connection.list_receiving_live_mediastream[tag_id];
                        if(codec_mime_type!==null) rrec_a.current_audio_mime_type=codec_mime_type;

                        rrec_a.audio_active=(rtp_packets_recv>rrec_a._prev_audio_packets_received);
                        rrec_a.audio_jitter=rtp_jitter;

                        // Bitrate delta
                        var now_ra=Date.now();
                        if(rrec_a._prev_audio_stats_time>0 && rtp_bytes_recv>=rrec_a._prev_audio_bytes_received){
                          var dt_ra=(now_ra-rrec_a._prev_audio_stats_time)/1000;
                          if(dt_ra>0) rrec_a.audio_bitrate=Math.round(((rtp_bytes_recv-rrec_a._prev_audio_bytes_received)*8)/dt_ra);
                        }
                        rrec_a._prev_audio_bytes_received=rtp_bytes_recv;
                        rrec_a._prev_audio_stats_time=now_ra;

                        // Packet loss
                        var total_a=rtp_packets_recv+rtp_packets_lost;
                        if(total_a>0){
                          var delta_recv_a=rtp_packets_recv-rrec_a._prev_audio_packets_received;
                          var delta_lost_a=rtp_packets_lost-rrec_a._prev_audio_packets_lost;
                          var delta_total_a=delta_recv_a+delta_lost_a;
                          rrec_a.audio_packet_loss=(delta_total_a>0)?Math.round((delta_lost_a/delta_total_a)*10000)/100:0;
                        }
                        rrec_a._prev_audio_packets_received=rtp_packets_recv;
                        rrec_a._prev_audio_packets_lost=rtp_packets_lost;

                      }
                    }
                      
                  }
                }
              }

              // Emit streamstats events
              emit_stream_stats();

              
              connection.getstats_timer=setTimeout(connection_getstats,1000);
              
            } catch (error) {
              ev.emit('error', error);
              connection.getstats_running=false;
            }
          }).catch(function(error){
            ev.emit('error', error);
            connection.getstats_running=false;
          });
                  
        }

      }
      
    }

    // ============================================================
    // Application-level ping/pong (RTT + keepalive).
    // Modelled on the WS manager: send PING{timestamp} on a randomised
    // interval; the peer echoes it as PONG{timestamp}; on PONG we compute
    // rtt = now - timestamp, store it on connection.current_rtt and emit 'rtt'.
    // Runs only while the data channel is open. send_signal routes it over
    // the DC, so it costs one tiny datagram per interval.
    // ============================================================
    function schedule_ping(){
      if(connection.ping_enabled===false) return;
      clearTimeout(connection.ping_timer);
      var span=Math.max(0,connection.ping_interval_max-connection.ping_interval_min);
      var delay=connection.ping_interval_min+Math.floor(Math.random()*span);
      connection.ping_timer=setTimeout(function(){
        connection.ping_timer=null;
        if(pc_alive() && connection.data_channel_state==='open'){
          try{
            send_signal(MSGCODE_TYPE_MAP['PING'],litepack.encode(SCHEMA_PING,{timestamp:Date.now()}));
          }catch(error){}
          schedule_ping();
        }
      },delay);
    }

    function start_ping(){
      if(connection.ping_enabled===false) return;
      if(connection.ping_timer!==null) return;   // already running
      schedule_ping();
    }

    // Liveness watchdog: declares the link dead when no inbound traffic has
    // arrived within liveness_timeout_ms. Crucial for ICE-lite peers whose
    // iceConnectionState won't move off 'connected' when the link dies.
    function liveness_period(){
      return Math.max(1000, Math.floor(connection.liveness_timeout_ms/3));
    }

    function check_liveness(){
      connection.liveness_timer=null;
      if(!pc_alive()) return;
      if(connection.liveness_enabled===false) return;

      var idle=Date.now()-connection.last_recv_time;
      if(connection.last_recv_time>0 && idle>=connection.liveness_timeout_ms){
        var ice=connection.pc.iceConnectionState;
        // Only step in when ICE is oblivious to the break (the ICE-lite blind
        // spot): it still says connected/completed but nothing is arriving.
        // When ICE itself reports disconnected/failed, its own handler drives
        // recovery — don't double-drive the shared restart budget.
        if(ice==='connected' || ice==='completed'){
          ev.emit('disconnect', {reason:'timeout', restartCount:connection.ice_restart_count});

          if(connection.ice_restart_count<connection.ice_restart_max_retries){
            // Try to recover. Reset the marker so this attempt gets a fresh
            // window; if it works, inbound traffic resumes and refreshes it.
            connection.ice_restart_count++;
            connection.last_recv_time=Date.now();
            restartIce();
          }else{
            // Exhausted — give up and close cleanly (emits 'close', frees the PC).
            ev.emit('error','connection lost — no inbound traffic for '+idle+'ms; closing after '+connection.ice_restart_max_retries+' recovery attempts');
            close_connection();
            return;   // close_connection already cleared the timer
          }
        }
      }

      connection.liveness_timer=setTimeout(check_liveness, liveness_period());
    }

    function start_liveness(){
      if(connection.liveness_enabled===false) return;
      if(connection.liveness_timer!==null) return;   // already running
      connection.last_recv_time=Date.now();
      connection.liveness_timer=setTimeout(check_liveness, liveness_period());
    }

    function build_connection_info(){
      return {
        type: connection.current_connection_type||'unknown',
        rtt: connection.current_rtt,             // ICE/DTLS-level (from getStats; may be null on some bindings)
        ping_rtt: connection.current_ping_rtt,   // app-level DataChannel round-trip (from ping/pong)
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

    function build_state_snapshot(){
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

    function build_stream_stats_obj(rec){
      return {
        video: {
          active: rec.video_active||false,
          width: rec.current_video_frame_width||0,
          height: rec.current_video_frame_height||0,
          fps: rec.current_video_fps||0,
          codec: rec.current_video_mime_type||null,
          bitrate: rec.video_bitrate||0,
          packetLoss: rec.video_packet_loss||0,
          jitter: rec.video_jitter||0
        },
        audio: {
          active: rec.audio_active||false,
          codec: rec.audio_mime_type||rec.current_audio_mime_type||null,
          bitrate: rec.audio_bitrate||0,
          packetLoss: rec.audio_packet_loss||0,
          jitter: rec.audio_jitter||0
        }
      };
    }

    // Track previous stats snapshots for change detection
    var _prev_stream_snapshots={};

    function emit_stream_stats(){
      // Sending streams
      for(var tag_id in connection.list_sending_live_mediastream){
        var rec=connection.list_sending_live_mediastream[tag_id];
        var key='s:'+tag_id;
        var stats=build_stream_stats_obj(rec);
        var snap=JSON.stringify(stats);
        if(_prev_stream_snapshots[key]!==snap){
          _prev_stream_snapshots[key]=snap;
          ev.emit('streamstats', tag_id, 'sending', stats);
        }
      }
      // Receiving streams
      for(var tag_id in connection.list_receiving_live_mediastream){
        var rec=connection.list_receiving_live_mediastream[tag_id];
        var key='r:'+tag_id;
        var stats=build_stream_stats_obj(rec);
        var snap=JSON.stringify(stats);
        if(_prev_stream_snapshots[key]!==snap){
          _prev_stream_snapshots[key]=snap;
          ev.emit('streamstats', tag_id, 'receiving', stats);
        }
      }
    }

    function sctp_events(){
      if(pc_alive()){
        if(connection.pc.sctp && connection.sctp==null){

          connection.sctp=connection.pc.sctp;

          adopt_primary_data_channel();

          try{
              
            if(connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport){

              set_connection_state({
                sctp_ice_state: String(connection.pc.sctp.transport.iceTransport.state)+""
              });

            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if(connection.pc.sctp.transport){

              set_connection_state({
                sctp_dtls_state: String(connection.pc.sctp.transport.state)+""
              });

            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{

            set_connection_state({
              sctp_state: String(connection.pc.sctp.state)+""
            });

          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if(connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport && 'onstatechange' in connection.pc.sctp.transport.iceTransport){
              connection.pc.sctp.transport.iceTransport.onstatechange=function(){
                if(pc_alive()){


                  set_connection_state({
                    sctp_ice_state: String(connection.pc.sctp.transport.iceTransport.state)+""
                  });

                  adopt_primary_data_channel();

                }
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if(connection.pc.sctp.transport && 'onstatechange' in connection.pc.sctp.transport){
              connection.pc.sctp.transport.onstatechange=function(){
                  
                if(pc_alive()){
                  
                  set_connection_state({
                    sctp_dtls_state: String(connection.pc.sctp.transport.state)+""
                  });
                  
                  adopt_primary_data_channel();
                }

                  
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if('onstatechange' in connection.pc.sctp){
              connection.pc.sctp.onstatechange=function(){
                if(pc_alive()){

                  set_connection_state({
                    sctp_state: String(connection.pc.sctp.state)+""
                  });

                  adopt_primary_data_channel();
                }
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }
          
          try{
            if(connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport && 'onselectedcandidatepairchange' in connection.pc.sctp.transport.iceTransport){
              connection.pc.sctp.transport.iceTransport.onselectedcandidatepairchange=function(){
                if(pc_alive()){
                  var selected_candidate_pair=connection.pc.sctp.transport.iceTransport.getSelectedCandidatePair();

                  set_connection_state({
                    local_protocol: selected_candidate_pair.local.protocol,
                    remote_protocol: selected_candidate_pair.remote.protocol
                  });

                  /*
                  */

                  connection_getstats();
                }
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }

            

        }
      }
    }


    function send_negotiation_done(seq){
      var uint8buffer=litepack.encode(SCHEMA_NEG_DONE,{seq:seq,epoch:connection.epoch_negotiation_success});
      send_signal(MSGCODE_TYPE_MAP['NEGOTIATION_DONE'],uint8buffer);
    }

    function process_income_answer(sdp,seq_offer) {
      //console.log('process_income_answer:');
      //console.log(sdp);

      if(connection.remote_support_trickle_ice==null){
        connection.remote_support_trickle_ice=is_support_trickle_ice(sdp);
      }

      if(seq_offer>=1 && seq_offer<=connection.local_offer_history.length){
        if(connection.local_offer_history[seq_offer-1][1]==0){
          connection.local_offer_history[seq_offer-1][1]=Date.now();
        }
      }

      if(pc_alive() && connection.negotiation_state==2 && connection.pc.signalingState == 'have-local-offer'){
        if(seq_offer==connection.local_offer_history.length){
          set_connection_state({
            negotiation_state: 3
          });

          connection.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdp })).then(function(){
            if(!pc_alive()) return;

            drain_pending_remote_candidates();

            if(connection.negotiation_state==3 && seq_offer==connection.local_offer_history.length){

              connection.base_offer_sdp=String(connection.sent_local_offer_sdp)+"";
              connection.epoch_negotiation_success++;

              if(connection.local_offer_history[seq_offer-1][2]==0){
                connection.local_offer_history[seq_offer-1][2]=Date.now();
              }

              //console.log('@@@@@@@@@@@@@@@@@');
              //console.log(connection.local_offer_history);

              send_negotiation_done(seq_offer);

              set_connection_state({
                negotiation_state: 0
              });

              //console.log('negotiation done!');

            }

          }).catch(function(error){

            if(connection.negotiation_state==3 && seq_offer==connection.local_offer_history.length){
              rollback_signaling_to_stable(function(){

                set_connection_state({
                  negotiation_state: 0
                });

              });
            }

            ev.emit('error', error);

          });
        }else{
          ev.emit('error', 'answer for old offer');
          //console.log('current local offer seq: '+connection.local_offer_history.length);
          //console.log('but get for: '+seq_offer);
        }
      }else{
        // Answer arrived but we already rolled back or aren't waiting — drop silently
        //ev.emit('error', 'not have local offer');
      }
    }

    function set_negotiation_done(seq,epoch){
      if(connection.seq_remote_offer==seq){
        connection.epoch_negotiation_success=epoch;
        //console.log('negotiation done!');

        if(connection.negotiation_state==5){
          clearTimeout(connection.negotiation_done_timeout_timer);
          connection.negotiation_done_timeout_timer=null;

          set_connection_state({
            negotiation_state: 0
          });
        }

      }
    }

    var pending_rollback_callbacks=[];

    function rollback_signaling_to_stable(callback){
      if(connection.pc){
        if(connection.pc.signalingState == 'stable'){
          if(typeof callback=='function'){
            callback(true);
          }
        }else{

          if(connection.making_rollback==false){
            connection.making_rollback=true;
            connection.pc.setLocalDescription({ type: 'rollback' }).then(function () {
              connection.making_rollback=false;

              if(typeof callback=='function'){
                callback(true);
              }
              // flush queued callbacks
              var queued=pending_rollback_callbacks.slice();
              pending_rollback_callbacks=[];
              for(var i=0;i<queued.length;i++){
                try{ queued[i](true); }catch(e){}
              }
            }).catch(function (error) {
              connection.making_rollback=false;

              if(typeof callback=='function'){
                callback(false);
              }
              // flush queued callbacks with failure
              var queued=pending_rollback_callbacks.slice();
              pending_rollback_callbacks=[];
              for(var i=0;i<queued.length;i++){
                try{ queued[i](false); }catch(e){}
              }
              ev.emit('error', error);
            });
          }else{
            // rollback already in progress — queue callback
            if(typeof callback=='function'){
              pending_rollback_callbacks.push(callback);
            }
          }
        }
      }
      
    }


    

    function set_remote_offer(){

      if(connection.pending_remote_offer_sdp!==null){
          
        // Mark as transitioning — block new offers but don't claim state 4 yet
        if(connection.negotiation_state!==0 && connection.negotiation_state!==2 && connection.negotiation_state!==5){
          return; // already handling a remote offer
        }

        var pre_state=connection.negotiation_state;
        set_connection_state({
          negotiation_state: 4
        });


        function create_answer(){
          //console.log('create answer...');
          if(pc_alive() && connection.negotiation_state==4 && connection.pc.signalingState == 'have-remote-offer'){

            var this_answer_for_seq=Number(connection.seq_remote_offer)+0;

            connection.pc.createAnswer().then(function (answer) {
              if(pc_alive() && connection.negotiation_state==4 && connection.pc.signalingState == 'have-remote-offer' && this_answer_for_seq==connection.seq_remote_offer){

                if('toJSON' in answer && typeof answer.toJSON=='function'){
                  var answer_json=answer.toJSON();
                }else{
                  var answer_json=answer;
                }

                var answer_modified=remove_all_ice_candidates(answer_json.sdp);

                connection.pc.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: answer_modified })).then(function () {
                  if(!pc_alive()) return;

                  if(connection.local_support_trickle_ice==null){
                    connection.local_support_trickle_ice=is_support_trickle_ice(connection.pc.localDescription.sdp);
                  }

                  if(this_answer_for_seq==connection.seq_remote_offer){
                    
                    connection.sent_local_answer_sdp=answer_modified;

                    send_answer(this_answer_for_seq,connection.pending_remote_offer_sdp,answer_modified);

                    connection.base_offer_sdp=String(connection.pending_remote_offer_sdp)+"";
                    connection.pending_remote_offer_sdp=null;

                    set_connection_state({
                      negotiation_state: 5
                    });

                  }else{
                    //not relevant now...
                  }

                }).catch(function (error) {

                  // setLocalDescription(answer) failed — clear pending to prevent retry loop
                  if(this_answer_for_seq==connection.seq_remote_offer){
                    connection.pending_remote_offer_sdp=null;
                    rollback_signaling_to_stable(function(){
                      set_connection_state({
                        negotiation_state: 0
                      });
                    });
                  }

                  ev.emit('error', error);
                });
              }else{
                //not relevant now...
              }

            }).catch(function (error) {

              // createAnswer failed — clear pending to prevent retry loop
              if(this_answer_for_seq==connection.seq_remote_offer){
                connection.pending_remote_offer_sdp=null;
                rollback_signaling_to_stable(function(){
                  set_connection_state({
                    negotiation_state: 0
                  });
                });
              }

              ev.emit('error', error);
            });
          }
        }


        // Always use explicit rollback before applying remote offer.
        // Implicit rollback (setRemoteDescription while in have-local-offer) can corrupt
        // Chrome's BUNDLE group state in edge cases (signal drops, glare).
        // Explicit rollback + backoff handles the rare SSL role error gracefully.
        var this_seq_remote_offer=Number(connection.seq_remote_offer)+0;

        function applyRemoteOffer(){
          if(!pc_alive()) return;
          connection.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: connection.pending_remote_offer_sdp })).then(function(){
            if(!pc_alive()) return;

            drain_pending_remote_candidates();

            if(this_seq_remote_offer==connection.seq_remote_offer){
              create_answer();
            }

          }).catch(function (error) {

            if(connection.negotiation_state==4 && this_seq_remote_offer==connection.seq_remote_offer){
              connection.pending_remote_offer_sdp=null;
              // Reset base so future diffs start fresh
              connection.base_offer_sdp=null;

              rollback_signaling_to_stable(function(){
                set_connection_state({
                  negotiation_state: 0
                });
              });

            }

            ev.emit('error', error);
          });
        }

        rollback_signaling_to_stable(function(ok){
          if(!ok){
            connection.pending_remote_offer_sdp=null;
            set_connection_state({ negotiation_state: 0 });
            return;
          }
          applyRemoteOffer();
        });
      
      }
    }

    function process_income_offer(sdp,seq_offer) {

      //console.log('process_income_offer:');
      //console.log(sdp);

      if(connection.remote_support_trickle_ice==null){
        connection.remote_support_trickle_ice=is_support_trickle_ice(sdp);
      }

      if(seq_offer>connection.seq_remote_offer){
        connection.seq_remote_offer=seq_offer;
        connection.pending_remote_offer_sdp=null;

        var base_remote_polite;
        if(connection.remote_nonce!==connection.local_nonce){
          base_remote_polite = (connection.remote_nonce > connection.local_nonce);
        }else{
          // 1-in-65534 tie: both peers drew the same nonce, so nonce comparison
          // makes BOTH impolite and glare can never resolve. Break the tie on the
          // DTLS fingerprints — each side compares (remote_fp vs local_fp), and
          // since the operands are swapped between the two peers, exactly one
          // side comes out polite. Certificates are generated independently, so
          // equal fingerprints are cryptographically impossible.
          base_remote_polite = false;
          var tie_remote_fp = get_fingerprint_from_sdp(sdp);
          var tie_local_fp  = connection.local_fingerprint;
          if(tie_local_fp==null && connection.pc && connection.pc.localDescription && connection.pc.localDescription.sdp){
            tie_local_fp = get_fingerprint_from_sdp(connection.pc.localDescription.sdp);
          }
          if(tie_remote_fp && tie_local_fp){
            for(var fb=0; fb<tie_remote_fp.length && fb<tie_local_fp.length; fb++){
              if(tie_remote_fp[fb]!==tie_local_fp[fb]){
                base_remote_polite = (tie_remote_fp[fb] > tie_local_fp[fb]);
                break;
              }
            }
          }
        }

        var even_epoch = (connection.epoch_negotiation_success % 2) === 0;
        var polite_now = even_epoch ? base_remote_polite : !base_remote_polite;

        if(connection.negotiation_state==0 || polite_now==true){
          connection.pending_remote_offer_sdp=sdp;
          if(connection.pc && (connection.negotiation_state==0 || connection.negotiation_state==2 || connection.negotiation_state==5)){
            set_remote_offer();
          }
        }else{
          //console.log('ignored_offer_due_to_glare');
        }

      }else{
        ev.emit('error', 'offer is old or already processed');
      }
      
    }


    

    function restartIce(){
      if(connection.need_ice_restart==false){
        connection.need_ice_restart=true;
        create_offer_schedule();
      }
    }

    function send_answer_raw(seq,raw_answer_sdp){
      var uint8buffer=litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(raw_answer_sdp)});
      send_signal(MSGCODE_TYPE_MAP['ANSWER_RAW'],uint8buffer);
    }

    function send_answer(seq,base_sdp,raw_answer_sdp){

      var base_hash=null;
      var result_hash=null;

      var min_viable_answer_sdp=null;
      var deflate_answer_sdp=null;
      var diff_answer_sdp=null;
      var diff_deflate_answer_sdp=null;

      var finish_count=2;
      
      
      function choose_best_payload(){

        var candidates=[];
        candidates.push([1,raw_answer_sdp.length]);
        
        if(min_viable_answer_sdp!==null){
          candidates.push([2,min_viable_answer_sdp.byteLength]);
        }
        if(deflate_answer_sdp!==null){
          candidates.push([3,deflate_answer_sdp.byteLength]);
        }
        if(diff_deflate_answer_sdp!==null){
          candidates.push([4,diff_deflate_answer_sdp.byteLength]);
        }
        if(diff_answer_sdp!==null){
          candidates.push([5,diff_answer_sdp.byteLength]);
        }
        

        candidates.sort(function(a, b){
          if (a[1] !== b[1]) {
            return a[1] - b[1]; // Smallest size first
          }
          return a[0] - b[0];   // Tie-break by code (prefer lower number)
        });

        var best = candidates[0][0];

        var _payload_names={1:'RAW',2:'COMPACT',3:'DEFLATE',4:'DIFF_DEFLATE',5:'DIFF'};
        ev.emit('log','answer payload: '+_payload_names[best]+' '+candidates[0][1]+'B  ('+
          candidates.map(function(c){return _payload_names[c[0]]+':'+c[1];}).join(' ')+')');

        if(best==1){
          send_signal(MSGCODE_TYPE_MAP['ANSWER_RAW'],
            litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(raw_answer_sdp)}));
        }else if(best==2){
          send_signal(MSGCODE_TYPE_MAP['ANSWER_COMPACT'],
            litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(min_viable_answer_sdp)}));
        }else if(best==3){
          send_signal(MSGCODE_TYPE_MAP['ANSWER_DEFLATE'],
            litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(deflate_answer_sdp)}));
        }else if(best==4){
          send_signal(MSGCODE_TYPE_MAP['ANSWER_DIFF_DEFLATE'],
            litepack.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD,{seq:seq,base_hash:base_hash>>>0,result_hash:result_hash>>>0,payload:toU8(diff_deflate_answer_sdp)}));
        }else if(best==5){
          send_signal(MSGCODE_TYPE_MAP['ANSWER_DIFF'],
            litepack.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD,{seq:seq,base_hash:base_hash>>>0,result_hash:result_hash>>>0,payload:toU8(diff_answer_sdp)}));
        }

        

      }


      min_viable_answer_sdp=compress_sdp_min_viable(raw_answer_sdp);

      if(min_viable_answer_sdp!==null){
        choose_best_payload();
      }else{
        // Start deflating the raw SDP immediately (runs concurrently with diff)
        compress_deflate(raw_answer_sdp,function(result){
          if(result!==null && result.byteLength<raw_answer_sdp.length){
            deflate_answer_sdp=result;
          }
          finish_count++;
          if(finish_count==5){ choose_best_payload(); }
        });

        if(base_sdp!==null){
          base_hash=murmurhash3_str(base_sdp);
          result_hash=murmurhash3_str(raw_answer_sdp);

          // compact-delta encode is async
          compactDelta.encodeString(base_sdp, raw_answer_sdp, function(err, delta){
            if(!err && delta){
              diff_answer_sdp=delta;
              finish_count++; // equivalent to old sync step

              compress_deflate(diff_answer_sdp,function(result){
                if(result!==null && result.byteLength<diff_answer_sdp.byteLength){
                  diff_deflate_answer_sdp=result;
                }
                finish_count++;
                if(finish_count==5){ choose_best_payload(); }
              });
            }else{
              // diff failed — skip both diff slots
              finish_count++;
              finish_count++;
              if(finish_count==5){ choose_best_payload(); }
            }
          });

        }else{
          finish_count++;
          finish_count++;
          if(finish_count==5){ choose_best_payload(); }
        }
      }

    }






    function send_offer_raw(seq,raw_offer_sdp){
      var uint8buffer=litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(raw_offer_sdp)});
      send_signal(MSGCODE_TYPE_MAP['OFFER_RAW'],uint8buffer);
    }

    function send_offer(seq,base_sdp,raw_offer_sdp){

      var base_hash=null;
      var result_hash=null;

      var min_viable_offer_sdp=null;
      var deflate_offer_sdp=null;
      var diff_offer_sdp=null;
      var diff_deflate_offer_sdp=null;
      

      var finish_count=2;
      
      
      
      function choose_best_payload(){

        var candidates=[];
        candidates.push([1,raw_offer_sdp.length]);
        
        if(min_viable_offer_sdp!==null){
          candidates.push([2,min_viable_offer_sdp.byteLength]);
        }
        if(deflate_offer_sdp!==null){
          candidates.push([3,deflate_offer_sdp.byteLength]);
        }
        if(diff_deflate_offer_sdp!==null){
          candidates.push([4,diff_deflate_offer_sdp.byteLength]);
        }
        if(diff_offer_sdp!==null){
          candidates.push([5,diff_offer_sdp.byteLength]);
        }
        

        candidates.sort(function(a, b){
          if (a[1] !== b[1]) {
            return a[1] - b[1]; // Smallest size first
          }
          return a[0] - b[0];   // Tie-break by code (prefer lower number)
        });

        var best = candidates[0][0];

        var _payload_names={1:'RAW',2:'COMPACT',3:'DEFLATE',4:'DIFF_DEFLATE',5:'DIFF'};
        ev.emit('log','offer payload: '+_payload_names[best]+' '+candidates[0][1]+'B  ('+
          candidates.map(function(c){return _payload_names[c[0]]+':'+c[1];}).join(' ')+')');

        if(best==1){
          send_signal(MSGCODE_TYPE_MAP['OFFER_RAW'],
            litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(raw_offer_sdp)}));
        }else if(best==2){
          send_signal(MSGCODE_TYPE_MAP['OFFER_COMPACT'],
            litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(min_viable_offer_sdp)}));
        }else if(best==3){
          send_signal(MSGCODE_TYPE_MAP['OFFER_DEFLATE'],
            litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:seq,payload:toU8(deflate_offer_sdp)}));
        }else if(best==4){
          send_signal(MSGCODE_TYPE_MAP['OFFER_DIFF_DEFLATE'],
            litepack.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD,{seq:seq,base_hash:base_hash>>>0,result_hash:result_hash>>>0,payload:toU8(diff_deflate_offer_sdp)}));
        }else if(best==5){
          send_signal(MSGCODE_TYPE_MAP['OFFER_DIFF'],
            litepack.encode(SCHEMA_SEQ_HASH_HASH_PAYLOAD,{seq:seq,base_hash:base_hash>>>0,result_hash:result_hash>>>0,payload:toU8(diff_offer_sdp)}));
        }

        

      }

      min_viable_offer_sdp=compress_sdp_min_viable(raw_offer_sdp);

      if(min_viable_offer_sdp!==null){
        choose_best_payload();
      }else{
        // Start deflating the raw SDP immediately (runs concurrently with diff)
        compress_deflate(raw_offer_sdp,function(result){
          if(result!==null && result.byteLength<raw_offer_sdp.length){
            deflate_offer_sdp=result;
          }
          finish_count++;
          if(finish_count==5){ choose_best_payload(); }
        });

        if(base_sdp!==null){
          base_hash=murmurhash3_str(base_sdp);
          result_hash=murmurhash3_str(raw_offer_sdp);

          // compact-delta encode is async
          compactDelta.encodeString(base_sdp, raw_offer_sdp, function(err, delta){
            if(!err && delta){
              diff_offer_sdp=delta;
              finish_count++; // equivalent to old sync step

              compress_deflate(diff_offer_sdp,function(result){
                if(result!==null && result.byteLength<diff_offer_sdp.byteLength){
                  diff_deflate_offer_sdp=result;
                }
                finish_count++;
                if(finish_count==5){ choose_best_payload(); }
              });
            }else{
              // diff failed — skip both diff slots
              finish_count++;
              finish_count++;
              if(finish_count==5){ choose_best_payload(); }
            }
          });

        }else{
          finish_count++;
          finish_count++;
          if(finish_count==5){ choose_best_payload(); }
        }
      }
      
    }

    function ensure_transceivers_for_sending(){
      // Called ONLY from create_offer, right before pc.createOffer().
      // Creates transceivers for tracks that don't have a sending slot yet.
      if(!connection.pc || typeof connection.pc.getTransceivers !== 'function') return;

      var ts = connection.pc.getTransceivers();

      function inferKindLocal(tc){
        for (var i=0;i<connection.created_transceivers.length;i++){
          if (connection.created_transceivers[i].tc === tc) return connection.created_transceivers[i].kind;
        }
        return null;
      }
      function tcIsSendingLocal(tc){
        // Use direction (desired state) not currentDirection (last negotiated),
        // because a reactivated transceiver has direction=sendonly but currentDirection=inactive until renegotiation
        return (tc.direction === 'sendonly' || tc.direction === 'sendrecv');
      }

      // Count how many sendonly/sendrecv slots we have per kind
      var sendVideoCount=0, sendAudioCount=0;
      for(var i=0;i<ts.length;i++){
        var tc=ts[i];
        if(!tc || !tcIsSendingLocal(tc)) continue;
        var k=inferKindLocal(tc);
        if(k==='video') sendVideoCount++;
        else if(k==='audio') sendAudioCount++;
      }

      // Count how many tracks we need to send
      var neededVideo=0, neededAudio=0;
      for(var tag_id in connection.list_sending_live_mediastream){
        var rec=connection.list_sending_live_mediastream[tag_id];
        if(rec.video_track) neededVideo++;
        if(rec.audio_track) neededAudio++;
      }

      // Create missing transceivers (appended at end of transceiver list)
      var toCreateV = neededVideo - sendVideoCount;
      for(var v=0; v<toCreateV; v++){
        create_transceiver('video');
      }
      var toCreateA = neededAudio - sendAudioCount;
      for(var a=0; a<toCreateA; a++){
        create_transceiver('audio');
      }
    }

    function create_offer(){
      if(pc_alive()){
        
        if((connection.negotiation_state==0) && (connection.pc.signalingState !== 'have-remote-offer') && (connection.making_rollback==false)){// || connection.negotiation_state==2
          
          set_connection_state({
            negotiation_state: 1
          });

          connection.local_offer_history.push([0,0,0]);//sent offer time,get answer time, nego done time

          var this_offer_for_seq=Number(connection.local_offer_history.length)+0;

          //console.log('create offer: '+this_offer_for_seq);

          var offer_options={};
          if(connection.need_ice_restart==true){
            offer_options.iceRestart=true;
          }

          // Create transceivers for tracks that need them — ONLY here, right before createOffer.
          // This ensures only the offering side adds m-lines, preventing m-line order conflicts.
          ensure_transceivers_for_sending();

          connection.pc.createOffer(offer_options).then(function(offer){
            if(pc_alive() && connection.negotiation_state==1 && connection.pc.signalingState !== 'have-remote-offer' && this_offer_for_seq==connection.local_offer_history.length){

              if('toJSON' in offer && typeof offer.toJSON=='function'){
                var offer_json=offer.toJSON();
              }else{
                var offer_json=offer;
              }

              //var offer_modified=offer_json.sdp;
              var offer_modified=remove_all_ice_candidates(offer_json.sdp);

              //console.log('my offer:');
              //console.log(offer_modified);

              connection.pc.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: offer_modified })).then(function(){
                if(!pc_alive()) return;

                if(connection.local_support_trickle_ice==null){
                  connection.local_support_trickle_ice=is_support_trickle_ice(connection.pc.localDescription.sdp);
                }

                if(connection.negotiation_state==1 && connection.pc.localDescription && this_offer_for_seq==connection.local_offer_history.length){

                  connection.sent_local_offer_sdp=offer_modified;
                  
                  connection.local_offer_history[this_offer_for_seq-1][0]=Date.now();

                  send_offer(this_offer_for_seq,connection.base_offer_sdp,offer_modified);

                  clearTimeout(connection.wait_for_answer_timeout_timer);
                  connection.wait_for_answer_timeout_timer=null;

                  var max_wait_time=7000;

                  // Adaptive: extend the timeout to the slowest observed answer
                  // plus 2s of headroom, so a consistently slow signaling path
                  // doesn't trip false rollbacks. Only the last 32 offers are
                  // consulted — recent history reflects the current network, and
                  // it keeps this O(1) per offer instead of O(all offers ever).
                  // NOTE: local_offer_history itself is never trimmed — the offer
                  // seq IS the array length (this_offer_for_seq above, and every
                  // seq==history.length check in the answer path), so truncating
                  // the array would corrupt sequencing. Entries are 3 numbers
                  // each; the memory cost of keeping them all is negligible.
                  var hist_start=Math.max(0, connection.local_offer_history.length-32);
                  for(var hi=hist_start; hi<connection.local_offer_history.length; hi++){
                    if(connection.local_offer_history[hi][1]>0){
                      var time_to_get_answer=connection.local_offer_history[hi][1]-connection.local_offer_history[hi][0];
                      if(time_to_get_answer+2000>max_wait_time){
                        max_wait_time=time_to_get_answer+2000;
                      }
                    }
                  }

                  // Add random jitter to prevent symmetric deadlocks
                  // where both peers timeout and retry at the exact same moment
                  max_wait_time += Math.floor(Math.random() * 500);

                  connection.wait_for_answer_timeout_timer=setTimeout(function(){
                    connection.wait_for_answer_timeout_timer=null;
                    
                    if(connection.negotiation_state==2){
                      // Reset base so next offer is sent RAW, not as diff against stale base
                      connection.base_offer_sdp=null;
                      rollback_signaling_to_stable(function(){
                        set_connection_state({
                          negotiation_state: 0
                        });
                      });
                    }

                  },max_wait_time);

                  connection.create_offer_failures=0;
                  connection.need_reoffer=false;
                  set_connection_state({
                    negotiation_state: 2
                  });
                  

                }else{
                  //not relevant...
                }
              }).catch(function(error){

                //console.log('error set local offer:');
                //console.log(offer_json);

                if(connection.negotiation_state==1 && this_offer_for_seq==connection.local_offer_history.length){
                  connection.create_offer_failures++;
                  connection.base_offer_sdp=null;
                  rollback_signaling_to_stable(function(){
                    set_connection_state({
                      negotiation_state: 0
                    });
                  });
                }
                ev.emit('error', error);
              });
            }

          }).catch(function(error){

            //console.log('error with create offer himself...');

            if(connection.negotiation_state==1 && this_offer_for_seq==connection.local_offer_history.length){
              connection.create_offer_failures++;
              connection.base_offer_sdp=null;
              rollback_signaling_to_stable(function(){
                set_connection_state({
                  negotiation_state: 0
                });
              });
            }
            
            ev.emit('error', error);
          });

        }
        

      }
    }


    function send_failed_decompress(type,seq){
      var uint8buffer=litepack.encode(SCHEMA_FAILED_DECOMPRESS,{failed_type:type,seq:seq});
      send_signal(MSGCODE_TYPE_MAP['FAILED_DECOMPRESS'],uint8buffer);
    }



    // ============================================================
    // Signaling chunking. Pure split/reassemble live in ./chunking.js;
    // here we only own the per-pipe state and the internal size limit.
    // App data (peer.send) never enters this path.
    // ============================================================
    function chunk_limit_internal(){
      var mms = 900;
      if (connection.pc && connection.pc.sctp && connection.pc.sctp.maxMessageSize > 0){
        mms = connection.pc.sctp.maxMessageSize;
      }
      return Math.min(connection.max_signal_chunk_size, mms);
    }

    function send_signal(type,data){

      var data_channel_open=(connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');

      if(data_channel_open==true){

        var uint8buffer=litepack.encode(SCHEMA_DC_MSG,{type:type,data:data instanceof Uint8Array?data:toU8(data)});
        var ilimit=chunk_limit_internal();
        if(uint8buffer.byteLength<=ilimit){
          data_channel_send_signal(uint8buffer);                // common case: priority lane
        }else{
          // Oversized signaling → wrap each fragment as its own DC_MSG of
          // type SIGNAL_CHUNK. App DATA never reaches here, so it's never split.
          // All fragments enter the same priority lane back-to-back, so they are
          // never interleaved with (or starved by) queued app data.
          var mid_i=(connection.chunk_send_id_internal=(connection.chunk_send_id_internal+1)&0xFFFF);
          var pieces_i=build_chunks(uint8buffer,ilimit,mid_i);
          for(var pi=0;pi<pieces_i.length;pi++){
            data_channel_send_signal(litepack.encode(SCHEMA_DC_MSG,{type:MSGCODE_TYPE_MAP['SIGNAL_CHUNK'],data:pieces_i[pi]}));
          }
        }

      }else{
        var data1=litepack.encode(SCHEMA_SIGNAL_INNER,{local_nonce:connection.local_nonce,remote_nonce:connection.remote_nonce,type:type,data:data instanceof Uint8Array?data:toU8(data)});
        var checksum_hash=murmurhash3_data(data1);
        var data2=litepack.encode(SCHEMA_SIGNAL_ENVELOPE,{checksum:checksum_hash>>>0,payload:data1});

        var elimit=connection.max_signal_chunk_size;
        if(data2.byteLength+1<=elimit){
          ev.emit('signal',litepack.encode(SCHEMA_SIGNAL_FRAME,{kind:0,body:data2}));   // whole
        }else{
          var mid_e=(connection.chunk_send_id_external=(connection.chunk_send_id_external+1)&0xFFFF);
          var pieces_e=build_chunks(data2,elimit,mid_e);
          for(var pe=0;pe<pieces_e.length;pe++){
            ev.emit('signal',litepack.encode(SCHEMA_SIGNAL_FRAME,{kind:1,body:pieces_e[pe]}));
          }
        }
      }

    }

    function process_income_signal(type,data){
      
      if(type>=MSGCODE_TYPE_MAP['OFFER_RAW'] && type<=MSGCODE_TYPE_MAP['OFFER_DIFF_DEFLATE']){//offer

        if(type==MSGCODE_TYPE_MAP['OFFER_DIFF_DEFLATE'] || type==MSGCODE_TYPE_MAP['OFFER_DIFF']){
          var b=litepack.decode(SCHEMA_SEQ_HASH_HASH_PAYLOAD,data);
          var seq=b.seq;

          if(murmurhash3_str(connection.base_offer_sdp)==b.base_hash){
            if(type==MSGCODE_TYPE_MAP['OFFER_DIFF_DEFLATE']){//DIFF + DEFLATE

              decompress_deflate_bytes(b.payload,function(deltaBytes){
                if(deltaBytes!==null){
                  compactDelta.decodeString(connection.base_offer_sdp, deltaBytes, function(err, sdp){
                    if(!err && murmurhash3_str(sdp)==b.result_hash){
                      process_income_offer(sdp,seq);
                    }else{
                      send_failed_decompress(type,seq);
                    }
                  });
                }else{
                  send_failed_decompress(type,seq);
                }
              });

            }else{

              // b.payload is the raw compact-delta Uint8Array
              compactDelta.decodeString(connection.base_offer_sdp, b.payload, function(err, sdp){
                if(!err && murmurhash3_str(sdp)==b.result_hash){
                  process_income_offer(sdp,seq);
                }else{
                  send_failed_decompress(type,seq);
                }
              });

            }
          }else{
            send_failed_decompress(type,seq);
          }

        }else{
          var b=litepack.decode(SCHEMA_SEQ_PAYLOAD,data);
          var seq=b.seq;

          if(type==MSGCODE_TYPE_MAP['OFFER_RAW']){//RAW
            process_income_offer(_TD.decode(b.payload),seq);
          }else if(type==MSGCODE_TYPE_MAP['OFFER_COMPACT']){//COMPACT
            process_income_offer(decompress_sdp_min_viable(b.payload),seq);
          }else{
            decompress_deflate(b.payload,function(result){
              if(result!==null){
                process_income_offer(result,seq);
              }else{
                send_failed_decompress(type,seq);
              }
            });
          }
        }

      }else if(type>=MSGCODE_TYPE_MAP['ANSWER_RAW'] && type<=MSGCODE_TYPE_MAP['ANSWER_DIFF_DEFLATE']){//answer

        if(type==MSGCODE_TYPE_MAP['ANSWER_DIFF_DEFLATE'] || type==MSGCODE_TYPE_MAP['ANSWER_DIFF']){
          var b=litepack.decode(SCHEMA_SEQ_HASH_HASH_PAYLOAD,data);
          var seq=b.seq;

          if(murmurhash3_str(connection.sent_local_offer_sdp)==b.base_hash){
            if(type==MSGCODE_TYPE_MAP['ANSWER_DIFF_DEFLATE']){//DIFF + DEFLATE

              decompress_deflate_bytes(b.payload,function(deltaBytes){
                if(deltaBytes!==null){
                  compactDelta.decodeString(connection.sent_local_offer_sdp, deltaBytes, function(err, sdp){
                    if(!err && murmurhash3_str(sdp)==b.result_hash){
                      process_income_answer(sdp,seq);
                    }else{
                      send_failed_decompress(type,seq);
                    }
                  });
                }else{
                  send_failed_decompress(type,seq);
                }
              });

            }else{

              // b.payload is the raw compact-delta Uint8Array
              compactDelta.decodeString(connection.sent_local_offer_sdp, b.payload, function(err, sdp){
                if(!err && murmurhash3_str(sdp)==b.result_hash){
                  process_income_answer(sdp,seq);
                }else{
                  send_failed_decompress(type,seq);
                }
              });

            }

          }else{
            send_failed_decompress(type,seq);
          }


        }else{
          var b=litepack.decode(SCHEMA_SEQ_PAYLOAD,data);
          var seq=b.seq;

          if(type==MSGCODE_TYPE_MAP['ANSWER_RAW']){//RAW
            process_income_answer(_TD.decode(b.payload),seq);
          }else if(type==MSGCODE_TYPE_MAP['ANSWER_COMPACT']){//COMPACT
            process_income_answer(decompress_sdp_min_viable(b.payload),seq);

          }else{
            decompress_deflate(b.payload,function(result){
              if(result!==null){
                process_income_answer(result,seq);
              }else{
                send_failed_decompress(type,seq);
              }
            });
          }
        }

      }else if(type==MSGCODE_TYPE_MAP['ICE_CANDIDATE_RAW']){//candidate raw

        try{
          var candidate_json=JSON.parse(_TD.decode(data));

          add_remote_candidates(candidate_json);

        }catch(error){
          ev.emit('error', error);
        }

      }else if(type==MSGCODE_TYPE_MAP['ICE_CANDIDATE_COMPACT']){//candidate compressed

        try{
          
          var dec = decode_candidate_binary(data);
          var candidate_json=to_RTCIceCandidateInit_from_decoded(dec);

          add_remote_candidates(candidate_json);


        }catch(error){
          ev.emit('error', error);
        }

      }else if(type==MSGCODE_TYPE_MAP['TOTAL_ICE_CANDIDATE']){//total_candidates

        var b=litepack.decode(SCHEMA_TOTAL_ICE,data);
        set_remote_total_candidates(b.total,_TD.decode(b.ufrag));

      }else if(type==MSGCODE_TYPE_MAP['NEGOTIATION_DONE']){//negotiation_done
        
        var b=litepack.decode(SCHEMA_NEG_DONE,data);
        set_negotiation_done(b.seq,b.epoch);

      }else if(type==MSGCODE_TYPE_MAP['MEDIASTREAM_MAP']){//mediastream_map

        try{

          var b=litepack.decode(SCHEMA_SEQ_PAYLOAD,data);
          var map_obj=JSON.parse(_TD.decode(b.payload));
          set_remote_mediastream_map(map_obj,b.seq);

          // ACK every receipt — even duplicates (a retransmit must be acked or
          // the sender retransmits forever). Sent outside the seq>... gate.
          send_signal(MSGCODE_TYPE_MAP['MEDIASTREAM_MAP_ACK'],litepack.encode(SCHEMA_ACK,{seq:b.seq}));

        }catch(error){
          ev.emit('error', error);
        }

      }else if(type==MSGCODE_TYPE_MAP['MEDIASTREAM_MAP_ACK']){//mediastream_map ack

        try{
          var ackb=litepack.decode(SCHEMA_ACK,data);
          var pend=connection.mediastream_map_pending;
          if(pend && ackb.seq>=pend.seq){
            connection.mediastream_map_pending=null;
            if(connection.mediastream_map_ack_timer){ clearTimeout(connection.mediastream_map_ack_timer); connection.mediastream_map_ack_timer=null; }
          }
        }catch(error){}

      }else if(type==MSGCODE_TYPE_MAP['FAILED_DECOMPRESS']){//faild_decompress

        var b=litepack.decode(SCHEMA_FAILED_DECOMPRESS,data);
        var seq=b.seq;

        if(b.failed_type>=MSGCODE_TYPE_MAP['OFFER_RAW'] && b.failed_type<=MSGCODE_TYPE_MAP['OFFER_DIFF_DEFLATE']){//send offer again...

          if(seq==connection.local_offer_history.length){
            send_offer_raw(seq,connection.sent_local_offer_sdp);
          }else{
            //too old... ignore...
          }

        }else if(b.failed_type>=MSGCODE_TYPE_MAP['ANSWER_RAW'] && b.failed_type<=MSGCODE_TYPE_MAP['ANSWER_DIFF_DEFLATE']){//send answer again...

          if(seq==connection.seq_remote_offer){
            if(connection.sent_local_answer_sdp!==null){
              send_answer_raw(seq,connection.sent_local_answer_sdp);
            }
          }else{
            //too old... ignore...
          }

        }


      }else if(type==MSGCODE_TYPE_MAP['PING']){//ping
        // Echo the timestamp straight back as PONG. Stateless: the value is the
        // sender's clock reading, which only the sender interprets.
        try{
          var pingb=litepack.decode(SCHEMA_PING,data);
          send_signal(MSGCODE_TYPE_MAP['PONG'],litepack.encode(SCHEMA_PING,{timestamp:pingb.timestamp}));
        }catch(error){}

      }else if(type==MSGCODE_TYPE_MAP['PONG']){//pong
        // Our own timestamp came back. rtt = now - then, measured on one clock.
        try{
          var pongb=litepack.decode(SCHEMA_PING,data);
          var rtt=Date.now()-pongb.timestamp;
          if(rtt>=0 && rtt<600000){           // sanity bound: ignore absurd values
            // App-level RTT (full DataChannel round-trip). Kept SEPARATE from
            // connection.current_rtt, which getStats owns and which measures the
            // lower-level ICE/DTLS RTT. Conflating them would make either field
            // flip between two different measurements every poll.
            connection.current_ping_rtt=rtt;
            ev.emit('rtt', rtt);
          }
        }catch(error){}

      }
    }

    function on_signal_channel(data){

      // This is the public signal() entry point: the app feeds it whatever arrived on
      // its own signaling transport. An escaping throw would land inside the app's
      // WebSocket handler, so every decode below is contained.
      try{
        // Outermost frame: kind 0 = whole envelope, kind 1 = a chunk of one.
        var _frame=litepack.decode(SCHEMA_SIGNAL_FRAME,data);
        var envBytes;
        if(_frame.kind===1){
          envBytes=reassemble_chunk(_frame.body,connection.chunk_reasm_external);
          if(envBytes===null) return;                 // still waiting / dropped
        }else{
          envBytes=_frame.body;
        }

        var _env=litepack.decode(SCHEMA_SIGNAL_ENVELOPE,envBytes);
        if(_env.checksum==murmurhash3_data(_env.payload)){
          var _inn=litepack.decode(SCHEMA_SIGNAL_INNER,_env.payload);

          if(connection.remote_nonce==0 && _inn.local_nonce>0){
            connection.remote_nonce=_inn.local_nonce;
          }

          var sctp_not_ready=(!connection.pc || !connection.pc.sctp || !connection.pc.sctp.maxChannels || (connection.pc.sctp.maxMessageSize===Infinity) || !connection.pc.sctp.maxMessageSize);
          if(_inn.local_nonce==connection.remote_nonce && ((_inn.remote_nonce==0 && sctp_not_ready) || _inn.remote_nonce==connection.local_nonce)){
            // Valid frame from the live session — any restart suspicion was noise.
            connection.nonce_mismatch_streak_count=0;
            connection.nonce_mismatch_streak_nonce=0;

            process_income_signal(_inn.type,_inn.data);
          }else{
            // Nonce mismatch: a frame from a stale session, or a replay — dropping
            // is correct. But if the SAME unfamiliar peer nonce keeps arriving, the
            // peer has restarted with a fresh nonce and will never match again:
            // close so the app can reconnect with a new instance (see the field
            // comments on nonce_mismatch_streak_*).
            if(_inn.local_nonce>0 && _inn.local_nonce!==connection.remote_nonce){
              if(connection.nonce_mismatch_streak_nonce===_inn.local_nonce){
                connection.nonce_mismatch_streak_count++;
              }else{
                connection.nonce_mismatch_streak_nonce=_inn.local_nonce;
                connection.nonce_mismatch_streak_count=1;
              }

              if(connection.nonce_mismatch_streak_count>=connection.nonce_mismatch_close_threshold){
                ev.emit('error','remote peer appears to have restarted (a new session nonce arrived '+connection.nonce_mismatch_streak_count+' times in a row) — closing this connection; create a new instance to reconnect');
                close_connection();
                return;
              }
            }

            report_malformed_frame('signal/nonce', 'nonce mismatch');
          }
        }else{
          // Checksum mismatch: corrupted or forged payload. Dropping is correct; there
          // is no recovery path anyway (we can't know the type or seq to ask for a
          // resend). The message-level timeouts will re-drive negotiation.
          report_malformed_frame('signal/checksum', 'checksum mismatch');
        }
      }catch(error){
        report_malformed_frame('signal', error);
      }
    }


    function update_all_mediastream_receivers(){

      if (connection.pc && typeof connection.pc.getTransceivers === 'function'){
        var ts = connection.pc.getTransceivers();

        for(var tag_id in connection.list_receiving_live_mediastream){
          
          var video_track=null;
          var audio_track=null;

          if(connection.list_receiving_live_mediastream[tag_id].video_mid!==null){
            for (var i=0;i<ts.length;i++){
              var tc = ts[i];
              if(tc && tc.receiver && tc.receiver.track && tc.receiver.track.readyState !== 'ended' && tc.receiver.track.kind === 'video'){
                if(String(connection.list_receiving_live_mediastream[tag_id].video_mid)==String(tc.mid)){
                  video_track=tc.receiver.track;
                }
              }
            }
          }

          if(connection.list_receiving_live_mediastream[tag_id].audio_mid!==null){
            for (var i=0;i<ts.length;i++){
              var tc = ts[i];
              if(tc && tc.receiver && tc.receiver.track && tc.receiver.track.readyState !== 'ended' && tc.receiver.track.kind === 'audio'){
                if(String(connection.list_receiving_live_mediastream[tag_id].audio_mid)==String(tc.mid)){
                  audio_track=tc.receiver.track;
                }
              }
            }
          }

          set_receiving_stream(tag_id, {
            video_track: video_track,
            audio_track: audio_track
          });


        }
      }


    }

    function set_receiving_stream(tag_id, options){
      if (!(tag_id in connection.list_receiving_live_mediastream)){
        connection.list_receiving_live_mediastream[tag_id] = {
          video_track: null,
          audio_track: null,
          video_mid:   null,
          audio_mid:   null,

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
          _prev_audio_stats_time: 0,
        };
      }

      var rec = connection.list_receiving_live_mediastream[tag_id];
      var need_update = false;

      var need_check_receivers = false;

      if (options && typeof options === 'object'){
        if ('video_mid' in options){
          var new_vmid = options.video_mid != null && String(options.video_mid).length ? String(options.video_mid) : null;
          if (rec.video_mid !== new_vmid){
            rec.video_mid = new_vmid;
            need_update = true;
            need_check_receivers=true;
            
            if (new_vmid == null && rec.video_track != null){
              rec.video_track = null;
              need_update = true;
            }
          }
        }
        if ('audio_mid' in options){
          var new_amid = options.audio_mid != null && String(options.audio_mid).length ? String(options.audio_mid) : null;
          if (rec.audio_mid !== new_amid){
            rec.audio_mid = new_amid;
            need_update = true;
            need_check_receivers=true;

            if (new_amid == null && rec.audio_track != null){
              rec.audio_track = null;
              need_update = true;
            }
          }
        }


        if ('video_track' in options){
          if((rec.video_track==null && options.video_track!==null) || (rec.video_track!==null && options.video_track==null) || isTrackEqual(rec.video_track, options.video_track)==false){

            var all_video_tracks = rec.mediastream.getVideoTracks();
            for(var vi=0; vi<all_video_tracks.length; vi++){
              rec.mediastream.removeTrack(all_video_tracks[vi]);
            }

            if(options.video_track!==null){
              rec.mediastream.addTrack(options.video_track);
            }

            rec.video_track=options.video_track;
            need_update = true;
          }
        }

        if ('audio_track' in options){
          if((rec.audio_track==null && options.audio_track!==null) || (rec.audio_track!==null && options.audio_track==null) || isTrackEqual(rec.audio_track, options.audio_track)==false){

            var all_audio_tracks = rec.mediastream.getAudioTracks();
            for(var ai=0; ai<all_audio_tracks.length; ai++){
              rec.mediastream.removeTrack(all_audio_tracks[ai]);
            }

            if(options.audio_track!==null){
              rec.mediastream.addTrack(options.audio_track);
            }

            rec.audio_track=options.audio_track;
            need_update = true;
          }
        }

      }



      if(need_check_receivers==true){
        update_all_mediastream_receivers();
      }
      

      if (need_update == true){
        
        ev.emit('stream', rec.mediastream, {
          tag_id: tag_id,
          video_track: rec.video_track,
          audio_track: rec.audio_track,
          video_mid: rec.video_mid,
          audio_mid: rec.audio_mid
        });

      }
    }

    function set_remote_mediastream_map(map_obj,seq){

      if(seq>connection.seq_remote_mediastream_map){
        connection.seq_remote_mediastream_map=seq;

        for (var tag_id in connection.list_receiving_live_mediastream){
          var need_remove=true;
          for(var tag_id2 in map_obj){
            if(String(tag_id2)==String(tag_id)){
              need_remove=false;
            }
          }

          if(need_remove==true){
            
            set_receiving_stream(tag_id,{
              video_mid: null,
              audio_mid: null
            });

          }
        }

        for(var tag_id in map_obj){
          set_receiving_stream(tag_id,{
            video_mid: map_obj[tag_id].video_mid,
            audio_mid: map_obj[tag_id].audio_mid
          });
        }

        // Always reconcile receivers — the map may have arrived before
        // negotiation assigned MIDs to receiver transceivers.
        // A later call ensures tracks are matched once TCs are ready.
        update_all_mediastream_receivers();

      }

    }


    function send_mediastream_map(){
      var out={};
      for (var tag_id5 in connection.list_sending_live_mediastream){
        out[tag_id5]={ 
          video_mid: connection.list_sending_live_mediastream[tag_id5].video_mid || null, 
          audio_mid: connection.list_sending_live_mediastream[tag_id5].audio_mid || null 
        };
      }

      var json_str=JSON.stringify(out);

      // Skip if map hasn't actually changed
      if(json_str===connection._last_sent_mediastream_map) return;
      connection._last_sent_mediastream_map=json_str;

      connection.seq_local_mediastream_map++;

      var uint8buffer=litepack.encode(SCHEMA_SEQ_PAYLOAD,{seq:connection.seq_local_mediastream_map,payload:toU8(json_str)});
      send_signal(MSGCODE_TYPE_MAP['MEDIASTREAM_MAP'],uint8buffer);

      // B2 reliability: hold this map until the peer ACKs its seq. A newer map
      // (higher seq) replaces this pending entry and restarts the schedule.
      connection.mediastream_map_pending={ seq:connection.seq_local_mediastream_map, bytes:uint8buffer, attempts:0 };
      schedule_mediastream_map_retransmit();
    }

    // Backoff schedule for re-sending an un-acked MEDIASTREAM_MAP.
    var MEDIASTREAM_MAP_BACKOFF=[500,1000,2000,4000,4000]; // 5 attempts, then give up
    function schedule_mediastream_map_retransmit(){
      if(connection.mediastream_map_ack_timer){ clearTimeout(connection.mediastream_map_ack_timer); connection.mediastream_map_ack_timer=null; }
      var p=connection.mediastream_map_pending;
      if(!p) return;
      if(p.attempts>=MEDIASTREAM_MAP_BACKOFF.length){ connection.mediastream_map_pending=null; return; }
      var delay=MEDIASTREAM_MAP_BACKOFF[p.attempts];
      connection.mediastream_map_ack_timer=setTimeout(function(){
        connection.mediastream_map_ack_timer=null;
        var pp=connection.mediastream_map_pending;
        if(!pp) return;                                  // acked or superseded
        pp.attempts++;
        send_signal(MSGCODE_TYPE_MAP['MEDIASTREAM_MAP'],pp.bytes); // resend same seq
        schedule_mediastream_map_retransmit();
      },delay);
    }


    function remove_unused_tracks(){
      clearTimeout(connection.remove_unused_tracks_timer);
      connection.remove_unused_tracks_timer=null;

      if(!pc_alive()) return;

      // Build set of MIDs currently in logical use
      var used = Object.create(null), k, rec;
      for (k in connection.list_sending_live_mediastream){
        rec = connection.list_sending_live_mediastream[k];
        if (!rec) continue;
        if (rec.video_mid) used[rec.video_mid] = true;
        if (rec.audio_mid) used[rec.audio_mid] = true;
      }

      var ts = connection.pc.getTransceivers();

      for (var i=0; i<ts.length; i++){
        var t = ts[i];
        if (!t || !t.sender) continue;

        // Only handle transceivers we created
        var isOurs = false;
        for (var j=0; j<connection.created_transceivers.length; j++){
          if (connection.created_transceivers[j].tc === t){ isOurs = true; break; }
        }
        if (!isOurs) continue;

        var mid = (typeof t.mid === 'string' && t.mid.length) ? t.mid : null;
        if (!mid) continue;

        var noTrack = !(t.sender.track);
        var notUsedLogically = !used[mid];

        // Keep direction as sendonly — the empty slot can be reused later
        // via replaceTrack() without any renegotiation.
        // Just clean up stale MID pointers.
        if (noTrack && notUsedLogically){
          for (k in connection.list_sending_live_mediastream){
            rec = connection.list_sending_live_mediastream[k];
            if (!rec) continue;
            if (rec.video_mid === mid) rec.video_mid = null;
            if (rec.audio_mid === mid) rec.audio_mid = null;
          }
        }
      }
    }


    function create_transceiver(kind,options){

      var tv = connection.pc.addTransceiver(kind, { direction:'sendonly' });
      connection.created_transceivers.push({ tc: tv, kind: kind });

      return tv;
    }


    function update_all_mediastream_senders(){

      if (connection.pc && typeof connection.pc.getTransceivers === 'function'){
          
        // === Short local helpers ===
        function tcIsSending(tc){
          // Use direction (desired state) not currentDirection (last negotiated)
          return (tc.direction === 'sendonly' || tc.direction === 'sendrecv');
        }
        function tcIsFree(tc){ return !(tc.sender && tc.sender.track); }
        function inferKind(tc){
          for (var i=0;i<connection.created_transceivers.length;i++){
            if (connection.created_transceivers[i].tc === tc) return connection.created_transceivers[i].kind;
          }
          return null;
        }
        function findTcByMid(mid, kind){
          if (!mid) return null;
          for (var i=0;i<ts.length;i++){
            var t = ts[i];
            if (t && t.mid === mid && t.sender && (!kind || (t.sender.track && t.sender.track.kind===kind))) return t;
          }
          return null;
        }
        function shallowEqualEnc(a,b){
          function pick(x){ return {
            active: x.active,
            maxBitrate: x.maxBitrate|0,
            maxFramerate: x.maxFramerate|0,
            scaleResolutionDownBy: (x.scaleResolutionDownBy==null?1:x.scaleResolutionDownBy)
          }; }
          if (!a && !b) return true;
          if (!a || !b) return false;
          if (a.length !== b.length) return false;
          for (var i=0;i<a.length;i++){
            var pa = pick(a[i]||{}), pb = pick(b[i]||{});
            if (pa.active!==pb.active || pa.maxBitrate!==pb.maxBitrate ||
                pa.maxFramerate!==pb.maxFramerate || pa.scaleResolutionDownBy!==pb.scaleResolutionDownBy) return false;
          }
          return true;
        }

        // === 1) Desired state ===
        var neededVideo = 0, neededAudio = 0, tagList = [];
        for (var tag_id in connection.list_sending_live_mediastream){
          var rec0 = connection.list_sending_live_mediastream[tag_id];
          if (rec0.video_track) neededVideo++;
          if (rec0.audio_track) neededAudio++;
          tagList.push(tag_id);
        }

        // === 2) Actual state — only what we manage and send ===
        var sendV = [], sendA = [];
        var ts = connection.pc.getTransceivers();
        for (var i=0;i<ts.length;i++){
          var tc = ts[i];
          if (!tc || !tcIsSending(tc)) continue;
          var kind = inferKind(tc);
          if (kind === 'video') sendV.push(tc);
          else if (kind === 'audio') sendA.push(tc);
        }

        // === 3) Balance slots ===
        var createdAny   = false; // needs negotiation if true
        var removedAny   = false;
        var stateChanged = false; // delta of tracks/assignments

        // Helper: find an inactive transceiver we own of the given kind
        function findInactiveTC(kind){
          for (var fi=0;fi<ts.length;fi++){
            var ftc=ts[fi];
            if(!ftc || ftc.stopped) continue;
            if(inferKind(ftc)!==kind) continue;
            // Must be inactive in BOTH desired and current direction
            if(ftc.direction==='inactive' && !(ftc.sender && ftc.sender.track)){
              return ftc;
            }
          }
          return null;
        }

        // VIDEO – reuse inactive slots; defer NEW transceiver creation to create_offer
        if (neededVideo > sendV.length){
          var toAddV = neededVideo - sendV.length;
          for (var a=0; a<toAddV; a++){
            var reusedV = findInactiveTC('video');
            if(reusedV){
              try{ reusedV.direction='sendonly'; }catch(e){}
              sendV.push(reusedV);
              createdAny = true;
            }else{
              // DON'T create transceiver here — only the offering side should.
              // create_offer() will call ensure_transceivers_for_sending() first.
              createdAny = true;
            }
          }
        }
        // When neededVideo < sendV.length, we have excess sendonly transceivers.
        // Don't remove tracks here — DETACH handles that per-tag.
        // Excess empty transceivers stay sendonly for future reuse via replaceTrack().

        // AUDIO – same: reuse inactive, defer new
        if (neededAudio > sendA.length){
          var toAddA = neededAudio - sendA.length;
          for (var a2=0; a2<toAddA; a2++){
            var reusedA = findInactiveTC('audio');
            if(reusedA){
              try{ reusedA.direction='sendonly'; }catch(e){}
              sendA.push(reusedA);
              createdAny = true;
            }else{
              createdAny = true; // deferred to create_offer
            }
          }
        }
        // Same: don't disable excess audio transceivers.

        // === 4) DETACH by mid that is no longer relevant ===
        for (var tgi=0; tgi<tagList.length; tgi++){
          var id = tagList[tgi];
          var r  = connection.list_sending_live_mediastream[id];

          // VIDEO
          if (r.video_mid != null){
            var tcv = findTcByMid(r.video_mid,'video');
            var detachV = (!r.video_track) || (!tcv || !tcIsSending(tcv));
            if (detachV && tcv && tcv.sender){
              var hadV = !!tcv.sender.track;
              try { tcv.sender.replaceTrack(null); } catch(e){}
              removedAny=true;
              if (hadV) stateChanged = true;
            }
            if (detachV){
              r.video_mid = null;
              stateChanged = true;
            }
          }
          // AUDIO
          if (r.audio_mid != null){
            var tca = findTcByMid(r.audio_mid,'audio');
            var detachA = (!r.audio_track) || (!tca || !tcIsSending(tca));
            if (detachA && tca && tca.sender){
              var hadA = !!tca.sender.track;
              try { tca.sender.replaceTrack(null); } catch(e){}
              removedAny=true;
              if (hadA) stateChanged = true;
            }
            if (detachA){
              r.audio_mid = null;
              stateChanged = true;
            }
          }
        }

        // === 4.5) Try to fill in mid from track already assigned to a sender ===
        for (var tag_id2 in connection.list_sending_live_mediastream){
          var rr = connection.list_sending_live_mediastream[tag_id2];
          if (!rr.video_mid && rr.video_track){
            for (var i2=0;i2<ts.length;i2++){
              var tc2 = ts[i2];
              if (tc2 && tc2.sender && tc2.sender.track === rr.video_track && inferKind(tc2)==='video'){
                if (typeof tc2.mid === 'string' && tc2.mid.length){
                  rr.video_mid = tc2.mid; stateChanged = true; break;
                }
              }
            }
          }
          if (!rr.audio_mid && rr.audio_track){
            for (var j2=0;j2<ts.length;j2++){
              var tc3 = ts[j2];
              if (tc3 && tc3.sender && tc3.sender.track === rr.audio_track && inferKind(tc3)==='audio'){
                if (typeof tc3.mid === 'string' && tc3.mid.length){
                  rr.audio_mid = tc3.mid; stateChanged = true; break;
                }
              }
            }
          }
        }

        // === 5) ATTACH — assign tracks to free slots ===
        function buildFree(list){
          var out = [];
          for (var i=0;i<list.length;i++){ if (tcIsFree(list[i])) out.push(list[i]); }
          return out;
        }
        var freeV = buildFree(sendV);
        var freeA = buildFree(sendA);

        for (var tgi2=0; tgi2<tagList.length; tgi2++){
          var id2 = tagList[tgi2];
          var r2  = connection.list_sending_live_mediastream[id2];

          if (r2.video_track && r2.video_mid == null && freeV.length){
            var tv2 = freeV.shift();
            var prevV = tv2 && tv2.sender ? tv2.sender.track : null;
            try { tv2.sender.replaceTrack(r2.video_track); } catch(e){}
            if (prevV !== r2.video_track) stateChanged = true;
            if (typeof tv2.mid === 'string' && tv2.mid.length && r2.video_mid !== tv2.mid){
              r2.video_mid = tv2.mid; stateChanged = true;
            }
          }
          if (r2.audio_track && r2.audio_mid == null && freeA.length){
            var ta2 = freeA.shift();
            var prevA = ta2 && ta2.sender ? ta2.sender.track : null;
            try { ta2.sender.replaceTrack(r2.audio_track); } catch(e){}
            if (prevA !== r2.audio_track) stateChanged = true;
            if (typeof ta2.mid === 'string' && ta2.mid.length && r2.audio_mid !== ta2.mid){
              r2.audio_mid = ta2.mid; stateChanged = true;
            }
          }
        }

        // === 5.9) Apply actual transmission constraints from the record (no external functions, no Promise) ===
        for (var tag_id4 in connection.list_sending_live_mediastream){
          if (!connection.list_sending_live_mediastream.hasOwnProperty(tag_id4)) continue;
          var rec4 = connection.list_sending_live_mediastream[tag_id4];

          // VIDEO
          if (rec4.video_mid && rec4.video_track){
            var tcv4 = findTcByMid(rec4.video_mid,'video');
            if (tcv4 && tcv4.sender && typeof tcv4.sender.getParameters=='function' && typeof window !== "undefined" && typeof window.document !== "undefined"){
              var s = tcv4.sender;
              var p = s.getParameters() || {};

              //console.log(p);
              if (!p.encodings || !p.encodings.length) p.encodings = [{}];

              var maxBR = (rec4.max_video_bitrate|0) > 0 ? (rec4.max_video_bitrate|0) : 0;
              var maxFPS = (rec4.max_video_fps|0) > 0 ? (rec4.max_video_fps|0) : 0;
              var scale  = (rec4.video_scale_down > 1) ? rec4.video_scale_down : 1;

              // Build target encodings based on existing ones
              var desired = [];
              for (var ei=0; ei<p.encodings.length; ei++){
                var enc = {};
                var cur = p.encodings[ei] || {};
                enc.active = (cur.active !== false);
                if (maxBR) enc.maxBitrate = maxBR;
                if (maxFPS) enc.maxFramerate = maxFPS;
                if (scale && scale !== 1) enc.scaleResolutionDownBy = scale;
                desired.push(enc);
              }

              var needSet = !shallowEqualEnc(p.encodings, desired) || (p.degradationPreference !== (rec4.degradation || 'balanced'));

              if (needSet && typeof s.setParameters=='function'){
                p.encodings = desired;
                p.degradationPreference = rec4.degradation || 'balanced';
                try { s.setParameters(p); } catch(e){}
                try { if (typeof s.requestKeyFrame === 'function') s.requestKeyFrame(); } catch(e){}
              }
            }
          }

          // AUDIO — no reliable maxBitrate on sender; channel hints only
          if (rec4.audio_mid && rec4.audio_track){
            var tca4 = findTcByMid(rec4.audio_mid,'audio');
            
          }
        }

        // === 6) Outbound logic update ===
        if (stateChanged){

          send_mediastream_map();
        }


        if(removedAny){
          //console.log('removedAny.................................');
          if(connection.remove_unused_tracks_timer==null){
            connection.remove_unused_tracks_timer=setTimeout(remove_unused_tracks,1500);
          }
        }

        // === 7) Schedule negotiation if new transceivers are needed ===
        if (createdAny){
          create_offer_schedule();
        }
      }
    }



    function set_sending_stream(tag_id, options){
      if (!(tag_id in connection.list_sending_live_mediastream)){
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

          audio_channel: 1,
        };
      }

      var rec = connection.list_sending_live_mediastream[tag_id];
      var need_update = false;

      if (options && typeof options === 'object'){
        if ('video_track' in options){
          var prevV = rec.video_track, nextV = options.video_track;
          if ((prevV == null) !== (nextV == null)) need_update = true;
          else if (prevV && nextV && isTrackEqual(prevV, nextV)==false) need_update = true;
          rec.video_track = nextV;
          if (nextV == null && rec.video_mid != null){
            need_update = true;
          }
        }
        if ('audio_track' in options){
          var prevA = rec.audio_track, nextA = options.audio_track;
          if ((prevA == null) !== (nextA == null)) need_update = true;
          else if (prevA && nextA && isTrackEqual(prevA, nextA)==false) need_update = true;
          rec.audio_track = nextA;
          if (nextA == null && rec.audio_mid != null){
            need_update = true;
          }
        }

        if ('mediastream_id' in options){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==options.mediastream_id){
            connection.list_sending_live_mediastream[tag_id].mediastream_id=options.mediastream_id;
          }
        }

        if ('max_video_fps' in options){

        }
        if ('max_video_bitrate' in options){
          
        }
        if ('video_scale_down' in options){
          
        }
      }

      if (need_update==true){
        if(connection.pc){
          update_all_mediastream_senders();
        }
      }
    }

    function stream(tag_id, options){
      
      set_sending_stream(tag_id, options);

    }

    function addStream(stream, options){
      if (stream && isMediaStream(stream)) {
        
        var mediastream_id=null;
        if(typeof stream.id==='string' && stream.id.length>0){
          mediastream_id=stream.id;
        }

        var for_tag_id=mediastream_id;

        for(var tag_id in connection.list_sending_live_mediastream){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){
              for_tag_id=tag_id;
              break;
            }
          }
        }

        var video_track=null;
        var audio_track=null;

        var all_tracks = stream.getTracks();

        for(var ti=0; ti<all_tracks.length; ti++){
          if(video_track==null && all_tracks[ti].kind=='video'){
            video_track=all_tracks[ti];
          }
          if(audio_track==null && all_tracks[ti].kind=='audio'){
            audio_track=all_tracks[ti];
          }
        }

        set_sending_stream(for_tag_id, {
          video_track: video_track,
          audio_track: audio_track
        });

      }
    }

    function removeStream(stream){
      if (stream && isMediaStream(stream)) {

        var mediastream_id=null;
        if(typeof stream.id==='string' && stream.id.length>0){
          mediastream_id=stream.id;
        }

        for(var tag_id in connection.list_sending_live_mediastream){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){

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

    function addTrack(track, stream, options){

      if (stream && isMediaStream(stream)) {
        
        var mediastream_id=null;
        if(typeof stream.id==='string' && stream.id.length>0){
          mediastream_id=stream.id;
        }

        var for_tag_id=mediastream_id;

        for(var tag_id in connection.list_sending_live_mediastream){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){
              for_tag_id=tag_id;
              break;
            }
          }
        }


        if(track && isMediaStreamTrack(track)){
          if('kind' in track){
            if(track.kind=='audio'){
              set_sending_stream(for_tag_id, {
                audio_track: track,
              });
            }else if(track.kind=='video'){
              set_sending_stream(for_tag_id, {
                video_track: track,
              });
            }
          }
        }

      }

      
    }

    function removeTrack(track, stream){
      var mediastream_id=null;

      if (stream && isMediaStream(stream)) {
        if(typeof stream.id==='string' && stream.id.length>0){
          mediastream_id=stream.id;
        }
      }

      if(track && isMediaStreamTrack(track)){
        for(var tag_id in connection.list_sending_live_mediastream){
          if(mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null && connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){

              if('kind' in track){
                if(track.kind=='audio'){
                  set_sending_stream(tag_id, {
                    audio_track: null,
                  });
                }else if(track.kind=='video'){
                  set_sending_stream(tag_id, {
                    video_track: null,
                  });
                }
              }

              break;
            
            }
          }else{
            if(connection.list_sending_live_mediastream[tag_id].video_track!==null && isTrackEqual(track,connection.list_sending_live_mediastream[tag_id].video_track)==true){
              set_sending_stream(tag_id, {
                video_track: null,
              });
            }
            if(connection.list_sending_live_mediastream[tag_id].audio_track!==null && isTrackEqual(track,connection.list_sending_live_mediastream[tag_id].audio_track)==true){
              set_sending_stream(tag_id, {
                audio_track: null,
              });
            }
          }
        }

        
      }
      
    }

    function send_total_candidates(){
      if(connection.pc.localDescription && connection.pc.localDescription.type){
        var current_local_ufrag=get_ufrag_from_sdp(connection.pc.localDescription.sdp);
        if(current_local_ufrag && current_local_ufrag in connection.list_gathered_local_candidates && connection.list_gathered_local_candidates[current_local_ufrag].length>0){

          var total=connection.list_gathered_local_candidates[current_local_ufrag].length;

          var uint8buffer=litepack.encode(SCHEMA_TOTAL_ICE,{total:total,ufrag:toU8(current_local_ufrag)});
          send_signal(MSGCODE_TYPE_MAP['TOTAL_ICE_CANDIDATE'],uint8buffer);
        }
      }
    }

    function analyze_local_candidates(){
      if(connection.pc.localDescription && connection.pc.localDescription.type){
        var current_local_ufrag=get_ufrag_from_sdp(connection.pc.localDescription.sdp);
        if(current_local_ufrag){

          var candidates=connection.list_gathered_local_candidates[current_local_ufrag] || [];
          
          // --- Collection ---
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

          var host_ipv4 = [];      // the machine's own IPv4 host address(es), if exposed
          var public_host = false; // a host candidate that is itself public => no NAT

          var map_local_to_srflx = new Map();

          for (var ci=0; ci<candidates.length; ci++) {
            var candidate = candidates[ci];
            if (!candidate) continue;

            var cand_str = candidate.candidate || '';
            var address = candidate.address || '';
            var port = (typeof candidate.port !== 'undefined' && candidate.port !== null) ? Number(candidate.port) : 0;
            var rel_addr = candidate.relatedAddress || '';
            var rel_port = (typeof candidate.relatedPort !== 'undefined' && candidate.relatedPort !== null) ? Number(candidate.relatedPort) : 0;
            var protocol = (candidate.protocol || '').toLowerCase();
            var ctype = candidate.type || ''; // host/srflx/prflx/relay

            // Minimal fallback from candidate line if missing
            if (!address || !port) {
              try {
                var parts = cand_str.split(' ');
                if (parts.length > 6) {
                  if (!address) address = parts[4];
                  if (!port)    port    = Number(parts[5])|0;
                }
                for (var j = 0; j < parts.length - 1; j++) {
                  if (parts[j] === 'raddr' && !rel_addr) rel_addr = parts[j+1];
                  if (parts[j] === 'rport' && !rel_port) rel_port = Number(parts[j+1])|0;
                  if (parts[j] === 'typ'   && !ctype && (j+1)<parts.length) ctype = parts[j+1];
                }
              } catch(e){}
            }

            if (address)  address  = strip_brackets(address);
            if (rel_addr) rel_addr = strip_brackets(rel_addr);

            // Protocol flags
            if (protocol === 'udp') supports_udp = true;
            if (protocol === 'tcp') supports_tcp = true;

            // Candidate types
            if (ctype === 'host') seen_host = true;
            else if (ctype === 'srflx') seen_srflx = true;
            else if (ctype === 'prflx') seen_prflx = true;
            else if (ctype === 'relay') seen_relay = true;

            // Own host address: capture real (non-mDNS) IPv4, and note if a host
            // candidate is itself public (=> no NAT in front of us).
            if (ctype === 'host' && address && address.indexOf('.local') < 0 && !is_ipv6_addr(address)){
              if (host_ipv4.indexOf(address) === -1) host_ipv4.push(address);
              if (is_public_ip(address)) public_host = true;
            }

            // --- Clear separation: own (host/srflx/prflx) vs relay ---

            // The candidate's own address
            if (is_public_ip(address)) {
              if (ctype === 'relay') {
                if (is_ipv6_addr(address)) { if (relay_ipv6.indexOf(address) === -1) relay_ipv6.push(address); }
                else                       { if (relay_ipv4.indexOf(address) === -1) relay_ipv4.push(address); }
              } else {
                if (is_ipv6_addr(address)) { if (list_ipv6.indexOf(address) === -1) list_ipv6.push(address); }
                else                       { if (list_ipv4.indexOf(address) === -1) list_ipv4.push(address); }
              }
            }

            // relatedAddress (local source/STUN server) — add to "own" only if not relay
            if (is_public_ip(rel_addr) && ctype !== 'relay') {
              if (is_ipv6_addr(rel_addr)) { if (list_ipv6.indexOf(rel_addr) === -1) list_ipv6.push(rel_addr); }
              else                        { if (list_ipv4.indexOf(rel_addr) === -1) list_ipv4.push(rel_addr); }
            }

            // Mapping for symmetric/cone detection.
            // Key MUST be the local base (relatedAddress:relatedPort). Without it we
            // cannot tell which external mappings share a local socket, so we skip the
            // candidate entirely rather than mis-key it on its external address (which
            // would make symmetric NAT look like cone — a dangerous false negative).
            if ((ctype === 'srflx' || ctype === 'prflx') && rel_addr && rel_port) {
              var localKey = rel_addr + '(' + rel_port + ')';
              var mapped = (address && port) ? (address + '(' + port + ')') : '';
              if (mapped) {
                if (!map_local_to_srflx.has(localKey)) map_local_to_srflx.set(localKey, new Set());
                map_local_to_srflx.get(localKey).add(mapped);
              }
            }
          }

          // --- Symmetric-NAT detection ---
          // Same local endpoint mapped to >1 external mapping (across STUN servers)
          // => symmetric (mapping changes per destination => P2P generally fails).
          // Heuristic only (STUN NAT-typing is not 100% reliable), so it's a hint.
          var symmetric_detected = false;
          var cone_detected = false;
          var it = map_local_to_srflx.values();
          var itn = it.next ? it.next() : { done:true };
          while (!itn.done) {
            var s = itn.value;
            if (s && s.size > 1) symmetric_detected = true;
            if (s && s.size === 1) cone_detected = true;
            itn = it.next();
          }

          // true = symmetric (problematic), false = fine (cone-like or no NAT),
          // null = couldn't characterize (e.g. no STUN, gathering incomplete).
          var symmetric_nat = null;
          if (symmetric_detected) symmetric_nat = true;
          else if (cone_detected || public_host) symmetric_nat = false;

          connection.local_public_ipv4=list_ipv4;
          connection.local_public_ipv6=list_ipv6;

          connection.local_relay_ipv4=relay_ipv4;
          connection.local_relay_ipv6=relay_ipv6;

          connection.local_support_udp=supports_udp;
          connection.local_support_tcp=supports_tcp;

          connection.local_symmetric_nat=symmetric_nat;

          // Network profile — characterises the user's own network (independent of any
          // specific peer). Emitted once data is available and again only if it changes.
          var needs_relay = (symmetric_nat === true) || (supports_udp === false);
          var profile = {
            public_ipv4:     list_ipv4[0] || null,
            public_ipv6:     list_ipv6[0] || null,
            all_public_ipv4: list_ipv4.slice(),
            all_public_ipv6: list_ipv6.slice(),
            local_ipv4:      host_ipv4[0] || null,
            symmetric_nat:   symmetric_nat,   // true=problematic, false=fine, null=unknown
            supports_udp:    supports_udp,
            supports_tcp:    supports_tcp,
            needs_relay:     needs_relay
          };
          var profile_sig = JSON.stringify(profile);
          if (profile_sig !== connection._last_network_profile){
            connection._last_network_profile = profile_sig;
            ev.emit('networkprofile', profile);
          }
        }
      }
    }


    

    // ============================================================
    // Head-pointer queue/window plumbing.
    // Consuming from the FRONT of an array with shift() is O(n) per item —
    // under load that turned every drain into O(n²) synchronous work (measured:
    // a single 8s event-loop stall at 80K queued tiny messages). Instead, the
    // front is consumed by advancing a head index (O(1)); identity-by-position,
    // the same trick as QUICO's pn-history. The consumed prefix is physically
    // freed by a splice only once the head crosses a threshold — amortized O(1)
    // per item, and the array never holds more than (live + threshold) entries.
    // ============================================================
    var QUEUE_COMPACT_THRESHOLD = 4096;

    // Per-tick send ceiling for BOTH pump lanes — the analogue of QUICO's
    // max_packets_per_burst. A deliberate internal constant, not an option:
    // it exists to bound synchronous work per event-loop turn, and dc.send is
    // cheap enough that 512 sends stay well under a millisecond. Exceeding the
    // ceiling just breaks the loop; the tail reschedule resumes at ~0-1ms.
    var SENDS_MAX_PER_TICK = 512;

    function data_queue_length(){
      return connection.data_channel_sending_messages_queue.length - connection.data_q_head;
    }
    function signal_queue_length(){
      return connection.signal_sending_messages_queue.length - connection.signal_q_head;
    }
    function compact_data_queue(){
      if(connection.data_q_head>=QUEUE_COMPACT_THRESHOLD){
        connection.data_channel_sending_messages_queue.splice(0, connection.data_q_head);
        connection.data_q_head=0;
      }
    }
    function compact_signal_queue(){
      if(connection.signal_q_head>=QUEUE_COMPACT_THRESHOLD){
        connection.signal_sending_messages_queue.splice(0, connection.signal_q_head);
        connection.signal_q_head=0;
      }
    }

    function data_channel_get_send_rate(){
      var now = Date.now();
      var cutoff = now - 1000;
      var evs = connection.data_channel_sent_events;

      // Evict entries older than the window by advancing the head and
      // decrementing the running sums — O(evicted), and reading the totals
      // is O(1) because they're maintained incrementally at push time.
      while (connection.sent_events_head < evs.length && evs[connection.sent_events_head][0] < cutoff){
        connection.sent_window_bytes -= evs[connection.sent_events_head][1];
        connection.sent_window_count--;
        connection.sent_events_head++;
      }
      if (connection.sent_events_head >= QUEUE_COMPACT_THRESHOLD){
        evs.splice(0, connection.sent_events_head);
        connection.sent_events_head = 0;
      }

      return [connection.sent_window_count, connection.sent_window_bytes];
    }


    // True when at least one user rate limit is set. In unlimited mode (both
    // Infinity — the default) the pump skips the sliding-window bookkeeping
    // entirely, so high message rates don't pay O(window) per send for a limit
    // nobody configured.
    function rate_limits_active(){
      return (connection.data_channel_max_sending_messages_per_sec!==Infinity ||
              connection.data_channel_max_sending_bytes_per_sec!==Infinity);
    }

    function data_channel_schedule_pump(){
      // NOTE: deliberately NOT gated by data_channel_sending_messages_paused.
      // pause() only skips the data-lane send loop inside the pump; the tick
      // itself must keep running so the expiry sweep ages messages out and the
      // signal lane keeps flowing. See expire_queued_messages().
      if(connection.data_channel_pump_queue_timer!==null) return;

      var has_signal=signal_queue_length()>0;
      var has_data=data_queue_length()>0;
      if(!has_signal && !has_data) return;

      var wait_time=0;
      var now = Date.now();

      // The user rate limits govern the data lane only. If signaling is waiting,
      // the pump must run immediately regardless of the data budget — the signal
      // lane ignores these limits anyway.
      if(!has_signal && rate_limits_active()){

        var [sent_count,sent_bytes]=data_channel_get_send_rate();

        if(sent_count>=connection.data_channel_max_sending_messages_per_sec){

          var oldest_ts = connection.data_channel_sent_events[0][0];
          wait_time = Math.max(wait_time, 1000 - (now - oldest_ts));
        }

        if(sent_bytes>=connection.data_channel_max_sending_bytes_per_sec && sent_count > 0){
          // now total > lim_bytes; need the front event to expire to drop below
          // the event we wait for is data_channel_sent_events[0] .. or more:
          // calculate forward accumulation until we drop below the limit:
          var sumFwd = sent_bytes;
          var j = 0;
          while (j < sent_count && sumFwd > connection.data_channel_max_sending_bytes_per_sec){
            sumFwd -= connection.data_channel_sent_events[j][1];
            j++;
          }
          // the event to expire is the one before j (all j events will drop from window)
          var ts_to_expire = connection.data_channel_sent_events[j-1 >= 0 ? (j-1) : 0][0];
          var w = 1000 - (now - ts_to_expire);
          if (w > wait_time){
            wait_time = w;
          }


        }
      }

      if(wait_time<0){
        wait_time=0;
      }
      if(wait_time>60){
        wait_time=60;
      }

      if(wait_time<=0){
        var data_channel_open=(connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');

        if(data_channel_open==true){

          // Blocked only when the next message can't fit under the HIGH watermark
          // (max_buffered_amount); onbufferedamountlow (threshold = min) plus this
          // 10ms poll resume the pump once SCTP drains.
          var next_msg = has_signal
            ? connection.signal_sending_messages_queue[connection.signal_q_head]
            : connection.data_channel_sending_messages_queue[connection.data_q_head];
          if ((connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount + next_msg.data.byteLength) > connection.data_channel_max_buffered_amount){
            wait_time=10;
          }

        }else{
          wait_time=20;
        }
      }

      // Paused with nothing but data pending: the tick only exists to age the
      // queue out, so a slow beat is enough — no need to spin at 10-20ms.
      if(connection.data_channel_sending_messages_paused===true && !has_signal){
        wait_time=Math.max(wait_time,250);
      }

      connection.data_channel_pump_queue_timer=setTimeout(function(){
        connection.data_channel_pump_queue_timer=null;
        data_channel_pump_queue();
      }, wait_time);
    }

    // Drops queued messages that have waited longer than data_channel_max_queue_age and
    // settles their callbacks as failed. Swept centrally from the pump rather than from a
    // per-message timer: the pump already re-schedules itself for exactly as long as any
    // queue is non-empty (see the tail of data_channel_pump_queue, which sits outside every
    // guard), so it ticks precisely when there is something to age out, and not at all
    // when both queues are empty. A dedicated timer would just duplicate it.
    //
    // Each queue is FIFO and the TTL is uniform, so it is always ordered oldest-first and
    // everything expired is a prefix: peel from the front, stop at the first item still in
    // date. O(expired), not O(queue).
    //
    // The invariant "queue non-empty => pump scheduled" survives pause(): the paused flag
    // gates only the data-lane SEND loop, never data_channel_schedule_pump — while paused
    // with only data pending the tick merely slows to a 250ms beat, which is plenty for
    // aging (TTL floor is 1000ms).
    // Per-tick expiry batch. Expiry itself is O(1) per message with the head
    // pointer, but each expired DATA message also settles a user callback —
    // arbitrary app code — so a mass expiry (e.g. a long pause, a dead link)
    // is capped per tick and the remainder ages out on the following ticks.
    var EXPIRE_MAX_PER_TICK = 4096;

    function expire_queued_messages(){
      var now=Date.now();
      var budget=EXPIRE_MAX_PER_TICK;

      // Signal lane: dropped silently — no callbacks to settle and no event.
      // A signal older than maxQueueAge is already useless (answer timeouts,
      // FAILED_DECOMPRESS and MEDIASTREAM_MAP retransmits have long since taken
      // over), so counting is all the observability it needs.
      var sq=connection.signal_sending_messages_queue;
      while(budget>0 && connection.signal_q_head<sq.length && (now-sq[connection.signal_q_head].ts)>connection.data_channel_max_queue_age){
        connection.signal_q_head++;
        connection.stats_dropped_expired_signals++;
        budget--;
      }
      compact_signal_queue();

      var q=connection.data_channel_sending_messages_queue;
      if(data_queue_length()==0) return;

      var expired=[];

      while(budget>0 && connection.data_q_head<q.length && (now-q[connection.data_q_head].ts)>connection.data_channel_max_queue_age){
        var ex=q[connection.data_q_head];
        connection.data_q_head++;
        connection.data_channel_queued_bytes-=ex.data.byteLength;
        expired.push(ex);
        budget--;
      }
      compact_data_queue();

      if(expired.length==0) return;

      connection.stats_dropped_expired+=expired.length;

      for(var i=0;i<expired.length;i++){
        if(typeof expired[i].callback=='function'){
          try{
            expired[i].callback(false);
          }catch(cb_error){
            ev.emit('error', cb_error);
          }
        }
      }

      // One report per sweep, not one per message, and rate-limited on top: under sustained
      // congestion the pump ticks every few ms and would otherwise flood the app with events.
      if(now-connection.last_expired_emit_ts>=1000){
        connection.last_expired_emit_ts=now;
        ev.emit('error','dropped '+expired.length+' queued message(s) still unsent after '+connection.data_channel_max_queue_age+'ms ('+connection.stats_dropped_expired+' total)');
      }
    }

    function data_channel_pump_queue(){

      // Age the queues out first, before any DC/buffer gating: a message must expire even
      // when the channel is closed, blocked, or paused — those are exactly the cases it
      // is stuck in.
      expire_queued_messages();

      function primary_dc_open(){
        return (connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');
      }

      if(primary_dc_open()){

        // ===== Signal lane — always drained FIRST =====
        // Exempt from the user rate limits and from pause(): signaling (offers,
        // answers, candidates, ping/pong, acks) is what keeps the connection alive
        // and recoverable, so app-data throttling must never starve it. The only
        // gate it respects is the SCTP buffer watermark — that one protects the
        // transport itself.
        var sig_sent_this_tick=0;
        while (signal_queue_length()>0){

          // Per-tick work ceiling (QUICO's max_packets_per_burst pattern): even
          // a pathological signal flood can't hold the event loop — we break,
          // the tail reschedules at ~0ms, and the loop breathes between bursts.
          if(sig_sent_this_tick>=SENDS_MAX_PER_TICK) break;

          if(!primary_dc_open()) break;

          var sig_dc=connection.list_data_channels[connection.data_channel_primary_index];
          var sig_data=connection.signal_sending_messages_queue[connection.signal_q_head].data;

          if ((sig_dc.bufferedAmount + sig_data.byteLength) > connection.data_channel_max_buffered_amount){
            break; // buffer full — onbufferedamountlow / the 10ms poll resumes us
          }

          try{
            sig_dc.send(sig_data);
            connection.signal_q_head++;      // head-pointer drain — no shift
            sig_sent_this_tick++;
          } catch (error) {
            // Same retry contract as the data lane below: the message stays at the
            // head (shift sits after send), the pump re-schedules at the tail, and
            // the break prevents a synchronous spin on a throwing send().
            connection.stats_send_failures++;

            var sig_fail_now=Date.now();
            if(sig_fail_now-connection.last_send_failure_emit_ts>=1000){
              connection.last_send_failure_emit_ts=sig_fail_now;
              ev.emit('log','datachannel send failed, message stays queued for retry ('+connection.stats_send_failures+' total): '+((error && error.message) ? error.message : String(error)));
            }

            break;
          }
        }
        compact_signal_queue();

        // ===== Data lane =====
        // pause() gates ONLY this block: the expiry sweep above and the signal lane
        // keep running, so a long pause can never stall liveness or negotiation.
        if(connection.data_channel_sending_messages_paused===false &&
           primary_dc_open() &&
           connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount < connection.data_channel_max_buffered_amount){

          var callbacks_sent_ok=[];
          var sent_any_data=false;
          var data_sent_this_tick=0;

          while (data_queue_length()>0){

            // Per-tick work ceiling. Without it, tiny messages against the 1MB
            // watermark meant one tick could attempt ~80K synchronous sends —
            // combined with shift() that was the measured 8-second stall. Now a
            // tick does at most SENDS_MAX_PER_TICK sends and yields; the tail
            // reschedule (~0-1ms) resumes immediately, so throughput is intact
            // while the event loop stays responsive.
            if(data_sent_this_tick>=SENDS_MAX_PER_TICK) break;

            if(!primary_dc_open()) break;

            var head=connection.data_channel_sending_messages_queue[connection.data_q_head];
            var data_to_send=head.data;

            // TTL guard at send time. The expiry sweep above is batch-capped
            // (EXPIRE_MAX_PER_TICK), so under a mass expiry, messages whose TTL
            // has already lapsed can reach this lane before the sweep gets to
            // them — and sending one would settle its callback as SUCCESS after
            // the contract promised failure. Drop it exactly as the sweep would.
            if((Date.now()-head.ts) > connection.data_channel_max_queue_age){
              connection.data_q_head++;
              connection.data_channel_queued_bytes-=data_to_send.byteLength;
              connection.stats_dropped_expired++;
              if(typeof head.callback=='function'){
                try{ head.callback(false); }catch(cb_error){ ev.emit('error', cb_error); }
              }
              data_sent_this_tick++;   // callback work counts against the tick budget
              continue;
            }

            // Oversize check, deferred to here so send() can queue before SCTP is
            // negotiated (pre-connection sends). Once maxMessageSize is known, an
            // oversized message fails immediately — with its callback settled —
            // instead of bouncing off the transport until the TTL kills it.
            if(connection.pc && connection.pc.sctp && connection.pc.sctp.maxMessageSize>0 && data_to_send.byteLength>connection.pc.sctp.maxMessageSize){
              connection.data_q_head++;
              connection.data_channel_queued_bytes-=data_to_send.byteLength;
              if(typeof head.callback=='function'){
                try{ head.callback(false); }catch(cb_error){ ev.emit('error', cb_error); }
              }
              ev.emit('error', 'message must be less than '+connection.pc.sctp.maxMessageSize+' bytes (got '+data_to_send.byteLength+')');
              continue;
            }

            // Fill up to the HIGH watermark (max_buffered_amount). Resumption when
            // SCTP drains back down to the LOW watermark comes from
            // onbufferedamountlow (threshold = min_buffered_amount) plus the 10ms
            // poll in the scheduler. Classic high/low watermark flow control:
            // keeps the pipe full instead of capping the in-flight window at the
            // low mark.
            if ((connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount + data_to_send.byteLength) > connection.data_channel_max_buffered_amount){
              break; // wait for onbufferedamountlow event
            }

            if(rate_limits_active()){
              var [sent_count,sent_bytes]=data_channel_get_send_rate();

              if(sent_count>=connection.data_channel_max_sending_messages_per_sec || sent_bytes>=connection.data_channel_max_sending_bytes_per_sec){
                break;
              }
            }

            try{
              var now=Date.now();
              connection.list_data_channels[connection.data_channel_primary_index].send(data_to_send);
              sent_any_data=true;
              data_sent_this_tick++;

              if(rate_limits_active()){
                // The sliding window is only consulted while a limit is set;
                // skipping the bookkeeping in unlimited mode avoids the work
                // entirely for a limit nobody configured. Running sums make the
                // limiter's read O(1) (see data_channel_get_send_rate).
                connection.data_channel_sent_events.push([now,data_to_send.byteLength]);
                connection.sent_window_count++;
                connection.sent_window_bytes+=data_to_send.byteLength;
              }

              if(head.callback!==null){
                callbacks_sent_ok.push(head.callback);
              }

              connection.data_q_head++;      // head-pointer drain — no shift
              connection.data_channel_queued_bytes-=data_to_send.byteLength;

            } catch (error) {
              // The message is still at the head of the queue: shift() sits after send()
              // inside this try, so a throw leaves it un-shifted, and the pump re-schedules
              // itself at the tail of this function while the queue is non-empty. It WILL
              // be retried on the next tick.
              //
              // The break is load-bearing. Every escape from this while-loop keys off a
              // side effect of a *successful* send: the shift, the bufferedAmount growth,
              // the sent_events growth that drives the rate limiter. A throw produces none
              // of them, so without this break the loop re-reads the same queue[0], throws
              // again, and spins synchronously — freezing the event loop rather than
              // crashing it, which is far harder to diagnose.
              //
              // And this is a retry, not a failure — so no 'error'. Emitting one here would
              // fire on every attempt for a message that may still go out, and the app would
              // get an 'error' for a message that ultimately succeeded. The single authoritative
              // failure is raised by expire_queued_messages() once the TTL lapses, together
              // with callback(false). Until then: count it, and log it at most once a second.
              connection.stats_send_failures++;

              var fail_now=Date.now();
              if(fail_now-connection.last_send_failure_emit_ts>=1000){
                connection.last_send_failure_emit_ts=fail_now;
                ev.emit('log','datachannel send failed, message stays queued for retry ('+connection.stats_send_failures+' total): '+((error && error.message) ? error.message : String(error)));
              }

              break;
            }
          }

          if(callbacks_sent_ok.length>0){
            // User callbacks can throw; isolate each one so a bad callback can't
            // skip the rest or escape this timer tick as an unhandled exception.
            for(var ci=0;ci<callbacks_sent_ok.length;ci++){
              try{ callbacks_sent_ok[ci](true); }catch(cb_error){ ev.emit('error', cb_error); }
            }
          }

          compact_data_queue();

          // Everything the app queued is now on the wire (or in SCTP's buffer) —
          // tell the producer it may write again. Emitted only on a send-driven
          // emptying: an expiry mass-drop is a failure, not an invitation.
          if(sent_any_data && data_queue_length()==0){
            ev.emit('drain');
          }
        }

      }


      if(signal_queue_length()>0 || data_queue_length()>0){
        data_channel_schedule_pump();
      }

    }

    function data_channel_send_data(data,callback){
      var uint8buffer=litepack.encode(SCHEMA_DC_MSG,{type:0,data:data instanceof Uint8Array?data:toU8(data)});
      data_channel_send(uint8buffer,callback);
    }

    function data_channel_send(data,callback){

      if(typeof data=='string'){
        data=_TE.encode(data);
      }

      // One contract for every "not connected yet" shape: the message is queued
      // (with its TTL) whether SCTP exists or not. If the connection never comes
      // up, expire_queued_messages() settles the callback as failed within
      // maxQueueAge — same semantics as a message stuck behind a blocked channel.
      //
      // Size validation: if SCTP is already negotiated its maxMessageSize is
      // known, so an oversized message fails right here. Before that the size
      // can't be validated; the pump re-checks it the moment SCTP comes up.
      if(connection.pc && connection.pc.sctp && connection.pc.sctp.maxMessageSize>0 && data.byteLength>connection.pc.sctp.maxMessageSize){
        if(typeof callback=='function'){
          callback(false);
        }
        ev.emit('error', 'message must be less than '+connection.pc.sctp.maxMessageSize+' bytes (got '+data.byteLength+')');
        return;
      }

      // ts is the enqueue time; expire_queued_messages() ages the queue out from it.
      connection.data_channel_sending_messages_queue.push({
        data: data,
        callback: (typeof callback=='function') ? callback : null,
        ts: Date.now()
      });
      connection.data_channel_queued_bytes+=data.byteLength;

      data_channel_schedule_pump();
    }

    // Priority lane entry — used exclusively by send_signal for the internal
    // (DataChannel) pipe. No callback and no user-visible failure: stale or
    // undeliverable signaling is recovered by the message-level machinery
    // (answer timeouts, FAILED_DECOMPRESS, MEDIASTREAM_MAP retransmits), never
    // by the queue.
    function data_channel_send_signal(data){
      connection.signal_sending_messages_queue.push({
        data: data,
        ts: Date.now()
      });

      // Preempt a parked tick. The pending timer may be a data-lane wait (rate
      // limit, up to 60ms) or the paused slow beat (250ms) — a signal must not
      // inherit either. Rescheduling with a signal pending computes ~0ms.
      if(connection.data_channel_pump_queue_timer!==null){
        clearTimeout(connection.data_channel_pump_queue_timer);
        connection.data_channel_pump_queue_timer=null;
      }
      data_channel_schedule_pump();
    }

    // pause()/resume(): a producer-side valve on OUTGOING APP DATA only.
    // While paused: inbound delivery, signaling, ping/pong, the pump tick and
    // the queue TTL all keep running, and send() keeps accepting — messages
    // queue up and age normally (a pause longer than maxQueueAge fails them
    // with callback(false), the uniform contract).
    function pause_sending(){
      connection.data_channel_sending_messages_paused=true;
    }

    function resume_sending(){
      if(connection.data_channel_sending_messages_paused===true){
        connection.data_channel_sending_messages_paused=false;

        // A paused tick may be parked on the slow 250ms beat — kill it so
        // sending resumes immediately rather than on the next beat.
        if(connection.data_channel_pump_queue_timer!==null){
          clearTimeout(connection.data_channel_pump_queue_timer);
          connection.data_channel_pump_queue_timer=null;
        }
        data_channel_schedule_pump();
      }
    }


    function close_connection(){
      clearTimeout(connection.create_data_channel_timer);
      connection.create_data_channel_timer=null;

      clearTimeout(connection.create_offer_timer);
      connection.create_offer_timer=null;

      clearTimeout(connection.wait_for_answer_timeout_timer);
      connection.wait_for_answer_timeout_timer=null;

      clearTimeout(connection.negotiation_done_timeout_timer);
      connection.negotiation_done_timeout_timer=null;

      clearTimeout(connection.getstats_timer);
      connection.getstats_timer=null;

      clearTimeout(connection.data_channel_pump_queue_timer);
      connection.data_channel_pump_queue_timer=null;

      clearTimeout(connection.remove_unused_tracks_timer);
      connection.remove_unused_tracks_timer=null;

      clearTimeout(connection.ice_restart_timer);
      connection.ice_restart_timer=null;

      clearTimeout(connection.gathering_timeout_timer);
      connection.gathering_timeout_timer=null;

      clearTimeout(connection.mediastream_map_ack_timer);
      connection.mediastream_map_ack_timer=null;
      connection.mediastream_map_pending=null;

      clearTimeout(connection.ping_timer);
      connection.ping_timer=null;

      clearTimeout(connection.liveness_timer);
      connection.liveness_timer=null;

      connection.chunk_reasm_internal={};
      connection.chunk_reasm_external={};



      if(connection.pc){
                        
        if(connection.pc.sctp){
          connection.pc.sctp.onstatechange=null;
          if(connection.pc.sctp.transport){
            connection.pc.sctp.transport.onstatechange=null;
            if(connection.pc.sctp.transport.iceTransport){
                connection.pc.sctp.transport.iceTransport.onstatechange=null;
            }
          }
        }

        for(var i=0; i<connection.list_data_channels.length; i++){
          if(connection.list_data_channels[i] && connection.list_data_channels[i]!==null){
            
            connection.list_data_channels[i].onopen=null;
            connection.list_data_channels[i].onmessage=null;
            connection.list_data_channels[i].onerror=null;
            connection.list_data_channels[i].onclosing=null;
            connection.list_data_channels[i].onclose=null;
            connection.list_data_channels[i].onbufferedamountlow=null;
            
            if(connection.list_data_channels[i].readyState=='open' || (connection.list_data_channels[i].readyState!=='connected' && connection.list_data_channels[i].readyState!=='connecting')){
              try{
                if(typeof connection.list_data_channels[i].close=='function'){
                  connection.list_data_channels[i].close();
                }
              } catch (error) {
                
              }
            }
            
          }
        }
        
        
        connection.pc.ondatachannel=null;
        connection.pc.onicecandidate=null;
        connection.pc.onicecandidateerror=null;
        connection.pc.onconnectionstatechange=null;
        connection.pc.oniceconnectionstatechange=null;
        connection.pc.onicegatheringstatechange=null;
        connection.pc.onnegotiationneeded=null;
        connection.pc.onsignalingstatechange=null;
        connection.pc.ontrack=null;
        
        if(typeof connection.pc.close=='function' && connection.pc.connectionState!=='closed'){
          try{
            connection.pc.close();
          } catch (error) {
            ev.emit('error', error);
          }
        }
        
        connection.pc=null;

        // The DC onclose handlers were nulled above, so adopt_primary_data_channel()
        // — the only writer of data_channel_state:'closed' — will never run again.
        // Without this, data_channel_state stays 'open' forever and the public
        // `connected` getter keeps reporting true on a dead connection.
        // Assigned directly (not via set_connection_state) so no statechange fires:
        // 'close' below is the terminal event and needs no companion.
        connection.data_channel_state='closed';
        connection.data_channel_primary_index=null;
        connection.sctp=null;
        connection.list_data_channels.length=0;

        // Signal lane: no callbacks to settle — just drop whatever never went out.
        connection.signal_sending_messages_queue.length=0;
        connection.signal_q_head=0;

        // The pump timer was cleared above, so nothing will ever drain the send queue
        // again. Anything still queued was never sent — settle its callback as failed
        // rather than dropping it, or a caller awaiting send(data,cb) hangs forever.
        // The queue is swapped out first so a callback that re-enters send() cannot
        // grow the list we're iterating; each callback is isolated so a throwing one
        // can't abort teardown or prevent 'close' below.
        var pending=connection.data_channel_sending_messages_queue;
        var pending_head=connection.data_q_head;
        connection.data_channel_sending_messages_queue=[];
        connection.data_q_head=0;
        connection.data_channel_queued_bytes=0;
        for(var qi=pending_head;qi<pending.length;qi++){
          if(typeof pending[qi].callback=='function'){
            try{
              pending[qi].callback(false);
            }catch(cb_error){
              ev.emit('error', cb_error);
            }
          }
        }

        ev.emit('close');
      }
    }
    
    function set_auth_verified(is_ok){
      if(is_ok==true){
        connection.auth_verified=true;
      }
    }
    
    function setConfiguration(opts2){
      
      if('iceServers' in opts2 && opts2.iceServers.length>0){
        connection.pc_config.iceServers=opts2.iceServers;
      }else{
        connection.pc_config.iceServers=[{ urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun.stunprotocol.org:3478',
        'stun:global.stun.twilio.com:3478'
        ] }];
      }

      if('certificates' in opts2){
        connection.pc_config.certificates=opts2.certificates;
      }

      if('iceCandidatePoolSize' in opts2){
        connection.pc_config.iceCandidatePoolSize=opts2.iceCandidatePoolSize;
      }else{
        connection.pc_config.iceCandidatePoolSize=1;
      }

      if('bundlePolicy' in opts2){
        connection.pc_config.bundlePolicy=opts2.bundlePolicy;
      }else{
        connection.pc_config.bundlePolicy='balanced';
      }

      if('rtcpMuxPolicy' in opts2){
        connection.pc_config.rtcpMuxPolicy=opts2.rtcpMuxPolicy;
      }else{
        connection.pc_config.rtcpMuxPolicy='require';
      }

      if('sdpSemantics' in opts2){
        connection.pc_config.sdpSemantics=opts2.sdpSemantics;
      }else{
        connection.pc_config.sdpSemantics='unified-plan';
      }

      if('portRange' in opts2){
        connection.pc_config.portRange=opts2.portRange;
      }

      if('gatheringTimeout' in opts2){
        connection.gathering_timeout_ms=Math.max(0,opts2.gatheringTimeout|0);
      }
      if('gatheringMaxRetries' in opts2){
        connection.gathering_max_retries=Math.max(0,opts2.gatheringMaxRetries|0);
      }

      // Ping/pong RTT probe. ping:false disables it; pingIntervalMin/Max tune
      // the randomised send interval (ms). Defaults: enabled, 1000–3000ms.
      if('ping' in opts2){
        connection.ping_enabled=(opts2.ping!==false);

        // The liveness watchdog trusts inbound traffic as proof of life, and on
        // an otherwise-idle connection the peer's pings ARE that traffic.
        // Disabling ping while leaving liveness on kills a perfectly healthy
        // idle connection within ~liveness_timeout_ms × retries. So ping:false
        // pulls liveness down with it — unless liveness is set explicitly in
        // the same call, which wins (the 'liveness' block below runs after us).
        if(connection.ping_enabled===false && !('liveness' in opts2) && connection.liveness_enabled===true){
          connection.liveness_enabled=false;
          // Deferred so a listener attached right after the constructor hears it.
          setTimeout(function(){
            ev.emit('log','ping disabled — liveness watchdog auto-disabled with it (idle connections would falsely time out); pass liveness:true explicitly to keep it');
          },0);
        }
      }
      if('pingIntervalMin' in opts2){
        connection.ping_interval_min=Math.max(100,opts2.pingIntervalMin|0);
      }
      if('pingIntervalMax' in opts2){
        connection.ping_interval_max=Math.max(connection.ping_interval_min,opts2.pingIntervalMax|0);
      }

      // Liveness watchdog. liveness:false disables it; livenessTimeout sets the
      // no-inbound-traffic threshold (ms) before recovery/close. Default 10000.
      if('liveness' in opts2){
        connection.liveness_enabled=(opts2.liveness!==false);
      }
      if('livenessTimeout' in opts2){
        connection.liveness_timeout_ms=Math.max(2000,opts2.livenessTimeout|0);
      }

      // Data-channel send throttling — OPT-IN. 0 (the default) means unlimited:
      // no rate cap, only the buffer watermarks govern outgoing throughput. Any
      // positive value sets a hard per-second ceiling. Each limit is independent
      // and each is read live by the send pump, so changes take effect on the
      // very next send — no reconnect needed — including flipping between
      // limited and unlimited at runtime. The limits govern APP DATA only;
      // library signaling rides the priority lane and is never throttled.
      // (|0 is applied to the user-supplied number only — never to the stored
      // field, since Infinity|0 === 0 would silently invert "unlimited".)
      if('maxSendingMessagesPerSec' in opts2){
        connection.data_channel_max_sending_messages_per_sec=(opts2.maxSendingMessagesPerSec===0)?Infinity:Math.max(1,opts2.maxSendingMessagesPerSec|0);
      }
      if('maxSendingBytesPerSec' in opts2){
        connection.data_channel_max_sending_bytes_per_sec=(opts2.maxSendingBytesPerSec===0)?Infinity:Math.max(1024,opts2.maxSendingBytesPerSec|0);
      }
      if('minBufferedAmount' in opts2){
        connection.data_channel_min_buffered_amount=Math.max(1024,opts2.minBufferedAmount|0);
        // bufferedAmountLowThreshold is seeded from this at DC creation; push the
        // new value onto already-open channels so the change isn't silently lost.
        for(var dci=0; dci<connection.list_data_channels.length; dci++){
          var _dc=connection.list_data_channels[dci];
          if(_dc){ try{ _dc.bufferedAmountLowThreshold=connection.data_channel_min_buffered_amount; }catch(e){} }
        }
      }
      if('maxBufferedAmount' in opts2){
        // Must stay >= min, or the pump's two thresholds invert.
        connection.data_channel_max_buffered_amount=Math.max(connection.data_channel_min_buffered_amount,opts2.maxBufferedAmount|0);
      }
      if('maxQueueAge' in opts2){
        // How long a message may sit unsent before it is dropped and its callback failed.
        // Floored at 1s so a misconfiguration can't expire messages faster than the pump
        // can plausibly drain them.
        connection.data_channel_max_queue_age=Math.max(1000,opts2.maxQueueAge|0);
      }

      

      if(connection.pc){
        connection.pc.setConfiguration(connection.pc_config);
      }
    }

    if(typeof opts=='object'){
      setConfiguration(opts);
    }
    
    function send_candidate(candidate_json){

      if(candidate_json.candidate && candidate_json.candidate.length>0){

        try{
          var p = parse_candidate(candidate_json.candidate);

          if(p.ufrag==null && typeof candidate_json.usernameFragment==='string' && candidate_json.usernameFragment.length>0){
            p.ufrag=candidate_json.usernameFragment;
          }

          var uint8buffer = encode_candidate_binary(p, candidate_json.sdpMid, candidate_json.sdpMLineIndex, candidate_json.ufrag);

          send_signal(MSGCODE_TYPE_MAP['ICE_CANDIDATE_COMPACT'],uint8buffer);

        }catch(error){

          var uint8buffer=_TE.encode(JSON.stringify(candidate_json));

          send_signal(MSGCODE_TYPE_MAP['ICE_CANDIDATE_RAW'],uint8buffer);

        }

      }
      

      
    }

    cert_wrtc_acquire_shared_certificate(function(error, cert){

      if(!error && cert && !('certificates' in connection.pc_config)){
        connection.pc_config.certificates=[cert];
      }

      try {

        connection.pc = new RTCPeerConnection(connection.pc_config);

        connection.pc.onicecandidate = function(event){
          if(connection.pc){

            if (event.candidate==null || (event.candidate && typeof event.candidate.usernameFragment==='string' && event.candidate.usernameFragment.length<=0)) {
              
              send_total_candidates();

            }else{

              if(connection.local_support_trickle_ice==null){
                connection.local_support_trickle_ice=true;
              }


              if('toJSON' in event.candidate && typeof event.candidate.toJSON=='function'){
                var candidate_json=event.candidate.toJSON();
              }else{
                var candidate_json=event.candidate;
              }

              // Send all gathered candidates, host included. Dropping host
              // candidates prevents same-machine / same-LAN peers from finding a
              // direct local path (they'd be left with only srflx/relay, which
              // can't hairpin through a shared NAT). Set opts.exclude_host_candidates
              // = true to restore host filtering (e.g. to avoid leaking local IPs).
              if(opts.exclude_host_candidates!==true || event.candidate.type!=='host'){
                send_candidate(candidate_json);
              }

              //list_gathered_local_candidates.push(event.candidate);
              //console.log(analyze_local_ice());

              var of_ufrag='default';
              if(typeof candidate_json.usernameFragment==='string' && candidate_json.usernameFragment.length>0){
                of_ufrag=candidate_json.usernameFragment;
              }else{
                var c=parse_candidate(candidate_json.candidate);
                if(typeof c.ufrag==='string' && c.ufrag.length>0){
                  of_ufrag=c.ufrag;
                }
              }
              if(!(of_ufrag in connection.list_gathered_local_candidates)){
                connection.list_gathered_local_candidates[of_ufrag]=[];
              }
              connection.list_gathered_local_candidates[of_ufrag].push(event.candidate);

              analyze_local_candidates();

              
              
              

            }
          }
        };

        connection.pc.onicecandidateerror=function(event){
          var code=Number(event.errorCode)||0;
          var url=event.url||'unknown';
          var text=event.errorText||'';
          var key=url+'|'+code;

          // Fires once per failing candidate per server, so a single broken TURN can
          // fire dozens of times per gathering pass — and again on every ICE restart.
          // Report each (url, code) pair once; after that just count.
          var rec=connection.ice_server_errors[key];
          if(rec){
            rec.count++;
            rec.last_ts=Date.now();
            return;
          }
          connection.ice_server_errors[key]={
            url:url, code:code, text:text,
            count:1, first_ts:Date.now(), last_ts:Date.now()
          };

          var msg='ICE '+(code===701?'server unreachable':'error '+code)+' from '+url+(text?' ('+text+')':'');

          // 401/403/441 = TURN rejected our credentials. 486/508 = TURN out of quota
          // or capacity. All of these mean relay is unavailable, so any peer behind a
          // symmetric NAT will fail to connect — the developer needs to know.
          //
          // Everything else is informational. In particular 701 ("couldn't reach the
          // server") is NOT an error on its own: with several ICE servers configured,
          // one unreachable STUN is harmless and the connection still succeeds. And
          // 438 (Stale Nonce) is a normal part of TURN's nonce-refresh flow.
          if(code===401 || code===403 || code===441 || code===486 || code===508){
            ev.emit('error', msg);
          }else{
            ev.emit('log', msg);
          }

          // Deliberately no restartIce()/close_connection() here. This event fires per
          // failing candidate; ICE can still succeed through a different one. Real
          // connection failure is already handled by oniceconnectionstatechange and
          // check_liveness — reacting here would tear down healthy connections that
          // simply lost one relay.
        };

        connection.pc.oniceconnectionstatechange = function(){
          if(!connection.pc) return;
          var state=connection.pc.iceConnectionState;
          var prev_state=connection._prev_ice_connection_state;
          connection._prev_ice_connection_state=state;

          if(state=='closed'){
            close_connection();
            return;
          }

          if(state=='connected' || state=='completed'){
            // connection recovered — clear restart timer and reset count
            clearTimeout(connection.ice_restart_timer);
            connection.ice_restart_timer=null;
            connection.ice_restart_count=0;

            // Gathering succeeded — clear gathering timeout
            clearTimeout(connection.gathering_timeout_timer);
            connection.gathering_timeout_timer=null;
            connection.gathering_retry_count=0;

            // Emit reconnect if we were previously disconnected/failed
            if(prev_state==='disconnected' || prev_state==='failed'){
              ev.emit('reconnect');
            }
          }

          if(state=='failed'){
            // Emit disconnect event
            if(prev_state==='connected' || prev_state==='completed' || prev_state==='disconnected'){
              ev.emit('disconnect', {reason:'failed', restartCount:connection.ice_restart_count});
            }
            // immediate restart
            clearTimeout(connection.ice_restart_timer);
            connection.ice_restart_timer=null;
            if(connection.ice_restart_count<connection.ice_restart_max_retries){
              connection.ice_restart_count++;
              restartIce();
            }else{
              // Exhausted — close cleanly instead of sitting in 'failed' forever.
              ev.emit('error','ICE failed — closing after '+connection.ice_restart_max_retries+' restart attempts');
              close_connection();
              return;
            }
          }

          if(state=='disconnected'){
            // Emit disconnect event
            if(prev_state==='connected' || prev_state==='completed'){
              ev.emit('disconnect', {reason:'disconnected', restartCount:connection.ice_restart_count});
            }
            // delayed restart — network may recover on its own
            if(connection.ice_restart_timer==null){
              connection.ice_restart_timer=setTimeout(function(){
                connection.ice_restart_timer=null;
                if(connection.pc && connection.pc.iceConnectionState=='disconnected'){
                  if(connection.ice_restart_count<connection.ice_restart_max_retries){
                    connection.ice_restart_count++;
                    restartIce();
                  }else{
                    // Still disconnected and out of retries — close cleanly.
                    ev.emit('error','ICE disconnected — closing after '+connection.ice_restart_max_retries+' restart attempts');
                    close_connection();
                  }
                }
              },connection.ice_restart_delay_ms);
            }
          }

          ev.emit('statechange', build_state_snapshot());
        };

        connection.pc.onconnectionstatechange = function(){
          if(!connection.pc) return;
          var state=connection.pc.connectionState;

          if(state=='closed'){
            close_connection();
            return;
          }

          // NOTE: ICE-restart decisions live solely in oniceconnectionstatechange
          // (the correct signal for ICE-level recovery). Driving restarts from
          // both handlers double-counted ice_restart_count and raced on the shared
          // timer. Here we only surface the aggregate connection state.
          ev.emit('statechange', build_state_snapshot());
        };

        connection.pc.onicegatheringstatechange=function(event){
          if(pc_alive()){

            var gatherState=connection.pc.iceGatheringState;

            if(gatherState==='complete'){
              // Gathering finished — clear timeout, reset counter
              clearTimeout(connection.gathering_timeout_timer);
              connection.gathering_timeout_timer=null;
              connection.gathering_retry_count=0;

              send_total_candidates();
            }

            if(gatherState==='gathering'){
              // Start gathering timeout if not already running
              if(connection.gathering_timeout_timer==null && connection.gathering_timeout_ms>0){
                connection.gathering_timeout_timer=setTimeout(function(){
                  connection.gathering_timeout_timer=null;
                  if(!connection.pc) return;
                  if(connection.pc.iceGatheringState==='gathering'){
                    // Still stuck
                    connection.gathering_retry_count++;
                    ev.emit('log','ICE gathering stuck — retry '+connection.gathering_retry_count+'/'+connection.gathering_max_retries);

                    if(connection.gathering_retry_count<=connection.gathering_max_retries){
                      // Must rollback to STABLE first — we may be mid-negotiation
                      // (state 2 = waiting for answer, state 4 = handling remote offer, etc.)
                      connection.pending_remote_offer_sdp=null;
                      rollback_signaling_to_stable(function(){
                        set_connection_state({ negotiation_state: 0 });
                        // Now safe to ICE restart
                        restartIce();
                      });
                    }else{
                      // Give up
                      ev.emit('error','ICE gathering failed after '+connection.gathering_max_retries+' retries');
                      close_connection();
                    }
                  }
                },connection.gathering_timeout_ms);
              }
            }

            if(gatherState==='new'){
              // Reset
              clearTimeout(connection.gathering_timeout_timer);
              connection.gathering_timeout_timer=null;
            }

          }

          ev.emit('statechange', build_state_snapshot());
        };

        connection.pc.onnegotiationneeded = function(){
          if(connection.negotiation_state==0 && connection.create_offer_timer==null){
            create_offer_schedule();
          }
        };

        connection.pc.onsignalingstatechange = function(){

          set_connection_state({
            signaling_state: String(connection.pc.signalingState)+""
          });

        };

        connection.pc.ondatachannel = function(event){
          add_data_channel(event.channel);
        };

        connection.pc.ontrack = function(event){
          // Intentionally empty. Remote track -> logical stream association is
          // driven by the MEDIASTREAM_MAP messages (set_remote_mediastream_map /
          // update_all_mediastream_receivers), not by ontrack: the map is the
          // authoritative tag_id <-> MID source, while ontrack fires before the
          // map may have arrived and carries no tag information.
          // TODO: consider using ontrack as an early wake-up to re-run
          // update_all_mediastream_receivers() instead of waiting for the next
          // negotiation-state change.
        };


        set_connection_state({
          signaling_state: String(connection.pc.signalingState)+""
        });

        if (connection.pending_remote_offer_sdp!==null && connection.signaling_state=='stable' && connection.negotiation_state==0){
          set_remote_offer();
        }else{
          var random_delay = 8 + Math.floor(Math.random() * 55); // 8-63ms
          function try_create_dc(){
            connection.create_data_channel_timer=null;
            if(pc_alive()){
              // SCTP "not established yet": browsers expose pc.sctp===null until a
              // data channel is negotiated; some Node bindings (webrtc-server)
              // pre-allocate the transport object, so check its state instead of
              // its mere existence.
              var sctp_not_up = (connection.pc.sctp==null || connection.pc.sctp.state!=='connected');
              var need_dc = sctp_not_up
                && (connection.list_data_channels.length==0)
                && (connection.negotiation_state==0)
                && (connection.pending_remote_offer_sdp==null);
              if(need_dc){
                create_data_channel();
              }else if(sctp_not_up && connection.list_data_channels.length==0){
                connection.create_data_channel_timer=setTimeout(try_create_dc, 100);
              }
            }
          }
          connection.create_data_channel_timer=setTimeout(try_create_dc, random_delay);
        }

        

      } catch (error){
        ev.emit('error',error);
        ev.emit('close');
      }
    });

    var api = {
      connection: connection,
      on: function(name, fn){ ev.on(name, fn); },
      off: function(name, fn){ ev.off(name, fn); },
      signal: on_signal_channel,
      stream: stream,
      addStream: addStream,
      removeStream: removeStream,
      addTrack: addTrack,
      removeTrack: removeTrack,
      send: data_channel_send_data,
      write: data_channel_send_data,
      pause: pause_sending,
      resume: resume_sending,
      set_auth_verified: set_auth_verified,
      setConfiguration: setConfiguration,
      restartIce: restartIce,
      close: close_connection,
      destroy: close_connection,

      getConnectionInfo: function(){
        return build_connection_info();
      },

      getStreams: function(direction){
        var result={};
        if(!direction || direction==='sending'){
          for(var tag_id in connection.list_sending_live_mediastream){
            var rec=connection.list_sending_live_mediastream[tag_id];
            if(!result[tag_id]) result[tag_id]={};
            result[tag_id].sending={
              video_track: rec.video_track,
              audio_track: rec.audio_track,
              video_mid: rec.video_mid,
              audio_mid: rec.audio_mid,
              video: {
                active: rec.video_active||false,
                width: rec.current_video_frame_width||0,
                height: rec.current_video_frame_height||0,
                fps: rec.current_video_fps||0,
                codec: rec.current_video_mime_type||null,
                bitrate: rec.video_bitrate||0
              },
              audio: {
                active: rec.audio_active||false,
                codec: rec.audio_mime_type||null,
                bitrate: rec.audio_bitrate||0
              }
            };
          }
        }
        if(!direction || direction==='receiving'){
          for(var tag_id in connection.list_receiving_live_mediastream){
            var rec=connection.list_receiving_live_mediastream[tag_id];
            if(!result[tag_id]) result[tag_id]={};
            result[tag_id].receiving={
              video_track: rec.video_track,
              audio_track: rec.audio_track,
              video_mid: rec.video_mid,
              audio_mid: rec.audio_mid,
              mediastream: rec.mediastream,
              video: {
                active: rec.video_active||false,
                width: rec.current_video_frame_width||0,
                height: rec.current_video_frame_height||0,
                fps: rec.current_video_fps||0,
                codec: rec.current_video_mime_type||null,
                bitrate: rec.video_bitrate||0,
                packetLoss: rec.video_packet_loss||0,
                jitter: rec.video_jitter||0
              },
              audio: {
                active: rec.audio_active||false,
                codec: rec.current_audio_mime_type||null,
                bitrate: rec.audio_bitrate||0,
                packetLoss: rec.audio_packet_loss||0,
                jitter: rec.audio_jitter||0
              }
            };
          }
        }
        return result;
      }
    };

    for (var k in api) { if (Object.prototype.hasOwnProperty.call(api,k)) this[k] = api[k]; }

    // Define 'connected' as a live getter (can't use for-in copy for getters)
    var self = this;
    Object.defineProperty(self, 'connected', {
      get: function(){ return connection.data_channel_state==='open'; },
      enumerable: true,
      configurable: true
    });

    // Whether the data-lane valve is closed (see pause()/resume()).
    Object.defineProperty(self, 'paused', {
      get: function(){ return connection.data_channel_sending_messages_paused===true; },
      enumerable: true,
      configurable: true
    });

    // Producer-side backpressure signal: bytes of APP DATA accepted by send()
    // but not yet handed to the network — the library's own queue plus whatever
    // still sits in SCTP's buffer. Pair with the 'drain' event (fired when the
    // queue empties via sends) to know when to stop and when to resume writing.
    Object.defineProperty(self, 'bufferedAmount', {
      get: function(){
        // O(1): the queued portion is a running counter maintained by
        // push/drain/expire/close — apps may legitimately read this per send.
        var total=connection.data_channel_queued_bytes;
        var pidx=connection.data_channel_primary_index;
        if(pidx!==null && connection.list_data_channels[pidx]){
          total+=connection.list_data_channels[pidx].bufferedAmount||0;
        }
        return total;
      },
      enumerable: true,
      configurable: true
    });

    return this;
  }