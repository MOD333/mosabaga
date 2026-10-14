// =====================================================================
//  قاعدة أسئلة اللعبة — «استنتج الرابط العجيب»
//  الأنواع: "intro" (فقرة تمهيدية) | "image" | "emoji"
//  الصور تُوضع في: client/public/media/
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
  { category: "ركز زين", type: "memory", mediaUrl: "/media/mem10.jpg", question: "الساعة المعلقة على الجدار كانت تأشر على أي وقت؟", answer: "الساعة 3", timeLimit: 15 },

  // ---------- فقرة الكلمة الشاذة (الدخيل) ----------
  { type: "intro", title: "فقرة الكلمة الشاذة (الدخيل) 🕵️‍♂️", description: "بتطلع لك 4 كلمات، 3 منها بينهم رابط مشترك وواحدة شاذة (دخيلة عليهم). المطلوب تصيد الكلمة الشاذة بأسرع وقت! (لديك 5 ثواني فقط)" },
  { category: "الكلمة الشاذة", type: "text", question: "كامري، هايلوكس، لاندكروزر، باترول", answer: "باترول (نيسان، الباقي تويوتا)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "الصفا، المروة، أبحر، السويدي", answer: "السويدي (حي بالرياض، الباقي بجدة)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "البيك، كودو، الطازج، كنتاكي", answer: "كنتاكي (أجنبي، الباقي سعودي)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "لوس سانتوس، ساندي شورز، باليتو باي، فايس سيتي", answer: "فايس سيتي (خارج خريطة قراند 5)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "ريدبول، كودرد، بايسن، بيبسي", answer: "بيبسي (مشروب غازي، الباقي طاقة)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "واتساب، تيليجرام، ديسكورد، فوتوشوب", answer: "فوتوشوب (تصميم، الباقي تواصل)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "بلايستيشن، إكس بوكس، نينتندو، آبل", answer: "آبل (ليست كونسول ألعاب)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "بندريتا، أبو فلة، ملهم، أبو الرُّب", answer: "ملهم (محتوى تثقيفي، الباقي ترفيه)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "تويتر، انستقرام، تيك توك، نتفلكس", answer: "نتفلكس (منصة مشاهدة، الباقي تواصل)", timeLimit: 5 },
  { category: "الكلمة الشاذة", type: "text", question: "ون بيس، ناروتو، بليتش، باتمان", answer: "باتمان (كوميكس أمريكي، الباقي أنمي)", timeLimit: 5 },

  // ---------- تحدي التيربو ----------
  { category: "تحدي التيربو", type: "turbo", question: "اضغط على الزر بأسرع ما يمكن! (النقرة = 0.10 نقطة)", timeLimit: 10 },

  // ---------- فك التشفير ----------
  { category: "فك التشفير", type: "scramble", question: "رتب الحروف واكتب الكلمة بأسرع وقت!", scrambled: "ي ش ب ت ن ا ل س ي", answer: "بلايستيشن", timeLimit: 20 },
  { category: "فك التشفير", type: "scramble", question: "رتب الحروف واكتب الكلمة بأسرع وقت!", scrambled: "ر م ش ا و ا", answer: "شاورما", timeLimit: 20 },
  { category: "فك التشفير", type: "scramble", question: "رتب الحروف واكتب الكلمة بأسرع وقت!", scrambled: "س ر د س م ي", answer: "مرسيدس", timeLimit: 20 },
  { category: "فك التشفير", type: "scramble", question: "رتب الحروف واكتب الكلمة بأسرع وقت!", scrambled: "و ت ي ب و ي", answer: "يوتيوب", timeLimit: 20 },
  { category: "فك التشفير", type: "scramble", question: "رتب الحروف واكتب الكلمة بأسرع وقت!", scrambled: "ف ا ر ي ن م ك ت", answer: "ماينكرافت", timeLimit: 20 },

  // ---------- الحسبة الخاطفة ----------
  { category: "الحسبة الخاطفة", type: "math", level: "سهل", points: 2, question: "15 + 18 = ?", options: ["23", "33", "43", "35"], answer: "33", timeLimit: 10 },
  { category: "الحسبة الخاطفة", type: "math", level: "متوسط", points: 4, question: "7 × 6 - 5 = ?", options: ["35", "37", "42", "40"], answer: "37", timeLimit: 10 },
  { category: "الحسبة الخاطفة", type: "math", level: "صعب", points: 6, question: "(45 ÷ 5) × 8 = ?", options: ["72", "64", "81", "56"], answer: "72", timeLimit: 10 }
];

export default gameData;
