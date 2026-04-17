/* =====================================================
   calendar.js — Calendar Module
   ===================================================== */

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAY_NAMES_SHORT = ['Mo','Di','Mi','Do','Fr','Sa','So'];

let calEventModalState = { editing: null }; // editing: event id or null

// Track planner horizontal scroll
let ysScrollLeft = null;
let ysScrollYear = null;

function renderCalendarPage() {
  const page = document.getElementById('calendar-page');
  if (!page) return;
  // Header: view switcher + add button
  renderCalendarHeader();

  const view = STATE.ui.calendarView;
  let html = '';

  if (view === 'week')  html = renderWeekView();
  else if (view === 'day')   html = renderDayViewHTML();
  else if (view === 'year-summary') html = renderYearSummaryView();
  else                       html = renderMonthView();

  page.innerHTML = html;
  attachCalendarEvents();
  
  if (view === 'year-summary') {
    const container = page.querySelector('.ys-container');
    const calDate = parseLocalDate(STATE.ui.calendarDate);
    const currentYear = calDate.getFullYear();
    const today = new Date();

    if (container) {
      if (ysScrollYear === currentYear && ysScrollLeft !== null) {
        container.scrollLeft = ysScrollLeft;
      } else {
        if (currentYear === today.getFullYear()) {
          const col = page.querySelector(`.ys-month-col[data-month="${today.getMonth()}"]`);
          const todayCell = page.querySelector('.ys-cell.today');
          if (col) {
            requestAnimationFrame(() => {
              // Scroll horizontally to today's month column
              container.scrollLeft = col.offsetLeft;
              ysScrollLeft = container.scrollLeft;
              ysScrollYear = currentYear;

              // Scroll vertically so today's cell is near the top
              if (todayCell) {
                const pageContainer = document.getElementById('page-container');
                if (pageContainer) {
                  const cellTop = todayCell.getBoundingClientRect().top
                    - pageContainer.getBoundingClientRect().top
                    + pageContainer.scrollTop;
                  pageContainer.scrollTop = Math.max(0, cellTop - 8);
                }
              }
            });
          }
        } else {
          ysScrollLeft = 0;
          ysScrollYear = currentYear;
        }
      }
      container.addEventListener('scroll', () => {
        ysScrollLeft = container.scrollLeft;
      }, { passive: true });
    }
  } else {
    ysScrollLeft = null;
    ysScrollYear = null;
  }
}

window.resetCalendarScroll = function() {
  ysScrollLeft = null;
  ysScrollYear = null;
};

function renderCalendarHeader() {
  const views = [
    {id:'year-summary', label:'Planer'},
    {id:'month', label:'Monat'},
    {id:'week',  label:'Woche'},
    {id:'day',   label:'Tag'},
  ];
  let switcher = `<div class="header-view-switcher">`;
  for (const v of views) {
    switcher += `<button class="view-btn${STATE.ui.calendarView===v.id?' active':''}" data-view="${v.id}">${v.label}</button>`;
  }
  switcher += `</div>`;

  const calDate = parseLocalDate(STATE.ui.calendarDate);
  const monthLabel = `${MONTH_NAMES[calDate.getMonth()]} ${calDate.getFullYear()}`;

  document.getElementById('header-title').textContent = monthLabel;
  const ha = document.getElementById('header-actions');
  ha.innerHTML = `
    ${switcher}
    <button class="header-btn" id="cal-add-btn" title="Termin hinzufügen">
      <i class="ph-bold ph-plus" style="font-size: 24px;"></i>
    </button>
  `;
}

