// =====================================================================
//  مُسَابَقَة — سيرفر اللعبة (غرفة عالمية واحدة / Single Global Room)
//  Node.js + Express + Socket.io
//  لا يوجد رمز غرفة: كل الأجهزة المتصلة تشترك في نفس الحالة تلقائياً.
// =====================================================================

import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server } from 'socket.io';
import { gameData } from './gameData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------- الإعدادات -----------------------------
const PORT = Number(process.env.PORT) || 3001;
const TIMER_DURATION = 7; // ٧ ثوانٍ
const ANSWER_WINDOW = 3; // ٣ ثوانٍ مهلة الإجابة بعد الضغط على الجرس
const TOTAL_QUESTIONS = gameData.length;

// ----------------------------- اللاعبون الأربعة (ثابتون) -----------------------------
const PLAYERS = [
  { id: 'abdullah-tarek', name: 'عبدالله طارق', emoji: '🌻', tone: 'honey' },
  { id: 'mohsen-essam', name: 'محسن عصام', emoji: '🍃', tone: 'sage' },
  { id: 'abdulrahman', name: 'عبدالرحمن', emoji: '🌸', tone: 'coral' },
  { id: 'abdullah-faiz', name: 'عبدالله فايز', emoji: '🐚', tone: 'sky' },
];

const PLAYER_IDS = PLAYERS.map((player) => player.id);
const playerMeta = (playerId) => PLAYERS.find((player) => player.id === playerId) || null;
const isPlayerId = (value) => PLAYER_IDS.includes(String(value));
const nameOf = (playerId) => playerMeta(playerId)?.name ?? '';

// ----------------------------- الحالة العالمية -----------------------------
const game = {
  phase: 'lobby', // lobby | question | buzzed | reveal | timeup | finished
  questionIndex: -1,
  isQuestionRevealed: false, // لا يُعرض نص السؤال حتى يضغط المضيف «عرض السؤال»
  scores: Object.fromEntries(PLAYERS.map((player) => [player.id, 0])),
  claims: Object.fromEntries(PLAYERS.map((player) => [player.id, null])), // playerId -> socketId
  buzzedPlayerId: null,
  lockedOut: new Set(), // معرّفات اللاعبين المستبعدين من السؤال الحالي
  answerRevealed: false,
  lastAward: null,
  timer: { running: false, endAt: 0, remaining: TIMER_DURATION },
  // مهلة الإجابة (٣ ثوانٍ) — تبدأ فور ضغط الجرس
  answerWindow: { active: false, endAt: 0 },
  answerExpired: false,
  answerExpiredPlayerId: null,
  // كشف الإجابة لجميع اللاعبين
  answerRevealedToAll: false,
  // نظام الإنذارات
  warningCounts: Object.fromEntries(PLAYERS.map((player) => [player.id, 0])),
  activeWarnings: {}, // playerId -> { id, reason, at }
};

// ----------------------------- اللاعبون المتصلون (بث فوري) -----------------------------
/**
 * سجل اللاعبين المتصلين حالياً.
 * يُبَث فوراً عبر `update_players` عند الاتصال أو الانقطاع أو تغيّر النقاط.
 * @type {Record<string, { id: string, name: string, emoji: string, tone: string, score: number, online: boolean, socketId: string, connectedAt: number }>}
 */
let connectedPlayers = {};

// ----------------------------- أدوات مساعدة -----------------------------
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

function respond(ack, payload) {
  if (typeof ack === 'function') {
    try {
      ack(payload);
    } catch (_) {
      /* العميل أغلق الاتصال */
    }
  }
}

function remainingSeconds() {
  if (game.timer.running) {
    return Math.max(0, (game.timer.endAt - Date.now()) / 1000);
  }
  return Math.max(0, game.timer.remaining);
}

function eligiblePlayerIds() {
  return PLAYER_IDS.filter((playerId) => !game.lockedOut.has(playerId));
}

/* ---------------- مهلة الإجابة (٣ ثوانٍ) ---------------- */

