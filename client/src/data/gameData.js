// =====================================================================
//  قاعدة أسئلة اللعبة (نسخة الواجهة) — تحدي «الرابط العجيب»
//  الشكل: { question, type, mediaUrl, answer }
// =====================================================================

export const gameData = [
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/gta.jpg", answer: "قراند" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/bab-alhara.jpg", answer: "باب الحارة" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/kabsa.jpg", answer: "كبسة / لحم مضغوط" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/money-wash.jpg", answer: "غسيل أموال" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/honey-moon.jpg", answer: "شهر العسل" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/hot-eye.jpg", answer: "عين حارة" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/hippo.jpg", answer: "فرس النهر" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/capital.jpg", answer: "رأس مال" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/haraj.jpg", answer: "موقع حراج" },
  { question: "استنتج الرابط العجيب:", type: "image", mediaUrl: "/media/jeddah.jpg", answer: "عروس البحر / جدة" }
];

export const TOTAL_QUESTIONS = gameData.length;

/** وسم الفقرة — جميع الأسئلة في فقرة واحدة */
export const ROUND_LABEL = 'الرابط العجيب';

export const ROUNDS = [...new Set(gameData.map((item) => item.round || ROUND_LABEL))];

export const TIMER_DURATION = 7;

export default gameData;
