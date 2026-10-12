import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ملاحظة: لا نستخدم StrictMode لتجنّب تشغيل تأثيرات الاتصال مرّتين في بيئة التطوير
// (يمنع الانضمام المزدوج للغرفة عبر WebSocket).
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
