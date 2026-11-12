/* Feel: synthesized, non-musical sounds and knob press physics.
   No bells, chimes or melodic tones (Muslim 2113, 2114): only short percussive taps made from
   filtered noise, like a finger on wood. They play only when the user enables sound. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S;
  var ac = null,
    bufs = {};
  function ctx() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  /* shaped noise burst, seeded so every tap sounds identical */
  function noise(c, ms, curve) {
    var key = ms + ':' + curve;
    if (bufs[key]) return bufs[key];
    var n = Math.floor((c.sampleRate * ms) / 1000),
      b = c.createBuffer(1, n, c.sampleRate),
      d = b.getChannelData(0),
      seed = 7;
    for (var i = 0; i < n; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / n, curve);
    }
    return (bufs[key] = b);
  }
  function tap(c, t, opts) {
    var src = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = noise(c, opts.ms, opts.curve);
    f.type = opts.type;
    f.frequency.value = opts.freq;
    f.Q.value = opts.q;
    g.gain.value = opts.gain;
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t);
  }
  A.fx = {
    /* a crisp key click */
    click: function () {
      if (!S.prefs.sound) return;
      var c = ctx();
      if (!c) return;
      var t = c.currentTime;
      tap(c, t, { ms: 22, curve: 8, type: 'bandpass', freq: 2600, q: 0.9, gain: 0.5 });
      tap(c, t, { ms: 30, curve: 5, type: 'lowpass', freq: 380, q: 0.7, gain: 0.35 });
    },
    /* completion: two soft taps on wood, not a tone */
    done: function () {
      if (!S.prefs.sound) return;
      var c = ctx();
      if (!c) return;
      var t = c.currentTime;
      [0, 0.13].forEach(function (dt, i) {
        tap(c, t + dt, { ms: 70, curve: 4, type: 'lowpass', freq: 520 - i * 80, q: 1.2, gain: 0.55 });
        tap(c, t + dt, { ms: 18, curve: 6, type: 'bandpass', freq: 1500, q: 1, gain: 0.18 });
      });
    }
  };
  /* press physics: sink on touch, spring back with a small overshoot on release */
  A.knob = function (el) {
    if (!el || el._knob) return;
    el._knob = 1;
    var down = function () {
      el.classList.remove('spring');
      el.classList.add('down');
    };
    var up = function () {
      if (!el.classList.contains('down')) return;
      el.classList.remove('down');
      void el.offsetWidth;
      el.classList.add('spring');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('animationend', function (e) {
      if (e.animationName === 'knobspring') el.classList.remove('spring');
    });
  };
})();
