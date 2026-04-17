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

  // Activate the correct nav item
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === startPage);
  });

  showPage(startPage);

  // Connect to Supabase (non-blocking)
  if (window.initSync) {
    window.initSync();
  }
}

// ── iOS Keyboard / VisualViewport Fix ─────────────────
// When the soft keyboard opens on iOS, the visual viewport shrinks but
// the layout viewport does not — causing content to be hidden behind the
// keyboard. We listen to visualViewport resize events and manually adjust
// the #app height so the bottom nav and content stay visible.
(function initKeyboardFix() {
  const vv = window.visualViewport;
  if (!vv) return; // Not supported (desktop / older browsers)

  const app = () => document.getElementById('app');

  function onViewportChange() {
    const el = app();
    if (!el) return;
    // Set the app height to the actual visible viewport height.
    // This shrinks the shell when the keyboard is open and restores it when closed.
    el.style.height = vv.height + 'px';
  }

  vv.addEventListener('resize', onViewportChange);
  vv.addEventListener('scroll', onViewportChange);

  // Also reset on DOMContentLoaded in case there's already an offset
  document.addEventListener('DOMContentLoaded', onViewportChange);
})();

// ── Start ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
