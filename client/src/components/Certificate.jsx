import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import { cx } from './ui.jsx';

/* توقيع حر بخطّ يدوي — حلقات وانعطافات حادة وذيل سفلي طويل (ليس موجة جيبية) */
const SIGNATURE_PATH =
  'M 20 96 C 12 70 26 48 42 58 C 52 64 54 78 44 76 ' +
  'C 66 50 82 42 98 60 C 108 70 106 84 92 78 ' +
  'C 118 44 142 34 160 56 C 172 68 168 84 152 78 ' +
  'C 182 40 210 32 228 54 C 240 65 236 82 218 76 ' +
  'C 248 42 276 34 292 56 C 300 66 296 82 280 78 ' +
  'C 306 66 322 64 336 72 C 344 76 342 84 332 80 ' +
  'C 320 94 250 106 150 104 C 80 102 36 98 12 90';

/**
 * شهادة مباركة وتفوّق — تصميم فاخر واقعي.
 * مرئية للجميع، والتفاعل (التوقيع + التصدير) محصور بالفائز فقط.
 */
export default function Certificate({ winnerName, isCurrentPlayerWinner = false }) {
  const [signed, setSigned] = useState(false);
  const canSign = isCurrentPlayerWinner && !signed;

  const issueDate = new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  /* جسم الشهادة — مشترك بين نسخة الشاشة ونسخة الطباعة */
  const body = (
    <div
      className={cx(
        // ورق عاجي + إطار مزدوج فاخر
        'mx-auto w-full max-w-3xl bg-[#fdfbf7]',
        'border-[12px] border-double border-yellow-600',
        'outline outline-4 outline-offset-4 outline-yellow-800',
        'm-8 p-12 shadow-2xl',
        // الطباعة: يملأ الصفحة بلا هوامش ولا ظلال
        'print:m-0 print:border-[16px] print:p-10 print:shadow-none'
      )}
    >
      <div className="flex flex-col items-center space-y-8 text-center">
        {/* التاج */}
        <svg viewBox="0 0 64 48" className="h-12 w-16 text-yellow-600" fill="none" aria-hidden="true">
          <path d="M12 40 L12 16 L24 26 L32 8 L40 26 L52 16 L52 40 Z" fill="currentColor" />
          <circle cx="12" cy="15" r="3" fill="currentColor" />
          <circle cx="32" cy="6" r="3" fill="currentColor" />
          <circle cx="52" cy="15" r="3" fill="currentColor" />
          <rect x="8" y="43" width="48" height="4" rx="2" fill="currentColor" />
        </svg>

        {/* العنوان — تدرّج ذهبي */}
        <h1
          className={cx(
            'bg-gradient-to-b from-yellow-500 to-yellow-700 bg-clip-text text-transparent',
            'text-4xl font-black leading-relaxed pb-1 md:text-6xl print:text-5xl'
          )}
        >
          شَهَادَةُ مُبَارَكَة وَتَفَوُّق
        </h1>

        {/* عبارة المنح */}
        <p className="text-lg font-semibold text-gray-500 md:text-xl print:text-lg">
          تُمنح هذه الشهادة بكل فخر واعتزاز إلى:
        </p>

        {/* اسم الفائز — الأكبر والأبرز */}
        <div className="flex flex-col items-center">
          <span className="text-6xl font-black leading-none text-gray-900 md:text-8xl print:text-7xl">
            {winnerName || '—'}
          </span>
          <span className="mt-3 h-1 w-48 rounded-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent md:w-64" />
        </div>

        {/* الوصف */}
        <p className="max-w-2xl text-base font-medium leading-loose text-gray-600 md:text-lg print:text-base">
          لحصوله على المركز الأول في مسابقة «تحدي العوال» وتحقيقه أعلى مجموع نقاط بين جميع
          المتنافسين. نتمنى له دوام التوفيق والنجاح.
        </p>

        {/* الشبكة السفلية: التاريخ + التوقيع */}
        <div className="mt-16 grid w-full grid-cols-2 gap-8 border-t-2 border-gray-200 pt-8">
          {/* تاريخ الإصدار */}
          <div className="flex flex-col items-center justify-end gap-2">
            <span className="text-sm font-bold text-gray-500">تاريخ الإصدار</span>
            <span className="text-lg font-black text-gray-800">{issueDate}</span>
          </div>

          {/* توقيع المُضيف */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-gray-500">توقيع المُضيف: محمد</span>

            <button
              type="button"
              onClick={() => canSign && setSigned(true)}
              aria-label="منطقة التوقيع"
              className={cx('relative mt-1 block select-none', canSign ? 'cursor-pointer' : 'cursor-default')}
            >
              <svg viewBox="0 0 400 160" className="h-20 w-56 print:h-24 print:w-64">
                <path
                  pathLength="1000"
                  d={SIGNATURE_PATH}
                  className={cx(
                    'fill-none stroke-amber-800',
                    '[stroke-width:3.5] [stroke-linecap:round] [stroke-linejoin:round]',
                    '[stroke-dasharray:1000]',
                    signed ? '[stroke-dashoffset:0]' : '[stroke-dashoffset:1000]',
                    'transition-[stroke-dashoffset] duration-[2000ms] ease-out'
                  )}
                />
              </svg>

              {canSign && (
                <motion.span
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-x-0 -bottom-6 text-center text-[11px] font-black text-yellow-700 print:hidden"
                >
                  اضغط هنا لاعتماد الشهادة
                </motion.span>
              )}
            </button>
          </div>
        </div>
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

      {/* زر التصدير — خارج حدود الشهادة، للفائز فقط بعد التوقيع */}
      {signed && isCurrentPlayerWinner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6 flex justify-center print:hidden"
        >
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-stone-900 px-7 py-3 font-display text-base font-black text-yellow-400 shadow-lg ring-1 ring-yellow-500/40 transition-colors hover:bg-stone-800"
          >
            🖨️ تصدير الشهادة كـ PDF
          </button>
        </motion.div>
      )}

      {/* نسخة الطباعة — خارج #root حتى لا تُقصّ */}
      {createPortal(
        <div id="certificate-print-root" className="hidden">
          {body}
        </div>,
        document.body
      )}
    </>
  );
}
