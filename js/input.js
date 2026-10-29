// Keyboard, mouse and touch input (virtual joystick + buttons).
(function () {
  'use strict';
  const I = KT.Input = {
    keys: {},
    move: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    zoom: 0,
    sprint: false,
    sprintToggle: false,
    jump: false,
    pressed: {},
    enabled: false,
    touch: false,
    sensitivity: 1,
    invertY: false
  };

  const CODES = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', KeyE: 'interact', KeyF: 'interact', KeyC: 'photo', KeyN: 'namaskaram',
    KeyV: 'view', KeyM: 'map', KeyH: 'horn', KeyJ: 'profile', KeyO: 'players', Escape: 'pause', KeyP: 'pause', KeyQ: 'wave', Enter: 'confirm'
  };

  I.consume = function (name) {
    const v = !!I.pressed[name];
    I.pressed[name] = false;
    return v;
  };

  I.init = function (canvas) {
    window.addEventListener('keydown', (e) => {
      const a = CODES[e.code];
      if (!a) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!I.keys[a]) I.pressed[a] = true;
      I.keys[a] = true;
      if (a === 'jump' || a.indexOf('up') === 0 || a === 'down' || a === 'pause') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const a = CODES[e.code];
      if (a) I.keys[a] = false;
    });
    window.addEventListener('blur', () => { I.keys = {}; });

    // mouse drag to look
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (!I.enabled) return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      if (I.pointerLock && canvas.requestPointerLock) canvas.requestPointerLock();
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!I.enabled) return;
      if (document.pointerLockElement === canvas) {
        I.look.dx += e.movementX; I.look.dy += e.movementY;
      } else if (dragging) {
        I.look.dx += e.clientX - lx; I.look.dy += e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
      }
    });
    canvas.addEventListener('wheel', (e) => {
      if (!I.enabled) return;
      I.zoom += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // touch: right side of the screen looks around
    const lookTouches = {};
    canvas.addEventListener('touchstart', (e) => {
      I.touch = true;
      document.body.classList.add('touch');
      for (const t of e.changedTouches) lookTouches[t.identifier] = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const l = lookTouches[t.identifier];
        if (!l) continue;
        I.look.dx += (t.clientX - l.x) * 1.3; I.look.dy += (t.clientY - l.y) * 1.3;
        l.x = t.clientX; l.y = t.clientY;
      }
      e.preventDefault();
    }, { passive: false });
    const endTouch = (e) => { for (const t of e.changedTouches) delete lookTouches[t.identifier]; };
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);

    // virtual joystick
    const joy = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    let joyId = null, cx = 0, cy = 0;
    const R = 50;
    const setKnob = (dx, dy) => { knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
    const joyStart = (x, y, id) => {
      const r = joy.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; joyId = id;
      joyMove(x, y);
    };
    const joyMove = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      setKnob(dx, dy);
      I.joy = { x: dx / R, y: -dy / R };
    };
    const joyEnd = () => { joyId = null; I.joy = null; setKnob(0, 0); };
    joy.addEventListener('touchstart', (e) => { I.touch = true; document.body.classList.add('touch'); const t = e.changedTouches[0]; joyStart(t.clientX, t.clientY, t.identifier); e.preventDefault(); }, { passive: false });
    joy.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === joyId) joyMove(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    joy.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === joyId) joyEnd(); });
    joy.addEventListener('touchcancel', joyEnd);
    // mouse fallback for the joystick (e.g. small laptop screens with touch UI)
    joy.addEventListener('mousedown', (e) => {
      joyStart(e.clientX, e.clientY, 'mouse');
      const mm = (ev) => joyMove(ev.clientX, ev.clientY);
      const mu = () => { joyEnd(); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    });

    // on-screen buttons
    const bindBtn = (id, action, hold) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hold) I.keys[action] = true;
        I.pressed[action] = true;
        el.classList.add('active');
      };
      const up = () => { if (hold) I.keys[action] = false; el.classList.remove('active'); };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up);
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };
    bindBtn('btn-sprint', 'sprintBtn', false);
    bindBtn('btn-jump', 'jump', true);
    bindBtn('btn-action', 'interact', false);
    bindBtn('btn-photo', 'photo', false);
    bindBtn('btn-namaskaram', 'namaskaram', false);
  };

  I.update = function () {
    let x = 0, y = 0;
    if (I.keys.left) x -= 1;
    if (I.keys.right) x += 1;
    if (I.keys.up) y += 1;
    if (I.keys.down) y -= 1;
    if (I.joy) { x += I.joy.x; y += I.joy.y; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    I.move.x = x; I.move.y = y;
    if (I.consume('sprintBtn')) I.sprintToggle = !I.sprintToggle;
    const joyRun = I.joy && Math.hypot(I.joy.x, I.joy.y) > 0.95;
    I.sprint = !!I.keys.sprint || I.sprintToggle || joyRun;
  };

  I.takeLook = function () {
    const l = { dx: I.look.dx * I.sensitivity, dy: I.look.dy * I.sensitivity * (I.invertY ? -1 : 1), zoom: I.zoom };
    I.look.dx = I.look.dy = 0;
    I.zoom = 0;
    return l;
  };
})();
