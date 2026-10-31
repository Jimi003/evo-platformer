'use strict';
// Evolucijski dihotomni ključ: vsaka lastnost ima starša; izbira ene veje zapre sosednjo vejo (brata).
// Na koncu stopnje igralec dobi 3 ponudbe iz "meje" ključa, uteženo proti niši, v kateri je že najbolj razvit.
const NICHES = {
  predator: { name: 'Plenilec', color: '#e0453f' },
  swift: { name: 'Hitrostnik', color: '#37b6f0' },
  bulwark: { name: 'Trdnjava', color: '#7cc242' },
  venom: { name: 'Strupar', color: '#b455d6' },
  fire: { name: 'Ogenj', color: '#ff8a2a' },
  water: { name: 'Voda', color: '#3b6bff' },
  land: { name: 'Kopno', color: '#18b86a' },
  air: { name: 'Zrak', color: '#d9e2ff' },
  syn: { name: 'Sinergija', color: '#ff7ad9' },
  boss: { name: 'Tiran', color: '#ffd54f' },
};
const ACTIVE_KEYS = ['KeyE', 'KeyQ', 'KeyR'];
const ACTIVE_KEY_LABELS = ['E', 'Q', 'R'];
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
// --- Globlje veje ---
T('roar', 'Bojni rjovec', 'predator', 'frenzy', 'AKTIVNO: rjovenje omami in odrine bližnje sovražnike', s => {}, { active: { cd: 8, name: 'Rjovenje', color: '#ff6a5a' } });
T('titan', 'Titan', 'predator', 'apex', 'večji, +2 zdravja, +1 poškodba, daljši doseg', s => { s.maxHp += 2; s.dmg += 1; s.reach += 10; }, { scale: 1.18 });
T('trample', 'Pohod', 'predator', 'gore', 'sunek se hitro obnovi in boli še bolj', s => { s.dashDmg += 2; s.dashCd = Math.min(s.dashCd, 0.5); });
T('gale', 'Viharni tek', 'swift', 'sprint', 'AKTIVNO: 3 s hitrejši tek in napadi', s => {}, { active: { cd: 9, name: 'Vihar', color: '#7fd8ff' } });
T('meteor', 'Meteorski padec', 'swift', 'pounce', 'AKTIVNO: strmoglavljenje z močno eksplozijo ob pristanku', s => {}, { active: { cd: 7, name: 'Meteor', color: '#ffb347' } });
T('bastion', 'Bastion', 'bulwark', 'shell', 'AKTIVNO: 2,5 s popolna neranljivost', s => {}, { active: { cd: 12, name: 'Bastion', color: '#9be15d' } });
T('quills', 'Strelne bodice', 'bulwark', 'barbed', 'AKTIVNO: izstreliš obroč bodic v vse smeri', s => { s.thorns += 1; }, { active: { cd: 6, name: 'Bodice', color: '#e8e0c0' } });
T('colossus', 'Kolos', 'bulwark', 'bulk', 'večji, +3 zdravja, +1 poškodba, močnejši odboj', s => { s.maxHp += 3; s.dmg += 1; s.knock += 80; }, { scale: 1.12 });
T('miasma', 'Kužna meglica', 'venom', 'cloud', 'AKTIVNO: strupena eksplozija okoli tebe', s => {}, { active: { cd: 8, name: 'Meglica', color: '#c24ff0' } });
T('epidemic', 'Epidemija', 'venom', 'plague', 'AKTIVNO: zastrupi vse sovražnike v sobi', s => {}, { active: { cd: 14, name: 'Epidemija', color: '#9be15d' } });
T('neuro', 'Nevrotoksin', 'venom', 'slow', '+1 strupa, zastrupljeni so še počasnejši', s => { s.poison += 1; });
// --- Ogenj (nova niša) ---
T('ember', 'Žerjavica v krvi', 'fire', null, 'udarci zažgejo sovražnike', s => { s.burn = 1.2; s.burnDur = 3; });
T('breath', 'Ognjeni dih', 'fire', 'ember', 'AKTIVNO: ognjeni stožec pred teboj', s => {}, { active: { cd: 5, name: 'Dih', color: '#ff8a2a' } });
T('scorch', 'Žareča sled', 'fire', 'ember', 'sovražniki v bližini zagorijo', s => { s.fireAura = true; });
T('molten', 'Staljena koža', 'fire', 'ember', '+2 zdravja, napadalci zagorijo', s => { s.maxHp += 2; s.thorns += 2; s.thornFire = true; });
T('inferno', 'Pekel', 'fire', 'breath', 'ogenj dosti močnejši in daljši', s => { s.burn += 1.5; s.burnDur += 2; s.breathCd = 0.65; });
T('cinder', 'Žarečica', 'fire', 'scorch', 'goreči sovražniki ob smrti eksplodirajo', s => { s.cinder = true; });
T('magma', 'Magma', 'fire', 'molten', '+4 zdravja, počasno celjenje', s => { s.maxHp += 4; s.regen += 0.2; });
// --- Voda (led je globoko v veji) ---
T('gel', 'Sluzava koža', 'water', null, 'gladka sluz: +2 zdravja, +20 hitrosti', s => { s.maxHp += 2; s.speed += 20; });
T('fins', 'Plavuti', 'water', 'gel', 'sunek naprej (K / Shift), +30 hitrosti', s => { s.dash = true; s.speed += 30; });
T('tentacle', 'Lovke', 'water', 'gel', 'daljši doseg, +0,5 poškodbe', s => { s.reach += 18; s.dmg += 0.5; });
T('frost', 'Ledeni dotik', 'water', 'fins', 'udarci upočasnijo sovražnike', s => { s.chill = true; });
T('torrent', 'Hudournik', 'water', 'fins', 'AKTIVNO: vodni val odnese sovražnike pred teboj', s => {}, { active: { cd: 7, name: 'Val', color: '#3b9bff' } });
T('iceshell', 'Ledeni oklep', 'water', 'tentacle', '+4 zdravja, napadalci se upočasnijo', s => { s.maxHp += 4; s.thornChill = true; });
T('blizzard', 'Snežni vihar', 'water', 'frost', 'AKTIVNO: zamrzne sovražnike v okolici', s => {}, { active: { cd: 11, name: 'Vihar', color: '#bfeaff' } });
T('permafrost', 'Večni led', 'water', 'frost', 'upočasnjeni sovražniki prejmejo +50 % poškodbe', s => { s.shatter = true; });
T('leviathan', 'Levijatan', 'water', 'torrent', 'večji, +3 zdravja, +1 poškodba', s => { s.maxHp += 3; s.dmg += 1; }, { scale: 1.15 });
// --- Kopno (rastline) ---
T('roots', 'Korenine', 'land', null, '+3 zdravja, počasno celjenje', s => { s.maxHp += 3; s.regen += 0.1; });
T('vines', 'Ovijalke', 'land', 'roots', 'daljši doseg, +0,5 poškodbe', s => { s.reach += 22; s.dmg += 0.5; });
T('bloom', 'Cvet', 'land', 'roots', 'hitrejše celjenje', s => { s.regen += 0.3; });
T('thornvine', 'Trnasti bršljan', 'land', 'vines', 'napadalci se poškodujejo', s => { s.thorns += 2; });
T('snare', 'Past iz korenin', 'land', 'vines', 'AKTIVNO: korenine ujamejo bližnje sovražnike', s => {}, { active: { cd: 9, name: 'Past', color: '#4fae3f' } });
T('spores', 'Spore', 'land', 'bloom', 'sovražniki v bližini se upočasnijo', s => { s.sporeAura = true; });
T('canopy', 'Krošnja', 'land', 'bloom', '+4 zdravja, hitrejše celjenje', s => { s.maxHp += 4; s.regen += 0.2; });
T('treant', 'Drevesnik', 'land', 'thornvine', 'večji, +3 zdravja, +1 poškodba, bodice', s => { s.maxHp += 3; s.dmg += 1; s.thorns += 2; }, { scale: 1.2 });
T('bloomburst', 'Cvetni izbruh', 'land', 'spores', 'AKTIVNO: ozdravi 2 zdravja in upočasni sovražnike', s => {}, { active: { cd: 12, name: 'Izbruh', color: '#ff7ab8' } });
// --- Zrak (elektrika) ---
T('feathers', 'Perje', 'air', null, 'dodaten skok v zraku, +20 hitrosti', s => { s.airJumps += 1; s.speed += 20; });
T('static', 'Statični naboj', 'air', 'feathers', 'udarec preskoči na bližnjega sovražnika', s => { s.arc = 1; });
T('thermals', 'Termika', 'air', 'feathers', 'drsenje v zraku (drži skok)', s => { s.glide = true; s.glideFall = 90; }, { excludes: ['carapace'] });
T('conduct', 'Prevodnik', 'air', 'static', 'strela preskoči na še več sovražnikov', s => { s.arc += 2; });
T('bolt', 'Strela', 'air', 'static', 'AKTIVNO: strele udarijo 3 sovražnike', s => {}, { active: { cd: 8, name: 'Strela', color: '#fff35a' } });
T('gust', 'Sunek vetra', 'air', 'thermals', 'hiter sunek (K / Shift), hitra obnova', s => { s.dash = true; s.dashCd = Math.min(s.dashCd, 0.5); });
T('stormcloud', 'Nevihtni oblak', 'air', 'thermals', 'pristanek sproži udar, +1 skok', s => { s.stomp = true; s.airJumps += 1; });
T('tempest', 'Orkan', 'air', 'bolt', 'strela udari 5 sovražnikov', s => { s.boltN = 5; });
T('thunderlord', 'Gromovnik', 'air', 'conduct', '+1 poškodba, hitrejši napadi, močnejše strele', s => { s.dmg += 1; s.atkCd *= 0.85; s.arcDmg += 1; }, { scale: 1.1 });
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
  { need: ['wings', 'breath'], name: 'Zmaj', desc: 'dih se hitreje obnovi', apply: s => { s.breathCd = Math.min(s.breathCd, 3.5); } },
  { need: ['fangs', 'ember'], name: 'Kisli ogenj', desc: '+0,5 ognja in strupa', apply: s => { s.burn += 0.5; s.poison += 0.5; } },
  { need: ['dash', 'scorch'], name: 'Ognjeni sunek', desc: 'sunek +1 poškodba', apply: s => { s.dashDmg += 1; } },
  { need: ['gale', 'claws'], name: 'Vihar kremljev', desc: 'hitrejši napadi', apply: s => { s.atkCd *= 0.9; } },
  { need: ['frost', 'ember'], name: 'Para', desc: '+0,5 poškodbe, +15 dosega', apply: s => { s.dmg += 0.5; s.reach += 15; } },
  { need: ['static', 'fangs'], name: 'Električni strup', desc: 'strela +1 poškodba', apply: s => { s.arcDmg += 1; } },
  { need: ['vines', 'fangs'], name: 'Strupeni bršljan', desc: 'trni zastrupijo, +0,5 strupa', apply: s => { s.thornPoison = true; s.poison += 0.5; } },
  { need: ['fins', 'legs'], name: 'Dvoživka', desc: '+40 hitrosti, +30 skoka', apply: s => { s.speed += 40; s.jump += 30; } },
  { need: ['bloom', 'fat'], name: 'Bogata zaloga', desc: 'celjenje +0,4', apply: s => { s.regen += 0.4; } },
  { need: ['thermals', 'ember'], name: 'Vroči zrak', desc: '+1 skok v zraku', apply: s => { s.airJumps += 1; } },
  { need: ['iceshell', 'spikes'], name: 'Ledene bodice', desc: 'bodice +2, upočasnijo', apply: s => { s.thorns += 2; s.thornChill = true; } },
  { need: ['bolt', 'torrent'], name: 'Nevihta', desc: 'aktivne moči 15 % hitrejše', apply: s => { s.cdMult *= 0.85; } },
  { need: ['canopy', 'shell'], name: 'Živi ščit', desc: 'ščit, +2 zdravja', apply: s => { s.shield = true; s.maxHp += 2; } },
  { need: ['permafrost', 'claws'], name: 'Ledeni kremplji', desc: '+1 poškodba', apply: s => { s.dmg += 1; } },
];
SYNERGIES.forEach(y => { y.id = 'syn_' + y.need.join('_'); y.niche = 'syn'; y.syn = true; });
const SYN_BY_ID = {};
SYNERGIES.forEach(y => { SYN_BY_ID[y.id] = y; });
function synSources(y) { return y.need.map(n => TRAIT_BY_ID[n].name); }
function synAvailable(owned) { return SYNERGIES.filter(y => !owned.has(y.id) && y.need.every(n => owned.has(n))); }
// lastnosti, ki bi s to izbiro odprle novo sinergijo
function hintsSyn(t, owned) { return SYNERGIES.filter(y => !owned.has(y.id) && y.need.includes(t.id) && y.need.every(n => n === t.id || owned.has(n))).map(y => y.name); }

