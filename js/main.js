/* =====================================================
   main.js — App Bootstrap & Navigation
   ===================================================== */

// ── Page definitions ─────────────────────────────────
const PAGES = {
  calendar: {
    id: 'calendar',
    title: 'Kalender',
    render: renderCalendarPage,
  },
  notes: {
    id: 'notes',
    title: 'Notizen',
    render: renderNotesPage,
  },
  expenses: {
    id: 'expenses',
    title: 'Ausgaben',
    render: renderExpensesPage,
  },
  settings: {
    id: 'settings',
    title: 'Einstellungen',
    render: renderSettingsPage,
  },
};

// ── FAB management ────────────────────────────────────
let currentFAB = null;

function ensureFAB(pageId, icon, onClick) {
  // Remove existing
  if (currentFAB) { currentFAB.remove(); currentFAB = null; }

  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.id = `fab-${pageId}`;
  fab.setAttribute('aria-label', 'Hinzufügen');

  if (icon === '+') {
    fab.innerHTML = `<i class="ph-bold ph-plus" style="font-size: 24px;"></i>`;
  } else {
    fab.textContent = icon;
    fab.style.fontSize = '20px';
  }

  fab.addEventListener('click', onClick);
  document.body.appendChild(fab);
  currentFAB = fab;
}

function removeFAB() {
  if (currentFAB) { currentFAB.remove(); currentFAB = null; }
}

// ── Navigation ────────────────────────────────────────
function navigateTo(pageId) {
  if (!PAGES[pageId]) return;
  STATE.ui.currentPage = pageId;
  if (pageId === 'expenses') {
    STATE.ui.expensesView = 'list';
  }
  saveState();

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  // Clear FAB when navigating (page render will add if needed)
  removeFAB();

  // Render the page
  PAGES[pageId].render();

  // Scroll to top
  document.getElementById('page-container').scrollTop = 0;
}

// ── Page HTML templates ───────────────────────────────
function setupPageShells() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div id="calendar-page" class="page"></div>
    <div id="lists-page"    class="page"></div>
    <div id="expenses-page" class="page"></div>
    <div id="settings-page" class="page"></div>
  `;

  // Intercept nav clicks — use page-container visibility not display toggling
  // Actually we use a simpler approach: render into the single visible area
  // so only the active page div exists inside page-container at a time.
  // Rebuild page shell on each nav click.
}

function showPage(pageId) {
  const container = document.getElementById('page-container');
  container.innerHTML = `<div id="${pageId}-page" class="page active"></div>`;
  removeFAB();
  PAGES[pageId].render();
  container.scrollTop = 0;
}

// ── Bottom Nav ────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const pageId = btn.dataset.page;
      STATE.ui.currentPage = pageId;
      if (pageId === 'expenses') {
        STATE.ui.expensesView = 'list';
      }
      if (pageId === 'calendar' && typeof window.resetCalendarScroll === 'function') {
        window.resetCalendarScroll();
      }
      saveState();

      // Active state
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      showPage(pageId);
    });
  });
}

// ── Init All Modals ───────────────────────────────────
function initModals() {
  initCalendarModal();
  initExpenseModal();
  initTripModal();
  initMemberModal();
}

// ── App Init ──────────────────────────────────────────
function initApp() {
  loadState();
  applyTheme(STATE.settings.theme || 'dark');
  initNav();
  initModals();
  initNotesModule();

  // Restore last page but always ensure Calendar starts in Planner mode on fresh boot
  const startPage = STATE.ui.currentPage || 'calendar';
  STATE.ui.calendarView = 'year-summary';
  STATE.ui.selectedDay = null; // Clear any selected day on boot to show the full year
  // Always reset calendarDate to today (using local date, not UTC) so the planner
  // never shows yesterday's date after 22:00 local time or on next-day boot.
  const _n = new Date();
  STATE.ui.calendarDate = `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}`;

  // Activate the correct nav item
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === startPage);
  });

  showPage(startPage);

  // Connect to Supabase (non-blocking)
  if (window.initSync) {
    window.initSync();
  }

  // iOS keyboard / visual-viewport handler (must run after #app is in DOM)
  initKeyboardFix();
}

// ── iOS Keyboard / VisualViewport Fix ─────────────────
// Sets --vvh on <html> and forces #app height to the visible viewport height
// so the shell shrinks correctly when the iOS soft keyboard opens.
function initKeyboardFix() {
  const vv = window.visualViewport;

  function applyVVH() {
    const h = vv ? Math.round(vv.height) : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', h + 'px');
    const app = document.getElementById('app');
    if (app) app.style.height = h + 'px';
  }

  if (vv) {
    vv.addEventListener('resize', applyVVH);
    vv.addEventListener('scroll', applyVVH);
  }

  // Run once on init and after layout settles
  applyVVH();
  setTimeout(applyVVH, 100);

  // Re-apply when keyboard appears / disappears (focusin = keyboard opens)
  document.addEventListener('focusin',  () => setTimeout(applyVVH, 350));
  document.addEventListener('focusout', () => setTimeout(applyVVH, 350));
}

// ── Start ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  requireAuth().then(initApp);
});
