'use strict';
// Evolucijski dihotomni ključ: vsaka lastnost ima starša; izbira ene veje zapre sosednjo vejo (brata).
// Na koncu stopnje igralec dobi 3 ponudbe iz "meje" ključa, uteženo proti niši, v kateri je že najbolj razvit.
const NICHES = {
  predator: { name: 'Plenilec', color: '#e0453f' },
  swift: { name: 'Hitrost', color: '#37b6f0' },
  bulwark: { name: 'Vzdržljivost', color: '#7cc242' },
  venom: { name: 'Strup', color: '#b455d6' },
  fire: { name: 'Ogenj', color: '#ff8a2a' },
  water: { name: 'Voda', color: '#3b6bff' },
  land: { name: 'Rastline', color: '#18b86a' },
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
T('claws', 'Kremplji', 'predator', null, '+1 škode in daljši doseg', s => { s.dmg += 1; s.reach += 8; }, { excludes: ['horns'] });
T('rending', 'Razdiralni kremplji', 'predator', 'claws', '+1 škode in daljši kremplji', s => { s.dmg += 1; s.reach += 12; });
T('horns', 'Rogovi', 'predator', null, 'močneje odbiješ sovražnike in povzročiš +0,5 škode; ohraniš štirinožno držo', s => { s.knock += 120; s.dmg += 0.5; }, { excludes: ['claws'] });
T('frenzy', 'Bes', 'predator', 'rending', 'napadaš hitreje', s => { s.atkCd *= 0.75; }, { excludes: ['carapace'] });
T('cleave', 'Krožni zamah', 'predator', 'rending', 'zamahneš v obe smeri', s => { s.spin = true; s.reach += 6; });
T('apex', 'Vrhunski plenilec', 'predator', 'frenzy', 'ko premagaš sovražnika, si povrneš zdravje', s => { s.lifesteal = 1; s.dmg += 1; });
T('ram', 'Naskok', 'predator', 'horns', 'sunek poškoduje sovražnike', s => { s.dash = true; s.ram = true; });
T('breaker', 'Lomilec oklepa', 'predator', 'horns', 'napadi prebijejo oklep in povzročijo +0,5 škode', s => { s.pierce = true; s.dmg += 0.5; });
T('gore', 'Nabijanje', 'predator', 'ram', 'sunek povzroči veliko škode in odbije sovražnike', s => { s.dashDmg += 2; s.knock += 100; });
// --- Hitrost ---
T('legs', 'Močne noge', 'swift', null, 'tečeš hitreje in skačeš višje', s => { s.speed += 40; s.jump += 40; });
T('hops', 'Dvojni skok', 'swift', 'legs', 'v zraku lahko skočiš še enkrat', s => { s.airJumps += 1; });
T('tail', 'Rep za ravnotežje', 'swift', 'legs', 'nekoliko hitreje tečeš in višje skačeš', s => { s.speed += 25; s.jump += 20; });
T('dash', 'Hiter sunek', 'swift', 'hops', 'sunkovito se poženeš naprej (K / Shift)', s => { s.dash = true; });
T('wings', 'Kožnata krila', 'swift', 'hops', 'med padanjem lahko drsiš (drži tipko za skok)', s => { s.glide = true; }, { excludes: ['carapace', 'gel'] });
T('phase', 'Senčni sunek', 'swift', 'dash', 'sunek se hitreje znova napolni', s => { s.dashCd = 0.35; });
T('flyer', 'Letalec', 'swift', 'wings', 'dobiš dodaten skok v zraku in počasneje padaš', s => { s.airJumps += 1; s.glideFall = 60; });
T('sprint', 'Šprint', 'swift', 'tail', 'tečeš precej hitreje', s => { s.speed += 70; });
T('pounce', 'Udar ob pristanku', 'swift', 'tail', 'pristanek po padcu poškoduje bližnje sovražnike', s => { s.stomp = true; });
// --- Vzdržljivost ---
T('hide', 'Debela koža', 'bulwark', null, '+3 zdravja', s => { s.maxHp += 3; });
T('carapace', 'Oklep', 'bulwark', 'hide', '+5 zdravja, vendar tečeš počasneje; ni združljiv z letom', s => { s.maxHp += 5; s.speed -= 30; }, { excludes: ['frenzy', 'wings', 'thermals', 'flyer'] });
T('fat', 'Maščobne zaloge', 'bulwark', 'hide', '+2 zdravja in počasno obnavljanje zdravja', s => { s.maxHp += 2; s.regen += 0.15; });
T('spikes', 'Bodice', 'bulwark', 'carapace', 'sovražniki, ki se te dotaknejo, prejmejo škodo', s => { s.thorns += 2; });
T('shell', 'Školjka', 'bulwark', 'carapace', 'ščit izniči prvi zadetek na vsaki stopnji', s => { s.shield = true; });
T('barbed', 'Ježeve bodice', 'bulwark', 'spikes', 'bodice povzročijo dodatno škodo', s => { s.thorns += 3; });
T('regen', 'Regeneracija', 'bulwark', 'fat', 'zdravje se obnavlja hitreje', s => { s.regen += 0.4; });
T('bulk', 'Težka postava', 'bulwark', 'fat', '+1 škode in +2 zdravja; težka postava ne more leteti', s => { s.dmg += 1; s.maxHp += 2; }, { excludes: ['wings', 'thermals'] });
T('undying', 'Nesmrtna vzdržljivost', 'bulwark', 'regen', 'enkrat na tek se po porazu vrneš v boj', s => { s.revive = true; });
// --- Strup ---
T('fangs', 'Strupeni zobje', 'venom', null, 'tvoji napadi zastrupijo sovražnike', s => { s.poison = 1; s.poisonDur = 3; });
T('glands', 'Strupne žleze', 'venom', 'fangs', 'strup je močnejši in traja dlje', s => { s.poison += 0.7; s.poisonDur += 2; });
T('camo', 'Mimikrija', 'venom', 'fangs', 'po zadetku si dlje časa neranljiv', s => { s.invTime = 1.8; });
T('spit', 'Kisli pljunek', 'venom', 'glands', 'izstreliš strupeni izstrelek (L)', s => { s.spit = true; }, { excludes: ['spikes'] });
T('cloud', 'Strupeni oblak', 'venom', 'glands', 'zastrupiš bližnje sovražnike', s => { s.aura = true; });
T('plague', 'Kužni prenašalec', 'venom', 'spit', 'ob porazu zastrupljenega sovražnika se strup razširi', s => { s.spread = true; });
T('ambush', 'Zaseda', 'venom', 'camo', 'prvi napad na sovražnika povzroči dvojno škodo', s => { s.ambush = true; });
T('slow', 'Ohromitev', 'venom', 'camo', 'zastrupljeni sovražniki se premikajo počasneje', s => { s.slow = true; });
// --- Globlje veje ---
T('roar', 'Bojno rjovenje', 'predator', 'frenzy', 'AKTIVNO: z rjovenjem omamiš in odbiješ bližnje sovražnike', s => {}, { active: { cd: 8, name: 'Rjovenje', color: '#ff6a5a' } });
T('titan', 'Titan', 'predator', 'apex', 'postaneš večji; +2 zdravja, +1 škode in daljši doseg', s => { s.maxHp += 2; s.dmg += 1; s.reach += 10; }, { scale: 1.18 });
T('trample', 'Silovit naskok', 'predator', 'gore', 'sunek se hitreje obnovi in povzroči dodatno škodo', s => { s.dashDmg += 2; s.dashCd = Math.min(s.dashCd, 0.5); });
T('gale', 'Viharni tek', 'swift', 'sprint', 'AKTIVNO: za 3 sekunde hitreje tečeš in napadaš', s => {}, { active: { cd: 9, name: 'Vihar', color: '#7fd8ff' } });
T('meteor', 'Meteorski padec', 'swift', 'pounce', 'AKTIVNO: poletiš navzgor in ob pristanku povzročiš močno eksplozijo', s => {}, { active: { cd: 7, name: 'Meteor', color: '#ffb347' } });
T('bastion', 'Bastion', 'bulwark', 'shell', 'AKTIVNO: za 2,5 sekunde postaneš neranljiv', s => {}, { active: { cd: 12, name: 'Bastion', color: '#9be15d' } });
T('quills', 'Izstrelki iz bodic', 'bulwark', 'barbed', 'AKTIVNO: izstreliš bodice v vse smeri', s => { s.thorns += 1; }, { active: { cd: 6, name: 'Bodice', color: '#e8e0c0' } });
T('colossus', 'Kolos', 'bulwark', 'bulk', 'postaneš večji; +3 zdravja, +1 škode in močnejši odriv', s => { s.maxHp += 3; s.dmg += 1; s.knock += 80; }, { scale: 1.12 });
T('miasma', 'Strupena meglica', 'venom', 'cloud', 'AKTIVNO: zastrupiš bližnje sovražnike', s => {}, { active: { cd: 10, name: 'Meglica', color: '#c24ff0' } });
T('epidemic', 'Epidemija', 'venom', 'plague', 'AKTIVNO: za 4 sekunde zastrupiš vse sovražnike', s => {}, { active: { cd: 18, name: 'Epidemija', color: '#9be15d' } });
T('neuro', 'Nevrotoksin', 'venom', 'slow', '+1 strup; zastrupljeni sovražniki se še počasneje premikajo', s => { s.poison += 1; });
// --- Ogenj (nova niša) ---
T('ember', 'Žerjavica v krvi', 'fire', null, 'tvoji napadi zažgejo sovražnike', s => { s.burn = 1.2; s.burnDur = 3; }, { excludes: ['gel'] });
T('breath', 'Ognjeni dih', 'fire', 'ember', 'AKTIVNO: izbruhaš plamene pred seboj', s => {}, { active: { cd: 5, name: 'Ognjeni dih', color: '#ff8a2a' } });
T('scorch', 'Ožgana sled', 'fire', 'ember', 'zažgeš bližnje sovražnike', s => { s.fireAura = true; });
T('molten', 'Staljena koža', 'fire', 'ember', '+2 zdravja; sovražniki, ki se te dotaknejo, zagorijo', s => { s.maxHp += 2; s.thorns += 2; s.thornFire = true; });
T('inferno', 'Ognjeni vihar', 'fire', 'breath', 'ogenj povzroča več škode in traja dlje', s => { s.burn += 1.5; s.burnDur += 2; s.breathCd = 0.65; });
T('cinder', 'Žareči pepel', 'fire', 'scorch', 'goreči sovražniki ob porazu eksplodirajo', s => { s.cinder = true; });
T('magma', 'Magma', 'fire', 'molten', '+4 zdravja in počasno obnavljanje zdravja', s => { s.maxHp += 4; s.regen += 0.2; });
// --- Voda (led je globoko v veji) ---
T('gel', 'Sluzasta koža', 'water', null, '+2 zdravja in +20 hitrosti; ne združuje se z ognjem ali letom', s => { s.maxHp += 2; s.speed += 20; }, { excludes: ['ember', 'wings', 'thermals'] });
T('fins', 'Plavuti', 'water', 'gel', 'odkleneš sunek (K / Shift) in pridobiš +30 hitrosti', s => { s.dash = true; s.speed += 30; });
T('tentacle', 'Lovke', 'water', 'gel', '+18 dosega in +0,5 škode', s => { s.reach += 18; s.dmg += 0.5; });
T('frost', 'Ledeni dotik', 'water', 'fins', 'tvoji napadi upočasnijo sovražnike', s => { s.chill = true; });
T('torrent', 'Hudournik', 'water', 'fins', 'AKTIVNO: pošlješ vodni val, ki odbije sovražnike pred teboj', s => {}, { active: { cd: 7, name: 'Vodni val', color: '#3b9bff' } });
T('iceshell', 'Ledeni oklep', 'water', 'tentacle', '+4 zdravja; sovražniki, ki se te dotaknejo, se upočasnijo', s => { s.maxHp += 4; s.thornChill = true; });
T('blizzard', 'Snežni vihar', 'water', 'frost', 'AKTIVNO: zamrzneš bližnje sovražnike', s => {}, { active: { cd: 11, name: 'Snežni vihar', color: '#bfeaff' } });
T('permafrost', 'Večni led', 'water', 'frost', 'ohlajeni sovražniki prejmejo 50 % več škode', s => { s.shatter = true; });
T('leviathan', 'Levijatan', 'water', 'torrent', 'postaneš večji; +3 zdravja in +1 škode', s => { s.maxHp += 3; s.dmg += 1; }, { scale: 1.15 });
// --- Rastline ---
T('roots', 'Korenine', 'land', null, '+3 zdravja in počasno obnavljanje zdravja', s => { s.maxHp += 3; s.regen += 0.1; });
T('vines', 'Plezalke', 'land', 'roots', '+22 dosega in +0,5 škode', s => { s.reach += 22; s.dmg += 0.5; });
T('bloom', 'Cvetenje', 'land', 'roots', 'zdravje se obnavlja hitreje', s => { s.regen += 0.3; });
T('thornvine', 'Trnasta ovijalka', 'land', 'vines', 'sovražniki, ki se te dotaknejo, prejmejo škodo', s => { s.thorns += 2; });
T('snare', 'Koreninska zanka', 'land', 'vines', 'AKTIVNO: korenine ujamejo bližnje sovražnike', s => {}, { active: { cd: 9, name: 'Koreninska zanka', color: '#4fae3f' } });
T('spores', 'Spore', 'land', 'bloom', 'upočasniš bližnje sovražnike', s => { s.sporeAura = true; });
T('canopy', 'Krošnja', 'land', 'bloom', '+4 zdravja in hitrejše obnavljanje zdravja', s => { s.maxHp += 4; s.regen += 0.2; });
T('treant', 'Drevesni velikan', 'land', 'thornvine', 'postaneš večji; +3 zdravja, +1 škode in bodice', s => { s.maxHp += 3; s.dmg += 1; s.thorns += 2; }, { scale: 1.2 });
T('bloomburst', 'Cvetni izbruh', 'land', 'spores', 'AKTIVNO: povrneš si 2 točki zdravja in upočasniš sovražnike', s => {}, { active: { cd: 12, name: 'Cvetni izbruh', color: '#ff7ab8' } });
// --- Zrak (elektrika) ---
T('feathers', 'Perje', 'air', null, 'dobiš dodaten skok v zraku in +20 hitrosti', s => { s.airJumps += 1; s.speed += 20; });
T('static', 'Statični naboj', 'air', 'feathers', 'tvoj napad z elektriko zadene še bližnjega sovražnika', s => { s.arc = 1; });
T('thermals', 'Vzponski tokovi', 'air', 'feathers', 'med padanjem lahko drsiš (drži tipko za skok)', s => { s.glide = true; s.glideFall = 90; }, { excludes: ['carapace', 'gel', 'bulk'] });
T('conduct', 'Prevodnost', 'air', 'static', 'električni udar preskoči na več sovražnikov', s => { s.arc += 2; });
T('bolt', 'Strela', 'air', 'static', 'AKTIVNO: strela udari do 3 sovražnike', s => {}, { active: { cd: 8, name: 'Strela', color: '#fff35a' } });
T('gust', 'Sunek vetra', 'air', 'thermals', 'odkleneš hiter sunek (K / Shift), ki se hitreje obnovi', s => { s.dash = true; s.dashCd = Math.min(s.dashCd, 0.5); });
T('stormcloud', 'Nevihtni oblak', 'air', 'thermals', 'ob pristanku udariš ob tla in dobiš dodaten skok', s => { s.stomp = true; s.airJumps += 1; });
T('tempest', 'Vihar', 'air', 'bolt', 'strela lahko zadene do 5 sovražnikov', s => { s.boltN = 5; });
T('thunderlord', 'Gospodar nevihte', 'air', 'conduct', '+1 škode, hitrejši napadi in močnejše strele', s => { s.dmg += 1; s.atkCd *= 0.85; s.arcDmg += 1; }, { scale: 1.1 });
// --- Nagrade za šefa (ena na šefa) ---
T('bossheart', 'Tiranovo srce', 'boss', null, '+5 zdravja in +1 škode', s => { s.maxHp += 5; s.dmg += 1; }, { boss: true });
T('cracker', 'Lomilec oklepa', 'boss', null, 'prebiješ sovražnikov oklep in povzročiš +0,5 škode', s => { s.pierce = true; s.dmg += 0.5; }, { boss: true });
T('alpha', 'Alfa naskok', 'boss', null, 'tečeš in napadaš hitreje; odkleneš močnejši sunek', s => { s.atkCd *= 0.75; s.speed += 40; s.dash = true; s.dashDmg += 1; }, { boss: true });

const GENERIC = [
  { id: 'g_hp', name: 'Prilagoditev: vzdržljivost', niche: 'bulwark', desc: '+2 zdravja', apply: s => { s.maxHp += 2; } },
  { id: 'g_dmg', name: 'Prilagoditev: močnejši napad', niche: 'predator', desc: '+0,5 škode', apply: s => { s.dmg += 0.5; } },
  { id: 'g_spd', name: 'Prilagoditev: hitrost', niche: 'swift', desc: '+20 hitrosti', apply: s => { s.speed += 20; } },
];
const TRAIT_BY_ID = {};
TRAITS.forEach(t => { TRAIT_BY_ID[t.id] = t; });

const SYNERGIES = [
  { need: ['claws', 'dash'], name: 'Krempljasti sunek', desc: 'sunek povzroči +2 škode', apply: s => { s.dashDmg += 2; } },
  { need: ['carapace', 'dash'], name: 'Oklepni naskok', desc: 'sunek poškoduje sovražnike', apply: s => { s.ram = true; } },
  { need: ['rending', 'fangs'], name: 'Strupeni kremplji', desc: '+1 strup', apply: s => { s.poison += 1; } },
  { need: ['hide', 'legs'], name: 'Vzdržljiv tekač', desc: '+1 točka zdravja', apply: s => { s.maxHp += 1; } },
  { need: ['spit', 'wings'], name: 'Krilati strelec', desc: 'strupene izstrelke izstreliš hitreje', apply: s => { s.spitCd = 0.45; } },
  { need: ['cloud', 'spikes'], name: 'Strupene bodice', desc: 'bodice zastrupijo sovražnike', apply: s => { s.thornPoison = true; } },
  { need: ['wings', 'breath'], name: 'Zmaj', desc: 'ognjeni dih se hitreje znova napolni', apply: s => { s.breathCd = Math.min(s.breathCd, 3.5); } },
  { need: ['fangs', 'ember'], name: 'Kisli ogenj', desc: '+0,5 škode zaradi ognja in +0,5 strupa', apply: s => { s.burn += 0.5; s.poison += 0.5; } },
  { need: ['dash', 'scorch'], name: 'Ognjeni sunek', desc: 'sunek povzroči +1 škodo', apply: s => { s.dashDmg += 1; } },
  { need: ['gale', 'claws'], name: 'Viharni kremplji', desc: 'napadaš hitreje', apply: s => { s.atkCd *= 0.9; } },
  { need: ['frost', 'ember'], name: 'Para', desc: '+0,5 škode in +15 dosega', apply: s => { s.dmg += 0.5; s.reach += 15; } },
  { need: ['static', 'fangs'], name: 'Električni strup', desc: 'električni udar povzroči +1 škodo', apply: s => { s.arcDmg += 1; } },
  { need: ['vines', 'fangs'], name: 'Strupene ovijalke', desc: 'bodice zastrupijo sovražnika; +0,5 strupa', apply: s => { s.thornPoison = true; s.poison += 0.5; } },
  { need: ['fins', 'legs'], name: 'Dvoživka', desc: '+40 hitrosti in +30 višine skoka', apply: s => { s.speed += 40; s.jump += 30; } },
  { need: ['bloom', 'fat'], name: 'Obilne zaloge', desc: 'zdravje se obnavlja hitreje (+0,4)', apply: s => { s.regen += 0.4; } },
  { need: ['thermals', 'ember'], name: 'Vroči vzponski tokovi', desc: 'dobiš dodaten skok v zraku', apply: s => { s.airJumps += 1; } },
  { need: ['iceshell', 'spikes'], name: 'Ledene bodice', desc: '+2 škode z bodicami; dotik upočasni sovražnike', apply: s => { s.thorns += 2; s.thornChill = true; } },
  { need: ['bolt', 'torrent'], name: 'Nevihta', desc: 'čas ponovnega polnjenja aktivnih sposobnosti je 15 % krajši', apply: s => { s.cdMult *= 0.85; } },
  { need: ['canopy', 'shell'], name: 'Živi ščit', desc: 'dobiš ščit in +2 zdravja', apply: s => { s.shield = true; s.maxHp += 2; } },
  { need: ['permafrost', 'claws'], name: 'Ledeni kremplji', desc: '+1 škode pri napadih', apply: s => { s.dmg += 1; } },
];
SYNERGIES.forEach(y => { y.id = 'syn_' + y.need.join('_'); y.niche = 'syn'; y.syn = true; });
function synSources(y) { return y.need.map(n => TRAIT_BY_ID[n].name); }
// Sinergije, ki se odklenejo z izbiro te lastnosti.
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
  s.synergies = SYNERGIES.filter(y => y.need.every(id => owned.has(id)));
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
