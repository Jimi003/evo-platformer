'use strict';
const W = 960, H = 540, G = 1500, RW = 1280, RH = 720;
const wx = x => x / 40, wy = y => (540 - y) / 40;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Renderer, luči, kamera ----------
const glc = document.getElementById('gl'), uic = document.getElementById('ui');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(RW, RH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
uic.width = RW; uic.height = RH;
const ui = uic.getContext('2d');
ui.setTransform(RW / W, 0, 0, RH / H, 0, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, RW / RH, 0.1, 160);
scene.add(new THREE.HemisphereLight('#c8d4ff', '#4a3a5a', 0.6));
const sun = new THREE.DirectionalLight('#fff0d8', 0.8);
sun.position.set(-4, 18, 14);
sun.target.position.set(12, 4, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight('#7aa8ff', 0.55);
rim.position.set(10, 8, -14);
scene.add(rim);

const THEMES = [
  { sky: ['#16224a', '#8a5fd0'], fog: '#4a3a8a', ground: '#3a3254', top: '#6fcf6a', far: '#2c2a66', tree: '#2f7a68', glow: '#ffd86b' },
  { sky: ['#0b2a2a', '#3f9a7a'], fog: '#2a6a5a', ground: '#2f4a3a', top: '#9be15d', far: '#164a44', tree: '#2f8a4a', glow: '#c6ff7a' },
  { sky: ['#2a0f14', '#e0603a'], fog: '#8a3a2a', ground: '#4a2a2a', top: '#e08a3a', far: '#4a1a1a', tree: '#7a2a2a', glow: '#ff9a4a' },
  { sky: ['#2a4a7a', '#d8ecff'], fog: '#9ab8e0', ground: '#56688a', top: '#e8f4ff', far: '#6a86b8', tree: '#8ab0c8', glow: '#ffffff' },
  { sky: ['#10061f', '#5a1a7a'], fog: '#3a1a5a', ground: '#2e2244', top: '#b455d6', far: '#241044', tree: '#5a2a8a', glow: '#e29bff' },
];
let roomGroup = null, roomMats = [], fireflies = [], skyTex = null;
function skyTexture(a, b) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  return new THREE.CanvasTexture(c);
}
function buildRoomScene() {
  if (roomGroup) { scene.remove(roomGroup); roomMats.forEach(m => m.dispose()); if (skyTex) skyTex.dispose(); }
  roomMats = []; fireflies = [];
  const th = THEMES[(room - 1) % THEMES.length];
  const M = (c, o) => { const m = stdMat(c, o); roomMats.push(m); return m; };
  roomGroup = new THREE.Group(); scene.add(roomGroup);
  skyTex = skyTexture(th.sky[0], th.sky[1]); scene.background = skyTex;
  scene.fog = new THREE.Fog(th.fog, 30, 85);
  const groundM = M(th.ground), topM = M(th.top), rockM = M(th.ground), farM = M(th.far), treeM = M(th.tree), trunkM = M('#3a2a2a');
  const glowM = glowMat(th.glow, 0.9); roomMats.push(glowM);
  const crystalM = glowMat(th.glow, 0.7); roomMats.push(crystalM);

  platforms.forEach((p, i) => {
    const ground = i === 0, w = ground ? 46 : p.w / 40, h = p.h / 40, d = ground ? 10 : 3;
    const cx = ground ? 12 : (p.x + p.w / 2) / 40, top = wy(p.y);
    mk(roomGroup, GEO.box, groundM, [cx, top - h / 2, 0], [w, h, d]).receiveShadow = true;
    const strip = mk(roomGroup, GEO.box, ground ? M(th.ground) : topM, [cx, top - 0.09, 0], [w + 0.06, 0.2, d + 0.06]); strip.receiveShadow = true;
    if (!ground) {
      const under = mk(roomGroup, GEO.cone, rockM, [cx, top - h - 0.45, 0], [w * 0.38, 1.0, 1.3], [Math.PI, 0, 0]);
      under.castShadow = false;
    }
    const n = ground ? 14 : Math.max(1, Math.round(w / 1.8));
    for (let k = 0; k < n; k++) {
      const x = ground ? rand(-4, 28) : cx + rand(-w / 2 + 0.2, w / 2 - 0.2), z = ground ? rand(-4.5, -1.2) : rand(-1.2, 1.2);
      const r = Math.random();
      if (r < 0.45) spike(roomGroup, topM, [x, top, z], 0.07, rand(0.2, 0.45), [rand(-.3, .3), 0, rand(-.3, .3)]);
      else if (r < 0.75) mk(roomGroup, GEO.sph, rockM, [x, top + 0.1, z], [rand(.12, .3), rand(.1, .22), rand(.12, .3)]);
      else spike(roomGroup, crystalM, [x, top, z], 0.1, rand(0.35, 0.8), [rand(-.25, .25), rand(0, 3), rand(-.25, .25)]).traverse(o => { o.castShadow = false; });
    }
  });
  for (let i = 0; i < 10; i++) {
    const r = rand(6, 12), h = rand(10, 20);
    mk(roomGroup, GEO.cone, farM, [-8 + i * 5 + rand(-1, 1), h / 2 - 3, rand(-48, -38)], [r, h, r]).castShadow = false;
  }
  for (let i = 0; i < 24; i++) {
    const x = rand(-8, 32), z = rand(-22, -7), s = rand(0.8, 1.6);
    mk(roomGroup, GEO.cyl, trunkM, [x, 1 + 0.6 * s, z], [0.18 * s, 1.2 * s, 0.18 * s]).castShadow = false;
    for (let k = 0; k < 3; k++) mk(roomGroup, GEO.cone, treeM, [x, 1.7 * s + k * 0.8 * s, z], [(1.1 - k * 0.25) * s, 1.4 * s, (1.1 - k * 0.25) * s]).castShadow = false;
  }
  const moon = mk(roomGroup, GEO.sph, glowM, [22, 15, -70], [4, 4, 4]); moon.castShadow = false;
  const haloM = new THREE.MeshBasicMaterial({ color: th.glow, transparent: true, opacity: 0.12, depthWrite: false }); roomMats.push(haloM);
  mk(roomGroup, GEO.sph, haloM, [22, 15, -70.5], [9, 9, 1]).castShadow = false;
  const shaftM = new THREE.MeshBasicMaterial({ color: th.glow, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide }); roomMats.push(shaftM);
  for (let i = 0; i < 5; i++) { const s = mk(roomGroup, GEO.cone, shaftM, [rand(0, 24), 9, rand(-10, -4)], [rand(1.5, 3), 20, 1.5], [0, 0, rand(-0.2, 0.2)]); s.rotation.x = Math.PI; s.castShadow = false; }
  const capM = glowMat(th.glow, 0.8); roomMats.push(capM);
  for (let i = 0; i < 14; i++) {
    const x = rand(-3, 27), z = rand(-5, -1.5), h = rand(0.15, 0.4);
    mk(roomGroup, GEO.cyl, trunkM, [x, 1 + h / 2, z], [0.03, h, 0.03]).castShadow = false;
    mk(roomGroup, GEO.sph, capM, [x, 1 + h, z], [h * 0.6, h * 0.35, h * 0.6]).castShadow = false;
  }
  for (let i = 0; i < 34; i++) {
    const f = mk(roomGroup, GEO.sph, glowM, [rand(-2, 26), rand(1.5, 11), rand(-6, 3)], [0.05, 0.05, 0.05]);
    f.castShadow = false; f.userData = { bx: f.position.x, by: f.position.y, ph: rand(0, 6) };
    fireflies.push(f);
  }
}

// ---------- Delci in obrazi ----------
let particles = [];
const partMats = {};
function burst(x, y, color, n = 8) {
  if (!partMats[color]) partMats[color] = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n && particles.length < 350; i++) {
    const m = new THREE.Mesh(GEO.box, partMats[color]);
    m.scale.setScalar(rand(0.06, 0.15));
    m.position.set(wx(x), wy(y), rand(-0.3, 0.5));
    scene.add(m);
    particles.push({ m, vx: rand(-4, 4), vy: rand(0.5, 6.5), life: rand(0.4, 0.8) });
  }
}
const slash = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 20, 1, -0.9, 1.8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
slash.visible = false; scene.add(slash);
const disposeObj = o => o.traverse(c => {
  if (c.material) c.material.dispose();
  if (c.geometry && !Object.values(GEO).includes(c.geometry)) c.geometry.dispose();
});

