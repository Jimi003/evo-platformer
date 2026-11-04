'use strict';
const GEO = {
  sph: new THREE.IcosahedronGeometry(1, 1),
  creatureBody: new THREE.SphereGeometry(1, 18, 14),
  ico: new THREE.IcosahedronGeometry(1, 0),
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
  // končne veje (brez naslednikov) barvo niše izrazito poudarijo
  for (const t of TRAITS) if (owned.has(t.id) && inv[t.niche] !== undefined && !TRAITS.some(x => x.parent === t.id)) inv[t.niche] += 4 + traitTier(t) * 2;
  let tot = 0, sum = 0, r = 0, g = 0, b = 0, dom = null, best = 0;
  for (const n in inv) {
    const w = inv[n] * inv[n] * inv[n];
    sum += inv[n];
    if (inv[n] > best) { best = inv[n]; dom = n; }
    if (!w) continue;
    const c = new THREE.Color(NICHES[n].color);
    r += c.r * w; g += c.g * w; b += c.b * w; tot += w;
  }
  const body = new THREE.Color('#8fdc8a');
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
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(0.02, 0.42, 0.15, 0.7);
  sh.quadraticCurveTo(0.22, 0.48, 0.3, 0.38);
  sh.quadraticCurveTo(0.42, 0.63, 0.52, 0.56);
  sh.quadraticCurveTo(0.62, 0.43, 0.62, 0.28);
  sh.quadraticCurveTo(0.75, 0.34, 0.82, 0.18);
  sh.quadraticCurveTo(0.62, 0.08, 0.4, -0.12);
  sh.quadraticCurveTo(0.16, -0.08, 0, 0);
  const pts = [[0.15, 0.7], [0.3, 0.38], [0.52, 0.56], [0.62, 0.28], [0.82, 0.18]];
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
  holder.add(m);
  for (const t of [pts[0], pts[2], pts[4]]) {
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
  const bodyM = M(col.body, { flatShading: false, roughness: 0.52 }), bellyM = M(col.belly, { flatShading: false, roughness: 0.52 });
  const darkM = M(col.dark), boneM = M('#f3ecd8'), armorM = M(col.armor, { roughness: 0.4, metalness: 0.5 });
  const featherM = M(col.body.clone().lerp(new THREE.Color('#fff5dc'), 0.72));
  const featherShadeM = M(col.accent.clone().lerp(new THREE.Color('#ffffff'), 0.32));
  const eyeWhiteM = M('#fffef6', { roughness: 0.24 });
  const pupilM = M('#11131c', { roughness: 0.22 });
  const eyeShineM = M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.18, roughness: 0.1 });
  const accM = glowMat(col.accent, 0.35);
  const goldM = glowMat('#ffcc33', 0.5);
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model);
  const rig = { root, model, mats, tail: [], glands: [] };

  // Skupna osnova je podolgovato, členjeno črvasto telo; niša določi odraslo anatomijo.
  const nTraits = [...owned].filter(id => TRAIT_BY_ID[id] && !TRAIT_BY_ID[id].boss).length;
  const invest = nicheInvest(owned);
  const primaryNiche = dominantNiche(owned);
  const bodyPlan = NICHE_BODY_PLANS[primaryNiche];
  const bodyPlans = new Set(bodyPlan ? [bodyPlan] : []);
  const bodyPlanGrowth = primaryNiche ? Math.min(1, 0.22 + invest[primaryNiche] / 10 * 0.78) : 0;
  const growthForPlan = plan => plan === bodyPlan ? bodyPlanGrowth : 0;
  const swiftGrowth = Math.min(1, invest.swift / 8), predatorGrowth = Math.min(1, invest.predator / 8);
  const legGrowth = Math.min(1, (invest.swift * 0.6 + invest.predator * 0.4) / 8);
  const venomGrowth = Math.min(1, invest.venom / 8), airGrowth = Math.min(1, invest.air / 8);
  const headGrowth = Math.min(1, Math.max(0, nTraits - 1) / 7);
  const manyLegs = has('manylegs');
  const quad = manyLegs || ['legs', 'alpha', 'bulk', 'carapace', 'spikes', 'stonehide', 'ironbloom'].some(has)
    || has('horns') && !has('claws');
  const legsOn = quad;
  const armsOn = ['claws', 'pincers', 'tentacle', 'vines'].some(has);
  const tailOn = ['tail', 'fins', 'flyer', 'stinger'].some(has) || has('feathers') && airGrowth >= 0.25
    || bodyPlans.has('chordate');
  const defenseGrowth = Math.min(1, invest.bulwark / 8);
  const bulk = 1 + defenseGrowth * 0.08 + (has('bulk') ? 0.06 : 0);
  const thick = 1 + defenseGrowth * 0.06, fatK = 1 + defenseGrowth * 0.1 + (has('fat') ? 0.08 : 0);
  const L = legsOn ? 0.15 + legGrowth * 0.28 + (has('sprint') ? 0.04 : 0) : 0;
  const lengthScale = bodyPlan === 'nematode' ? 1.3 + bodyPlanGrowth * 0.16
    : bodyPlan === 'flatworm' || bodyPlan === 'annelid' ? 1.22 + bodyPlanGrowth * 0.12
      : bodyPlan === 'drake' ? 1.2 + bodyPlanGrowth * 0.1
        : bodyPlan === 'arthropod' || bodyPlan === 'chordate' || bodyPlan === 'avian' ? 1.08 + bodyPlanGrowth * 0.08
          : 1;
  const heightScale = bodyPlan === 'nematode' ? 0.76 : bodyPlan === 'flatworm' ? 0.72
    : bodyPlan === 'annelid' ? 0.84 : bodyPlan === 'mollusk' || bodyPlan === 'echinoderm' ? 1.12
      : bodyPlan === 'avian' ? 0.92 : 1;
  const tr = [(0.55 - headGrowth * 0.05) * lengthScale, (0.2 - headGrowth * 0.015) * heightScale, 0.23 - headGrowth * 0.045];
  const ty = L + 0.31 - headGrowth * 0.025;
  model.scale.setScalar(0.95 * bulk);

  // noge (skupine obstajajo vedno zaradi animacije, mreže le če imaš noge)
  rig.legs = [];
  const legPoints = legsOn
    ? manyLegs ? [[-0.24, -1], [-0.24, 1], [0, -1], [0, 1], [0.24, -1], [0.24, 1]]
      : [[-0.2, -1], [-0.2, 1], [0.18, -1], [0.18, 1]]
    : [];
  for (const [x, side] of legPoints) {
    const hip = new THREE.Group();
    hip.position.set(x, L, side * 0.13);
    model.add(hip);
    if (legsOn) {
      limb(hip, bodyM, L, has('hops') ? 0.095 : quad ? 0.085 : 0.075);
      mk(hip, GEO.creatureBody, bodyM, [0, -L * 0.48, 0], [0.07, 0.075, 0.07]);
      if (has('hops') || has('pounce')) mk(hip, GEO.sph, bodyM, [0.02, -L * 0.2, 0], [0.13, 0.15, 0.1]);
      mk(hip, GEO.creatureBody, darkM, [0.07, -L + 0.02, 0], [0.14 + legGrowth * 0.03, 0.06, 0.09]);
      const toes = has('pounce') || has('alpha') ? 3 : has('claws') ? 2 : 0;
      for (let i = 0; i < toes; i++) spike(hip, boneM, [0.17, -L + 0.03, (i - (toes - 1) / 2) * 0.045], 0.022, has('pounce') ? 0.13 : 0.08, [0, 0, -1.6]);
    }
    rig.legs.push(hip);
  }

  // rep
  const segs = tailOn ? 1 + Math.floor(swiftGrowth * 4) + (has('tail') ? 1 : 0) + (has('sprint') ? 1 : 0) : 0;
  const segLen = 0.12 + swiftGrowth * 0.07;
  let tp = model, tpos = [-0.2, L + 0.2, 0];
  for (let i = 0; i < segs; i++) {
    const piv = new THREE.Group();
    piv.position.set(tpos[0], tpos[1], tpos[2]);
    if (has('stinger')) piv.rotation.z = -0.17;
    tp.add(piv);
    const r = 0.11 * (1 - i / (segs + 1)) + 0.02;
    mk(piv, GEO.taper, bodyM, [-segLen / 2, 0, 0], [r, segLen, r], [0, 0, Math.PI / 2]);
    if (has('spikes') && i % 2 === 0) spike(piv, boneM, [-segLen / 2, r, 0], 0.03, has('barbed') ? 0.2 : 0.11, [0, 0, 0.3]);
    rig.tail.push(piv);
    tp = piv; tpos = [-segLen, 0, 0];
  }
  if (has('stinger')) spike(tp, glowMat('#b455d6', 0.75), [-segLen, 0, 0], 0.045, 0.24, [0, 0, 0]);
  else if (has('fangs')) spike(tp, accM, [-segLen, 0, 0], 0.035, 0.17, [0, 0, Math.PI / 2]);
  else if (has('barbed')) mk(tp, GEO.sph, boneM, [-segLen, 0, 0], [0.07, 0.07, 0.07]);
  if (tailOn && has('feathers') && airGrowth >= 0.2) {
    const n = 2 + Math.floor(airGrowth * 8);
    for (let i = 0; i < n; i++) spike(tp, featherM, [-segLen * 0.9, (i - (n - 1) / 2) * 0.035, 0], 0.025, 0.14 + airGrowth * 0.06, [0, 0, Math.PI / 2]);
  }

  // trup
  const torso = new THREE.Group();
  model.add(torso);
  rig.torso = torso;
  mk(torso, GEO.creatureBody, bodyM, [-0.025, ty, 0], [tr[0] * thick, tr[1] * thick, tr[2] * thick], [0, 0, -headGrowth * 0.1]);
  mk(torso, GEO.creatureBody, bellyM, [0.02, ty - 0.13, 0], [0.43 * fatK, 0.075 * fatK, 0.23 * fatK], [0, 0, -0.04]);
  rig.bodySegments = [];
  for (let i = 0; i < 4; i++) {
    const segment = new THREE.Group();
    segment.position.set(-0.32 + i * 0.16, ty - 0.025, 0);
    segment.userData.baseY = segment.position.y;
    torso.add(segment);
    mk(segment, GEO.creatureBody, i % 2 ? bodyM : bellyM, [0, 0, 0], [0.13, 0.16, 0.205]);
    const grooveM = bodyPlan === 'arthropod' || bodyPlan === 'echinoderm' ? armorM : darkM;
    for (const side of [-1, 1]) mk(segment, GEO.creatureBody, grooveM, [0.015, 0, side * 0.145], [0.022, 0.135, 0.022]);
    rig.bodySegments.push(segment);
  }
  mk(torso, GEO.sph, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45 }), [-0.08, ty + tr[1] * 0.72, 0.12], [0.07, 0.04, 0.05], [0, 0, 0.3]).castShadow = false;
  if (has('camo')) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) mk(torso, GEO.sph, darkM, [-0.12 + i * 0.1, ty + 0.05 - i * 0.02, side * 0.2], [0.03, 0.16, 0.05], [0, 0, -0.2]);
  if (has('bulk')) for (const side of [-1, 1]) mk(torso, GEO.sph, armorM, [0.05, ty + 0.25, side * 0.25], [0.12, 0.09, 0.1]);
  if (has('hide')) for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    mk(torso, GEO.sph, i % 2 ? darkM : armorM, [-0.24 + i * 0.13, ty + 0.16 - (i % 2) * 0.12, side * (tr[2] * 0.82)],
      [0.085, 0.065, 0.035], [0, 0, (i % 2 ? 1 : -1) * 0.18]);
  }
  if (has('cracker')) for (const side of [-1, 1]) {
    mk(torso, GEO.box, armorM, [0.12, ty - 0.02, side * 0.26], [0.14, 0.16, 0.08], [0, 0, 0.25]);
    spike(torso, glowMat('#ffd24a', 1.1), [0.2, ty - 0.02, side * 0.29], 0.025, 0.18, [side * 0.6, 0, -1.1]);
  }
  // hrbet: bodice, oklep, školjka, kužni mehurji
  if (has('carapace')) for (let i = 0; i < 1 + Math.floor(defenseGrowth * 4); i++) mk(torso, GEO.sph, armorM, [-0.2 - Math.sin(i * 0.5) * 0.04, ty + 0.2 - i * 0.12, 0], [0.08, 0.1, 0.22 - i * 0.015], [0, 0, 0.25]);
  if (has('shell')) mk(torso, GEO.sph, armorM, [-0.16, ty + 0.02, 0], [0.18, 0.36, 0.3], [0, 0, 0.15]);
  if (has('curl')) {
    mk(torso, GEO.sph, armorM, [-0.12, ty + 0.05, 0], [0.24, 0.3, 0.32], [0, 0, 0.12]);
    for (const side of [-1, 1]) mk(torso, GEO.sph, accM, [-0.1, ty + 0.07, side * 0.26], [0.12, 0.15, 0.05]);
  }
  if (has('spikes')) for (let i = 0; i < (has('barbed') ? 6 : 4); i++) spike(torso, boneM, [-0.18 - i * 0.005, ty + 0.3 - i * 0.1, i % 2 ? 0.08 : -0.08], 0.04, has('barbed') ? 0.22 : 0.13, [0, 0, 1.2]);
  if (has('plague')) for (let i = 0; i < 4; i++) mk(torso, GEO.sph, glowMat('#9be15d', 0.5), [-0.22, ty + 0.15 - i * 0.1, (i % 2 ? 1 : -1) * 0.1], [0.06, 0.06, 0.06]);
  if (has('bossheart')) {
    mk(torso, GEO.sph, goldM, [0.12, ty + 0.02, 0], [0.25, 0.21, 0.27]);
    mk(torso, GEO.sph, glowMat('#fff0a0', 0.8), [0.2, ty + 0.02, 0], [0.08, 0.09, 0.1]);
  }
  if (has('alpha')) for (const side of [-1, 1]) {
    spike(torso, goldM, [-0.05, ty + 0.1, side * 0.22], 0.04, 0.25, [side * 0.8, 0, 0.5]);
    spike(torso, boneM, [0.08, ty - 0.12, side * 0.2], 0.035, 0.16, [side * 0.2, 0, -1.7]);
  }
  if (has('phase') || has('dash')) for (const side of [-1, 1]) spike(torso, accM, [-0.22, ty - 0.1, side * 0.1], 0.04, 0.2, [0, 0, 1.4]);

  // roke
  rig.arms = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0.06, ty + 0.1, side * (0.33 - headGrowth * 0.06) * thick);
    torso.add(piv);
    if (armsOn) {
      const armLen = 0.16 + predatorGrowth * 0.3;
      const ar = (0.045 + predatorGrowth * 0.02) * (has('claws') ? 1.1 : 1) * (has('frenzy') ? 1.1 : 1) * (has('bulk') ? 1.08 : 1);
      const leafM = M('#3fae4f'), armM = has('vines') && !has('claws') ? leafM : bodyM;
      mk(piv, GEO.creatureBody, armM, [0, -0.03, 0], [ar * 1.55, ar * 1.5, ar * 1.55]);
      limb(piv, armM, armLen, ar);
      mk(piv, GEO.creatureBody, armM, [0.02, -armLen, 0], [has('rending') ? 0.12 : 0.095, 0.09, 0.095]);
      if (has('tentacle')) for (let i = 0; i < 3; i++) mk(piv, GEO.sph, bellyM, [0.05, -0.1 - i * 0.08, 0], [0.035, 0.035, 0.035]);
      if (has('thornvine')) for (let i = 0; i < 3; i++) spike(piv, boneM, [0.04, -0.08 - i * 0.09, 0.03], 0.02, 0.08, [0.6, 0, -1.2]);
      if (has('feathers')) for (let i = 0; i < 2 + Math.floor(airGrowth * 5); i++) spike(piv, featherM, [-0.04, -0.1 - i * 0.08, 0], 0.025, 0.14 + airGrowth * 0.06, [0, 0, 2.3]);
      if (has('cracker')) mk(piv, GEO.cyl, goldM, [0, -0.18, 0], [ar * 1.5, 0.05, ar * 1.5]);
      const n = has('claws') ? (has('rending') ? 4 : 3) : 0, len = (has('rending') ? 0.2 : 0.13) + (has('cleave') ? 0.04 : 0);
      for (let i = 0; i < n; i++) spike(piv, boneM, [0.05, -armLen - 0.02, (i - (n - 1) / 2) * 0.05], 0.03, len * 1.3, [0, 0, -1.9]);
      if (has('cleave')) spike(piv, boneM, [0, -0.15, 0], 0.035, 0.22, [0, 0, 1.8]);
      if (has('breaker')) mk(piv, GEO.sph, armorM, [0.03, -0.3, 0], [0.11, 0.1, 0.1]);
      if (has('cracker')) {
        for (let i = -1; i <= 1; i++) spike(piv, glowMat('#ffd24a', 1.2), [0.05, -armLen - 0.05, i * 0.04], 0.018, 0.16, [0, 0, -1.5]);
      }
      if (has('pincers')) for (const side of [-1, 1]) {
        const clawRoot = [0.11, -armLen - 0.015, side * 0.04];
        mk(piv, GEO.sph, armorM, clawRoot, [0.075, 0.06, 0.075]);
        spike(piv, boneM, [clawRoot[0] + 0.02, clawRoot[1] + 0.035, side * 0.075], 0.026, 0.18, [0, side * 0.28, -1.25]);
        spike(piv, boneM, [clawRoot[0] + 0.025, clawRoot[1] - 0.035, side * 0.075], 0.022, 0.15, [0, -side * 0.22, -1.82]);
      }
    }
    piv.userData.side = side;
    rig.arms.push(piv);
  }

  // glava (pri slimeu le izboklina z obrazom)
  const head = new THREE.Group();
  head.position.set(0.2, ty + 0.13 + headGrowth * 0.25, 0);
  torso.add(head);
  rig.head = head;
  const hs = (0.88 + headGrowth * 0.12) * (has('apex') ? 1.1 : 1);
  head.scale.setScalar(hs);
  mk(head, GEO.creatureBody, bodyM, [0, 0, 0], [0.2, 0.19, 0.19]);
  mk(head, GEO.creatureBody, bellyM, [0.17, -0.05, 0], [0.17, 0.09, 0.11]);
  mk(head, GEO.creatureBody, darkM, [0.22, -0.105, 0], [0.055, 0.014, 0.035]);
  const eyeBase = has('frenzy') ? glowMat('#ff2a2a', 1.2) : has('ambush') ? glowMat('#ffe14a', 0.9) : eyeWhiteM;
  for (const side of [-1, 1]) {
    mk(head, GEO.creatureBody, darkM, [0.08, 0.055, side * 0.115], [0.085, 0.09, 0.075]);
    mk(head, GEO.creatureBody, eyeBase, [0.12, 0.06, side * 0.15], [0.06, 0.065, 0.055]);
    mk(head, GEO.creatureBody, featherShadeM, [0.166, 0.06, side * 0.16], [0.034, 0.04, 0.034]);
    mk(head, GEO.creatureBody, pupilM, [0.19, 0.058, side * 0.164], [0.018, 0.027, 0.02]);
    mk(head, GEO.sph, eyeShineM, [0.2, 0.077, side * 0.15], [0.012, 0.013, 0.012]).castShadow = false;
    if (has('hide')) mk(head, GEO.box, darkM, [0.1, 0.12, side * 0.1], [0.12, 0.03, 0.07], [side * 0.3, 0, 0]);
  }
  if (!bodyPlan) for (const side of [-1, 1]) {
    const stalk = mk(head, GEO.taper, bodyM, [-0.08, 0.18, side * 0.075], [0.028, 0.2, 0.028], [side * 0.12, 0, -0.12]);
    mk(head, GEO.sph, eyeWhiteM, [-0.08, 0.29, side * 0.075], [0.045, 0.045, 0.045]);
    mk(head, GEO.sph, pupilM, [-0.045, 0.295, side * 0.075], [0.018, 0.024, 0.018]);
    stalk.castShadow = false;
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
  if (has('glands')) {
    const glandM = glowMat('#c24ff0', 0.7), glandCount = 2 + Math.floor(venomGrowth * 4);
    rig.glands.push(glandM);
    for (let i = 0; i < glandCount; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      mk(head, GEO.sph, glandM, [-0.08 - row * 0.035, -0.12 + row * 0.08, side * (0.15 + row * 0.015)], [0.05 + venomGrowth * 0.02, 0.05 + venomGrowth * 0.02, 0.05 + venomGrowth * 0.02]);
    }
  }
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
  if (has('quills')) for (let i = 0; i < 7; i++) spike(torso, boneM, [-0.2, ty + 0.32 - i * 0.07, ((i % 3) - 1) * 0.1], 0.025, 0.3, [0, 0, 1.0 + (i % 3) * 0.12]);
  if (has('colossus')) for (const side of [-1, 1]) mk(torso, GEO.sph, armorM, [0.04, ty + 0.34, side * 0.3], [0.2, 0.13, 0.15]);
  if (has('miasma')) for (let i = 0; i < 6; i++) mk(torso, GEO.sph, glowMat('#c24ff0', 0.5), [-0.15 + (i % 3) * 0.1, ty + 0.1 - Math.floor(i / 3) * 0.2, (i % 2 ? 1 : -1) * 0.25], [0.06, 0.06, 0.06]).castShadow = false;
  if (has('epidemic')) for (let i = 0; i < 4; i++) mk(head, GEO.sph, glowMat('#9be15d', 0.7), [-0.05 + i * 0.06, 0.13 - (i % 2) * 0.05, (i % 2 ? 1 : -1) * 0.12], [0.045, 0.045, 0.045]).castShadow = false;
  if (has('neuro')) for (const side of [-1, 1]) mk(head, GEO.sph, glowMat('#e29bff', 0.9), [0.14, 0.04, side * 0.15], [0.025, 0.025, 0.025]);
  if (has('heartroot')) {
    const rootM = M('#7a5230');
    mk(torso, GEO.sph, glowMat('#aaff62', 0.7), [0.18, ty + 0.04, 0.24], [0.085, 0.1, 0.05]);
    for (const side of [-1, 1]) spike(torso, rootM, [-0.12, ty + 0.05, side * 0.27], 0.025, 0.24, [side * 0.6, 0, 0.7]);
  }
  if (has('tidalheart')) for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) mk(torso, GEO.creatureBody, accM, [-0.08 - i * 0.07, ty + 0.02, side * (tr[2] * 0.9)], [0.035, 0.09, 0.025], [0, 0, -0.25]);
  }
  if (has('skyshroud')) for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) spike(torso, i % 2 ? featherM : featherShadeM, [-0.18, ty + 0.12 - i * 0.08, side * 0.2], 0.03, 0.22, [side * 0.8, 0, 1.8]);
  }
  if (has('worldfang')) for (const side of [-1, 1]) spike(head, boneM, [0.2, -0.04, side * 0.12], 0.035, 0.17, [Math.PI, 0, 0]);
  if (has('ironbloom')) for (const side of [-1, 1]) {
    mk(torso, GEO.creatureBody, armorM, [-0.12, ty + 0.18, side * 0.25], [0.14, 0.12, 0.08]);
    spike(torso, goldM, [-0.1, ty + 0.3, side * 0.26], 0.03, 0.16, [side * 0.4, 0, 0.3]);
  }
  if (has('ancientspore')) for (let i = 0; i < 5; i++) {
    const side = i % 2 ? 1 : -1;
    mk(torso, GEO.sph, glowMat('#c8ff9a', 0.8), [-0.2 + i * 0.08, ty + 0.18 + (i % 3) * 0.07, side * 0.25], [0.035, 0.035, 0.035]).castShadow = false;
  }

  // voda, kopno, zrak
  const iceM = glowMat('#bfeaff', 0.35), waterM = new THREE.MeshStandardMaterial({ color: '#3b7bff', transparent: true, opacity: 0.55, flatShading: true });
  const leafG = M('#3fae4f'), barkM = M('#7a5230'), petalM = glowMat('#ff7ab8', 0.5), sparkM = glowMat('#fff35a', 1.3), cloudM = M('#6d7488');
  const soft = m => { m.castShadow = false; return m; };
  if (has('gel')) for (let i = 0; i < 5; i++) soft(mk(torso, GEO.sph, waterM, [0.05 - i * 0.07, ty + 0.2 - (i % 3) * 0.14, (i % 2 ? 1 : -1) * (tr[2] * 0.85)], [0.06, 0.06, 0.06]));
  if (has('fins')) {
    for (const side of [-1, 1]) spike(torso, accM, [0, ty - 0.02, side * (tr[2] * 0.95)], 0.12, 0.28, [side * 1.2, 0, 0]).scale.z = 0.25;
    spike(torso, accM, [-0.05, ty + tr[1] * 0.85, 0], 0.1, 0.3, [0, 0, 0.35]).scale.z = 0.25;
  }
  if (has('frost')) for (const side of [-1, 1]) spike(torso, iceM, [0.05, ty + tr[1] * 0.8, side * 0.2], 0.06, 0.22, [side * 0.4, 0, 0.15]);
  if (has('torrent')) soft(mk(model, GEO.torus, waterM, [0, ty - 0.2, 0], [0.55, 0.55, 0.55], [Math.PI / 2, 0, 0]));
  if (has('iceshell')) for (let i = 0; i < 4; i++) mk(torso, GEO.sph, iceM, [-tr[0] * 0.8, ty + 0.2 - i * 0.12, 0], [0.09, 0.1, 0.22 - i * 0.015], [0, 0, 0.25]);
  if (has('blizzard')) for (let i = -1; i <= 1; i++) spike(head, iceM, [0, 0.17, i * 0.08], 0.035, 0.2 - Math.abs(i) * 0.06, [i * 0.3, 0, 0]);
  if (has('permafrost')) for (let i = 0; i < 3; i++) spike(torso, iceM, [-0.12 - i * 0.04, ty + tr[1] * 0.7 - i * 0.08, (i - 1) * 0.12], 0.07, 0.3 - i * 0.04, [0, 0, 0.9]);
  if (has('leviathan')) spike(torso, accM, [-0.1, ty + tr[1], 0], 0.06, 0.4, [0, 0, 0.3]).scale.z = 0.3;
  if (has('roots')) {
    const st = mk(torso, GEO.cyl, leafG, [0, ty + tr[1] * 0.95, 0], [0.03, 0.2, 0.03]);
    for (const side of [-1, 1]) mk(torso, GEO.sph, leafG, [0.07 * side, ty + tr[1] * 0.95 + 0.17, 0], [0.12, 0.04, 0.07], [0, 0, side * 0.5]);
  }
  if (has('bloom')) { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; soft(mk(head, GEO.sph, petalM, [-0.02 + Math.cos(a) * 0.1, 0.2, Math.sin(a) * 0.1], [0.06, 0.03, 0.06])); } soft(mk(head, GEO.sph, goldM, [-0.02, 0.2, 0], [0.05, 0.04, 0.05])); }
  if (has('thornvine')) for (let i = 0; i < 4; i++) spike(torso, barkM, [-0.1 - i * 0.03, ty + 0.25 - i * 0.12, (i % 2 ? 1 : -1) * 0.2], 0.035, 0.14, [0.8 * (i % 2 ? 1 : -1), 0, 0.9]);
  if (has('snare')) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spike(model, barkM, [Math.cos(a) * 0.38, 0, Math.sin(a) * 0.3], 0.04, 0.2, [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]); }
  if (has('spores')) for (let i = 0; i < 5; i++) soft(mk(torso, GEO.sph, glowMat('#c8ff9a', 0.7), [-0.05 + (i % 3) * 0.1, ty + tr[1] + 0.05 + (i % 2) * 0.1, (i - 2) * 0.07], [0.035, 0.035, 0.035]));
  if (has('canopy')) for (let i = 0; i < 3; i++) mk(torso, GEO.sph, leafG, [-0.05 + (i - 1) * 0.12, ty + tr[1] * 0.95 + 0.12 + (i === 1 ? 0.06 : 0), (i - 1) * 0.1], [0.17, 0.09, 0.17]);
  if (has('mossmantle')) {
    const mossM = M('#438d4b'), mossLightM = M('#78b85a');
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const x = -0.27 + (i % 4) * 0.16, y = ty - 0.18 + Math.floor(i / 4) * 0.2;
        mk(torso, GEO.sph, i % 3 ? mossM : mossLightM, [x, y, side * (tr[2] * 0.87)], [0.09, 0.055, 0.035], [0, 0, (i % 2 ? 1 : -1) * 0.25]);
      }
      mk(head, GEO.sph, mossLightM, [-0.08, 0.12, side * 0.12], [0.08, 0.045, 0.035]);
    }
    for (let i = 0; i < 3; i++) spike(torso, mossLightM, [-0.15 + i * 0.12, ty + tr[1] * 0.8, 0], 0.025, 0.12, [0, 0, 0.15]);
  }
  if (has('giantbloom')) {
    const stem = mk(torso, GEO.taper, barkM, [-0.2, ty + tr[1] + 0.34, 0], [0.08, 0.72, 0.08], [0, 0, -0.18]);
    stem.castShadow = false;
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      mk(torso, GEO.sph, leafG, [-0.18 - row * 0.08, ty + tr[1] + 0.16 + row * 0.08, side * (0.18 + row * 0.04)],
        [0.2 + row * 0.03, 0.065, 0.12], [side * 0.42, 0, -0.28]);
    }
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      mk(torso, GEO.sph, petalM, [-0.27 + Math.cos(a) * 0.12, ty + tr[1] + 0.76, Math.sin(a) * 0.12],
        [0.11, 0.055, 0.07], [0, a, 0]);
    }
    mk(torso, GEO.sph, goldM, [-0.27, ty + tr[1] + 0.78, 0], [0.07, 0.07, 0.07]);
  }
  if (has('treant')) for (let i = 0; i < 5; i++) mk(torso, GEO.sph, barkM, [0.0 + (i % 2) * 0.1, ty + 0.2 - i * 0.1, (i % 2 ? 1 : -1) * (tr[2] * 0.85)], [0.07, 0.07, 0.05]);
  if (has('bloomburst')) { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; soft(mk(torso, GEO.sph, petalM, [-tr[0] * 0.9, ty + 0.05 + Math.cos(a) * 0.12, Math.sin(a) * 0.12], [0.04, 0.07, 0.07])); } soft(mk(torso, GEO.sph, goldM, [-tr[0] * 0.95, ty + 0.05, 0], [0.04, 0.05, 0.05])); }
  if (has('feathers')) {
    const count = 4 + Math.floor(airGrowth * 10);
    for (const side of [-1, 1]) for (let i = 0; i < count; i++) {
      const row = i / Math.max(1, count - 1);
      spike(torso, i % 3 ? featherM : featherShadeM,
        [-tr[0] * 0.66 + row * tr[0] * 0.45, ty + tr[1] * 0.62 - row * tr[1] * 1.25, side * (tr[2] * 0.78)],
        0.023 + airGrowth * 0.012, 0.1 + airGrowth * 0.17, [side * 0.5, 0, 1.8]);
    }
    const crest = 2 + Math.floor(airGrowth * 5);
    for (let i = 0; i < crest; i++) spike(head, i % 2 ? featherM : featherShadeM, [-0.1 - i * 0.04, 0.13, 0], 0.025, 0.12 + airGrowth * 0.08, [0, 0, 0.25]);
  }
  rig.sparks = [];
  if (has('static')) for (let i = 0; i < 4; i++) { const m = soft(mk(torso, GEO.sph, sparkM, [0.02 - i * 0.06, ty + 0.15 - (i % 2) * 0.18, (i % 2 ? 1 : -1) * (tr[2] * 0.95)], [0.03, 0.03, 0.03])); rig.sparks.push(m); }
  if (has('conduct')) { mk(head, GEO.cyl, M('#cfd6ff'), [0, 0.28, 0], [0.012, 0.2, 0.012]); rig.sparks.push(soft(mk(head, GEO.sph, sparkM, [0, 0.48, 0], [0.05, 0.05, 0.05]))); }
  if (has('bolt')) { const a = [[-tr[0] * 0.95, ty + 0.2], [-tr[0] * 0.9, ty + 0.05], [-tr[0] * 0.95, ty - 0.1]]; a.forEach((p, i) => soft(mk(torso, GEO.box, sparkM, [p[0], p[1], 0.05 * (i % 2 ? 1 : -1)], [0.03, 0.12, 0.06], [0, 0, i % 2 ? 0.5 : -0.5]))); }
  if (has('gust')) soft(mk(model, GEO.torus, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3 }), [0, ty, 0], [0.6, 0.6, 0.6], [Math.PI / 2, 0, 0]));
  if (has('stormcloud') || has('tempest')) {
    const k = has('tempest') ? 1.4 : 1;
    for (let i = 0; i < 3; i++) soft(mk(head, GEO.sph, cloudM, [-0.05 + (i - 1) * 0.12 * k, 0.4 + (i === 1 ? 0.05 : 0), 0], [0.14 * k, 0.08 * k, 0.12 * k]));
    rig.sparks.push(soft(mk(head, GEO.sph, sparkM, [0, 0.3, 0], [0.025, 0.07, 0.025])));
  }
  if (has('thunderlord')) for (let i = -1; i <= 1; i++) spike(head, sparkM, [-0.1, 0.17, i * 0.09], 0.025, 0.22 - Math.abs(i) * 0.05, [i * 0.4, 0, 0.3]);

  // krila
  rig.wings = [];
  if (has('wings') || has('thermals')) {
    const size = has('flyer') ? 0.72 + airGrowth * 0.48 : has('wings') ? 0.35 + airGrowth * 0.82 : 0.28 + airGrowth * 0.65;
    const wm = new THREE.MeshStandardMaterial({ color: col.accent, side: THREE.DoubleSide, transparent: true, opacity: 0.82, flatShading: true, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const piv = new THREE.Group();
      piv.position.set(-0.12, ty + 0.2, side * 0.12);
      piv.rotation.z = 0.35;
      torso.add(piv);
      const featheredWings = has('feathers');
      const w = featheredWings ? new THREE.Group() : wingShape(size, wm, darkM);
      if (featheredWings) for (let i = 0; i < 5 + Math.floor(airGrowth * 8); i++) {
        const row = i / Math.max(1, 4 + Math.floor(airGrowth * 8));
        spike(w, i % 2 ? featherM : featherShadeM, [0.04 + row * 0.48, 0.02 + row * 0.24, 0],
          0.026 + airGrowth * 0.012, (0.16 + airGrowth * 0.22) * size, [0, 0, 1.5 + row * 0.35]);
      }
      w.scale.setScalar(size);
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
  if (bodyPlan === 'arthropod') {
    const plateCount = 3 + Math.floor(bodyPlanGrowth * 3);
    for (let i = 0; i < plateCount; i++) {
      const x = -0.3 + i * 0.14, size = 0.16 + bodyPlanGrowth * 0.035;
      mk(torso, GEO.sph, armorM, [x, ty + tr[1] * 0.72, 0], [0.095, 0.075, size], [0, 0, 0.12]);
      for (const side of [-1, 1]) mk(torso, GEO.sph, darkM, [x, ty + tr[1] * 0.64, side * 0.13], [0.045, 0.055, 0.03]);
    }
    for (const side of [-1, 1]) {
      spike(head, armorM, [-0.08, 0.13, side * 0.1], 0.022, 0.2 + bodyPlanGrowth * 0.1, [side * 0.7, 0, 0.18]);
      spike(head, boneM, [0.23, -0.04, side * 0.065], 0.026, 0.13 + bodyPlanGrowth * 0.05, [Math.PI, 0, 0.35]);
    }
  } else if (bodyPlan === 'mollusk') {
    const shell = mk(torso, GEO.sph, armorM, [-0.24, ty + tr[1] * 0.92, 0], [0.27, 0.2, 0.29], [0, 0, -0.1]);
    shell.material = armorM;
    for (let i = 0; i < 3; i++) {
      const radius = 0.19 - i * 0.045;
      const whorl = mk(torso, GEO.torus, i % 2 ? darkM : boneM, [-0.23, ty + tr[1] * 0.93, 0.245],
        [radius, radius * 0.82, radius], [0, 0, 0]);
      whorl.castShadow = false;
    }
    mk(torso, GEO.sph, goldM, [-0.23, ty + tr[1] * 0.93, 0.25], [0.035, 0.035, 0.035]).castShadow = false;
    if (!has('tentacle')) for (const side of [-1, 1]) {
      const stalk = mk(head, GEO.taper, bodyM, [-0.05, 0.16 + bodyPlanGrowth * 0.08, side * 0.1],
        [0.025, 0.18 + bodyPlanGrowth * 0.1, 0.025], [side * 0.12, 0, -0.12]);
      mk(head, GEO.sph, eyeWhiteM, [-0.05, 0.28 + bodyPlanGrowth * 0.16, side * 0.1], [0.042, 0.042, 0.042]);
      mk(head, GEO.sph, pupilM, [-0.015, 0.285 + bodyPlanGrowth * 0.16, side * 0.1], [0.018, 0.023, 0.018]);
      stalk.castShadow = false;
    }
  } else if (bodyPlan === 'chordate') {
    const vertebrae = 5 + Math.floor(bodyPlanGrowth * 4);
    for (let i = 0; i < vertebrae; i++) {
      const x = -0.43 + i * (0.54 / Math.max(1, vertebrae - 1));
      mk(torso, GEO.sph, i % 2 ? boneM : darkM, [x, ty + tr[1] * 0.8, 0], [0.035, 0.055, 0.045]);
    }
    if (!has('legs')) for (const side of [-1, 1]) {
      const fin = new THREE.Group(); fin.position.set(-0.02, ty - 0.02, side * 0.18); torso.add(fin);
      spike(fin, bodyM, [0, 0, side * 0.08], 0.06, 0.2 + bodyPlanGrowth * 0.12, [side * 0.8, 0, Math.PI / 2]);
    }
  } else if (bodyPlan === 'echinoderm') {
    const plateCount = 5 + Math.floor(bodyPlanGrowth * 4);
    for (let i = 0; i < plateCount; i++) {
      const x = -0.34 + i * (0.68 / Math.max(1, plateCount - 1)), side = i % 2 ? 1 : -1;
      mk(torso, GEO.sph, armorM, [x, ty + tr[1] * 0.67, 0], [0.075, 0.085, 0.22], [0, 0, 0.12]);
      spike(torso, boneM, [x, ty + tr[1] * 0.75, side * 0.04], 0.035, 0.18 + bodyPlanGrowth * 0.18, [0, 0, 0.16]);
      if (i % 2 === 0) spike(torso, accM, [x, ty - 0.08, side * 0.2], 0.018, 0.12, [side * 0.4, 0, Math.PI]);
    }
  } else if (bodyPlan === 'annelid' || bodyPlan === 'nematode' || bodyPlan === 'flatworm') {
    const ringCount = bodyPlan === 'annelid' ? 7 + Math.floor(bodyPlanGrowth * 7) : 5 + Math.floor(bodyPlanGrowth * 5);
    const ringMat = bodyPlan === 'flatworm' ? bodyM : bodyPlan === 'annelid' ? bellyM : armorM;
    for (let i = 0; i < ringCount; i++) {
      const x = -0.45 + i * (0.84 / Math.max(1, ringCount - 1));
      const ring = mk(torso, GEO.torus, ringMat, [x, ty - (bodyPlan === 'flatworm' ? 0.01 : 0), 0],
        [0.13, bodyPlan === 'flatworm' ? 0.075 : 0.15, bodyPlan === 'flatworm' ? 0.23 : 0.24],
        [0, Math.PI / 2, 0]);
      ring.castShadow = false;
      if (bodyPlan === 'annelid' && i % 2 === 0) for (const side of [-1, 1]) {
        spike(torso, boneM, [x, ty - 0.02, side * 0.16], 0.012, 0.075, [side * 0.4, 0, 0.8]);
      }
    }
    if (bodyPlan === 'nematode') {
      for (let i = 0; i < 3 + Math.floor(venomGrowth * 3); i++) {
        const x = -0.25 + i * 0.12;
        mk(torso, GEO.sph, i % 2 ? accM : darkM, [x, ty + tr[1] * 0.78, 0], [0.05, 0.045, 0.19]);
      }
      for (const side of [-1, 1]) spike(head, boneM, [0.25, -0.04, side * 0.045], 0.022, 0.17, [Math.PI, 0, 0.25]);
    }
  } else if (bodyPlan === 'avian') {
    spike(head, boneM, [0.22, -0.015, 0], 0.055, 0.27 + bodyPlanGrowth * 0.12, [0, 0, -Math.PI / 2]);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3 + Math.floor(bodyPlanGrowth * 3); i++) {
        spike(head, i % 2 ? featherM : featherShadeM, [-0.12 - i * 0.035, 0.08, side * 0.1],
          0.022, 0.16 + bodyPlanGrowth * 0.1, [side * 0.8, 0, 0.4]);
      }
    }
    if (tailOn) for (let i = -2; i <= 2; i++) {
      spike(tp, i % 2 ? featherM : featherShadeM, [-0.04, i * 0.045, 0], 0.024, 0.22 + bodyPlanGrowth * 0.12, [0, 0, Math.PI / 2 + i * 0.04]);
    }
  } else if (bodyPlan === 'drake') {
    const crestCount = 4 + Math.floor(bodyPlanGrowth * 5);
    for (let i = 0; i < crestCount; i++) {
      const x = 0.27 - i * 0.13;
      spike(torso, i % 2 ? armorM : accM, [x, ty + tr[1] * 0.72, 0], 0.035 + bodyPlanGrowth * 0.01,
        0.14 + bodyPlanGrowth * 0.15, [0, 0, 0.12]);
    }
    for (const side of [-1, 1]) {
      spike(head, boneM, [-0.04, 0.13, side * 0.11], 0.04, 0.22 + bodyPlanGrowth * 0.12, [side * 0.2, 0, 0.25]);
      mk(torso, GEO.sph, fireM, [-0.15, ty + tr[1] * 0.25, side * 0.2], [0.055, 0.06, 0.035]).castShadow = false;
    }
  }
  return rig;
}

