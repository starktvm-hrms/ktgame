// Malayalam radio: live internet streams of Kerala's stations, played in
// the game like a car radio. The station list comes from Radio Browser
// (radio-browser.info, a free public directory) when the radio is first
// switched on, so stream addresses stay current: only working https
// streams are kept, Akashvani first, then Radio Mango, Club FM, Red FM and
// the rest by popularity. HLS (.m3u8) streams play through hls.js, loaded
// only when needed.
(function () {
  'use strict';
  const R = KT.Radio = { on: false, stations: [], index: 0, volume: 0.8, loading: false, log: [] };
  const API = ['https://all.api.radio-browser.info', 'https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info', 'https://at1.api.radio-browser.info'];
  const PRIORITY = [/akashvani|all india radio|\bair\b/i, /mango/i, /club\s*fm/i, /red\s*fm/i, /rainbow/i, /ananthapuri/i];
  const $ = (id) => document.getElementById(id);
  let audio = null, hls = null, hlsLoading = null, failT = null, tries = 0;

  async function fetchStations() {
    for (const host of API) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(host + '/json/stations/bylanguage/malayalam?hidebroken=true&order=clickcount&reverse=true&limit=300', { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) continue;
        const list = await res.json();
        const seen = new Set(), out = [];
        list.forEach((s) => {
          const url = (s.url_resolved || s.url || '').trim();
          const name = (s.name || '').replace(/\s+/g, ' ').trim();
          if (!url.startsWith('https://') || s.lastcheckok !== 1 || !name) return;
          const key = name.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          const p = PRIORITY.findIndex((re) => re.test(name));
          out.push({ name, url, hls: /m3u8/i.test(url) || /hls/i.test(s.codec || ''), home: s.homepage || '', rank: p < 0 ? PRIORITY.length : p, clicks: s.clickcount || 0 });
        });
        out.sort((a, b) => a.rank - b.rank || b.clicks - a.clicks);
        if (out.length) return out.slice(0, 30);
      } catch (e) { /* try the next server */ }
    }
    return [];
  }

  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoading) return hlsLoading;
    hlsLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'lib/hls.min.js';
      s.onload = () => resolve(window.Hls);
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return hlsLoading;
  }

  function stopStream() {
    clearTimeout(failT);
    attempt++;
    if (hls) { hls.destroy(); hls = null; }
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  }

  // each tuning attempt has its own number, so a late error from a station
  // already left behind cannot skip the one now playing
  let attempt = 0;
  async function play() {
    const st = R.stations[R.index];
    if (!st) return;
    stopStream();
    const my = ++attempt;
    const fail = (why) => { if (my === attempt && R.on) failed(why); };
    // a fresh player for every station (one left behind by hls.js may not
    // play a plain stream again)
    const a = audio = new Audio();
    a.addEventListener('playing', () => { if (my === attempt) { tries = 0; clearTimeout(failT); show('live'); } });
    a.addEventListener('error', () => { if (a.getAttribute('src')) fail('error ' + (a.error && a.error.code)); });
    a.addEventListener('waiting', () => { if (my === attempt) show('tuning'); });
    // a live stream that drops is reconnected
    a.addEventListener('ended', () => { if (my === attempt && R.on) play(); });
    a.volume = R.volume;
    show('tuning');
    // a station that does not start within a few seconds is skipped
    failT = setTimeout(() => fail('timeout'), 20000);
    const start = () => a.play().catch((e) => { if (e && e.name !== 'AbortError') fail('play ' + e.name); });
    // HLS: through hls.js wherever the browser supports it (Safari and iOS
    // without it play HLS natively)
    const Hls = st.hls ? await loadHls().catch(() => null) : null;
    if (my !== attempt) return;
    if (st.hls && Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.on(Hls.Events.ERROR, (ev, data) => { if (data && data.fatal) fail('hls ' + data.details); });
      hls.on(Hls.Events.MANIFEST_PARSED, start);
      hls.loadSource(st.url);
      hls.attachMedia(a);
    } else {
      a.src = st.url;
      start();
    }
  }

  function failed(why) {
    clearTimeout(failT);
    R.log.push((R.stations[R.index] || {}).name + ': ' + why);
    if (++tries > Math.min(6, R.stations.length)) {
      KT.UI.toast('\u{1F4FB} The radio stations aren\u2019t answering right now. Try again later.', 'warn');
      R.off();
      return;
    }
    KT.UI.toast('\u{1F4FB} ' + R.stations[R.index].name + ' is off the air. Tuning to the next station\u2026', 'info');
    R.index = (R.index + 1) % R.stations.length;
    play();
  }

  function show(state) {
    const st = R.stations[R.index];
    $('radio-panel').classList.toggle('hidden', !R.on);
    if (!R.on) return;
    $('radio-name').textContent = st ? st.name : 'Finding stations…';
    $('radio-state').textContent = state === 'live' ? 'LIVE' : 'Tuning…';
    $('radio-state').classList.toggle('live', state === 'live');
    $('radio-count').textContent = st ? (R.index + 1) + ' / ' + R.stations.length : '';
  }

  // the game's own music steps aside while the radio plays
  function duck(on) { if (KT.Audio.duckMusic) KT.Audio.duckMusic(on); }

  R.powerOn = async function () {
    if (R.on) return;
    R.on = true;
    duck(true);
    show('tuning');
    if (!R.stations.length) {
      R.loading = true;
      R.stations = await fetchStations();
      R.loading = false;
      if (!R.on) return;
      if (!R.stations.length) {
        KT.UI.toast('\u{1F4FB} Couldn’t reach the Malayalam radio stations. Check your internet connection.', 'warn');
        R.off();
        return;
      }
      const saved = KT.Game.settings.radioStation;
      const k = R.stations.findIndex((s) => s.name === saved);
      R.index = k >= 0 ? k : 0;
    }
    tries = 0;
    play();
  };
  R.off = function () {
    R.on = false;
    stopStream();
    duck(false);
    show();
  };
  R.step = function (d) {
    if (!R.on) { R.powerOn(); return; }
    if (!R.stations.length) return;
    R.index = (R.index + d + R.stations.length) % R.stations.length;
    KT.Game.settings.radioStation = R.stations[R.index].name;
    KT.Game.saveSettings && KT.Game.saveSettings();
    tries = 0;
    play();
  };
  // U: switch on, then each press tunes to the next station
  R.key = function () { if (!R.on) R.powerOn(); else R.step(1); };
  // what the player is doing (for the settings screen and for testing)
  R.status = () => (audio ? { playing: !audio.paused && audio.readyState > 2, time: audio.currentTime } : { playing: false, time: 0 });
  R.setVolume = function (v) {
    R.volume = v;
    if (audio) audio.volume = v;
  };

  R.init = function () {
    R.volume = KT.Game.settings.radioVolume !== undefined ? KT.Game.settings.radioVolume : 0.8;
    $('radio-prev').onclick = () => R.step(-1);
    $('radio-next').onclick = () => R.step(1);
    $('radio-off').onclick = () => R.off();
    const vol = $('radio-vol');
    vol.value = R.volume;
    vol.oninput = (e) => { R.setVolume(+e.target.value); KT.Game.settings.radioVolume = R.volume; KT.Game.saveSettings && KT.Game.saveSettings(); };
  };
})();