function computeStats(owned, extras) {
  const s = { maxHp: 5, speed: 230, jump: 520, airJumps: 0, dmg: 1, reach: 34, atkCd: 0.38, knock: 180,
    dash: false, dashCd: 0.7, glide: false, glideFall: 120, ram: false, lifesteal: 0, thorns: 0, regen: 0, dashDmg: 0,
    poison: 0, poisonDur: 0, spit: false, spitCd: 0.8, spread: false, pierce: false, spin: false, stomp: false,
    shield: false, revive: false, invTime: 1, ambush: false, slow: false, aura: false, thornPoison: false,
    cdMult: 1, chill: false, shatter: false, thornChill: false, sporeAura: false, arc: 0, arcDmg: 1, boltN: 3,
    burn: 0, burnDur: 0, fireAura: false, thornFire: false, cinder: false, breathCd: 5, scale: 1 };
  for (const t of TRAITS) if (owned.has(t.id)) { t.apply(s); if (t.scale) s.scale = Math.max(s.scale, t.scale); }
  s.actives = [...owned].filter(id => TRAIT_BY_ID[id] && TRAIT_BY_ID[id].active).slice(0, 3);
  if (extras) for (const g of GENERIC) for (let i = 0; i < (extras[g.id] || 0); i++) g.apply(s);
  s.synergies = SYNERGIES.filter(y => owned.has(y.id));
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
  const c = { predator: 0, swift: 0, bulwark: 0, venom: 0, fire: 0, water: 0, land: 0, air: 0 };
  for (const t of TRAITS) if (owned.has(t.id) && c[t.niche] !== undefined) c[t.niche] += traitTier(t);
  return c;
}
// Tri ponudbe iz meje ključa; niše, v katere si že vložil, imajo večjo težo.
function offers(owned, n = 3) {
  const inv = nicheInvest(owned);
  const full = [...owned].filter(id => TRAIT_BY_ID[id] && TRAIT_BY_ID[id].active).length >= 3;
  const pool = TRAITS.filter(t => !t.boss && !(full && t.active) && traitState(t, owned) === 'open').map(t => ({ t, w: 1 + 2.5 * inv[t.niche] }));
  const out = [];
  const syn = synAvailable(owned);
  if (syn.length && n >= 3) out.push(syn[Math.floor(Math.random() * syn.length)]);
  // ena ponudba je vedno iz niše, v katero še nisi vložil (če je kakšna odprta)
  const fresh = pool.filter(x => inv[x.t.niche] === 0);
  if (owned.size > 0 && fresh.length && n >= 3 && out.length < n - 1) out.push(pool.splice(pool.indexOf(fresh[Math.floor(Math.random() * fresh.length)]), 1)[0].t);
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
  for (const k of ['predator', 'swift', 'bulwark', 'venom', 'fire', 'water', 'land', 'air']) {
    const list = TRAITS.filter(t => t.niche === k && owned.has(t.id)).sort((a, b) => traitTier(a) - traitTier(b));
    if (list.length) out.push({ niche: k, text: list.map(t => t.name).join(' › ') });
  }
  return out;
}
