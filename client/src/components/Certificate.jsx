import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import { cx } from './ui.jsx';

/* توقيع يدوي حر لـ «محمد» */
const SIGNATURE_PATH =
  'M 30 118 C 22 94 36 72 56 82 C 68 88 66 104 52 100 ' +
  'C 76 76 98 68 114 88 C 126 102 120 120 102 112 ' +
  'C 132 74 160 62 180 86 C 194 102 188 124 166 118 ' +
  'C 198 84 228 70 250 92 C 264 106 258 126 238 118 ' +
  'C 270 82 302 68 324 90 C 338 104 332 124 312 116 ' +
  'C 338 104 354 110 362 126 C 368 138 360 148 348 142 ' +
  'C 332 134 300 152 240 154 C 160 156 80 150 34 140 C 20 137 12 132 8 126';

export default function Certificate({ winnerName, isCurrentPlayerWinner = false }) {
  const [signed, setSigned] = useState(false);
  const canSign = isCurrentPlayerWinner && !signed;

  const issueDate = new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const body = (
    <div
      className={cx(
        'relative w-full max-w-[1050px] mx-auto flex flex-col items-center justify-between text-center overflow-visible',
        'aspect-[1.2/1] xl:aspect-[1.414/1] min-h-[400px]',
        'bg-[#fdfbf7] p-4 md:p-8 lg:p-12',
        'border-[12px] border-double border-yellow-600 outline outline-4 outline-offset-4 outline-yellow-800 shadow-2xl',
        // تعديلات صارمة للطباعة لضمان ملء الورقة بالكامل
        'print:absolute print:inset-0 print:m-auto print:w-[297mm] print:h-[210mm] print:max-w-none print:aspect-auto print:border-[16px] print:shadow-none print:outline-none print:p-12'
      )}
    >
      <span className="pointer-events-none absolute right-3 top-3 h-8 w-8 border-r-4 border-t-4 border-yellow-500/70 sm:h-11 sm:w-11 print:hidden" />
      <span className="pointer-events-none absolute left-3 top-3 h-8 w-8 border-l-4 border-t-4 border-yellow-500/70 sm:h-11 sm:w-11 print:hidden" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 border-b-4 border-r-4 border-yellow-500/70 sm:h-11 sm:w-11 print:hidden" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 border-b-4 border-l-4 border-yellow-500/70 sm:h-11 sm:w-11 print:hidden" />

      <div className="flex w-full flex-col items-center mt-2">
        <div className="text-[clamp(1.5rem,3vw,3rem)] leading-none mb-1 print:text-[3.5rem]">👑</div>
        <h1
          className={cx(
            'w-full bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-800',
            'bg-clip-text pb-1 font-black leading-tight tracking-wide text-transparent',
            'text-[clamp(1.2rem,2.5vw,2.5rem)] print:text-[3rem]'
          )}
        >
          شَهَادَةُ مُبَارَكَة وَتَفَوُّق
        </h1>
        <p className="mt-1 text-[clamp(0.7rem,1.2vw,1rem)] text-gray-500 font-bold print:text-[1.2rem]">
          تُمنح هذه الشهادة بكل فخر واعتزاز إلى:
        </p>
      </div>

      <div className="flex w-full min-w-0 flex-col items-center my-2">
        <h2
          className={cx(
            'w-full max-w-3xl px-2 pb-2 font-black leading-tight text-gray-900',
            'border-b-4 border-yellow-500',
            'break-words',
            'text-[clamp(1.8rem,4vw,4rem)] print:text-[4.5rem]'
          )}
        >
          {winnerName || '—'}
        </h2>
        <p className="mt-2 max-w-[90%] text-[clamp(0.7rem,1.1vw,1rem)] leading-relaxed text-gray-600 font-medium print:text-[1.2rem] print:mt-6">
          لحصوله على <span className="font-black text-yellow-700">المركز الأول</span> في مسابقة «تحدي العوال» وتحقيقه أعلى مجموع نقاط بين جميع المتنافسين. نتمنى له دوام التوفيق والنجاح.
        </p>
      </div>

      <div className="mt-auto grid w-full grid-cols-2 items-end gap-2 border-t-2 border-gray-200/60 pt-2 text-right sm:gap-6 sm:pt-4 print:pt-8 print:border-gray-300">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="text-[clamp(0.6rem,0.9vw,0.85rem)] font-bold text-gray-400 print:text-[1rem]">
            تاريخ الإصدار
          </span>
          <span className="text-[clamp(0.7rem,1.1vw,1.1rem)] font-black text-gray-800 print:text-[1.3rem]">
            {issueDate}
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1 relative">
          <span className="text-[clamp(0.6rem,0.9vw,0.85rem)] font-bold text-gray-400 print:text-[1rem]">
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
              className="h-10 w-28 sm:h-16 sm:w-44 md:h-20 md:w-56 print:h-28 print:w-72"
            >
              <path
                pathLength="1000"
                d={SIGNATURE_PATH}
                className={cx(
                  'fill-none stroke-gray-900',
                  '[stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round]',
                  '[stroke-dasharray:1000]',
                  signed ? 'animate-[draw_2.5s_ease-out_forwards]' : '[stroke-dashoffset:1000]',
                  'print:[stroke-dashoffset:0]' // لضمان ظهور التوقيع كاملاً في الطباعة
                )}
              />
            </svg>
            {canSign && (
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-0 -bottom-4 text-center text-[10px] font-black text-yellow-700 print:hidden bg-yellow-50/80 rounded-full px-1 py-0.5 mx-auto w-max"
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
          @page { 
            size: A4 landscape; 
            margin: 0; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
      `}</style>

      {/* حاوية تجمع الشهادة وزر التصدير جنباً إلى جنب */}
      <div className="flex flex-row items-center gap-6 w-full">
        {/* زر التصدير — على اليسار */}
        {signed && isCurrentPlayerWinner && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="hidden xl:flex flex-col justify-center print:hidden"
          >
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl bg-stone-900 px-6 py-4 font-display text-lg font-black text-yellow-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-2 ring-yellow-500/40 transition-all hover:bg-stone-800 hover:scale-105 active:scale-95 flex flex-col items-center gap-2 text-center w-32"
            >
              <span className="text-3xl">🖨️</span>
              تصدير PDF
            </button>
          </motion.div>
        )}

        {/* نسخة الشاشة للشهادة */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full min-w-0 flex flex-col items-center"
        >
          {body}

          {/* زر التصدير للشاشات الصغيرة (يظهر أسفل الشهادة فقط إذا لم تكن المساحة كافية لعرضه بجانبها) */}
          {signed && isCurrentPlayerWinner && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6 flex justify-center print:hidden xl:hidden w-full"
            >
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-2xl bg-stone-900 px-6 py-3 font-display text-base font-black text-yellow-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-2 ring-yellow-500/40 transition-all hover:bg-stone-800 hover:scale-105 active:scale-95"
              >
                🖨️ تصدير الشهادة كـ PDF
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {createPortal(
        <div id="certificate-print-root" className="hidden print:block w-[297mm] h-[210mm]">
          {body}
        </div>,
        document.body
      )}
    </>
  );
}