// ── Month View ────────────────────────────────────────
function renderMonthView() {
  const calDate = parseLocalDate(STATE.ui.calendarDate);
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const today = new Date();

  const monthEvents = getEventsForMonth(year, month);

  // Build a map: dateStr -> events[]
  const eventsByDay = {};
  for (const ev of monthEvents) {
    const key = ev.start.slice(0,10);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  }

  // Header row (day names)
  let html = `<div class="calendar-nav">
    <button class="cal-nav-btn" id="cal-prev">&#8249;</button>
    <span class="month-label">${MONTH_NAMES[month]} ${year}</span>
    <button class="cal-nav-btn" id="cal-next">&#8250;</button>
  </div>
  <div class="month-grid-header"><span class="month-kw-header">KW</span>`;
  for (const d of DAY_NAMES_SHORT) html += `<span>${d}</span>`;
  html += `</div><div class="month-grid">`;

  // First day of month (0=Sun)
  const rawFirstDay = new Date(year, month, 1).getDay();
  const firstDay = (rawFirstDay + 6) % 7; // 0=Mon, 6=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  let daysHtmlBlocks = [];
  // Leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    daysHtmlBlocks.push({ y: year, m: month-1, d: d, cellHtml: buildDayCell(year, month-1, d, true, eventsByDay, today) });
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    daysHtmlBlocks.push({ y: year, m: month, d: d, cellHtml: buildDayCell(year, month, d, false, eventsByDay, today) });
  }
  // Trailing days
  const total = firstDay + daysInMonth;
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= trailing; d++) {
    daysHtmlBlocks.push({ y: year, m: month+1, d: d, cellHtml: buildDayCell(year, month+1, d, true, eventsByDay, today) });
  }

  for (let i = 0; i < daysHtmlBlocks.length; i += 7) {
    const week = daysHtmlBlocks.slice(i, i+7);
    const monday = new Date(week[0].y, week[0].m, week[0].d);
    const kw = getWeekNumber(monday);
    html += `<div class="month-kw">${kw}</div>`;
    for (const wd of week) html += wd.cellHtml;
  }

  html += `</div>`;

  // Day event list if a day is selected
  const sel = STATE.ui.selectedDay;
  if (sel) {
    const dayEvents = getEventsForDay(sel);
    html += renderDayEventList(sel, dayEvents);
  }

  return html;
}

function buildDayCell(year, month, day, otherMonth, eventsByDay, today) {
  const d = new Date(year, month, day);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const isToday = isSameDay(d, today);
  const isSel   = STATE.ui.selectedDay === dateStr;
  const holiday = getHoliday(dateStr);
  const evs     = eventsByDay[dateStr] || [];

  let cls = 'cal-day';
  if (otherMonth) cls += ' other-month';
  if (isToday) cls += ' today';
  if (isSel)  cls += ' selected';

  let inner = `<div class="${String(day) + (holiday ? ' holiday-num' : '')} day-num">${day}</div>`;
  if (holiday) inner += `<div class="holiday-label">${holiday}</div>`;

  inner += `<div class="events-strip">`;
  const maxCalEvents = 2;
  const show = evs.slice(0, maxCalEvents);
  const moreCount = evs.length - maxCalEvents;

  for (const ev of show) {
    inner += `<div class="event-pill" style="background:${getMemberColor(ev.memberId)}">${ev.title}</div>`;
  }
  if (moreCount > 0) {
    inner += `<div class="event-pill-more">+${moreCount} weitere</div>`;
  }
  inner += `</div>`;

  return `<div class="${cls}" data-date="${dateStr}">${inner}</div>`;
}

