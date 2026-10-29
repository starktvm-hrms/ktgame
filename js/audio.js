// Procedural audio with the Web Audio API: a gentle Carnatic-flavoured
// soundtrack (tanpura drone, plucked veena melody in raga Mohanam, soft
// mridangam), ambience (water, waves, birdsong, temple bells) and SFX.
(function () {
  'use strict';
  const A = KT.Audio = { ctx: null, ready: false, music: 0.5, sfx: 0.8, muted: false };
  let master, musicBus, sfxBus, ambBus, noiseBuf;
  let waterGain, waveGain, birdTimer = 0, bellTimer = 0;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = A.ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = A.music * 0.5; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.sfx; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = A.sfx * 0.6; ambBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // brown-ish
      d[i] = w * 0.5 + last * 3;
    }
    // looping ambience: lapping water + sea waves
    waterGain = loopNoise(500, 0.0);
    waveGain = loopNoise(300, 0.0);
    startMusic();
    A.ready = true;
  };

  function loopNoise(freq, gain) {
    const src = A.ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = A.ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(ambBus);
    src.start();
    return g;
  }

  A.setVolumes = function (music, sfx) {
    A.music = music; A.sfx = sfx;
    if (!A.ctx) return;
    musicBus.gain.setTargetAtTime(music * 0.5, A.ctx.currentTime, 0.1);
    sfxBus.gain.setTargetAtTime(sfx, A.ctx.currentTime, 0.1);
    ambBus.gain.setTargetAtTime(sfx * 0.6, A.ctx.currentTime, 0.1);
  };
  A.setMuted = function (m) {
    A.muted = m;
    if (A.ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.05);
  };

  // Diesel engine hum whose pitch follows the bus speed.
  let eng = null;
  A.engine = function (on, ratio) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    if (on && !eng) {
      const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 38;
      const o2 = A.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 76;
      const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const g = A.ctx.createGain(); g.gain.value = 0.0001;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(); o2.start();
      eng = { o, o2, f, g };
      g.gain.setTargetAtTime(0.07, t, 0.2);
    }
    if (!on && eng) {
      const e = eng; eng = null;
      e.g.gain.setTargetAtTime(0.0001, t, 0.2);
      setTimeout(() => { e.o.stop(); e.o2.stop(); }, 900);
      return;
    }
    if (eng && ratio !== undefined) {
      const r = KT.clamp(ratio, 0, 1);
      eng.o.frequency.setTargetAtTime(38 + r * 70, t, 0.1);
      eng.o2.frequency.setTargetAtTime(76 + r * 140, t, 0.1);
      eng.f.frequency.setTargetAtTime(260 + r * 500, t, 0.1);
      eng.g.gain.setTargetAtTime(0.06 + r * 0.05, t, 0.1);
    }
  };

  // ---------------------------------------------------------------- sfx
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(freq, type, t, dur, vol, bus, glide) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = ctx.createGain();
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type, freq, q, bus) {
    const ctx = A.ctx;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain();
    env(g, t, 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  A.play = function (name) {
    if (!A.ready || A.muted) return;
    const t = A.ctx.currentTime;
    switch (name) {
      case 'step': noise(t, 0.07, 0.12, 'bandpass', 600 + Math.random() * 400, 1.2); break;
      case 'splash': noise(t, 0.35, 0.25, 'lowpass', 1400, 0.8); break;
      case 'paddle': noise(t, 0.5, 0.18, 'bandpass', 700, 0.7); noise(t + 0.15, 0.3, 0.08, 'highpass', 2500, 0.5); break;
      case 'jump': noise(t, 0.18, 0.12, 'bandpass', 900, 1); break;
      case 'land': tone(120, 'sine', t, 0.15, 0.3, sfxBus, 60); noise(t, 0.08, 0.15, 'lowpass', 500); break;
      case 'coin': tone(1318, 'triangle', t, 0.12, 0.18); tone(1760, 'triangle', t + 0.07, 0.25, 0.18); break;
      case 'pickup': [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', t + i * 0.06, 0.25, 0.14)); break;
      case 'star': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 'sine', t + i * 0.09, 0.6, 0.15)); tone(2093, 'sine', t + 0.4, 0.9, 0.08); break;
      case 'mission': [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', t + i * 0.11, 0.5, 0.16)); tone(523, 'sine', t + 0.6, 1.2, 0.12); tone(659, 'sine', t + 0.6, 1.2, 0.1); break;
      case 'level': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 'square', t + i * 0.07, 0.3, 0.05)); break;
      case 'shutter': noise(t, 0.04, 0.35, 'highpass', 3000, 0.7); noise(t + 0.07, 0.05, 0.25, 'highpass', 2000, 0.7); break;
      case 'talk': tone(660, 'sine', t, 0.08, 0.08); tone(880, 'sine', t + 0.06, 0.1, 0.06); break;
      case 'click': tone(900, 'sine', t, 0.05, 0.08); break;
      case 'bell': [880, 1320, 1760].forEach((f, i) => tone(f, 'sine', t, 2.2 - i * 0.5, 0.06 / (i + 1), ambBus)); break;
      case 'trumpet': tone(220, 'sawtooth', t, 1.0, 0.05, ambBus, 330); break;
      case 'horn': // two-tone air horn
        [[330, 0], [415, 0]].forEach((h) => {
          const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = h[0];
          const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
          const gn = A.ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
          gn.gain.setValueAtTime(0.09, t + 0.55); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
          o.connect(f); f.connect(gn); gn.connect(sfxBus); o.start(t); o.stop(t + 0.75);
        });
        break;
      case 'door': noise(t, 0.5, 0.16, 'highpass', 1800, 0.6); tone(180, 'sine', t + 0.35, 0.12, 0.12, sfxBus, 90); break;
      default: break;
    }
  };

  function chirp(t) {
    const base = 2500 + Math.random() * 2500;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone(base * (1 + Math.random() * 0.2), 'sine', t + i * 0.09, 0.07, 0.035, ambBus, base * (0.7 + Math.random() * 0.6));
  }

  // Ambience mix follows the player's surroundings.
  A.updateAmbience = function (dt, p) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    const lake = Math.max(0, 1 - Math.abs(p.x - KT.Geo.shoreX(p.z)) / 25) * (Math.abs(p.z) < 180 ? 1 : 0);
    const canoe = KT.Player.mode === 'canoe' ? 1 : 0;
    waterGain.gain.setTargetAtTime(Math.max(lake, canoe) * 0.25, t, 0.5);
    const sea = KT.smoothstep(170, 225, p.z);
    waveGain.gain.setTargetAtTime(sea * 0.5 * (0.6 + 0.4 * Math.sin(t * 0.5)), t, 0.4);
    birdTimer -= dt;
    if (birdTimer <= 0) {
      birdTimer = 1.5 + Math.random() * 4;
      if (p.z < 200) chirp(t);
    }
    bellTimer -= dt;
    if (bellTimer <= 0) {
      bellTimer = 6 + Math.random() * 6;
      if (Math.hypot(p.x + 130, p.z + 115) < 70) A.play('bell');
    }
  };

  // -------------------------------------------------------------- music
  // Raga Mohanam (pentatonic): Sa Ri Ga Pa Dha
  const SA = 196; // G3
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  const hz = (semi) => SA * Math.pow(2, semi / 12);
  let nextNote = 0, step = 0, melodyIdx = 3;

  function pluck(freq, t, vol) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(freq, t);
    o.frequency.setValueAtTime(freq * 1.012, t + 0.01);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.12); // gamaka-ish slide
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
    const g = ctx.createGain(); env(g, t, 0.006, vol, 1.4);
    const g2 = ctx.createGain(); env(g2, t, 0.004, vol * 0.3, 0.5);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
    o.connect(g); o2.connect(g2); g.connect(f); g2.connect(f); f.connect(musicBus);
    o.start(t); o2.start(t); o.stop(t + 1.6); o2.stop(t + 0.6);
  }
  function drum(t, low, vol) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(low ? 140 : 320, t);
    o.frequency.exponentialRampToValueAtTime(low ? 70 : 220, t + 0.18);
    const g = ctx.createGain(); env(g, t, 0.003, vol, low ? 0.35 : 0.12);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.5);
    if (!low) noise(t, 0.05, vol * 0.4, 'bandpass', 3000, 2, musicBus);
  }
  function startMusic() {
    const ctx = A.ctx;
    // tanpura-like drone: Pa - Sa - Sa - Sa(low)
    [hz(-5), hz(0), hz(0.04), hz(-12)].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = ctx.createGain(); g.gain.value = 0.0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11 + i * 0.03;
      const lg = ctx.createGain(); lg.gain.value = 0.012;
      lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.018, ctx.currentTime);
      o.connect(lp); lp.connect(g); g.connect(musicBus);
      o.start(); lfo.start();
    });
    nextNote = ctx.currentTime + 0.5;
  }
  const PATTERN = [1, 0, 0.4, 0, 0.7, 0, 0.4, 0.3];
  A.updateMusic = function () {
    if (!A.ready) return;
    const ctx = A.ctx;
    const beat = 60 / 84 / 2;
    while (nextNote < ctx.currentTime + 0.25) {
      const t = nextNote;
      const s = step % 8;
      if (PATTERN[s]) drum(t, s === 0 || s === 4, 0.16 * PATTERN[s]);
      // melody: random walk on the scale, phrases of 16 steps with rests
      const phrasePos = step % 32;
      if (phrasePos < 24 && Math.random() < (s % 2 === 0 ? 0.75 : 0.25)) {
        melodyIdx = KT.clamp(melodyIdx + Math.floor(Math.random() * 5) - 2, 0, SCALE.length - 1);
        if (phrasePos === 0 || phrasePos === 23) melodyIdx = phrasePos === 0 ? 5 : 0;
        pluck(hz(SCALE[melodyIdx]), t, 0.13);
      }
      nextNote += beat;
      step++;
    }
  };
})();
