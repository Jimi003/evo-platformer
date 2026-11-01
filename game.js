'use strict';
const W = 960, WORLD_W = 1440, H = 540, G = 1500, RW = 1280, RH = 720;
const wx = x => x / 40, wy = y => (540 - y) / 40;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DAYLIGHT_SECONDS = 90, DUSK_DAWN_SECONDS = 30;
const DAY_CYCLE_SECONDS = (DAYLIGHT_SECONDS + DUSK_DAWN_SECONDS) * 2;
let dayNightLevel = 0, dayNightUpdateTimer = 0, dayNightRig = null;

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
const hemi = new THREE.HemisphereLight('#c8d4ff', '#4a3a5a', 0.6);
scene.add(hemi);
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
  { sky: ['#16224a', '#c0689a'], fog: '#4a3a8a', ground: '#3a3254', top: '#6fcf6a', far: '#2c2a66', far2: '#5a3a8a', far3: '#8a4a9a', tree: '#2f7a68', tree2: '#e0a040', glow: '#ffd86b', style: 'pine', stars: true, accent: '#ff9ad0' },
  { sky: ['#0b2a2a', '#5fbf8a'], fog: '#2a6a5a', ground: '#2f4a3a', top: '#9be15d', far: '#164a44', far2: '#2a7a5a', far3: '#5aaa7a', tree: '#2f8a4a', tree2: '#8ad04a', glow: '#c6ff7a', style: 'round', stars: false, accent: '#ffe05a' },
  { sky: ['#2a0f14', '#f0903a'], fog: '#8a3a2a', ground: '#4a2a2a', top: '#e08a3a', far: '#4a1a1a', far2: '#8a3a2a', far3: '#c0602a', tree: '#7a2a2a', tree2: '#c04a2a', glow: '#ff9a4a', style: 'dead', stars: true, accent: '#ffcf4a' },
  { sky: ['#2a4a7a', '#e8f4ff'], fog: '#9ab8e0', ground: '#56688a', top: '#e8f4ff', far: '#6a86b8', far2: '#8aa6d0', far3: '#c0d4f0', tree: '#8ab0c8', tree2: '#e8f4ff', glow: '#ffffff', style: 'pine', stars: false, accent: '#9ad8ff' },
  { sky: ['#10061f', '#7a2a9a'], fog: '#3a1a5a', ground: '#2e2244', top: '#b455d6', far: '#241044', far2: '#4a2a7a', far3: '#7a3a9a', tree: '#5a2a8a', tree2: '#e29bff', glow: '#e29bff', style: 'mushroom', stars: true, accent: '#7affd0' },
];
let roomGroup = null, roomMats = [], fireflies = [], skyTex = null, fruitRig = null;
function skyTexture(a, b) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.userData.skyContext = g;
  return texture;
}
function updateDayNight(dt = 0, force = false) {
  dayNightUpdateTimer += dt;
  if (!force && dayNightUpdateTimer < 0.1) return;
  dayNightUpdateTimer = 0;
  if (!skyTex) return;
  const cyclePosition = dayCycleTime % DAY_CYCLE_SECONDS;
  const nightStart = DAYLIGHT_SECONDS + DUSK_DAWN_SECONDS;
  const dawnStart = nightStart + DAYLIGHT_SECONDS;
  let night = 0, twilight = 0;
  if (cyclePosition >= DAYLIGHT_SECONDS && cyclePosition < nightStart) {
    const transition = (cyclePosition - DAYLIGHT_SECONDS) / DUSK_DAWN_SECONDS;
    night = transition; twilight = Math.sin(Math.PI * transition);
  } else if (cyclePosition >= nightStart && cyclePosition < dawnStart) night = 1;
  else if (cyclePosition >= dawnStart) {
    const transition = (cyclePosition - dawnStart) / DUSK_DAWN_SECONDS;
    night = 1 - transition; twilight = Math.sin(Math.PI * transition);
  }
  const phase = cyclePosition / DAY_CYCLE_SECONDS * Math.PI * 2;
  dayNightLevel = night;
  const th = THEMES[(room - 1 + THEMES.length) % THEMES.length];
  const top = new THREE.Color(th.sky[0]).lerp(new THREE.Color('#070b20'), night * 0.88).lerp(new THREE.Color('#c76c73'), twilight * 0.28);
  const bottom = new THREE.Color(th.sky[1]).lerp(new THREE.Color('#151b39'), night * 0.82).lerp(new THREE.Color('#e58b68'), twilight * 0.25);
  const ctx = skyTex.userData.skyContext, gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, top.getStyle()); gradient.addColorStop(1, bottom.getStyle());
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2, 256); skyTex.needsUpdate = true;
  const fogColor = new THREE.Color(th.fog).lerp(new THREE.Color('#10162d'), night * 0.72).lerp(new THREE.Color('#a65a68'), twilight * 0.22);
  scene.fog.color.copy(fogColor);
  hemi.color.set('#c8d4ff').lerp(new THREE.Color('#7186bd'), night * 0.45);
  hemi.groundColor.set('#4a3a5a').lerp(new THREE.Color('#171b32'), night * 0.4);
  hemi.intensity = 0.6 - night * 0.2;
  sun.color.set('#fff0d8').lerp(new THREE.Color('#a5b8ee'), night * 0.7);
  sun.intensity = 0.8 - night * 0.32;
  sun.position.x = -4 + Math.sin(phase) * 3;
  sun.position.y = 18 - night * 4;
  rim.intensity = 0.55 + night * 0.15;
  if (dayNightRig) {
    dayNightRig.celestial.opacity = night;
    dayNightRig.stars.opacity = night;
    dayNightRig.halo.opacity = 0.12 * night;
    dayNightRig.shafts.opacity = 0.035 * (1 - night);
    dayNightRig.fireflies.opacity = 0.22 + night * 0.58;
  }
  Snd.setDayNight(night);
}
function buildRoomScene() {
  if (roomGroup) { scene.remove(roomGroup); roomMats.forEach(m => m.dispose()); if (skyTex) skyTex.dispose(); }
  fruitRig = null;
  dayNightRig = null;
  roomMats = []; fireflies = [];
  const th = THEMES[(room - 1) % THEMES.length];
  const M = (c, o) => { const m = stdMat(c, o); roomMats.push(m); return m; };
  roomGroup = new THREE.Group(); scene.add(roomGroup);
  skyTex = skyTexture(th.sky[0], th.sky[1]); scene.background = skyTex;
  scene.fog = new THREE.Fog(th.fog, 30, 85);
  const groundM = M(th.ground), topM = M(th.top), rockM = M(th.ground), farM = M(th.far), treeM = M(th.tree), trunkM = M('#3a2a2a');
  const rockMat = M('#8a8a96'), rockMat2 = M('#6e6e7a');
  const fireflyM = glowMat(th.glow, 0.9), celestialM = glowMat(th.glow, 0.9);
  fireflyM.transparent = true; celestialM.transparent = true; celestialM.opacity = 0;
  roomMats.push(fireflyM, celestialM);
  const crystalM = glowMat(th.glow, 0.7); roomMats.push(crystalM);

  platforms.forEach((p, i) => {
    if (p.rock) {
      const rm = mk(roomGroup, GEO.ico, rockMat, [(p.x + p.w / 2) / 40, wy(p.y) - p.h / 80 + 0.04, 0], [p.w / 80 * 1.15, p.h / 40 * 0.62, 0.7 + p.seed * 0.3], [p.seed, p.seed * 6, 0]);
      rm.receiveShadow = true;
      mk(roomGroup, GEO.ico, rockMat2, [(p.x + p.w / 2) / 40 + 0.25, wy(p.y) - 0.1, 0.5], [0.25, 0.18, 0.25], [p.seed * 3, 1, 0]);
      return;
    }
    const ground = i === 0, w = ground ? WORLD_W / 40 : p.w / 40, h = p.h / 40, d = ground ? 10 : 3;
    const cx = ground ? WORLD_W / 80 : (p.x + p.w / 2) / 40, top = wy(p.y);
    mk(roomGroup, GEO.box, groundM, [cx, top - h / 2, 0], [w, h, d]).receiveShadow = true;
    const strip = mk(roomGroup, GEO.box, ground ? M(th.ground) : topM, [cx, top - 0.09, 0], [w + 0.06, 0.2, d + 0.06]); strip.receiveShadow = true;
    if (!ground) {
      const undersideM = M(th.far2);
      for (const side of [-1, 1]) {
        const under = mk(roomGroup, GEO.cone, undersideM, [cx + side * w * 0.28, top - h - 0.2, -2], [Math.max(0.18, w * 0.12), 0.45, 0.65], [Math.PI, 0, side * 0.08]);
        under.castShadow = false;
      }
    }
    const n = ground ? 20 : Math.max(1, Math.round(w / 1.8));
    for (let k = 0; k < n; k++) {
      const x = ground ? rand(-2, WORLD_W / 40 + 2) : cx + rand(-w / 2 + 0.2, w / 2 - 0.2), z = ground ? rand(-4.5, -1.2) : rand(-1.2, 1.2);
      const r = Math.random();
      if (r < 0.45) spike(roomGroup, topM, [x, top, z], 0.07, rand(0.2, 0.45), [rand(-.3, .3), 0, rand(-.3, .3)]);
      else if (r < 0.75) mk(roomGroup, GEO.sph, rockM, [x, top + 0.1, z], [rand(.12, .3), rand(.1, .22), rand(.12, .3)]);
      else spike(roomGroup, crystalM, [x, top, z], 0.1, rand(0.35, 0.8), [rand(-.25, .25), rand(0, 3), rand(-.25, .25)]).traverse(o => { o.castShadow = false; });
    }
  });
  // tla za drevesi, da ne lebdijo v zraku
  const backM = M(th.ground); backM.color.multiplyScalar(1.25);
  mk(roomGroup, GEO.box, backM, [WORLD_W / 80, 0.5, -37], [160, 1, 64]).receiveShadow = false;
  const backTop = M(th.top); backTop.color.multiplyScalar(0.9);
  mk(roomGroup, GEO.box, backTop, [12, 0.96, -37], [160, 0.1, 64]).castShadow = false;
  // gorske plasti v različnih barvah
  [[th.far3, -66, 0.9, 9, 20], [th.far2, -54, 0.8, 8, 16], [th.far, -42, 0.7, 6, 13]].forEach(([c, z, hk, r0, r1]) => {
    const m = M(c);
    for (let i = 0; i < 12; i++) { const r = rand(r0, r1), h = rand(10, 20) * hk; mk(roomGroup, GEO.cone, m, [-14 + i * 6 + rand(-2, 2), h / 2 + 0.9, z], [r, h, r]).castShadow = false; }
  });
  // oblaki
  const cloudM = new THREE.MeshBasicMaterial({ color: th.glow, transparent: true, opacity: th.stars ? 0.1 : 0.3, depthWrite: false }); roomMats.push(cloudM);
  for (let i = 0; i < 9; i++) {
    const cx = rand(-10, WORLD_W / 40 + 10), cy = rand(9, 17), cz = rand(-60, -30);
    for (let k = 0; k < 4; k++) mk(roomGroup, GEO.sph, cloudM, [cx + k * 2.2 - 3, cy + (k % 2) * 0.7, cz], [rand(2.5, 4), rand(1.2, 1.8), 1.5]).castShadow = false;
  }
  const starM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }); roomMats.push(starM);
  for (let i = 0; i < 70; i++) mk(roomGroup, GEO.sph, starM, [rand(-20, 45), rand(8, 28), -80], [0.09, 0.09, 0.09]).castShadow = false;
  const t2M = M(th.tree2), flowerM = glowMat(th.accent, 0.6); roomMats.push(flowerM);
  for (let i = 0; i < 34; i++) {
    const x = rand(-8, WORLD_W / 40 + 8), z = rand(-24, -6.5), s = rand(0.8, 1.7), by = 1.0, alt = Math.random() < 0.3;
    const cm = alt ? t2M : treeM;
    if (th.style === 'pine' || (th.style === 'dead' && false)) {
      mk(roomGroup, GEO.cyl, trunkM, [x, by + 0.6 * s, z], [0.18 * s, 1.2 * s, 0.18 * s]).castShadow = false;
      for (let k = 0; k < 3; k++) mk(roomGroup, GEO.cone, cm, [x, by + 1.2 * s + k * 0.8 * s, z], [(1.1 - k * 0.25) * s, 1.4 * s, (1.1 - k * 0.25) * s]).castShadow = false;
    } else if (th.style === 'round') {
      mk(roomGroup, GEO.cyl, trunkM, [x, by + 0.7 * s, z], [0.22 * s, 1.4 * s, 0.22 * s]).castShadow = false;
      mk(roomGroup, GEO.sph, cm, [x, by + 2.0 * s, z], [1.5 * s, 1.3 * s, 1.5 * s]).castShadow = false;
      mk(roomGroup, GEO.sph, cm, [x + 0.7 * s, by + 1.6 * s, z], [0.9 * s, 0.8 * s, 0.9 * s]).castShadow = false;
    } else if (th.style === 'dead') {
      mk(roomGroup, GEO.cyl, trunkM, [x, by + 1.0 * s, z], [0.2 * s, 2.0 * s, 0.2 * s]).castShadow = false;
      for (const d of [-1, 1]) spike(roomGroup, trunkM, [x, by + (1.4 + (d > 0 ? 0.4 : 0)) * s, z], 0.07 * s, 1.0 * s, [0, 0, -d * 0.9]);
      if (alt) mk(roomGroup, GEO.sph, flowerM, [x, by + 0.15, z + 1], [0.3, 0.2, 0.3]).castShadow = false;
    } else {
      mk(roomGroup, GEO.cyl, trunkM, [x, by + 0.8 * s, z], [0.28 * s, 1.6 * s, 0.28 * s]).castShadow = false;
      mk(roomGroup, GEO.sph, alt ? flowerM : cm, [x, by + 1.8 * s, z], [1.7 * s, 0.9 * s, 1.7 * s]).castShadow = false;
    }
  }
  // cvetlice / travne šopke
  for (let i = 0; i < 30; i++) {
    const x = rand(-6, WORLD_W / 40 + 6), z = rand(-9, -5.2);
    mk(roomGroup, GEO.sph, i % 3 ? flowerM : t2M, [x, 1.05, z], [0.14, 0.1, 0.14]).castShadow = false;
  }
  const moon = mk(roomGroup, GEO.sph, celestialM, [WORLD_W / 80 + 4, 15, -70], [4, 4, 4]); moon.castShadow = false;
  const haloM = new THREE.MeshBasicMaterial({ color: th.glow, transparent: true, opacity: 0.12, depthWrite: false }); roomMats.push(haloM);
  mk(roomGroup, GEO.sph, haloM, [WORLD_W / 80 + 4, 15, -70.5], [9, 9, 1]).castShadow = false;
  const shaftM = new THREE.MeshBasicMaterial({ color: th.glow, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide }); roomMats.push(shaftM);
  for (let i = 0; i < 5; i++) { const s = mk(roomGroup, GEO.cone, shaftM, [rand(0, 24), 9, rand(-10, -4)], [rand(1.5, 3), 20, 1.5], [0, 0, rand(-0.2, 0.2)]); s.rotation.x = Math.PI; s.castShadow = false; }
  const capM = glowMat(th.glow, 0.8); roomMats.push(capM);
  for (let i = 0; i < 14; i++) {
    const x = rand(-3, WORLD_W / 40 + 3), z = rand(-5, -1.5), h = rand(0.15, 0.4);
    mk(roomGroup, GEO.cyl, trunkM, [x, 1 + h / 2, z], [0.03, h, 0.03]).castShadow = false;
    mk(roomGroup, GEO.sph, capM, [x, 1 + h, z], [h * 0.6, h * 0.35, h * 0.6]).castShadow = false;
  }
  for (let i = 0; i < 34; i++) {
    const f = mk(roomGroup, GEO.sph, fireflyM, [rand(-2, WORLD_W / 40 + 2), rand(1.5, 11), rand(-6, 3)], [0.05, 0.05, 0.05]);
    f.castShadow = false; f.userData = { bx: f.position.x, by: f.position.y, ph: rand(0, 6) };
    fireflies.push(f);
  }
  if (fruitTree) addFruitTreeToRoom();
  dayNightRig = { celestial: celestialM, stars: starM, halo: haloM, shafts: shaftM, fireflies: fireflyM };
  updateDayNight(0, true);
}
function addFruitTreeToRoom() {
  const treeM = stdMat('#76502d'), leafM = stdMat('#4f9b4e'), fruitM = glowMat('#ff6d36', 0.8), flowerM = stdMat('#ffd36a');
  roomMats.push(treeM, leafM, fruitM, flowerM);
  const group = new THREE.Group(); roomGroup.add(group);
  const x = wx(fruitTree.x), ground = wy(500);
  mk(group, GEO.cyl, treeM, [x, ground + 1.15, -0.5], [0.24, 1.15, 0.22]);
  for (const side of [-1, 1]) {
    const branch = mk(group, GEO.cyl, treeM, [x + side * 0.22, ground + 2.45, -0.5], [0.09, 0.7, 0.09], [0, 0, side * 0.75]);
    branch.castShadow = false;
  }
  for (const [dx, dy, size] of [[0, 3.1, 0.72], [-0.38, 2.85, 0.5], [0.4, 2.85, 0.5]]) {
    mk(group, GEO.sph, leafM, [x + dx, ground + dy, -0.55], [size, size * 0.75, size * 0.42]).castShadow = false;
  }
  const fruit = mk(group, GEO.sph, fruitM, [x, wy(fruitTree.y), 0.25], [0.08, 0.08, 0.08]);
  const stem = mk(group, GEO.cone, flowerM, [x, wy(fruitTree.y) + 0.1, 0.25], [0.035, 0.08, 0.035]);
  fruitRig = { group, fruit, stem };
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
let run = { revived: false, bosses: 0 }, points = 0;
let difficulty = 'hard';
function normalizeDifficulty(value) { return value === 'easy' || value === 'challenge' ? value : 'hard'; }
function difficultyLabel() { return difficulty === 'easy' ? 'lažja' : difficulty === 'challenge' ? 'izzivna' : 'težja'; }
try { difficulty = normalizeDifficulty(localStorage.getItem('evo-difficulty')); } catch (e) { /* privzeto težja težavnost */ }
let room = 0, mode = 'menu', platforms = [], enemies = [], shots = [], pshots = [], player = null, dayCycleTime = 0;
let fruitPending = false, fruitTree = null;
const showcase = () => mode === 'choose' || mode === 'menu';
// Rekord se shrani v brskalnik (localStorage).
let best = { room: 0, bosses: 0, build: '' };
try { Object.assign(best, JSON.parse(localStorage.getItem('evo-best') || '{}')); } catch (e) { /* brez shranjevanja */ }
function saveBest(done) {
  const text = lineage(owned).map(l => `${NICHES[l.niche].name}: ${l.text}`).join(' | ');
  let rec = false;
  if (done > best.room || (done === best.room && run.bosses > best.bosses)) { best = { room: done, bosses: run.bosses, build: text }; rec = true; }
  try { localStorage.setItem('evo-best', JSON.stringify(best)); } catch (e) { /* brez shranjevanja */ }
  return rec;
}
let shake = 0, hitstop = 0, toastT = 0, toastText = '', choice = null, queue = [], choiceCool = 0, mouse = { x: -1, y: -1 };
let synergyCards = [], treeScroll = 0, pauseHover = -1, pauseSynHover = -1, treeHoverTrait = null, treeNodeBoxes = [];
const SAVE_KEY = 'evo-save-v1';

function newPlayer() {
  return { x: 80, y: 400, w: 28, h: 36, vx: 0, vy: 0, face: 1, hp: stats.maxHp, ground: false, coyote: 0, buffer: 0,
    jumps: 0, atkT: 0, atkCd: 0, spitCd: 0, dashT: 0, dashCd: 0, inv: 0, hurtT: 0, shield: stats.shield,
    atkHit: new Set(), dashHit: new Set(), phase: 0, acd: {}, haste: 0, bastion: 0, meteor: false, meteorUp: 0, breathT: 0 };
}
let saveNotice = '';
function savedGameExists() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function saveGame() {
  if (!player || mode !== 'pause') return;
  const plain = (obj, omit) => Object.fromEntries(Object.entries(obj).filter(([k]) => !omit.includes(k)));
  const savedPlayer = { ...player, atkHit: [...player.atkHit].map(e => enemies.indexOf(e)).filter(i => i >= 0),
    dashHit: [...player.dashHit].map(e => enemies.indexOf(e)).filter(i => i >= 0) };
  const data = {
    room, difficulty, owned: [...owned], extras, run, fruitPending, fruitTree, dayCycleTime,
    player: savedPlayer,
    platforms,
    enemies: enemies.map(e => plain(e, ['rig'])),
    shots: shots.map(b => plain(b, ['obj'])),
    pshots: pshots.map(b => plain(b, ['obj'])),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    saveNotice = 'Igra je shranjena.';
  } catch (e) {
    saveNotice = 'Shranjevanje ni uspelo. Preveri prostor v brskalniku.';
  }
}
function loadSavedGame() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!data || !Number.isInteger(data.room) || !Array.isArray(data.owned) || !data.player || !Array.isArray(data.platforms) || !Array.isArray(data.enemies)) {
      saveNotice = 'Shranjena igra manjka ali je poškodovana.';
      return false;
    }
    clearObjects();
    owned = new Set(data.owned);
    extras = Object.assign({ g_hp: 0, g_dmg: 0, g_spd: 0 }, data.extras);
    stats = computeStats(owned, extras);
    run = Object.assign({ revived: false, bosses: 0 }, data.run);
    room = data.room;
    dayCycleTime = Number.isFinite(data.dayCycleTime) ? Math.max(0, data.dayCycleTime) % DAY_CYCLE_SECONDS : 0;
    difficulty = normalizeDifficulty(data.difficulty);
    fruitPending = data.fruitPending === true;
    fruitTree = data.fruitTree && Number.isFinite(data.fruitTree.x) && Number.isFinite(data.fruitTree.y)
      ? Object.assign({ age: 0, fall: 0, fallen: false }, data.fruitTree) : null;
    platforms = data.platforms.map(p => p.x === 0 && p.y === 500 ? Object.assign({}, p, { w: WORLD_W }) : p);
    enemies = data.enemies.map(e => Object.assign({ chargeT: 0, chargeCd: 3, chargeDir: -1 }, e));
    player = Object.assign(newPlayer(), data.player, {
      atkHit: new Set((data.player.atkHit || []).map(i => enemies[i]).filter(Boolean)),
      dashHit: new Set((data.player.dashHit || []).map(i => enemies[i]).filter(Boolean)),
    });
    shots = Array.isArray(data.shots) ? data.shots : [];
    pshots = Array.isArray(data.pshots) ? data.pshots : [];
    mode = 'play';
    buildRoomScene();
    setPlayerModel(owned);
    Snd.music(room % 5 === 0 ? 'boss' : 'game', room);
    saveNotice = '';
    return true;
  } catch (e) {
    saveNotice = 'Shranjene igre ni bilo mogoče naložiti.';
    return false;
  }
}
function spawnEnemy(kind, x, y) {
  const sz = { walker: [30, 28], hopper: [26, 26], spitter: [26, 32], armored: [40, 36], boss: [56, 64] }[kind];
  const baseHp = kind === 'boss' ? 18 + room * 2 : { walker: 2, hopper: 2, spitter: 2, armored: 5 }[kind] + Math.floor(room / 2);
  const hp = baseHp * (difficulty === 'challenge' ? 1.2 : 1);
  const e = { kind, x, y, w: sz[0], h: sz[1], vx: 0, vy: 0, hp, maxHp: hp, dir: -1, face: -1, turnT: 0, ground: false,
    flash: 0, kb: 0, t: Math.random() * 2, shootT: 1 + Math.random() * 2, chargeT: 0, chargeCd: 3, chargeDir: -1,
    poisT: 0, poisDps: 0, burnT: 0, burnDps: 0, chillT: 0, stunT: 0, rot: Math.PI + 0.35, ph: 0 };
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
  platforms = [{ x: 0, y: 500, w: WORLD_W, h: 40 }];
  if (fruitPending && !fruitTree) {
    fruitTree = { x: 520, y: 365, age: 0, fall: 0, fallen: false };
    fruitPending = false;
  }
  let pathX = 160;
  [425, 350, 400, 310, 380].forEach((y, tier) => {
    const w = rand(140, 220), x = clamp(pathX + rand(-55, 55), 30, WORLD_W - w - 30);
    platforms.push({ x, y: y + (room % 2 ? rand(-18, 18) : 0), w, h: 16 });
    if (tier === 1 || tier === 3) {
      const altX = clamp(x + rand(100, 170), 30, WORLD_W - 170);
      platforms.push({ x: altX, y: y + rand(30, 75), w: rand(110, 170), h: 16 });
    }
    pathX += rand(220, 280);
  });
  const nRocks = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < nRocks; i++) {
    const w = rand(38, 62), x = rand(170, WORLD_W - 120);
    if (!platforms.some(q => q.rock && Math.abs(q.x - x) < 130)) platforms.push({ x, y: 500 - 26, w, h: 26, rock: true, seed: Math.random() });
  }
  const isBoss = room % 5 === 0;
  if (isBoss) spawnEnemy('boss', WORLD_W - 240, 300);
  const count = isBoss ? 2 : 2 + room;
  for (let i = 0; i < count; i++) {
    const kinds = ['walker'];
    if (room >= 2) kinds.push('hopper', 'spitter');
    if (room >= 3) kinds.push('armored');
    const kind = room === 3 && i === 0 ? 'armored' : room === 2 && i === 0 ? 'spitter' : kinds[Math.floor(Math.random() * kinds.length)];
    spawnEnemy(kind, rand(280, WORLD_W - 120), 300);
  }
  const keep = player ? player.hp : stats.maxHp;
  player = newPlayer();
  player.hp = Math.min(stats.maxHp, keep + 1);
  mode = 'play';
  Snd.music(isBoss ? 'boss' : 'game', room);
  buildRoomScene();
  setPlayerModel(owned);
}

