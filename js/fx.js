// Small particle effects: dust puffs for jumps, landings and running.
(function () {
  'use strict';
  const T = THREE;
  const FX = KT.FX = { parts: [], scene: null };
  let tex = null;

  function puffTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(235,220,190,0.9)');
    grad.addColorStop(0.5, 'rgba(220,200,165,0.45)');
    grad.addColorStop(1, 'rgba(220,200,165,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    return t;
  }

  FX.init = function (scene) { FX.scene = scene; tex = puffTexture(); };

  // Spawn n soft dust sprites around a ground position.
  FX.puff = function (pos, n, strength) {
    if (!FX.scene) return;
    for (let i = 0; i < n; i++) {
      const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.7 });
      const s = new T.Sprite(m);
      const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.3;
      s.position.set(pos.x + Math.cos(a) * r, pos.y + 0.1, pos.z + Math.sin(a) * r);
      s.scale.setScalar(0.3);
      FX.scene.add(s);
      FX.parts.push({ s, vx: Math.cos(a) * (1 + Math.random()) * strength, vz: Math.sin(a) * (1 + Math.random()) * strength, vy: 0.4 + Math.random() * 0.6, life: 0, max: 0.6 + Math.random() * 0.4 });
    }
  };

  FX.update = function (dt) {
    for (let i = FX.parts.length - 1; i >= 0; i--) {
      const p = FX.parts[i];
      p.life += dt;
      const t = p.life / p.max;
      if (t >= 1) { FX.scene.remove(p.s); p.s.material.dispose(); FX.parts.splice(i, 1); continue; }
      p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; p.s.position.y += p.vy * dt;
      p.vx *= 0.92; p.vz *= 0.92;
      p.s.scale.setScalar(0.3 + t * 1.1);
      p.s.material.opacity = 0.7 * (1 - t);
    }
  };
})();
