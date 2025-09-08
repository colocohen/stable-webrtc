var wrtc = require('@roamhq/wrtc');
var Peer = require('stable-webrtc');

var A = new Peer({ wrtc: wrtc });
var B = new Peer({ wrtc: wrtc });

A.on('signal', function (sig) {
  B.signal(sig);
});
B.on('signal', function (sig) {
  A.signal(sig);
});

A.on('fingerprints', function (local_fingerprint,remote_fingerprint) {
  console.log('A fingerprint: '+Buffer.from(local_fingerprint).toString('base64'));
  console.log('B fingerprint: '+Buffer.from(remote_fingerprint).toString('base64'));
});

A.on('connect', function () {
  console.log('[A] connected');
  A.send('ping from A');
});
B.on('connect', function () {
  console.log('[B] connected');
});

A.on('data', function (data) {
  console.log('[A] got:', new TextDecoder().decode(data));
});
B.on('data', function (data) {
  console.log('[B] got:', new TextDecoder().decode(data));
  B.send('pong from B');
});

A.on('error', function (e) { console.error('[A] error:', e); });
B.on('error', function (e) { console.error('[B] error:', e); });

A.on('close', function () { console.log('[A] closed'); });
B.on('close', function () { console.log('[B] closed'); });