// ---------- Vhod ----------
const keys = {}, pressed = {};
addEventListener('keydown', e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
const down = (...c) => c.some(k => keys[k]), hit = (...c) => c.some(k => pressed[k]);

// ---------- Stanje igre ----------
let owned = new Set(), extras = { g_hp: 0, g_dmg: 0, g_spd: 0 }, stats = computeStats(owned, extras);
let run = { revived: false }, points = 0;
let room = 0, mode = 'play', platforms = [], enemies = [], shots = [], pshots = [], player = null;
let shake = 0, hitstop = 0, toastT = 0, toastText = '', choice = null, queue = [], choiceCool = 0, mouse = { x: -1, y: -1 };

function newPlayer() {
  return { x: 80, y: 400, w: 28, h: 36, vx: 0, vy: 0, face: 1, hp: stats.maxHp, ground: false, coyote: 0, buffer: 0,
    jumps: 0, atkT: 0, atkCd: 0, spitCd: 0, dashT: 0, dashCd: 0, inv: 0, hurtT: 0, shield: stats.shield,
    atkHit: new Set(), dashHit: new Set(), phase: 0, acd: {}, haste: 0, bastion: 0, meteor: false, meteorUp: 0, breathT: 0 };
}
function spawnEnemy(kind, x, y) {
  const sz = { walker: [30, 28], hopper: [26, 26], spitter: [26, 32], armored: [40, 36], boss: [56, 64] }[kind];
  const hp = kind === 'boss' ? 18 + room * 2 : { walker: 2, hopper: 2, spitter: 2, armored: 5 }[kind] + Math.floor(room / 2);
  const e = { kind, x, y, w: sz[0], h: sz[1], vx: 0, vy: 0, hp, maxHp: hp, dir: -1, face: -1, turnT: 0, ground: false,
    flash: 0, kb: 0, t: Math.random() * 2, shootT: 1 + Math.random() * 2, poisT: 0, poisDps: 0, burnT: 0, burnDps: 0, stunT: 0, rot: Math.PI + 0.35, ph: 0 };
  enemies.push(e);
  return e;
}
function clearObjects() {
  for (const e of enemies) removeRig(e);
  enemies = [];
  for (const b of shots.concat(pshots)) removeObj(b);
  shots = []; pshots = [];
}
function removeRig(e) { if (e.rig) { scene.remove(e.rig.root); disposeObj(e.rig.root); e.rig = null; } }
function removeObj(b) { if (b.obj) { scene.remove(b.obj); disposeObj(b.obj); b.obj = null; } }

function startRoom() {
  room++;
  clearObjects();
  platforms = [{ x: 0, y: 500, w: W, h: 40 }];
  let prev = { x: 300 + rand(-100, 200), w: 160 };
  [425, 350, 275].forEach((y, tier) => {
    const n = tier === 0 ? 2 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const w = rand(120, 210), x = clamp((i === 0 ? prev.x : rand(80, 760)) + rand(-130, 130), 30, W - w - 30);
      platforms.push({ x, y, w, h: 16 });
      if (i === 0) prev = { x, w };
    }
  });
  const isBoss = room % 5 === 0;
  if (isBoss) spawnEnemy('boss', 780, 300);
  const count = isBoss ? 2 : 2 + room;
  for (let i = 0; i < count; i++) {
    const kinds = ['walker'];
    if (room >= 2) kinds.push('hopper', 'spitter');
    if (room >= 3) kinds.push('armored');
    const kind = room === 3 && i === 0 ? 'armored' : room === 2 && i === 0 ? 'spitter' : kinds[Math.floor(Math.random() * kinds.length)];
    spawnEnemy(kind, rand(400, 900), 300);
  }
  const keep = player ? player.hp : stats.maxHp;
  player = newPlayer();
  player.hp = Math.min(stats.maxHp, keep + 1);
  mode = 'play';
  Snd.setMood(room, isBoss);
  buildRoomScene();
  setPlayerModel(owned);
}

