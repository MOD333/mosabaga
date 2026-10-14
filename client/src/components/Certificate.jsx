import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import { cx } from './ui.jsx';

/* توقيع يدوي حر لـ «محمد»: حلقات دائرية، انحناءات حبر متفاوتة، وذيل سفلي طويل.
   (وليس موجة جيبية — كل مقطع يختلف عن سابقه في الاتجاه والعمق) */
const SIGNATURE_PATH =
  'M 30 118 C 22 94 36 72 56 82 C 68 88 66 104 52 100 ' +
  'C 76 76 98 68 114 88 C 126 102 120 120 102 112 ' +
  'C 132 74 160 62 180 86 C 194 102 188 124 166 118 ' +
  'C 198 84 228 70 250 92 C 264 106 258 126 238 118 ' +
  'C 270 82 302 68 324 90 C 338 104 332 124 312 116 ' +
  'C 338 104 354 110 362 126 C 368 138 360 148 348 142 ' +
  'C 332 134 300 152 240 154 C 160 156 80 150 34 140 C 20 137 12 132 8 126';

/**
 * شهادة مباركة وتفوّق — قياس A4 أفقي، مرئية للجميع.
 * التوقيع والتصدير متاحان للفائز فقط.
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
        // ورق عاجي + مقاس A4 أفقي (aspect-ratio حدّ أدنى فقط: يتمدد إن زاد المحتوى فلا يُقصّ)
        'relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center',
        'bg-[#fdfbf7] aspect-[1.414/1] text-center',
        // إطارات فاخرة
        'border-[12px] border-double border-yellow-600',
        'outline outline-4 outline-offset-4 outline-yellow-800',
        // حشوة متجاوبة تمنع الفيضان
        'p-6 sm:p-12 md:p-16 shadow-2xl',
        // الطباعة
        'print:m-0 print:p-8 print:shadow-none print:border-[16px] print:outline-none'
      )}
    >
      {/* زخارف الزوايا الذهبية */}
      <span className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r-4 border-t-4 border-yellow-500/70 sm:h-12 sm:w-12" />
      <span className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l-4 border-t-4 border-yellow-500/70 sm:h-12 sm:w-12" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b-4 border-r-4 border-yellow-500/70 sm:h-12 sm:w-12" />
      <span className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-4 border-l-4 border-yellow-500/70 sm:h-12 sm:w-12" />

      {/* التاج */}
      <div className="mb-4 text-4xl md:text-5xl">👑</div>

      {/* العنوان */}
      <h1
        className={cx(
          'bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-800 bg-clip-text text-transparent',
          'text-2xl font-black leading-relaxed tracking-wide pb-1 sm:text-4xl md:text-5xl'
        )}
      >
        شَهَادَةُ مُبَارَكَة وَتَفَوُّق
      </h1>

      <p className="mt-4 text-sm text-gray-500 sm:text-base">
        تُمنح هذه الشهادة بكل فخر واعتزاز إلى:
      </p>

      {/* اسم الفائز — البطل */}
      <h2
        className={cx(
          'mb-4 mt-4 max-w-full px-2 pb-2 font-black text-gray-900',
          'border-b-4 border-yellow-500',
          'text-4xl sm:text-5xl md:text-6xl break-words'
        )}
      >
        {winnerName || '—'}
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-loose text-gray-600 sm:text-base md:text-lg">
        لحصوله على <span className="font-black text-yellow-700">المركز الأول</span> في مسابقة «تحدي
        العوال» وتحقيقه أعلى مجموع نقاط بين جميع المتنافسين. نتمنى له دوام التوفيق والنجاح.
      </p>

      {/* الشبكة السفلية */}
      <div className="mt-8 grid w-full grid-cols-2 gap-8 border-t border-gray-200/50 pt-6 text-right md:mt-12 md:pt-8">
        {/* تاريخ الإصدار (يمين في RTL) */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs font-bold text-gray-400 sm:text-sm">تاريخ الإصدار</span>
          <span className="text-sm font-black text-gray-800 sm:text-lg">{issueDate}</span>
        </div>

        {/* توقيع المُضيف (يسار في RTL) */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold text-gray-400 sm:text-sm">توقيع المُضيف: محمد</span>

          <button
            type="button"
            onClick={() => canSign && setSigned(true)}
            aria-label="منطقة التوقيع"
            className={cx('relative mt-1 block select-none', canSign ? 'cursor-pointer' : 'cursor-default')}
          >
            <svg viewBox="0 0 400 170" className="h-16 w-44 sm:h-20 sm:w-56 print:h-24 print:w-64">
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
                className="absolute inset-x-0 -bottom-5 text-center text-[11px] font-black text-yellow-700 print:hidden"
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
      {/* إعداد الصفحة + حركة الرسم (داخل الـ JSX حسب الطلب) */}
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
        className="flex w-full justify-center"
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
