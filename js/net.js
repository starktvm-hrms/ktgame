// Online services: accounts API, session storage ("remember me"),
// progress sync and the realtime connection that shows other players.
(function () {
  'use strict';
  const T = THREE;
  const SESSION_KEY = 'kt-session';
  const Net = KT.Net = {
    token: null, user: null, remember: false, ws: null, connected: false, online: 0, myId: 0,
    remotes: new Map(), levelCode: 0, wantWho: new Set(), sendT: 0, whoT: 0, retry: 0
  };
  const ANIMS = ['idle', 'walk', 'run', 'jump', 'fall', 'namaskaram', 'wave', 'sit', 'paddle', 'drive', 'land'];
  Net.ANIMS = ANIMS;

  // ------------------------------------------------------------ server URL
  Net.base = function () {
    if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin;
    try { return localStorage.getItem('kt-server') || 'http://localhost:8080'; } catch (e) { return 'http://localhost:8080'; }
  };
  Net.setBase = function (url) { try { localStorage.setItem('kt-server', url.replace(/\/+$/, '')); } catch (e) { /* ignore */ } };

  // --------------------------------------------------------------- session
  function storeGet(st, k) { try { return JSON.parse(st.getItem(k)); } catch (e) { return null; } }
  Net.loadSession = function () {
    const s = storeGet(window.localStorage, SESSION_KEY) || storeGet(window.sessionStorage, SESSION_KEY);
    if (s && s.token) { Net.token = s.token; Net.remember = !!s.remember; }
    return s;
  };
  Net.saveSession = function (token, remember, phone) {
    Net.token = token; Net.remember = remember;
    const data = JSON.stringify({ token, remember });
    try {
      // "Remember me" keeps the session across browser restarts; otherwise it
      // only lives until the tab is closed.
      if (remember) { localStorage.setItem(SESSION_KEY, data); sessionStorage.removeItem(SESSION_KEY); localStorage.setItem('kt-last-phone', phone || ''); }
      else { sessionStorage.setItem(SESSION_KEY, data); localStorage.removeItem(SESSION_KEY); localStorage.removeItem('kt-last-phone'); }
    } catch (e) { /* storage unavailable */ }
  };
  Net.lastPhone = function () { try { return localStorage.getItem('kt-last-phone') || ''; } catch (e) { return ''; } };
  Net.logout = function () {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    Net.token = null; Net.user = null;
    if (Net.ws) { Net.ws.onclose = null; Net.ws.close(); Net.ws = null; }
  };

  // ------------------------------------------------------------------- API
  Net.api = async function (method, path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    let res;
    try {
      res = await fetch(Net.base() + path, {
        method, signal: ctrl.signal,
        headers: Object.assign({ 'Content-Type': 'application/json' }, Net.token ? { Authorization: 'Bearer ' + Net.token } : {}),
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw { status: 0, code: 'OFFLINE', message: 'Cannot reach the game server. Check your connection, or play offline as a guest.' };
    } finally { clearTimeout(timer); }
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (!res.ok) throw { status: res.status, code: data.error || 'ERROR', message: data.message || 'Request failed (' + res.status + ')' };
    return data;
  };
  Net.health = () => Net.api('GET', '/api/health');
  Net.register = async function (form) {
    const r = await Net.api('POST', '/api/register', form);
    Net.saveSession(r.token, !!form.remember, form.phone);
    Net.user = r.user;
    return r.user;
  };
  Net.login = async function (form) {
    const r = await Net.api('POST', '/api/login', form);
    Net.saveSession(r.token, !!form.remember, form.phone);
    Net.user = r.user;
    return r.user;
  };
  Net.me = async function () { const r = await Net.api('GET', '/api/me'); Net.user = r.user; return r.user; };
  Net.updateMe = async function (patch) {
    const r = await Net.api('PUT', '/api/me', patch);
    Net.user = r.user;
    if (Net.ws && Net.connected) Net.ws.send(JSON.stringify({ t: 'profile', name: true, character: true }));
    return r.user;
  };
  Net.profile = async (id) => (await Net.api('GET', '/api/profile/' + id)).profile;

  // progress is synced in the background (debounced) while playing
  let progTimer = null, progPending = null;
  Net.queueProgress = function (data, now) {
    if (!Net.token) return;
    progPending = data;
    if (now) return Net.flushProgress();
    if (!progTimer) progTimer = setTimeout(Net.flushProgress, 8000);
  };
  Net.flushProgress = function (useBeacon) {
    clearTimeout(progTimer); progTimer = null;
    if (!progPending || !Net.token) return;
    const body = JSON.stringify({ progress: progPending });
    progPending = null;
    // keepalive lets the request finish while the page is closing
    fetch(Net.base() + '/api/progress', { method: 'PUT', keepalive: !!useBeacon, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Net.token }, body }).catch(() => {});
  };

  // -------------------------------------------------------------- realtime
  Net.connect = function () {
    if (!Net.token || Net.ws) return;
    let ws;
    try { ws = new WebSocket(Net.base().replace(/^http/, 'ws') + '/ws'); } catch (e) { return; }
    ws.binaryType = 'arraybuffer';
    Net.ws = ws;
    ws.onopen = () => { ws.send(JSON.stringify({ t: 'auth', token: Net.token })); };
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'hello') { Net.connected = true; Net.retry = 0; Net.myId = m.id; Net.online = m.online; KT.UI.setOnline(Net.online, true); }
        else if (m.t === 'online') { Net.online = m.n; KT.UI.setOnline(m.n, true); }
        else if (m.t === 'who') m.list.forEach(applyMeta);
        return;
      }
      onSnapshot(new DataView(ev.data));
    };
    ws.onclose = (ev) => {
      Net.ws = null; Net.connected = false;
      KT.UI.setOnline(0, false);
      Net.clearRemotes();
      if (ev.code === 4001) { KT.UI.toast('You signed in on another device, so this session went offline.'); return; }
      if (ev.code === 4003) { KT.UI.toast('Your session has expired. Please log in again.'); return; }
      if (!Net.token) return;
      const wait = Math.min(30000, 2000 * Math.pow(2, Net.retry++));
      setTimeout(Net.connect, wait);
    };
    ws.onerror = () => {};
  };

  function onSnapshot(dv) {
    if (dv.getUint8(0) !== 2) return;
    const n = dv.getUint16(2, true);
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const o = 4 + i * 22;
      const id = dv.getUint32(o, true);
      if (id === Net.myId) continue;
      let r = Net.remotes.get(id);
      if (!r) {
        r = { id, snaps: [], meta: null, obj: null, bus: null, tag: null };
        Net.remotes.set(id, r);
        Net.wantWho.add(id);
      }
      r.snaps.push({ t: now, anim: dv.getUint8(o + 4), flags: dv.getUint8(o + 5), x: dv.getFloat32(o + 6, true), y: dv.getFloat32(o + 10, true), z: dv.getFloat32(o + 14, true), h: dv.getInt16(o + 18, true) / 10000, sp: dv.getInt16(o + 20, true) / 100 });
      if (r.snaps.length > 12) r.snaps.shift();
      r.last = now;
    }
  }

  function applyMeta(m) {
    const r = Net.remotes.get(m.id);
    if (!r) return;
    r.meta = m;
    if (r.obj) { r.obj.parent && r.obj.parent.remove(r.obj); r.obj = null; }
    if (r.tag) { r.tag.parent && r.tag.parent.remove(r.tag); r.tag = null; }
  }

  function nameTag(text) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.font = 'bold 44px system-ui, sans-serif';
    const w = Math.min(500, g.measureText(text).width + 48);
    g.fillStyle = 'rgba(15, 30, 24, 0.72)';
    const x = (512 - w) / 2;
    g.beginPath();
    g.moveTo(x + 30, 12); g.lineTo(x + w - 30, 12); g.quadraticCurveTo(x + w, 12, x + w, 48); g.quadraticCurveTo(x + w, 84, x + w - 30, 84);
    g.lineTo(x + 30, 84); g.quadraticCurveTo(x, 84, x, 48); g.quadraticCurveTo(x, 12, x + 30, 12); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 50);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
    s.scale.set(2.4, 0.45, 1);
    s.renderOrder = 10;
    return s;
  }

  Net.clearRemotes = function () {
    Net.remotes.forEach((r) => {
      if (r.obj && r.obj.parent) r.obj.parent.remove(r.obj);
      if (r.bus && r.bus.parent) r.bus.parent.remove(r.bus);
      if (r.tag && r.tag.parent) r.tag.parent.remove(r.tag);
    });
    Net.remotes.clear();
  };
  Net.setLevel = function (code) { Net.levelCode = code; Net.clearRemotes(); };

  // Send our state ~10 times a second.
  const buf = new ArrayBuffer(20), dv = new DataView(buf);
  Net.sendState = function (st) {
    if (!Net.connected || !Net.ws || Net.ws.readyState !== 1 || Net.ws.bufferedAmount > 64 * 1024) return;
    dv.setUint8(0, 1); dv.setUint8(1, Net.levelCode);
    dv.setUint8(2, Math.max(0, ANIMS.indexOf(st.anim))); dv.setUint8(3, st.flags || 0);
    dv.setFloat32(4, st.x, true); dv.setFloat32(8, st.y, true); dv.setFloat32(12, st.z, true);
    let h = st.heading % (Math.PI * 2); if (h > Math.PI) h -= Math.PI * 2; if (h < -Math.PI) h += Math.PI * 2;
    dv.setInt16(16, Math.round(h * 10000), true);
    dv.setInt16(18, Math.round(KT.clamp(st.speed || 0, -300, 300) * 100), true);
    Net.ws.send(buf);
  };

  // Interpolate other players ~150 ms in the past for smooth movement.
  const _a = new T.Vector3();
  Net.update = function (dt, scene, camera, st) {
    Net.sendT -= dt;
    if (Net.sendT <= 0 && st) { Net.sendT = 0.1; Net.sendState(st); }
    Net.whoT -= dt;
    if (Net.whoT <= 0 && Net.wantWho.size && Net.connected) {
      Net.whoT = 0.5;
      Net.ws.send(JSON.stringify({ t: 'who', ids: Array.from(Net.wantWho).slice(0, 60) }));
      Net.wantWho.clear();
    }
    const now = performance.now(), rt = now - 150;
    Net.remotes.forEach((r, id) => {
      if (now - r.last > 3000) {
        if (r.obj && r.obj.parent) r.obj.parent.remove(r.obj);
        if (r.bus && r.bus.parent) r.bus.parent.remove(r.bus);
        if (r.tag && r.tag.parent) r.tag.parent.remove(r.tag);
        Net.remotes.delete(id);
        return;
      }
      if (!r.obj) {
        const cfg = (r.meta && r.meta.character) || { gender: id % 2 ? 'female' : 'male', outfit: 'casual', hair: 'default', acc: { backpack: true } };
        r.obj = KT.Models.character(Object.assign({}, cfg, { lite: true }));
        scene.add(r.obj);
      }
      if (!r.tag && r.meta) { r.tag = nameTag(r.meta.name); scene.add(r.tag); }
      // pick the two snapshots around the render time
      const s = r.snaps;
      let a = s[0], b = s[s.length - 1];
      for (let i = 0; i < s.length - 1; i++) if (s[i].t <= rt && s[i + 1].t >= rt) { a = s[i]; b = s[i + 1]; break; }
      const k = b.t > a.t ? KT.clamp((rt - a.t) / (b.t - a.t), 0, 1) : 1;
      _a.set(KT.lerp(a.x, b.x, k), KT.lerp(a.y, b.y, k), KT.lerp(a.z, b.z, k));
      const h = KT.angleLerp(a.h, b.h, k);
      const inBus = (b.flags & 1) === 1;
      if (inBus) {
        if (!r.bus) { r.bus = KT.Models.ksrtcBusClone(); scene.add(r.bus); }
        r.bus.position.copy(_a);
        r.bus.rotation.set(0, h, 0);
        r.obj.visible = false;
      } else {
        if (r.bus) { scene.remove(r.bus); r.bus = null; }
        r.obj.visible = true;
        r.obj.position.copy(_a);
        r.obj.rotation.y = h;
        const d = camera.position.distanceTo(_a);
        if (d < 90) KT.Models.animateCharacter(r.obj, ANIMS[b.anim] || 'idle', dt, Math.max(0.6, Math.abs(b.sp) / 3.4));
      }
      if (r.tag) {
        r.tag.position.set(_a.x, _a.y + (inBus ? 4.3 : 2.25), _a.z);
        r.tag.visible = camera.position.distanceTo(_a) < (inBus ? 120 : 45);
      }
    });
  };

  // Nearby players for the players panel.
  Net.nearby = function (pos) {
    const out = [];
    Net.remotes.forEach((r) => {
      const s = r.snaps[r.snaps.length - 1];
      if (!s) return;
      out.push({ id: r.id, name: r.meta ? r.meta.name : 'Traveller', dist: Math.hypot(s.x - pos.x, s.z - pos.z), inBus: (s.flags & 1) === 1 });
    });
    return out.sort((a, b) => a.dist - b.dist);
  };
})();
