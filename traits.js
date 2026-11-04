'use strict';
// Niše ohranijo tematske barve; razvoj poteka po štirih prepletenih dimenzijah.
const DIMENSIONS = {
  body: { name: 'Telesni načrt', short: 'Telo', color: '#ffb86b' },
  movement: { name: 'Gibanje in habitat', short: 'Gibanje', color: '#37b6f0' },
  offense: { name: 'Bojni slog', short: 'Boj', color: '#e0453f' },
  survival: { name: 'Preživetje', short: 'Preživetje', color: '#7cc242' },
};
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
const BODY_PLANS = {
  arthropod: { name: 'členonoško telo', niche: 'predator' },
  mollusk: { name: 'mehkužčasto telo', niche: 'water' },
  chordate: { name: 'strunarsko telo', niche: 'swift' },
  echinoderm: { name: 'iglokožčasto telo', niche: 'bulwark' },
  annelid: { name: 'kolobarniksko telo', niche: 'land' },
  flatworm: { name: 'ploščato črvasto telo', niche: 'land' },
  nematode: { name: 'valjasto črvasto telo', niche: 'venom' },
  avian: { name: 'pernato telo', niche: 'air' },
  drake: { name: 'luskasto telo', niche: 'fire' },
};
const NICHE_BODY_PLANS = Object.fromEntries(Object.entries(BODY_PLANS).map(([id, plan]) => [plan.niche, id]));
const ACTIVE_KEYS = ['KeyE', 'KeyQ', 'KeyR', 'KeyV'];
const ACTIVE_KEY_LABELS = ['E', 'Q', 'R', 'V'];
const TRAITS = [];
function T(id, name, niche, parent, desc, apply, extra) {
  const trait = Object.assign({ id, name, niche, parent, desc, apply }, extra || {});
  trait.requires = trait.requires || (parent ? [parent] : []);
  TRAITS.push(trait);
}
const NICHE_CONFLICTS = new Set(['air:water', 'fire:water']);
function nichesConflict(a, b) { return NICHE_CONFLICTS.has([a, b].sort().join(':')); }
function pathNiches(path) {
  if (!path) return [];
  const selected = Array.isArray(path.niches) ? path.niches : [path.primary, path.secondary, path.tertiary];
  return [...new Set(selected.filter(niche => NICHES[niche] && niche !== 'boss' && niche !== 'syn'))].slice(0, 3);
}
function nicheAllowedByPath(niche, path) {
  const selected = pathNiches(path);
  return !selected.length || selected.includes(niche);
}
function traitAllowedByPath(t, path) {
  const selected = pathNiches(path);
  if (path && path.founderPicks < 2 && (['fire', 'venom'].includes(t.niche) || (t.excludes || []).length)) return false;
  if (!selected.length || selected.includes(t.niche)) return true;
  if (path.founderPicks >= 3 || selected.length >= 3) return false;
  return !selected.some(niche => nichesConflict(niche, t.niche));
}
// --- Plenilec ---
T('claws', 'Kremplji', 'predator', null, '+1 škode in daljši doseg', s => { s.dmg += 1; s.reach += 8; }, { excludes: ['horns'], bodyPlan: 'arthropod' });
T('rending', 'Razdiralni kremplji', 'predator', 'claws', '+1 škode in daljši kremplji', s => { s.dmg += 1; s.reach += 12; });
T('horns', 'Rogovi', 'predator', null, 'močneje odbiješ sovražnike in povzročiš +0,5 škode; ohraniš štirinožno držo', s => { s.knock += 120; s.dmg += 0.5; }, { excludes: ['claws'], bodyPlan: 'chordate' });
T('frenzy', 'Bes', 'predator', 'rending', 'napadaš hitreje', s => { s.atkCd *= 0.75; }, { excludes: ['carapace'] });
T('cleave', 'Krožni zamah', 'predator', 'rending', 'zamahneš v obe smeri', s => { s.spin = true; s.reach += 6; });
T('apex', 'Vrhunski plenilec', 'predator', 'frenzy', 'ko premagaš sovražnika, si povrneš zdravje', s => { s.lifesteal = 1; s.dmg += 1; });
T('bloodscent', 'Krvni vonj', 'predator', 'apex', 'ob porazu sovražnika si povrneš še 1 zdravje', s => { s.lifesteal += 1; });
T('ram', 'Naskok', 'predator', 'horns', 'sunek poškoduje sovražnike', s => { s.dash = true; s.ram = true; });
T('breaker', 'Lomilec oklepa', 'predator', 'horns', 'napadi prebijejo oklep in povzročijo +0,5 škode', s => { s.pierce = true; s.dmg += 0.5; });
T('gore', 'Nabijanje', 'predator', 'ram', 'sunek povzroči veliko škode in odbije sovražnike', s => { s.dashDmg += 2; s.knock += 100; });
// --- Hitrost ---
T('legs', 'Močne noge', 'swift', null, 'tečeš hitreje in skačeš višje', s => { s.speed += 40; s.jump += 40; }, { bodyPlan: 'chordate' });
T('hops', 'Prožen odriv', 'swift', 'legs', '+60 višine skoka', s => { s.jump += 60; });
T('tail', 'Rep za ravnotežje', 'swift', 'legs', 'nekoliko hitreje tečeš in višje skačeš', s => { s.speed += 25; s.jump += 20; });
T('dash', 'Hiter sunek', 'swift', 'hops', 'sunkovito se poženeš naprej (K / Shift)', s => { s.dash = true; });
T('wings', 'Kožnata krila', 'swift', 'hops', 'med padanjem lahko drsiš (drži tipko za skok)', s => { s.glide = true; }, { excludes: ['carapace', 'gel'] });
T('phase', 'Senčni sunek', 'swift', 'dash', 'sunek traja dlje in prekrije večjo razdaljo', s => { s.dashDuration = 0.24; });
T('flyer', 'Močnejša krila', 'air', 'thermals', 'močnejši zamah ti omogoči dodaten skok v zraku in počasnejši padec', s => { s.airJumps += 1; s.glideFall = 60; }, { requires: ['feathers', 'thermals'] });
T('sprint', 'Šprint', 'swift', 'tail', 'tečeš precej hitreje', s => { s.speed += 70; });
T('pounce', 'Udar ob pristanku', 'swift', 'tail', 'pristanek po padcu poškoduje bližnje sovražnike', s => { s.stomp = true; }, { requires: ['tail', 'hops'] });
// --- Vzdržljivost ---
T('hide', 'Debela koža', 'bulwark', null, '+3 zdravja', s => { s.maxHp += 3; }, { bodyPlan: 'echinoderm' });
T('carapace', 'Oklep', 'bulwark', 'hide', '+5 zdravja, vendar tečeš počasneje; ni združljiv z letom', s => { s.maxHp += 5; s.speed -= 30; }, { excludes: ['frenzy', 'wings', 'thermals', 'flyer'] });
T('fat', 'Maščobne zaloge', 'bulwark', 'hide', '+2 zdravja in počasno obnavljanje zdravja', s => { s.maxHp += 2; s.regen += 0.15; });
T('spikes', 'Bodice', 'bulwark', 'carapace', 'sovražniki, ki se te dotaknejo, prejmejo škodo', s => { s.thorns += 2; });
T('shell', 'Školjka', 'bulwark', 'carapace', 'ščit izniči prvi zadetek na vsaki stopnji', s => { s.shield = true; });
T('barbed', 'Ježeve bodice', 'bulwark', 'spikes', 'bodice povzročijo dodatno škodo', s => { s.thorns += 3; });
T('regen', 'Regeneracija', 'bulwark', 'fat', 'zdravje se obnavlja hitreje', s => { s.regen += 0.4; });
T('bulk', 'Težka postava', 'bulwark', 'fat', '+1 škode in +2 zdravja; težka postava ne more leteti', s => { s.dmg += 1; s.maxHp += 2; }, { excludes: ['wings', 'thermals'] });
T('undying', 'Nesmrtna vzdržljivost', 'bulwark', 'regen', 'enkrat na tek se po porazu vrneš v boj', s => { s.revive = true; });
T('stonehide', 'Kamnite luske', 'bulwark', 'carapace', '+1 zdravje in 15 % manj prejete škode', s => { s.maxHp += 1; s.damageReduction += 0.15; });
// --- Strup ---
T('fangs', 'Strupeni zobje', 'venom', null, 'tvoji napadi zastrupijo sovražnike', s => { s.poison = 1; s.poisonDur = 3; }, { bodyPlan: 'nematode' });
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
T('curl', 'Zvijanje v klobčič', 'bulwark', 'shell', 'AKTIVNO: za 2,5 sekunde se zviješ in prejmeš 65 % manj škode', s => { s.curl = true; }, { active: { cd: 12, name: 'Klubko', color: '#9be15d' } });
T('quills', 'Izstrelki iz bodic', 'bulwark', 'barbed', 'AKTIVNO: izstreliš bodice v vse smeri', s => { s.thorns += 1; }, { active: { cd: 6, name: 'Bodice', color: '#e8e0c0' } });
T('colossus', 'Kolos', 'bulwark', 'bulk', 'postaneš večji; +3 zdravja, +1 škode in močnejši odriv', s => { s.maxHp += 3; s.dmg += 1; s.knock += 80; }, { scale: 1.12 });
T('miasma', 'Strupena meglica', 'venom', 'cloud', 'AKTIVNO: zastrupiš bližnje sovražnike', s => {}, { active: { cd: 10, name: 'Meglica', color: '#c24ff0' } });
T('epidemic', 'Epidemija', 'venom', 'plague', 'AKTIVNO: za 3 sekunde zmerno zastrupiš vse sovražnike', s => {}, { active: { cd: 24, name: 'Epidemija', color: '#9be15d' } });
T('neuro', 'Nevrotoksin', 'venom', 'slow', '+1 strup; zastrupljeni sovražniki se še počasneje premikajo', s => { s.poison += 1; });
// --- Ogenj (nova niša) ---
T('ember', 'Žerjavica v krvi', 'fire', null, 'tvoji napadi zažgejo sovražnike', s => { s.burn = 1.2; s.burnDur = 3; }, { excludes: ['gel'], bodyPlan: 'chordate' });
T('breath', 'Ognjeni dih', 'fire', 'ember', 'AKTIVNO: izbruhaš plamene pred seboj', s => {}, { active: { cd: 5, name: 'Ognjeni dih', color: '#ff8a2a' } });
T('firevortex', 'Ognjeni vrtinec', 'fire', 'breath', 'AKTIVNO: za 5 sekund ustvariš vrtinec ognja pred seboj', s => {}, { active: { cd: 12, name: 'Ognjeni vrtinec', color: '#ff672b' } });
T('scorch', 'Ožgana sled', 'fire', 'ember', 'zažgeš bližnje sovražnike', s => { s.fireAura = true; });
T('molten', 'Staljena koža', 'fire', 'ember', '+2 zdravja; sovražniki, ki se te dotaknejo, zagorijo', s => { s.maxHp += 2; s.thorns += 2; s.thornFire = true; });
T('inferno', 'Ognjeni vihar', 'fire', 'breath', 'ogenj povzroča več škode in traja dlje', s => { s.burn += 1.5; s.burnDur += 2; s.breathCd = 0.65; });
T('cinder', 'Žareči pepel', 'fire', 'scorch', 'goreči sovražniki ob porazu eksplodirajo', s => { s.cinder = true; });
T('magma', 'Magma', 'fire', 'molten', '+4 zdravja in počasno obnavljanje zdravja', s => { s.maxHp += 4; s.regen += 0.2; });
// --- Voda (led je globoko v veji) ---
T('gel', 'Sluzasta koža', 'water', null, '+2 zdravja in +20 hitrosti; ne združuje se z ognjem ali letom', s => { s.maxHp += 2; s.speed += 20; }, { excludes: ['ember', 'wings', 'thermals'], bodyPlan: 'mollusk' });
T('gills', 'Škrge', 'water', 'gel', '+2 zdravja in počasna obnova (+0,2 zdravja/s)', s => { s.maxHp += 2; s.regen += 0.2; });
T('fins', 'Plavuti', 'water', 'gel', 'odkleneš sunek, če ga še nimaš, in pridobiš +30 hitrosti', s => { s.dash = true; s.speed += 30; });
T('tentacle', 'Lovke', 'water', 'gel', '+18 dosega in +0,5 škode', s => { s.reach += 18; s.dmg += 0.5; });
T('frost', 'Ledeni dotik', 'water', 'fins', 'tvoji napadi upočasnijo sovražnike', s => { s.chill = true; });
T('torrent', 'Hudournik', 'water', 'fins', 'AKTIVNO: pošlješ vodni val, ki odbije sovražnike pred teboj', s => {}, { active: { cd: 7, name: 'Vodni val', color: '#3b9bff' } });
T('iceshell', 'Ledeni oklep', 'water', 'tentacle', '+4 zdravja; sovražniki, ki se te dotaknejo, se upočasnijo', s => { s.maxHp += 4; s.thornChill = true; });
T('blizzard', 'Snežni vihar', 'water', 'frost', 'AKTIVNO: zamrzneš bližnje sovražnike', s => {}, { active: { cd: 11, name: 'Snežni vihar', color: '#bfeaff' } });
T('permafrost', 'Večni led', 'water', 'frost', 'ohlajeni sovražniki prejmejo 50 % več škode', s => { s.shatter = true; }, { requires: ['frost', 'iceshell'] });
T('leviathan', 'Levijatan', 'water', 'torrent', 'postaneš večji; +3 zdravja in +1 škode', s => { s.maxHp += 3; s.dmg += 1; }, { scale: 1.15 });
// --- Rastline ---
T('roots', 'Korenine', 'land', null, '+3 zdravja in počasno obnavljanje zdravja', s => { s.maxHp += 3; s.regen += 0.1; }, { bodyPlan: 'annelid' });
T('vines', 'Plezalke', 'land', 'roots', '+22 dosega in +0,5 škode', s => { s.reach += 22; s.dmg += 0.5; });
T('bloom', 'Cvetenje', 'land', 'roots', 'zdravje se obnavlja hitreje', s => { s.regen += 0.3; });
T('thornvine', 'Trnasta ovijalka', 'land', 'vines', 'sovražniki, ki se te dotaknejo, prejmejo škodo', s => { s.thorns += 2; });
T('snare', 'Koreninska zanka', 'land', 'vines', 'AKTIVNO: korenine ujamejo bližnje sovražnike', s => {}, { active: { cd: 9, name: 'Koreninska zanka', color: '#4fae3f' } });
T('spores', 'Spore', 'land', 'bloom', 'upočasniš bližnje sovražnike', s => { s.sporeAura = true; });
T('canopy', 'Krošnja', 'land', 'bloom', '+4 zdravja in hitrejše obnavljanje zdravja', s => { s.maxHp += 4; s.regen += 0.2; });
T('treant', 'Drevesni velikan', 'land', 'thornvine', 'postaneš večji; +3 zdravja, +1 škode in bodice', s => { s.maxHp += 3; s.dmg += 1; s.thorns += 2; }, { scale: 1.2 });
T('bloomburst', 'Cvetni izbruh', 'land', 'spores', 'AKTIVNO: povrneš si 2 točki zdravja in upočasniš sovražnike', s => {}, { active: { cd: 12, name: 'Cvetni izbruh', color: '#ff7ab8' } });
T('mossmantle', 'Mahovna simbioza', 'land', 'spores', 'telo preraste mah; +2 zdravja in hitrejša obnova (+0,25/s)', s => { s.maxHp += 2; s.regen += 0.25; });
T('giantbloom', 'Hrbtna megacvetnica', 'land', 'canopy', 'na hrbtu zraste velika rastlina; +3 zdravja in +0,2 obnove/s', s => { s.maxHp += 3; s.regen += 0.2; });
// --- Zrak (elektrika) ---
T('feathers', 'Perje', 'air', null, 'telo prekrije perje in pridobiš +20 hitrosti', s => { s.speed += 20; }, { bodyPlan: 'chordate' });
T('static', 'Statični naboj', 'air', 'feathers', 'tvoj napad z elektriko zadene še bližnjega sovražnika', s => { s.arc = 1; });
T('thermals', 'Vzponski tokovi', 'air', 'feathers', 'med padanjem lahko drsiš (drži tipko za skok)', s => { s.glide = true; s.glideFall = 90; }, { excludes: ['carapace', 'gel', 'bulk'] });
T('swoop', 'Jadralni napad', 'air', 'thermals', 'odkleneš sunek, če ga še nimaš; napadi med drsenjem povzročijo +1 škodo', s => { s.dash = true; s.glideDmg += 1; });
T('conduct', 'Prevodnost', 'air', 'static', 'električni udar preskoči na več sovražnikov', s => { s.arc += 2; });
T('bolt', 'Strela', 'air', 'static', 'AKTIVNO: strela udari do 3 sovražnike', s => {}, { active: { cd: 8, name: 'Strela', color: '#fff35a' } });
T('gust', 'Sunek vetra', 'air', 'thermals', 'odkleneš sunek, če ga še nimaš, in skrajšaš njegovo obnovo', s => { s.dash = true; s.dashCd = Math.min(s.dashCd, 0.5); });
T('stormcloud', 'Nevihtni oblak', 'air', 'thermals', 'ob pristanku udariš ob tla in dobiš dodaten skok', s => { s.stomp = true; s.airJumps += 1; });
T('tempest', 'Vihar', 'air', 'bolt', 'strela lahko zadene do 5 sovražnikov', s => { s.boltN = 5; });
T('thunderlord', 'Gospodar nevihte', 'air', 'conduct', '+1 škode, hitrejši napadi in močnejše strele', s => { s.dmg += 1; s.atkCd *= 0.85; s.arcDmg += 1; }, { requires: ['conduct', 'thermals'], scale: 1.1 });
T('stinger', 'Strupeno želo', 'venom', 'fangs', 'z repnim želom okrepiš strup (+0,5) in njegov učinek (+1 s)', s => { s.stinger = true; s.poison += 0.5; s.poisonDur += 1; });
T('pincers', 'Klešče', 'predator', 'horns', '+0,5 škode in +10 dosega; ohraniš štirinožno držo', s => { s.dmg += 0.5; s.reach += 10; }, { excludes: ['claws'] });
T('manylegs', 'Šest nog', 'bulwark', 'carapace', 'razviješ dodaten par nog in pridobiš +20 hitrosti', s => { s.speed += 20; });
T('creepingbody', 'Plosko telo', 'land', 'roots', 'telo se razširi in splošči; razviješ značilno drseče gibanje', s => { s.speed += 15; }, { bodyPlan: 'flatworm' });
// Skrite starodavne prilagoditve so na voljo samo kot nagrada za raziskovanje brlogov.
T('heartroot', 'Koreninsko srce', 'land', null, '+2 zdravja in počasna obnova (+0,25 zdravja/s)', s => { s.maxHp += 2; s.regen += 0.25; }, { secret: true });
T('tidalheart', 'Srce globin', 'water', null, '+1 zdravje; tvoji napadi upočasnijo sovražnike', s => { s.maxHp += 1; s.chill = true; }, { secret: true, excludes: ['ember'] });
T('skyshroud', 'Plašč prvih vetrov', 'air', null, 'dobiš drsenje in dodaten skok v zraku', s => { s.glide = true; s.glideFall = 85; s.airJumps += 1; }, { secret: true, excludes: ['carapace', 'gel', 'bulk'] });
T('worldfang', 'Očnjak pradavnine', 'predator', null, '+0,5 škode, +12 dosega in močnejši odriv', s => { s.dmg += 0.5; s.reach += 12; s.knock += 45; }, { secret: true });
T('ironbloom', 'Železni cvet', 'bulwark', null, '+2 zdravja in +1 škode ob dotiku', s => { s.maxHp += 2; s.thorns += 1; }, { secret: true });
T('ancientspore', 'Starodavne spore', 'venom', null, '+0,5 strupa; zastrupitev se širi ob porazu sovražnika', s => { s.poison += 0.5; s.poisonDur += 1; s.spread = true; }, { secret: true });
// --- Nagrade za šefa (ena na šefa) ---
T('bossheart', 'Tiranovo srce', 'boss', null, '+5 zdravja in +1 škode', s => { s.maxHp += 5; s.dmg += 1; }, { boss: true });
T('cracker', 'Lomilec oklepa', 'boss', null, 'prebiješ sovražnikov oklep in povzročiš +0,5 škode', s => { s.pierce = true; s.dmg += 0.5; }, { boss: true });
T('alpha', 'Alfa naskok', 'boss', null, 'tečeš in napadaš hitreje; odkleneš močnejši sunek', s => { s.atkCd *= 0.75; s.speed += 40; s.dash = true; s.dashDmg += 1; }, { boss: true });

