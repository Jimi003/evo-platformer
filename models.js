'use strict';
const GEO = {
  sph: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 6),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 7),
  taper: new THREE.CylinderGeometry(0.6, 1, 1, 7),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.12, 6, 24),
};
function mk(parent, geo, mat, p, s, r) {
  const m = new THREE.Mesh(geo, mat);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (s) m.scale.set(s[0], s[1], s[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = true;
  parent.add(m);
  return m;
}
// Stožec s podstavkom v točki p, ki kaže vzdolž lokalnega +Y (zasukan z r).
function spike(parent, mat, p, rad, len, r) {
  const g = new THREE.Group();
  g.position.set(p[0], p[1], p[2]);
  if (r) g.rotation.set(r[0], r[1], r[2]);
  parent.add(g);
  const m = new THREE.Mesh(GEO.cone, mat);
  m.scale.set(rad, len, rad);
  m.position.y = len / 2;
  m.castShadow = true;
  g.add(m);
  return g;
}
// Ud, ki visi navzdol od izhodišča.
function limb(parent, mat, len, rad) { return mk(parent, GEO.taper, mat, [0, -len / 2, 0], [rad, len, rad]); }
function stdMat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.7, metalness: 0.05 }, o || {})); }
function glowMat(c, i) { return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i === undefined ? 1 : i, flatShading: true }); }

function creatureColors(owned) {
  const inv = nicheInvest(owned);
  let tot = 0, sum = 0, r = 0, g = 0, b = 0, dom = null, best = 0;
  for (const n in inv) {
    const w = inv[n] * inv[n];
    sum += inv[n];
    if (inv[n] > best) { best = inv[n]; dom = n; }
    if (!w) continue;
    const c = new THREE.Color(NICHES[n].color);
    r += c.r * w; g += c.g * w; b += c.b * w; tot += w;
  }
  const body = new THREE.Color('#d9c45c');
  if (tot) body.lerp(new THREE.Color(r / tot, g / tot, b / tot), Math.min(0.95, 0.35 + 0.1 * sum));
  const accent = new THREE.Color(dom ? NICHES[dom].color : '#ffe08a');
  return {
    body, accent, dom,
    dark: body.clone().multiplyScalar(0.5),
    belly: body.clone().lerp(new THREE.Color('#fff4d6'), 0.55),
    armor: body.clone().multiplyScalar(0.42).lerp(new THREE.Color('#8e9aa6'), 0.4),
  };
}

function wingShape(size, mat, boneMat) {
  const holder = new THREE.Group();
  const pts = [[0, 0], [0.15, 0.7], [0.3, 0.38], [0.52, 0.56], [0.62, 0.28], [0.82, 0.18], [0.4, -0.12]];
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
  holder.add(m);
  for (const t of [pts[1], pts[3], pts[5]]) {
    const len = Math.hypot(t[0], t[1]);
    const b = new THREE.Mesh(GEO.cyl, boneMat);
    b.scale.set(0.018, len, 0.018);
    b.position.set(t[0] / 2, t[1] / 2, 0.005);
    b.rotation.z = Math.atan2(t[1], t[0]) - Math.PI / 2;
    holder.add(b);
  }
  holder.scale.setScalar(size);
  return holder;
}