// ---------- Fizika ----------
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function moveBody(b, dt) {
  b.x += b.vx * dt;
  for (const p of platforms) if (p.h > 20 && overlap(b, p)) { b.x = b.vx > 0 ? p.x - b.w : p.x + p.w; b.vx = 0; }
  b.x = Math.max(0, Math.min(W - b.w, b.x));
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt; b.ground = false;
  for (const p of platforms) {
    if (!overlap(b, p)) continue;
    const solid = p.h > 20;
    if (b.vy >= 0 && (prevBottom <= p.y + 4 || (solid && prevBottom <= p.y + 12))) { b.y = p.y - b.h; b.vy = 0; b.ground = true; }
    else if (solid && b.vy < 0) { b.y = p.y + p.h; b.vy = 0; }
  }
}
function poison(e) {
  if (stats.poison) { e.poisT = stats.poisonDur; e.poisDps = stats.poison; }
  ignite(e);
}
function ignite(e) { if (stats.burn) { e.burnT = stats.burnDur; e.burnDps = stats.burn; } }
const rings = [];
function ring(x, y, color, size, dur = 0.45) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(wx(x), wy(y), 0.4); scene.add(m);
  rings.push({ m, size: size / 40, t: 0, dur });
}
function flames(x, y, dir, n) {
  for (let i = 0; i < n; i++) {
    const c = ['#ff8a2a', '#ffd23a', '#ff4a1a'][i % 3];
    burst(x, y, c, 1);
    const q = particles[particles.length - 1];
    if (q) { q.vx = dir * rand(3, 9); q.vy = rand(-0.5, 1.5); q.life = rand(0.25, 0.5); }
  }
}
function useActive(id, slot) {
  const p = player, s = stats, a = TRAIT_BY_ID[id].active, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  p.acd[id] = a.cd;
  Snd.play(id === 'roar' || id === 'gale' || id === 'bastion' || id === 'quills' || id === 'miasma' || id === 'epidemic' || id === 'breath' ? id : 'dash');
  if (id === 'roar') {
    ring(cx, cy, a.color, 260); shake = 10; hitstop = 0.05;
    for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 260) { e.stunT = e.kind === 'boss' ? 1 : 2.2; e.hp -= 1; e.flash = 0.1; e.vx = Math.sign(e.x - p.x || 1) * 320; e.kb = 0.3; e.vy = -200; }
  } else if (id === 'gale') { p.haste = 3; ring(cx, cy, a.color, 120); burst(cx, cy, a.color, 16); }
  else if (id === 'meteor') { p.meteor = true; p.meteorUp = p.ground ? 0.18 : 0; p.inv = Math.max(p.inv, 0.3); }
  else if (id === 'bastion') { p.inv = 2.5; p.bastion = 2.5; ring(cx, cy, a.color, 90, 0.6); burst(cx, cy, a.color, 14); }
  else if (id === 'quills') {
    for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2; pshots.push({ x: cx, y: cy, vx: Math.cos(ang) * 480, vy: Math.sin(ang) * 480, dmg: 1.3, quill: true }); }
    ring(cx, cy, a.color, 70, 0.3);
  } else if (id === 'miasma') {
    ring(cx, cy, a.color, 300, 0.6); shake = 5; burst(cx, cy, '#c24ff0', 30);
    for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 300) { e.poisT = Math.max(e.poisT, 5); e.poisDps = Math.max(e.poisDps, (s.poison || 1) * 2); e.hp -= 1; e.flash = 0.1; }
  } else if (id === 'epidemic') {
    ring(cx, cy, a.color, 700, 0.8); shake = 6;
    for (const e of enemies) { e.poisT = 7; e.poisDps = Math.max(s.poison, 1) * 1.5; e.flash = 0.1; burst(e.x + e.w / 2, e.y, '#9be15d', 6); }
  } else if (id === 'breath') {
    p.breathT = 0.35; shake = 3;
    for (const e of enemies) {
      const dx = (e.x + e.w / 2 - cx) * p.face;
      if (dx > -10 && dx < 250 && Math.abs(e.y + e.h / 2 - cy) < 80) { ignite(e); e.burnT = Math.max(e.burnT, 3); e.burnDps = Math.max(e.burnDps, 1.5); e.hp -= 1.5 + s.dmg * 0.5; e.flash = 0.1; e.vx = p.face * 120; e.kb = 0.15; }
    }
  }
}
function blast(x, y, r, dmg, color) {
  Snd.play('blast');
  ring(x, y, color, r * 1.1, 0.5); shake = 14; hitstop = 0.07; burst(x, y, color, 36); burst(x, y, '#ffffff', 10);
  for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < r) { e.hp -= dmg; e.flash = 0.12; e.vy = -380; e.kb = 0.3; e.vx = Math.sign(e.x - x || 1) * 220; poison(e); }
}
function toast(t, sec = 2) { toastText = t; toastT = sec; }
function die() {
  toast('Poginil si – evolucija se začne znova', 2.5); Snd.play('die');
  owned = new Set(); extras = { g_hp: 0, g_dmg: 0, g_spd: 0 }; stats = computeStats(owned, extras);
  run.revived = false; room = 0; player = null;
  startRoom();
}
function hurtPlayer(from, dmg = 1) {
  const p = player;
  if (p.inv > 0) return;
  if (p.shield) { p.shield = false; p.inv = 0.6; Snd.play('bastion'); burst(p.x + 14, p.y + 18, '#9be15d', 12); return; }
  Snd.play('hurt');
  p.hp -= dmg; p.inv = stats.invTime; p.hurtT = 0.2; hitstop = 0.06;
  p.vx = (p.x < from.x ? -1 : 1) * 260; p.vy = -260; shake = 6; burst(p.x + 14, p.y + 18, '#ffffff');
  if (p.hp <= 0) {
    if (stats.revive && !run.revived) {
      run.revived = true; p.hp = Math.ceil(stats.maxHp / 2); p.inv = 2; burst(p.x + 14, p.y + 18, '#ffd54f', 30); toast('Nesmrtnik: vstal si!', 1.5); Snd.play('revive');
    } else die();
  }
}

