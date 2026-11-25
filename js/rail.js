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
  // the station names in Hindi, for the three-language name slabs
  const HI = {
    tvm: 'तिरुवनंतपुरम सेंट्रल', kzk: 'कझक्कूट्टम', vkl: 'वर्कला शिवगिरि', pvr: 'परवूर', klm: 'कोल्लम जंक्शन', kpy: 'करुनागप्पल्ली', kyj: 'कायंकुलम जंक्शन',
    hpd: 'हरिपाद', amp: 'अंबलप्पुझा', alp: 'आलप्पुझा', srtl: 'चेर्तला', mvlk: 'मावेलिक्कर', cngr: 'चेंगन्नूर', tvla: 'तिरुवल्ला', ktym: 'कोट्टयम', etmd: 'एट्टुमानूर',
    vkm: 'वैक्कम रोड', tpj: 'त्रिप्पूणित्तुरा', ers: 'एर्णाकुलम जंक्शन', awy: 'आलुवा', aly: 'अंगमाली', ckl: 'चालक्कुडी', tcr: 'त्रिशूर', wki: 'वडक्कांचेरी',
    srr: 'शोरनूर जंक्शन', otp: 'ओट्टप्पालम', pgt: 'पालक्काड जंक्शन', wlyr: 'वालयार', ptb: 'पट्टाम्बी', kty: 'कुट्टिप्पुरम', tir: 'तिरूर', pgi: 'परप्पनंगाडी', fk: 'फरोक',
    clt: 'कोझिक्कोड', qln: 'कोयिलांडी', bdj: 'वडकरा', mahe: 'माहे', tly: 'तलश्शेरी', can: 'कण्णूर', pay: 'पय्यन्नूर', kzgd: 'कान्हंगाड', ksd: 'कासरगोड', mjs: 'मंजेश्वर',
    kunr: 'कुंडरा', kkz: 'कोट्टारक्करा', pnlr: 'पुनलूर', tml: 'तेन्मला', akv: 'आर्यनकावु', nyy: 'नेय्याट्टिनकरा', psa: 'पारश्शाला', gvr: 'गुरुवायूर', agp: 'अंगाडिप्पुरम',
    nil: 'निलंबूर रोड', klgd: 'कोल्लंगोड', chts: 'कोच्चि हार्बर टर्मिनस'
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
        // (nor in an overbridge's walled cutting)
        const c = Rail.crossings.find((c) => c.R === R && Math.abs(c.s - st.s) < 100) || Rail.robs.find((b) => b.R === R && Math.abs(b.s - st.s) < b.reachS + 90);
        if (!c) break;
        const ns = c.s + (st.s >= c.s ? 1 : -1) * (c.reachS ? c.reachS + 95 : 105);
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
  // road overbridges: a highway climbs over the line on a concrete deck,
  // between block-walled abutments; the line runs through a cutting there
  Rail.robs = [];
  const ROB_CLEAR = 9.4; // (road over rail: room for the overhead wires)
  function crossings(Hw, M) {
    const found = [];
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
          if (on && !inside) found.push({ R, s: i * M.STEP, V, vs: p.s, x, z, BW });
          inside = on;
        }
      });
    });
    // the highways go over on a bridge where they have room for the ramps;
    // the village roads and lanes (and a crowded highway) cross on the level
    found.forEach((c) => {
      if (!c.V.country && robFits(Hw, M, c, found)) { makeRob(Hw, M, c); return; }
      M.levelAt(c.R.PY, c.s, c.V.y(c.vs) + 0.08, 14, 140);
      Rail.crossings.push(Object.assign(c, { gates: null }));
      c.V.junctions.push({ s: c.vs, side: 0, other: c.R, rail: true });
    });
  }
  function robFits(Hw, M, c, found) {
    const V = c.V, need = Math.max(0, ROB_CLEAR - (V.y(c.vs) - c.R.y(c.s))), ramp = Math.max(130, need / 0.04);
    c.need = need; c.ramp = ramp;
    if (c.vs < ramp + 20 || c.vs > V.len - ramp - 20) return false;
    // (no junction on the ramps, no other crossing, underpass, town or sight near)
    if (V.junctions.some((j) => Math.abs(j.s - c.vs) < ramp + 30)) return false;
    if (found.some((o) => o !== c && o.V === V && Math.abs(o.vs - c.vs) < ramp * 2 + 40)) return false;
    if ((Hw.cuts || []).some((k) => (k.U === V && Math.abs(k.su - c.vs) < ramp + 80) || (k.L === V && Math.abs(k.sl - c.vs) < ramp + 80))) return false;
    const reach = ramp + 90;
    if (Hw.PADS.some((P) => Math.hypot(P.x - c.x, P.z - c.z) < reach + P.r)) return false;
    if (V.main && KT.DISTRICTS.some((d, i) => Math.abs(Hw.hubS(i) - c.vs) < 340 + ramp)) return false;
    if (Hw.hubs && Hw.hubs.some((h) => h.x !== undefined && Math.hypot(h.x - c.x, h.z - c.z) < 340 + ramp)) return false;
    return true;
  }
  function makeRob(Hw, M, c) {
    const V = c.V, R = c.R, HU = V.half || M.ROAD_HALF, need = c.need, ramp = c.ramp;
    // lift the road, with long, gentle ramps either side
    if (need > 0) for (let i = 0; i <= V.LAST; i++) {
      const d = Math.abs(i * M.STEP - c.vs);
      if (d < ramp) V.PY[i] += need * (1 - KT.smoothstep(ramp * 0.18, ramp, d));
    }
    const fu = V.frame(c.vs), fr = R.frame(c.s);
    const sin = Math.max(0.3, Math.abs(fu.fx * fr.rz - fu.fz * fr.rx));
    const wl = c.BW + 3.8;                               // (the abutment walls stand this far out from the line)
    const span = Math.min(60, (wl + 1.2) / sin + 2);    // (the deck, along the road)
    const reachS = Math.min(140, (HU + 34) / sin);      // (the walled cutting, along the line)
    const rob = { R, s: c.s, V, vs: c.vs, x: c.x, z: c.z, BW: c.BW, wl, cut: wl + 7.5, span, reachS, sin, built: null };
    Rail.robs.push(rob);
    // the highway draws the deck and its parapets, and knows what is under it
    Hw.cuts.push({ U: V, su: c.vs, L: R, sl: c.s, x: c.x, z: c.z, span, len: 0, w1: wl, reach: span + 30, depth: V.y(c.vs) - R.y(c.s), rail: true });
    for (let s = c.vs - span; s <= c.vs + span; s += 6) {
      const f = V.frame(s);
      [-1, 1].forEach((sd) => { const q = V.at(s, sd * (HU + 0.35)); Hw.addCollider({ type: 'box', x: q.x, z: q.z, hw: 0.2, hd: 3.2, rot: f.heading, minY: V.y(s) - 2 }); });
    }
  }
  // (is (s, lateral d) on line R inside an overbridge's walled cutting?)
  function robAt(R, s) {
    for (let i = 0; i < Rail.robs.length; i++) { const b = Rail.robs[i]; if (b.R === R && Math.abs(s - b.s) < b.reachS) return b; }
    return null;
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
      // (under an overbridge the cutting is walled: sheer at the abutments,
      // easing back to the usual banks towards its ends)
      const b = Rail.robs.length ? robAt(R, p.s) : null;
      let w;
      if (b) {
        const e = KT.smoothstep(b.reachS * 0.75, b.reachS, Math.abs(p.s - b.s));
        // (the ground is cut flat a little past the walls, so the land's
        // coarse mesh can only rise behind them, never in front)
        const sheer = p.d < b.cut ? 1 : 0, soft = 1 - KT.smoothstep(bedHalf(R) + 1.5, bedHalf(R) + 16 + 20 * gh, p.d);
        w = cw * KT.lerp(sheer, soft, e);
      } else w = cw * (1 - KT.smoothstep(bedHalf(R) + 1.5, bedHalf(R) + 16 + 20 * gh, p.d));
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

  // an overbridge's abutments: block-faced retaining walls either side of the
  // line, from the track up to the land the road's embankment holds up
  let robBlock = null;
  function buildRob(b) {
    const Hw = KT.Highway, R = b.R, g = new T.Group();
    if (!robBlock) {
      const tex = canvasTex(256, 256, (x, W, H) => {
        const rng = KT.makeRng(41);
        x.fillStyle = '#7d8083'; x.fillRect(0, 0, W, H);
        const bh = 32, bw = 64;
        for (let r = 0; r < H / bh; r++) for (let c = -1; c < W / bw + 1; c++) {
          const ox = (r % 2) * bw / 2, v = 128 + Math.floor(rng() * 34);
          x.fillStyle = 'rgb(' + v + ',' + (v + 2) + ',' + (v + 4) + ')';
          x.fillRect(c * bw + ox + 2, r * bh + 2, bw - 4, bh - 4);
        }
        for (let i = 0; i < 900; i++) { const v = 90 + rng() * 80; x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.35)'; x.fillRect(rng() * W, rng() * H, 2, 2); }
      }, true);
      robBlock = KT.mat('robBlock', { map: tex, roughness: 0.92, side: T.DoubleSide });
    }
    const wall = L(), shelf = Object.assign(L(), { col: [] }), cope = new T.Group(), coping = KT.mat('robCoping', { color: 0xb9b6ae, roughness: 0.85 });
    [-1, 1].forEach((sd) => {
      const lat = sd * b.wl, base = wall.pos.length / 3, sbase = shelf.pos.length / 3;
      let n = 0;
      for (let s = b.s - b.reachS; s <= b.s + b.reachS + 0.01; s += 2) {
        const ss = KT.clamp(s, 0, R.len), f = R.frame(ss), y0 = R.y(ss) - 0.9;
        // the wall's top: the land beyond the cut, easing to the bank's own
        // height where the cutting ends
        const e = KT.smoothstep(b.reachS * 0.75, b.reachS, Math.abs(ss - b.s));
        const o1 = R.at(ss, sd * (b.cut + 6)), o2 = R.at(ss, sd * (b.wl + 0.9));
        const top = Math.max(y0 + 0.2, KT.lerp(Hw.height(o1.x, o1.z), Hw.height(o2.x, o2.z), e) + 0.15);
        const q = R.at(ss, lat), out = R.at(ss, sd * (b.cut + 6.5));
        wall.pos.push(q.x, y0, q.z, q.x, top, q.z);
        wall.uv.push(ss / 4, 0, ss / 4, (top - y0) / 2);
        if (n) { const a = base + (n - 1) * 2, c2 = base + n * 2; wall.idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
        // (a grassy shelf at the wall's top over the cut behind it)
        shelf.pos.push(q.x, top - 0.02, q.z, out.x, top - 0.02, out.z);
        shelf.uv.push(q.x / 7, q.z / 7, out.x / 7, out.z / 7);
        [q, out].forEach((p) => { const c = Hw.groundColor(p.x, p.z, top); shelf.col.push(c.r, c.g, c.b); });
        if (n) { const a = sbase + (n - 1) * 2, c2 = sbase + n * 2; shelf.idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
        if (top - y0 > 0.6) part(cope, G.box(0.7, 0.18, 2.05), coping, q.x + f.rx * sd * 0.2, top + 0.05, q.z + f.rz * sd * 0.2, 0, f.heading, 0);
        n++;
      }
    });
    const wm = meshOf(wall, robBlock); wm.castShadow = true; g.add(wm);
    // (each side's shelf faces up: flip any side whose triangles face down)
    const half = shelf.idx.length / 2;
    for (let k = 0; k < 2; k++) {
      const i0 = k * half, a = shelf.idx[i0] * 3, b2 = shelf.idx[i0 + 1] * 3, c3 = shelf.idx[i0 + 2] * 3, P = shelf.pos;
      const ny = (P[b2 + 2] - P[a + 2]) * (P[c3] - P[a]) - (P[b2] - P[a]) * (P[c3 + 2] - P[a + 2]);
      if (ny < 0) for (let i = i0; i < i0 + half; i += 3) { const t = shelf.idx[i + 1]; shelf.idx[i + 1] = shelf.idx[i + 2]; shelf.idx[i + 2] = t; }
    }
    const sm = meshOf(shelf, Hw.terrainMat());
    sm.geometry.setAttribute('color', new T.Float32BufferAttribute(shelf.col, 3));
    g.add(sm);
    g.add(KT.bake(cope));
    b.built = g;
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
    // a lifting boom on each side of the line, right across the road: yellow
    // and black, with red plates hanging under it, on a counterweighted post
    const red = KT.mat('lcRed', { color: 0xd0202e, roughness: 0.5 }), striped = KT.mat('lcStripe', { map: canvasTex(64, 8, (x, W) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1b1b1b' : '#f2c230'; x.fillRect(i * W / 8, 0, W / 8, 8); } }), roughness: 0.5 });
    const postStripe = KT.mat('lcPostStripe', { map: canvasTex(8, 64, (x, W, H) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1b1b1b' : '#f4f4f0'; x.fillRect(0, i * H / 8, W, H / 8); } }), roughness: 0.55 });
    const boomLen = half * 2 + 1.6;
    [-1, 1].forEach((along) => {
      const side = along; // (the pivots stand on opposite sides of the road)
      const q = P(along * (span + 2.5), side * (half + 1.0));
      part(g, G.box(0.4, 1.3, 0.4), MT.gatePost, q.x, y + 0.65, q.z);
      const rest = P(along * (span + 2.5), -side * (half + 1.0)); // (the boom rests on a short post across the road)
      part(g, G.box(0.18, 0.95, 0.18), postStripe, rest.x, y + 0.48, rest.z);
      const pivot = new T.Group();
      pivot.position.set(q.x, y + 1.1, q.z);
      pivot.rotation.y = f.heading + (side > 0 ? Math.PI / 2 : -Math.PI / 2); // (across the road, from its post)
      part(pivot, G.box(0.16, 0.16, boomLen), striped, 0, 0, boomLen / 2 - 0.2).castShadow = true;
      part(pivot, G.box(0.5, 0.5, 0.7), MT.gatePost, 0, 0, -0.75); // (the counterweight)
      for (let k = 1.1; k < boomLen - 0.6; k += 0.95) part(pivot, G.box(0.05, 0.62, 0.2), red, 0, -0.42, k);
      g.add(pivot);
      arms.push(pivot);
    });
    // a red STOP disc by each boom, and a height gauge over each approach
    const stopM = new T.MeshStandardMaterial({ map: (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const x = cv.getContext('2d');
      x.fillStyle = '#c8202b'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold 30px sans-serif'; x.fillText('STOP', 64, 52);
      x.font = 'bold 19px sans-serif'; x.fillText('നിൽക്കുക', 64, 80);
      x.fillStyle = '#ff6a6a'; [[64, 12], [64, 116], [14, 64], [114, 64], [30, 30], [98, 30], [30, 98], [98, 98]].forEach(([a, c]) => { x.beginPath(); x.arc(a, c, 5, 0, Math.PI * 2); x.fill(); });
      const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; return t;
    })(), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.5 });
    [-1, 1].forEach((along) => {
      const q = P(along * (span + 3.6), -along * (half + 1.3)), face = f.heading + (along > 0 ? 0 : Math.PI);
      part(g, G.cyl(0.05, 0.05, 2.6, 6), KT.M.darkGrey, q.x, y + 1.3, q.z);
      part(g, G.plane(1.1, 1.1), stopM, q.x, y + 2.3, q.z, 0, face, 0).castShadow = false;
      // (the height gauge: a black-and-white portal that high vehicles cannot pass)
      const gl = P(along * (span + 9), -(half + 0.8)), gr = P(along * (span + 9), half + 0.8);
      [gl, gr].forEach((p) => part(g, G.box(0.25, 5.0, 0.25), postStripe, p.x, y + 2.5, p.z));
      const gm = P(along * (span + 9), 0);
      part(g, G.box(0.22, 0.25, half * 2 + 1.9), KT.mat('lcGaugeBar', { map: canvasTex(64, 8, (x, W) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#1b1b1b' : '#f4f4f0'; x.fillRect(i * W / 12, 0, W / 12, 8); } }), roughness: 0.55 }), gm.x, y + 4.85, gm.z, 0, f.heading + Math.PI / 2, 0);
    });
    // weathered plank fencing along the line, beside the road
    const plank = KT.mat('lcPlank', { color: 0x9c968c, roughness: 0.95 }), fence = new T.Group();
    const R = c.R, rs = (half + 1.4) / sin;
    [-1, 1].forEach((dir) => [-1, 1].forEach((sd) => {
      for (let d = rs; d < rs + 12; d += 0.32) {
        const s = c.s + dir * d, fr = R.frame(s), q = R.at(s, sd * (c.BW + 2.8));
        const ry = R.y(s);
        part(fence, G.box(0.16, 1.5 + ((d * 7) % 0.3), 0.04), plank, q.x, ry - 0.2 + 0.75, q.z, 0, fr.heading + Math.PI / 2, 0);
      }
      [0.25, 1.05].forEach((hh) => { const s = c.s + dir * (rs + 6), fr = R.frame(s), q = R.at(s, sd * (c.BW + 2.85)); part(fence, G.box(0.06, 0.08, 12), plank, q.x, R.y(s) - 0.2 + hh, q.z, 0, fr.heading, 0); });
    }));
    g.add(KT.bake(fence));
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
  // the yellow name slab: Malayalam, Hindi, English
  function stationBoard(st, plain) {
    const lines = [{ text: st.ml, size: 42 }, { text: HI[st.key] || '', size: 38 }, { text: st.name.toUpperCase(), size: 48 }];
    return new T.MeshStandardMaterial({ map: KT.textTexture(lines, { bg: '#f2c230', color: '#1b1b1b', border: !plain, borderColor: '#1b1b1b', width: 640, height: 260 }), roughness: 0.6 });
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
    const junction = st.lines.length > 1;
    // red-oxide floor tiles, the white edge with the yellow line a step in,
    // a red face to the track
    const floorTex = canvasTex(256, 64, (c, W, H) => {
      c.fillStyle = '#9a4b3b'; c.fillRect(0, 0, W, H);
      const rng = KT.makeRng(31);
      for (let i = 0; i < 400; i++) { c.fillStyle = 'rgba(255,225,195,' + rng() * 0.09 + ')'; c.fillRect(rng() * W, rng() * H, 4, 4); }
      c.strokeStyle = 'rgba(55,18,12,0.4)'; c.lineWidth = 1;
      for (let x = 0; x <= W; x += 32) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke(); }
      for (let y = 0; y <= H; y += 32) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke(); }
    }, true);
    floorTex.repeat.set(PL / 4, 1.25);
    const floorM = new T.MeshStandardMaterial({ map: floorTex, roughness: 0.92 });
    const white = KT.mat('stWhite', { color: 0xf2f2ee, roughness: 0.7 }), redFace = KT.mat('stRedFace', { color: 0x8e3424, roughness: 0.85 });
    const steel = KT.mat('stSteel', { color: 0xd9b23a, roughness: 0.5, metalness: 0.3 }); // yellow-painted columns
    const blueSheet = KT.mat('stBlueSheet', { color: 0x2f7fd0, roughness: 0.45, metalness: 0.25, side: T.DoubleSide });
    const pipe = KT.mat('stPipe', { color: 0x9aa0a6, roughness: 0.4, metalness: 0.6 }), grey = KT.mat('stGantry', { color: 0x6f7378, roughness: 0.5, metalness: 0.5 });
    const SL = junction ? 96 : 60; // the shelter's length
    const numBoard = (n) => new T.MeshStandardMaterial({ map: KT.textTexture([{ text: String(n), size: 96 }], { bg: '#f2c230', color: '#1b1b1b', border: true, borderColor: '#1b1b1b', width: 128, height: 128 }), roughness: 0.6 });
    const exitBoard = new T.MeshStandardMaterial({ map: KT.textTexture([{ text: '⇦ WAY OUT', size: 54 }, { text: 'പുറത്തേക്ക്', size: 44 }], { bg: '#1d4f91', color: '#ffffff', border: false, width: 512, height: 160 }), roughness: 0.6 });
    plats.forEach((pz, pi) => {
      const sg = Math.sign(pz), inner = pz - sg * 2.5; // (the edge by the track)
      part(g, G.box(PL, top + 0.3, 5), plat, 0, (top - 0.3) / 2, pz);
      part(g, G.plane(PL, 5), floorM, 0, top + 0.012, pz, -Math.PI / 2, 0, 0);
      part(g, G.box(PL, 0.02, 0.3), white, 0, top + 0.02, inner + sg * 0.15);
      part(g, G.box(PL, 0.02, 0.14), edge, 0, top + 0.02, inner + sg * 1.1);
      part(g, G.box(PL, top + 0.25, 0.06), redFace, 0, (top - 0.25) / 2, inner - sg * 0.02);
      // the shelter: blue sheet roof on yellow steel columns, tube lights under it
      // (on a double line the roof stops short of the overbridge's stairs)
      const x0 = -SL / 2, x1 = R.double ? Math.min(SL / 2, 38) : SL / 2, cx = (x0 + x1) / 2, len = x1 - x0;
      for (let x = x0 + 3; x <= x1 - 3; x += 9) {
        part(g, G.box(0.22, 3.9, 0.22), steel, x, top + 1.95, pz);
        part(g, G.box(0.1, 0.1, 5.4), steel, x, top + 3.95, pz);
        if (x + 4.5 < x1) part(g, G.box(1.1, 0.06, 0.12), KT.M.lampGlow, x + 4.5, top + 3.7, pz + sg * 0.5);
      }
      part(g, G.box(len, 0.1, 0.1), steel, cx, top + 3.95, pz);
      [-1, 1].forEach((s) => part(g, G.box(len + 1, 0.06, 3.1), blueSheet, cx, top + 4.02, pz + s * 1.5, s * 0.12, 0, 0));
      // the platform's number at both ends of the shelter; a way-out board
      const nb = numBoard(pi + 1);
      [-1, 1].forEach((e) => [1, -1].forEach((fs) => part(g, G.plane(0.7, 0.7), nb, (e > 0 ? x1 - 3 : x0 + 3) + fs * 0.03, top + 3.3, pz, 0, fs > 0 ? Math.PI / 2 : -Math.PI / 2, 0)));
      [1, -1].forEach((fs) => part(g, G.plane(2.2, 0.68), exitBoard, 13.5 + fs * 0.03, top + 3.25, pz, 0, fs > 0 ? Math.PI / 2 : -Math.PI / 2, 0));
      // the yellow name slabs at both ends and the middle, with a red-and-white
      // picket fence either side of each
      const board = stationBoard(st);
      [-62, 0, 62].forEach((x) => {
        const z = pz + sg * 1.75;
        part(g, G.box(3.9, 0.5, 0.3), edge, x, top + 0.25, z);
        part(g, G.box(3.9, 1.55, 0.22), edge, x, top + 1.27, z);
        [1, -1].forEach((fs) => part(g, G.plane(3.7, 1.45), board, x, top + 1.27, z + fs * 0.115, 0, fs > 0 ? 0 : Math.PI, 0));
        [-1, 1].forEach((d) => {
          for (let k = 0; k < 4; k++) part(g, G.box(0.08, 0.9, 0.08), k % 2 ? redFace : white, x + d * (2.3 + k * 0.5), top + 0.45, z);
          part(g, G.box(1.9, 0.06, 0.06), redFace, x + d * 3.05, top + 0.8, z);
        });
      });
      for (let x = -20; x <= 20; x += 10) { const b = KT.Models.bench(); b.position.set(x, top, pz + sg * 1.2); b.rotation.y = pz > 0 ? Math.PI : 0; g.add(b); }
      for (let x = -70; x <= 70; x += 28) { const l = KT.Models.lampPost(); l.position.set(x, top, pz + sg * 2.1); g.add(l); }
    });
    // on a double line, the black-and-white posts and pipe rails between the tracks
    if (R.double) {
      for (let x = -PL / 2; x <= PL / 2; x += 3) { part(g, G.box(0.1, 0.5, 0.1), KT.M.darkGrey, x, 0.45, 0); part(g, G.box(0.1, 0.5, 0.1), white, x, 0.95, 0); }
      [0.6, 1.05].forEach((y) => part(g, G.box(PL, 0.05, 0.05), pipe, 0, y, 0));
    }
    // the overhead-wire portals at both ends of the platforms
    [-1, 1].forEach((e) => {
      const x = e * (PL / 2 + 4), w = BW + 6;
      [-1, 1].forEach((s) => part(g, G.box(0.25, 8, 0.25), grey, x, 4, s * w));
      part(g, G.box(0.3, 0.3, w * 2 + 0.3), grey, x, 7.7, 0);
      part(g, G.box(0.12, 0.12, w * 2), grey, x, 7.2, 0);
      for (let z = -w + 1; z < w; z += 2) part(g, G.box(0.08, 0.5, 0.08), grey, x, 7.45, z);
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
    // a foot overbridge across the tracks, with stairs down to each platform
    if (R.double) {
      const blue = KT.mat('stFob', { color: 0x2f6fb0, roughness: 0.5, metalness: 0.3 }), span = BW * 2 + 12;
      part(g, G.box(3, 0.4, span), blue, 40, top + 6.5, 0);
      [-1, 1].forEach((s) => part(g, G.box(0.06, 1.0, span), pipe, 40 + s * 1.45, top + 7.2, 0));
      part(g, G.box(3.6, 0.08, span + 0.6), blueSheet, 40, top + 9.2, 0);
      [-1, 1].forEach((s) => [-1, 1].forEach((z) => part(g, G.box(0.14, 2.6, 0.14), blue, 40 + s * 1.6, top + 8, z * (span / 2 - 0.3))));
      plats.forEach((pz) => {
        part(g, G.box(0.3, 6.5, 0.3), blue, 40, top + 3.2, pz);
        // the stair: down along the platform from the deck's end
        const conc = KT.mat('stStair', { color: 0xb9b4aa, roughness: 0.9 });
        part(g, G.box(9.4, 0.25, 1.6), conc, 41.5 + 4.7, top + 3.2, pz, 0, 0, -Math.atan2(6.5, 9.4));
        for (let k = 0; k < 20; k++) part(g, G.box(0.47, 0.325, 1.6), conc, 41.5 + 0.235 + k * 0.47, top + 6.5 - 0.1625 - k * 0.325, pz); // the steps
        [-1, 1].forEach((s) => part(g, G.box(9.4, 0.05, 0.05), pipe, 41.5 + 4.7, top + 4.3, pz + s * 0.8, 0, 0, -Math.atan2(6.5, 9.4)));
        part(g, G.box(0.14, 6.5, 0.14), blue, 50.9, top + 3.25, pz - Math.sign(pz) * 0.9);
        // a blue sheet roof over the stair, on light posts
        part(g, G.box(10.2, 0.06, 2.5), blueSheet, 41.5 + 4.7, top + 3.2 + 2.9, pz, 0, 0, -Math.atan2(6.5, 9.4));
        [41.9, 46.2, 50.5].forEach((x) => [-1, 1].forEach((s) => part(g, G.box(0.08, 2.6, 0.08), pipe, x, top + 6.5 - (x - 41.5) * (6.5 / 9.4) + 1.3, pz + s * 1.1)));
      });
    }
    // a tea stall on the platform (chaya, vada and the newspapers)
    const sp = plats[0], sz = sp + Math.sign(sp) * 1.5;
    part(g, G.box(2.6, 0.9, 1.2), KT.mat('stStall', { color: 0x4e7fb5, roughness: 0.7 }), 38, top + 0.45, sz);
    part(g, G.box(2.8, 0.06, 1.3), KT.M.darkGrey, 38, top + 0.93, sz);
    [-1.2, 1.2].forEach((x) => part(g, G.box(0.08, 2.2, 0.08), KT.M.darkGrey, 38 + x, top + 1.1, sz));
    part(g, G.box(3, 0.08, 1.8), KT.mat('stStallRoof', { color: 0xb3261e, roughness: 0.6 }), 38, top + 2.25, sz, Math.sign(sp) * 0.1, 0, 0);
    const stallBoard = new T.MeshStandardMaterial({ map: KT.textTexture([{ text: 'ചായ • CHAYA', size: 40 }, { text: 'TEA • VADA • SNACKS', size: 28 }], { bg: '#f2c230', color: '#1b1b1b', width: 512, height: 160 }), roughness: 0.6 });
    part(g, G.plane(2.6, 0.8), stallBoard, 38, top + 1.8, sz - Math.sign(sp) * 0.62, 0, sp > 0 ? Math.PI : 0, 0);
    root.add(KT.bake(g));
    root.add(live);
    // people on the platforms: some wait on the benches, some walk up and
    // down with their bags, a porter, the tea seller at his stall
    const rng = KT.makeRng(st.s | 0);
    const LOOKS = [['male', 'mundu'], ['female', 'saree'], ['male', 'tee'], ['female', 'churidar'], ['male', 'casual'], ['female', 'saree'], ['male', 'mundu']];
    st.people = [];
    const person = (i) => {
      const look = LOOKS[i % LOOKS.length];
      const ch = KT.Models.character({ gender: look[0], outfit: look[1], lite: true, seed: (st.s | 0) * 7 + i, skin: [0xc08660, 0x8d5a3b, 0xd9a27c, 0xa5724f][i % 4] });
      live.add(ch);
      return ch;
    };
    plats.forEach((pz) => {
      for (let x = -20; x <= 20; x += 10) if (rng() < 0.65) { // on a bench
        const ch = person(st.people.length);
        ch.position.set(x + (rng() - 0.5) * 0.7, top, pz + Math.sign(pz) * 1.2);
        ch.rotation.y = pz > 0 ? Math.PI : 0;
        st.people.push({ ch, pose: 'sit' });
      }
      for (let i = 0; i < (st.lines.length > 1 ? 7 : 5); i++) { // walking along the platform
        const ch = person(st.people.length), x = (rng() - 0.5) * 110, z = pz + (rng() - 0.5) * 2.4;
        ch.position.set(x, top, z);
        st.people.push({ ch, pose: 'walk', x, z, cz: z, pz, tx: x, wait: rng() * 4, rng, speed: 0.8 + rng() * 0.5, heading: 0 });
      }
      // a knot of people standing talking under the shelter
      const gx = -14 + rng() * 6, gz = pz + Math.sign(pz) * 0.3, n = 3 + (st.lines.length > 1 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, ch = person(st.people.length);
        ch.position.set(gx + Math.cos(a) * 0.75, top, gz + Math.sin(a) * 0.6);
        ch.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
        st.people.push({ ch, pose: 'idle' });
      }
    });
    { // the tea seller behind his counter
      const ch = person(st.people.length);
      ch.position.set(38, top, sz + Math.sign(sp) * 1.1); ch.rotation.y = sp > 0 ? Math.PI : 0;
      st.people.push({ ch, pose: 'idle' });
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
  const sideMats = {};
  function cars() {
    if (carProtos) return carProtos;
    const coach = (body, band, key) => {
      const g = new T.Group();
      const tex = canvasTex(256, 64, (c, W, H) => {
        c.fillStyle = body; c.fillRect(0, 0, W, H);
        c.fillStyle = band; c.fillRect(0, 42, W, 8);
        for (let i = 0; i < 11; i++) {
          c.fillStyle = '#1e262c'; c.fillRect(12 + i * 21.5, 14, 13, 17);
          // the window bars
          c.fillStyle = 'rgba(200,205,210,0.85)';
          [19, 23, 27].forEach((y) => c.fillRect(12 + i * 21.5, y, 13, 1));
        }
        c.fillStyle = '#4a5056'; c.fillRect(2, 10, 8, 42); c.fillRect(W - 10, 10, 8, 42); // the doors
        // the coach's number by the door
        c.fillStyle = '#f2c230'; c.fillRect(W - 34, 5, 20, 8);
        c.fillStyle = '#111'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('S' + (3 + key.length % 6), W - 24, 9.5);
      });
      const side = new T.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.2 });
      sideMats[key] = side;
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
    carProtos = { engine: engine(), blue: coach('#2f5f9f', '#e8e2d0', 'blue'), grey: coach('#d6d9dc', '#2f5fa0', 'grey'), lhb: coach('#c9c9c6', '#b3261e', 'lhb') };
    return carProtos;
  }
  // the coaches you can walk through: the same outside, and inside a floor,
  // cream walls with open windows, blue bench seats in bays facing each
  // other, luggage racks, doors at both ends and passengers in some of the
  // seats. A coach's +z is the way ahead; the vestibule doors at z = ±10.3
  // lead to the next coach.
  const FLOOR = 1.14, SEAT_BAYS = 10, BAY = 1.9, Z0 = -9.5, AISLE = 0.45, DOOR_Z = 9.9;
  // every seat of a coach, in its own axes (sx: which side, fz: which way it
  // faces, win: by the window)
  function coachSeats() {
    const S = [];
    for (let k = 0; k < SEAT_BAYS; k++) {
      const zc = Z0 + BAY / 2 + k * BAY;
      [-1, 1].forEach((sx) => [-1, 1].forEach((fz) => [1.16, 0.64].forEach((x, wi) => S.push({ sx, fz, win: wi === 0, x: sx * x, z: zc - fz * 0.66, taken: false }))));
    }
    return S;
  }
  function openCoach(livery, seed) {
    cars();
    const g = new T.Group(), fixed = new T.Group();
    const side = sideMats[livery];
    const cream = KT.mat('coachWall', { color: 0xe9e2cf, roughness: 0.85 }), floorM = KT.mat('coachFloor', { color: 0x5b5048, roughness: 0.95 });
    const seatM = KT.mat('coachSeat', { color: 0x2b4f8a, roughness: 0.7 }), rack = KT.mat('coachRack', { color: 0x9a9c9e, roughness: 0.5, metalness: 0.5 });
    const roofM = KT.mat('coachRoof', { color: 0x8d9296, roughness: 0.5, metalness: 0.4 }), ceil = KT.mat('coachCeil', { color: 0xf4f1ea, roughness: 0.9 });
    const endM = KT.mat('coachEnd', { color: 0x7d7a72, roughness: 0.8 });
    // outside: the livery on single-sided planes (invisible from within)
    [-1, 1].forEach((s) => part(fixed, G.plane(21, 3.1), side, s * 1.52, 2.55, 0, 0, s * Math.PI / 2, 0));
    [-1, 1].forEach((s) => part(fixed, G.plane(3.04, 3.1), side, 0, 2.55, s * 10.52, 0, s > 0 ? 0 : Math.PI, 0));
    part(fixed, G.box(3, 0.3, 21), roofM, 0, 4.25, 0);
    part(fixed, G.box(2.3, 0.22, 20.6), roofM, 0, 4.5, 0);
    part(fixed, G.box(2.4, 0.8, 19), KT.mat('coachUnder', { color: 0x26282a, roughness: 0.8 }), 0, 0.75, 0);
    // inside
    part(fixed, G.box(2.96, 0.08, 20.9), floorM, 0, FLOOR - 0.04, 0);
    part(fixed, G.box(2.96, 0.06, 20.9), ceil, 0, 4.06, 0);
    [-1, 1].forEach((s) => {
      part(fixed, G.box(0.06, 1.0, 20.9), cream, s * 1.455, 1.6, 0);   // below the windows
      part(fixed, G.box(0.06, 0.72, 20.9), cream, s * 1.455, 3.66, 0); // above them
      for (let k = 0; k <= SEAT_BAYS; k++) part(fixed, G.box(0.06, 1.2, 0.3), cream, s * 1.455, 2.7, Z0 + k * BAY); // the pillars between
      part(fixed, G.box(0.5, 0.03, 20), rack, s * 1.18, 3.38, 0);
    });
    // the end walls, each with the vestibule door in the middle
    [-1, 1].forEach((s) => [-1, 1].forEach((x) => part(fixed, G.box(1.1, 3.0, 0.06), endM, x * 0.93, 2.6, s * 10.42)));
    [-1, 1].forEach((s) => part(fixed, G.box(0.76, 0.9, 0.06), endM, 0, 3.65, s * 10.42));
    // bench seats: two benches face each other in every window bay
    for (let k = 0; k < SEAT_BAYS; k++) {
      const zc = Z0 + BAY / 2 + k * BAY;
      [-1, 1].forEach((sx) => [-1, 1].forEach((fz) => {
        const z = zc - fz * 0.66; // (the bench faces fz: its back is away from the bay's middle)
        part(fixed, G.box(1.05, 0.08, 0.5), seatM, sx * 0.92, FLOOR + 0.45, z);
        part(fixed, G.box(1.05, 0.6, 0.08), seatM, sx * 0.92, FLOOR + 0.78, z - fz * 0.27, -fz * 0.15, 0, 0);
      }));
    }
    g.add(KT.bake(fixed));
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // the other passengers, in some of the seats
    const seats = coachSeats(), rng = KT.makeRng((seed || 0) * 13 + livery.length), LOOKS = [['male', 'mundu'], ['female', 'saree'], ['male', 'tee'], ['female', 'churidar'], ['male', 'casual']];
    const live = new T.Group(), people = [];
    for (let i = 0; i < 5; i++) {
      const seat = seats[Math.floor(rng() * seats.length)];
      if (seat.taken) continue;
      seat.taken = true;
      const look = LOOKS[(i + (seed || 0)) % LOOKS.length];
      const ch = KT.Models.character({ gender: look[0], outfit: look[1], lite: true, seed: 900 + i + (seed || 0) * 7, skin: [0xc08660, 0x8d5a3b, 0xd9a27c][(i + (seed || 0)) % 3] });
      ch.position.set(seat.x, FLOOR - 0.06, seat.z);
      ch.rotation.y = seat.fz > 0 ? 0 : Math.PI;
      KT.Models.animateCharacter(ch, 'sit', 3, 1); // (seated from the start)
      live.add(ch); people.push(ch);
    }
    g.add(live);
    g.userData.people = people;
    g.userData.seats = seats;
    return g;
  }
  const DWELL = 18, SPEED = 22, CAR = 21.6;
  const trainLen = (cars) => cars * CAR + 2; // engine's middle to the last coach's
  const clampEngine = (R, cars, s, dir) => dir > 0 ? KT.clamp(s, Math.min(trainLen(cars), R.len), R.len) : KT.clamp(s, 0, Math.max(0, R.len - trainLen(cars)));
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
      // a busy railway: a train every few minutes at every station
      const n = Math.max(2, Math.round(R.len / 3200)) * (R.double ? 2 : 1);
      for (let i = 0; i < n; i++) Rail.trains.push({ R, offset: (R.tt.T * 2 / n) * i + li * 37, cars: 6 + ((li + i) % 3), livery: ['blue', 'grey', 'lhb'][(li + i) % 3], mesh: null });
    });
  }
  function trainMesh(tr) {
    const P = cars(), g = new T.Group(), list = [];
    const e = P.engine.clone(); g.add(e); list.push(e);
    for (let i = 0; i < tr.cars; i++) {
      // (on your train, the first coach is the one you sit in)
      // (a train you can get into has open coaches throughout)
      const c = tr.ride ? openCoach(tr.livery, i + (tr.R ? tr.R.id : 0)) : P[tr.livery].clone();
      g.add(c); list.push(c);
    }
    // (an open coach's vestibule is shut where there is no coach beyond it:
    // at the engine and at the tail)
    if (tr.ride && list.length > 1) {
      const shut = KT.mat('coachEnd', { color: 0x7d7a72, roughness: 0.8 }), door = G.box(0.8, 2.1, 0.05);
      part(list[1], door, shut, 0, FLOOR + 1.05, 10.4);
      part(list[list.length - 1], door, shut, 0, FLOOR + 1.05, -10.4);
    }
    g.userData.cars = list;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function placeTrain(tr, st) {
    const R = tr.R, list = tr.mesh.userData.cars;
    // the engine leads; on a double line each way has its own track (on the left)
    const lat = tr.lat !== undefined ? tr.lat : R.double ? (st.back ? TRACK : -TRACK) : 0, dir = st.back ? -1 : 1;
    // (the whole train stays on the line: at its ends it stands back from them)
    const es = clampEngine(R, list.length - 1, st.s, dir);
    list.forEach((c, i) => {
      const s = KT.clamp(es - dir * (i * CAR + (i ? 2 : 0)), 0, R.len), f = R.frame(s);
      c.position.set(f.x + f.rx * lat, R.y(s), f.z + f.rz * lat);
      c.rotation.y = f.heading + (st.back ? Math.PI : 0);
    });
  }

  // the people on a platform: the seated wait, the walkers stroll up and
  // down and stop now and then (in the station's own axes: x along it)
  function animatePeople(st, dt) {
    const top = 0.3;
    st.people.forEach((p) => {
      if (p.pose !== 'walk') { KT.Models.animateCharacter(p.ch, p.pose, dt); return; }
      let moving = false;
      if (p.wait > 0) p.wait -= dt;
      else {
        const dx = p.tx - p.x;
        if (Math.abs(dx) < 0.25) { p.wait = 1 + p.rng() * 6; p.tx = (p.rng() - 0.5) * 120; p.cz = p.pz + (p.rng() - 0.5) * 2.4; }
        else { p.x += Math.sign(dx) * p.speed * dt; p.heading = dx > 0 ? Math.PI / 2 : -Math.PI / 2; moving = true; }
      }
      p.z += (p.cz - p.z) * (1 - Math.exp(-dt * 0.8));
      p.ch.position.set(p.x, top, p.z);
      p.ch.rotation.y = KT.angleLerp(p.ch.rotation.y, p.heading, 1 - Math.exp(-dt * 8));
      KT.Models.animateCharacter(p.ch, moving ? 'walk' : 'idle', dt, p.speed / 1.1);
    });
  }

  // --------------------------------------------------------------- update
  let scene = null;
  Rail.update = function (dt, pos) {
    if (!Rail.ready) return;
    const Hw = KT.Highway;
    if (!scene || scene !== Hw.scene) { scene = Hw.scene; makeTrains(); }
    if (!Rail.doorHooked) { Rail.doorHooked = true; Hw.interactables.push(Rail.doorInteract); }
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
      if (st.root && st.live.visible && st.people) animatePeople(st, dt);
    });
    Rail.crossings.forEach((c) => {
      const d = Math.hypot(c.x - pos.x, c.z - pos.z);
      if (!c.gates && d < 700) scene.add(buildGates(c));
      if (c.gates) c.gates.g.visible = d < 900;
    });
    Rail.robs.forEach((b) => {
      const d = Math.hypot(b.x - pos.x, b.z - pos.z);
      if (!b.built && d < 800) scene.add(buildRob(b));
      if (b.built) b.built.visible = d < 1100;
    });
    // trains
    Rail.sfxT = (Rail.sfxT || 0) - dt;
    const ride = Rail.ride;
    Rail.trains.forEach((tr) => {
      if (tr.ride) return; // (your own train moves with you: updateRider)
      const st = trainAt(tr, Rail.time), f = tr.R.frame(st.s);
      const dist = Math.hypot(f.x - pos.x, f.z - pos.z), near = dist < 1500;
      // a horn as a train pulls out, the station chime as one draws in
      if (tr.now && near && Rail.sfxT <= 0) {
        if (st.moving && !tr.now.moving && dist < 450) { KT.Audio.play('trainHorn'); Rail.sfxT = 4; }
        else if (!st.moving && tr.now.moving && dist < 260) { KT.Audio.play('chime'); Rail.sfxT = 4; }
      }
      tr.now = st;
      if (near && !tr.mesh) { tr.mesh = trainMesh(tr); scene.add(tr.mesh); }
      if (tr.mesh) {
        // (not through your own train on the same track)
        const clash = ride && ride.train && tr.R === ride.train.R && !!st.back === !!ride.train.back && Math.abs(st.s - ride.train.s) < 320;
        tr.mesh.visible = near && !clash;
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
    // your train, while you are not yet (or no longer) in it; the doors near you
    if (Rail.ride && KT.Player.mode !== 'train') tickRide(dt);
    Rail.nearDoor = KT.Player.mode === 'foot' ? findDoor(pos) : null;
    for (let i = leaving.length - 1; i >= 0; i--) {
      const tr = leaving[i], dir = tr.back ? -1 : 1;
      tr.v = Math.min(RIDE_V, tr.v + RIDE_A * dt);
      tr.s += dir * tr.v * dt;
      tr.leaveT -= dt;
      if (tr.leaveT <= 0 || tr.s <= 0 || tr.s >= tr.R.len) { removeTrain(tr); leaving.splice(i, 1); continue; }
      tr.now = { s: tr.s, back: tr.back, moving: true };
      placeTrain(tr, tr.now);
    }
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
        let sub = 'You are here';
        if (!here) {
          const legs = routeTo(from, st);
          if (!legs) sub = 'No train';
          else {
            const km = KT.Vehicle.toKm(legs.reduce((a, l) => a + Math.abs(l.s1 - l.s0), 0));
            sub = (legs.length === 1 ? 'Direct train' : 'Change at ' + stOf(legs[0].to).name) + ' • ' + km.toFixed(km < 10 ? 1 : 0) + ' km';
          }
        }
        html += '<button class="travel-btn' + (here ? ' here' : '') + '" data-rail="' + Rail.stations.indexOf(st) + '"><span class="t-name"><span class="t-icon">\u{1F689}</span> ' + esc(st.name) + '</span><span class="t-ml">' + esc(st.ml) + '</span><span class="t-sub">' + esc(sub) + '</span></button>';
      });
      html += '</div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-rail]').forEach((b) => { b.onclick = () => Rail.travel(+b.dataset.rail, from); });
    G2.setState('fasttravel');
  };
  // book a train: it comes in to your platform, you take a seat and ride
  Rail.travel = function (i, from) {
    const st = Rail.stations[i], G2 = KT.Game;
    G2.setState('playing');
    if (!st || st === from) return;
    if (Rail.ride) { KT.UI.toast('Your train is already on its way.'); return; }
    const legs = routeTo(from, st);
    if (!legs) { KT.UI.toast('No train runs there from here.'); return; }
    Rail.ride = { legs, li: 0, dest: st.key, origin: from.key, state: 'change', t: 0.01, train: null, stops: [], next: 0 };
  };

  // ------------------------------------------------------------ the ride
  // Trains you can get into. Book one at a platform and it draws in; or
  // step into any train standing at a station. Inside you walk the aisle,
  // through the vestibule doors from coach to coach, sit where you like
  // (and look out of the window), and step off through a door whenever the
  // train stands at a station. A booked train runs to your station,
  // stopping on the way (and waits at a junction where you change trains).
  const RIDE_V = 31, RIDE_A = 0.85, RIDE_STOP = 12, DOORS_OPEN = 30;
  const leaving = [];
  Rail.ride = null;
  Rail.nearDoor = null;
  const _v = new T.Vector3();
  const sOn = (st, R) => { const l = st.lines.find((l) => l.R === R); return l ? l.s : st.s; };
  const stOf = (k) => Rail.stations.find((s) => s.key === k);
  const carOff = (i) => i * CAR + (i ? 2 : 0); // a car's middle behind the engine's
  // how far a station's platform lies to the side of its line
  function platLat(st, R) { const f = R.frame(sOn(st, R)); return (st.platform.x - f.x) * f.rx + (st.platform.z - f.z) * f.rz; }
  // the platform beside a train's track at a station
  function platformLat(tr, st) {
    const R = tr.R, pl = platLat(st, R), lat = tr.lat !== undefined ? tr.lat : R.double ? (tr.back ? TRACK : -TRACK) : 0;
    return R.double && !st.tvm ? Math.sign(lat || 1) * (bedHalf(R) + 3) : pl;
  }
  const dirOf = (tr) => (tr.back ? -1 : 1);
  // the station a train stands at (its platform within reach), if any
  function stationAt(tr) {
    let best = null;
    tr.R.stops.forEach((p) => { const d = Math.abs(p.s - (tr.s - dirOf(tr) * carOff(1))); if (d < 130 && (!best || d < best.d)) best = { st: stOf(p.key), d, s: p.s }; });
    return best && best.st;
  }

  // the way from one station to another: by distance, changing trains as
  // little as possible; as legs, one per train
  function routeTo(from, to) {
    const adj = {};
    Rail.lines.forEach((R) => {
      const stops = R.stops.slice().sort((a, b) => a.s - b.s);
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        (adj[a.key] = adj[a.key] || []).push({ to: b.key, R, s0: a.s, s1: b.s, d: b.s - a.s });
        (adj[b.key] = adj[b.key] || []).push({ to: a.key, R, s0: b.s, s1: a.s, d: b.s - a.s });
      }
    });
    const best = new Map(), prev = new Map(), Q = [];
    const idOf = (k, R) => k + '|' + (R ? R.id : 0);
    const push = (k, R, cost, from, e) => { const id = idOf(k, R); if (best.has(id) && best.get(id) <= cost) return; best.set(id, cost); if (e) prev.set(id, { from, e }); Q.push({ id, k, R, cost }); };
    push(from.key, null, 0);
    let end = null;
    while (Q.length) {
      Q.sort((a, b) => a.cost - b.cost);
      const c = Q.shift();
      if (best.get(c.id) < c.cost) continue;
      if (c.k === to.key) { end = c.id; break; }
      (adj[c.k] || []).forEach((e) => push(e.to, e.R, c.cost + e.d + (c.R && c.R !== e.R ? 2500 : 0), c.id, e));
    }
    if (!end) return null;
    const hops = [];
    for (let id = end; prev.has(id); id = prev.get(id).from) hops.unshift(prev.get(id).e);
    const legs = [];
    let at = from.key;
    hops.forEach((e) => {
      const L = legs[legs.length - 1];
      if (L && L.R === e.R) { L.s1 = e.s1; L.to = e.to; } else legs.push({ R: e.R, s0: e.s0, s1: e.s1, from: at, to: e.to });
      at = e.to;
    });
    return legs;
  }

  function removeTrain(tr) {
    if (tr.mesh) { scene.remove(tr.mesh); tr.mesh = null; }
    const i = Rail.trains.indexOf(tr);
    if (i >= 0) Rail.trains.splice(i, 1);
  }
  // the train goes on without you, and away
  function release(tr) { tr.leaveT = 45; leaving.push(tr); }

  // the next train of your journey comes in to the platform
  function startLeg() {
    const ride = Rail.ride, leg = ride.legs[ride.li], R = leg.R, from = stOf(leg.from);
    const back = leg.s1 < leg.s0, dir = back ? -1 : 1;
    const pl = platLat(from, R);
    // the track by your platform: on a double line each way has its own,
    // but at Thampanoor the train waits at the platform whichever way it goes
    const lat = !R.double ? 0 : from.tvm ? Math.sign(pl) * TRACK : (back ? TRACK : -TRACK);
    const cars = 5;
    // leaving from the end of a line, the train stands with its tail at the
    // platform; elsewhere its first coach is at the platform's middle
    const atEnd = dir > 0 ? leg.s0 < trainLen(cars) : leg.s0 > R.len - trainLen(cars);
    const tr = { R, cars, platCar: atEnd ? cars : 1, livery: ['blue', 'grey', 'lhb'][(ride.li + Rail.stations.indexOf(from)) % 3], mesh: null, ride: true, back, lat, s: 0, v: 0, now: null, heading: 0 };
    const stopS = clampEngine(R, cars, leg.s0 + dir * carOff(tr.platCar), dir);
    tr.s = stopS;
    const room = dir > 0 ? stopS - trainLen(cars) : R.len - trainLen(cars) - stopS;
    const run = Math.min(380, room - 5);
    tr.mesh = trainMesh(tr);
    scene.add(tr.mesh);
    Rail.trains.push(tr);
    ride.train = tr; ride.leg = leg; ride.dir = dir; ride.stopS = stopS; ride.ext = 0;
    const lo = Math.min(leg.s0, leg.s1) - 1, hi = Math.max(leg.s0, leg.s1) + 1;
    ride.stops = R.stops.filter((p) => p.s > lo && p.s < hi && p.key !== leg.from).sort((a, b) => (a.s - b.s) * dir);
    ride.next = 0;
    const dest = stOf(ride.dest).name;
    if (run < 120) { ride.state = 'doors'; ride.t = DOORS_OPEN; KT.UI.toast('\u{1F686} Your train to ' + dest + ' is waiting at the platform: walk to a door and press E.', 'info'); }
    else {
      tr.s = stopS - dir * run;
      ride.state = 'arrive'; ride.t = 0; ride.dur = 20; ride.from = tr.s;
      KT.UI.toast('\u{1F686} Your train to ' + dest + ' is coming in to the platform.', 'info');
      KT.Audio.play('trainHorn');
    }
    placeRide(tr);
  }
  function placeRide(tr) {
    tr.s = KT.clamp(tr.s, 0, tr.R.len);
    tr.now = { s: tr.s, back: tr.back, moving: tr.v > 0.1 };
    placeTrain(tr, tr.now);
    tr.heading = tr.R.frame(tr.s).heading + (tr.back ? Math.PI : 0);
  }
  // the engine's s with a given stop under your coach's platform car
  const stopFor = (tr, s, dir) => clampEngine(tr.R, tr.cars, s + dir * carOff(tr.platCar || 1), dir);
  // is anyone (you) near one of this train's doors?
  function nearAnyDoor(tr, pos, within) {
    const list = tr.mesh && tr.mesh.userData.cars;
    if (!list) return false;
    for (let i = 1; i < list.length; i++) {
      list[i].updateMatrixWorld();
      for (const sz of [-1, 1]) { _v.set(0, FLOOR, sz * DOOR_Z).applyMatrix4(list[i].matrixWorld); if (Math.hypot(_v.x - pos.x, _v.z - pos.z) < within) return true; }
    }
    return false;
  }

  function tickRide(dt) {
    const ride = Rail.ride;
    if (!ride) return;
    if (ride.state === 'change') { ride.t -= dt; if (ride.t <= 0) startLeg(); return; }
    const tr = ride.train, P = KT.Player, dir = ride.dir;
    if (!tr) return;
    if (ride.timetable) {
      // a train you stepped into: it keeps to its timetable
      const was = ride.state, st = trainAt(tr, Rail.time);
      tr.s = st.s; tr.back = st.back; tr.v = st.moving ? SPEED : 0;
      ride.state = st.moving ? 'go' : 'stop';
      if (was === 'go' && !st.moving) { const at = stationAt(tr); if (at) { KT.Audio.play('chime'); KT.UI.toast('\u{1F689} ' + at.name + ' • ' + at.ml + ' — ' + (KT.Input.touch ? 'the action button' : 'E') + ' at a door to get off', 'info'); } }
      if (was === 'stop' && st.moving) KT.Audio.play('trainHorn');
      placeRide(tr);
      return;
    }
    switch (ride.state) {
      case 'arrive': { // slowing in to a stand at your platform
        ride.t += dt;
        const k = Math.min(1, ride.t / ride.dur), e = 1 - (1 - k) * (1 - k);
        tr.s = ride.from + (ride.stopS - ride.from) * e;
        tr.v = Math.abs(ride.stopS - ride.from) * 2 * (1 - k) / ride.dur;
        if (k >= 1) { tr.v = 0; ride.state = 'doors'; ride.t = DOORS_OPEN; KT.Audio.play('door'); KT.UI.toast('Doors open: walk to a door of the train and press E to get in.', 'info'); }
        break;
      }
      case 'doors': { // standing at your platform, doors open
        ride.t -= dt;
        if (ride.t <= 0) {
          if (ride.aboard) { ride.state = 'go'; KT.Audio.play('door'); KT.Audio.play('trainHorn'); }
          else if (ride.ext < 3 && P.mode === 'foot' && nearAnyDoor(tr, P.pos, 9)) { ride.ext++; ride.t = 10; } // (it waits for you a little)
          else missed();
        }
        break;
      }
      case 'go': { // down the line to the next stop
        const stop = ride.stops[ride.next], target = stopFor(tr, stop.s, dir);
        const d = (target - tr.s) * dir, brake = tr.v * tr.v / (2 * RIDE_A);
        if (d <= brake + 0.5) tr.v = Math.max(0, tr.v - RIDE_A * 1.08 * dt); else tr.v = Math.min(RIDE_V, tr.v + RIDE_A * dt);
        if (d < 0.4 || (d < 4 && tr.v < 0.25)) { tr.s = target; tr.v = 0; KT.Audio.play('chime'); arriveAt(stop); }
        else tr.s += dir * Math.min(tr.v * dt, Math.max(0, d));
        break;
      }
      case 'stop': { // at a station on the way; then on again
        ride.t -= dt;
        if (ride.t <= 0) { ride.next++; ride.state = 'go'; KT.Audio.play('door'); KT.Audio.play('trainHorn'); }
        break;
      }
      default: break; // ('hold': at your station, until you step off)
    }
    if (ride.train) placeRide(ride.train);
  }
  function arriveAt(stop) {
    const ride = Rail.ride, st = stOf(stop.key), key = KT.Input.touch ? 'the action button' : 'E';
    if (ride.next < ride.stops.length - 1) {
      ride.state = 'stop'; ride.t = RIDE_STOP;
      KT.UI.toast('\u{1F689} ' + st.name + ' • ' + st.ml + ' — ' + key + ' at a door to get off here', 'info');
      return;
    }
    // the end of this leg: the train waits for you to step off
    ride.state = 'hold';
    const more = ride.li < ride.legs.length - 1;
    KT.UI.banner(st.name, st.ml + (more ? '  •  change here for ' + stOf(ride.dest).name : '  •  your station'), 'title');
    KT.UI.toast((more ? 'Change trains here: ' : 'Your station: ') + 'walk to a door and press ' + key + ' to get off.', 'info');
  }

  // -------------------------------------------------------- getting in
  // the nearest door of a train you can get into, from where you stand
  function findDoor(pos) {
    const ride = Rail.ride;
    let best = null;
    const consider = (tr, label) => {
      const list = tr.mesh && tr.mesh.userData.cars;
      if (!list) return;
      for (let i = 1; i < list.length; i++) {
        list[i].updateMatrixWorld();
        for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
          _v.set(sx * 1.45, FLOOR, sz * DOOR_Z).applyMatrix4(list[i].matrixWorld);
          const d = Math.hypot(_v.x - pos.x, _v.z - pos.z);
          if (d < 3.6 && Math.abs(_v.y - pos.y) < 3 && (!best || d < best.d)) best = { tr, car: i, sz, d, x: _v.x, y: _v.y, z: _v.z, label };
        }
      }
    };
    if (ride && ride.train && !ride.aboard && ride.state === 'doors') consider(ride.train, 'Get into the train to ' + stOf(ride.dest).name);
    else if (!ride) {
      Rail.trains.forEach((tr) => {
        if (tr.ride || !tr.mesh || !tr.mesh.visible || !tr.now || tr.now.moving) return;
        const f = tr.R.frame(tr.now.s);
        if (Math.hypot(f.x - pos.x, f.z - pos.z) > 260) return;
        const stops = tr.R.stops.slice().sort((a, b) => a.s - b.s), end = stOf((tr.now.back ? stops[0] : stops[stops.length - 1]).key);
        consider(tr, 'Get into the train towards ' + end.name);
      });
    }
    return best;
  }
  Rail.doorInteract = {
    get label() { return Rail.nearDoor ? Rail.nearDoor.label : ''; },
    radius: 3.7,
    enabled: () => !!Rail.nearDoor,
    pos: () => (Rail.nearDoor ? new T.Vector3(Rail.nearDoor.x, Rail.nearDoor.y, Rail.nearDoor.z) : new T.Vector3(1e9, 0, 1e9)),
    action: () => Rail.boardAt(Rail.nearDoor)
  };
  // in through a door
  Rail.boardAt = function (d) {
    if (!d) return;
    const P = KT.Player, Cam = KT.CameraRig;
    let ride = Rail.ride, tr = d.tr;
    if (!ride) {
      // a train on its timetable: it becomes one you can walk through
      tr.ride = true; tr.livery = tr.livery || 'blue';
      scene.remove(tr.mesh);
      tr.mesh = trainMesh(tr);
      scene.add(tr.mesh);
      tr.s = tr.now.s; tr.back = tr.now.back; tr.v = 0;
      placeRide(tr);
      ride = Rail.ride = { timetable: true, train: tr, legs: [], li: 0, state: 'stop', stops: [], next: 0, dest: null, origin: null };
      const at = stationAt(tr); if (at) ride.origin = at.key;
    } else if (ride.train !== tr) return;
    ride.aboard = { car: d.car, lx: 0, lz: d.sz * 9.4, seat: null };
    if (ride.state === 'doors') ride.t = Math.min(ride.t, 6); // (the doors close behind you)
    P.mode = 'train'; P.bus = null; P.speed = 0; P.gesture = null; P.vy = 0;
    ride.prevFirst = Cam.first;
    Cam.first = true; Cam.snap = true; Cam.pitch = 0.05;
    Cam.yaw = d.sz > 0 ? tr.heading : tr.heading + Math.PI; // (looking down the coach)
    KT.Audio.play('door');
    KT.UI.toast('You are on the train. W A S D to walk through the coaches • E to sit by a seat • V outside view', 'info');
    if (KT.Game.onEvent) KT.Game.onEvent('boardTrain');
  };
  function missed() {
    const ride = Rail.ride;
    release(ride.train); ride.train = null; Rail.ride = null;
    KT.UI.toast('Your train has left. Book another at the platform.');
  }

  // ---------------------------------------------------------- inside
  // off the train through a door onto the platform
  function alightAt(st) {
    const ride = Rail.ride, tr = ride.train, A = ride.aboard, R = tr.R, P = KT.Player, Hw = KT.Highway, Cam = KT.CameraRig;
    const dir = dirOf(tr), cs = tr.s - dir * carOff(A.car), lat = platformLat(tr, st);
    const q = R.at(KT.clamp(cs + dir * A.lz, 0, R.len), lat), f = R.frame(KT.clamp(cs, 0, R.len));
    if (A.seat) { A.seat.taken = false; A.seat = null; }
    if (P.obj.parent) P.obj.parent.remove(P.obj);
    P.scene.add(P.obj);
    P.mode = 'foot'; P.bus = null; P.speed = 0; P.vy = 0; P.grounded = true;
    P.pos.set(q.x, Hw.groundY(q.x, q.z, st.y + 3).y, q.z);
    P.heading = Math.atan2(f.fx * dir, f.fz * dir);
    P.obj.position.copy(P.pos); P.obj.rotation.set(0, P.heading, 0); P.obj.visible = true;
    Cam.first = !!ride.prevFirst; Cam.snap = true; Cam.yaw = P.heading + Math.PI; Cam.pitch = 0.3;
    ride.aboard = null;
    if (KT.Audio.trainRoll) KT.Audio.trainRoll(0);
    KT.Audio.play('door');
  }
  function getOffHere() {
    const ride = Rail.ride, tr = ride.train;
    let st;
    if (ride.timetable) st = stationAt(tr);
    else st = stOf(ride.state === 'doors' ? ride.leg.from : ride.stops[ride.next].key);
    if (!st) { KT.UI.toast('Not at a station.'); return; }
    const atEnd = !ride.timetable && ride.state === 'hold';
    alightAt(st);
    if (ride.timetable) {
      tr.ride = false; // (back to its timetable; its coaches stay open)
      Rail.ride = null;
      KT.UI.banner(st.name, st.ml, 'title');
      return;
    }
    release(tr); ride.train = null;
    if (atEnd && ride.li < ride.legs.length - 1) { ride.li++; ride.state = 'change'; ride.t = 4; return; }
    if (atEnd) finish(st); else { Rail.ride = null; KT.UI.banner(st.name, st.ml, 'title'); }
  }
  function finish(st) {
    const ride = Rail.ride;
    KT.UI.banner(st.name, st.ml + '  •  \u{1F686} by train from ' + stOf(ride.origin).name, 'title');
    KT.Audio.play('star');
    Rail.ride = null;
    if (KT.Game.onEvent) KT.Game.onEvent('trainArrive');
  }
  const curCar = (ride) => ride.train.mesh.userData.cars[ride.aboard.car];
  function seatNear(ride) {
    const A = ride.aboard, seats = curCar(ride).userData.seats;
    return seats.filter((s) => !s.taken && Math.abs(s.z - A.lz) < 1.3).sort((a, b) => (Math.abs(a.z - A.lz) + (a.win ? 0 : 0.3)) - (Math.abs(b.z - A.lz) + (b.win ? 0 : 0.3)))[0] || null;
  }
  const standing = (ride) => ride.state === 'stop' || ride.state === 'doors' || ride.state === 'hold';
  const atDoor = (ride) => Math.abs(ride.aboard.lz) > 8.6;
  function sitDown(seat) {
    const ride = Rail.ride, A = ride.aboard, tr = ride.train, P = KT.Player, Cam = KT.CameraRig;
    seat.taken = true; A.seat = seat;
    P.obj.position.set(seat.x, FLOOR - 0.06, seat.z);
    P.obj.rotation.set(0, seat.fz > 0 ? 0 : Math.PI, 0);
    // settle, and look out of the window on your side
    const h = tr.heading;
    Cam.first = true; Cam.snap = true; Cam.pitch = 0.04;
    Cam.yaw = Math.atan2(-seat.sx * Math.cos(h), seat.sx * Math.sin(h));
    KT.UI.toast(seat.win ? 'A window seat. Move the mouse to look out.' : 'Seated. Move the mouse to look around.', 'info');
  }
  function standUp() {
    const ride = Rail.ride, A = ride.aboard;
    A.lx = 0; A.lz = A.seat.z; A.seat.taken = false; A.seat = null;
  }
  // E inside the train: stand up, step off at a door, or sit down
  Rail.action = function () {
    const ride = Rail.ride;
    if (!ride || !ride.aboard) return;
    if (ride.aboard.seat) { standUp(); return; }
    if (atDoor(ride) && standing(ride)) { getOffHere(); return; }
    const seat = seatNear(ride);
    if (seat) { sitDown(seat); return; }
    KT.UI.toast(atDoor(ride) ? 'The doors open at the next station.' : 'Find a free seat, or the doors at the ends of the coach.');
  };
  // skip the long middle of a leg: the train jumps to just short of its last stop
  Rail.skip = function () {
    const ride = Rail.ride;
    if (!ride || !ride.train || ride.timetable || ride.state !== 'go') return;
    const tr = ride.train, dir = ride.dir, last = ride.stops[ride.stops.length - 1], target = stopFor(tr, last.s, dir);
    if ((target - tr.s) * dir < 700) { KT.UI.toast('Nearly there already.'); return; }
    tr.s = target - dir * 520; tr.v = Math.min(tr.v, 26); ride.next = ride.stops.length - 1;
    placeRide(tr);
    const p = tr.R.at(tr.s, 0);
    KT.Highway.stream(new T.Vector3(p.x, 0, p.z), 999);
    KT.CameraRig.snap = true;
    KT.UI.toast('Skipping ahead to ' + stOf(last.key).name + '…', 'info');
  };
  Rail.toggleView = function () {
    const Cam = KT.CameraRig, ride = Rail.ride, tr = ride && ride.train;
    Cam.first = !Cam.first; Cam.snap = true;
    if (Cam.first && tr && ride.aboard && ride.aboard.seat) { const s = ride.aboard.seat; Cam.yaw = Math.atan2(-s.sx * Math.cos(tr.heading), s.sx * Math.sin(tr.heading)); Cam.pitch = 0.04; }
    else if (Cam.first) Cam.pitch = 0.05;
    else Cam.pitch = 0.55;
    KT.UI.toast(Cam.first ? 'Inside the train' : 'Outside the train', 'info');
  };
  // leaving the map (or the game) mid-ride: the ride is over
  Rail.abort = function () {
    const ride = Rail.ride, P = KT.Player;
    if (!ride) return;
    if (ride.train) { if (ride.timetable) ride.train.ride = false; else removeTrain(ride.train); }
    if (P.mode === 'train') { P.mode = 'foot'; KT.CameraRig.first = !!ride.prevFirst; if (KT.Audio.trainRoll) KT.Audio.trainRoll(0); }
    Rail.ride = null;
  };
  // where a save made mid-ride puts you: the platform you are riding to
  Rail.savePoint = function () {
    const ride = Rail.ride;
    if (!ride || KT.Player.mode !== 'train' || !ride.train) return null;
    let st = null;
    if (ride.timetable) { const n = nextStop(ride); st = n && stOf(n.key); } else st = stOf(ride.dest);
    if (!st) return null;
    const f = st.R.frame(st.s);
    return { x: st.platform.x, y: st.y + 0.3, z: st.platform.z, heading: f.heading };
  };
  // the next stop ahead of a train you stepped into
  function nextStop(ride) {
    const tr = ride.train, dir = dirOf(tr), s = tr.s - dir * carOff(1);
    return tr.R.stops.slice().sort((a, b) => (a.s - b.s) * dir).find((p) => (p.s - s) * dir > 8) || null;
  }
  // each frame while you are in a train (from the player's update, before the camera)
  Rail.updateRider = function (dt, input) {
    const ride = Rail.ride, P = KT.Player;
    if (!ride || !ride.train || !ride.aboard) {
      P.mode = 'foot';
      if (P.obj.parent !== P.scene) { if (P.obj.parent) P.obj.parent.remove(P.obj); P.scene.add(P.obj); }
      P.obj.visible = true;
      return;
    }
    tickRide(dt);
    if (!ride.train || !ride.aboard) return;
    const tr = ride.train, A = ride.aboard, list = tr.mesh.userData.cars;
    let car = list[A.car], moving = false;
    if (A.seat) {
      KT.Models.animateCharacter(P.obj, 'sit', dt);
      P.state = 'sit'; P.speed = 0;
    } else {
      // walk the aisle: W A S D the way you look; through the vestibule doors
      // into the next coach
      const yaw = KT.CameraRig.yaw, f = P.forward(yaw), r = { x: Math.cos(yaw), z: -Math.sin(yaw) };
      const mx = f.x * input.move.y + r.x * input.move.x, mz = f.z * input.move.y + r.z * input.move.x, mag = Math.min(1, Math.hypot(mx, mz));
      if (mag > 0.05) {
        const h = tr.heading, sp = (input.sprint ? 2.6 : 1.5) * dt;
        const dx = mx * Math.cos(h) - mz * Math.sin(h), dz = mx * Math.sin(h) + mz * Math.cos(h);
        A.lx = KT.clamp(A.lx + dx * sp, -AISLE, AISLE);
        A.lz += dz * sp;
        if (A.lz > 10.3 && A.car > 1) { A.car--; A.lz = -10.3 + (A.lz - 10.3); }
        else if (A.lz < -10.3 && A.car < list.length - 1) { A.car++; A.lz = 10.3 + (A.lz + 10.3); }
        // (the shut ends: at the engine and at the tail)
        if (A.car <= 1) A.lz = Math.min(A.lz, 9.8);
        if (A.car >= list.length - 1) A.lz = Math.max(A.lz, -9.8);
        car = list[A.car];
        P.heading = Math.atan2(mx, mz); moving = true;
        P.distance += mag * sp;
      }
      P.obj.position.set(A.lx, FLOOR, A.lz);
      P.obj.rotation.set(0, P.heading - tr.heading, 0);
      KT.Models.animateCharacter(P.obj, moving ? (input.sprint ? 'run' : 'walk') : 'idle', dt);
      P.state = moving ? 'walk' : 'idle'; P.speed = moving ? 1.5 : 0;
    }
    if (P.obj.parent !== car) { if (P.obj.parent) P.obj.parent.remove(P.obj); car.add(P.obj); }
    car.updateMatrixWorld(true);
    P.obj.getWorldPosition(P.pos);
    // the passengers around you
    for (let i = Math.max(1, A.car - 1); i <= Math.min(list.length - 1, A.car + 1); i++) (list[i].userData.people || []).forEach((c) => KT.Models.animateCharacter(c, 'sit', dt));
    // the sound of the rails: a hum with the speed, and the joints clacking by
    if (KT.Audio.trainRoll) KT.Audio.trainRoll(tr.v / RIDE_V);
    ride.clack = (ride.clack || 0) - tr.v * dt;
    if (ride.clack <= 0 && tr.v > 2) { ride.clack = CAR / 2; KT.Audio.play('clack'); }
  };
  // the camera in a train: your eyes (standing or seated), or outside following it
  Rail.rideCamera = function (dt, camera, Cam) {
    const ride = Rail.ride, tr = ride && ride.train, A = ride && ride.aboard, P = KT.Player;
    if (!tr || !A) return false;
    const car = tr.mesh.userData.cars[A.car];
    car.updateMatrixWorld(true);
    P.obj.visible = false;
    Cam.pitch = KT.clamp(Cam.pitch, -1.1, 1.1);
    if (Cam.first) {
      P.obj.visible = false;
      const eye = A.seat ? car.localToWorld(new T.Vector3(A.seat.sx * 0.5, FLOOR + 1.22, A.seat.z + A.seat.fz * 0.15)) : new T.Vector3(P.pos.x, P.pos.y + 1.55, P.pos.z);
      const fwd = new T.Vector3(-Math.sin(Cam.yaw) * Math.cos(Cam.pitch), -Math.sin(Cam.pitch), -Math.cos(Cam.yaw) * Math.cos(Cam.pitch));
      camera.position.copy(eye);
      camera.lookAt(eye.clone().add(fwd));
      return true;
    }
    // (from above the coconut crowns, so no fronds hang in the view)
    const target = car.getWorldPosition(new T.Vector3()); target.y += 3;
    const dist = KT.clamp(Cam.targetDist * 5, 16, 80), cp = Math.cos(Cam.pitch);
    const desired = target.clone().add(new T.Vector3(Math.sin(Cam.yaw) * cp, Math.sin(Cam.pitch), Math.cos(Cam.yaw) * cp).multiplyScalar(dist));
    const gy = KT.Highway.groundY(desired.x, desired.z).y;
    const minY = Math.max(gy + 4, target.y + 15);
    if (desired.y < minY) desired.y = minY;
    if (Cam.snap) { camera.position.copy(desired); Cam.snap = false; } else camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
    camera.lookAt(target);
    return true;
  };
  // for the HUD
  Rail.rideInfo = function () {
    const ride = Rail.ride, tr = ride && ride.train;
    if (!ride) return null;
    if (ride.timetable) {
      if (!tr) return null;
      const dir = dirOf(tr), s = tr.s - dir * carOff(1), n = nextStop(ride);
      return { state: ride.state, line: tr.R.name, R: tr.R, s, dir, stops: tr.R.stops.filter((p) => (p.s - s) * dir > 8), next: n && stOf(n.key), nextS: n && n.s, dest: null, kmh: tr.v * 3.6, legs: 1, li: 0 };
    }
    const leg = ride.leg, next = ride.stops[Math.min(ride.next, ride.stops.length - 1)];
    return { state: ride.state, line: leg ? leg.R.name : '', R: leg && leg.R, s: tr ? tr.s - ride.dir * carOff(tr.platCar || 1) : 0, dir: ride.dir || 1, stops: ride.stops, next: next && stOf(next.key), nextS: next && next.s, dest: stOf(ride.dest), kmh: tr ? tr.v * 3.6 : 0, legs: ride.legs.length, li: ride.li };
  };
  Rail.shortName = (k) => k.toUpperCase(); // (the station codes, for the route bar)
  Rail.ridePrompt = function (key) {
    const ride = Rail.ride;
    if (!ride || !ride.aboard) return null;
    if (ride.aboard.seat) return key + 'Stand up • mouse: look out of the window • V outside view';
    if (atDoor(ride) && standing(ride)) { const st = ride.timetable ? stationAt(ride.train) : stOf(ride.state === 'doors' ? ride.leg.from : ride.stops[ride.next].key); return key + 'Get off' + (st ? ' at ' + st.name : ''); }
    const seat = seatNear(ride);
    if (seat) return key + (seat.win ? 'Sit by the window' : 'Sit down') + ' • W A S D walk';
    const n = ride.timetable ? nextStop(ride) : ride.stops[ride.next];
    return (n ? 'Next stop ' + stOf(n.key).name + ' • ' : '') + 'W A S D walk through the coaches • V outside view' + (ride.timetable ? '' : ' • R skip ahead');
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
