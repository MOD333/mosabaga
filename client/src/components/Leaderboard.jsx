import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, cx } from './ui.jsx';
import { toneOf } from '../data/players.js';

const RANK_LABEL = ['١', '٢', '٣', '٤'];

/**
 * لوحة المتصدرين — فرز متحرك ناعم عبر Framer Motion.
 */
export default function Leaderboard({ players = [], highlightId = null, meId = null, compact = false, deltaById = {} }) {
  if (!players.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center">
        <p className="text-sm text-stone-400">لا يوجد لاعبون بعد.</p>
      </div>
    );
  }

  // ترتيب تنازلي حسب النقاط — نسخة جديدة (shallow copy) حتى لا نعدّل المصفوفة الأصلية
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {sortedPlayers.map((player, index) => {
          const tone = toneOf(player.tone);
          const isHighlight = highlightId === player.id;
          const isMe = meId === player.id;

          return (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cx(
                'flex items-center gap-3 rounded-2xl border bg-white transition-colors',
                compact ? 'px-3 py-2' : 'px-4 py-3',
                index === 0 ? 'border-honey-200' : 'border-stone-100',
                isHighlight && 'border-honey-300 bg-honey-50',
                !player.claimed && 'opacity-60'
              )}
              style={{ boxShadow: isHighlight ? '0 8px 22px -12px rgba(200,160,60,0.55)' : '0 2px 8px -4px rgba(120,100,70,0.12)' }}
            >
              {/* الترتيب */}
              <span
                className={cx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black',
                  index === 0 ? 'bg-honey-200 text-honey-800' : 'bg-stone-100 text-stone-500'
                )}
              >
                {RANK_LABEL[index] || index + 1}
              </span>

              <Avatar player={player} size={compact ? 'xs' : 'sm'} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-800">
                  {player.name}
                  {isMe && <span className="mr-2 text-[11px] font-bold text-stone-400">(أنت)</span>}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-stone-400">
                  {player.buzzed && <span className={tone.text}>🔔 ضغط أولاً</span>}
                  {player.lockedOut && <span className="text-coral-500">✖ مستبعد</span>}
                  {!player.claimed && <span>غير متصل</span>}
                  {player.claimed && !player.buzzed && !player.lockedOut && <span className="text-sage-500">جاهز</span>}
                </p>
              </div>

              <span className="flex shrink-0 items-center gap-1.5">
                {Number(deltaById[player.id]) > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: [1, 1.18, 1] }}
                    transition={{
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.55, repeat: 3, ease: 'easeInOut' },
                    }}
                    className="rounded-full bg-sage-200 px-2 py-0.5 font-display text-xs font-black text-sage-800 ring-1 ring-sage-400"
                  >
                    +{deltaById[player.id]}
                  </motion.span>
                )}

                <motion.span
                  key={player.score}
                  initial={{ scale: 1.25, color: '#EDC167' }}
                  animate={{ scale: 1, color: '#292524' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                  className="rounded-xl bg-stone-100 px-3 py-1 font-display text-lg font-black tabular-nums text-stone-800"
                >
                  {player.score}
                </motion.span>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
