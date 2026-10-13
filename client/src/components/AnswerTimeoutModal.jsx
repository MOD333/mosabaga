import { AnimatePresence, motion } from 'framer-motion';

import { Card, SoftButton } from './ui.jsx';

/**
 * نافذة قرار المضيف عند انتهاء مهلة الإجابة (٣ ثوانٍ).
 *
 * مكوّن مستقل على نطاق الوحدة (hoisted function declaration) — لا يعتمد على
 * ترتيب تهيئة HostView إطلاقاً.
 */
export default function AnswerTimeoutModal({ open = false, playerName = '', onAward, onReset }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/45 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-md"
          >
            <Card lg className="p-6 text-center">
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.05 }}
                className="mb-2 inline-block text-5xl"
              >
                ⏰
              </motion.span>

              <p className="text-[11px] font-black tracking-[0.2em] text-coral-500">
                انتهت مهلة الإجابة (٣ ثوانٍ)
              </p>

              <h2 className="mt-2 font-display text-2xl font-black text-stone-800">
                {playerName || 'لاعب'}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                لم يتم الحكم على الإجابة خلال ٣ ثوانٍ. اختر ما تريد فعله.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <SoftButton variant="success" size="lg" className="flex-1 justify-center" onClick={onAward}>
                  ✔ حساب النقطة
                </SoftButton>
                <SoftButton variant="ghost" size="lg" className="flex-1 justify-center" onClick={onReset}>
                  ⟲ إعادة الوقت / إلغاء
                </SoftButton>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
