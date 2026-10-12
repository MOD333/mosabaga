import { motion } from 'framer-motion';
import { toneOf } from '../data/players.js';

/** دمج أسماء الفئات بأمان */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* بطاقة بيضاء بزوايا ناعمة                                            */
/* ------------------------------------------------------------------ */
export function Card({ children, className = '', lg = false, ...rest }) {
  return (
    <div className={cx(lg ? 'card-lg' : 'card', className)} {...rest}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* زر ناعم                                                             */
/* ------------------------------------------------------------------ */
const BUTTON_VARIANTS = {
  primary: 'bg-honey-300 text-honey-800 hover:bg-honey-400 active:bg-honey-500 shadow-soft',
  success: 'bg-sage-300 text-sage-800 hover:bg-sage-400 active:bg-sage-500 shadow-soft',
  danger: 'bg-coral-300 text-coral-800 hover:bg-coral-400 active:bg-coral-500 shadow-soft',
  sky: 'bg-sky-200 text-sky-800 hover:bg-sky-300 active:bg-sky-400 shadow-soft',
  neutral: 'bg-stone-100 text-stone-700 hover:bg-stone-200 active:bg-stone-300',
  ghost: 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 active:bg-stone-100',
};

const BUTTON_SIZES = {
  xs: 'px-3 py-1.5 text-xs rounded-lg',
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-2xl',
  xl: 'px-8 py-4 text-lg rounded-2xl',
};

export function SoftButton({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-bold transition-all duration-150',
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        disabled && 'pointer-events-none cursor-not-allowed opacity-40 shadow-none',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* شريط صغير (Pill)                                                    */
/* ------------------------------------------------------------------ */
export function Pill({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-600',
    white: 'bg-white text-stone-600 border border-stone-200',
    honey: 'bg-honey-100 text-honey-800',
    sage: 'bg-sage-100 text-sage-800',
    coral: 'bg-coral-100 text-coral-800',
    sky: 'bg-sky-100 text-sky-800',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        tones[tone] || tones.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* صورة اللاعب الرمزية                                                  */
/* ------------------------------------------------------------------ */
export function Avatar({ player, size = 'md', className = '' }) {
  const tone = toneOf(player?.tone);
  const sizes = {
    xs: 'h-8 w-8 text-sm',
    sm: 'h-10 w-10 text-lg',
    md: 'h-12 w-12 text-xl',
    lg: 'h-16 w-16 text-3xl',
  };
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full',
        tone.soft,
        sizes[size] || sizes.md,
        className
      )}
    >
      {player?.emoji || '🙂'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* عنوان قسم                                                           */
/* ------------------------------------------------------------------ */
export function SectionLabel({ children, className = '' }) {
  return (
    <p className={cx('text-xs font-bold tracking-wide text-stone-400', className)}>{children}</p>
  );
}

/* ------------------------------------------------------------------ */
/* شريط تقدم ناعم                                                      */
/* ------------------------------------------------------------------ */
export function ProgressBar({ value = 0, tone = 'bg-honey-400', className = '', height = 'h-1.5' }) {
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-stone-100', height, className)}>
      <motion.div
        className={cx('h-full rounded-full', tone)}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* مؤشر اتصال                                                          */
/* ------------------------------------------------------------------ */
export function ConnectionDot({ connected, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span
        className={cx(
          'h-2 w-2 rounded-full transition-colors',
          connected ? 'bg-sage-400' : 'bg-coral-300'
        )}
      />
      <span className="text-xs font-bold text-stone-400">{connected ? 'متصل' : 'يُعيد الاتصال…'}</span>
    </span>
  );
}