// ── Day Event List ────────────────────────────────────
function renderDayEventList(dateStr, events) {
  const d = parseLocalDate(dateStr);
  const label = formatDate(d, {weekday:'long', day:'numeric', month:'long'});
  let html = `<div class="day-event-list">
    <div class="day-event-list-header">${label}</div>`;
  if (events.length === 0) {
    html += `<p class="text-muted" style="padding:8px 0">Keine Termine an diesem Tag</p>`;
  }
  for (const ev of events) {
    const color = getMemberColor(ev.memberId);
    const name  = getMemberName(ev.memberId);
    // Multi-day label e.g. "Tag 2/4"
    const multiLabel = ev._isMultiDay
      ? `<span style="font-size:10px;opacity:0.7;margin-left:4px">(Tag ${ev._dayIndex+1}/${ev._totalDays})</span>`
      : '';
    // Show original start–end for multi-day events, not the per-day copy times
    const timeStr = ev._isMultiDay
      ? `${ev._origStart.slice(0,10)} – ${ev._origEnd.slice(0,10)}`
      : `${formatTime(ev.start)} – ${formatTime(ev.end)}`;
    html += `<div class="event-list-item" data-evid="${ev.id}" data-series="${ev._seriesId||''}">
      <div class="ev-color-bar" style="background:${color}"></div>
      <div class="ev-list-info">
        <div class="ev-list-title">${ev.title}${multiLabel}</div>
        <div class="ev-list-time">${timeStr}</div>
        <div class="ev-list-member">${name}</div>
      </div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

// ── Week View ─────────────────────────────────────────
function renderWeekView() {
  const calDate = parseLocalDate(STATE.ui.calendarDate);
  const dow = calDate.getDay();
  const monday = new Date(calDate);
  monday.setDate(calDate.getDate() - ((dow+6)%7));

  const days = [];
  for (let i=0;i<7;i++) { const d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d); }

  const today = new Date();
  const endOfWeek = days[6];
  let monthStr = `${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`;
  if (monday.getMonth() !== endOfWeek.getMonth()) {
    if (monday.getFullYear() !== endOfWeek.getFullYear()) {
      monthStr = `${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()} - ${MONTH_NAMES[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
    } else {
      monthStr = `${MONTH_NAMES[monday.getMonth()]} - ${MONTH_NAMES[endOfWeek.getMonth()]} ${monday.getFullYear()}`;
    }
  }

  // Pre-compute events per day (keyed by dateStr)
  const weekEvsByDay = {};
  for (const d of days) {
    const ds = localDateStr(d);
    weekEvsByDay[ds] = getEventsForDay(ds);
  }

  let html = `<div class="calendar-nav">
    <button class="cal-nav-btn" id="cal-prev">&#8249;</button>
    <span class="month-label">${monthStr}</span>
    <button class="cal-nav-btn" id="cal-next">&#8250;</button>
  </div><div class="week-view">`;

  // Header row
  html += `<div class="week-header"><div class="week-kw">KW<br/>${getWeekNumber(monday)}</div>`;
  for (const d of days) {
    const isT = isSameDay(d,today);
    html += `<div class="week-header-day${isT?' today':''}"><span class="wh-num">${d.getDate()}</span>${DAY_NAMES_SHORT[(d.getDay()+6)%7]}</div>`;
  }
  html += `</div>`;

  // ── All-day / multi-day banner row ──
  const hasAnyAllDay = days.some(d => weekEvsByDay[localDateStr(d)].some(ev => ev._isMultiDay));
  if (hasAnyAllDay) {
    html += `<div class="week-allday-row"><div class="week-hour-label" style="font-size:9px;color:var(--text-muted)">ganzt.</div>`;
    for (const d of days) {
      const ds = localDateStr(d);
      const allDayEvs = weekEvsByDay[ds].filter(ev => ev._isMultiDay);
      html += `<div class="week-allday-cell">`;
      for (const ev of allDayEvs) {
        const dayLabel = `${ev._dayIndex+1}/${ev._totalDays}`;
        html += `<div class="week-allday-event" style="background:${getMemberColor(ev.memberId)}" data-evid="${ev.id}">${ev.title} <span style="opacity:.7;font-size:9px">${dayLabel}</span></div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  html += `<div class="week-body">`;

  // 24 hour rows
  for (let h=0; h<24; h++) {
    html += `<div class="week-hour-row">`;
    html += `<div class="week-hour-label">${String(h).padStart(2,'0')}:00</div>`;
    for (const d of days) {
      const ds = localDateStr(d);
      html += `<div class="week-cell" data-date="${ds}" data-hour="${h}">`;
      // Only timed (non-multi-day) events go in the hourly grid
      const evs = weekEvsByDay[ds].filter(ev => {
        if (ev._isMultiDay) return false;
        const startH = parseInt(ev.start.slice(11,13),10);
        return startH === h;
      });
      for (const ev of evs) {
        const dur = Math.max(1, getEventDurationH(ev));
        const top = (parseInt(ev.start.slice(14,16),10)/60)*48;
        html += `<div class="week-event" style="background:${getMemberColor(ev.memberId)};top:${top}px;height:${dur*48-2}px" data-evid="${ev.id}">${ev.title}</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }
  html += `</div></div>`;
  return html;
}

function getEventDurationH(ev) {
  try {
    const s = new Date(ev.start.replace('T',' ')+':00');
    const e = new Date(ev.end.replace('T',' ')+':00');
    return (e - s) / 3600000;
  } catch { return 1; }
}

function getWeekNumber(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
}

// ── Day View ──────────────────────────────────────────
function renderDayViewHTML() {
  const dateStr = STATE.ui.calendarDate;
  const d = parseLocalDate(dateStr);
  const today = new Date();
  const label = formatDate(d, {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  let html = `<div class="calendar-nav">
    <button class="cal-nav-btn" id="cal-prev">&#8249;</button>
    <span class="month-label">${label}</span>
    <button class="cal-nav-btn" id="cal-next">&#8250;</button>
  </div><div class="day-view">`;

  const dayEvents = getEventsForDay(dateStr);
  const allDayEvs  = dayEvents.filter(ev => ev._isMultiDay);
  const timedEvs   = dayEvents.filter(ev => !ev._isMultiDay);

  // ── All-day / multi-day banner ──
  if (allDayEvs.length > 0) {
    html += `<div class="day-allday-banner">`;
    for (const ev of allDayEvs) {
      const dayLabel = `Tag ${ev._dayIndex+1}/${ev._totalDays}`;
      html += `<div class="day-allday-event" data-evid="${ev.id}" style="background:${getMemberColor(ev.memberId)}">
        <span>${ev.title}</span>
        <span class="day-allday-tag">${dayLabel}</span>
      </div>`;
    }
    html += `</div>`;
  }

  for (let h=0; h<24; h++) {
    const evs = timedEvs.filter(ev => parseInt(ev.start.slice(11,13),10) === h);
    html += `<div class="day-time-row">
      <div class="day-time-label">${String(h).padStart(2,'0')}:00</div>
      <div class="day-time-slot" data-date="${dateStr}" data-hour="${h}">`;
    for (const ev of evs) {
      const dur = Math.max(0.5, getEventDurationH(ev));
      const topPx = (parseInt(ev.start.slice(14,16),10)/60)*56;
      html += `<div class="day-event-block" data-evid="${ev.id}" style="background:${getMemberColor(ev.memberId)};top:${topPx}px;height:${dur*56-4}px">
        <div>${ev.title}</div>
        <div class="day-event-time">${formatTime(ev.start)} – ${formatTime(ev.end)}</div>
      </div>`;
    }
    html += `</div></div>`;
  }
  html += `</div>`;
  return html;
}


// ── Year Summary View ─────────────────────────────────
function renderYearSummaryView() {
  const calDate = parseLocalDate(STATE.ui.calendarDate);
  const year = calDate.getFullYear();
  const today = new Date();

  // Get all events for the year to avoid fetching repeatedly
  const viewStart = new Date(year, 0, 1);
  const viewEnd   = new Date(year, 11, 31, 23, 59, 59);
  const allEvs = [];
  for (const ev of STATE.events) {
    allEvs.push(...expandRecurring(ev, viewStart, viewEnd));
  }
  const eventsByDay = {};
  for (const ev of allEvs) {
    const key = ev.start.slice(0,10);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  }

  const zoomFactor = STATE.ui.plannerZoom || 1.0;

  let html = `<div class="calendar-nav">
    <button class="cal-nav-btn" id="cal-prev">&#8249;</button>
    <div class="ys-header-center">
      <span class="month-label">${year} Jahresplaner</span>
      <div class="ys-zoom-controls">
        <button class="ys-zoom-btn" id="ys-zoom-out" title="Verkleinern"><i class="ph-bold ph-minus"></i></button>
        <span class="ys-zoom-level">${Math.round(zoomFactor * 100)}%</span>
        <button class="ys-zoom-btn" id="ys-zoom-in" title="Vergrößern"><i class="ph-bold ph-plus"></i></button>
      </div>
    </div>
    <button class="cal-nav-btn" id="cal-next">&#8250;</button>
  </div>
  <div class="ys-container" style="--ys-zoom: ${zoomFactor};">
    <div class="ys-grid">`;

  // 12 columns
  for (let m = 0; m < 12; m++) {
    const daysInM = new Date(year, m+1, 0).getDate();
    
    html += `<div class="ys-month-col" data-month="${m}">
      <div class="ys-month-name">${MONTH_NAMES[m]}</div>`;

    for (let d = 1; d <= 31; d++) {
      if (d > daysInM) {
        html += `<div class="ys-cell empty"></div>`;
        continue;
      }
      
      const dateObj = new Date(year, m, d);
      const ds = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isT = isSameDay(dateObj, today);
      const hol = getHoliday(ds);
      
      let evs = eventsByDay[ds] || [];
      // Sort events by start time
      evs.sort((a,b) => a.start.localeCompare(b.start));

      let cls = 'ys-cell';
      if (isT) cls += ' today';
      else if (dow === 6) cls += ' saturday';
      else if (dow === 0) cls += ' sunday';

      let inner = `<div class="ys-cell-top">`;
      inner += `<div class="ys-cell-date">${DAY_NAMES_SHORT[(dow+6)%7]} ${String(d).padStart(2,'0')}</div>`;
      
      // Calendar Week only on Mondays (dow === 1)
      if (dow === 1) {
        inner += `<div class="ys-cell-kw">KW${getWeekNumber(dateObj)}</div>`;
      }
      inner += `</div>`; // end ys-cell-top

      if (hol) {
        inner += `<div class="ys-cell-hol">${hol}</div>`;
      }

      const maxEvents = 1;
      const showEvs = evs.slice(0, maxEvents);
      const moreCount = evs.length - maxEvents;

      for (const ev of showEvs) {
        const c = getMemberColor(ev.memberId);
        inner += `<div class="ys-event" style="background:${c}CC; border-left: 3px solid ${c};" data-evid="${ev.id}">
          <div class="ys-event-time">${formatTime(ev.start)}</div>
          <div class="ys-event-title">${ev.title}</div>
        </div>`;
      }
      
      if (moreCount > 0) {
        inner += `<div class="ys-event-more">+${moreCount} weitere</div>`;
      }

      html += `<div class="${cls}" data-date="${ds}">${inner}</div>`;
    }
    
    html += `</div>`; // end month col
  }

  html += `</div></div>`;

  return html;
}

// ── Day-List Bottom Sheet (Planer) ────────────────────
// Creates a fixed-position bottom sheet in <body> so the close
// button is always visible no matter how far the user has scrolled.
function openDayListSheet(dateStr) {
  let sheet = document.getElementById('day-list-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'day-list-sheet';
    document.body.appendChild(sheet);
  }

  const events = getEventsForDay(dateStr);
  const d = parseLocalDate(dateStr);
  const label = formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' });

  let evHtml = '';
  if (events.length === 0) {
    evHtml = `<p style="padding:12px 0;color:var(--text-muted)">Keine Termine an diesem Tag</p>`;
  }
  for (const ev of events) {
    const color = getMemberColor(ev.memberId);
    const name  = getMemberName(ev.memberId);
    const multiLabel = ev._isMultiDay
      ? `<span style="font-size:10px;opacity:0.7;margin-left:4px">(Tag ${ev._dayIndex+1}/${ev._totalDays})</span>`
      : '';
    const timeStr = ev._isMultiDay
      ? `${ev._origStart.slice(0,10)} - ${ev._origEnd.slice(0,10)}`
      : `${formatTime(ev.start)} - ${formatTime(ev.end)}`;
    evHtml += `<div class="event-list-item dls-ev-item" data-evid="${ev.id}">
      <div class="ev-color-bar" style="background:${color}"></div>
      <div class="ev-list-info">
        <div class="ev-list-title">${ev.title}${multiLabel}</div>
        <div class="ev-list-time">${timeStr}</div>
        <div class="ev-list-member">${name}</div>
      </div>
    </div>`;
  }

  sheet.innerHTML = `
    <div class="dls-backdrop"></div>
    <div class="dls-panel">
      <div class="dls-header">
        <span class="dls-title">${label}</span>
        <button class="dls-close" id="dls-close-btn" aria-label="Schliessen">
          <i class="ph-bold ph-x" style="font-size:18px"></i>
        </button>
      </div>
      <div class="dls-body">${evHtml}</div>
    </div>`;

  sheet.className = 'dls-open';

  const close = () => { sheet.className = 'dls-hidden'; };
  sheet.querySelector('.dls-backdrop').addEventListener('click', close);
  sheet.querySelector('#dls-close-btn').addEventListener('click', close);

  sheet.querySelectorAll('.dls-ev-item').forEach(item => {
    item.addEventListener('click', () => {
      close();
      openEventModal(item.dataset.evid);
    });
  });
}


// ── Attach Calendar Event Listeners ──────────────────
function attachCalendarEvents() {
  const page = document.getElementById('calendar-page');
  if (!page) return;

  // Nav prev/next
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  if (prevBtn) prevBtn.addEventListener('click', () => navigateCalendar(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateCalendar(1));

  // View switcher (in header)
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ui.calendarView = btn.dataset.view;
      // Always reset to today when switching views
      const today = new Date();
      STATE.ui.calendarDate = localDateStr(today);
      STATE.ui.selectedDay = btn.dataset.view === 'day' ? localDateStr(today) : null;
      saveState();
      renderCalendarPage();
    });
  });

  // Add button
  const addBtn = document.getElementById('cal-add-btn');
  if (addBtn) addBtn.addEventListener('click', () => {
    const view = STATE.ui.calendarView;
    if (view === 'year-summary' || view === 'month') {
      const sel = STATE.ui.selectedDay;
      if (!sel) {
        showToast('Bitte wähle zuerst einen Tag aus');
        return;
      }
      openEventModalAtTime(sel, 9);
    } else {
      openEventModal(null);
    }
  });

  // Day cells (month view)
  page.querySelectorAll('.cal-day').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.event-pill')) return;
      const dateStr = cell.dataset.date;
      if (STATE.ui.calendarView === 'month') {
        STATE.ui.selectedDay = STATE.ui.selectedDay === dateStr ? null : dateStr;
        saveState();
        renderCalendarPage();
      }
    });
  });

  // Day cells: event pill click
  page.querySelectorAll('.event-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const cell = e.target.closest('.cal-day');
      if (cell) {
        STATE.ui.selectedDay = cell.dataset.date;
        STATE.ui.calendarView = 'month';
        saveState();
        renderCalendarPage();
      }
    });
  });

  // Event list items
  page.querySelectorAll('.event-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const evId = item.dataset.evid;
      openEventModal(evId);
    });
  });

  // Week/Day cell clicks
  page.querySelectorAll('.week-cell, .day-time-slot').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.week-event,.day-event-block')) return;
      const dateStr = cell.dataset.date;
      const hour    = cell.dataset.hour || '09';
      STATE.ui.selectedDay = dateStr;
      openEventModalAtTime(dateStr, parseInt(hour,10));
    });
  });

  page.querySelectorAll('.week-event, .day-event-block, .week-allday-event, .day-allday-event').forEach(ev => {
    ev.addEventListener('click', (e) => {
      e.stopPropagation();
      openEventModal(ev.dataset.evid);
    });
  });

  // Year Summary cell clicks
  page.querySelectorAll('.ys-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.ys-event')) return;
      const dateStr = cell.dataset.date;
      STATE.ui.selectedDay = dateStr;

      // Highlight selected cell
      page.querySelectorAll('.ys-cell.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');

      // Open fixed bottom sheet with the day's events
      openDayListSheet(dateStr);
    });
  });
        
        // Attach event listeners inside the modal
        dlBody.querySelectorAll('.event-list-item').forEach(item => {
          item.addEventListener('click', () => {
            const evId = item.dataset.evid;
            dlModal.classList.add('hidden'); // Close day list
            openEventModal(evId); // Open edit modal
          });
        });
        
        document.getElementById('day-list-close').onclick = () => {
          dlModal.classList.add('hidden');
        };
      }
    });
  });

  page.querySelectorAll('.ys-event').forEach(ev => {
    ev.addEventListener('click', (e) => {
      e.stopPropagation();
      openEventModal(ev.dataset.evid);
    });
  });

  // Zoom buttons
  const zoomInBtn = document.getElementById('ys-zoom-in');
  const zoomOutBtn = document.getElementById('ys-zoom-out');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      STATE.ui.plannerZoom = Math.min((STATE.ui.plannerZoom || 1.0) + 0.1, 2.0);
      saveState();
      renderCalendarPage();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      STATE.ui.plannerZoom = Math.max((STATE.ui.plannerZoom || 1.0) - 0.1, 0.5);
      saveState();
      renderCalendarPage();
    });
  }
}

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function navigateCalendar(dir) {
  const view = STATE.ui.calendarView;
  // In day view, navigate from the currently displayed day
  const base = (view === 'day' && STATE.ui.selectedDay) ? STATE.ui.selectedDay : STATE.ui.calendarDate;
  const calDate = parseLocalDate(base);
  if (view === 'year-summary') calDate.setFullYear(calDate.getFullYear() + dir);
  else if (view === 'month') calDate.setMonth(calDate.getMonth() + dir);
  else if (view === 'week')  calDate.setDate(calDate.getDate() + dir*7);
  else if (view === 'day')   calDate.setDate(calDate.getDate() + dir);
  const newDateStr = localDateStr(calDate);
  STATE.ui.calendarDate = newDateStr;
  if (view === 'day') STATE.ui.selectedDay = newDateStr;
  saveState();
  renderCalendarPage();
}

