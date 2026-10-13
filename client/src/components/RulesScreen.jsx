import { motion } from 'framer-motion';
import { SoftButton } from './ui.jsx';

/* القوانين — نصّها ثابت كما هو */
const RULES = [
  'لا نتحمل مسؤولية أي تأخير في وصول الصوت بسبب اتصالك بالإنترنت.',
  'قرارات المضيف نهائية، وصاحب القرار الأول والأخير هو الإدارة، يُمنع الجدال.',
  'يحق لكل لاعب "الاعتراض" 3 مرات فقط طوال المسابقة إذا كان متشككاً من إجابته.',
  'مخالفة أي قانون تعرضك لعقوبة "كتم" (Mute) لمدة لا تقل عن 3 دقائق.',
  'اللعبة تحتوي على نظام إنذارات، حصولك على 3 إنذارات يعني طردك نهائياً من المسابقة.',
];

/**
 * شاشة القوانين — بوابة إلزامية بين اختيار الاسم وغرفة الانتظار.
 */
export default function RulesScreen({ playerName, onAgree, onBack }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-cream bg-glow px-5 py-10 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="card-lg overflow-hidden">
          {/* الترويسة */}
          <div className="border-b border-stone-100 bg-honey-50/70 px-6 py-5 text-center">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
              className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-soft"
            >
              📜
            </motion.span>
            <h1 className="font-display text-2xl font-black text-stone-800">قوانين المسابقة</h1>
            <p className="mt-1 text-xs font-bold text-stone-500">
              {playerName ? `أهلاً ${playerName} — اقرأ القوانين قبل الدخول` : 'اقرأ القوانين قبل الدخول'}
            </p>
          </div>

          {/* القوانين */}
          <div className="space-y-3 p-6">
            {RULES.map((rule, index) => (
              <motion.div
                key={rule}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + index * 0.09, type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 px-4 py-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey-200 font-display text-xs font-black text-honey-800">
                  {index + 1}
                </span>
                <p className="text-sm font-bold leading-relaxed text-stone-700">{rule}</p>
              </motion.div>
            ))}
          </div>

          {/* الموافقة */}
          <div className="border-t border-stone-100 px-6 py-5">
            <SoftButton variant="primary" size="xl" className="w-full justify-center" onClick={onAgree}>
              موافق
            </SoftButton>
            <p className="mt-3 text-center text-[11px] font-bold text-stone-400">
              بالضغط على «موافق» أنت تقرّ بالالتزام بجميع القوانين أعلاه.
            </p>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mt-3 w-full text-center text-[11px] font-bold text-stone-400 transition-colors hover:text-stone-600"
              >
                رجوع
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