// ---------- Fizika ----------
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function moveBody(b, dt) {
  b.x += b.vx * dt;
  for (const p of platforms) if (p.h > 20 && overlap(b, p)) { b.x = b.vx > 0 ? p.x - b.w : p.x + p.w; b.vx = 0; }
  b.x = Math.max(0, Math.min(WORLD_W - b.w, b.x));
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt; b.ground = false;
  for (const p of platforms) {
    if (!overlap(b, p)) continue;
    const solid = p.h > 20;
    if (b.vy >= 0 && (prevBottom <= p.y + 4 || (solid && prevBottom <= p.y + 12))) { b.y = p.y - b.h; b.vy = 0; b.ground = true; }
    else if (solid && b.vy < 0) { b.y = p.y + p.h; b.vy = 0; }
  }
}
function chill(e) { if (stats.chill) e.chillT = 2.5; }
const bolts = [];
function zap(x1, y1, x2, y2) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const k = i / 6, j = i === 0 || i === 6 ? 0 : 0.35; pts.push(new THREE.Vector3(wx(x1 + (x2 - x1) * k) + rand(-j, j), wy(y1 + (y2 - y1) * k) + rand(-j, j), 0.6)); }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#fff35a', transparent: true }));
  scene.add(l); bolts.push({ l, t: 0 });
  burst(x2, y2, '#fff35a', 5);
}
function chain(from, n, dmg) {
  const hitSet = new Set([from]); let cur = from;
  for (let i = 0; i < n; i++) {
    let best = null, bd = 220;
    for (const o of enemies) if (!hitSet.has(o) && o.hp > 0) { const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < bd) { bd = d; best = o; } }
    if (!best) break;
    zap(cur.x + cur.w / 2, cur.y + cur.h / 2, best.x + best.w / 2, best.y + best.h / 2);
    best.hp -= dmg; best.flash = 0.1; best.stunT = Math.max(best.stunT, 0.3); hitSet.add(best); cur = best;
  }
}
function poison(e) {
  chill(e);
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
  p.acd[id] = a.cd * s.cdMult;
  const sfx = { torrent: 'water', blizzard: 'frost', snare: 'grow', bloomburst: 'grow', bolt: 'zap' }[id];
  Snd.play(sfx || (id === 'roar' || id === 'gale' || id === 'bastion' || id === 'quills' || id === 'miasma' || id === 'epidemic' || id === 'breath' ? id : 'dash'));
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
    ring(cx, cy, a.color, 260, 0.6); shake = 5; burst(cx, cy, '#c24ff0', 30);
    for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 260) { e.poisT = Math.max(e.poisT, 3); e.poisDps = Math.max(e.poisDps, (s.poison || 1) * 1.25); e.hp -= 0.5; e.flash = 0.1; }
  } else if (id === 'epidemic') {
    ring(cx, cy, a.color, 520, 0.8); shake = 6;
    for (const e of enemies) { e.poisT = 4; e.poisDps = Math.max(s.poison, 1); e.flash = 0.1; burst(e.x + e.w / 2, e.y, '#9be15d', 6); }
  } else if (id === 'torrent') {
    shake = 4; ring(cx + p.face * 60, cy, a.color, 120, 0.4);
    for (let i = 0; i < 14; i++) burst(cx + p.face * (20 + i * 22), cy + rand(-20, 24), i % 2 ? '#3b9bff' : '#bfeaff', 2);
    for (const e of enemies) {
      const dx = (e.x + e.w / 2 - cx) * p.face;
      if (dx > -10 && dx < 340 && Math.abs(e.y + e.h / 2 - cy) < 90) { e.hp -= 1 + s.dmg * 0.5; e.flash = 0.1; e.vx = p.face * 420; e.kb = 0.3; e.vy = -160; e.chillT = 3; }
    }
  } else if (id === 'blizzard') {
    ring(cx, cy, a.color, 260, 0.6); shake = 4; burst(cx, cy, '#bfeaff', 28);
    for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 260) { e.chillT = 4; e.stunT = e.kind === 'boss' ? 0.8 : 1.8; e.hp -= 1 + (s.shatter ? 1 : 0); e.flash = 0.1; }
  } else if (id === 'snare') {
    ring(cx, cy, a.color, 280, 0.5); burst(cx, cy, '#4fae3f', 24);
    for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 280) { e.stunT = e.kind === 'boss' ? 1 : 2.5; e.hp -= 1; e.flash = 0.1; burst(e.x + e.w / 2, e.y + e.h, '#3fae4f', 8); }
  } else if (id === 'bloomburst') {
    p.hp = Math.min(s.maxHp, p.hp + 2); ring(cx, cy, a.color, 260, 0.6); burst(cx, cy, '#ff7ab8', 30);
    for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 260) e.chillT = 4;
  } else if (id === 'bolt') {
    const tg = enemies.filter(e => e.hp > 0).sort((u, v) => Math.hypot(u.x - cx, u.y - cy) - Math.hypot(v.x - cx, v.y - cy)).slice(0, s.boltN);
    shake = 4; ring(cx, cy, a.color, 80, 0.25);
    for (const e of tg) { zap(e.x + e.w / 2, -200, e.x + e.w / 2, e.y + e.h / 2); e.hp -= 2 + s.dmg * 0.5 + (s.arcDmg - 1); e.flash = 0.12; e.stunT = Math.max(e.stunT, 0.8); if (s.arc) chain(e, 1, s.arcDmg); }
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
  toast(`Tek se je končal na stopnji ${room}. Rekord: ${best.room}. stopnja.`, 3); Snd.play('die');
  owned = new Set(); extras = { g_hp: 0, g_dmg: 0, g_spd: 0 }; stats = computeStats(owned, extras);
  run.revived = false; run.bosses = 0; room = 0; player = null; dayCycleTime = 0;
  startRoom();
}
function hurtPlayer(from, dmg = 1) {
  const p = player;
  if (p.inv > 0) return;
  if (p.shield) { p.shield = false; p.inv = 0.6; Snd.play('bastion'); burst(p.x + 14, p.y + 18, '#9be15d', 12); return; }
  Snd.play('hurt');
  if (difficulty === 'challenge' && (from.kind || from.enemyShot)) dmg *= 1.2;
  p.hp -= dmg; p.inv = stats.invTime; p.hurtT = 0.2; hitstop = 0.06;
  p.vx = (p.x < from.x ? -1 : 1) * 260; p.vy = -260; shake = 6; burst(p.x + 14, p.y + 18, '#ffffff');
  if (p.hp <= 0) {
    if (stats.revive && !run.revived) {
      run.revived = true; p.hp = Math.ceil(stats.maxHp / 2); p.inv = 2; burst(p.x + 14, p.y + 18, '#ffd54f', 30); toast('Vstal si od mrtvih!', 1.5); Snd.play('revive');
    } else die();
  }
}

