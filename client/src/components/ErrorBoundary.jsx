import { Component } from 'react';

/**
 * حاجز أخطاء (Error Boundary) على مستوى التطبيق.
 *
 * ملاحظة: هذا لا يُخفي الخطأ ولا يمنع تسجيله — بل يعرضه بوضوح على الشاشة
 * ويسجّله كاملاً في الـ console (اسم الخطأ + الرسالة + شجرة المكوّنات + التتبّع)،
 * بدل أن تظهر شاشة بيضاء بلا أي معلومة.
 *
 * ومع تفعيل sourcemap في vite.config.js سيُترجم أي اسم مُصغَّر (مثل 'Z')
 * إلى اسمه الحقيقي في تبويب Console.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });

    // يبقى الخطأ ظاهراً في الـ console كاملاً — لا ابتلاع
    console.error('[ErrorBoundary] خطأ غير متوقع:', error);
    console.error('[ErrorBoundary] شجرة المكوّنات:', info?.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100dvh',
          background: '#FAF9F6',
          color: '#292524',
          fontFamily: 'Tajawal, system-ui, sans-serif',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 760 }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #f5d4ca',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 8px 26px -10px rgba(120,100,70,0.2)',
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#CE7059', letterSpacing: 2 }}>
              خطأ غير متوقع
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 900 }}>توقّف التطبيق عن العمل</h1>

            <pre
              style={{
                marginTop: 16,
                padding: 14,
                background: '#FAE8E3',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                color: '#7E4030',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error?.name}: {error?.message}
            </pre>

            {info?.componentStack && (
              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#78716c' }}>
                  شجرة المكوّنات (componentStack)
                </summary>
                <pre
                  style={{
                    marginTop: 10,
                    padding: 14,
                    background: '#F5F2EC',
                    borderRadius: 14,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 260,
                    overflow: 'auto',
                  }}
                >
                  {info.componentStack}
                </pre>
              </details>
            )}

            {error?.stack && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#78716c' }}>
                  التتبّع الكامل (stack)
                </summary>
                <pre
                  style={{
                    marginTop: 10,
                    padding: 14,
                    background: '#F5F2EC',
                    borderRadius: 14,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 260,
                    overflow: 'auto',
                  }}
                >
                  {error.stack}
                </pre>
              </details>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                border: 'none',
                borderRadius: 14,
                padding: '12px 22px',
                background: '#F4D592',
                color: '#5F4215',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      </div>
    );
  }
}