// ── Event Modal ────────────────────────────────────────
function openEventModal(evId) {
  const baseId = evId ? evId.split('_')[0] : null;
  calEventModalState.editing = baseId;
  const modal    = document.getElementById('event-modal');
  const overlay  = document.getElementById('event-modal-overlay');
  const isNew    = !baseId || !STATE.events.find(e=>e.id===baseId);

  document.getElementById('event-modal-title').textContent = isNew ? 'Neuer Termin' : 'Termin bearbeiten';
  document.getElementById('ev-delete-btn').classList.toggle('hidden', isNew);

  // Populate member select
  const memberSel = document.getElementById('ev-member');
  memberSel.innerHTML = STATE.members.map(m =>
    `<option value="${m.id}">${m.name}</option>`
  ).join('');

  if (!isNew) {
    const ev = STATE.events.find(e=>e.id===baseId);
    if (!ev) return;
    document.getElementById('ev-title').value = ev.title;
    document.getElementById('ev-start').value = ev.start;
    document.getElementById('ev-end').value   = ev.end;
    document.getElementById('ev-recurrence').value = ev.recurrence || 'none';
    memberSel.value = ev.memberId;
    // Show scope if recurring
    const isSeries = ev.recurrence && ev.recurrence !== 'none';
    document.getElementById('ev-scope-group').classList.toggle('hidden', !isSeries);
  } else {
    const now = new Date();
    const def = toDatetimeLocal(now);
    now.setHours(now.getHours()+1);
    const defEnd = toDatetimeLocal(now);
    document.getElementById('ev-title').value = '';
    document.getElementById('ev-start').value = def;
    document.getElementById('ev-end').value   = defEnd;
    document.getElementById('ev-recurrence').value = 'none';
    memberSel.value = STATE.members[0]?.id || '';
    document.getElementById('ev-scope-group').classList.add('hidden');
  }

  overlay.classList.remove('hidden');
}

