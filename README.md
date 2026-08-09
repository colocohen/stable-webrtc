<p align="center">
  <img src="https://github.com/colocohen/stable-webrtc/raw/main/stable-webrtc.svg" width="100%" alt="stable-webrtc"/>
</p>

<h1 align="center">StableWebRTC</h1>

<p align="center">
  <strong>Production-grade WebRTC for Node.js &amp; Browsers</strong>
</p>

<p align="center">
  WebRTC connections that survive the real world — glare, network chaos, oversized SDPs, and all.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/stable-webrtc"><img src="https://img.shields.io/npm/v/stable-webrtc?color=blue" alt="npm version"></a>
  <img src="https://img.shields.io/github/license/colocohen/stable-webrtc?color=brightgreen" alt="license">
</p>

---

## The Problem

A WebRTC demo connects two browsers in 20 lines. A WebRTC *product* fights these battles daily:

| Issue | What happens | How often |
|-------|-------------|-----------|
| **Glare** | Both peers send an offer at the same time. The native API deadlocks. | Every call with camera + screenshare |
| **Signal reordering** | An ICE candidate arrives before the offer it belongs to. Connection fails silently. | Any non-WebSocket transport |
| **Renegotiation storms** | User switches camera while a previous negotiation is still in-flight. SDP state corrupts. | Camera/mic toggle, screenshare start/stop |
| **SDP bloat** | 4KB+ of SDP text fragments across packets, slowing or breaking the handshake. | Simulcast, multiple codecs, many transceivers |
| **Network roaming** | User walks from Wi-Fi to LTE. ICE candidates expire. Call drops. | Mobile, every day |
| **No disconnect detection** | The native API gives you `iceConnectionState` and nothing else. No events for "reconnecting" or "recovered". Building a reconnection UI requires polling and guesswork. | Every app with a status indicator |
| **No stream telemetry** | Want to show bitrate, packet loss, or resolution per stream? You have to poll `getStats()`, parse 30+ report types, compute deltas yourself, and track which stats belong to which stream by MID. | Every app with quality indicators |
| **DataChannel backpressure** | Burst of messages fills the buffer. App freezes. No error. No warning. | File transfer, game state sync |
| **Tab backgrounding** | Mobile OS suspends the tab. Timers stop. State goes stale. Peer thinks you left. | Mobile browsers |

`stable-webrtc` handles all of this internally. You get a clean API — the library handles the rest.

---

## Quick Start

```js
var peer1 = new StableWebRTC();
var peer2 = new StableWebRTC();

// Relay signaling (in production, use WebSocket / HTTP / MQTT / anything)
peer1.on('signal', data => peer2.signal(data));
peer2.on('signal', data => peer1.signal(data));

// Connected — send data
peer1.on('connect', () => peer1.send('Hello from peer1!'));
peer2.on('data', msg => console.log('Received:', msg.toString()));
```

That's it. No role assignment, no ICE configuration, no state machine — it just works.

---

## What the Native API Gets Wrong

The browser's WebRTC API (`RTCPeerConnection`) is a low-level protocol binding, not an application API. Here's what `stable-webrtc` fixes:

### Glare is your problem
The native API gives you `onnegotiationneeded` and expects you to handle the case where both peers send an offer simultaneously. The MDN "perfect negotiation" pattern is 40 lines that doesn't cover all edge cases. `stable-webrtc` uses a 6-state machine with epoch-rotating politeness — one side always yields, and who yields alternates to prevent starvation.

### Rollback is broken across browsers
`setLocalDescription({type:'rollback'})` behaves differently between Chrome and Firefox. Chrome can corrupt BUNDLE group state during implicit rollback. `stable-webrtc` always uses explicit rollback with a serialized callback queue, ensuring only one rollback is ever in-flight and working around browser-specific bugs.

### ICE candidates arrive out of order
If `addIceCandidate()` is called before `setRemoteDescription()`, it silently fails. `stable-webrtc` queues candidates per-ufrag, sorts by priority, deduplicates, and drains them after the remote description is applied.

### Transceivers fight each other
If both peers create transceivers simultaneously, m-line ordering in the SDP conflicts. `stable-webrtc` ensures only the offering side creates transceivers (right before `createOffer()`), recycles inactive ones instead of stopping them, and automatically cleans up orphaned transceivers after 1.5 seconds.

### No disconnect/reconnect lifecycle
The native API gives you raw ICE state strings. Building a "reconnecting..." UI requires polling `iceConnectionState`, debouncing transitions, and guessing. `stable-webrtc` gives you `disconnect` and `reconnect` events with zero configuration.

### No per-stream telemetry
Getting bitrate for a specific video stream requires polling `getStats()`, iterating 30+ report types, matching by MID, computing byte deltas over time, and correlating inbound/outbound reports. `stable-webrtc` does this internally and gives you `streamstats` events with `{ bitrate, fps, packetLoss, jitter, codec }` per tagged stream.