// Zgradi lik iz množice izbranih lastnosti. Stopala so v y=0, lik gleda proti +X.
function buildCreature(owned) {
  const has = id => owned.has(id);
  const col = creatureColors(owned);
  const mats = [];
  const M = (c, o) => { const m = stdMat(c, o); mats.push(m); return m; };
  const bodyM = M(col.body), bellyM = M(col.belly), darkM = M(col.dark), boneM = M('#f3ecd8'), armorM = M(col.armor, { roughness: 0.4, metalness: 0.5 });
  const accM = glowMat(col.accent, 0.35);
  const goldM = glowMat('#ffcc33', 0.5);
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model);
  const rig = { root, model, mats, tail: [], glands: [] };

  const bulk = has('bulk') ? 1.12 : 1, thick = has('hide') ? 1.1 : 1, fatK = has('fat') ? 1.25 : 1;
  const L = 0.27 + (has('legs') ? 0.07 : 0) + (has('sprint') ? 0.05 : 0);
  const ty = L + 0.3;
  model.scale.setScalar(0.95 * bulk);

  // noge
  rig.legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(-0.02, L, side * 0.13);
    model.add(hip);
    limb(hip, bodyM, L, has('hops') ? 0.095 : 0.075);
    if (has('hops') || has('pounce')) mk(hip, GEO.sph, bodyM, [0.02, -L * 0.2, 0], [0.13, 0.15, 0.1]);
    mk(hip, GEO.box, darkM, [0.07, -L + 0.02, 0], [0.22, 0.06, 0.13]);
    const toes = has('pounce') ? 3 : has('claws') ? 2 : 0;
    for (let i = 0; i < toes; i++) spike(hip, boneM, [0.17, -L + 0.03, (i - (toes - 1) / 2) * 0.045], 0.022, has('pounce') ? 0.13 : 0.08, [0, 0, -1.6]);
    rig.legs.push(hip);
  }

  // rep
  const segs = 4 + (has('tail') ? 2 : 0) + (has('sprint') ? 1 : 0), segLen = 0.18;
  let tp = model, tpos = [-0.2, L + 0.2, 0];
  for (let i = 0; i < segs; i++) {
    const piv = new THREE.Group();
    piv.position.set(tpos[0], tpos[1], tpos[2]);
    tp.add(piv);
    const r = 0.11 * (1 - i / (segs + 1)) + 0.02;
    mk(piv, GEO.taper, bodyM, [-segLen / 2, 0, 0], [r, segLen, r], [0, 0, Math.PI / 2]);
    if (has('spikes') && i % 2 === 0) spike(piv, boneM, [-segLen / 2, r, 0], 0.03, has('barbed') ? 0.2 : 0.11, [0, 0, 0.3]);
    rig.tail.push(piv);
    tp = piv; tpos = [-segLen, 0, 0];
  }
  if (has('fangs')) spike(tp, accM, [-segLen, 0, 0], 0.035, 0.17, [0, 0, Math.PI / 2]);
  else if (has('barbed')) mk(tp, GEO.sph, boneM, [-segLen, 0, 0], [0.07, 0.07, 0.07]);

  // trup
  const torso = new THREE.Group();
  model.add(torso);
  rig.torso = torso;
  mk(torso, GEO.sph, bodyM, [0, ty, 0], [0.27 * thick, 0.31 * thick, 0.24 * thick], [0, 0, -0.15]);
  mk(torso, GEO.sph, bellyM, [0.1, ty - 0.05, 0], [0.2 * fatK, 0.24 * fatK, 0.2 * fatK], [0, 0, -0.15]);
  if (has('camo')) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) mk(torso, GEO.sph, darkM, [-0.12 + i * 0.1, ty + 0.05 - i * 0.02, side * 0.2], [0.03, 0.16, 0.05], [0, 0, -0.2]);
  if (has('bulk')) for (const side of [-1, 1]) mk(torso, GEO.sph, armorM, [0.05, ty + 0.25, side * 0.25], [0.12, 0.09, 0.1]);
  // hrbet: bodice, oklep, školjka, kužni mehurji
  if (has('carapace')) for (let i = 0; i < 4; i++) mk(torso, GEO.sph, armorM, [-0.2 - Math.sin(i * 0.5) * 0.04, ty + 0.2 - i * 0.12, 0], [0.08, 0.1, 0.22 - i * 0.015], [0, 0, 0.25]);
  if (has('shell')) mk(torso, GEO.sph, armorM, [-0.16, ty + 0.02, 0], [0.18, 0.36, 0.3], [0, 0, 0.15]);
  if (has('spikes')) for (let i = 0; i < (has('barbed') ? 6 : 4); i++) spike(torso, boneM, [-0.18 - i * 0.005, ty + 0.3 - i * 0.1, i % 2 ? 0.08 : -0.08], 0.04, has('barbed') ? 0.22 : 0.13, [0, 0, 1.2]);
  if (has('plague')) for (let i = 0; i < 4; i++) mk(torso, GEO.sph, glowMat('#9be15d', 0.5), [-0.22, ty + 0.15 - i * 0.1, (i % 2 ? 1 : -1) * 0.1], [0.06, 0.06, 0.06]);
  if (has('bossheart')) mk(torso, GEO.sph, goldM, [0.22, ty + 0.06, 0], [0.07, 0.07, 0.07]);
  if (has('alpha')) for (const side of [-1, 1]) spike(torso, goldM, [-0.05, ty + 0.1, side * 0.22], 0.03, 0.2, [side * 0.8, 0, 0.5]);
  if (has('phase') || has('dash')) for (const side of [-1, 1]) spike(torso, accM, [-0.22, ty - 0.1, side * 0.1], 0.04, 0.2, [0, 0, 1.4]);

  // roke
  rig.arms = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0.06, ty + 0.1, side * 0.25 * thick);
    torso.add(piv);
    const ar = 0.055 * (has('claws') ? 1.15 : 1) * (has('frenzy') ? 1.2 : 1) * (has('bulk') ? 1.15 : 1);
    limb(piv, bodyM, 0.34, ar);
    mk(piv, GEO.sph, darkM, [0, -0.34, 0], [has('rending') ? 0.11 : 0.085, 0.085, 0.085]);
    if (has('cracker')) mk(piv, GEO.cyl, goldM, [0, -0.18, 0], [ar * 1.5, 0.05, ar * 1.5]);
    const n = has('claws') ? (has('rending') ? 4 : 3) : 0, len = (has('rending') ? 0.2 : 0.13) + (has('cleave') ? 0.04 : 0);
    for (let i = 0; i < n; i++) spike(piv, boneM, [0.05, -0.36, (i - (n - 1) / 2) * 0.05], 0.03, len * 1.3, [0, 0, -1.9]);
    if (has('cleave')) spike(piv, boneM, [0, -0.15, 0], 0.035, 0.22, [0, 0, 1.8]);
    if (has('breaker')) mk(piv, GEO.sph, armorM, [0.03, -0.3, 0], [0.11, 0.1, 0.1]);
    piv.userData.side = side;
    rig.arms.push(piv);
  }

  // glava
  const head = new THREE.Group();
  head.position.set(0.2, ty + 0.38, 0);
  torso.add(head);
  rig.head = head;
  const hs = has('apex') ? 1.15 : 1;
  head.scale.setScalar(hs);
  mk(head, GEO.sph, bodyM, [0, 0, 0], [0.2, 0.19, 0.19]);
  mk(head, GEO.sph, bellyM, [0.17, -0.05, 0], [0.17, 0.09, 0.11]);
  const eyeBase = has('frenzy') ? glowMat('#ff2a2a', 1.2) : has('ambush') ? glowMat('#ffe14a', 0.9) : null;
  for (const side of [-1, 1]) {
    mk(head, GEO.sph, eyeBase || stdMat('#ffffff'), [0.1, 0.05, side * 0.11], [0.06, 0.06, 0.06]);
    mk(head, GEO.sph, new THREE.MeshBasicMaterial({ color: '#111' }), [0.15, 0.05, side * 0.115], [0.03, 0.035, 0.03]);
    if (has('hide')) mk(head, GEO.box, darkM, [0.1, 0.12, side * 0.1], [0.12, 0.03, 0.07], [side * 0.3, 0, 0]);
  }
  if (has('fangs')) for (const side of [-1, 1]) spike(head, boneM, [0.28, -0.07, side * 0.05], 0.022, has('glands') ? 0.12 : 0.08, [Math.PI, 0, 0]);
  if (has('apex')) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) spike(head, boneM, [0.2 + i * 0.045, -0.085, side * 0.075], 0.017, 0.06, [Math.PI, 0, 0]);
  if (has('horns')) {
    const hl = has('gore') ? 0.38 : has('ram') ? 0.27 : 0.17, hr = has('gore') ? 0.065 : has('ram') ? 0.055 : 0.04;
    for (const side of [-1, 1]) {
      const h = spike(head, boneM, [-0.02, 0.14, side * 0.1], hr, hl, [side * 0.35, 0, 0.45]);
      if (has('ram')) spike(h, boneM, [0, hl * 0.9, 0], hr * 0.55, hl * 0.5, [0, 0, -0.9]);
    }
    if (has('gore')) spike(head, boneM, [0.3, 0.0, 0], 0.045, 0.22, [0, 0, -Math.PI / 2]);
  }
  if (has('breaker')) { mk(head, GEO.sph, armorM, [0.03, 0.12, 0], [0.19, 0.08, 0.16]); for (let i = -1; i <= 1; i++) spike(head, armorM, [0.05, 0.17, i * 0.07], 0.03, 0.08); }
  if (has('glands')) for (const side of [-1, 1]) { const m = glowMat('#c24ff0', 0.7); rig.glands.push(m); mk(head, GEO.sph, m, [-0.08, -0.12, side * 0.15], [0.06, 0.06, 0.06]); }
  if (has('spit')) mk(head, GEO.sph, glowMat('#9be15d', 0.4), [0.05, -0.2, 0], [0.12, 0.1, 0.12]);
  if (['bossheart', 'cracker', 'alpha'].some(has)) for (let i = -1; i <= 1; i++) spike(head, goldM, [-0.06, 0.17, i * 0.07], 0.03, 0.16 - Math.abs(i) * 0.04, [0, 0, 0.3]);
  if (has('undying')) { const h = mk(head, GEO.torus, goldM, [0, 0.42, 0], [0.2, 0.2, 0.2], [Math.PI / 2, 0, 0]); h.castShadow = false; }

  // globlje veje in ogenj
  rig.flame = [];
  const fireM = glowMat('#ff8a2a', 0.9), emberM = glowMat('#ffd23a', 1.1);
  const flameAt = (parent, p, h, w, mat) => { const f = spike(parent, mat || fireM, p, w, h, [0, 0, 0]); f.children[0].castShadow = false; f.userData.h = h; f.children[0].userData.h = h; rig.flame.push(f.children[0]); return f; };
  if (has('ember')) for (let i = 0; i < 5; i++) mk(torso, GEO.sph, fireM, [-0.17, ty + 0.28 - i * 0.1, (i % 2 ? 1 : -1) * 0.1], [0.045, 0.045, 0.045]).castShadow = false;
  if (has('breath')) { rig.mouthGlow = mk(head, GEO.sph, glowMat('#ff7a1a', 0.7), [0.24, -0.06, 0], [0.08, 0.06, 0.1]); rig.mouthGlow.castShadow = false; }
  if (has('scorch')) for (let i = 0; i < 4; i++) flameAt(torso, [-0.2, ty + 0.3 - i * 0.12, 0], 0.2 - i * 0.02, 0.05);
  if (has('molten')) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) mk(torso, GEO.box, fireM, [0.0 - i * 0.06, ty + 0.15 - i * 0.12, side * 0.255], [0.14, 0.025, 0.02], [0, 0, 0.5 * side]).castShadow = false;
  if (has('inferno')) for (let i = -1; i <= 1; i++) flameAt(head, [-0.04, 0.17, i * 0.08], 0.28 - Math.abs(i) * 0.08, 0.05, emberM);
  if (has('magma')) for (const side of [-1, 1]) { mk(torso, GEO.sph, darkM, [0.02, ty + 0.3, side * 0.28], [0.15, 0.1, 0.12]); mk(torso, GEO.sph, fireM, [0.1, ty + 0.3, side * 0.3], [0.05, 0.04, 0.05]); }
  if (has('cinder')) for (let i = 0; i < 4; i++) mk(torso, GEO.sph, emberM, [-0.3 - i * 0.02, ty + 0.35 - i * 0.13, (i % 2 ? 1 : -1) * 0.16], [0.035, 0.035, 0.035]).castShadow = false;
  if (has('roar')) for (let i = 0; i < 7; i++) { const a = -1.1 + i * 0.37; spike(head, boneM, [-0.1, -0.05, 0], 0.03, 0.16, [0, 0, a + 1.57 + 1.2]); }
  if (has('trample')) for (let i = -1; i <= 1; i++) spike(head, armorM, [0.12, 0.17, i * 0.06], 0.035, 0.1, [0, 0, -0.6]);
  if (has('gale')) for (const side of [-1, 1]) spike(head, accM, [-0.08, 0.08, side * 0.18], 0.03, 0.26, [side * 0.9, 0, 1.9]);
  if (has('meteor')) for (const side of [-1, 1]) { mk(torso, GEO.sph, armorM, [0.05, ty + 0.2, side * 0.3], [0.13, 0.12, 0.12]); mk(torso, GEO.sph, fireM, [0.12, ty + 0.22, side * 0.34], [0.04, 0.04, 0.04]); }
  if (has('bastion')) for (let i = 0; i < 3; i++) mk(torso, GEO.box, glowMat('#9be15d', 0.45), [0.05, ty + 0.2 - i * 0.14, 0.27 * (i % 2 ? 1 : -1)], [0.16, 0.08, 0.04], [0, 0, 0.3]).castShadow = false;
  if (has('quills')) for (let i = 0; i < 7; i++) spike(torso, boneM, [-0.2, ty + 0.32 - i * 0.07, ((i % 3) - 1) * 0.1], 0.025, 0.3, [0, 0, 1.0 + (i % 3) * 0.12]);
  if (has('colossus')) for (const side of [-1, 1]) mk(torso, GEO.sph, armorM, [0.04, ty + 0.34, side * 0.3], [0.2, 0.13, 0.15]);
  if (has('miasma')) for (let i = 0; i < 6; i++) mk(torso, GEO.sph, glowMat('#c24ff0', 0.5), [-0.15 + (i % 3) * 0.1, ty + 0.1 - Math.floor(i / 3) * 0.2, (i % 2 ? 1 : -1) * 0.25], [0.06, 0.06, 0.06]).castShadow = false;
  if (has('epidemic')) for (let i = 0; i < 4; i++) mk(head, GEO.sph, glowMat('#9be15d', 0.7), [-0.05 + i * 0.06, 0.13 - (i % 2) * 0.05, (i % 2 ? 1 : -1) * 0.12], [0.045, 0.045, 0.045]).castShadow = false;
  if (has('neuro')) for (const side of [-1, 1]) mk(head, GEO.sph, glowMat('#e29bff', 0.9), [0.14, 0.04, side * 0.15], [0.025, 0.025, 0.025]);

  // krila
  rig.wings = [];
  if (has('wings')) {
    const size = has('flyer') ? 1.0 : 0.72;
    const wm = new THREE.MeshStandardMaterial({ color: col.accent, side: THREE.DoubleSide, transparent: true, opacity: 0.82, flatShading: true, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const piv = new THREE.Group();
      piv.position.set(-0.12, ty + 0.2, side * 0.12);
      piv.rotation.z = 0.35;
      torso.add(piv);
      const w = wingShape(size, wm, darkM);
      w.rotation.y = side * -(Math.PI / 2 + 0.9);
      piv.add(w);
      piv.userData.side = side;
      rig.wings.push(piv);
    }
  }
  // oblak strupa
  if (has('cloud')) {
    const orbit = new THREE.Group();
    orbit.position.y = ty;
    model.add(orbit);
    const cm = new THREE.MeshBasicMaterial({ color: '#c24ff0', transparent: true, opacity: 0.45, depthWrite: false });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mk(orbit, GEO.sph, cm, [Math.cos(a) * 0.5, Math.sin(i * 2) * 0.2, Math.sin(a) * 0.5], [0.07, 0.07, 0.07]).castShadow = false; }
    rig.orbit = orbit;
  }
  if (has('regen') || has('fat')) {
    rig.glow = mk(model, GEO.sph, new THREE.MeshBasicMaterial({ color: '#7cff6a', transparent: true, opacity: 0.12, depthWrite: false }), [0, ty, 0], [0.55, 0.62, 0.5]);
    rig.glow.castShadow = false;
    if (!has('regen')) rig.glow.visible = false;
  }
  return rig;
}

