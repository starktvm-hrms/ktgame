// Player controller (walking, sprinting, jumping, wading, gestures,
// canoe paddling, climbing viewpoints) and the follow camera.
(function () {
  'use strict';
  const T = THREE;
  const Geo = KT.Geo;
  const P = KT.Player = {
    pos: new T.Vector3(),
    vy: 0,
    heading: Math.PI,
    speed: 0,
    grounded: true,
    mode: 'foot',
    gesture: null,
    gestureTime: 0,
    obj: null,
    cfg: null,
    radius: 0.42,
    distance: 0
  };
  const WALK = 3.4, RUN = 7.2;

  P.init = function (scene, cfg, start) {
    P.scene = scene;
    P.setCharacter(cfg);
    P.pos.copy(start.pos);
    P.heading = start.heading;
    P.obj.position.copy(P.pos);
    P.obj.rotation.y = P.heading;
  };

  P.setCharacter = function (cfg) {
    P.cfg = cfg;
    if (P.obj) P.scene.remove(P.obj);
    P.obj = KT.Models.character(cfg);
    P.obj.position.copy(P.pos);
    P.obj.rotation.y = P.heading;
    P.scene.add(P.obj);
  };

  P.forward = function (camYaw) {
    return { x: -Math.sin(camYaw), z: -Math.cos(camYaw) };
  };

  const _next = new T.Vector3();
  P.update = function (dt, input, cam) {
    if (P.mode === 'canoe') return updateCanoe(dt, input, cam);
    if (P.mode === 'bus') return updateBus(dt, input);
    const f = P.forward(cam.yaw);
    const r = { x: Math.cos(cam.yaw), z: -Math.sin(cam.yaw) };
    let mx = f.x * input.move.y + r.x * input.move.x;
    let mz = f.z * input.move.y + r.z * input.move.x;
    const mag = Math.min(1, Math.hypot(mx, mz));
    if (P.gesture && mag > 0.1) P.gesture = null;
    let target = 0;
    if (mag > 0.05) {
      target = (input.sprint ? RUN : WALK) * Math.max(mag, 0.35);
      P.heading = KT.angleLerp(P.heading, Math.atan2(mx, mz), 1 - Math.exp(-dt * 12));
    }
    // wading slows you down
    const here = KT.L.groundY(P.pos.x, P.pos.z, P.pos.y);
    const wading = here.y < 0.15 && !here.onPlatform;
    if (wading) target *= 0.5;
    P.speed += (target - P.speed) * (1 - Math.exp(-dt * (target > P.speed ? 8 : 10)));
    const step = P.speed * dt;
    // move in small sub-steps so fast movement or low frame rates can never
    // tunnel through walls, trees or people
    _next.copy(P.pos);
    const agents = KT.L.agentColliders ? KT.L.agentColliders(P.pos) : null;
    const nSub = Math.max(1, Math.ceil(step / 0.12));
    for (let i = 0; i < nSub; i++) {
      _next.x += Math.sin(P.heading) * step / nSub;
      _next.z += Math.cos(P.heading) * step / nSub;
      KT.L.resolve(_next, P.radius, agents);
    }
    const b = KT.L.bounds;
    _next.x = KT.clamp(_next.x, b.minX, b.maxX);
    _next.z = KT.clamp(_next.z, b.minZ, b.maxZ);
    const g = KT.L.groundY(_next.x, _next.z, P.pos.y);
    const tooDeep = g.y < -0.55;
    const tooHigh = P.grounded && g.y > P.pos.y + 0.75;
    if (!tooDeep && !tooHigh) {
      P.distance += Math.hypot(_next.x - P.pos.x, _next.z - P.pos.z);
      P.pos.x = _next.x; P.pos.z = _next.z;
    } else {
      P.speed *= 0.5;
      if (tooDeep && !P.warnedWater) { P.warnedWater = true; KT.UI.toast('The water is too deep to wade. Find a canoe at the jetty!'); }
    }
    // jumping & gravity
    const ground = KT.L.groundY(P.pos.x, P.pos.z, P.pos.y);
    const anim = P.obj.userData.anim;
    if (input.consume('jump') && P.grounded) {
      P.vy = 7.4; P.grounded = false; P.gesture = null;
      P.airTime = 0;
      // each jump gets a little personality; sprinting jumps become flips
      const styles = ['reach', 'star', 'tuck', 'reach'];
      P.jumpStyle = P.speed > 5.5 ? 'flip' : styles[(P.jumpCount = (P.jumpCount || 0) + 1) % styles.length];
      if (P.jumpStyle === 'flip') P.vy = 8.2;
      KT.Audio.play('jump');
      KT.FX.puff(P.pos, 5, 0.6);
    }
    P.vy -= 22 * dt;
    P.pos.y += P.vy * dt;
    const wasAir = !P.grounded;
    if (P.pos.y <= ground.y) {
      P.pos.y = ground.y; P.grounded = true;
    } else if (P.pos.y > ground.y + 0.25) {
      P.grounded = false;
    } else if (P.vy <= 0) {
      P.pos.y = ground.y; P.grounded = true;
    }
    if (P.grounded && wasAir) {
      if (P.vy < -4) {
        P.landTime = Math.min(0.3, -P.vy * 0.03);
        KT.Audio.play('land');
        KT.FX.puff(P.pos, 9, 1);
        P.speed *= 0.6;
      }
      P.vy = 0;
    } else if (P.grounded) P.vy = 0;
    if (!P.grounded) P.airTime = (P.airTime || 0) + dt;
    // gestures
    if (input.consume('namaskaram')) startGesture('namaskaram', 2.2);
    if (input.consume('wave')) startGesture('wave', 2.0);
    if (P.gesture) { P.gestureTime -= dt; if (P.gestureTime <= 0) P.gesture = null; }
    // animation
    let state = 'idle';
    if (P.landTime > 0) { P.landTime -= dt; state = 'land'; }
    else if (!P.grounded) state = (P.vy > -2 || P.jumpStyle === 'flip' || P.jumpStyle === 'tuck') && P.airTime < 1.2 ? 'jump' : 'fall';
    else if (P.speed > 4.8) state = 'run';
    else if (P.speed > 0.4) state = 'walk';
    else if (P.gesture) state = P.gesture;
    anim.air = P.grounded ? 0 : P.airTime;
    anim.jumpStyle = P.jumpStyle;
    KT.Models.animateCharacter(P.obj, state, dt, state === 'walk' ? P.speed / WALK : P.speed / RUN);
    // front flip: spin the body around the waist while airborne
    const hips = P.obj.userData.rig.hips;
    if (!P.grounded && P.jumpStyle === 'flip' && P.airTime > 0.06) {
      anim.flipping = true;
      const total = 2 * 8.2 / 22; // time to land on flat ground
      const f = KT.clamp((P.airTime - 0.06) / (total - 0.12), 0, 1);
      hips.rotation.set(f * Math.PI * 2, 0, 0);
    } else if (anim.flipping) {
      anim.flipping = false;
      hips.rotation.set(0, 0, 0);
    }
    P.obj.position.copy(P.pos);
    P.obj.rotation.y = P.heading;
    P.state = state;
    footsteps(dt, state, wading);
  };

  function startGesture(name, time) {
    if (!P.grounded || P.speed > 0.5) return;
    P.gesture = name; P.gestureTime = time;
    KT.Game.onGesture(name);
  }

  let stepT = 0;
  function footsteps(dt, state, wading) {
    if (state !== 'walk' && state !== 'run') { stepT = 0; return; }
    stepT -= dt;
    if (stepT <= 0) {
      stepT = state === 'run' ? 0.3 : 0.44;
      KT.Audio.play(wading ? 'splash' : 'step');
      if (state === 'run' && !wading) KT.FX.puff(P.pos, 1, 0.25);
    }
  }

  // ---------------------------------------------------------- canoe mode
  P.boardCanoe = function () {
    const c = KT.Entities.canoe;
    if (c.inUse) return;
    c.inUse = true;
    P.mode = 'canoe';
    P.gesture = null;
    c.paddle.visible = true;
    P.obj.position.set(0, 0, 0);
    P.obj.rotation.set(0, 0, 0);
    c.obj.add(P.obj);
    P.obj.position.set(0, 0.42, -0.4);
    KT.Audio.play('splash');
    KT.UI.toast('Paddle with W / S, steer with A / D. Press E near land to get out.');
    KT.Game.onEvent('boardCanoe');
  };

  P.leaveCanoe = function () {
    const c = KT.Entities.canoe;
    // look for dry ground or a jetty nearby
    let best = null;
    for (let r = 1.5; r <= 5 && !best; r += 0.7) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = c.obj.position.x + Math.cos(a) * r, z = c.obj.position.z + Math.sin(a) * r;
        const g = KT.L.groundY(x, z, 2);
        if (g.y > 0.25 && !KT.L.isBlocked(x, z, 0.4)) { best = new T.Vector3(x, g.y, z); break; }
      }
    }
    if (!best) { KT.UI.toast('Paddle closer to the shore or a jetty to get out.'); return false; }
    c.obj.remove(P.obj);
    P.scene.add(P.obj);
    c.inUse = false;
    c.paddle.visible = false;
    c.speed = 0;
    P.mode = 'foot';
    P.pos.copy(best);
    P.vy = 0;
    P.grounded = true;
    P.heading = c.heading;
    P.obj.position.copy(P.pos);
    P.obj.rotation.set(0, P.heading, 0);
    KT.Audio.play('splash');
    KT.Game.onEvent('leaveCanoe');
    return true;
  };

  const _cp = new T.Vector3();
  function updateCanoe(dt, input, cam) {
    const c = KT.Entities.canoe;
    const turn = -input.move.x;
    c.heading += turn * dt * (1.2 + Math.abs(c.speed) * 0.08);
    const maxS = input.sprint ? 6.5 : 4.4;
    const target = input.move.y * maxS;
    c.speed += (target - c.speed) * (1 - Math.exp(-dt * 1.4));
    const step = c.speed * dt;
    _cp.set(c.obj.position.x + Math.sin(c.heading) * step, 0, c.obj.position.z + Math.cos(c.heading) * step);
    KT.L.resolve(_cp, 0.9, KT.Entities.boatColliders());
    const bowX = _cp.x + Math.sin(c.heading) * 2.4 * Math.sign(c.speed || 1), bowZ = _cp.z + Math.cos(c.heading) * 2.4 * Math.sign(c.speed || 1);
    const deepEnough = Geo.height(_cp.x, _cp.z) < -0.3 && Geo.height(bowX, bowZ) < -0.15;
    const inPlatform = KT.L.groundY(bowX, bowZ).onPlatform;
    if (deepEnough && !inPlatform && _cp.z < 236) {
      c.obj.position.x = _cp.x; c.obj.position.z = _cp.z;
    } else {
      c.speed *= -0.2;
    }
    const t = KT.World.animTime;
    c.obj.position.y = 0.05 + Math.sin(t * 1.6) * 0.04;
    c.obj.rotation.set(Math.sin(t * 1.2) * 0.015, c.heading, Math.sin(t * 1.4) * 0.03 + turn * 0.04);
    P.heading = c.heading;
    c.obj.updateMatrixWorld();
    P.obj.getWorldPosition(P.pos);
    // paddle animation
    const paddling = Math.abs(input.move.y) > 0.1 || Math.abs(turn) > 0.1;
    KT.Models.animateCharacter(P.obj, paddling ? 'paddle' : 'sit', dt, 1.6);
    const ph = P.obj.userData.anim.phase;
    const side = Math.sin(ph * 0.5) > 0 ? 1 : -1;
    c.paddle.position.set(side * 0.55, 0.85, -0.2 + Math.sin(ph) * 0.35);
    c.paddle.rotation.set(paddling ? -0.6 + Math.sin(ph) * 0.6 : -1.2, 0, side * 0.5);
    if (paddling) {
      c.stroke = (c.stroke || 0) - dt;
      if (c.stroke <= 0) { c.stroke = 1.0; KT.Audio.play('paddle'); }
    }
    P.state = 'paddle';
  }

  // ------------------------------------------------------------ bus mode
  P.boardBus = function (bus) {
    if (bus.occupied || P.mode !== 'foot') return;
    bus.occupied = true;
    P.bus = bus;
    P.mode = 'bus';
    P.gesture = null;
    P.speed = 0;
    if (P.obj.parent) P.obj.parent.remove(P.obj);
    bus.obj.add(P.obj);
    const d = KT.Models.BUS.driver;
    P.obj.position.set(d.x, d.y - 0.5, d.z);
    P.obj.rotation.set(0, 0, 0);
    KT.CameraRig.yaw = bus.heading + Math.PI;
    KT.Audio.play('door');
    KT.Audio.engine(true);
    KT.Game.onEvent('boardBus');
  };

  P.leaveBus = function () {
    const bus = P.bus;
    if (!bus) return false;
    if (Math.abs(bus.speed) > 1.5) { KT.UI.toast('Stop the bus before getting off (S / brake).'); return false; }
    const o = bus.obj;
    // step out through the front door on the left side of the bus
    const tries = [[2.4, 3.9], [2.4, -3.6], [-2.4, 3.9], [0, 7.2], [0, -7]];
    let spot = null;
    for (let i = 0; i < tries.length && !spot; i++) {
      const v = o.localToWorld(new T.Vector3(tries[i][0], 0, tries[i][1]));
      const g = KT.L.groundY(v.x, v.z, o.position.y + 2);
      if (!KT.L.isBlocked(v.x, v.z, 0.4) && !(KT.L.isWater && KT.L.isWater(v.x, v.z))) spot = new T.Vector3(v.x, g.y, v.z);
    }
    if (!spot) { KT.UI.toast('No room to get off here.'); return false; }
    o.remove(P.obj);
    P.scene.add(P.obj);
    bus.occupied = false;
    bus.speed = 0;
    P.mode = 'foot';
    P.bus = null;
    P.pos.copy(spot);
    P.vy = 0; P.grounded = true;
    P.heading = bus.heading;
    P.obj.position.copy(P.pos);
    P.obj.rotation.set(0, P.heading, 0);
    KT.Audio.play('door');
    KT.Audio.engine(false);
    KT.Game.onEvent('leaveBus');
    return true;
  };

  function updateBus(dt, input) {
    const bus = P.bus;
    KT.Vehicle.update(bus, dt, input);
    if (input.consume('horn')) KT.Audio.play('horn');
    bus.obj.updateMatrixWorld();
    P.obj.getWorldPosition(P.pos);
    P.heading = bus.heading;
    KT.Models.animateCharacter(P.obj, 'drive', dt);
    KT.Audio.engine(true, Math.abs(bus.speed) / KT.Vehicle.MAX_SPEED);
    P.state = 'drive';
  }

  // ---------------------------------------------------------- camera rig
  const Cam = KT.CameraRig = {
    yaw: 0, pitch: 0.28, dist: 6, targetDist: 6, first: false, idle: 0,
    pos: new T.Vector3(), look: new T.Vector3()
  };
  // Is a point inside a large box collider (houses, temple walls)?
  function insideBuilding(x, z, y) {
    const list = KT.L.nearbyColliders(x, z, 1);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.type !== 'box' || c.ext < 2.5) continue;
      if (y - KT.L.height(c.x, c.z) > 7) continue;
      const dx = x - c.x, dz = z - c.z;
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3) return true;
    }
    return false;
  }

  function blocksCamera(x, z, y) {
    const list = KT.L.nearbyColliders(x, z, 1);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.noCamera) continue;
      if (c.maxY !== undefined && y > c.maxY) continue;
      if (y - KT.L.height(c.x, c.z) > (c.type === 'box' ? 6 : 9)) continue;
      if (c.type === 'circle') {
        if (c.r < 0.9) continue; // thin poles & trunks never shove the camera
        if (Math.hypot(x - c.x, z - c.z) < c.r + 0.15) return true;
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + 0.2 && Math.abs(lz) < c.hd + 0.2) return true;
      }
    }
    return false;
  }

  Cam.update = function (dt, camera, input) {
    const l = input.takeLook();
    if (l.dx || l.dy) Cam.idle = 0; else Cam.idle += dt;
    Cam.yaw -= l.dx * 0.0042;
    Cam.pitch = KT.clamp(Cam.pitch + l.dy * 0.0035, Cam.first ? -1.2 : -0.35, Cam.first ? 1.2 : 1.25);
    if (l.zoom) Cam.targetDist = KT.clamp(Cam.targetDist + l.zoom * 0.8, 2.5, 16);
    // gently swing behind the player while moving
    const inBus = P.mode === 'bus';
    const moving = P.mode === 'canoe' ? Math.abs(KT.Entities.canoe.speed) > 0.5 : inBus ? Math.abs(P.bus.speed) > 0.5 : P.speed > 0.5;
    if (moving && Cam.idle > (inBus ? 0.6 : 1.2) && !Cam.first) {
      Cam.yaw = KT.angleLerp(Cam.yaw, P.heading + Math.PI, 1 - Math.exp(-dt * (inBus ? 2.2 : 0.9)));
    }
    if (inBus && Cam.first) {
      // driver's view through the windscreen
      const eye = P.bus.obj.localToWorld(KT.Models.BUS.driver.clone().add(new T.Vector3(0, 0.95, 0.1)));
      const h = P.bus.heading + (Cam.yaw - (P.heading + Math.PI)) * 0.0;
      camera.position.copy(eye);
      camera.lookAt(eye.x + Math.sin(h) * 10, eye.y - 0.6, eye.z + Math.cos(h) * 10);
      return;
    }
    const head = inBus ? P.bus.obj.position.clone().add(new T.Vector3(0, 3.6, 0)) : new T.Vector3(P.pos.x, P.pos.y + (P.mode === 'canoe' ? 1.1 : 1.55), P.pos.z);
    if (Cam.first) {
      P.obj.visible = false;
      const fwd = new T.Vector3(-Math.sin(Cam.yaw) * Math.cos(Cam.pitch), -Math.sin(Cam.pitch), -Math.cos(Cam.yaw) * Math.cos(Cam.pitch));
      const eye = head.clone().add(new T.Vector3(0, 0.12, 0));
      camera.position.copy(eye);
      camera.lookAt(eye.clone().add(fwd));
      if (moving && P.mode === 'foot') P.heading = KT.angleLerp(P.heading, Cam.yaw + Math.PI, 1 - Math.exp(-dt * 10));
      return;
    }
    P.obj.visible = true;
    const wantDist = Cam.targetDist * (P.mode === 'canoe' ? 1.5 : inBus ? 2.4 : 1);
    Cam.dist = Cam.snap ? wantDist : Cam.dist + (wantDist - Cam.dist) * (1 - Math.exp(-dt * 6));
    const cp = Math.cos(Cam.pitch);
    const off = new T.Vector3(Math.sin(Cam.yaw) * cp, Math.sin(Cam.pitch), Math.cos(Cam.yaw) * cp).multiplyScalar(Cam.dist);
    const right = new T.Vector3(Math.cos(Cam.yaw), 0, -Math.sin(Cam.yaw));
    const target = head.clone().addScaledVector(right, inBus ? 0 : 0.45);
    const desired = target.clone().add(off);
    // keep the camera above ground & out of water
    const gy = KT.L.groundY(desired.x, desired.z).y;
    const minY = Math.max(gy, 0) + 0.5;
    if (desired.y < minY) desired.y = minY;
    // avoid clipping into big colliders (pull in towards the player)
    // pull the camera in front of any wall or trunk between it and the player
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = KT.lerp(target.x, desired.x, t), y = KT.lerp(target.y, desired.y, t), z = KT.lerp(target.z, desired.z, t);
      if (blocksCamera(x, z, y)) {
        const back = Math.max(1.4 / Math.max(Cam.dist, 1.4), (i - 1.5) / steps);
        desired.set(KT.lerp(target.x, desired.x, back), KT.lerp(target.y, desired.y, back), KT.lerp(target.z, desired.z, back));
        break;
      }
    }
    if (Cam.snap) { camera.position.copy(desired); Cam.snap = false; } // after a teleport
    else camera.position.lerp(desired, 1 - Math.exp(-dt * 14));
    camera.lookAt(target);
  };
})();
