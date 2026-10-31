'use strict';
// Evolucijski dihotomni ključ: vsaka lastnost ima starša; izbira ene veje zapre sosednjo vejo (brata).
// Na koncu stopnje igralec dobi 3 ponudbe iz "meje" ključa, uteženo proti niši, v kateri je že najbolj razvit.
const NICHES = {
  predator: { name: 'Plenilec', color: '#e0453f' },
  swift: { name: 'Hitrostnik', color: '#37b6f0' },
  bulwark: { name: 'Trdnjava', color: '#7cc242' },
  venom: { name: 'Strupar', color: '#b455d6' },
  boss: { name: 'Tiran', color: '#ffd54f' },
};
const TRAITS = [];
function T(id, name, niche, parent, desc, apply, extra) {
  TRAITS.push(Object.assign({ id, name, niche, parent, desc, apply }, extra || {}));
}
// --- Plenilec ---
T('claws', 'Kremplji', 'predator', null, '+1 poškodba, večji doseg', s => { s.dmg += 1; s.reach += 8; });
T('rending', 'Trgalni kremplji', 'predator', 'claws', '+1 poškodba, dolgi kremplji', s => { s.dmg += 1; s.reach += 12; });
T('horns', 'Rogovi', 'predator', 'claws', 'močan odboj, +0,5 poškodbe', s => { s.knock += 120; s.dmg += 0.5; });
T('frenzy', 'Besnenje', 'predator', 'rending', 'napadaš dosti hitreje', s => { s.atkCd *= 0.6; }, { excludes: ['carapace'] });
T('cleave', 'Vrtinčasti zamah', 'predator', 'rending', 'udariš na obe strani', s => { s.spin = true; s.reach += 6; });
T('apex', 'Vrhunski plenilec', 'predator', 'frenzy', 'ubiti sovražniki te ozdravijo', s => { s.lifesteal = 1; s.dmg += 1; });
T('ram', 'Prebijalni naskok', 'predator', 'horns', 'dobiš sunek, ki rani sovražnike', s => { s.dash = true; s.ram = true; });
T('breaker', 'Lomilec oklepov', 'predator', 'horns', 'udarci prebijejo oklepe', s => { s.pierce = true; s.dmg += 0.5; });
T('gore', 'Nabodenje', 'predator', 'ram', 'sunek močno boli in odbije', s => { s.dashDmg += 2; s.knock += 100; });
// --- Hitrostnik ---
T('legs', 'Skočne noge', 'swift', null, 'hitrejši tek, višji skok', s => { s.speed += 40; s.jump += 40; });
T('hops', 'Zadnji skoki', 'swift', 'legs', 'dvojni skok', s => { s.airJumps += 1; });
T('tail', 'Ravnotežni rep', 'swift', 'legs', 'malo hitrosti in skoka', s => { s.speed += 25; s.jump += 20; });
T('dash', 'Mišični sunek', 'swift', 'hops', 'sunek naprej (K / Shift)', s => { s.dash = true; });
T('wings', 'Kožnata krila', 'swift', 'hops', 'drsenje v zraku (drži skok)', s => { s.glide = true; }, { excludes: ['carapace'] });
T('phase', 'Senčni sunek', 'swift', 'dash', 'sunek se hitro obnovi', s => { s.dashCd = 0.35; });
T('flyer', 'Letalec', 'swift', 'wings', 'še en skok v zraku, počasnejši padec', s => { s.airJumps += 1; s.glideFall = 60; });
T('sprint', 'Šprinter', 'swift', 'tail', 'zelo hiter tek', s => { s.speed += 70; });
T('pounce', 'Pristajalni udar', 'swift', 'tail', 'pristanek z višine rani okolico', s => { s.stomp = true; });
// --- Trdnjava ---
T('hide', 'Debela koža', 'bulwark', null, '+3 zdravja', s => { s.maxHp += 3; });
T('carapace', 'Oklep', 'bulwark', 'hide', '+5 zdravja, počasnejši', s => { s.maxHp += 5; s.speed -= 30; }, { excludes: ['frenzy', 'wings'] });
T('fat', 'Maščobne zaloge', 'bulwark', 'hide', '+2 zdravja, počasno celjenje', s => { s.maxHp += 2; s.regen += 0.15; });
T('spikes', 'Bodice', 'bulwark', 'carapace', 'napadalci se poškodujejo', s => { s.thorns += 2; });
T('shell', 'Školjka', 'bulwark', 'carapace', 'prvi zadetek v vsaki stopnji je ničen', s => { s.shield = true; });
T('barbed', 'Ježevec', 'bulwark', 'spikes', 'bodice močno bolijo', s => { s.thorns += 3; });
T('regen', 'Regeneracija', 'bulwark', 'fat', 'hitrejše celjenje', s => { s.regen += 0.4; });
T('bulk', 'Težka masa', 'bulwark', 'fat', '+1 poškodba, +2 zdravja', s => { s.dmg += 1; s.maxHp += 2; });
T('undying', 'Nesmrtnik', 'bulwark', 'regen', 'enkrat na igro vstaneš od mrtvih', s => { s.revive = true; });
// --- Strupar ---
T('fangs', 'Strupni zobje', 'venom', null, 'udarci zastrupijo', s => { s.poison = 1; s.poisonDur = 3; });
T('glands', 'Strupne žleze', 'venom', 'fangs', 'močnejši in daljši strup', s => { s.poison += 0.7; s.poisonDur += 2; });
T('camo', 'Mimikrija', 'venom', 'fangs', 'dalj časa neranljiv po zadetku', s => { s.invTime = 1.8; });
T('spit', 'Kisli pljunek', 'venom', 'glands', 'strelja strupene izstrelke (L)', s => { s.spit = true; }, { excludes: ['spikes'] });
T('cloud', 'Strupeni oblak', 'venom', 'glands', 'zastrupi sovražnike v bližini', s => { s.aura = true; });
T('plague', 'Kužni prenašalec', 'venom', 'spit', 'strup se širi ob smrti', s => { s.spread = true; });
T('ambush', 'Zaseda', 'venom', 'camo', 'prvi udarec po sovražniku je dvojen', s => { s.ambush = true; });
T('slow', 'Paraliza', 'venom', 'camo', 'zastrupljeni so počasni', s => { s.slow = true; });
// --- Nagrade za šefa (ena na šefa) ---
T('bossheart', 'Tiranovo srce', 'boss', null, '+4 zdravja, +1 poškodba', s => { s.maxHp += 4; s.dmg += 1; }, { boss: true });
T('cracker', 'Lomilec školjk', 'boss', null, 'ignoriraš oklep spredaj', s => { s.pierce = true; }, { boss: true });
T('alpha', 'Alfa naskok', 'boss', null, 'hitrejši napadi in tek', s => { s.atkCd *= 0.8; s.speed += 30; }, { boss: true });

