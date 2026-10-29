// Driving the KSRTC bus: throttle/brake, speed-sensitive steering
// (bicycle model), suspension following the ground, collisions and wheel
// animation. Distances shown to the player use the map scale (1:20), so
// a 3 km stretch in the game reads as 60 km on the road signs.
(function () {
  'use strict';
  const T = THREE;
  const V = KT.Vehicle = {
    SCALE: 20,          // map scale: 1 game metre = 20 real metres
    MAX_SPEED: 26,      // m/s in game (~94 km/h on the speedometer)
    REVERSE: 6,
    ACCEL: 4.2,
    BRAKE: 11,
    DRAG: 0.6
  };

  // A drivable bus instance living in a level.
  V.create = function (scene, x, z, heading) {
    const obj = KT.Models.ksrtcBus();
    scene.add(obj);
    const bus = { obj, heading: heading || 0, speed: 0, steer: 0, odo: 0, occupied: false, y: 0 };
    obj.position.set(x, KT.L.groundY(x, z).y, z);
    obj.rotation.y = bus.heading;
    V.settle(bus);
    return bus;
  };

  // Rest the bus on the ground: height from the axles, pitch and roll.
  const _f = new T.Vector3(), _r = new T.Vector3();
  V.settle = function (bus, dt) {
    const B = KT.Models.BUS, o = bus.obj;
    const sh = Math.sin(bus.heading), ch = Math.cos(bus.heading);
    const gy = (x, z) => KT.L.groundY(x, z, o.position.y + 1.5).y;
    const fx = o.position.x + sh * B.frontAxle, fz = o.position.z + ch * B.frontAxle;
    const rx = o.position.x + sh * B.rearAxle, rz = o.position.z + ch * B.rearAxle;
    const front = gy(fx, fz), rear = gy(rx, rz);
    const lx = o.position.x + ch * 1.1, lz = o.position.z - sh * 1.1;
    const left = gy(lx, lz), right = gy(o.position.x - ch * 1.1, o.position.z + sh * 1.1);
    const y = (front + rear) / 2;
    const pitch = Math.atan2(front - rear, B.frontAxle - B.rearAxle);
    const roll = Math.atan2(left - right, 2.2) - bus.steer * bus.speed * 0.0025;
    const k = dt ? 1 - Math.exp(-dt * 10) : 1;
    o.position.y += (y - o.position.y) * k;
    bus.pitch = KT.lerp(bus.pitch || 0, pitch, k);
    bus.roll = KT.lerp(bus.roll || 0, roll, k);
    o.rotation.set(-bus.pitch, bus.heading, bus.roll, 'YXZ');
  };

  const _p = new T.Vector3();
  V.update = function (bus, dt, input) {
    const o = bus.obj;
    const throttle = input ? input.move.y : 0;
    const steerIn = input ? -input.move.x : 0;
    // throttle / brake / reverse
    if (throttle > 0.05) {
      if (bus.speed < -0.3) bus.speed += V.BRAKE * dt;
      else bus.speed += V.ACCEL * throttle * (1 - Math.max(0, bus.speed) / V.MAX_SPEED) * dt * (input.sprint ? 1.4 : 1);
    } else if (throttle < -0.05) {
      if (bus.speed > 0.3) bus.speed -= V.BRAKE * dt;
      else bus.speed = Math.max(-V.REVERSE, bus.speed - V.ACCEL * 0.6 * dt);
    } else {
      bus.speed -= Math.sign(bus.speed) * Math.min(Math.abs(bus.speed), (V.DRAG + Math.abs(bus.speed) * 0.02) * dt);
    }
    if (input && input.keys && input.keys.jump) bus.speed -= Math.sign(bus.speed) * Math.min(Math.abs(bus.speed), V.BRAKE * 1.3 * dt); // handbrake
    // steering: less lock at speed
    const maxLock = KT.lerp(0.6, 0.16, KT.clamp(Math.abs(bus.speed) / V.MAX_SPEED, 0, 1));
    bus.steer += (steerIn * maxLock - bus.steer) * (1 - Math.exp(-dt * 5));
    const B = KT.Models.BUS;
    const wheelbase = B.frontAxle - B.rearAxle;
    bus.heading += (bus.speed * Math.tan(bus.steer) / wheelbase) * dt;
    // move, then collide at three points along the body
    const step = bus.speed * dt;
    const sh = Math.sin(bus.heading), ch = Math.cos(bus.heading);
    const nx = o.position.x + sh * step, nz = o.position.z + ch * step;
    let hit = false;
    let px = nx, pz = nz;
    [-3.8, 0, 3.8].forEach((off) => {
      _p.set(px + sh * off, o.position.y + 1, pz + ch * off);
      const bx = _p.x, bz = _p.z;
      if (KT.L.resolve(_p, 1.3, KT.L.vehicleObstacles ? KT.L.vehicleObstacles(bus) : null)) {
        hit = true;
        px += _p.x - bx; pz += _p.z - bz;
      }
    });
    const b = KT.L.bounds;
    px = KT.clamp(px, b.minX, b.maxX); pz = KT.clamp(pz, b.minZ, b.maxZ);
    const g = KT.L.groundY(px, pz, o.position.y + 1.5);
    const tooDeep = KT.L.isWater ? KT.L.isWater(px, pz) : g.y < -0.3;
    if (tooDeep) { bus.speed *= -0.25; hit = true; }
    else {
      bus.odo += Math.hypot(px - o.position.x, pz - o.position.z);
      o.position.x = px; o.position.z = pz;
    }
    if (hit && Math.abs(bus.speed) > 4) { KT.Audio.play('land'); bus.speed *= 0.35; }
    else if (hit) bus.speed *= 0.6;
    V.settle(bus, dt);
    // wheels & steering wheel
    const spin = bus.speed * dt / B.wheelR;
    o.userData.wheels.forEach((w) => {
      w.spin.rotation.x += spin;
      if (w.front) w.pivot.rotation.y = bus.steer;
    });
    if (o.userData.steer) o.userData.steer.rotation.z = -bus.steer * 4;
  };

  V.kmh = (bus) => Math.abs(bus.speed) * 3.6;
  V.toKm = (metres) => (metres * V.SCALE) / 1000;
})();