### SDP is absurdly large
A simple DataChannel-only offer is 2–3KB of text. Adding video makes it 4KB+. `stable-webrtc` compresses the initial offer to ~80 bytes and renegotiation diffs to ~50 bytes using four competing compression strategies. ICE candidates are stripped from SDPs and sent separately as ~20-byte binary packets.

### No signaling abstraction
The native API forces you to manually relay offers, answers, and candidates through your own transport. `stable-webrtc` takes binary Uint8Arrays — pipe them through anything (WebSocket, HTTP, MQTT, SMS). After the DataChannel opens, signaling automatically routes through the peer-to-peer connection itself.

### Host candidates: connectivity vs. privacy, your choice
By default, host candidates (containing local addresses like `192.168.x.x`) **are** sent — they're what lets two peers on the same machine or LAN find a direct local path, so dropping them silently breaks same-network connections. If you'd rather not expose internal network topology through your signaling relay, set `exclude_host_candidates: true` and only server-reflexive and relay candidates are transmitted. You choose the tradeoff explicitly instead of having connectivity quietly removed.

There is a third option that isn't a tradeoff at all when the binding supports
it: with `webrtc-server`, `mdns: { register: true }` conceals each host address
behind a random `xxxxxxxx-....local` name instead of dropping the candidate.
Your signaling relay never sees `192.168.x.x`, and the LAN path still connects —
the remote peer resolves the name over multicast DNS on its own network. This is
exactly what browsers do by default (draft-ietf-mmusic-mdns-ice-candidates).

### No end-of-candidates signal
The native API fires `onicecandidate` with `null` when gathering completes, but there's no built-in way to tell the remote peer "I'm done sending candidates." The remote side has to guess using timeouts. `stable-webrtc` sends an explicit candidate count per ufrag, so the receiver knows exactly when all candidates have arrived and signals the ICE agent immediately.

### Certificate generation blocks each connection
Every `new RTCPeerConnection()` generates a fresh DTLS certificate if you don't provide one. This takes 50–200ms and blocks the constructor. If you're creating multiple connections (mesh network, reconnections), this adds up. `stable-webrtc` pre-generates a shared ECDSA P-256 certificate once and reuses it across all instances, with automatic renewal on expiry.

