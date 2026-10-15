import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

import { socket } from '../socket.js';
import sound, { vibrate } from '../lib/sound.js';
import { Avatar, Card, ConnectionDot, Pill, SoftButton, cx } from './ui.jsx';
import Leaderboard from './Leaderboard.jsx';
import VictoryScreen from './VictoryScreen.jsx';
import Certificate from './Certificate.jsx';
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
  // فقرة الذاكرة (ركز زين): مرحلة الصورة ثم مرحلة السؤال
  const [memoryPhase, setMemoryPhase] = useState('image');
  // تحدي التيربو — كل نقرة = ٠.٢٥ نقطة
  const [turboPoints, setTurboPoints] = useState(0);
  // فك التشفير
  const [scrambleInput, setScrambleInput] = useState('');
  const [scrambleSolved, setScrambleSolved] = useState(false);
  // الحسبة الخاطفة
  const [mathSolved, setMathSolved] = useState(false);
  // محاولة خاطئة واحدة = قفل (للحسبة وفك التشفير)
  const [hasFailed, setHasFailed] = useState(false);
  // أسرع رد فعل
  const [reactionReady, setReactionReady] = useState(false);
  const [reactionWinnerName, setReactionWinnerName] = useState(null);
  // صيد الهدف
  const [aimScore, setAimScore] = useState(0);
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

    // أسرع رد فعل — اسم الفائز
    const onReactionWinner = (name) => {
      if (!name) return;
      setReactionWinnerName(name);
    };

    // إنهاء المسابقة فوراً — تنظيف حالة الألعاب المصغّرة وإظهار النتائج
    const onForcedEnd = () => {
      setTurboPoints(0);
      setScrambleInput('');
      setScrambleSolved(false);
      setMathSolved(false);
      setHasFailed(false);
      setReactionReady(false);
      setReactionWinnerName(null);
      setAimScore(0);
      setVictoryDismissed(false);
      notify('تم إنهاء المسابقة 🛑', 'coral');
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
    socket.on('reaction-winner', onReactionWinner);
    socket.on('game:forced-end', onForcedEnd);

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
      socket.off('reaction-winner', onReactionWinner);
      socket.off('game:forced-end', onForcedEnd);
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

  /* ---------- أنواع السؤال + لوحة المتصدرين ----------
     يجب أن تُعرَّف قبل canBuzz لأنه يقرأ memoryImagePhase.
     (وضعها بعده سابقاً سبّب: Cannot access 'memoryImagePhase' before initialization) */
  const isIntro = state?.question?.type === 'intro';
  const isMemory = state?.question?.type === 'memory';
  const isTurbo = state?.question?.type === 'turbo';
  const isScramble = state?.question?.type === 'scramble';
  const isMath = state?.question?.type === 'math';
  const isReaction = state?.question?.type === 'reaction';
  const isAim = state?.question?.type === 'aim';
  // أثناء عرض صورة الذاكرة: لا سؤال، الجرس معطّل، والعدّاد موقوف
  const memoryImagePhase = isMemory && memoryPhase === 'image';

  // تظهر لوحة المتصدرين عند انتهاء الوقت، أو عند كشف النتيجة، أو أثناء انتظار السؤال التالي
  const showLeaderboard =
    !isIntro &&
    phase !== 'lobby' &&
    phase !== 'finished' &&
    (phase === 'timeup' || phase === 'reveal' || !state?.isQuestionRevealed);

  const showBuzzer =
    !isIntro &&
    !isTurbo &&
    !isScramble &&
    !isMath &&
    !isReaction &&
    !isAim &&
    !showLeaderboard &&
    phase !== 'lobby' &&
    phase !== 'finished';

  const canBuzz =
    phase === 'question' &&
    !memoryImagePhase &&
    Boolean(state?.isQuestionRevealed) &&
    Boolean(state?.timerRunning) &&
    !state?.buzzedPlayerId &&
    !iLockedOut &&
    !optimistic;

  const isDanger = remaining <= 3 && remaining > 0;

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

  /* فقرة الذاكرة: صورة ٥ ثوانٍ ثم السؤال */
  useEffect(() => {
    if (state?.question?.type !== 'memory') return undefined;

    setMemoryPhase('image');
    const timeoutId = window.setTimeout(() => setMemoryPhase('question'), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [state?.questionIndex, state?.question?.type]);

  /* الألعاب المصغّرة: تصفير العدّادات عند تغيّر السؤال */
  useEffect(() => {
    setTurboPoints(0);
    setScrambleInput('');
    setScrambleSolved(false);
    setMathSolved(false);
    setHasFailed(false);
    setReactionReady(false);
    setReactionWinnerName(null);
    setAimScore(0);
  }, [state?.questionIndex]);

  /* أسرع رد فعل: تأخير عشوائي ٢-٥ ثوانٍ قبل أن يخضرّ الزر */
  useEffect(() => {
    if (state?.question?.type !== 'reaction') return undefined;

    setReactionReady(false);
    const delay = 2000 + Math.random() * 3000; // 2000ms – 5000ms
    const timeoutId = window.setTimeout(() => setReactionReady(true), delay);

    return () => window.clearTimeout(timeoutId);
  }, [state?.questionIndex, state?.question?.type]);

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
    // مرحلة صورة الذاكرة: الجرس معطّل تماماً
    if (memoryImagePhase) {
      return { bg: 'bg-stone-100 text-stone-400', emoji: '👁️', label: 'ركز!', hint: 'شاهد الصورة قبل اختفائها' };
    }
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
  }, [canBuzz, iBuzzed, iLockedOut, memoryImagePhase, optimistic, phase, someoneElseBuzzed]);

  /* ---------------------- محتوى الحالة ---------------------- */
  /* ---------------------- تحدي التيربو ---------------------- */
  const handleTurboClick = () => {
    const newPoints = turboPoints + 0.10;
    setTurboPoints(newPoints);
    socket.emit('turbo-score-update', { points: newPoints });
  };

  /* ---------------------- فك التشفير ---------------------- */
  const handleScrambleSubmit = (event) => {
    event.preventDefault();
    if (scrambleSolved || hasFailed) return;

    if (scrambleInput.trim() === state?.question?.answer) {
      setScrambleSolved(true);
      socket.emit('scramble-win');
    } else {
      setHasFailed(true);
    }
  };

  /* ---------------------- الحسبة الخاطفة ---------------------- */
  const handleMathOption = (opt) => {
    if (mathSolved || hasFailed) return;

    if (opt === state?.question?.answer) {
      setMathSolved(true);
      socket.emit('math-win', { points: state?.question?.points });
    } else {
      setHasFailed(true);
    }
  };

  const statusCard = () => {
    // أسرع رد فعل — انتظر ثم اضغط (فوز فوري بدون حكم)
    if (state?.question?.type === 'reaction') {
      return (
        <div className="flex w-full max-w-2xl flex-col items-center">
          {reactionWinnerName ? (
            <div className="text-4xl font-black text-green-600 animate-bounce mt-10">
              الأسرع هو: {reactionWinnerName} ⚡ (+3 نقاط)
            </div>
          ) : !reactionReady ? (
            <div className="w-full h-64 bg-red-600 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-inner">
              انتظر... 🛑
            </div>
          ) : (
            <button
              onClick={() => socket.emit('reaction-instant-win')}
              className="w-full h-64 bg-green-500 active:bg-green-700 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-[0_0_40px_rgba(34,197,94,0.6)]"
            >
              اضغط الآن! 🟢
            </button>
          )}
        </div>
      );
    }

    // صيد الهدف — حرّك الهدف وصِده
    if (state?.question?.type === 'aim') {
      return (
        <div className="flex w-full max-w-2xl flex-col items-center">
          <div className="relative w-full h-72 bg-gray-100 rounded-3xl overflow-hidden border-4 border-gray-300">
            <button
              onClick={(e) => {
                const newScore = aimScore + 0.20;
                setAimScore(newScore);
                socket.emit('aim-score-update', { score: newScore });
                e.target.style.top = Math.random() * 80 + '%';
                e.target.style.left = Math.random() * 80 + '%';
              }}
              className="absolute w-16 h-16 bg-red-600 rounded-full shadow-lg border-4 border-white transition-all duration-150"
              style={{ top: '40%', left: '40%' }}
            />
          </div>
          <div className="text-2xl font-bold mt-4 text-center">النقاط: {aimScore.toFixed(2)}</div>
        </div>
      );
    }

    // الحسبة الخاطفة — اختر الجواب الصحيح
    if (state?.question?.type === 'math') {
      const math = state.question;
      return (
        <div className="flex w-full max-w-2xl flex-col items-center">
          {math.level && (
            <div className="mb-3 w-max rounded-full bg-purple-100 px-4 py-1 text-sm font-bold text-purple-700">
              {math.level}
            </div>
          )}

          <p className="mb-8 text-6xl font-black text-stone-800" dir="ltr">
            {math.question}
          </p>

          {mathSolved ? (
            <p className="font-display text-2xl font-black text-sage-600 md:text-3xl">✅ صح! أنت الأسرع 🏆</p>
          ) : (
            <>
              <div className="grid w-full grid-cols-2 gap-4">
                {(math.options || []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleMathOption(opt)}
                    disabled={mathSolved || hasFailed}
                    dir="ltr"
                    className={`rounded-2xl border-2 border-stone-200 bg-white py-6 font-display text-3xl font-black text-stone-800 transition-colors hover:border-honey-400 hover:bg-honey-50 active:scale-95 ${hasFailed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {hasFailed && (
                <div className="text-red-600 font-bold text-2xl mt-6 animate-pulse">إجابة خاطئة ❌ (تم قفل الإجابة)</div>
              )}
            </>
          )}
        </div>
      );
    }

    // فك التشفير — رتّب الحروف
    if (state?.question?.type === 'scramble') {
      return (
        <div className="flex w-full flex-col items-center">
          <p className="mb-8 text-4xl font-black tracking-widest text-stone-800">
            {state.question.scrambled}
          </p>

          {scrambleSolved ? (
            <p className="font-display text-2xl font-black text-sage-600 md:text-3xl">✅ صح! أنت الأول 🏆</p>
          ) : (
            <>
              <form onSubmit={handleScrambleSubmit} className="flex w-full max-w-md flex-col gap-3">
                <input
                  value={scrambleInput}
                  onChange={(event) => setScrambleInput(event.target.value)}
                  placeholder="اكتب الكلمة…"
                  autoComplete="off"
                  disabled={hasFailed || scrambleSolved}
                  className={`w-full rounded-xl border-2 border-stone-200 bg-white p-4 text-center text-2xl font-bold text-stone-800 outline-none transition-colors placeholder:text-base placeholder:font-normal placeholder:text-stone-400 focus:border-honey-400 ${hasFailed ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                  type="submit"
                  disabled={hasFailed || scrambleSolved}
                  className={`w-full rounded-xl bg-honey-300 py-3 font-display text-lg font-black text-honey-800 transition-colors hover:bg-honey-400 ${hasFailed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  إرسال
                </button>
              </form>

              {hasFailed && (
                <div className="text-red-600 font-bold text-2xl mt-6 animate-pulse">إجابة خاطئة ❌ (تم قفل الإجابة)</div>
              )}
            </>
          )}
        </div>
      );
    }

    // تحدي التيربو — زر ضغط سريع (كل نقرة = ٠.٢٥ نقطة)
    if (state?.question?.type === 'turbo') {
      return (
        <button
          onClick={handleTurboClick}
          className="w-64 h-64 bg-gradient-to-br from-red-500 to-orange-600 rounded-full shadow-[0_0_50px_rgba(239,68,68,0.6)] active:scale-90 active:bg-orange-700 transition-transform duration-75 flex flex-col items-center justify-center text-white font-black text-5xl border-8 border-red-300 select-none"
        >
          اضغط!
          <span className="text-xl mt-2 font-normal">النقاط: {turboPoints.toFixed(2)}</span>
        </button>
      );
    }

    // فقرة تمهيدية — بلا جرس وبلا مؤقّت
    if (state?.question?.type === 'intro') {
      return (
        <motion.div
          key={`intro-${state.questionIndex}`}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="my-3 flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-3xl border border-amber-200 bg-white/80 p-5 text-center shadow-sm backdrop-blur-md md:p-8"
        >
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.1 }}
            className="mb-4 inline-block text-6xl"
          >
            🎬
          </motion.span>

          <motion.h2
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-4xl text-amber-600 font-bold mb-6"
          >
            {state.question.title}
          </motion.h2>

          <p className="text-2xl text-gray-700 leading-relaxed text-center">
            {state.question.description}
          </p>

          <p className="mt-6 text-sm font-bold text-stone-400">استعد… الفقرة تبدأ الآن</p>
        </motion.div>
      );
    }

    // فقرة الذاكرة — مرحلة الصورة (٥ ثوانٍ، بلا سؤال وبلا جرس)
    if (memoryImagePhase) {
      return (
        <motion.div
          key={`memory-image-${state.questionIndex}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="my-3 flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-3xl border border-amber-200 bg-white/80 p-3 text-center shadow-sm backdrop-blur-md md:p-5"
        >
          <div className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full w-max mx-auto mb-4">
            {state.question.category}
          </div>

          <img
            src={state.question.mediaUrl}
            className="w-auto max-h-[26vh] rounded-xl object-contain md:max-h-[32vh]"
            alt="Puzzle"
          />

          <motion.p
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="text-4xl font-black text-coral-500 md:text-5xl"
          >
            ركز في الصورة!
          </motion.p>
        </motion.div>
      );
    }

    if (phase === 'lobby') {
      return (
        <Card className="w-full p-3 text-center md:p-4">
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
        <div className="w-full">
          {/* ترويسة النهاية */}
          <div className="mb-6 text-center">
            <span className="mb-3 inline-block text-5xl md:text-6xl">
              {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎉'}
            </span>
            <p className="font-display text-2xl font-black text-stone-800 md:text-4xl">
              {myRank === 1 ? 'مبروك! المركز الأول' : 'انتهت المسابقة'}
            </p>
            <p className="mt-2 text-sm text-stone-500 md:text-base">
              مركزك <span className="font-black text-stone-800">{myRank ?? '-'}</span> من {players.length}
            </p>
          </div>

          {/* لوحة النهاية: الشهادة يساراً + الترتيب يميناً */}
          <div className="grid w-full max-w-[1400px] mx-auto grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 items-start p-4 md:p-6">
            {/* الشهادة — 70% يسار */}
            <div className="col-span-1 w-full min-w-0 flex justify-center order-1 lg:order-2">
              {victoryWinner && (
                <Certificate
                  winnerName={victoryWinner.name}
                  isCurrentPlayerWinner={playerId === victoryWinner.id}
                />
              )}
            </div>

            {/* الترتيب النهائي — لوحة مساندة */}
            <aside className="col-span-1 w-full min-w-0 bg-white p-6 rounded-3xl shadow-xl border border-yellow-100 order-2 lg:order-1 sticky top-6 print:hidden">
              <h2 className="mb-5 text-center font-display text-xl font-black text-stone-800 md:text-2xl">
                الترتيب النهائي 🏆
              </h2>

              <div className="space-y-3">
                {sortedPlayers.slice(0, 4).map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.06 }}
                    className={cx(
                      'flex items-center gap-3 rounded-2xl px-4 py-3.5',
                      item.id === playerId
                        ? 'bg-yellow-50 ring-2 ring-yellow-400'
                        : 'bg-stone-50 ring-1 ring-stone-100'
                    )}
                  >
                    <motion.span
                      layout
                      className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-black',
                        index === 0
                          ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-white shadow-md'
                          : 'bg-white text-stone-500 ring-1 ring-stone-200'
                      )}
                    >
                      {index + 1}
                    </motion.span>

                    <Avatar player={item} size="xs" />

                    <span className="flex-1 truncate text-sm font-bold text-stone-700 md:text-base">
                      {item.name}
                    </span>

                    <span className="font-display text-lg font-black text-stone-800 md:text-xl">
                      {item.score}
                    </span>
                  </motion.div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      );
    }

    if (phase === 'reveal') {
      const isWinner = state?.lastAward?.playerId === playerId;
      return (
        <Card className="w-full p-3 text-center md:p-4">
          <span className="mb-3 inline-block text-5xl">{isWinner ? '🏆' : '📖'}</span>
          <p className={cx('font-display text-2xl font-black', isWinner ? 'text-sage-600' : 'text-stone-700')}>
            {isWinner ? `إجابة صحيحة! +${state.lastAward.points}` : 'جاهز للسؤال التالي'}
          </p>
          {!answerShownToAll && state?.question && (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3">
              <p className="text-[11px] font-bold text-stone-400">الإجابة الصحيحة</p>
              <p className="mt-1 font-bold text-stone-800">{state.question.answer}</p>
            </div>
          )}
        </Card>
      );
    }

    if (phase === 'timeup') {
      return (
        <Card className="w-full p-3 text-center md:p-4">
          <span className="mb-3 inline-block text-5xl">⌛</span>
          <p className="font-display text-2xl font-black text-stone-700">انتهى الوقت!</p>
          {!answerShownToAll && state?.question && (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3">
              <p className="text-[11px] font-bold text-stone-400">الإجابة الصحيحة</p>
              <p className="mt-1 font-bold text-stone-800">{state.question.answer}</p>
            </div>
          )}
        </Card>
      );
    }

    // أثناء السؤال
    if (!state?.isQuestionRevealed) {
      return (
        <Card className="w-full p-3 text-center md:p-4">
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
              'w-full rounded-3xl border p-4 text-center shadow-soft-lg',
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
        <Card className="w-full border-sage-200 bg-sage-50 p-3 text-center md:p-4">
          <p className="font-display text-2xl font-black text-sage-700">🎤 أنت الأول!</p>
          <p className="mt-1.5 text-sm text-sage-600">
            جاوب بصوت عالٍ — نقاطك = الثواني المتبقية
          </p>
        </Card>
      );
    }

    if (iLockedOut) {
      return (
        <Card className="w-full border-coral-200 bg-coral-50 p-3 text-center md:p-4">
          <p className="font-display text-xl font-black text-coral-700">✖ خارج هذه الجولة</p>
          <p className="mt-1.5 text-sm text-coral-600">أجاب غيرك بشكل صحيح أو خرجت بخطأ.</p>
        </Card>
      );
    }

    if (someoneElseBuzzed || phase === 'buzzed') {
      return (
        <Card className="w-full p-3 text-center md:p-4">
          <p className="font-display text-xl font-black text-stone-700">
            🔒 {otherBuzzer ? otherBuzzer.name : 'أحدهم'} ضغط أولاً
          </p>
          <p className="mt-1.5 text-sm text-stone-500">قد يعيد المضيف تشغيل المؤقت…</p>
        </Card>
      );
    }

    if (state?.timerRunning) {
      return (
        <Card className="w-full p-3 text-center md:p-4">
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
      <Card className="w-full p-3 text-center md:p-4">
        <p className="font-display text-2xl font-black text-stone-300">استعد…</p>
        <p className="mt-1.5 text-sm text-stone-500">اقرأ السؤال على الشاشة، الجرس سيعمل قريباً.</p>
      </Card>
    );
  };

  /* ================================================================ */
  return (
    <motion.div
      animate={shake}
      className="relative mx-auto flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-cream bg-gradient-to-b from-honey-50 via-cream to-sage-50 bg-glow px-4 py-3 safe-top"
    >
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />

      {/* ============ الشريط العلوي ============ */}
      <header className="relative z-10 shrink-0 py-2">
        <div className="mx-auto flex w-full items-center gap-3 rounded-3xl border border-white/40 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-md">
          <Avatar player={player} size="md" />

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-black text-stone-800 md:text-lg">{player?.name}</p>
            <ConnectionDot connected={connected} />
          </div>

          <div className={cx('rounded-2xl px-4 py-2 text-center', tone.soft)}>
            <p className="text-[10px] font-bold text-stone-400">نقاطي</p>
            <div className="flex items-baseline justify-center gap-1">
              <motion.p
                key={myScore}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className={cx('font-display text-xl font-black leading-none tabular-nums md:text-2xl', tone.text)}
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-base text-stone-500 transition-colors hover:bg-stone-200"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ============ المحتوى ============ */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto scroll-soft px-0 py-2">
        {!isIntro && !isMath && !memoryImagePhase && state?.isQuestionRevealed && state?.question && phase !== 'lobby' && phase !== 'finished' && (
          <motion.div
            key={`q-${state.questionIndex}`}
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="my-3 flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-3xl border border-white/40 bg-white/80 p-4 text-center shadow-sm backdrop-blur-md"
          >
            {state.question.category ? (
              <div className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full w-max mx-auto mb-2">
                {state.question.category}
              </div>
            ) : (
              <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-stone-400">السؤال</p>
            )}

            {state.question.type === 'emoji' ? (
              <div className="text-center text-[3.75rem] leading-tight tracking-widest md:text-8xl">
                {state.question.question}
              </div>
            ) : (
              <p className="font-display text-2xl font-black leading-relaxed text-stone-900 text-balance md:text-4xl">
                {state.question.question}
              </p>
            )}

            {state.question.type === 'image' && (
              <img
                src={state.question.mediaUrl}
                className="w-auto max-h-[28vh] rounded-xl object-contain md:max-h-[35vh]"
                alt="Puzzle"
              />
            )}
          </motion.div>
        )}

        {/* الإجابة المكشوفة لجميع اللاعبين */}
        {answerShownToAll && (state?.question?.answer || revealedAnswer) && (
          <motion.div
            key={`answer-all-${state?.questionIndex}`}
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-soft-lg"
          >
            <p className="text-[11px] font-black tracking-[0.3em] text-emerald-600">الإجابة الصحيحة</p>
            <p className="mt-2 font-display text-3xl font-black leading-relaxed text-stone-800">
              {state?.question?.answer || revealedAnswer}
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
            className="w-full"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-black tracking-wide text-stone-500">🏆 المتصدرون</p>
              {myRank ? (
                <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-bold text-stone-500">
                  مركزك {myRank} من {players.length}
                </span>
              ) : null}
            </div>

            <div className="rounded-3xl border border-stone-100 bg-white/70 p-3 shadow-soft backdrop-blur md:p-4">
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
          <div className="relative flex shrink-0 flex-col items-center justify-center pb-4">
            {canBuzz && (
              <>
                <span className="pointer-events-none absolute h-40 w-40 animate-pulse rounded-full bg-honey-400/40 blur-2xl sm:h-48 sm:w-48 md:h-56 md:w-56" />
                <span className={cx('pointer-events-none absolute h-40 w-40 animate-halo rounded-full border-2 sm:h-48 sm:w-48 md:h-56 md:w-56', tone.border)} />
                <span
                  className={cx('pointer-events-none absolute h-40 w-40 animate-halo rounded-full border sm:h-48 sm:w-48 md:h-56 md:w-56', tone.border)}
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
              whileTap={canBuzz ? { scale: 0.9 } : {}}
              className={cx(
                'relative flex h-40 w-40 flex-col items-center justify-center gap-1 rounded-full border-4 transition-colors duration-200 active:scale-90 sm:h-48 sm:w-48 md:h-56 md:w-56',
                buzzer.bg,
                canBuzz
                  ? 'border-honey-500/50 shadow-[0_0_40px_rgba(237,193,103,0.55)]'
                  : 'border-stone-200/70 shadow-soft-inner'
              )}
            >
              {/* طبقة تدرّج ناعمة تُضيف عمقاً ولمعاناً على أي لون أساسي */}
              <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/50 via-white/5 to-black/10" />

              <span className="relative text-5xl drop-shadow-sm md:text-6xl">{buzzer.emoji}</span>
              <span className="relative font-display text-2xl font-black md:text-3xl">{buzzer.label}</span>
              <span className="relative text-xs font-bold opacity-70">{buzzer.hint}</span>
            </motion.button>
          </div>
        )}

        {!showBuzzer && phase === 'lobby' && (
          <Pill tone="neutral">بانتظار المضيف</Pill>
        )}
      </main>

      {/* ============ التذييل ============ */}
      <footer className="relative z-10 shrink-0 pb-1 pt-1 text-center safe-bottom">
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
