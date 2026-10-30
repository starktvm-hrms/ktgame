// Inside the Alappuzha lighthouse: a small level of its own
// (KT.L interface, level code 2) with exhibits, the keeper and the spiral
// stairs, plus the lantern gallery at the top of the tower on the home map.
(function () {
  'use strict';
  const T = THREE;
  const R = 7;        // inner radius of the round room (m)
  const HGT = 6.5;    // ceiling height
  const STAIR_R = 2.25;

  const LH = KT.Lighthouse = {
    id: 'lighthouse', code: 2, built: false,
    scene: null, colliders: [], interactables: [], animTime: 0,
    bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
    noVehicles: true
  };

  const FACTS = {
    history: ['The Alappuzha lighthouse was built in 1862, in the reign of the Maharaja of Travancore. It is one of the oldest lighthouses on Kerala’s coast.',
      'For years its lamp burned coconut oil. Later came kerosene, and today the light is electric.',
      'Alappuzha grew into a busy port in the 18th century under Raja Kesavadas, the Diwan of Travancore. Ships came for coir, pepper and cardamom.'],
    lens: ['This is a Fresnel lens, invented by the French engineer Augustin-Jean Fresnel in 1822.',
      'Rings of glass prisms bend the light of a small lamp into one strong beam that can be seen far out at sea.',
      'As the lens turns, sailors see a flash at a fixed rhythm. Each lighthouse has its own rhythm, so captains know exactly which one they are looking at.'],
    works: ['How does a lighthouse work?',
      'At dusk the lamp is switched on and the lens starts to rotate. The beam sweeps the sea all night.',
      'In the old days a keeper climbed the stairs every evening to trim the wick and wind the clockwork that turned the lens. Today it is electric and automatic.'],
    beaches: ['Alappuzha beach is a long stretch of golden sand beside the town.',
      'The old pier reaches far into the sea. Ships once tied up here to load cargo bound for the world.',
      'From the gallery at the top you can see the beach, the pier, the town and the backwaters beyond.'],
    ship: ['A model of a coastal sailing ship, the kind that carried pepper, cardamom and coir from Kerala’s ports.',
      'Lighthouses along the Malabar coast kept these ships safe from the rocks at night.'],
    keeper: ['Namaskaram! I’m Abdul, the keeper. Welcome inside the Alappuzha lighthouse.',
      'The exhibits tell the story of this tower and its great lens. Walk up and press E to read them.',
      'When you’re ready, take the spiral stairs — the view from the gallery at the top is the best on the whole coast!']
  };

  // ------------------------------------------------------------ helpers
  function addCol(c) {
    if (c.type === 'box') { c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0); c.ext = Math.hypot(c.hw, c.hd); } else c.ext = c.r;
    LH.colliders.push(c);
    return c;
  }
  // a point on the wall ring at angle a (0 = the door, +z)
  const ring = (a, r) => ({ x: Math.sin(a) * r, z: Math.cos(a) * r });
  function board(title, lines, w, h) {
    const t = KT.textTexture([{ text: title, size: 54 }].concat(lines.map((l) => ({ text: l, size: 26, weight: 'normal' }))), { width: 768, height: 512, bg: '#1f3a5a', borderColor: '#c9953a', color: '#f4ecd8' });
    const m = new T.Mesh(KT.G.plane(w, h), new T.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    return m;
  }
  function interact(id, label, at, radius, action) {
    const p = new T.Vector3(at.x, 0, at.z);
    LH.interactables.push({ id, label, radius: radius || 2.2, pos: () => p, action });
  }
  function read(name, lines, key) {
    return () => {
      const G = KT.Game;
      if (G.state !== 'playing') return;
      G.setState('dialog');
      KT.Input.enabled = false;
      KT.UI.dialog(name, lines, () => {
        G.setState('playing');
        const d = G.data;
        d.lhRead = d.lhRead || [];
        if (key && d.lhRead.indexOf(key) < 0) {
          d.lhRead.push(key);
          G.addXP(10);
          if (d.lhRead.length === 5) { G.addCoins(25); KT.UI.toast('You read every exhibit in the lighthouse! +25 coins', 'star'); }
        }
      });
    };
  }

  // -------------------------------------------------------------- build
  LH.build = function () {
    if (LH.built) return;
    const M = KT.M, G = KT.G, part = KT.part;
    const scene = LH.scene = new T.Scene();
    scene.background = new T.Color(0x1a2430);
    const room = new T.Group();

    // floor: stone with a red tile border and a brass compass rose by the door
    const floorMat = new T.MeshStandardMaterial({ map: KT.tex('stone_path', 5, 5), color: 0xe9dfcf, roughness: 0.9 });
    const floor = new T.Mesh(new T.CircleGeometry(R + 0.2, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);
    const border = new T.Mesh(new T.RingGeometry(R - 0.9, R - 0.55, 48), new T.MeshStandardMaterial({ color: 0x9c2a22, roughness: 0.7 }));
    border.rotation.x = -Math.PI / 2; border.position.y = 0.01;
    room.add(border);
    const rose = KT.textTexture([{ text: 'N', size: 90 }, { text: '✦', size: 150 }, { text: 'ALAPPUZHA 1862', size: 34 }], { width: 512, height: 512, bg: '#8a6a2e', borderColor: '#c9953a', color: '#f7e7b5' });
    const roseM = new T.Mesh(new T.CircleGeometry(1.1, 32), new T.MeshStandardMaterial({ map: rose, roughness: 0.5, metalness: 0.3 }));
    roseM.rotation.x = -Math.PI / 2; roseM.rotation.z = Math.PI; roseM.position.set(0, 0.012, 4.4);
    room.add(roseM);

    // round wall: white plaster with a red dado and a red frieze
    const wallMat = new T.MeshStandardMaterial({ map: KT.tex('plaster', 6, 2), color: 0xf6f1e6, roughness: 0.95, side: T.BackSide });
    const wall = new T.Mesh(new T.CylinderGeometry(R, R, HGT, 56, 1, true), wallMat);
    wall.position.y = HGT / 2;
    room.add(wall);
    const red = new T.MeshStandardMaterial({ color: 0xa8281f, roughness: 0.8, side: T.BackSide });
    const dado = new T.Mesh(new T.CylinderGeometry(R - 0.02, R - 0.02, 1.0, 56, 1, true), red);
    dado.position.y = 0.5;
    room.add(dado);
    const frieze = new T.Mesh(new T.CylinderGeometry(R - 0.02, R - 0.02, 0.45, 56, 1, true), red);
    frieze.position.y = HGT - 0.4;
    room.add(frieze);
    // wooden ceiling with the stair opening
    const ceil = new T.Mesh(new T.RingGeometry(STAIR_R + 0.1, R + 0.1, 48, 1), new T.MeshStandardMaterial({ map: KT.tex('wood', 4, 4), color: 0x9a7350, roughness: 0.85, side: T.DoubleSide }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = HGT;
    room.add(ceil);
    for (let i = 0; i < 12; i++) { // beams
      const a = (i / 12) * Math.PI * 2;
      const b = part(room, G.box(0.18, 0.22, R - STAIR_R), M.woodDark, Math.sin(a) * (R + STAIR_R) / 2, HGT - 0.12, Math.cos(a) * (R + STAIR_R) / 2, 0, a, 0);
      b.castShadow = false;
    }
    // light shaft from the stairwell above
    const shaft = new T.Mesh(new T.CylinderGeometry(STAIR_R, STAIR_R, 2.5, 32, 1, true), new T.MeshBasicMaterial({ color: 0x0d1218, side: T.BackSide }));
    shaft.position.y = HGT + 1.25;
    room.add(shaft);

    // windows: deep arched openings with sky light
    LH.windowMat = new T.MeshBasicMaterial({ color: 0xbfe3ff });
    [0.45, -0.45, 0.88, -0.88].forEach((k) => {
      const a = Math.PI * k;
      const p = ring(a, R - 0.04);
      const win = new T.Mesh(KT.G.plane(0.9, 1.5), LH.windowMat);
      win.position.set(p.x, 3.9, p.z); win.rotation.y = a + Math.PI;
      room.add(win);
      const top = new T.Mesh(new T.CircleGeometry(0.45, 16, 0, Math.PI), LH.windowMat);
      top.position.set(p.x, 4.65, p.z); top.rotation.y = a + Math.PI;
      room.add(top);
      const fp = ring(a, R - 0.1);
      part(room, G.box(1.1, 0.12, 0.25), M.woodDark, fp.x, 3.12, fp.z, 0, a, 0);
      part(room, G.box(0.06, 1.5, 0.06), M.woodDark, fp.x, 3.9, fp.z, 0, a, 0);
    });

    // the door (way out)
    const dp = ring(0, R - 0.06);
    const door = new T.Mesh(KT.G.plane(1.5, 2.5), new T.MeshStandardMaterial({ map: KT.tex('wood', 1, 2), color: 0x7a4a2a, roughness: 0.8 }));
    door.position.set(dp.x, 1.25, dp.z); door.rotation.y = Math.PI;
    room.add(door);
    part(room, G.box(1.8, 0.2, 0.2), M.woodDark, dp.x, 2.6, dp.z - 0.05);
    part(room, G.sph(0.06, 8, 6), M.brass, 0.5, 1.2, dp.z - 0.06);
    const exitSign = board('EXIT • Alappuzha Beach', [], 1.6, 0.4);
    exitSign.position.set(0, 3.0, dp.z - 0.05); exitSign.rotation.y = Math.PI;
    room.add(exitSign);
    interact('lh-exit', 'Go outside to Alappuzha beach', { x: 0, z: R - 1.0 }, 2.0, () => KT.Game.leaveLighthouse());

    // central spiral staircase
    part(room, G.cyl(0.3, 0.32, HGT + 0.6, 16), M.white, 0, (HGT + 0.6) / 2, 0);
    const steps = 26, a0 = 0, da = 0.42, rise = HGT / steps;
    const rail = [];
    for (let i = 0; i < steps; i++) {
      const a = a0 - i * da;
      const s = part(room, G.box(0.62, 0.1, 1.95), i % 2 ? M.woodDark : M.wood, Math.sin(a) * 1.25, rise * (i + 1) - 0.05, Math.cos(a) * 1.25, 0, a, 0);
      s.castShadow = true;
      const pr = ring(a, 2.15);
      part(room, G.box(0.04, 0.9, 0.04), M.darkGrey, pr.x, rise * (i + 1) + 0.45, pr.z);
      rail.push(new T.Vector3(pr.x, rise * (i + 1) + 0.92, pr.z));
    }
    room.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rail), 120, 0.035, 6, false), M.brass));
    addCol({ type: 'circle', x: 0, z: 0, r: STAIR_R });
    interact('lh-up', 'Climb the spiral stairs to the gallery', { x: 0, z: 2.75 }, 1.9, () => KT.Game.climbLighthouse());

    // Fresnel lens on a pedestal (back of the room)
    const lp = ring(Math.PI, 5.0);
    part(room, G.cyl(0.75, 0.85, 1.0, 20), M.stoneGrey, lp.x, 0.5, lp.z);
    part(room, G.cyl(0.95, 0.95, 0.08, 24), M.brass, lp.x, 1.04, lp.z);
    const lens = LH.lens = new T.Group();
    lens.position.set(lp.x, 1.95, lp.z);
    const lensGlass = new T.MeshStandardMaterial({ color: 0xcfe9f2, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45, emissive: 0x7fb6c8, emissiveIntensity: 0.25 });
    for (let i = 0; i < 7; i++) {
      const y = -0.75 + i * 0.25, r = 0.62 - Math.abs(i - 3) * 0.06;
      part(lens, G.torus(r, 0.07, 6, 28), lensGlass, 0, y, 0, Math.PI / 2);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(lens, G.box(0.04, 1.75, 0.04), M.brass, Math.cos(a) * 0.68, 0, Math.sin(a) * 0.68);
    }
    part(lens, G.sph(0.22, 14, 10), M.lampGlow, 0, 0, 0);
    scene.add(lens); // animated: not baked
    const lensLight = new T.PointLight(0xffd890, 1.3, 7, 2);
    lensLight.position.set(lp.x, 2.0, lp.z);
    scene.add(lensLight);
    addCol({ type: 'circle', x: lp.x, z: lp.z, r: 0.95 });
    interact('lh-lens', 'Look at the Fresnel lens', ring(Math.PI, 3.6), 1.8, read('The Fresnel lens', FACTS.lens, 'lens'));

    // information boards on the wall
    [[0.7, 'Alappuzha Lighthouse', ['Built in 1862', 'Once lit with coconut oil', 'Guarding the Alappuzha coast'], 'history', FACTS.history],
     [-0.7, 'How it works', ['A lamp + a rotating lens', '= a sweeping beam of light', 'Every tower flashes its own rhythm'], 'works', FACTS.works],
     [0.22, 'Alappuzha Beach', ['Golden sand • the old pier', 'Ships, coir and spices', 'Climb up for the view!'], 'beaches', FACTS.beaches]].forEach(([k, title, lines, key, facts]) => {
      const a = Math.PI * k;
      const p = ring(a, R - 0.17);
      const b = board(title, lines, 2.1, 1.4);
      b.position.set(p.x, 2.0, p.z); b.rotation.y = a + Math.PI;
      room.add(b);
      const f = ring(a, R - 0.1);
      part(room, G.box(2.3, 1.6, 0.06), M.brass, f.x, 2.0, f.z, 0, a, 0).castShadow = false;
      interact('lh-' + key, 'Read: ' + title, ring(a, R - 1.5), 1.8, read(title, facts, key));
    });

    // keeper's desk with the log book and an oil lamp
    const da0 = Math.PI * 0.42, dk = ring(da0, 5.7);
    const desk = new T.Group();
    part(desk, G.box(1.7, 0.08, 0.8), M.wood, 0, 0.82, 0);
    [[-0.78, -0.33], [0.78, -0.33], [-0.78, 0.33], [0.78, 0.33]].forEach(([x, z]) => part(desk, G.box(0.08, 0.8, 0.08), M.woodDark, x, 0.4, z));
    part(desk, G.box(0.5, 0.06, 0.36), M.maroon, -0.3, 0.89, 0.05);
    part(desk, G.box(0.46, 0.02, 0.32), M.white, -0.3, 0.925, 0.05);
    part(desk, G.cyl(0.08, 0.1, 0.06, 10), M.brass, 0.5, 0.89, -0.1);
    part(desk, G.sph(0.09, 10, 8), M.lampGlow, 0.5, 1.0, -0.1);
    part(desk, G.cyl(0.07, 0.09, 0.22, 10, 1, true), M.glass, 0.5, 1.02, -0.1);
    desk.position.set(dk.x, 0, dk.z); desk.rotation.y = da0;
    room.add(desk);
    const deskLight = new T.PointLight(0xffb85c, 0.9, 5, 2);
    deskLight.position.set(dk.x, 1.4, dk.z);
    scene.add(deskLight);
    addCol({ type: 'box', x: dk.x, z: dk.z, hw: 0.9, hd: 0.45, rot: da0 });

    // ship's bell, anchor and a model ship in a glass case
    const bl = ring(-Math.PI * 0.42, 6.0);
    const bell = new T.Group();
    part(bell, G.box(0.1, 2.0, 0.1), M.woodDark, -0.45, 1.0, 0);
    part(bell, G.box(0.1, 2.0, 0.1), M.woodDark, 0.45, 1.0, 0);
    part(bell, G.box(1.0, 0.1, 0.12), M.woodDark, 0, 2.0, 0);
    part(bell, new T.CylinderGeometry(0.12, 0.3, 0.42, 16, 1, true), M.brass, 0, 1.68, 0);
    part(bell, G.sph(0.05, 6, 4), M.darkGrey, 0, 1.45, 0);
    bell.position.set(bl.x, 0, bl.z); bell.rotation.y = -Math.PI * 0.42;
    scene.add(bell); // animated: not baked
    const anc = new T.Group();
    part(anc, G.box(0.08, 1.1, 0.08), M.darkGrey, 0, 0.75, 0);
    part(anc, G.torus(0.13, 0.03, 6, 14), M.darkGrey, 0, 1.38, 0);
    part(anc, G.torus(0.42, 0.05, 6, 20, Math.PI), M.darkGrey, 0, 0.62, 0, 0, 0, Math.PI);
    part(anc, G.box(0.6, 0.06, 0.06), M.darkGrey, 0, 1.1, 0);
    const an = ring(-Math.PI * 0.32, 6.3);
    anc.position.set(an.x, -0.2, an.z); anc.rotation.y = -Math.PI * 0.32 + Math.PI;
    room.add(anc);
    addCol({ type: 'circle', x: bl.x, z: bl.z, r: 0.6 });
    interact('lh-bell', 'Ring the ship’s bell', ring(-Math.PI * 0.42, 4.6), 1.8, () => { KT.Audio.play('bell'); LH.bellT = 1.2; });
    LH.bell = bell;
    const sc = ring(-Math.PI * 0.2, 5.8);
    const caseG = new T.Group();
    part(caseG, G.box(1.2, 0.9, 0.6), M.woodDark, 0, 0.45, 0);
    part(caseG, G.box(1.1, 0.7, 0.5), M.glass, 0, 1.25, 0);
    part(caseG, G.box(0.7, 0.14, 0.18), M.wood, 0, 1.0, 0);
    part(caseG, G.box(0.03, 0.5, 0.03), M.woodDark, 0, 1.3, 0);
    part(caseG, G.box(0.36, 0.3, 0.01), M.white, 0, 1.3, 0.02);
    caseG.position.set(sc.x, 0, sc.z); caseG.rotation.y = -Math.PI * 0.2;
    room.add(caseG);
    addCol({ type: 'box', x: sc.x, z: sc.z, hw: 0.65, hd: 0.35, rot: -Math.PI * 0.2 });
    interact('lh-ship', 'Look at the model ship', ring(-Math.PI * 0.2, 4.5), 1.6, read('Model ship', FACTS.ship, 'ship'));

    // the keeper
    const kp = ring(Math.PI * 0.3, 4.9);
    const keeper = LH.keeper = KT.Models.character({ gender: 'male', outfit: 'mundu', colors: { top: 0x2f4f8f }, hair: 'short', skin: 0x8d5a3b, hairColor: 0x9a9a96, beard: true, glasses: true, acc: {}, scale: 0.97, lite: true });
    keeper.position.set(kp.x, 0, kp.z);
    keeper.rotation.y = Math.atan2(-kp.x, -kp.z) + 0.6;
    scene.add(keeper);
    addCol({ type: 'circle', x: kp.x, z: kp.z, r: 0.45 });
    interact('lh-keeper', 'Talk to Abdul (Lighthouse Keeper)', kp, 2.4, () => { LH.keeperTalk = 3; read('Abdul (Lighthouse Keeper)', FACTS.keeper, null)(); });

    // wall sconces
    [0.15, -0.15, 0.57, -0.57, 1].forEach((k) => {
      const a = Math.PI * k, p = ring(a, R - 0.15);
      part(room, G.box(0.14, 0.24, 0.14), M.lampGlow, p.x, 2.9, p.z);
      part(room, G.box(0.2, 0.05, 0.2), M.brass, p.x, 2.75, p.z);
    });
    // lighting
    LH.hemi = new T.HemisphereLight(0xfff3dc, 0x6a5440, 0.85);
    scene.add(LH.hemi);
    const top = new T.PointLight(0xffe7c0, 1.1, 16, 1.5);
    top.position.set(0, HGT - 0.6, 3.5);
    scene.add(top);
    LH.sky = new T.DirectionalLight(0xdcefff, 0.35);
    LH.sky.position.set(4, 8, -2);
    scene.add(LH.sky);

    scene.add(KT.bake(room));
    LH.built = true;
  };

  // ---------------------------------------------- level interface (KT.L)
  const _ground = { y: 0, onPlatform: false };
  LH.groundY = () => _ground;
  LH.height = () => 0;
  LH.isWater = () => false;
  LH.deepWater = () => false;
  LH.nearbyColliders = () => LH.colliders;
  LH.agentColliders = () => null;
  LH.vehicleObstacles = () => [];
  LH.resolve = function (pos, r, extra) {
    const list = extra ? LH.colliders.concat(extra) : LH.colliders;
    let hit = KT.World.resolveList(pos, r, list);
    const d = Math.hypot(pos.x, pos.z), max = R - 0.3 - r;
    if (d > max) { pos.x *= max / d; pos.z *= max / d; hit = true; }
    return hit;
  };
  LH.isBlocked = (x, z, r) => LH.resolve(new T.Vector3(x, 0, z), r);
  // keep the follow camera inside the round room
  LH.clampCamera = function (desired, target) {
    const lim = R - 0.45;
    const d = Math.hypot(desired.x, desired.z);
    if (d > lim) {
      // walk back along target -> desired until we're inside the wall
      let lo = 0, hi = 1;
      for (let i = 0; i < 12; i++) {
        const m = (lo + hi) / 2;
        const x = KT.lerp(target.x, desired.x, m), z = KT.lerp(target.z, desired.z, m);
        if (Math.hypot(x, z) > lim) hi = m; else lo = m;
      }
      desired.set(KT.lerp(target.x, desired.x, lo), KT.lerp(target.y, desired.y, lo), KT.lerp(target.z, desired.z, lo));
    }
    desired.y = KT.clamp(desired.y, 0.4, HGT - 0.35);
  };

  // where the player is, shown on the home map
  LH.mapPos = function () {
    const s = KT.World.sites.lighthouse && KT.World.sites.lighthouse[0];
    return s ? new T.Vector3(s.x, 0, s.z) : new T.Vector3(118, 0, 246);
  };
  LH.spawnIn = { x: 0, z: R - 1.6, heading: Math.PI };   // just inside the door
  LH.spawnStairs = { x: 0, z: 3.1, heading: 0 };          // foot of the stairs

  // daylight through the windows (set by the sky / weather system)
  LH.setDaylight = function (k, tint) {
    if (!LH.built) return;
    const c = tint || new T.Color(0xbfe3ff);
    LH.windowMat.color.copy(c).multiplyScalar(0.25 + 0.75 * k);
    LH.sky.intensity = 0.1 + 0.3 * k;
    LH.hemi.intensity = 0.55 + 0.35 * k;
  };

  LH.update = function (dt, player) {
    LH.animTime += dt;
    KT.World.animTime = LH.animTime;
    if (LH.lens) LH.lens.rotation.y += dt * 0.5;
    if (LH.bellT > 0) {
      LH.bellT -= dt;
      LH.bell.children.forEach((c, i) => { if (i >= 3) c.rotation.z = Math.sin(LH.bellT * 18) * 0.25 * LH.bellT; });
    }
    if (LH.keeper) {
      let state = 'idle';
      if (LH.keeperTalk > 0) { LH.keeperTalk -= dt; state = 'wave'; }
      const d = Math.hypot(player.pos.x - LH.keeper.position.x, player.pos.z - LH.keeper.position.z);
      if (d < 4) LH.keeper.rotation.y = KT.angleLerp(LH.keeper.rotation.y, Math.atan2(player.pos.x - LH.keeper.position.x, player.pos.z - LH.keeper.position.z), 1 - Math.exp(-dt * 3));
      KT.Models.animateCharacter(LH.keeper, state, dt, 1);
    }
  };

  // --------------------------------------- gallery on top of the tower
  // A walkable balcony around the lantern room of the real tower on the
  // home map, with railings and the way back down.
  LH.setupGallery = function () {
    const W = KT.World;
    const s = W.sites.lighthouse && W.sites.lighthouse[0];
    if (!s) return;
    const o = s.object, base = o.position.y;
    const deck = LH.deckY = base + o.userData.deck;
    // the tower's own collider only applies below the gallery
    W.colliders.forEach((c) => { if (c.type === 'circle' && Math.hypot(c.x - s.x, c.z - s.z) < 0.5) c.maxY = base + 20; });
    W.addPlatform(s.x, s.z, 3.4, 3.4, 0, deck);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      W.addCollider({ type: 'circle', x: s.x + Math.cos(a) * 3.55, z: s.z + Math.sin(a) * 3.55, r: 0.4, minY: deck - 0.6 });
    }
    W.addCollider({ type: 'circle', x: s.x, z: s.z, r: 1.45, minY: deck - 0.6 });
    // the door at ground level (the tower is turned so it faces the beach)
    const fx = Math.sin(s.rot), fz = Math.cos(s.rot);
    LH.door = { x: s.x + fx * 2.9, z: s.z + fz * 2.9 };
    LH.outside = { x: s.x + fx * 6.3, z: s.z + fz * 6.3, heading: s.rot };
    const doorV = new T.Vector3(LH.door.x, KT.Geo.height(LH.door.x, LH.door.z), LH.door.z);
    KT.Entities.interactables.push({
      id: 'lighthouse-in', label: 'Enter the Alappuzha lighthouse', radius: 3.6,
      pos: () => doorV,
      enabled: () => KT.Player.pos.y < base + 10,
      action: () => KT.Game.enterLighthouse()
    });
    // gallery: on the sea side, facing out over the Arabian Sea
    // face along the balcony; the camera starts outside the railing
    const ox = -fx, oz = -fz, tx = -oz, tz = ox;
    LH.galleryAt = { x: s.x + ox * 2.35, z: s.z + oz * 2.35, heading: Math.atan2(tx, tz), camYaw: Math.atan2(-tx + ox * 0.9, -tz + oz * 0.9) };
    const downV = new T.Vector3(s.x - fx * 2.35, deck, s.z - fz * 2.35);
    KT.Entities.interactables.push({
      id: 'lighthouse-down', label: 'Go back down the stairs', radius: 2.2,
      pos: () => downV,
      enabled: () => KT.Player.pos.y > deck - 1,
      action: () => KT.Game.enterLighthouse({ from: 'gallery' })
    });
    // stepping off the gallery is not possible; this is the view point
    LH.onGallery = () => KT.Game.level === 'home' && KT.Player.pos.y > deck - 1.5 && Math.hypot(KT.Player.pos.x - s.x, KT.Player.pos.z - s.z) < 4;
  };
})();