const GENERIC = [
  { id: 'g_hp', name: 'Prilagoditev: žilavost', niche: 'bulwark', desc: '+2 zdravja', apply: s => { s.maxHp += 2; } },
  { id: 'g_dmg', name: 'Prilagoditev: moč', niche: 'predator', desc: '+0,5 poškodbe', apply: s => { s.dmg += 0.5; } },
  { id: 'g_spd', name: 'Prilagoditev: gibčnost', niche: 'swift', desc: '+20 hitrosti', apply: s => { s.speed += 20; } },
];
const TRAIT_BY_ID = {};
TRAITS.forEach(t => { TRAIT_BY_ID[t.id] = t; });

const SYNERGIES = [
  { need: ['claws', 'dash'], name: 'Skok s kremplji', desc: 'sunek +2 poškodbe', apply: s => { s.dashDmg += 2; } },
  { need: ['carapace', 'dash'], name: 'Oklepni naskok', desc: 'sunek rani sovražnike', apply: s => { s.ram = true; } },
  { need: ['rending', 'fangs'], name: 'Zastrupljeni kremplji', desc: '+1 strupa', apply: s => { s.poison += 1; } },
  { need: ['hide', 'legs'], name: 'Žilavi tekač', desc: '+1 zdravje', apply: s => { s.maxHp += 1; } },
  { need: ['spit', 'wings'], name: 'Zračni strelec', desc: 'hitrejši pljunek', apply: s => { s.spitCd = 0.45; } },
  { need: ['cloud', 'spikes'], name: 'Strupene bodice', desc: 'bodice zastrupijo', apply: s => { s.thornPoison = true; } },
];

