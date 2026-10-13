// =====================================================================
//  قاعدة أسئلة اللعبة — «استنتج الرابط العجيب»
//  الشكل: { question, category, type, mediaUrl?, answer }
//  الصور تُوضع في: client/public/media/   (بنفس الأسماء أدناه)
// =====================================================================

export const gameData = [
  // ---------- أسئلة مصوّرة ----------
  { question: "استنتج الرابط العجيب:", category: "لعبة", type: "image", mediaUrl: "/media/gta.jpg", answer: "قراند" },
  { question: "استنتج الرابط العجيب:", category: "مسلسل", type: "image", mediaUrl: "/media/bab-alhara.jpg", answer: "باب الحارة" },
  { question: "استنتج الرابط العجيب:", category: "أكلة", type: "image", mediaUrl: "/media/kabsa.jpg", answer: "كبسة / لحم مضغوط" },
  { question: "استنتج الرابط العجيب:", category: "مصطلح", type: "image", mediaUrl: "/media/money-wash.jpg", answer: "غسيل أموال" },
  { question: "استنتج الرابط العجيب:", category: "مصطلح", type: "image", mediaUrl: "/media/honey-moon.jpg", answer: "شهر العسل" },
  { question: "استنتج الرابط العجيب:", category: "مثل شعبي", type: "image", mediaUrl: "/media/hot-eye.jpg", answer: "عين حارة" },
  { question: "استنتج الرابط العجيب:", category: "حيوان", type: "image", mediaUrl: "/media/hippo.jpg", answer: "فرس النهر" },
  { question: "استنتج الرابط العجيب:", category: "مصطلح تجاري", type: "image", mediaUrl: "/media/capital.jpg", answer: "رأس مال" },
  { question: "استنتج الرابط العجيب:", category: "موقع سعودي", type: "image", mediaUrl: "/media/haraj.jpg", answer: "موقع حراج" },
  { question: "استنتج الرابط العجيب:", category: "لقب مدينة", type: "image", mediaUrl: "/media/jeddah.jpg", answer: "عروس البحر / جدة" },

  // ---------- أسئلة الإيموجي ----------
  { question: "👨🏻‍🦲 🕶️ 💊 🔴 🔵", category: "فيلم", type: "emoji", answer: "ماتريكس" },
  { question: "🍚 🍖 🧅 🍅 🌶️", category: "أكلة", type: "emoji", answer: "كبسة" },
  { question: "🏃‍♂️ 🚆 👮‍♂️ 🐕", category: "لعبة جوال", type: "emoji", answer: "صب واي" },
  { question: "🥔 🎧 🔴 🤣", category: "يوتيوبر", type: "emoji", answer: "بندريتا" },
  { question: "⛺ 📦 ❤️ 🌍", category: "يوتيوبر", type: "emoji", answer: "أبو فلة" },
  { question: "🧔🏻 🧩 ❓ 💡", category: "صانع محتوى", type: "emoji", answer: "أبو عمر" },
  { question: "🌊 🚤 🏖️ ☀️", category: "حي في جدة", type: "emoji", answer: "أبحر" },
  { question: "🏚️ 🏮 🚶‍♂️ ☕", category: "حي في جدة", type: "emoji", answer: "البلد" },
  { question: "🎓 📚 🚗 🚦", category: "حي في جدة", type: "emoji", answer: "الجامعة" },
  { question: "🚓 👨‍✈️ 🔫 🚗 🎙️", category: "لعبة", type: "emoji", answer: "قراند رول بلاي (FiveM)" }
];

export default gameData;
