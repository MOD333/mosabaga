import { AnimatePresence, motion } from 'framer-motion';

import { Avatar, Card, SoftButton, cx } from './ui.jsx';

/**
 * نافذة نظام الإنذارات (Warning / Action Modal).
 *
 * مكوّن مستقل على نطاق الوحدة (hoisted function declaration) — لا يعتمد على
 * ترتيب تهيئة HostView إطلاقاً، ولذلك يستحيل أن يقع في Temporal Dead Zone.
 */
export default function WarningModal({
  open = false,
  candidates = [],
  targetId = null,
  reason = '',
  sending = false,
  onSelect,
  onReasonChange,
  onSend,
  onClose,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[72] flex items-center justify-center bg-stone-900/45 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 22, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-md"
          >
            <Card lg className="p-6">
              <div className="text-center">
                <span className="text-4xl">🔔</span>
                <h2 className="mt-2 font-display text-2xl font-black text-stone-800">نظام الإنذارات</h2>
                <p className="mt-1 text-xs font-bold text-stone-400">
                  اختر اللاعب واكتب السبب — ٣ إنذارات = طرد نهائي.
                </p>
              </div>

              {/* قائمة اللاعبين المتصلين */}
              <div className="mt-5 space-y-2">
                {candidates.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                    لا يوجد لاعبون متصلون حالياً.
                  </p>
                )}

                {candidates.map((player) => {
                  const selected = targetId === player.id;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => onSelect?.(player.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-right transition-colors',
                        selected ? 'border-coral-400 bg-coral-50' : 'border-stone-100 bg-stone-50/70 hover:bg-stone-100'
                      )}
                    >
                      <Avatar player={player} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-stone-800">{player.name}</span>
                        <span className="text-[11px] font-bold text-stone-400">
                          إنذارات سابقة:{' '}
                          <span className={player.warnings > 0 ? 'text-coral-500' : ''}>{player.warnings}</span>
                        </span>
                      </span>
                      <span
                        className={cx(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-black',
                          selected ? 'bg-coral-500 text-white' : 'bg-white text-stone-300 ring-1 ring-stone-200'
                        )}
                      >
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* السبب */}
              <label className="mt-5 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-stone-400">سبب الإنذار</span>
                <input
                  value={reason}
                  onChange={(event) => onReasonChange?.(event.target.value.slice(0, 180))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && targetId && reason.trim()) onSend?.();
                  }}
                  placeholder="مثال: مقاطعة اللاعبين أثناء السؤال"
                  className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm font-bold text-stone-800 outline-none transition-colors placeholder:font-normal placeholder:text-stone-400 focus:border-coral-400"
                />
              </label>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <SoftButton
                  variant="danger"
                  size="lg"
                  className="flex-1 justify-center"
                  disabled={!targetId || !reason.trim() || sending}
                  onClick={onSend}
                >
                  {sending ? 'جارٍ الإرسال…' : '🔔 إرسال الإنذار'}
                </SoftButton>
                <SoftButton variant="ghost" size="lg" className="justify-center sm:w-28" onClick={onClose}>
                  إغلاق
                </SoftButton>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
