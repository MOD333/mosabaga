// اختبار مهلة الإجابة (٣ ثوانٍ) — يُشغَّل ثم يُحذف
import { io } from 'socket.io-client';

const URL = 'http://localhost:3001';
let pass = 0;
let fail = 0;
const ok = (n, c, e = '') => {
  if (c) pass += 1; else fail += 1;
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  → ' + e : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (s, e, t = 6000) =>
  new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('timeout ' + e)), t);
    s.once(e, (d) => { clearTimeout(to); res(d); });
  });
const connect = () => io(URL, { transports: ['websocket'], forceNew: true });

const host = connect();
const p1 = connect();
await Promise.all([host, p1].map((s) => once(s, 'connect')));

const snap = () => new Promise((r) => host.emit('host:join', {}, r)).then((x) => x.state);

await new Promise((r) => host.emit('host:join', {}, r));
await new Promise((r) => p1.emit('player:identify', { playerId: 'abdullah-tarek' }, r));

const prepare = async () => {
  host.emit('reset_buzzers');
  await wait(120);
  host.emit('reveal_question');
  await wait(120);
  const started = once(p1, 'timer:started');
  host.emit('host:startTimer');
  await started;
  await wait(150);
};

/* ---------- 1) بدء المهلة عند الضغط ---------- */
await prepare();
const answerStarted = once(p1, 'answer:started');
await new Promise((r) => p1.emit('buzz', {}, r));
const startedEvt = await answerStarted;
ok('بدء مهلة ٣ ثوانٍ فور الضغط', startedEvt.duration === 3, `duration=${startedEvt.duration}`);

const tick = await once(p1, 'answer:tick');
ok('بث عدّاد المهلة للمهلة', tick.remaining > 0 && tick.remaining <= 3, `remaining=${tick.remaining}`);

let st = await snap();
ok('الحالة تُعلن نافذة الإجابة', st.answerWindowActive === true && st.answerDuration === 3, `active=${st.answerWindowActive}`);

/* ---------- 2) الحكم قبل انتهاء المهلة يلغيها ---------- */
const beforeCorrect = await snap();
host.emit('host:correct');
await wait(200);
st = await snap();
ok('الحكم الصحيح قبل ٣ث يلغي المهلة', st.answerWindowActive === false && st.answerExpired === false);
ok('  والطور صار reveal', st.phase === 'reveal');
ok('  والنقاط تُحتسب = الثواني المتبقية', st.players.find((p) => p.id === 'abdullah-tarek').score >= 1);

/* ---------- 3) انتهاء المهلة دون حكم ---------- */
host.emit('hard_reset');
await wait(150);
await prepare();
await new Promise((r) => p1.emit('buzz', {}, r));
const expiredEvt = once(p1, 'answer:expired', 8000);
const exp = await expiredEvt;
ok('حدث answer:expired يُبَث', exp.playerId === 'abdullah-tarek', `player=${exp.playerName}`);

st = await snap();
ok('الحالة answerExpired = true', st.answerExpired === true);
ok('  مع تحديد اللاعب المنتهي وقته', st.answerExpiredPlayerId === 'abdullah-tarek', `name=${st.answerExpiredPlayerName}`);
ok('  والمهلة توقفت', st.answerWindowActive === false);
ok('  والجرس يبقى مقفلاً', st.buzzedPlayerId === 'abdullah-tarek');

/* ---------- 4) «إعادة الوقت / إلغاء» ---------- */
const restart = once(p1, 'answer:started');
host.emit('host:resetAnswerTime');
await restart;
await wait(150);
st = await snap();
ok('إعادة الوقت تبدأ مهلة جديدة', st.answerWindowActive === true && st.answerExpired === false);

/* ---------- 5) «حساب النقطة» ---------- */
const expired2 = once(p1, 'answer:expired', 8000);
await expired2;
await wait(100);
const scoreBefore = (await snap()).players.find((p) => p.id === 'abdullah-tarek').score;
const correctEvt = once(p1, 'correct');
host.emit('host:awardExpired');
const awarded = await correctEvt;
await wait(150);
st = await snap();
ok('حساب النقطة يمنح نقاطاً رغم انتهاء الوقت', awarded.points >= 1, `points=${awarded.points}`);
ok('  والنقاط زادت فعلاً', st.players.find((p) => p.id === 'abdullah-tarek').score === scoreBefore + awarded.points);
ok('  والنافذة أُغلقت والطور reveal', st.answerWindowActive === false && st.answerExpired === false && st.phase === 'reveal');

/* ---------- 6) الإجابة الخاطئة قبل المهلة تلغيها ---------- */
host.emit('hard_reset');
await wait(150);
await prepare();
await new Promise((r) => p1.emit('buzz', {}, r));
await wait(150);
host.emit('host:wrong');
await wait(250);
st = await snap();
ok('الحكم الخاطئ يلغي المهلة', st.answerWindowActive === false && st.answerExpired === false);
ok('  واللاعب مستبعد', st.players.find((p) => p.id === 'abdullah-tarek').lockedOut === true);

/* ---------- 7) الحماية: غير المضيف ---------- */
const hacker = connect();
await once(hacker, 'connect');
hacker.emit('host:awardExpired');
hacker.emit('host:resetAnswerTime');
hacker.emit('buzz');
await wait(250);
st = await snap();
ok('غير المضيف لا يستطيع استخدام قرارات المهلة', st.players.find((p) => p.id === 'abdullah-tarek').lockedOut === true);

console.log(`\n${pass}/${pass + fail} نجحت`);
[host, p1, hacker].forEach((s) => s.close());
process.exit(fail ? 1 : 0);