// ---------- Posodobitev ----------
function updatePlay(dt) {
  const p = player, s = stats;
  p.inv -= dt; p.hurtT -= dt; p.atkCd -= dt; p.atkT -= dt; p.dashCd -= dt; p.dashT -= dt; p.spitCd -= dt;
  p.haste -= dt; p.bastion -= dt; p.breathT -= dt;
  for (const id in p.acd) p.acd[id] -= dt;
  const spd = s.speed * (p.haste > 0 ? 1.5 : 1);
  if (p.haste > 0 && Math.random() < dt * 30) burst(p.x + 14, p.y + 30, '#7fd8ff', 1);
  if (s.regen) p.hp = Math.min(s.maxHp, p.hp + s.regen * dt);
  const dir = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
  if (dir) p.face = dir;
  s.actives.forEach((id, i) => {
    if (hit(ACTIVE_KEYS[i]) && (p.acd[id] || 0) <= 0) {
      if (id === 'breath') p.acd[id] = 0;
      useActive(id, i);
      if (id === 'breath') p.acd[id] = s.breathCd;
    }
  });
  if (p.breathT > 0) flames(p.x + 14 + p.face * 18, p.y + 16, p.face, 4);
  if (p.meteor) { p.vx *= 0.9; p.vy = p.meteorUp > 0 ? -460 : 1300; p.meteorUp -= dt; if (Math.random() < 0.7) burst(p.x + 14, p.y + 10, '#ffb347', 1); }
  else if (p.dashT > 0) { p.vx = p.face * 620; p.vy = 0; }
  else {
    const target = dir * spd, accel = p.ground ? 2600 : 1800;
    p.vx += Math.max(-accel * dt, Math.min(accel * dt, target - p.vx));
    const gliding = s.glide && !p.ground && p.vy > 0 && down('Space', 'KeyW', 'ArrowUp');
    p.vy = Math.min(p.vy + (gliding ? 250 : G) * dt, gliding ? s.glideFall : 900);
    p.gliding = gliding;
  }
  p.coyote = p.ground ? 0.1 : p.coyote - dt; p.buffer -= dt;
  if (p.ground) p.jumps = 0;
  if (hit('Space', 'KeyW', 'ArrowUp')) p.buffer = 0.12;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = -s.jump; p.buffer = 0; p.coyote = 0; Snd.play('jump'); }
  else if (p.buffer > 0 && p.jumps < s.airJumps) { p.vy = -s.jump * 0.9; p.jumps++; p.buffer = 0; Snd.play('air'); burst(p.x + 14, p.y + 36, '#4fc3f7', 6); }
  if (!down('Space', 'KeyW', 'ArrowUp') && p.vy < -200 && p.dashT <= 0 && !p.meteor) p.vy += 3000 * dt;
  if (s.dash && hit('KeyK', 'ShiftLeft', 'ShiftRight') && p.dashCd <= 0) { p.dashT = 0.16; p.dashCd = s.dashCd; Snd.play('dash'); p.inv = Math.max(p.inv, 0.16); p.dashHit = new Set(); }
  if (hit('KeyJ') && p.atkCd <= 0) { p.atkCd = s.atkCd * (p.haste > 0 ? 0.6 : 1); p.atkT = 0.12; Snd.play('atk'); p.atkHit = new Set(); }
  if (s.spit && hit('KeyL') && p.spitCd <= 0) { p.spitCd = s.spitCd; Snd.play('spit'); pshots.push({ x: p.x + p.w / 2, y: p.y + 14, vx: p.face * 560, vy: 0 }); }
  const vy0 = p.vy, wasG = p.ground;
  moveBody(p, dt);
  if (p.ground && !wasG) {
    if (p.meteor && p.meteorUp <= 0) { p.meteor = false; blast(p.x + 14, p.y + 36, 190, 3 + s.dmg * 1.5, '#ffb347'); }
    else if (vy0 > 300) { burst(p.x + 14, p.y + 36, '#cfc6b0', 5); ring(p.x + 14, p.y + 36, '#ffffff', 28, 0.25); }
  }
  if (p.ground && !wasG && vy0 > 420 && s.stomp && !p.meteor) {
    shake = 8; hitstop = 0.05; burst(p.x + 14, p.y + 36, '#ffd54f', 14);
    for (const e of enemies) if (Math.abs(e.x + e.w / 2 - p.x - 14) < 100 && Math.abs(e.y + e.h - p.y - p.h) < 50) { e.hp -= 2 + s.dmg; e.flash = 0.1; e.kb = 0.25; e.vy = -300; poison(e); }
  }
  if (p.y > H + 100) { hurtPlayer({ x: p.x }, 1); Object.assign(p, { x: 80, y: 300, vy: 0 }); }

  const box = s.spin ? { x: p.x - s.reach, y: p.y + 2, w: p.w + s.reach * 2, h: p.h - 4 }
    : { x: p.face > 0 ? p.x + p.w : p.x - s.reach, y: p.y + 2, w: s.reach, h: p.h - 4 };
  for (const e of enemies) {
    e.flash -= dt; e.kb -= dt; e.t += dt;
    if (e.poisT > 0) { e.poisT -= dt; e.hp -= e.poisDps * dt; if (Math.random() < dt * 8) burst(e.x + e.w / 2, e.y, '#b455d6', 1); }
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burnDps * dt; if (Math.random() < dt * 16) flames(e.x + e.w / 2, e.y + 6, 0.2, 1); }
    e.stunT -= dt;
    if (s.aura && Math.hypot(e.x + e.w / 2 - p.x - 14, e.y + e.h / 2 - p.y - 18) < 110) poison(e);
    if (s.fireAura && Math.hypot(e.x + e.w / 2 - p.x - 14, e.y + e.h / 2 - p.y - 18) < 100) ignite(e);
    const dx = p.x - e.x;
    if (e.stunT > 0) { if (e.kb <= 0) e.vx = 0; if (Math.random() < dt * 10) burst(e.x + e.w / 2, e.y - 4, '#ffd54f', 1); }
    else if (e.kb <= 0) {
      e.dir = Math.sign(dx) || 1;
      if (e.kind === 'armored' || e.kind === 'boss') {
        const boss = e.kind === 'boss', rage = boss && e.hp < e.maxHp / 2;
        e.turnT -= dt;
        if (e.face !== e.dir && e.turnT <= 0) { e.face = e.dir; e.turnT = boss ? (rage ? 0.8 : 1.1) : 1.3; }
        e.vx = e.face * (boss ? (rage ? 120 : 65) : 45);
        if (boss) {
          e.shootT -= dt;
          if (e.shootT <= 0) {
            e.shootT = rage ? 1.6 : 2.6;
            const base = Math.atan2(p.y + p.h / 2 - e.y - 20, p.x + p.w / 2 - e.x - e.w / 2);
            for (const o of rage ? [-0.3, 0, 0.3] : [0]) shots.push({ x: e.x + e.w / 2, y: e.y + 20, vx: Math.cos(base + o) * 240, vy: Math.sin(base + o) * 240, r: 7 });
          }
        }
      } else if (e.kind === 'spitter') {
        const d = Math.abs(dx);
        e.vx = d < 220 ? -e.dir * 80 : d > 380 ? e.dir * 60 : 0;
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 520) {
          e.shootT = 2.2;
          const ang = Math.atan2(p.y + p.h / 2 - e.y, p.x + p.w / 2 - e.x);
          shots.push({ x: e.x + e.w / 2, y: e.y + 8, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, r: 6 });
        }
      } else {
        e.vx = e.dir * (e.kind === 'hopper' ? 90 : 70 + room * 4);
        if (e.kind === 'hopper' && e.ground && Math.abs(dx) < 300 && e.t > 1.2) { e.vy = -520; e.t = 0; }
      }
      if (s.slow && e.poisT > 0) e.vx *= 0.5;
    }
    e.vy = Math.min(e.vy + G * dt, 900);
    moveBody(e, dt);
    if (e.y > H + 50) { e.x = 700; e.y = 0; e.vy = 0; }
    let dmg = (p.atkT > 0 && overlap(box, e) && !p.atkHit.has(e)) ? s.dmg + (p.dashT > 0 ? s.dashDmg : 0) : 0;
    const rammed = p.dashT > 0 && s.ram && overlap(p, e) && !p.dashHit.has(e);
    if (dmg || rammed) {
      let d = dmg || s.dmg + 1;
      (dmg ? p.atkHit : p.dashHit).add(e);
      if (e.kind === 'armored' || e.kind === 'boss') {
        const behind = (p.x + p.w / 2 - (e.x + e.w / 2)) * e.face < 0;
        d = behind ? d * 2 : s.pierce ? d : d * 0.25;
        burst(e.x + (behind ? 0 : e.w), e.y + 14, behind ? '#ff5252' : '#b0bec5', 6);
      }
      if (s.ambush && e.hp >= e.maxHp - 0.001) d *= 2;
      e.hp -= d; poison(e); Snd.play(e.kind === 'armored' && !s.pierce && !(d > s.dmg) ? 'armor' : 'hit'); e.flash = 0.1; e.kb = e.kind === 'boss' ? 0 : 0.25;
      e.vx = (box.x + box.w / 2 > e.x + e.w / 2 ? -1 : 1) * s.knock * 2; if (!s.spin) e.vx = p.face * s.knock * 2;
      e.vy = -180; shake = 3; hitstop = 0.045; burst(e.x + e.w / 2, e.y + e.h / 2, '#ffd54f');
    } else if (overlap(p, e) && p.inv <= 0 && e.stunT <= 0) {
      if (s.thorns) { e.hp -= s.thorns; e.flash = 0.1; if (s.thornPoison) poison(e); if (s.thornFire) ignite(e); }
      if (e.hp > 0) hurtPlayer(e, e.kind === 'boss' ? 2 : 1);
    }
  }
  for (const b of shots) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (p.atkT > 0 && Math.hypot(b.x - box.x - box.w / 2, b.y - box.y - box.h / 2) < s.reach + 10) { b.dead = true; burst(b.x, b.y, '#aed581', 5); }
    else if (p.inv <= 0 && overlap(p, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { b.dead = true; hurtPlayer(b); }
    else if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || platforms.some(q => q.h > 20 && overlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, q))) b.dead = true;
  }
  shots.filter(b => b.dead).forEach(removeObj); shots = shots.filter(b => !b.dead);
  for (const b of pshots) {
    b.x += b.vx * dt; b.y += (b.vy || 0) * dt;
    const box2 = { x: b.x - 6, y: b.y - 6, w: 12, h: 12 };
    const e = enemies.find(q => overlap(box2, q));
    if (e) {
      const arm = e.kind === 'armored' || e.kind === 'boss', front = !arm || (b.vx * e.face > 0);
      e.hp -= (b.dmg || 1) * (front ? (arm && !s.pierce ? 0.25 : 1) : 2); poison(e); e.flash = 0.1; b.dead = true; burst(b.x, b.y, b.quill ? '#e8e0c0' : '#b455d6', 6);
    } else if (b.x < 0 || b.x > W || b.y < -50 || b.y > H || platforms.some(q => q.h > 20 && overlap(box2, q))) b.dead = true;
  }
  pshots.filter(b => b.dead).forEach(removeObj); pshots = pshots.filter(b => !b.dead);

  let bossDied = false;
  for (const e of enemies) if (e.hp <= 0) {
    burst(e.x + e.w / 2, e.y + e.h / 2, e.kind === 'boss' ? '#ffd54f' : '#7e57c2', e.kind === 'boss' ? 40 : 14);
    Snd.play(e.kind === 'boss' ? 'bossKill' : 'kill');
    if (e.kind === 'boss') { bossDied = true; shake = 14; }
    if (s.spread && e.poisT > 0) for (const o of enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 160) poison(o);
    if (s.cinder && e.burnT > 0) {
      ring(e.x + e.w / 2, e.y + e.h / 2, '#ff8a2a', 130, 0.35); burst(e.x + e.w / 2, e.y + e.h / 2, '#ff8a2a', 18);
      for (const o of enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 130) { o.hp -= 2; o.flash = 0.1; ignite(o); }
    }
    if (s.lifesteal) p.hp = Math.min(s.maxHp, p.hp + 0.5);
    removeRig(e);
  }
  enemies = enemies.filter(e => e.hp > 0);
  if (!enemies.length) endRoom(bossDied || room % 5 === 0);
}

