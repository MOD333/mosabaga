import { motion } from 'framer-motion';

/**
 * حلقة العدّ التنازلي بنعومة (٧ ثوانٍ).
 */
export default function TimerRing({
  remaining = 0,
  duration = 7,
  size = 190,
  stroke = 12,
  label = 'ثانية',
  showLabel = true,
}) {
  const safeDuration = duration > 0 ? duration : 1;
  const pct = Math.max(0, Math.min(1, remaining / safeDuration));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  const isDanger = remaining <= 3 && remaining > 0;
  const isDead = remaining <= 0;
  const color = isDead ? '#D6CFC2' : isDanger ? '#DF917D' : '#EDC167';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* هالة ناعمة عند اقتراب النهاية */}
      {isDanger && !isDead && (
        <motion.span
          className="absolute inset-0 rounded-full border border-coral-300"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1EEE7" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.15, ease: 'linear' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.ceil(remaining)}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          className="font-display font-black leading-none tabular-nums"
          style={{
            fontSize: size * 0.3,
            color: isDead ? '#A8A29E' : isDanger ? '#AC5742' : '#292524',
          }}
        >
          {Math.max(0, remaining).toFixed(remaining < 10 ? 1 : 0)}
        </motion.span>
        {showLabel && <span className="mt-1 text-xs font-bold text-stone-400">{label}</span>}
      </div>
    </div>
  );
}