### Signaling has no integrity protection
The native API trusts whatever you feed to `setRemoteDescription` and `addIceCandidate`. If your signaling transport corrupts a byte (UDP packet damage, WebSocket frame issue), the connection silently fails with an opaque error. `stable-webrtc` wraps every signaling message in a MurmurHash3 checksum — corrupt messages are dropped before they can poison the state machine. Session nonces filter out stale frames, replays, and messages misrouted from another session. (This is *robustness* against accidents, not cryptographic security — an active attacker on your signaling path is defeated by the `fingerprints` identity-verification flow, see [Security](#security).)

---

## Install

**Node.js / bundlers (ESM)**
```bash
npm install stable-webrtc
```
```js
import StableWebRTC from 'stable-webrtc';
```

**Browser (prebuilt bundle)**
```html
<script src="dist/stable-webrtc.browser.js"></script>
<!-- exposes window.StableWebRTC -->
```

The package ships as ES modules (`src/` split into focused modules; `index.js` is the entry).
A prebuilt IIFE bundle for direct `<script>` use is produced by `npm run build:browser`.

**Node.js requires a WebRTC binding:**
```bash
npm install webrtc-server
```
```js
import * as wrtc from 'webrtc-server';
const peer = new StableWebRTC({ wrtc: wrtc });
```

[`webrtc-server`](https://www.npmjs.com/package/webrtc-server) is a complete
WebRTC stack in **pure JavaScript** — no native bindings, no build tools, no
prebuilt binaries to go missing on your platform or Node version. It installs
and runs anywhere Node does, including Alpine containers, ARM boards and
serverless environments where native modules are a problem.

It also brings NAT traversal a browser can't do on its own — see
[Node.js NAT traversal](#nodejs-nat-traversal) below.

Any W3C-compatible binding works, so a native one such as `@roamhq/wrtc`
can be substituted if you prefer.

> Dependencies: two tiny zero-dependency libraries — [`compact-delta`](https://www.npmjs.com/package/compact-delta) (SDP delta encoding) and [`litepack`](https://www.npmjs.com/package/litepack) (binary wire schemas).

---

## How It Works

### Nonce-Based Role Resolution

Both peers embed a random nonce in every signaling message. The peer with the higher nonce creates the DataChannel and sends the first offer. The other peer waits. No configuration needed — roles are locked before any SDP is generated, eliminating DataChannel glare and m-line ordering conflicts at the source.

To further reduce glare during startup, each peer waits a random 8–63ms before creating its DataChannel. This staggering ensures that in most cases, only one peer initiates before the nonce exchange resolves who should lead.

### Serialized Negotiation

All negotiations pass through a 6-state machine:

```
STABLE (0) → MAKING_OFFER (1) → WAITING_FOR_ANSWER (2) → APPLYING_ANSWER (3) → STABLE
                                                                                    ↑
STABLE (0) → HANDLING_REMOTE_OFFER (4) → WAITING_FOR_DONE (5) ─────────────────────┘
```

Only one negotiation can be in-flight at a time. If a new track is added while a negotiation is active, it queues and coalesces. Glare is resolved via epoch-rotating politeness — each successful negotiation flips who yields, preventing starvation.

**Adaptive answer timeout:** When waiting for an answer, the timeout starts at 7 seconds but adjusts based on historical round-trip times. If previous answers took 5 seconds, the timeout extends to match. If no answer arrives in time, the library rolls back and retries automatically.

**Serialized rollback:** Only one rollback can be in-flight at a time. If multiple code paths request a rollback simultaneously (e.g., glare + timeout), they queue and get notified in order when the rollback completes. This prevents Chrome's BUNDLE state corruption that can occur during concurrent rollback attempts.

### SDP Compression Engine

Every offer and answer is compressed through four competing strategies. The smallest payload wins:

| Strategy | Best for | Typical saving |
|----------|----------|----------------|
| **Compact** | First offer (DataChannel only) | 70–80% — binary encoding of SDP fields |
| **Diff** | Renegotiations | 90–97% — only the changed lines |
| **Deflate** | Large SDPs (simulcast, many codecs) | 50–60% |
| **Diff + Deflate** | Moderate changes on large SDPs | 85–95% |

Each payload includes a MurmurHash3 checksum. If decompression fails (hash mismatch), the receiver automatically requests a raw retransmit — no manual intervention needed.

**Why this matters:** A typical renegotiation (adding a video track) produces a 3KB SDP. With diff compression, the signaling message is 50–100 bytes — small enough for a single UDP packet, an MQTT message, or even an SMS.

### Trickle-Only ICE

ICE candidates are always stripped from the SDP before `setLocalDescription`. They're sent separately using binary compression (see below). This design choice enables the SDP compression engine to work effectively — embedded candidates add ~1KB of unpredictable text that defeats diff compression.

### Signaling via DataChannel

Once the DataChannel is open, signaling messages (offers, answers, candidates) automatically route through it instead of your external transport. This cuts renegotiation latency to the raw RTT of the peer-to-peer connection. If the DataChannel drops, routing falls back to external signaling transparently.

### Signal Integrity

Every signaling message is wrapped with a MurmurHash3 checksum and the sender's session nonce. On receipt:
- **Checksum mismatch** → message is silently dropped (corrupt or truncated in transit).
- **Nonce mismatch** → message is silently dropped (a stale frame, a replay, or a message misrouted from another session).
- **Consistent nonce mismatch streak** → the peer has restarted (page refresh, crash) and generated a fresh nonce that can never match again. After 5 consecutive frames carrying the same unfamiliar nonce, the library emits `error` and closes — create a new `StableWebRTC` instance to reconnect. Random junk never triggers this (it doesn't repeat the same nonce).

**Scope of this protection:** it defends against *accidents* — corruption, reordering, crossed sessions on unreliable transports (UDP, lossy WebSocket). It is **not** cryptographic: MurmurHash3 is a non-cryptographic hash and a 16-bit nonce is guessable, so an active attacker who controls your signaling path can forge frames. Defending against that attacker is what the DTLS `fingerprints` identity-verification flow is for (see [Security](#security)) — WebRTC's own encryption then guarantees the media/data path matches the verified identity.

### ICE Candidate Compression

Each ICE candidate is encoded from ~150 bytes of text into ~20–30 bytes of binary using bit-packed fields (transport, type, priority, IP, port, related address). Candidates are deduplicated by ufrag, sorted by priority, and trickled in optimal order.

### Host Candidate Filtering (optional)

By default **all** candidate types — including host candidates (local addresses like `192.168.x.x`) — are sent, because host candidates are what let two peers on the same machine or LAN establish a direct local path. Setting `exclude_host_candidates: true` transmits only server-reflexive (srflx), peer-reflexive (prflx), and relay candidates, preventing local-IP exposure through the signaling channel at the cost of same-network direct connectivity. The default favors connectivity; the option lets privacy-sensitive deployments opt out.

### Signaling Chunking

The library's own signaling (offers, answers, candidates, stream maps) is split into chunks when a message exceeds the per-pipe size limit, then reassembled transparently on the other side — so oversized SDPs (simulcast, many codecs) never exceed a transport's message-size cap. This applies to **both** pipes: the external `signal` transport and the internal DataChannel (SCTP). The limit is `max_signal_chunk_size` (default **1 KB**); the internal pipe uses `min(max_signal_chunk_size, sctp.maxMessageSize)`. Reassembly is all-or-nothing with a lazy timeout — on the library's unreliable/unordered DataChannel a lost chunk just fails reassembly and the message-level logic re-sends. **Application data (`peer.send`) is never chunked** — that remains the developer's responsibility. Small messages travel with a single byte of overhead, so the common case pays almost nothing.

Reassembly is bounded by defensive limits so a malformed or malicious stream can't exhaust memory: each chunk reserves **16 bytes** for its header (so the actual payload per chunk is `max_signal_chunk_size − 16`); partial reassemblies are dropped after **5 s** (`CHUNK_REASSEMBLY_TIMEOUT`); at most **16** partial messages may be in flight at once (`CHUNK_MAX_OPEN`); and any message claiming more than **65536** chunks (`CHUNK_MAX_TOTAL`) is rejected outright. These are internal constants — `max_signal_chunk_size` is the only one you configure.

### Delivery Semantics

The DataChannel is **unreliable and unordered by design** (`maxRetransmits: 0`, `ordered: false`) — datagram semantics, chosen for speed and to leave reliability decisions to the developer:

- Messages can be **lost** (no retransmission) and can arrive **out of order**.
- `send(data, callback)` settling `callback(true)` means the message was handed to SCTP — **not** that it arrived.
- The library's own signaling survives this via its recovery machinery (answer timeouts, `FAILED_DECOMPRESS` raw-retransmit, `MEDIASTREAM_MAP` ACKs). Your app data gets no such layer.

For use cases that need reliable, ordered delivery — file transfer, state sync that can't tolerate gaps — add sequencing + acknowledgment at the application layer, or send idempotent/self-contained datagrams (game state snapshots, telemetry) where a lost message is simply superseded by the next one.

### Reliable Stream Maps

The `MEDIASTREAM_MAP` (which tells the remote side how MIDs map to tagged streams) is delivered with an ACK + retransmit scheme, since it travels over the unreliable DataChannel. The receiver ACKs every copy (including duplicates); the sender retransmits with backoff until acknowledged, so a dropped map can't leave the two peers with mismatched stream associations.

### End-of-Candidates Signaling

When ICE gathering completes, the library sends the total candidate count per ufrag to the remote peer. The receiver tracks how many candidates it has processed and calls `addIceCandidate(null)` when all have arrived. This signals the browser's ICE agent that gathering is complete, enabling faster candidate pair selection instead of waiting for the default gathering timeout.

### Automatic ICE Restart

The library drives ICE-restart decisions from a single source of truth — `iceConnectionState` (the correct signal for ICE-level recovery):

- **`disconnected`** → starts a configurable timer (default 3s). If the connection doesn't recover, triggers ICE restart.
- **`failed`** → immediate ICE restart.
- **`connected`** → clears timer, resets retry counter.

Up to 5 retries with backoff. No manual intervention needed — network roaming (Wi-Fi → LTE) is handled transparently. The `disconnect` and `reconnect` events let your UI react immediately.

### Transceiver Recycling & Cleanup

When a track is removed, its transceiver is set to `inactive` (not stopped). The m-line stays in the SDP at its original position, preserving ordering. When a new track of the same kind is added later, the inactive transceiver is reused — no new m-line, no renegotiation overhead. Transceivers are created only by the offering side, right before `createOffer()`, preventing index conflicts during glare.

**Automatic cleanup:** Transceivers that are no longer mapped to any logical stream are cleaned up after 1.5 seconds. This prevents dead m-lines from accumulating in the SDP over long sessions with many add/remove cycles.

### Tagged Stream Mapping

Each stream is identified by a user-defined tag (e.g., `'camera'`, `'screen'`). The library sends a sequenced `MEDIASTREAM_MAP` message that maps tag IDs to SDP MIDs. The receiving peer uses this map to associate incoming transceivers with logical streams — so it knows that MID 1 is `camera` video and MID 2 is `camera` audio. The sequence number prevents out-of-order map updates from corrupting the mapping.

### DataChannel Deduplication

If both peers create a DataChannel before the nonce exchange resolves roles (a race condition during startup), multiple DataChannels may end up open. The library detects this and picks a winner — the channel with the lowest SID (SCTP stream identifier). All other channels are closed immediately. This prevents duplicate message delivery and m-line ordering conflicts.

### Shared DTLS Certificate

The library pre-generates a single ECDSA P-256 certificate and shares it across all `StableWebRTC` instances on the same page. This eliminates the ~50–200ms certificate generation latency that normally blocks each new `RTCPeerConnection`. The certificate is cached until expiry and regenerated automatically.

### Flow Control

Outgoing app data flows through three independent layers, innermost to outermost:

**1. Buffer watermarks (always on).** The send pump fills SCTP's buffer up to the *high* watermark (`maxBufferedAmount`, default 1MB) and resumes when it drains to the *low* watermark (`minBufferedAmount`, default 64KB, via `onbufferedamountlow`). Classic high/low watermark pacing — the pipe stays full at link speed without unbounded buffering.

**2. Rate limits (opt-in, default unlimited).** Two independent per-second caps, `0` = no cap:

```js
var peer = new StableWebRTC({
  maxSendingBytesPerSec: 0,      // default: 0 = unlimited
  maxSendingMessagesPerSec: 0    // default: 0 = unlimited
});

// Tunable live, in both directions — takes effect on the very next send:
peer.setConfiguration({ maxSendingBytesPerSec: 256 * 1024 });  // cap at 256KB/s
peer.setConfiguration({ maxSendingBytesPerSec: 0 });           // lift the cap
```

**3. `pause()` / `resume()` (manual valve).** `peer.pause()` holds outgoing app data in the queue without sending; `peer.resume()` releases it. While paused, `send()` keeps accepting, inbound delivery continues, and messages still age out normally if held past `maxQueueAge`.

**Priority lane for signaling.** The library's own signaling (offers, answers, candidates, ping/pong) travels in a separate queue drained *before* app data, exempt from the rate limits and from `pause()`. Your throttling can never starve negotiation, ICE restarts, or liveness — the only gate signaling respects is the SCTP buffer watermark itself.

**Producer-side backpressure.** `send(data, callback)` settles `callback(true)` when the message is handed to SCTP, or `callback(false)` if it expired unsent (`maxQueueAge`, default 10s) or the connection closed. `peer.bufferedAmount` reports bytes accepted but not yet transmitted, and the `drain` event fires when the queue empties — the classic stop-writing / resume-writing pair:

```js
function write(chunk){
  peer.send(chunk);
  return peer.bufferedAmount < 4 * 1024 * 1024;   // false = back off
}
peer.on('drain', resumeWriting);
```

### Network Profiling

The library characterizes the **user's own network** (independent of any specific peer) by analyzing local ICE candidates against multiple STUN servers, and emits a `networkprofile` event once the data is available (and again only if it changes):

```js
peer.on('networkprofile', (p) => {
  // p.public_ipv4       — your public IPv4 (from STUN), or null
  // p.public_ipv6       — your public IPv6, or null
  // p.all_public_ipv4   — array (multiple interfaces)
  // p.local_ipv4        — local host IPv4, or null (mDNS-hidden)
  // p.symmetric_nat     — true = problematic, false = fine, null = couldn't tell
  // p.supports_udp      — is UDP usable at all
  // p.supports_tcp
  // p.needs_relay       — derived hint: a TURN relay is likely required
});
```

`symmetric_nat` is the key signal: a symmetric NAT maps the same local socket to a *different* external address per destination, so direct P2P generally fails and a TURN relay is needed. It's detected by comparing the reflexive mappings reported by several STUN servers — a **heuristic hint**, not a guarantee (STUN-based NAT typing is inherently unreliable; treat `null` as "unknown" rather than "fine"). Useful for deciding whether to allocate TURN up front, warning the user, or choosing `iceTransportPolicy: 'relay'`.

> Note: there is no *remote* NAT type — it can't be measured from your side. Once connected, `connectioninfo.remote.candidateType` tells you how the path to the peer was actually established (`host` / `srflx` / `relay`), which is the operative fact.

### Connection Observability

Full connection telemetry available via `peer.getConnectionInfo()`:

```js
var info = peer.getConnectionInfo();
// info.type             — 'direct-udp', 'direct-tcp', 'relayed', 'unknown'
// info.rtt              — round-trip time (ms)
// info.bandwidth_outgoing — estimated outgoing bandwidth (bits/sec)
// info.local.ip         — local IP address
// info.local.port       — local port
// info.local.protocol   — 'udp' or 'tcp'
// info.local.relay      — true if using TURN
// info.local.candidateType — 'host', 'srflx', 'prflx', 'relay'
// info.remote.*         — same fields for remote side

// For network-level characterization (NAT, public IP, UDP support),
// listen to the `networkprofile` event — see "Network Profiling" above.
```

### Stream Telemetry

Per-stream stats are computed automatically from `getStats()` — no manual polling or delta computation needed:

```js
var streams = peer.getStreams();
// streams['camera'].sending.video.bitrate      — bits/sec
// streams['camera'].sending.video.fps          — frames per second
// streams['camera'].sending.video.width        — frame width
// streams['camera'].sending.video.height       — frame height
// streams['camera'].sending.video.codec        — e.g. 'video/VP8'
// streams['camera'].sending.video.active       — true if actively sending

// Receiving side includes quality metrics:
// streams['camera'].receiving.video.packetLoss — percentage (0–100)
// streams['camera'].receiving.video.jitter     — seconds
// streams['camera'].receiving.audio.bitrate    — bits/sec

// Use the streamstats event for reactive updates:
peer.on('streamstats', (tagId, direction, stats) => {
  updateQualityUI(tagId, stats.video.bitrate, stats.video.packetLoss);
});
```

---

## Node.js NAT traversal

With `webrtc-server` as the binding, a Node peer gets two NAT-traversal
capabilities the browser doesn't expose — both on by default for client-side
(full ICE) peers, which is what `StableWebRTC` creates:

**mDNS candidate resolution.** Browsers conceal their LAN addresses behind
`.local` names. A Node peer that can't resolve them silently loses every
same-network direct path — two people in one office end up relaying through
the internet. `webrtc-server` resolves them the way a browser does, and can
conceal its own addresses the same way (`mdns: { register: true }`).

**Gateway-assisted candidates.** The stack asks the router for a UDP
forwarding rule over UPnP-IGD, NAT-PMP or PCP, and advertises the external
address as a server-reflexive candidate. Unlike a STUN mapping, a forwarding
rule is reachable by **any** peer — it keeps working behind symmetric NAT,
where classic reflexive candidates fail. This is the same NAT traversal
qBittorrent and Syncthing enable by default, and it often means two home
users connect **directly, with no STUN or TURN server involved at all**.

```js
import * as wrtc from 'webrtc-server';

// Defaults are already right for a P2P client:
const peer = new StableWebRTC({ wrtc });

// Or be explicit:
const peer2 = new StableWebRTC({
  wrtc,
  mdns: { register: true },                // conceal our host IPs too
  portMapping: { description: 'MyApp' },   // what the router's UI shows
});

// Opt out entirely (e.g. a managed network that forbids UPnP):
const peer3 = new StableWebRTC({ wrtc, portMapping: false });
```

Mappings carry finite, auto-renewed leases and are removed when the peer
closes. CGNAT and double-NAT are detected up front, so no useless candidates
are produced. Neither capability applies in the browser, where the platform
handles mDNS itself and port mapping isn't available — passing these options
in a browser build is simply a no-op.

> Note that `needs_relay` from the [`networkprofile`](#network-profiling)
> event is inferred from STUN reflexive behaviour alone. With gateway-assisted
> candidates available, a `symmetric_nat: true` peer may still connect
> directly — treat the hint as a reason to *prepare* TURN, not proof it's
> required.

---

## API Reference

### Constructor

```js
var peer = new StableWebRTC(options);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `iceServers` | Array | Google + Twilio STUN | ICE server configuration |
| `wrtc` | Object | — | Node.js only: WebRTC bindings. [`webrtc-server`](https://www.npmjs.com/package/webrtc-server) (pure JS, recommended) or any W3C-compatible binding |
| `mdns` | Boolean \| Object | auto | Passed through to the binding. `webrtc-server`: resolve peers' concealed `.local` candidates; `{ register: true }` conceals your own host addresses. See [Node.js NAT traversal](#nodejs-nat-traversal) |
| `portMapping` | Boolean \| Object | auto | Passed through to the binding. `webrtc-server`: UPnP/NAT-PMP/PCP gateway-assisted candidates. `{ description: 'MyApp' }` labels the rule in the router UI |
| `exclude_host_candidates` | Boolean | `false` | If `true`, host candidates aren't sent (privacy; breaks same-LAN direct paths) |
| `max_signal_chunk_size` | Number | `1024` | Max bytes per signaling message before chunking (both pipes) |
| `gatheringTimeout` | Number | — | ms before a stuck ICE-gathering triggers a retry |
| `gatheringMaxRetries` | Number | — | Max gathering-stuck retries before giving up |
| `certificates` | Array | shared ECDSA P-256 | Custom DTLS certificate(s) |
| `iceCandidatePoolSize` | Number | — | Pre-gathered candidate pool size |
| `portRange` | Object | — | Restrict local port range (where supported) |
| `bundlePolicy` | String | `'balanced'` | BUNDLE policy (`'balanced'`, `'max-bundle'`, `'max-compat'`) |
| `rtcpMuxPolicy` | String | `'require'` | RTCP mux policy |
| `maxSendingBytesPerSec` | Number | `0` (unlimited) | Opt-in cap on outgoing app-data bytes/sec. `0` = no cap. Live-tunable via `setConfiguration` |
| `maxSendingMessagesPerSec` | Number | `0` (unlimited) | Opt-in cap on outgoing app-data messages/sec. `0` = no cap. Live-tunable |
| `minBufferedAmount` | Number | `64KB` | LOW watermark — sending resumes when SCTP's buffer drains to this |
| `maxBufferedAmount` | Number | `1MB` | HIGH watermark — the pump fills SCTP's buffer up to this |
| `maxQueueAge` | Number | `10000` | ms a queued message may wait unsent before it's dropped and its callback settled as failed (min 1000) |
| `ping` | Boolean | `true` | App-level ping/pong RTT probe + keepalive over the DataChannel. `ping:false` also auto-disables `liveness` unless it's set explicitly |
| `pingIntervalMin` / `pingIntervalMax` | Number | `1000` / `3000` | Randomised ping interval bounds (ms) |
| `liveness` | Boolean | `true` | Watchdog: declares the link dead after `livenessTimeout` ms with no inbound traffic (crucial for ICE-lite peers) |
| `livenessTimeout` | Number | `10000` | ms of inbound silence before recovery/close (min 2000) |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `peer.connected` | Boolean | `true` when DataChannel is open and ready |
| `peer.paused` | Boolean | `true` while the outgoing app-data valve is closed (see `pause()`) |
| `peer.bufferedAmount` | Number | Bytes of app data accepted by `send()` but not yet handed to the network (library queue + SCTP buffer). Pair with the `drain` event for backpressure |
| `peer.connection` | Object | Internal connection state (for advanced inspection) |

### Methods

| Method | Description |
|--------|-------------|
| `peer.signal(data)` | Feed signaling data received from the remote peer |
| `peer.send(data, callback?)` | Send data over the DataChannel. Accepts `String`, `Uint8Array`, or `ArrayBuffer`. `callback(ok)`: `true` = handed to SCTP, `false` = expired unsent or connection closed. See [Delivery Semantics](#delivery-semantics) |
| `peer.write(data, callback?)` | Alias of `send` |
| `peer.pause()` | Hold outgoing app data in the queue (signaling keeps flowing; `send()` keeps accepting; queue TTL keeps running) |
| `peer.resume()` | Release held app data immediately |
| `peer.stream(tagId, options)` | Add/replace/remove a tagged media stream. `options: { video_track, audio_track }` |
| `peer.addStream(stream, options?)` | Add a `MediaStream` (auto-extracts tracks) |
| `peer.removeStream(stream)` | Remove a `MediaStream` |
| `peer.addTrack(track, stream, options?)` | Add a single `MediaStreamTrack` associated with a stream |
| `peer.removeTrack(track, stream)` | Remove a single track |
| `peer.restartIce()` | Manually trigger an ICE restart |
| `peer.setConfiguration(config)` | Update the underlying `RTCPeerConnection` configuration |
| `peer.getConnectionInfo()` | Returns connection telemetry (type, RTT, bandwidth, endpoints) |
| `peer.getStreams(direction?)` | Returns all streams with stats. Optional filter: `'sending'` or `'receiving'` |
| `peer.on(event, fn)` | Subscribe to an event |
| `peer.off(event, fn)` | Unsubscribe from an event (same reference required) |
| `peer.close()` / `peer.destroy()` | Close and clean up the connection |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `signal` | `data` (Uint8Array) | Signaling data to relay to the remote peer |
| `connect` | — | DataChannel is open, connection is ready |
| `data` | `data` (Uint8Array) | Incoming DataChannel message |
| `stream` | `mediaStream, info` | Remote media received. `info: { tag_id, video_track, audio_track, video_mid, audio_mid }` |
| `statechange` | `snapshot` | Any connection state changed. Snapshot includes `negotiation_state`, `signaling_state`, `data_channel_state`, `ice_connection_state`, `connection_state`, `ice_gathering_state`, `sctp_state`, `sctp_dtls_state`, `connection_type`, `rtt`, `bandwidth_outgoing`, `need_ice_restart`, `ice_restart_count`, `epoch` |
| `connectioninfo` | `info` | Connection type or candidate pair changed. Same format as `getConnectionInfo()` |
| `networkprofile` | `profile` | Local network characterized. `{ public_ipv4, public_ipv6, all_public_ipv4, all_public_ipv6, local_ipv4, symmetric_nat, supports_udp, supports_tcp, needs_relay }` |
| `streamstats` | `tagId, direction, stats` | Per-stream stats updated. `direction`: `'sending'` or `'receiving'`. `stats: { video: { active, width, height, fps, codec, bitrate, packetLoss, jitter }, audio: { active, codec, bitrate, packetLoss, jitter } }` |
| `drain` | — | The outgoing app-data queue emptied via sends — safe to resume writing (pairs with `peer.bufferedAmount`) |
| `rtt` | `ms` | App-level DataChannel round-trip time measured by the ping/pong probe |
| `disconnect` | `{ reason, restartCount }` | Connection lost. `reason`: `'disconnected'` / `'failed'` (from ICE) or `'timeout'` (liveness watchdog — no inbound traffic). Automatic ICE restart begins. |
| `reconnect` | — | ICE connection recovered after a disconnect |
| `fingerprints` | `localFP, remoteFP` | DTLS fingerprints available for identity verification |
| `close` | — | Connection closed |
| `error` | `err` | Error occurred |
| `log` | `message` | Internal diagnostic message |

---

## Usage Examples

### Video Call

```js
var peer = new StableWebRTC();

// Signaling — relay via your server
peer.on('signal', data => ws.send(data));
ws.onmessage = msg => peer.signal(msg.data);

// Send camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => peer.addStream(stream));

// Receive remote video
peer.on('stream', (mediaStream, info) => {
  document.querySelector('video').srcObject = mediaStream;
});
```

### Tagged Streams (camera + screenshare)

```js
// Camera — tagged as 'camera'
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    peer.stream('camera', {
      video_track: stream.getVideoTracks()[0],
      audio_track: stream.getAudioTracks()[0]
    });
  });

// Screen share — tagged as 'screen'
navigator.mediaDevices.getDisplayMedia({ video: true })
  .then(stream => {
    peer.stream('screen', { video_track: stream.getVideoTracks()[0] });
  });

// Stop screen share
peer.stream('screen', { video_track: null });

// On the receiving side:
peer.on('stream', (mediaStream, info) => {
  if (info.tag_id === 'camera') {
    document.getElementById('camera-video').srcObject = mediaStream;
  } else if (info.tag_id === 'screen') {
    document.getElementById('screen-video').srcObject = mediaStream;
  }
});
```

### Reactive Connection Status UI

```js
var peer = new StableWebRTC();

// Connection lifecycle — no polling needed
peer.on('connect', () => {
  showStatus('connected');
});

peer.on('disconnect', (info) => {
  showStatus('reconnecting (' + info.reason + ')...');
});

peer.on('reconnect', () => {
  showStatus('connected');
});

peer.on('close', () => {
  showStatus('disconnected');
});

// Connection quality — reactive updates
peer.on('connectioninfo', (info) => {
  showConnectionType(info.type);     // 'direct-udp', 'relayed', etc.
  showLatency(info.rtt);             // 2.1 ms
});

// Per-stream quality — reactive updates
peer.on('streamstats', (tagId, direction, stats) => {
  if (direction === 'receiving') {
    showBitrate(tagId, stats.video.bitrate);
    showPacketLoss(tagId, stats.video.packetLoss);
    if (stats.video.packetLoss > 5) {
      showQualityWarning(tagId);
    }
  }
});

// State machine visibility (for debugging)
peer.on('statechange', (snap) => {
  console.log('negotiation:', snap.negotiation_state,
              'ice:', snap.ice_connection_state,
              'dc:', snap.data_channel_state);
});
```

### Event Cleanup (React, Vue, etc.)

```js
function setupPeer(peer) {
  var onStream = (ms, info) => { /* ... */ };
  var onStats = (tag, dir, stats) => { /* ... */ };

  peer.on('stream', onStream);
  peer.on('streamstats', onStats);

  // Cleanup — removes the specific listener
  return function cleanup() {
    peer.off('stream', onStream);
    peer.off('streamstats', onStats);
    peer.close();
  };
}
```

### Mesh Network (N peers)

```js
var peers = {};

function connectTo(remoteId) {
  var peer = new StableWebRTC();
  peers[remoteId] = peer;

  peer.on('signal', data => {
    server.send({ to: remoteId, signal: data });
  });

  peer.on('connect', () => {
    peer.send('Hello from ' + myId);
  });

  peer.on('data', msg => {
    console.log(remoteId + ' says:', msg.toString());
  });

  return peer;
}

// When receiving signaling from the server:
server.on('signal', (fromId, data) => {
  if (!peers[fromId]) connectTo(fromId);
  peers[fromId].signal(data);
});
```

---

## Security

Every WebRTC connection creates a short-lived DTLS certificate. The `fingerprints` event exposes both peers' certificate fingerprints, enabling end-to-end identity verification — even if the signaling server is compromised.

```js
peer.on('fingerprints', (localFP, remoteFP) => {
  // Build a transcript binding this session to both fingerprints
  var transcript = makeTranscriptHash(localFP, remoteFP);

  // Sign with your application's identity key
  var signature = sign(transcript, myPrivateKey);

  // Send proof to the remote peer via your signaling channel
  sendProof(signature);
});

// When receiving proof from the remote peer:
onReceiveProof((signature, senderPublicKey) => {
  // Rebuild the transcript from the remote peer's perspective (reversed)
  var transcript = makeTranscriptHash(myRemoteFP, myLocalFP);

  if (!verify(transcript, signature, senderPublicKey)) {
    throw new Error('MITM detected — fingerprint mismatch');
  }

  // Connection is cryptographically verified
  markAsVerified();
});
```

This is optional — connections work without it. Recommended for messaging, payments, healthcare, and enterprise applications.

---

## Troubleshooting & FAQ

**"Who is the initiator?"**
You don't choose. Roles are assigned automatically via nonce comparison at startup.

**"What if both peers add video at the same time?"**
Glare is resolved deterministically. One peer yields (rolls back), the other's offer goes through. The yielding peer re-sends its tracks in the next negotiation cycle. No deadlocks, no dropped tracks.

**"What happens if the remote peer refreshes the page?"**
A restarted peer generates a fresh session nonce, so its messages can never match the old session. The library detects the consistent mismatch streak, emits `error` ("remote peer appears to have restarted"), and closes. Listen for `close` and create a new `StableWebRTC` instance to reconnect — sessions are intentionally not resumable across restarts.

**"What signaling transport should I use?"**
Anything. WebSocket, HTTP long-polling, MQTT, Server-Sent Events, UDP, even SMS. The library handles reordering, deduplication, and compression. Signaling messages are binary Uint8Arrays — relay them as-is.

**"How do I know the connection quality?"**
Use the `connectioninfo` event for connection-level info (type, RTT, bandwidth) and `streamstats` for per-stream metrics (bitrate, packet loss, jitter). No polling needed — both are event-driven.

**"How do I show a reconnecting UI?"**
Listen to `disconnect` and `reconnect` events. The library handles ICE restart automatically — you just update the UI.

**"Can I use this with an SFU?"**
The library is designed for peer-to-peer connections. For SFU integration (Janus, mediasoup, etc.), you'd use the signaling layer directly but not the media negotiation, since the SFU controls the offer/answer flow.

**"What about Firefox / Safari?"**
The library targets Unified Plan (the standard). Chrome, Firefox, and Safari all support it. Edge cases around rollback behavior differ slightly between browsers — the library accounts for this.

---

## Support

_Please ⭐ star the repo to follow progress!_

Stable-WebRTC is an evenings-and-weekends project.
Support development via **GitHub Sponsors** or simply share the project.

---

## License

**Apache License 2.0**

```
Copyright © 2025 colocohen

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
