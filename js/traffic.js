// Road traffic: cars, autorickshaws, lorries, scooters and KSRTC buses that
// keep to the left (as in India), follow the vehicle ahead, stop for
// people and red signals, honk when blocked and overtake parked vehicles.
// Runs on the Kerala highway (vehicles are kept in a window around the
// player) and on the village roads of the home map (vehicles shuttle along
// the roads through a signalled junction).
(function () {
  'use strict';
  const T = THREE, Models = KT.Models;
  const Tr = KT.Traffic = { roads: {} };

  const LANE = 2.7;          // lane centre from the road centre line (highway)
  const ACCEL = 2.4, BRAKE = 7;
  const WINDOW = 680;        // highway: vehicles live within this distance of the player

  // ------------------------------------------------------------ vehicles
  const CAR_COLOURS = [0xf3f3f0, 0xb9bec4, 0xb3261e, 0x2c5fa8, 0x1d1d1f, 0x6e1a1a, 0x2a6f5a, 0xd9d2c0];
  const SHIRTS = [0x2c5fa8, 0xd8203a, 0xf3efe6, 0x2a9d8f, 0xe07a1f];
  const protos = {};
  function proto(key, make) {
    if (!protos[key]) protos[key] = make();
    return protos[key].clone(true);
  }
  const KINDS = {
    car: (rng) => {
      const style = ['hatch', 'hatch', 'sedan', 'suv'][Math.floor(rng() * 4)];
      const col = CAR_COLOURS[Math.floor(rng() * CAR_COLOURS.length)];
      const obj = proto('car' + style + col, () => Models.car(col, style));
      return { obj, len: obj.userData.size.length, w: obj.userData.size.width, cruise: 14 + rng() * 4 };
    },
    auto: (rng) => ({ obj: proto('auto', Models.autoRickshaw), len: 2.7, w: 1.32, cruise: 8.5 + rng() * 2 }),
    lorry: (rng) => {
      const col = [0xe07a1f, 0x2c5fa8, 0xf2c230][Math.floor(rng() * 3)];
      return { obj: proto('lorry' + col, () => Models.lorry(col)), len: 7.6, w: 2.35, cruise: 10 + rng() * 2 };
    },
    scooter: (rng) => {
      const c = [0xf3f3f0, 0xb3261e, 0x1d1d1f, 0x2c5fa8][Math.floor(rng() * 4)], sh = SHIRTS[Math.floor(rng() * SHIRTS.length)];
      return { obj: proto('scooter' + c + sh, () => Models.scooter(c, sh, [0x111111, 0xf3efe6, 0xb3261e][Math.floor(rng() * 3)])), len: 1.8, w: 0.7, cruise: 11 + rng() * 3 };
    },
    bus: (rng) => ({ obj: Models.ksrtcBusClone(), len: 11, w: 2.5, cruise: 12 + rng() * 2 })
  };
  function makeVehicle(kind, rng) {
    const v = KINDS[kind](rng);
    v.kind = kind;
    v.obj.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    v.shadow = false;
    return v;
  }

  // ---------------------------------------------------------------- roads
  // A road maps distance along it (d) and a lateral offset (lat, + = right
  // of the forward direction) to the world, and projects points back.
  function polylineRoad(pts) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ ax: a[0], az: a[1], dx: (b[0] - a[0]) / len, dz: (b[1] - a[1]) / len, len, d0: total });
      total += len;
    }
    const centre = (d, out) => {
      d = KT.clamp(d, 0, total);
      let s = segs[segs.length - 1];
      for (let i = 0; i < segs.length; i++) if (d <= segs[i].d0 + segs[i].len) { s = segs[i]; break; }
      const t = d - s.d0;
      out.x = s.ax + s.dx * t; out.z = s.az + s.dz * t;
      return out;
    };
    const a = {}, b = {};
    return {
      length: total,
      vertexD: (i) => (i < segs.length ? segs[i].d0 : total),
      // pose with a smoothed direction so lanes stay continuous at corners
      pose(d, lat, out) {
        centre(d - 3, a); centre(d + 3, b);
        let fx = b.x - a.x, fz = b.z - a.z;
        const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
        centre(d, out);
        out.x += -fz * lat; out.z += fx * lat;
        out.heading = Math.atan2(fx, fz);
        return out;
      },
      project(x, z) {
        let best = null, bd = 1e9;
        segs.forEach((s, i) => {
          const raw = (x - s.ax) * s.dx + (z - s.az) * s.dz;
          const t = KT.clamp(raw, 0, s.len);
          const px = s.ax + s.dx * t, pz = s.az + s.dz * t;
          const dd = Math.hypot(x - px, z - pz);
          // beyond either end of the road: not on it
          const off = (i === 0 && raw < 0) || (i === segs.length - 1 && raw > s.len);
          if (dd < bd) { bd = dd; best = { d: s.d0 + t, lat: off ? 1e9 : (x - px) * -s.dz + (z - pz) * s.dx }; }
        });
        return best;
      }
    };
  }
  function highwayRoad() {
    const Hw = KT.Highway;
    return {
      get length() { return Hw.length(); },
      pose(d, lat, out) {
        const f = Hw.frame(d);
        out.x = f.x + f.rx * lat; out.z = f.z + f.rz * lat;
        out.heading = f.heading;
        return out;
      },
      project(x, z) { const p = Hw.project(x, z); return { d: p.s, lat: p.lat }; }
    };
  }

  // ------------------------------------------------------------ junctions
  // phase(t) -> per direction group state: 'green' | 'amber' | 'red'
  function cyclePhase(t, offset, green, amber, red) {
    const c = (t + offset) % (green + amber + red);
    return c < green ? 'green' : c < green + amber ? 'amber' : 'red';
  }

  // --------------------------------------------------------- traffic sets
  // A set: vehicles driving on one or more roads in a level.
  function TrafficSet(level, scene, opts) {
    this.level = level; this.scene = scene; this.vehicles = []; this.opts = opts;
    this.stops = []; // {road, d, dir, state()} stop lines
    this.signals = []; // {obj, state()}
  }
  const _p = {}, _v = new T.Vector3();

  TrafficSet.prototype.add = function (v, road, d, dir, laneOff) {
    v.road = road; v.d = d; v.dir = dir; v.laneOff = laneOff;
    v.lat = v.laneLat = -dir * laneOff; // drive on the left
    v.v = v.cruise * 0.7; v.blocked = 0; v.overtake = null; v.honk = 3 + Math.random() * 4;
    this.scene.add(v.obj);
    this.vehicles.push(v);
    this.place(v, 0);
    return v;
  };

  TrafficSet.prototype.place = function (v, dt) {
    const o = v.obj;
    v.road.pose(v.d, v.lat, _p);
    const ground = (x, z) => this.level.groundY(x, z, o.position.y + 1.5).y;
    const y = ground(_p.x, _p.z);
    o.position.set(_p.x, y, _p.z);
    // pitch from the ground under the front and back wheels
    const half = Math.min(v.len * 0.38, 3);
    const sh = Math.sin(_p.heading), ch = Math.cos(_p.heading);
    const dirSign = v.dir;
    const fy = ground(_p.x + sh * half * dirSign, _p.z + ch * half * dirSign), ry = ground(_p.x - sh * half * dirSign, _p.z - ch * half * dirSign);
    const target = _p.heading + (v.dir < 0 ? Math.PI : 0) + (v.latVel || 0) * 0.12;
    v.heading = dt ? KT.angleLerp(v.heading === undefined ? target : v.heading, target, 1 - Math.exp(-dt * 8)) : target;
    o.rotation.set(-Math.atan2(fy - ry, half * 2), v.heading, 0, 'YXZ');
  };

  // obstacles: people, the player's bus, parked buses... in road coordinates
  TrafficSet.prototype.gatherObstacles = function (road) {
    const out = [];
    const P = KT.Player;
    const addPoint = (x, z, len, w, still) => {
      const p = road.project(x, z);
      if (p && Math.abs(p.lat) < 7) out.push({ d: p.d, lat: p.lat, len, w, still });
    };
    if (P.mode === 'bus' && P.bus) {
      const b = P.bus.obj.position;
      addPoint(b.x, b.z, 11, 2.6, Math.abs(P.bus.speed) < 0.5);
    } else if (P.pos) addPoint(P.pos.x, P.pos.z, 0.8, 0.8, true);
    (this.opts.parked ? this.opts.parked() : []).forEach((b) => addPoint(b.x, b.z, b.len, b.w, true));
    (this.opts.people ? this.opts.people() : []).forEach((w) => addPoint(w.x, w.z, 0.7, 0.7, true));
    return out;
  };

  TrafficSet.prototype.update = function (dt, time, camPos) {
    const vs = this.vehicles;
    const obsByRoad = new Map();
    vs.forEach((v) => { if (!obsByRoad.has(v.road)) obsByRoad.set(v.road, this.gatherObstacles(v.road)); });
    let honked = false;
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      // ---- what is ahead in my lane band?
      let gap = 1e9, still = false, isPerson = false, oncoming = false;
      const consider = (od, olat, olen, ow, ostill, person, onc) => {
        if (Math.abs(olat - v.lat) > (v.w + ow) / 2 + 0.5) return;
        const ahead = (od - v.d) * v.dir - (v.len + olen) / 2;
        if (ahead < -olen * 0.5 - v.len * 0.5 || ahead > 80) return;
        if (ahead < gap) { gap = Math.max(0, ahead); still = ostill; isPerson = person; oncoming = !!onc; }
      };
      for (let j = 0; j < vs.length; j++) {
        const u = vs[j];
        if (u === v || u.road !== v.road) continue;
        // oncoming vehicles only matter when they are in my lane
        if (u.dir !== v.dir && Math.abs(u.lat - v.lat) > 1.2) continue;
        // other traffic is never "parked": queues move on by themselves
        consider(u.d, u.lat, u.len, u.w, false, false, u.dir !== v.dir);
      }
      (obsByRoad.get(v.road) || []).forEach((o) => consider(o.d, o.lat, o.len, o.w, o.still, o.len < 1));
      // ---- red signals
      v.waitSignal = false;
      for (let k = 0; k < this.stops.length; k++) {
        const s = this.stops[k];
        if (s.road !== v.road || s.dir !== v.dir) continue;
        const dist = (s.d - v.d) * v.dir - v.len / 2;
        if (dist < -0.5 || dist > 70) continue;
        const st = s.state();
        if (st === 'red' || (st === 'amber' && dist > v.v * v.v / (2 * BRAKE) + 2)) {
          if (dist < gap) { gap = Math.max(0, dist); still = false; v.waitSignal = true; isPerson = false; }
        }
      }
      // ---- speed: brake to stop behind whatever is ahead
      const vt = Math.min(v.cruise, Math.sqrt(2 * 4.5 * Math.max(0, gap - 2.2)));
      if (v.v < vt) v.v = Math.min(vt, v.v + ACCEL * dt);
      else v.v = Math.max(vt, v.v - BRAKE * 1.6 * dt);
      // ---- stuck behind a parked bus / standing person: honk, then go round
      if (gap < 14 && v.v < 0.6 && !v.waitSignal) {
        v.blocked += dt;
        v.honk -= dt;
        if (v.honk <= 0 && !honked && camPos && v.obj.position.distanceTo(camPos) < 45) {
          KT.Audio.play('carHorn'); honked = true; v.honk = 4 + Math.random() * 3;
        }
        if (still && v.blocked > (isPerson ? 4 : 1.8) && !v.overtake && this.laneClear(v, gap + 30)) {
          v.overtake = { until: v.d + v.dir * (gap + v.len + 16) };
          v.laneLat = v.dir * v.laneOff;
        }
      } else v.blocked = 0;
      if (v.overtake && ((v.overtake.until - v.d) * v.dir < 0 || (oncoming && gap < 30))) { v.overtake = null; v.laneLat = -v.dir * v.laneOff; }
      if (v.overtake && v.v < 0.6) v.v = Math.min(v.cruise * 0.5, v.v + ACCEL * dt); // creep past
      // ---- move
      v.d += v.v * v.dir * dt;
      const dl = KT.clamp(v.laneLat - v.lat, -1.4 * dt, 1.4 * dt);
      v.lat += dl;
      v.latVel = v.v > 0.5 ? (dl / dt) * v.dir : 0;
      this.opts.wrap(v);
      this.place(v, dt);
      // cheap level of detail
      const far = camPos ? v.obj.position.distanceTo(camPos) : 0;
      v.obj.visible = far < 600;
      const sh = far < 70;
      if (sh !== v.shadow) { v.shadow = sh; v.obj.traverse((o) => { if (o.isMesh) o.castShadow = sh; }); }
    }
    // signal lamps
    this.signals.forEach((s) => {
      const st = s.state();
      if (st !== s.shown) { s.shown = st; Models.setSignal(s.obj, st); }
    });
  };

  // Is there room for a vehicle of length len at d in lane (dir)?
  TrafficSet.prototype.roomAt = function (road, d, dir, len, skip) {
    return this.vehicles.every((u) => u === skip || u.road !== road || u.dir !== dir || Math.abs(u.d - d) > (u.len + len) / 2 + 12);
  };

  // Is the opposite lane free far enough ahead to pull out?
  TrafficSet.prototype.laneClear = function (v, ahead) {
    return this.vehicles.every((u) => {
      if (u === v || u.road !== v.road) return true;
      const rel = (u.d - v.d) * v.dir;
      if (Math.abs(u.lat - v.dir * v.laneOff) > 1.6) return true;
      return rel < -12 || rel > ahead + (u.dir !== v.dir ? 60 : 0);
    });
  };

  // Boxes for collisions with the player (on foot or driving).
  TrafficSet.prototype.colliders = function (pos, range) {
    const out = [];
    this.vehicles.forEach((v) => {
      const p = v.obj.position;
      if (Math.abs(p.x - pos.x) > range || Math.abs(p.z - pos.z) > range) return;
      const rot = v.heading;
      out.push({ type: 'box', x: p.x, z: p.z, hw: v.w / 2, hd: v.len / 2, rot, cos: Math.cos(rot), sin: Math.sin(rot) });
    });
    return out;
  };

  function pickKind(rng, weights) {
    let r = rng() * weights.reduce((a, w) => a + w[1], 0);
    for (let i = 0; i < weights.length; i++) { r -= weights[i][1]; if (r <= 0) return weights[i][0]; }
    return weights[0][0];
  }

  // ------------------------------------------------------------- highway
  Tr.initHighway = function () {
    const Hw = KT.Highway;
    if (Tr.hw) return;
    const road = highwayRoad();
    const rng = KT.makeRng(4242);
    const set = Tr.hw = new TrafficSet(Hw, Hw.scene, {
      wrap(v) {
        const ps = Tr.playerS;
        const rel = v.d - ps;
        const end = v.d < 40 || v.d > Hw.length() - 40;
        if (Math.abs(rel) < WINDOW && !end) return;
        // re-enter at the far edge of the window, driving towards the player
        v.dir = rng() < 0.5 ? 1 : -1;
        let d = 0;
        for (let k = 0; k < 8; k++) {
          d = KT.clamp(ps - v.dir * (WINDOW - 30 - rng() * 120), 60, Hw.length() - 60);
          if (set.roomAt(v.road, d, v.dir, v.len, v)) break;
        }
        v.d = d;
        v.lat = v.laneLat = -v.dir * v.laneOff;
        v.overtake = null; v.v = v.cruise * 0.8; v.heading = undefined;
      },
      parked() {
        const b = Hw.bus;
        return b && !b.occupied ? [{ x: b.obj.position.x, z: b.obj.position.z, len: 11, w: 2.6 }] : [];
      }
    });
    Tr.playerS = Hw.project(KT.Player.pos.x, KT.Player.pos.z).s;
    const weights = [['car', 10], ['auto', 4], ['scooter', 5], ['lorry', 2], ['bus', 1.4]];
    for (let i = 0; i < 24; i++) {
      const v = makeVehicle(pickKind(rng, weights), rng);
      const dir = i % 2 ? 1 : -1;
      let d = 0;
      for (let k = 0; k < 10; k++) {
        d = KT.clamp(Tr.playerS + (rng() * 2 - 1) * WINDOW, 60, Hw.length() - 60);
        if (Math.abs(d - Tr.playerS) > 40 && set.roomAt(road, d, dir, v.len)) break;
      }
      set.add(v, road, d, dir, LANE);
    }
    // signals at every district centre (stop lines either side of the zebra crossing)
    Hw.hubs.forEach((h) => {
      const state = () => Tr.hubState(h);
      set.stops.push({ road, d: h.s + Hw.CROSSING - 4.5, dir: 1, state });
      set.stops.push({ road, d: h.s + Hw.CROSSING + 4.5, dir: -1, state });
    });
  };
  // the same cycle drives the signal lamps built with each district centre
  Tr.hubState = (h) => cyclePhase(KT.Highway.animTime, h.index * 7, 15, 3, 9);

  // red-light jumping check for the player's bus
  let lastBusS = null;
  function checkRedLight() {
    const P = KT.Player, Hw = KT.Highway;
    if (P.mode !== 'bus' || !P.bus) { lastBusS = null; return; }
    const s = Hw.project(P.bus.obj.position.x, P.bus.obj.position.z).s;
    if (lastBusS !== null && Math.abs(s - lastBusS) < 20) {
      Tr.hw.stops.forEach((st) => {
        const before = (st.d - lastBusS) * st.dir, after = (st.d - s) * st.dir;
        if (before > 0 && after <= 0 && st.state() === 'red' && Math.abs(P.bus.speed) > 3) {
          const d = KT.Game.data;
          const fine = Math.min(10, d.coins);
          if (fine) KT.Game.addCoins(-fine, true);
          KT.UI.toast('You jumped a red signal! ' + (fine ? 'Fine: ' + fine + ' coins. ' : '') + 'Stop at the line when the light is red.', 'warn');
        }
      });
    }
    lastBusS = s;
  }

  Tr.updateHighway = function (dt, camPos) {
    if (!Tr.hw) return;
    const P = KT.Player;
    const focus = P.mode === 'bus' && P.bus ? P.bus.obj.position : P.pos;
    Tr.playerS = KT.Highway.project(focus.x, focus.z).s;
    Tr.hw.update(dt, KT.Highway.animTime, camPos);
    KT.Highway.hubs.forEach((h) => {
      if (!h.signals || !h.group.visible) return;
      const st = Tr.hubState(h);
      if (st !== h.signalShown) { h.signalShown = st; h.signals.forEach((o) => Models.setSignal(o, st)); }
    });
    checkRedLight();
  };

  // ---------------------------------------------------------------- home
  // Autos, scooters and the odd car on the village roads, through a
  // signalled four-way junction at the Kumarakom village plaza.
  Tr.HOME_JUNCTION = { x: -45, z: 30 };
  Tr.initHome = function (scene) {
    if (Tr.home) return;
    const W = KT.World, E = KT.Entities;
    const roadA = polylineRoad([[-10, 36], [-45, 30], [-90, 40], [-130, 46], [-165, 48], [-205, 52]]);
    const roadB = polylineRoad([[-105, -70], [-75, -45], [-58, -10], [-45, 30], [-38, 80], [-25, 130], [0, 175], [30, 205]]);
    const rng = KT.makeRng(777);
    const set = Tr.home = new TrafficSet(W, scene, {
      wrap(v) {
        const L = v.road.length;
        if (v.d > L - 4 && v.dir > 0) { v.dir = -1; v.laneLat = v.laneOff; v.overtake = null; }
        else if (v.d < 4 && v.dir < 0) { v.dir = 1; v.laneLat = -v.laneOff; v.overtake = null; }
      },
      parked() {
        const b = KT.Game.homeBus;
        return b ? [{ x: b.obj.position.x, z: b.obj.position.z, len: 11, w: 2.6 }] : [];
      },
      people() {
        const out = [];
        E.npcs.forEach((w) => { if (!w.static) out.push(w.obj.position); });
        return out;
      }
    });
    const weights = [['auto', 6], ['scooter', 5], ['car', 2]];
    [[roadA, 4], [roadB, 4]].forEach(([road, n]) => {
      for (let i = 0; i < n; i++) {
        const v = makeVehicle(pickKind(rng, weights), rng);
        v.cruise = Math.min(v.cruise, 8 + rng() * 2); // village speeds
        set.add(v, road, 15 + (i + rng() * 0.5) * (road.length - 30) / n, i % 2 ? 1 : -1, 0.85);
      }
    });
    // junction: roads A and B take turns
    const dA = roadA.vertexD(1), dB = roadB.vertexD(3);
    const stateA = () => cyclePhase(W.animTime, 0, 9, 2, 13);
    const stateB = () => cyclePhase(W.animTime, 12, 9, 2, 13);
    set.stops.push({ road: roadA, d: dA - 5, dir: 1, state: stateA }, { road: roadA, d: dA + 5, dir: -1, state: stateA });
    set.stops.push({ road: roadB, d: dB - 5, dir: 1, state: stateB }, { road: roadB, d: dB + 5, dir: -1, state: stateB });
    // signal poles on the corners, each facing the traffic it controls
    const J = Tr.HOME_JUNCTION;
    const place = (road, d, dir, state) => {
      road.pose(d, -dir * 3.4, _p);
      const h = _p.heading + (dir > 0 ? Math.PI : 0); // lamps (+z) face oncoming traffic
      let x = _p.x, z = _p.z;
      for (let k = 0; k < 6 && W.isBlocked(x, z, 0.5); k++) { x += (_p.x - J.x) * 0.12; z += (_p.z - J.z) * 0.12; }
      const sig = Models.trafficSignal(2.4);
      // arm reaches over the lane: rotate so local +x points towards the road centre
      sig.position.set(x, W.groundY(x, z).y, z);
      sig.rotation.y = h;
      sig.scale.setScalar(0.85);
      scene.add(sig);
      W.addCollider({ type: 'circle', x, z, r: 0.2 });
      set.signals.push({ obj: sig, state });
    };
    place(roadA, dA - 6, 1, stateA); place(roadA, dA + 6, -1, stateA);
    place(roadB, dB - 6, 1, stateB); place(roadB, dB + 6, -1, stateB);
    // the player and NPCs bump into vehicles
    const baseAgents = W.agentColliders;
    W.agentColliders = (pos) => (baseAgents(pos) || []).concat(set.colliders(pos, 10));
    W.vehicleObstacles = () => set.colliders(KT.Player.bus ? KT.Player.bus.obj.position : KT.Player.pos, 16);
  };
  Tr.updateHome = function (dt, camPos) {
    if (Tr.home) Tr.home.update(dt, KT.World.animTime, camPos);
  };
  Tr.highwayColliders = (pos, range) => (Tr.hw ? Tr.hw.colliders(pos, range) : []);
})();
