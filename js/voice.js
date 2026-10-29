// Group voice chat: peer-to-peer WebRTC audio between the members of a
// group who switched their mic on. Signalling (offers, answers and network
// candidates) travels over the group's Supabase Realtime channel; audio
// goes directly between players. Each pair of players connects once, and
// the player with the lower id starts the call, so calls never collide.
(function () {
  'use strict';
  const V = KT.Voice = { gid: null, muted: false, stream: null, peers: new Map(), roster: {} };
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }].concat((KT.CONFIG && KT.CONFIG.turn) || []) };
  const MAX_PEERS = 8, HEARTBEAT = 5, ROSTER_TTL = 16000;
  let beatT = 0, actx = null;
  const myId = () => KT.Net.user && KT.Net.user.id;
  const send = (gid, payload) => KT.Groups.send(gid, 'v', Object.assign({ from: myId(), name: KT.Net.user.name }, payload));

  function roster(gid) { return (V.roster[gid] = V.roster[gid] || new Map()); }
  V.inVoice = function (gid) {
    const r = roster(gid), now = Date.now();
    r.forEach((p, id) => { if (now - p.at > ROSTER_TTL) r.delete(id); });
    return [...r.values()];
  };

  // ------------------------------------------------------- join / leave
  V.join = async function (gid) {
    if (V.gid === gid) return;
    if (V.gid) V.leave();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
      KT.UI.toast('Voice chat is not supported in this browser.'); return;
    }
    if (!KT.Groups.channel(gid)) { KT.UI.toast('Connecting to the group… try again in a moment.'); return; }
    try {
      V.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      KT.UI.toast(e && e.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow it in the browser’s site settings to talk.' : 'No microphone found.');
      return;
    }
    V.gid = gid;
    V.muted = false;
    meter(myId(), V.stream);
    send(gid, { k: 'join' });
    // call everyone already in voice (lower id calls)
    V.inVoice(gid).forEach((p) => { if (myId() < p.id) call(p.id); });
    KT.Audio.play('pickup');
    KT.UI.toast('\u{1F3A4} You joined the voice chat. Press B to mute.', 'info');
    refresh();
  };

  V.leave = function () {
    if (!V.gid) return;
    send(V.gid, { k: 'leave' });
    V.peers.forEach((p, id) => closePeer(id));
    if (V.stream) V.stream.getTracks().forEach((t) => t.stop());
    V.stream = null;
    V.gid = null;
    levels.clear();
    refresh();
  };

  V.setMuted = function (m) {
    V.muted = m;
    if (V.stream) V.stream.getAudioTracks().forEach((t) => { t.enabled = !m; });
    send(V.gid, { k: 'here', muted: m });
    refresh();
  };
  // dock button / B key: join the active group's voice, then mute / unmute
  V.toggle = function (gid) {
    if (!gid) { KT.UI.toast('Join a group first (press T).'); return; }
    if (V.gid !== gid) V.join(gid);
    else { V.setMuted(!V.muted); KT.UI.toast(V.muted ? 'Mic muted.' : 'Mic on.'); }
  };

  // ------------------------------------------------------- connections
  function makePeer(id) {
    if (V.peers.has(id)) return V.peers.get(id).pc;
    if (V.peers.size >= MAX_PEERS) return null;
    const pc = new RTCPeerConnection(ICE);
    const peer = { pc, audio: null, pending: [] };
    V.peers.set(id, peer);
    V.stream.getTracks().forEach((t) => pc.addTrack(t, V.stream));
    pc.onicecandidate = (e) => { if (e.candidate) send(V.gid, { k: 'ice', to: id, cand: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      if (peer.audio) return;
      const a = document.createElement('audio');
      a.autoplay = true; a.playsInline = true;
      a.srcObject = e.streams[0];
      $voice().appendChild(a);
      a.play().catch(() => { KT.UI.toast('Click anywhere to hear your group.'); document.addEventListener('click', () => a.play(), { once: true }); });
      peer.audio = a;
      meter(id, e.streams[0]);
      refresh();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { closePeer(id); KT.UI.toast('Could not connect voice with a member (their network may block it).'); }
      if (pc.connectionState === 'closed' || pc.connectionState === 'disconnected') refresh();
    };
    return pc;
  }
  async function call(id) {
    const pc = makePeer(id);
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send(V.gid, { k: 'offer', to: id, sdp: pc.localDescription.toJSON() });
  }
  // candidates can arrive before the offer / answer they belong to
  async function setRemote(id, sdp) {
    const peer = V.peers.get(id);
    if (!peer) return;
    await peer.pc.setRemoteDescription(sdp);
    const q = peer.pending.splice(0);
    for (const c of q) { try { await peer.pc.addIceCandidate(c); } catch (e) { /* stale */ } }
  }
  function closePeer(id) {
    const p = V.peers.get(id);
    if (!p) return;
    try { p.pc.close(); } catch (e) { /* ignore */ }
    if (p.audio) { p.audio.srcObject = null; p.audio.remove(); }
    V.peers.delete(id);
    levels.delete(id);
  }
  const $voice = () => document.getElementById('voice-audio');

  // ---------------------------------------------------------- signalling
  V.onSignal = async function (gid, p) {
    if (!p || !p.from || p.from === myId()) return;
    if (p.to && p.to !== myId()) return;
    const r = roster(gid);
    if (p.k === 'join' || p.k === 'here') {
      const fresh = !r.has(p.from);
      r.set(p.from, { id: p.from, name: String(p.name || '').slice(0, 24), muted: !!p.muted, at: Date.now() });
      if (V.gid === gid) {
        if (p.k === 'join') send(gid, { k: 'here', muted: V.muted }); // let the newcomer know we are here
        if (!V.peers.has(p.from) && myId() < p.from) call(p.from);
      }
      if (fresh) refresh();
      return;
    }
    if (p.k === 'leave') { r.delete(p.from); closePeer(p.from); refresh(); return; }
    if (V.gid !== gid) return;
    try {
      if (p.k === 'offer') {
        const pc = makePeer(p.from);
        if (!pc) return;
        await setRemote(p.from, p.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(gid, { k: 'answer', to: p.from, sdp: pc.localDescription.toJSON() });
      } else if (p.k === 'answer') {
        if (V.peers.has(p.from)) await setRemote(p.from, p.sdp);
      } else if (p.k === 'ice') {
        const peer = V.peers.get(p.from);
        if (peer && p.cand) {
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(p.cand);
          else peer.pending.push(p.cand);
        }
      }
    } catch (e) { /* a late or duplicate message: ignore */ }
  };

  // --------------------------------------------- speaking indicators
  const levels = new Map(); // id -> {analyser, data, level}
  function meter(id, stream) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaStreamSource(stream);
      const an = actx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      levels.set(id, { an, data: new Uint8Array(an.frequencyBinCount), level: 0 });
    } catch (e) { /* no audio context */ }
  }
  V.speaking = function (id) { const l = levels.get(id); return !!l && l.level > 0.06; };

  V.update = function (dt) {
    levels.forEach((l) => {
      l.an.getByteTimeDomainData(l.data);
      let s = 0;
      for (let i = 0; i < l.data.length; i++) { const v = (l.data[i] - 128) / 128; s += v * v; }
      l.level = Math.sqrt(s / l.data.length);
    });
    if (!V.gid) return;
    beatT -= dt;
    if (beatT <= 0) { beatT = HEARTBEAT; send(V.gid, { k: 'here', muted: V.muted }); }
    const dock = document.getElementById('dock-voice');
    if (dock) dock.classList.toggle('speaking', !V.muted && V.speaking(myId()));
    const box = document.querySelector('#groups-body .g-voice');
    if (box) box.querySelectorAll('[data-vid]').forEach((e) => e.classList.toggle('speaking', V.speaking(Number(e.dataset.vid))));
  };

  // ------------------------------------------------------------ UI
  function refresh() {
    KT.Groups.updateDock();
    if (KT.Game.state === 'groups') KT.Groups.renderVoice();
  }
  V.renderControls = function (box, gid) {
    const people = V.inVoice(gid);
    const inHere = V.gid === gid;
    const title = document.createElement('h4');
    title.textContent = '\u{1F3A4} Voice chat' + (people.length || inHere ? ' • ' + (people.length + (inHere ? 1 : 0)) + ' talking' : '');
    box.appendChild(title);
    const list = document.createElement('div');
    list.className = 'v-list';
    const chip = (id, name, muted) => {
      const c = document.createElement('span');
      c.className = 'v-chip';
      c.dataset.vid = id;
      c.textContent = (muted ? '\u{1F507} ' : '\u{1F50A} ') + name;
      list.appendChild(c);
    };
    if (inHere) chip(myId(), 'You', V.muted);
    people.forEach((p) => chip(p.id, p.name, p.muted));
    if (!inHere && !people.length) { const s = document.createElement('small'); s.className = 'muted'; s.textContent = 'Nobody is talking yet.'; list.appendChild(s); }
    box.appendChild(list);
    const row = document.createElement('div');
    row.className = 'v-buttons';
    const b = (text, cls, fn) => { const e = document.createElement('button'); e.className = 'btn small ' + cls; e.textContent = text; e.onclick = fn; row.appendChild(e); };
    if (!inHere) b('\u{1F3A4} Join voice', 'primary', () => V.join(gid));
    else {
      b(V.muted ? '\u{1F3A4} Unmute' : '\u{1F507} Mute', '', () => V.setMuted(!V.muted));
      b('Leave voice', 'danger', () => V.leave());
    }
    box.appendChild(row);
  };

  window.addEventListener('beforeunload', () => V.leave());
})();
