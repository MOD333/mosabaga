import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

import sound from '../lib/sound.js';
import { Avatar, SoftButton, cx } from './ui.jsx';
import { toneOf } from '../data/players.js';

/* ألوان الكونفيتي — مأخوذة من لوحة الألوان الناعمة */
const CONFETTI_COLORS = ['#EDC167', '#E0A83C', '#8FAE85', '#DF917D', '#7FA9BF', '#FFFFFF'];

/* ذهبي متوهّج */
const GOLD = '#E0A83C';
const GOLD_GLOW =
  '0 0 14px rgba(237,193,103,0.85), 0 0 38px rgba(224,168,60,0.55), 0 0 78px rgba(224,168,60,0.3)';

/**
 * شاشة الفوز النهائية — تظهر لكل الأجهزة عند إنهاء المضيف للمسابقة.
 * كونفيتي متواصل + موسيقى فوز + طباعة ذهبية متوهّجة مع دخول درامي.
 */
export default function VictoryScreen({ winner, meId = null, standings = [], onDismiss = null }) {
  // مُعرّف ثابت — لا نعتمد على كائن الفائز لأن السيرفر يبث كائناً جديداً كل تحديث
  const winnerId = winner?.id ?? null;

  const podium = useMemo(
    () => [...standings].sort((a, b) => b.score - a.score).slice(0, 4),
    [standings]
  );

  const isMe = Boolean(meId && winnerId && meId === winnerId);

  /* ---------------------- المؤثرات عند الظهور ---------------------- */
  useEffect(() => {
    if (!winnerId) return;

    /* 🎵 الموسيقى: victory.mp3 ثم wav ثم نغمة مدمجة */
    let audio = null;
    let stopped = false;

    const playFallback = () => {
      if (!stopped) sound.victory();
    };

    const playWav = () => {
      if (stopped) return;
      try {
        const wav = new Audio('/sounds/victory.wav');
        wav.volume = 0.65;
        const attempt = wav.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(playFallback);
      } catch (_) {
        playFallback();
      }
    };

    try {
      audio = new Audio('/sounds/victory.mp3');
      audio.volume = 0.65;
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(playWav);
    } catch (_) {
      playWav();
    }

    /* 🎉 الكونفيتي المتواصل */
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    const perFrame = isSmallScreen ? 2 : 3;

    let raf = 0;
    let endAt = 0;

    if (!prefersReduced) {
      // الانفجار الافتتاحي
      confetti({
        particleCount: isSmallScreen ? 80 : 130,
        spread: 100,
        startVelocity: 48,
        origin: { y: 0.62 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 68,
        origin: { x: 0, y: 0.78 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 68,
        origin: { x: 1, y: 0.78 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });

      // رشّ متواصل من الجانبين لمدة ٧ ثوانٍ
      endAt = Date.now() + 7000;
      const frame = () => {
        confetti({
          particleCount: perFrame,
          angle: 60,
          spread: 60,
          startVelocity: 45,
          origin: { x: 0, y: 0.85 },
          colors: CONFETTI_COLORS,
          scalar: 0.9,
        });
        confetti({
          particleCount: perFrame,
          angle: 120,
          spread: 60,
          startVelocity: 45,
          origin: { x: 1, y: 0.85 },
          colors: CONFETTI_COLORS,
          scalar: 0.9,
        });
        if (Date.now() < endAt) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      try {
        confetti.reset();
      } catch (_) {
        /* لا شيء */
      }
      if (audio) {
        try {
          audio.pause();
        } catch (_) {
          /* لا شيء */
        }
      }
    };
  }, [winnerId]);

  if (!winner) return null;

  /* ================================================================ */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-cream/95 px-5 backdrop-blur-sm safe-top safe-bottom"
    >
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        {/* الرمز */}
        <motion.span
          initial={{ scale: 0, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
          className="mb-4 text-6xl sm:text-7xl"
          style={{ filter: 'drop-shadow(0 8px 22px rgba(224,168,60,0.35))' }}
        >
          {winner.emoji || '🏆'}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-3 text-[11px] font-black tracking-[0.35em] text-honey-600"
        >
          🏆 الفائز 🏆
        </motion.p>

        {/* الاسم بخط ذهبي متوهّج */}
        <motion.h1
          initial={{ scale: 0.35, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 170, damping: 17, delay: 0.08 }}
          className="font-display text-4xl font-black leading-[1.2] sm:text-6xl md:text-7xl"
          style={{ color: GOLD, textShadow: GOLD_GLOW }}
        >
          <motion.span
            animate={{ scale: [1, 1.035, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block"
          >
            مبروك يا {winner.name}
          </motion.span>
        </motion.h1>

        {/* النقاط */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.36, type: 'spring', stiffness: 300, damping: 24 }}
          className="mt-5 flex items-center gap-2 rounded-full border border-honey-200 bg-white/85 px-5 py-2 shadow-soft-md"
        >
          <span className="font-display text-2xl font-black text-stone-800">{winner.score}</span>
          <span className="text-xs font-bold text-stone-400">نقطة</span>
          {winner.tied && <span className="text-[11px] font-bold text-honey-600">• تعادل في الصدارة</span>}
        </motion.div>

        {isMe && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-3 text-sm font-black text-sage-600"
          >
            👑 أنت بطل الجلسة!
          </motion.p>
        )}

        {/* منصة التتويج */}
        <div className="mt-7 w-full space-y-2">
          {podium.map((player, index) => {
            const tone = toneOf(player.tone);
            const isWinner = index === 0;
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.42 + index * 0.08 }}
                className={cx(
                  'flex items-center gap-3 rounded-2xl border bg-white px-4 py-2.5 text-right',
                  isWinner ? 'border-honey-300' : 'border-stone-100',
                  player.id === meId && 'ring-2 ring-sage-300'
                )}
              >
                <span
                  className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black',
                    isWinner ? 'bg-honey-200 text-honey-800' : 'bg-stone-100 text-stone-500'
                  )}
                >
                  {index + 1}
                </span>
                <Avatar player={player} size="xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-800">
                  {player.name}
                  {player.id === meId && <span className="mr-2 text-[11px] text-stone-400">(أنت)</span>}
                </span>
                <span className={cx('font-display text-base font-black tabular-nums', tone.text)}>
                  {player.score}
                </span>
              </motion.div>
            );
          })}
        </div>

        {onDismiss && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-7"
          >
            <SoftButton variant="ghost" size="md" onClick={onDismiss}>
              إخفاء الشاشة
            </SoftButton>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
