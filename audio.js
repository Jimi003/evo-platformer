'use strict';
// Proceduralni zvok (WebAudio): brez datotek. Zvok se zažene ob prvi tipki/kliku; M = utišaj.
const Snd = (() => {
  let ctx = null, master = null, sfxBus = null, musBus = null, muted = false, noiseBuf = null;
  let musicOn = false, nextT = 0, step = 0;
  const hz = (semi) => 130.81 * Math.pow(2, semi / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.75; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.68; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.38; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextT = ctx.currentTime + 0.1;
    musicOn = true;
  }
  function tone(f0, f1, dur, type = 'square', vol = 0.3, delay = 0, bus = sfxBus) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, f0, f1, vol = 0.3, type = 'bandpass', delay = 0) {
    const t = ctx.currentTime + delay, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); fl.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }
  const FX = {
    jump: () => tone(300, 620, 0.12, 'square', 0.16),
    air: () => tone(420, 820, 0.1, 'triangle', 0.18),
    atk: () => noise(0.12, 2400, 500, 0.25),
    hit: () => { noise(0.1, 1800, 300, 0.35); tone(160, 60, 0.12, 'sawtooth', 0.3); },
    armor: () => { tone(900, 700, 0.08, 'square', 0.15); noise(0.06, 5000, 3000, 0.2, 'highpass'); },
    hurt: () => { tone(220, 70, 0.3, 'sawtooth', 0.4); noise(0.2, 900, 150, 0.3); },
    dash: () => noise(0.18, 600, 3000, 0.3),
    spit: () => tone(700, 250, 0.15, 'sine', 0.3),
    kill: () => { noise(0.18, 1200, 200, 0.35); tone(240, 90, 0.2, 'triangle', 0.3); },
    bossKill: () => { [0, 0.12, 0.24, 0.36].forEach((d, i) => tone(300 - i * 40, 60, 0.5, 'sawtooth', 0.3, d)); noise(0.8, 800, 60, 0.5); },
    roar: () => { tone(110, 55, 0.7, 'sawtooth', 0.4); tone(165, 70, 0.7, 'square', 0.18); noise(0.6, 400, 100, 0.35); },
    breath: () => noise(0.5, 900, 3000, 0.4, 'bandpass'),
    gale: () => { noise(0.6, 400, 4000, 0.3); tone(200, 800, 0.5, 'sine', 0.15); },
    blast: () => { tone(90, 30, 0.6, 'sawtooth', 0.55); noise(0.5, 1500, 60, 0.6, 'lowpass'); },
    bastion: () => { tone(330, 330, 0.5, 'triangle', 0.25); tone(495, 495, 0.5, 'triangle', 0.2, 0.05); },
    quills: () => noise(0.2, 4000, 1500, 0.3, 'highpass'),
    miasma: () => { noise(0.7, 500, 200, 0.4, 'lowpass'); tone(130, 90, 0.7, 'sine', 0.25); },
    epidemic: () => { tone(150, 60, 1.0, 'sawtooth', 0.3); noise(1.0, 600, 100, 0.35, 'lowpass'); },
    pick: () => [0, 0.08, 0.16].forEach((d, i) => tone(440 * Math.pow(1.26, i), 440 * Math.pow(1.26, i), 0.25, 'triangle', 0.25, d)),
    bossPick: () => [0, 0.1, 0.2, 0.3].forEach((d, i) => tone(330 * Math.pow(1.26, i), 330 * Math.pow(1.26, i), 0.35, 'square', 0.18, d)),
    clear: () => [0, 0.1, 0.2, 0.32].forEach((d, i) => tone([523, 659, 784, 1047][i], [523, 659, 784, 1047][i], 0.3, 'triangle', 0.25, d)),
    die: () => [0, 0.2, 0.4].forEach((d, i) => tone(300 - i * 70, 80, 0.5, 'sawtooth', 0.35, d)),
    revive: () => [0, 0.1, 0.2, 0.3].forEach((d, i) => tone(330 + i * 110, 330 + i * 110, 0.3, 'sine', 0.3, d)),
    water: () => { noise(0.5, 300, 1800, 0.35, 'bandpass'); tone(300, 700, 0.4, 'sine', 0.25); },
    frost: () => { [0, 0.05, 0.1].forEach((d, i) => tone(2400 + i * 500, 1800, 0.3, 'triangle', 0.15, d)); noise(0.4, 6000, 2000, 0.25, 'highpass'); },
    grow: () => { tone(120, 360, 0.4, 'sine', 0.3); tone(180, 540, 0.4, 'triangle', 0.15, 0.1); },
    zap: () => { noise(0.25, 6000, 400, 0.45, 'highpass'); tone(1400, 120, 0.25, 'sawtooth', 0.3); },
    syn: () => [0, 0.08, 0.16, 0.24, 0.32].forEach((d, i) => tone([523, 659, 784, 1047, 1319][i], [523, 659, 784, 1047, 1319][i], 0.35, 'triangle', 0.22, d)),
    tick: () => tone(900, 900, 0.04, 'square', 0.1),
  };
  const lastPlayed = {};
  function play(name) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.04) return;
    lastPlayed[name] = now;
    if (FX[name]) FX[name]();
  }
  // Glasba: trije načini (meni = dvigalo/bossa nova, igra = pustolovska, šef = napeta) + ambient.
  function note(f, t, dur, type, vol, bus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.04, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function hat(t, vol) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = 'highpass'; fl.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(fl); fl.connect(g); g.connect(musBus); s.start(t); s.stop(t + 0.08);
  }
  function snare(t, vol) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = 'bandpass'; fl.frequency.value = 1800;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(fl); fl.connect(g); g.connect(musBus); s.start(t); s.stop(t + 0.16);
  }
  function kick(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.2);
  }
  const R = a => a[Math.floor(Math.random() * a.length)];
  const PENTA = [0, 2, 4, 7, 9];
  // vsak takt = 8 osmink; akordi so relativni na tonaliteto
  const MODES = {
    menu: { bpm: 88, prog: [[0, [0, 4, 7, 11]], [-3, [0, 3, 7, 10]], [2, [0, 3, 7, 10]], [-5, [0, 4, 7, 10]]] },
    game: { bpm: 116, prog: [[0, [0, 4, 7]], [7, [0, 4, 7]], [9, [0, 3, 7]], [5, [0, 4, 7]]] },
    boss: { bpm: 142, prog: [[0, [0, 3, 7]], [-4, [0, 4, 7]], [-2, [0, 4, 7]], [-5, [0, 3, 6]]] },
  };
  let cur = 'menu', key = 0, lastMel = 4;
  function schedule() {
    if (!ctx || !musicOn) return;
    const m = MODES[cur], sp = 60 / m.bpm / 2;
    while (nextT < ctx.currentTime + 0.4) {
      const s = step % 8, bar = Math.floor(step / 8) % 4, [root, ch] = m.prog[bar], r = key + root;
      if (cur === 'menu') {
        if (s === 0 || s === 4) note(hz(r - 12), nextT, sp * 3.5, 'sine', 0.5, musBus);
        if (s === 2 || s === 6) note(hz(r - 12 + (s === 2 ? 7 : 4)), nextT, sp * 1.6, 'sine', 0.3, musBus);
        if (s === 0 || s === 3 || s === 6) ch.forEach(n => note(hz(r + n), nextT, sp * 2.2, 'triangle', 0.07, musBus));
        if (s % 2 === 0 && Math.random() < 0.4) { lastMel = R(ch) + R([12, 12, 24]); note(hz(r + lastMel), nextT, sp * 2.5, 'sine', 0.14, musBus); }
        if (s % 2 === 1) hat(nextT, 0.03);
      } else if (cur === 'game') {
        if (s === 0 || s === 4) note(hz(r - 12), nextT, sp * 3.5, 'triangle', 0.5, musBus);
        note(hz(r + 12 + ch[[0, 1, 2, 1, 0, 1, 2, 1][s] % ch.length]), nextT, sp * 1.4, 'triangle', 0.1, musBus);
        if (s === 0) ch.forEach(n => note(hz(r + n), nextT, sp * 7, 'sine', 0.08, musBus));
        if (s % 2 === 0 && Math.random() < 0.6) {
          lastMel = Math.max(0, Math.min(8, lastMel + R([-2, -1, 0, 1, 2]) ));
          note(hz(key + 24 + PENTA[lastMel % 5] + 12 * Math.floor(lastMel / 5)), nextT, sp * 1.8, 'square', 0.05, musBus);
        }
        if (s % 2 === 1) hat(nextT, 0.04);
        if (s === 4) snare(nextT, 0.04);
      } else {
        note(hz(r - 12), nextT, sp * 0.9, 'sawtooth', 0.2, musBus);
        if (s % 2 === 1) note(hz(r), nextT, sp * 0.6, 'sawtooth', 0.09, musBus);
        if (s % 4 === 0) kick(nextT, 0.65);
        if (s === 2 || s === 6) snare(nextT, 0.15);
        if (s === 0) ch.forEach(n => note(hz(r + 12 + n + (bar === 3 ? 1 : 0)), nextT, sp * 1.2, 'square', 0.075, musBus));
        if (s % 2 === 0 && Math.random() < 0.55) note(hz(r + 24 + R([0, 3, 6, 7, 10])), nextT, sp * 0.8, 'sawtooth', 0.06, musBus);
        hat(nextT, 0.06);
      }
      nextT += sp; step++;
    }
  }
  setInterval(schedule, 100);
  // Ambient: veter (stalno) + ptiči/čriči ob naključnih trenutkih + globok drone pri šefu.
  let wind = null, windG = null, drone = null, droneG = null, nextAmb = 0, nightFactor = 0;
  function startAmbient() {
    if (wind) return;
    wind = ctx.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    windG = ctx.createGain(); windG.gain.value = 0;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.15; lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(windG.gain);
    wind.connect(f); f.connect(windG); windG.connect(master); wind.start(); lfo.start();
    drone = ctx.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 41;
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 140;
    droneG = ctx.createGain(); droneG.gain.value = 0;
    drone.connect(df); df.connect(droneG); droneG.connect(master); drone.start();
  }
  function ambience() {
    if (!ctx) return;
    startAmbient();
    const t = ctx.currentTime, play = cur !== 'menu';
    windG.gain.setTargetAtTime(play ? (cur === 'boss' ? 0.07 : 0.12) : 0, t, 0.8);
    droneG.gain.setTargetAtTime(cur === 'boss' ? 0.16 : 0, t, 0.8);
    if (!play || muted || t < nextAmb) return;
    nextAmb = t + (cur === 'boss' ? 6 : 2 + Math.random() * 4);
    if (cur === 'boss') { tone(70, 50, 1.2, 'sine', 0.16, 0, sfxBus); return; }
    if (Math.random() < nightFactor) for (let i = 0; i < 4; i++) tone(4300, 4300, 0.03, 'square', 0.025, i * 0.07, sfxBus);
    else { const f = 1800 + Math.random() * 1500; [0, 0.11, 0.22].slice(0, 1 + Math.floor(Math.random() * 3)).forEach(d => tone(f, f * 1.4, 0.08, 'sine', 0.09, d, sfxBus)); }
  }
  setInterval(ambience, 400);
  return {
    init, play,
    setDayNight(value) { nightFactor = Math.max(0, Math.min(1, value)); },
    music(mode, room) {
      const k = [0, 2, -2, 3, -4][((room || 1) - 1) % 5];
      if (mode === 'menu') { cur = 'menu'; key = 0; }
      else if (mode === 'boss') { cur = 'boss'; key = -2; }
      else { cur = 'game'; key = k; }
      step = Math.ceil(step / 32) * 32;
    },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.75; return muted; },
    get muted() { return muted; },
    get state() { return ctx ? ctx.state + ':' + ctx.currentTime.toFixed(2) : 'none'; },
  };
})();
['keydown', 'pointerdown'].forEach(ev => addEventListener(ev, () => Snd.init()));
addEventListener('keydown', e => { if (e.code === 'KeyM') Snd.toggleMute(); });
