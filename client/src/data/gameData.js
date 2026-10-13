// =====================================================================
//  قاعدة أسئلة اللعبة (نسخة الواجهة) — «استنتج الرابط العجيب»
//  الأنواع: "intro" (فقرة تمهيدية) | "image" | "emoji"
// =====================================================================

export const gameData = [
  // ---------- فقرة تمهيدية ----------
  { type: "intro", title: "فقرة الرابط العجيب 🔗", description: "شغل مخك، وحلل الصور! صورتين قدامك، والمطلوب منك تستنتج الكلمة أو الرابط العجيب بينهم في أسرع وقت. التفكير خارج الصندوق وسرعة البديهة هي مفتاح الفوز!" },

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

  // ---------- فقرة تمهيدية ----------
  { type: "intro", title: "فك الشفرة (تحدي الإيموجي) 🧩", description: "اختبار لثقافتك وسرعة بديهتك! سنعرض لك مجموعة إيموجيات ترمز لشيء معين (فيلم، يوتيوبر، حي في جدة، إلخ...). حلل الرموز واضغط الزر قبل الباقين!" },

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
  { question: "🚓 👨‍✈️ 🔫 🚗 🎙️", category: "لعبة", type: "emoji", answer: "قراند رول بلاي (FiveM)" },

  // ---------- فقرة ركز زين (الذاكرة) ----------
  { type: "intro", title: "فقرة ركز زين (اختبار الذاكرة) 👁️", description: "بتظهر لك صورة لمدة 5 ثواني فقط وبعدها بتختفي. ركز في كل تفاصيل الصورة لأن السؤال بيجيك عن شيء دقيق فيها!" },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem1.jpg", question: "كم عدد أيادي السوني اللي كانت على الطاولة؟", answer: "3 أيادي", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem2.jpg", question: "إيش كان لون الباص اللي في الخلفية؟", answer: "أصفر", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem3.jpg", question: "كم علبة مشروب كانت جنب صحن الكبسة؟", answer: "2 (علبتين)", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem4.jpg", question: "الحرامي كان لابس كاب ولا قناع على عينه؟", answer: "قناع", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem5.jpg", question: "كم كوب قهوة ورقي كان موجود على الطاولة؟", answer: "4 أكواب", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem6.jpg", question: "إيش كان لون الدلة اللي على النار؟", answer: "فضي", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem7.jpg", question: "إيش كان لون السيارة اللي ورا الميكانيكي؟", answer: "أحمر", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem8.jpg", question: "ثلاجة الآيسكريم كان لونها أزرق ولا وردي؟", answer: "وردي", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem9.jpg", question: "النتيجة في الشاشة الكبيرة كانت كم كم؟", answer: "2 - 1", timeLimit: 15 },
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem10.jpg", question: "الساعة المعلقة على الجدار كانت تأشر على أي وقت؟", answer: "الساعة 3", timeLimit: 15 }
];

export const TOTAL_QUESTIONS = gameData.length;

/** وسم الفقرة — جميع الأسئلة في فقرة واحدة */
export const ROUND_LABEL = 'الرابط العجيب';

export const ROUNDS = [...new Set(gameData.map((item) => item.round || ROUND_LABEL))];

export const TIMER_DURATION = 7;

export default gameData;
