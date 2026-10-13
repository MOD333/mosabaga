import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // يسمح بالوصول من الجوال عبر الشبكة المحلية
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    // مصدر الخرائط مُفعّل: بدونه تظهر أسماء مُصغَّرة مثل 'Z' أو 'G' في الأخطاء،
    // ومعها يستطيع المتصفح إرجاعها إلى الاسم والملف والسطر الحقيقي.
    sourcemap: true,
  },
});
