// World assembly: places buildings, vegetation, props and landmarks,
// manages colliders / walkable platforms and the scene's lighting.
(function () {
  'use strict';
  const T = THREE;
  const Geo = KT.Geo;
  const Models = KT.Models;
  const World = KT.World = {
    scene: null,
    colliders: [],
    grid: new Map(),
    cell: 16,
    platforms: [],
    interactables: [],
    updaters: [],
    landmarks: [],
    sites: {},
    animTime: 0
  };
  const SX = Geo.shoreX, PX = Geo.promenadeX;

  // ---------------------------------------------------------- colliders
  function gridKeys(minX, minZ, maxX, maxZ, fn) {
    const c = World.cell;
    for (let gx = Math.floor(minX / c); gx <= Math.floor(maxX / c); gx++) {
      for (let gz = Math.floor(minZ / c); gz <= Math.floor(maxZ / c); gz++) fn(gx + ',' + gz);
    }
  }
  World.addCollider = function (c) {
    let ext;
    if (c.type === 'circle') ext = c.r;
    else { ext = Math.hypot(c.hw, c.hd); c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0); }
    c.ext = ext;
    World.colliders.push(c);
    gridKeys(c.x - ext, c.z - ext, c.x + ext, c.z + ext, (k) => {
      if (!World.grid.has(k)) World.grid.set(k, []);
      World.grid.get(k).push(c);
    });
    return c;
  };
  World.nearbyColliders = function (x, z, r) {
    const out = [];
    const seen = new Set();
    gridKeys(x - r, z - r, x + r, z + r, (k) => {
      const list = World.grid.get(k);
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (!seen.has(c)) { seen.add(c); out.push(c); }
      }
    });
    return out;
  };
  // Push a position out of static colliders. Returns true if a hit happened.
  World.resolve = function (pos, r, extra) {
    const list = World.nearbyColliders(pos.x, pos.z, r + 1);
    if (extra) for (let i = 0; i < extra.length; i++) list.push(extra[i]);
    return World.resolveList(pos, r, list);
  };
  // Push a circle of radius r out of every collider in the list.
  World.resolveList = function (pos, r, list) {
    let hit = false;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.disabled) continue;
      if (c.maxY !== undefined && pos.y > c.maxY) continue;
      if (c.minY !== undefined && pos.y < c.minY) continue;
      if (c.type === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m) {
          hit = true;
          if (d > 1e-4) { pos.x = c.x + (dx / d) * m; pos.z = c.z + (dz / d) * m; } else pos.x += m;
        }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        const qx = KT.clamp(lx, -c.hw, c.hw), qz = KT.clamp(lz, -c.hd, c.hd);
        let ex = lx - qx, ez = lz - qz;
        const d = Math.hypot(ex, ez);
        if (d < r) {
          hit = true;
          let px, pz;
          if (d > 1e-4) { px = (ex / d) * (r - d); pz = (ez / d) * (r - d); }
          else {
            const ox = c.hw - Math.abs(lx), oz = c.hd - Math.abs(lz);
            if (ox < oz) { px = (ox + r) * Math.sign(lx || 1); pz = 0; } else { px = 0; pz = (oz + r) * Math.sign(lz || 1); }
          }
          pos.x += px * c.cos + pz * c.sin;
          pos.z += -px * c.sin + pz * c.cos;
        }
      }
    }
    return hit;
  };
  // level interface shared with the Kerala Highway (see KT.L)
  World.id = 'home';
  World.code = 0;
  World.height = (x, z) => Geo.height(x, z);
  World.bounds = Geo.BOUNDS;
  World.isWater = (x, z) => World.groundY(x, z).y < -0.3;
  World.deepWater = (x, z, gy) => gy < -0.55;
  World.agentColliders = (pos) => (KT.Entities.agentColliders ? KT.Entities.agentColliders(pos) : null);
  KT.L = World;

  World.isBlocked = function (x, z, r) {
    const p = new T.Vector3(x, 0, z);
    return World.resolve(p, r);
  };

  // Walkable platforms (jetties, decks): oriented rectangles with a top y.
  World.addPlatform = function (x, z, hw, hd, rot, top) {
    World.platforms.push({ x, z, hw, hd, cos: Math.cos(rot || 0), sin: Math.sin(rot || 0), top });
  };
  World.groundY = function (x, z, curY) {
    let y = Geo.height(x, z);
    let onPlatform = false;
    for (let i = 0; i < World.platforms.length; i++) {
      const p = World.platforms[i];
      const dx = x - p.x, dz = z - p.z;
      const lx = dx * p.cos - dz * p.sin, lz = dx * p.sin + dz * p.cos;
      if (Math.abs(lx) <= p.hw && Math.abs(lz) <= p.hd && p.top > y && (curY === undefined || p.top <= curY + 0.6)) {
        y = p.top; onPlatform = true;
      }
    }
    return { y, onPlatform };
  };

  // Transform model colliders into the world and register them.
  function registerColliders(obj, x, z, rot, pad) {
    const cols = obj.userData.colliders || [];
    const c = Math.cos(rot), s = Math.sin(rot);
    cols.forEach((col) => {
      const wx = x + col.x * c + col.z * s;
      const wz = z - col.x * s + col.z * c;
      if (col.type === 'circle') World.addCollider({ type: 'circle', x: wx, z: wz, r: col.r + (pad || 0) });
      else World.addCollider({ type: 'box', x: wx, z: wz, hw: col.hw + (pad || 0), hd: col.hd + (pad || 0), rot: rot });
    });
  }

  World.place = function (obj, x, z, rot, opts) {
    opts = opts || {};
    const y = opts.y !== undefined ? opts.y : Geo.height(x, z) + (opts.dy || 0);
    obj.position.set(x, y, z);
    obj.rotation.y = rot || 0;
    World.scene.add(obj);
    if (opts.colliders !== false) registerColliders(obj, x, z, rot || 0, opts.pad);
    return obj;
  };

  World.faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

  // ------------------------------------------------------- site planning
  // All fixed structures; flattening the ground needs them before the
  // terrain mesh is generated.
  const SITES = [];
  function site(type, x, z, rot, flatR, raise, extra) {
    const s = Object.assign({ type, x, z, rot: rot || 0, flatR, raise }, extra || {});
    SITES.push(s);
    if (flatR) Geo.addFlat(x, z, flatR, raise);
    return s;
  }
  World.SITES = SITES;
  const HP = Math.PI / 2;

  World.planSites = function () {
    // Alleppey promenade side
    site('kiosk', SX(52) - 11, 52, HP, 4);
    site('stall', SX(12) - 11, 12, HP, 3, 0, { seed: 1 });
    site('stall', SX(22) - 11, 22, HP, 3, 0, { seed: 2 });
    site('stall', SX(-6) - 11, -6, HP, 3, 0, { seed: 3 });
    site('teaCart', SX(74) - 9.5, 74, HP, 2);
    site('keralaSign', SX(58) - 8, 58, HP);
    site('keralaHouse', SX(-38) - 25, -38, HP, 9);
    site('keralaHouse', SX(-66) - 24, -66, HP, 9, 0, { cycle: true });
    site('keralaHouse', SX(96) - 25, 96, HP, 9);
    site('villageHouse', SX(124) - 24, 124, HP, 8);
    site('keralaHouse', SX(-128) - 24, -128, HP, 9);
    site('villageHouse', SX(-100) - 22, -100, HP, 8);
    // Kumarakom village around the plaza (-45, 30)
    site('villageHouse', -20, 10, 0, 8);
    site('villageHouse', -74, 14, 0, 8);
    site('keralaHouse', -76, 66, Math.PI, 9);
    site('villageHouse', -8, 80, -HP, 8);
    site('villageHouse', -104, 16, 0, 8);
    site('thatchedHut', -132, 24, 0, 4);
    site('thatchedHut', -146, 72, Math.PI, 4);
    site('modernHouse', 0, 122, -HP, 9);
    site('kathakaliStage', -22, 52, -HP, 7);
    site('well', -54, 42, 0, 3);
    site('directionSign', -40, 22, 0);
    site('church', -15, -104, 0, 15, 2.2);
    // Thrissur-style temple with festival elephants
    site('temple', -130, -120, 0, 27);
    // Munnar
    site('hillHouse', 46, -252, Math.PI, 8);
    site('watchTower', -30, -307, 0, 6);
    site('gazebo', 78, -268, 0, 5);
    site('entranceArch', -64.5, -196, -0.46, 0, 0, { lines: ['Munnar Tea Estates', 'Western Ghats'] });
    // Kovalam
    site('coastalHouse', -82, 206, 0, 8);
    site('coastalHouse', -128, 205, 0, 8);
    site('coastalHouse', 160, 207, 0, 8);
    site('thatchedHut', -22, 213, 0, 4);
    site('thatchedHut', 2, 214, 0, 4);
    site('lighthouse', 118, 246, Math.PI); // door faces the beach (north)
    // Periyar
    site('entranceArch', -168, 49, HP + 0.08, 0, 0, { lines: ['Periyar Tiger Reserve', 'Thekkady'] });
    site('watchTowerForest', -262, 104, 0.4, 5);
    // promenade arch
    site('entranceArch', PX(40), 40, 0, 0, 0, { lines: ['Alleppey Backwaters', 'Venice of the East'] });
  };

  function buildSite(s) {
    let obj;
    switch (s.type) {
      case 'kiosk': obj = Models.infoKiosk(); break;
      case 'stall': obj = Models.marketStall(s.seed); break;
      case 'teaCart': obj = Models.teaCart(); break;
      case 'keralaSign': {
        obj = new T.Group();
        const board = new T.Mesh(KT.G.box(3.2, 1.8, 0.2), [KT.M.woodDark, KT.M.woodDark, KT.M.woodDark, KT.M.woodDark,
          new T.MeshStandardMaterial({ map: KT.textTexture([{ text: 'KERALA', size: 110 }, { text: "GOD'S OWN COUNTRY", size: 38 }], { width: 640, height: 360, bg: '#6b4226' }) }), KT.M.woodDark]);
        board.position.y = 1.6;
        board.castShadow = true;
        obj.add(board);
        KT.part(obj, KT.G.box(0.2, 1.2, 0.2), KT.M.woodDark, -1.3, 0.6, 0);
        KT.part(obj, KT.G.box(0.2, 1.2, 0.2), KT.M.woodDark, 1.3, 0.6, 0);
        obj.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.6, hd: 0.2 }];
        break;
      }
      case 'keralaHouse': obj = Models.keralaHouse({ cycle: s.cycle }); break;
      case 'villageHouse': obj = Models.villageHouse(); break;
      case 'coastalHouse': obj = Models.coastalHouse(); break;
      case 'hillHouse': obj = Models.hillHouse(); break;
      case 'thatchedHut': obj = Models.thatchedHut(); break;
      case 'modernHouse': obj = Models.modernHouse(); break;
      case 'kathakaliStage': obj = Models.kathakaliStage(); break;
      case 'well': obj = Models.well(); break;
      case 'church': obj = Models.church(); break;
      case 'temple': obj = Models.temple(); break;
      case 'watchTower': case 'watchTowerForest': obj = Models.watchTower(); break;
      case 'gazebo': obj = Models.gazebo(); break;
      case 'entranceArch': obj = Models.entranceArch(s.lines); break;
      case 'lighthouse': obj = Models.lighthouse(); break;
      case 'directionSign':
        obj = Models.directionSign([
          { text: 'Temple', angle: 2.14 }, { text: 'Backwaters', angle: 0 }, { text: 'Kovalam Beach', angle: -1.37 }, { text: 'Periyar', angle: -2.97 }
        ]);
        obj.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 0.3 }];
        break;
      default: return null;
    }
    World.place(obj, s.x, s.z, s.rot);
    s.object = obj;
    if (!World.sites[s.type]) World.sites[s.type] = [];
    World.sites[s.type].push(s);
    return obj;
  }

  // ------------------------------------------------------------ promenade
  function buildPromenade() {
    const z0 = Geo.PROMENADE_Z[0], z1 = Geo.PROMENADE_Z[1];
    const n = Math.round((z1 - z0) / 2);
    const halfW = 2.7;
    const pos = [], uv = [], idx = [];
    const wallPos = [], wallUv = [], wallIdx = [];
    for (let i = 0; i <= n; i++) {
      const z = z0 + (i / n) * (z1 - z0);
      const cx = PX(z);
      const xl = cx - halfW, xr = cx + halfW;
      const y = Math.max(Geo.height(xl, z), Geo.height(cx, z), 0.9) + 0.12;
      pos.push(xl, y, z, xr, y, z);
      uv.push(0, z * 0.18, 1.35, z * 0.18);
      wallPos.push(xr, y, z, xr, -2.2, z);
      wallUv.push(z * 0.3, 1.0, z * 0.3, -0.9);
      if (i < n) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        wallIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ map: KT.tex('stone_path'), roughness: 0.9, color: 0xe8dccb });
    const mesh = new T.Mesh(geo, mat);
    mesh.receiveShadow = true;
    World.scene.add(mesh);
    const wgeo = new T.BufferGeometry();
    wgeo.setAttribute('position', new T.Float32BufferAttribute(wallPos, 3));
    wgeo.setAttribute('uv', new T.Float32BufferAttribute(wallUv, 2));
    wgeo.setIndex(wallIdx);
    wgeo.computeVertexNormals();
    const wall = new T.Mesh(wgeo, new T.MeshStandardMaterial({ map: KT.tex('laterite'), roughness: 0.95, side: T.DoubleSide, color: 0xb8a898 }));
    wall.receiveShadow = true;
    World.scene.add(wall);
    // platform so the player walks on the ribbon
    for (let z = z0; z < z1; z += 2) {
      const zc = z + 1;
      const y = Math.max(Geo.height(PX(zc) - halfW, zc), Geo.height(PX(zc), zc), 0.9) + 0.12;
      const ang = Math.atan2(PX(z + 2) - PX(z), 2);
      World.addPlatform(PX(zc), zc, halfW, 1.05, ang, y);
    }
  }
  World.promenadeY = function (z) {
    const cx = PX(z);
    return Math.max(Geo.height(cx - 2.7, z), Geo.height(cx, z), 0.9) + 0.12;
  };

  function buildPromenadeProps(inst) {
    const z0 = Geo.PROMENADE_Z[0], z1 = Geo.PROMENADE_Z[1];
    // fence along the water side
    for (let z = z0; z < z1; z += 2) {
      const zc = z + 1;
      if (Math.abs(zc) < 2.2) continue; // jetty opening
      if (zc > 146 && zc < 170) continue; // fishing nets
      const x = PX(zc) + 2.55;
      const ang = Math.atan2(PX(z + 2) - PX(z), 2);
      const rot = HP + ang;
      inst.add('fence', x, World.promenadeY(zc), zc, rot);
      World.addCollider({ type: 'box', x, z: zc, hw: 1.05, hd: 0.15, rot });
    }
    for (let z = z0 + 6; z < z1; z += 14) {
      const x = PX(z) - 2.3;
      inst.add('lampPost', x, World.promenadeY(z), z, 0);
      World.addCollider({ type: 'circle', x, z, r: 0.3 });
      if (Math.round((z - z0) / 14) % 2 === 0) {
        const bz = z + 7;
        if (Math.abs(bz - 52) < 6 || Math.abs(bz - 40) < 4) continue;
        const bx = PX(bz) - 2.1;
        inst.add('bench', bx, World.promenadeY(bz), bz, HP);
        World.addCollider({ type: 'box', x: bx, z: bz, hw: 0.95, hd: 0.3, rot: HP });
      }
    }
  }

  function buildJetties() {
    // main houseboat jetty at z = 0
    const startX = PX(0) + 2.2;
    const len = 24;
    const jetty = new T.Group();
    for (let i = 0; i < len / 4; i++) {
      const sec = Models.jettySection();
      sec.position.set(startX + 2 + i * 4, 0.5, 0);
      jetty.add(sec);
    }
    // T end
    const tEnd = Models.jettySection();
    tEnd.rotation.y = HP;
    tEnd.position.set(startX + len + 1.2, 0.5, 0);
    jetty.add(tEnd);
    World.scene.add(jetty);
    World.addPlatform(startX + len / 2, 0, len / 2 + 0.2, 1.2, 0, 1.1);
    World.addPlatform(startX + len + 1.2, 0, 1.2, 2.0, 0, 1.1);
    World.jettyEnd = new T.Vector3(startX + len + 1.2, 1.1, 0);
    World.jettyStart = new T.Vector3(startX, 1.1, 0);
    // posts with cormorants
    World.mooringPosts = [];
    [[startX + len + 2.4, -2.2], [startX + len + 2.4, 2.2], [startX + 10, -1.4], [startX + 18, 1.4]].forEach((p) => {
      const mp = Models.mooringPost();
      mp.position.set(p[0], 0.7, p[1]);
      World.scene.add(mp);
      World.mooringPosts.push(new T.Vector3(p[0], 2.2, p[1]));
    });
    // island jetty for canoe arrival
    const isl = Geo.ISLANDS[0];
    const ij = new T.Group();
    for (let i = 0; i < 3; i++) {
      const sec = Models.jettySection();
      sec.position.set(isl.x - isl.r - 8 + i * 4, 0.5, -10 + 0);
      ij.add(sec);
    }
    World.scene.add(ij);
    World.addPlatform(isl.x - isl.r - 4, -10, 6.2, 1.2, 0, 1.1);
    World.islandJetty = new T.Vector3(isl.x - isl.r - 9, 1.1, -10);
  }

  // ------------------------------------------------------- vegetation
  function okSpot(x, z, clear, minH) {
    const h = Geo.height(x, z);
    if (h < (minH === undefined ? 0.5 : minH)) return false;
    if (Geo.pathDistance(x, z).d < 3.5) return false;
    if (Geo.promenadeDistance(x, z) < 4.5) return false;
    if (World.isBlocked(x, z, clear || 1)) return false;
    if (x < Geo.BOUNDS.minX - 30 || x > Geo.BOUNDS.maxX + 30 || z < Geo.BOUNDS.minZ - 30) return false;
    return true;
  }

  function scatter(inst, key, n, area, opts) {
    opts = opts || {};
    const rng = KT.makeRng(opts.seed || key.length * 31 + n);
    let placed = 0, tries = 0;
    while (placed < n && tries < n * 20) {
      tries++;
      const x = rng.range(area[0], area[1]), z = rng.range(area[2], area[3]);
      if (opts.filter && !opts.filter(x, z)) continue;
      if (!okSpot(x, z, opts.clear, opts.minH)) continue;
      const s = (opts.scale || 1) * (0.8 + rng() * 0.45);
      inst.add(key, x, Geo.height(x, z) - 0.05, z, rng() * Math.PI * 2, s);
      if (opts.collider) World.addCollider({ type: 'circle', x, z, r: opts.collider * s });
      placed++;
    }
    return placed;
  }

  function buildVegetation(inst) {
    const rng = KT.makeRng(7);
    // promenade palm line
    for (let z = -168; z < 168; z += 8 + rng() * 4) {
      const x = PX(z) - 6.5 - rng() * 3;
      if (World.isBlocked(x, z, 1.2)) continue;
      inst.add('coconutPalm' + (Math.floor(rng() * 3)), x, Geo.height(x, z) - 0.1, z, rng() * 6.28 + (rng() < 0.5 ? 0 : Math.PI), 0.9 + rng() * 0.35);
      World.addCollider({ type: 'circle', x, z, r: 0.4 });
    }
    const palm = (n, area, seed, filter) => {
      for (let v = 0; v < 3; v++) scatter(inst, 'coconutPalm' + v, Math.ceil(n / 3), area, { seed: seed + v, collider: 0.45, clear: 2.2, scale: 1.05, filter });
    };
    palm(170, [-125, 10, -80, 195], 11);
    palm(60, [-180, 200, 196, 232], 12, (x, z) => Math.hypot(x - 118, z - 246) > 14);
    palm(70, [336, 395, -200, 200], 13, null);
    palm(30, [-30, 330, 174, 196], 14);
    palm(45, [-200, 20, -180, -80], 15);
    palm(20, [145, 205, -40, 20], 16, (x, z) => Math.hypot(x - 175, z + 10) < 28);
    palm(8, [236, 264, 82, 108], 17, (x, z) => Math.hypot(x - 250, z - 95) < 13);
    palm(40, [-30, 330, -200, -174], 18);
    scatter(inst, 'arecaPalm', 40, [-130, 0, -60, 190], { collider: 0.3, clear: 1.5 });
    scatter(inst, 'bananaTree', 70, [-130, 5, -80, 195], { collider: 0.4, clear: 1.6 });
    scatter(inst, 'mangoTree', 26, [-125, -10, -80, 190], { collider: 0.7, clear: 3.5 });
    scatter(inst, 'jackfruitTree', 22, [-125, -10, -80, 190], { collider: 0.6, clear: 3 });
    scatter(inst, 'floweringBush0', 45, [-120, 15, -100, 200], { collider: 0.6, clear: 1.2 });
    scatter(inst, 'floweringBush1', 35, [-120, 15, -100, 200], { collider: 0.6, clear: 1.2 });
    scatter(inst, 'floweringBush2', 25, [-200, 200, 180, 215], { collider: 0.6, clear: 1.2 });
    // forest (Periyar)
    scatter(inst, 'forestTree0', 120, [-360, -165, -200, 160], { collider: 0.5, clear: 3.5 });
    scatter(inst, 'forestTree1', 100, [-360, -165, -200, 160], { collider: 0.5, clear: 3.5, scale: 1.2 });
    scatter(inst, 'banyanTree', 5, [-300, -190, -40, 120], { collider: 1.4, clear: 8 });
    scatter(inst, 'mangrove', 30, [328, 345, -165, 165], { collider: 0.5, clear: 2, minH: -0.6 });
    // tea estate rows on the hills
    for (let z = -205; z > -350; z -= 3.3) {
      for (let x = -175; x < 150; x += 2.4) {
        const wx = x + Math.sin(z * 0.3) * 0.8, wz = z + Math.sin(x * 0.05) * 3;
        const h = Geo.height(wx, wz);
        if (h < 6) continue;
        if (Geo.pathDistance(wx, wz).d < 3.2) continue;
        if (World.isBlocked(wx, wz, 1.2)) continue;
        if (KT.noise(wx * 0.03, wz * 0.03) > 0.38) continue; // clearings
        inst.add('teaBush', wx, h - 0.15, wz, (x * 13.7) % 6.28, 0.9 + ((x * 7.1 + z) % 1 + 1) % 1 * 0.3);
      }
    }
    scatter(inst, 'forestTree0', 40, [-200, 160, -360, -200], { collider: 0.5, clear: 4, seed: 91 });
    // ground cover
    scatter(inst, 'grassTuft', 2200, [-200, 30, -200, 230], { clear: 0.1, seed: 5 });
    scatter(inst, 'grassTuft', 600, [-360, -160, -150, 150], { clear: 0.1, seed: 6 });
    scatter(inst, 'flowerPatch', 260, [-140, 20, -120, 200], { clear: 0.2 });
    scatter(inst, 'rock', 60, [-360, 200, -350, 230], { collider: 0.9, clear: 1.2 });
    scatter(inst, 'boulders', 22, [-360, -160, -200, 160], { collider: 1.6, clear: 2.5 });
    scatter(inst, 'boulders', 8, [100, 140, 228, 262], { collider: 1.6, clear: 2, minH: -1, filter: (x, z) => Math.hypot(x - 118, z - 246) > 7 });
    scatter(inst, 'fallenLog', 14, [-350, -170, -150, 150], { collider: 0.6, clear: 2 });
    scatter(inst, 'treeStump', 14, [-350, -170, -150, 150], { collider: 0.5, clear: 1.5 });
    // paddy field rice
    for (let x = -110; x < -64; x += 1.7) {
      for (let z = 64; z < 132; z += 1.7) {
        if (Geo.pathDistance(x, z).d < 2) continue;
        inst.add('paddyRice', x + Math.sin(z) * 0.3, Geo.height(x, z) - 0.05, z, (x * z) % 6.28, 1);
      }
    }
  }

  function defineInstances(inst) {
    for (let v = 0; v < 3; v++) inst.define('coconutPalm' + v, () => Models.coconutPalm(v * 17 + 3), { low: () => Models.coconutPalmLow(v * 17 + 3), lodDist: 140 });
    inst.define('arecaPalm', Models.arecaPalm);
    inst.define('bananaTree', Models.bananaTree);
    inst.define('mangoTree', Models.mangoTree);
    inst.define('jackfruitTree', Models.jackfruitTree);
    inst.define('banyanTree', Models.banyanTree);
    inst.define('forestTree0', () => Models.forestTree(1));
    inst.define('forestTree1', () => Models.forestTree(7));
    inst.define('teaBush', Models.teaBush, { maxDist: 170 });
    inst.define('mangrove', Models.mangrove);
    inst.define('floweringBush0', () => Models.floweringBush(KT.M.flowerRed), { maxDist: 130 });
    inst.define('floweringBush1', () => Models.floweringBush(KT.M.flowerPink), { maxDist: 130 });
    inst.define('floweringBush2', () => Models.floweringBush(KT.M.flowerYellow), { maxDist: 130 });
    inst.define('rock', () => Models.rock(3), { maxDist: 260 });
    inst.define('boulders', Models.boulders);
    inst.define('grassTuft', Models.grassTuft, { maxDist: 70 });
    inst.define('flowerPatch', Models.flowerPatch, { maxDist: 90 });
    inst.define('fallenLog', Models.fallenLog, { maxDist: 160 });
    inst.define('treeStump', Models.treeStump, { maxDist: 160 });
    inst.define('paddyRice', Models.paddyRice, { maxDist: 150 });
    inst.define('fence', () => Models.woodenFence(2.1), { maxDist: 220 });
    inst.define('lampPost', Models.lampPost);
    inst.define('bench', Models.bench, { maxDist: 160 });
  }

  // ------------------------------------------------------------ landmarks
  World.LANDMARKS = [
    { id: 'promenade', name: 'Alleppey Promenade', x: PX(56), z: 56, r: 14, icon: 'walk', desc: 'The lakeside promenade of the "Venice of the East".' },
    { id: 'jetty', name: 'Houseboat Jetty', x: PX(0) + 14, z: 0, r: 12, icon: 'boat', desc: 'Kettuvallams once carried rice and spices; today they carry travellers.' },
    { id: 'nets', name: 'Chinese Fishing Nets', x: SX(158), z: 158, r: 14, icon: 'fish', desc: 'Cheena vala - giant cantilevered nets introduced by Chinese traders.' },
    { id: 'island', name: 'Pathiramanal Island', x: 175, z: -10, r: 28, icon: 'island', desc: 'A tiny bird-watchers’ paradise in Vembanad Lake.' },
    { id: 'stage', name: 'Kathakali Stage', x: -22, z: 52, r: 14, icon: 'mask', desc: 'Classical dance-drama with elaborate make-up and costumes.' },
    { id: 'church', name: "St. Mary's Church", x: -15, z: -100, r: 16, icon: 'church', desc: 'Kerala has some of the oldest churches in India.' },
    { id: 'temple', name: 'Vadakkunnathan-style Temple', x: -130, z: -112, r: 28, icon: 'temple', desc: 'Home of the Pooram elephant festival.' },
    { id: 'paddy', name: 'Kuttanad Paddy Fields', x: -87, z: 98, r: 26, icon: 'leaf', desc: 'The "Rice Bowl of Kerala", farmed below sea level.' },
    { id: 'munnar', name: 'Munnar Viewpoint', x: -30, z: -307, r: 12, icon: 'tower', desc: 'Rolling tea gardens of the Western Ghats.' },
    { id: 'kovalam', name: 'Kovalam Lighthouse', x: 118, z: 246, r: 16, icon: 'light', desc: 'Vizhinjam lighthouse overlooking Lighthouse Beach.' },
    { id: 'periyar', name: 'Periyar Forest', x: -240, z: 40, r: 40, icon: 'tree', desc: 'Elephants, deer and peacocks roam this tiger reserve.' }
  ];

  World.zoneAt = function (x, z) {
    if (z > 192) return 'Kovalam Beach';
    if (z < -185) return 'Munnar Tea Hills';
    if (x < -165) return 'Periyar Forest';
    if (Math.hypot(x + 130, z + 118) < 40) return 'Thrissur Temple';
    if (x > SX(z) - 1 && x < 340 && Math.abs(z) < 172) return Math.hypot(x - 175, z + 10) < 34 ? 'Pathiramanal Island' : 'Vembanad Lake';
    if (x > PX(z) - 12) return 'Alleppey';
    if (x > -112 && x < -62 && z > 62 && z < 134) return 'Kuttanad';
    return 'Kumarakom Village';
  };

  // --------------------------------------------------------------- build
  const tick = () => new Promise((r) => setTimeout(r, 0));

  World.build = async function (scene, opts, progress) {
    World.scene = scene;
    const quality = opts.quality || 'medium';
    progress(0.05, 'Planning God’s Own Country...');
    World.planSites();
    Geo.prepareFlats();
    await tick();
    progress(0.1, 'Painting the land...');
    Geo.buildSplat(quality === 'low' ? 512 : 768);
    await tick();
    progress(0.3, 'Raising the Western Ghats...');
    const terrain = Geo.buildTerrain(quality);
    scene.add(terrain);
    World.terrain = terrain;
    await tick();
    progress(0.4, 'Filling the backwaters...');
    World.sunDir = new T.Vector3(-0.45, 0.62, 0.55).normalize();
    scene.add(Geo.buildWater(World.sunDir));
    World.sky = Geo.buildSky(World.sunDir);
    scene.add(World.sky);
    World.clouds = Geo.buildClouds();
    scene.add(World.clouds);
    await tick();
    progress(0.45, 'Building Kerala homes...');
    SITES.forEach(buildSite);
    buildPromenade();
    buildJetties();
    await tick();
    progress(0.55, 'Planting coconut palms...');
    const inst = new KT.Instancer();
    defineInstances(inst);
    buildPromenadeProps(inst);
    buildVegetation(inst);
    await tick();
    progress(0.7, 'Growing the forests...');
    World.inst = inst;
    World.instanced = inst.build(scene, { noShadow: { grassTuft: true, flowerPatch: true, paddyRice: true, teaBush: quality !== 'high' }, chunk: 120 });
    World.instanced.forEach((m) => {
      const n = m.name;
      if (n.indexOf('coconutPalm') === 0 || n === 'arecaPalm' || n === 'bananaTree') {
        if (m.material.map) KT.addWind(m.material, 0.035);
      }
    });
    await tick();
    progress(0.78, 'Waking the wildlife...');
    KT.Entities.build(scene, World);
    await tick();
    progress(0.92, 'Lighting the lamps...');
    World.buildLights(scene, quality);
    progress(1, 'Ready');
  };

  World.buildLights = function (scene, quality) {
    const hemi = World.hemi = new T.HemisphereLight(0xd6ecff, 0x6b7a3c, 0.75);
    scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff0d6, 2.1);
    sun.position.copy(World.sunDir).multiplyScalar(150);
    World.sun = sun;
    if (quality !== 'low') {
      sun.castShadow = true;
      const size = quality === 'high' ? 4096 : 2048;
      sun.shadow.mapSize.set(size, size);
      const cam = sun.shadow.camera;
      const ext = quality === 'high' ? 80 : 65;
      cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext;
      cam.near = 10; cam.far = 400;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.04;
    }
    scene.add(sun);
    scene.add(sun.target);
    scene.fog = new T.Fog(0xc8e0ec, 160, 1100);
  };

  // Keep the shadow frustum centred on the player.
  World.followSun = function (focus) {
    if (!World.sun) return;
    const s = World.sun;
    const snap = 4;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    s.target.position.set(fx, focus.y, fz);
    s.position.set(fx, focus.y, fz).addScaledVector(World.sunDir, 150);
  };

  World.update = function (dt, player, camera) {
    World.animTime += dt;
    KT.windUniform.value = World.animTime;
    if (Geo.waterUniforms) Geo.waterUniforms.uTime.value = World.animTime;
    World.clouds.children.forEach((c, i) => {
      c.position.x += dt * (1.5 + (i % 5) * 0.3);
      if (c.position.x > 1600) c.position.x = -1600;
    });
    World.lodTimer = (World.lodTimer || 0) - dt;
    if (World.lodTimer <= 0 && camera) { World.lodTimer = 0.25; World.inst.updateLOD(camera.position); }
    KT.Entities.update(dt, World.animTime, player, camera);
  };
})();