function openEventModalAtTime(dateStr, hour) {
  calEventModalState.editing = null;
  const start = new Date(parseLocalDate(dateStr));
  start.setHours(hour, 0);
  const end = new Date(start); end.setHours(hour+1,0);
  const overlay = document.getElementById('event-modal-overlay');
  document.getElementById('event-modal-title').textContent = 'Neuer Termin';
  document.getElementById('ev-delete-btn').classList.add('hidden');
  document.getElementById('ev-title').value = '';
  document.getElementById('ev-start').value = toDatetimeLocal(start);
  document.getElementById('ev-end').value   = toDatetimeLocal(end);
  document.getElementById('ev-recurrence').value = 'none';
  document.getElementById('ev-scope-group').classList.add('hidden');
  const sel = document.getElementById('ev-member');
  sel.innerHTML = STATE.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  sel.value = STATE.members[0]?.id || '';
  overlay.classList.remove('hidden');
}

function closeEventModal() {
  document.getElementById('event-modal-overlay').classList.add('hidden');
  calEventModalState.editing = null;
}

function saveEvent() {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) { showToast('Bitte Titel eingeben'); return; }
  const start = document.getElementById('ev-start').value;
  const end   = document.getElementById('ev-end').value;
  const memberId   = document.getElementById('ev-member').value;
  const recurrence = document.getElementById('ev-recurrence').value;

  const evId = calEventModalState.editing;
  let savedEvent;
  if (evId && STATE.events.find(e=>e.id===evId)) {
    // Edit existing
    const idx = STATE.events.findIndex(e=>e.id===evId);
    STATE.events[idx] = { ...STATE.events[idx], title, start, end, memberId, recurrence };
    savedEvent = STATE.events[idx];
  } else {
    // New event
    const seriesId = recurrence !== 'none' ? uid() : null;
    savedEvent = { id: uid(), title, start, end, memberId, recurrence, seriesId };
    STATE.events.push(savedEvent);
  }
  saveState();
  // Push to Supabase
  if (window.SupabaseSync) SupabaseSync.upsertEvent(savedEvent);
  closeEventModal();
  renderCalendarPage();
  showToast('Termin gespeichert ✓');
}

