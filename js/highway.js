// The Kerala Highway: a long road from Thiruvananthapuram (south) to
// Kasaragod (north) linking all 14 district centres, 3 km apart in game
// (60 km at the 1:20 map scale). Terrain, road and roadside scenery are
// generated in tiles around the player; district hubs are built when the
// player approaches.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part, Models = KT.Models;
  const Hw = KT.Highway = {
    id: 'highway', code: 1, built: false, animTime: 0,
    SPACING: 3000, START: 400,
    CROSSING: -17, // zebra crossing and signals, relative to each district centre
    colliders: [], grid: new Map(), cell: 32, interactables: [], hubs: [], npcs: [],
    tiles: new Map(), segs: new Map(), lastS: -1e9
  };
  const TILE = 160, RES = 32, SEG_LEN = 200;
  const ROAD_HALF = 5.5, MAX_LAT = 340;

  // ---------------------------------------------------------- road path
  const roadX = (s) => 380 * Math.sin(s / 2600) + 140 * Math.sin(s / 780 + 1.3);
  const roadY = (s) => 4 + 5 * Math.sin(s / 1700) + 2.5 * Math.sin(s / 530 + 2);
  Hw.roadX = roadX; Hw.roadY = roadY;
  Hw.hubS = (i) => Hw.START + i * Hw.SPACING;
  Hw.length = () => Hw.hubS(KT.DISTRICTS.length - 1) + 600;
  Hw.frame = function (s, out) {
    out = out || {};
    const dx = (roadX(s + 0.5) - roadX(s - 0.5));
    const l = Math.hypot(dx, 1);
    out.x = roadX(s); out.z = -s; out.y = roadY(s);
    out.fx = dx / l; out.fz = -1 / l;   // forward (towards the north)
    out.rx = -out.fz; out.rz = out.fx;  // right-hand side (east)
    out.heading = Math.atan2(out.fx, out.fz);
    return out;
  };
  const _fr = {};
  Hw.project = function (x, z) {
    let s = -z;
    for (let i = 0; i < 3; i++) {
      Hw.frame(s, _fr);
      s += (x - _fr.x) * _fr.fx + (z - _fr.z) * _fr.fz;
    }
    Hw.frame(s, _fr);
    return { s, lat: (x - _fr.x) * _fr.rx + (z - _fr.z) * _fr.rz };
  };
  Hw.at = function (s, lat, out) {
    const f = Hw.frame(s);
    out = out || new T.Vector3();
    return out.set(f.x + f.rx * lat, 0, f.z + f.rz * lat);
  };

  // rivers cross the road half-way between district centres
  const RIVERS = [];
  for (let i = 0; i < 13; i++) RIVERS.push({ s: Hw.START + i * Hw.SPACING + 1500 + ((i * 37) % 300) - 150 });
  RIVERS.forEach((r) => { r.y = roadY(r.s) - 5; r.cz = -r.s; });
  const riverZ = (r, x) => r.cz + 30 * Math.sin(x / 90 + r.s);

  // ------------------------------------------------------------- terrain
  Hw.height = function (x, z) {
    const p = Hw.project(x, z);
    const s = p.s, lat = p.lat;
    let h = 4 + KT.fbm(x * 0.004 + 11, z * 0.004, 4) * 10 + roadY(s) * 0.4;
    // Western Ghats rising in the east, coastal plain to the west
    h += KT.smoothstep(120, 700, lat) * (25 + 30 * Math.max(0, KT.fbm(x * 0.003, z * 0.003, 3)));
    h -= KT.smoothstep(-150, -600, lat) * 3;
    // road embankment
    const w = 1 - KT.smoothstep(8, 30, Math.abs(lat));
    h = KT.lerp(h, roadY(s) - 0.2, w);
    // flat ground around each district centre
    const hi = Math.round((s - Hw.START) / Hw.SPACING);
    if (hi >= 0 && hi < KT.DISTRICTS.length) {
      const hs = Hw.hubS(hi);
      if (Math.abs(s - hs) < 260) {
        const d = Math.hypot(s - hs, lat);
        h = KT.lerp(h, roadY(hs) - 0.2, 1 - KT.smoothstep(140, 200, d));
      }
    }
    // river valleys
    for (let i = 0; i < RIVERS.length; i++) {
      const r = RIVERS[i];
      if (Math.abs(r.s - s) > 120) continue;
      const dz = Math.abs(z - riverZ(r, x));
      const carve = 1 - KT.smoothstep(16, 50, dz);
      if (carve > 0) h = KT.lerp(h, r.y - 2.5, carve);
    }
    return h;
  };
  Hw.waterLevelAt = function (x, z) {
    const s = -z;
    for (let i = 0; i < RIVERS.length; i++) {
      const r = RIVERS[i];
      if (Math.abs(r.s - s) < 120 && Math.abs(z - riverZ(r, x)) < 40) return r.y;
    }
    return -1e9;
  };

  // ground under a point: terrain, the road deck (also over bridges) or a platform
  Hw.groundY = function (x, z, curY) {
    const p = Hw.project(x, z);
    let y = Hw.height(x, z);
    if (Math.abs(p.lat) < ROAD_HALF + 0.6) y = Math.max(y, roadY(p.s) + 0.06);
    return { y, onPlatform: false };
  };
  Hw.isWater = function (x, z) { return Hw.groundY(x, z).y < Hw.waterLevelAt(x, z) - 0.3; };

  // --------------------------------------------------------- collisions
  function cellKeys(minX, minZ, maxX, maxZ, fn) {
    const c = Hw.cell;
    for (let gx = Math.floor(minX / c); gx <= Math.floor(maxX / c); gx++) for (let gz = Math.floor(minZ / c); gz <= Math.floor(maxZ / c); gz++) fn(gx + ',' + gz);
  }
  Hw.addCollider = function (c) {
    if (c.type === 'box') { c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0); c.ext = Math.hypot(c.hw, c.hd); } else c.ext = c.r;
    cellKeys(c.x - c.ext, c.z - c.ext, c.x + c.ext, c.z + c.ext, (k) => {
      if (!Hw.grid.has(k)) Hw.grid.set(k, []);
      Hw.grid.get(k).push(c);
    });
    return c;
  };
  Hw.nearbyColliders = function (x, z, r) {
    const out = [], seen = new Set();
    cellKeys(x - r, z - r, x + r, z + r, (k) => { const l = Hw.grid.get(k); if (l) l.forEach((c) => { if (!seen.has(c)) { seen.add(c); out.push(c); } }); });
    return out;
  };
  Hw.resolve = function (pos, r, extra) {
    const list = Hw.nearbyColliders(pos.x, pos.z, r + 1);
    if (extra) extra.forEach((c) => list.push(c));
    const hit = KT.World.resolveList(pos, r, list);
    // stay within the corridor around the highway
    const p = Hw.project(pos.x, pos.z);
    if (Math.abs(p.lat) > MAX_LAT || p.s < 50 || p.s > Hw.length()) {
      const s = KT.clamp(p.s, 50, Hw.length()), lat = KT.clamp(p.lat, -MAX_LAT, MAX_LAT);
      const q = Hw.at(s, lat);
      pos.x = q.x; pos.z = q.z;
      return true;
    }
    return hit;
  };
  Hw.isBlocked = (x, z, r) => Hw.resolve(new T.Vector3(x, 0, z), r);
  Hw.bounds = { minX: -1e6, maxX: 1e6, minZ: -1e6, maxZ: 1e6 };
  Hw.agentColliders = function (pos) {
    return Hw.npcs.filter((w) => w.obj.visible && Math.abs(w.obj.position.x - pos.x) < 6 && Math.abs(w.obj.position.z - pos.z) < 6)
      .map((w) => ({ type: 'circle', x: w.obj.position.x, z: w.obj.position.z, r: 0.35 }))
      .concat(KT.Traffic.highwayColliders(pos, 10), KT.Vehicle.boxes('highway', null));
  };

  // ------------------------------------------------------------ materials
  let mats = null;
  function makeMaterials() {
    const asphalt = (function () {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = '#4b4d50'; g.fillRect(0, 0, 256, 512);
      const img = g.getImageData(0, 0, 256, 512);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 30;
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      g.putImageData(img, 0, 0);
      g.fillStyle = '#f2f2ee';
      g.fillRect(8, 0, 7, 512); g.fillRect(241, 0, 7, 512);
      g.fillRect(124, 0, 8, 300);
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.encoding = T.sRGBEncoding;
      t.anisotropy = KT.maxAnisotropy;
      return t;
    })();
    const waterN = KT.tex('water_normal', 6, 6, true);
    mats = {
      terrain: new T.MeshStandardMaterial({ vertexColors: true, map: KT.tex('grass', 1, 1), roughness: 0.95 }),
      road: new T.MeshStandardMaterial({ map: asphalt, roughness: 0.85 }),
      water: new T.MeshStandardMaterial({ color: 0x2a7f8a, roughness: 0.12, metalness: 0.1, normalMap: waterN, normalScale: new T.Vector2(0.6, 0.6), transparent: true, opacity: 0.92 }),
      concrete: KT.mat('concrete', { color: 0xc9c6bd, roughness: 0.9 }),
      kerb: KT.mat('kerbStripe', { color: 0xf2f2ee, roughness: 0.6 }),
      sand: KT.mat('hubSand', { map: KT.tex('sand', 1, 1), color: 0xffffff }, 0.15)
    };
    mats.water.userData.normal = waterN;
  }

  // ------------------------------------------------------- scatter pools
  function Pool(scene, proto, cap, shadow) {
    this.cap = cap;
    this.meshes = proto.children.filter((c) => c.isMesh).map((ch) => {
      const im = new T.InstancedMesh(ch.geometry, ch.material, cap);
      im.count = 0; im.frustumCulled = false;
      im.castShadow = shadow; im.receiveShadow = true;
      scene.add(im);
      return im;
    });
  }
  Pool.prototype.set = function (list) {
    const n = Math.min(this.cap, list.length);
    this.meshes.forEach((im) => {
      for (let i = 0; i < n; i++) im.setMatrixAt(i, list[i]);
      im.count = n;
      im.visible = n > 0;
      im.instanceMatrix.needsUpdate = true;
    });
  };
  const pools = {};
  function makePools(scene) {
    pools.palm = new Pool(scene, Models.coconutPalm(3), 700, true);
    pools.palmFar = new Pool(scene, Models.coconutPalmLow(20), 2600, false);
    pools.banana = new Pool(scene, Models.bananaTree(), 600, true);
    pools.mango = new Pool(scene, Models.mangoTree(), 200, true);
    pools.house = new Pool(scene, Models.keralaHouse({}), 80, true);
    pools.house2 = new Pool(scene, Models.villageHouse(), 80, true);
    pools.hut = new Pool(scene, Models.thatchedHut(), 80, true);
    pools.bush = new Pool(scene, Models.floweringBush(KT.M.flowerRed), 400, false);
    pools.pole = new Pool(scene, Models.electricPole(), 400, true);
    pools.stone = new Pool(scene, Models.milestone(), 120, false);
    pools.rock = new Pool(scene, Models.rock(5), 200, true);
    Models.SHOP_TYPES.forEach((t) => { pools['shop_' + t] = new Pool(scene, Models.shop(t), 40, true); });
  }

  // ------------------------------------------------- roadside shop clusters
  // A few small shops face the road every now and then between towns.
  // Deterministic per 200 m road segment, so terrain tiles can keep their
  // trees out of the way.
  const shopCache = new Map();
  function shopClusters(k) {
    if (shopCache.has(k)) return shopCache.get(k);
    const rng = KT.makeRng(k * 7919 + 13);
    const out = [];
    const s0 = k * SEG_LEN;
    for (let c = 0; c < 2; c++) {
      if (rng() > 0.42) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const n = 2 + Math.floor(rng() * 3);
      const start = s0 + 15 + rng() * (SEG_LEN - 30 - n * 4.8);
      const end = start + n * 4.8;
      const hi = Math.round((start - Hw.START) / Hw.SPACING);
      if (hi >= 0 && hi < KT.DISTRICTS.length && Math.abs(start - Hw.hubS(hi)) < 230) continue;
      if (RIVERS.some((r) => r.s > start - 90 && r.s < end + 90)) continue;
      if (Math.floor((start - 14) / 500) !== Math.floor((end + 14) / 500)) continue; // keep clear of direction signs
      if (out.some((o) => o.side === side && Math.abs(o.s - start) < 30)) continue;
      for (let i = 0; i < n; i++) out.push({ s: start + i * 4.8 + 2.4, lat: side * 11.8, side, type: Models.SHOP_TYPES[Math.floor(rng() * Models.SHOP_TYPES.length)] });
    }
    shopCache.set(k, out);
    return out;
  }
  function nearShop(s, lat) {
    const k = Math.floor(s / SEG_LEN);
    for (let kk = k - 1; kk <= k + 1; kk++) {
      if (shopClusters(kk).some((o) => Math.abs(o.s - s) < 4 && Math.abs(o.lat - lat) < 5)) return true;
    }
    return false;
  }

  // ------------------------------------------------------------- tiles
  const _c = new T.Color();
  function tileColor(x, z, h, lat, sLoc) {
    const n = KT.noise(x * 0.02, z * 0.02);
    const n2 = KT.noise(x * 0.004 + 9, z * 0.004);
    _c.setRGB(0.55 + n * 0.08, 0.78 + n * 0.08, 0.42 + n * 0.05);
    if (n2 > 0.25 && Math.abs(lat) > 40 && Math.abs(lat) < 260 && h < roadY(sLoc) + 3) _c.setRGB(0.66, 0.95, 0.42); // paddy
    if (lat > 200) _c.lerp(new T.Color(0.42, 0.62, 0.36), KT.smoothstep(200, 500, lat)); // darker ghats
    const a = Math.abs(lat);
    if (a > ROAD_HALF - 0.5 && a < 10) _c.lerp(new T.Color(0.75, 0.48, 0.32), 1 - KT.smoothstep(7.5, 10, a)); // laterite shoulder
    const wl = Hw.waterLevelAt(x, z);
    if (wl > -1e8 && h < wl + 1.5) _c.lerp(new T.Color(0.85, 0.78, 0.6), KT.smoothstep(wl + 1.5, wl, h));
    return _c;
  }

  function buildTile(tx, tz, scene) {
    const x0 = tx * TILE, z0 = tz * TILE;
    const geo = new T.PlaneGeometry(TILE, TILE, RES, RES);
    geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, U = geo.attributes.uv;
    const col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) + x0 + TILE / 2, z = P.getZ(i) + z0 + TILE / 2;
      const h = Hw.height(x, z);
      P.setXYZ(i, x, h, z);
      U.setXY(i, x / 7, z / 7);
      const pr = Hw.project(x, z);
      const c = tileColor(x, z, h, pr.lat, pr.s);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new T.Mesh(geo, mats.terrain);
    mesh.receiveShadow = true;
    scene.add(mesh);
    // deterministic roadside scenery
    const rng = KT.makeRng((tx * 73856093) ^ (tz * 19349663));
    const items = [];
    const add = (key, x, z, rot, s, collider) => {
      const y = Hw.height(x, z);
      const m = new T.Matrix4().compose(new T.Vector3(x, y - 0.05, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rot), new T.Vector3(s, s, s));
      items.push({ key, m, x, z });
      if (collider && !Hw.tileColliders.has(tx + ',' + tz)) Hw.addCollider(Object.assign({ x, z }, collider));
    };
    const free = (x, z, pad) => {
      const p = Hw.project(x, z);
      if (Math.abs(p.lat) < ROAD_HALF + pad || Math.abs(p.lat) > MAX_LAT + 120) return null;
      const hi = Math.round((p.s - Hw.START) / Hw.SPACING);
      if (hi >= 0 && hi < KT.DISTRICTS.length && Math.hypot(p.s - Hw.hubS(hi), p.lat) < 175) return null;
      if (Hw.waterLevelAt(x, z) > Hw.height(x, z) - 0.5) return null;
      if (Math.abs(p.lat) < 20 && nearShop(p.s, p.lat)) return null;
      return p;
    };
    for (let i = 0; i < 26; i++) {
      const x = x0 + rng() * TILE, z = z0 + rng() * TILE;
      const p = free(x, z, 6);
      if (!p) continue;
      const near = Math.abs(p.lat) < 60;
      if (!near && rng() < 0.45) continue;
      const r = rng();
      if (r < 0.62) add('palm', x, z, rng() * 6.28, 0.85 + rng() * 0.4, { type: 'circle', r: 0.4 });
      else if (r < 0.8) add('banana', x, z, rng() * 6.28, 0.9 + rng() * 0.3, { type: 'circle', r: 0.35 });
      else if (r < 0.88) add('mango', x, z, rng() * 6.28, 0.9 + rng() * 0.3, { type: 'circle', r: 0.7 });
      else if (r < 0.95) add('bush', x, z, rng() * 6.28, 1, null);
      else add('rock', x, z, rng() * 6.28, 0.8 + rng(), { type: 'circle', r: 0.9 });
    }
    // a few homes facing the road
    for (let i = 0; i < 2; i++) {
      if (rng() < 0.45) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const sLoc = -(z0 + rng() * TILE);
      const lat = side * (24 + rng() * 22);
      const q = Hw.at(sLoc, lat);
      if (q.x < x0 || q.x > x0 + TILE || q.z < z0 || q.z > z0 + TILE) continue;
      const p = free(q.x, q.z, 18);
      if (!p) continue;
      const f = Hw.frame(sLoc);
      const rot = Math.atan2(-f.rx * side, -f.rz * side);
      const kind = ['house', 'house2', 'hut'][Math.floor(rng() * 3)];
      const hw = kind === 'hut' ? 2.4 : kind === 'house' ? 5 : 4.3, hd = kind === 'hut' ? 2.2 : 4.6;
      const cz = kind === 'hut' ? 0 : 1.2;
      add(kind, q.x, q.z, rot, 1, { type: 'box', hw, hd, rot, x: q.x + Math.sin(rot) * cz, z: q.z + Math.cos(rot) * cz });
    }
    Hw.tileColliders.add(tx + ',' + tz);
    return { mesh, items };
  }
  Hw.tileColliders = new Set();

  // road segments (with poles, milestones, signs and bridges)
  function buildSegment(k, scene) {
    const s0 = k * SEG_LEN, s1 = s0 + SEG_LEN;
    const group = new T.Group();
    const pos = [], uv = [], idx = [];
    let n = 0;
    for (let s = s0; s <= s1 + 0.01; s += 4) {
      const f = Hw.frame(s);
      const y = roadY(s) + 0.06;
      pos.push(f.x - f.rx * ROAD_HALF, y, f.z - f.rz * ROAD_HALF, f.x + f.rx * ROAD_HALF, y, f.z + f.rz * ROAD_HALF);
      uv.push(0, s / 14, 1, s / 14);
      if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      n++;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const road = new T.Mesh(geo, mats.road);
    road.receiveShadow = true;
    group.add(road);
    const items = [];
    const matAt = (s, lat, rot) => {
      const q = Hw.at(s, lat);
      return new T.Matrix4().compose(new T.Vector3(q.x, Hw.groundY(q.x, q.z).y, q.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rot), new T.Vector3(1, 1, 1));
    };
    for (let s = Math.ceil(s0 / 40) * 40; s < s1; s += 40) {
      const f = Hw.frame(s);
      if (onBridge(s)) continue;
      items.push({ key: 'pole', m: matAt(s, ROAD_HALF + 2.2, f.heading), s });
      if (!Hw.tileColliders.has('pole' + s)) { const q = Hw.at(s, ROAD_HALF + 2.2); Hw.addCollider({ type: 'circle', x: q.x, z: q.z, r: 0.2 }); Hw.tileColliders.add('pole' + s); }
    }
    // milestones every 50 m of game road = 1 km on the map
    for (let s = Math.ceil(s0 / 50) * 50; s < s1; s += 50) {
      if (onBridge(s)) continue;
      items.push({ key: 'stone', m: matAt(s, -ROAD_HALF - 1.4, Hw.frame(s).heading + Math.PI / 2), s });
    }
    // green direction signs every 500 m (10 km)
    for (let s = Math.ceil(s0 / 500) * 500; s < s1; s += 500) {
      const next = KT.DISTRICTS.findIndex((d, i) => Hw.hubS(i) > s + 150);
      if (next < 0) continue;
      const sign = directionSign(KT.DISTRICTS[next].name, Hw.hubS(next) - s, next + 1 < KT.DISTRICTS.length ? KT.DISTRICTS[next + 1] : null, Hw.hubS(next + 1) - s);
      const q = Hw.at(s, -ROAD_HALF - 3);
      sign.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
      sign.rotation.y = Hw.frame(s).heading + Math.PI;
      group.add(sign);
    }
    // roadside shops
    shopClusters(k).forEach((o, i) => {
      const f = Hw.frame(o.s);
      const q = Hw.at(o.s, o.lat);
      const rot = f.heading + faceRoad(o.lat);
      let y = 1e9;
      [[0, 0], [2, 2], [-2, 2], [2, -2], [-2, -2]].forEach((c) => { y = Math.min(y, Hw.height(q.x + c[0], q.z + c[1])); });
      items.push({ key: 'shop_' + o.type, m: new T.Matrix4().compose(new T.Vector3(q.x, y, q.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rot), new T.Vector3(1, 1, 1)), s: o.s });
      if (!Hw.tileColliders.has('shop' + k + '-' + i)) { Hw.addCollider({ type: 'box', x: q.x, z: q.z, hw: 2.3, hd: 2.2, rot }); Hw.tileColliders.add('shop' + k + '-' + i); }
    });
    // bridges over rivers
    RIVERS.forEach((r) => {
      if (r.s < s0 - 60 || r.s >= s1 - 60 + SEG_LEN && r.s > s1) return;
      if (r.s < s0 || r.s >= s1) return;
      group.add(bridge(r));
    });
    scene.add(group);
    return { group, items };
  }
  function onBridge(s) { return RIVERS.some((r) => Math.abs(r.s - s) < 55); }

  function directionSign(name, dist, next, dist2) {
    const km = (m) => Math.round(KT.Vehicle.toKm(m));
    const tex = KT.textTexture([{ text: '↑ ' + name + '  ' + km(dist) + ' km', size: 52 }, { text: next ? next.name + '  ' + km(dist2) + ' km' : 'Kasaragod - end of the highway', size: 40 }], { width: 768, height: 256, bg: '#1b6b3a', color: '#ffffff', borderColor: '#ffffff' });
    const g = new T.Group();
    const board = new T.Mesh(G.box(3.4, 1.1, 0.08), [mats.concrete, mats.concrete, mats.concrete, mats.concrete, new T.MeshStandardMaterial({ map: tex, roughness: 0.6 }), mats.concrete]);
    board.position.y = 3.2;
    board.castShadow = true;
    g.add(board);
    [-1.4, 1.4].forEach((x) => part(g, G.cyl(0.06, 0.06, 3.4, 8), KT.M.darkGrey, x, 1.7, -0.05));
    return g;
  }

  function bridge(r) {
    const g = new T.Group();
    const span = 110;
    for (let d = -span / 2; d <= span / 2; d += 4) {
      const s = r.s + d;
      const f = Hw.frame(s);
      const y = roadY(s) + 0.06;
      [-1, 1].forEach((side) => {
        const q = Hw.at(s, side * (ROAD_HALF + 0.3));
        part(g, G.box(0.25, 0.9, 4.1), mats.concrete, q.x, y + 0.45, q.z, 0, f.heading, 0);
        part(g, G.box(0.3, 0.12, 4.1), mats.kerb, q.x, y + 0.95, q.z, 0, f.heading, 0);
      });
      if (Math.abs(d % 20) < 0.01 && Math.abs(d) < span / 2 - 5) {
        [-1, 1].forEach((side) => {
          const q = Hw.at(s, side * 3.5);
          part(g, G.cyl(0.6, 0.7, 10, 12), mats.concrete, q.x, y - 5, q.z);
        });
      }
    }
    const deck = Hw.frame(r.s);
    part(g, G.box(ROAD_HALF * 2 + 0.6, 0.8, span), mats.concrete, deck.x, roadY(r.s) - 0.4, deck.z, 0, deck.heading, 0);
    const baked = KT.bake(g);
    // the river itself
    const water = new T.Mesh(new T.PlaneGeometry(1400, 70, 70, 1), mats.water);
    water.rotation.x = -Math.PI / 2;
    const P = water.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) + deck.x;
      const zOff = P.getY(i);
      P.setXYZ(i, x - deck.x, -(riverZ(r, x) - r.cz) - zOff, 0);
    }
    water.position.set(deck.x, r.y, r.cz);
    baked.add(water);
    // bridge railings block walking off the deck
    if (!Hw.tileColliders.has('bridge' + r.s)) {
      Hw.tileColliders.add('bridge' + r.s);
      for (let d = -span / 2; d <= span / 2; d += 8) {
        const s = r.s + d, f = Hw.frame(s);
        [-1, 1].forEach((side) => { const q = Hw.at(s, side * (ROAD_HALF + 0.35)); Hw.addCollider({ type: 'box', x: q.x, z: q.z, hw: 0.2, hd: 4.2, rot: f.heading }); });
      }
    }
    return baked;
  }

  // ---------------------------------------------------- district hubs
  function hubPlace(hub, obj, along, lat, rotOff, opts) {
    const f = Hw.frame(hub.s + along);
    const q = Hw.at(hub.s + along, lat);
    const rot = (opts && opts.absRot !== undefined) ? opts.absRot : f.heading + (rotOff || 0);
    obj.position.set(q.x, (opts && opts.y !== undefined) ? opts.y : Hw.groundY(q.x, q.z).y, q.z);
    obj.rotation.y = rot;
    hub.group.add(obj);
    (obj.userData.colliders || []).forEach((c) => {
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const wx = q.x + c.x * cs + c.z * sn, wz = q.z - c.x * sn + c.z * cs;
      if (c.type === 'circle') Hw.addCollider({ type: 'circle', x: wx, z: wz, r: c.r });
      else Hw.addCollider({ type: 'box', x: wx, z: wz, hw: c.hw, hd: c.hd, rot });
    });
    return obj;
  }
  // turn a model whose front is +z to face the road from either side
  const faceRoad = (lat) => (lat < 0 ? -Math.PI / 2 : Math.PI / 2);

  function buildHub(hub) {
    const d = hub.district;
    hub.group = new T.Group();
    Hw.scene.add(hub.group);
    const sunken = (obj) => obj;
    // welcome gates at both approaches
    hubPlace(hub, Models.districtGate(d), -75, 0, Math.PI);
    hubPlace(hub, Models.districtGate(d), 75, 0, 0);
    // bus stand on the western (left) side
    const stand = hubPlace(hub, Models.busStand(d.name), 0, -15, faceRoad(-15));
    hub.stop = Hw.at(hub.s + 10, -8); // bus bay beside the carriageway
    hub.stopHeading = Hw.frame(hub.s).heading;
    // info board
    const board = hubPlace(hub, Models.signboard([d.name, 'District of Kerala']), -20, -11, faceRoad(-11));
    Hw.interactables.push({ label: 'Read about ' + d.name, radius: 2.8, pos: () => board.position, action: () => KT.Game.readDistrict(d) });
    Hw.interactables.push({
      label: 'Call the KSRTC bus', radius: 4.5, pos: () => stand.position,
      enabled: () => KT.Player.mode === 'foot' && Hw.bus && Hw.bus.obj.position.distanceTo(stand.position) > 25,
      action: () => Hw.callBus(hub)
    });
    // landmark
    buildLandmark(hub);
    // shops and homes around the centre
    [[-55, 26, 'stall'], [40, 26, 'stall'], [60, -26, 'house'], [-60, -28, 'village'], [95, 30, 'village'], [-95, 32, 'house']].forEach((p, i) => {
      const obj = p[2] === 'stall' ? Models.marketStall(i + hub.index) : p[2] === 'house' ? Models.keralaHouse({ cycle: i % 2 === 0 }) : Models.villageHouse();
      hubPlace(hub, obj, p[0], p[1], faceRoad(p[1]));
    });
    // lamp posts & palms
    for (let a = -60; a <= 60; a += 20) [-1, 1].forEach((sd) => { if (sd < 0 && (a === 0 || a === 20)) return; hubPlace(hub, Models.lampPost(), a, sd * 8.5, sd > 0 ? 0 : Math.PI); });
    // zebra crossing with traffic signals (signals stand on the left kerb
    // of the traffic they control, lamps facing the approaching vehicles)
    const cs = hub.s + Hw.CROSSING, cf = Hw.frame(cs);
    const zebra = Models.zebraCrossing(ROAD_HALF * 2 - 0.6, 3.2);
    zebra.position.set(cf.x, roadY(cs) + 0.075, cf.z);
    zebra.rotation.y = cf.heading;
    hub.group.add(zebra);
    hub.signals = [
      hubPlace(hub, Models.trafficSignal(4.2), Hw.CROSSING - 5, -6.9, Math.PI),
      hubPlace(hub, Models.trafficSignal(4.2), Hw.CROSSING + 5, 6.9, 0)
    ];
    hub.signalShown = null;
    // rows of shops facing the road
    const srng = KT.makeRng(hub.index * 131 + 5);
    const shopRow = (from, n, lat) => {
      for (let i = 0; i < n; i++) hubPlace(hub, Models.shop(Models.SHOP_TYPES[Math.floor(srng() * Models.SHOP_TYPES.length)]), from + i * 4.8, lat, faceRoad(lat));
    };
    shopRow(26, 4, -16.5);
    shopRow(-48, 4, 16.5);
    shopRow(14, 3, 16.5);
    const rng = KT.makeRng(hub.index * 991 + 7);
    for (let i = 0; i < 28; i++) {
      const along = (rng() - 0.5) * 300, lat = (rng() < 0.5 ? -1 : 1) * (40 + rng() * 100);
      const q = Hw.at(hub.s + along, lat);
      if (Hw.nearbyColliders(q.x, q.z, 6).length) continue;
      const palm = Models.coconutPalm(i % 3 === 0 ? 3 : 20);
      hubPlace(hub, palm, along, lat, rng() * 6);
      Hw.addCollider({ type: 'circle', x: q.x, z: q.z, r: 0.4 });
    }
    // local people
    const looks = [['female', 'saree'], ['male', 'mundu'], ['female', 'churidar'], ['male', 'tee'], ['female', 'hiking']];
    for (let i = 0; i < 4; i++) {
      const lk = looks[(i + hub.index) % looks.length];
      const ch = Models.character({ gender: lk[0], outfit: lk[1], hair: lk[0] === 'female' ? ['default', 'braid', 'bun', 'curly'][i % 4] : ['default', 'short', 'wavy', 'curly'][i % 4], lite: true, acc: {}, skin: [0xd9a27c, 0xc08660, 0xa8704c, 0x8d5a3b][i % 4], beard: lk[0] === 'male' && i === 1 });
      const along = -12 + i * 8, lat = -11 - (i % 2) * 2;
      hubPlace(hub, ch, along, lat, faceRoad(lat) + (i - 1.5) * 0.4);
      const w = { obj: ch, id: 'hub-' + hub.index + '-' + i, name: ['Ammu', 'Rajan', 'Sreeja', 'Faisal', 'Mini', 'Joseph'][(i + hub.index) % 6] + ' (' + d.name + ')', lines: [d.facts[i % d.facts.length], d.facts[(i + 1) % d.facts.length]], talking: false, speed: 1 };
      Hw.npcs.push(w);
      Hw.interactables.push({ label: 'Talk to ' + w.name.split(' (')[0], radius: 2.6, pos: () => ch.position, action: () => KT.Game.talkTo(w) });
    }
    // Alappuzha: walk-through arch back to the Alleppey backwaters map
    if (d.home) {
      const arch = hubPlace(hub, Models.entranceArch(['To Alleppey Backwaters', 'Walk in →']), -30, -40, faceRoad(-40));
      Hw.interactables.push({ label: 'Go to the Alleppey backwaters', radius: 5, pos: () => arch.position, action: () => KT.Game.goHome() });
    }
    hub.built = true;
  }

  function waterDisc(hub, along, lat, r) {
    const m = new T.Mesh(new T.CircleGeometry(r, 40), mats.water);
    m.rotation.x = -Math.PI / 2;
    const q = Hw.at(hub.s + along, lat);
    m.position.set(q.x, Hw.groundY(q.x, q.z).y + 0.06, q.z);
    hub.group.add(m);
    Hw.addCollider({ type: 'circle', x: q.x, z: q.z, r: r - 1, noCamera: true });
    return m;
  }

  function buildLandmark(hub) {
    const L = hub.district.landmark, side = 60;
    const rot = faceRoad(side);
    switch (L) {
      case 'gopuram': hubPlace(hub, Models.gopuram(), 20, side, rot); break;
      case 'lighthouse': { const lh = hubPlace(hub, Models.lighthouse(), 20, side + 10, rot); hub.beam = lh.userData.beam; break; }
      case 'shrine': hubPlace(hub, Models.hillShrine(), 25, side + 20, rot); break;
      case 'backwaters': {
        waterDisc(hub, 25, side + 5, 30);
        const hb = Models.houseboat();
        hubPlace(hub, hb, 25, side + 5, 0.3, { y: Hw.groundY(Hw.at(hub.s + 25, side + 5).x, Hw.at(hub.s + 25, side + 5).z).y + 0.1 });
        break;
      }
      case 'church': hubPlace(hub, Models.church(), 20, side, rot); break;
      case 'dam': {
        waterDisc(hub, 30, side + 35, 34);
        hubPlace(hub, Models.archDam(), 30, side + 8, rot);
        break;
      }
      case 'nets': {
        const lagoon = waterDisc(hub, 20, side + 15, 28);
        // fishing points around the lagoon shore (Kochi)
        const lc = Hw.at(hub.s + 20, side + 15);
        hub.lagoon = { x: lc.x, z: lc.z, r: 28, y: lagoon.position.y };
        [-1.35, -0.85, 0.85, 1.35].forEach((ang) => {
          const al = 20 + Math.sin(ang) * 30.5, la = side + 15 - Math.cos(ang) * 30.5;
          const st = Hw.at(hub.s + al, la), tg = Hw.at(hub.s + 20 + Math.sin(ang) * 21, side + 15 - Math.cos(ang) * 21);
          hubPlace(hub, Models.fishingSpot(), al, la, 0, { absRot: Math.atan2(tg.x - st.x, tg.z - st.z) });
          st.y = Hw.groundY(st.x, st.z).y;
          Hw.interactables.push(KT.Fishing.addSpot(st, tg, lagoon.position.y));
        });
        [-12, 0, 12].forEach((a, i) => {
          const n = Models.chineseNet();
          const q = Hw.at(hub.s + 20 + a, side - 12);
          hubPlace(hub, n, 20 + a, side - 12, -Math.PI / 2 + Hw.frame(hub.s).heading - Hw.frame(hub.s).heading, { absRot: Hw.frame(hub.s).heading - Math.PI / 2, y: Hw.groundY(q.x, q.z).y - 1 });
          hub.nets = hub.nets || [];
          hub.nets.push({ obj: n, phase: i * 2 });
        });
        break;
      }
      case 'temple': {
        hubPlace(hub, Models.temple(), 10, side + 18, rot);
        [-6, 6].forEach((a) => {
          const el = KT.skinify(Models.elephant(true, Math.abs(a)));
          hubPlace(hub, el, 10 + a, side - 6, rot);
          hub.elephants = (hub.elephants || []).concat([el]);
        });
        break;
      }
      case 'fort': hubPlace(hub, Models.fort(false), 20, side + 15, rot); break;
      case 'bekal': hubPlace(hub, Models.fort(true), 20, side + 15, rot); break;
      case 'mosque': hubPlace(hub, Models.mosque(), 20, side, rot); break;
      case 'beach': {
        const sand = new T.Mesh(new T.CircleGeometry(40, 32), mats.sand);
        sand.rotation.x = -Math.PI / 2;
        const q = Hw.at(hub.s + 20, side + 10);
        sand.position.set(q.x, Hw.groundY(q.x, q.z).y + 0.04, q.z);
        hub.group.add(sand);
        [[-10, 0], [8, 8], [14, -10]].forEach((p) => hubPlace(hub, Models.thatchedHut(), 20 + p[0], side + 10 + p[1], rot));
        [[-4, 22], [6, 25]].forEach((p) => hubPlace(hub, Models.canoe(), 20 + p[0], side + p[1], 0.4));
        break;
      }
      case 'rocks': {
        [[0, 0, 3], [8, 6, 2], [-9, 4, 2.4], [3, 12, 1.8]].forEach((p) => {
          const b = Models.boulders();
          b.scale.setScalar(p[2]);
          hubPlace(hub, b, 20 + p[0], side + p[1], p[0]);
          const q = Hw.at(hub.s + 20 + p[0], side + p[1]);
          Hw.addCollider({ type: 'circle', x: q.x, z: q.z, r: 2.6 * p[2] });
        });
        hubPlace(hub, Models.watchTower(), 20, side - 18, rot);
        break;
      }
      default: break;
    }
  }

  // -------------------------------------------------------------- build
  Hw.build = async function (quality, progress) {
    const scene = Hw.scene = new T.Scene();
    makeMaterials();
    Hw.sunDir = new T.Vector3(-0.45, 0.62, 0.55).normalize();
    Hw.sky = KT.Geo.buildSky(Hw.sunDir);
    scene.add(Hw.sky);
    Hw.clouds = KT.Geo.buildClouds();
    scene.add(Hw.clouds);
    Hw.horizon = buildHorizon();
    scene.add(Hw.horizon);
    scene.add(new T.HemisphereLight(0xd6ecff, 0x6b7a3c, 0.75));
    const sun = Hw.sun = new T.DirectionalLight(0xfff0d6, 2.1);
    if (quality !== 'low') {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const c = sun.shadow.camera;
      c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 10; c.far = 400;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    }
    scene.add(sun); scene.add(sun.target);
    scene.fog = new T.Fog(0xc8e0ec, 220, 1150);
    progress && progress('Planting the roadside palms...');
    makePools(scene);
    KT.DISTRICTS.forEach((d, i) => Hw.hubs.push({ index: i, district: d, s: Hw.hubS(i), built: false }));
    Hw.built = true;
  };

  function buildHorizon() {
    const g = new T.RingGeometry(1000, 2600, 96, 3);
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position;
    const col = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
      const east = Math.max(0, Math.cos(a)); // ghats to the east
      const hgt = (r > 1100 ? 1 : 0) * (40 + 120 * east + 50 * (KT.fbm(Math.cos(a) * 3, Math.sin(a) * 3, 4) + 0.5));
      P.setY(i, hgt * KT.smoothstep(1000, 1600, r) - 5);
      col.push(0.32, 0.5 + east * 0.05, 0.42);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true }));
    return m;
  }

  // ---------------------------------------------------------- streaming
  Hw.stream = function (pos, budget) {
    const pr = Hw.project(pos.x, pos.z);
    // road segments within 1.3 km
    const k0 = Math.floor((pr.s - 1300) / SEG_LEN), k1 = Math.floor((pr.s + 1300) / SEG_LEN);
    let changed = false;
    for (let k = k0; k <= k1 && budget > 0; k++) {
      if (k < 0 || k * SEG_LEN > Hw.length()) continue;
      if (!Hw.segs.has(k)) { Hw.segs.set(k, buildSegment(k, Hw.scene)); budget--; changed = true; }
    }
    Hw.segs.forEach((sg, k) => {
      if (k < k0 - 1 || k > k1 + 1) { Hw.scene.remove(sg.group); sg.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); Hw.segs.delete(k); changed = true; }
    });
    // terrain tiles along the corridor
    const want = new Set();
    const tx0 = Math.floor((pos.x - 1150) / TILE), tx1 = Math.floor((pos.x + 1150) / TILE);
    const tz0 = Math.floor((pos.z - 1150) / TILE), tz1 = Math.floor((pos.z + 1150) / TILE);
    const list = [];
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let tz = tz0; tz <= tz1; tz++) {
        const cx = (tx + 0.5) * TILE, cz = (tz + 0.5) * TILE;
        const d = Math.hypot(cx - pos.x, cz - pos.z);
        if (d > 1150) continue;
        const p = Hw.project(cx, cz);
        if (Math.abs(p.lat) > 820 || p.s < -400 || p.s > Hw.length() + 600) continue;
        const key = tx + ',' + tz;
        want.add(key);
        if (!Hw.tiles.has(key)) list.push({ key, tx, tz, d });
      }
    }
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < list.length && budget > 0; i++, budget--) {
      Hw.tiles.set(list[i].key, buildTile(list[i].tx, list[i].tz, Hw.scene));
      changed = true;
    }
    Hw.tiles.forEach((t, key) => {
      if (!want.has(key)) { Hw.scene.remove(t.mesh); t.mesh.geometry.dispose(); Hw.tiles.delete(key); changed = true; }
    });
    // hubs: build when close, show only nearby ones
    Hw.hubs.forEach((h) => {
      const d = Math.abs(h.s - pr.s);
      if (d < 1500 && !h.built && budget > 0) { buildHub(h); budget--; changed = true; }
      if (h.group) h.group.visible = d < 1400;
    });
    // refill the scatter pools when the set of tiles changed, or after moving
    if (changed || Math.abs(pr.s - Hw.lastS) > 60) refillPools(pos);
    return list.length;
  };

  const _v = new T.Vector3();
  function refillPools(pos) {
    Hw.lastS = Hw.project(pos.x, pos.z).s;
    const lists = {};
    Object.keys(pools).forEach((k) => { lists[k] = []; });
    const push = (it) => {
      let key = it.key;
      if (key === 'palm') {
        const d = Math.hypot(it.x - pos.x, it.z - pos.z);
        if (d > 150) key = 'palmFar';
      }
      lists[key].push(it.m);
    };
    Hw.tiles.forEach((t) => t.items.forEach((it) => {
      if (it.x === undefined) { _v.setFromMatrixPosition(it.m); it.x = _v.x; it.z = _v.z; }
      push(it);
    }));
    Hw.segs.forEach((sg) => sg.items.forEach((it) => lists[it.key].push(it.m)));
    Object.keys(pools).forEach((k) => pools[k].set(lists[k]));
  }

  // The player's bus: brought to a stop when called.
  Hw.callBus = function (hub) {
    const b = Hw.bus;
    b.obj.position.set(hub.stop.x, Hw.groundY(hub.stop.x, hub.stop.z).y, hub.stop.z);
    b.heading = hub.stopHeading;
    b.speed = 0;
    KT.Vehicle.settle(b);
    KT.Audio.play('horn');
    KT.UI.toast('Your KSRTC bus has arrived at the ' + hub.district.name + ' bus stand.');
  };

  Hw.vehicleObstacles = function (veh) { return KT.Traffic.highwayColliders(veh.obj.position, 16).concat(KT.Vehicle.boxes('highway', veh)); };

  Hw.followSun = function (focus) {
    const snap = 4;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    Hw.sun.target.position.set(fx, focus.y, fz);
    Hw.sun.position.set(fx, focus.y, fz).addScaledVector(Hw.sunDir, 150);
  };

  Hw.update = function (dt, player, camera) {
    Hw.animTime += dt;
    KT.World.animTime = Hw.animTime;
    KT.windUniform.value = Hw.animTime;
    if (camera) { Hw.sky.position.copy(camera.position); Hw.horizon.position.set(camera.position.x, 0, camera.position.z); Hw.clouds.position.set(camera.position.x, 0, camera.position.z); }
    if (mats.water.userData.normal) mats.water.userData.normal.offset.set(Hw.animTime * 0.01, Hw.animTime * 0.006);
    Hw.stream(player.pos, 2);
    KT.Traffic.updateHighway(dt, camera ? camera.position : null);
    const kochi = Hw.hubs.find((h) => h.lagoon && h.group.visible);
    if (kochi) KT.Fishing.ambient(dt, kochi.lagoon, player.pos);
    const pp = player.pos;
    Hw.hubs.forEach((h) => {
      if (!h.group || !h.group.visible) return;
      if (h.beam) h.beam.rotation.y += dt * 0.9;
      (h.nets || []).forEach((n) => { n.obj.userData.arm.rotation.x = -0.35 + ((Math.sin(Hw.animTime * 0.35 + n.phase) + 1) / 2) * 0.6; });
      (h.elephants || []).forEach((e) => e.userData.animate(Hw.animTime + e.id, false));
    });
    Hw.npcs.forEach((w) => {
      if (!w.obj.parent || !w.obj.parent.visible) return;
      const d = Math.hypot(w.obj.position.x - pp.x, w.obj.position.z - pp.z);
      if (d > 120) return;
      if (w.talking) w.obj.rotation.y = KT.angleLerp(w.obj.rotation.y, Math.atan2(pp.x - w.obj.position.x, pp.z - w.obj.position.z), 1 - Math.exp(-dt * 6));
      KT.Models.animateCharacter(w.obj, w.talking ? 'wave' : 'idle', dt);
    });
  };

  // Which district is the player in / heading to?
  Hw.status = function (pos) {
    const pr = Hw.project(pos.x, pos.z);
    let nearest = 0, nd = 1e9;
    KT.DISTRICTS.forEach((d, i) => { const dd = Math.abs(Hw.hubS(i) - pr.s); if (dd < nd) { nd = dd; nearest = i; } });
    return { s: pr.s, lat: pr.lat, nearest, dist: nd };
  };
})();
