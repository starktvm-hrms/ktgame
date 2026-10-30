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
    settings: { quality: 'medium', music: 0.5, sfx: 0.8, sensitivity: 1, invertY: false, mouseLook: true, sky: 'live' },
    cfg: { gender: 'male', outfit: 'casual', hair: 'default', acc: { backpack: true, camera: false, hat: false, sunglasses: false } }
  };

  function freshData() {
    return {
      name: 'Explorer', coins: 0, xp: 0, level: 1, leaves: 0, stars: [], mission: 0, mprog: 0,
      coinsTaken: [], plasticsTaken: [], photos: [], talked: [], pos: null, heading: Math.PI, playTime: 0,
      districts: [], distanceKm: 0, map: 'home', hwHub: null, read: [],
      vehicles: [], fish: { total: 0, kinds: {} }
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
    KT.Lighthouse.setupGallery();
    setupHomeBus(scene);
    KT.Traffic.initHome(scene);
    setupHomeShops(scene);
    Game.homeScene = scene;
    Game.level = 'home';
    KT.GFX.enabled = Game.settings.quality !== 'low';
    KT.Sky.init();
    const saved = load(SAVE_KEY);
    if (saved && saved.cfg) Game.cfg = saved.cfg;
    const start = startPoint(null);
    KT.Player.init(scene, Game.cfg, start);
    KT.CameraRig.yaw = start.heading + Math.PI;
    // pre-compile shaders to avoid stutter
    renderer.compile(scene, camera);
    Game.preview = KT.Preview;
    KT.Preview.init($('preview'));
    KT.Preview.setConfig(Game.cfg);
    bindUI();
    KT.UI.hide('loading');
    Game.setState('auth');
    Game.clock = new T.Clock();
    renderer.setAnimationLoop(loop);
    // sign in (or resume a remembered session), then the title screen
    Game.user = await KT.Account.init();
    prepareMenu();
  };

  // ------------------------------------------------------------ accounts
  // Saved progress: on the server for signed-in players, else this device.
  function savedProgress() {
    if (Game.user) {
      const p = Game.user.progress;
      return p && p.mission !== undefined ? p : null;
    }
    return load(SAVE_KEY);
  }

  function prepareMenu() {
    const u = Game.user;
    const saved = savedProgress();
    const cfg = (u && u.character) || (saved && saved.cfg);
    if (cfg && cfg.gender) Game.cfg = JSON.parse(JSON.stringify(cfg));
    if (!Game.cfg.acc) Game.cfg.acc = {};
    const name = $('name-input');
    name.value = u ? u.name : (saved && saved.name) || name.value;
    name.disabled = !!u;
    const acc = $('menu-account');
    acc.innerHTML = '';
    const link = (text, fn) => { const b = document.createElement('button'); b.className = 'linkish'; b.textContent = text; b.onclick = fn; return b; };
    if (u) {
      acc.append('Signed in as ', Object.assign(document.createElement('b'), { textContent: u.name }), ' (' + (u.phone || '') + ') \u2022 ');
      acc.appendChild(link('Log out', () => { KT.Net.logout(); location.reload(); }));
    } else {
      acc.append('Playing offline as a guest \u2022 ');
      acc.appendChild(link('Sign in / Register', () => { Game.setState('auth'); KT.Account.init().then((user) => { Game.user = user; prepareMenu(); }); }));
      acc.append(' to save online and meet other travellers.');
    }
    $('btn-continue').classList.toggle('hidden', !saved);
    $('btn-start').textContent = saved ? 'New Journey' : 'Begin Journey';
    $('btn-start').classList.toggle('hidden', false);
    $('btn-save-look').classList.add('hidden');
    Game.creatorInGame = false;
    Game.setState('menu');
    syncCreator();
  }

  // Change appearance from inside the game (profile page).
  Game.openCreator = function () {
    Game.creatorInGame = true;
    $('btn-start').classList.add('hidden');
    $('btn-continue').classList.add('hidden');
    $('btn-save-look').classList.remove('hidden');
    $('name-input').disabled = true;
    Game.setState('menu');
    syncCreator();
  };
  function saveLook() {
    Game.data.cfg = Game.cfg;
    KT.Player.setCharacter(Game.cfg);
    if (KT.Player.mode === 'bus') { // keep the driver in the seat
      KT.Player.scene.remove(KT.Player.obj);
      KT.Player.bus.obj.add(KT.Player.obj);
      KT.Player.obj.position.copy(KT.Player.bus.spec.seat);
      KT.Player.obj.rotation.set(0, 0, 0);
    }
    makePortrait();
    if (KT.Net.user) KT.Net.updateMe({ character: Game.cfg }).catch(() => {});
    Game.creatorInGame = false;
    Game.save(true);
    Game.setState('playing');
    KT.UI.toast('Looking good! Appearance saved.');
  }

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
    ['menu', 'hud', 'pause', 'bigmap', 'photo-ui', 'album', 'certificate', 'profile-page', 'players', 'district', 'garage', 'groups'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      const on = (id === 'menu' && s === 'menu') || (id === 'hud' && (s === 'playing' || s === 'dialog' || s === 'fishing')) || (id === 'garage' && s === 'garage') || (id === 'groups' && s === 'groups') ||
        (id === 'pause' && s === 'paused') || (id === 'bigmap' && s === 'map') || (id === 'photo-ui' && s === 'photo') ||
        (id === 'album' && s === 'album') || (id === 'certificate' && s === 'certificate') ||
        (id === 'profile-page' && s === 'profile') || (id === 'players' && s === 'players') || (id === 'district' && s === 'district');
      el.classList.toggle('hidden', !on);
    });
    // capture the mouse while playing so moving it looks around; free it
    // on screens that need the cursor (travel fades keep it captured)
    if (s === 'playing' || s === 'photo' || s === 'fishing') KT.Input.lockPointer();
    else if (s !== 'travel') KT.Input.unlockPointer();
    updateMouseHint();
  };
  function updateMouseHint() {
    const I = KT.Input;
    const show = Game.state === 'playing' && I.mouseLook && !I.touch && !I.locked && !I.lockFailed;
    $('mouse-hint').classList.toggle('hidden', !show);
  }

  Game.start = function (continueGame) {
    if (!continueGame && savedProgress() && !window.confirm('Start a new journey? Your saved progress will be replaced.')) return;
    KT.Audio.init();
    KT.Audio.setVolumes(Game.settings.music, Game.settings.sfx);
    const saved = continueGame ? savedProgress() : null;
    Game.data = saved ? Object.assign(freshData(), JSON.parse(JSON.stringify(saved))) : freshData();
    if (Game.user) Game.data.name = Game.user.name;
    else if (!saved) Game.data.name = ($('name-input').value || 'Explorer').trim().slice(0, 24) || 'Explorer';
    Game.data.cfg = Game.cfg; // the look chosen on the title screen
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
    KT.Input.mouseLook = Game.settings.mouseLook !== false;
    KT.UI.updateStats(Game.data);
    KT.UI.updateMission(KT.Missions.current());
    makePortrait();
    Game.setState('playing');
    if (Game.user) {
      KT.Net.updateMe({ character: Game.cfg }).catch(() => {});
      KT.Net.connect();
      KT.UI.setOnline(0, false);
    } else KT.UI.setOnline(0, false);
    if (saved && Game.data.map === 'highway') Game.goHighway({ hub: Game.data.hwHub, board: false, quiet: true });
    setTimeout(Game.checkUnlocks, 2500);
    if (!saved) {
      KT.UI.banner('Kerala', 'God’s Own Country', 'title');
      setTimeout(() => KT.UI.toast('Use W A S D to walk and Shift + W to run. Move the mouse to look around. Talk to the guide!', 'info'), 1800);
    } else KT.UI.toast('Welcome back, ' + Game.data.name + '!', 'info');
    Game.save();
  };

  function makePortrait() {
    KT.Preview.setConfig(Game.cfg);
    KT.UI.setPortrait(KT.Preview.portrait());
  }

  Game.save = function (now) {
    if (!Game.data) return;
    const d = Game.data;
    const P = KT.Player;
    if (Game.level === 'home') {
      if (P.mode === 'foot') d.pos = { x: P.pos.x, y: P.pos.y, z: P.pos.z };
      d.heading = P.heading;
    } else if (Game.level === 'lighthouse') {
      // inside the lighthouse: resume just outside its door
      const o = KT.Lighthouse.outside;
      d.pos = { x: o.x, y: KT.Geo.height(o.x, o.z), z: o.z };
      d.heading = o.heading;
    } else d.hwHub = KT.Highway.status(P.pos).nearest;
    d.map = Game.level === 'lighthouse' ? 'home' : Game.level;
    d.cfg = Game.cfg;
    d.playTime = Math.round(d.playTime * 10) / 10;
    if (Game.user) {
      Game.user.progress = d;
      KT.Net.queueProgress(d, now);
    } else store(SAVE_KEY, d);
  };

  // --------------------------------------------------------- progression
  Game.addCoins = function (n, silent) {
    Game.data.coins += n;
    KT.UI.updateStats(Game.data);
    if (!silent) KT.Audio.play('coin');
    const el = $('coins').parentElement;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    if (n > 0) Game.checkUnlocks();
  };

  // ------------------------------------------------------ vehicle unlocks
  // Vehicles unlock in order as the wallet reaches their price, which is
  // then paid from the wallet.
  Game.GARAGE = [
    { id: 'bicycle', name: 'Bicycle', ml: 'സൈക്കിൾ', price: 250, icon: '\u{1F6B2}', desc: 'Quiet and healthy • up to 45 km/h' },
    { id: 'auto', name: 'Auto Rickshaw (Tuk Tuk)', ml: 'ഓട്ടോറിക്ഷ', price: 350, icon: '\u{1F6FA}', desc: 'Kerala’s favourite ride • up to 70 km/h' },
    { id: 'scooter', name: 'Scooter', ml: 'സ്കൂട്ടർ', price: 500, icon: '\u{1F6F5}', desc: 'Zip between the districts • up to 90 km/h' },
    { id: 'car', name: 'Car', ml: 'കാർ', price: 1000, icon: '\u{1F697}', desc: 'The fastest way across Kerala • up to 130 km/h' }
  ];
  Game.checkUnlocks = function () {
    const d = Game.data;
    if (!d) return;
    d.vehicles = d.vehicles || [];
    const next = Game.GARAGE.find((v) => d.vehicles.indexOf(v.id) < 0);
    if (!next || d.coins < next.price) return;
    d.vehicles.push(next.id);
    d.coins -= next.price;
    KT.UI.updateStats(d);
    KT.Audio.play('level');
    KT.UI.banner(next.icon + ' ' + next.name + ' unlocked!', next.price + ' coins paid from your wallet • Press G to ride it', 'star');
    if (Game.state === 'garage') renderGarage();
    Game.save(true);
  };

  function renderGarage() {
    const d = Game.data, list = $('garage-list');
    list.innerHTML = '';
    const owned = d.vehicles || [];
    const nextId = (Game.GARAGE.find((v) => owned.indexOf(v.id) < 0) || {}).id;
    Game.GARAGE.forEach((v, i) => {
      const card = document.createElement('div');
      const has = owned.indexOf(v.id) >= 0;
      card.className = 'garage-card' + (has ? ' owned' : '');
      const riding = KT.Player.mode === 'bus' && KT.Player.bus && KT.Player.bus.type === v.id;
      let status;
      if (has) status = '<button class="btn primary small" data-ride="' + v.id + '">' + (riding ? 'Riding' : 'Ride') + '</button>';
      else if (v.id === nextId) {
        const pct = Math.min(100, Math.round((d.coins / v.price) * 100));
        status = '<div class="g-prog"><div style="width:' + pct + '%"></div></div><small>' + d.coins + ' / ' + v.price + ' coins • ' + Math.max(0, v.price - d.coins) + ' more to go</small>';
      } else status = '<small class="muted">Unlocks after the ' + Game.GARAGE[i - 1].name.split(' (')[0].toLowerCase() + '</small>';
      card.innerHTML = '<div class="g-icon">' + v.icon + '</div><div class="g-body"><b>' + v.name + '</b> <span class="g-ml">' + v.ml + '</span><div class="muted small-print">' + v.desc + '</div>' +
        '<div class="g-price">' + (has ? 'Unlocked' : '\u{1FA99} ' + v.price + ' coins') + '</div></div><div class="g-status">' + status + '</div>';
      list.appendChild(card);
    });
    list.querySelectorAll('[data-ride]').forEach((b) => { b.onclick = () => Game.rideVehicle(b.dataset.ride); });
  }
  Game.openGarage = function () {
    if (!Game.data) return;
    renderGarage();
    Game.setState('garage');
  };

  // Ride one of your vehicles: it appears next to you and you hop on.
  Game.rideVehicle = function (id) {
    const P = KT.Player;
    if (P.mode === 'bus' && P.bus && P.bus.type === id) { Game.setState('playing'); return; }
    if (P.mode !== 'foot') { KT.UI.toast('Get off the ' + (P.bus ? P.bus.spec.name : 'canoe') + ' first.'); Game.setState('playing'); return; }
    if (KT.L.noVehicles || (KT.Lighthouse.onGallery && KT.Lighthouse.onGallery())) { KT.UI.toast('No vehicles up here! Go outside first.'); Game.setState('playing'); return; }
    if (Game.ride) { KT.Vehicle.remove(Game.ride); Game.ride = null; }
    const L = KT.L, h = P.heading;
    const cands = [[1.8, 0], [-1.8, 0], [0, 2.5], [0, -2.5], [2.6, 1.5], [-2.6, 1.5]];
    let spot = null;
    for (let i = 0; i < cands.length && !spot; i++) {
      const x = P.pos.x + cands[i][0] * Math.cos(h) + cands[i][1] * Math.sin(h);
      const z = P.pos.z - cands[i][0] * Math.sin(h) + cands[i][1] * Math.cos(h);
      if (!L.isBlocked(x, z, 1.0) && !(L.isWater && L.isWater(x, z))) spot = { x, z };
    }
    if (!spot) { KT.UI.toast('No room for your ' + id + ' here. Try an open road.'); Game.setState('playing'); return; }
    Game.ride = KT.Vehicle.create(Game.scene, spot.x, spot.z, h, id);
    Game.setState('playing');
    P.boardBus(Game.ride);
    KT.UI.toast('W/S to ride, A/D to steer, H for the ' + (id === 'bicycle' ? 'bell' : 'horn') + ', E to get off.', 'info');
  };
  function rideInteract() {
    const r = Game.ride;
    if (!r || r.occupied || r.level !== Game.level) return [];
    return [{ label: 'Ride your ' + r.spec.name, radius: 1.6 + r.spec.length / 2, pos: () => r.obj.position, action: () => KT.Player.boardBus(r) }];
  }
  // distance on the road (map scale), any vehicle on the highway
  function trackDistance() {
    const P = KT.Player, v = P.mode === 'bus' ? P.bus : null;
    if (!v || Game.level !== 'highway') { Game._odoVeh = null; return; }
    if (Game._odoVeh !== v) { Game._odoVeh = v; Game._lastOdo = v.odo; return; }
    const delta = v.odo - Game._lastOdo;
    Game._lastOdo = v.odo;
    if (delta > 0 && delta < 100) Game.data.distanceKm = (Game.data.distanceKm || 0) + KT.Vehicle.toKm(delta);
  }
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
    $('cert-stats').textContent = d.stars.length + ' of ' + KT.World.LANDMARKS.length + ' places discovered • ' + d.districts.length + ' of 14 districts • ' + d.coins + ' coins • ' + d.leaves + ' eco leaves • Level ' + d.level;
    setTimeout(() => Game.setState('certificate'), 2500);
  };

  // ------------------------------------------------------------ main loop
  let saveTimer = 0;
  function loop() {
    const dt = Math.min(0.05, Game.clock.getDelta());
    const st = Game.state;
    const input = KT.Input;
    input.update();
    if ((st === 'menu' || st === 'auth') && !Game.creatorInGame) {
      menuCamera(dt);
      KT.World.update(dt, { pos: Game.camera.position }, Game.camera);
      KT.Traffic.updateHome(dt, Game.camera.position);
      if (st === 'menu') KT.Preview.render(dt);
    } else if (st === 'menu') {
      KT.Preview.render(dt);
    } else if (st === 'playing' || st === 'dialog' || st === 'photo' || st === 'fishing') {
      if (st === 'playing') handleActions();
      else if (st === 'fishing') KT.Fishing.update(dt, input);
      else if (st === 'dialog') {
        if (input.consume('interact') || input.consume('confirm') || input.consume('jump')) { if (KT.UI.dialogNext) KT.UI.dialogNext(); }
        if (input.consume('pause')) { KT.UI.closeDialog(); KT.Entities.npcs.concat(KT.Highway.npcs).forEach((w) => { w.talking = false; }); Game.setState('playing'); }
      } else if (st === 'photo') {
        if (input.consume('photo') || input.consume('jump') || input.consume('confirm')) Game.takePhoto();
        if (input.consume('pause')) Game.setState('playing');
      }
      KT.Input.enabled = Game.state === 'playing' || Game.state === 'photo' || Game.state === 'fishing';
      const frozen = st === 'dialog' ? { move: { x: 0, y: 0 }, sprint: false, keys: {}, consume: () => false } : input;
      if (st !== 'photo' && st !== 'fishing') KT.Player.update(dt, frozen, KT.CameraRig);
      KT.CameraRig.update(dt, Game.camera, input);
      if (Game.level === 'home') {
        KT.World.update(dt, KT.Player, Game.camera);
        KT.Traffic.updateHome(dt, Game.camera.position);
        KT.World.followSun(KT.Player.pos);
      } else if (Game.level === 'lighthouse') {
        KT.Lighthouse.update(dt, KT.Player);
      } else {
        KT.Highway.update(dt, KT.Player, Game.camera);
        KT.Highway.followSun(KT.Player.pos);
      }
      KT.FX.update(dt);
      if (Game.level === 'home') gameplay(dt); else if (Game.level === 'lighthouse') lighthouseGameplay(dt); else highwayGameplay(dt);
      Game.data.playTime += dt;
      saveTimer += dt;
      if (saveTimer > 20) { saveTimer = 0; Game.save(); }
    } else if (st === 'map' && (mapRedrawT -= dt) <= 0 && !input.pressed.map && !input.pressed.pause) {
      mapRedrawT = 0.5;
      drawMap();
    }
    if (st === 'paused' || st === 'map' || st === 'album' || st === 'certificate' || st === 'profile' || st === 'players' || st === 'district' || st === 'garage' || st === 'groups') {
      if (input.consume('pause') || (st === 'map' && input.consume('map')) || (st === 'profile' && input.consume('profile')) || (st === 'players' && input.consume('players')) || (st === 'garage' && input.consume('garage'))) {
        if (st === 'groups') KT.Groups.close(); else Game.setState('playing');
      }
    }
    if (Game.data && st !== 'menu' && st !== 'auth') {
      network(dt);
      KT.Groups.update(dt);
      KT.Voice.update(dt);
    }
    KT.Sky.update(Math.min(dt, 0.1));
    KT.GFX.update(Math.min(dt, 0.1));
    KT.Audio.updateMusic();
    if (Game.state !== 'menu' && Game.state !== 'loading' && Game.state !== 'auth' && Game.level === 'home') KT.Audio.updateAmbience(dt, KT.Player.pos);
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

  // The big map opens centred on the player at the last zoom level; it can
  // be zoomed and dragged (KT.UI.bindMapZoom) and repaints while open.
  let mapRedrawT = 0;
  function drawMap() {
    const P = KT.Player;
    const o = P.mode === 'bus' && P.bus ? P.bus.obj.position : P.pos;
    const h = P.mode === 'bus' && P.bus ? P.bus.heading : P.heading;
    if (Game.level === 'highway') KT.UI.drawBigMapHighway(o, h);
    else KT.UI.drawBigMap(Game.level === 'home' ? o : Game.mapPos(), h, KT.Missions.target(), Game.data.stars);
  }
  Game.mapPos = function () { return KT.Lighthouse && KT.Lighthouse.mapPos ? KT.Lighthouse.mapPos() : KT.Player.pos; };
  Game.openMap = function () {
    Game.setState('map');
    KT.UI.mapLevel(Game.level === 'highway' ? 'highway' : 'home');
    KT.UI.mapRecenter = () => {
      drawMap(); // sets the projection for this level
      const P = KT.Player;
      const o = Game.level === 'highway' ? (P.mode === 'bus' && P.bus ? P.bus.obj.position : P.pos) : Game.level === 'home' ? P.pos : Game.mapPos();
      KT.UI.centerMapOn(o.x, o.z);
    };
    KT.UI.mapRecenter();
    drawMap();
    mapRedrawT = 0.5;
  };

  function handleActions() {
    const I = KT.Input, P = KT.Player;
    if (I.consume('pause')) { Game.setState('paused'); return; }
    if (I.consume('map')) { Game.openMap(); return; }
    if (I.consume('profile')) { KT.Account.openProfile(); return; }
    if (I.consume('players')) { KT.Account.openPlayers(); return; }
    if (I.consume('garage')) { Game.openGarage(); return; }
    if (I.consume('groups')) { KT.Groups.open(); return; }
    if (I.consume('mic')) KT.Voice.toggle(KT.Groups.active);
    if (I.consume('view')) { KT.CameraRig.first = !KT.CameraRig.first; KT.UI.toast(KT.CameraRig.first ? 'First-person view' : 'Third-person view'); }
    if (I.consume('photo')) { Game.setState('photo'); KT.UI.toast('Camera mode: frame your shot and press C / Space to snap. Esc to exit.'); return; }
    if (I.consume('help')) { Game.setState('paused'); return; }
    if (I.consume('recover') && P.mode === 'bus') { recoverVehicle(); return; }
    if (I.consume('interact')) {
      if (P.mode === 'canoe') { P.leaveCanoe(); return; }
      if (P.mode === 'bus' && P.bus.stuckT > 1.5) { recoverVehicle(); return; }
      if (P.mode === 'bus') { P.leaveBus(); return; }
      if (Game.nearInteract) Game.nearInteract.action();
    }
  }

  // ------------------------------------------------------ multiplayer
  function network(dt) {
    if (!KT.Net.token) return;
    const P = KT.Player;
    const inBus = P.mode === 'bus' && P.bus;
    const o = inBus ? P.bus.obj.position : P.pos;
    KT.Net.update(dt, Game.scene, Game.camera, Game.state === 'menu' ? null : {
      x: o.x, y: o.y, z: o.z,
      heading: inBus ? P.bus.heading : P.heading,
      anim: inBus ? P.bus.spec.pose : (P.gesture || P.state || 'idle'),
      flags: inBus ? 1 | (Math.max(0, KT.Vehicle.CODES.indexOf(P.bus.type)) << 1) : 0,
      speed: inBus ? P.bus.speed : P.speed
    });
  }

  // nearest interactable from a list (on foot only)
  function pickInteract(list) {
    const P = KT.Player;
    let best = null, bd = 1e9;
    if (P.mode !== 'foot') return null;
    list.forEach((it) => {
      if (it.enabled && !it.enabled()) return;
      const p = it.pos();
      const dist = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
      if (dist < it.radius && Math.abs(p.y - P.pos.y) < 3 && dist < bd) { bd = dist; best = it; }
    });
    return best;
  }
  function recoverVehicle() {
    const P = KT.Player;
    if (KT.Vehicle.recover(P.bus)) { KT.CameraRig.snap = true; KT.UI.toast('Back on the road!', 'info'); }
  }
  function showPrompt(best) {
    const P = KT.Player;
    if (Game.state === 'playing') {
      const key = KT.Input.touch ? '' : '[E] ';
      if (P.mode === 'canoe') KT.UI.prompt(key + 'Get out of the canoe');
      else if (P.mode === 'bus' && P.bus.stuckT > 1.5) KT.UI.prompt((KT.Input.touch ? '' : '[R] ') + 'Stuck? Get back on the road');
      else if (P.mode === 'bus') KT.UI.prompt(Math.abs(P.bus.speed) > 1.5 ? 'W/S drive \u2022 A/D steer \u2022 H ' + (P.bus.type === 'bicycle' ? 'bell' : 'horn') + ' \u2022 stop to get off' : key + 'Get off the ' + P.bus.spec.name);
      else KT.UI.prompt(best ? key + best.label : null);
    } else KT.UI.prompt(null);
    $('btn-action').classList.toggle('glow', !!best || P.mode === 'canoe' || P.mode === 'bus');
  }

  // ------------------------------------------------- home: KSRTC stand
  // A bus stand beside the village road with a parked KSRTC bus that
  // takes the player out to the Kerala highway and the 14 districts.
  function setupHomeBus(scene) {
    const W = KT.World;
    const road = [[16, 40], [-10, 36], [-45, 30], [-90, 40], [-130, 46]];
    const startZ = 64, startX = KT.Geo.promenadeX(startZ);
    let best = null;
    for (let i = 0; i < road.length - 1; i++) {
      const a = road[i], b = road[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const fx = (b[0] - a[0]) / len, fz = (b[1] - a[1]) / len;
      for (let t = 8; t < len - 8; t += 2) {
        [-1, 1].forEach((side) => {
          const px = -fz * side, pz = fx * side; // perpendicular
          const cx = a[0] + fx * t + px * 1.2, cz = a[1] + fz * t + pz * 1.2;
          const sx = cx + px * 5.2, sz = cz + pz * 5.2;
          let ok = true, hmin = 1e9, hmax = -1e9;
          for (let k = -5.5; k <= 5.5 && ok; k += 1.1) {
            const bx = cx + fx * k, bz = cz + fz * k;
            if (W.isBlocked(bx, bz, 1.6) || W.isWater(bx, bz)) ok = false;
            const h = KT.Geo.height(bx, bz); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
            const qx = sx + fx * k, qz = sz + fz * k;
            if (W.isBlocked(qx, qz, 2.4) || W.isWater(qx, qz)) ok = false;
          }
          if (!ok || hmax - hmin > 1.2 || hmin < 0.4) return;
          const score = Math.hypot(cx - startX, cz - startZ);
          if (!best || score < best.score) best = { score, cx, cz, sx, sz, fx, fz, px, pz, side };
        });
      }
    }
    if (!best) return;
    // the passenger door (left side of the bus) faces the shelter
    const heading = Math.atan2(best.fx, best.fz) + (best.side > 0 ? Math.PI : 0);
    // shelter faces the road
    const stand = KT.Models.busStand('Alappuzha');
    W.place(stand, best.sx, best.sz, Math.atan2(-best.px, -best.pz));
    const prev = KT.L;
    KT.L = W;
    const bus = Game.homeBus = KT.Vehicle.create(scene, best.cx, best.cz, heading);
    KT.L = prev;
    W.addCollider({ type: 'box', x: best.cx, z: best.cz, hw: 1.3, hd: 5.6, rot: heading });
    const door = new T.Vector3();
    Game.homeBusDoor = () => bus.obj.localToWorld(door.set(2.2, 0, 3.6));
    const hfx = Math.sin(heading), hfz = Math.cos(heading);
    Game.homeStop = { x: best.cx + best.px * 3.0 + hfx * 6.5, z: best.cz + best.pz * 3.0 + hfz * 6.5, heading: heading + Math.PI };
    KT.Entities.interactables.push({
      id: 'ksrtc', label: 'Board the KSRTC bus to the 14 districts', radius: 4.5,
      pos: () => Game.homeBusDoor(),
      action: () => Game.goHighway()
    });
    KT.World.LANDMARKS.push({ id: 'ksrtc-stand', name: 'KSRTC Bus Stand', icon: 'bus', x: best.cx, z: best.cz, r: 9, desc: 'Board the bus to travel the Kerala highway through all 14 districts.' });
  }

  // Small Kerala shops facing the village roads near the plaza.
  function setupHomeShops(scene) {
    const W = KT.World, J = KT.Traffic.HOME_JUNCTION;
    const roads = [[[-45, 30], [-38, 80]], [[-45, 30], [-90, 40]], [[-10, 36], [-45, 30]], [[-38, 80], [-25, 130]]];
    const rows = [];
    const fits = (x, z, rot) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      let hmin = 1e9, hmax = -1e9;
      for (const [lx, lz] of [[0, 0], [-2.3, -2.2], [2.3, -2.2], [-2.3, 3.2], [2.3, 3.2], [0, 3.2]]) {
        const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
        if (W.isBlocked(wx, wz, lz > 2 ? 0.6 : 1.4) || W.isWater(wx, wz)) return false;
        const h = KT.Geo.height(wx, wz); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
      }
      return hmax - hmin < 0.9 && hmin > 0.3;
    };
    roads.forEach(([a, b]) => {
      if (rows.length >= 3) return;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const fx = (b[0] - a[0]) / len, fz = (b[1] - a[1]) / len;
      for (let t = 10; t < len - 16 && rows.length < 3; t += 2) {
        for (const side of [-1, 1]) {
          const px = -fz * side, pz = fx * side; // away from the road
          const rot = Math.atan2(-px, -pz);      // shop front faces the road
          const spots = [];
          for (let i = 0; i < 3; i++) {
            const tt = t + i * 4.8;
            const x = a[0] + fx * tt + px * 5.7, z = a[1] + fz * tt + pz * 5.7;
            if (Math.hypot(x - J.x, z - J.z) < 14 || !fits(x, z, rot)) break;
            spots.push({ x, z, rot });
          }
          if (spots.length < 3 || rows.some((r) => Math.hypot(r[0].x - spots[0].x, r[0].z - spots[0].z) < 40)) continue;
          rows.push(spots);
          spots.forEach((sp, i) => {
            const type = KT.Models.SHOP_TYPES[(rows.length * 3 + i) % KT.Models.SHOP_TYPES.length];
            W.place(KT.Models.shop(type), sp.x, sp.z, sp.rot, { y: KT.Geo.height(sp.x, sp.z) - 0.05 });
          });
          break;
        }
      }
    });
  }

  // ------------------------------------------------------ level switching
  function fade(on, text) {
    const f = $('fade');
    $('fade-text').textContent = text || '';
    return new Promise((res) => {
      if (on) { f.style.opacity = 0; f.classList.remove('hidden'); void f.offsetWidth; f.style.opacity = 1; setTimeout(res, 380); }
      else { f.style.opacity = 0; setTimeout(() => { f.classList.add('hidden'); res(); }, 380); }
    });
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

  function switchLevel(L, scene) {
    const P = KT.Player;
    if (P.mode === 'bus' && P.bus) {
      P.bus.occupied = false; P.bus.speed = 0;
      P.bus.obj.remove(P.obj);
      P.mode = 'foot'; P.bus = null;
      KT.Audio.engine(false);
    }
    if (P.mode === 'canoe') P.leaveCanoe();
    if (Game.ride && Game.ride.level !== L.id) { KT.Vehicle.remove(Game.ride); Game.ride = null; }
    if (KT.Fishing.active) KT.Fishing.cancel();
    if (P.obj.parent) P.obj.parent.remove(P.obj);
    P.obj.visible = true;
    P.obj.rotation.set(0, P.heading, 0);
    scene.add(P.obj);
    P.scene = scene;
    KT.FX.parts.forEach((p) => { if (p.s.parent) p.s.parent.remove(p.s); p.s.material.dispose(); });
    KT.FX.parts.length = 0;
    KT.FX.scene = scene;
    KT.L = L;
    Game.scene = scene;
    Game.level = L.id;
    if (Game.data) Game.data.map = L.id;
    KT.Net.setLevel(L.code);
    KT.Entities.beacon.visible = false;
    $('route').classList.toggle('hidden', L.id !== 'highway');
    $('speedo').classList.add('hidden');
    Game.nearInteract = null;
    KT.CameraRig.snap = true;
    Game.renderer.compile(scene, Game.camera);
  }

  // Ride out to the highway: arrive at a district bus stand (Alappuzha
  // by default) at the wheel of a KSRTC bus.
  Game.goHighway = async function (opts) {
    opts = opts || {};
    if (Game.switching) return;
    Game.switching = true;
    const Hw = KT.Highway;
    const homeIdx = KT.DISTRICTS.findIndex((d) => d.home);
    // opts.at: arrive at a spot on the highway (joining a friend), the bus
    // waits at the nearest district bus stand
    const idx = opts.at ? Hw.status(opts.at).nearest
      : opts.hub !== undefined && opts.hub !== null ? KT.clamp(opts.hub, 0, KT.DISTRICTS.length - 1) : homeIdx;
    if (!opts.quiet) KT.Audio.play('door');
    Game.setState('travel');
    await fade(true, 'KSRTC \u2022 Kerala Highway');
    await nextFrame();
    if (!Hw.built) await Hw.build(Game.settings.quality);
    const hub = Hw.hubs[idx];
    const sp = Hw.at(hub.s + 6, -3.2);
    $('fade-text').textContent = 'Travelling to ' + hub.district.name + '\u2026';
    await nextFrame();
    Hw.stream(sp, 999);
    KT.L = Hw;
    if (!Hw.bus) Hw.bus = KT.Vehicle.create(Hw.scene, hub.stop.x, hub.stop.z, hub.stopHeading);
    else {
      Hw.bus.obj.position.set(hub.stop.x, Hw.groundY(hub.stop.x, hub.stop.z).y, hub.stop.z);
      Hw.bus.heading = hub.stopHeading; Hw.bus.speed = 0;
      KT.Vehicle.settle(Hw.bus);
    }
    const P = KT.Player;
    const foot = opts.at ? Hw.at(Hw.project(opts.at.x, opts.at.z).s, Hw.project(opts.at.x, opts.at.z).lat) : Hw.at(hub.s, -10.2);
    if (opts.at) Hw.stream(foot, 999);
    P.pos.set(foot.x, Hw.groundY(foot.x, foot.z).y, foot.z);
    P.heading = hub.stopHeading;
    P.vy = 0;
    switchLevel(Hw, Hw.scene);
    KT.Traffic.initHighway();
    if (opts.board !== false) P.boardBus(Hw.bus);
    KT.CameraRig.yaw = hub.stopHeading + Math.PI;
    Game.lastHub = idx;
    Hw.update(0.016, P, Game.camera);
    await nextFrame();
    Game.setState('playing');
    await fade(false);
    Game.switching = false;
    if (!opts.quiet) {
      KT.UI.banner(hub.district.name, hub.district.ml + '  \u2022  KSRTC Super Fast', 'title');
      setTimeout(() => KT.UI.toast('Drive with W/S, steer with A/D, H for the horn. Follow the green signs to the next district gate!', 'info'), 1600);
    }
    Game.save(true);
  };

  // Back to the Alleppey backwaters map, beside the village bus stand.
  Game.goHome = async function (opts) {
    opts = opts || {};
    if (Game.switching) return;
    Game.switching = true;
    Game.setState('travel');
    await fade(true, opts.title || 'Alleppey Backwaters');
    const P = KT.Player;
    const st = opts.at || Game.homeStop || startPoint(null).pos;
    P.pos.set(st.x, KT.World.groundY(st.x, st.z, opts.y).y, st.z);
    P.heading = opts.heading !== undefined ? opts.heading : Game.homeStop ? Game.homeStop.heading : Math.PI;
    P.vy = 0;
    switchLevel(KT.World, Game.homeScene);
    KT.CameraRig.yaw = P.heading + Math.PI;
    await nextFrame();
    Game.setState('playing');
    await fade(false);
    Game.switching = false;
    if (!opts.quiet) KT.UI.toast('Welcome back to the backwaters! The KSRTC bus waits at the stand whenever you want to travel again.', 'info');
    Game.save(true);
  };

  // ---------------------------------------------- Kovalam lighthouse
  // Step inside (a level of its own), climb to the gallery at the top of
  // the tower on the home map, or go back out to the beach.
  Game.enterLighthouse = async function (opts) {
    opts = opts || {};
    if (Game.switching) return;
    const LH = KT.Lighthouse;
    Game.switching = true;
    KT.Audio.play('door');
    Game.setState('travel');
    await fade(true, opts.from === 'gallery' ? 'Down the spiral stairs\u2026' : 'Vizhinjam Lighthouse');
    await nextFrame();
    LH.build();
    const sp = opts.at || (opts.from === 'gallery' ? LH.spawnStairs : LH.spawnIn);
    const P = KT.Player;
    P.pos.set(sp.x, 0, sp.z);
    P.heading = sp.heading !== undefined ? sp.heading : LH.spawnIn.heading;
    P.vy = 0;
    switchLevel(LH, LH.scene);
    KT.CameraRig.yaw = P.heading + Math.PI;
    LH.update(0.016, P);
    await nextFrame();
    Game.setState('playing');
    await fade(false);
    Game.switching = false;
    if (!opts.quiet && opts.from !== 'gallery') {
      KT.UI.banner('Vizhinjam Lighthouse', 'വിഴിഞ്ഞം വിളക്കുമാടം  \u2022  Kovalam', 'title');
      const d = Game.data;
      if (!d.lhVisited) { d.lhVisited = true; Game.addXP(20); setTimeout(() => KT.UI.toast('Read the exhibits and climb the spiral stairs to the gallery at the top!', 'info'), 1500); }
    }
  };
  Game.leaveLighthouse = function () {
    const o = KT.Lighthouse.outside;
    return Game.goHome({ at: o, heading: o.heading, quiet: true, title: 'Kovalam Beach' });
  };
  Game.climbLighthouse = async function () {
    const LH = KT.Lighthouse, g = LH.galleryAt;
    await Game.goHome({ at: g, heading: g.heading, y: LH.deckY + 0.3, quiet: true, title: '142 steps up\u2026' });
    KT.CameraRig.yaw = g.camYaw; KT.CameraRig.snap = true;
    const d = Game.data;
    KT.UI.toast('What a view over the Arabian Sea! Press E by the door to go back down.', 'info');
    if (!d.lhTop) { d.lhTop = true; Game.addXP(30); Game.addCoins(20); KT.UI.toast('You climbed the Vizhinjam lighthouse! +20 coins', 'star'); }
  };
  function lighthouseGameplay(dt) {
    const P = KT.Player, LH = KT.Lighthouse;
    const best = pickInteract(LH.interactables);
    Game.nearInteract = best;
    showPrompt(best);
    $('speedo').classList.add('hidden');
    KT.UI.drawCompass(-KT.CameraRig.yaw, null, P.pos);
    lhUiT += dt;
    if (lhUiT > 0.1) { lhUiT = 0; KT.UI.drawMinimap(LH.mapPos(), P.heading, null, 'Vizhinjam Lighthouse \u2022 inside'); }
  }
  let lhUiT = 0;

  // Join a group member where they are (any map).
  Game.goToFriend = async function (p) {
    const P = KT.Player;
    if (Game.switching) return;
    if (P.mode !== 'foot') { KT.UI.toast('Get off your ' + (P.bus ? P.bus.spec.name : 'canoe') + ' first, then try again.'); return; }
    Game.setState('playing');
    // land a couple of metres from them, somewhere free
    const L = p.l === 1 ? KT.Highway : p.l === 2 ? KT.Lighthouse : KT.World;
    let x = p.x + 2, z = p.z;
    for (let a = 0; a < 8; a++) {
      const tx = p.x + Math.cos(a * 0.785) * 2.2, tz = p.z + Math.sin(a * 0.785) * 2.2;
      if (L && L.built !== false && !L.isBlocked(tx, tz, 0.5)) { x = tx; z = tz; break; }
    }
    const face = Math.atan2(p.x - x, p.z - z);
    if (p.l === 2) {
      if (Game.level === 'lighthouse') P.pos.set(x, 0, z);
      else { await Game.enterLighthouse({ at: { x, z, heading: face }, quiet: true }); return; }
    } else if (p.l === 1) {
      if (Game.level === 'highway') {
        KT.Highway.stream({ x, z }, 999);
        P.pos.set(x, KT.Highway.groundY(x, z).y, z);
      } else await Game.goHighway({ at: { x, z }, board: false, quiet: true });
    } else if (Game.level === 'home') P.pos.set(x, KT.World.groundY(x, z).y, z);
    else await Game.goHome({ at: { x, z }, quiet: true });
    P.heading = face; P.vy = 0;
    KT.CameraRig.yaw = face + Math.PI; KT.CameraRig.snap = true;
    KT.UI.toast('You joined ' + p.n + '. Namaskaram! \u{1F64F}', 'info');
  };

  // --------------------------------------------------- highway gameplay
  const _door = new T.Vector3();
  const boardHwBus = {
    label: 'Drive the KSRTC bus', radius: 4.2,
    pos: () => KT.Highway.bus.obj.localToWorld(_door.set(2.2, 0, 3.6)),
    enabled: () => KT.Highway.bus && !KT.Highway.bus.occupied,
    action: () => KT.Player.boardBus(KT.Highway.bus)
  };
  Game.readDistrict = function (d) {
    $('district-name').textContent = d.name;
    $('district-ml').textContent = d.ml;
    const ul = $('district-facts');
    ul.innerHTML = '';
    d.facts.forEach((f) => { const li = document.createElement('li'); li.textContent = f; ul.appendChild(li); });
    Game.setState('district');
    const data = Game.data;
    if (data.read.indexOf(d.id) < 0) { data.read.push(d.id); Game.addXP(10); }
  };
  // Tourist attractions on the highway: read about them at their boards,
  // and discover each one by walking or riding up to it.
  Game.readSight = function (sg) {
    if (Game.state !== 'playing') return;
    discoverSight(sg);
    Game.setState('dialog');
    KT.Input.enabled = false;
    KT.UI.dialog(sg.icon + ' ' + sg.name, sg.facts, () => Game.setState('playing'));
  };
  function discoverSight(sg) {
    const d = Game.data;
    d.sights = d.sights || [];
    if (d.sights.indexOf(sg.id) >= 0) return;
    d.sights.push(sg.id);
    Game.addCoins(10, true);
    Game.addXP(15);
    KT.Audio.play('star');
    const total = KT.Highway.sightList().length;
    KT.UI.toast(sg.icon + ' Discovered ' + sg.name + '! +10 coins (' + d.sights.length + ' of ' + total + ' attractions)', 'star');
  }
  let sightT = 0;
  function checkSights(dt, st) {
    sightT -= dt;
    if (sightT > 0) return;
    sightT = 0.5;
    if (st.dist > 400) return;
    const P = KT.Player, o = P.mode === 'bus' && P.bus ? P.bus.obj.position : P.pos;
    KT.Highway.sightList().forEach((sg) => {
      if (sg.hub === st.nearest && Math.hypot(sg.x - o.x, sg.z - o.z) < sg.r + 8) discoverSight(sg);
    });
  }
  function visitDistrict(i) {
    const d = Game.data, dist = KT.DISTRICTS[i];
    if (Game.lastHub !== i && dist.id === 'ekm') setTimeout(() => KT.UI.toast('\u{1F3A3} Kochi! Walk to a Fishing Point by the Chinese nets, cast your net and earn coins for every fish.', 'info'), 2500);
    if (d.districts.indexOf(dist.id) >= 0) {
      if (Game.lastHub !== i) KT.UI.toast('Welcome to ' + dist.name + ' (' + dist.ml + ')');
      Game.lastHub = i;
      return;
    }
    Game.lastHub = i;
    d.districts.push(dist.id);
    Game.addCoins(30, true);
    Game.addXP(40);
    KT.Audio.play('star');
    KT.UI.banner('Welcome to ' + dist.name, dist.ml + '  \u2022  District ' + d.districts.length + ' of 14  \u2022  +30 coins', 'star');
    setTimeout(() => KT.UI.toast('Sights in ' + dist.name + ': ' + dist.sights.map((x) => x.icon + ' ' + x.name).join(', ') + '. They are on your map (M).', 'info'), 3500);
    KT.UI.updateMission(KT.Missions.current());
    Game.save(true);
  }

  let hwUiT = 0;
  function highwayGameplay(dt) {
    const P = KT.Player, Hw = KT.Highway, d = Game.data;
    const best = pickInteract(Hw.interactables.concat([boardHwBus], rideInteract()));
    Game.nearInteract = best;
    showPrompt(best);
    trackDistance();
    const st = Hw.status(P.pos);
    if (st.dist < 90 && Math.abs(st.lat) < 140) visitDistrict(st.nearest);
    else if (st.dist > 400) Game.lastHub = -1;
    checkSights(dt, st);
    KT.Missions.update(dt);
    const target = KT.Missions.target();
    KT.UI.drawCompass(-KT.CameraRig.yaw, target, P.pos);
    const inBus = P.mode === 'bus';
    $('speedo').classList.toggle('hidden', !inBus);
    if (inBus) KT.UI.drawSpeedo(KT.Vehicle.kmh(P.bus));
    hwUiT += dt;
    if (hwUiT > 0.1) {
      hwUiT = 0;
      KT.UI.drawRoute(st.s, st);
      const near = KT.DISTRICTS[st.nearest];
      const way = KT.Highway.nearestWaypoint(st.s);
      const onRoad = KT.Highway.nearestRoad(P.pos.x, P.pos.z, 400);
      let zone = st.dist < 200 ? near.name + ' \u2022 ' + near.ml
        : way && Math.abs(way.s - st.s) < 300 ? way.road + ' \u2022 ' + way.name
          : (way ? way.road : 'NH 66') + ' \u2022 near ' + near.name;
      if (!onRoad.road.main && onRoad.d < Math.abs(st.lat)) {
        // on a branch highway: its number and the nearest town on it
        const R = onRoad.road;
        let t = null;
        R.towns.forEach((w) => { if (!t || Math.abs(w.s - onRoad.s) < Math.abs(t.s - onRoad.s)) t = w; });
        zone = R.nh + ' \u2022 ' + (t && Math.abs(t.s - onRoad.s) < 300 ? t.name : 'towards ' + R.name);
      }
      KT.UI.drawMinimapHighway(P.pos, inBus ? P.bus.heading : P.heading, zone);
    }
  }

  const tmpV = new T.Vector3();
  function gameplay(dt) {
    const P = KT.Player, d = Game.data, E = KT.Entities;
    // interactions
    const best = pickInteract(E.interactables.concat(rideInteract()));
    Game.nearInteract = best;
    showPrompt(best);
    $('speedo').classList.toggle('hidden', P.mode !== 'bus');
    if (P.mode === 'bus') KT.UI.drawSpeedo(KT.Vehicle.kmh(P.bus));
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
    $('btn-save-look').onclick = saveLook;
    $('btn-profile').onclick = () => KT.Account.openProfile();
    $('profile').onclick = () => { if (Game.state === 'playing') KT.Account.openProfile(); };
    $('btn-online').onclick = () => { if (Game.state === 'playing') KT.Account.openPlayers(); };
    $('btn-profile-close').onclick = () => Game.setState(Game.data ? 'playing' : 'menu');
    $('btn-players-close').onclick = () => Game.setState('playing');
    $('btn-district-close').onclick = () => Game.setState('playing');
    $('btn-garage').onclick = () => { if (Game.state === 'playing') Game.openGarage(); };
    $('btn-garage-close').onclick = () => Game.setState('playing');
    KT.Groups.bindUI();
    KT.Fishing.bindUI();
    $('btn-continue').onclick = () => Game.start(true);
    $('btn-settings').onclick = () => { if (Game.state === 'playing') Game.setState('paused'); };
    $('btn-resume').onclick = () => Game.setState('playing');
    $('btn-album').onclick = () => { KT.UI.renderAlbum(); Game.setState('album'); };
    $('btn-album-close').onclick = () => Game.setState('playing');
    $('btn-map').onclick = () => Game.openMap();
    $('minimap-wrap').onclick = $('btn-map').onclick;
    KT.UI.bindMapZoom(drawMap);
    $('btn-map-close').onclick = () => Game.setState('playing');
    $('btn-photo-close').onclick = () => Game.setState('playing');
    $('btn-shutter').onclick = () => Game.takePhoto();
    $('btn-view').onclick = () => { KT.Input.pressed.view = true; };
    $('btn-menu').onclick = () => { Game.save(true); setTimeout(() => location.reload(), 300); };
    $('btn-reset').onclick = () => {
      if (!window.confirm('Start over? Your saved progress will be erased.')) return;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      Game.data = null;
      if (Game.user) KT.Net.queueProgress({}, true);
      setTimeout(() => location.reload(), 300);
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
    $('set-quality').value = s.quality; $('set-lock').checked = s.mouseLook !== false;
    $('set-sky').value = s.sky || 'live';
    $('set-sky').onchange = (e) => { s.sky = e.target.value; KT.Sky.setMode(s.sky); saveSettings(); };
    $('weather-chip').onclick = () => KT.UI.toast(KT.Sky.describe(), 'info');
    KT.Input.mouseLook = s.mouseLook !== false;
    // Esc freed the cursor while playing: open the pause menu
    KT.Input.onUnlock = () => { if (Game.state === 'playing') Game.setState('paused'); updateMouseHint(); };
    document.addEventListener('pointerlockchange', updateMouseHint);
    $('mouse-hint').onclick = () => KT.Input.lockPointer();
    const saveSettings = () => store(SETTINGS_KEY, s);
    $('set-music').oninput = (e) => { s.music = +e.target.value; KT.Audio.setVolumes(s.music, s.sfx); saveSettings(); };
    $('set-sfx').oninput = (e) => { s.sfx = +e.target.value; KT.Audio.setVolumes(s.music, s.sfx); saveSettings(); };
    $('set-sens').oninput = (e) => { s.sensitivity = +e.target.value; KT.Input.sensitivity = s.sensitivity; saveSettings(); };
    $('set-invert').onchange = (e) => { s.invertY = e.target.checked; KT.Input.invertY = s.invertY; saveSettings(); };
    $('set-lock').onchange = (e) => { s.mouseLook = e.target.checked; KT.Input.mouseLook = s.mouseLook; saveSettings(); };
    $('set-quality').onchange = (e) => {
      s.quality = e.target.value; saveSettings();
      $('quality-note').classList.remove('hidden');
    };
    // pause on tab hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Game.state === 'playing') Game.setState('paused');
      if (document.hidden) { Game.save(); KT.Net.flushProgress(true); }
    });
    window.addEventListener('beforeunload', () => { Game.save(); KT.Net.flushProgress(true); });
  }

  window.addEventListener('load', () => {
    Game.boot().catch((e) => {
      console.error(e);
      $('load-text').textContent = 'Something went wrong while loading: ' + e.message;
    });
  });
})();
