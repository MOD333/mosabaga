import { io } from 'socket.io-client';

/**
 * ══════════════════════════════════════════════════════════════════════
 *  اتصال Socket.io — تهيئة صريحة وثابتة
 * ══════════════════════════════════════════════════════════════════════
 *  المنفذ دائماً 3001. اسم المضيف يُشتق تلقائياً:
 *    • من الكمبيوتر      → http://localhost:3001
 *    • من الجوال (LAN)  → http://192.168.x.x:3001   (نفس الشبكة)
 *    • عند الخدمة من Node نفسه → أصل الصفحة الحالي
 *  هذا يمنع تعليق الاتصال نهائياً ويجعل اللعب من الجوال يعمل.
 *  يمكن تجاوزه يدوياً عبر: VITE_SERVER_URL
 * ══════════════════════════════════════════════════════════════════════
 */
const SERVER_PORT = '3001';

function resolveServerUrl() {
  const explicit = import.meta.env.VITE_SERVER_URL;
  if (explicit) return explicit;

  if (typeof window === 'undefined') return `http://localhost:${SERVER_PORT}`;

  const { protocol, hostname, port } = window.location;

  // الواجهة تُخدم من نفس سيرفر Node (إنتاج) → نفس الأصل بالضبط
  if (port === SERVER_PORT || port === '') return window.location.origin;

  // تطوير: واجهة Vite على 5173 منفصلة عن السيرفر على 3001
  return `${protocol}//${hostname}:${SERVER_PORT}`;
}

export const SERVER_URL = resolveServerUrl();

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
  randomizationFactor: 0.5,
  timeout: 10000,
  forceNew: false,
});

/** حالة الاتصال المشتركة — تُقرأ من الواجهة وتعرض رسائل واضحة للمستخدم */
export const connectionInfo = {
  serverUrl: SERVER_URL,
  attempts: 0,
  lastError: null,
  connected: socket.connected,
};

socket.on('connect', () => {
  connectionInfo.attempts = 0;
  connectionInfo.lastError = null;
  connectionInfo.connected = true;
});

socket.on('disconnect', () => {
  connectionInfo.connected = false;
});

socket.io.on('reconnect_attempt', (attempt) => {
  connectionInfo.attempts = attempt;
});

socket.on('connect_error', (error) => {
  connectionInfo.attempts += 1;
  connectionInfo.lastError = error?.message || 'تعذّر الاتصال';
  if (import.meta.env.DEV) {
    console.warn(`[socket] فشل الاتصال بـ ${SERVER_URL}:`, connectionInfo.lastError);
  }
});

/** محاولة اتصال يدوية فورية (زر «إعادة المحاولة») */
export function retryConnection() {
  connectionInfo.attempts = 0;
  connectionInfo.lastError = null;
  socket.disconnect();
  socket.connect();
}

export default socket;
