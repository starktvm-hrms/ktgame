// Kerala's railway, after the Kerala railway map: Thiruvananthapuram
// Central up the coast through Kollam to Kayamkulam, then both ways to
// Ernakulam (by Alappuzha, and by Kottayam), on through Thrissur to
// Shornur, east to Palakkad and north up the Malabar coast to Kasaragod,
// with the branches to Punalur and Sengottai, Neyyattinkara, Guruvayur,
// Nilambur, Kollengode and Cochin Harbour.
//  - Lines run on ballasted embankments (the land is shaped to them), as
//    double track on the main lines, on girder bridges over the rivers and
//    backwaters, under overhead electric wires, and meet the roads at level
//    crossings with gates that come down when a train is near.
//  - Every station on the map has platforms with name boards, a station
//    building, a shelter, benches and passengers; junctions have a foot
//    overbridge. A lane joins each station to the nearest road.
//  - Trains (an electric engine and coaches) run up and down every line to
//    a timetable, stopping at each station.
//  - At any station you can take a train to any other.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Rail = KT.Rail = { lines: [], stations: [], trains: [], ready: false, time: 0 };

  // [name, Malayalam, lat, lon]
  const ST = {
    tvm: ['Thiruvananthapuram Central', 'തിരുവനന്തപുരം സെൻട്രൽ', 8.4875, 76.952], kzk: ['Kazhakkoottam', 'കഴക്കൂട്ടം', 8.567, 76.874],
    vkl: ['Varkala Sivagiri', 'വർക്കല ശിവഗിരി', 8.7357, 76.716], pvr: ['Paravur', 'പരവൂർ', 8.81, 76.665], klm: ['Kollam Junction', 'കൊല്ലം ജംഗ്ഷൻ', 8.886, 76.595],
    kpy: ['Karunagappally', 'കരുനാഗപ്പള്ളി', 9.06, 76.535], kyj: ['Kayamkulam Junction', 'കായംകുളം ജംഗ്ഷൻ', 9.172, 76.501],
    hpd: ['Haripad', 'ഹരിപ്പാട്', 9.28, 76.46], amp: ['Ambalappuzha', 'അമ്പലപ്പുഴ', 9.384, 76.365], alp: ['Alappuzha', 'ആലപ്പുഴ', 9.49, 76.335], srtl: ['Cherthala', 'ചേർത്തല', 9.686, 76.345],
    mvlk: ['Mavelikkara', 'മാവേലിക്കര', 9.25, 76.556], cngr: ['Chengannur', 'ചെങ്ങന്നൂർ', 9.318, 76.611], tvla: ['Tiruvalla', 'തിരുവല്ല', 9.384, 76.575],
    ktym: ['Kottayam', 'കോട്ടയം', 9.596, 76.531], etmd: ['Ettumanoor', 'ഏറ്റുമാനൂർ', 9.67, 76.56], vkm: ['Vaikom Road', 'വൈക്കം റോഡ്', 9.76, 76.43],
    tpj: ['Thrippunithura', 'തൃപ്പൂണിത്തുറ', 9.95, 76.35], ers: ['Ernakulam Junction', 'എറണാകുളം ജംഗ്ഷൻ', 9.969, 76.291],
    awy: ['Aluva', 'ആലുവ', 10.108, 76.351], aly: ['Angamaly', 'അങ്കമാലി', 10.19, 76.386], ckl: ['Chalakudy', 'ചാലക്കുടി', 10.302, 76.33],
    tcr: ['Thrissur', 'തൃശ്ശൂർ', 10.515, 76.207], wki: ['Vadakkanchery', 'വടക്കാഞ്ചേരി', 10.66, 76.25], srr: ['Shoranur Junction', 'ഷൊർണൂർ ജംഗ്ഷൻ', 10.762, 76.271],
    otp: ['Ottapalam', 'ഒറ്റപ്പാലം', 10.77, 76.38], pgt: ['Palakkad Junction', 'പാലക്കാട് ജംഗ്ഷൻ', 10.796, 76.661], wlyr: ['Walayar', 'വാളയാർ', 10.84, 76.84],
    ptb: ['Pattambi', 'പട്ടാമ്പി', 10.81, 76.19], kty: ['Kuttippuram', 'കുറ്റിപ്പുറം', 10.84, 76.03], tir: ['Tirur', 'തിരൂർ', 10.912, 75.922],
    pgi: ['Parappanangadi', 'പരപ്പനങ്ങാടി', 11.05, 75.86], fk: ['Feroke', 'ഫറോക്ക്', 11.18, 75.84], clt: ['Kozhikode', 'കോഴിക്കോട്', 11.247, 75.781],
    qln: ['Quilandi', 'കൊയിലാണ്ടി', 11.44, 75.69], bdj: ['Vadakara', 'വടകര', 11.607, 75.591], mahe: ['Mahe', 'മാഹി', 11.7, 75.54],
    tly: ['Thalassery', 'തലശ്ശേരി', 11.749, 75.492], can: ['Kannur', 'കണ്ണൂർ', 11.873, 75.37], pay: ['Payyanur', 'പയ്യന്നൂർ', 12.1, 75.2],
    kzgd: ['Kanhangad', 'കാഞ്ഞങ്ങാട്', 12.31, 75.09], ksd: ['Kasaragod', 'കാസർഗോഡ്', 12.5, 74.99], mjs: ['Manjeshwar', 'മഞ്ചേശ്വരം', 12.71, 74.89],
    kunr: ['Kundara', 'കുണ്ടറ', 8.96, 76.67], kkz: ['Kottarakkara', 'കൊട്ടാരക്കര', 9.0, 76.77], pnlr: ['Punalur', 'പുനലൂർ', 9.018, 76.926],
    tml: ['Thenmala', 'തെന്മല', 8.965, 77.06], akv: ['Aryankavu', 'ആര്യങ്കാവ്', 8.97, 77.15],
    nyy: ['Neyyattinkara', 'നെയ്യാറ്റിൻകര', 8.4, 77.08], psa: ['Parassala', 'പാറശ്ശാല', 8.34, 77.15],
    gvr: ['Guruvayur', 'ഗുരുവായൂർ', 10.594, 76.039], agp: ['Angadipuram', 'അങ്ങാടിപ്പുറം', 10.98, 76.2], nil: ['Nilambur Road', 'നിലമ്പൂർ റോഡ്', 11.276, 76.225],
    klgd: ['Kollengode', 'കൊല്ലങ്കോട്', 10.61, 76.69], chts: ['Cochin Harbour Terminus', 'കൊച്ചി ഹാർബർ ടെർമിനസ്', 9.95, 76.26]
  };
  const LINES = [
    { name: 'Thiruvananthapuram – Kollam – Kayamkulam', double: true, stops: ['tvm', 'kzk', 'vkl', 'pvr', 'klm', 'kpy', 'kyj'] },
    { name: 'Kayamkulam – Alappuzha – Ernakulam', double: true, stops: ['kyj', 'hpd', 'amp', 'alp', 'srtl', 'ers'] },
    { name: 'Kayamkulam – Kottayam – Ernakulam', double: true, stops: ['kyj', 'mvlk', 'cngr', 'tvla', 'ktym', 'etmd', 'vkm', 'tpj', 'ers'] },
    { name: 'Ernakulam – Thrissur – Shoranur', double: true, stops: ['ers', 'awy', 'aly', 'ckl', 'tcr', 'wki', 'srr'] },
    { name: 'Shoranur – Palakkad', double: true, stops: ['srr', 'otp', 'pgt', 'wlyr'], end: 'to Coimbatore' },
    { name: 'Shoranur – Kozhikode – Kasaragod', double: true, stops: ['srr', 'ptb', 'kty', 'tir', 'pgi', 'fk', 'clt', 'qln', 'bdj', 'mahe', 'tly', 'can', 'pay', 'kzgd', 'ksd', 'mjs'], end: 'to Mangaluru' },
    { name: 'Kollam – Punalur – Sengottai', double: false, stops: ['klm', 'kunr', 'kkz', 'pnlr', 'tml', 'akv'], end: 'to Thenkasi' },
    { name: 'Thiruvananthapuram – Nagercoil', double: true, stops: ['tvm', 'nyy', 'psa'], end: 'to Nagercoil' },
    { name: 'Thrissur – Guruvayur', double: false, stops: ['tcr', 'gvr'] },
    { name: 'Shoranur – Nilambur', double: false, stops: ['srr', 'agp', 'nil'] },
    { name: 'Palakkad – Kollengode', double: false, stops: ['pgt', 'klgd'], end: 'to Pollachi' },
    { name: 'Ernakulam – Cochin Harbour', double: false, stops: ['ers', 'chts'] }
  ];
  const TRACK = 2.25;          // a track's offset from the middle of a double line
  const bedHalf = (R) => (R.double ? 4.6 : 2.4);

  // ------------------------------------------------------------ planning
  const unit = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
  // the railway keeps back from the sea: the beach slopes down to the water
  // on its own, and never ends in a cliff under an embankment
  const COAST_ST = 280, COAST_LINE = 150, COAST_PUSH = 210;
  Rail.plan = function () {
    const Hw = KT.Highway, M = Hw._mk;
    const hubs = KT.DISTRICTS.map((d, i) => Hw.at(Hw.hubS(i), 0));
    const sights = Hw.sightList();
    // Thiruvananthapuram Central is the station at Thampanoor
    const tpIt = KT.Dest.items.find((it) => it.sg.kind === 'thampanoor');
    let tvmFrame = null;
    if (tpIt) {
      const r = tpIt.rot, c = Math.cos(r), s = Math.sin(r);
      const W = (lx, lz) => ({ x: tpIt.sg.x + lx * c + lz * s, z: tpIt.sg.z - lx * s + lz * c });
      const mid = W(84.5, 0), ahead = W(84.5, -10);
      tvmFrame = { x: mid.x, z: mid.z, axis: unit(ahead.x - mid.x, ahead.z - mid.z), platform: W(77, 0), y: tpIt.y };
    }
    // where each station stands: at its place, moved clear of the sea, the
    // district towns and the sights
    const where = {};
    Object.keys(ST).forEach((k) => {
      if (k === 'tvm' && tvmFrame) { where[k] = { x: tvmFrame.x, z: tvmFrame.z }; return; }
      const p = Hw.geo(ST[k][3], ST[k][2]);
      for (let it = 0; it < 5; it++) {
        hubs.forEach((h) => { const d = Math.hypot(p.x - h.x, p.z - h.z); if (d < 330) { const u = unit(p.x - h.x, p.z - h.z); p.x = h.x + u.x * 330; p.z = h.z + u.z * 330; } });
        sights.forEach((sg) => { const d = Math.hypot(p.x - sg.x, p.z - sg.z), m = sg.r + 90; if (d < m) { const u = unit(p.x - sg.x, p.z - sg.z); p.x = sg.x + u.x * m; p.z = sg.z + u.z * m; } });
        // (and off the roads: a station stands beside them, not on them)
        Hw.roads.forEach((V) => { if (!V.near(p.x, p.z, 60)) return; const q = V.project(p.x, p.z), m = (V.half || 5.5) + 45; if (q.d < m && q.s > 0 && q.s < V.len) { const f = V.frame(q.s), sd = q.lat < 0 ? -1 : 1; p.x = f.x + f.rx * sd * m; p.z = f.z + f.rz * sd * m; } });
        // (and well back from the sea: the station's ground, not a cliff over the beach)
        const E = p.x - Hw.coastX(p.z);
        if (E < COAST_ST) p.x += COAST_ST - E;
      }
      where[k] = p;
    });
    const made = {};
    LINES.forEach((L, li) => {
      const pts = L.stops.map((k) => where[k]);
      const C = pts.map((p, i) => ({ x: p.x, z: p.z, stop: i, back: 75, fwd: 75 }));
      // out of Thampanoor along the station's own tracks
      const first = L.stops[0] === 'tvm' && tvmFrame, last = L.stops[L.stops.length - 1] === 'tvm' && tvmFrame;
      if (first) {
        const nx = pts[1].x - tvmFrame.x, nz = pts[1].z - tvmFrame.z, a = tvmFrame.axis, sg = nx * a.x + nz * a.z > 0 ? 1 : -1;
        Object.assign(C[0], { t: { x: a.x * sg, z: a.z * sg }, back: 0, fwd: 85 });
      }
      if (last) C[C.length - 1].back = 85;
      // keep clear of the towns, the sights and the roads: bend round them.
      // A line may cross a road (a level crossing, at a good angle, away
      // from its junctions), but never runs along it or over it.
      const BW0 = L.double ? 4.6 : 2.4;
      const roadConflict = (x, z, i) => {
        const tx = cv.PX[Math.min(cv.PX.length - 1, i + 2)] - cv.PX[Math.max(0, i - 2)], tz = cv.PZ[Math.min(cv.PZ.length - 1, i + 2)] - cv.PZ[Math.max(0, i - 2)], tl = Math.hypot(tx, tz) || 1;
        for (const V of Hw.roads) {
          if (V.rail || !V.near(x, z, 40)) continue;
          const p = V.project(x, z), hw = (V.half || 5.5) + BW0 + 5;
          if (p.d > hw || p.s < 2 || p.s > V.len - 2) continue;
          const f = V.frame(p.s), cos = Math.abs((tx * f.fx + tz * f.fz) / tl);
          const nearJ = V.junctions.some((j) => !j.rail && Math.abs(j.s - p.s) < 30);
          if (cos > 0.6 || nearJ || (V.bridges && V.bridges.some((b) => p.s > b.s0 - 20 && p.s < b.s1 + 20))) {
            // push the line off to the side of the road it is on
            const side = p.lat < 0 ? -1 : 1, off = (V.half || 5.5) + BW0 + 34;
            return { x: f.x + f.rx * side * off, z: f.z + f.rz * side * off };
          }
        }
        return null;
      };
      let cv = null;
      for (let pass = 0; pass < 22; pass++) {
        cv = M.curveThrough(C, { avoidTowns: true, passes: 2, angles: 18 });
        const fixes = [];
        for (let i = 40; i < cv.PX.length - 40 && fixes.length < 6; i += 5) {
          if (fixes.length && i - fixes[fixes.length - 1].i < 90) continue;
          const x = cv.PX[i], z = cv.PZ[i];
          // (never out over the beach or the sea, except Thampanoor's own tracks)
          if (x - Hw.coastX(z) < COAST_LINE && !((first && i * M.STEP < 160) || (last && (cv.PX.length - i) * M.STEP < 160))) {
            fixes.push({ i, x: Hw.coastX(z) + COAST_PUSH, z });
            continue;
          }
          const h = hubs.find((q) => Math.hypot(x - q.x, z - q.z) < 250);
          const sg = !h && sights.find((q) => q.kind !== 'thampanoor' && Math.hypot(x - q.x, z - q.z) < q.r + 14);
          const o = h ? { x: h.x, z: h.z, r: 320 } : sg ? { x: sg.x, z: sg.z, r: sg.r + 50 } : null;
          if (o) {
            const u = unit(x - o.x, z - o.z);
            fixes.push({ i, x: o.x + u.x * o.r, z: o.z + u.z * o.r });
            continue;
          }
          // (the first and last stretches out of Thampanoor are the station's own)
          if ((first && i * M.STEP < 160) || (last && (cv.PX.length - i) * M.STEP < 160)) continue;
          const rc = roadConflict(x, z, i);
          if (rc) fixes.push(Object.assign(rc, { i }));
        }
        // a bend that falls right on an existing point (a station, an earlier
        // bend) moves that point instead
        let moved = 0;
        const ok = fixes.filter((fx) => {
          const c = C.find((c) => Math.hypot(c.x - fx.x, c.z - fx.z) < 60);
          if (!c) return true;
          if (c.t || pass > 13) return false; // (Thampanoor's own start stays)
          c.x = fx.x; c.z = fx.z; moved++;
          return false;
        });
        if (!ok.length && !moved) break;
        // insert each bend between the points it falls between (from the far end)
        ok.sort((a, b) => b.i - a.i).forEach((fx) => {
          const sAt = fx.i * M.STEP;
          let k = 0;
          while (k < C.length - 1 && cv.S[k + 1] < sAt) k++;
          C.splice(k + 1, 0, { x: fx.x, z: fx.z });
        });
      }
      const PY = M.heightProfile(cv.PX, cv.PZ, 7000 + li * 913);
      // railways climb gently: smooth the profile more than a road's
      for (let pass = 0; pass < 2; pass++) {
        const src = PY.slice(), RR = 140;
        for (let i = 0; i < PY.length; i++) { let sum = 0, n = 0; for (let j = Math.max(0, i - RR); j <= Math.min(PY.length - 1, i + RR); j += 6) { sum += src[j]; n++; } PY[i] = sum / n; }
      }
      const R = M.makeRoad(cv.PX, cv.PZ, PY, { id: 9000 + li, rail: true, double: L.double, nh: 'Railway', name: L.name, end: L.end || null });
      R.stops = [];
      C.forEach((c, i) => { if (c.stop !== undefined) R.stops.push({ key: L.stops[c.stop], s: cv.S[i] }); });
      if (first) M.levelAt(PY, 0, tvmFrame.y + 0.3, 90, 200);
      if (last) M.levelAt(PY, R.len, tvmFrame.y + 0.3, 90, 200);
      Rail.lines.push(R);
      R.stops.forEach((st) => {
        if (made[st.key]) { made[st.key].lines.push({ R, s: st.s }); return; }
        const [name, ml] = ST[st.key];
        made[st.key] = { key: st.key, name, ml, R, s: st.s, lines: [{ R, s: st.s }], tvm: st.key === 'tvm' && !!tvmFrame };
        Rail.stations.push(made[st.key]);
      });
    });
    // the lines join at their junction stations: the same height there
    Rail.stations.forEach((st) => {
      const y = st.R.y(st.s);
      st.lines.forEach((l) => M.levelAt(l.R.PY, l.s, y, 80, 220));
    });
    // over water, the line stays well above it (on its bridges)
    Rail.lines.forEach((R) => {
      for (let i = 0; i <= R.LAST; i += 5) {
        const wl = Hw.waterLevelAt(R.PX[i], R.PZ[i]);
        if (wl > -1e8 && R.PY[i] < wl + 4) M.levelAt(R.PY, i * M.STEP, wl + 4.5, 60, 160);
      }
    });
    crossings(Hw, M);
    stationSites(Hw, M, tvmFrame);
    buildGrid();
    Rail.ready = true;
  };

  // each station's ground, platforms side and the lane from the nearest road
  function stationSites(Hw, M, tvmFrame) {
    Rail.stations.forEach((st) => {
      const R = st.R;
      // (a station never stands on a level crossing: slide it along the line)
      if (!st.tvm) for (let it = 0; it < 4; it++) {
        const c = Rail.crossings.find((c) => c.R === R && Math.abs(c.s - st.s) < 100);
        if (!c) break;
        const ns = c.s + (st.s >= c.s ? 1 : -1) * 105;
        if (ns < 90 || ns > R.len - 90) break;
        st.s = ns;
        st.lines.find((l) => l.R === R).s = ns;
        const stop = R.stops.find((p) => p.key === st.key); if (stop) stop.s = ns;
      }
      const f = R.frame(st.s), y = R.y(st.s);
      st.x = f.x; st.z = f.z; st.y = y; st.heading = f.heading;
      if (st.tvm) {
        st.platform = { x: tvmFrame.platform.x, z: tvmFrame.platform.z };
        return;
      }
      // the building goes on the side of the nearest road
      const nr = Hw.nearestRoad(f.x, f.z, 800);
      const toRoad = nr.road.at(nr.s, 0);
      st.side = (toRoad.x - f.x) * f.rx + (toRoad.z - f.z) * f.rz < 0 ? -1 : 1;
      const BW = bedHalf(R);
      st.platLat = st.side * (BW + 3);
      const pq = R.at(st.s, st.platLat);
      st.platform = { x: pq.x, z: pq.z };
      // level ground under the station and its forecourt
      const yard = R.at(st.s, st.side * (BW + 16));
      Hw.PADS.push({ x: yard.x, z: yard.z, r: 26, y: y - 0.75 });
      st.yard = { x: R.at(st.s, st.side * (BW + 34)).x, z: R.at(st.s, st.side * (BW + 34)).z };
      // a lane in from the nearest road
      const P = st.yard, near = Hw.roads.filter((V) => !V.rail && !V.lane && V.near(P.x, P.z, 700)).map((V) => ({ V, p: V.project(P.x, P.z) })).filter((o) => o.p.d > 20 && o.p.d < 700 && o.p.s > 20 && o.p.s < o.V.len - 20 && !o.V.junctions.some((j) => Math.abs(j.s - o.p.s) < 25)).sort((a, b) => a.p.d - b.p.d)[0];
      if (!near) return;
      const J = { road: near.V, s: near.p.s }, L0 = M.leave(J, P);
      const cv = M.curveThrough([{ x: L0.x, z: L0.z, t: L0.t }, { x: P.x, z: P.z }], { passes: 1, angles: 12 });
      // (not across the line itself)
      for (let i = 0; i < cv.PX.length; i += 3) { const q = R.project(cv.PX[i], cv.PZ[i]); if (q.d < BW + 2 && q.s > 0 && q.s < R.len) return; }
      const PY = M.heightProfile(cv.PX, cv.PZ, 3100 + st.s);
      const lane = M.makeRoad(cv.PX, cv.PZ, PY, { id: 8000 + Rail.stations.indexOf(st), nh: st.name + ' station', name: st.name + ' station', country: true, lane: true, half: 3.0, station: st });
      M.levelAt(PY, 0, near.V.y(near.p.s), 16, 100);
      M.levelAt(PY, lane.len, y - 0.7, 20, 120);
      lane.towns = [{ name: st.name + ' station', road: lane.nh, s: lane.len }];
      lane.start = { road: near.V, s: near.p.s, side: L0.side };
      lane.junctions.push({ s: 0, side: 0, other: near.V });
      near.V.junctions.push({ s: near.p.s, side: L0.side, other: lane });
      Hw.roads.push(lane);
      Hw.country.push(lane);
      st.lane = lane;
    });
  }

  // level crossings: where a road meets the line, the line comes to the
  // road's height, and gates stand on both sides
  Rail.crossings = [];
  function crossings(Hw, M) {
    Rail.lines.forEach((R) => {
      const BW = bedHalf(R);
      Hw.roads.forEach((V) => {
        if (V.rail || !V.near((R.minX + R.maxX) / 2, (R.minZ + R.maxZ) / 2, Math.max(R.maxX - R.minX, R.maxZ - R.minZ))) return;
        let inside = false;
        for (let i = 0; i <= R.LAST; i += 2) {
          const x = R.PX[i], z = R.PZ[i];
          if (!V.near(x, z, 10)) { inside = false; continue; }
          const p = V.project(x, z), hw = (V.half || 5.5) + 0.5;
          const on = p.d < hw && p.s > 0 && p.s < V.len;
          if (on && !inside) {
            const s = i * M.STEP;
            M.levelAt(R.PY, s, V.y(p.s) + 0.08, 14, 140);
            Rail.crossings.push({ R, s, V, vs: p.s, x, z, BW, gates: null });
            V.junctions.push({ s: p.s, side: 0, other: R, rail: true });
          }
          inside = on;
        }
      });
    });
  }

  // a coarse grid of the cells the lines pass, for quick "near a line?" tests
  const GRID = new Map(), GC = 25;
  function buildGrid() {
    Rail.lines.forEach((R, ri) => {
      for (let i = 0; i <= R.LAST; i += 4) {
        const cx = Math.floor(R.PX[i] / GC), cz = Math.floor(R.PZ[i] / GC);
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
          const k = (cx + a) * 100003 + (cz + b);
          let l = GRID.get(k);
          if (!l) GRID.set(k, (l = []));
          if (l.indexOf(R) < 0) l.push(R);
        }
      }
    });
  }
  const cellLines = (x, z) => GRID.get(Math.floor(x / GC) * 100003 + Math.floor(z / GC));
  // distance from (x, z) to the nearest line (its middle), or a large number
  Rail.dist = function (x, z) {
    if (!Rail.ready) return 1e9;
    const L = cellLines(x, z);
    if (!L) return 1e9;
    let d = 1e9;
    for (let i = 0; i < L.length; i++) { const p = L[i].project(x, z); if (p.d < d) d = p.d; }
    return d;
  };
  // the land is shaped to the line: its embankment (not over the water)
  Rail.bank = function (x, z, h, gh) {
    const L = cellLines(x, z);
    if (!L) return h;
    let keep = 1, sw = 0, sy = 0;
    // (the beach keeps its slope: no embankment holds the land up over the sea)
    const cw = KT.smoothstep(35, 95, x - KT.Highway.coastX(z));
    if (cw <= 0) return h;
    for (let i = 0; i < L.length; i++) {
      const R = L[i], p = R.project(x, z);
      const w = cw * (1 - KT.smoothstep(bedHalf(R) + 1.5, bedHalf(R) + 16 + 20 * gh, p.d));
      if (w <= 0) continue;
      keep *= 1 - w; sw += w; sy += w * (R.y(KT.clamp(p.s, 0, R.len)) - 0.8);
    }
    if (sw > 0) h = KT.lerp(h, sy / sw, 1 - keep);
    return h;
  };

  // ------------------------------------------------------------ materials
  let MATS = null;
  function canvasTex(w, h, draw, wrap) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    if (wrap) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  function mats() {
    if (MATS) return MATS;
    const ballast = canvasTex(128, 128, (g, W, H) => {
      const rng = KT.makeRng(5);
      g.fillStyle = '#7a7268'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 1400; i++) { const v = 70 + rng() * 90; g.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 14) + ')'; g.fillRect(rng() * W, rng() * H, 2 + rng() * 3, 2 + rng() * 3); }
    }, true);
    // concrete sleepers on the ballast (one every 0.6 m; v along the track)
    const sleepers = canvasTex(64, 64, (g, W, H) => {
      const rng = KT.makeRng(9);
      g.fillStyle = '#6f675d'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 300; i++) { const v = 70 + rng() * 80; g.fillStyle = 'rgb(' + v + ',' + (v - 5) + ',' + (v - 12) + ')'; g.fillRect(rng() * W, rng() * H, 2, 2); }
      g.fillStyle = '#a8a39a'; g.fillRect(2, 22, W - 4, 20);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(2, 40, W - 4, 3);
      g.fillStyle = '#3a3a3a'; g.fillRect(9, 26, 5, 12); g.fillRect(W - 14, 26, 5, 12);
    }, true);
    const girder = canvasTex(128, 64, (g, W, H) => {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = '#5d6a74'; g.lineWidth = 7;
      g.strokeRect(4, 4, W - 8, H - 8);
      g.beginPath(); g.moveTo(4, H - 4); g.lineTo(W / 2, 4); g.lineTo(W - 4, H - 4); g.stroke();
    }, true);
    MATS = {
      ballast: KT.mat('railBallast', { map: ballast, roughness: 0.98 }),
      sleepers: KT.mat('railSleepers', { map: sleepers, roughness: 0.92 }),
      rail: KT.mat('railSteel', { color: 0x8d8f91, roughness: 0.32, metalness: 0.85 }),
      deck: KT.mat('railDeck', { color: 0xa29d94, roughness: 0.9 }),
      girder: KT.mat('railGirder', { map: girder, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.6, metalness: 0.5 }),
      pier: KT.mat('railPier', { color: 0x9b968c, roughness: 0.92 }),
      mast: KT.mat('railMast', { color: 0x9aa0a4, roughness: 0.5, metalness: 0.6 }),
      wire: new T.LineBasicMaterial({ color: 0x2a2a2a }),
      gatePost: KT.mat('gatePost', { color: 0x3c3c3a, roughness: 0.6 }),
      gateArm: KT.mat('gateArm', { map: canvasTex(64, 8, (g, W) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d8203a'; g.fillRect(i * W / 8, 0, W / 8, 8); } }), roughness: 0.5 })
    };
    if (KT.Real && KT.Real.enabled) KT.Real.surface(MATS.deck, 'painted_plaster_wall', 0.6);
    return MATS;
  }

  // ---------------------------------------------------- track (streamed)
  const CH = 100; // track is built in 100 m pieces near you
  const chunks = new Map();
  function strip(list, R, s0, s1, l0, l1, y0, y1, u0, u1, vScale) {
    // a band along the line between laterals l0..l1 at heights y0..y1 above the line
    const base = list.pos.length / 3;
    let n = 0;
    for (let s = s0; s <= s1 + 0.01; s += 2) {
      const ss = Math.min(s, s1), f = R.frame(ss), y = R.y(ss);
      list.pos.push(f.x + f.rx * l0, y + y0, f.z + f.rz * l0, f.x + f.rx * l1, y + y1, f.z + f.rz * l1);
      list.uv.push(u0, ss / vScale, u1, ss / vScale);
      if (n) { const a = base + (n - 1) * 2, b = base + n * 2; list.idx.push(a, b, a + 1, a + 1, b, b + 1); }
      n++;
    }
  }
  function meshOf(list, mat) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(list.pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(list.uv, 2));
    geo.setIndex(list.idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
  }
  const L = () => ({ pos: [], uv: [], idx: [] });
  function buildChunk(R, k) {
    const Hw = KT.Highway, MT = mats(), g = new T.Group();
    const s0 = k * CH, s1 = Math.min(R.len, s0 + CH);
    const BW = bedHalf(R), tracks = R.double ? [-TRACK, TRACK] : [0];
    const bed = L(), sl = L(), rails = L(), deck = L(), gird = L();
    const wires = [];
    // which stretches are bridges (over water or a deep dip)
    const isBridge = (s) => { const f = R.frame(s), y = R.y(s), gy = Hw.height(f.x, f.z); return y - gy > 2.6 || Hw.waterLevelAt(f.x, f.z) > gy - 0.2; };
    let a = s0;
    while (a < s1) {
      const br = isBridge(a);
      let b = a;
      while (b < s1 && isBridge(Math.min(s1, b + 2)) === br) b += 2;
      b = Math.min(s1, b + 2);
      if (!br) {
        // ballast bank with sloping sides, then the sleepers
        strip(bed, R, a, b, -BW - 2.4, -BW, -1.6, -0.32, 0, 0.6, 3);
        strip(bed, R, a, b, -BW, BW, -0.32, -0.32, 0.6, 2.4, 3);
        strip(bed, R, a, b, BW, BW + 2.4, -0.32, -1.6, 2.4, 3, 3);
      } else {
        strip(deck, R, a, b, -BW - 0.4, BW + 0.4, -0.3, -0.3, 0, 1, 4);
        strip(deck, R, a, b, BW + 0.4, BW + 0.4, -0.3, -1.4, 0, 1, 4);
        strip(deck, R, a, b, -BW - 0.4, -BW - 0.4, -1.4, -0.3, 0, 1, 4);
        // through-girders on both sides
        strip(gird, R, a, b, -BW - 0.3, -BW - 0.3, -0.3, 1.6, 0, 1, 6);
        strip(gird, R, a, b, BW + 0.3, BW + 0.3, 1.6, -0.3, 0, 1, 6);
      }
      a = b;
    }
    tracks.forEach((c) => {
      strip(sl, R, s0, s1, c - 1.35, c + 1.35, -0.3, -0.3, 0, 1, 0.6);
      [-0.76, 0.76].forEach((o) => {
        strip(rails, R, s0, s1, c + o - 0.04, c + o + 0.04, 0, 0, 0, 1, 4);
        strip(rails, R, s0, s1, c + o - 0.04, c + o - 0.04, -0.3, 0, 0, 1, 4);
        strip(rails, R, s0, s1, c + o + 0.04, c + o + 0.04, 0, -0.3, 0, 1, 4);
      });
    });
    if (bed.pos.length) g.add(meshOf(bed, MT.ballast));
    if (deck.pos.length) g.add(meshOf(deck, MT.deck));
    if (gird.pos.length) g.add(meshOf(gird, MT.girder));
    g.add(meshOf(sl, MT.sleepers));
    const rm = meshOf(rails, MT.rail); rm.castShadow = true; g.add(rm);
    // piers under the bridges, overhead line masts and their wires
    const parts = new T.Group();
    for (let s = Math.ceil(s0 / 20) * 20; s < s1; s += 20) {
      if (!isBridge(s)) continue;
      const f = R.frame(s), y = R.y(s), gy = Math.min(Hw.height(f.x, f.z), Hw.waterLevelAt(f.x, f.z) > -1e8 ? Hw.waterLevelAt(f.x, f.z) - 3 : 1e9);
      const h = y - 1.4 - gy;
      if (h > 0.5) part(parts, G.box(BW * 2 + 0.4, h, 1.6), MT.pier, f.x, gy + h / 2, f.z, 0, f.heading, 0);
    }
    const mastSide = R.double ? 1 : 1;
    let prevTops = null;
    for (let s = Math.ceil(s0 / 45) * 45; s <= s1; s += 45) {
      const f = R.frame(s), y = R.y(s), lat = mastSide * (BW + 0.9);
      const q = R.at(s, lat);
      part(parts, G.box(0.28, 7.6, 0.28), MT.mast, q.x, y + 3.5, q.z, 0, f.heading, 0);
      const arm = R.at(s, (lat + (R.double ? -TRACK : 0)) / 2 - (R.double ? 1.2 : 0.6));
      const armLen = Math.abs(lat - (R.double ? -TRACK - 0.5 : -0.5));
      part(parts, G.box(0.12, 0.12, armLen), MT.mast, (q.x + arm.x) / 2 + f.rx * -0.1, y + 6.8, (q.z + arm.z) / 2, 0, f.heading + Math.PI / 2, 0);
      const tops = tracks.map((c) => { const t = R.at(s, c); return [t.x, y + 5.9, t.z]; });
      if (prevTops) tops.forEach((t, i) => wires.push(...prevTops[i], ...t));
      prevTops = tops;
    }
    g.add(KT.bake(parts));
    if (wires.length) {
      const wg = new T.BufferGeometry();
      wg.setAttribute('position', new T.Float32BufferAttribute(wires, 3));
      g.add(new T.LineSegments(wg, MT.wire));
    }
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    return g;
  }

  // level crossing gates (their arms come down when a train is near)
  let crossSign = null, lcSign = null;
  function buildGates(c) {
    const MT = mats(), V = c.V, f = V.frame(c.vs), y = V.y(c.vs), half = V.half || 5.5;
    const rf = c.R.frame(c.s), sin = Math.max(0.35, Math.abs(f.fx * rf.rz - f.fz * rf.rx));
    const span = (c.BW + 0.6) / sin; // (how far the track reaches along the road)
    const g = new T.Group(), arms = [];
    const P = (d, lat) => ({ x: f.x + f.fx * d + f.rx * lat, z: f.z + f.fz * d + f.rz * lat });
    // the crossing deck: concrete panels across the road between the rails
    const deck = part(g, G.box(half * 2 + 0.4, 0.06, span * 2), KT.mat('lcDeck', { color: 0x6f6d68, roughness: 0.85 }), f.x, y + 0.03, f.z, 0, f.heading, 0);
    deck.castShadow = false;
    // stop lines across the road on both sides
    [-1, 1].forEach((along) => { const q = P(along * (span + 4), 0); part(g, G.box(half * 2, 0.02, 0.3), KT.mat('lcLine', { color: 0xf2f2ee, roughness: 0.6 }), q.x, y + 0.04, q.z, 0, f.heading, 0).castShadow = false; });
    // gates on both sides of the line, from both sides of the road
    [-1, 1].forEach((along) => {
      [-1, 1].forEach((side) => {
        const q = P(along * (span + 2.5), side * (half + 0.9));
        part(g, G.box(0.35, 1.2, 0.35), MT.gatePost, q.x, y + 0.6, q.z);
        const pivot = new T.Group();
        pivot.position.set(q.x, y + 1.05, q.z);
        pivot.rotation.y = f.heading + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
        const arm = part(pivot, G.box(0.12, 0.12, half + 0.6), MT.gateArm, 0, 0, (half + 0.6) / 2);
        arm.castShadow = true;
        g.add(pivot);
        arms.push(pivot);
      });
    });
    // warning signs on both approaches: the white cross and "level crossing"
    if (!crossSign) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const x = cv.getContext('2d');
      x.translate(64, 64);
      [1, -1].forEach((r) => { x.save(); x.rotate(r * Math.PI / 4); x.fillStyle = '#c4212b'; x.fillRect(-60, -13, 120, 26); x.fillStyle = '#ffffff'; x.fillRect(-56, -9, 112, 18); x.restore(); });
      const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
      crossSign = KT.mat('lcCross', { map: t, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.6 });
      lcSign = new T.MeshStandardMaterial({ map: KT.textTexture([{ text: 'LEVEL CROSSING', size: 34 }, { text: 'ലെവൽ ക്രോസ്', size: 30 }, { text: 'STOP • LOOK • GO', size: 24 }], { bg: '#f2c230', color: '#1b1b1b', border: true, borderColor: '#1b1b1b', width: 320, height: 180 }), roughness: 0.5 });
    }
    [-1, 1].forEach((along) => {
      // (on the left of the road, facing the traffic that comes towards the line)
      const q = P(along * (span + 14), -along * (half + 1.6));
      part(g, G.cyl(0.06, 0.06, 3, 6), KT.M.darkGrey, q.x, y + 1.5, q.z);
      const face = f.heading + (along > 0 ? 0 : Math.PI);
      part(g, G.plane(1.3, 1.3), crossSign, q.x, y + 2.7, q.z, 0, face, 0).castShadow = false;
      part(g, G.plane(1.2, 0.68), lcSign, q.x - f.fx * along * 0.02, y + 1.7, q.z - f.fz * along * 0.02, 0, face, 0).castShadow = false;
    });
    // the gatekeeper's hut
    const h = P(-(span + 4.5), half + 3.2);
    part(g, G.box(2.2, 2.4, 2.2), KT.mat('lcHut', { color: 0xe9d8a6, roughness: 0.85 }), h.x, y + 1.2, h.z, 0, f.heading, 0);
    part(g, G.box(2.8, 0.18, 2.8), KT.mat('lcHutRoof', { color: 0x8e3424, roughness: 0.6 }), h.x, y + 2.5, h.z, 0, f.heading, 0);
    KT.Highway.addCollider({ type: 'box', x: h.x, z: h.z, hw: 1.1, hd: 1.1, rot: f.heading });
    c.gates = { g, arms, down: 0 };
    return g;
  }

  // ------------------------------------------------------------- stations
  function stationBoard(st) {
    return new T.MeshStandardMaterial({ map: KT.textTexture([{ text: st.ml, size: 40 }, { text: st.name.toUpperCase(), size: 46 }], { bg: '#f2c230', color: '#1b1b1b', border: true, borderColor: '#1b1b1b', width: 640, height: 200 }), roughness: 0.5 });
  }
  function buildStation(st) {
    const Hw = KT.Highway, MT = mats(), R = st.R, BW = bedHalf(R);
    const root = new T.Group(), live = new T.Group();
    const f = R.frame(st.s), y = st.y, side = st.side;
    // in the station's own axes: x along the line, z out from it (to its side)
    root.position.set(f.x, y, f.z);
    // (+z towards the station's side, +x along the line)
    root.rotation.y = Math.atan2(f.rx * side, f.rz * side);
    const g = new T.Group();
    const plat = KT.mat('stPlatform', { color: 0xb8b0a0, roughness: 0.9 }), edge = KT.mat('stEdge', { color: 0xf2c230, roughness: 0.6 });
    const cream = KT.mat('stWall', { color: 0xf1e2bd, roughness: 0.85 }), roof = KT.M.roof, red = KT.mat('stShed', { color: 0x8e3424, roughness: 0.6, metalness: 0.2, side: T.DoubleSide });
    const PL = 150, top = 0.3; // (a low platform: a step up from the yard)
    const plats = R.double ? [BW + 3, -(BW + 3)] : [BW + 3];
    plats.forEach((pz) => {
      part(g, G.box(PL, top + 0.3, 5), plat, 0, (top - 0.3) / 2, pz);
      part(g, G.box(PL, 0.02, 0.3), edge, 0, top + 0.01, pz - Math.sign(pz) * 2.35);
      // a shelter over the middle of the platform
      for (let x = -27; x <= 27; x += 9) part(g, G.cyl(0.12, 0.12, 3.6, 8), KT.M.darkGrey, x, top + 1.8, pz);
      part(g, G.box(60, 0.12, 5.6), red, 0, top + 3.7, pz, Math.sign(pz) * 0.06, 0, 0);
      // name boards at both ends and the middle
      const board = stationBoard(st);
      [-62, 0, 62].forEach((x) => {
        part(g, G.box(0.1, 2.6, 0.1), KT.M.darkGrey, x - 1.4, top + 1.3, pz + Math.sign(pz) * 1.6);
        part(g, G.box(0.1, 2.6, 0.1), KT.M.darkGrey, x + 1.4, top + 1.3, pz + Math.sign(pz) * 1.6);
        [1, -1].forEach((fs) => part(g, G.plane(3.4, 1.06), board, x, top + 2.3, pz + Math.sign(pz) * 1.6 + fs * 0.03, 0, fs > 0 ? 0 : Math.PI, 0));
      });
      for (let x = -20; x <= 20; x += 10) { const b = KT.Models.bench(); b.position.set(x, top, pz + Math.sign(pz) * 1.2); b.rotation.y = pz > 0 ? Math.PI : 0; g.add(b); }
      for (let x = -70; x <= 70; x += 28) { const l = KT.Models.lampPost(); l.position.set(x, top, pz + Math.sign(pz) * 2.1); g.add(l); }
    });
    // the station building behind the platform
    const bz = BW + 5.5 + 5;
    part(g, G.box(34, 5, 9), cream, 0, top + 2.5 - 0.3, bz);
    const wall = new T.MeshStandardMaterial({ map: canvasTex(512, 76, (c, W, H) => {
      c.fillStyle = '#f1e2bd'; c.fillRect(0, 0, W, H); c.fillStyle = '#8a5a3a'; c.fillRect(0, H - 8, W, 5);
      for (let i = 0; i < 9; i++) { const x = 18 + i * 55; c.fillStyle = '#3a3226'; c.fillRect(x, 18, 26, 44); c.beginPath(); c.arc(x + 13, 18, 13, Math.PI, 0); c.fill(); c.fillStyle = '#6f8f9c'; c.fillRect(x + 4, 22, 18, 36); }
    }), roughness: 0.85 });
    [-1, 1].forEach((fs) => part(g, G.plane(34, 5), wall, 0, top + 2.2, bz + fs * 4.52, 0, fs > 0 ? 0 : Math.PI, 0).castShadow = false);
    const hr = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1); hr.rotateY(Math.PI / 4);
    part(g, hr, roof, 0, top + 4.7 + 1.3, bz, 0, 0, 0, 36, 2.6, 11);
    const nameM = stationBoard(st);
    [-1, 1].forEach((fs) => part(g, G.plane(9, 2.8), nameM, 0, top + 6.4, bz + fs * 0.05, 0, fs > 0 ? 0 : Math.PI, 0));
    part(g, G.box(0.2, 2.8, 9.2), KT.M.darkGrey, 0, top + 6.4, bz, 0, Math.PI / 2, 0);
    // a foot overbridge at the junctions
    if (st.lines.length > 1 && R.double) {
      const blue = KT.mat('stFob', { color: 0x2f6fb0, roughness: 0.5, metalness: 0.3 });
      part(g, G.box(3, 0.4, BW * 2 + 12), blue, 40, top + 6.5, 0);
      part(g, G.box(3.2, 0.15, BW * 2 + 12.4), blue, 40, top + 9, 0);
      [-1, 1].forEach((z) => part(g, G.box(0.3, 6.5, 0.3), blue, 40, top + 3.2, z * (BW + 3)));
    }
    root.add(KT.bake(g));
    root.add(live);
    // passengers waiting on the platforms
    const rng = KT.makeRng(st.s | 0);
    const LOOKS = [['male', 'mundu'], ['female', 'saree'], ['male', 'tee'], ['female', 'churidar'], ['male', 'casual']];
    for (let i = 0; i < 6; i++) {
      const look = LOOKS[i % LOOKS.length], pz = plats[i % plats.length];
      const ch = KT.Models.character({ gender: look[0], outfit: look[1], lite: true, seed: (st.s | 0) + i, skin: [0xc08660, 0x8d5a3b, 0xd9a27c][i % 3] });
      ch.position.set((rng() - 0.5) * 80, top, pz + (rng() - 0.5) * 2.5);
      ch.rotation.y = rng() * 6.28;
      live.add(ch);
    }
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // walk on the platforms (in the station's axes)
    root.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(root.matrixWorld).invert(), v = new T.Vector3();
    Hw.addPlatform(f.x, f.z, 0, PL / 2 + 10, (lx, lz) => {
      v.set(f.x + lx, y, f.z + lz).applyMatrix4(inv);
      for (const pz of plats) if (Math.abs(v.x) < PL / 2 && Math.abs(v.z - pz) < 2.5) return y + top;
      return null;
    });
    const W = (x, z) => v.set(x, 0, z).applyMatrix4(root.matrixWorld).clone();
    const b0 = W(0, bz);
    Hw.addCollider({ type: 'box', x: b0.x, z: b0.z, hw: 17, hd: 4.5, rot: root.rotation.y });
    st.live = live;
    st.root = root;
    return root;
  }

  // --------------------------------------------------------------- trains
  // an electric engine and coaches (blue and grey, or red-and-grey)
  let carProtos = null;
  function cars() {
    if (carProtos) return carProtos;
    const coach = (body, band) => {
      const g = new T.Group();
      const tex = canvasTex(256, 64, (c, W, H) => {
        c.fillStyle = body; c.fillRect(0, 0, W, H);
        c.fillStyle = band; c.fillRect(0, 42, W, 8);
        for (let i = 0; i < 11; i++) { c.fillStyle = '#1e262c'; c.fillRect(12 + i * 21.5, 14, 13, 17); }
        c.fillStyle = '#4a5056'; c.fillRect(2, 10, 8, 42); c.fillRect(W - 10, 10, 8, 42);
      });
      const side = new T.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.2 });
      part(g, G.box(3, 3.1, 21), side, 0, 2.55, 0);
      const roofM = KT.mat('coachRoof', { color: 0x8d9296, roughness: 0.5, metalness: 0.4 });
      part(g, G.box(3, 0.3, 21), roofM, 0, 4.25, 0);
      part(g, G.box(2.3, 0.22, 20.6), roofM, 0, 4.5, 0);
      part(g, G.box(2.4, 0.8, 19), KT.mat('coachUnder', { color: 0x26282a, roughness: 0.8 }), 0, 0.75, 0);
      return KT.bake(g);
    };
    const engine = () => {
      const g = new T.Group();
      const red = KT.mat('locoRed', { color: 0xb3261e, roughness: 0.45, metalness: 0.2 }), white = KT.mat('locoWhite', { color: 0xf2efe6, roughness: 0.45 });
      part(g, G.box(3.1, 3.6, 18), red, 0, 2.8, 0);
      part(g, G.box(3.15, 0.55, 18.1), white, 0, 2.3, 0);
      [-1, 1].forEach((e) => {
        part(g, G.box(2.7, 1.2, 0.2), KT.mat('locoGlass', { color: 0x1d2a31, roughness: 0.08, metalness: 0.4 }), 0, 3.7, e * 9.02);
        part(g, G.sph(0.2, 8, 6), KT.M.lampGlow, 0, 4.4, e * 9.05);
      });
      part(g, G.box(2.4, 0.8, 17), KT.mat('coachUnder', { color: 0x26282a, roughness: 0.8 }), 0, 0.75, 0);
      // pantograph up to the wire
      part(g, G.box(0.1, 1.3, 0.1), KT.M.darkGrey, 0, 5.2, -3, 0.5, 0, 0);
      part(g, G.box(1.6, 0.08, 0.1), KT.M.darkGrey, 0, 5.8, -3.3);
      return KT.bake(g);
    };
    carProtos = { engine: engine(), blue: coach('#2f5f9f', '#e8e2d0'), grey: coach('#d6d9dc', '#2f5fa0'), lhb: coach('#c9c9c6', '#b3261e') };
    return carProtos;
  }
  const DWELL = 18, SPEED = 22, CAR = 21.6;
  function timetable(R) {
    // times along the line, out and back, stopping at each station
    const stops = R.stops.map((s) => s.s).sort((a, b) => a - b);
    const legs = [];
    let t = 0;
    for (let i = 0; i < stops.length; i++) {
      legs.push({ t0: t, t1: t + DWELL, s0: stops[i], s1: stops[i] });
      t += DWELL;
      if (i < stops.length - 1) { const d = stops[i + 1] - stops[i]; legs.push({ t0: t, t1: t + d / SPEED, s0: stops[i], s1: stops[i + 1] }); t += d / SPEED; }
    }
    return { legs, T: t };
  }
  function trainAt(tr, time) {
    const tt = tr.R.tt, P = tt.T * 2;
    let u = (time + tr.offset) % P;
    const back = u > tt.T;
    if (back) u = P - u;
    let leg = tt.legs[0];
    for (let i = 0; i < tt.legs.length; i++) { if (u <= tt.legs[i].t1) { leg = tt.legs[i]; break; } }
    const k = leg.t1 > leg.t0 ? (u - leg.t0) / (leg.t1 - leg.t0) : 0;
    // ease out of and into the stations
    const e = k * k * (3 - 2 * k);
    return { s: leg.s0 + (leg.s1 - leg.s0) * e, back, moving: leg.s1 !== leg.s0 };
  }
  Rail.trainAt = (tr, t) => trainAt(tr, t);
  Rail._prof = { buildChunk: (R, k) => buildChunk(R, k), buildStation: (st) => buildStation(st) };
  function makeTrains() {
    Rail.lines.forEach((R, li) => {
      R.tt = timetable(R);
      const n = Math.max(1, Math.round(R.len / 7000)) * (R.double ? 2 : 1);
      for (let i = 0; i < n; i++) Rail.trains.push({ R, offset: (R.tt.T * 2 / n) * i + li * 37, cars: 6 + ((li + i) % 3), livery: ['blue', 'grey', 'lhb'][(li + i) % 3], mesh: null });
    });
  }
  function trainMesh(tr) {
    const P = cars(), g = new T.Group(), list = [];
    const e = P.engine.clone(); g.add(e); list.push(e);
    for (let i = 0; i < tr.cars; i++) { const c = P[tr.livery].clone(); g.add(c); list.push(c); }
    g.userData.cars = list;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function placeTrain(tr, st) {
    const R = tr.R, list = tr.mesh.userData.cars;
    // the engine leads; on a double line each way has its own track (on the left)
    const lat = R.double ? (st.back ? TRACK : -TRACK) : 0, dir = st.back ? -1 : 1;
    list.forEach((c, i) => {
      const s = KT.clamp(st.s - dir * (i * CAR + (i ? 2 : 0)), 0, R.len), f = R.frame(s);
      c.position.set(f.x + f.rx * lat, R.y(s), f.z + f.rz * lat);
      c.rotation.y = f.heading + (st.back ? Math.PI : 0);
    });
  }

  // --------------------------------------------------------------- update
  let scene = null;
  Rail.update = function (dt, pos) {
    if (!Rail.ready) return;
    const Hw = KT.Highway;
    if (!scene || scene !== Hw.scene) { scene = Hw.scene; makeTrains(); }
    Rail.time += dt;
    // stream the track pieces
    Rail.lines.forEach((R) => {
      if (!R.near(pos.x, pos.z, 1000)) return;
      const p = R.project(pos.x, pos.z);
      if (p.d > 1100) return;
      const k0 = Math.max(0, Math.floor((p.s - 900) / CH)), k1 = Math.min(Math.floor(R.len / CH), Math.floor((p.s + 900) / CH));
      for (let k = k0; k <= k1; k++) {
        const key = R.id + ':' + k;
        if (chunks.has(key)) continue;
        const f = R.frame(Math.min(R.len, k * CH + CH / 2));
        if (Math.hypot(f.x - pos.x, f.z - pos.z) > 1000) continue;
        const g = buildChunk(R, k);
        scene.add(g);
        chunks.set(key, { g, x: f.x, z: f.z });
        break; // (one piece a frame)
      }
    });
    chunks.forEach((c, key) => {
      if (Math.hypot(c.x - pos.x, c.z - pos.z) > 1400) { scene.remove(c.g); c.g.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); chunks.delete(key); }
    });
    // stations and crossings near you
    Rail.stations.forEach((st) => {
      if (st.tvm) {
        if (!st.hooked) { st.hooked = true; Hw.interactables.push({ label: '\u{1F686} Take a train from ' + st.name, radius: 10, pos: () => new T.Vector3(st.platform.x, Hw.groundY(st.platform.x, st.platform.z, st.y + 2).y, st.platform.z), action: () => Rail.openTravel(st) }); }
        return;
      }
      const d = Math.hypot(st.x - pos.x, st.z - pos.z);
      if (!st.root && d < 800) {
        scene.add(buildStation(st));
        Hw.interactables.push({ label: '\u{1F686} Take a train from ' + st.name, radius: 10, pos: () => new T.Vector3(st.platform.x, st.y + 0.8, st.platform.z), action: () => Rail.openTravel(st) });
      }
      if (st.root) { st.root.visible = d < 1200; st.live.visible = d < 300; }
    });
    Rail.crossings.forEach((c) => {
      const d = Math.hypot(c.x - pos.x, c.z - pos.z);
      if (!c.gates && d < 700) scene.add(buildGates(c));
      if (c.gates) c.gates.g.visible = d < 900;
    });
    // trains
    Rail.trains.forEach((tr) => {
      const st = trainAt(tr, Rail.time), f = tr.R.frame(st.s);
      const near = Math.hypot(f.x - pos.x, f.z - pos.z) < 1500;
      tr.now = st;
      if (near && !tr.mesh) { tr.mesh = trainMesh(tr); scene.add(tr.mesh); }
      if (tr.mesh) {
        tr.mesh.visible = near;
        if (near) placeTrain(tr, st);
      }
    });
    // gates come down while a train is within 220 m
    Rail.crossings.forEach((c) => {
      if (!c.gates || !c.gates.g.visible) return;
      const busy = Rail.trains.some((tr) => tr.R === c.R && tr.now && Math.abs(tr.now.s - c.s) < 220 + tr.cars * CAR);
      c.gates.down = KT.clamp(c.gates.down + (busy ? dt : -dt) * 0.8, 0, 1);
      c.gates.arms.forEach((a) => { a.rotation.x = -(1 - c.gates.down) * 1.35; });
    });
  };

  // ------------------------------------------------------------ travel
  Rail.openTravel = function (from) {
    const G2 = KT.Game, list = document.getElementById('travel-list');
    if (!list || !G2.data) return;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let html = '<h3>\u{1F686} Trains from ' + esc(from.name) + '</h3><p class="muted">Pick your station. Tickets are on Kerala’s railways.</p>';
    LINES.forEach((L, li) => {
      html += '<h3>' + esc(L.name) + '</h3><div class="travel-grid">';
      L.stops.forEach((k) => {
        const st = Rail.stations.find((x) => x.key === k);
        if (!st) return;
        const here = st === from;
        html += '<button class="travel-btn' + (here ? ' here' : '') + '" data-rail="' + Rail.stations.indexOf(st) + '"><span class="t-name"><span class="t-icon">\u{1F689}</span> ' + esc(st.name) + '</span><span class="t-ml">' + esc(st.ml) + '</span><span class="t-sub">' + (here ? 'You are here' : 'Take the train') + '</span></button>';
      });
      html += '</div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-rail]').forEach((b) => { b.onclick = () => Rail.travel(+b.dataset.rail, from); });
    G2.setState('fasttravel');
  };
  Rail.travel = async function (i, from) {
    const st = Rail.stations[i], G2 = KT.Game;
    if (!st || st === from) { G2.setState('playing'); return; }
    const Hw = KT.Highway, p = st.platform;
    const f = st.R.frame(st.s);
    await G2.goHighway({ spot: { x: p.x, z: p.z, heading: f.heading }, quiet: true });
    // (stand up on the platform)
    const P = KT.Player;
    P.pos.y = Hw.groundY(p.x, p.z, st.y + 3).y;
    KT.UI.banner(st.name, st.ml + '  •  \u{1F686} by train from ' + from.name, 'title');
    KT.Audio.play('star');
  };

  // the lines on the maps (for ui.js)
  Rail.drawPaths = function (g, toMap, width, near) {
    Rail.lines.forEach((R) => {
      if (near && !R.near(near.x, near.z, near.r)) return;
      const draw = (w, col, dash) => {
        g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.lineCap = 'butt';
        g.beginPath();
        const step = Math.max(10, R.len / 500);
        for (let s = 0; s <= R.len; s += step) { const f = R.frame(s), m = toMap(f.x, f.z); if (s === 0) g.moveTo(m[0], m[1]); else g.lineTo(m[0], m[1]); }
        g.stroke();
      };
      draw(width + 2, '#3b2a22');
      draw(width, '#f4efe2', [width * 2.5, width * 2.5]);
      g.setLineDash([]);
    });
    Rail.stations.forEach((st) => {
      if (st.x === undefined) return;
      const m = toMap(st.x, st.z);
      g.fillStyle = '#fff'; g.strokeStyle = '#3b2a22'; g.lineWidth = 2;
      g.beginPath(); g.arc(m[0], m[1], width + 2.5, 0, Math.PI * 2); g.fill(); g.stroke();
    });
  };
})();
