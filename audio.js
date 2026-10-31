'use strict';
// Proceduralni zvok (WebAudio): brez datotek. Zvok se zažene ob prvi tipki/kliku; M = utišaj.
const Snd = (() => {
  let ctx = null, master = null, sfxBus = null, musBus = null, muted = false, noiseBuf = null;
  let musicOn = false, nextT = 0, step = 0, mood = 0;
  const SCALES = [[0, 3, 5, 7, 10], [0, 2, 4, 7, 9], [0, 1, 5, 7, 8], [0, 2, 3, 7, 9], [0, 3, 5, 6, 10]];
  const hz = (semi) => 55 * Math.pow(2, semi / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.28; musBus.connect(master);
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
  // Glasba: počasen bas, pad in naključen arpeggio v lestvici, ki se spreminja z biomom.
  function note(f, t, dur, type, vol, bus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.05, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  let tension = 0;
  function schedule() {
    if (!ctx || !musicOn) return;
    const bpm = 96 + tension * 28, sp = 60 / bpm / 2, sc = SCALES[mood % SCALES.length];
    while (nextT < ctx.currentTime + 0.4) {
      const s = step % 32, root = [0, 0, 5, 3][Math.floor(s / 8)];
      if (s % 8 === 0) {
        note(hz(root), nextT, sp * 7, 'triangle', 0.55, musBus);
        note(hz(root + 12 + sc[2]), nextT, sp * 8, 'sine', 0.22, musBus);
        note(hz(root + 12 + sc[4]), nextT, sp * 8, 'sine', 0.18, musBus);
      }
      if (s % 2 === 0 || (tension && Math.random() < 0.4)) {
        const n = sc[Math.floor(Math.random() * sc.length)] + 24 + (Math.random() < 0.25 ? 12 : 0);
        if (Math.random() < 0.7) note(hz(root + n), nextT, sp * 1.6, 'square', 0.07, musBus);
      }
      if (tension && s % 4 === 0) note(hz(root), nextT, sp * 0.8, 'sawtooth', 0.12, musBus);
      nextT += sp; step++;
    }
  }
  setInterval(schedule, 100);
  return {
    init, play,
    setMood(m, boss) { mood = m; tension = boss ? 1 : 0; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.7; return muted; },
    get muted() { return muted; },
    get state() { return ctx ? ctx.state + ':' + ctx.currentTime.toFixed(2) : 'none'; },
  };
})();
['keydown', 'pointerdown'].forEach(ev => addEventListener(ev, () => Snd.init()));
addEventListener('keydown', e => { if (e.code === 'KeyM') Snd.toggleMute(); });
