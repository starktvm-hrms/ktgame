// Life in the district towns on the highway: people walking the pavements
// of the main road and the side streets and crossing at the zebra crossing
// while the traffic lights are red, tourists strolling round every
// attraction, autos, scooters and cars driving up and down the side
// streets, and vehicles parked along the roads. Fewer people are out at
// night and they open umbrellas in the rain.
(function () {
  'use strict';
  const T = THREE;
  const TF = KT.Townfolk = { walkers: [], vehicles: [] };

  const PAVE = 10.4;                 // pavement line either side of the road
  const ENDS = [-150, -120, -40, 0, 30, 100, 150];
  const STREETS = [[-40, -1], [100, -1], [-120, 1]]; // side streets (along, side)
  const STREET_END = 86;

  const LOOKS = [
    ['female', 'saree'], ['male', 'mundu'], ['female', 'churidar'], ['male', 'tee'], ['male', 'formal'],
    ['female', 'casual'], ['male', 'casual'], ['female', 'saree'], ['male', 'hiking'], ['female', 'churidar'], ['male', 'mundu']
  ];
  const SKINS = [0xe2ae8a, 0xd9a27c, 0xc08660, 0xa8704c, 0x8d5a3b];
  const TOPS = [0xd8203a, 0x2c5fa8, 0x2a9d8f, 0xf2c230, 0x6b3fa0, 0xe07a1f, 0xf3efe6, 0x3f7f2c, 0xe05a8a];

  // walking graph of a town, in road coordinates (along, lat)
  function townGraph(hub) {
    const nodes = [], edges = [];
    const add = (along, lat, kind) => { nodes.push({ along, lat, kind: kind || 'walk', next: [] }); return nodes.length - 1; };
    const link = (a, b, kind) => { nodes[a].next.push({ to: b, kind }); nodes[b].next.push({ to: a, kind }); edges.push([a, b]); };
    const cross = KT.Highway.CROSSING;
    const stops = ENDS.concat([cross]).sort((a, b) => a - b);
    const side = {};
    [-1, 1].forEach((sd) => {
      side[sd] = stops.map((al) => add(al, sd * PAVE, al === cross ? 'crossing' : 'walk'));
      for (let i = 0; i < side[sd].length - 1; i++) link(side[sd][i], side[sd][i + 1], 'walk');
    });
    // the zebra crossing joins the two pavements
    const ci = stops.indexOf(cross);
    link(side[-1][ci], side[1][ci], 'cross');
    // side streets
    STREETS.forEach(([SA, sd]) => {
      const i = stops.indexOf(SA);
      if (i < 0) return;
      const mid = add(SA, sd * 45), end = add(SA, sd * STREET_END);
      link(side[sd][i], mid, 'walk');
      link(mid, end, 'walk');
    });
    return nodes;
  }

  function umbrella() {
    const g = new T.Group();
    const cols = [0x1d1d1f, 0x1d1d1f, 0x2c5fa8, 0xd8203a, 0x3f7f2c];
    const c = new T.Mesh(new T.ConeGeometry(0.62, 0.32, 10, 1, true), KT.mat('umbrellaTop' + (TF.walkers.length % 5), { color: cols[TF.walkers.length % 5], roughness: 0.5, side: T.DoubleSide }));
    c.position.y = 2.15;
    g.add(c);
    const st = new T.Mesh(KT.G.cyl(0.015, 0.015, 0.9, 5), KT.M.black);
    st.position.set(0, 1.75, 0);
    g.add(st);
    g.position.set(0.18, 0, 0.12);
    g.visible = false;
    return g;
  }

  // Populate a town (called when its district centre is built).
  TF.populate = function (hub) {
    if (hub.townfolk) return;
    const rng = KT.makeRng(hub.index * 313 + 17);
    const graph = townGraph(hub);
    hub.townfolk = [];
    for (let i = 0; i < 18; i++) addWalker(hub, graph, rng, i, false);
    addTourists(hub, rng);
    addParked(hub, rng);
    addStreetTraffic(hub, rng);
  };

  function addWalker(hub, graph, rng, i, tourist) {
    {
      const look = tourist ? TOURIST_LOOKS[(i + hub.index) % TOURIST_LOOKS.length] : LOOKS[(i * 7 + hub.index * 3) % LOOKS.length];
      const female = look[0] === 'female';
      const kid = i % 9 === 4;
      const cfg = {
        gender: look[0], outfit: kid ? 'tee' : look[1], lite: true,
        hair: female ? ['default', 'braid', 'bun', 'loose', 'curly'][i % 5] : ['default', 'short', 'wavy', 'curly'][i % 4],
        skin: SKINS[Math.floor(rng() * SKINS.length)],
        hairColor: rng() < 0.15 ? 0x9a9a96 : 0x24170f,
        beard: !female && rng() < 0.25, glasses: rng() < 0.2,
        colors: look[1] === 'tee' || look[1] === 'casual' || kid ? { top: kid ? 0xf4f4f0 : TOPS[Math.floor(rng() * TOPS.length)], bottom: kid ? 0x1f3a6b : undefined } : undefined,
        acc: tourist ? { backpack: rng() < 0.6, hat: rng() < 0.5, sunglasses: rng() < 0.6, camera: rng() < 0.5 } : { backpack: kid || rng() < 0.15, hat: false, sunglasses: rng() < 0.1, camera: false },
        scale: kid ? 0.72 : 0.9 + rng() * 0.12,
        mustache: !female && !kid && rng() < 0.6,
        jasmine: female && (look[1] === 'saree' || look[1] === 'churidar') && rng() < 0.5,
        carry: kid ? null : (() => { const r = rng(); return r < 0.22 ? 'shopping' : female && r < 0.4 ? 'handbag' : r < 0.5 ? 'phone' : null; })(),
        seed: i
      };
      if (cfg.colors && cfg.colors.bottom === undefined) delete cfg.colors.bottom;
      const obj = KT.Models.character(cfg);
      const umb = umbrella();
      obj.add(umb);
      hub.group.add(obj);
      obj.userData.cfg = cfg;
      // start somewhere on the graph, heading to a neighbour
      let at = Math.floor(rng() * graph.length);
      for (let k = 0; k < graph.length && !graph[at].next.length; k++) at = (at + 1) % graph.length;
      const nb = graph[at].next[Math.floor(rng() * graph[at].next.length)];
      const w = {
        hub, graph, obj, umb, from: at, to: nb.to, kind: nb.kind, t: rng(), rng,
        speed: (kid ? 1.25 : 1.0) + rng() * 0.45, off: (rng() - 0.5) * 1.1,
        wait: 0, night: rng() < (tourist ? 0.2 : 0.55), rainy: rng() < 0.75, state: 'walk', heading: 0
      };
      if (w.kind === 'cross') { w.kind = 'walk'; w.to = w.from; }
      if (tourist) w.speed *= 0.75;
      hub.townfolk.push(w);
      TF.walkers.push(w);
    }
  }

  // ------------------------------------------------ tourists at sights
  const TOURIST_LOOKS = [['male', 'hiking'], ['female', 'casual'], ['male', 'tee'], ['female', 'saree'], ['male', 'casual'], ['female', 'churidar'], ['male', 'formal']];
  function addTourists(hub, rng) {
    const Hw = KT.Highway;
    Hw.sightList().filter((sg) => sg.hub === hub.index).forEach((sg, k) => {
      // a ring path round the attraction, leaving out blocked points
      const ring = [];
      const R = sg.r + 3.5, n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const along = sg.along + Math.cos(a) * R, lat = sg.lat + Math.sin(a) * R;
        if (Math.abs(lat) < PAVE + 2) continue;
        const q = Hw.at(hub.s + along, lat);
        if (Hw.isBlocked(q.x, q.z, 0.6) || Hw.waterLevelAt(q.x, q.z) > -1e8) continue;
        ring.push({ along, lat, kind: 'walk', next: [], i });
      }
      if (ring.length < 2) return;
      // join neighbouring points only (a blocked point leaves a gap)
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        if (j === i || (ring[j].i - ring[i].i + n) % n !== 1) continue;
        ring[i].next.push({ to: j, kind: 'walk' });
        ring[j].next.push({ to: i, kind: 'walk' });
      }
      if (!ring.some((nd) => nd.next.length)) return;
      const count = sg.kind === 'main' ? 4 : 3;
      for (let i = 0; i < count; i++) addWalker(hub, ring, rng, k * 5 + i, true);
    });
  }

  // ------------------------------------------------- parked vehicles
  const CAR_COLS = [0xf3f3f0, 0xb9bec4, 0xb3261e, 0x2c5fa8, 0x1d1d1f, 0x2a6f5a];
  function vehicleModel(kind, rng, ridden) {
    const M = KT.Models;
    if (kind === 'car') return M.car(CAR_COLS[Math.floor(rng() * CAR_COLS.length)], ['hatch', 'sedan', 'suv'][Math.floor(rng() * 3)]);
    if (kind === 'auto') return M.autoRickshaw();
    return M.scooter([0xf3f3f0, 0xb3261e, 0x1d1d1f, 0x2c5fa8][Math.floor(rng() * 4)], ridden ? TOPS[Math.floor(rng() * TOPS.length)] : null, 0x111111);
  }
  function addParked(hub, rng) {
    const Hw = KT.Highway, grp = new T.Group(), pt = new T.Vector3();
    const free = (along, lat, r) => {
      const q = Hw.at(hub.s + along, lat);
      pt.set(q.x, 0, q.z);
      return !KT.World.resolveList(pt, r, Hw.nearbyColliders(q.x, q.z, 8));
    };
    const park = (kind, along, lat, rot) => {
      const o = vehicleModel(kind, rng, false);
      const q = Hw.at(hub.s + along, lat);
      o.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
      o.rotation.y = rot;
      grp.add(o);
      const sz = o.userData.size || { length: 2.7, width: 1.3 };
      Hw.addCollider({ type: 'box', x: q.x, z: q.z, hw: sz.width / 2, hd: sz.length / 2, rot });
    };
    // along the main road's shoulders, clear of the crossing and the bus bay
    for (let al = -146; al <= 146; al += 9) {
      if (Math.abs(al - KT.Highway.CROSSING) < 13 || Math.abs(al - 10) < 12 || Math.abs(((al % 20) + 20) % 20) < 3) continue;
      [-1, 1].forEach((sd) => {
        if (rng() > 0.45) return;
        const kind = rng() < 0.5 ? 'car' : rng() < 0.5 ? 'auto' : 'scooter';
        const lat = sd * (kind === 'scooter' ? 7.2 : 6.95); // parking strip beside the footpath
        if (!free(al, lat, 1.3)) return;
        const h = Hw.frame(hub.s + al).heading + (sd < 0 ? 0 : Math.PI);
        park(kind, al, lat, h);
      });
    }
    // scooters along the side streets
    STREETS.forEach(([SA, sd]) => {
      for (let k = 20; k <= 80; k += 7) {
        if (rng() > 0.4) continue;
        const along = SA + (rng() < 0.5 ? -3.0 : 3.0);
        if (!free(along, sd * k, 0.7)) continue;
        park('scooter', along, sd * k, Hw.frame(hub.s + SA).heading + Math.PI / 2 + (rng() - 0.5) * 0.4);
      }
    });
    if (grp.children.length) hub.group.add(KT.bake(grp));
  }

  // ------------------------------------------- side-street traffic
  // Autos, scooters and cars drive up a side street, turn at the end and
  // come back, waiting a little at the main road; they keep left and stop
  // for anyone in front of them.
  function addStreetTraffic(hub, rng) {
    STREETS.forEach(([SA, sd], k) => {
      ['auto', 'scooter', 'car'].slice(0, 2 + (k + hub.index) % 2).forEach((kind, i) => {
        const obj = vehicleModel(kind, rng, true);
        hub.group.add(obj);
        TF.vehicles.push({ hub, obj, SA, side: sd, t: 14 + i * 30 + rng() * 10, dir: i % 2 ? -1 : 1, speed: kind === 'car' ? 6.5 : kind === 'auto' ? 5.5 : 7, v: 0, wait: rng() * 3, turn: 0, len: kind === 'car' ? 3.8 : kind === 'auto' ? 2.7 : 1.8 });
      });
    });
  }
  const T0 = 13, T1 = 82, LANE_OFF = 1.6;
  function updateVehicles(dt, pp) {
    const Hw = KT.Highway;
    TF.vehicles.forEach((v) => {
      if (!v.hub.group.visible) return;
      const q0 = Hw.at(v.hub.s + v.SA, 0);
      const near = Math.hypot(q0.x - pp.x, q0.z - pp.z) < 260;
      v.obj.visible = near;
      if (!near) return;
      // U-turn at either end
      if (v.turn > 0) {
        v.turn -= dt;
        if (v.turn <= 0) { v.dir = -v.dir; v.wait = v.t < 20 ? 1.5 + Math.random() * 3 : 0.4; }
      } else if (v.wait > 0) v.wait -= dt;
      else {
        // anyone just ahead in the lane?
        const m = v.side * v.dir;
        const lane = v.SA + LANE_OFF * m;
        const ahead = (x, z) => {
          const p = Hw.project(x, z), la = p.lat * v.side, al = p.s - v.hub.s;
          const dd = (la - v.t) * v.dir;
          return dd > 0 && dd < v.len / 2 + 3.5 && Math.abs(al - lane) < 1.6;
        };
        let blocked = ahead(pp.x, pp.z);
        if (!blocked) blocked = v.hub.townfolk.some((w) => w.obj.visible && ahead(w.obj.position.x, w.obj.position.z));
        const target = blocked ? 0 : v.speed;
        v.v += (target - v.v) * (1 - Math.exp(-dt * (blocked ? 8 : 1.5)));
        v.t += v.v * v.dir * dt;
        if (v.t > T1 || v.t < T0) { v.t = KT.clamp(v.t, T0, T1); v.turn = 1.6; v.v = 0; }
      }
      // pose: keep left; while turning, swing across the street
      const m = v.side * v.dir;
      let off = LANE_OFF * m, yaw = 0;
      if (v.turn > 0) { const k = 1 - v.turn / 1.6; off = LANE_OFF * m * (1 - 2 * k); yaw = Math.PI * k; }
      const a = Hw.at(v.hub.s + v.SA + off, v.side * v.t);
      const f = Hw.frame(v.hub.s + v.SA);
      // facing up the street (away from the main road) is +lat * side
      const up = Math.atan2(f.rx * v.side, f.rz * v.side);
      v.obj.position.set(a.x, Hw.groundY(a.x, a.z).y, a.z);
      v.obj.rotation.y = (v.dir > 0 ? up : up + Math.PI) + yaw;
    });
  }

  function nodePos(w, i, out) {
    const nd = w.graph[i];
    const side = Math.sign(nd.lat) || 1;
    // keep to the pavement side of the line, with a personal offset
    const lat = Math.abs(nd.lat) <= PAVE + 0.1 ? nd.lat + side * w.off * 0.5 : nd.lat;
    const along = Math.abs(nd.lat) > PAVE + 0.1 ? nd.along + w.off * 1.6 : nd.along;
    return KT.Highway.at(w.hub.s + along, lat, out);
  }
  const _a = new T.Vector3(), _b = new T.Vector3();

  function signalRedFor(hub) {
    // the vehicles' red phase is the pedestrians' green; start only early in it
    const c = (KT.Highway.animTime + hub.index * 7) % 27;
    return c >= 18 && c < 19.6;
  }

  function chooseNext(w) {
    const nd = w.graph[w.to];
    let opts = nd.next.filter((e) => e.to !== w.from);
    if (!opts.length) opts = nd.next;
    const e = opts[Math.floor(w.rng() * opts.length)];
    w.from = w.to; w.to = e.to; w.kind = e.kind; w.t = 0;
    if (e.kind === 'cross') w.waitCross = true;
    else if (w.rng() < 0.25) w.wait = 1 + w.rng() * 4; // stop for a moment
  }

  TF.update = function (dt, player) {
    const pp = player.pos;
    updateVehicles(dt, pp);
    const sky = KT.Sky || { night: 0, rain: 0 };
    const rainy = sky.rain > 0.3;
    TF.walkers.forEach((w) => {
      const g = w.hub.group;
      if (!g || !g.visible) return;
      nodePos(w, w.from, _a); nodePos(w, w.to, _b);
      const len = Math.max(0.5, _a.distanceTo(_b));
      const x = KT.lerp(_a.x, _b.x, w.t), z = KT.lerp(_a.z, _b.z, w.t);
      const d = Math.hypot(x - pp.x, z - pp.z);
      // few people out late at night
      const out = !(sky.night > 0.6 && !w.night);
      w.obj.visible = out && d < 115;
      if (!w.obj.visible) return;
      let moving = false;
      if (w.wait > 0) w.wait -= dt;
      else if (w.waitCross) {
        // wait at the kerb for the red light, then cross
        if (signalRedFor(w.hub)) w.waitCross = false;
      } else {
        // don't walk into the player
        const ahead = Math.hypot(_b.x - x, _b.z - z) > 0.01 ? ((pp.x - x) * (_b.x - _a.x) + (pp.z - z) * (_b.z - _a.z)) / len : -1;
        if (!(d < 1.3 && ahead > 0)) {
          w.t += (w.speed * (w.kind === 'cross' ? 1.35 : 1) * dt) / len;
          moving = true;
          if (w.t >= 1) { w.t = 1; chooseNext(w); }
        }
      }
      const hx = _b.x - _a.x, hz = _b.z - _a.z;
      if (moving && Math.hypot(hx, hz) > 0.01) w.heading = Math.atan2(hx, hz);
      // full detail up close, the light model further away
      const want = d < 24 ? 'full' : d > 30 ? 'lite' : w.lod || 'lite';
      if (want !== (w.lod || 'lite')) swapLod(w, want);
      const y = KT.Highway.groundY(x, z).y;
      w.obj.position.set(x, y, z);
      w.obj.rotation.y = KT.angleLerp(w.obj.rotation.y, w.heading, 1 - Math.exp(-dt * 8));
      w.umb.visible = rainy && w.rainy;
      w.onRoad = w.kind === 'cross' && !w.waitCross && w.t > 0 && w.t < 1;
      if (d < 80) KT.Models.animateCharacter(w.obj, moving ? 'walk' : 'idle', dt, w.speed / 1.1);
    });
  };

  function swapLod(w, want) {
    const old = w.obj;
    if (want === 'full' && !w.full) {
      w.lite = old;
      w.full = KT.Models.character(Object.assign({}, old.userData.cfg, { lite: false }));
      w.full.userData.cfg = old.userData.cfg;
    }
    const next = want === 'full' ? w.full : w.lite;
    if (!next || next === old) return;
    next.position.copy(old.position);
    next.rotation.y = old.rotation.y;
    next.visible = old.visible;
    old.parent.add(next);
    old.parent.remove(old);
    next.add(w.umb);
    w.obj = next;
    w.lod = want;
  }

  // people on the carriageway (for the traffic to stop for)
  TF.onRoad = function () {
    const out = [];
    TF.walkers.forEach((w) => { if (w.onRoad && w.obj.visible) out.push(w.obj.position); });
    return out;
  };
  // bodies the player bumps into
  TF.colliders = function (pos) {
    const out = [];
    TF.walkers.forEach((w) => {
      const p = w.obj.position;
      if (w.obj.visible && Math.abs(p.x - pos.x) < 6 && Math.abs(p.z - pos.z) < 6) out.push({ type: 'circle', x: p.x, z: p.z, r: 0.32 });
    });
    TF.vehicles.forEach((v) => {
      const p = v.obj.position;
      if (v.obj.visible && Math.abs(p.x - pos.x) < 8 && Math.abs(p.z - pos.z) < 8) out.push({ type: 'circle', x: p.x, z: p.z, r: v.len > 3 ? 1.3 : 0.9 });
    });
    return out;
  };
})();