function updateFruit(dt) {
  if (!fruitTree) return;
  fruitTree.age += dt;
  if (fruitTree.age >= 6) {
    fruitTree.fall += dt;
    fruitTree.y = Math.min(472, 365 + fruitTree.fall * 120);
    fruitTree.fallen = fruitTree.y >= 472;
  }
  if (fruitRig) {
    fruitRig.fruit.position.y = wy(fruitTree.y);
    fruitRig.stem.position.y = wy(fruitTree.y) + 0.1;
    const scale = 0.04 + Math.min(1, fruitTree.age / 6) * 0.04;
    fruitRig.fruit.scale.setScalar(scale);
    fruitRig.stem.visible = !fruitTree.fallen;
  }
  if (fruitTree.fallen && overlap(player, { x: fruitTree.x - 12, y: fruitTree.y - 12, w: 24, h: 24 })) {
    const heal = Math.max(1, Math.floor(stats.maxHp / 5));
    player.hp = Math.min(stats.maxHp, player.hp + heal);
    fruitTree = null;
    if (fruitRig) { fruitRig.fruit.visible = false; fruitRig.stem.visible = false; }
    toast(`Sadež ti povrne ${heal} zdravja.`, 2);
    Snd.play('pick');
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
  if (s.dash && hit('KeyK', 'ShiftLeft', 'ShiftRight') && p.dashCd <= 0) { p.dashT = 0.16; p.dashCd = s.dashCd; Snd.play('dash'); p.inv = Math.max(p.inv, 0.55); p.dashHit = new Set(); }
  if (hit('KeyJ') && p.atkCd <= 0) { p.atkCd = s.atkCd * (p.haste > 0 ? 0.6 : 1); p.atkT = 0.12; Snd.play('atk'); p.atkHit = new Set(); }
  if (s.spit && hit('KeyL') && p.spitCd <= 0) { p.spitCd = s.spitCd; Snd.play('spit'); pshots.push({ x: p.x + p.w / 2, y: p.y + 14, vx: p.face * 560, vy: 0 }); }
  const vy0 = p.vy, wasG = p.ground;
  moveBody(p, dt);
  updateFruit(dt);
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
        e.vx = e.face * (boss ? (rage ? 100 : 55) : 45);
        if (boss) {
          e.chargeCd -= dt;
          if (e.chargeT > 0) {
            e.chargeT = Math.max(0, e.chargeT - dt);
            if (e.chargeT > 0.48) e.vx = 0;
            else e.vx = e.chargeDir * (rage ? 280 : 235);
            if (e.chargeT === 0) {
              e.chargeCd = rage ? 5 : 6.5;
              e.stunT = 0.65;
              e.vx = 0;
              for (const dir of [-1, 1]) shots.push({ x: e.x + e.w / 2, y: 492, vx: dir * 190, vy: 0, r: 8, enemyShot: true, wave: true, color: '#ffb347' });
            }
          } else if (e.chargeCd <= 0 && Math.abs(dx) < 520) {
            e.chargeT = 1.05;
            e.chargeDir = e.dir;
            e.face = e.chargeDir;
            e.vx = 0;
          }
          if (e.chargeT <= 0) {
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = rage ? 1.6 : 2.6;
              const base = Math.atan2(p.y + p.h / 2 - e.y - 20, p.x + p.w / 2 - e.x - e.w / 2);
              for (const o of rage ? [-0.3, 0, 0.3] : [0]) shots.push({ x: e.x + e.w / 2, y: e.y + 20, vx: Math.cos(base + o) * 240, vy: Math.sin(base + o) * 240, r: 7, enemyShot: true, color: '#ff6a5a' });
            }
          }
        }
      } else if (e.kind === 'spitter') {
        const d = Math.abs(dx);
        e.vx = d < 220 ? -e.dir * 80 : d > 380 ? e.dir * 60 : 0;
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 520) {
          e.shootT = 2.2;
          const ang = Math.atan2(p.y + p.h / 2 - e.y, p.x + p.w / 2 - e.x);
          shots.push({ x: e.x + e.w / 2, y: e.y + 8, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, r: 6, enemyShot: true, color: '#c6ff00' });
        }
      } else {
        e.vx = e.dir * (e.kind === 'hopper' ? 90 : 70 + room * 4);
        if (e.kind === 'hopper' && e.ground && Math.abs(dx) < 300 && e.t > 1.2) { e.vy = -520; e.t = 0; }
      }
      if (s.slow && e.poisT > 0) e.vx *= 0.5;
    }
    e.vy = Math.min(e.vy + G * dt, 900);
    if (e.chillT > 0) { e.chillT -= dt; e.vx *= 0.55; if (Math.random() < dt * 8) burst(e.x + e.w / 2, e.y, '#bfeaff', 1); }
    if (s.sporeAura && Math.hypot(e.x + e.w / 2 - p.x - 14, e.y + e.h / 2 - p.y - 18) < 130) { e.chillT = Math.max(e.chillT || 0, 0.3); if (Math.random() < dt * 6) burst(e.x + e.w / 2, e.y, '#c8ff9a', 1); }
    const wantVx = e.vx;
    moveBody(e, dt);
    if (wantVx && e.vx === 0 && e.ground && e.kind !== 'boss' && e.kb <= 0 && e.stunT <= 0) e.vy = -470;
    if (e.y > H + 50) { e.x = clamp(player.x + 450, 100, WORLD_W - 100); e.y = 0; e.vy = 0; }
    let dmg = (p.atkT > 0 && overlap(box, e) && !p.atkHit.has(e)) ? s.dmg + (p.dashT > 0 ? s.dashDmg : 0) : 0;
    const rammed = p.dashT > 0 && s.ram && overlap(p, e) && !p.dashHit.has(e);
    if (dmg || rammed) {
      let d = dmg || s.dmg + 1;
      (dmg ? p.atkHit : p.dashHit).add(e);
      if (e.kind === 'armored' || e.kind === 'boss') {
        const behind = (p.x + p.w / 2 - (e.x + e.w / 2)) * e.face < 0;
        const weakMultiplier = e.kind === 'boss' ? 1.5 : 1.6;
        d = behind ? d * weakMultiplier : s.pierce ? d : d * 0.5;
        burst(e.x + (behind ? 0 : e.w), e.y + 14, behind ? '#ff5252' : '#b0bec5', 6);
      }
      if (s.ambush && e.hp >= e.maxHp - 0.001) d *= 2;
      if (s.shatter && e.chillT > 0) { d *= 1.5; burst(e.x + e.w / 2, e.y + 10, '#bfeaff', 5); }
      e.hp -= d; poison(e); if (s.arc) chain(e, s.arc, s.arcDmg); Snd.play(e.kind === 'armored' && !s.pierce && !(d > s.dmg) ? 'armor' : 'hit'); e.flash = 0.1; e.kb = e.kind === 'boss' ? 0 : 0.25;
      e.vx = (box.x + box.w / 2 > e.x + e.w / 2 ? -1 : 1) * s.knock * 2; if (!s.spin) e.vx = p.face * s.knock * 2;
      e.vy = -180; shake = 3; hitstop = 0.045; burst(e.x + e.w / 2, e.y + e.h / 2, '#ffd54f');
    } else if (overlap(p, e) && p.inv <= 0 && e.stunT <= 0) {
      if (s.thorns) { e.hp -= s.thorns; e.flash = 0.1; if (s.thornPoison) poison(e); if (s.thornFire) ignite(e); if (s.thornChill) e.chillT = 2.5; }
      if (e.hp > 0) hurtPlayer(e, e.kind === 'boss' ? 1.5 : 1);
    }
  }
  for (const b of shots) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (p.atkT > 0 && Math.hypot(b.x - box.x - box.w / 2, b.y - box.y - box.h / 2) < s.reach + 10) { b.dead = true; burst(b.x, b.y, '#aed581', 5); }
    else if (p.inv <= 0 && overlap(p, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { b.dead = true; hurtPlayer(b); }
    else if (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > H || platforms.some(q => overlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, q))) b.dead = true;
  }
  shots.filter(b => b.dead).forEach(removeObj); shots = shots.filter(b => !b.dead);
  for (const b of pshots) {
    b.x += b.vx * dt; b.y += (b.vy || 0) * dt;
    const box2 = { x: b.x - 6, y: b.y - 6, w: 12, h: 12 };
    const e = enemies.find(q => overlap(box2, q));
    if (e) {
      const arm = e.kind === 'armored' || e.kind === 'boss', front = !arm || (b.vx * e.face > 0);
      e.hp -= (b.dmg || 1) * (front ? (arm && !s.pierce ? 0.25 : 1) : 2); poison(e); e.flash = 0.1; b.dead = true; burst(b.x, b.y, b.quill ? '#e8e0c0' : '#b455d6', 6);
    } else if (b.x < 0 || b.x > WORLD_W || b.y < -50 || b.y > H || platforms.some(q => overlap(box2, q))) b.dead = true;
  }
  pshots.filter(b => b.dead).forEach(removeObj); pshots = pshots.filter(b => !b.dead);

  let bossDied = false;
  for (const e of enemies) if (e.hp <= 0) {
    burst(e.x + e.w / 2, e.y + e.h / 2, e.kind === 'boss' ? '#ffd54f' : '#7e57c2', e.kind === 'boss' ? 40 : 14);
    Snd.play(e.kind === 'boss' ? 'bossKill' : 'kill');
    if (e.kind === 'boss') { bossDied = true; run.bosses++; shake = 14; }
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
function resetRun() {
  owned = new Set(); extras = { g_hp: 0, g_dmg: 0, g_spd: 0 }; stats = computeStats(owned, extras);
  run.revived = false; run.bosses = 0; room = 0; player = null; dayCycleTime = 0; choice = null; fruitPending = false; fruitTree = null;
}
function beginGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nov tek se kljub temu začne */ }
  resetRun(); startRoom(); Snd.play('clear');
}
function toMenu() { resetRun(); startRoom(); clearObjects(); mode = 'menu'; Snd.music('menu'); }
function setDifficulty(value) {
  difficulty = normalizeDifficulty(value);
  try { localStorage.setItem('evo-difficulty', difficulty); } catch (e) { /* izbor še vedno velja za ta tek */ }
}
function drawMenu() {
  ui.fillStyle = 'rgba(6,8,18,.84)'; ui.fillRect(0, 0, W, H);
  ui.textAlign = 'center'; ui.fillStyle = '#ffd54f'; ui.font = 'bold 46px monospace'; ui.fillText('EVO PLATFORMER', W / 2, 78);
  ui.fillStyle = '#dce3f7'; ui.font = '17px monospace'; ui.fillText('Bori se, razvijaj se in poišči svojo evolucijsko pot.', W / 2, 112);
  ui.font = 'bold 18px monospace'; ui.fillStyle = '#fff'; ui.fillText('IZBERI TEŽAVNOST', W / 2, 165);
  const cards = [
    { x: 55, value: 'easy', title: 'LAŽJA', desc: ['Po vsaki stopnji izberi', 'dve izboljšavi.'], color: '#9be15d' },
    { x: 350, value: 'hard', title: 'TEŽJA', desc: ['Po vsaki stopnji izberi', 'eno izboljšavo.'], color: '#ff9a6a' },
    { x: 645, value: 'challenge', title: 'IZZIVNA', desc: ['Ena izboljšava na stopnjo;', 'sovražniki: +20 % zdravja', 'in povzročene škode.'], color: '#ff5d73' },
  ];
  cards.forEach(c => {
    const active = difficulty === c.value;
    ui.fillStyle = active ? '#252f3b' : '#171b2c'; ui.fillRect(c.x, 190, 260, 116);
    ui.strokeStyle = active ? c.color : '#515a70'; ui.lineWidth = active ? 4 : 2; ui.strokeRect(c.x, 190, 260, 116);
    ui.fillStyle = c.color; ui.font = 'bold 21px monospace'; ui.fillText(c.title, c.x + 130, 230);
    ui.fillStyle = '#dce3f7'; ui.font = c.value === 'challenge' ? '13px monospace' : '15px monospace';
    c.desc.forEach((line, i) => ui.fillText(line, c.x + 130, 258 + i * (c.value === 'challenge' ? 18 : 22)));
  });
  ui.fillStyle = '#aab'; ui.font = '14px monospace';
  ui.fillText('Na vsaki peti stopnji te čaka šef; njegov poraz prinese še posebno nagrado.', W / 2, 335);
  const pulse = 0.65 + 0.35 * Math.sin(time * 4);
  ui.fillStyle = `rgba(255,255,255,${pulse})`; ui.font = 'bold 20px monospace'; ui.fillText('ENTER ali klik – začni igro', W / 2, 390);
  if (savedGameExists()) {
    ui.fillStyle = '#7fd8ff'; ui.font = 'bold 17px monospace'; ui.fillText('NADALJUJ SHRANJENO IGRO (C)', W / 2, 432);
  }
  if (saveNotice) {
    ui.fillStyle = '#ff9a6a'; ui.font = '13px monospace'; ui.fillText(saveNotice, W / 2, 458);
  }
  if (best.room) {
    ui.fillStyle = '#9be15d'; ui.font = '14px monospace';
    ui.fillText(`Rekord: ${best.room}. stopnja · premagani šefi: ${best.bosses}`, W / 2, 485);
  }
  ui.fillStyle = '#aab'; ui.font = '13px monospace';
  ui.fillText('1/2/3: težavnost · A/D ali puščice: premik · preslednica: skok · J: napad', W / 2, 504);
  ui.fillText('K/Shift: sunek · L: izstrelek · E/Q/R: sposobnosti · P: premor · M: zvok', W / 2, 525);
}
function drawPause() {
  ui.fillStyle = 'rgba(6,8,18,.88)'; ui.fillRect(0, 0, W, H);
  ui.textAlign = 'center'; ui.fillStyle = '#ffd54f'; ui.font = 'bold 40px monospace'; ui.fillText('PREMOR', W / 2, 68);
  ui.fillStyle = '#c8d0e8'; ui.font = '15px monospace'; ui.fillText(`Stopnja ${room} · težavnost: ${difficultyLabel()}`, W / 2, 96);
  const buttons = [
    { y: 108, label: 'NADALJUJ', color: '#9be15d' },
    { y: 146, label: 'POGLEJ RAZVOJNO DREVO', color: '#7fd8ff' },
    { y: 184, label: 'SHRANI IGRO', color: '#ffd54f' },
    { y: 222, label: 'GLAVNI MENI', color: '#ff9a6a' },
  ];
  buttons.forEach((b, i) => {
    ui.fillStyle = pauseHover === i ? '#30374a' : '#171b2c'; ui.fillRect(315, b.y, 330, 36);
    ui.strokeStyle = b.color; ui.lineWidth = 2; ui.strokeRect(315, b.y, 330, 36);
    ui.fillStyle = b.color; ui.font = 'bold 14px monospace'; ui.fillText(b.label, 480, b.y + 23);
  });
  ui.fillStyle = saveNotice ? '#9be15d' : '#aab'; ui.font = '13px monospace';
  ui.fillText(saveNotice || 'Klikni možnost ali uporabi P / Esc za nadaljevanje.', W / 2, 271);
  drawPauseSynergies();
}
function drawPauseSynergies() {
  const all = stats.synergies;
  ui.textAlign = 'center'; ui.font = 'bold 13px monospace'; ui.fillStyle = '#c8d0e8';
  ui.fillText('AKTIVNE SINERGIJE — pomakni kazalec nad ikono za podrobnosti', W / 2, 294);
  if (!all.length) {
    ui.font = '13px monospace'; ui.fillStyle = '#8f9ab3'; ui.fillText('Sinergije se samodejno aktivirajo, ko pridobiš obe povezani lastnosti.', W / 2, 342);
    return;
  }
  all.forEach((syn, i) => {
    const col = i % 5, row = Math.floor(i / 5), x = 56 + col * 170, y = 316 + row * 37;
    ui.fillStyle = pauseSynHover === i ? '#343b50' : '#171b2c'; ui.fillRect(x, y, 162, 31);
    ui.fillStyle = synergyGradient(syn, x, y, 162, 31); ui.fillRect(x, y, 162, 31);
    ui.globalAlpha = 0.78; ui.fillStyle = '#10121c'; ui.fillRect(x, y, 162, 31); ui.globalAlpha = 1;
    ui.strokeStyle = synergyGradient(syn, x, y, 162, 31); ui.lineWidth = 1.5; ui.strokeRect(x, y, 162, 31);
    ui.beginPath(); ui.arc(x + 16, y + 15.5, 10, 0, Math.PI * 2); ui.fillStyle = synergyGradient(syn, x + 6, y + 5.5, 20, 20); ui.fill();
    ui.fillStyle = '#fff'; ui.font = 'bold 11px monospace'; ui.fillText('✦', x + 16, y + 19);
    ui.textAlign = 'left'; ui.fillStyle = '#f2d9ed'; ui.font = '11px monospace';
    ui.fillText(syn.name.length > 19 ? syn.name.slice(0, 17) + '…' : syn.name, x + 32, y + 19);
    ui.textAlign = 'center';
  });
  if (pauseSynHover >= 0 && all[pauseSynHover]) {
    const syn = all[pauseSynHover], tipW = 330, tipH = 104;
    const x = clamp(mouse.x + 14, 8, W - tipW - 8), y = clamp(mouse.y + 14, 8, H - tipH - 8);
    ui.fillStyle = 'rgba(9,12,24,.98)'; ui.fillRect(x, y, tipW, tipH);
    ui.strokeStyle = synergyGradient(syn, x, y, tipW, tipH); ui.lineWidth = 2; ui.strokeRect(x, y, tipW, tipH);
    ui.fillStyle = synergyGradient(syn, x, y, tipW, 30); ui.fillRect(x, y, tipW, 30);
    ui.textAlign = 'left'; ui.fillStyle = '#10121c'; ui.font = 'bold 14px monospace'; ui.fillText('✦ ' + syn.name, x + 12, y + 20);
    ui.fillStyle = '#fff'; ui.font = '12px monospace'; ui.fillText('Pogoja: ' + synSources(syn).join(' + '), x + 12, y + 47);
    ui.fillStyle = '#dce3f7'; wrap('Učinek: ' + syn.desc, tipW - 24).slice(0, 2).forEach((line, i) => ui.fillText(line, x + 12, y + 69 + i * 16));
    ui.textAlign = 'center';
  }
}
function treeGroups() {
  return Object.keys(DIMENSIONS).map(key => ({
    key,
    traits: TRAITS.filter(t => t.dimension === key).sort((a, b) => traitTier(a) - traitTier(b)),
  }));
}
function drawTree() {
  ui.fillStyle = 'rgba(6,8,18,.96)'; ui.fillRect(0, 0, W, H);
  ui.textAlign = 'center'; ui.fillStyle = '#ffd54f'; ui.font = 'bold 30px monospace'; ui.fillText('RAZVOJNO DREVO', W / 2, 39);
  ui.fillStyle = '#c8d0e8'; ui.font = '12px monospace'; ui.fillText('Štiri smeri se prepletajo; svetli robovi so odklenjeni, zelena označuje izbrane, črtica levo nišo. Kolesce / ↑ ↓ za pomik.', W / 2, 63);
  const groups = treeGroups(), nodeTop = 110, rowHeight = 25, maxNodes = Math.max(...groups.map(g => g.traits.length));
  const contentBottom = nodeTop + maxNodes * rowHeight + 4;
  treeScroll = clamp(treeScroll, 0, Math.max(0, contentBottom - 488));
  treeNodeBoxes = [];
  ui.save(); ui.beginPath(); ui.rect(0, 78, W, 410); ui.clip();
  const positions = new Map();
  groups.forEach((g, col) => {
    const x = 10 + col * 237, width = 228;
    ui.fillStyle = 'rgba(22,27,44,.72)'; ui.fillRect(x, 82, width, 406);
    ui.strokeStyle = DIMENSIONS[g.key].color; ui.lineWidth = 1.5; ui.strokeRect(x, 82, width, 406);
    ui.textAlign = 'left'; ui.fillStyle = DIMENSIONS[g.key].color; ui.font = 'bold 11px monospace';
    ui.fillText(DIMENSIONS[g.key].name.toUpperCase(), x + 7, 100);
    g.traits.forEach((trait, index) => positions.set(trait.id, { trait, x: x + 6, y: nodeTop + index * rowHeight - treeScroll, w: width - 12, h: 20 }));
  });
  for (const trait of TRAITS) {
    const to = positions.get(trait.id);
    if (!to) continue;
    for (const requiredId of traitRequires(trait)) {
      const from = positions.get(requiredId);
      if (!from) continue;
      ui.beginPath();
      ui.moveTo(from.x + from.w / 2, from.y + from.h);
      ui.bezierCurveTo(from.x + from.w / 2, from.y + from.h + 12, to.x + to.w / 2, to.y - 12, to.x + to.w / 2, to.y);
      ui.strokeStyle = owned.has(requiredId) && owned.has(trait.id) ? '#9be15d' : 'rgba(178,190,216,.18)';
      ui.lineWidth = owned.has(requiredId) && owned.has(trait.id) ? 2 : 1;
      ui.stroke();
    }
  }
  for (const g of groups) for (const trait of g.traits) {
    const pos = positions.get(trait.id), state = traitState(trait, owned), acquired = state === 'owned', unlocked = state === 'open';
    ui.fillStyle = acquired ? '#31533c' : unlocked ? '#29344b' : '#171b2a';
    ui.fillRect(pos.x, pos.y, pos.w, pos.h);
    ui.strokeStyle = acquired ? '#9be15d' : unlocked ? DIMENSIONS[g.key].color : '#41485a'; ui.lineWidth = 1; ui.strokeRect(pos.x, pos.y, pos.w, pos.h);
    ui.fillStyle = NICHES[trait.niche].color; ui.fillRect(pos.x + 1, pos.y + 1, 3, pos.h - 2);
    ui.fillStyle = acquired ? '#c8ffc0' : unlocked ? '#e5e9f4' : '#778096';
    ui.font = '9px monospace'; ui.textAlign = 'left'; ui.fillText(trait.name, pos.x + 8, pos.y + 13);
    ui.textAlign = 'right'; ui.fillText(acquired ? '✓' : unlocked ? '○' : '·', pos.x + pos.w - 6, pos.y + 13);
    treeNodeBoxes.push({ trait, x: pos.x, y: pos.y, w: pos.w, h: pos.h });
  }
  ui.restore();
  ui.textAlign = 'center'; ui.fillStyle = '#7fd8ff'; ui.fillRect(386, 494, 188, 30);
  ui.strokeStyle = '#7fd8ff'; ui.strokeRect(386, 494, 188, 30);
  ui.fillStyle = '#10121c'; ui.font = 'bold 12px monospace'; ui.fillText('NAZAJ NA PREMOR (Esc)', 480, 513);
  if (treeHoverTrait) {
    const tipW = 360, tipH = 156;
    const x = clamp(mouse.x + 12, 8, W - tipW - 8), y = clamp(mouse.y + 12, 78, H - tipH - 38);
    ui.fillStyle = 'rgba(9,12,24,.98)'; ui.fillRect(x, y, tipW, tipH);
    ui.strokeStyle = NICHES[treeHoverTrait.niche].color; ui.lineWidth = 2; ui.strokeRect(x, y, tipW, tipH);
    ui.textAlign = 'left'; ui.fillStyle = NICHES[treeHoverTrait.niche].color; ui.font = 'bold 14px monospace'; ui.fillText(treeHoverTrait.name, x + 12, y + 22);
    ui.fillStyle = DIMENSIONS[treeHoverTrait.dimension].color; ui.font = '11px monospace';
    ui.fillText(`${DIMENSIONS[treeHoverTrait.dimension].name} · ${NICHES[treeHoverTrait.niche].name}`, x + 12, y + 42);
    ui.fillStyle = '#dce3f7'; ui.font = '11px monospace';
    wrap('Učinek: ' + treeHoverTrait.desc, tipW - 24).slice(0, 2).forEach((line, i) => ui.fillText(line, x + 12, y + 63 + i * 15));
    const requirements = traitRequires(treeHoverTrait).map(id => TRAIT_BY_ID[id].name);
    wrap('Pogoji: ' + (requirements.length ? requirements.join(' + ') : 'začetna prilagoditev'), tipW - 24).slice(0, 2)
      .forEach((line, i) => ui.fillText(line, x + 12, y + 98 + i * 15));
    const exclusions = treeHoverTrait.excludes || [];
    wrap('Nezdružljivo: ' + (exclusions.length ? exclusions.map(id => TRAIT_BY_ID[id].name).join(', ') : 'nič'), tipW - 24).slice(0, 1)
      .forEach((line, i) => ui.fillText(line, x + 12, y + 135 + i * 15));
    ui.textAlign = 'center';
  }
}
function drawSynergyCard() {
  const syn = synergyCards[synergyCardIndex];
  if (!syn) return;
  ui.fillStyle = 'rgba(6,8,18,.88)'; ui.fillRect(0, 0, W, H);
  ui.textAlign = 'center'; ui.fillStyle = NICHES.syn.color; ui.font = 'bold 17px monospace'; ui.fillText('SINERGIJA SAMODEJNO ODKLENJENA', W / 2, 145);
  ui.fillStyle = '#171b2c'; ui.fillRect(190, 170, 580, 230);
  ui.strokeStyle = synergyGradient(syn, 190, 170, 580, 230); ui.lineWidth = 4; ui.strokeRect(190, 170, 580, 230);
  ui.fillStyle = synergyGradient(syn, 190, 170, 580, 66); ui.fillRect(190, 170, 580, 66);
  ui.beginPath(); ui.arc(235, 203, 17, 0, Math.PI * 2); ui.fillStyle = synergyGradient(syn, 218, 186, 34, 34); ui.fill();
  ui.fillStyle = '#fff'; ui.font = 'bold 18px monospace'; ui.fillText('✦', 235, 209);
  ui.fillStyle = '#10121c'; ui.font = 'bold 28px monospace'; ui.fillText(syn.name, W / 2 + 20, 212);
  ui.fillStyle = '#c8d0e8'; ui.font = '15px monospace'; ui.fillText('Povezuje: ' + synSources(syn).join(' + '), W / 2, 275);
  ui.fillStyle = '#fff'; ui.font = 'bold 16px monospace'; ui.fillText('Učinek', W / 2, 318);
  ui.fillStyle = '#dce3f7'; wrap(syn.desc, 520).slice(0, 2).forEach((line, i) => ui.fillText(line, W / 2, 348 + i * 21));
  ui.fillStyle = '#9be15d'; ui.font = '14px monospace';
  ui.fillText(synergyCardIndex + 1 < synergyCards.length ? 'Pritisni Enter ali klikni za naslednjo sinergijo.' : 'Pritisni Enter ali klikni za nadaljevanje.', W / 2, 444);
}
function updateMenu() {
  if (mode === 'menu') {
    if (hit('ArrowLeft', 'KeyA')) setDifficulty(difficulty === 'challenge' ? 'hard' : difficulty === 'hard' ? 'easy' : 'challenge');
    if (hit('ArrowRight', 'KeyD')) setDifficulty(difficulty === 'easy' ? 'hard' : difficulty === 'hard' ? 'challenge' : 'easy');
    if (hit('Digit1', 'Numpad1')) setDifficulty('easy');
    if (hit('Digit2', 'Numpad2')) setDifficulty('hard');
    if (hit('Digit3', 'Numpad3')) setDifficulty('challenge');
    if (hit('KeyC') && savedGameExists()) loadSavedGame();
    if (hit('Enter', 'NumpadEnter', 'Space', 'KeyJ')) beginGame();
  }
  else if (mode === 'pause') {
    if (hit('KeyP', 'Escape', 'Enter')) resumeGame();
    else if (hit('KeyT')) { mode = 'tree'; treeScroll = 0; }
    else if (hit('KeyS')) saveGame();
  } else if (mode === 'tree') {
    if (hit('Escape', 'Backspace', 'KeyT')) mode = 'pause';
    else if (hit('ArrowDown')) treeScroll += 55;
    else if (hit('ArrowUp')) treeScroll = Math.max(0, treeScroll - 55);
  } else if (mode === 'synergy') {
    if (hit('Enter', 'Space', 'KeyJ')) advanceSynergyCard();
  }
}
function resumeGame() { mode = 'play'; Snd.music(room % 5 === 0 ? 'boss' : 'game', room); }
function pauseAction(index) {
  if (index === 0) resumeGame();
  else if (index === 1) { mode = 'tree'; treeScroll = 0; }
  else if (index === 2) saveGame();
  else if (index === 3) { saveBest(room - 1); toMenu(); }
}
function endRoom(boss) {
  mode = 'choose';
  if (player.hp <= stats.maxHp / 5 && !fruitTree && !fruitPending) fruitPending = true;
  player.vx = 0; player.atkT = 0; player.dashT = 0; player.hurtT = 0; player.haste = 0; player.bastion = 0; player.meteor = false; player.breathT = 0;
  clearObjects();
  Snd.play('clear'); Snd.music(boss ? 'boss' : 'game', room);
  if (saveBest(room) && room > 1) toast('Nov rekord: ' + room + '. stopnja!', 2.5);
  queue = difficulty === 'easy' ? (boss ? ['evo', 'evo', 'boss'] : ['evo', 'evo']) : (boss ? ['evo', 'boss'] : ['evo']);
  picksTotal = queue.length; picksDone = 0;
  nextChoice();
}
let picksTotal = 2, picksDone = 0;
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
  const previousSynergies = new Set(stats.synergies.map(y => y.id));
  if (opt.id.startsWith('g_')) extras[opt.id]++; else owned.add(opt.id);
  const old = stats.maxHp;
  stats = computeStats(owned, extras);
  const newlyUnlocked = stats.synergies.filter(y => !previousSynergies.has(y.id));
  player.hp = Math.min(stats.maxHp, player.hp + Math.max(0, stats.maxHp - old));
  player.shield = stats.shield;
  burst(player.x + 14, player.y + 18, NICHES[opt.niche].color, 30);
  shake = 4;
  Snd.play(opt.boss ? 'bossPick' : opt.syn ? 'syn' : 'pick');
  picksDone++;
  if (newlyUnlocked.length) {
    synergyCards = newlyUnlocked;
    synergyCardIndex = 0;
    mode = 'synergy';
    Snd.play('syn');
  } else nextChoice();
}
let synergyCardIndex = 0;
function advanceSynergyCard() {
  synergyCardIndex++;
  if (synergyCardIndex < synergyCards.length) return;
  synergyCards = [];
  mode = 'choose';
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
  pauseHover = mode === 'pause' && mouse.x >= 315 && mouse.x <= 645
    ? [108, 146, 184, 222].findIndex(y => mouse.y >= y && mouse.y <= y + 36) : -1;
  pauseSynHover = -1;
  if (mode === 'pause') stats.synergies.forEach((syn, i) => {
    const x = 56 + (i % 5) * 170, y = 316 + Math.floor(i / 5) * 37;
    if (mouse.x >= x && mouse.x <= x + 162 && mouse.y >= y && mouse.y <= y + 31) pauseSynHover = i;
  });
  treeHoverTrait = mode === 'tree'
    ? (treeNodeBoxes.find(box => box.y >= 78 && box.y + box.h <= 488 && mouse.x >= box.x && mouse.x <= box.x + box.w && mouse.y >= box.y && mouse.y <= box.y + box.h) || {}).trait || null
    : null;
});
uic.addEventListener('click', e => {
  const r = uic.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
  if (mode === 'menu') {
    if (mouse.y >= 190 && mouse.y <= 306) {
      if (mouse.x >= 55 && mouse.x <= 315) setDifficulty('easy');
      else if (mouse.x >= 350 && mouse.x <= 610) setDifficulty('hard');
      else if (mouse.x >= 645 && mouse.x <= 905) setDifficulty('challenge');
    } else if (mouse.y >= 412 && mouse.y <= 454 && savedGameExists()) loadSavedGame();
    else if (mouse.y >= 360 && mouse.y <= 407) beginGame();
    return;
  }
  if (mode === 'pause') {
    const index = [108, 146, 184, 222].findIndex(y => mouse.x >= 315 && mouse.x <= 645 && mouse.y >= y && mouse.y <= y + 36);
    if (index >= 0) pauseAction(index);
    return;
  }
  if (mode === 'tree') {
    if (mouse.y >= 494 && mouse.x >= 386 && mouse.x <= 574) mode = 'pause';
    return;
  }
  if (mode === 'synergy') { advanceSynergyCard(); return; }
  if (mode !== 'choose' || !choice || choiceCool > 0) return;
  const i = hoverIndex();
  if (i >= 0) pick(choice.options[i]);
});
uic.addEventListener('wheel', e => {
  if (mode !== 'tree') return;
  e.preventDefault();
  treeScroll = Math.max(0, treeScroll + Math.sign(e.deltaY) * 55);
}, { passive: false });
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
  const target = showcase() ? -0.5 + Math.sin(t * 0.9) * 0.55 : p.face > 0 ? -0.4 : Math.PI + 0.4;
  rig.model.rotation.y += angDiff(rig.model.rotation.y, target) * Math.min(1, dt * (showcase() ? 3 : 14));
  const speed = Math.abs(p.vx), mv = p.ground && speed > 30 ? 1 : 0;
  p.phase += dt * (6 + speed / 28) * (mv ? 1 : 0);
  const sw = Math.sin(p.phase);
  if (p.ground || showcase()) { rig.legs[0].rotation.z = sw * 0.8 * mv; rig.legs[1].rotation.z = -sw * 0.8 * mv; }
  else { rig.legs[0].rotation.z = 0.7; rig.legs[1].rotation.z = -0.4; }
  const atk = p.atkT > 0 ? 1 - p.atkT / 0.12 : -1;
  rig.arms.forEach((a, i) => {
    if (atk >= 0) a.rotation.z = -0.8 + 3.0 * Math.min(1, atk * (i ? 1.0 : 1.25));
    else a.rotation.z = (i ? -sw : sw) * 0.7 * mv + (p.ground || showcase() ? 0.1 : -0.5);
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
    const charging = e.kind === 'boss' && e.chargeT > 0.48;
    setGlow(rig, charging ? '#ffd24a' : e.chillT > 0 && !(e.flash > 0) && !(e.burnT > 0) ? '#8fd8ff' : e.burnT > 0 && !(e.flash > 0) ? '#ff6a1a' : e.poisT > 0 && !(e.flash > 0) ? '#b455d6' : '#ffffff',
      charging ? 1.15 : e.flash > 0 ? 0.9 : e.burnT > 0 ? 0.5 : e.chillT > 0 ? 0.4 : e.poisT > 0 ? 0.35 : 0);
    if (rig.weakpoint) rig.weakpoint.material.emissiveIntensity = 1.4 + 0.5 * Math.sin(t * 7 + e.t);
    if (e.kind === 'boss') rig.model.scale.setScalar(1.65 * (charging ? 1 + 0.04 * Math.sin(t * 22) : 1));
  }
  for (const b of shots.concat(pshots)) {
    if (!b.obj) {
      const mine = pshots.includes(b);
      b.obj = new THREE.Mesh(GEO.sph, glowMat(mine ? '#d06bf5' : b.color || '#c6ff00', 1.2));
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
  if (showcase()) { tx = pcx; ty = pcy + 0.2; tz = 6.3; lx = pcx; ly = pcy - 0.75; }
  else { tx = clamp(pcx, 12, WORLD_W / 40 - 12); ty = 6.9 + (pcy - 6.9) * 0.08; tz = 20; lx = tx; ly = ty; }
  const k = Math.min(1, dt * (showcase() ? 3 : 4));
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
function synergyGradient(syn, x, y, w, h) {
  const first = NICHES[TRAIT_BY_ID[syn.need[0]].niche].color;
  const second = NICHES[TRAIT_BY_ID[syn.need[1]].niche].color;
  const gr = ui.createLinearGradient(x, y + h, x + w, y);
  gr.addColorStop(0, first); gr.addColorStop(1, second);
  return gr;
}
function drawHUD() {
  ui.textAlign = 'right'; ui.font = '13px monospace'; ui.fillStyle = '#9be15d';
  ui.fillText(`Rekord: stopnja ${best.room}`, W - 16, 24);
  ui.fillStyle = '#7f8aa8'; ui.fillText('P – premor · M – zvok', W - 16, 42);
  ui.fillStyle = dayNightLevel > 0.5 ? '#b9c9ff' : '#ffe08a';
  ui.fillText(dayNightLevel > 0.5 ? 'NOČ' : 'DAN', W - 16, 60);
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
  if (toastT > 0 && mode === 'play') { ui.textAlign = 'center'; ui.font = '22px monospace'; ui.fillStyle = `rgba(255,255,255,${Math.min(1, toastT)})`; ui.fillText(toastText, W / 2, 120); ui.textAlign = 'left'; }
}
function drawChoose() {
  const gr = ui.createLinearGradient(0, 240, 0, H);
  gr.addColorStop(0, 'rgba(8,10,22,0)'); gr.addColorStop(0.35, 'rgba(8,10,22,.82)'); gr.addColorStop(1, 'rgba(8,10,22,.95)');
  ui.fillStyle = gr; ui.fillRect(0, 240, W, H - 240);
  const boss = choice.kind === 'boss';
  ui.textAlign = 'center'; ui.font = 'bold 26px monospace';
  ui.fillStyle = boss ? '#ffd54f' : '#fff';
  ui.fillText(boss ? 'NAGRADA ZA PORAZ ŠEFA – izberi eno' : `Stopnja ${room} je končana – izbira izboljšave (${picksDone + 1}/${picksTotal})`, W / 2, 44);
  ui.font = '13px monospace'; ui.fillStyle = '#aab';
  ui.fillText(boss ? 'Izberi eno posebno izboljšavo, ki jo lahko dobiš le po porazu šefa.' : 'Izbira lastnosti zapre sorodno vejo. Rožnata kartica je sinergija dveh že izbranih lastnosti.', W / 2, 66);
  ui.textAlign = 'left'; ui.font = '12px monospace';
  const inv = nicheInvest(owned);
  Object.keys(inv).forEach((k, i) => {
    const x = 530 + (i % 3) * 140, y = 92 + Math.floor(i / 3) * 20;
    ui.fillStyle = 'rgba(8,10,22,.6)'; ui.fillRect(x, y - 13, 132, 18);
    ui.fillStyle = NICHES[k].color; ui.fillRect(x, y - 13, 4, 18);
    ui.fillText(NICHES[k].name + (inv[k] ? ' ' + '●'.repeat(Math.min(5, inv[k])) : ''), x + 10, y);
  });
  const lin = lineage(owned);
  if (lin.length) { ui.fillStyle = 'rgba(8,10,22,.6)'; ui.fillRect(10, 150, 470, 12 + lin.length * 17); }
  lin.forEach((l, i) => { ui.fillStyle = NICHES[l.niche].color; ui.fillText(`${NICHES[l.niche].name}: ${l.text}`, 20, 166 + i * 17); });
  ui.fillStyle = 'rgba(8,10,22,.7)'; ui.fillRect(500, 148, 450, 96);
  ui.strokeStyle = '#59627a'; ui.lineWidth = 1; ui.strokeRect(500, 148, 450, 96);
  ui.textAlign = 'left'; ui.fillStyle = '#ffd54f'; ui.font = 'bold 12px monospace'; ui.fillText('STATISTIKA STVORA', 514, 166);
  ui.font = '12px monospace'; ui.fillStyle = '#dce3f7';
  const col1 = [`Zdravje: ${player.hp.toFixed(1)} / ${stats.maxHp}`, `Škoda: ${stats.dmg.toFixed(1)} · doseg: ${stats.reach}`,
    `Hitrost: ${Math.round(stats.speed)} · skok: ${Math.round(stats.jump)}`, `Zračni skoki: ${stats.airJumps} · bodice: ${stats.thorns}`];
  const col2 = [`Napadi: ${(1 / stats.atkCd).toFixed(1)} / s`, `Obnova: ${stats.regen.toFixed(1)} zdravja/s`,
    `Sunek: ${stats.dash ? 'da' : 'ne'} · bonus: ${stats.dashDmg.toFixed(1)}`, `Strup: ${stats.poison.toFixed(1)} · ogenj: ${stats.burn.toFixed(1)}`];
  col1.forEach((line, i) => ui.fillText(line, 514, 182 + i * 15));
  col2.forEach((line, i) => ui.fillText(line, 735, 182 + i * 15));
  choice.options.forEach((t, i) => {
    const r = cardRect(i), col = NICHES[t.niche].color, hv = i === choice.hover;
    ui.fillStyle = hv ? '#252a40' : '#171b2c'; ui.fillRect(r.x, r.y, r.w, r.h);
    ui.strokeStyle = col; ui.lineWidth = hv ? 3 : 1.5; ui.strokeRect(r.x, r.y, r.w, r.h);
    ui.fillStyle = t.syn ? synergyGradient(t, r.x, r.y, r.w, 26) : col; ui.fillRect(r.x, r.y, r.w, 26);
    ui.fillStyle = '#10121c'; ui.font = 'bold 12px monospace';
    const generic = t.id.startsWith('g_');
    if (t.syn) {
      ui.beginPath(); ui.arc(r.x + 14, r.y + 13, 9, 0, Math.PI * 2); ui.fillStyle = synergyGradient(t, r.x + 5, r.y + 4, 18, 18); ui.fill();
      ui.fillStyle = '#fff'; ui.fillText('✦', r.x + 14, r.y + 17);
    }
    ui.fillStyle = '#10121c';
    const category = t.syn ? 'SINERGIJA' : generic ? `${NICHES[t.niche].name.toUpperCase()} · SPLOŠNA`
      : `${NICHES[t.niche].name.toUpperCase()} · ${DIMENSIONS[t.dimension].short.toUpperCase()} · ${t.boss ? 'ŠEFOVSKA' : 'RAVEN ' + traitTier(t)}`;
    ui.fillText(category, r.x + (t.syn ? 28 : 8), r.y + 17);
    ui.textAlign = 'right'; ui.fillText(`[${i + 1}]`, r.x + r.w - 8, r.y + 17); ui.textAlign = 'left';
    ui.fillStyle = '#fff'; ui.font = 'bold 19px monospace'; ui.fillText(t.name, r.x + 10, r.y + 52);
    ui.font = '13px monospace'; ui.fillStyle = '#dde';
    if (t.syn) {
      ui.fillStyle = synergyGradient(t, r.x, r.y, r.w, r.h); ui.font = 'bold 12px monospace';
      wrap('Povezuje: ' + synSources(t).join(' + '), r.w - 20).slice(0, 2).forEach((l, k) => ui.fillText(l, r.x + 10, r.y + 72 + k * 15));
      ui.fillStyle = '#fff'; ui.font = '13px monospace'; ui.fillText('Učinek:', r.x + 10, r.y + 108);
      ui.fillStyle = '#dde'; wrap(t.desc, r.w - 20).slice(0, 3).forEach((l, k) => ui.fillText(l, r.x + 10, r.y + 124 + k * 16));
      return;
    }
    let y = r.y + 74;
    wrap(t.desc, r.w - 20).slice(0, 3).forEach(l => { ui.fillText(l, r.x + 10, y); y += 16; });
    ui.font = '11px monospace';
    y = Math.max(y + 4, r.y + 118);
    const hs = generic || t.boss ? [] : hintsSyn(t, owned);
    const opens = generic || t.boss ? [] : opensWhat(t), closes = generic ? [] : closesWhat(t, owned);
    ui.fillStyle = '#9fd3ff';
    wrap(opens.length ? '▶ Povezave: ' + opens.join(', ') : generic || t.boss ? '' : '▶ Konec razvojne poti', r.w - 20).slice(0, 2).forEach(l => { ui.fillText(l, r.x + 10, y); y += 14; });
    if (hs.length) { ui.fillStyle = NICHES.syn.color; wrap('★ Omogoči sinergijo: ' + hs.join(', '), r.w - 20).slice(0, 1).forEach(l => { ui.fillText(l, r.x + 10, y); y += 14; }); }
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
  if (mode === 'play') {
    dayCycleTime = (dayCycleTime + rawDt) % DAY_CYCLE_SECONDS;
    updateDayNight(rawDt);
    if (hit('KeyP', 'Escape')) { mode = 'pause'; saveNotice = ''; Snd.music('menu'); }
    else updatePlay(dt);
  }
  else if (mode === 'choose') updateChoose(rawDt); else updateMenu();
  for (const q of particles) { q.m.position.x += q.vx * rawDt; q.m.position.y += q.vy * rawDt; q.vy -= 20 * rawDt; q.life -= rawDt; q.m.rotation.x += 6 * rawDt; q.m.rotation.y += 5 * rawDt; }
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t += rawDt; b.l.material.opacity = 1 - b.t / 0.22; if (b.t > 0.22) { scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose(); bolts.splice(i, 1); } }
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
  if (player && mode !== 'menu') { drawHUD(); if (mode === 'choose' && choice) drawChoose(); }
  if (mode === 'menu') drawMenu();
  else if (mode === 'pause') drawPause();
  else if (mode === 'tree') drawTree();
  else if (mode === 'synergy') drawSynergyCard();
  for (const k in pressed) delete pressed[k];
  requestAnimationFrame(frame);
}
toMenu();
addEventListener('blur', () => { if (mode === 'play') { mode = 'pause'; saveNotice = ''; Snd.music('menu'); } });
requestAnimationFrame(frame);
