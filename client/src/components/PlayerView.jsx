import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

import { socket } from '../socket.js';
import sound, { vibrate } from '../lib/sound.js';
import { Avatar, Card, ConnectionDot, Pill, SoftButton, cx } from './ui.jsx';
import Leaderboard from './Leaderboard.jsx';
import VictoryScreen from './VictoryScreen.jsx';
import { playerById, toneOf } from '../data/players.js';
import { TIMER_DURATION } from '../data/gameData.js';

/** مدة الاستمرار على المسافة لإغلاق الإنذار */
const HOLD_MS = 5000;

/**
 * واجهة اللاعب — زر الجرس الكبير + النقاط.
 */
export default function PlayerView({ playerId, onExit }) {
  const player = playerById(playerId);
  const tone = toneOf(player?.tone);

  const [state, setState] = useState(null);
  const [remaining, setRemaining] = useState(TIMER_DURATION);
  const [connected, setConnected] = useState(socket.connected);
  const [optimistic, setOptimistic] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [toast, setToast] = useState(null);
  // فرق النقاط في الجولة الأخيرة (لعرض "+X")
  const [scoreDelta, setScoreDelta] = useState(0);
  const prevScoreRef = useRef(null);
  // إخفاء شاشة الفوز يدوياً
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  // مهلة الإجابة (٣ ثوانٍ)
  const [answerRemaining, setAnswerRemaining] = useState(0);
  // كشف الإجابة للجميع
  const [answerShownToAll, setAnswerShownToAll] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(null);
  // نظام الإنذارات
  const [warning, setWarning] = useState(null);
  const [holdPct, setHoldPct] = useState(0);
  const holdRef = useRef({ active: false, start: 0, timer: 0 });

  const buzzLock = useRef(false);
  const shake = useAnimation();

  /* ---------------------- إشعار مؤقت ---------------------- */
  const notify = useCallback((message, tone_ = 'neutral') => {
    const next = { message, tone: tone_, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setToast(next);
    window.setTimeout(() => {
      setToast((current) => (current && current.id === next.id ? null : current));
    }, 2400);
  }, []);

  /* ---------------------- الإنذارات (اضغط مطوّلاً ٥ ثوانٍ) ---------------------- */

  const playAlert = useCallback(() => {
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.volume = 0.75;
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          const wav = new Audio('/sounds/alert.wav');
          wav.volume = 0.75;
          const retry = wav.play();
          if (retry && typeof retry.catch === 'function') retry.catch(() => sound.wrong());
        });
      }
    } catch (_) {
      sound.wrong();
    }
  }, []);

  const endHold = useCallback(() => {
    holdRef.current.active = false;
    if (holdRef.current.timer) clearInterval(holdRef.current.timer);
    holdRef.current.timer = 0;
    setHoldPct(0); // الإفلات قبل ٥ ثوانٍ = العودة للصفر فوراً
  }, []);

  const beginHold = useCallback(() => {
    if (holdRef.current.active) return;
    holdRef.current.active = true;
    holdRef.current.start = performance.now();

    // نعتمد على الوقت الفعلي (performance.now) لذا يبقى التقدّم صحيحاً
    // حتى لو أخّر المتصفح المؤقّت (تبويب في الخلفية مثلاً).
    holdRef.current.timer = window.setInterval(() => {
      if (!holdRef.current.active) return;

      const elapsed = performance.now() - holdRef.current.start;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldPct(pct);

      if (pct >= 100) {
        holdRef.current.active = false;
        clearInterval(holdRef.current.timer);
        holdRef.current.timer = 0;
        setHoldPct(0);
        setWarning(null);
        socket.emit('warning:acknowledge', {});
      }
    }, 16);
  }, []);

  /* ---------------------- تعريف الهوية ---------------------- */
  useEffect(() => {
    const identify = () => {
      socket.emit('player:identify', { playerId }, (response) => {
        if (response?.ok) {
          setReplaced(false);
          setState(response.state);
        }
      });
    };

    identify();
    socket.on('connect', identify);
    socket.on('player:replaced', () => setReplaced(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect', () => setConnected(true));

    return () => {
      socket.off('connect', identify);
      socket.off('player:replaced');
      socket.off('disconnect');
      socket.off('connect');
      socket.emit('player:leave');
    };
  }, [playerId]);

  /* ---------------------- أحداث اللعبة ---------------------- */
  useEffect(() => {
    const onState = (next) => {
      setState(next);
      setRemaining(next.remaining);
      setOptimistic(false);
      if (!next.answerWindowActive) setAnswerRemaining(0);
      setAnswerShownToAll(Boolean(next.answerRevealedToAll));
    };

    // كشف الإجابة للجميع (حتى لو لم يضغط أحد الجرس)
    const onRevealAnswerToAll = (payload) => {
      setAnswerShownToAll(true);
      if (payload?.answer) setRevealedAnswer(payload.answer);
      sound.correct();
      notify('تم كشف الإجابة للجميع', 'sage');
    };

    const onAnswerTick = (payload) => setAnswerRemaining(payload.remaining);
    const onAnswerStarted = (payload) => setAnswerRemaining(payload.duration);

    const onTick = (payload) => setRemaining(payload.remaining);

    const onStarted = (payload) => {
      setOptimistic(false);
      setRemaining(payload.remaining);
      sound.unlock();
      sound.start();
    };

    const onResumed = (payload) => setRemaining(payload.remaining);
    const onReset = (payload) => setRemaining(payload.remaining);

    const onBuzzed = (payload) => {
      sound.buzz();
      vibrate([30, 45, 30]);
      if (payload.playerId === playerId) notify('أنت الأول! جاوب الآن', 'honey');
    };

    const onCorrect = (payload) => {
      if (payload.playerId === playerId) {
        sound.correct();
        vibrate([20, 35, 20, 35]);
        notify(`إجابة صحيحة! +${payload.points}`, 'sage');
      }
    };

    const onWrong = (payload) => {
      if (payload.playerId === playerId) {
        sound.wrong();
        vibrate([110]);
        notify('إجابة خاطئة — خرجت من هذه الجولة', 'coral');
      }
    };

    const onTimeUp = () => {
      sound.timeup();
      vibrate([50, 50, 50]);
      shake.start({
        x: [0, -12, 12, -8, 8, -4, 4, 0],
        transition: { duration: 0.55, ease: 'easeInOut' },
      });
    };

    const onResetBuzzers = () => {
      setOptimistic(false);
      notify('تمت إعادة الجولة — الجرس مفتوح', 'sky');
    };

    const onGameReset = () => notify('بدأت مسابقة جديدة', 'sky');

    const onQuestionRevealed = () => {
      sound.unlock();
      sound.start();
      notify('ظهر السؤال! استعد', 'honey');
    };

    const onHardReset = () => {
      setOptimistic(false);
      notify('تم تصفير اللعبة بالكامل', 'coral');
    };

    // إنذار من المضيف
    const onWarning = (payload) => {
      setHoldPct(0);
      setWarning(payload);
      playAlert();
      vibrate([90, 60, 90, 60, 90]);
    };

    socket.on('game:state', onState);
    socket.on('timer:tick', onTick);
    socket.on('timer:started', onStarted);
    socket.on('timer:resumed', onResumed);
    socket.on('timer:reset', onReset);
    socket.on('buzzed', onBuzzed);
    socket.on('correct', onCorrect);
    socket.on('wrong', onWrong);
    socket.on('timer:timeup', onTimeUp);
    socket.on('buzzers:reset', onResetBuzzers);
    socket.on('game:reset', onGameReset);
    socket.on('question:revealed', onQuestionRevealed);
    socket.on('game:hard_reset', onHardReset);
    socket.on('answer:tick', onAnswerTick);
    socket.on('answer:started', onAnswerStarted);
    socket.on('warning', onWarning);
    socket.on('reveal_answer_to_all', onRevealAnswerToAll);

    return () => {
      socket.off('game:state', onState);
      socket.off('timer:tick', onTick);
      socket.off('timer:started', onStarted);
      socket.off('timer:resumed', onResumed);
      socket.off('timer:reset', onReset);
      socket.off('buzzed', onBuzzed);
      socket.off('correct', onCorrect);
      socket.off('wrong', onWrong);
      socket.off('timer:timeup', onTimeUp);
      socket.off('buzzers:reset', onResetBuzzers);
      socket.off('game:reset', onGameReset);
      socket.off('question:revealed', onQuestionRevealed);
      socket.off('game:hard_reset', onHardReset);
      socket.off('answer:tick', onAnswerTick);
      socket.off('answer:started', onAnswerStarted);
      socket.off('warning', onWarning);
      socket.off('reveal_answer_to_all', onRevealAnswerToAll);
    };
  }, [playerId, notify, shake, playAlert]);

  /* ---------------------- قيم مشتقة ---------------------- */
  const players = state?.players || [];
  // ترتيب تنازلي حسب النقاط — نسخة جديدة حتى لا نعدّل الحالة الأصلية
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );
  const me = useMemo(() => players.find((item) => item.id === playerId) || null, [players, playerId]);
  const myScore = me?.score ?? 0;
  const myRank = useMemo(() => {
    const index = sortedPlayers.findIndex((item) => item.id === playerId);
    return index === -1 ? null : index + 1;
  }, [sortedPlayers, playerId]);

  const phase = state?.phase || 'lobby';
  const iBuzzed = state?.buzzedPlayerId === playerId;
  const iLockedOut = Boolean(me?.lockedOut);
  const someoneElseBuzzed = Boolean(state?.buzzedPlayerId) && !iBuzzed;
  const otherBuzzer = someoneElseBuzzed
    ? players.find((item) => item.id === state.buzzedPlayerId)
    : null;

  // مهلة الإجابة (٣ ثوانٍ)
  const answerActive = Boolean(state?.answerWindowActive) && iBuzzed;
  const iExpired = Boolean(state?.answerExpired) && state?.answerExpiredPlayerId === playerId;
  const answerSeconds = Math.max(0, Math.ceil(answerRemaining));

  const canBuzz =
    phase === 'question' &&
    Boolean(state?.isQuestionRevealed) &&
    Boolean(state?.timerRunning) &&
    !state?.buzzedPlayerId &&
    !iLockedOut &&
    !optimistic;

  const isDanger = remaining <= 3 && remaining > 0;

  /* ---------------------- لوحة المتصدرين على جوال اللاعب ---------------------- */
  // تظهر عند انتهاء الوقت، أو عند كشف النتيجة، أو أثناء انتظار السؤال التالي
  const showLeaderboard =
    phase !== 'lobby' &&
    phase !== 'finished' &&
    (phase === 'timeup' || phase === 'reveal' || !state?.isQuestionRevealed);

  const showBuzzer = !showLeaderboard && phase !== 'lobby' && phase !== 'finished';

  // فرق نقاطي في الجولة الأخيرة (يُصفَّر عند عرض سؤال جديد)
  useEffect(() => {
    if (prevScoreRef.current === null) {
      prevScoreRef.current = myScore;
      return;
    }
    if (myScore > prevScoreRef.current) {
      setScoreDelta(myScore - prevScoreRef.current);
      prevScoreRef.current = myScore;
    } else if (myScore < prevScoreRef.current) {
      setScoreDelta(0); // تصفير كامل أو خصم يدوي
      prevScoreRef.current = myScore;
    }
  }, [myScore]);

  useEffect(() => {
    if (state?.isQuestionRevealed) setScoreDelta(0);
  }, [state?.isQuestionRevealed, state?.questionIndex]);

  // كائن ثابت (memo) لتجنّب إعادة رسم صفوف لوحة المتصدرين بلا داعٍ
  const deltaById = useMemo(
    () => (scoreDelta > 0 ? { [playerId]: scoreDelta } : {}),
    [scoreDelta, playerId]
  );

  /* ---------------------- شاشة الفوز ---------------------- */
  const topPlayer = useMemo(() => {
    if (!players.length) return null;
    return [...players].sort((a, b) => b.score - a.score)[0];
  }, [players]);

  const victoryWinner = state?.winner || (phase === 'finished' ? topPlayer : null);

  // تصفير حالة الإخفاء عند بدء مسابقة جديدة
  useEffect(() => {
    if (phase !== 'finished') setVictoryDismissed(false);
  }, [phase]);

  /* ---------------------- الضغط ---------------------- */
  const handleBuzz = useCallback(() => {
    sound.unlock();
    if (!canBuzz) {
      vibrate(8);
      return;
    }
    if (buzzLock.current) return;
    buzzLock.current = true;
    setOptimistic(true);
    vibrate(28);
    socket.emit('buzz', {}, (response) => {
      buzzLock.current = false;
      if (!response?.ok) {
        setOptimistic(false);
        vibrate([15, 35, 15]);
      }
    });
    window.setTimeout(() => {
      buzzLock.current = false;
    }, 320);
  }, [canBuzz]);

  useEffect(() => {
    const onKey = (event) => {
      if (warning) return; // الإنذار فعّال: المسافة مخصّصة لإغلاقه
      if (event.code === 'Space' && event.target?.tagName !== 'INPUT') {
        event.preventDefault();
        handleBuzz();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBuzz, warning]);

  /* الاستمرار على المسافة ٥ ثوانٍ لإغلاق الإنذار */
  useEffect(() => {
    if (!warning) return undefined;

    const onKeyDown = (event) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      if (event.repeat) return; // نتجاهل التكرار التلقائي للمفتاح
      beginHold();
    };

    const onKeyUp = (event) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      endHold();
    };

    const onBlur = () => endHold();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      endHold();
    };
  }, [warning, beginHold, endHold]);

  /* ---------------------- شكل الجرس ---------------------- */
  const buzzer = useMemo(() => {
    if (iBuzzed || (optimistic && phase === 'question')) {
      return { bg: 'bg-sage-300 text-sage-800', emoji: '🎤', label: 'أنت الأول!', hint: 'جاوب بصوت عالٍ' };
    }
    if (iLockedOut) {
      return { bg: 'bg-coral-100 text-coral-700', emoji: '🚫', label: 'خرجت', hint: 'من هذه الجولة' };
    }
    if (someoneElseBuzzed || phase === 'buzzed') {
      return { bg: 'bg-stone-100 text-stone-400', emoji: '🔒', label: 'مقفل', hint: 'ضغط أحدهم أولاً' };
    }
    if (canBuzz) {
      return { bg: 'bg-honey-300 text-honey-800', emoji: '🔔', label: 'اضغط!', hint: 'أول من يضغط يفوز بالكلمة' };
    }
    if (phase === 'reveal' || phase === 'timeup') {
      return { bg: 'bg-stone-100 text-stone-400', emoji: '⏳', label: 'انتهت الجولة', hint: 'بانتظار السؤال التالي' };
    }
    return { bg: 'bg-stone-100 text-stone-400', emoji: '🔔', label: 'استعد', hint: 'بانتظار المضيف' };
  }, [canBuzz, iBuzzed, iLockedOut, optimistic, phase, someoneElseBuzzed]);

  /* ---------------------- محتوى الحالة ---------------------- */
  const statusCard = () => {
    if (phase === 'lobby') {
      return (
        <Card className="w-full max-w-sm p-6 text-center">
          <span className="mb-3 inline-block text-4xl animate-bob">🎮</span>
          <p className="font-display text-xl font-black text-stone-800">أنت داخل المسابقة</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            بانتظار أن يبدأ المضيف الجولة الأولى…
          </p>
        </Card>
      );
    }

    if (phase === 'finished') {
      return (
        <Card className="w-full max-w-sm p-6 text-center">
          <span className="mb-3 inline-block text-5xl">
            {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎉'}
          </span>
          <p className="font-display text-2xl font-black text-stone-800">
            {myRank === 1 ? 'مبروك! المركز الأول' : 'انتهت المسابقة'}
          </p>
          <p className="mt-2 text-sm text-stone-500">
            مركزك <span className="font-black text-stone-800">{myRank ?? '-'}</span> من {players.length}
          </p>
          <div className="mt-5 space-y-1.5">
            {sortedPlayers.slice(0, 4).map((item, index) => (
              <div
                key={item.id}
                className={cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2',
                  item.id === playerId ? 'bg-honey-100' : 'bg-stone-50'
                )}
              >
                <span className="w-5 text-sm font-black text-stone-400">{index + 1}</span>
                <Avatar player={item} size="xs" />
                <span className="flex-1 truncate text-sm font-bold text-stone-700">{item.name}</span>
                <span className="font-display font-black text-stone-800">{item.score}</span>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (phase === 'reveal') {
      const isWinner = state?.lastAward?.playerId === playerId;
      return (
        <Card className="w-full max-w-sm p-6 text-center">
          <span className="mb-3 inline-block text-5xl">{isWinner ? '🏆' : '📖'}</span>
          <p className={cx('font-display text-2xl font-black', isWinner ? 'text-sage-600' : 'text-stone-700')}>
            {isWinner ? `إجابة صحيحة! +${state.lastAward.points}` : 'جاهز للسؤال التالي'}
          </p>
          {!answerShownToAll && state?.question && (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3">
              <p className="text-[11px] font-bold text-stone-400">الإجابة الصحيحة</p>
              <p className="mt-1 font-bold text-stone-800">{state.question.a}</p>
            </div>
          )}
        </Card>
      );
    }

    if (phase === 'timeup') {
      return (
        <Card className="w-full max-w-sm p-6 text-center">
          <span className="mb-3 inline-block text-5xl">⌛</span>
          <p className="font-display text-2xl font-black text-stone-700">انتهى الوقت!</p>
          {!answerShownToAll && state?.question && (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3">
              <p className="text-[11px] font-bold text-stone-400">الإجابة الصحيحة</p>
              <p className="mt-1 font-bold text-stone-800">{state.question.a}</p>
            </div>
          )}
        </Card>
      );
    }

    // أثناء السؤال
    if (!state?.isQuestionRevealed) {
      return (
        <Card className="w-full max-w-sm p-6 text-center">
          <span className="mb-3 inline-block text-5xl animate-bob">⏳</span>
          <p className="font-display text-2xl font-black text-stone-700">استعد للسؤال القادم…</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            السؤال مخفي حالياً. سيظهر للجميع على الشاشة المشتركة بعد لحظات.
          </p>
        </Card>
      );
    }

    if (iBuzzed || (optimistic && phase === 'question')) {
      // مهلة الإجابة الجارية: عدّ تنازلي ٣ .. ٢ .. ١
      if (answerActive) {
        const danger = answerRemaining <= 1.5;
        return (
          <motion.div
            key={`answer-${answerSeconds}`}
            initial={{ scale: 0.72, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 430, damping: 20 }}
            className={cx(
              'w-full max-w-sm rounded-3xl border p-6 text-center shadow-soft-lg',
              danger ? 'border-coral-300 bg-coral-50' : 'border-sage-200 bg-sage-50'
            )}
          >
            <p className="text-[11px] font-black tracking-[0.25em] text-stone-400">وقت الإجابة</p>
            <p
              className={cx(
                'font-display text-7xl font-black leading-none tabular-nums',
                danger ? 'text-coral-500' : 'text-sage-600'
              )}
            >
              {answerSeconds}
            </p>
            <p className="mt-2 text-sm font-bold text-stone-500">أجب الآن بصوت عالٍ!</p>
          </motion.div>
        );
      }

      return (
        <Card className="w-full max-w-sm border-sage-200 bg-sage-50 p-5 text-center">
          <p className="font-display text-2xl font-black text-sage-700">🎤 أنت الأول!</p>
          <p className="mt-1.5 text-sm text-sage-600">
            جاوب بصوت عالٍ — نقاطك = الثواني المتبقية
          </p>
        </Card>
      );
    }

    if (iLockedOut) {
      return (
        <Card className="w-full max-w-sm border-coral-200 bg-coral-50 p-5 text-center">
          <p className="font-display text-xl font-black text-coral-700">✖ خارج هذه الجولة</p>
          <p className="mt-1.5 text-sm text-coral-600">أجاب غيرك بشكل صحيح أو خرجت بخطأ.</p>
        </Card>
      );
    }

    if (someoneElseBuzzed || phase === 'buzzed') {
      return (
        <Card className="w-full max-w-sm p-5 text-center">
          <p className="font-display text-xl font-black text-stone-700">
            🔒 {otherBuzzer ? otherBuzzer.name : 'أحدهم'} ضغط أولاً
          </p>
          <p className="mt-1.5 text-sm text-stone-500">قد يعيد المضيف تشغيل المؤقت…</p>
        </Card>
      );
    }

    if (state?.timerRunning) {
      return (
        <Card className="w-full max-w-sm p-5 text-center">
          <p className={cx('font-display text-3xl font-black', isDanger ? 'text-coral-500' : 'text-stone-800')}>
            اضغط الآن!
          </p>
          <p className="mt-1.5 text-sm text-stone-500">
            متبقٍ <span className="font-black tabular-nums" dir="ltr">{remaining.toFixed(1)}</span> ثانية
          </p>
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-sm p-5 text-center">
        <p className="font-display text-2xl font-black text-stone-300">استعد…</p>
        <p className="mt-1.5 text-sm text-stone-500">اقرأ السؤال على الشاشة، الجرس سيعمل قريباً.</p>
      </Card>
    );
  };

  /* ================================================================ */
  return (
    <motion.div
      animate={shake}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-cream bg-glow safe-top"
    >
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />

      {/* ============ الشريط العلوي ============ */}
      <header className="relative z-10 px-4 pt-4">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white/80 px-3 py-2.5 shadow-soft backdrop-blur">
          <Avatar player={player} size="md" />

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-black text-stone-800">{player?.name}</p>
            <ConnectionDot connected={connected} />
          </div>

          <div className={cx('rounded-2xl px-3 py-1.5 text-center', tone.soft)}>
            <p className="text-[10px] font-bold text-stone-400">نقاطي</p>
            <div className="flex items-baseline justify-center gap-1">
              <motion.p
                key={myScore}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className={cx('font-display text-xl font-black leading-none tabular-nums', tone.text)}
              >
                {myScore}
              </motion.p>

              {scoreDelta > 0 && (
                <motion.span
                  key={`delta-${scoreDelta}-${myScore}`}
                  initial={{ opacity: 0, y: 8, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  className="font-display text-xs font-black text-sage-600"
                >
                  +{scoreDelta}
                </motion.span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            title="خروج"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-sm text-stone-500 transition-colors hover:bg-stone-200"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ============ المحتوى ============ */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto scroll-soft px-5 py-4">
        {state?.isQuestionRevealed && state?.question && phase !== 'lobby' && phase !== 'finished' && (
          <motion.div
            key={`q-${state.questionIndex}`}
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-lg rounded-3xl border border-stone-100 bg-white p-8 text-center shadow-2xl"
          >
            <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-stone-400">السؤال</p>
            <p
              className={cx(
                'font-display font-black leading-relaxed text-stone-900 text-balance',
                'text-3xl md:text-5xl',
                /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(state.question.q) && 'tracking-[0.12em]'
              )}
            >
              {state.question.q}
            </p>
          </motion.div>
        )}

        {/* الإجابة المكشوفة لجميع اللاعبين */}
        {answerShownToAll && (state?.question?.a || revealedAnswer) && (
          <motion.div
            key={`answer-all-${state?.questionIndex}`}
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-soft-lg"
          >
            <p className="text-[11px] font-black tracking-[0.3em] text-emerald-600">الإجابة الصحيحة</p>
            <p className="mt-2 font-display text-3xl font-black leading-relaxed text-stone-800">
              {state?.question?.a || revealedAnswer}
            </p>
          </motion.div>
        )}

        <motion.div
          key={`${phase}-${state?.isQuestionRevealed}-${iBuzzed}-${iLockedOut}-${optimistic}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full justify-center"
        >
          {statusCard()}
        </motion.div>

        {/* ===== لوحة المتصدرين (بين الجولات) ===== */}
        {showLeaderboard && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-black tracking-wide text-stone-500">🏆 المتصدرون</p>
              {myRank ? (
                <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-bold text-stone-500">
                  مركزك {myRank} من {players.length}
                </span>
              ) : null}
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white/70 p-2.5 shadow-soft backdrop-blur">
              <Leaderboard
                players={players}
                meId={playerId}
                highlightId={state?.buzzedPlayerId}
                deltaById={deltaById}
                compact
              />
            </div>
          </motion.div>
        )}

        {/* الجرس */}
        {showBuzzer && (
          <div className="relative flex items-center justify-center">
            {canBuzz && (
              <>
                <span className={cx('pointer-events-none absolute h-[min(74vw,320px)] w-[min(74vw,320px)] animate-halo rounded-full border-2', tone.border)} />
                <span
                  className={cx('pointer-events-none absolute h-[min(74vw,320px)] w-[min(74vw,320px)] animate-halo rounded-full border', tone.border)}
                  style={{ animationDelay: '0.6s' }}
                />
              </>
            )}

            <motion.button
              type="button"
              onPointerDown={handleBuzz}
              disabled={!canBuzz}
              animate={canBuzz ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={canBuzz ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              whileTap={canBuzz ? { scale: 0.95 } : {}}
              className={cx(
                'relative flex h-[min(74vw,320px)] w-[min(74vw,320px)] flex-col items-center justify-center gap-1 rounded-full transition-colors duration-200',
                buzzer.bg,
                canBuzz ? 'shadow-soft-lg' : 'shadow-soft-inner'
              )}
            >
              <span className="text-5xl sm:text-6xl">{buzzer.emoji}</span>
              <span className="font-display text-2xl font-black sm:text-3xl">{buzzer.label}</span>
              <span className="text-xs font-bold opacity-70">{buzzer.hint}</span>
            </motion.button>
          </div>
        )}

        {!showBuzzer && phase === 'lobby' && (
          <Pill tone="neutral">بانتظار المضيف</Pill>
        )}
      </main>

      {/* ============ التذييل ============ */}
      <footer className="relative z-10 px-5 pb-6 pt-2 text-center safe-bottom">
        <p className="text-[11px] font-bold text-stone-400">
          {phase === 'question' && state?.timerRunning && !state?.buzzedPlayerId && !iLockedOut
            ? 'أسرع بالضغط قبل أن يسبقك أحد!'
            : 'النقاط = الثواني المتبقية عند الضغط'}
        </p>
      </footer>

      {/* ============ إشعار ============ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className={cx(
              'fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-black shadow-soft-md',
              toast.tone === 'honey' && 'bg-honey-200 text-honey-800',
              toast.tone === 'sage' && 'bg-sage-200 text-sage-800',
              toast.tone === 'coral' && 'bg-coral-200 text-coral-800',
              toast.tone === 'sky' && 'bg-sky-200 text-sky-800',
              toast.tone === 'neutral' && 'bg-white text-stone-700'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ استبدال الجلسة ============ */}
      <AnimatePresence>
        {replaced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-cream/90 px-6 backdrop-blur"
          >
            <Card className="w-full max-w-sm p-6 text-center">
              <span className="mb-3 inline-block text-4xl">📱</span>
              <p className="font-display text-xl font-black text-stone-800">تم الدخول من جهاز آخر</p>
              <p className="mt-2 text-sm text-stone-500">
                هذا الاسم أصبح مستخدماً على جهاز آخر. يمكنك استعادة الجلسة هنا.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <SoftButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setReplaced(false);
                    socket.emit('player:identify', { playerId }, () => {});
                  }}
                >
                  استعادة الجلسة
                </SoftButton>
                <SoftButton variant="ghost" size="lg" onClick={onExit}>
                  العودة للبداية
                </SoftButton>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ انتهت مهلة الإجابة (٣ ثوانٍ) ============ */}
      <AnimatePresence>
        {iExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[75] flex flex-col items-center justify-center bg-coral-600 px-6 text-center"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="text-7xl"
            >
              ⏰
            </motion.span>

            <motion.h1
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
              className="mt-4 font-display text-5xl font-black text-white sm:text-6xl"
            >
              انتهى الوقت!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-4 max-w-xs text-sm font-bold leading-relaxed text-white/90"
            >
              انتهت مهلتك (٣ ثوانٍ) للإجابة، ولا يمكنك الإجابة الآن.
              بانتظار قرار المضيف…
            </motion.p>

            <motion.div
              className="mt-8 h-1.5 w-32 overflow-hidden rounded-full bg-white/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-white"
                animate={{ x: ['-120%', '320%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ إنذار من المضيف (اضغط مطوّلاً ٥ ثوانٍ) ============ */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[85] flex flex-col items-center justify-center bg-gradient-to-b from-coral-500 via-coral-600 to-coral-700 px-6 text-center"
          >
            {/* وميض تحذيري */}
            <motion.span
              className="pointer-events-none absolute inset-0 border-[6px] border-white/25"
              animate={{ opacity: [0.15, 0.5, 0.15] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [1, 1.08, 1], opacity: 1 }}
              transition={{ scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.2 } }}
              className="text-7xl sm:text-8xl"
            >
              ⚠️
            </motion.span>

            <motion.h1
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 18 }}
              className="mt-3 font-display text-5xl font-black text-white sm:text-6xl"
            >
              إنذار!
            </motion.h1>

            {warning.count > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mt-3 rounded-full bg-white/20 px-4 py-1 text-xs font-black text-white ring-1 ring-white/40"
              >
                إنذار رقم {warning.count} — ٣ إنذارات = طرد نهائي
              </motion.span>
            )}

            {/* سبب الإنذار */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, type: 'spring', stiffness: 280, damping: 24 }}
              className="mt-6 w-full max-w-sm rounded-3xl bg-white/15 px-5 py-4 ring-1 ring-white/30 backdrop-blur-sm"
            >
              <p className="text-[11px] font-black tracking-[0.25em] text-white/70">السبب من المضيف</p>
              <p className="mt-2 text-lg font-black leading-relaxed text-white">{warning.reason}</p>
            </motion.div>

            {/* شريط تقدّم الاستمرار */}
            <div className="mt-8 w-full max-w-sm">
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-white/25 ring-1 ring-white/30">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${holdPct}%` }}
                />
              </div>
              <p className="mt-2.5 text-center text-xs font-black text-white/85">
                {holdPct >= 100
                  ? 'تم الإغلاق'
                  : holdPct > 0
                    ? `استمر… ${(5 - (holdPct / 100) * 5).toFixed(1)} ث`
                    : 'اضغط مع الاستمرار على مفتاح المسافة ٥ ثوانٍ للإغلاق'}
              </p>
            </div>

            {/* بديل للجوال: اضغط مع الاستمرار هنا */}
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                beginHold();
              }}
              onPointerUp={endHold}
              onPointerUpCapture={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              className="mt-5 select-none rounded-2xl bg-white/15 px-6 py-3.5 text-sm font-black text-white ring-1 ring-white/40 transition-colors hover:bg-white/25 active:bg-white/35"
            >
              📱 أو اضغط مع الاستمرار هنا ٥ ثوانٍ
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ شاشة الفوز النهائية ============ */}
      <AnimatePresence>
        {phase === 'finished' && victoryWinner && !victoryDismissed && (
          <VictoryScreen
            key="victory"
            winner={victoryWinner}
            meId={playerId}
            standings={players}
            onDismiss={() => setVictoryDismissed(true)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
