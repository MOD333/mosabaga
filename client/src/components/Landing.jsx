import { motion } from 'framer-motion';
import { Avatar, ConnectionDot, cx } from './ui.jsx';
import { PLAYERS, toneOf } from '../data/players.js';

/**
 * شاشة البداية — "من أنت؟"
 * ٤ أزرار أنيقة لاختيار اللاعب + زر خفي صغير لدخول المضيف في الأسفل.
 */
export default function Landing({ onChoose, onHost, currentPlayerId, connected }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-cream bg-glow px-5 py-12 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-3xl"
      >
        {/* العنوان */}
        <div className="mb-10 text-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
            className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-4xl shadow-soft-md"
          >
            🎯
          </motion.span>

          {/* الترحيب */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-4xl font-black leading-[1.15] tracking-tight text-stone-800 sm:text-6xl"
          >
            ارحبو في تحدي العوال
          </motion.h1>

          {/* شارة النسخة */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-honey-200 bg-honey-100 px-4 py-1.5 text-sm font-black text-honey-800 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-honey-400" />
              نسخة محمد
            </span>
          </motion.div>

          <h2 className="mt-8 font-display text-2xl font-black text-stone-700 sm:text-3xl">من أنت؟</h2>
          <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-stone-500 sm:text-base">
            اختر اسمك للدخول إلى المسابقة. تذكّر: أول من يضغط الجرس يحصل على فرصة الإجابة!
          </p>
        </div>

        {/* اللاعبون */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {PLAYERS.map((player, index) => {
            const tone = toneOf(player.tone);
            const isCurrent = currentPlayerId === player.id;

            return (
              <motion.button
                key={player.id}
                type="button"
                onClick={() => onChoose(player.id)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index + 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={cx(
                  'group relative flex items-center gap-4 overflow-hidden rounded-3xl border bg-white p-5 text-right transition-shadow',
                  isCurrent ? 'border-honey-300' : 'border-stone-100',
                  'shadow-soft hover:shadow-soft-lg'
                )}
              >
                {/* لمعة بستيل */}
                <span className={cx('absolute inset-y-0 right-0 w-1.5', tone.bar)} />

                <Avatar player={player} size="lg" />

                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-black text-stone-800 sm:text-xl">
                    {player.name}
                  </span>
                  <span className={cx('mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold', tone.chip)}>
                    {isCurrent ? 'آخر دخول لك' : 'اضغط للدخول'}
                  </span>
                </span>

                <span
                  className={cx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg transition-transform group-hover:-translate-x-1',
                    tone.soft,
                    tone.text
                  )}
                >
                  ←
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* حالة الاتصال */}
        <div className="mt-8 flex justify-center">
          <span className="rounded-full bg-white/70 px-3 py-1 backdrop-blur">
            <ConnectionDot connected={connected} />
          </span>
        </div>
      </motion.div>

      {/* دخول المضيف — صغير وخفيف في الأسفل */}
      <div className="relative z-10 mt-10">
        <button
          type="button"
          onClick={onHost}
          className="rounded-full px-4 py-2 text-[11px] font-bold text-stone-400 underline-offset-4 transition-colors hover:text-stone-600 hover:underline"
        >
          دخول المضيف
        </button>
      </div>
    </div>
  );
}
