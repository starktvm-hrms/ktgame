// Story Mode engine: plays the chapters described in js/story-data.js.
//
// While a chapter runs, the HUD mission panel, compass and map show the
// story objective (js/missions.js asks this module first). A chapter is a
// list of steps; every step can name the sight it happens at (`at`), and
// the engine takes you there. Step types:
//
//   scene     a conversation on a wooden card (portraits, Next)
//   message   a single line on the chapter-card style banner
//   travel    go to a sight
//   tutorial  learn to walk, run and jump
//   talk      a character waits near you; press E
//   find      walk over glowing items to pick them up
//   press     press E at several spots (disable, clear, plant...)
//   photo     press E at a viewpoint to photograph something
//   chase     catch someone who runs away, before time runs out
//   timed     reach a person or place before time runs out
//   reach     walk up to the sight itself
//   puzzle    remember a sequence of symbols and repeat it
//   quiz      answer questions
//   rhythm    hit the beats (chenda drums, boat-race paddling)
//   symbol    take one of the seven symbols
//
// Progress lives in Game.data.story and is saved with the rest of the game.
(function () {
  'use strict';
  const T = THREE;
  const S = KT.Story = { objs: [], chars: {}, busy: false };
  const D = () => KT.STORY;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ------------------------------------------------------------ state
  function st() {
    const d = KT.Game.data;
    if (!d) return null;
    if (!d.story) d.story = { done: [], symbols: [], badges: [], points: 0, cur: null };
    const s = d.story;
    s.badges = s.badges || []; s.points = s.points || 0; s.symbols = s.symbols || []; s.done = s.done || [];
    return s;
  }
  S.isOn = () => !!(KT.Game.data && KT.Game.data.mode === 'story');
  S.active = () => S.isOn() && !!(st() && st().cur);
  S.unlocked = (i) => i === 0 || st().done.indexOf(i - 1) >= 0 || st().done.indexOf(i) >= 0;
  const chap = () => D().CHAPTERS[st().cur.ch];
  const step = () => chap().steps[st().cur.step];
  const placeOf = (s) => (s && s.at) || st().cur.at || chap().to;
  const sightOf = (name) => KT.Highway.sightList().find((s) => s.name === name);
  const symbolOf = (id) => D().SYMBOLS.find((s) => s.id === id);
  const castOf = (who) => who === 'player' ? { name: (KT.Game.data && KT.Game.data.name) || 'You', role: 'The Explorer', cfg: KT.Game.cfg } : (D().CAST[who] || { name: who, role: '', cfg: { gender: 'male', outfit: 'casual', acc: {} } });

  // ------------------------------------------------------ the objective
  S.objective = function () {
    if (!S.active()) return null;
    const c = chap(), s = step();
    if (!s) return null;
    const head = 'Ch. ' + c.n + ' • ';
    const timer = S.timer > 0 ? '  ⏱ ' + Math.ceil(S.timer) + 's' : '';
    const title = s.title || ({ travel: 'Travel to ' + placeOf(s), talk: 'Talk to ' + castOf(s.who).name, reach: 'Reach ' + placeOf(s), tutorial: 'Welcome to Kerala' }[s.type]) || c.title;
    const desc = s.desc || ({
      travel: c.place + ': ' + c.title, talk: 'Find ' + castOf(s.who).name + ' nearby and press E to talk.',
      tutorial: tutorialText(), reach: 'Walk up to ' + placeOf(s) + '.', symbol: 'Follow the light and press E to take the symbol.',
      chase: 'Run (Shift + W) and catch them!', photo: 'Go to the camera marker and press E to take the photo.',
      drive: s.mode === 'escape' ? 'Drive to the checkpoint before the pursuer catches you!' : 'Drive after them (W/S, A/D) and get right behind them to force them to stop!'
    }[s.type]) || '';
    return { title: head + title + timer, desc };
  };
  S.progress = function () {
    const s = S.active() && step();
    if (s && (s.type === 'find' || s.type === 'press')) return { done: (st().cur.found || []).length, total: s.count || 1 };
    if (s && s.type === 'tutorial') { const t = S.tut || {}; return { done: (t.walk ? 1 : 0) + (t.run ? 1 : 0) + (t.jump ? 1 : 0), total: 3 }; }
    return { done: 0, total: 1 };
  };
  S.target = function () {
    if (!S.active() || KT.Game.level !== 'highway') return null;
    const s = step();
    if (!s) return null;
    if ((s.type === 'talk' || s.type === 'timed') && S.chars[s.who]) return S.chars[s.who].position;
    if (s.type === 'timed' && S.goal) return S.goal.position;
    if (s.type === 'chase' && S.runner) return S.runner.position;
    if (s.type === 'drive' && S.drive) return S.drive.mode === 'escape' ? S.drive.goal.position : S.drive.obj.position;
    if (['find', 'press', 'photo', 'symbol'].indexOf(s.type) >= 0) {
      const P = KT.Player.pos;
      let best = null, bd = 1e9;
      S.objs.forEach((o) => { if (!o.userData.item || !o.parent) return; const d = o.position.distanceTo(P); if (d < bd) { bd = d; best = o.position; } });
      return best;
    }
    const sg = sightOf(placeOf(s));
    return sg ? { x: sg.x, y: KT.Highway.groundY(sg.x, sg.z).y, z: sg.z } : null;
  };
  function refresh() { KT.UI.updateMission(KT.Missions.current()); }

  // ------------------------------------------------------- cutscenes
  const portraits = {};
  function portrait(who) {
    if (portraits[who] !== undefined) return portraits[who];
    try { portraits[who] = KT.Preview.portraitFor(castOf(who).cfg); } catch (e) { portraits[who] = ''; }
    return portraits[who];
  }
  // hold the game while an overlay is up, and give it back after
  function hold() { const G = KT.Game, before = G.state; if (before !== 'story') G.setState('story'); return () => { if (KT.Game.state === 'story') KT.Game.setState(before === 'story' || before === 'travel' ? 'playing' : before); }; }
  // ------------------------------------------------- cinematic scenes
  // Conversations are filmed: the speakers face each other, the camera
  // cuts per line between an establishing wide shot, two-shots, reverse
  // shots over the listener's shoulder and close-ups (keeping to one side
  // of the line between them), with letterbox bars and subtitles. Each
  // character speaks with their own voice (the browser's speech), and
  // their jaw opens on every word; without speech the mouth keeps time.
  const VOICES = {
    appuppan: { pitch: 0.75, rate: 0.86 }, meera: { pitch: 1.15, rate: 1.0 }, collector: { pitch: 0.5, rate: 0.9 },
    agent: { pitch: 0.7, rate: 1.0 }, narrator: { pitch: 0.95, rate: 0.92, male: true }
  };
  S.voiceOn = (() => { try { return localStorage.getItem('kt-voices') !== '0'; } catch (e) { return true; } })();
  let voiceList = null;
  function pickVoice(male) {
    const syn = window.speechSynthesis;
    if (!syn) return null;
    if (!voiceList || !voiceList.length) voiceList = syn.getVoices().filter((v) => /^en/i.test(v.lang));
    if (!voiceList.length) return null;
    const F = /female|woman|zira|samantha|heera|veena|susan|karen|moira|tessa|fiona|victoria|kate|serena|google uk english female|aria|jenny|sonia|neerja/i;
    const Mm = /\bmale\b|man|david|ravi|daniel|alex|fred|george|guy|ryan|rishi|prabhat|google uk english male|arthur|thomas/i;
    const pool = voiceList.filter((v) => (male ? Mm.test(v.name) && !F.test(v.name) : F.test(v.name)));
    const order = (l) => l.slice().sort((a, b) => (/en-IN/i.test(b.lang) ? 1 : 0) - (/en-IN/i.test(a.lang) ? 1 : 0));
    return order(pool)[0] || order(voiceList)[0];
  }
  // say a line; onWord on each word, onEnd when done (a timer stands in
  // when speech is off or unavailable)
  function speak(who, text, onWord, onEnd) {
    const syn = window.speechSynthesis;
    let done = false, fake = null;
    const end = () => { if (done) return; done = true; if (fake) clearInterval(fake); onEnd(); };
    const fallback = () => {
      if (done || fake) return;
      const words = text.split(/\s+/).length, per = 0.27, t0 = performance.now();
      let n = 0;
      fake = setInterval(() => {
        if (done) return;
        if (n < words) { onWord(); n++; } else if ((performance.now() - t0) / 1000 > words * per + 0.3) end();
      }, per * 1000);
    };
    const c = castOf(who), male = who === 'narrator' ? true : !(c.cfg && c.cfg.gender === 'female');
    const vs = VOICES[who] || { pitch: male ? 0.9 : 1.1, rate: 0.98 };
    if (S.voiceOn && syn && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        syn.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice(vs.male !== undefined ? vs.male : male);
        if (v) u.voice = v;
        u.pitch = vs.pitch; u.rate = vs.rate; u.volume = 1;
        let started = false;
        u.onstart = () => { started = true; };
        u.onboundary = (e) => { if (!e.name || e.name === 'word') onWord(); };
        u.onend = end;
        u.onerror = () => { if (!started) fallback(); else end(); };
        syn.speak(u);
        setTimeout(() => { if (!started && !done) { syn.cancel(); fallback(); } }, 1600);
        return () => { done = true; if (fake) clearInterval(fake); try { syn.cancel(); } catch (e) { /* ignore */ } };
      } catch (e) { /* fall through */ }
    }
    fallback();
    return () => { done = true; if (fake) clearInterval(fake); };
  }

  const _a = new T.Vector3(), _b = new T.Vector3();
  function headOf(o) {
    const h = o.userData.rig && o.userData.rig.head;
    if (h) { h.getWorldPosition(_a); return _a.clone().add(new T.Vector3(0, 0.12, 0)); }
    return o.position.clone().add(new T.Vector3(0, 1.55, 0));
  }
  function actorOf(who) {
    if (who === 'player') return KT.Player.obj;
    const o = S.chars[who];
    return o && o.parent && o.position.distanceTo(KT.Player.pos) < 30 ? o : null;
  }

  // nothing solid between the camera and what it looks at
  function clearShot(from, to) {
    for (let k = 1; k <= 6; k++) {
      const t = k / 7, x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
      if (KT.Highway.isBlocked && KT.Highway.isBlocked(x, z, 0.25)) return false;
    }
    return !(KT.Highway.isBlocked && KT.Highway.isBlocked(from.x, from.z, 0.35));
  }

  S.scene = function (lines, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      if (!lines || !lines.length) return resolve();
      const G = KT.Game, P = KT.Player;
      const film = G.level === 'highway' && G.state === 'playing' && P.mode === 'foot';
      const release = hold(), box = $('story-scene');
      // the cast on set: the player and the first other speaker who is here
      const other = film ? lines.map((l) => l[0]).filter((w) => w !== 'player' && w !== 'narrator').map(actorOf).find(Boolean) : null;
      const cam = G.camera, fov0 = cam.fov;
      if (film) P.obj.position.copy(P.pos); // (the body follows the player only while playing)
      if (film && other) {
        // stand face to face, a conversation apart
        const d = new T.Vector3().subVectors(P.pos, other.position); d.y = 0;
        const len = d.length() || 1;
        if (len > 2.4 || len < 1.2) {
          const np = other.position.clone().add(d.multiplyScalar(1.75 / len));
          np.y = KT.Highway.groundY(np.x, np.z).y;
          P.pos.copy(np); P.obj.position.copy(np);
        }
        P.heading = Math.atan2(other.position.x - P.pos.x, other.position.z - P.pos.z);
        P.obj.rotation.y = P.heading;
        other.rotation.y = Math.atan2(P.pos.x - other.position.x, P.pos.z - other.position.z);
      }
      box.classList.toggle('cinema', film);
      let sideSign = 0;
      let i = 0, shotT = 0, shot = null, mouth = 0, stop = null, raf = 0, last = performance.now(), auto = null;
      const speakerObj = () => { const w = lines[i][0]; return w === 'narrator' ? null : actorOf(w); };
      function makeShot() {
        if (!film) return null;
        const who = lines[i][0], A = headOf(P.obj);
        if (!other) {
          // the player alone (a call, the narrator): a close shot, then wider
          const f = new T.Vector3(Math.sin(P.heading), 0, Math.cos(P.heading));
          const sd = new T.Vector3(f.z, 0, -f.x);
          const wide = who === 'narrator' || i === 0;
          return { pos: A.clone().add(f.clone().multiplyScalar(wide ? 4.2 : 1.25)).add(sd.multiplyScalar(wide ? 1.6 : 0.35)).add(new T.Vector3(0, wide ? 0.9 : 0.05, 0)), look: A.clone().add(new T.Vector3(0, wide ? -0.3 : 0, 0)), fov: wide ? 45 : 32 };
        }
        const B = headOf(other), mid = A.clone().add(B).multiplyScalar(0.5);
        const ab = B.clone().sub(A); ab.y = 0; ab.normalize();
        // one side of the line between them, all scene long: the side the
        // wide shot can see from
        if (sideSign === 0) sideSign = clearShot(mid.clone().add(new T.Vector3(ab.z, 0, -ab.x).multiplyScalar(5.4)), mid) ? 1 : clearShot(mid.clone().add(new T.Vector3(-ab.z, 0, ab.x).multiplyScalar(5.4)), mid) ? -1 : 1;
        const side = new T.Vector3(ab.z, 0, -ab.x).multiplyScalar(sideSign);
        const S1 = who === 'player' ? A : who === 'narrator' ? null : B, L1 = who === 'player' ? B : A;
        const text = lines[i][1];
        let kind;
        if (i === 0 || !S1) kind = 'wide';
        else if (/[!?]\s*$/.test(text) || i % 4 === 2) kind = 'close';
        else if (i % 4 === 3) kind = 'two';
        else kind = 'ots';
        if (kind === 'wide') {
          // as wide as the walls allow
          for (const d of [5.4, 4.0, 2.8]) {
            const pos = mid.clone().add(side.clone().multiplyScalar(d)).add(ab.clone().multiplyScalar(-d * 0.22)).add(new T.Vector3(0, 0.2 + d * 0.17, 0));
            if (clearShot(pos, mid) || d === 2.8) return { pos, look: mid.clone().add(new T.Vector3(0, -0.35, 0)), fov: d > 3 ? 46 : 52 };
          }
        }
        if (kind === 'two') return { pos: mid.clone().add(side.clone().multiplyScalar(2.7)).add(new T.Vector3(0, 0.15, 0)), look: mid, fov: 40 };
        const toL = L1.clone().sub(S1); toL.y = 0; toL.normalize();
        if (kind === 'close') return { pos: S1.clone().add(toL.clone().multiplyScalar(1.15)).add(side.clone().multiplyScalar(0.28)).add(new T.Vector3(0, 0.02, 0)), look: S1.clone(), fov: 30 };
        // over the listener's shoulder at the speaker
        return { pos: L1.clone().add(toL.clone().multiplyScalar(0.7)).add(side.clone().multiplyScalar(0.48)).add(new T.Vector3(0, 0.14, 0)), look: S1.clone(), fov: 34 };
      }
      function frame() {
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        shotT += dt;
        mouth = Math.max(0, mouth - dt * 5.5);
        const sp = speakerObj();
        const open = mouth * (0.55 + 0.45 * Math.sin(now / 1000 * 24));
        [P.obj, other].forEach((o) => {
          if (!o) return;
          const talking = o === sp;
          o.userData.mouth = talking ? Math.max(0, open) : 0;
          KT.Models.animateCharacter(o, talking ? 'chat' : 'idle', dt, 1);
        });
        if (shot) {
          const k = Math.min(1, shotT / 5) * 0.06; // a slow push in
          cam.position.lerpVectors(shot.pos, shot.look, k);
          cam.lookAt(shot.look);
          if (cam.fov !== shot.fov) { cam.fov = shot.fov; cam.updateProjectionMatrix(); }
        }
        raf = requestAnimationFrame(frame);
      }
      const show = () => {
        const [who, text] = lines[i];
        const c = castOf(who);
        const url = who === 'narrator' ? '' : portrait(who);
        $('ss-portrait').src = url || '';
        $('ss-portrait').classList.toggle('hidden', !url || (film && !!speakerObj()));
        $('ss-name').textContent = who === 'narrator' ? '' : c.name;
        $('ss-role').textContent = who === 'narrator' ? '' : c.role || '';
        $('ss-text').textContent = text;
        box.classList.toggle('villain', who === 'collector' || who === 'agent');
        box.classList.toggle('narrator', who === 'narrator');
        $('ss-next').textContent = i < lines.length - 1 ? 'Next ▶' : (opts.last || 'Continue ▶');
        shot = makeShot(); shotT = 0;
        if (stop) stop();
        clearTimeout(auto);
        stop = speak(who, text, () => { mouth = 1; }, () => { auto = setTimeout(next, 900); });
      };
      const next = () => {
        clearTimeout(auto);
        if (stop) { stop(); stop = null; }
        i++;
        if (i < lines.length) return show();
        cancelAnimationFrame(raf);
        document.removeEventListener('keydown', key);
        [P.obj, other].forEach((o) => { if (o) o.userData.mouth = 0; });
        box.classList.add('hidden');
        box.classList.remove('cinema');
        if (cam.fov !== fov0) { cam.fov = fov0; cam.updateProjectionMatrix(); }
        KT.CameraRig.yaw = P.heading + Math.PI; KT.CameraRig.snap = true;
        release();
        resolve();
      };
      const key = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') { e.preventDefault(); next(); } };
      $('ss-next').onclick = next;
      $('ss-voice').textContent = S.voiceOn ? '\u{1F50A}' : '\u{1F507}';
      $('ss-voice').onclick = () => {
        S.voiceOn = !S.voiceOn;
        try { localStorage.setItem('kt-voices', S.voiceOn ? '1' : '0'); } catch (e) { /* ignore */ }
        $('ss-voice').textContent = S.voiceOn ? '\u{1F50A}' : '\u{1F507}';
        show();
      };
      document.addEventListener('keydown', key);
      box.classList.remove('hidden');
      raf = requestAnimationFrame(frame);
      show();
    });
  };
  // chapter title card / big message
  S.card = function (num, title, place, ms) {
    return new Promise((resolve) => {
      const el = $('story-card');
      $('sc-num').textContent = num || '';
      $('sc-title').textContent = title || '';
      $('sc-place').textContent = place || '';
      el.classList.remove('hidden');
      const inner = el.querySelector('.sc-inner');
      inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = '';
      inner.style.animationDuration = ((ms || 3200) / 1000) + 's';
      KT.Audio.play('mission');
      setTimeout(() => { el.classList.add('hidden'); resolve(); }, ms || 3200);
    });
  };

  // ------------------------------------------------------ mini-games
  // all three share one wooden panel (#story-game)
  function panel(title, hint) {
    $('sg-title').textContent = title;
    $('sg-hint').textContent = hint || '';
    $('sg-body').innerHTML = '';
    $('sg-foot').textContent = '';
    $('story-game').classList.remove('hidden');
    return $('sg-body');
  }
  function closePanel() { $('story-game').classList.add('hidden'); }

  // remember a sequence of symbols, then press them in the same order
  S.puzzle = function (s) {
    return new Promise((resolve) => {
      const release = hold();
      const icons = s.icons || D().SYMBOLS.map((x) => x.icon);
      const len = s.length || 4;
      let seq, pos;
      const body = panel(s.name || 'Puzzle', s.hint || 'Watch the symbols light up, then press them in the same order.');
      const grid = document.createElement('div');
      grid.className = 'sg-grid';
      const btns = icons.map((ic, k) => {
        const b = document.createElement('button');
        b.className = 'sg-tile'; b.textContent = ic; b.disabled = true;
        b.onclick = () => press(k);
        grid.appendChild(b);
        return b;
      });
      body.appendChild(grid);
      const flash = (k, cls) => { btns[k].classList.add(cls); setTimeout(() => btns[k].classList.remove(cls), 420); };
      async function round() {
        seq = []; pos = 0;
        for (let i = 0; i < len; i++) seq.push(Math.floor(Math.random() * icons.length));
        btns.forEach((b) => { b.disabled = true; });
        $('sg-foot').textContent = 'Watch...';
        await sleep(700);
        for (const k of seq) { flash(k, 'lit'); KT.Audio.play('click'); await sleep(650); }
        btns.forEach((b) => { b.disabled = false; });
        $('sg-foot').textContent = 'Your turn: ' + len + ' symbols.';
      }
      function press(k) {
        if (k === seq[pos]) {
          flash(k, 'ok'); pos++; KT.Audio.play('click');
          if (pos >= seq.length) {
            $('sg-foot').textContent = 'Solved!';
            KT.Audio.play('star');
            btns.forEach((b) => { b.disabled = true; });
            setTimeout(() => { closePanel(); release(); resolve(); }, 900);
          } else $('sg-foot').textContent = (seq.length - pos) + ' to go...';
        } else {
          flash(k, 'bad'); KT.Audio.play('land');
          $('sg-foot').textContent = 'Not quite. Watch again...';
          setTimeout(round, 900);
        }
      }
      round();
    });
  };
  // questions with three or four answers; a wrong answer explains and moves on
  S.quiz = function (s) {
    return new Promise((resolve) => {
      const release = hold();
      const qs = s.questions;
      let i = 0, right = 0;
      const need = s.pass === undefined ? qs.length - 1 : s.pass;
      function show() {
        const q = qs[i];
        const body = panel(s.name || 'Quiz', 'Question ' + (i + 1) + ' of ' + qs.length);
        const p = document.createElement('p'); p.className = 'sg-q'; p.textContent = q.q; body.appendChild(p);
        const list = document.createElement('div'); list.className = 'sg-answers';
        q.a.forEach((a, k) => {
          const b = document.createElement('button'); b.className = 'sg-answer'; b.textContent = a;
          b.onclick = () => {
            list.querySelectorAll('button').forEach((x) => { x.disabled = true; });
            const ok = k === q.c;
            b.classList.add(ok ? 'ok' : 'bad');
            list.children[q.c].classList.add('ok');
            if (ok) right++;
            KT.Audio.play(ok ? 'pickup' : 'land');
            $('sg-foot').textContent = (ok ? 'Correct! ' : 'Not quite. ') + (q.why || '');
            setTimeout(() => { i++; if (i < qs.length) show(); else finish(); }, ok ? 1100 : 2300);
          };
          list.appendChild(b);
        });
        body.appendChild(list);
      }
      function finish() {
        if (right >= need) { closePanel(); release(); KT.UI.toast('⭐ ' + right + ' of ' + qs.length + ' correct!', 'level'); resolve(); return; }
        const body = panel(s.name || 'Quiz', right + ' of ' + qs.length + ' correct. You need ' + need + '.');
        const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Try again';
        b.onclick = () => { i = 0; right = 0; show(); };
        body.appendChild(b);
      }
      show();
    });
  };
  // beats slide along a track; press Space (or tap) as each reaches the drum
  S.rhythm = function (s) {
    return new Promise((resolve) => {
      const release = hold();
      const total = s.beats || 16, need = s.need || Math.ceil(total * 0.7), bpm = s.bpm || 100;
      const body = panel(s.name || 'Rhythm', s.hint || 'Press Space (or tap the drum) as each beat reaches the drum.');
      body.innerHTML = '<div class="sg-track"><div class="sg-drum">' + (s.icon || '\u{1FA98}') + '</div></div><button class="sg-hit btn primary">' + (s.button || 'Beat!') + '</button>';
      const track = body.querySelector('.sg-track'), drum = body.querySelector('.sg-drum');
      const gap = 60 / bpm, travel = 2.2, t0 = performance.now() / 1000 + 1.2;
      const beats = [];
      for (let i = 0; i < total; i++) {
        const el = document.createElement('div'); el.className = 'sg-beat'; track.appendChild(el);
        beats.push({ t: t0 + i * gap * (i % 4 === 3 ? 1.5 : 1) + Math.floor(i / 4) * gap * 0.5, el, done: false });
      }
      let hits = 0, misses = 0, raf = 0, over = false;
      const W = () => track.clientWidth || 300;
      function frame() {
        if (over) return;
        const now = performance.now() / 1000;
        beats.forEach((b) => {
          if (b.done) return;
          const x = (b.t - now) / travel;
          b.el.style.left = (12 + x * (W() - 40)) + 'px';
          if (now - b.t > 0.18) { b.done = true; misses++; b.el.classList.add('miss'); }
        });
        $('sg-foot').textContent = 'Hits ' + hits + '  •  Need ' + need + ' of ' + total;
        if (beats.every((b) => b.done)) return end();
        raf = requestAnimationFrame(frame);
      }
      function hit(e) {
        if (e && e.type === 'keydown') { if (e.code !== 'Space' && e.key !== 'e' && e.key !== 'E') return; e.preventDefault(); }
        const now = performance.now() / 1000;
        const b = beats.find((x) => !x.done && Math.abs(x.t - now) < 0.16);
        drum.classList.remove('pulse'); void drum.offsetWidth; drum.classList.add('pulse');
        if (b) { b.done = true; hits++; b.el.classList.add('hit'); KT.Audio.play('step'); }
      }
      function end() {
        over = true; cancelAnimationFrame(raf);
        document.removeEventListener('keydown', hit);
        if (hits >= need) { $('sg-foot').textContent = 'Wonderful! ' + hits + ' of ' + total + '.'; KT.Audio.play('star'); setTimeout(() => { closePanel(); release(); resolve(); }, 1200); }
        else {
          $('sg-foot').textContent = hits + ' of ' + total + '. You need ' + need + '.';
          const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Try again';
          b.onclick = () => { closePanel(); release(); S.rhythm(s).then(resolve); };
          body.appendChild(b);
        }
      }
      body.querySelector('.sg-hit').onclick = () => hit();
      drum.onclick = () => hit();
      document.addEventListener('keydown', hit);
      raf = requestAnimationFrame(frame);
    });
  };

  // ------------------------------------------------------ world props
  function clearObjs(keepChars) {
    endDrive(false);
    S.objs.forEach((o) => { if (o.parent) o.parent.remove(o); });
    S.objs = [];
    if (S.runner && S.runner.parent) S.runner.parent.remove(S.runner);
    S.runner = null;
    if (!keepChars) {
      Object.values(S.chars).forEach((o) => { if (o.parent) o.parent.remove(o); });
      S.chars = {};
    }
  }
  const ground = (x, z) => KT.Highway.groundY(x, z).y;
  // the nearest open spot (not inside a wall, a building or a tree)
  const blocked = (x, z) => KT.Highway.isBlocked ? !!KT.Highway.isBlocked(x, z, 0.8) : false;
  function open(x, z) {
    if (!blocked(x, z)) return [x, z];
    for (let r = 1.5; r <= 18; r += 1.5) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + r;
        const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
        if (!blocked(nx, nz)) return [nx, nz];
      }
    }
    return [x, z];
  }
  // points between you and the sight, spread out sideways
  function spots(n, sg, spread, near) {
    const P = KT.Player.pos;
    const dx = sg.x - P.x, dz = sg.z - P.z, d = Math.max(1, Math.hypot(dx, dz));
    const fx = dx / d, fz = dz / d, sx = -fz, sz = fx;
    const reach = Math.max(10, Math.min(d - 4, d - sg.r * 0.35)) * (near || 1);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.8 : 0.3 + 0.65 * (i / (n - 1));
      const side = (i % 2 ? 1 : -1) * (spread || 7) * (0.6 + (i % 3) * 0.3);
      const [x, z] = open(P.x + fx * reach * t + sx * side, P.z + fz * reach * t + sz * side);
      out.push(new T.Vector3(x, ground(x, z), z));
    }
    return out;
  }
  const mats = {};
  const mat = (k, o) => mats[k] || (mats[k] = new T.MeshStandardMaterial(o));
  function glowRing(g, color, h) {
    const ring = new T.Mesh(new T.TorusGeometry(0.9, 0.06, 6, 28), mat('ring' + color, { color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06;
    g.add(ring);
    const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.6, h || 7, 12, 1, true), mat('beam' + color, { color, emissive: color, emissiveIntensity: 0.8, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false }));
    beam.position.y = (h || 7) / 2;
    g.add(beam);
  }
  // a little glowing marker: what it looks like depends on the item
  function makeItem(kind) {
    const g = new T.Group();
    const look = {
      clue: [0xf2e2b8, 'box', [0.55, 0.04, 0.42]], press: [0xff7a2a, 'box', [0.6, 0.6, 0.6]], photo: [0x7ad8ff, 'cam'], key: [0xffc61a, 'oct']
    }[kind] || [0xf2e2b8, 'box', [0.55, 0.04, 0.42]];
    let m;
    if (look[1] === 'cam') {
      m = new T.Group();
      m.add(new T.Mesh(new T.BoxGeometry(0.5, 0.32, 0.22), mat('cam', { color: 0x222222, roughness: 0.4 })));
      const lens = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.18, 14), mat('lens', { color: 0x4a7aaa, emissive: 0x1a4a7a, emissiveIntensity: 0.6 }));
      lens.rotation.x = Math.PI / 2; lens.position.z = 0.18; m.add(lens);
    } else if (look[1] === 'oct') m = new T.Mesh(new T.OctahedronGeometry(0.3), mat('key', { color: look[0], metalness: 0.7, roughness: 0.3, emissive: 0x5a3a08, emissiveIntensity: 0.5 }));
    else m = new T.Mesh(new T.BoxGeometry(...look[2]), mat('it' + kind, { color: look[0], emissive: look[0], emissiveIntensity: 0.25, roughness: 0.8 }));
    m.position.y = kind === 'press' ? 0.45 : 1.0;
    if (kind === 'clue') m.rotation.set(0.5, 0, 0.2);
    g.add(m);
    glowRing(g, kind === 'press' ? 0xff7a2a : kind === 'photo' ? 0x7ad8ff : 0xffc61a, kind === 'press' ? 4 : 7);
    g.userData.spin = m;
    return g;
  }
  function makeSymbol(sym) {
    const g = new T.Group();
    const gold = mat('symGold', { color: 0xd4a434, metalness: 0.8, roughness: 0.3, emissive: 0x5a3a08, emissiveIntensity: 0.4 });
    const med = new T.Group();
    med.position.y = 1.5;
    const disc = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 0.1, 28), gold);
    disc.rotation.x = Math.PI / 2;
    med.add(disc);
    const gem = new T.Mesh(new T.OctahedronGeometry(0.28), mat('gem' + sym.id, { color: sym.color, emissive: sym.color, emissiveIntensity: 0.9, roughness: 0.2 }));
    gem.position.z = 0.12;
    med.add(gem);
    g.add(med);
    const stand = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 0.9, 10), mat('symStone', { color: 0x8a8478, roughness: 0.9 }));
    stand.position.y = 0.45;
    g.add(stand);
    glowRing(g, sym.color, 9);
    g.userData.spin = med;
    return g;
  }
  function placeChar(who, at) {
    let o = S.chars[who];
    if (!o) { o = KT.Models.character(Object.assign({ lite: true }, castOf(who).cfg)); S.chars[who] = o; if (KT.HD) KT.HD.always(o); }
    o.position.copy(at);
    if (o.parent !== KT.Game.scene) KT.Game.scene.add(o);
    const P = KT.Player.pos;
    o.rotation.y = Math.atan2(P.x - at.x, P.z - at.z);
    return o;
  }
  function addItems(n, kind, sg, spread, near) {
    const cur = st().cur;
    spots(n, sg, spread, near).forEach((p, k) => {
      if ((cur.found || []).indexOf(k) >= 0) return;
      const o = makeItem(kind);
      o.position.copy(p);
      o.userData.item = kind; o.userData.idx = k;
      KT.Game.scene.add(o);
      S.objs.push(o);
    });
  }

  // ------------------------------------------------------- the runner
  S.startChapter = async function (i) {
    if (S.busy) return;
    const s = st();
    s.cur = { ch: i, step: 0, found: [] };
    KT.Game.data.mode = 'story';
    clearObjs();
    KT.Game.save(true);
    KT.Game.setState('playing');
    const c = D().CHAPTERS[i];
    await S.card('Chapter ' + String(c.n).padStart(2, '0'), c.title, c.place);
    run();
  };
  S.resume = function () { if (S.active()) { clearObjs(); run(); } };
  S.quitChapter = function () { const s = st(); if (s) s.cur = null; clearObjs(); S.timer = 0; refresh(); KT.Game.save(true); };

  async function ensureAt(name) {
    const sg = sightOf(name);
    if (!sg) return null;
    st().cur.at = name;
    const P = KT.Player.pos;
    if (KT.Game.level === 'highway' && Math.hypot(P.x - sg.x, P.z - sg.z) < sg.r + 90) return sg;
    await travelTo(sg);
    return sg;
  }
  // arrive on foot a little way in front of a sight, facing it
  async function travelTo(sg) {
    if (KT.Game.switching) await sleep(1500);
    if (sg.road) await KT.Game.fastTravel('sight:' + sg.id);
    else {
      const Hw = KT.Highway, side = Math.sign(sg.lat || 1);
      const lat = sg.lat - side * Math.min(Math.abs(sg.lat), sg.r + 10);
      const q = Hw.at(Hw.hubS(sg.hub) + sg.along - 6, lat);
      await KT.Game.goHighway({ spot: { x: q.x, z: q.z, heading: Math.atan2(sg.x - q.x, sg.z - q.z) }, quiet: true });
    }
    KT.UI.banner(sg.icon + ' ' + sg.name, chap().place, 'title');
  }
  S.travelTo = travelTo;
  S._next = () => next(); // for automated tests

  async function run() {
    if (!S.active()) return;
    S.busy = true;
    S.timer = 0;
    const s = step();
    refresh();
    if (!s) { S.busy = false; return finish(); }
    const cur = st().cur;
    try {
      const needsPlace = ['scene', 'message', 'puzzle', 'quiz', 'rhythm'].indexOf(s.type) < 0 || s.at;
      const sg = needsPlace ? await ensureAt(placeOf(s)) : null;
      switch (s.type) {
        case 'scene': await S.scene(s.lines); return next();
        case 'message': await S.card(s.kicker || '', s.text, s.sub || '', s.ms || 4200); return next();
        case 'puzzle': await S.puzzle(s); return next();
        case 'quiz': await S.quiz(s); return next();
        case 'rhythm': await S.rhythm(s); return next();
        case 'travel': return next();
        case 'tutorial':
          S.tut = { walk: false, run: false, jump: false, from: KT.Player.pos.clone() };
          KT.UI.toast('W A S D (or the left stick) to walk • Shift + W to run • Space to jump • move the mouse to look around.', 'info');
          break;
        case 'talk': {
          const near = spots(1, sg, 2)[0].lerp(KT.Player.pos, 0.82);
          placeChar(s.who, near);
          if (s.with) [].concat(s.with).forEach((w, k) => placeChar(w, near.clone().add(new T.Vector3(1.6 + k, 0, 1.2 - k))));
          break;
        }
        case 'find':
          if (s.spot === 'kovalamGallery') {
            // up on the lighthouse gallery (it exists once the beach is built)
            for (let k = 0; k < 40 && !KT.Lighthouse.kovalam; k++) await sleep(250);
            const g = KT.Lighthouse.kovalam;
            if (g) {
              const o = makeItem(s.look || 'clue');
              o.position.copy(g.gallery);
              o.userData.item = s.look || 'clue'; o.userData.idx = 0;
              KT.Game.scene.add(o);
              S.objs.push(o);
              break;
            }
          }
          addItems(s.count || 3, s.look || 'clue', sg, s.spread || 8);
          break;
        case 'press': addItems(s.count || 3, 'press', sg, s.spread || 8); break;
        case 'photo': addItems(s.count || 1, 'photo', sg, 6, 0.7); break;
        case 'symbol': {
          const o = makeSymbol(symbolOf(s.symbol));
          o.position.copy(spots(1, sg)[0]);
          o.userData.item = 'symbol';
          KT.Game.scene.add(o);
          S.objs.push(o);
          break;
        }
        case 'chase': startChase(s, sg); break;
        case 'drive': startDrive(s); break;
        case 'timed': {
          // the person (or place) to get to, a run away from here
          const P = KT.Player.pos, dist = s.distance || 70;
          const dx = sg.x - P.x, dz = sg.z - P.z, d = Math.max(1, Math.hypot(dx, dz));
          const ang = Math.atan2(dx, dz) + (s.turn || 0.9);
          const [x, z] = open(P.x + Math.sin(ang) * dist, P.z + Math.cos(ang) * dist);
          const at = new T.Vector3(x, ground(x, z), z);
          if (s.who) placeChar(s.who, at);
          else { const o = makeItem('key'); o.position.copy(at); o.userData.item = 'goal'; KT.Game.scene.add(o); S.objs.push(o); S.goal = o; }
          S.timer = s.time || 45;
          void d;
          break;
        }
        case 'reach': break;
        default: return next();
      }
    } catch (err) {
      console.error('story step failed', err);
    } finally { S.busy = false; }
    refresh();
    void cur;
  }
  function next() {
    const cur = st().cur;
    if (!cur) return;
    endDrive(true);
    cur.step++;
    cur.found = [];
    S.timer = 0;
    S.goal = null;
    S.objs.forEach((o) => { if (o.parent) o.parent.remove(o); });
    S.objs = [];
    if (S.runner && S.runner.parent) S.runner.parent.remove(S.runner);
    S.runner = null;
    KT.Game.save(true);
    S.busy = false;
    run();
  }
  function retry(msg) {
    endDrive(false);
    KT.UI.toast('⏱ ' + msg + ' Try again!', 'info');
    KT.Audio.play('land');
    S.objs.forEach((o) => { if (o.parent) o.parent.remove(o); });
    S.objs = [];
    if (S.runner && S.runner.parent) S.runner.parent.remove(S.runner);
    S.runner = null;
    run();
  }

  // ------------------------------------------------------------ chases
  function startChase(s, sg) {
    const P = KT.Player.pos;
    const dx = sg.x - P.x, dz = sg.z - P.z, d = Math.max(1, Math.hypot(dx, dz));
    const [x, z] = open(P.x + dx / d * 12, P.z + dz / d * 12);
    const o = KT.Models.character(Object.assign({ lite: true }, castOf(s.who || 'agent').cfg));
    o.position.set(x, ground(x, z), z);
    KT.Game.scene.add(o);
    S.runner = o;
    S.chase = { home: new T.Vector3(sg.x, 0, sg.z), r: Math.max(40, sg.r + 30), speed: s.speed || 5.9, wob: Math.random() * 6 };
    S.timer = s.time || 40;
    KT.UI.toast('\u{1F3C3} ' + (s.shout || 'After them!') + ' Hold Shift to run.', 'info');
  }
  function updateChase(dt, s) {
    const o = S.runner, c = S.chase, P = KT.Player.pos;
    if (!o) return;
    const dx = o.position.x - P.x, dz = o.position.z - P.z, d = Math.hypot(dx, dz);
    if (d < 2.4) {
      o.parent && o.parent.remove(o); S.runner = null; S.timer = 0;
      KT.Audio.play('mission');
      KT.UI.toast('\u{1F91A} ' + (s.caught || 'Caught!'), 'level');
      return next();
    }
    // flee from the player, curving to stay near the site; slow when far ahead
    let fx = dx / (d || 1), fz = dz / (d || 1);
    c.wob += dt;
    const turn = Math.sin(c.wob * 0.7) * 0.6;
    const cs = Math.cos(turn), sn = Math.sin(turn);
    [fx, fz] = [fx * cs - fz * sn, fx * sn + fz * cs];
    const hx = o.position.x - c.home.x, hz = o.position.z - c.home.z, hd = Math.hypot(hx, hz);
    if (hd > c.r) { const k = Math.min(1, (hd - c.r) / 20); fx -= hx / hd * k * 1.6; fz -= hz / hd * k * 1.6; }
    let fl = Math.hypot(fx, fz) || 1;
    const sp = c.speed * (d > 26 ? 0.55 : d < 8 ? 1.05 : 0.92);
    // steer round walls and buildings, so the player can always follow
    for (let k = 0; k < 8; k++) {
      const nx = o.position.x + fx / fl * 1.2, nz = o.position.z + fz / fl * 1.2;
      if (!blocked(nx, nz)) break;
      const a = (k % 2 ? -1 : 1) * (0.5 + Math.floor(k / 2) * 0.45), ca = Math.cos(a), sa = Math.sin(a);
      [fx, fz] = [fx * ca - fz * sa, fx * sa + fz * ca];
      fl = Math.hypot(fx, fz) || 1;
    }
    o.position.x += fx / fl * sp * dt;
    o.position.z += fz / fl * sp * dt;
    o.position.y = ground(o.position.x, o.position.z);
    o.rotation.y = Math.atan2(fx, fz);
    KT.Models.animateCharacter(o, 'run', dt, sp / 7);
  }

  // ------------------------------------------------- vehicle chases
  // You are put in a vehicle on the nearest road. 'chase': the agent's car
  // (or truck) speeds off along the road; stay right behind it to force it
  // to stop. 'escape': a pursuer follows you; reach the checkpoint first.
  function startDrive(s) {
    const Hw = KT.Highway, P = KT.Player, G = KT.Game, V = KT.Vehicle;
    if (P.mode === 'bus') P.leaveBus();
    const p = Hw.nearestRoad(P.pos.x, P.pos.z), R = p.road;
    const s0 = KT.clamp(p.s, 30, R.len - 30);
    const dir = R.len - s0 > s0 ? 1 : -1, lane = 1.9;
    const f0 = R.frame(s0), h0 = f0.heading + (dir < 0 ? Math.PI : 0);
    const at0 = R.at(s0, -dir * lane);
    if (G.ride) { V.remove(G.ride); G.ride = null; }
    const veh = V.create(G.scene, at0.x, at0.z, h0, s.vehicle || 'car');
    G.ride = veh;
    P.boardBus(veh);
    S.driveVeh = veh;
    const escape = s.mode === 'escape';
    const obj = s.target === 'lorry' && KT.Models.lorry ? KT.Models.lorry(0x6a5a3a) : KT.Models.car(s.color || 0x1c1c22, s.style || 'saloon');
    G.scene.add(obj);
    const d = S.drive = { R, dir, lane, s: s0 + dir * (escape ? -34 : 40), v: 0, obj, mode: escape ? 'escape' : 'chase', close: 0, base: s.speed || 16 };
    if (escape) {
      d.goalS = KT.clamp(s0 + dir * (s.distance || 420), 20, R.len - 20);
      const g = makeItem('key'), q = R.at(d.goalS, 0);
      g.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
      g.scale.setScalar(2.2);
      G.scene.add(g);
      d.goal = g;
    }
    placeCar(d);
    S.timer = s.time || 90;
    KT.UI.toast(escape ? '\u{1F699} Drive! Get to the checkpoint before they catch you. W/S to drive, A/D to steer.' : '\u{1F697} After them! W/S to drive, A/D to steer. Stay right behind them to force them to stop.', 'info');
  }
  function placeCar(d) {
    const f = d.R.frame(d.s), q = d.R.at(d.s, -d.dir * d.lane);
    d.obj.position.set(q.x, KT.Highway.groundY(q.x, q.z).y, q.z);
    d.obj.rotation.y = f.heading + (d.dir < 0 ? Math.PI : 0);
  }
  function updateDrive(dt, s) {
    const d = S.drive, P = KT.Player;
    if (!d) return;
    const me = (S.driveVeh && S.driveVeh.obj.position) || P.pos;
    const dist = Math.hypot(d.obj.position.x - me.x, d.obj.position.z - me.z);
    if (d.mode === 'chase') {
      // the agent keeps a lead: slower when far ahead, faster when you close in
      const want = dist > 110 ? d.base * 0.55 : dist < 18 ? d.base * 1.18 : d.base;
      d.v += (want - d.v) * Math.min(1, dt * 1.5);
      d.s += d.dir * d.v * dt;
      if (d.s > d.R.len - 15 || d.s < 15) { d.dir = -d.dir; d.s = KT.clamp(d.s, 15, d.R.len - 15); }
      placeCar(d);
      if (dist < 7) d.close += dt; else d.close = Math.max(0, d.close - dt * 0.5);
      if (d.close > 1.1) {
        KT.Audio.play('mission');
        KT.UI.toast('\u{1F6A8} ' + (s.caught || 'You forced them to stop!'), 'level');
        S.timer = 0;
        return next();
      }
      if (dist > 260) return retry(s.fail || 'They got away!');
    } else {
      // the pursuer follows along the road towards you
      const myS = d.R.project(me.x, me.z).s;
      const gap = (myS - d.s) * d.dir;
      const want = gap > 60 ? d.base * 1.25 : gap < 12 ? d.base * 0.95 : d.base;
      d.v += (want - d.v) * Math.min(1, dt * 1.5);
      d.s += d.dir * d.v * dt;
      placeCar(d);
      if (dist < 4.5) return retry(s.fail || 'The pursuer caught you!');
      const g = d.goal.position;
      if (Math.hypot(g.x - me.x, g.z - me.z) < 10 || (myS - d.goalS) * d.dir > 0) {
        KT.Audio.play('mission');
        KT.UI.toast('✔ ' + (s.made || 'You got away!'), 'level');
        S.timer = 0;
        return next();
      }
    }
  }
  function endDrive(keepVehicle) {
    const d = S.drive;
    if (d) {
      if (d.obj.parent) d.obj.parent.remove(d.obj);
      if (d.goal && d.goal.parent) d.goal.parent.remove(d.goal);
      S.drive = null;
    }
    const P = KT.Player, v = S.driveVeh;
    if (v) {
      if (P.mode === 'bus' && P.bus === v) P.leaveBus();
      if (!keepVehicle && KT.Game.ride === v) { KT.Vehicle.remove(v); KT.Game.ride = null; }
      S.driveVeh = null;
    }
  }

  async function finish() {
    const s = st(), c = chap(), i = s.cur.ch;
    const first = s.done.indexOf(i) < 0;
    if (first) s.done.push(i);
    s.cur = null;
    clearObjs();
    S.timer = 0;
    const G = KT.Game, rw = c.reward || {};
    if (first) {
      if (rw.badge && s.badges.indexOf(rw.badge) < 0) s.badges.push(rw.badge);
      s.points += rw.points || 0;
      G.addCoins(Math.round((rw.points || 100) / 2), true);
      G.addXP(rw.points || 200);
    }
    KT.Audio.play('mission');
    KT.UI.banner('Chapter ' + c.n + ' complete!', (rw.badge ? '\u{1F3C5} ' + rw.badge + '  •  ' : '') + '+' + (rw.points || 0) + ' travel points', 'mission');
    refresh();
    G.save(true);
    await sleep(3600);
    if (c.finale && first) await finale(c);
    S.openCampaign();
  }
  async function finale(c) {
    const s = st();
    s.title = 'Guardian of God’s Own Country';
    s.legendary = true;
    try { localStorage.setItem('kt-legendary', '1'); } catch (e) { /* private mode */ }
    s.points += c.finale.points || 0;
    KT.Game.addCoins(Math.round((c.finale.points || 0) / 2), true);
    KT.Game.save(true);
    KT.UI.hideHud && KT.UI.hideHud(true);
    await S.card('KERALA SAAVARI', 'The journey ends. The memories remain.', 'Campaign complete', 6000);
    await S.card('Title unlocked', s.title, '+' + (c.finale.points || 0) + ' bonus points • Legendary Explorer outfit', 5000);
  }

  // things to press E at
  S.interactables = function () {
    if (!S.active() || S.busy) return [];
    const s = step();
    if (!s) return [];
    if (s.type === 'talk' && S.chars[s.who]) {
      const o = S.chars[s.who];
      return [{ id: 'story-talk', label: 'Talk to ' + castOf(s.who).name, radius: 3.2, pos: () => o.position,
        action: async () => { if (S.busy) return; S.busy = true; o.rotation.y = Math.atan2(KT.Player.pos.x - o.position.x, KT.Player.pos.z - o.position.z); await S.scene(s.lines); next(); } }];
    }
    if (s.type === 'press' || s.type === 'photo') {
      return S.objs.filter((o) => o.parent && (o.userData.item === 'press' || o.userData.item === 'photo')).map((o) => ({
        id: 'story-' + s.type + o.userData.idx, label: s.verb || (s.type === 'photo' ? '\u{1F4F7} Take the photo' : 'Use'), radius: 2.8, pos: () => o.position,
        action: () => {
          const cur = st().cur;
          o.parent && o.parent.remove(o);
          cur.found = (cur.found || []).concat([o.userData.idx]);
          if (s.type === 'photo') { flashScreen(); KT.Audio.play('shutter'); } else KT.Audio.play('pickup');
          KT.FX.puff(o.position, 8, 0.8);
          const left = (s.count || 1) - cur.found.length;
          if (s.done) KT.UI.toast(s.done + (left > 0 ? ' ' + left + ' left.' : ''), 'eco');
          refresh();
          if (left <= 0) next();
        } }));
    }
    if (s.type === 'symbol') {
      const o = S.objs.find((x) => x.userData.item === 'symbol');
      if (!o) return [];
      const sym = symbolOf(s.symbol);
      return [{ id: 'story-symbol', label: 'Take the symbol of ' + sym.name, radius: 3, pos: () => o.position,
        action: () => {
          if (S.busy) return;
          const d = st();
          if (d.symbols.indexOf(sym.id) < 0) d.symbols.push(sym.id);
          KT.Audio.play('star');
          KT.UI.banner(sym.icon + ' Symbol of ' + sym.name, 'Symbol ' + d.symbols.length + ' of 7 of the Heart of Kerala', 'star');
          KT.FX.puff(o.position, 14, 1.4);
          next();
        } }];
    }
    return [];
  };
  function flashScreen() {
    const f = $('story-flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  function tutorialText() {
    const t = S.tut || {};
    const c = (b, txt) => (b ? '✔ ' : '○ ') + txt;
    return [c(t.walk, 'Walk (W A S D)'), c(t.run, 'Run (Shift + W)'), c(t.jump, 'Jump (Space)')].join('   ');
  }

  // ------------------------------------------------------ every frame
  let tt = 0, uiT = 0;
  S.update = function (dt) {
    tt += dt;
    Object.values(S.chars).forEach((o) => { if (o.parent) KT.Models.animateCharacter(o, 'idle', dt, 1); });
    S.objs.forEach((o) => {
      if (o.userData.spin) o.userData.spin.rotation.y += dt * 1.6;
      if (o.userData.item === 'symbol' && o.userData.spin) o.userData.spin.position.y = 1.5 + Math.sin(tt * 2) * 0.12;
    });
    if (!S.active() || S.busy || KT.Game.level !== 'highway' || KT.Game.state !== 'playing') return;
    const s = step(), P = KT.Player;
    if (!s) return;
    if (S.timer > 0) {
      S.timer -= dt;
      if ((uiT += dt) > 0.5) { uiT = 0; refresh(); }
      if (S.timer <= 0) { S.timer = 0; return retry(s.fail || 'Out of time!'); }
    }
    switch (s.type) {
      case 'tutorial': {
        const t = S.tut;
        let changed = false;
        if (!t.walk && P.pos.distanceTo(t.from) > 6) { t.walk = true; changed = true; }
        if (!t.run && P.speed > 5) { t.run = true; changed = true; }
        if (!t.jump && !P.grounded && P.vy > 1) { t.jump = true; changed = true; }
        if (changed) { KT.Audio.play('pickup'); refresh(); }
        if (t.walk && t.run && t.jump) { KT.UI.toast('✔ You are ready to explore!', 'level'); next(); }
        break;
      }
      case 'find': {
        const cur = st().cur;
        S.objs.forEach((o) => {
          if (o.userData.item !== (s.look || 'clue') || !o.parent) return;
          if (Math.hypot(o.position.x - P.pos.x, o.position.z - P.pos.z) < 2.6 && Math.abs(o.position.y - P.pos.y) < 3.5) {
            o.parent.remove(o);
            cur.found = (cur.found || []).concat([o.userData.idx]);
            KT.Audio.play('pickup');
            KT.FX.puff(o.position, 8, 0.8);
            const left = (s.count || 3) - cur.found.length;
            KT.UI.toast('\u{1F50E} Found ' + (s.item || 'a clue') + '! ' + (left > 0 ? left + ' left.' : 'That is all of them.'), 'eco');
            refresh();
            if (left <= 0) next();
          }
        });
        break;
      }
      case 'chase': updateChase(dt, s); break;
      case 'drive': updateDrive(dt, s); break;
      case 'timed': {
        const goal = s.who ? S.chars[s.who] : S.goal;
        if (goal && Math.hypot(goal.position.x - P.pos.x, goal.position.z - P.pos.z) < 3) {
          if (s.who && S.chars[s.who]) S.chars[s.who].rotation.y = Math.atan2(P.pos.x - goal.position.x, P.pos.z - goal.position.z);
          KT.UI.toast('✔ ' + (s.made || 'Made it in time!'), 'level');
          S.timer = 0;
          next();
        }
        break;
      }
      case 'reach': {
        const sg = sightOf(placeOf(s));
        // (at its edge is enough: some sights are on the water)
        if (sg && Math.hypot(sg.x - P.pos.x, sg.z - P.pos.z) < Math.max(12, sg.r + 4)) next();
        break;
      }
      default: break;
    }
  };

  // ------------------------------------------------- campaign screen
  S.openCampaign = function () {
    const s = st();
    if (!s) return;
    const C = D().CHAPTERS, sy = D().SYMBOLS;
    $('camp-symbols').innerHTML = '';
    sy.forEach((x) => {
      const got = s.symbols.indexOf(x.id) >= 0;
      const el = document.createElement('div');
      el.className = 'camp-symbol' + (got ? ' got' : '');
      el.innerHTML = '<span class="ic"></span><span class="nm"></span>';
      el.querySelector('.ic').textContent = got ? x.icon : '❓';
      el.querySelector('.nm').textContent = x.name;
      el.title = got ? 'Symbol of ' + x.name : 'Not found yet';
      $('camp-symbols').appendChild(el);
    });
    $('camp-count').textContent = s.done.length + ' of ' + C.length + ' chapters • ' + s.symbols.length + ' of 7 symbols • ' + s.points + ' travel points' + (s.title ? ' • ' + s.title : '');
    $('camp-badges').textContent = s.badges.length ? '\u{1F3C5} ' + s.badges.join('  •  ') : '';
    const list = $('camp-chapters');
    list.innerHTML = '';
    C.forEach((c, i) => {
      const done = s.done.indexOf(i) >= 0, open = S.unlocked(i), now = s.cur && s.cur.ch === i;
      const row = document.createElement('button');
      row.className = 'camp-ch' + (done ? ' done' : '') + (open ? '' : ' locked') + (now ? ' now' : '');
      row.disabled = !open;
      const sym = c.symbol ? symbolOf(c.symbol) : null;
      row.innerHTML = '<span class="num"></span><span class="txt"><b></b><small></small></span><span class="sym"></span><span class="state"></span>';
      row.querySelector('.num').textContent = String(c.n).padStart(2, '0');
      row.querySelector('b').textContent = c.title;
      row.querySelector('small').textContent = c.place + ' • ~' + c.minutes + ' min';
      row.querySelector('.sym').textContent = sym ? (s.symbols.indexOf(sym.id) >= 0 ? sym.icon : '✨') : '';
      row.querySelector('.sym').title = sym ? 'Symbol of ' + sym.name : '';
      row.querySelector('.state').textContent = now ? 'Resume ▶' : done ? '✔ Replay' : open ? 'Play ▶' : '\u{1F512}';
      row.onclick = () => {
        if (!open) return;
        closeCampaign();
        if (now) { KT.Game.setState('playing'); if (!S.busy && !S.objs.length && !Object.keys(S.chars).length) S.resume(); return; }
        if (s.cur && !window.confirm('Leave chapter ' + (s.cur.ch + 1) + ' and start this one?')) { KT.Game.setState('playing'); return; }
        S.startChapter(i);
      };
      list.appendChild(row);
    });
    KT.Game.setState('campaign');
  };
  function closeCampaign() { $('campaign').classList.add('hidden'); }
  S.readJournal = function () {
    closeCampaign();
    S.scene(D().PLOT.map((p) => ['narrator', p]), { last: 'Close ✕' }).then(() => S.openCampaign());
  };

  S.bindUI = function () {
    $('camp-close').onclick = () => { closeCampaign(); KT.Game.setState('playing'); };
    $('camp-journal').onclick = S.readJournal;
    $('camp-free').onclick = () => {
      closeCampaign();
      if (st().cur) S.quitChapter();
      KT.Game.data.mode = 'free';
      KT.Game.setState('playing');
      refresh();
      KT.UI.toast('Free roam: explore Kerala at your own pace. Press K (or \u{1F4D6}) to return to the story.', 'info');
      KT.Game.save(true);
    };
    $('btn-story').onclick = () => { if (KT.Game.state === 'playing') { if (KT.Game.data.mode !== 'story') KT.Game.data.mode = 'story'; S.openCampaign(); } };
  };
  // the Legendary Explorer outfit, earned by finishing the campaign
  S.legendary = function () { try { return localStorage.getItem('kt-legendary') === '1'; } catch (e) { return false; } };

  // a new story: the plot first, then the campaign map
  S.begin = function () {
    const s = st();
    if (s.cur) { setTimeout(() => S.resume(), 1200); return; }
    if (!s.done.length && !s.seenPlot) {
      s.seenPlot = true;
      setTimeout(() => S.scene(D().PLOT.map((p) => ['narrator', p]), { last: 'Begin ▶' }).then(() => S.openCampaign()), 900);
    } else setTimeout(() => S.openCampaign(), 900);
  };
})();