function answerRemainingSeconds() {
  if (!game.answerWindow.active) return 0;
  return Math.max(0, (game.answerWindow.endAt - Date.now()) / 1000);
}

function startAnswerWindow() {
  game.answerWindow.active = true;
  game.answerWindow.endAt = Date.now() + ANSWER_WINDOW * 1000;
  game.answerExpired = false;
  game.answerExpiredPlayerId = null;
  io.emit('answer:started', { duration: ANSWER_WINDOW });
}

function clearAnswerWindow() {
  game.answerWindow.active = false;
  game.answerWindow.endAt = 0;
  game.answerExpired = false;
  game.answerExpiredPlayerId = null;
}

/** انتهت المهلة دون أن يحكم المضيف */
function expireAnswerWindow() {
  game.answerWindow.active = false;
  game.answerWindow.endAt = 0;
  game.answerExpired = true;
  game.answerExpiredPlayerId = game.buzzedPlayerId;

  io.emit('answer:expired', {
    playerId: game.answerExpiredPlayerId,
    playerName: game.answerExpiredPlayerId ? nameOf(game.answerExpiredPlayerId) : null,
    remaining: Number(remainingSeconds().toFixed(2)),
  });
  broadcastState();
}

/** منح النقاط للاعب الذي ضغط — يُستخدم للحكم الصحيح ولحساب النقطة بعد انتهاء المهلة */
function awardBuzzedPlayer() {
  const playerId = game.buzzedPlayerId;
  if (!playerId) return;

  const remaining = remainingSeconds();
  const points = Math.max(1, Math.round(remaining));
  game.scores[playerId] = (game.scores[playerId] || 0) + points;
  game.lastAward = { playerId, playerName: nameOf(playerId), points };

  clearAnswerWindow();
  game.timer.running = false;
  game.timer.remaining = remaining;
  game.timer.endAt = 0;
  game.phase = 'reveal';
  game.answerRevealed = true;

  io.emit('correct', { playerId, playerName: nameOf(playerId), points, score: game.scores[playerId] });
  broadcastState();
}

function isConnected(playerId) {
  const socketId = game.claims[playerId];
  if (!socketId) return false;
  const socket = io.sockets.sockets.get(socketId);
  return Boolean(socket && socket.connected);
}

/** قائمة اللاعبين المتصلين (الطازجة) — تُبث كما هي */
function connectedPlayersList() {
  for (const playerId of Object.keys(connectedPlayers)) {
    connectedPlayers[playerId].score = game.scores[playerId] || 0;
    connectedPlayers[playerId].online = true;
  }
  return Object.values(connectedPlayers);
}

/** بث فوري لقائمة المتصلين — يصل للمضيف لحظياً */
function broadcastPlayers() {
  io.emit('update_players', connectedPlayersList());
}

function registerConnectedPlayer(playerId, socketId) {
  const meta = playerMeta(playerId);
  connectedPlayers[playerId] = {
    id: playerId,
    name: meta.name,
    emoji: meta.emoji,
    tone: meta.tone,
    score: game.scores[playerId] || 0,
    online: true,
    socketId,
    connectedAt: Date.now(),
  };
}