function computeStats(owned, extras) {
  const s = { maxHp: 5, speed: 230, jump: 520, airJumps: 0, dmg: 1, reach: 34, atkCd: 0.38, knock: 180,
    dash: false, dashCd: 0.7, glide: false, glideFall: 120, ram: false, lifesteal: 0, thorns: 0, regen: 0, dashDmg: 0,
    poison: 0, poisonDur: 0, spit: false, spitCd: 0.8, spread: false, pierce: false, spin: false, stomp: false,
    shield: false, revive: false, invTime: 1, ambush: false, slow: false, aura: false, thornPoison: false };
  for (const t of TRAITS) if (owned.has(t.id)) t.apply(s);
  if (extras) for (const g of GENERIC) for (let i = 0; i < (extras[g.id] || 0); i++) g.apply(s);
  s.synergies = SYNERGIES.filter(y => y.need.every(n => owned.has(n)));
  s.synergies.forEach(y => y.apply(s));
  return s;
}
function traitTier(t) { let n = 1; while (t.parent) { t = TRAIT_BY_ID[t.parent]; n++; } return n; }
function traitState(t, owned) {
  if (owned.has(t.id)) return 'owned';
  if (t.parent && !owned.has(t.parent)) return 'locked';
  for (const o of owned) { const ot = TRAIT_BY_ID[o]; if (ot && (ot.excludes || []).includes(t.id)) return 'blocked'; }
  if ((t.excludes || []).some(e => owned.has(e))) return 'blocked';
  if (t.parent && TRAITS.some(x => x.parent === t.parent && x.id !== t.id && owned.has(x.id))) return 'blocked';
  return 'open';
}
function nicheInvest(owned) {
  const c = { predator: 0, swift: 0, bulwark: 0, venom: 0 };
  for (const t of TRAITS) if (owned.has(t.id) && c[t.niche] !== undefined) c[t.niche] += traitTier(t);
  return c;
}
// Tri ponudbe iz meje ključa; niše, v katere si že vložil, imajo večjo težo.
function offers(owned, n = 3) {
  const inv = nicheInvest(owned);
  const pool = TRAITS.filter(t => !t.boss && traitState(t, owned) === 'open').map(t => ({ t, w: 1 + 2.5 * inv[t.niche] }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce((a, b) => a + b.w, 0), i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
    out.push(pool.splice(i, 1)[0].t);
  }
  for (const g of GENERIC) if (out.length < n) out.push(g);
  return out;
}
function bossOffers(owned) { return TRAITS.filter(t => t.boss && !owned.has(t.id)).slice(0, 3); }
function opensWhat(t) { return TRAITS.filter(x => x.parent === t.id).map(x => x.name); }
function closesWhat(t, owned) {
  const names = new Set();
  TRAITS.forEach(x => {
    if (x.id === t.id || owned.has(x.id)) return;
    if ((t.parent && x.parent === t.parent) || (t.excludes || []).includes(x.id) || (x.excludes || []).includes(t.id)) names.add(x.name);
  });
  return [...names];
}
function lineage(owned) {
  const out = [];
  for (const k of ['predator', 'swift', 'bulwark', 'venom']) {
    const list = TRAITS.filter(t => t.niche === k && owned.has(t.id)).sort((a, b) => traitTier(a) - traitTier(b));
    if (list.length) out.push({ niche: k, text: list.map(t => t.name).join(' › ') });
  }
  return out;
}