// ---------- Izbira evolucije ----------
function endRoom(boss) {
  mode = 'choose';
  player.vx = 0; player.atkT = 0; player.dashT = 0; player.hurtT = 0; player.haste = 0; player.bastion = 0; player.meteor = false; player.breathT = 0;
  clearObjects();
  Snd.play('clear'); Snd.setMood(room, false);
  queue = boss ? ['evo', 'boss'] : ['evo'];
  nextChoice();
}
function nextChoice() {
  while (queue.length) {
    const k = queue.shift();
    const opts = k === 'boss' ? bossOffers(owned) : offers(owned, 3);
    if (opts.length) { choice = { kind: k, options: opts, hover: -1 }; choiceCool = 0.4; return; }
  }
  choice = null;
  startRoom();
}
function pick(opt) {
  if (opt.id.startsWith('g_')) extras[opt.id]++; else owned.add(opt.id);
  const old = stats.maxHp;
  stats = computeStats(owned, extras);
  player.hp = Math.min(stats.maxHp, player.hp + Math.max(0, stats.maxHp - old));
  player.shield = stats.shield;
  burst(player.x + 14, player.y + 18, NICHES[opt.niche].color, 30);
  shake = 4;
  Snd.play(opt.boss ? 'bossPick' : 'pick');
  nextChoice();
}
function cardRect(i) { return { x: 30 + i * 305, y: i === choice.hover ? 346 : 356, w: 290, h: 176 }; }
function hoverIndex() {
  if (!choice) return -1;
  for (let i = 0; i < choice.options.length; i++) { const r = cardRect(i); if (mouse.x > r.x && mouse.x < r.x + r.w && mouse.y > 340 && mouse.y < r.y + r.h) return i; }
  return -1;
}
uic.addEventListener('mousemove', e => {
  const r = uic.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
});
uic.addEventListener('click', e => {
  if (mode !== 'choose' || !choice || choiceCool > 0) return;
  const r = uic.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
  const i = hoverIndex();
  if (i >= 0) pick(choice.options[i]);
});
function updateChoose(dt) {
  choiceCool -= dt;
  if (!choice) return;
  choice.hover = hoverIndex();
  if (choiceCool > 0) return;
  for (let i = 0; i < choice.options.length; i++) if (hit('Digit' + (i + 1), 'Numpad' + (i + 1))) { pick(choice.options[i]); return; }
}

