// Drivable vehicles: the KSRTC bus and the player's own bicycle, auto
// rickshaw, scooter and car. Throttle/brake, speed-sensitive steering
// (bicycle model), suspension following the ground, collisions and wheel
// animation. Distances shown to the player use the map scale (1:20), so
// a 3 km stretch in the game reads as 60 km on the road signs.
(function () {
  'use strict';
  const T = THREE;
  const V = KT.Vehicle = {
    SCALE: 20,          // map scale: 1 game metre = 20 real metres
    MAX_SPEED: 26,      // the bus, m/s in game (~94 km/h on the speedometer)
    DRAG: 0.6,
    active: []          // vehicles the player can drive, in every level
  };
  const v3 = (x, y, z) => new T.Vector3(x, y, z);

  // seat: where the driver's root sits (vehicle space); eye: first-person
  // camera; hits: collision circles along the body; exits: where to step off
  V.TYPES = {
    bus: {
      name: 'KSRTC bus', make: () => KT.Models.ksrtcBus(), remote: () => KT.Models.ksrtcBusClone(),
      length: 11, width: 2.75, frontAxle: 3.3, rearAxle: -2.8, wheelR: 0.5,
      seat: v3(-0.62, 0.55, 4.35), eye: v3(-0.62, 2.0, 4.45), pose: 'drive',
      maxSpeed: 31, accel: 6, reverse: 6, brake: 11, cam: 2.4, camH: 3.6,
      hits: [-3.8, 0, 3.8], r: 1.3, exits: [[2.4, 3.9], [2.4, -3.6], [-2.4, 3.9], [0, 7.2], [0, -7]],
      horn: 'horn', engine: 1, door: true
    },
    bicycle: {
      name: 'bicycle', make: () => KT.Models.bicycle(0x1d1d1f),
      length: 1.8, width: 0.6, frontAxle: 0.55, rearAxle: -0.52, wheelR: 0.34,
      seat: v3(0, 0.3, -0.2), eye: v3(0, 1.85, 0.05), pose: 'cycle', lean: 1,
      maxSpeed: 12.5, accel: 4.2, reverse: 1.5, brake: 6, cam: 0.95, camH: 1.7,
      hits: [0], r: 0.45, exits: [[0.9, 0], [-0.9, 0], [0, 1.6]],
      horn: 'bell', engine: 0
    },
    auto: {
      name: 'auto rickshaw', make: () => KT.Models.autoRickshaw(),
      length: 2.7, width: 1.32, frontAxle: 1.0, rearAxle: -0.65, wheelR: 0.22,
      seat: v3(0, 0.1, 0.32), eye: v3(0, 1.62, 0.45), pose: 'drive',
      maxSpeed: 19.5, accel: 5, reverse: 3, brake: 8, cam: 1.15, camH: 2.1,
      hits: [-0.7, 0.7], r: 0.7, exits: [[1.2, 0.3], [-1.2, 0.3], [0, 2.2]],
      horn: 'carHorn', engine: 0.8
    },
    scooter: {
      name: 'scooter', make: () => KT.Models.scooter(0xb3261e, null),
      length: 1.8, width: 0.7, frontAxle: 0.62, rearAxle: -0.55, wheelR: 0.22,
      seat: v3(0, 0.22, -0.3), eye: v3(0, 1.75, -0.1), pose: 'ride', lean: 1,
      maxSpeed: 25, accel: 6.2, reverse: 1.5, brake: 9, cam: 1.0, camH: 1.7,
      hits: [0], r: 0.5, exits: [[0.9, 0], [-0.9, 0], [0, 1.8]],
      horn: 'carHorn', engine: 0.6
    },
    car: {
      name: 'car', make: () => KT.Models.car(0xb3261e, 'hatch'),
      length: 3.8, width: 1.72, frontAxle: 1.15, rearAxle: -1.2, wheelR: 0.3,
      seat: v3(-0.38, -0.15, -0.25), eye: v3(-0.38, 1.25, 0.05), pose: 'drive',
      maxSpeed: 36, accel: 8, reverse: 5, brake: 12, cam: 1.35, camH: 2.2,
      hits: [-1.3, 0, 1.3], r: 0.9, exits: [[1.6, 0], [-1.6, 0], [0, 3]],
      horn: 'carHorn', engine: 0.7, hideDriver: true
    }
  };
  V.CODES = ['bus', 'bicycle', 'auto', 'scooter', 'car']; // network type codes

  // A drivable vehicle living in the current level.
  V.create = function (scene, x, z, heading, type) {
    type = type || 'bus';
    const spec = V.TYPES[type];
    const obj = spec.make();
    scene.add(obj);
    const veh = { obj, type, spec, scene, level: KT.L.id, heading: heading || 0, speed: 0, steer: 0, odo: 0, occupied: false, y: 0 };
    obj.position.set(x, KT.L.groundY(x, z).y, z);
    obj.rotation.y = veh.heading;
    V.settle(veh);
    V.active.push(veh);
    return veh;
  };
  V.remove = function (veh) {
    if (!veh) return;
    if (veh.obj.parent) veh.obj.parent.remove(veh.obj);
    const i = V.active.indexOf(veh);
    if (i >= 0) V.active.splice(i, 1);
  };
  // models for other players' vehicles
  const remoteProtos = {};
  V.remoteModel = function (type) {
    const spec = V.TYPES[type] || V.TYPES.bus;
    if (spec.remote) return spec.remote();
    if (!remoteProtos[type]) remoteProtos[type] = spec.make();
    return remoteProtos[type].clone(true);
  };
  // Collision boxes for parked (or other) player vehicles in a level.
  V.boxes = function (levelId, exclude) {
    const out = [];
    V.active.forEach((v) => {
      if (v === exclude || v.level !== levelId) return;
      const p = v.obj.position, rot = v.heading;
      out.push({ type: 'box', x: p.x, z: p.z, hw: v.spec.width / 2, hd: v.spec.length / 2, rot, cos: Math.cos(rot), sin: Math.sin(rot) });
    });
    return out;
  };

  // Rest the vehicle on the ground: height from the axles, pitch and roll;
  // two-wheelers lean into the turn instead.
  V.settle = function (veh, dt) {
    const S = veh.spec, o = veh.obj;
    const sh = Math.sin(veh.heading), ch = Math.cos(veh.heading);
    const gy = (x, z) => KT.L.groundY(x, z, o.position.y + 1.5).y;
    const fx = o.position.x + sh * S.frontAxle, fz = o.position.z + ch * S.frontAxle;
    const rx = o.position.x + sh * S.rearAxle, rz = o.position.z + ch * S.rearAxle;
    const front = gy(fx, fz), rear = gy(rx, rz);
    const y = (front + rear) / 2;
    // a vehicle never stands on end, whatever is under its wheels
    const pitch = KT.clamp(Math.atan2(front - rear, S.frontAxle - S.rearAxle), -0.3, 0.3);
    let roll;
    if (S.lean) roll = -KT.clamp(veh.steer * veh.speed * 0.09, -0.4, 0.4);
    else {
      const hw = S.width * 0.44;
      const left = gy(o.position.x + ch * hw, o.position.z - sh * hw), right = gy(o.position.x - ch * hw, o.position.z + sh * hw);
      roll = KT.clamp(Math.atan2(left - right, hw * 2), -0.22, 0.22) - veh.steer * veh.speed * 0.0025;
    }
    const k = dt ? 1 - Math.exp(-dt * 10) : 1;
    o.position.y += (y - o.position.y) * k;
    veh.pitch = KT.lerp(veh.pitch || 0, pitch, k);
    veh.roll = KT.lerp(veh.roll || 0, roll, k);
    o.rotation.set(-veh.pitch, veh.heading, veh.roll, 'YXZ');
  };

  const _p = new T.Vector3();
  V.update = function (veh, dt, input) {
    const S = veh.spec, o = veh.obj;
    const throttle = input ? input.move.y : 0;
    const steerIn = input ? -input.move.x : 0;
    // throttle / brake / reverse
    if (throttle > 0.05) {
      if (veh.speed < -0.3) veh.speed += S.brake * dt;
      else veh.speed += S.accel * throttle * (1 - Math.max(0, veh.speed) / S.maxSpeed) * dt * (input.sprint ? 1.4 : 1);
    } else if (throttle < -0.05) {
      if (veh.speed > 0.3) veh.speed -= S.brake * dt;
      else veh.speed = Math.max(-S.reverse, veh.speed - S.accel * 0.6 * dt);
    } else {
      veh.speed -= Math.sign(veh.speed) * Math.min(Math.abs(veh.speed), (V.DRAG + Math.abs(veh.speed) * 0.02) * dt);
    }
    if (input && input.keys && input.keys.jump) veh.speed -= Math.sign(veh.speed) * Math.min(Math.abs(veh.speed), S.brake * 1.3 * dt); // handbrake
    // steering: less lock at speed
    const maxLock = KT.lerp(0.6, 0.16, KT.clamp(Math.abs(veh.speed) / S.maxSpeed, 0, 1));
    veh.steer += (steerIn * maxLock - veh.steer) * (1 - Math.exp(-dt * 5));
    const wheelbase = S.frontAxle - S.rearAxle;
    veh.heading += (veh.speed * Math.tan(veh.steer) / wheelbase) * dt;
    // move, then collide at points along the body
    const step = veh.speed * dt;
    const sh = Math.sin(veh.heading), ch = Math.cos(veh.heading);
    let px = o.position.x + sh * step, pz = o.position.z + ch * step;
    let hit = false;
    const extra = KT.L.vehicleObstacles ? KT.L.vehicleObstacles(veh) : null;
    S.hits.forEach((off) => {
      _p.set(px + sh * off, o.position.y + 1, pz + ch * off);
      const bx = _p.x, bz = _p.z;
      if (KT.L.resolve(_p, S.r, extra)) {
        hit = true;
        px += _p.x - bx; pz += _p.z - bz;
      }
    });
    const b = KT.L.bounds;
    px = KT.clamp(px, b.minX, b.maxX); pz = KT.clamp(pz, b.minZ, b.maxZ);
    const tooDeep = KT.L.isWater ? KT.L.isWater(px, pz) : KT.L.groundY(px, pz, o.position.y + 1.5).y < -0.3;
    // walls, kerbs of bridges and steep drops: the ground just beyond the
    // bumper may not be much higher or lower than where the vehicle stands
    const dir = veh.speed >= 0 ? 1 : -1;
    const reach = (dir > 0 ? S.frontAxle : -S.rearAxle) + 0.7;
    const ahead = KT.L.groundY(px + sh * reach * dir, pz + ch * reach * dir, o.position.y + 1.5).y;
    const steep = Math.abs(step) > 1e-4 && Math.abs(ahead - o.position.y) / reach > V.MAX_GRADE;
    if (tooDeep || steep) { veh.speed *= -0.25; hit = true; }
    else {
      veh.odo += Math.hypot(px - o.position.x, pz - o.position.z);
      o.position.x = px; o.position.z = pz;
    }
    if (hit && Math.abs(veh.speed) > 4) { KT.Audio.play('land'); veh.speed *= 0.35; }
    else if (hit) veh.speed *= 0.6;
    V.settle(veh, dt);
    // remember the last good spot, and notice when the vehicle is stuck
    veh.safeT = (veh.safeT || 0) - dt;
    if (!hit && veh.safeT <= 0 && Math.abs(veh.pitch) < 0.12 && Math.abs(veh.roll) < 0.12) {
      veh.safeT = 0.5;
      veh.safe = { x: o.position.x, z: o.position.z, heading: veh.heading };
    }
    veh.stuckT = hit && input && Math.abs(input.move.y) > 0.1 ? (veh.stuckT || 0) + dt : Math.max(0, (veh.stuckT || 0) - dt * 0.5);
    // wheels & steering wheel
    const spin = veh.speed * dt / S.wheelR;
    (o.userData.wheels || []).forEach((w) => {
      w.spin.rotation.x += spin;
      if (w.front) w.pivot.rotation.y = veh.steer;
    });
    if (o.userData.steer) o.userData.steer.rotation.z = -veh.steer * 4;
  };

  V.MAX_GRADE = 0.45; // about 24 degrees

  // Put a stuck vehicle back on the road (or its last good spot).
  V.recover = function (veh) {
    const o = veh.obj;
    let spot = KT.L.recoverSpot ? KT.L.recoverSpot(o.position, veh.heading) : null;
    if (!spot && veh.safe) spot = veh.safe;
    if (!spot) return false;
    o.position.set(spot.x, KT.L.groundY(spot.x, spot.z, o.position.y + 1.5).y, spot.z);
    veh.heading = spot.heading;
    veh.speed = 0; veh.steer = 0; veh.stuckT = 0;
    veh.pitch = 0; veh.roll = 0;
    V.settle(veh);
    return true;
  };

  V.kmh = (veh) => Math.abs(veh.speed) * 3.6;
  V.toKm = (metres) => (metres * V.SCALE) / 1000;
})();
