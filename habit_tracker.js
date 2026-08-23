// ── READING HABIT TRACKER ────────────────────────────────────────────────
// Self-contained module. Uses the global `sb` client and `currentUser` set
// by app.js. Only ever touches elements inside #habitCard — never renders
// into #bookGrid-reading, so it's untouched by renderGrid()/_swipePreRenderAll().

let habitAnsweredToday = null; // null | true | false
let habitStreak = 0;
let habitLoadToken = 0; // guards against out-of-order loadHabitTracker() calls
let habitViewYear = new Date().getFullYear();
let habitViewMonth = new Date().getMonth(); // 0-indexed
let habitMonthCache = {}; // 'YYYY-MM-DD' -> boolean, for the currently viewed month

const HABIT_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HABIT_DOW = ['M','T','W','T','F','S','S'];

function habitTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function habitFmtDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── LOAD ──
async function loadHabitTracker() {
  if (!currentUser) return;
  const myToken = ++habitLoadToken; // this call "owns" the result only if still latest when it resolves
  const todayIso = habitTodayIso();
  const dateEl = document.getElementById('habitDate');
  if (dateEl) dateEl.textContent = habitFmtDate(new Date());

  habitViewYear = new Date().getFullYear();
  habitViewMonth = new Date().getMonth();

  let resolvedAnswered = null;
  let resolvedStreak = 0;
  try {
    const [{ data: todayRow }, streak] = await Promise.all([
      sb.from('reading_checkins').select('answered').eq('user_id', currentUser.id).eq('date', todayIso).maybeSingle(),
      habitComputeStreak()
    ]);
    resolvedAnswered = todayRow ? todayRow.answered : null;
    resolvedStreak = streak;
  } catch {
    resolvedAnswered = null;
    resolvedStreak = 0;
  }

  if (myToken !== habitLoadToken) return; // a newer load started — discard this stale result

  habitAnsweredToday = resolvedAnswered;
  habitStreak = resolvedStreak;
  habitRenderHead();
  await habitBuildCalendar();
}