function buildState() {
  const inRange = game.questionIndex >= 0 && game.questionIndex < TOTAL_QUESTIONS;
  const current = inRange ? gameData[game.questionIndex] : null;

  const roster = PLAYERS.map((player) => ({
    id: player.id,
    name: player.name,
    emoji: player.emoji,
    tone: player.tone,
    score: game.scores[player.id] || 0,
    connected: isConnected(player.id),
    claimed: Boolean(game.claims[player.id]),
    lockedOut: game.lockedOut.has(player.id),
    buzzed: game.buzzedPlayerId === player.id,
    warnings: game.warningCounts[player.id] || 0,
    awaitingWarning: Boolean(game.activeWarnings[player.id]),
  }));

  // الفائز (يُحسب فقط عند نهاية المسابقة) — يُستخدم في شاشة الفوز
  const top =
    roster.length > 0
      ? roster.reduce((best, player) => (player.score > best.score ? player : best), roster[0])
      : null;

  return {
    phase: game.phase,
    questionIndex: game.questionIndex,
    totalQuestions: TOTAL_QUESTIONS,
    // نص السؤال لا يُرسل أصلاً قبل كشفه (منع أي تسريب للواجهات)
    isQuestionRevealed: game.isQuestionRevealed,
    question: game.isQuestionRevealed ? current : null,
    hiddenQuestionRound: current ? current.round : null,
    round: current ? current.round : null,
    timerDuration: TIMER_DURATION,
    remaining: Number(remainingSeconds().toFixed(2)),
    timerRunning: game.timer.running,
    answerWindowActive: game.answerWindow.active,
    answerDuration: ANSWER_WINDOW,
    answerRemaining: Number(answerRemainingSeconds().toFixed(2)),
    answerExpired: game.answerExpired,
    answerExpiredPlayerId: game.answerExpiredPlayerId,
    answerExpiredPlayerName: game.answerExpiredPlayerId ? nameOf(game.answerExpiredPlayerId) : null,
    buzzedPlayerId: game.buzzedPlayerId,
    buzzedPlayerName: game.buzzedPlayerId ? nameOf(game.buzzedPlayerId) : null,
    answerRevealed: game.answerRevealed,
    answerRevealedToAll: game.answerRevealedToAll,
    lastAward: game.lastAward,
    winner:
      game.phase === 'finished' && top
        ? {
            id: top.id,
            name: top.name,
            emoji: top.emoji,
            tone: top.tone,
            score: top.score,
            tied:
              roster.filter((player) => player.score === top.score).length > 1,
          }
        : null,
    players: roster,
    connectedCount: Object.keys(connectedPlayers).length,
    serverTime: Date.now(),
  };
}

function broadcastState() {
  io.emit('game:state', buildState());
  broadcastPlayers();
}

function broadcastTick() {
  io.emit('timer:tick', {
    remaining: Number(remainingSeconds().toFixed(2)),
    running: game.timer.running,
    duration: TIMER_DURATION,
  });
}

function loadQuestion(index) {
  game.questionIndex = index;
  game.phase = index >= 0 && index < TOTAL_QUESTIONS ? 'question' : 'lobby';
  game.isQuestionRevealed = false; // السؤال مخفي حتى يقرر المضيف عرضه
  game.buzzedPlayerId = null;
  game.lockedOut.clear();
  game.answerRevealed = false;
  game.answerRevealedToAll = false;
  game.lastAward = null;
  game.timer.running = false;
  game.timer.remaining = TIMER_DURATION;
  game.timer.endAt = 0;
  clearAnswerWindow();
}

function endQuestion(reason) {
  if (game.phase === 'finished') return;
  game.timer.running = false;
  game.timer.remaining = 0;
  game.timer.endAt = 0;
  game.buzzedPlayerId = null;
  game.answerRevealed = true;
  game.phase = 'timeup';
  io.emit('timer:timeup', { reason, remaining: 0 });
  broadcastState();
}

/** إزالة ملكية اللاعب عن هذا الاتصال (عند الخروج أو تبديل الهوية) */
function releaseClaim(socket) {
  let changed = false;
  for (const playerId of PLAYER_IDS) {
    if (game.claims[playerId] === socket.id) {
      game.claims[playerId] = null;
      delete connectedPlayers[playerId];
      changed = true;
      if (game.buzzedPlayerId === playerId) {
        game.buzzedPlayerId = null;
        game.timer.running = false;
        clearAnswerWindow();
        if (game.phase === 'buzzed') game.phase = 'question';
      }
    }
  }
  socket.data.playerId = null;
  return changed;
}

/** تشغيل دالة فقط إذا كان المرسل هو المضيف */
function withHost(socket, fn) {
  if (socket.data.role !== 'host') return;
  try {
    fn();
  } catch (error) {
    console.error('[withHost]', error);
  }
}

