const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 960, H = 540, G = 1500, TILE = 40;
const keys = {}, pressed = {};
addEventListener('keydown', e => { if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
const down = (...c) => c.some(k => keys[k]), hit = (...c) => c.some(k => pressed[k]);

const owned = new Set();
let shots = [], pshots = [], points = 0, stats = computeStats(owned), room = 0, mode = 'play', platforms, enemies, player, particles = [], shake = 0, menuRects = [];

function newPlayer() {
  return { x: 80, y: 400, w: 28, h: 36, vx: 0, vy: 0, face: 1, hp: stats.maxHp, ground: false, coyote: 0, buffer: 0,
    jumps: 0, atkT: 0, atkCd: 0, spitCd: 0, dashT: 0, dashCd: 0, inv: 0, hurtT: 0 };
}
function startRoom() {
  room++;
  platforms = [{ x: 0, y: 500, w: W, h: 40 }];
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) platforms.push({ x: 120 + Math.random() * 640, y: 150 + Math.random() * 280, w: 100 + Math.random() * 120, h: 16 });
  enemies = []; shots = []; pshots = [];
  const isBoss = room % 5 === 0, count = isBoss ? 2 : 2 + room;
  if (isBoss) enemies.push({ kind: 'boss', x: 780, y: 300, w: 56, h: 64, vx: 0, vy: 0, hp: 18 + room * 2, maxHp: 18 + room * 2, dir: -1, face: -1, turnT: 0, ground: false, flash: 0, kb: 0, t: 0, shootT: 2 });
  for (let i = 0; i < count; i++) {
    const r = Math.random(), kinds = ['walker'];
    if (room >= 2) kinds.push('hopper', 'spitter');
    if (room >= 3) kinds.push('armored');
    const kind = room === 3 && i === 0 ? 'armored' : room === 2 && i === 0 ? 'spitter' : kinds[Math.floor(r * kinds.length)];
    const sz = { walker: [30, 28], hopper: [26, 26], spitter: [26, 32], armored: [40, 36] }[kind], bonus = Math.floor(room / 2);
    const hp = { walker: 2, hopper: 2, spitter: 2, armored: 5 }[kind] + bonus;
    enemies.push({ kind, x: 400 + Math.random() * 500, y: 300, w: sz[0], h: sz[1], vx: 0, vy: 0, hp, dir: -1, face: -1,
      turnT: 0, ground: false, flash: 0, kb: 0, t: Math.random() * 2, shootT: 1 + Math.random() * 2 });
  }
  const keep = player ? player.hp : stats.maxHp;
  player = newPlayer(); player.hp = Math.min(stats.maxHp, keep + 1);
  mode = 'play';
}
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
function burst(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - .5) * 300, vy: (Math.random() - .8) * 300, life: .4 + Math.random() * .3, color });
}
function poison(e) { if (stats.poison) { e.poisT = stats.poisonDur; e.poisDps = stats.poison; } }
function hurtPlayer(from, dmg = 1) {
  if (player.inv > 0) return;
  player.hp -= dmg; player.inv = 1; player.hurtT = .2;
  player.vx = (player.x < from.x ? -1 : 1) * 260; player.vy = -260; shake = 6; burst(player.x + 14, player.y + 18, '#fff');
  if (player.hp <= 0) { owned.clear(); points = 0; stats = computeStats(owned); room = 0; player = null; startRoom(); }
}
function updatePlay(dt) {
  const p = player, s = stats;
  p.inv -= dt; p.hurtT -= dt; p.atkCd -= dt; p.atkT -= dt; p.dashCd -= dt; p.spitCd -= dt; p.dashT -= dt;
  if (s.regen) p.hp = Math.min(s.maxHp, p.hp + s.regen * dt);
  const dir = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
  if (dir) p.face = dir;
  if (p.dashT > 0) { p.vx = p.face * 620; p.vy = 0; }
  else {
    const target = dir * s.speed, accel = p.ground ? 2600 : 1800;
    p.vx += Math.max(-accel * dt, Math.min(accel * dt, target - p.vx));
    let g = G;
    if (s.glide && !p.ground && p.vy > 0 && down('Space', 'KeyW', 'ArrowUp')) g = 250;
    p.vy = Math.min(p.vy + g * dt, g === 250 ? 120 : 900);
  }
  p.coyote = p.ground ? .1 : p.coyote - dt; p.buffer -= dt;
  if (p.ground) p.jumps = 0;
  if (hit('Space', 'KeyW', 'ArrowUp')) p.buffer = .12;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = -s.jump; p.buffer = 0; p.coyote = 0; }
  else if (p.buffer > 0 && p.jumps < s.airJumps) { p.vy = -s.jump * .9; p.jumps++; p.buffer = 0; burst(p.x + 14, p.y + 36, '#4fc3f7', 5); }
  if (!down('Space', 'KeyW', 'ArrowUp') && p.vy < -200 && p.dashT <= 0) p.vy += 3000 * dt; // variable jump height
  if (s.dash && hit('KeyK', 'ShiftLeft', 'ShiftRight') && p.dashCd <= 0) { p.dashT = .16; p.dashCd = .7; p.inv = Math.max(p.inv, .16); p.dashHit = new Set(); }
  if (hit('KeyJ') && p.atkCd <= 0) { p.atkCd = s.atkCd; p.atkT = .12; p.atkHit = new Set(); }
  if (s.spit && hit('KeyL') && p.spitCd <= 0) { p.spitCd = .8; pshots.push({ x: p.x + p.w / 2, y: p.y + 14, vx: p.face * 560, vy: 0 }); }
  moveBody(p, dt);
  if (p.y > H + 100) hurtPlayer({ x: p.x }, 1), Object.assign(p, { x: 80, y: 300, vy: 0 });

  const box = { x: p.face > 0 ? p.x + p.w : p.x - s.reach, y: p.y + 2, w: s.reach, h: p.h - 4 };
  for (const e of enemies) {
    e.flash -= dt; e.kb -= dt; e.t += dt;
    if (e.poisT > 0) { e.poisT -= dt; e.hp -= e.poisDps * dt; if (Math.random() < dt * 8) burst(e.x + e.w / 2, e.y, '#ba68c8', 1); }
    const dx = (p.x - e.x);
    if (e.kb <= 0) {
      e.dir = Math.sign(dx) || 1;
      if (e.kind === 'armored' || e.kind === 'boss') {
        const boss = e.kind === 'boss', rage = boss && e.hp < e.maxHp / 2;
        e.turnT -= dt;
        if (e.face !== e.dir && e.turnT <= 0) { e.face = e.dir; e.turnT = boss ? (rage ? .8 : 1.1) : 1.3; }
        e.vx = e.face * (boss ? (rage ? 120 : 65) : 45);
        if (boss) {
          e.shootT -= dt;
          if (e.shootT <= 0) {
            e.shootT = rage ? 1.6 : 2.6; const base = Math.atan2(p.y + p.h / 2 - e.y - 20, p.x + p.w / 2 - e.x - e.w / 2);
            for (const o of rage ? [-.3, 0, .3] : [0]) shots.push({ x: e.x + e.w / 2, y: e.y + 20, vx: Math.cos(base + o) * 240, vy: Math.sin(base + o) * 240, r: 7 });
          }
        }
      } else if (e.kind === 'spitter') {
        const d = Math.abs(dx);
        e.vx = d < 220 ? -e.dir * 80 : d > 380 ? e.dir * 60 : 0;
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 520) {
          e.shootT = 2.2; const ang = Math.atan2(p.y + p.h / 2 - e.y, p.x + p.w / 2 - e.x);
          shots.push({ x: e.x + e.w / 2, y: e.y + 8, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, r: 6 });
        }
      } else e.vx = e.dir * (e.kind === 'hopper' ? 90 : 70 + room * 4);
      if (e.kind === 'hopper' && e.ground && Math.abs(dx) < 300 && e.t > 1.2) { e.vy = -520; e.t = 0; }
    }
    e.vy = Math.min(e.vy + G * dt, 900); moveBody(e, dt);
    if (e.y > H + 50) { e.x = 700; e.y = 0; e.vy = 0; }
    let dmg = (p.atkT > 0 && overlap(box, e) && !p.atkHit.has(e)) ? s.dmg + (p.dashT > 0 ? s.dashDmg : 0) : 0;
    const rammed = p.dashT > 0 && s.ram && overlap(p, e) && !p.dashHit.has(e);
    if (dmg || rammed) {
      let d = dmg || s.dmg + 1;
      if (e.kind === 'armored' || e.kind === 'boss') {
        const behind = (p.x + p.w / 2 - (e.x + e.w / 2)) * e.face < 0;
        d = behind ? d * 2 : s.pierce ? d : d * 0.25;
        burst(e.x + (behind ? 0 : e.w), e.y + 14, behind ? '#ff5252' : '#b0bec5', 6);
      } (dmg ? p.atkHit : p.dashHit).add(e);
      e.hp -= d; poison(e); e.flash = .1; e.kb = .25; e.vx = p.face * s.knock * 2; e.vy = -180; if (e.kind === 'boss') e.kb = 0; shake = 3; burst(e.x + 15, e.y + 14, '#ffd54f');
    } else if (overlap(p, e) && p.inv <= 0) {
      if (s.thorns) { e.hp -= s.thorns; e.flash = .1; }
      if (e.hp > 0) hurtPlayer(e, e.kind === 'boss' ? 2 : 1);
    }
  }
  for (const b of shots) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (p.atkT > 0 && Math.hypot(b.x - box.x - box.w / 2, b.y - box.y - box.h / 2) < s.reach + 10) { b.dead = true; burst(b.x, b.y, '#aed581', 5); }
    else if (p.inv <= 0 && overlap(p, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { b.dead = true; hurtPlayer(b); }
    else if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || platforms.some(q => q.h > 20 && overlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, q))) b.dead = true;
  }
  shots = shots.filter(b => !b.dead);
  for (const b of pshots) {
    b.x += b.vx * dt;
    const box2 = { x: b.x - 6, y: b.y - 6, w: 12, h: 12 };
    const e = enemies.find(q => overlap(box2, q));
    if (e) { const arm = e.kind === 'armored' || e.kind === 'boss', front = !arm || (b.vx * e.face > 0); e.hp -= front ? (arm && !s.pierce ? 0.25 : 1) : 2; poison(e); e.flash = .1; b.dead = true; burst(b.x, b.y, '#ba68c8', 6); }
    else if (b.x < 0 || b.x > W || platforms.some(q => q.h > 20 && overlap(box2, q))) b.dead = true;
  }
  pshots = pshots.filter(b => !b.dead);
  for (const e of enemies) if (e.hp <= 0) {
    if (e.kind === 'boss') { points += 10; owned.add('bossToken'); shake = 14; burst(e.x + 28, e.y + 32, '#ffd54f', 40); }
    points += 2 + Math.floor(room / 3); burst(e.x + 15, e.y + 14, '#7e57c2', 12);
    if (s.spread && e.poisT > 0) for (const o of enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 160) poison(o);
    if (s.lifesteal) p.hp = Math.min(s.maxHp, p.hp + 0.5);
  }
  enemies = enemies.filter(e => e.hp > 0);
  if (!enemies.length) { mode = 'evolve'; pressed.Enter = false; }
}
function buy(t) {
  if (traitState(t, owned, points) !== 'buyable') return;
  points -= t.cost; owned.add(t.id); if (t.branch === 'boss') owned.delete('bossToken'); const old = stats.maxHp; stats = computeStats(owned);
  player.hp = Math.min(stats.maxHp, player.hp + (stats.maxHp - old)); burst(W / 2, 100, BRANCH_COLORS[t.branch], 20);
}
cv.addEventListener('click', e => {
  if (mode !== 'evolve') return;
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  for (const m of menuRects) if (x > m.x && x < m.x + m.w && y > m.y && y < m.y + m.h) buy(m.t);
});
function updateEvolve() {
  const avail = TRAITS.filter(t => ['buyable', 'poor'].includes(traitState(t, owned, points)));
  for (let i = 0; i < Math.min(9, avail.length); i++) if (hit('Digit' + (i + 1))) buy(avail[i]);
  if (hit('Enter')) startRoom();
}
// --- Rendering ---
function dominant() {
  const c = { offense: 0, mobility: 0, defense: 0, venom: 0 };
  for (const t of TRAITS) if (owned.has(t.id) && c[t.branch] !== undefined) c[t.branch] += t.tier;
  return c;
}
function drawCreature(x, y, w, h, face, p, flash, scale = 1) {
  const c = dominant(), tot = c.offense + c.mobility + c.defense + c.venom;
  const hue = tot ? (c.offense * 5 + c.mobility * 200 + c.defense * 95 + c.venom * 285) / tot : 50;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(face * scale, scale);
  const has = id => owned.has(id), body = flash ? '#fff' : `hsl(${hue},55%,${50 - c.defense * 1.5}%)`;
  const dark = `hsl(${hue},55%,28%)`;
  const bw = w + (has('hide') ? 4 : 0) + (has('plating') ? 6 : 0), legH = has('legs') ? 12 : 6 + (has('doublejump') ? 3 : 0);
  if (has('wings')) { ctx.fillStyle = '#4fc3f799'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-34, -26); ctx.lineTo(-26, 4); ctx.lineTo(-8, 8); ctx.fill(); }
  if (has('plating')) { ctx.fillStyle = '#6d7f55'; ctx.fillRect(-bw / 2 - 5, -h / 2 + 2, 10, h - 8); }
  if (has('spikes')) { ctx.fillStyle = '#cfd8dc'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-bw / 2 - 2, -10 + i * 10); ctx.lineTo(-bw / 2 - 12, -6 + i * 10); ctx.lineTo(-bw / 2 - 2, i * 10); ctx.fill(); } }
  ctx.fillStyle = dark; ctx.fillRect(-8, h / 2 - legH, 6, legH); ctx.fillRect(4, h / 2 - legH, 6, legH);
  ctx.fillStyle = body; ctx.fillRect(-bw / 2, -h / 2, bw, h - legH + 4);
  ctx.fillStyle = '#fff'; ctx.fillRect(4, -h / 2 + 6, 7, 7); ctx.fillStyle = '#000'; ctx.fillRect(8, -h / 2 + 8, 3, 4);
  if (has('horns')) { ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(2, -h / 2); ctx.lineTo(8, -h / 2 - 12); ctx.lineTo(12, -h / 2); ctx.fill(); }
  if (has('claws')) { ctx.fillStyle = '#eee'; const n = has('rending') ? 3 : 2; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(bw / 2, 0 + i * 5); ctx.lineTo(bw / 2 + (has('rending') ? 14 : 9), 3 + i * 5); ctx.lineTo(bw / 2, 4 + i * 5); ctx.fill(); } }
  if (has('fangs')) { ctx.fillStyle = '#e1bee7'; ctx.fillRect(9, -h / 2 + 16, 2, 5); ctx.fillRect(13, -h / 2 + 16, 2, 5); }
  if (has('glands')) { ctx.fillStyle = '#ba68c8'; ctx.beginPath(); ctx.arc(-bw / 2 + 4, -h / 2 + 4, 5, 0, 7); ctx.fill(); }
  if (has('spit')) { ctx.fillStyle = '#ce93d8'; ctx.fillRect(bw / 2 - 2, -h / 2 + 12, 7, 6); }
  if (has('plague')) { ctx.fillStyle = '#7b1fa2'; for (let i = 0; i < 3; i++) ctx.fillRect(-bw / 2 + i * 8, -h / 2 - 5, 4, 5); }
  if (['bossheart', 'cracker', 'alpha'].some(has)) { ctx.fillStyle = '#ffd54f'; ctx.fillRect(-4, -h / 2 - 7, 3, 7); ctx.fillRect(2, -h / 2 - 9, 3, 9); ctx.fillRect(8, -h / 2 - 7, 3, 7); }
  if (has('apex')) { ctx.fillStyle = '#fff'; ctx.fillRect(10, -h / 2 + 15, 3, 4); }
  if (has('regen')) { ctx.strokeStyle = '#8bc34a'; ctx.strokeRect(-bw / 2 - 2, -h / 2 - 2, bw + 4, h + 2); }
  ctx.restore();
}
function drawPlay() {
  ctx.fillStyle = '#2a3040'; for (const p of platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#4a5578'; for (const p of platforms) ctx.fillRect(p.x, p.y, p.w, 4);
  const colors = { boss: '#8e2433', walker: '#9575cd', hopper: '#ff8a65', spitter: '#aed581', armored: '#78909c' };
  for (const e of enemies) { ctx.fillStyle = e.flash > 0 ? '#fff' : colors[e.kind]; ctx.fillRect(e.x, e.y, e.w, e.h);
    if (e.poisT > 0) { ctx.fillStyle = '#ba68c877'; ctx.fillRect(e.x, e.y, e.w, e.h); }
    ctx.fillStyle = '#000'; ctx.fillRect(e.x + (e.dir > 0 ? e.w - 10 : 4), e.y + 6, 6, 6);
    if (e.kind === 'armored' || e.kind === 'boss') { ctx.fillStyle = '#455a64'; ctx.fillRect(e.face > 0 ? e.x + e.w - 8 : e.x, e.y - 2, 8, e.h + 2);
      ctx.fillStyle = '#ff5252'; ctx.fillRect(e.face > 0 ? e.x - 3 : e.x + e.w - 1, e.y + 8, 4, 14); }
    if (e.kind === 'spitter') { ctx.fillStyle = '#33691e'; ctx.fillRect(e.x + 6, e.y - 6, 14, 6); } }
  ctx.fillStyle = '#ce93d8'; for (const b of pshots) { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#c6ff00'; for (const b of shots) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); }
  const p = player;
  if (p.atkT > 0) { ctx.fillStyle = '#ffffffaa'; const r = stats.reach; ctx.beginPath(); ctx.arc(p.x + p.w / 2 + p.face * 8, p.y + p.h / 2, r, p.face > 0 ? -1 : Math.PI - 1, p.face > 0 ? 1 : Math.PI + 1); ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2); ctx.fill(); }
  if (!(p.inv > 0 && Math.floor(p.inv * 20) % 2 && p.dashT <= 0)) drawCreature(p.x, p.y, p.w, p.h, p.face, p, p.hurtT > 0);
}
function drawHUD() {
  ctx.fillStyle = '#fff'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
  for (let i = 0; i < stats.maxHp; i++) { ctx.fillStyle = i + 1 <= player.hp ? '#e53935' : (i < player.hp ? '#a33' : '#442'); ctx.fillRect(16 + i * 18, 16, 14, 14); }
  ctx.fillStyle = '#ffd54f'; ctx.fillText(`Evo points: ${points}`, 16, 52); ctx.fillStyle = '#aaa'; ctx.fillText(`Room ${room}`, 16, 72);
  const boss = enemies.find(e => e.kind === 'boss');
  if (boss) { ctx.fillStyle = '#333'; ctx.fillRect(300, 14, 360, 12); ctx.fillStyle = '#e53935'; ctx.fillRect(300, 14, 360 * Math.max(0, boss.hp) / boss.maxHp, 12); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('BOSS', 480, 44); ctx.textAlign = 'left'; }
  ctx.fillStyle = '#7e8bb0'; stats.synergies.forEach((y, i) => ctx.fillText(`★ ${y.name}`, 16, 92 + i * 18));
}
function drawEvolve() {
  ctx.fillStyle = '#000c'; ctx.fillRect(0, 0, W, H); menuRects = [];
  ctx.fillStyle = '#fff'; ctx.font = '24px monospace'; ctx.textAlign = 'left'; ctx.fillText(`Room cleared!  Evolution points: ${points}`, 30, 40);
  ctx.font = '13px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText('Click or press number to evolve · Enter: next room', 30, 62);
  if (owned.has('bossToken')) {
    ctx.fillStyle = '#ffd54f'; ctx.font = '12px monospace'; ctx.fillText('BOSS REWARD - pick one (free):', 540, 14);
    const avail = TRAITS.filter(q => ['buyable', 'poor'].includes(traitState(q, owned, points)));
    TRAITS.filter(t => t.branch === 'boss').forEach((t, i) => {
      const x = 540 + i * 134, y = 20, st = traitState(t, owned, points), idx = avail.indexOf(t);
      ctx.fillStyle = '#4a3f10'; ctx.fillRect(x, y, 128, 38); ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 128, 38);
      ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(`${idx >= 0 && idx < 9 ? '[' + (idx + 1) + '] ' : st === 'owned' ? '✓ ' : ''}${t.name}`, x + 4, y + 15);
      ctx.font = '9px monospace'; ctx.fillText(t.desc, x + 4, y + 30);
      if (st === 'buyable') menuRects.push({ x, y, w: 128, h: 38, t });
    });
  }
  const cols = ['offense', 'mobility', 'defense', 'venom'];
  cols.forEach((b, ci) => {
    const x0 = 20 + ci * 232; ctx.fillStyle = BRANCH_COLORS[b]; ctx.font = '16px monospace'; ctx.fillText(b.toUpperCase(), x0, 92);
    TRAITS.filter(t => t.branch === b).sort((a, c) => a.tier - c.tier).forEach((t, i) => {
      const st = traitState(t, owned, points), y = 98 + i * 54;
      const alpha = { owned: '', buyable: '', poor: '99', locked: '44', blocked: '33' }[st];
      ctx.fillStyle = (st === 'owned' ? BRANCH_COLORS[b] : '#2a3040') + (st === 'owned' ? '66' : ''); ctx.fillRect(x0, y, 225, 50);
      ctx.strokeStyle = BRANCH_COLORS[b] + alpha; ctx.lineWidth = st === 'buyable' ? 3 : 1; ctx.strokeRect(x0, y, 225, 50);
      ctx.fillStyle = '#fff' + alpha; ctx.font = '13px monospace';
      const avail = TRAITS.filter(q => ['buyable', 'poor'].includes(traitState(q, owned, points))), idx = avail.indexOf(t);
      ctx.fillText(`${idx >= 0 && idx < 9 ? '[' + (idx + 1) + '] ' : ''}T${t.tier} ${t.name}  ${st === 'owned' ? '✓' : st === 'blocked' ? '✗ BLOCKED' : '(' + t.cost + ')'}`, x0 + 6, y + 15);
      ctx.font = '11px monospace'; ctx.fillText(t.desc, x0 + 6, y + 29);
      const bl = blocksWhat(t); if (bl.length && st !== 'owned' && st !== 'blocked') { ctx.fillStyle = '#ff8a65' + alpha; ctx.fillText('blocks: ' + bl.join(', '), x0 + 6, y + 43); }
      if (st === 'buyable') menuRects.push({ x: x0, y, w: 225, h: 50, t });
    });
  });
  ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; drawCreature(46, 468, 28, 36, 1, null, false, 2);
  ctx.font = '12px monospace'; ctx.fillStyle = '#ccc';
  [`HP ${stats.maxHp}  Dmg ${stats.dmg}  Speed ${stats.speed}`, `Reach ${stats.reach}  Atk/s ${(1 / stats.atkCd).toFixed(1)}`,
   `Air jumps ${stats.airJumps}  Dash ${stats.dash ? 'yes' : 'no'}  Glide ${stats.glide ? 'yes' : 'no'}`].forEach((l, i) => ctx.fillText(l, 130, 455 + i * 18));
  ctx.fillStyle = '#7e8bb0'; stats.synergies.forEach((y, i) => ctx.fillText(`★ ${y.name}: ${y.desc}`, 520, 455 + i * 18));
}
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.033, (t - last) / 1000); last = t;
  if (mode === 'play') updatePlay(dt); else updateEvolve();
  for (const q of particles) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 800 * dt; q.life -= dt; }
  particles = particles.filter(q => q.life > 0); shake = Math.max(0, shake - 30 * dt);
  ctx.save(); ctx.clearRect(0, 0, W, H); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  drawPlay(); for (const q of particles) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, 4, 4); }
  ctx.restore(); drawHUD(); if (mode === 'evolve') drawEvolve();
  for (const k in pressed) delete pressed[k];
  requestAnimationFrame(frame);
}
startRoom(); requestAnimationFrame(frame);