const TRAIT_DIMENSIONS = {
  body: ['claws', 'horns', 'legs', 'tail', 'wings', 'fangs', 'glands', 'hide', 'gel', 'gills', 'fins', 'tentacle', 'roots', 'vines', 'feathers', 'skyshroud', 'stinger', 'pincers', 'creepingbody'],
  movement: ['hops', 'dash', 'phase', 'flyer', 'sprint', 'pounce', 'thermals', 'swoop', 'gust', 'stormcloud', 'gale', 'alpha'],
  offense: ['rending', 'frenzy', 'cleave', 'apex', 'bloodscent', 'ram', 'breaker', 'gore', 'spit', 'plague', 'ambush', 'roar', 'trample',
    'meteor', 'quills', 'miasma', 'epidemic', 'neuro', 'ember', 'breath', 'scorch', 'inferno', 'cinder', 'frost', 'torrent',
    'firevortex', 'blizzard', 'permafrost', 'snare', 'bloomburst', 'static', 'conduct', 'bolt', 'tempest', 'thunderlord', 'cracker', 'worldfang', 'ancientspore'],
  survival: ['carapace', 'stonehide', 'fat', 'spikes', 'shell', 'barbed', 'regen', 'bulk', 'undying', 'camo', 'cloud', 'slow', 'titan',
    'curl', 'colossus', 'molten', 'magma', 'iceshell', 'leviathan', 'bloom', 'thornvine', 'spores', 'canopy', 'treant', 'mossmantle', 'giantbloom',
    'manylegs', 'bossheart', 'heartroot', 'tidalheart', 'ironbloom'],
};
const TRAIT_DIMENSION = {};
for (const [dimension, ids] of Object.entries(TRAIT_DIMENSIONS)) {
  for (const id of ids) {
    if (TRAIT_DIMENSION[id]) throw new Error(`Trait ${id} has more than one progression dimension.`);
    TRAIT_DIMENSION[id] = dimension;
  }
}
for (const t of TRAITS) {
  t.dimension = TRAIT_DIMENSION[t.id];
  if (!t.dimension) throw new Error(`Trait ${t.id} has no progression dimension.`);
}
const GENERIC = [
  { id: 'g_hp', name: 'Prilagoditev: vzdržljivost', niche: 'bulwark', desc: '+2 zdravja', apply: s => { s.maxHp += 2; } },
  { id: 'g_dmg', name: 'Prilagoditev: močnejši napad', niche: 'predator', desc: '+0,5 škode', apply: s => { s.dmg += 0.5; } },
  { id: 'g_spd', name: 'Prilagoditev: hitrost', niche: 'swift', desc: '+20 hitrosti', apply: s => { s.speed += 20; } },
];
const TRAIT_BY_ID = {};
TRAITS.forEach(t => { TRAIT_BY_ID[t.id] = t; });
for (const t of TRAITS) for (const id of t.excludes || []) {
  const other = TRAIT_BY_ID[id];
  if (!other.excludes) other.excludes = [];
  if (!other.excludes.includes(t.id)) other.excludes.push(t.id);
}
function traitRequires(t) { return t.requires || (t.parent ? [t.parent] : []); }

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
  { need: ['frost', 'roots'], name: 'Ledene korenine', desc: '+0,5 škode in +15 dosega', apply: s => { s.dmg += 0.5; s.reach += 15; } },
  { need: ['static', 'fangs'], name: 'Električni strup', desc: 'električni udar povzroči +1 škodo', apply: s => { s.arcDmg += 1; } },
  { need: ['vines', 'fangs'], name: 'Strupene ovijalke', desc: 'bodice zastrupijo sovražnika; +0,5 strupa', apply: s => { s.thornPoison = true; s.poison += 0.5; } },
  { need: ['fins', 'legs'], name: 'Dvoživka', desc: '+40 hitrosti in +30 višine skoka', apply: s => { s.speed += 40; s.jump += 30; } },
  { need: ['bloom', 'fat'], name: 'Obilne zaloge', desc: 'zdravje se obnavlja hitreje (+0,4)', apply: s => { s.regen += 0.4; } },
  { need: ['thermals', 'ember'], name: 'Vroči vzponski tokovi', desc: 'dobiš dodaten skok v zraku', apply: s => { s.airJumps += 1; } },
  { need: ['iceshell', 'spikes'], name: 'Ledene bodice', desc: '+2 škode z bodicami; dotik upočasni sovražnike', apply: s => { s.thorns += 2; s.thornChill = true; } },
  { need: ['bolt', 'gust'], name: 'Nevihtna sinhronizacija', desc: 'čas ponovnega polnjenja aktivnih sposobnosti je 15 % krajši', apply: s => { s.cdMult *= 0.85; } },
  { need: ['canopy', 'shell'], name: 'Živi ščit', desc: 'dobiš ščit in +2 zdravja', apply: s => { s.shield = true; s.maxHp += 2; } },
  { need: ['permafrost', 'claws'], name: 'Ledeni kremplji', desc: '+1 škode pri napadih', apply: s => { s.dmg += 1; } },
];
SYNERGIES.forEach(y => { y.id = 'syn_' + y.need.join('_'); y.niche = 'syn'; y.syn = true; });
function synSources(y) { return y.need.map(n => TRAIT_BY_ID[n].name); }
// Sinergije, ki se odklenejo z izbiro te lastnosti.
function hintsSyn(t, owned) { return SYNERGIES.filter(y => !owned.has(y.id) && y.need.includes(t.id) && y.need.every(n => n === t.id || owned.has(n))).map(y => y.name); }

