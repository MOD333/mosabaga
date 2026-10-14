import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import { cx } from './ui.jsx';

/* مسار التوقيع — خط حر متصل يرسم تدريجياً مثل القلم الحقيقي */
const SIGNATURE_PATH =
  'M12 60 C 30 16, 52 16, 66 44 C 76 64, 88 70, 100 50 C 112 30, 126 22, 138 40 C 148 55, 158 64, 174 50 C 188 38, 202 28, 220 44 C 232 55, 244 58, 258 46 C 268 37, 278 34, 288 40';

/**
 * شهادة مباركة وتفوّق — تظهر للجميع، والتفاعل (التوقيع + التصدير) للفائز فقط.
 */
export default function Certificate({ winnerName, isCurrentPlayerWinner = false }) {
  const [signed, setSigned] = useState(false);
  const canSign = isCurrentPlayerWinner && !signed;

  /* جسم الشهادة — مشترك بين نسخة الشاشة ونسخة الطباعة */
  const body = (
    <div
      className={cx(
        'mx-auto w-full max-w-2xl rounded-lg border-4 border-double border-amber-500 bg-gradient-to-b from-amber-50 via-white to-amber-50 p-4 text-center',
        'shadow-[0_20px_60px_-20px_rgba(180,130,20,0.45)]',
        'print:max-w-none print:rounded-none print:border-[6px] print:p-10 print:shadow-none md:p-8'
      )}
    >
      {/* الإطار الداخلي */}
      <div className="rounded border-2 border-amber-300 p-4 print:border-4 print:p-8 md:p-6">
        <div className="mb-2 text-3xl print:text-2xl">👑</div>

        {/* العنوان بتدرّج ذهبي */}
        <h1
          className={cx(
            'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text font-black text-transparent',
            'text-3xl leading-tight print:text-5xl md:text-5xl'
          )}
        >
          شَهَادَةُ مُبَارَكَة وَتَفَوُّق
        </h1>

        <div className="mx-auto mt-3 h-px w-2/3 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <p className="mt-4 text-sm font-bold text-stone-500 print:text-base">
          تُمنح هذه الشهادة بكل فخر واعتزاز إلى
        </p>

        {/* اسم الفائز — الأكبر والأبرز */}
        <div className="my-4">
          <span className="font-display text-3xl font-black text-stone-800 print:text-5xl md:text-5xl">
            {winnerName || '—'}
          </span>
          <div className="mx-auto mt-2 h-1.5 w-3/4 rounded-full bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        </div>

        <p className="mx-auto max-w-xl text-sm font-bold leading-loose text-stone-600 print:text-base">
          لحصوله على <span className="font-black text-amber-700">المركز الأول</span> في مسابقة
          «تحدي العوال» وتحقيقه أعلى مجموع نقاط بين جميع المتنافسين، متمنّين له دوام التوفيق والنجاح.
        </p>

        {/* التوقيع */}
        <div className="mt-6 flex flex-col items-center">
          <p className="text-xs font-bold text-stone-500 print:text-sm">توقيع صاحب المسابقة: محمد</p>

          <button
            type="button"
            onClick={() => canSign && setSigned(true)}
            aria-label="منطقة التوقيع"
            className={cx(
              'relative mt-1 block select-none',
              canSign ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            <svg viewBox="0 0 300 90" className="h-20 w-56 print:h-24 print:w-64">
              <path
                d={SIGNATURE_PATH}
                pathLength="1"
                fill="none"
                stroke="#b45309"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1"
                strokeDashoffset={signed ? 0 : 1}
                style={{ transition: 'stroke-dashoffset 2s ease-in-out' }}
              />
            </svg>

            {canSign && (
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-0 -bottom-2 text-[11px] font-black text-amber-600 print:hidden"
              >
                اضغط هنا لاعتماد الشهادة والتوقيع
              </motion.span>
            )}
          </button>
        </div>

        {/* زر التصدير — للفائز فقط، بعد التوقيع */}
        {signed && isCurrentPlayerWinner && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-7 print:hidden"
          >
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-amber-500 px-6 py-3 font-display font-black text-white shadow-md transition-colors hover:bg-amber-600"
            >
              🖨️ تصدير الشهادة كـ PDF
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* نسخة الشاشة */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        {body}
      </motion.div>

      {/* نسخة الطباعة — خارج #root حتى لا تُقصّ، وتظهر في الطباعة فقط */}
      {createPortal(
        <div id="certificate-print-root" className="hidden">
          {body}
        </div>,
        document.body
      )}
    </>
  );
}
