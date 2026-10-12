/**
 * مؤثرات صوتية خفيفة عبر Web Audio API (بدون ملفات خارجية).
 * تُفتح القناة الصوتية عند أول تفاعل من المستخدم (سياسة المتصفحات).
 */

let ctx = null;
let muted = false;

try {
  muted = localStorage.getItem('mosabaga:muted') === '1';
} catch (_) {
  muted = false;
}

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq = 440, dur = 0.12, type = 'square', vol = 0.04, delay = 0 }) {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  try {
    const start = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  } catch (_) {
    /* تجاهل أي خطأ صوتي */
  }
}

export const sound = {
  get muted() {
    return muted;
  },
  toggle() {
    muted = !muted;
    try {
      localStorage.setItem('mosabaga:muted', muted ? '1' : '0');
    } catch (_) {
      /* لا شيء */
    }
    if (!muted) tone({ freq: 880, dur: 0.08, type: 'sine', vol: 0.05 });
    return muted;
  },
  unlock() {
    getCtx();
  },
  buzz() {
    tone({ freq: 720, dur: 0.08, type: 'square', vol: 0.05 });
    tone({ freq: 1180, dur: 0.09, type: 'square', vol: 0.05, delay: 0.07 });
  },
  correct() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone({ freq, dur: 0.14, type: 'triangle', vol: 0.05, delay: i * 0.075 })
    );
  },
  wrong() {
    [233, 185, 146].forEach((freq, i) =>
      tone({ freq, dur: 0.18, type: 'sawtooth', vol: 0.045, delay: i * 0.085 })
    );
  },
  timeup() {
    [392, 311, 233].forEach((freq, i) =>
      tone({ freq, dur: 0.26, type: 'square', vol: 0.05, delay: i * 0.13 })
    );
  },
  tick() {
    tone({ freq: 1350, dur: 0.035, type: 'square', vol: 0.018 });
  },
  start() {
    [392, 523, 784].forEach((freq, i) =>
      tone({ freq, dur: 0.12, type: 'square', vol: 0.05, delay: i * 0.08 })
    );
  },
  join() {
    tone({ freq: 660, dur: 0.09, type: 'sine', vol: 0.045 });
    tone({ freq: 990, dur: 0.1, type: 'sine', vol: 0.04, delay: 0.08 });
  },
};

export function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  } catch (_) {
    /* لا شيء */
  }
}

export default sound;