/** تصفير شامل: النقاط + السؤال + الأزرار + الإنذارات */
function hardResetGame() {
  for (const playerId of PLAYER_IDS) game.scores[playerId] = 0;
  for (const playerId of PLAYER_IDS) game.warningCounts[playerId] = 0;
  game.activeWarnings = {};
  loadQuestion(0); // يعيد كل شيء: المؤقت، القفل، الاستبعاد، وإخفاء السؤال
}

// ----------------------------- مسارات API -----------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    phase: game.phase,
    questionIndex: game.questionIndex,
    isQuestionRevealed: game.isQuestionRevealed,
    questions: TOTAL_QUESTIONS,
    scores: game.scores,
    connections: io.engine.clientsCount,
    connectedPlayers: connectedPlayersList(),
    serverTime: Date.now(),
  });
});

app.get('/api/questions', (_req, res) => {
  res.json({
    total: TOTAL_QUESTIONS,
    rounds: [...new Set(gameData.map((item) => item.round))],
    data: gameData,
  });
});

app.get('/api/players', (_req, res) => {
  res.json({ players: PLAYERS.map((player) => ({ id: player.id, name: player.name })) });
});

/** عنوان الشبكة المحلية — ليتمكن اللاعبون من فتح الرابط على جوالاتهم */
app.get('/api/network', (_req, res) => {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const family = typeof iface.family === 'string' ? iface.family : String(iface.family);
      if ((family === 'IPv4' || family === '4') && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  const preferred =
    addresses.find((entry) => entry.address.startsWith('192.168.')) ||
    addresses.find((entry) => entry.address.startsWith('10.')) ||
    addresses.find((entry) => /^172\.(1[6-9]|2\d|3[01])\./.test(entry.address)) ||
    addresses[0] ||
    null;

  res.json({ ok: true, host: preferred ? preferred.address : 'localhost', addresses });
});

// ----------------------------- Socket.io -----------------------------
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6,
});

