// =====================================================================
//  اللاعبون الأربعة (مطابقون تماماً لتعريف السيرفر في server.js)
// =====================================================================

export const PLAYERS = [
  { id: 'abdullah-tarek', name: 'عبدالله طارق', emoji: '🌻', tone: 'honey' },
  { id: 'mohsen-essam', name: 'محسن عصام', emoji: '🍃', tone: 'sage' },
  { id: 'abdulrahman', name: 'عبدالرحمن', emoji: '🌸', tone: 'coral' },
  { id: 'abdullah-faiz', name: 'عبدالله فايز', emoji: '🐚', tone: 'sky' },
];

/** دالة مرفوعة (hoisted) — آمنة من TDZ عند الاستيراد من أي وحدة */
export function playerById(id) {
  return PLAYERS.find((player) => player.id === id) || null;
}

/** ألوان البستيل لكل لاعب (كلاسات ثابتة حتى يلتقطها Tailwind) */
export const TONE = {
  honey: {
    soft: 'bg-honey-50',
    chip: 'bg-honey-100 text-honey-800',
    solid: 'bg-honey-300',
    solidHover: 'hover:bg-honey-400',
    ring: 'ring-honey-300',
    border: 'border-honey-200',
    text: 'text-honey-700',
    bar: 'bg-honey-400',
  },
  sage: {
    soft: 'bg-sage-50',
    chip: 'bg-sage-100 text-sage-800',
    solid: 'bg-sage-300',
    solidHover: 'hover:bg-sage-400',
    ring: 'ring-sage-300',
    border: 'border-sage-200',
    text: 'text-sage-700',
    bar: 'bg-sage-400',
  },
  coral: {
    soft: 'bg-coral-50',
    chip: 'bg-coral-100 text-coral-800',
    solid: 'bg-coral-300',
    solidHover: 'hover:bg-coral-400',
    ring: 'ring-coral-300',
    border: 'border-coral-200',
    text: 'text-coral-700',
    bar: 'bg-coral-400',
  },
  sky: {
    soft: 'bg-sky-50',
    chip: 'bg-sky-100 text-sky-800',
    solid: 'bg-sky-200',
    solidHover: 'hover:bg-sky-300',
    ring: 'ring-sky-300',
    border: 'border-sky-200',
    text: 'text-sky-700',
    bar: 'bg-sky-400',
  },
};

/** دالة مرفوعة (hoisted) — آمنة من TDZ عند الاستيراد من أي وحدة */
export function toneOf(tone) {
  return TONE[tone] || TONE.honey;
}
