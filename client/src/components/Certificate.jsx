import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import { cx } from './ui.jsx';

/* توقيع يدوي حر لـ «محمد»: حلقات غير منتظمة، انحناءات حبر متفاوتة، وذيل سفلي طويل */
const SIGNATURE_PATH =
  'M 30 118 C 22 94 36 72 56 82 C 68 88 66 104 52 100 ' +
  'C 76 76 98 68 114 88 C 126 102 120 120 102 112 ' +
  'C 132 74 160 62 180 86 C 194 102 188 124 166 118 ' +
  'C 198 84 228 70 250 92 C 264 106 258 126 238 118 ' +
  'C 270 82 302 68 324 90 C 338 104 332 124 312 116 ' +
  'C 338 104 354 110 362 126 C 368 138 360 148 348 142 ' +
  'C 332 134 300 152 240 154 C 160 156 80 150 34 140 C 20 137 12 132 8 126';

/**
 * شهادة مباركة وتفوّق — قياس A4 أفقي ثابت، لا تتجاوز حدودها أبداً.
 * التوقيع والتصدير للفائز فقط.
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
        // شكل A4 أفقي ثابت + overflow-hidden يمنع أي خروج عن الإطار
        'relative w-full min-w-0 max-w-5xl overflow-hidden',
        'aspect-[1.414/1] min-h-[440px] bg-[#fdfbf7] text-center',
        // إطارات فاخرة
        'border-[12px] border-double border-yellow-600',
        'outline outline-4 outline-offset-4 outline-yellow-800',
        'shadow-2xl',
        // حشوة متجاوبة
        'p-6 sm:p-8 md:p-10 lg:p-12',
        // توزيع عمودي: التاج/العنوان أعلى، الشبكة أسفل
        'flex flex-col items-center justify-between',
        // الطباعة
        'print:m-0 print:p-8 print:shadow-none print:border-[16px] print:outline-none'
      )}
    >
      {/* زخارف الزوايا الذهبية */}
      <span className="pointer-events-none absolute right-3 top-3 h-8 w-8 border-r-4 border-t-4 border-yellow-500/70 sm:h-11 sm:w-11" />
      <span className="pointer-events-none absolute left-3 top-3 h-8 w-8 border-l-4 border-t-4 border-yellow-500/70 sm:h-11 sm:w-11" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 border-b-4 border-r-4 border-yellow-500/70 sm:h-11 sm:w-11" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 border-b-4 border-l-4 border-yellow-500/70 sm:h-11 sm:w-11" />

      {/* ===== القسم الأعلى ===== */}
      <div className="flex w-full flex-col items-center">
        <div className="text-[clamp(1.5rem,3vw,2.5rem)] leading-none">👑</div>

        <h1
          className={cx(
            'mt-2 max-w-full bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-800',
            'bg-clip-text pb-1 font-black leading-tight tracking-wide text-transparent',
            'text-[clamp(1.1rem,2.9vw,2.65rem)]'
          )}
        >
          شَهَادَةُ مُبَارَكَة وَتَفَوُّق
        </h1>

        <p className="mt-2 text-[clamp(0.7rem,1.25vw,1rem)] text-gray-500">
          تُمنح هذه الشهادة بكل فخر واعتزاز إلى:
        </p>
      </div>

      {/* ===== القسم الأوسط: اسم الفائز ===== */}
      <div className="flex w-full min-w-0 flex-col items-center">
        <h2
          className={cx(
            'max-w-full break-words px-2 pb-2 font-black leading-tight text-gray-900',
            'border-b-4 border-yellow-500',
            'text-[clamp(1.4rem,4.2vw,3.6rem)]'
          )}
        >
          {winnerName || '—'}
        </h2>

        <p className="mt-3 max-w-[85%] text-[clamp(0.68rem,1.2vw,1rem)] leading-relaxed text-gray-600">
          لحصوله على <span className="font-black text-yellow-700">المركز الأول</span> في مسابقة «تحدي
          العوال» وتحقيقه أعلى مجموع نقاط بين جميع المتنافسين. نتمنى له دوام التوفيق والنجاح.
        </p>
      </div>

      {/* ===== القسم السفلي: التاريخ + التوقيع ===== */}
      <div className="mt-auto grid w-full grid-cols-2 items-end gap-4 border-t-2 border-gray-200 pt-4 text-right sm:gap-8 sm:pt-6">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="text-[clamp(0.6rem,1vw,0.85rem)] font-bold text-gray-400">
            تاريخ الإصدار
          </span>
          <span className="text-[clamp(0.7rem,1.3vw,1.05rem)] font-black text-gray-800">
            {issueDate}
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1">
          <span className="text-[clamp(0.6rem,1vw,0.85rem)] font-bold text-gray-400">
            توقيع المُضيف: محمد
          </span>

          <button
            type="button"
            onClick={() => canSign && setSigned(true)}
            aria-label="منطقة التوقيع"
            className={cx('relative mt-1 block select-none', canSign ? 'cursor-pointer' : 'cursor-default')}
          >
            <svg
              viewBox="0 0 400 170"
              className="h-12 w-36 sm:h-16 sm:w-44 md:h-20 md:w-56 print:h-24 print:w-64"
            >
              <path
                pathLength="1000"
                d={SIGNATURE_PATH}
                className={cx(
                  'fill-none stroke-gray-900',
                  '[stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round]',
                  '[stroke-dasharray:1000]',
                  signed ? 'animate-[draw_2.5s_ease-out_forwards]' : '[stroke-dashoffset:1000]'
                )}
              />
            </svg>

            {canSign && (
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-0 -bottom-4 text-center text-[10px] font-black text-yellow-700 print:hidden"
              >
                اضغط هنا لاعتماد الشهادة
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 1000; }
          to   { stroke-dashoffset: 0; }
        }
        @media print {
          @page { size: landscape; margin: 8mm; }
        }
      `}</style>

      {/* نسخة الشاشة */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full min-w-0 justify-center"
      >
        {body}
      </motion.div>

      {/* زر التصدير — خارج حدود الشهادة، للفائز فقط */}
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
