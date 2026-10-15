import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

import { socket, SERVER_URL } from '../socket.js';
import sound from '../lib/sound.js';
import {
  Avatar,
  Card,
  ConnectionDot,
  Pill,
  ProgressBar,
  SectionLabel,
  SoftButton,
  cx,
} from './ui.jsx';
import { playerById, toneOf } from '../data/players.js';
import TimerRing from './TimerRing.jsx';
import Leaderboard from './Leaderboard.jsx';
import VictoryScreen from './VictoryScreen.jsx';
import WarningModal from './WarningModal.jsx';
import AnswerTimeoutModal from './AnswerTimeoutModal.jsx';
import { TIMER_DURATION, TOTAL_QUESTIONS } from '../data/gameData.js';

/**
 * لوحة المضيف (محمد) — السؤال، المؤقت، من ضغط أولاً، والتحكم الكامل.
 */
export default function HostView({ onExit }) {
  const [state, setState] = useState(null);
  const [remaining, setRemaining] = useState(TIMER_DURATION);
  const [connected, setConnected] = useState(socket.connected);
  const [adminOpen, setAdminOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [joinBase, setJoinBase] = useState('');
  // قائمة المتصلين الحيّة — تصل فوراً عبر حدث `update_players`
  const [livePlayers, setLivePlayers] = useState([]);
  // إخفاء شاشة الفوز يدوياً (لعرض النتائج والتحكم مرة أخرى)
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  // مهلة الإجابة (٣ ثوانٍ)
  const [answerRemaining, setAnswerRemaining] = useState(0);
  // تحدي التيربو — نقاط مباشرة لكل لاعب
  const [liveTurboScores, setLiveTurboScores] = useState({});
  // وضع الاستراحة
  const [breakState, setBreakState] = useState({ active: false, reason: '' });
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [breakReasonInput, setBreakReasonInput] = useState('');
  // فك التشفير — أول من يحل
  const [scrambleWinner, setScrambleWinner] = useState(null);
  // الحسبة الخاطفة — الأسرع
  const [mathWinner, setMathWinner] = useState(null);
  // صيد الهدف — نتائج مباشرة
  const [liveAimScores, setLiveAimScores] = useState({});
  // أسرع رد فعل — الفائز الفوري
  const [reactionWinnerName, setReactionWinnerName] = useState(null);
  // نظام الإنذارات
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnTarget, setWarnTarget] = useState(null);
  const [warnReason, setWarnReason] = useState('');
  const [warnSending, setWarnSending] = useState(false);

  const shake = useAnimation();
  const lastSecond = useRef(-1);

  /* ---------------------- إشعارات ---------------------- */
  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current.slice(-2), { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  /* ---------------------- دخول المضيف ---------------------- */
  useEffect(() => {
    const join = () => {
      socket.emit('host:join', {}, (response) => {
        if (response?.ok) setState(response.state);
      });
    };

    join();
    socket.on('connect', join);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', join);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.emit('host:leave');
    };
  }, []);

  /* ---------------------- رابط الانضمام للجوالات ---------------------- */
  useEffect(() => {
    let alive = true;
    const fallback = () => {
      if (typeof window === 'undefined') return '';
      const { protocol, hostname, port } = window.location;
      return `${protocol}//${hostname}${port ? `:${port}` : ''}/`;
    };
    setJoinBase(fallback());

    fetch(`${SERVER_URL}/api/network`)
      .then((response) => response.json())
      .then((data) => {
        if (!alive || !data?.host) return;
        const { protocol, port } = window.location;
        setJoinBase(`${protocol}//${data.host}:${port || '5173'}/`);
      })
      .catch(() => {
        /* نبقي العنوان المحلي */
      });

    return () => {
      alive = false;
    };
  }, []);

  /* ---------------------- أحداث اللعبة ---------------------- */
  useEffect(() => {
    const onState = (next) => {
      setState(next);
      if (!next.timerRunning) setRemaining(next.remaining);
      if (!next.answerWindowActive) setAnswerRemaining(0);
      if (typeof next.breakActive === 'boolean') {
        setBreakState({ active: next.breakActive, reason: next.breakReason || '' });
      }
    };

    const onAnswerTick = (payload) => setAnswerRemaining(payload.remaining);
    const onAnswerStarted = (payload) => setAnswerRemaining(payload.duration);
    const onAnswerExpired = (payload) => {
      sound.timeup();
      pushToast({
        tone: 'coral',
        title: '⏰ انتهت مهلة الإجابة',
        body: payload.playerName || 'لاعب',
      });
    };

    const onTick = (payload) => {
      setRemaining(payload.remaining);
      const second = Math.ceil(payload.remaining);
      if (second <= 3 && second >= 1 && second !== lastSecond.current) {
        lastSecond.current = second;
        sound.tick();
      }
      if (second > 3) lastSecond.current = -1;
    };

    const onStarted = (payload) => {
      lastSecond.current = -1;
      setRemaining(payload.remaining);
    };

    const onReset = (payload) => setRemaining(payload.remaining);

    const onBuzzed = (payload) => {
      sound.buzz();
      setRemaining(payload.remaining);
      pushToast({ tone: 'honey', title: '🔔 أول ضغطة!', body: payload.playerName });
    };

    const onCorrect = (payload) => {
      sound.correct();
      pushToast({ tone: 'sage', title: '✔ إجابة صحيحة', body: `${payload.playerName} — +${payload.points}` });
    };

    const onWrong = (payload) => {
      sound.wrong();
      pushToast({ tone: 'coral', title: '✖ إجابة خاطئة', body: payload.playerName });
    };

    const onTimeUp = () => {
      sound.timeup();
      shake.start({
        x: [0, -14, 14, -10, 10, -5, 5, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      });
    };

    const onScoreUpdated = (payload) => {
      const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
      pushToast({ tone: 'sky', title: 'تعديل يدوي', body: `${payload.playerName} — ${sign}` });
    };

    const onBuzzersReset = () => pushToast({ tone: 'sky', title: '↺ إعادة الجولة', body: 'تم فتح الأزرار' });

    const onGameStarted = () => {
      sound.start();
      pushToast({ tone: 'honey', title: '🚀 بدأت المسابقة', body: `${TOTAL_QUESTIONS} سؤالاً` });
    };

    // قائمة المتصلين الحيّة (تصل لحظياً عند الانضمام/الخروج)
    const onUpdatePlayers = (list) => setLivePlayers(Array.isArray(list) ? list : []);

    const onQuestionRevealed = () =>
      pushToast({ tone: 'honey', title: '👀 تم عرض السؤال', body: 'المؤقت جاهز الآن' });

    const onHardReset = () => {
      setRemaining(TIMER_DURATION);
      pushToast({ tone: 'coral', title: '⚠️ تم تصفير اللعبة بالكامل', body: 'كل النقاط = 0' });
    };

    // إنهاء المسابقة فوراً — تنظيف الحالة المحلية وعرض النتائج
    const onForcedEnd = () => {
      setScrambleWinner(null);
      setMathWinner(null);
      setLiveAimScores({});
      setReactionWinnerName(null);
      setVictoryDismissed(false);
      pushToast({ tone: 'coral', title: '🛑 تم إنهاء المسابقة فوراً', body: 'عرض النتائج النهائية' });
    };

    // وضع الاستراحة
    const onBreakState = (payload) => {
      const active = Boolean(payload?.active);
      setBreakState({ active, reason: payload?.reason || '' });
      pushToast({
        tone: active ? 'honey' : 'sage',
        title: active ? '☕ وضع الاستراحة' : '▶️ عادت اللعبة',
        body: active ? payload?.reason || '' : 'استئنف اللعب',
      });
    };

    // تحدي التيربو — نقاط مباشرة لكل لاعب
    const onTurboScore = (payload) => {
      if (!payload?.playerId) return;
      setLiveTurboScores((current) => ({ ...current, [payload.playerId]: payload.points }));
    };

    // فك التشفير — أول من يحل
    const onScrambleWin = (payload) => {
      if (!payload?.playerId) return;
      setScrambleWinner((prev) => prev || payload.playerId);
    };

    // الحسبة الخاطفة — الأسرع
    const onMathWin = (payload) => {
      if (!payload?.playerId) return;
      setMathWinner((prev) => prev || payload);
    };

    // صيد الهدف — نتائج مباشرة
    const onAimScore = (payload) => {
      if (!payload?.playerId) return;
      setLiveAimScores((current) => ({ ...current, [payload.playerId]: payload.score }));
    };

    // أسرع رد فعل — اسم الفائز الفوري
    const onReactionWinner = (name) => {
      if (!name) return;
      setReactionWinnerName(name);
    };

    socket.on('game:state', onState);
    socket.on('update_players', onUpdatePlayers);
    socket.on('timer:tick', onTick);
    socket.on('timer:started', onStarted);
    socket.on('timer:reset', onReset);
    socket.on('buzzed', onBuzzed);
    socket.on('correct', onCorrect);
    socket.on('wrong', onWrong);
    socket.on('timer:timeup', onTimeUp);
    socket.on('score:updated', onScoreUpdated);
    socket.on('buzzers:reset', onBuzzersReset);
    socket.on('game:started', onGameStarted);
    socket.on('question:revealed', onQuestionRevealed);
    socket.on('game:hard_reset', onHardReset);
    socket.on('game:forced-end', onForcedEnd);
    socket.on('game:break-state', onBreakState);
    socket.on('answer:tick', onAnswerTick);
    socket.on('answer:started', onAnswerStarted);
    socket.on('answer:expired', onAnswerExpired);
    socket.on('turbo-score-broadcast', onTurboScore);
    socket.on('scramble-win-broadcast', onScrambleWin);
    socket.on('math-win-broadcast', onMathWin);
    socket.on('aim-score-broadcast', onAimScore);
    socket.on('reaction-winner', onReactionWinner);

    return () => {
      socket.off('game:state', onState);
      socket.off('turbo-score-broadcast', onTurboScore);
      socket.off('scramble-win-broadcast', onScrambleWin);
      socket.off('math-win-broadcast', onMathWin);
      socket.off('aim-score-broadcast', onAimScore);
      socket.off('reaction-winner', onReactionWinner);
      socket.off('update_players', onUpdatePlayers);
      socket.off('timer:tick', onTick);
      socket.off('timer:started', onStarted);
      socket.off('timer:reset', onReset);
      socket.off('buzzed', onBuzzed);
      socket.off('correct', onCorrect);
      socket.off('wrong', onWrong);
      socket.off('timer:timeup', onTimeUp);
      socket.off('score:updated', onScoreUpdated);
      socket.off('buzzers:reset', onBuzzersReset);
      socket.off('game:started', onGameStarted);
      socket.off('question:revealed', onQuestionRevealed);
      socket.off('game:hard_reset', onHardReset);
      socket.off('game:forced-end', onForcedEnd);
      socket.off('game:break-state', onBreakState);
      socket.off('answer:tick', onAnswerTick);
      socket.off('answer:started', onAnswerStarted);
      socket.off('answer:expired', onAnswerExpired);
    };
  }, [pushToast, shake]);

  /* ---------------------- أوامر ---------------------- */
  const send = useCallback((event, payload) => socket.emit(event, payload), []);

  const startTimer = useCallback(() => {
    socket.emit('host:startTimer');
    sound.unlock();
  }, []);

  /* ---------- معالجات أزرار اللاعبين ----------
     دوال مرفوعة (hoisted function declarations) بدل const arrow functions
     حتى لا يمكن الرجوع إليها قبل تهيئتها (Temporal Dead Zone) بأي حال. */
  function revealQuestion() {
    socket.emit('reveal_question');
    sound.unlock();
  }

  function hardReset() {
    if (window.confirm('هل أنت متأكد من تصفير اللعبة ومسح جميع النقاط؟')) {
      socket.emit('hard_reset');
    }
  }

  function adjustScore(playerId, delta) {
    socket.emit('manual_score_update', { playerId, delta });
  }

  function startBreak() {
    const reason = breakReasonInput.trim();
    if (!reason) return;
    socket.emit('host:toggle-break', { active: true, reason });
    setBreakModalOpen(false);
    setBreakReasonInput('');
  }

  function openWarnings() {
    setWarnTarget(null);
    setWarnReason('');
    setWarnOpen(true);
  }

  function sendWarning() {
    const reason = warnReason.trim();
    if (!warnTarget || !reason) return;
    setWarnSending(true);
    socket.emit('host:sendWarning', { playerId: warnTarget, reason }, (response) => {
      setWarnSending(false);
      if (response?.ok) {
        pushToast({
          tone: 'coral',
          title: '🔔 تم إرسال الإنذار',
          body: `${playerById(warnTarget)?.name} — إنذار #${response.count}`,
        });
        setWarnOpen(false);
        setWarnTarget(null);
        setWarnReason('');
      } else {
        pushToast({ tone: 'coral', title: 'تعذّر إرسال الإنذار', body: response?.error || '' });
      }
    });
  }

  /* ---------------------- اختصارات الكيبورد ---------------------- */
  useEffect(() => {
    const onKey = (event) => {
      const tag = (event.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (!state) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (state.phase === 'lobby') send('host:startGame');
          else if (!state.isQuestionRevealed) send('reveal_question');
          else if (state.phase === 'question') startTimer();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (state.buzzedPlayerId) send('host:correct');
          break;
        case 'Digit2':
        case 'Numpad2':
          if (state.buzzedPlayerId) send('host:wrong');
          break;
        case 'KeyR':
          send('host:revealAnswer');
          break;
        case 'KeyN':
        case 'ArrowLeft':
          send('host:nextQuestion');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, send, startTimer]);

  /* ---------------------- قيم مشتقة ---------------------- */
  const players = state?.players || [];
  const phase = state?.phase || 'lobby';
  const question = state?.question || null;
  const revealed = Boolean(state?.isQuestionRevealed);
  const isIntro = question?.type === 'intro';
  const isReactionQuestion = question?.type === 'reaction';

  // القائمة الحيّة القادمة من السيرفر (مصدر فوري لحالة الاتصال)
  const liveIds = useMemo(
    () => new Set((livePlayers || []).map((player) => player.id)),
    [livePlayers]
  );

  // الدمج: نعرض اللاعبين الأربعة دائماً، والحالة «متصل» تُقرأ من القائمة الحيّة فوراً
  const roster = useMemo(() => {
    return players.map((player) => ({
      ...player,
      connected: liveIds.has(player.id) || Boolean(player.connected),
    }));
  }, [players, liveIds]);

  const buzzedPlayer = useMemo(
    () => roster.find((player) => player.id === state?.buzzedPlayerId) || null,
    [roster, state]
  );
  const questionNumber = (state?.questionIndex ?? -1) + 1;
  const progress = TOTAL_QUESTIONS > 0 ? (questionNumber / TOTAL_QUESTIONS) * 100 : 0;
  const joinLink = joinBase || '';
  const liveCount = livePlayers.length;

  const canStartTimer =
    !isIntro &&
    revealed &&
    (phase === 'question' && !state?.timerRunning && !state?.buzzedPlayerId);
  const canJudge = Boolean(state?.buzzedPlayerId);
  const canReveal = !isIntro && Boolean(question) && phase !== 'lobby';

  const phaseLabel = isIntro
    ? 'فقرة تمهيدية'
    : phase !== 'lobby' && phase !== 'finished' && !revealed
      ? 'السؤال مخفي — بانتظار العرض'
      : {
          lobby: 'بانتظار البدء',
          question: state?.timerRunning ? 'المؤقت يعمل' : 'بانتظار بدء المؤقت',
          buzzed: 'أحدهم ضغط!',
          reveal: 'تم البت في الإجابة',
          timeup: 'انتهى الوقت',
          finished: 'انتهت المسابقة',
        }[phase];

  /* ---------------------- شاشة الفوز ---------------------- */
  const topPlayer = useMemo(() => {
    if (!players.length) return null;
    return [...players].sort((a, b) => b.score - a.score)[0];
  }, [players]);

  const victoryWinner = state?.winner || (phase === 'finished' ? topPlayer : null);

  // اللاعبون المتصلون — لقائمة الإنذارات
  const warnCandidates = useMemo(() => roster.filter((player) => player.connected), [roster]);

  useEffect(() => {
    if (phase !== 'finished') setVictoryDismissed(false);
  }, [phase]);

  // تصفير فائزي الألعاب المصغّرة عند تغيّر السؤال
  useEffect(() => {
    setScrambleWinner(null);
    setMathWinner(null);
    setLiveAimScores({});
    setReactionWinnerName(null);
  }, [state?.questionIndex]);

  /* ================================================================ */
  return (
    <motion.div
      animate={shake}
      className="relative min-h-[100dvh] overflow-x-hidden bg-cream bg-glow"
    >
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />

      {/* ============ الشريط العلوي ============ */}
      <header className="relative z-20 px-4 pt-4">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-soft backdrop-blur">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-honey-200 text-2xl">
            🎯
          </span>

          <div className="leading-tight">
            <p className="font-display text-lg font-black text-stone-800">مُسَابَقَة</p>
            <p className="text-[11px] font-bold text-stone-400">لوحة المضيف — محمد</p>
          </div>

          <div className="mx-2 hidden h-8 w-px bg-stone-100 sm:block" />

          <div className="hidden items-center gap-2 sm:flex">
            {(question?.category || state?.hiddenQuestionRound) && (
              <Pill tone="honey">{question?.category || state?.hiddenQuestionRound || 'مسابقة'}</Pill>
            )}
            <Pill tone="white">
              السؤال {Math.max(0, questionNumber)} / {TOTAL_QUESTIONS}
            </Pill>
          </div>

          <div className="mr-auto flex items-center gap-3">
            {!revealed && phase !== 'lobby' && <Pill tone="honey">👀 السؤال مخفي</Pill>}
            <Pill tone="sage">متصل: {liveCount}</Pill>
            <Pill tone={phase === 'buzzed' ? 'coral' : phase === 'timeup' ? 'neutral' : 'white'}>
              {phaseLabel}
            </Pill>
            <span className="hidden sm:block">
              <ConnectionDot connected={connected} />
            </span>

            {/* وضع الاستراحة */}
            <button
              type="button"
              onClick={() =>
                breakState.active
                  ? send('host:toggle-break', { active: false, reason: '' })
                  : setBreakModalOpen(true)
              }
              className={
                breakState.active
                  ? 'rounded-xl bg-coral-500 px-4 py-2 text-sm font-black text-white shadow-soft transition-colors hover:bg-coral-600'
                  : 'rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 transition-colors hover:bg-amber-100'
              }
            >
              {breakState.active ? 'إنهاء الاستراحة' : 'وضع الاستراحة ☕'}
            </button>

            <button
              type="button"
              onClick={onExit}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm text-stone-500 transition-colors hover:bg-stone-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mx-auto mt-3 w-full max-w-6xl">
          <ProgressBar value={progress} />
        </div>
      </header>

      {/* ============ المحتوى ============ */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* ---------- السؤال والمؤقت ---------- */}
          <section className="flex flex-col gap-4">
            {/* لافتة من ضغط أولاً */}
            <AnimatePresence>
              {buzzedPlayer && (
                <motion.div
                  key={buzzedPlayer.id}
                  initial={{ opacity: 0, y: -14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-honey-200 bg-honey-50 px-5 py-4 shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <Avatar player={buzzedPlayer} size="lg" />
                    <div>
                      <p className="text-[11px] font-bold text-honey-700">🔔 أول من ضغط</p>
                      <p className="font-display text-2xl font-black text-stone-800">{buzzedPlayer.name}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-stone-400">
                      {state?.answerWindowActive ? 'مهلة الإجابة (٣ ث)' : 'الوقت المجمّد'}
                    </p>
                    <p
                      className={cx(
                        'font-display text-3xl font-black tabular-nums',
                        state?.answerWindowActive && answerRemaining <= 1.5 ? 'text-coral-500' : 'text-stone-800'
                      )}
                      dir="ltr"
                    >
                      {(state?.answerWindowActive ? answerRemaining : remaining).toFixed(1)}
                      <span className="text-sm font-bold text-stone-400"> ث</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* بطاقة السؤال */}
            <Card lg className="relative flex flex-col p-6 sm:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Pill tone="honey">
                  {question?.category || state?.hiddenQuestionRound || 'مسابقة'}
                </Pill>
                {!revealed && phase !== 'lobby' && <Pill tone="coral">👀 السؤال مخفي عن الجميع</Pill>}
                <span className="sm:hidden">
                  <Pill tone="white">
                    {Math.max(0, questionNumber)} / {TOTAL_QUESTIONS}
                  </Pill>
                </span>
              </div>

              <div className="flex min-h-[190px] items-center justify-center py-2">
                {isIntro ? (
                  <motion.div
                    key={`intro-${state?.questionIndex}`}
                    initial={{ opacity: 0, scale: 0.94, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    className="flex w-full flex-col items-center gap-4 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.1 }}
                      className="text-6xl"
                    >
                      🎬
                    </motion.span>

                    <motion.h2
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-4xl text-amber-600 font-bold mb-6"
                    >
                      {question.title}
                    </motion.h2>

                    <p className="max-w-2xl text-2xl text-gray-700 leading-relaxed text-center">
                      {question.description}
                    </p>

                    <p className="text-sm font-bold text-stone-400">
                      اضغط «السؤال التالي» لبدء الفقرة
                    </p>
                  </motion.div>
                ) : !revealed && phase !== 'lobby' ? (
                  <motion.div
                    key={`hidden-${state?.questionIndex}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center"
                  >
                    <span className="mb-3 inline-block text-6xl animate-bob">⏳</span>
                    <p className="font-display text-3xl font-black text-stone-700">
                      استعد للسؤال القادم…
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      السؤال مخفي حالياً. اضغط «عرض السؤال للجميع» عندما يكون الجميع جاهزاً.
                    </p>
                  </motion.div>
                ) : question ? (
                  <motion.div
                    key={state?.questionIndex}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="flex w-full flex-col items-center gap-3"
                  >
                    {question.category && (
                      <div className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full w-max mx-auto mb-4">
                        {question.category}
                      </div>
                    )}

                    {question.type === 'emoji' ? (
                      <div className="text-[5rem] leading-tight md:text-8xl text-center tracking-widest">
                        {question.question}
                      </div>
                    ) : (
                      <p className="text-center font-display text-2xl font-black leading-relaxed text-stone-800 sm:text-4xl">
                        {question.question}
                      </p>
                    )}

                    {(question.type === 'image' || question.type === 'memory') && (
                      <img
                        src={question.mediaUrl}
                        className="w-full max-h-[50vh] md:max-h-96 object-contain rounded-xl mb-4 shadow-sm"
                        alt="Puzzle"
                      />
                    )}

                    {question.type === 'memory' && (
                      <p className="text-sm font-bold text-coral-500">
                        👁️ الصورة تظهر للاعبين ٥ ثوانٍ ثم يظهر السؤال — انتظرها قبل بدء المؤقت
                      </p>
                    )}

                    {/* تحدي التيربو — النقاط المباشرة لكل لاعب */}
                    {question.type === 'turbo' && (
                      <div className="w-full max-w-2xl rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
                        <p className="mb-3 text-sm font-black text-orange-700">⚡ نقاط التيربو المباشرة</p>

                        {Object.keys(liveTurboScores).length === 0 ? (
                          <p className="py-3 text-xs font-bold text-stone-400">بانتظار ضغطات اللاعبين…</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {Object.entries(liveTurboScores).map(([playerId, score]) => (
                              <div
                                key={playerId}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2"
                              >
                                <span className="truncate text-sm font-bold text-stone-800">
                                  {playerById(playerId)?.name || 'لاعب'}
                                </span>
                                <span className="font-display text-lg font-black text-orange-600">{score}</span>
                                <button
                                  onClick={() => adjustScore(playerId, score)}
                                  className="bg-orange-500 text-white font-bold py-1 px-3 rounded-lg ml-4"
                                >
                                  إعطاء {Number(score).toFixed(2)} نقطة ⚡
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* فك التشفير — زر منح النقاط لأول من حل */}
                    {question.type === 'scramble' && scrambleWinner && (
                      <button
                        onClick={() => adjustScore(scrambleWinner, 2)}
                        className="bg-green-600 text-white font-bold py-4 px-6 rounded-xl w-full"
                      >
                        إعطاء 2 نقاط لأول من فك التشفير 🏆
                      </button>
                    )}

                    {/* الحسبة الخاطفة — زر منح النقاط للأسرع */}
                    {question.type === 'math' && mathWinner && (
                      <button
                        onClick={() => adjustScore(mathWinner.playerId, mathWinner.points)}
                        className="bg-purple-600 text-white font-bold py-4 px-6 rounded-xl w-full"
                      >
                        إعطاء {mathWinner.points} نقاط للأسرع 🏆
                      </button>
                    )}

                    {/* صيد الهدف — نتائج مباشرة + منح النقاط */}
                    {question.type === 'aim' && (
                      <div className="w-full max-w-2xl rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
                        <p className="mb-3 text-sm font-black text-green-700">🎯 صيد الأهداف — النتائج المباشرة</p>

                        {Object.keys(liveAimScores).length === 0 ? (
                          <p className="py-3 text-xs font-bold text-stone-400">بانتظار صيد اللاعبين…</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {Object.entries(liveAimScores).map(([playerId, score]) => (
                              <div
                                key={playerId}
                                className="flex items-center gap-3 rounded-xl bg-white px-4 py-2"
                              >
                                <span className="truncate text-sm font-bold text-stone-800">
                                  {playerById(playerId)?.name || 'لاعب'}
                                </span>
                                <span className="font-display text-lg font-black text-green-600">{score}</span>
                                <button
                                  onClick={() => adjustScore(playerId, score)}
                                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl font-bold mr-auto"
                                >
                                  إعطاء {Number(score).toFixed(2)} نقطة 🎯
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* أسرع رد فعل — تأكيد الفوز الفوري (النقاط تُحتسب تلقائياً) */}
                    {question.type === 'reaction' && reactionWinnerName && (
                      <div className="bg-green-100 border-4 border-green-500 rounded-2xl p-8 text-center">
                        <h2 className="text-3xl font-black text-green-700">
                          تمت إضافة 3 نقاط دايركت للاعب: {reactionWinnerName} 🏆
                        </h2>
                      </div>
                    )}

                    {/* الإجابة — تظهر للمضيف دائماً قبل أي ضغطة جرس (لا توجد إجابة في التيربو) */}
                    {question.type !== 'turbo' && (
                      <p className="rounded-xl bg-emerald-50 px-4 py-1.5 text-center font-bold text-emerald-600">
                        الإجابة: <span className="font-black">{question.answer}</span>
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center"
                  >
                    <span className="mb-3 inline-block text-5xl animate-bob">🎯</span>
                    <p className="font-display text-2xl font-black text-stone-700">
                      كل اللاعبين جاهزون
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      اضغط «ابدأ الجولة» لعرض أول سؤال.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* المؤقت + الإجابة */}
              <div className="mt-6 flex flex-col items-center gap-6 border-t border-stone-100 pt-6 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-5">
                  <TimerRing
                    remaining={phase === 'lobby' ? state?.timerDuration || TIMER_DURATION : remaining}
                    duration={state?.timerDuration || TIMER_DURATION}
                    size={158}
                    stroke={11}
                  />
                  <div className="hidden text-right sm:block">
                    <SectionLabel>حالة الجولة</SectionLabel>
                    <p className="mt-1 font-display text-lg font-black text-stone-800">{phaseLabel}</p>
                    <p className="mt-1 max-w-[190px] text-xs leading-relaxed text-stone-400">
                      {phase === 'buzzed'
                        ? 'قيّم الإجابة شفهياً ثم اختر صحيح أو خطأ.'
                        : phase === 'timeup'
                          ? 'اضغط «السؤال التالي» للمتابعة.'
                          : 'أول من يضغط يقفل الباقين ويأخذ نقاط الثواني المتبقية.'}
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {state?.answerRevealed && question && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                      className="w-full rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 sm:w-auto sm:min-w-[280px]"
                    >
                      <p className="text-[11px] font-bold text-sage-600">الإجابة الصحيحة</p>
                      <p className="mt-1 font-display text-xl font-black text-stone-800">{question.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </section>

          {/* ---------- المتصدرون ---------- */}
          <aside className="flex flex-col gap-4">
            <Card lg className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-black text-stone-800">المتصدرون</h2>
                <Pill tone={liveCount > 0 ? 'sage' : 'neutral'}>متصل الآن: {liveCount}</Pill>
              </div>
              <Leaderboard players={roster} highlightId={state?.buzzedPlayerId} />
            </Card>

            {state?.lastAward && (
              <Card className="p-4">
                <SectionLabel>آخر احتساب</SectionLabel>
                <p className="mt-1 text-sm font-bold text-stone-700">
                  <span className="text-sage-600">+{state.lastAward.points}</span> — {state.lastAward.playerName}
                </p>
              </Card>
            )}

            {/* رابط الانضمام */}
            <Card className="p-4">
              <SectionLabel>انضمام اللاعبين</SectionLabel>
              <p className="mt-1.5 break-all font-mono text-xs text-stone-500" dir="ltr">
                {joinLink}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
                افتح هذا الرابط على جوالات اللاعبين (نفس شبكة الواي فاي) ثم اختاروا أسماءكم.
              </p>
            </Card>
          </aside>
        </div>

        {/* ============ لوحة الإدارة ============ */}
        <Card lg className="mt-5 overflow-hidden">
          <button
            type="button"
            onClick={() => setAdminOpen((open) => !open)}
            className="flex w-full items-center justify-between px-5 py-4 text-right transition-colors hover:bg-stone-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-lg">⚙️</span>
              <span>
                <span className="block font-display text-base font-black text-stone-800">لوحة الإدارة</span>
                <span className="block text-[11px] font-bold text-stone-400">
                  تعديل النقاط يدوياً • إعادة ضبط المؤقت • إعادة الجولة • تصفير كامل
                </span>
              </span>
            </span>
            <span
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform',
                adminOpen && 'rotate-180'
              )}
            >
              ⌄
            </span>
          </button>

          <AnimatePresence initial={false}>
            {adminOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-stone-100 p-5">
                  {/* تعديل النقاط */}
                  <SectionLabel className="mb-3">تعديل النقاط (لكل لاعب)</SectionLabel>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {players.map((player) => {
                      const tone = toneOf(player.tone);
                      return (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50/60 px-3 py-2.5"
                        >
                          <Avatar player={player} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-stone-800">{player.name}</p>
                            <p className="text-[11px] font-bold text-stone-400">
                              النقاط: <span className={cx('font-display text-sm', tone.text)}>{player.score}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustScore(player.id, -1)}
                              disabled={player.score <= 0}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-100 text-lg font-black text-coral-700 transition-colors hover:bg-coral-200 disabled:opacity-30"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustScore(player.id, 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-100 text-lg font-black text-sage-700 transition-colors hover:bg-sage-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* أدوات الجولة */}
                  <div className="mt-5 border-t border-stone-100 pt-4">
                    <SectionLabel className="mb-3">أدوات الجولة</SectionLabel>
                    <div className="flex flex-wrap gap-2.5">
                      <SoftButton variant="danger" size="md" onClick={openWarnings}>
                        🔔 الإنذارات
                      </SoftButton>
                      <SoftButton
                        variant="primary"
                        size="md"
                        onClick={() =>
                          socket.emit('host:skipRound', {}, (response) => {
                            if (response?.ok) {
                              pushToast({
                                tone: 'honey',
                                title: '⏭️ تخطي الفقرة',
                                body: 'تم الانتقال إلى أول سؤال في الفقرة التالية',
                              });
                            } else {
                              pushToast({
                                tone: 'neutral',
                                title: 'لا توجد فقرة تالية',
                                body: 'هذا آخر نوع في المسابقة',
                              });
                            }
                          })
                        }
                      >
                        ⏭️ تخطي للفقرة التالية
                      </SoftButton>
                      <SoftButton variant="sky" size="md" onClick={() => send('reset_timer')}>
                        ⟲ إعادة ضبط المؤقت (٧ث)
                      </SoftButton>
                      <SoftButton variant="sky" size="md" onClick={() => send('reset_buzzers')}>
                        🔓 إعادة الجولة (فتح الأزرار)
                      </SoftButton>
                      <SoftButton
                        variant="ghost"
                        size="md"
                        onClick={() => {
                          if (window.confirm('تصفير جميع النقاط والبدء من جديد؟')) send('host:resetGame');
                        }}
                      >
                        ⟳ بدء مسابقة جديدة
                      </SoftButton>
                    </div>
                  </div>

                  {/* المنطقة الخطرة */}
                  <div className="mt-5 border-t border-coral-100 pt-4">
                    <SectionLabel className="mb-3 text-coral-500">منطقة الخطر</SectionLabel>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-relaxed text-stone-400">
                        يمسح جميع النقاط، يعيد للسباق من السؤال الأول، ويفتح الأزرار من جديد.
                      </p>
                      <button
                        type="button"
                        onClick={hardReset}
                        className="shrink-0 rounded-xl bg-coral-500 px-5 py-3 text-sm font-black text-white shadow-soft transition-colors hover:bg-coral-600 active:bg-coral-700"
                      >
                        ⚠️ تصفير اللعبة بالكامل
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </main>

      {/* ============ التحكم الأساسي ============ */}
      <footer className="sticky bottom-0 z-20 mt-2 px-4 pb-4 safe-bottom">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2.5 rounded-2xl bg-white/90 px-4 py-3 shadow-soft-lg backdrop-blur">
          {/* زر العرض الضخم — يظهر عندما يكون السؤال مخفياً */}
          {!revealed && phase !== 'lobby' && (
            <SoftButton
              variant="primary"
              size="xl"
              className="w-full animate-soft-pulse justify-center py-5 text-xl shadow-soft-lg sm:w-auto"
              onClick={revealQuestion}
            >
              👀 عرض السؤال للجميع
            </SoftButton>
          )}

          {phase === 'lobby' ? (
            <SoftButton
              variant="primary"
              size="lg"
              className="grow sm:grow-0"
              onClick={() => send('host:startGame')}
            >
              ▶ ابدأ الجولة الأولى
            </SoftButton>
          ) : (
            <SoftButton
              variant={revealed ? 'primary' : 'neutral'}
              size="lg"
              disabled={!canStartTimer}
              onClick={startTimer}
              className="grow sm:grow-0"
            >
              ▶ بدء المؤقت (٧ث)
            </SoftButton>
          )}

          <SoftButton
            variant="success"
            size="lg"
            disabled={!canJudge || isReactionQuestion}
            onClick={() => send('host:correct')}
          >
            ✔ إجابة صحيحة
            <span className="text-xs opacity-70">(+{Math.max(1, Math.round(remaining))})</span>
          </SoftButton>

          <SoftButton
            variant="danger"
            size="lg"
            disabled={!canJudge || isReactionQuestion}
            onClick={() => send('host:wrong')}
          >
            ✖ إجابة خاطئة
          </SoftButton>

          <div className="mx-1 hidden h-8 w-px bg-stone-100 sm:block" />

          <SoftButton
            variant="ghost"
            size="md"
            disabled={!canReveal || Boolean(state?.answerRevealedToAll)}
            onClick={() => send('reveal_answer_to_all')}
          >
            {state?.answerRevealedToAll ? 'الإجابة ظاهرة للجميع ✓' : '👀 إظهار الإجابة للجميع'}
          </SoftButton>

          <div className="mr-auto flex items-center gap-2">
            <SoftButton
              variant="neutral"
              size="md"
              disabled={state?.questionIndex <= 0}
              onClick={() => send('host:prevQuestion')}
            >
              ⏮ السابق
            </SoftButton>
            <SoftButton variant="ghost" size="md" onClick={() => send('host:nextQuestion')}>
              {state?.questionIndex >= TOTAL_QUESTIONS - 1 ? 'إنهاء المسابقة' : 'السؤال التالي ⏭'}
            </SoftButton>

            {/* إنهاء المسابقة فوراً — للاختبار السريع للنتائج والشهادة */}
            <button
              type="button"
              onClick={() => send('force-end-game')}
              disabled={phase === 'finished'}
              className="rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-black text-white shadow-soft transition-colors hover:bg-coral-600 active:bg-coral-700 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
            >
              إنهاء المسابقة فوراً 🛑
            </button>
          </div>
        </div>
      </footer>

      {/* ============ شاشة النهاية ============ */}
      <AnimatePresence>
        {phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-cream/92 px-4 backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-lg"
            >
              <Card lg className="p-7 text-center">
                <span className="mb-2 inline-block text-5xl">🏁</span>
                <h2 className="font-display text-3xl font-black text-stone-800">النتائج النهائية</h2>
                <div className="mt-6 text-right">
                  <Leaderboard players={roster} highlightId={victoryWinner?.id} />
                </div>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <SoftButton variant="primary" size="lg" onClick={() => send('host:resetGame')}>
                    مسابقة جديدة
                  </SoftButton>
                  <SoftButton variant="ghost" size="lg" onClick={() => send('host:gotoQuestion', { index: 0 })}>
                    إعادة من السؤال الأول
                  </SoftButton>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ شاشة الفوز (تظهر فوق كل شيء) ============ */}
      <AnimatePresence>
        {phase === 'finished' && victoryWinner && !victoryDismissed && (
          <VictoryScreen
            key="victory"
            winner={victoryWinner}
            meId={null}
            standings={players}
            onDismiss={() => setVictoryDismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* ============ انتهت مهلة الإجابة — قرار المضيف ============ */}
      <AnswerTimeoutModal
        open={Boolean(state?.answerExpired)}
        playerName={state?.answerExpiredPlayerName || state?.buzzedPlayerName || ''}
        onAward={() => send('host:awardExpired')}
        onReset={() => send('host:resetAnswerTime')}
      />

      {/* ============ نظام الإنذارات ============ */}
      <WarningModal
        open={warnOpen}
        candidates={warnCandidates}
        targetId={warnTarget}
        reason={warnReason}
        sending={warnSending}
        onSelect={setWarnTarget}
        onReasonChange={setWarnReason}
        onSend={sendWarning}
        onClose={() => setWarnOpen(false)}
      />

      {/* ============ وضع الاستراحة — إدخال السبب ============ */}
      <AnimatePresence>
        {breakModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-md"
            >
              <Card lg className="p-6">
                <div className="text-center">
                  <span className="text-4xl">☕</span>
                  <h2 className="mt-2 font-display text-2xl font-black text-stone-800">وضع الاستراحة</h2>
                  <p className="mt-1 text-xs font-bold text-stone-400">
                    ستتوقف اللعبة عند جميع اللاعبين حتى إنهاء الاستراحة.
                  </p>
                </div>

                <label className="mt-5 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-stone-400">اكتب سبب الاستراحة:</span>
                  <input
                    value={breakReasonInput}
                    onChange={(event) => setBreakReasonInput(event.target.value.slice(0, 60))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') startBreak();
                    }}
                    placeholder="مثال: بريك صلاة"
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm font-bold text-stone-800 outline-none transition-colors placeholder:font-normal placeholder:text-stone-400 focus:border-amber-400"
                  />
                </label>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <SoftButton
                    variant="primary"
                    size="lg"
                    className="flex-1 justify-center"
                    disabled={!breakReasonInput.trim()}
                    onClick={startBreak}
                  >
                    ☕ ابدأ الاستراحة
                  </SoftButton>
                  <SoftButton
                    variant="ghost"
                    size="lg"
                    className="justify-center sm:w-28"
                    onClick={() => {
                      setBreakModalOpen(false);
                      setBreakReasonInput('');
                    }}
                  >
                    إلغاء
                  </SoftButton>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ الإشعارات ============ */}
      <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              className={cx(
                'w-full max-w-sm rounded-2xl px-4 py-2.5 text-center shadow-soft-md',
                toast.tone === 'honey' && 'bg-honey-200 text-honey-800',
                toast.tone === 'sage' && 'bg-sage-200 text-sage-800',
                toast.tone === 'coral' && 'bg-coral-200 text-coral-800',
                toast.tone === 'sky' && 'bg-sky-200 text-sky-800',
                toast.tone === 'neutral' && 'bg-white text-stone-700'
              )}
            >
              <p className="text-xs font-black">{toast.title}</p>
              {toast.body && <p className="mt-0.5 text-[11px] opacity-80">{toast.body}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
