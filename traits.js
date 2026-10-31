// Evolution tree. Each trait: requires (all owned), excludes (any owned blocks it), cost, apply(stats).
// Branches: offense, mobility, defense; tiers 1-4. Cross-branch synergies are in SYNERGIES.
const TRAITS = [
  // Offense
  { id: 'claws', name: 'Claws', branch: 'offense', tier: 1, cost: 2, desc: '+damage, +reach',
    apply: s => { s.dmg += 1; s.reach += 8; } },
  { id: 'rending', name: 'Rending Claws', branch: 'offense', tier: 2, cost: 4, requires: ['claws'], desc: '+damage, +reach',
    apply: s => { s.dmg += 1; s.reach += 12; } },
  { id: 'frenzy', name: 'Frenzy', branch: 'offense', tier: 3, cost: 6, requires: ['rending'], excludes: ['plating'],
    desc: 'much faster attacks', apply: s => { s.atkCd *= 0.55; } },
  { id: 'apex', name: 'Apex Predator', branch: 'offense', tier: 4, cost: 9, requires: ['frenzy'],
    desc: 'kills heal you', apply: s => { s.lifesteal = 1; } },
  { id: 'horns', name: 'Horns', branch: 'offense', tier: 1, cost: 2, desc: 'stronger knockback',
    apply: s => { s.knock += 120; s.dmg += 0.5; } },
  { id: 'ram', name: 'Ramming Charge', branch: 'offense', tier: 2, cost: 4, requires: ['horns'],
    desc: 'dashing hurts enemies', apply: s => { s.ram = true; } },
  // Mobility
  { id: 'legs', name: 'Spring Legs', branch: 'mobility', tier: 1, cost: 2, desc: 'run faster, jump higher',
    apply: s => { s.speed += 40; s.jump += 40; } },
  { id: 'doublejump', name: 'Hind Hops', branch: 'mobility', tier: 2, cost: 4, requires: ['legs'], desc: 'double jump',
    apply: s => { s.airJumps += 1; } },
  { id: 'dash', name: 'Burst Muscles', branch: 'mobility', tier: 3, cost: 6, requires: ['doublejump'], desc: 'dash',
    apply: s => { s.dash = true; } },
  { id: 'wings', name: 'Membrane Wings', branch: 'mobility', tier: 4, cost: 9, requires: ['dash'], excludes: ['plating'],
    desc: 'hold jump to glide', apply: s => { s.glide = true; } },
  // Defense
  { id: 'hide', name: 'Thick Hide', branch: 'defense', tier: 1, cost: 2, desc: '+3 max HP',
    apply: s => { s.maxHp += 3; } },
  { id: 'plating', name: 'Plating', branch: 'defense', tier: 2, cost: 4, requires: ['hide'], excludes: ['frenzy', 'wings', 'spit'],
    desc: '+5 max HP, slower', apply: s => { s.maxHp += 5; s.speed -= 30; } },
  { id: 'spikes', name: 'Spines', branch: 'defense', tier: 3, cost: 6, requires: ['plating'],
    desc: 'attackers take damage', apply: s => { s.thorns = 2; } },
  { id: 'regen', name: 'Regeneration', branch: 'defense', tier: 4, cost: 9, requires: ['spikes'],
    desc: 'heal over time', apply: s => { s.regen = 0.4; } },
  // Venom
  { id: 'fangs', name: 'Venom Fangs', branch: 'venom', tier: 1, cost: 2, desc: 'hits poison (ignores armor)',
    apply: s => { s.poison = 1; s.poisonDur = 3; } },
  { id: 'glands', name: 'Toxin Glands', branch: 'venom', tier: 2, cost: 4, requires: ['fangs'], desc: 'stronger, longer poison',
    apply: s => { s.poison += 0.7; s.poisonDur += 2; } },
  { id: 'spit', name: 'Acid Spit', branch: 'venom', tier: 3, cost: 6, requires: ['glands'], excludes: ['spikes'],
    desc: 'L: ranged poison shot', apply: s => { s.spit = true; } },
  { id: 'plague', name: 'Plague Carrier', branch: 'venom', tier: 4, cost: 9, requires: ['spit'],
    desc: 'poisoned kills spread poison', apply: s => { s.spread = true; } },
  // Boss rewards: unlocked by the 'bossToken' pseudo-trait, free, one pick per boss kill.
  { id: 'bossheart', name: 'Tyrant Heart', branch: 'boss', tier: 5, cost: 0, requires: ['bossToken'], desc: '+4 HP, +1 damage',
    apply: s => { s.maxHp += 4; s.dmg += 1; } },
  { id: 'cracker', name: 'Shell Cracker', branch: 'boss', tier: 5, cost: 0, requires: ['bossToken'], desc: 'ignore armor on front',
    apply: s => { s.pierce = true; } },
  { id: 'alpha', name: 'Alpha Rush', branch: 'boss', tier: 5, cost: 0, requires: ['bossToken'], desc: 'faster attacks & speed',
    apply: s => { s.atkCd *= 0.8; s.speed += 30; } },
];
const BRANCH_COLORS = { offense: '#d9534f', mobility: '#4fc3f7', defense: '#8bc34a', venom: '#ba68c8', boss: '#ffd54f' };
const SYNERGIES = [
  { need: ['claws', 'dash'], name: 'Pounce', desc: 'dash slashes deal +2', apply: s => { s.dashDmg += 2; } },
  { need: ['spikes', 'dash'], name: 'Spiked Rolling', desc: 'dashing hurts enemies', apply: s => { s.ram = true; } },
  { need: ['claws', 'fangs'], name: 'Envenomed Claws', desc: 'poison +1 dps', apply: s => { s.poison += 1; } },
  { need: ['hide', 'legs'], name: 'Hardy Runner', desc: '+1 max HP', apply: s => { s.maxHp += 1; } },
];
function computeStats(owned) {
  const s = { maxHp: 5, speed: 230, jump: 520, airJumps: 0, dmg: 1, reach: 34, atkCd: 0.38, knock: 180,
    dash: false, glide: false, ram: false, lifesteal: 0, thorns: 0, regen: 0, dashDmg: 0,
    poison: 0, poisonDur: 0, spit: false, spread: false, pierce: false };
  for (const t of TRAITS) if (owned.has(t.id)) t.apply(s);
  s.synergies = SYNERGIES.filter(y => y.need.every(n => owned.has(n)));
  s.synergies.forEach(y => y.apply(s));
  return s;
}
function traitState(t, owned, points) {
  if (owned.has(t.id)) return 'owned';
  if (t.requires && !t.requires.every(r => owned.has(r))) return 'locked';
  if (t.excludes && t.excludes.some(e => owned.has(e))) return 'blocked';
  return points >= t.cost ? 'buyable' : 'poor';
}
// Names of other traits that buying `t` would permanently block.
function blocksWhat(t) { return TRAITS.filter(o => (o.excludes || []).includes(t.id)).map(o => o.name); }
