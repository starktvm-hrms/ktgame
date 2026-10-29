// People walking around the district towns on the highway: along the
// pavements of the main road, down the side streets, and across the zebra
// crossing while the traffic lights are red. Fewer people are out at night
// and they open umbrellas in the rain.
(function () {
  'use strict';
  const T = THREE;
  const TF = KT.Townfolk = { walkers: [] };

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
    const n = 18;
    for (let i = 0; i < n; i++) {
      const look = LOOKS[(i * 7 + hub.index * 3) % LOOKS.length];
      const female = look[0] === 'female';
      const kid = i % 9 === 4;
      const cfg = {
        gender: look[0], outfit: kid ? 'tee' : look[1], lite: true,
        hair: female ? ['default', 'braid', 'bun', 'loose', 'curly'][i % 5] : ['default', 'short', 'wavy', 'curly'][i % 4],
        skin: SKINS[Math.floor(rng() * SKINS.length)],
        hairColor: rng() < 0.15 ? 0x9a9a96 : 0x24170f,
        beard: !female && rng() < 0.25, glasses: rng() < 0.2,
        colors: look[1] === 'tee' || look[1] === 'casual' || kid ? { top: kid ? 0xf4f4f0 : TOPS[Math.floor(rng() * TOPS.length)], bottom: kid ? 0x1f3a6b : undefined } : undefined,
        acc: { backpack: kid || rng() < 0.15, hat: false, sunglasses: rng() < 0.1, camera: false },
        scale: kid ? 0.72 : 0.9 + rng() * 0.12
      };
      if (cfg.colors && cfg.colors.bottom === undefined) delete cfg.colors.bottom;
      const obj = KT.Models.character(cfg);
      const umb = umbrella();
      obj.add(umb);
      hub.group.add(obj);
      // start somewhere on the graph, heading to a neighbour
      let at = Math.floor(rng() * graph.length);
      const nb = graph[at].next[Math.floor(rng() * graph[at].next.length)];
      const w = {
        hub, graph, obj, umb, from: at, to: nb.to, kind: nb.kind, t: rng(), rng,
        speed: (kid ? 1.25 : 1.0) + rng() * 0.45, off: (rng() - 0.5) * 1.1,
        wait: 0, night: rng() < 0.55, rainy: rng() < 0.75, state: 'walk', heading: 0
      };
      if (w.kind === 'cross') { w.kind = 'walk'; w.to = w.from; }
      hub.townfolk.push(w);
      TF.walkers.push(w);
    }
  };

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
      const y = KT.Highway.groundY(x, z).y;
      w.obj.position.set(x, y, z);
      w.obj.rotation.y = KT.angleLerp(w.obj.rotation.y, w.heading, 1 - Math.exp(-dt * 8));
      w.umb.visible = rainy && w.rainy;
      w.onRoad = w.kind === 'cross' && !w.waitCross && w.t > 0 && w.t < 1;
      if (d < 80) KT.Models.animateCharacter(w.obj, moving ? 'walk' : 'idle', dt, w.speed / 1.1);
    });
  };

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
    return out;
  };
})();
