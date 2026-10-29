// Game bootstrap, main loop, progression, saving, menus and photo mode.
(function () {
  'use strict';
  const T = THREE;
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'kerala-explorer-save-v1';
  const SETTINGS_KEY = 'kerala-explorer-settings-v1';

  const Game = KT.Game = {
    state: 'loading',
    data: null,
    settings: { quality: 'medium', music: 0.5, sfx: 0.8, sensitivity: 1, invertY: false, pointerLock: false },
    cfg: { gender: 'male', outfit: 'casual', hair: 'default', acc: { backpack: true, camera: false, hat: false, sunglasses: false } }
  };

  function freshData() {
    return {
      name: 'Explorer', coins: 0, xp: 0, level: 1, leaves: 0, stars: [], mission: 0, mprog: 0,
      coinsTaken: [], plasticsTaken: [], photos: [], talked: [], pos: null, heading: Math.PI, playTime: 0
    };
  }

  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }
  function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  Game.xpForLevel = (lvl) => 100 + (lvl - 1) * 60;

  // ---------------------------------------------------------- bootstrap
  Game.boot = async function () {
    const s = load(SETTINGS_KEY);
    if (s) Object.assign(Game.settings, s);
    const canvas = $('game');
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: Game.settings.quality !== 'low', powerPreference: 'high-performance' });
    } catch (e) {
      $('load-text').textContent = 'Sorry, your browser does not support WebGL. Please enable hardware acceleration.';
      return;
    }
    Game.renderer = renderer;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = Game.settings.quality !== 'low';
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    KT.maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    applyPixelRatio();
    const scene = Game.scene = new T.Scene();
    const camera = Game.camera = new T.PerspectiveCamera(60, 1, 0.1, 6000);
    onResize();
    window.addEventListener('resize', onResize);
    KT.Input.init(canvas);
    KT.FX.init(scene);
    KT.initMaterials();
    await KT.World.build(scene, { quality: Game.settings.quality }, KT.UI.progress);
    decorateMap();
    setupTowers();
    const saved = load(SAVE_KEY);
    if (saved && saved.cfg) Game.cfg = saved.cfg;
    const start = startPoint(null);
    KT.Player.init(scene, Game.cfg, start);
    KT.CameraRig.yaw = start.heading + Math.PI;
    // pre-compile shaders to avoid stutter
    renderer.compile(scene, camera);
    Game.preview = KT.Preview;
    KT.Preview.init($('preview'));
    bindUI();
    $('btn-continue').classList.toggle('hidden', !saved);
    KT.UI.hide('loading');
    Game.setState('menu');
    KT.Preview.setConfig(Game.cfg);
    syncCreator();
    Game.clock = new T.Clock();
    renderer.setAnimationLoop(loop);
  };

  function applyPixelRatio() {
    const q = Game.settings.quality;
    const cap = q === 'high' ? 2 : q === 'medium' ? 1.5 : 1;
    Game.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    Game.renderer.setSize(w, h, false);
    Game.camera.aspect = w / h;
    Game.camera.updateProjectionMatrix();
  }

  function startPoint(data) {
    if (data && data.pos) return { pos: new T.Vector3(data.pos.x, data.pos.y, data.pos.z), heading: data.heading };
    const z = 64;
    const x = KT.Geo.promenadeX(z);
    return { pos: new T.Vector3(x, KT.World.promenadeY(z), z), heading: Math.PI };
  }

  // Draw building footprints and the promenade onto the map image.
  function decorateMap() {
    const c = KT.Geo.mapCanvas;
    const g = c.getContext('2d');
    const s = KT.Geo.mapSize / (KT.Geo.HALF * 2);
    g.save();
    KT.World.colliders.forEach((col) => {
      if (col.type !== 'box' || col.ext < 2.2) return;
      g.save();
      g.translate((col.x + KT.Geo.HALF) * s, (col.z + KT.Geo.HALF) * s);
      g.rotate(-(col.rot || 0));
      g.fillStyle = 'rgba(150, 70, 45, 0.9)';
      g.fillRect(-col.hw * s, -col.hd * s, col.hw * 2 * s, col.hd * 2 * s);
      g.restore();
    });
    g.restore();
  }

  // Viewpoint towers: climb with E.
  function setupTowers() {
    const towers = (KT.World.sites.watchTower || []).concat(KT.World.sites.watchTowerForest || []);
    towers.forEach((t) => {
      const base = KT.Geo.height(t.x, t.z);
      const deck = base + 7.1;
      KT.World.addPlatform(t.x, t.z, 1.65, 1.65, t.rot, deck);
      KT.World.colliders.forEach((c) => { if (Math.hypot(c.x - t.x, c.z - t.z) < 1 && c.type === 'box') c.maxY = base + 4; });
      // railings on the deck
      const cs = Math.cos(t.rot), sn = Math.sin(t.rot);
      [[0, 1.75, 1.8, 0.1], [0, -1.75, 1.8, 0.1], [1.75, 0, 0.1, 1.8], [-1.75, 0, 0.1, 1.8]].forEach((r) => {
        KT.World.addCollider({ type: 'box', x: t.x + r[0] * cs + r[1] * sn, z: t.z - r[0] * sn + r[1] * cs, hw: r[2], hd: r[3], rot: t.rot, minY: deck - 0.5 });
      });
      const bottom = new T.Vector3(t.x + 2.6 * cs + 2.6 * sn, base, t.z - 2.6 * sn + 2.6 * cs);
      KT.Entities.interactables.push({
        id: 'tower-up', label: 'Climb the viewpoint', radius: 3.4,
        pos: () => bottom,
        enabled: () => KT.Player.pos.y < deck - 2,
        action: () => {
          const P = KT.Player;
          P.pos.set(t.x, deck, t.z); P.vy = 0;
          KT.Audio.play('step');
          KT.UI.toast('What a view! Press E to climb down.');
        }
      });
      KT.Entities.interactables.push({
        id: 'tower-down', label: 'Climb down', radius: 2.6,
        pos: () => new T.Vector3(t.x, deck, t.z),
        enabled: () => KT.Player.pos.y > deck - 1,
        action: () => { const P = KT.Player; P.pos.copy(bottom); P.pos.y = KT.Geo.height(bottom.x, bottom.z); P.vy = 0; }
      });
    });
  }

  // ------------------------------------------------------- state machine
  Game.setState = function (s) {
    Game.state = s;
    document.body.dataset.state = s;
    KT.Input.enabled = s === 'playing';
    ['menu', 'hud', 'pause', 'bigmap', 'photo-ui', 'album', 'certificate'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      const on = (id === 'menu' && s === 'menu') || (id === 'hud' && (s === 'playing' || s === 'dialog')) ||
        (id === 'pause' && s === 'paused') || (id === 'bigmap' && s === 'map') || (id === 'photo-ui' && s === 'photo') ||
        (id === 'album' && s === 'album') || (id === 'certificate' && s === 'certificate');
      el.classList.toggle('hidden', !on);
    });
    if (s !== 'playing' && document.pointerLockElement) document.exitPointerLock();
  };

  Game.start = function (continueGame) {
    KT.Audio.init();
    KT.Audio.setVolumes(Game.settings.music, Game.settings.sfx);
    const saved = continueGame ? load(SAVE_KEY) : null;
    Game.data = saved ? Object.assign(freshData(), saved) : freshData();
    if (!saved) {
      Game.data.name = ($('name-input').value || 'Explorer').slice(0, 16);
      Game.data.cfg = Game.cfg;
    }
    Game.cfg = Game.data.cfg || Game.cfg;
    // restore world state
    KT.Entities.coins.forEach((c) => { c.taken = Game.data.coinsTaken.indexOf(c.id) >= 0; });
    KT.Entities.plastics.forEach((p) => { p.taken = Game.data.plasticsTaken.indexOf(p.id) >= 0; p.obj.visible = !p.taken; });
    const sp = startPoint(saved);
    KT.Player.pos.copy(sp.pos);
    KT.Player.heading = sp.heading;
    KT.Player.setCharacter(Game.cfg);
    KT.CameraRig.yaw = sp.heading + Math.PI;
    KT.CameraRig.pitch = 0.22;
    KT.Input.sensitivity = Game.settings.sensitivity;
    KT.Input.invertY = Game.settings.invertY;
    KT.Input.pointerLock = Game.settings.pointerLock;
    KT.UI.updateStats(Game.data);
    KT.UI.updateMission(KT.Missions.current());
    makePortrait();
    Game.setState('playing');
    if (!saved) {
      KT.UI.banner('Kerala', 'God’s Own Country', 'title');
      setTimeout(() => KT.UI.toast('Use W A S D to walk, drag the mouse to look around. Talk to the guide!', 'info'), 1800);
    } else KT.UI.toast('Welcome back, ' + Game.data.name + '!', 'info');
    Game.save();
  };

  function makePortrait() {
    KT.Preview.setConfig(Game.cfg);
    KT.UI.setPortrait(KT.Preview.portrait());
  }

  Game.save = function () {
    if (!Game.data) return;
    const d = Game.data;
    const P = KT.Player;
    if (P.mode === 'foot') d.pos = { x: P.pos.x, y: P.pos.y, z: P.pos.z };
    d.heading = P.heading;
    d.cfg = Game.cfg;
    store(SAVE_KEY, d);
  };

  // --------------------------------------------------------- progression
  Game.addCoins = function (n, silent) {
    Game.data.coins += n;
    KT.UI.updateStats(Game.data);
    if (!silent) KT.Audio.play('coin');
    const el = $('coins').parentElement;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  };
  Game.addXP = function (n) {
    const d = Game.data;
    d.xp += n;
    while (d.xp >= Game.xpForLevel(d.level)) {
      d.xp -= Game.xpForLevel(d.level);
      d.level++;
      KT.Audio.play('level');
      KT.UI.toast('Level up! You are now level ' + d.level, 'level');
    }
    KT.UI.updateStats(d);
  };

  Game.talkTo = function (w) {
    if (Game.state !== 'playing') return;
    w.talking = true;
    Game.setState('dialog');
    KT.Input.enabled = false;
    let lines = w.lines;
    if (w.id === 'guide' && KT.Game.data.mission > 0) lines = [KT.Entities.FACTS.guideLater[Math.floor(Math.random() * 3)], 'Your current mission: ' + ((KT.Missions.current() || {}).title || 'Explore freely!')];
    KT.UI.dialog(w.name, lines, () => {
      w.talking = false;
      Game.setState('playing');
      if (Game.data.talked.indexOf(w.id) < 0) { Game.data.talked.push(w.id); Game.addXP(10); }
      KT.Missions.onTalk(w.id);
    });
  };

  Game.onGesture = function (name) {
    if (!Game.data) return;
    KT.Missions.onGesture(name);
    if (name === 'namaskaram') {
      // animals and people respond
      KT.Entities.npcs.forEach((w) => {
        if (w.obj.position.distanceTo(KT.Player.pos) < 6 && !w.static) { w.wait = 2.5; w.target = null; }
      });
      if (Math.hypot(KT.Player.pos.x + 130, KT.Player.pos.z + 92) < 18) KT.Audio.play('trumpet');
    }
  };
  Game.onEvent = function () { /* reserved for future hooks */ };

  function discover(l) {
    const d = Game.data;
    if (d.stars.indexOf(l.id) >= 0) return;
    d.stars.push(l.id);
    Game.addXP(25);
    KT.Audio.play('star');
    KT.UI.banner('Discovered: ' + l.name, l.desc, 'star');
    KT.UI.updateStats(d);
    Game.save();
  }

  Game.finale = function () {
    const d = Game.data;
    $('cert-name').textContent = d.name;
    $('cert-stats').textContent = d.stars.length + ' of ' + KT.World.LANDMARKS.length + ' places discovered • ' + d.coins + ' coins • ' + d.leaves + ' eco leaves • Level ' + d.level;
    setTimeout(() => Game.setState('certificate'), 2500);
  };

  // ------------------------------------------------------------ main loop
  let saveTimer = 0;
  function loop() {
    const dt = Math.min(0.05, Game.clock.getDelta());
    const st = Game.state;
    const input = KT.Input;
    input.update();
    if (st === 'menu') {
      menuCamera(dt);
      KT.World.update(dt, { pos: Game.camera.position }, Game.camera);
      KT.Preview.render(dt);
    } else if (st === 'playing' || st === 'dialog' || st === 'photo') {
      if (st === 'playing') handleActions();
      else if (st === 'dialog') {
        if (input.consume('interact') || input.consume('confirm') || input.consume('jump')) { if (KT.UI.dialogNext) KT.UI.dialogNext(); }
        if (input.consume('pause')) { KT.UI.closeDialog(); KT.Entities.npcs.forEach((w) => { w.talking = false; }); Game.setState('playing'); }
      } else if (st === 'photo') {
        if (input.consume('photo') || input.consume('jump') || input.consume('confirm')) Game.takePhoto();
        if (input.consume('pause')) Game.setState('playing');
      }
      KT.Input.enabled = st === 'playing' || st === 'photo';
      const frozen = st === 'dialog' ? { move: { x: 0, y: 0 }, sprint: false, consume: () => false } : input;
      if (st !== 'photo') KT.Player.update(dt, frozen, KT.CameraRig);
      KT.CameraRig.update(dt, Game.camera, input);
      KT.World.update(dt, KT.Player, Game.camera);
      KT.FX.update(dt);
      KT.World.followSun(KT.Player.pos);
      gameplay(dt);
      Game.data.playTime += dt;
      saveTimer += dt;
      if (saveTimer > 20) { saveTimer = 0; Game.save(); }
    } else if (st === 'paused' || st === 'map' || st === 'album' || st === 'certificate') {
      if (input.consume('pause') || (st === 'map' && input.consume('map'))) Game.setState('playing');
    }
    KT.Audio.updateMusic();
    if (Game.state !== 'menu' && Game.state !== 'loading') KT.Audio.updateAmbience(dt, KT.Player.pos);
    Game.renderer.render(Game.scene, Game.camera);
    if (Game.pendingPhoto) capturePhoto();
  }

  // cinematic orbit over the backwaters behind the title screen
  let menuT = 0;
  function menuCamera(dt) {
    menuT += dt * 0.03;
    const cx = 60, cz = 30;
    Game.camera.position.set(cx + Math.cos(menuT) * 70, 28 + Math.sin(menuT * 2) * 4, cz + Math.sin(menuT) * 70);
    Game.camera.lookAt(cx + 30, 2, cz - 10);
    KT.World.followSun(new T.Vector3(cx, 0, cz));
  }

  function handleActions() {
    const I = KT.Input, P = KT.Player;
    if (I.consume('pause')) { Game.setState('paused'); return; }
    if (I.consume('map')) { Game.setState('map'); KT.UI.drawBigMap(P.pos, P.heading, KT.Missions.target(), Game.data.stars); return; }
    if (I.consume('view')) { KT.CameraRig.first = !KT.CameraRig.first; KT.UI.toast(KT.CameraRig.first ? 'First-person view' : 'Third-person view'); }
    if (I.consume('photo')) { Game.setState('photo'); KT.UI.toast('Camera mode: frame your shot and press C / Space to snap. Esc to exit.'); return; }
    if (I.consume('help')) { Game.setState('paused'); return; }
    if (I.consume('interact')) {
      if (P.mode === 'canoe') { P.leaveCanoe(); return; }
      if (Game.nearInteract) Game.nearInteract.action();
    }
  }

  const tmpV = new T.Vector3();
  function gameplay(dt) {
    const P = KT.Player, d = Game.data, E = KT.Entities;
    // interactions
    let best = null, bd = 1e9;
    if (P.mode === 'foot') {
      E.interactables.forEach((it) => {
        if (it.enabled && !it.enabled()) return;
        const p = it.pos();
        const dist = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
        if (dist < it.radius && Math.abs(p.y - P.pos.y) < 3 && dist < bd) { bd = dist; best = it; }
      });
    }
    Game.nearInteract = best;
    if (Game.state === 'playing') {
      const key = KT.Input.touch ? '' : '[E] ';
      if (P.mode === 'canoe') KT.UI.prompt(key + 'Get out of the canoe');
      else KT.UI.prompt(best ? key + best.label : null);
    } else KT.UI.prompt(null);
    $('btn-action').classList.toggle('glow', !!best || P.mode === 'canoe');
    // coins
    for (let i = 0; i < E.coins.length; i++) {
      const c = E.coins[i];
      if (c.taken) continue;
      const dx = c.pos.x - P.pos.x, dz = c.pos.z - P.pos.z;
      if (dx * dx + dz * dz < 1.6 && Math.abs(c.pos.y - 0.9 - P.pos.y) < 2) {
        c.taken = true;
        d.coinsTaken.push(c.id);
        Game.addCoins(5);
        Game.addXP(2);
      }
    }
    // plastics
    E.plastics.forEach((p) => {
      if (p.taken) return;
      const dist = Math.hypot(p.obj.position.x - P.pos.x, p.obj.position.z - P.pos.z);
      if (dist < (p.floating ? 3.2 : 1.8)) {
        p.taken = true;
        p.obj.visible = false;
        d.plasticsTaken.push(p.id);
        d.leaves += 1;
        Game.addXP(10);
        KT.Audio.play('pickup');
        const left = E.plastics.filter((q) => q.group === p.group && !q.taken).length;
        KT.UI.toast('Plastic collected! +1 eco leaf (' + left + ' left here)', 'eco');
        KT.UI.updateStats(d);
        KT.UI.updateMission(KT.Missions.current());
      }
    });
    // landmarks
    KT.World.LANDMARKS.forEach((l) => {
      if (Math.hypot(l.x - P.pos.x, l.z - P.pos.z) < l.r) discover(l);
    });
    KT.Missions.update(dt);
    // compass / minimap / beacon
    const target = KT.Missions.target();
    const bearing = -KT.CameraRig.yaw;
    KT.UI.drawCompass(KT.CameraRig.first ? -KT.CameraRig.yaw : bearing, target, P.pos);
    Game._mmT = (Game._mmT || 0) + dt;
    if (Game._mmT > 0.05) {
      Game._mmT = 0;
      KT.UI.drawMinimap(P.pos, P.heading, target, KT.World.zoneAt(P.pos.x, P.pos.z));
    }
    const b = E.beacon;
    if (target) {
      b.visible = true;
      const ty = target.y !== undefined && target.y > 0.1 ? target.y : KT.World.groundY(target.x, target.z).y;
      b.position.set(target.x, Math.max(ty, 0), target.z);
      const t = KT.World.animTime;
      b.userData.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
      const dist = Math.hypot(target.x - P.pos.x, target.z - P.pos.z);
      b.userData.col.material.opacity = KT.clamp((dist - 8) / 40, 0, 0.22);
      b.userData.ring.material.opacity = dist < 4 ? 0.3 : 0.8;
    } else b.visible = false;
  }

  // ---------------------------------------------------------- photo mode
  Game.takePhoto = function () {
    Game.pendingPhoto = true;
  };
  function capturePhoto() {
    Game.pendingPhoto = false;
    const url = Game.renderer.domElement.toDataURL('image/jpeg', 0.88);
    KT.Audio.play('shutter');
    KT.UI.flash();
    // which animals are in frame?
    const cam = Game.camera;
    const found = [];
    KT.Entities.photoTargets.forEach((w) => {
      tmpV.copy(w.obj.position);
      tmpV.y += 1;
      const dist = tmpV.distanceTo(cam.position);
      if (dist > 45 || !w.obj.visible) return;
      tmpV.project(cam);
      if (tmpV.z < 1 && Math.abs(tmpV.x) < 0.85 && Math.abs(tmpV.y) < 0.85 && found.indexOf(w.kind) < 0) found.push(w.kind);
    });
    const zone = KT.World.zoneAt(KT.Player.pos.x, KT.Player.pos.z);
    const names = { peacock: 'Peacock', deer: 'Spotted deer', elephant: 'Elephant', cow: 'Cow', buffalo: 'Water buffalo', monkey: 'Bonnet macaque', egret: 'Egret', kingfisher: 'Kingfisher', cormorant: 'Cormorant' };
    let caption = zone;
    if (found.length) caption = found.map((k) => names[k] || k).join(', ') + ' • ' + zone;
    KT.UI.addPhoto(url, caption);
    const d = Game.data;
    let fresh = 0;
    found.forEach((k) => { if (d.photos.indexOf(k) < 0) { d.photos.push(k); fresh++; } });
    if (fresh) {
      Game.addXP(15 * fresh);
      KT.UI.toast('New wildlife photo: ' + found.map((k) => names[k] || k).join(', ') + '!', 'star');
      KT.UI.updateMission(KT.Missions.current());
    } else KT.UI.toast('Photo saved to your album.');
  }

  // ---------------------------------------------------------------- UI
  function syncCreator() {
    const cfg = Game.cfg;
    document.querySelectorAll('[data-gender]').forEach((b) => b.classList.toggle('sel', b.dataset.gender === cfg.gender));
    const outfits = KT.Models.OUTFITS[cfg.gender];
    const ol = $('outfit-list');
    ol.innerHTML = '';
    Object.keys(outfits).forEach((k) => {
      const b = document.createElement('button');
      b.className = 'chip' + (cfg.outfit === k ? ' sel' : '');
      b.textContent = outfits[k].label;
      b.onclick = () => { cfg.outfit = k; KT.Audio.play('click'); syncCreator(); };
      ol.appendChild(b);
    });
    const hl = $('hair-list');
    hl.innerHTML = '';
    const hairs = KT.Models.HAIR[cfg.gender];
    Object.keys(hairs).forEach((k) => {
      const b = document.createElement('button');
      b.className = 'chip' + (cfg.hair === k ? ' sel' : '');
      b.textContent = hairs[k];
      b.onclick = () => { cfg.hair = k; syncCreator(); };
      hl.appendChild(b);
    });
    document.querySelectorAll('[data-acc]').forEach((b) => b.classList.toggle('sel', !!cfg.acc[b.dataset.acc]));
    KT.Preview.setConfig(cfg);
  }

  function bindUI() {
    document.querySelectorAll('[data-gender]').forEach((b) => b.addEventListener('click', () => {
      Game.cfg.gender = b.dataset.gender;
      if (!KT.Models.OUTFITS[Game.cfg.gender][Game.cfg.outfit]) Game.cfg.outfit = 'casual';
      Game.cfg.hair = 'default';
      syncCreator();
    }));
    document.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => {
      Game.cfg.acc[b.dataset.acc] = !Game.cfg.acc[b.dataset.acc];
      syncCreator();
    }));
    $('btn-start').onclick = () => Game.start(false);
    $('btn-continue').onclick = () => Game.start(true);
    $('btn-settings').onclick = () => { if (Game.state === 'playing') Game.setState('paused'); };
    $('btn-resume').onclick = () => Game.setState('playing');
    $('btn-album').onclick = () => { KT.UI.renderAlbum(); Game.setState('album'); };
    $('btn-album-close').onclick = () => Game.setState('playing');
    $('btn-map').onclick = () => { Game.setState('map'); KT.UI.drawBigMap(KT.Player.pos, KT.Player.heading, KT.Missions.target(), Game.data.stars); };
    $('minimap-wrap').onclick = $('btn-map').onclick;
    $('btn-map-close').onclick = () => Game.setState('playing');
    $('btn-photo-close').onclick = () => Game.setState('playing');
    $('btn-shutter').onclick = () => Game.takePhoto();
    $('btn-view').onclick = () => { KT.Input.pressed.view = true; };
    $('btn-menu').onclick = () => { Game.save(); location.reload(); };
    $('btn-reset').onclick = () => {
      if (window.confirm('Start over? Your saved progress will be erased.')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } location.reload(); }
    };
    $('btn-cert-close').onclick = () => Game.setState('playing');
    $('dialog-next').onclick = () => { if (KT.UI.dialogNext) KT.UI.dialogNext(); };
    $('mission-panel').onclick = () => {
      const m = KT.Missions.current();
      if (m) KT.UI.toast(m.desc, 'info');
    };
    // settings
    const s = Game.settings;
    $('set-music').value = s.music; $('set-sfx').value = s.sfx;
    $('set-sens').value = s.sensitivity; $('set-invert').checked = s.invertY;
    $('set-quality').value = s.quality; $('set-lock').checked = s.pointerLock;
    const saveSettings = () => store(SETTINGS_KEY, s);
    $('set-music').oninput = (e) => { s.music = +e.target.value; KT.Audio.setVolumes(s.music, s.sfx); saveSettings(); };
    $('set-sfx').oninput = (e) => { s.sfx = +e.target.value; KT.Audio.setVolumes(s.music, s.sfx); saveSettings(); };
    $('set-sens').oninput = (e) => { s.sensitivity = +e.target.value; KT.Input.sensitivity = s.sensitivity; saveSettings(); };
    $('set-invert').onchange = (e) => { s.invertY = e.target.checked; KT.Input.invertY = s.invertY; saveSettings(); };
    $('set-lock').onchange = (e) => { s.pointerLock = e.target.checked; KT.Input.pointerLock = s.pointerLock; saveSettings(); };
    $('set-quality').onchange = (e) => {
      s.quality = e.target.value; saveSettings();
      $('quality-note').classList.remove('hidden');
    };
    // pause on tab hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Game.state === 'playing') Game.setState('paused');
      if (document.hidden) Game.save();
    });
    window.addEventListener('beforeunload', () => Game.save());
  }

  window.addEventListener('load', () => {
    Game.boot().catch((e) => {
      console.error(e);
      $('load-text').textContent = 'Something went wrong while loading: ' + e.message;
    });
  });
})();