function setGlow(rig, hex, intensity) {
  for (const m of rig.mats) { m.emissive.set(hex); m.emissiveIntensity = intensity; }
}

// --- sovražniki ---
function buildEnemy(kind) {
  const mats = [];
  const M = (c, o) => { const m = stdMat(c, o); mats.push(m); return m; };
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model);
  const rig = { root, model, mats, legs: [], kind };
  const eye = (parent, p, r) => {
    mk(parent, GEO.sph, new THREE.MeshBasicMaterial({ color: '#fff' }), p, [r, r, r]);
    mk(parent, GEO.sph, new THREE.MeshBasicMaterial({ color: '#111' }), [p[0] + r * 0.6, p[1], p[2]], [r * 0.55, r * 0.6, r * 0.55]);
  };
  if (kind === 'walker') {
    const b = M('#8e6bd6'), d = M('#5b3fa3'), l = M('#c6b3f2');
    mk(model, GEO.sph, b, [0, 0.36, 0], [0.37, 0.3, 0.3]);
    mk(model, GEO.sph, l, [0.1, 0.3, 0], [0.28, 0.22, 0.25]);
    eye(model, [0.27, 0.46, 0.12], 0.07); eye(model, [0.27, 0.46, -0.12], 0.07);
    mk(model, GEO.box, d, [0.34, 0.3, 0], [0.04, 0.05, 0.2]);
    for (let i = 0; i < 3; i++) spike(model, d, [-0.1 + i * 0.12, 0.62 - Math.abs(i - 1) * 0.06, 0], 0.05, 0.14);
    for (const [x, z] of [[0.15, 0.15], [0.15, -0.15], [-0.15, 0.15], [-0.15, -0.15]]) {
      const p = new THREE.Group(); p.position.set(x, 0.18, z); model.add(p); limb(p, d, 0.18, 0.06); rig.legs.push(p);
    }
  } else if (kind === 'hopper') {
    const b = M('#ff8a50'), d = M('#c4551f'), l = M('#ffd1b0');
    mk(model, GEO.sph, b, [0, 0.34, 0], [0.3, 0.24, 0.26]);
    mk(model, GEO.sph, l, [0.1, 0.28, 0], [0.22, 0.16, 0.2]);
    eye(model, [0.14, 0.55, 0.12], 0.08); eye(model, [0.14, 0.55, -0.12], 0.08);
    for (const side of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(-0.1, 0.3, side * 0.2); model.add(p);
      mk(p, GEO.sph, d, [0, -0.05, 0], [0.12, 0.14, 0.09]); limb(p, d, 0.28, 0.06); mk(p, GEO.box, d, [0.08, -0.28, 0], [0.2, 0.04, 0.1]);
      rig.legs.push(p);
    }
    for (const side of [-1, 1]) { const p = new THREE.Group(); p.position.set(0.15, 0.2, side * 0.18); model.add(p); limb(p, d, 0.15, 0.04); }
  } else if (kind === 'spitter') {
    const b = M('#7cc242'), d = M('#3d7a1a'), s = glowMat('#d4ff4a', 0.8);
    mk(model, GEO.taper, b, [0, 0.27, 0], [0.12, 0.54, 0.12]);
    for (let i = 0; i < 4; i++) spike(model, d, [0, 0.02, 0], 0.07, 0.3, [Math.sin(i * 1.57) * 1.1, 0, Math.cos(i * 1.57) * 1.1]);
    const head = new THREE.Group(); head.position.set(0.04, 0.64, 0); model.add(head); rig.head = head;
    mk(head, GEO.sph, b, [0, 0, 0], [0.24, 0.22, 0.22]);
    mk(head, GEO.sph, M('#2a1a2e'), [0.15, -0.02, 0], [0.1, 0.12, 0.12]);
    eye(head, [0.1, 0.12, 0.13], 0.05); eye(head, [0.1, 0.12, -0.13], 0.05);
    for (let i = 0; i < 3; i++) mk(head, GEO.sph, d, [-0.05 + i * 0.07, 0.2, 0], [0.05, 0.05, 0.05]);
    rig.sac = mk(model, GEO.sph, s, [-0.15, 0.52, 0], [0.1, 0.1, 0.1]);
  } else { // armored | boss
    const boss = kind === 'boss';
    const b = M(boss ? '#8e2433' : '#78909c'), d = M(boss ? '#4a1018' : '#455a64', { metalness: 0.5, roughness: 0.4 }), l = M(boss ? '#c44a5a' : '#b0bec5');
    const core = glowMat('#ff3030', 1.1);
    mk(model, GEO.sph, b, [0, 0.42, 0], [0.46, 0.34, 0.4]);
    mk(model, GEO.sph, l, [0, 0.3, 0], [0.4, 0.2, 0.36]);
    for (let i = 0; i < 3; i++) mk(model, GEO.sph, d, [0.38 - i * 0.02, 0.62 - i * 0.2, 0], [0.12, 0.2, 0.34 - i * 0.04], [0, 0, 0.1]);
    mk(model, GEO.box, glowMat('#ffd24a', 0.9), [0.47, 0.5, 0], [0.02, 0.04, 0.22]);
    mk(model, GEO.sph, core, [-0.44, 0.45, 0], [0.12, 0.12, 0.12]);
    for (let i = 0; i < 4; i++) spike(model, d, [-0.4, 0.45, 0], 0.03, 0.1, [Math.cos(i * 1.57) * 1.0, 0, Math.sin(i * 1.57) * 1.0 + 1.57]);
    for (const [x, z] of [[0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2]]) {
      const p = new THREE.Group(); p.position.set(x, 0.22, z); model.add(p); limb(p, d, 0.22, 0.09); rig.legs.push(p);
    }
    if (boss) {
      for (const side of [-1, 1]) spike(model, M('#e8dcc8'), [0.2, 0.7, side * 0.18], 0.07, 0.4, [side * 0.4, 0, 0.5]);
      for (let i = 0; i < 5; i++) spike(model, d, [-0.25 + i * 0.1, 0.72, 0], 0.05, 0.18);
      model.scale.setScalar(1.65);
    }
  }
  return rig;
}
