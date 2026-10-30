// The Kerala Highway: a long road from Thiruvananthapuram (south) to
// Kasaragod (north) linking all 14 district centres, laid out on the real
// map of Kerala at the 1:20 map scale. Terrain, road and roadside scenery are
// generated in tiles around the player; district hubs are built when the
// player approaches.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part, Models = KT.Models;
  const Hw = KT.Highway = {
    id: 'highway', code: 1, built: false, animTime: 0,
    CROSSING: -17, // zebra crossing and signals, relative to each district centre
    colliders: [], grid: new Map(), cell: 32, interactables: [], hubs: [], npcs: [],
    tiles: new Map(), segs: new Map(), lastS: -1e9
  };
  const TILE = 160, RES = 32, SEG_LEN = 200;
  const ROAD_HALF = 5.5, MAX_LAT = 340;
  const FOOT0 = 8.0, FOOT1 = 13.6; // town footpaths (lateral range)

  // ---------------------------------------------------------- road path
  // The road follows the real map of Kerala. Each district centre sits at
  // its real latitude and longitude (1 km = 50 game metres, the 1:20 map
  // scale; +x is east, -z is north), and the road curves between them: down
  // the coast from Thiruvananthapuram, inland to Pathanamthitta, back to the
  // backwaters, up into the Idukki hills, down to Kochi and so on to
  // Kasaragod. The path is a smooth curve sampled every 2 m.
  const KM = 50;
  const LONLAT = {
    tvm: [76.9366, 8.5241], klm: [76.6141, 8.8932], pta: [76.787, 9.2648], alp: [76.3388, 9.4981],
    ktm: [76.5222, 9.5916], idk: [76.94, 9.85], ekm: [76.2999, 9.9816], tsr: [76.2144, 10.5276],
    pkd: [76.6548, 10.7867], mlp: [76.0711, 11.051], kkd: [75.7804, 11.2588], wyd: [76.08, 11.61],
    knr: [75.3704, 11.8745], ksd: [74.9869, 12.4996]
  };
  Hw.geo = (lon, lat) => ({ x: (lon - 76) * 109.3 * KM, z: -(lat - 8.5) * 111 * KM });
  Hw.toLonLat = (x, z) => ({ lon: 76 + x / (109.3 * KM), lat: 8.5 - z / (111 * KM) });
  // the Arabian Sea coastline (longitude at each latitude)
  const COAST = [[8.2, 77.15], [8.38, 76.99], [8.5, 76.9], [8.75, 76.7], [8.88, 76.57], [9.1, 76.47], [9.3, 76.42],
    [9.49, 76.32], [9.7, 76.28], [9.97, 76.23], [10.2, 76.16], [10.5, 76.03], [10.77, 75.92], [11.0, 75.85],
    [11.25, 75.77], [11.5, 75.6], [11.7, 75.5], [11.87, 75.35], [12.1, 75.17], [12.3, 75.08], [12.5, 74.98], [12.8, 74.85]];
  Hw.COAST = COAST;
  Hw.coastX = function (z) {
    const lat = 8.5 - z / (111 * KM);
    let i = 0;
    while (i < COAST.length - 2 && COAST[i + 1][0] < lat) i++;
    const a = COAST[i], b = COAST[i + 1], t = KT.clamp((lat - a[0]) / (b[0] - a[0]), 0, 1);
    return (a[1] + (b[1] - a[1]) * t - 76) * 109.3 * KM;
  };
  // how far into the Western Ghats a point is (0 on the plains, 1 in the hills)
  Hw.ghats = (x, z) => KT.smoothstep(1300, 3100, x - Hw.coastX(z));

  const STEP = 2;
  const PX = [], PZ = [], PY = [];
  const HUB_S = [];
  // Towns the road passes through between the district centres, following
  // the national highways (NH 66, 744, 183A, 183, 85, 544, 966, 766) and the
  // hill roads: [name, latitude, longitude, highway]
  const VIA = [
    [['Attingal', 8.696, 76.815, 'NH 66'], ['Paripally', 8.81, 76.75, 'NH 66']],
    [['Sasthamcotta', 9.04, 76.63, 'SH'], ['Adoor', 9.155, 76.735, 'MC Road']],
    [['Kozhencherry', 9.335, 76.71, 'SH 7'], ['Chengannur', 9.318, 76.611, 'NH 183']],
    [['Thanneermukkom', 9.68, 76.39, 'Vembanad Road']],
    [['Pala', 9.71, 76.68, 'SH 8'], ['Moolamattom', 9.8, 76.85, 'SH 33']],
    [['Adimali', 10.01, 76.95, 'NH 85'], ['Kothamangalam', 10.06, 76.63, 'NH 85'], ['Kolenchery', 9.98, 76.47, 'NH 85']],
    [['Aluva', 10.108, 76.351, 'NH 544'], ['Chalakudy', 10.3, 76.33, 'NH 544']],
    [['Vadakkencherry', 10.59, 76.48, 'NH 544'], ['Alathur', 10.65, 76.56, 'NH 544']],
    [['Mannarkkad', 10.99, 76.46, 'NH 966'], ['Perinthalmanna', 10.976, 76.226, 'NH 966']],
    [['Kondotty', 11.145, 75.96, 'NH 966']],
    [['Thamarassery', 11.415, 75.94, 'NH 766'], ['Lakkidi', 11.52, 76.02, 'NH 766']],
    [['Mananthavady', 11.8, 76.0, 'SH 30'], ['Nedumpoil', 11.86, 75.78, 'SH 30'], ['Kuthuparamba', 11.83, 75.57, 'SH 30']],
    [['Taliparamba', 12.04, 75.36, 'NH 66'], ['Payyanur', 12.1, 75.2, 'NH 66'], ['Nileshwar', 12.26, 75.13, 'NH 66']]
  ];
  Hw.WAYPOINTS = [];
  Hw.nearestWaypoint = function (s) {
    let best = null;
    Hw.WAYPOINTS.forEach((w) => { if (!best || Math.abs(w.s - s) < Math.abs(best.s - s)) best = w; });
    return best;
  };
  (function buildPath() {
    // control points: district centres (with a straight stretch through the
    // town) and the towns in between
    const C = [];
    KT.DISTRICTS.forEach((d, i) => {
      const ll = LONLAT[d.id] || [76, 8.5 + i];
      C.push(Object.assign(Hw.geo(ll[0], ll[1]), { hub: i, back: i === 0 ? 400 : 250, fwd: i === KT.DISTRICTS.length - 1 ? 600 : 250 }));
      (VIA[i] || []).forEach((v) => C.push(Object.assign(Hw.geo(v[2], v[1]), { way: Hw.WAYPOINTS.push({ name: v[0], lat: v[1], lon: v[2], road: v[3] }) - 1, back: 0, fwd: 0 })));
    });
    const n = C.length;
    const unit = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
    // first guess of the direction at each point: between the directions it
    // comes in and goes out on, leaning towards the shorter leg
    const tan = C.map((p, i) => {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)];
      const ui = i > 0 ? unit(p.x - a.x, p.z - a.z) : null, uo = i < n - 1 ? unit(b.x - p.x, b.z - p.z) : null;
      if (!ui || !uo) return ui || uo;
      const li = 1 / Math.hypot(p.x - a.x, p.z - a.z), lo = 1 / Math.hypot(b.x - p.x, b.z - p.z);
      return unit(ui.x * li + uo.x * lo, ui.z * li + uo.z * lo);
    });
    // Hermite piece from A (direction tA) to B (tB), tension f * chord
    const herm = (A, tA, B, tB, m, u, o) => {
      const u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      o.x = h00 * A.x + h10 * m * tA.x + h01 * B.x + h11 * m * tB.x;
      o.z = h00 * A.z + h10 * m * tA.z + h01 * B.z + h11 * m * tB.z;
      return o;
    };
    const TENSION = [0.6, 0.8, 1, 1.25, 1.6, 2], ENOUGH = 400;
    // tightest bend radius of the piece from point i to i + 1, at its best tension
    const _a = {}, _b = {}, _c2 = {};
    function bestPiece(i, ti, tj) {
      const P = C[i], Q = C[i + 1];
      const A = { x: P.x + ti.x * P.fwd, z: P.z + ti.z * P.fwd }, B = { x: Q.x - tj.x * Q.back, z: Q.z - tj.z * Q.back };
      const L = Math.hypot(B.x - A.x, B.z - A.z);
      let best = { R: -1e9, f: 1 };
      TENSION.forEach((f) => {
        let minR = 1e9, minE = 1e9;
        for (let k = 1; k < 60; k++) {
          const u = k / 60, du = 1 / 120;
          herm(A, ti, B, tj, L * f, u - du, _a); herm(A, ti, B, tj, L * f, u, _b); herm(A, ti, B, tj, L * f, u + du, _c2);
          const ax = _b.x - _a.x, az = _b.z - _a.z, bx = _c2.x - _b.x, bz = _c2.z - _b.z;
          const cross = Math.abs(ax * bz - az * bx), la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
          const R = (la * lb * Math.hypot(ax + bx, az + bz)) / Math.max(1e-9, 2 * cross);
          if (R < minR) minR = R;
          minE = Math.min(minE, _b.x - Hw.coastX(_b.z));
        }
        // wide enough is enough: then the shortest (lowest tension) wins;
        // keep out of the sea
        const score = Math.min(minR, ENOUGH) + Math.min(0, minE - 120) * 3;
        if (score > best.R + 1) best = { R: score, f, minE };
      });
      return best;
    }
    const rot = (t, a) => ({ x: t.x * Math.cos(a) - t.z * Math.sin(a), z: t.x * Math.sin(a) + t.z * Math.cos(a) });
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < n; i++) {
        const base = tan[i];
        let bestT = base, bestR = -1e9;
        for (let k = 0; k <= 40; k++) {
          const a = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.07; // nearest the first guess first
          const t = rot(base, a);
          const R = Math.min(i > 0 ? bestPiece(i - 1, tan[i - 1], t).R : 1e9, i < n - 1 ? bestPiece(i, t, tan[i + 1]).R : 1e9);
          if (R > bestR + 1) { bestR = R; bestT = t; }
        }
        tan[i] = bestT;
      }
    }
    const nodes = [];
    C.forEach((p, i) => {
      const t = tan[i];
      const bp = i < n - 1 ? bestPiece(i, t, tan[i + 1]) : { f: 1, minE: 0 };
      if (p.back) nodes.push({ x: p.x - t.x * p.back, z: p.z - t.z * p.back, t, town: true });
      nodes.push({ x: p.x, z: p.z, t, hub: p.hub, way: p.way, town: p.hub !== undefined, f: p.fwd ? 1 : bp.f });
      if (p.fwd) nodes.push({ x: p.x + t.x * p.fwd, z: p.z + t.z * p.fwd, t, f: bp.f });
    });
    // dense samples of each Hermite piece
    const dense = [];
    for (let k = 0; k < nodes.length - 1; k++) {
      const A = nodes[k], B = nodes[k + 1], L = Math.hypot(B.x - A.x, B.z - A.z);
      const tA = A.t, tB = B.t, m = L * (A.f || 1);
      const N = Math.ceil(L / 0.5);
      for (let j = k === 0 ? 0 : 1; j <= N; j++) {
        const u = j / N, u2 = u * u, u3 = u2 * u;
        const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
        dense.push({
          x: h00 * A.x + h10 * m * tA.x + h01 * B.x + h11 * m * tB.x,
          z: h00 * A.z + h10 * m * tA.z + h01 * B.z + h11 * m * tB.z,
          hub: j === N && B.hub !== undefined ? B.hub : -1,
          way: j === N && B.way !== undefined ? B.way : -1
        });
      }
    }
    // resample at an even 2 m along the curve
    let acc = 0, next = 0;
    PX.push(dense[0].x); PZ.push(dense[0].z); next = STEP;
    for (let i = 1; i < dense.length; i++) {
      const a = dense[i - 1], b = dense[i], d = Math.hypot(b.x - a.x, b.z - a.z);
      while (acc + d >= next) {
        const t = (next - acc) / d;
        PX.push(a.x + (b.x - a.x) * t); PZ.push(a.z + (b.z - a.z) * t);
        next += STEP;
      }
      acc += d;
      if (b.hub >= 0) HUB_S[b.hub] = acc;
      if (b.way >= 0) Hw.WAYPOINTS[b.way].s = acc;
    }
    // road height: rolling plains, climbing into the ghats
    for (let i = 0; i < PX.length; i++) {
      const s = i * STEP;
      PY.push(4 + 5 * Math.sin(s / 1700) + 2.5 * Math.sin(s / 530 + 2) + 30 * Hw.ghats(PX[i], PZ[i]));
    }
    // smooth the climb so the road never gets steep
    for (let pass = 0; pass < 2; pass++) {
      const src = PY.slice(), R = 60;
      for (let i = 0; i < PY.length; i++) {
        let sum = 0, c = 0;
        for (let j = Math.max(0, i - R); j <= Math.min(PY.length - 1, i + R); j += 4) { sum += src[j]; c++; }
        PY[i] = sum / c;
      }
    }
    // level road through each town, easing into the slope outside it
    HUB_S.forEach((hs) => {
      const yh = PY[Math.round(hs / STEP)];
      for (let i = Math.max(0, Math.floor((hs - 480) / STEP)); i <= Math.min(PY.length - 1, Math.ceil((hs + 480) / STEP)); i++) {
        PY[i] = KT.lerp(PY[i], yh, 1 - KT.smoothstep(320, 480, Math.abs(i * STEP - hs)));
      }
    });
  })();
  const LAST = PX.length - 1, PATH_LEN = LAST * STEP;
  const roadY = (s) => {
    const f = KT.clamp(s / STEP, 0, LAST), i = Math.min(LAST - 1, Math.floor(f)), t = f - i;
    return PY[i] + (PY[i + 1] - PY[i]) * t;
  };
  Hw.roadY = roadY;
  Hw.hubS = (i) => HUB_S[KT.clamp(i, 0, HUB_S.length - 1)];
  Hw.length = () => Hw.hubS(KT.DISTRICTS.length - 1) + 600;
  // the district centre nearest to a distance along the road
  Hw.hubIndexAt = function (s) {
    let best = 0, bd = 1e12;
    for (let i = 0; i < HUB_S.length; i++) { const d = Math.abs(HUB_S[i] - s); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  Hw.frame = function (s, out) {
    out = out || {};
    const f = s / STEP;
    let i = Math.floor(f);
    i = KT.clamp(i, 0, LAST - 1);
    const t = f - i; // beyond the ends this runs on along the end direction
    const dx = PX[i + 1] - PX[i], dz = PZ[i + 1] - PZ[i], l = Math.hypot(dx, dz) || 1;
    // blend the direction with the neighbouring piece for smooth headings
    const j = t < 0.5 ? Math.max(0, i - 1) : Math.min(LAST - 1, i + 1);
    const ex = PX[j + 1] - PX[j], ez = PZ[j + 1] - PZ[j], el = Math.hypot(ex, ez) || 1;
    const b = (t >= 0 && t <= 1) ? Math.abs(t - 0.5) : 0;
    let fx = (dx / l) * (1 - b) + (ex / el) * b, fz = (dz / l) * (1 - b) + (ez / el) * b;
    const fl = Math.hypot(fx, fz) || 1;
    out.x = PX[i] + dx * t; out.z = PZ[i] + dz * t; out.y = roadY(s);
    out.fx = fx / fl; out.fz = fz / fl;  // forward (towards Kasaragod)
    out.rx = -out.fz; out.rz = out.fx;    // right-hand side
    out.heading = Math.atan2(out.fx, out.fz);
    return out;
  };
  // Nearest point on the road. Coarse samples near each 100 m cell are
  // worked out once, then the closest one is refined.
  const CSTEP = 10, CCELL = 100, cand = new Map();
  function candidates(cx, cz) {
    const key = cx * 100003 + cz;
    let c = cand.get(key);
    if (c) return c;
    const x = (cx + 0.5) * CCELL, z = (cz + 0.5) * CCELL;
    let dmin = 1e12;
    const ds = [];
    for (let i = 0; i <= LAST; i += CSTEP) { const d = Math.hypot(PX[i] - x, PZ[i] - z); ds.push(d); if (d < dmin) dmin = d; }
    const lim = dmin + CCELL * 1.5 + CSTEP * STEP;
    c = [];
    ds.forEach((d, k) => { if (d <= lim) c.push(k * CSTEP); });
    if (cand.size > 60000) cand.clear();
    cand.set(key, c);
    return c;
  }
  const _fr = {};
  Hw.project = function (x, z) {
    const c = candidates(Math.floor(x / CCELL), Math.floor(z / CCELL));
    let bi = 0, bd = 1e18;
    for (let k = 0; k < c.length; k++) {
      const i = c[k], dx = PX[i] - x, dz = PZ[i] - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    for (let i = Math.max(0, bi - CSTEP); i <= Math.min(LAST, bi + CSTEP); i++) {
      const dx = PX[i] - x, dz = PZ[i] - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    let s = bi * STEP;
    for (let it = 0; it < 3; it++) {
      Hw.frame(s, _fr);
      const ds = (x - _fr.x) * _fr.fx + (z - _fr.z) * _fr.fz;
      s += (bi > 0 && bi < LAST) ? KT.clamp(ds, -STEP * 1.5, STEP * 1.5) : ds;
    }
    Hw.frame(s, _fr);
    return { s, lat: (x - _fr.x) * _fr.rx + (z - _fr.z) * _fr.rz };
  };
  Hw.at = function (s, lat, out) {
    const f = Hw.frame(s);
    out = out || new T.Vector3();
    return out.set(f.x + f.rx * lat, 0, f.z + f.rz * lat);
  };

  // rivers cross the road half-way between district centres, at right angles
  const RIVERS = [];
  for (let i = 0; i < 13; i++) {
    const a = HUB_S[i], b = HUB_S[i + 1];
    RIVERS.push({ s: Math.round((a + b) / 2 + ((i * 37) % 120) - 60) });
  }
  RIVERS.forEach((r) => {
    const f = Hw.frame(r.s);
    Object.assign(r, { y: roadY(r.s) - 5, cx: f.x, cz: f.z, fx: f.fx, fz: f.fz, rx: f.rx, rz: f.rz });
  });
  // the real rivers the highway crosses between each pair of districts
  ['Ithikkara', 'Kallada', 'Achankovil', 'Meenachil', 'Manimala', 'Periyar', 'Chalakudy', 'Bharathapuzha', 'Thoothapuzha', 'Chaliyar', 'Kuttiyadi', 'Valapattanam', 'Chandragiri']
    .forEach((n, i) => { if (RIVERS[i]) RIVERS[i].name = n + (n.endsWith('puzha') ? '' : ' River'); });
  Hw.RIVERS = RIVERS;
  const RIVER_HALF = 700; // the river runs this far either side of the bridge
  // a river's own axes: u across the road, v along it; the river winds in v
  const riverV = (r, u) => 30 * Math.sin(u / 90 + r.s);
  function riverLocal(r, x, z) {
    const dx = x - r.cx, dz = z - r.cz;
    const u = dx * r.rx + dz * r.rz, v = dx * r.fx + dz * r.fz;
    return { u, dv: v - riverV(r, u) };
  }
  const riverWorld = (r, u, dv) => { const v = riverV(r, u) + dv; return { x: r.cx + r.rx * u + r.fx * v, z: r.cz + r.rz * u + r.fz * v }; };

  // ------------------------------------------------------------- terrain
  Hw.height = function (x, z) {
    const p = Hw.project(x, z);
    const s = p.s, lat = p.lat;
    let h = 4 + KT.fbm(x * 0.004 + 11, z * 0.004, 4) * 10 + roadY(s) * 0.4;
    // Western Ghats rising inland, low coastal plain towards the sea
    const gh = Hw.ghats(x, z);
    h += gh * (25 + 30 * Math.max(0, KT.fbm(x * 0.003, z * 0.003, 3)));
    h -= (1 - KT.smoothstep(0, 900, x - Hw.coastX(z))) * 3;
    // road embankment
    const w = 1 - KT.smoothstep(8, 30 + 30 * gh, Math.abs(lat));
    h = KT.lerp(h, roadY(s) - 0.2, w);
    // flat ground around each district centre
    const hi = Hw.hubIndexAt(s);
    const hs = Hw.hubS(hi);
    if (Math.abs(s - hs) < 330) {
      const d = Math.hypot(s - hs, lat);
      h = KT.lerp(h, roadY(hs) - 0.2, 1 - KT.smoothstep(235, 310, d));
    }
    // river valleys
    for (let i = 0; i < RIVERS.length; i++) {
      const r = RIVERS[i];
      if (Math.abs(x - r.cx) > RIVER_HALF + 60 || Math.abs(z - r.cz) > RIVER_HALF + 60) continue;
      const q = riverLocal(r, x, z);
      if (Math.abs(q.u) > RIVER_HALF + 20) continue;
      const carve = 1 - KT.smoothstep(16, 50, Math.abs(q.dv));
      if (carve > 0) h = KT.lerp(h, r.y - 2.5, carve);
    }
    return h;
  };
  Hw.waterLevelAt = function (x, z) {
    for (let i = 0; i < RIVERS.length; i++) {
      const r = RIVERS[i];
      if (Math.abs(x - r.cx) > RIVER_HALF + 60 || Math.abs(z - r.cz) > RIVER_HALF + 60) continue;
      const q = riverLocal(r, x, z);
      if (Math.abs(q.u) < RIVER_HALF && Math.abs(q.dv) < 40) return r.y;
    }
    return -1e9;
  };

  // ground under a point: terrain, the road deck (also over bridges) or a platform
  Hw.groundY = function (x, z, curY) {
    const p = Hw.project(x, z);
    let y = Hw.height(x, z);
    if (Math.abs(p.lat) < ROAD_HALF + 0.6) y = Math.max(y, roadY(p.s) + 0.06);
    else if (Math.abs(p.lat) > FOOT0 && Math.abs(p.lat) < FOOT1) {
      const hi = Hw.hubIndexAt(p.s), hub = Hw.hubs[hi];
      if (hub && hub.footpaths && hub.footpaths.some((g) => g[0] <= p.s - hub.s && p.s - hub.s <= g[1] && Math.sign(p.lat) === g[2])) y = Math.max(y, roadY(p.s) + 0.14);
    }
    return { y, onPlatform: false };
  };
  Hw.isWater = function (x, z) { return Hw.groundY(x, z).y < Hw.waterLevelAt(x, z) - 0.3; };
  Hw.deepWater = (x, z, gy) => gy < Hw.waterLevelAt(x, z) - 0.6;

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
  // back onto the nearest lane, facing the way the vehicle was heading
  // (traffic keeps left: northbound on the west lane)
  Hw.recoverSpot = function (pos, heading) {
    let sAt = Hw.project(pos.x, pos.z).s;
    RIVERS.forEach((r) => { if (Math.abs(sAt - r.s) < 70) sAt = r.s + (sAt < r.s ? -70 : 70); });
    sAt = KT.clamp(sAt, 60, Hw.length() - 60);
    const f = Hw.frame(sAt);
    const north = Math.cos(heading - f.heading) >= 0;
    const q = Hw.at(sAt, north ? -2.6 : 2.6);
    return { x: q.x, z: q.z, heading: north ? f.heading : f.heading + Math.PI };
  };
  Hw.bounds = { minX: -1e6, maxX: 1e6, minZ: -1e6, maxZ: 1e6 };
  Hw.agentColliders = function (pos) {
    return Hw.npcs.filter((w) => w.obj.visible && Math.abs(w.obj.position.x - pos.x) < 6 && Math.abs(w.obj.position.z - pos.z) < 6)
      .map((w) => ({ type: 'circle', x: w.obj.position.x, z: w.obj.position.z, r: 0.35 }))
      .concat(KT.Traffic.highwayColliders(pos, 10), KT.Vehicle.boxes('highway', null), KT.Townfolk.colliders(pos));
  };

  // ------------------------------------------------------------ materials
  let mats = null;
  function makeMaterials() {
    // Asphalt: speckled aggregate, darker tyre tracks in each lane, patched
    // repairs, hairline cracks and oil stains, with matching bump detail.
    const asphalt = (function () {
      const W = 512, H = 1024, rng = KT.makeRng(1234);
      const c = document.createElement('canvas'), b = document.createElement('canvas');
      c.width = b.width = W; c.height = b.height = H;
      const g = c.getContext('2d'), gb = b.getContext('2d');
      g.fillStyle = '#4a4c4f'; g.fillRect(0, 0, W, H);
      gb.fillStyle = '#808080'; gb.fillRect(0, 0, W, H);
      // tyre tracks: two per lane, smooth and a little darker
      [0.17, 0.34, 0.66, 0.83].forEach((u) => {
        const gr = g.createLinearGradient(u * W - 26, 0, u * W + 26, 0);
        gr.addColorStop(0, 'rgba(20,20,22,0)'); gr.addColorStop(0.5, 'rgba(20,20,22,0.22)'); gr.addColorStop(1, 'rgba(20,20,22,0)');
        g.fillStyle = gr; g.fillRect(u * W - 26, 0, 52, H);
      });
      // patches of newer, darker asphalt
      for (let i = 0; i < 2; i++) {
        const x = rng() * (W - 140) + 40, y = rng() * (H - 200), w = 40 + rng() * 60, h = 50 + rng() * 90;
        g.fillStyle = 'rgba(30,31,33,0.18)'; g.fillRect(x, y, w, h);
        gb.strokeStyle = '#747474'; gb.lineWidth = 1; gb.strokeRect(x, y, w, h);
      }
      // speckle (aggregate)
      const img = g.getImageData(0, 0, W, H), bimg = gb.getImageData(0, 0, W, H);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (rng() - 0.5) * 34 + (rng() < 0.02 ? 30 : 0);
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
        const bn = 128 + (rng() - 0.5) * 60;
        bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = Math.min(bimg.data[i], bn);
      }
      g.putImageData(img, 0, 0); gb.putImageData(bimg, 0, 0);
      // hairline cracks
      g.strokeStyle = 'rgba(25,25,27,0.28)'; gb.strokeStyle = '#5a5a5a';
      for (let i = 0; i < 9; i++) {
        let x = rng() * W, y = rng() * H;
        g.lineWidth = gb.lineWidth = 0.8 + rng() * 0.8;
        g.beginPath(); gb.beginPath(); g.moveTo(x, y); gb.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += (rng() - 0.5) * 40; y += 10 + rng() * 26; g.lineTo(x, y); gb.lineTo(x, y); }
        g.stroke(); gb.stroke();
      }
      // oil stains down the middle of each lane
      for (let i = 0; i < 6; i++) {
        const x = (rng() < 0.5 ? 0.25 : 0.75) * W + (rng() - 0.5) * 40, y = rng() * H, r = 10 + rng() * 22;
        const gr = g.createRadialGradient(x, y, 1, x, y, r);
        gr.addColorStop(0, 'rgba(12,12,14,0.5)'); gr.addColorStop(1, 'rgba(12,12,14,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // painted lines, slightly worn
      g.fillStyle = '#eeeeea';
      g.fillRect(16, 0, 14, H); g.fillRect(W - 30, 0, 14, H);
      g.fillRect(W / 2 - 8, 0, 16, H * 0.58);
      gb.fillStyle = '#9a9a9a';
      gb.fillRect(16, 0, 14, H); gb.fillRect(W - 30, 0, 14, H); gb.fillRect(W / 2 - 8, 0, 16, H * 0.58);
      g.fillStyle = 'rgba(74,76,79,0.35)';
      for (let i = 0; i < 40; i++) g.fillRect([16, W - 30, W / 2 - 8][i % 3] + rng() * 12, rng() * H, 2 + rng() * 5, 2 + rng() * 8);
      const t = new T.CanvasTexture(c), tb = new T.CanvasTexture(b);
      [t, tb].forEach((x) => { x.wrapS = x.wrapT = T.RepeatWrapping; x.anisotropy = KT.maxAnisotropy; });
      t.encoding = T.sRGBEncoding;
      t.userData = { bump: tb };
      return t;
    })();
    const waterN = KT.tex('water_normal', 6, 6, true);
    mats = {
      terrain: terrainMaterial(),
      road: new T.MeshStandardMaterial({ map: asphalt, bumpMap: asphalt.userData.bump, bumpScale: 0.6, roughness: 0.82 }),
      water: new T.MeshStandardMaterial({ color: 0x2a7f8a, roughness: 0.12, metalness: 0.1, normalMap: waterN, normalScale: new T.Vector2(0.6, 0.6), transparent: true, opacity: 0.92 }),
      concrete: KT.mat('concrete', { color: 0xc9c6bd, roughness: 0.9 }),
      kerb: KT.mat('kerbStripe', { color: 0xf2f2ee, roughness: 0.6 }),
      sand: KT.mat('hubSand', { map: KT.tex('sand', 1, 1), color: 0xffffff }, 0.15),
      kerbWhite: KT.mat('kerbPaintWhite', { color: 0xeeeeea, roughness: 0.7 }),
      kerbBlack: KT.mat('kerbPaintBlack', { color: 0x1d1d1f, roughness: 0.7 }),
      catEye: KT.mat('catEye', { color: 0xffd36a, emissive: 0xffb020, emissiveIntensity: 0.4, roughness: 0.3 }),
      paver: paverMaterial()
    };
    mats.water.userData.normal = waterN;
  }

  // Interlocking concrete paver blocks for the town footpaths.
  function paverMaterial() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d'), rng = KT.makeRng(55);
    g.fillStyle = '#8f8a82'; g.fillRect(0, 0, 256, 256);
    const cols = ['#b8b2a8', '#aaa49a', '#c2bcb2', '#b0544a', '#a14a40'];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const ox = (y % 2) * 32;
      g.fillStyle = cols[(x + y * 3) % 7 === 0 ? 3 + (x % 2) : Math.floor(rng() * 3)];
      g.fillRect(((x * 64 + ox) % 256) + 2, y * 32 + 2, 60, 28);
      if (x * 64 + ox + 64 > 256) g.fillRect(2 - (256 - x * 64 - ox) + 0, y * 32 + 2, 64 - (256 - x * 64 - ox) - 4, 28);
    }
    const img = g.getImageData(0, 0, 256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const n = (rng() - 0.5) * 18; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = KT.maxAnisotropy;
    return new T.MeshStandardMaterial({ map: t, roughness: 0.85, side: T.DoubleSide });
  }

  // Terrain: grass sampled at two rotated scales (no visible tiling), large
  // scale colour variation, close-up detail, patches of bare earth and red
  // laterite showing on the slopes; the vertex colours add paddy, ghats,
  // shoulders and river banks.
  function terrainMaterial() {
    const m = new T.MeshStandardMaterial({ vertexColors: true, map: KT.tex('grass', 1, 1), roughness: 0.95 });
    const uniforms = { tMud: { value: KT.tex('mud', 1, 1) }, tLat: { value: KT.tex('laterite', 1, 1) } };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = 'uniform sampler2D tMud, tLat;\n' + shader.fragmentShader.replace('#include <map_fragment>', [
        'vec2 tw = vUv;',
        'vec3 g1 = texture2D(map, tw).rgb;',
        'vec3 g2 = texture2D(map, mat2(0.8, -0.6, 0.6, 0.8) * tw * 0.41 + 0.31).rgb;',
        'float macro = texture2D(map, tw * 0.031).g;',
        'float det = texture2D(map, tw * 3.3).g;',
        'vec3 tc = mix(g1, g2, 0.45) * mix(0.78, 1.22, smoothstep(0.2, 0.8, macro)) * mix(0.86, 1.14, det);',
        'float dirt = smoothstep(0.6, 0.74, texture2D(tMud, tw * 0.083 + 0.5).r);',
        'tc = mix(tc, texture2D(tMud, tw * 1.3).rgb * 1.15, dirt * 0.6);',
        'vec3 wn = inverseTransformDirection(normalize(vNormal), viewMatrix);',
        'float slope = smoothstep(0.22, 0.48, 1.0 - wn.y);',
        'tc = mix(tc, texture2D(tLat, tw * 0.9).rgb * vec3(1.05, 0.85, 0.75), slope);',
        'diffuseColor.rgb *= tc;'
      ].join('\n'));
    };
    m.customProgramCacheKey = () => 'hwTerrain2';
    return m;
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
    // near ground cover and more kinds of trees
    pools.tuft = new Pool(scene, Models.grassClump(), 4200, false);
    pools.flower = new Pool(scene, Models.flowerPatch(), 700, false);
    pools.fern = new Pool(scene, Models.fern(), 700, false);
    pools.areca = new Pool(scene, Models.arecaPalm(), 400, true);
    pools.jack = new Pool(scene, Models.jackfruitTree(), 160, true);
    pools.forest = new Pool(scene, Models.forestTree(7), 400, true);
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
    // the towns along the way have more shops
    const town = Hw.WAYPOINTS.some((w) => Math.abs(w.s - (s0 + SEG_LEN / 2)) < 260);
    for (let c = 0; c < (town ? 5 : 2); c++) {
      if (rng() > (town ? 0.85 : 0.42)) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const n = 2 + Math.floor(rng() * 3);
      const start = s0 + 15 + rng() * (SEG_LEN - 30 - n * 4.8);
      const end = start + n * 4.8;
      const hi = Hw.hubIndexAt(start);
      if (hi >= 0 && hi < KT.DISTRICTS.length && Math.abs(start - Hw.hubS(hi)) < 330) continue;
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
    const gh = Hw.ghats(x, z);
    if (gh > 0) _c.lerp(new T.Color(0.42, 0.62, 0.36), gh * KT.smoothstep(20, 120, Math.abs(lat))); // darker ghats
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
      const hi = Hw.hubIndexAt(p.s);
      if (hi >= 0 && hi < KT.DISTRICTS.length && Math.hypot(p.s - Hw.hubS(hi), p.lat) < 260) return null;
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
      if (Math.abs(p.lat) > 40 && rng() < 0.65 * Hw.ghats(x, z)) add('forest', x, z, rng() * 6.28, 0.8 + rng() * 0.5, { type: 'circle', r: 0.6 });
      else if (r < 0.5) add('palm', x, z, rng() * 6.28, 0.85 + rng() * 0.4, { type: 'circle', r: 0.4 });
      else if (r < 0.62) add(rng() < 0.75 ? 'areca' : 'jack', x, z, rng() * 6.28, 0.85 + rng() * 0.3, { type: 'circle', r: 0.5 });
      else if (r < 0.8) add('banana', x, z, rng() * 6.28, 0.9 + rng() * 0.3, { type: 'circle', r: 0.35 });
      else if (r < 0.88) add('mango', x, z, rng() * 6.28, 0.9 + rng() * 0.3, { type: 'circle', r: 0.7 });
      else if (r < 0.95) add('bush', x, z, rng() * 6.28, 1, null);
      else add('rock', x, z, rng() * 6.28, 0.8 + rng(), { type: 'circle', r: 0.9 });
    }
    // a few homes facing the road
    for (let i = 0; i < 2; i++) {
      if (rng() < 0.45) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const sLoc = Hw.project(x0 + rng() * TILE, z0 + rng() * TILE).s;
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
    // painted kerbs along the open road (towns have footpaths instead) and
    // reflectors down the centre line
    const kerbW = [], kerbB = [], eyes = [];
    const inTown = (s) => { const hi = Hw.hubIndexAt(s); return hi >= 0 && hi < KT.DISTRICTS.length && Math.abs(s - Hw.hubS(hi)) < 205; };
    const kerbGeo = G.box(0.22, 0.34, 0.96), eyeGeo = G.box(0.14, 0.04, 0.2);
    for (let s = Math.ceil(s0); s < s1; s += 1) {
      if (onBridge(s)) continue;
      const f = Hw.frame(s), y = roadY(s);
      if (!inTown(s)) {
        [-1, 1].forEach((sd) => {
          const q = Hw.at(s, sd * (ROAD_HALF + 0.1));
          (s % 2 ? kerbW : kerbB).push({ geometry: kerbGeo, matrix: new T.Matrix4().compose(new T.Vector3(q.x, y - 0.03, q.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), f.heading), new T.Vector3(1, 1, 1)) });
        });
      }
      if (s % 9 === 0) eyes.push({ geometry: eyeGeo, matrix: new T.Matrix4().compose(new T.Vector3(f.x, y + 0.07, f.z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), f.heading), new T.Vector3(1, 1, 1)) });
    }
    [[kerbW, mats.kerbWhite], [kerbB, mats.kerbBlack], [eyes, mats.catEye]].forEach(([list, mat]) => {
      if (!list.length) return;
      const m = new T.Mesh(KT.mergeGeometries(list), mat);
      m.receiveShadow = true;
      group.add(m);
    });
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
    // name boards where the road enters each town on the way
    Hw.WAYPOINTS.forEach((w) => {
      [-1, 1].forEach((e) => {
        const sb = w.s + e * 150;
        if (sb < s0 || sb >= s1 || onBridge(sb)) return;
        const q = Hw.at(sb, e < 0 ? -(ROAD_HALF + 2.6) : ROAD_HALF + 2.6);
        const board = Models.signboard([w.name, w.road]);
        board.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
        board.rotation.y = Hw.frame(sb).heading + (e < 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 + 0.5);
        board.scale.setScalar(1.3);
        group.add(board);
      });
    });
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
    for (let d = -span / 2 - 16; d <= span / 2 + 16; d += 4) {
      const s = r.s + d;
      const f = Hw.frame(s);
      const y = roadY(s) + 0.06;
      [-1, 1].forEach((side) => {
        const q = Hw.at(s, side * (ROAD_HALF + 0.3));
        part(g, G.box(0.25, 0.9, 4.1), mats.concrete, q.x, y + 0.45, q.z, 0, f.heading, 0);
        part(g, G.box(0.3, 0.12, 4.1), mats.kerb, q.x, y + 0.95, q.z, 0, f.heading, 0);
      });
      if (Math.abs(d) <= span / 2 + 2) part(g, G.box(ROAD_HALF * 2 + 0.6, 0.8, 4.1), mats.concrete, f.x, y - 0.46, f.z, 0, f.heading, 0);
      if (Math.abs(d % 20) < 0.01 && Math.abs(d) < span / 2 - 5) {
        [-1, 1].forEach((side) => {
          const q = Hw.at(s, side * 3.5);
          part(g, G.cyl(0.6, 0.7, 10, 12), mats.concrete, q.x, y - 5, q.z);
        });
      }
    }
    const baked = KT.bake(g);
    // the river itself
    const water = new T.Mesh(new T.PlaneGeometry(1400, 70, 70, 1), mats.water);
    water.rotation.x = -Math.PI / 2;
    const P = water.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const q = riverWorld(r, P.getX(i), P.getY(i));
      P.setXYZ(i, q.x - r.cx, -(q.z - r.cz), 0); // turned flat below (plane y = -z); (u, v) keeps the winding, so it faces up
    }
    water.geometry.computeVertexNormals();
    water.geometry.computeBoundingSphere();
    water.position.set(r.cx, r.y, r.cz);
    baked.add(water);
    // river name boards at both ends of the bridge, and a country boat
    if (r.name) {
      [-1, 1].forEach((e) => {
        const sb = Hw.at(r.s + e * (span / 2 + 20), -(ROAD_HALF + 2.2));
        const board = Models.signboard([r.name, 'പുഴ • River']);
        board.position.set(sb.x, Hw.groundY(sb.x, sb.z).y, sb.z);
        board.rotation.y = Hw.frame(r.s).heading + Math.PI / 2 - e * 0.5; // angled towards the traffic coming up to it
        board.scale.setScalar(1.3);
        baked.add(board);
      });
    }
    const boatU = 38 * (r.s % 2 ? 1 : -1);
    const boat = Models.canoe();
    const b0 = riverWorld(r, boatU, 3), b1 = riverWorld(r, boatU + 1, 3);
    boat.position.set(b0.x, r.y + 0.05, b0.z);
    boat.rotation.y = Math.atan2(b1.x - b0.x, b1.z - b0.z);
    baked.add(boat);
    // bridge railings block walking off the deck
    if (!Hw.tileColliders.has('bridge' + r.s)) {
      Hw.tileColliders.add('bridge' + r.s);
      for (let d = -span / 2 - 16; d <= span / 2 + 16; d += 8) {
        const s = r.s + d, f = Hw.frame(s);
        [-1, 1].forEach((side) => { const q = Hw.at(s, side * (ROAD_HALF + 0.35)); Hw.addCollider({ type: 'box', x: q.x, z: q.z, hw: 0.2, hd: 4.2, rot: f.heading }); });
      }
    }
    return baked;
  }

  // ---------------------------------------------------- district hubs
  function hubPlace(hub, obj, along, lat, rotOff, opts) { return placeOnHub(hub, obj, along, lat, rotOff, opts); }
  function placeOnHub(hub, obj, along, lat, rotOff, opts) {
    const f = Hw.frame(hub.s + along);
    const q = Hw.at(hub.s + along, lat);
    const rot = (opts && opts.absRot !== undefined) ? opts.absRot : f.heading + (rotOff || 0);
    obj.position.set(q.x, (opts && opts.y !== undefined) ? opts.y : Hw.groundY(q.x, q.z).y, q.z);
    obj.rotation.y = rot;
    hub.group.add(obj);
    if (opts && opts.colliders === false) return obj;
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
    hubPlace(hub, Models.districtGate(d), -190, 0, Math.PI);
    hubPlace(hub, Models.districtGate(d), 190, 0, 0);
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
    for (let a = -140; a <= 140; a += 20) [-1, 1].forEach((sd) => { if (sd < 0 && (a === 0 || a === 20)) return; hubPlace(hub, Models.lampPost(), a, sd * 8.5, sd > 0 ? 0 : Math.PI); });
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
    buildSights(hub);
    const rng = KT.makeRng(hub.index * 991 + 7);
    for (let i = 0; i < 40; i++) {
      const along = (rng() - 0.5) * 440, lat = (rng() < 0.5 ? -1 : 1) * (60 + rng() * 140);
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
      const along = [-11, -8, 8.5, 11.5][i], lat = -12.6 - (i % 2) * 0.9;
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
    buildTown(hub);
    mergeHub(hub);
    KT.Townfolk.populate(hub);
    hub.built = true;
  }

  // ------------------------------------------- tourist attractions
  // Each district's extra attractions stand in fixed slots around its
  // centre (along the road, lateral); the main one is the landmark.
  const SIGHT_SLOTS = [{ along: -70, lat: 80 }, { along: 60, lat: -84 }, { along: 120, lat: 86 }, { along: -98, lat: -82 }, { along: -178, lat: 72 }, { along: 178, lat: -80 }, { along: -190, lat: -90 }];
  const MAIN_SPOT = { along: 20, lat: 72 };
  const SIGHT_R = { church: 16, mosque: 14, fort: 24, kathakali: 12, wildlife: 24, spice: 18, hillview: 18, elephantCamp: 18, museum: 15, cliff: 28, jatayu: 16, lake: 24, snakeboat: 24, beachLight: 24, birds: 22, tea: 20, waterfall: 22, shrine: 16, garden: 22, football: 24, dam: 30, theyyam: 8, beach: 28, lakeTemple: 18 };
  let sightCache = null;
  // all attractions with their positions, for the maps and discovery
  Hw.sightList = function () {
    if (sightCache) return sightCache;
    sightCache = [];
    KT.DISTRICTS.forEach((d, i) => {
      let k = 0;
      d.sights.forEach((sg, j) => {
        const slot = sg.kind === 'main' ? MAIN_SPOT : SIGHT_SLOTS[k++];
        if (!slot) return;
        const q = Hw.at(Hw.hubS(i) + slot.along, slot.lat);
        sightCache.push({ id: d.id + ':' + j, name: sg.name, icon: sg.icon, facts: sg.facts, kind: sg.kind, district: d, hub: i, along: slot.along, lat: slot.lat, x: q.x, z: q.z, r: sg.kind === 'main' ? 30 : (SIGHT_R[sg.kind] || 20) });
      });
    });
    return sightCache;
  };

  function sightBoard(hub, sg) {
    const side = Math.sign(sg.lat);
    const lat = sg.lat - side * (sg.r + 4);
    const board = hubPlace(hub, Models.signboard([sg.name.length > 22 ? sg.name.split(' ').slice(0, 3).join(' ') : sg.name, sg.district.name]), sg.along, lat, faceRoad(lat));
    Hw.interactables.push({ label: 'About ' + sg.name, radius: 3, pos: () => board.position, action: () => KT.Game.readSight(sg) });
    Hw.addCollider({ type: 'circle', x: board.position.x, z: board.position.z, r: 0.5 });
  }
  function sand(hub, along, lat, r) {
    const m = new T.Mesh(new T.CircleGeometry(r, 36), mats.sand);
    m.rotation.x = -Math.PI / 2;
    const q = Hw.at(hub.s + along, lat);
    m.position.set(q.x, Hw.groundY(q.x, q.z).y + 0.04, q.z);
    m.receiveShadow = true;
    hub.group.add(m);
  }
  function buildSights(hub) {
    const heading = Hw.frame(hub.s).heading;
    const hubPlace = (h, obj, a, l, r, o) => {
      const placed = placeOnHub(h, obj, a, l, r, o);
      if (obj.userData.actors) h.actors = (h.actors || []).concat(obj.userData.actors);
      return placed;
    };
    Hw.sightList().filter((sg) => sg.hub === hub.index).forEach((sg) => {
      sightBoard(hub, sg);
      if (sg.kind === 'main') return;
      const a = sg.along, l = sg.lat, side = Math.sign(l), rot = faceRoad(l);
      const def = hub.district.sights.find((x) => x.name === sg.name) || {};
      const wy = (al, la) => { const q = Hw.at(hub.s + al, la); return Hw.groundY(q.x, q.z).y; };
      switch (sg.kind) {
        case 'museum': hubPlace(hub, Models.heritageHall(def.colors), a, l, rot); break;
        case 'cliff':
          sand(hub, a, l - side * 6, 26);
          hubPlace(hub, Models.cliff(), a, l + side * 12, rot);
          hubPlace(hub, Models.beachSet(5), a, l - side * 10, rot, { colliders: false });
          break;
        case 'jatayu': hubPlace(hub, Models.jatayu(), a, l + side * 3, rot); break;
        case 'lake': {
          const w = waterDisc(hub, a, l, 24);
          hubPlace(hub, Models.houseboat(), a - 4, l + side * 4, 0, { absRot: heading + 0.4, y: w.position.y + 0.05 });
          [[-8, -12], [10, -6]].forEach(([x, z]) => hubPlace(hub, Models.canoe(), a + x, l + side * z, 0, { absRot: heading - 0.6, y: w.position.y + 0.02 }));
          if (Models.motorBoat) hubPlace(hub, Models.motorBoat(), a + 9, l + side * 8, 0, { absRot: heading + 1.2, y: w.position.y + 0.02, colliders: false });
          for (let k = 0; k < 3; k++) hubPlace(hub, Models.jettySection(), a, l - side * (20 - k * 3), 0, { absRot: heading + Math.PI / 2, y: w.position.y + 0.3, colliders: false });
          break;
        }
        case 'snakeboat': {
          const w = waterDisc(hub, a, l, 24);
          [-5, 5].forEach((z) => hubPlace(hub, Models.snakeBoat(), a, l + side * z, 0, { absRot: heading + Math.PI / 2, y: w.position.y + 0.02 }));
          hubPlace(hub, Models.racePavilion(), a, l - side * 29, rot);
          break;
        }
        case 'beachLight': {
          sand(hub, a, l, 26);
          const lh = hubPlace(hub, Models.lighthouse(), a + 8, l + side * 12, rot);
          hub.beams = (hub.beams || []).concat([lh.userData.beam]);
          hubPlace(hub, Models.beachSet(4), a - 10, l - side * 6, rot, { colliders: false });
          hubPlace(hub, Models.pier(26), a - 14, l + side * 8, rot, { colliders: false });
          break;
        }
        case 'birds': {
          const w = waterDisc(hub, a, l, 18);
          for (let i = 0; i < 7; i++) {
            const ang = (i / 7) * Math.PI * 2;
            const al = a + Math.cos(ang) * 21, la = l + Math.sin(ang) * 21;
            if (Math.abs(la) < Math.abs(l) - 14) continue; // keep the road side open
            hubPlace(hub, Models.mangrove(), al, la, ang);
          }
          for (let i = 0; i < 9; i++) {
            const ang = i * 0.7, rr = 19.5;
            const bird = i % 3 === 0 && Models.cormorant ? Models.cormorant() : Models.egret();
            hubPlace(hub, bird, a + Math.cos(ang) * rr, l + Math.sin(ang) * rr, ang, { colliders: false, y: wy(a + Math.cos(ang) * rr, l + Math.sin(ang) * rr) });
          }
          hubPlace(hub, Models.boardwalk(14), a - 6, l - side * 15, 0, { absRot: heading + Math.PI / 2, y: w.position.y, colliders: false });
          hubPlace(hub, Models.watchTower(), a + 16, l - side * 14, rot);
          void w;
          break;
        }
        case 'tea': hubPlace(hub, Models.teaHill(), a, l, rot); break;
        case 'waterfall': {
          const fall = hubPlace(hub, Models.waterfall(16), a, l + side * 6, rot);
          hub.flows = (hub.flows || []).concat([fall.userData.flow]);
          waterDisc(hub, a, l - side * 0.5, 9);
          break;
        }
        case 'shrine': {
          hubPlace(hub, Models.temple(), a, l + side * 2, rot);
          [-7, 7].forEach((x) => {
            const el = KT.skinify(Models.elephant(true, Math.abs(x)));
            hubPlace(hub, el, a + x, l - side * 12, rot);
            hub.elephants = (hub.elephants || []).concat([el]);
          });
          [-12, 12].forEach((x) => hubPlace(hub, Models.lampTower(5), a + x, l - side * 16, rot));
          break;
        }
        case 'garden':
          hubPlace(hub, Models.garden(), a, l, rot);
          hubPlace(hub, Models.earthDam(), a, l + side * 30, 0, { absRot: heading });
          break;
        case 'football': hubPlace(hub, Models.footballGround(), a, l, 0, { absRot: heading }); break;
        case 'dam': {
          hubPlace(hub, Models.earthDam(), a, l, 0, { absRot: heading });
          const w = waterDisc(hub, a, l + side * 22, 16);
          w.position.y += 6;
          [[-5, 2], [6, -3]].forEach(([x, z]) => { const r = Models.rock(3); r.scale.setScalar(1.6); hubPlace(hub, r, a + x, l + side * (22 + z), 0, { y: w.position.y - 0.5, colliders: false }); });
          break;
        }
        case 'theyyam': hubPlace(hub, Models.theyyam(), a, l, rot); break;
        case 'beach': {
          sand(hub, a, l, 28);
          hubPlace(hub, Models.beachSet(5), a, l + side * 6, rot, { colliders: false });
          if (Models.car) hubPlace(hub, Models.car(0x2c5fa8, 'suv'), a - 12, l - side * 8, 0, { absRot: heading + 0.3 });
          break;
        }
        case 'lakeTemple': {
          const w = waterDisc(hub, a, l, 17);
          hubPlace(hub, Models.lakeShrine(), a, l, rot, { y: w.position.y - 0.6 });
          break;
        }
        case 'church': {
          hubPlace(hub, Models.church(), a, l + side * 6, rot);
          [-9, 9].forEach((x, i) => hubPlace(hub, Models.coconutPalm(i + 30), a + x, l - side * 6, 0));
          break;
        }
        case 'mosque': hubPlace(hub, Models.mosque(), a, l, rot); break;
        case 'fort': hubPlace(hub, Models.fort(false), a, l, rot); break;
        case 'kathakali': {
          const st = hubPlace(hub, Models.kathakaliStage(), a, l + side * 3, rot);
          const dancer = Models.kathakaliDancer();
          hubPlace(hub, dancer, a, l + side * 3, rot, { y: st.position.y + (st.userData.stageY || 1.08) - 0.05, colliders: false });
          hub.actors = (hub.actors || []).concat([{ obj: dancer, state: 'dance' }]);
          // audience on mats in front of the stage
          for (let i = 0; i < 6; i++) {
            const ch = Models.character({ gender: i % 2 ? 'female' : 'male', outfit: i % 2 ? 'saree' : 'mundu', lite: 'far', acc: {} });
            hubPlace(hub, ch, a - 5 + (i % 3) * 5, l - side * (6 + Math.floor(i / 3) * 2.2), rot, { colliders: false });
          }
          break;
        }
        case 'wildlife': {
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2, rr = 15 + (i % 3) * 4;
            hubPlace(hub, Models.forestTree ? Models.forestTree(i + 5) : Models.mangoTree(), a + Math.cos(ang) * rr, l + Math.sin(ang) * rr * 0.8 + side * 6, ang);
          }
          const w = waterDisc(hub, a, l + side * 6, 9);
          [[-6, 1], [5, -2]].forEach(([x, z], i) => {
            const el = KT.skinify(Models.elephant(i === 0, 3 + i));
            hubPlace(hub, el, a + x, l + side * (6 + z) - side * 10, rot + 0.6 * (i ? 1 : -1), { colliders: false });
            hub.elephants = (hub.elephants || []).concat([el]);
          });
          if (Models.deer) [[8, 4], [10, 7], [-10, 9]].forEach(([x, z]) => hubPlace(hub, Models.deer(), a + x, l - side * z, rot + x * 0.1, { colliders: false }));
          hubPlace(hub, Models.watchTower(), a - 14, l - side * 10, rot);
          if (Models.car) hubPlace(hub, Models.car(0x3f6b2a, 'suv'), a + 14, l - side * 16, 0, { absRot: heading + 0.5 });
          void w;
          break;
        }
        case 'spice': hubPlace(hub, Models.spiceGarden(), a, l, rot); break;
        case 'hillview': hubPlace(hub, Models.hillView(), a, l + side * 2, rot); break;
        case 'elephantCamp': {
          hubPlace(hub, Models.elephantShelter(), a, l + side * 2, rot);
          [-6, 0, 6].forEach((x, i) => {
            const el = KT.skinify(Models.elephant(i !== 1, 2 + i));
            hubPlace(hub, el, a + x, l + side * 2, rot, { colliders: false });
            hub.elephants = (hub.elephants || []).concat([el]);
          });
          const mahout = Models.character({ gender: 'male', outfit: 'mundu', hair: 'short', lite: true, acc: {}, skin: 0x8d5a3b });
          hubPlace(hub, mahout, a + 3, l - side * 4, rot, { colliders: false });
          hub.actors = (hub.actors || []).concat([{ obj: mahout, state: 'idle' }]);
          for (let i = 0; i < 3; i++) Hw.addCollider({ type: 'circle', x: Hw.at(hub.s + a - 6 + i * 6, l + side * 2).x, z: Hw.at(hub.s + a - 6 + i * 6, l + side * 2).z, r: 2.2 });
          break;
        }
        default: break;
      }
    });
  }

  // --------------------------------------------------------- the town
  // A Kerala market town: up to three rows of multi-storey buildings along
  // about 300 m of the main road and three side streets, wherever the
  // centre has room. All the buildings of a town are merged into one model.
  function buildTown(hub) {
    const rng = KT.makeRng(hub.index * 577 + 3);
    const town = new T.Group();
    const pt = new T.Vector3();
    const fits = (along, lat, rotAbs, hw, hd) => {
      const c = Math.cos(rotAbs), sn = Math.sin(rotAbs);
      const q = Hw.at(hub.s + along, lat);
      const list = Hw.nearbyColliders(q.x, q.z, 16);
      for (let x = -hw; x <= hw + 0.01; x += hw) {
        for (let z = -hd; z <= hd + 0.01; z += hd) {
          pt.set(q.x + x * c + z * sn, 0, q.z - x * sn + z * c);
          if (KT.World.resolveList(pt, 1.0, list)) return false;
          if (Hw.waterLevelAt(pt.x, pt.z) > -1e8) return false;
        }
      }
      return true;
    };
    let n = 0;
    const put = (obj, along, lat, rotAbs) => {
      const q = Hw.at(hub.s + along, lat);
      obj.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
      obj.rotation.y = rotAbs;
      town.add(obj);
      const cs = Math.cos(rotAbs), sn = Math.sin(rotAbs);
      (obj.userData.colliders || []).forEach((c) => {
        const wx = q.x + c.x * cs + c.z * sn, wz = q.z - c.x * sn + c.z * cs;
        if (c.type === 'circle') Hw.addCollider({ type: 'circle', x: wx, z: wz, r: c.r });
        else Hw.addCollider({ type: 'box', x: wx, z: wz, hw: c.hw, hd: c.hd, rot: rotAbs });
      });
    };
    const place = (along, lat, rotOff) => {
      const rotAbs = Hw.frame(hub.s + along).heading + rotOff;
      if (!fits(along, lat, rotAbs, 3.9, 4.2)) return;
      put(Models.townBuilding(Math.floor(rng() * Models.TOWN_TYPES)), along, lat, rotAbs);
      n++;
    };
    // main road: a front row, a taller row behind it and a third row
    for (let al = -150; al <= 150; al += 8.4) {
      [-1, 1].forEach((sd) => {
        place(al + (rng() - 0.5), sd * 24.5, faceRoad(sd));
        if (rng() < 0.7) place(al + (rng() - 0.5) * 2, sd * 36.5, faceRoad(sd));
        if (rng() < 0.5) place(al + (rng() - 0.5) * 2, sd * 48.5, faceRoad(sd));
      });
    }
    // side streets with buildings facing them and street lamps
    [[-40, -1], [100, -1], [-120, 1]].forEach(([SA, side]) => {
      const len = 84;
      const heading = Hw.frame(hub.s + SA).heading;
      const geo = new T.PlaneGeometry(7, len);
      geo.rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 10);
      const street = new T.Mesh(geo, mats.road);
      const mid = Hw.at(hub.s + SA, side * (9 + len / 2));
      street.position.set(mid.x, Hw.groundY(mid.x, mid.z).y + 0.05, mid.z);
      street.rotation.y = heading + Math.PI / 2;
      street.receiveShadow = true;
      hub.group.add(street);
      for (let k = 31; k <= 86; k += 8.4) {
        place(SA - 9.2, side * k, 0);          // faces north, onto the street
        place(SA + 9.2, side * k, Math.PI);    // faces south
      }
      for (let k = 18; k <= 88; k += 14) {
        const at = SA + (k % 28 ? 4.4 : -4.4), lt = side * k;
        const q = Hw.at(hub.s + at, lt);
        if (!Hw.nearbyColliders(q.x, q.z, 1.5).length) put(Models.lampPost(), at, lt, heading + (k % 28 ? -Math.PI / 2 : Math.PI / 2));
      }
      // autos waiting at the corner
      if (Models.autoRickshaw) {
        [[SA - 2, 14], [SA + 2, 20]].forEach(([al, la], i) => { const q = Hw.at(hub.s + al, side * la); if (!Hw.nearbyColliders(q.x, q.z, 3).length) put(Models.autoRickshaw(), al, side * la, heading + Math.PI / 2 + i * Math.PI); });
      }
    });
    hub.group.add(KT.bake(town));
    hub.townSize = n;
    buildFootpaths(hub);
  }

  // Raised paver footpaths along the town's main road, with gaps for the
  // zebra crossing, the bus bay and the side streets.
  function buildFootpaths(hub) {
    const gaps = { '-1': [[Hw.CROSSING - 2.5, Hw.CROSSING + 2.5], [-6, 28], [-44.5, -35.5], [95.5, 104.5]], '1': [[Hw.CROSSING - 2.5, Hw.CROSSING + 2.5], [-124.5, -115.5]] };
    hub.footpaths = [];
    const pos = [], uv = [], idx = [];
    const strip = (a0, a1, sd) => {
      hub.footpaths.push([a0, a1, sd]);
      const base = pos.length / 3;
      let n = 0;
      for (let a = a0; a <= a1 + 0.01; a += 2) {
        const al = Math.min(a, a1), s = hub.s + al, y = roadY(s) + 0.14;
        const i0 = Hw.at(s, sd * FOOT0), i1 = Hw.at(s, sd * FOOT1);
        const yk = roadY(s) - 0.2;
        // the outer edge slopes down into the ground, so it never floats
        const i2 = Hw.at(s, sd * (FOOT1 + 0.7)), yg = Math.min(y - 0.05, Hw.height(i2.x, i2.z) - 0.06);
        // kerb face, top surface, outer slope
        pos.push(i0.x, yk, i0.z, i0.x, y, i0.z, i1.x, y, i1.z, i2.x, yg, i2.z);
        uv.push(al / 4, 0, al / 4, 0.06, al / 4, (FOOT1 - FOOT0) / 4, al / 4, (FOOT1 - FOOT0 + 0.7) / 4);
        if (n > 0) {
          const p = base + (n - 1) * 4, q = base + n * 4;
          const tri = sd > 0 ? [[p, q, p + 1], [p + 1, q, q + 1], [p + 1, q + 1, p + 2], [p + 2, q + 1, q + 2], [p + 2, q + 2, p + 3], [p + 3, q + 2, q + 3]]
            : [[p, p + 1, q], [p + 1, q + 1, q], [p + 1, p + 2, q + 1], [p + 2, q + 2, q + 1], [p + 2, p + 3, q + 2], [p + 3, q + 3, q + 2]];
          tri.forEach((t) => idx.push(...t));
        }
        n++;
      }
    };
    [-1, 1].forEach((sd) => {
      const gs = gaps[sd].slice().sort((a, b) => a[0] - b[0]);
      let a = -150;
      gs.forEach(([g0, g1]) => { if (g0 > a + 2) strip(a, g0, sd); a = Math.max(a, g1); });
      if (a < 148) strip(a, 150, sd);
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, mats.paver);
    m.receiveShadow = true;
    hub.group.add(m);
    // people already standing there step up onto the footpath
    Hw.npcs.forEach((w) => { if (w.obj.parent === hub.group) w.obj.position.y = Hw.groundY(w.obj.position.x, w.obj.position.z).y; });
  }

  // Merge every static object of a district centre into one model (far
  // fewer draw calls); animated or changing ones stay separate.
  function mergeHub(hub) {
    const still = new T.Group();
    hub.group.children.slice().forEach((c) => {
      let keep = false;
      c.traverse((o) => {
        const u = o.userData;
        if (u.rig || u.animate || u.beam || u.arm || u.lamps || u.flow || o.isSprite || o.isPoints || o.isLight || Array.isArray(o.material)) keep = true;
      });
      if (!keep) still.add(c);
    });
    if (still.children.length) hub.group.add(KT.bake(still));
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
    Hw.hemi = new T.HemisphereLight(0xd6ecff, 0x6b7a3c, 0.75);
    scene.add(Hw.hemi);
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
    if (changed || Math.abs(pr.s - Hw.lastS) > 60 || !Hw.lastPos || Math.hypot(pos.x - Hw.lastPos.x, pos.z - Hw.lastPos.z) > 50) refillPools(pos);
    return list.length;
  };

  const _v = new T.Vector3();
  function refillPools(pos) {
    Hw.lastS = Hw.project(pos.x, pos.z).s;
    Hw.lastPos = { x: pos.x, z: pos.z };
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
    groundCover(pos, lists);
    Object.keys(pools).forEach((k) => pools[k].set(lists[k]));
  }

  // Grass clumps, flowers and ferns on a fine jittered grid around the
  // player (the same plants always grow in the same places).
  const _gq = new T.Quaternion(), _gs = new T.Vector3(), _gp = new T.Vector3(), _up = new T.Vector3(0, 1, 0);
  const gcCache = new Map();
  function groundCover(pos, lists) {
    const CELL = 3.2, R = 115;
    const gx0 = Math.floor((pos.x - R) / CELL), gx1 = Math.floor((pos.x + R) / CELL);
    const gz0 = Math.floor((pos.z - R) / CELL), gz1 = Math.floor((pos.z + R) / CELL);
    const hash = (a, b, k) => { const h = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
    // each cell's plant is worked out once and cached while it stays near
    if (gcCache.size > 9000) gcCache.forEach((v, k) => { if (Math.hypot(v.x - pos.x, v.z - pos.z) > R + 40) gcCache.delete(k); });
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const ck = gx * 100003 + gz;
        const hit = gcCache.get(ck);
        if (hit) {
          if (hit.key && (hit.x - pos.x) * (hit.x - pos.x) + (hit.z - pos.z) * (hit.z - pos.z) <= R * R && lists[hit.key].length < pools[hit.key].cap) lists[hit.key].push(hit.m);
          continue;
        }
        const r0 = hash(gx, gz, 1);
        const x = (gx + hash(gx, gz, 2)) * CELL, z = (gz + hash(gx, gz, 3)) * CELL;
        const none = { key: null, x, z };
        if (r0 > 0.72) { gcCache.set(ck, none); continue; }
        if ((x - pos.x) * (x - pos.x) + (z - pos.z) * (z - pos.z) > R * R) continue;
        gcCache.set(ck, none);
        const p = Hw.project(x, z);
        if (Math.abs(p.lat) < ROAD_HALF + 1.4) continue;
        const hi = Hw.hubIndexAt(p.s);
        const hub = Hw.hubs[hi];
        if (hub && Math.hypot(p.s - hub.s, p.lat) < 215 && (Math.abs(p.lat) < 55 || Math.abs(p.s - hub.s) < 160)) continue; // the town itself
        const h = Hw.height(x, z);
        if (Hw.waterLevelAt(x, z) > h - 0.4) continue;
        const r = hash(gx, gz, 4);
        const key = r < 0.84 ? 'tuft' : r < 0.92 ? 'flower' : 'fern';
        const sc = 0.65 + hash(gx, gz, 5) * 0.8;
        _gq.setFromAxisAngle(_up, hash(gx, gz, 6) * 6.28);
        const m = new T.Matrix4().compose(_gp.set(x, h - 0.05, z), _gq, _gs.set(sc, sc, sc));
        gcCache.set(ck, { key, x, z, m });
        if (lists[key].length < pools[key].cap) lists[key].push(m);
      }
    }
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
      (h.beams || []).forEach((b) => { b.rotation.y += dt * 0.9; });
      (h.flows || []).forEach((t) => { t.offset.y += dt * 0.9; });
      if (h.actors && Math.hypot(Hw.frame(h.s).x - pp.x, Hw.frame(h.s).z - pp.z) < 260) h.actors.forEach((a) => Models.animateCharacter(a.obj, a.state, dt, 1));
      (h.nets || []).forEach((n) => { n.obj.userData.arm.rotation.x = -0.35 + ((Math.sin(Hw.animTime * 0.35 + n.phase) + 1) / 2) * 0.6; });
      (h.elephants || []).forEach((e) => e.userData.animate(Hw.animTime + e.id, false));
    });
    KT.Townfolk.update(dt, player);
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