// ── STREAK ──
async function habitComputeStreak() {
  if (!currentUser) return 0;
  const { data } = await sb.from('reading_checkins')
    .select('date')
    .eq('user_id', currentUser.id)
    .eq('answered', true)
    .order('date', { ascending: false })
    .limit(400);
  if (!data || !data.length) return 0;

  const set = new Set(data.map(r => r.date));

  function walkFrom(startDate) {
    let streak = 0;
    let cursor = new Date(startDate);
    for (;;) {
      const iso = cursor.toISOString().slice(0, 10);
      if (set.has(iso)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return streak;
  }

  const todayIso = habitTodayIso();
  if (set.has(todayIso)) return walkFrom(new Date());
  // Grace: today not yet answered — show streak as of yesterday so it
  // doesn't look like it already broke before they've even answered.
  return walkFrom(new Date(Date.now() - 86400000));
}

// ── HEAD RENDER ──
function habitRenderHead() {
  const question = document.getElementById('habitQuestion');
  const actions = document.getElementById('habitActions');
  const toggleRight = document.getElementById('habitToggleRight');
  if (!question || !actions || !toggleRight) return;

  if (habitAnsweredToday === null) {
    question.innerHTML = 'Have you read today?';
    actions.style.display = '';
    toggleRight.innerHTML = habitStreak > 0
      ? `<span class="habit-streak-chip"><span class="habit-flame">🔥</span>${habitStreak}</span>`
      : '';
  } else if (habitAnsweredToday === true) {
    question.innerHTML = `<span class="habit-check-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7"/></svg></span>Read today`;
    actions.style.display = 'none';
    toggleRight.innerHTML = `
      <span class="habit-streak-chip"><span class="habit-flame">🔥</span>${habitStreak} day streak</span>
      <svg class="habit-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>`;
  } else {
    question.textContent = 'Not yet today';
    actions.style.display = 'none';
    toggleRight.innerHTML = `
      <span class="habit-streak-chip"><span class="habit-flame">🔥</span>${habitStreak} day streak</span>
      <svg class="habit-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>`;
  }
}

// ── MARK TODAY ──
async function habitMarkToday(val) {
  if (!currentUser) return;
  const todayIso = habitTodayIso();
  const prevAnswered = habitAnsweredToday;
  const prevStreak = habitStreak;

  habitAnsweredToday = val;
  habitRenderHead();

  const { error } = await sb.from('reading_checkins').upsert(
    { user_id: currentUser.id, date: todayIso, answered: val, source: 'manual' },
    { onConflict: 'user_id,date' }
  );

  if (error) {
    habitAnsweredToday = prevAnswered;
    habitStreak = prevStreak;
    habitRenderHead();
    if (typeof showToast === 'function') showToast('Could not save — try again');
    return;
  }

  habitStreak = await habitComputeStreak();
  habitMonthCache[todayIso] = val;
  habitRenderHead();
  habitRenderCalendarGrid();
  habitUpdateMonthStat();

  if (val) {
    setTimeout(() => {
      const card = document.getElementById('habitCard');
      if (card) card.classList.add('expanded');
    }, 260);
  }
}

// ── EXPAND / COLLAPSE ──
function habitToggleExpand() {
  const card = document.getElementById('habitCard');
  if (card) card.classList.toggle('expanded');
}

// ── CALENDAR ──
function habitDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function habitFirstWeekdayMon(y, m) { const d = new Date(y, m, 1).getDay(); return (d + 6) % 7; }

async function habitBuildCalendar() {
  const monthEl = document.getElementById('habitCalMonth');
  const nextBtn = document.getElementById('habitNextMonth');
  if (monthEl) monthEl.textContent = `${HABIT_MONTHS[habitViewMonth]} ${habitViewYear}`;
  const now = new Date();
  const isCurrentMonth = (habitViewYear === now.getFullYear() && habitViewMonth === now.getMonth());
  if (nextBtn) nextBtn.disabled = isCurrentMonth;

  habitMonthCache = {};
  if (currentUser) {
    const start = `${habitViewYear}-${String(habitViewMonth + 1).padStart(2, '0')}-01`;
    const endDay = habitDaysInMonth(habitViewYear, habitViewMonth);
    const end = `${habitViewYear}-${String(habitViewMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    try {
      const { data } = await sb.from('reading_checkins')
        .select('date, answered')
        .eq('user_id', currentUser.id)
        .gte('date', start).lte('date', end);
      (data || []).forEach(row => { habitMonthCache[row.date] = row.answered; });
    } catch { /* silent — calendar just renders empty */ }
  }

  habitRenderCalendarGrid();
  habitUpdateMonthStat();
}

function habitRenderCalendarGrid() {
  const grid = document.getElementById('habitCalGrid');
  if (!grid) return;
  grid.innerHTML = '';

  HABIT_DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const lead = habitFirstWeekdayMon(habitViewYear, habitViewMonth);
  for (let i = 0; i < lead; i++) {
    const pad = document.createElement('div');
    pad.className = 'cal-cell pad';
    grid.appendChild(pad);
  }

  const now = new Date();
  const isCurrentMonth = (habitViewYear === now.getFullYear() && habitViewMonth === now.getMonth());
  const total = habitDaysInMonth(habitViewYear, habitViewMonth);

  for (let day = 1; day <= total; day++) {
    const iso = `${habitViewYear}-${String(habitViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isCurrentMonth && day === now.getDate();
    const isFuture = isCurrentMonth && day > now.getDate();
    const isRead = habitMonthCache[iso] === true;

    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (isRead ? ' read' : '') + (isToday ? ' today' : '') + (isFuture ? ' future' : '');
    cell.innerHTML = `<div class="cal-fill"></div><span class="cal-num">${day}</span>`;
    grid.appendChild(cell);
  }
}

function habitUpdateMonthStat() {
  const el = document.getElementById('habitMonthStat');
  const streakEl = document.getElementById('habitStreakStat');
  if (streakEl) streakEl.textContent = habitStreak;
  if (!el) return;
  const count = Object.values(habitMonthCache).filter(v => v === true).length;
  el.textContent = count;
}

async function habitShiftMonth(dir) {
  habitViewMonth += dir;
  if (habitViewMonth < 0) { habitViewMonth = 11; habitViewYear--; }
  if (habitViewMonth > 11) { habitViewMonth = 0; habitViewYear++; }
  await habitBuildCalendar();
}