function setGlow(rig, hex, intensity) {
  for (const m of rig.mats) { m.emissive.set(hex); m.emissiveIntensity = intensity; }
}

// --- sovražniki ---
function buildEnemy(kind, bossType, evolution = 0, bosses = 0) {
  const mats = [];
  const M = (c, o) => { const m = stdMat(c, o); mats.push(m); return m; };
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model);
  const rig = { root, model, mats, legs: [], segments: [], wings: [], kind };
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
    const b = M('#79b84d'), d = M('#365f32'), lip = M('#b7d875'), s = glowMat('#d4ff4a', 0.8);
    mk(model, GEO.sph, b, [-0.02, 0.25, 0], [0.34, 0.22, 0.27]);
    rig.stalk = mk(model, GEO.taper, d, [0.08, 0.52, 0], [0.11, 0.42, 0.11], [0, 0, -0.24]);
    const head = new THREE.Group(); head.position.set(0.18, 0.7, 0); model.add(head); rig.head = head;
    mk(head, GEO.sph, b, [0.02, 0.02, 0], [0.22, 0.2, 0.22]);
    mk(head, GEO.cone, lip, [0.24, -0.02, 0], [0.14, 0.21, 0.14], [0, 0, -Math.PI / 2]);
    mk(head, GEO.sph, M('#263228'), [0.31, -0.03, 0], [0.055, 0.11, 0.11]);
    eye(head, [0.1, 0.12, 0.13], 0.045); eye(head, [0.1, 0.12, -0.13], 0.045);
    for (const side of [-1, 1]) {
      spike(model, d, [-0.02, 0.3, side * 0.2], 0.045, 0.28, [side * 0.75, 0, -0.3]);
      const tendril = new THREE.Group(); tendril.position.set(-0.15, 0.18, side * 0.2); model.add(tendril);
      limb(tendril, d, 0.2, 0.035); rig.legs.push(tendril);
    }
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(-0.12, 0.18, side * 0.18); model.add(leg);
      limb(leg, d, 0.16, 0.045); rig.legs.push(leg);
    }
    rig.sac = mk(model, GEO.sph, s, [-0.13, 0.52, 0], [0.11, 0.12, 0.11]);
  } else if (kind === 'armored') {
    const shell = M('#596b74', { metalness: 0.35, roughness: 0.48 }), plate = M('#a9bac0'), under = M('#344b55');
    const weakM = glowMat('#ff4c3a', 1.8), weakRingM = glowMat('#ffd36a', 1.3);
    mk(model, GEO.sph, under, [-0.06, 0.29, 0], [0.61, 0.18, 0.28]);
    const segmentCount = 5 + Math.min(3, Math.floor(evolution / 2));
    for (let i = 0; i < segmentCount; i++) {
      const x = 0.28 - i * 0.15, y = 0.38 + Math.sin(i * 0.65) * 0.025;
      const segment = new THREE.Group(); segment.position.set(x, y, 0); model.add(segment);
      mk(segment, GEO.sph, shell, [0, 0, 0], [0.19, 0.21, 0.25]);
      mk(segment, GEO.sph, plate, [-0.015, 0.075, 0], [0.16, 0.14, 0.23]);
      for (const side of [-1, 1]) mk(segment, GEO.sph, plate, [0, 0.01, side * 0.16], [0.13, 0.1, 0.09]);
      segment.userData.baseY = y; rig.segments.push(segment);
      if (i < segmentCount - 1) spike(segment, shell, [-0.02, 0.16, 0], 0.04, 0.11 + Math.min(0.06, evolution * 0.01), [0, 0, -0.12]);
    }
    const head = mk(model, GEO.sph, shell, [0.43, 0.39, 0], [0.21, 0.18, 0.2]);
    mk(model, GEO.sph, under, [0.55, 0.31, 0], [0.13, 0.055, 0.13]);
    for (const side of [-1, 1]) {
      eye(model, [0.48, 0.49, side * 0.12], 0.045);
      spike(model, plate, [0.36, 0.5, side * 0.13], 0.025, 0.18, [side * 0.5, 0, 0.7]);
      for (const x of [0.2, -0.04, -0.28]) {
        const leg = new THREE.Group(); leg.position.set(x, 0.22, side * 0.18); model.add(leg);
        limb(leg, under, 0.16, 0.045); rig.legs.push(leg);
      }
    }
    const weakRing = mk(model, GEO.torus, weakRingM, [-0.53, 0.39, 0], [0.17, 0.17, 0.17], [Math.PI / 2, 0, 0]);
    weakRing.castShadow = false;
    rig.weakpoint = mk(model, GEO.sph, weakM, [-0.53, 0.39, 0], [0.11, 0.11, 0.11]);
  } else if (kind === 'boss' && bossType === 'matriarch') {
    const bark = M('#69472f'), root = M('#382d31'), leaf = M('#62a94d'), petal = M('#d985a8');
    const core = glowMat('#aaff62', 1.8), pollen = glowMat('#f5e56b', 1.1);
    mk(model, GEO.sph, bark, [-0.08, 0.4, 0], [0.48, 0.34, 0.42]);
    mk(model, GEO.sph, leaf, [0.22, 0.59, 0], [0.35, 0.25, 0.34]);
    mk(model, GEO.sph, root, [0.3, 0.3, 0], [0.4, 0.16, 0.35]);
    rig.head = mk(model, GEO.sph, leaf, [0.35, 0.75, 0], [0.25, 0.22, 0.27]);
    for (const side of [-1, 1]) {
      eye(model, [0.48, 0.78, side * 0.13], 0.055);
      spike(model, bark, [0.25, 0.94, side * 0.19], 0.05, 0.38, [side * 0.25, 0, 0.5]);
      const limbGroup = new THREE.Group(); limbGroup.position.set(-0.15, 0.23, side * 0.2); model.add(limbGroup);
      limb(limbGroup, root, 0.35, 0.07); rig.legs.push(limbGroup);
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Group(); leg.position.set(0.18 - i * 0.22, 0.21, side * 0.2); model.add(leg);
        limb(leg, root, 0.23, 0.055); rig.legs.push(leg);
      }
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        mk(model, GEO.sph, petal, [0.3 + Math.cos(angle) * 0.18, 1.03 + Math.sin(angle) * 0.1, side * 0.04],
          [0.16, 0.08, 0.09], [0, 0, angle]);
      }
    }
    rig.weakpoint = mk(model, GEO.sph, core, [-0.45, 0.48, 0.02], [0.12, 0.14, 0.12]);
    mk(model, GEO.sph, pollen, [-0.45, 0.48, 0.13], [0.045, 0.05, 0.04]).castShadow = false;
  } else if (kind === 'boss' && bossType === 'storm') {
    const hide = M('#35568c'), belly = M('#95c8e8'), scale = M('#513d9d');
    const wingMat = M('#547fe0', { side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const bolt = glowMat('#fff35a', 1.8);
    mk(model, GEO.sph, hide, [-0.08, 0.43, 0], [0.46, 0.32, 0.38]);
    mk(model, GEO.sph, belly, [0.18, 0.32, 0], [0.38, 0.18, 0.32]);
    rig.head = mk(model, GEO.sph, scale, [0.36, 0.65, 0], [0.29, 0.23, 0.27]);
    mk(model, GEO.sph, bolt, [0.55, 0.61, 0], [0.12, 0.14, 0.16]);
    for (const side of [-1, 1]) {
      eye(model, [0.48, 0.73, side * 0.15], 0.055);
      spike(model, belly, [0.24, 0.81, side * 0.14], 0.055, 0.34, [side * 0.3, 0, 0.55]);
      const wingPivot = new THREE.Group();
      wingPivot.position.set(-0.25, 0.55, side * 0.18);
      model.add(wingPivot);
      const wing = wingShape(1.05, wingMat, belly);
      wing.rotation.set(side * -0.5, side * -1.05, 0.25);
      wingPivot.add(wing);
      wingPivot.userData.side = side;
      rig.wings.push(wingPivot);
      for (const x of [-0.25, -0.02, 0.2]) {
        const leg = new THREE.Group(); leg.position.set(x, 0.2, side * 0.18); model.add(leg);
        limb(leg, scale, 0.2, 0.065); rig.legs.push(leg);
      }
      mk(model, GEO.sph, bolt, [-0.1, 0.53, side * 0.34], [0.065, 0.065, 0.065]).castShadow = false;
    }
    for (let i = 0; i < 3; i++) spike(model, scale, [-0.32 - i * 0.12, 0.64 - i * 0.06, 0], 0.04, 0.22, [0, 0, 1.1]);
    for (let i = 0; i < 5; i++) {
      const x = -0.36 - i * 0.12, y = 0.43 - i * 0.035;
      mk(model, GEO.sph, hide, [x, y, 0], [0.14 - i * 0.012, 0.12 - i * 0.01, 0.15 - i * 0.01]);
      if (i < 4) spike(model, scale, [x - 0.04, y + 0.1, 0], 0.03, 0.17, [0, 0, 0.8]);
    }
    for (let i = 0; i < 3; i++) mk(model, GEO.sph, bolt, [-0.14 + i * 0.16, 0.38 - (i % 2) * 0.12, 0.31], [0.025, 0.1, 0.025], [0, 0, (i % 2 ? 1 : -1) * 0.4]).castShadow = false;
    rig.weakpoint = mk(model, GEO.sph, bolt, [-0.34, 0.39, 0], [0.1, 0.1, 0.1]);
  } else { // tiran
    const b = M('#8e2433'), d = M('#4a1018', { metalness: 0.5, roughness: 0.4 }), l = M('#c44a5a');
    const core = glowMat('#ff3030', 1.4), gold = M('#e8c66a', { metalness: 0.55, roughness: 0.35 });
    mk(model, GEO.sph, b, [0, 0.43, 0], [0.46, 0.36, 0.42]);
    mk(model, GEO.sph, l, [0.08, 0.3, 0], [0.39, 0.2, 0.36]);
    mk(model, GEO.sph, d, [0.28, 0.63, 0], [0.3, 0.2, 0.3]);
    mk(model, GEO.sph, core, [0.38, 0.5, 0], [0.15, 0.18, 0.17]);
    for (let i = 0; i < 3; i++) {
      mk(model, GEO.sph, gold, [-0.12 + i * 0.16, 0.7, 0], [0.105, 0.07, 0.29]);
      spike(model, gold, [-0.08 + i * 0.16, 0.79, 0], 0.035, 0.18 + (i === 1 ? 0.08 : 0), [0, 0, 0.08]);
    }
    for (const side of [-1, 1]) {
      mk(model, GEO.sph, gold, [0.04, 0.66, side * 0.27], [0.25, 0.12, 0.16]);
      spike(model, M('#e8dcc8'), [0.16, 0.73, side * 0.18], 0.08, 0.46, [side * 0.4, 0, 0.55]);
      spike(model, d, [0.43, 0.56, side * 0.12], 0.04, 0.16, [side * 0.3, 0, -1.5]);
    }
    for (let i = 0; i < 5; i++) spike(model, gold, [-0.32 + i * 0.13, 0.73, 0], 0.045, 0.21 + (i === 2 ? 0.1 : 0), [0, 0, 0.15]);
    for (const [x, z] of [[0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2]]) {
      const p = new THREE.Group(); p.position.set(x, 0.22, z); model.add(p);
      limb(p, d, 0.22, 0.09); mk(p, GEO.box, gold, [0.08, -0.22, 0], [0.18, 0.05, 0.12]);
      rig.legs.push(p);
    }
    model.scale.setScalar(1.65);
  }
  if (kind === 'boss' && bossType === 'matriarch') {
    const leaf = M('#75bd55'), bark = M('#735136'), bloom = M('#e993b7');
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      const branch = new THREE.Group();
      branch.position.set(-0.2 - row * 0.08, 0.55 + row * 0.08, side * 0.18);
      branch.rotation.z = side * 0.6;
      model.add(branch);
      limb(branch, bark, 0.65 - row * 0.05, 0.045);
      mk(branch, GEO.sph, leaf, [side * 0.16, -0.55, 0], [0.22, 0.1, 0.14], [0, 0, side * 0.4]);
      mk(branch, GEO.sph, bloom, [side * 0.2, -0.62, 0.02], [0.07, 0.07, 0.07]).castShadow = false;
    }
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      spike(model, bark, [-0.28, 0.22, Math.sin(angle) * 0.28], 0.035, 0.34, [Math.cos(angle) * 0.55, 0, 0.7]);
    }
  }
  if (kind !== 'boss') {
    const tier = Math.min(6, Math.max(0, evolution));
    const bossGrowth = Math.min(5, Math.max(0, bosses));
    rig.growthScale = 1 + tier * 0.035 + bossGrowth * 0.018;
    model.scale.setScalar(rig.growthScale);
    if (tier > 0) {
      const shell = M('#53636b', { metalness: 0.24, roughness: 0.48 });
      const plate = M('#b6c4bb');
      if (kind === 'walker') {
        for (let i = 0; i < 1 + tier; i++) {
          const x = -0.2 + i * 0.09;
          mk(model, GEO.sph, i % 2 ? shell : plate, [x, 0.55, 0], [0.085, 0.055, 0.19]);
        }
        for (let i = 0; i < Math.ceil(tier / 2); i++) spike(model, shell, [-0.18 + i * 0.12, 0.62, 0], 0.035, 0.12 + tier * 0.015);
      } else if (kind === 'hopper') {
        for (const side of [-1, 1]) {
          mk(model, GEO.sph, shell, [-0.14, 0.36, side * 0.18], [0.18 + tier * 0.01, 0.16, 0.11]);
          if (tier >= 2) spike(model, plate, [-0.2, 0.53, side * 0.1], 0.03, 0.14 + tier * 0.01, [side * 0.25, 0, -0.2]);
        }
      } else if (kind === 'spitter') {
        if (rig.sac) rig.sac.scale.set(0.11 + tier * 0.012, 0.12 + tier * 0.015, 0.11 + tier * 0.012);
        for (let i = 0; i < Math.ceil(tier / 2); i++) {
          const side = i % 2 ? 1 : -1;
          mk(model, GEO.sph, glowMat('#c8ee72', 0.6), [-0.2 - i * 0.04, 0.44 + i * 0.05, side * 0.2], [0.075, 0.07, 0.065]);
        }
      } else if (kind === 'armored' && tier >= 2) {
        for (let i = 0; i < Math.floor(tier / 2); i++) {
          const x = -0.5 - i * 0.14;
          const segment = new THREE.Group(); segment.position.set(x, 0.38, 0); model.add(segment);
          mk(segment, GEO.sph, shell, [0, 0, 0], [0.16, 0.2, 0.23]);
          mk(segment, GEO.sph, plate, [-0.01, 0.07, 0], [0.14, 0.13, 0.21]);
          segment.userData.baseY = 0.38; rig.segments.push(segment);
          for (const side of [-1, 1]) {
            const leg = new THREE.Group(); leg.position.set(x, 0.21, side * 0.17); model.add(leg);
            limb(leg, shell, 0.15, 0.04); rig.legs.push(leg);
          }
        }
      }
    }
    if (bossGrowth > 0) {
      const crest = M('#d5c596', { metalness: 0.2 });
      for (let i = 0; i < bossGrowth; i++) spike(model, crest, [-0.24 + i * 0.11, 0.57, 0], 0.025, 0.08 + bossGrowth * 0.015);
    }
  }
  return rig;
}
