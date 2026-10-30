// Destinations: tourist sights that stand on their own roads, away from the
// district towns (Thiruvananthapuram first). Their places come from
// KT.Highway.sightList(); here they get level ground, lakes, info boards
// and their models, built when the player comes near.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part, Models = KT.Models;
  const D = KT.Dest = { items: [] };
  const HP = Math.PI / 2;

  // ---------------------------------------------------------- planning
  // Called once when the highway is built, before any terrain: flat pads
  // for the buildings and lakes for the water sights.
  D.prepare = function () {
    const Hw = KT.Highway;
    D.items = Hw.sightList().filter((sg) => sg.dest).map((sg) => {
      const R = sg.road, end = sg.def.place.stop === 'end';
      const f = R.frame(sg.s), side = sg.lat < 0 ? -1 : 1;
      // models face the road (or, at a road end, the way the visitor comes)
      const rot = end ? f.heading + Math.PI : f.heading + (side < 0 ? -HP : HP);
      // away from the road, in the world
      const out = end ? { x: f.fx, z: f.fz } : { x: f.rx * side, z: f.rz * side };
      return { sg, R, f, end, side, rot, out, y: R.y(Math.min(sg.s, R.len)) - 0.12, built: false, group: null, flows: [], anim: [] };
    });
    const pads = [], lakes = [];
    D.items.forEach((it) => {
      const sg = it.sg, k = sg.kind;
      if (k === 'mermaidBeach') return; // the beach itself
      if (k === 'lakeVillage') {
        it.lake = { x: sg.x + it.out.x * 14, z: sg.z + it.out.z * 14, r: 32, y: it.y - 1.3 };
        pads.push({ x: sg.x - it.out.x * 28, z: sg.z - it.out.z * 28, r: 16, y: it.y });
      } else if (k === 'islandTemple') {
        it.lake = { x: sg.x, z: sg.z, r: 46, y: it.y - 1.3, island: { x: sg.x + it.out.x * 6, z: sg.z + it.out.z * 6, r: 15 } };
      } else if (k === 'reservoir') {
        it.lake = { x: sg.x + it.out.x * 46, z: sg.z + it.out.z * 46, r: 34, y: it.y - 0.8 };
        pads.push({ x: sg.x, z: sg.z, r: 18, y: it.y });
      } else if (k === 'waterfall') {
        pads.push({ x: sg.x - it.out.x * 10, z: sg.z - it.out.z * 10, r: 14, y: it.y });
      } else {
        pads.push({ x: sg.x, z: sg.z, r: sg.r, y: it.y + (k === 'hillPalace' ? 2.2 : 0) });
      }
      if (it.lake) lakes.push(it.lake);
    });
    pads.forEach((p) => Hw.PADS.push(p));
    lakes.forEach((l) => Hw.LAKES.push(l));
  };

  // ---------------------------------------------------------- building
  function place(it, obj, dx, dz, rot, opts) {
    // dx along the road (towards rising s), dz away from it
    const Hw = KT.Highway, f = it.f;
    const ax = it.end ? -f.rx : f.fx, az = it.end ? -f.rz : f.fz;
    const x = it.sg.x + ax * dx + it.out.x * dz, z = it.sg.z + az * dx + it.out.z * dz;
    const r = it.rot + (rot || 0);
    obj.position.set(x, opts && opts.y !== undefined ? opts.y : Hw.groundY(x, z).y, z);
    obj.rotation.y = r;
    it.group.add(obj);
    if (!(opts && opts.colliders === false)) {
      (obj.userData.colliders || []).forEach((c) => {
        const cs = Math.cos(r), sn = Math.sin(r);
        const wx = x + c.x * cs + c.z * sn, wz = z - c.x * sn + c.z * cs;
        if (c.type === 'circle') Hw.addCollider({ type: 'circle', x: wx, z: wz, r: c.r });
        else Hw.addCollider({ type: 'box', x: wx, z: wz, hw: c.hw, hd: c.hd, rot: r });
      });
    }
    return obj;
  }
  const mat = (name, color, rough) => KT.mat(name, { color, roughness: rough === undefined ? 0.8 : rough });
  function waterOf(it, lake) {
    const m = new T.Mesh(new T.CircleGeometry(lake.r + 6, 48), KT.Highway.waterMaterial());
    m.rotation.x = -HP;
    m.position.set(lake.x, lake.y, lake.z);
    it.group.add(m);
    return m;
  }
  function infoBoard(it) {
    const Hw = KT.Highway, sg = it.sg, R = it.R;
    const s = it.end ? R.len - 12 : sg.s - 14, lat = it.end ? -8.5 : it.side * 8.5;
    const q = R.at(s, lat), f = R.frame(s);
    const board = Models.signboard([sg.name.length > 22 ? sg.name.split(' ').slice(0, 3).join(' ') : sg.name, sg.district.name]);
    board.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
    board.rotation.y = f.heading + (lat < 0 ? -HP : HP);
    it.group.add(board);
    Hw.interactables.push({ label: 'About ' + sg.name, radius: 3, pos: () => board.position, action: () => KT.Game.readSight(sg) });
    Hw.addCollider({ type: 'circle', x: q.x, z: q.z, r: 0.5 });
  }

  // a few custom models -------------------------------------------------
  function secretariat() {
    const g = new T.Group();
    const white = mat('secWhite', 0xf2eee3, 0.7), grey = mat('secGrey', 0x8d8a83), dark = mat('secWin', 0x2f3a44, 0.4);
    part(g, G.box(54, 10, 12), white, 0, 5, 0);
    part(g, G.box(55, 0.8, 13), grey, 0, 10.4, 0);
    for (let x = -25; x <= 25; x += 2.6) {
      if (Math.abs(x) < 7.5) continue;
      part(g, G.cyl(0.38, 0.42, 8.6, 10), white, x, 4.9, 6.6);
      part(g, G.box(1.1, 2.6, 0.1), dark, x + 1.3, 6.3, 6.02);
      part(g, G.box(1.1, 2.6, 0.1), dark, x + 1.3, 2.4, 6.02);
    }
    // the central portico, pediment and dome
    part(g, G.box(15, 12.5, 7), white, 0, 6.25, 6.5);
    for (let x = -6; x <= 6; x += 2.4) part(g, G.cyl(0.55, 0.6, 10.5, 12), white, x, 5.25, 10.2);
    const ped = part(g, G.cyl(0.01, 8.2, 3.2, 3), white, 0, 14.1, 10.1, 0, 0, 0);
    ped.rotation.set(-HP, 0, 0); ped.scale.set(1, 0.18, 1);
    part(g, G.box(16, 0.7, 7.6), grey, 0, 12.6, 6.6);
    part(g, G.cyl(4.6, 4.8, 3.2, 24), white, 0, 12.8, 0);
    const dome = part(g, new T.SphereGeometry(4.6, 24, 12, 0, Math.PI * 2, 0, HP), mat('secDome', 0xd9d4c7, 0.6), 0, 14.4, 0);
    void dome;
    part(g, G.cyl(0.25, 0.25, 2.2, 8), grey, 0, 19.8, 0);
    part(g, G.box(3, 4.2, 0.12), dark, 0, 2.1, 10.05);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 27, hd: 6.2 }, { type: 'box', x: 0, z: 7.5, hw: 7.6, hd: 3.4 }];
    return g;
  }
  function fortGate() {
    const g = new T.Group();
    const lat = mat('lateriteWall', 0xb0623e, 0.95), roof = mat('fortRoof', 0x8e3b24, 0.7), dark = mat('gateDark', 0x2a1d16, 0.9);
    [-6.5, 6.5].forEach((x) => part(g, G.box(5.5, 9, 6.5), lat, x, 4.5, 0));
    part(g, G.box(8, 3.2, 6.5), lat, 0, 7.4, 0);
    part(g, G.box(7.6, 5.8, 0.4), dark, 0, 2.9, 3.0);
    [-1, 1].forEach((sd) => part(g, G.box(16, 6.5, 2.4), lat, sd * 17.2, 3.25, -0.5));
    // Kerala-style tiled roof over the gateway
    const r1 = part(g, G.box(11, 0.4, 5.2), roof, 0, 10.6, 1.7); r1.rotation.x = -0.55;
    const r2 = part(g, G.box(11, 0.4, 5.2), roof, 0, 10.6, -1.7); r2.rotation.x = 0.55;
    part(g, G.box(10, 0.9, 0.9), roof, 0, 11.9, 0);
    for (let x = -24; x <= 24; x += 3) if (Math.abs(x) > 10) part(g, G.box(1.2, 1, 2.4), lat, x, 7, -0.5);
    g.userData.colliders = [{ type: 'box', x: -6.5, z: 0, hw: 2.8, hd: 3.3 }, { type: 'box', x: 6.5, z: 0, hw: 2.8, hd: 3.3 },
      { type: 'box', x: -17.2, z: -0.5, hw: 8, hd: 1.2 }, { type: 'box', x: 17.2, z: -0.5, hw: 8, hd: 1.2 }];
    return g;
  }
  function clockFace() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#f7f1df'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
    x.lineWidth = 10; x.strokeStyle = '#3b2a1a'; x.stroke();
    x.fillStyle = '#3b2a1a'; x.font = 'bold 30px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => {
      const a = (i / 12) * Math.PI * 2;
      x.fillText(t, 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
    });
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }
  function meshanFace() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#d9a36b'; x.beginPath(); x.arc(64, 60, 50, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2b1c12';
    x.beginPath(); x.arc(44, 48, 6, 0, Math.PI * 2); x.arc(84, 48, 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#4a3322'; x.beginPath(); x.moveTo(24, 70); x.quadraticCurveTo(64, 128, 104, 70); x.quadraticCurveTo(64, 92, 24, 70); x.fill();
    x.fillRect(40, 30, 16, 5); x.fillRect(72, 30, 16, 5);
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }
  function clockTower(it) {
    const g = new T.Group();
    const cream = mat('clockCream', 0xefe3c8, 0.8), roof = mat('fortRoof', 0x8e3b24, 0.7), brass = KT.mat('brass', { color: 0x6b4a1f, roughness: 0.4, metalness: 0.5 });
    part(g, G.box(5, 12, 5), cream, 0, 6, 0);
    part(g, G.box(5.6, 0.5, 5.6), roof, 0, 12.2, 0);
    part(g, G.box(4.6, 4.4, 4.6), cream, 0, 14.6, 0);
    const pyr = part(g, G.cone(4.2, 3.6, 4), roof, 0, 18.6, 0); pyr.rotation.y = Math.PI / 4;
    part(g, G.cyl(0.12, 0.12, 1.4, 6), brass, 0, 21, 0);
    const faceM = new T.MeshStandardMaterial({ map: clockFace(), roughness: 0.6 });
    const hands = [];
    for (let k = 0; k < 4; k++) {
      const a = k * HP, sx = Math.sin(a), cz = Math.cos(a);
      const face = new T.Mesh(new T.CircleGeometry(1.7, 32), faceM);
      face.position.set(sx * 2.33, 14.6, cz * 2.33); face.rotation.y = a;
      g.add(face);
      const hub = new T.Group(); hub.position.set(sx * 2.4, 14.6, cz * 2.4); hub.rotation.y = a; g.add(hub);
      const hr = new T.Group(), mn = new T.Group();
      part(hr, G.box(0.16, 0.9, 0.05), brass, 0, 0.45, 0); part(mn, G.box(0.1, 1.35, 0.05), brass, 0, 0.67, 0.03);
      hub.add(hr); hub.add(mn);
      hands.push({ hr, mn });
    }
    // Meshan: a bearded face under the clock, with two rams to butt his cheeks
    const fm = new T.MeshStandardMaterial({ map: meshanFace(), roughness: 0.7 });
    const face = new T.Mesh(new T.CircleGeometry(1.15, 24), fm);
    face.position.set(0, 10.2, 2.52); g.add(face);
    const jaw = new T.Group(); jaw.position.set(0, 9.45, 2.56); g.add(jaw);
    part(jaw, G.box(1.2, 0.3, 0.08), mat('meshanJaw', 0x4a3322), 0, -0.15, 0);
    const rams = [-1, 1].map((sd) => {
      const r = new T.Group(); r.position.set(sd * 1.85, 10.1, 2.7); g.add(r);
      const wool = mat('ramWool', 0xf1ece0, 0.95);
      part(r, G.box(0.9, 0.55, 0.5), wool, 0, 0, 0);
      part(r, G.box(0.35, 0.35, 0.4), wool, -sd * 0.55, 0.12, 0);
      part(r, G.cyl(0.12, 0.05, 0.4, 6), brass, -sd * 0.6, 0.35, 0.14, HP);
      return { r, sd };
    });
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 2.6, hd: 2.6 }];
    it.anim.push((t) => {
      // the hands show the real time; on the hour-minute Meshan's mouth moves
      const now = new Date(), h = now.getHours() % 12, m = now.getMinutes() + now.getSeconds() / 60;
      hands.forEach((hd) => { hd.hr.rotation.z = -((h + m / 60) / 12) * Math.PI * 2; hd.mn.rotation.z = -(m / 60) * Math.PI * 2; });
      const strike = now.getSeconds() < 12 ? Math.abs(Math.sin(t * 6)) : 0;
      jaw.position.y = 9.45 - strike * 0.25;
      rams.forEach(({ r, sd }) => { r.position.x = sd * (1.85 - strike * 0.45); });
    });
    return g;
  }
  function mermaid() {
    // the Jalakanyaka: a huge reclining mermaid in pale concrete
    const g = new T.Group();
    const c = mat('mermaidConcrete', 0xbdb6a8, 0.95);
    const ell = (rx, ry, rz, x, y, z, rotZ) => { const m = part(g, new T.SphereGeometry(1, 20, 14), c, x, y, z); m.scale.set(rx, ry, rz); if (rotZ) m.rotation.z = rotZ; return m; };
    ell(4.2, 1.6, 2.4, 0, 1.4, 0);           // body
    ell(2.6, 1.3, 2.0, -3.8, 2.2, 0.2, 0.5);  // chest, raised
    ell(1.2, 1.35, 1.2, -6.2, 4.0, 0.3);      // head
    ell(1.6, 0.6, 2.2, -7.2, 4.6, -0.6, 0.4); // flowing hair
    ell(3.4, 1.0, 1.4, 4.8, 0.9, 0.4, -0.15); // tail
    ell(1.8, 0.35, 1.5, 8.6, 0.6, 0.6, 0.3);  // tail fin
    ell(2.4, 0.5, 0.6, -2.4, 1.0, 2.2, -0.4); // arm
    part(g, G.box(20, 0.5, 8), mat('mermaidBase', 0x9c9488, 0.95), 0, 0.2, 0);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 10, hd: 3.8 }];
    return g;
  }
  function zoo(it) {
    const g = new T.Group();
    // two paddocks with wooden fences
    const pens = [[-12, 14], [12, 14]];
    pens.forEach(([cx, cz]) => {
      [[0, -8, 20, 0], [0, 8, 20, 0], [-10, 0, 16, HP], [10, 0, 16, HP]].forEach(([x, z, len, r]) => {
        const f = Models.woodenFence(len);
        f.position.set(cx + x, 0, cz + z); f.rotation.y = r;
        g.add(f);
      });
    });
    g.userData.colliders = [];
    pens.forEach(([cx, cz]) => g.userData.colliders.push({ type: 'box', x: cx, z: cz - 8, hw: 10, hd: 0.3 }, { type: 'box', x: cx, z: cz + 8, hw: 10, hd: 0.3 }, { type: 'box', x: cx - 10, z: cz, hw: 0.3, hd: 8 }, { type: 'box', x: cx + 10, z: cz, hw: 0.3, hd: 8 }));
    return g;
  }

  const BUILD = {
    gopuramTemple(it) {
      place(it, Models.gopuram(), 0, 10);
      // the Padmatheertham tank in front
      const stone = mat('tankStone', 0x9a8f80, 0.9);
      const y = it.y + 0.1;
      const tank = new T.Group();
      part(tank, G.box(18, 0.5, 11), stone, 0, 0.05, 0);
      const w = new T.Mesh(G.box(16, 0.1, 9), KT.Highway.waterMaterial());
      w.position.y = 0.32; tank.add(w);
      [[-1, 0], [1, 0]].forEach(([sd]) => part(tank, G.box(0.6, 0.9, 11), stone, sd * 9, 0.45, 0));
      [-1, 1].forEach((sd) => part(tank, G.box(18, 0.9, 0.6), stone, 0, 0.45, sd * 5.5));
      tank.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 9.2, hd: 5.8 }];
      place(it, tank, -16, -12, 0, { y });
      [-8, 8].forEach((x) => place(it, Models.lampTower(5), x, -22));
    },
    palace(it) {
      place(it, Models.heritageHall(it.sg.def.colors), 0, 4);
      [-12, 12].forEach((x) => place(it, Models.lampPost(), x, -10));
    },
    hillPalace(it) {
      place(it, Models.heritageHall([0xf3ead6, 0x6a4a32, 0xa2402a]), 0, 6);
      place(it, Models.garden(), 0, -14, 0, { colliders: false });
    },
    museum(it) {
      place(it, Models.heritageHall(it.sg.def.colors), 0, 4);
      [-10, 10].forEach((x) => place(it, Models.bench(), x, -10));
    },
    fortGate(it) { place(it, fortGate(), 0, 4); },
    clockTower(it) { place(it, clockTower(it), 0, 2); },
    secretariat(it) {
      place(it, secretariat(), 0, 6);
      [-20, 20].forEach((x) => place(it, Models.lampPost(), x, -9));
    },
    zoo(it) {
      place(it, zoo(it), 0, 0);
      place(it, Models.entranceArch(['Thiruvananthapuram Zoo', 'Since 1857']), 0, -14, Math.PI, { colliders: false });
      [-16, -10, -6].forEach((x, i) => place(it, Models.deer(), x, 12 + i * 3, i));
      const el = KT.skinify(Models.elephant(false, 21));
      place(it, el, 12, 14, 0.6);
      it.anim.push((t) => el.userData.animate && el.userData.animate(t, false));
      [[-4, -6], [6, -5]].forEach(([x, z], i) => place(it, Models.peacock(), x, z, i, { colliders: false }));
      [[-20, 26], [20, 26], [0, 28]].forEach(([x, z], i) => place(it, i ? Models.mangoTree() : Models.banyanTree(), x, z, i));
    },
    mermaidBeach(it) {
      place(it, mermaid(), -10, 0, HP);
      place(it, Models.beachSet(6), 16, 6, 0, { colliders: false });
      [-26, 30].forEach((x, i) => place(it, Models.coconutPalm(40 + i), x, -16, i));
    },
    lakeVillage(it) {
      const L = it.lake, w = waterOf(it, L);
      place(it, Models.entranceArch(['Akkulam Tourist Village', 'Boating • Children’s park']), 0, -40, Math.PI, { colliders: false });
      place(it, Models.garden(), -26, -24, 0, { colliders: false });
      for (let k = 0; k < 4; k++) place(it, Models.jettySection(), 0, -16 + k * 3, HP, { y: w.position.y + 0.3, colliders: false });
      [[-10, 10], [8, 16]].forEach(([x, z], i) => place(it, Models.canoe(), x, z, i, { y: w.position.y + 0.02, colliders: false }));
      if (Models.motorBoat) place(it, Models.motorBoat(), 4, 26, 1.2, { y: w.position.y + 0.02, colliders: false });
      [-22, 24].forEach((x) => place(it, Models.bench(), x, -30));
    },
    reservoir(it) {
      place(it, Models.earthDam(), 0, 8);
      const L = it.lake;
      waterOf(it, L);
      const tm = Models.temple(); tm.scale.setScalar(0.55);
      place(it, tm, -26, -6, 0, { colliders: false });
      place(it, Models.garden(), 24, -8, 0, { colliders: false });
    },
    waterfall(it) {
      const fall = place(it, Models.waterfall(18), 0, 10);
      if (fall.userData.flow) it.flows.push(fall.userData.flow);
      const pool = { x: it.sg.x - it.out.x * 2, z: it.sg.z - it.out.z * 2, r: 9, y: it.y - 0.6 };
      waterOf(it, pool);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        place(it, Models.forestTree(k), Math.cos(a) * 24, 6 + Math.sin(a) * 18, a);
      }
    },
    hilltop(it) {
      place(it, Models.hillView(), 0, 4);
      place(it, Models.teaHill(), 22, -6, 0, { colliders: false });
      [-12, -8].forEach((x, i) => place(it, Models.deer(), x, 14 + i * 4, i));
    },
    islandTemple(it) {
      const L = it.lake, w = waterOf(it, L);
      const tm = Models.temple(); tm.scale.setScalar(0.5);
      place(it, tm, 0, 6, 0, { y: L.y + 1.3, colliders: false });
      [[-6, 2], [5, 4]].forEach(([x, z], i) => place(it, Models.coconutPalm(50 + i), x, z + 6, i, { y: L.y + 1.2, colliders: false }));
      for (let k = 0; k < 6; k++) place(it, Models.jettySection(), 0, -70 + 14 + k * 3, HP, { y: w.position.y + 0.3, colliders: false });
      [[-6, -40], [6, -36]].forEach(([x, z], i) => place(it, Models.canoe(), x, z, i, { y: w.position.y + 0.02, colliders: false }));
    }
  };

  function build(it) {
    const Hw = KT.Highway;
    it.group = new T.Group();
    Hw.scene.add(it.group);
    infoBoard(it);
    (BUILD[it.sg.kind] || BUILD.palace)(it);
    it.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    it.built = true;
  }

  // ---------------------------------------------------------- streaming
  D.stream = function (pos, budget) {
    D.items.forEach((it) => {
      const d = Math.hypot(it.sg.x - pos.x, it.sg.z - pos.z);
      if (!it.built && d < 1100 && budget > 0) { build(it); budget--; }
      if (it.group) it.group.visible = d < 1300;
    });
    return budget;
  };
  D.update = function (dt, t) {
    D.items.forEach((it) => {
      if (!it.group || !it.group.visible) return;
      it.flows.forEach((f) => { f.offset.y += dt * 0.9; });
      it.anim.forEach((fn) => fn(t));
    });
  };
})();
