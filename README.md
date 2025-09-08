<p align="center">
  <img src="https://github.com/colocohen/stable-webrtc/raw/main/stable-webrtc.svg" width="100%" alt="stable-webrtc"/>
</p>

<h1 align="center">StableWebRTC</h1>

<p align="center">
  <strong>A production-grade WebRTC library for Node.js & Browsers</strong>
</p>

<p align="center">
  <code>stable-webrtc</code> is a JavaScript library built from the ground up to solve the hardest real-world issues developers face with WebRTC: glare, renegotiation loops, out-of-order signaling, flaky NATs, and oversized or slow SDPs.  
  With a clean API and a battle-tested core, you can ship video & data apps quickly and reliably.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/stable-webrtc">
    <img src="https://img.shields.io/npm/v/stable-webrtc?color=blue" alt="npm version">
  </a>
  <img src="https://img.shields.io/badge/status-in%20development-yellow" alt="status">
  <img src="https://img.shields.io/github/license/colocohen/stable-webrtc?color=brightgreen" alt="license">
</p>

---

## 📑 Table of Contents
- [🔍 Why StableWebRTC?](#-why-stablewebrtc)
- [🌟 Features](#-features)
- [⚙️ Installation](#️-installation)
- [📘 API](#-api)
- [🚀 Usage Examples](#-usage-examples)
- [🔒 Security](#-security)
- [🧪 Troubleshooting & FAQ](#-troubleshooting--faq)
- [💡 Support](#-support)
- [📜 License](#-license)

---

## 🔍 Why StableWebRTC?

WebRTC is the open standard that powers **real-time communication on the web**.  
It enables browsers and servers to exchange audio, video, and data directly —  
allowing use cases such as video calls between two users, live streaming from a browser to a server,  
low-latency data transfer for multiplayer games, and collaborative apps.  

One of the strongest benefits of WebRTC is that it supports **peer-to-peer (P2P) connections**.  
In most cases, once signaling is complete, traffic flows **directly between browsers** without going through a central media server.  
This reduces latency, saves enormous amounts of bandwidth, and dramatically lowers the load on your infrastructure.  
Instead of routing gigabytes of video traffic through your servers, peers exchange it directly — your server only helps them “find” each other.  

However, while WebRTC is built into all major browsers and available in Node.js via libraries, the native API is **extremely complex**.  
Many teams avoid working with it directly and instead rely on third-party SDKs or cloud services,  
because handling all the edge cases of signaling, renegotiation, and ICE behavior is notoriously error-prone.  

A simple commun demo code often looks effortless:
> *“Two browsers connected with just a few lines of code!”*  

But once you ship to production, reality sets in:

- **Strict signaling order (fragile in practice)**
  The native WebRTC API requires signaling messages (offers, answers, ICE candidates) to be delivered in exactly the same order they were generated. In real-world networks, messages are delayed, duplicated, reordered, or dropped entirely. A single ICE candidate arriving too early or too late is enough to break the whole connection.  

- **Crossed contexts**
  If multiple tabs or concurrent calls share the same signaling socket, messages can leak between sessions. One peer may process data meant for another, corrupting state and poisoning negotiations.  

- **Renegotiation conflicts**
  In the native API, only one negotiation can be “in flight” at a time. If both peers create an offer simultaneously (glare), or if a user changes devices (camera, microphone, screenshare) while a previous negotiation hasn’t finished, the processes collide. The result is deadlocks, dropped calls, or sessions stuck in an inconsistent state.  

- **Backgrounding & tab suspension**
  On mobile, backgrounded apps pause timers and radios; on desktop, inactive tabs may be discarded and later revived with stale state. This easily desynchronizes peers and forces reconnections.  

- **Unstable networks**
  Users roam between Wi-Fi and LTE, some ICE candidates never arrive, and enterprise proxies often force TURN over TCP/TLS. IPv4/IPv6 mismatches add even more instability.  

- **DataChannel congestion**
  Under light testing, DataChannels seem instant. But during heavy usage (file transfers, bursty updates), the buffer silently fills, causing apps to freeze without clear error signals.  

- **Huge SDP text**
  Session descriptions often grow huge when multiple codecs, simulcast layers, or transceivers are negotiated. These oversized SDPs exceed MTU limits, fragment across the network, and significantly delay or even prevent the handshake. The outcome: connections that take seconds to establish—or fail altogether.  


`stable-webrtc` was designed to *erase these problems*.  
All the tricky parts — signaling order, renegotiation conflicts, ICE restarts, and SDP bloat — are handled internally.  
As a developer, you’re left with the **minimum work needed**: create a peer, exchange signaling messages, and send/receive media or data.  

Instead of wrestling with fragile native APIs and dozens of edge cases, you get a clean, predictable foundation that works reliably in production by default.

---

## 🌟 Features

- **Node.js & Browser**\
  One library, one mental model. Runs in modern browsers and in Node (with a `wrtc` binding) so you can share logic, tests, and monitoring end-to-end.

- **User-friendly API & Zero-Config Mode**\
  Sensible defaults for roles, queuing, pacing, compression, and retries. Clear events and explicit lifecycles when you need control—minimal boilerplate when you don’t.

- **Dynamic multi-track media**\
  Add/remove camera, mic, and screenshare at runtime without tearing the call. The library reuses pre-allocated transceiver slots and stable MID mapping, calling replaceTrack()/setParameters() where possible; renegotiation happens only when required (e.g., new m-section, removing unused-unnecessary slots, or encoding policy change).

- **Flexible signaling transport**\
  Choose any method to carry signaling messages: reliable or unreliable, ordered or unordered (WS, HTTP polling, MQTT, IRC, UDP, custom buses). Signaling is sent as compact binary frames with session/sequence IDs: duplicates are de-duplicated, out-of-order frames are buffered, and large payloads are chunked with checksums and reassembled safely.

- **Smart signaling SDP compression engine**\
  Compresses SDP offers/answers using [Diff Match Patch](https://github.com/google/diff-match-patch) and/or deflate for smaller SDP payloads and faster signaling, especially across MTU-limited or proxy-heavy paths. Deltas are versioned and integrity-checked, with graceful fallback to full SDP when a compression isn’t applicable.

- **Signaling via internal DataChannel**\
  Once a DataChannel is up, signaling seamlessly **moves inside it**, bypassing the signaling server to cut latency; if the channel **drops to disconnected**, routing automatically **falls back** to your external signaling transport.

- **Perfect Negotiation**\
  A single serialized negotiation queue with glare detection, event coalescing, and automatic rollback—no more negotiation stucks.

- **Automatic role management**\
  You never declare “who starts.” Roles are negotiated and locked deterministically to prevent internal glare and race conditions on negotiation process.

- **Connection health & auto-recovery**\
  Detects stale or half-open sessions via RTT/loss/ICE state and triggers `restartIce` automatically. Media tracks and DataChannels reattach transparently when possible.

- **DataChannel Backpressure & congestion control**\
  Bounded queues with **dual quotas** (by **messages** and **bytes**), watermark-based pacing, and drain notifications keep DataChannels responsive under bursty load—akin to modern transport flow-control.

- **Connection observability**\
  App-level hooks expose RTT, loss, jitter, bitrate (up/down), selected candidate pair & type (host/srflx/relay), and protocol/family (UDP/TCP, IPv4/IPv6) — plus NAT classification (cone-like / symmetric) inferred from the ICE gathering process, and TURN usage details (whether a relay candidate was required). This raw information can be aggregated by your application to build statistics, for example to track what percentage of users require TURN server.

---

## ⚙️ Installation

#### Node.js (via npm)

```bash
npm install stable-webrtc
```

#### Browser (direct script include)

Just copy `stable-webrtc.js` into your project and load it:

```html
<script src="stable-webrtc.js"></script>
```

---


## 📘 API

### Constructor

#### Node.js

```js
var wrtc = require('@roamhq/wrtc'); 
var StableWebRTC = require('stable-webrtc'); 

var peer = new StableWebRTC({
  wrtc: wrtc,
  // ... your options
});
```

#### Browser

```html
<script src="stable-webrtc.js"></script>
<script>
  var peer = new StableWebRTC({
    // ... your options
  });
</script>
```

Creates a new WebRTC peer connection context.

Each call to the constructor creates a **new WebRTC connection context**.  
The library itself does **not** manage connection identity or multiplexing.  
It is strongly recommended to generate an **external Connection ID** (e.g. session ID) whenever you create a new peer, and attach this ID to all signaling messages you send over your transport.  

This way, when multiple peers are active, each one can reliably determine which signaling messages belong to its own context — preventing cross-talk or corrupted state between different connections.


If `options` are provided, they override defaults:

```js
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
  ]
  wrtc: {}, // Node.js only: pass wrtc implementation
}
```

**Option descriptions:**

- `wrtc`

  supply Node.js WebRTC bindings (`RTCPeerConnection`, `RTCSessionDescription`, `RTCIceCandidate`).

### Core Methods

- `peer.signal(data)`

  Provide signaling data from the remote peer.

- `peer.send(data)`

  Send text/binary data. Accepts String or Uint8Array.

- `peer.addStream(stream)`

  Add a MediaStream to the connection.

- `peer.removeStream(stream)`

  Remove a MediaStream.

- `peer.addTrack(track, stream)`

  Add a MediaStreamTrack, tied to a specific MediaStream.

- `peer.removeTrack(track, stream)`

  Remove a MediaStreamTrack.

- `peer.close([err])`

  Close and cleanup the peer connection. Optionally emit an error.


### Events

- `peer.on('signal', data)`

  Fires when signaling data should be sent to the remote peer. You must relay it via your signaling transport.


- `peer.on('fingerprints')`

  Fires when the both local and remote fingerprints known

- `peer.on('connect')`

  Fires once the peer connection and DataChannel are fully open.

- `peer.on('data', data)`

  Fires on DataChannel messages (Uint8Array).

- `peer.on('stream', stream)`

  Fires on receiving a remote MediaStream.

- `peer.on('track', (track, stream))`

  Fires on receiving a remote track.

- `peer.on('close')`

  Fires when the peer connection closes.

- `peer.on('error', err)`

  Fires on fatal errors (e.g., bad signaling data).


---

## 🚀 Usage Examples


### Basic WebRTC connection

This minimal demo shows two peers created inside the same page.  
⚠️ **Note:** In a real application, the peers would usually live in different browsers/devices, and signaling would be exchanged through a server (e.g. WebSocket) until the P2P connection is ready.

```js
// Create two peers in the same runtime
var peer1 = new StableWebRTC();
var peer2 = new StableWebRTC();

// Wire up signaling (here, direct relay just for demo)
peer1.on('signal', function (data) {
  peer2.signal(data);
});

peer2.on('signal', function (data) {
  peer1.signal(data);
});

// Once the data channel is open, peer1 can send messages
peer1.on('connect', function () {
  peer1.send('Hello peer2, this is peer1 speaking!');
});

// peer2 listens for data messages
peer2.on('data', function (msg) {
  console.log('peer2 received:', msg.toString());
});
```


### Dynamic media

```js
var peer1 = new StableWebRTC();
var peer2 = new StableWebRTC();

// Demo signaling (in a real app, relay over WebSocket/HTTP/etc.)
peer1.on('signal', function (data) { peer2.signal(data); });
peer2.on('signal', function (data) { peer1.signal(data); });

// When peer2 receives remote media, render it
peer2.on('track', function (track, remoteStream) {
  // Ensure we attach the combined stream to a <video>
  var video = document.querySelector('video');
  if (!video) return;

  if ('srcObject' in video) {
    video.srcObject = remoteStream;
  } else {
    // Older browsers
    video.src = window.URL.createObjectURL(remoteStream);
  }
  video.play();
});

// Helper: add all tracks from a local MediaStream to peer1
function addMedia(stream) {
  // Prefer track-level APIs (more flexible than addStream)
  var tracks = stream.getTracks();
  for (var i = 0; i < tracks.length; i++) {
    var t = tracks[i];
    // Attach track to its parent stream for proper MID/association
    peer1.addTrack(t, stream);
  }
}

// …later, when the user decides to turn on camera/mic:
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(function (stream) {
    addMedia(stream);
  })
  .catch(function (err) {
    console.log('getUserMedia failed:', err && err.message ? err.message : err);
  });

/*
Optional extras:

// To stop sending media later:
function removeMedia(stream) {
  var tracks = stream.getTracks();
  for (var i = 0; i < tracks.length; i++) {
    peer1.removeTrack(tracks[i], stream);
    tracks[i].stop();
  }
}

// To add screen share dynamically:
function addScreen() {
  navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    .then(function (screenStream) { addMedia(screenStream); })
    .catch(function (e) { console.log('getDisplayMedia failed:', e); });
}
*/
```

### Mesh Network (N peers)

```js
// Create peers
var peerA = new StableWebRTC();
var peerB = new StableWebRTC();
var peerC = new StableWebRTC();

// Wire up signaling between peers (for demo purposes, direct relay)
function SignalToPeer(p1, p2) {
  p1.on('signal', data => p2.signal(data));
  p2.on('signal', data => p1.signal(data));
}

// In a real app you would relay over WebSocket / server
SignalToPeer(peerA, peerB);
SignalToPeer(peerA, peerC);
SignalToPeer(peerB, peerC);

// Handle connections
peerA.on('connect', () => {
  peerA.send('Hello from Peer A!');
});

peerB.on('connect', () => {
  peerB.send('Hello from Peer B!');
});

peerC.on('connect', () => {
  peerC.send('Hello from Peer C!');
});

// Handle data messages
peerA.on('data', data => {
  console.log('Peer A received:', data.toString());
});

peerB.on('data', data => {
  console.log('Peer B received:', data.toString());
});

peerC.on('data', data => {
  console.log('Peer C received:', data.toString());
});
```


> 📂 For more examples, see [`examples/`](./examples)

---

## 🔒 Security
  The fingerprints event provides access to the DTLS certificate fingerprints of both peers in a connection. Every WebRTC session creates a short-lived certificate during the DTLS handshake, and its fingerprint (a cryptographic hash of the certificate) is exchanged inside the SDP. By default, browsers verify that the fingerprint in the SDP matches the certificate used in the handshake, which prevents tampering in transit.

  However, if you don’t fully trust your signaling server, there’s still a risk of a man-in-the-middle (MITM) attack: a compromised or malicious server could swap SDP descriptions between peers. To mitigate this, you can use the fingerprints event for end-to-end identity verification:

  ```js
  peer.on('fingerprints', (local_fingerprint, remote_fingerprint) => {

  });
  ```

  When the event fires, you receive both the `local_fingerprint` and the `remote_fingerprint`.

  You can sign these fingerprints with an external identity key (for example, a long-term application key) and send the signature over your signaling channel.

  On the receiving side, you validate the signature against the expected peer’s key.

  This ensures that even if the signaling server is tampered with, the peers can still prove to each other that they are talking to the correct identity.

  It’s not mandatory—WebRTC connections work without it—but it’s a recommended practice for applications that need higher security, such as messaging, payments, or enterprise communication. It prevents undetected MITM attacks and provides strong cryptographic assurance of peer identity.

  Example usage:

  ```js
    peer.on('fingerprints', (localFP, remoteFP) => {

    // Build a transcript that binds this session to both fingerprints
    const transcriptHash = makeTranscriptHash(localFP, remoteFP);

    // Sign the transcript with your private identity key
    const signature = sign(transcriptHash, myPrivateKey());

    // Send proof to the other peer
    sendProofSomehow(signature);
  });

  //when you get proof from the other peer...
  onGetProofSomehow((signature) => {

    // Get my current fingerprints from my own connection context...
    const myLocalFP  = myLocalFP();
    const myRemoteFP = myRemoteFP();

    // Rebuild the transcript exactly as the sender saw it
    const remoteTranscriptHash = makeTranscriptHash(myRemoteFP, myLocalFP);

    // Verify the signature with the sender’s public key and signature
    const ok = verify(remoteTranscriptHash, senderSignature, senderPublicKey);
    if (!ok) return reject('invalid signature');

    // If verification passed, mark the peer webrtc connection as trusted
    markPeerAsVerified();
  });

  ```

---

## 🧪 Troubleshooting & FAQ

**“Who is the initiator?”** 
  You don’t choose—roles are assigned automatically and glare is resolved deterministically.

**“Why not a simpler wrapper?”** 
  stable‑webrtc focuses on **deterministic negotiation + resilient signaling + compression + DC routing**—the tricky parts you hit at scale.

---

## 💡 Support

_Please ⭐ star the repo to follow progress!_

Stable-WebRTC is an evenings-and-weekends project.  
Support development via **GitHub Sponsors** or simply share the project.

---

## 📜 License

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