// ---------- 3D sinhronizacija ----------
const pRoot = new THREE.Group(); scene.add(pRoot);
let pRig = null, pKey = '';
function setPlayerModel(set) {
  const key = [...set].sort().join(',') + '|' + (set === owned ? '' : 'p');
  if (pRig && key === pKey) return;
  pKey = key;
  if (pRig) { pRoot.remove(pRig.root); disposeObj(pRig.root); }
  pRig = buildCreature(set);
  pRig.baseScale = pRig.model.scale.x * Math.max(1, ...[...set].map(id => (TRAIT_BY_ID[id] && TRAIT_BY_ID[id].scale) || 1));
  pRoot.add(pRig.root);
}
const angDiff = (a, b) => ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
function animatePlayer(dt, t) {
  const p = player, rig = pRig;
  pRoot.position.set(wx(p.x + p.w / 2), wy(p.y + p.h), 0);
  pRoot.visible = !(p.inv > 0 && Math.floor(p.inv * 20) % 2 && p.dashT <= 0 && mode === 'play');
  const target = mode === 'choose' ? -0.5 + Math.sin(t * 0.9) * 0.55 : p.face > 0 ? -0.4 : Math.PI + 0.4;
  rig.model.rotation.y += angDiff(rig.model.rotation.y, target) * Math.min(1, dt * (mode === 'choose' ? 3 : 14));
  const speed = Math.abs(p.vx), mv = p.ground && speed > 30 ? 1 : 0;
  p.phase += dt * (6 + speed / 28) * (mv ? 1 : 0);
  const sw = Math.sin(p.phase);
  if (p.ground || mode === 'choose') { rig.legs[0].rotation.z = sw * 0.8 * mv; rig.legs[1].rotation.z = -sw * 0.8 * mv; }
  else { rig.legs[0].rotation.z = 0.7; rig.legs[1].rotation.z = -0.4; }
  const atk = p.atkT > 0 ? 1 - p.atkT / 0.12 : -1;
  rig.arms.forEach((a, i) => {
    if (atk >= 0) a.rotation.z = -0.8 + 3.0 * Math.min(1, atk * (i ? 1.0 : 1.25));
    else a.rotation.z = (i ? -sw : sw) * 0.7 * mv + (p.ground || mode === 'choose' ? 0.1 : -0.5);
  });
  rig.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 5 + i * 0.7) * 0.22 * (1 + mv); s.rotation.z = -0.04 * i + Math.sin(t * 4 + i) * 0.05 + (mv ? 0.05 : 0); });
  const flapping = !p.ground && mode === 'play';
  const flap = flapping ? (p.gliding ? 0.15 : Math.sin(t * 18) * 0.9) : 0.2 + Math.sin(t * 2) * 0.05;
  rig.wings.forEach(w => { w.rotation.x = -w.userData.side * (p.gliding ? 0.05 : flap); });
  if (rig.orbit) rig.orbit.rotation.y += dt * 2.2;
  rig.glands.forEach(m => { m.emissiveIntensity = 0.55 + 0.4 * Math.sin(t * 3); });
  if (rig.glow) rig.glow.material.opacity = 0.1 + 0.05 * Math.sin(t * 2.5);
  rig.torso.rotation.z = -Math.min(1, speed / stats.speed) * 0.12 - (p.dashT > 0 ? 0.35 : 0);
  rig.torso.scale.y = 1 + 0.02 * Math.sin(t * 3);
  const st = clamp(-p.vy / 2500, -0.1, 0.1), bs = rig.baseScale;
  rig.model.scale.set(bs * (1 - st * 0.5) * (p.dashT > 0 ? 1.25 : 1), bs * (1 + st), bs * (1 - st * 0.5));
  setGlow(rig, p.bastion > 0 ? '#9be15d' : p.haste > 0 ? '#7fd8ff' : p.meteor ? '#ffb347' : '#ffffff', mode !== 'play' ? 0 : p.hurtT > 0 ? 0.9 : p.bastion > 0 ? 0.55 + 0.2 * Math.sin(t * 20) : p.haste > 0 || p.meteor ? 0.4 : 0);
  if (rig.flame) { rig.flame.forEach((f, i) => { f.scale.y = f.userData.h * (0.8 + 0.35 * Math.sin(t * 14 + i * 2)); }); }
  if (rig.mouthGlow) rig.mouthGlow.material.emissiveIntensity = p.breathT > 0 ? 2.5 : 0.6 + 0.3 * Math.sin(t * 4);
  if (atk >= 0 || p.atkT > -0.05) {
    slash.visible = p.atkT > 0;
    const r = stats.reach / 40;
    slash.position.set(wx(p.x + p.w / 2) + p.face * 0.25, wy(p.y + p.h / 2), 0.7);
    slash.scale.set(r * p.face * (stats.spin ? 1 : 1), r, 1);
    slash.material.opacity = 0.8 * (p.atkT / 0.12);
  } else slash.visible = false;
}
function animateEnemies(dt, t) {
  for (const e of enemies) {
    if (!e.rig) { e.rig = buildEnemy(e.kind); scene.add(e.rig.root); }
    const rig = e.rig;
    rig.root.position.set(wx(e.x + e.w / 2), wy(e.y + e.h), 0);
    const face = (e.kind === 'armored' || e.kind === 'boss') ? e.face : e.dir;
    const target = face > 0 ? -0.35 : Math.PI + 0.35;
    e.rot += angDiff(e.rot, target) * Math.min(1, dt * 10);
    rig.model.rotation.y = e.rot;
    const mv = e.ground && Math.abs(e.vx) > 10 ? 1 : 0;
    e.ph += dt * 10 * mv;
    rig.legs.forEach((l, i) => { l.rotation.z = e.kind === 'hopper' ? (e.ground ? 0 : 0.8) : Math.sin(e.ph + (i % 2) * Math.PI) * 0.6; });
    if (e.kind === 'hopper') { const st = clamp(-e.vy / 1800, -0.15, 0.15); rig.model.scale.set(1 - st * 0.5, 1 + st, 1 - st * 0.5); }
    if (rig.head) rig.head.rotation.z = Math.sin(t * 2 + e.t) * 0.12 - (e.shootT < 0.4 ? 0.4 : 0);
    if (rig.sac) rig.sac.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 5 + e.t);
    setGlow(rig, e.burnT > 0 && !(e.flash > 0) ? '#ff6a1a' : e.poisT > 0 && !(e.flash > 0) ? '#b455d6' : '#ffffff', e.flash > 0 ? 0.9 : e.burnT > 0 ? 0.5 : e.poisT > 0 ? 0.35 : 0);
  }
  for (const b of shots.concat(pshots)) {
    if (!b.obj) {
      const mine = pshots.includes(b);
      b.obj = new THREE.Mesh(GEO.sph, glowMat(mine ? '#d06bf5' : '#c6ff00', 1.2));
      b.obj.scale.setScalar(mine ? 0.17 : (b.r || 6) / 40 * 1.2);
      scene.add(b.obj);
    }
    b.obj.position.set(wx(b.x), wy(b.y), 0);
    b.obj.rotation.set(t * 5, t * 4, 0);
  }
}
let camX = 12, camY = 7, camZ = 20, lookX = 12, lookY = 6.9;
function updateCamera(dt, t) {
  const pcx = wx(player.x + player.w / 2), pcy = wy(player.y + player.h / 2);
  let tx, ty, tz, lx, ly;
  if (mode === 'choose') { tx = pcx; ty = pcy + 0.2; tz = 6.3; lx = pcx; ly = pcy - 0.75; }
  else { tx = 12 + (pcx - 12) * 0.15; ty = 6.9 + (pcy - 6.9) * 0.08; tz = 20; lx = tx; ly = ty; }
  const k = Math.min(1, dt * (mode === 'choose' ? 3 : 4));
  camX += (tx - camX) * k; camY += (ty - camY) * k; camZ += (tz - camZ) * k; lookX += (lx - lookX) * k; lookY += (ly - lookY) * k;
  const sh = shake / 40;
  camera.position.set(camX + (Math.random() - 0.5) * sh, camY + (Math.random() - 0.5) * sh, camZ);
  camera.lookAt(lookX, lookY, 0);
  for (const f of fireflies) { const u = f.userData; f.position.set(u.bx + Math.sin(t * 0.6 + u.ph) * 0.6, u.by + Math.sin(t * 0.9 + u.ph) * 0.4, f.position.z); }
}