function deleteEvent() {
  const evId = calEventModalState.editing;
  if (!evId) return;
  const scope = document.querySelector('input[name="ev-scope"]:checked')?.value || 'this';
  const ev = STATE.events.find(e=>e.id===evId);
  if (!ev) return;
  // Determine which event IDs to delete in Supabase
  const idsToDelete = [];
  if (scope === 'all' && ev.seriesId) {
    STATE.events.filter(e => e.seriesId === ev.seriesId || e.id === evId).forEach(e => idsToDelete.push(e.id));
    STATE.events = STATE.events.filter(e => e.seriesId !== ev.seriesId && e.id !== evId);
  } else {
    idsToDelete.push(evId);
    STATE.events = STATE.events.filter(e => e.id !== evId);
  }
  saveState();
  // Push deletes to Supabase
  if (window.SupabaseSync) idsToDelete.forEach(id => SupabaseSync.deleteEvent(id));
  closeEventModal();
  renderCalendarPage();
  showToast('Termin gelöscht');
}

function initCalendarModal() {
  document.getElementById('event-modal-close').addEventListener('click', closeEventModal);
  document.getElementById('ev-cancel-btn').addEventListener('click', closeEventModal);
  document.getElementById('ev-save-btn').addEventListener('click', saveEvent);
  document.getElementById('ev-delete-btn').addEventListener('click', deleteEvent);
  document.getElementById('event-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('event-modal-overlay')) closeEventModal();
  });
  document.getElementById('ev-recurrence').addEventListener('change', (e) => {
    const isRecurring = e.target.value !== 'none';
    const editingId = calEventModalState.editing;
    const hasExisting = editingId && STATE.events.find(ev=>ev.id===editingId);
    document.getElementById('ev-scope-group').classList.toggle('hidden', !(isRecurring && hasExisting));
  });
}