function computeStats(owned, extras) {
  const s = { maxHp: 5, speed: 230, jump: 520, airJumps: 0, dmg: 1, reach: 34, atkCd: 0.38, knock: 180,
    dash: false, dashCd: 0.7, dashDuration: 0.16, glide: false, glideFall: 120, glideDmg: 0, ram: false, curl: false, stinger: false, lifesteal: 0, thorns: 0, regen: 0, dashDmg: 0,
    poison: 0, poisonDur: 0, spit: false, spitCd: 0.8, spread: false, pierce: false, spin: false, stomp: false,
    shield: false, revive: false, invTime: 1, ambush: false, slow: false, aura: false, thornPoison: false, damageReduction: 0,
    cdMult: 1, chill: false, shatter: false, thornChill: false, sporeAura: false, arc: 0, arcDmg: 1, boltN: 3,
    burn: 0, burnDur: 0, fireAura: false, thornFire: false, cinder: false, breathCd: 5, scale: 1 };
  for (const t of TRAITS) if (owned.has(t.id)) { t.apply(s); if (t.scale) s.scale = Math.max(s.scale, t.scale); }
  s.actives = [...owned].filter(id => TRAIT_BY_ID[id] && TRAIT_BY_ID[id].active).slice(0, 4);
  if (extras) for (const g of GENERIC) for (let i = 0; i < (extras[g.id] || 0); i++) g.apply(s);
  s.synergies = SYNERGIES.filter(y => y.need.every(id => owned.has(id)));
  s.synergies.forEach(y => y.apply(s));
  return s;
}
function traitTier(t, memo = {}) {
  if (!t) return 1;
  if (memo[t.id]) return memo[t.id];
  memo[t.id] = 1;
  const requires = traitRequires(t);
  if (requires.length) memo[t.id] = 1 + Math.max(...requires.map(id => traitTier(TRAIT_BY_ID[id], memo)));
  return memo[t.id];
}
function traitState(t, owned) {
  if (owned.has(t.id)) return 'owned';
  for (const o of owned) { const ot = TRAIT_BY_ID[o]; if (ot && (ot.excludes || []).includes(t.id)) return 'blocked'; }
  if ((t.excludes || []).some(e => owned.has(e))) return 'blocked';
  if (traitRequires(t).some(id => !owned.has(id) && traitState(TRAIT_BY_ID[id], owned) === 'blocked')) return 'blocked';
  if (!traitRequires(t).every(id => owned.has(id))) return 'locked';
  return 'open';
}
function nicheInvest(owned) {
  const c = { predator: 0, swift: 0, bulwark: 0, venom: 0, fire: 0, water: 0, land: 0, air: 0 };
  for (const t of TRAITS) if (owned.has(t.id) && c[t.niche] !== undefined) c[t.niche] += traitTier(t);
  return c;
}
function dominantNiche(owned, path = null) {
  const invest = nicheInvest(owned);
  const selected = pathNiches(path);
  const roots = [...owned].map(id => TRAIT_BY_ID[id]).filter(t => t && !t.boss && !t.secret);
  const tieOrder = [...selected, ...roots.map(t => t.niche)];
  let best = null, score = 0, order = -1;
  for (const niche of Object.keys(invest)) {
    const rank = tieOrder.lastIndexOf(niche);
    if (invest[niche] > score || (invest[niche] === score && invest[niche] > 0 && rank > order)) {
      best = niche; score = invest[niche]; order = rank;
    }
  }
  return best;
}
function dimensionInvest(owned) {
  const c = Object.fromEntries(Object.keys(DIMENSIONS).map(key => [key, 0]));
  for (const t of TRAITS) if (owned.has(t.id)) c[t.dimension]++;
  return c;
}
// Ponudbe ohranijo težo izbranih niš, vendar odpirajo tudi manj razvite dimenzije.
function offers(owned, n = 3, path = null) {
  const inv = nicheInvest(owned);
  const dimInv = dimensionInvest(owned);
  const full = [...owned].filter(id => TRAIT_BY_ID[id] && TRAIT_BY_ID[id].active).length >= 4;
  let candidates = TRAITS.filter(t => !t.boss && !t.secret && !(full && t.active) && traitState(t, owned) === 'open');
  if (path && !pathNiches(path).length) candidates = candidates.filter(t => traitRequires(t).length === 0);
  else if (path && pathNiches(path).length) candidates = candidates.filter(t => traitAllowedByPath(t, path));
  const selectedNiches = pathNiches(path);
  const founding = !!path && path.founderPicks < 3;
  const newRoots = founding && selectedNiches.length < 3
    ? candidates.filter(t => traitRequires(t).length === 0 && !selectedNiches.includes(t.niche))
    : [];
  const pool = candidates.map(t => ({
    t,
    w: (1 + 2.5 * inv[t.niche]) * (selectedNiches.includes(t.niche) ? 3 : 1)
      * (1 + 0.6 / (1 + dimInv[t.dimension])),
  }));
  const out = [];
  const leastInvested = Math.min(...pool.map(x => dimInv[x.t.dimension]));
  const fresh = pool.filter(x => dimInv[x.t.dimension] === leastInvested);
  if (!founding && owned.size > 0 && fresh.length && n >= 3 && out.length < n - 1) out.push(pool.splice(pool.indexOf(fresh[Math.floor(Math.random() * fresh.length)]), 1)[0].t);
  const pickWeighted = choices => {
    let r = Math.random() * choices.reduce((sum, item) => sum + item.w, 0), i = 0;
    while (i < choices.length - 1 && (r -= choices[i].w) > 0) i++;
    return choices[i];
  };
  while (out.length < n && newRoots.length) {
    const chosen = newRoots[Math.floor(Math.random() * newRoots.length)];
    out.push(chosen);
    newRoots.splice(newRoots.indexOf(chosen), 1);
    for (let i = newRoots.length - 1; i >= 0; i--) if (newRoots[i].niche === chosen.niche) newRoots.splice(i, 1);
    const index = pool.findIndex(x => x.t.id === chosen.id);
    if (index >= 0) pool.splice(index, 1);
  }
  while (out.length < n && pool.length) {
    const distinct = pool.filter(x => !out.some(t => t.niche === x.t.niche));
    const available = distinct.length ? distinct : pool;
    const chosen = pickWeighted(available);
    out.push(chosen.t);
    pool.splice(pool.indexOf(chosen), 1);
  }
  for (const g of GENERIC) if (out.length < n) out.push(g);
  return out;
}
function nicheTraitPool(owned, niche, path) {
  const selected = pathNiches(path);
  if (path && !selected.includes(niche) && (path.founderPicks >= 3 || selected.length >= 3
    || selected.some(existing => nichesConflict(existing, niche)))) return [];
  const activeFull = [...owned].filter(id => TRAIT_BY_ID[id] && TRAIT_BY_ID[id].active).length >= 4;
  return TRAITS.filter(t => t.niche === niche && !t.boss && !t.secret && !(activeFull && t.active)
    && traitState(t, owned) === 'open' && traitAllowedByPath(t, path));
}
function nicheOffers(owned, path = null, n = 3) {
  let niches = Object.keys(NICHES).filter(niche => niche !== 'boss' && niche !== 'syn'
    && (nicheTraitPool(owned, niche, path).length || GENERIC.some(g => g.niche === niche)));
  if (path && pathNiches(path).length && (path.founderPicks >= 3 || pathNiches(path).length >= 3)) {
    niches = niches.filter(niche => pathNiches(path).includes(niche));
  }
  for (let i = niches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [niches[i], niches[j]] = [niches[j], niches[i]];
  }
  return niches.slice(0, n);
}
function offersForNiche(owned, niche, n = 3, path = null, avoid = []) {
  const pool = nicheTraitPool(owned, niche, path);
  if (!pool.length) pool.push(...GENERIC.filter(g => g.niche === niche));
  const fresh = pool.filter(t => !avoid.includes(t.id));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const out = fresh.slice(0, n);
  if (out.length < Math.min(n, pool.length)) {
    const fill = pool.filter(t => !out.includes(t));
    for (let i = fill.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fill[i], fill[j]] = [fill[j], fill[i]];
    }
    out.push(...fill.slice(0, Math.min(n, pool.length) - out.length));
  }
  return out;
}
function bossOffers(owned) { return TRAITS.filter(t => t.boss && !owned.has(t.id)).slice(0, 3); }
function secretOffers(owned, path = null) {
  const pool = TRAITS.filter(t => t.secret && traitState(t, owned) === 'open'
    && (!path || !pathNiches(path).length || traitAllowedByPath(t, path)));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
function opensWhat(t, owned) {
  const next = new Set([...owned, t.id]);
  return TRAITS.filter(x => traitRequires(x).includes(t.id) && traitState(x, owned) !== 'open' && traitState(x, next) === 'open').map(x => x.name);
}
function closesWhat(t, owned) {
  const next = new Set([...owned, t.id]);
  return TRAITS.filter(x => !owned.has(x.id) && x.id !== t.id
    && traitState(x, owned) !== 'blocked' && traitState(x, next) === 'blocked').map(x => x.name);
}
function lineage(owned) {
  const out = [];
  for (const k of ['predator', 'swift', 'bulwark', 'venom', 'fire', 'water', 'land', 'air']) {
    const list = TRAITS.filter(t => t.niche === k && owned.has(t.id)).sort((a, b) => traitTier(a) - traitTier(b));
    if (list.length) out.push({ niche: k, text: list.map(t => t.name).join(' › ') });
  }
  return out;
}
function creatureIdentity(owned, path = null) {
  const ranked = Object.entries(nicheInvest(owned)).filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1]);
  const selected = pathNiches(path);
  if (!ranked.length) {
    const primary = selected[0];
    return primary ? `${singleIdentity(primary)} · ${BODY_PLANS[NICHE_BODY_PLANS[primary]].name}` : 'Sluz';
  }
  const primary = dominantNiche(owned, path) || ranked[0][0];
  const secondary = ranked.find(([niche]) => niche !== primary)?.[0] || selected.find(niche => niche !== primary);
  const tertiary = selected.find(niche => niche !== primary && niche !== secondary);
  const identities = {
    'land:air': 'Rastlinski letalec', 'air:land': 'Zračni vrtnar',
    'predator:air': 'Krilati plenilec', 'air:predator': 'Zračni lovec',
    'water:air': 'Vodni jadralec', 'air:water': 'Vodni letalec',
    'land:predator': 'Rastlinski lovec', 'predator:land': 'Zeleni plenilec',
    'water:predator': 'Vodni plenilec', 'predator:water': 'Vodna zver',
    'fire:water': 'Parni plenilec', 'water:fire': 'Parni lovec',
    'venom:predator': 'Strupeni plenilec', 'predator:venom': 'Strupeni lovec',
    'bulwark:predator': 'Oklepni plenilec', 'predator:bulwark': 'Močni varuh',
    'swift:predator': 'Hitri plenilec', 'predator:swift': 'Hitri lovec',
    'land:water': 'Močvirski stvor', 'water:land': 'Močvirski varuh',
    'fire:air': 'Ognjeni letalec', 'air:fire': 'Ognjeni zmaj',
  };
  const base = secondary && identities[`${primary}:${secondary}`] || singleIdentity(primary);
  const identity = tertiary ? `${base} · ${NICHES[tertiary].name}` : base;
  const bodyPlan = NICHE_BODY_PLANS[primary];
  return bodyPlan ? `${identity} · ${BODY_PLANS[bodyPlan].name}` : identity;
}
function singleIdentity(primary) {
  const single = {
    predator: 'Plenilec', swift: 'Hitrostni tekač', bulwark: 'Oklepni varuh', venom: 'Strupeni lovec',
    fire: 'Ognjeni stvor', water: 'Vodni stvor', land: 'Rastlinski stvor', air: 'Zračni letalec',
  };
  return single[primary];
}
