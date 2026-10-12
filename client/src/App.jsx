import { useEffect, useState } from 'react';
import Landing from './components/Landing.jsx';
import PlayerView from './components/PlayerView.jsx';
import HostView from './components/HostView.jsx';
import { socket, SERVER_URL, connectionInfo, retryConnection } from './socket.js';

const PLAYER_KEY = 'mosabaga:player';

function normalizePath(pathname) {
  return String(pathname || '/').replace(/\/+$/, '') || '/';
}

function readStoredPlayer() {
  try {
    return localStorage.getItem(PLAYER_KEY) || null;
  } catch (_) {
    return null;
  }
}

/**
 * التوجيه:
 *   /       → شاشة البداية "من أنت؟" + دخول المضيف
 *   /play   → واجهة اللاعب (الجرس)
 *   /host   → لوحة المضيف
 */
export default function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  const [playerId, setPlayerId] = useState(readStoredPlayer);

  const [conn, setConn] = useState(() => ({
    connected: socket.connected,
    everConnected: socket.connected,
    attempts: connectionInfo.attempts,
    error: connectionInfo.lastError,
  }));

  /* ---------------------- التنقل عبر المتصفح ---------------------- */
  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* ---------------------- حالة الاتصال (تشخيص واضح) ---------------------- */
  useEffect(() => {
    const onConnect = () =>
      setConn({ connected: true, everConnected: true, attempts: 0, error: null });

    const onDisconnect = () =>
      setConn((current) => ({ ...current, connected: false }));

    const onConnectError = (error) =>
      setConn((current) => ({
        ...current,
        connected: false,
        attempts: current.attempts + 1,
        error: error?.message || 'تعذّر الاتصال بالسيرفر',
      }));

    const onReconnectAttempt = (attempt) =>
      setConn((current) => ({ ...current, connected: false, attempts: attempt }));

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  /* ---------------------- إبقاء الاتصال حيّاً ---------------------- */
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
    };
    const onOnline = () => {
      if (!socket.connected) socket.connect();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  /* ---------------------- لو فُتح /play بدون هوية → البداية ---------------------- */
  useEffect(() => {
    if (path === '/play' && !playerId) {
      window.history.replaceState({}, '', '/');
      setPath('/');
    }
  }, [path, playerId]);

  const go = (to) => {
    if (window.location.pathname !== to) window.history.pushState({}, '', to);
    setPath(normalizePath(to));
  };

  const choosePlayer = (id) => {
    setPlayerId(id);
    try {
      localStorage.setItem(PLAYER_KEY, id);
    } catch (_) {
      /* لا شيء */
    }
    go('/play');
  };

  const exitPlayer = () => {
    setPlayerId(null);
    try {
      localStorage.removeItem(PLAYER_KEY);
    } catch (_) {
      /* لا شيء */
    }
    go('/');
  };

  /* ---------------------- شاشة الاتصال ---------------------- */
  const connState = conn.connected
    ? 'connected'
    : conn.attempts >= 3
      ? 'failed'
      : conn.everConnected
        ? 'reconnecting'
        : 'connecting';

  const connectionBanner =
    connState === 'connected' ? null : (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-soft-lg">
          <span
            className={
              connState === 'failed'
                ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-coral-400'
                : 'h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-honey-400'
            }
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-stone-700">
              {connState === 'connecting' && 'جارٍ الاتصال بالسيرفر…'}
              {connState === 'reconnecting' && `يُعيد الاتصال… (محاولة ${conn.attempts})`}
              {connState === 'failed' && 'تعذّر الوصول إلى السيرفر'}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-stone-400" dir="ltr">
              {SERVER_URL}
            </p>
          </div>
          {connState !== 'connecting' && (
            <button
              type="button"
              onClick={retryConnection}
              className="shrink-0 rounded-xl bg-honey-300 px-3.5 py-2 text-xs font-black text-honey-800 transition-colors hover:bg-honey-400"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    );

  /* ---------------------- الصفحات ---------------------- */
  if (path === '/host') {
    return (
      <>
        <HostView onExit={() => go('/')} />
        {connectionBanner}
      </>
    );
  }

  if (path === '/play' && playerId) {
    return (
      <>
        <PlayerView playerId={playerId} onExit={exitPlayer} />
        {connectionBanner}
      </>
    );
  }

  return (
    <>
      <Landing
        onChoose={choosePlayer}
        onHost={() => go('/host')}
        currentPlayerId={playerId}
        connected={connState === 'connected'}
      />
      {connectionBanner}
    </>
  );
}
