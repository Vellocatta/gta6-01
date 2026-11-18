// Sound, synthesized live with WebAudio — no audio files, no network. Engine hum,
// two-tone police sirens, gunshots, pickup chimes and a lazy sunset bass line.
// Everything starts on the first user gesture, as browsers require.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let started = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  function start() {
    if (started) return;
    const c = ensure();
    if (!c) return;
    started = true;
    if (c.state === 'suspended') c.resume();
    // Engine hum, pitched by speed.
    engineOsc = c.createOscillator();
    engineGain = c.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 50;
    engineGain.gain.value = 0;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    engineOsc.connect(filter).connect(engineGain).connect(c.destination);
    engineOsc.start();
    // Sunset bass line: Am – F – C – G, one note a second.
    const bass = [110, 87.3, 130.8, 98];
    let step = 0;
    musicTimer = window.setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      tone(bass[step % 4], 0.9, 'triangle', 0.05);
      tone(bass[step % 4] * 2, 0.4, 'sine', 0.03);
      step += 1;
    }, 1000);
  }

  return {
    start,
    setEngine(running, speedNorm) {
      if (!engineOsc || !engineGain || !ctx) return;
      engineGain.gain.value = running ? 0.02 + speedNorm * 0.05 : 0;
      engineOsc.frequency.value = 50 + speedNorm * 140;
    },
    shoot() { tone(180, 0.12, 'square', 0.16, 60); tone(1200, 0.05, 'sawtooth', 0.08, 300); },
    pickup() { tone(660, 0.12, 'sine', 0.12); window.setTimeout(() => tone(880, 0.16, 'sine', 0.12), 90); },
    siren() { tone(700, 0.4, 'sine', 0.04, 950); },
    crash() { tone(90, 0.25, 'square', 0.14, 40); },
    mission() { [523, 659, 784].forEach((f, i) => window.setTimeout(() => tone(f, 0.25, 'triangle', 0.1), i * 110)); },
    stop() { if (musicTimer) window.clearInterval(musicTimer); },
  };
}
