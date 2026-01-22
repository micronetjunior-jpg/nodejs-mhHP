import mediasoup from "mediasoup";

let worker;
let router;

export async function initMediasoup(publicIp) {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 40100
  });

  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      }
    ]
  });

  console.log("🎧 Mediasoup ready with PUBLIC_IP =", publicIp);
}

export async function createAnswerFromOffer(offerSdp, publicIp) {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: publicIp
      }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  });

  await transport.setRemoteDtlsParameters({
    role: "auto",
    fingerprints: extractFingerprints(offerSdp)
  });

  const answer = transport.getLocalParameters().dtlsParameters;

  const sdpAnswer = `
v=0
o=- 0 0 IN IP4 ${publicIp}
s=-
t=0 0
m=audio ${transport.tuple.localPort} UDP/TLS/RTP/SAVPF 111
c=IN IP4 ${publicIp}
a=rtpmap:111 opus/48000/2
a=sendrecv
a=setup:passive
a=fingerprint:sha-256 ${answer.fingerprints[0].value}
a=ice-ufrag:${transport.iceParameters.usernameFragment}
a=ice-pwd:${transport.iceParameters.password}
a=candidate:1 1 udp 2130706431 ${publicIp} ${transport.tuple.localPort} typ host
a=ice-lite
`;

  return sdpAnswer.trim();
}

function extractFingerprints(sdp) {
  const match = sdp.match(/a=fingerprint:sha-256 (.+)/);
  if (!match) throw new Error("No fingerprint found");
  return [{ algorithm: "sha-256", value: match[1] }];
}