io.on('connection', (socket) => {
  socket.data.role = null;
  socket.data.playerId = null;

  // إرسال الحالة الكاملة + قائمة المتصلين فوراً لأي جهاز جديد
  socket.emit('game:state', buildState());
  socket.emit('update_players', connectedPlayersList());

  // ==================== اللاعب (Player) ====================

  socket.on('player:identify', (payload, ack) => {
    const playerId = String(payload?.playerId || '');
    if (!isPlayerId(playerId)) {
      return respond(ack, { ok: false, error: 'لاعب غير معروف' });
    }

    releaseClaim(socket);

    // استبدال أي اتصال قديم لنفس اللاعب (يمنع تعليق الجلسات عند تحديث الصفحة)
    const previousSocketId = game.claims[playerId];
    if (previousSocketId && previousSocketId !== socket.id) {
      const previousSocket = io.sockets.sockets.get(previousSocketId);
      if (previousSocket) {
        previousSocket.data.playerId = null;
        previousSocket.emit('player:replaced', { playerId, name: nameOf(playerId) });
      }
    }

    game.claims[playerId] = socket.id;
    socket.data.playerId = playerId;
    socket.data.role = 'player';

    // بث فوري لقائمة المتصلين
    registerConnectedPlayer(playerId, socket.id);

    respond(ack, { ok: true, playerId, name: nameOf(playerId), state: buildState() });

    // إعادة إرسال إنذار فعّال (مثلاً بعد تحديث الصفحة)
    if (game.activeWarnings[playerId]) {
      socket.emit('warning', {
        ...game.activeWarnings[playerId],
        playerId,
        playerName: nameOf(playerId),
        count: game.warningCounts[playerId] || 0,
      });
    }

    io.emit('player:joined', { playerId, name: nameOf(playerId) });

    io.emit('update_players', connectedPlayersList());
    broadcastState();
  });

  socket.on('player:leave', () => {
    const changed = releaseClaim(socket);
    if (changed) {
      io.emit('update_players', connectedPlayersList());
      broadcastState();
    }
  });

  socket.on('buzz', (_payload, ack) => {
    const playerId = socket.data.playerId;
    if (!playerId) return respond(ack, { ok: false, reason: 'unknown-player' });
    if (!game.isQuestionRevealed) return respond(ack, { ok: false, reason: 'not-revealed' });
    if (game.phase === 'finished' || game.phase === 'lobby') {
      return respond(ack, { ok: false, reason: 'inactive' });
    }
    if (game.buzzedPlayerId) return respond(ack, { ok: false, reason: 'locked' });
    if (!game.timer.running) return respond(ack, { ok: false, reason: 'inactive' });
    if (game.lockedOut.has(playerId)) return respond(ack, { ok: false, reason: 'locked-out' });

    const remaining = Math.max(0, (game.timer.endAt - Date.now()) / 1000);

    game.timer.running = false;
    game.timer.remaining = remaining;
    game.timer.endAt = 0;
    game.buzzedPlayerId = playerId;
    game.phase = 'buzzed';
    startAnswerWindow(); // تبدأ مهلة الـ٣ ثوانٍ فوراً

    io.emit('buzzed', {
      playerId,
      playerName: nameOf(playerId),
      remaining: Number(remaining.toFixed(2)),
    });
    respond(ack, { ok: true, remaining: Number(remaining.toFixed(2)) });
    broadcastState();
  });

  // ==================== المضيف (Host) ====================

  socket.on('host:join', (_payload, ack) => {
    releaseClaim(socket);
    socket.data.role = 'host';
    socket.data.playerId = null;
    respond(ack, { ok: true, state: buildState() });
    socket.emit('update_players', connectedPlayersList());
    broadcastState();
  });

  socket.on('host:leave', () => {
    if (socket.data.role === 'host') {
      socket.data.role = null;
      broadcastState();
    }
  });

  socket.on('host:startGame', () => {
    withHost(socket, () => {
      loadQuestion(0);
      io.emit('game:started', { index: 0, total: TOTAL_QUESTIONS });
      broadcastState();
    });
  });

  // ---------- كشف السؤال (الخطوة الإلزامية قبل بدء المؤقت) ----------
  socket.on('reveal_question', () => {
    withHost(socket, () => {
      if (game.questionIndex < 0) loadQuestion(0);
      game.isQuestionRevealed = true;
      io.emit('question:revealed', { index: game.questionIndex });
      broadcastState();
    });
  });

  socket.on('host:nextQuestion', () => {
    withHost(socket, () => {
      const next = game.questionIndex + 1;
      if (next >= TOTAL_QUESTIONS) {
        game.timer.running = false;
        game.phase = 'finished';
        game.answerRevealed = false;
        game.isQuestionRevealed = false;
        io.emit('game:finished', { standings: buildState().players });
        broadcastState();
        return;
      }
      loadQuestion(next);
      io.emit('game:question', {
        index: next,
        round: gameData[next].round,
        total: TOTAL_QUESTIONS,
      });
      broadcastState();
    });
  });

  socket.on('host:prevQuestion', () => {
    withHost(socket, () => {
      const prev = game.questionIndex - 1;
      if (prev < 0) {
        loadQuestion(-1);
        game.phase = 'lobby';
        broadcastState();
        return;
      }
      loadQuestion(prev);
      io.emit('game:question', { index: prev, round: gameData[prev].round, total: TOTAL_QUESTIONS });
      broadcastState();
    });
  });

  socket.on('host:gotoQuestion', (payload) => {
    withHost(socket, () => {
      const index = Number(payload?.index);
      if (!Number.isInteger(index) || index < 0 || index >= TOTAL_QUESTIONS) return;
      loadQuestion(index);
      io.emit('game:question', { index, round: gameData[index].round, total: TOTAL_QUESTIONS });
      broadcastState();
    });
  });

  // ---------- تخطي إلى أول سؤال في الفقرة (الجولة) التالية ----------
  socket.on('host:skipRound', () => {
    withHost(socket, () => {
      const currentRound =
        game.questionIndex >= 0 && game.questionIndex < TOTAL_QUESTIONS
          ? gameData[game.questionIndex].round
          : null;

      // أول سؤال بعد الحالي تختلف جولته عن الجولة الحالية
      let target = -1;
      for (let i = game.questionIndex + 1; i < TOTAL_QUESTIONS; i += 1) {
        if (gameData[i].round !== currentRound) {
          target = i;
          break;
        }
      }

      // لا توجد فقرة تالية → إنهاء المسابقة
      if (target === -1) {
        game.timer.running = false;
        game.timer.remaining = 0;
        game.timer.endAt = 0;
        game.buzzedPlayerId = null;
        game.lockedOut.clear();
        game.answerRevealed = false;
        game.isQuestionRevealed = false;
        game.phase = 'finished';
        io.emit('game:finished', { standings: buildState().players });
        broadcastState();
        return;
      }

      // loadQuestion تعيد isQuestionRevealed إلى false تلقائياً (بانتظار العرض)
      loadQuestion(target);
      io.emit('game:question', {
        index: target,
        round: gameData[target].round,
        total: TOTAL_QUESTIONS,
        skippedRound: true,
      });
      broadcastState();
    });
  });

  socket.on('host:startTimer', () => {
    withHost(socket, () => {
      if (game.phase === 'finished') return;
      if (game.phase === 'lobby') loadQuestion(0);
      if (!game.isQuestionRevealed) return; // ممنوع قبل عرض السؤال
      if (game.phase === 'timeup' || game.phase === 'reveal') return;
      if (game.buzzedPlayerId) return;
      if (eligiblePlayerIds().length === 0) return;

      const remaining = game.timer.remaining > 0.2 ? game.timer.remaining : TIMER_DURATION;
      game.timer.remaining = remaining;
      game.timer.endAt = Date.now() + remaining * 1000;
      game.timer.running = true;
      game.phase = 'question';
      game.answerRevealed = false;

      io.emit('timer:started', { remaining, duration: TIMER_DURATION });
      broadcastState();
    });
  });

  socket.on('host:correct', () => {
    withHost(socket, () => {
      awardBuzzedPlayer(); // يمنح النقاط ويلغي مهلة الإجابة
    });
  });

  socket.on('host:wrong', () => {
    withHost(socket, () => {
      const playerId = game.buzzedPlayerId;
      if (!playerId) return;

      game.lockedOut.add(playerId);
      game.buzzedPlayerId = null;
      clearAnswerWindow();
      io.emit('wrong', { playerId, playerName: nameOf(playerId) });

      const remaining = remainingSeconds();
      const eligible = eligiblePlayerIds();

      if (eligible.length === 0) {
        endQuestion('all-locked');
        return;
      }

      if (remaining > 0.05) {
        game.timer.remaining = remaining;
        game.timer.endAt = Date.now() + remaining * 1000;
        game.timer.running = true;
        game.phase = 'question';
        io.emit('timer:resumed', { remaining });
      } else {
        endQuestion('timeout');
        return;
      }
      broadcastState();
    });
  });

  socket.on('host:revealAnswer', () => {
    withHost(socket, () => {
      game.answerRevealed = !game.answerRevealed;
      if (game.answerRevealed) {
        game.timer.running = false;
        game.timer.remaining = remainingSeconds();
        game.timer.endAt = 0;
        if (game.phase === 'question' || game.phase === 'buzzed') game.phase = 'reveal';
      } else if (game.phase === 'reveal') {
        game.phase = 'question';
      }
      broadcastState();
    });
  });

  // كشف الإجابة لجميع اللاعبين فوراً (حتى لو لم يضغط أحد الجرس)
  socket.on('reveal_answer_to_all', () => {
    withHost(socket, () => {
      if (game.questionIndex < 0 || game.questionIndex >= TOTAL_QUESTIONS) return;

      game.answerRevealedToAll = true;
      game.answerRevealed = true;
      game.timer.running = false;
      game.timer.remaining = remainingSeconds();
      game.timer.endAt = 0;
      if (game.phase === 'question' || game.phase === 'buzzed') game.phase = 'reveal';

      io.emit('reveal_answer_to_all', {
        index: game.questionIndex,
        answer: gameData[game.questionIndex].a,
      });
      broadcastState();
    });
  });

  socket.on('host:resetGame', () => {
    withHost(socket, () => {
      for (const playerId of PLAYER_IDS) game.scores[playerId] = 0;
      loadQuestion(-1);
      game.phase = 'lobby';
      game.isQuestionRevealed = false;
      game.lastAward = null;
      io.emit('game:reset');
      broadcastState();
    });
  });

  // ---------- التصفير الشامل (Nuke) ----------
  socket.on('hard_reset', () => {
    withHost(socket, () => {
      hardResetGame();
      io.emit('game:hard_reset');
      broadcastState();
    });
  });

  // ---------- أوامر لوحة الإدارة (Admin Panel) ----------

  socket.on('manual_score_update', (payload, ack) => {
    withHost(socket, () => {
      const playerId = String(payload?.playerId || '');
      const delta = Number(payload?.delta);

      if (!isPlayerId(playerId) || !Number.isFinite(delta) || delta === 0) {
        return respond(ack, { ok: false, error: 'بيانات غير صحيحة' });
      }

      const step = Math.max(-100, Math.min(100, Math.round(delta)));
      const before = game.scores[playerId] || 0;
      game.scores[playerId] = Math.max(0, before + step);
      const applied = game.scores[playerId] - before;

      io.emit('score:updated', {
        playerId,
        playerName: nameOf(playerId),
        delta: applied,
        score: game.scores[playerId],
      });
      respond(ack, { ok: true, applied, score: game.scores[playerId] });
      broadcastState();
    });
  });

  socket.on('reset_timer', () => {
    withHost(socket, () => {
      game.timer.running = false;
      game.timer.remaining = TIMER_DURATION;
      game.timer.endAt = 0;
      clearAnswerWindow();
      if (game.phase === 'timeup') game.phase = 'question';
      io.emit('timer:reset', { remaining: TIMER_DURATION });
      broadcastState();
    });
  });

  socket.on('reset_buzzers', () => {
    withHost(socket, () => {
      game.buzzedPlayerId = null;
      game.lockedOut.clear();
      game.answerRevealed = false;
      game.timer.running = false;
      game.timer.remaining = TIMER_DURATION;
      game.timer.endAt = 0;
      clearAnswerWindow();
      if (game.phase !== 'finished' && game.phase !== 'lobby') game.phase = 'question';
      io.emit('buzzers:reset');
      broadcastState();
    });
  });

  /* ---------- قرارات مهلة الإجابة (٣ ثوانٍ) ---------- */

  // «حساب النقطة» — احتساب النقطة رغم انتهاء المهلة
  socket.on('host:awardExpired', () => {
    withHost(socket, () => {
      if (!game.answerExpired) return;
      awardBuzzedPlayer();
    });
  });

  // «إعادة الوقت / إلغاء» — إعطاء مهلة جديدة
  socket.on('host:resetAnswerTime', () => {
    withHost(socket, () => {
      if (!game.buzzedPlayerId) return;
      startAnswerWindow();
      broadcastState();
    });
  });

  /* ---------- نظام الإنذارات ---------- */

  // المضيف يرسل إنذاراً للاعب مع السبب
  socket.on('host:sendWarning', (payload, ack) => {
    withHost(socket, () => {
      const playerId = String(payload?.playerId || '');
      const reason = String(payload?.reason || '').trim().slice(0, 180);

      if (!isPlayerId(playerId)) return respond(ack, { ok: false, error: 'لاعب غير معروف' });
      if (!reason) return respond(ack, { ok: false, error: 'اكتب سبب الإنذار أولاً' });

      game.warningCounts[playerId] = (game.warningCounts[playerId] || 0) + 1;
      const warning = {
        id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        reason,
        at: Date.now(),
      };
      game.activeWarnings[playerId] = warning;

      // يُرسل لجهاز اللاعب المعني فقط
      const targetSocketId = game.claims[playerId];
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
      if (targetSocket) {
        targetSocket.emit('warning', {
          ...warning,
          playerId,
          playerName: nameOf(playerId),
          count: game.warningCounts[playerId],
        });
      }

      respond(ack, { ok: true, count: game.warningCounts[playerId] });
      broadcastState();
    });
  });

  // اللاعب يؤكّد استلام الإنذار (بعد الاستمرار على المسافة ٥ ثوانٍ)
  socket.on('warning:acknowledge', (_payload, ack) => {
    const playerId = socket.data.playerId;
    if (!playerId) return respond(ack, { ok: false });
    if (game.activeWarnings[playerId]) {
      delete game.activeWarnings[playerId];
      broadcastState();
    }
    respond(ack, { ok: true });
  });

  // ==================== قطع الاتصال ====================
  socket.on('disconnect', (reason) => {
    const changed = releaseClaim(socket);
    if (changed) {
      // بث فوري فوراً عند خروج اللاعب
      io.emit('update_players', connectedPlayersList());
      broadcastState();
    }
  });

  socket.on('error', (error) => {
    console.error('[socket error]', error?.message || error);
  });
});