// ---------- Vmesnik (2D plast) ----------
function wrap(text, maxW) {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) {
    const t = cur ? cur + ' ' + w : w;
    if (ui.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawHUD() {
  ui.textAlign = 'left';
  const hpN = Math.ceil(stats.maxHp), rows = Math.ceil(hpN / 10), off = (rows - 1) * 19;
  for (let i = 0; i < hpN; i++) {
    const f = clamp(player.hp - i, 0, 1), hx = 16 + (i % 10) * 19, hy = 16 + Math.floor(i / 10) * 19;
    ui.fillStyle = '#2a1c24'; ui.fillRect(hx, hy, 15, 15);
    ui.fillStyle = '#e53935'; ui.fillRect(hx, hy, 15 * f, 15);
  }
  if (player.shield) { ui.strokeStyle = '#9be15d'; ui.lineWidth = 2; ui.strokeRect(13, 13, 196, 21 + off); }
  ui.font = '15px monospace'; ui.fillStyle = '#fff'; ui.fillText(`Stopnja ${room}`, 16, 52 + off);
  ui.fillStyle = '#9ab'; stats.synergies.forEach((y, i) => ui.fillText(`★ ${y.name}`, 16, 74 + off + i * 17));
  const boss = enemies.find(e => e.kind === 'boss');
  if (boss) {
    ui.fillStyle = '#222a'; ui.fillRect(300, 14, 360, 14); ui.fillStyle = '#e53935'; ui.fillRect(300, 14, 360 * Math.max(0, boss.hp) / boss.maxHp, 14);
    ui.fillStyle = '#fff'; ui.textAlign = 'center'; ui.fillText('ŠEF', 480, 46); ui.textAlign = 'left';
  }
  stats.actives.forEach((id, i) => {
    const a = TRAIT_BY_ID[id].active, cd = Math.max(0, player.acd[id] || 0), x = 16 + i * 64, y = H - 70, f = cd / a.cd;
    ui.fillStyle = '#10121ccc'; ui.fillRect(x, y, 56, 56);
    ui.fillStyle = a.color; ui.globalAlpha = cd > 0 ? 0.35 : 1; ui.fillRect(x + 4, y + 4, 48, 30); ui.globalAlpha = 1;
    ui.fillStyle = '#10121c'; ui.font = 'bold 11px monospace'; ui.textAlign = 'center'; ui.fillText(a.name, x + 28, y + 23);
    ui.fillStyle = '#fff'; ui.font = 'bold 16px monospace'; ui.fillText(ACTIVE_KEY_LABELS[i], x + 28, y + 52);
    if (cd > 0) { ui.fillStyle = '#000a'; ui.fillRect(x, y + 56 * (1 - f), 56, 56 * f); ui.fillStyle = '#fff'; ui.font = '14px monospace'; ui.fillText(cd.toFixed(1), x + 28, y + 24); }
    ui.strokeStyle = a.color; ui.lineWidth = 2; ui.strokeRect(x, y, 56, 56); ui.textAlign = 'left';
  });
  if (toastT > 0) { ui.textAlign = 'center'; ui.font = '22px monospace'; ui.fillStyle = `rgba(255,255,255,${Math.min(1, toastT)})`; ui.fillText(toastText, W / 2, 120); ui.textAlign = 'left'; }
}
function drawChoose() {
  const gr = ui.createLinearGradient(0, 240, 0, H);
  gr.addColorStop(0, 'rgba(8,10,22,0)'); gr.addColorStop(0.35, 'rgba(8,10,22,.82)'); gr.addColorStop(1, 'rgba(8,10,22,.95)');
  ui.fillStyle = gr; ui.fillRect(0, 240, W, H - 240);
  const boss = choice.kind === 'boss';
  ui.textAlign = 'center'; ui.font = 'bold 26px monospace';
  ui.fillStyle = boss ? '#ffd54f' : '#fff';
  ui.fillText(boss ? 'NAGRADA ŠEFA – izberi eno' : `Stopnja ${room} končana – izberi evolucijo`, W / 2, 44);
  ui.font = '13px monospace'; ui.fillStyle = '#aab';
  ui.fillText(boss ? 'Edinstvena lastnost, ki jo dobiš samo od šefa.' : 'Vsaka izbira zapre sosednje veje ključa. Premakni miško čez kartico za predogled.', W / 2, 66);
  ui.textAlign = 'left'; ui.font = '12px monospace';
  const inv = nicheInvest(owned);
  Object.keys(inv).forEach((k, i) => {
    const x = 530 + (i % 3) * 140, y = 92 + Math.floor(i / 3) * 20;
    ui.fillStyle = 'rgba(8,10,22,.6)'; ui.fillRect(x, y - 13, 132, 18);
    ui.fillStyle = NICHES[k].color; ui.fillRect(x, y - 13, 4, 18);
    ui.fillText(NICHES[k].name + (inv[k] ? ' ' + '●'.repeat(Math.min(5, inv[k])) : ''), x + 10, y);
  });
  const lin = lineage(owned);
  if (lin.length) { ui.fillStyle = 'rgba(8,10,22,.6)'; ui.fillRect(10, 84, 470, 12 + lin.length * 17); }
  lin.forEach((l, i) => { ui.fillStyle = NICHES[l.niche].color; ui.fillText(`${NICHES[l.niche].name}: ${l.text}`, 20, 100 + i * 17); });
  choice.options.forEach((t, i) => {
    const r = cardRect(i), col = NICHES[t.niche].color, hv = i === choice.hover;
    ui.fillStyle = hv ? '#252a40' : '#171b2c'; ui.fillRect(r.x, r.y, r.w, r.h);
    ui.strokeStyle = col; ui.lineWidth = hv ? 3 : 1.5; ui.strokeRect(r.x, r.y, r.w, r.h);
    ui.fillStyle = col; ui.fillRect(r.x, r.y, r.w, 26);
    ui.fillStyle = '#10121c'; ui.font = 'bold 12px monospace';
    const generic = t.id.startsWith('g_');
    ui.fillText(`${NICHES[t.niche].name.toUpperCase()} · ${generic ? 'splošno' : t.boss ? 'šef' : 'stopnja ' + traitTier(t)}`, r.x + 8, r.y + 17);
    ui.textAlign = 'right'; ui.fillText(`[${i + 1}]`, r.x + r.w - 8, r.y + 17); ui.textAlign = 'left';
    ui.fillStyle = '#fff'; ui.font = 'bold 19px monospace'; ui.fillText(t.name, r.x + 10, r.y + 52);
    ui.font = '13px monospace'; ui.fillStyle = '#dde';
    let y = r.y + 74;
    wrap(t.desc, r.w - 20).slice(0, 3).forEach(l => { ui.fillText(l, r.x + 10, y); y += 16; });
    ui.font = '11px monospace';
    y = Math.max(y + 4, r.y + 118);
    const opens = generic || t.boss ? [] : opensWhat(t), closes = generic ? [] : closesWhat(t, owned);
    ui.fillStyle = '#9fd3ff';
    wrap(opens.length ? '▶ Odpre: ' + opens.join(', ') : generic || t.boss ? '' : '▶ Konec veje', r.w - 20).slice(0, 2).forEach(l => { ui.fillText(l, r.x + 10, y); y += 14; });
    ui.fillStyle = '#ff9a6a';
    wrap(closes.length ? '✖ Zapre: ' + closes.join(', ') : '', r.w - 20).slice(0, 3).forEach(l => { ui.fillText(l, r.x + 10, y); y += 14; });
  });
}

// ---------- Glavna zanka ----------
let last = performance.now(), time = 0;
function frame(now) {
  const rawDt = Math.min(0.033, (now - last) / 1000); last = now;
  const dt = rawDt * (hitstop > 0 ? 0.08 : 1);
  hitstop -= rawDt; time += rawDt; toastT -= rawDt;
  if (mode === 'play') updatePlay(dt); else updateChoose(rawDt);
  for (const q of particles) { q.m.position.x += q.vx * rawDt; q.m.position.y += q.vy * rawDt; q.vy -= 20 * rawDt; q.life -= rawDt; q.m.rotation.x += 6 * rawDt; q.m.rotation.y += 5 * rawDt; }
  for (const r of rings) { r.t += rawDt; const k = r.t / r.dur; r.m.scale.setScalar(0.2 + r.size * Math.min(1, k)); r.m.material.opacity = 0.9 * (1 - k); }
  rings.filter(r => r.t >= r.dur).forEach(r => { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); });
  for (let i = rings.length - 1; i >= 0; i--) if (rings[i].t >= rings[i].dur) rings.splice(i, 1);
  particles.filter(q => q.life <= 0).forEach(q => scene.remove(q.m));
  particles = particles.filter(q => q.life > 0);
  shake = Math.max(0, shake - 30 * rawDt);
  if (player) {
    if (mode === 'choose' && choice) {
      const h = choice.hover >= 0 ? choice.options[choice.hover] : null;
      setPlayerModel(h && !h.id.startsWith('g_') ? new Set([...owned, h.id]) : owned);
    } else setPlayerModel(owned);
    animatePlayer(rawDt, time); animateEnemies(rawDt, time); updateCamera(rawDt, time);
  }
  renderer.render(scene, camera);
  ui.clearRect(0, 0, W, H);
  if (player) { drawHUD(); if (mode === 'choose' && choice) drawChoose(); }
  for (const k in pressed) delete pressed[k];
  requestAnimationFrame(frame);
}
startRoom();
requestAnimationFrame(frame);