// ----------------------------- حلقة المؤقت (Tick Loop) -----------------------------
setInterval(() => {
  // مؤقّت السؤال (٧ ثوانٍ)
  if (game.timer.running) {
    const remaining = (game.timer.endAt - Date.now()) / 1000;

    if (remaining <= 0) {
      game.timer.running = false;
      game.timer.remaining = 0;
      endQuestion('timeout');
    } else {
      broadcastTick();
    }
  }

  // مهلة الإجابة (٣ ثوانٍ)
  if (game.answerWindow.active) {
    const answerRemaining = (game.answerWindow.endAt - Date.now()) / 1000;

    if (answerRemaining <= 0) {
      expireAnswerWindow();
    } else {
      io.emit('answer:tick', {
        remaining: Number(answerRemaining.toFixed(2)),
        duration: ANSWER_WINDOW,
      });
    }
  }
}, 100);

// ----------------------------- خدمة الواجهة (Production) -----------------------------
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    // ملف ثابت مفقود (له امتداد) → 404 حقيقي بدل إرجاع صفحة HTML
    if (/\.[a-z0-9]{2,5}$/i.test(req.path)) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('📦 يتم خدمة الواجهة من client/dist');
}

// ----------------------------- التشغيل -----------------------------
httpServer.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  const lanIps = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const family = typeof iface.family === 'string' ? iface.family : String(iface.family);
      if ((family === 'IPv4' || family === '4') && !iface.internal) lanIps.push(iface.address);
    }
  }
  console.log('');
  console.log('  ╭──────────────────────────────────────────────╮');
  console.log('  │   مُسَابَقَة — سيرفر اللعبة يعمل الآن         │');
  console.log('  ╰──────────────────────────────────────────────╯');
  console.log(`  ➜  محلياً       : http://localhost:${PORT}`);
  if (lanIps.length) {
    console.log(`  ➜  الشبكة المحلية: http://${lanIps[0]}:${PORT}`);
  }
  console.log(`  ➜  اللاعبون     : ${PLAYERS.map((player) => player.name).join(' • ')}`);
  console.log(`  ➜  الأسئلة      : ${TOTAL_QUESTIONS} سؤالاً`);
  console.log('');
});

process.on('uncaughtException', (error) => console.error('[uncaughtException]', error));
process.on('unhandledRejection', (error) => console.error('[unhandledRejection]', error));
