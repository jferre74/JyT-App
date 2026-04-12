/* =====================================================
   sync.js — Supabase Sync Module
   ===================================================== */

let isSyncing = false;

// ── Sync UI ────────────────────────────────────────────
function updateSyncUI(statusText, isSpinning = false, isError = false) {
  const icon  = document.getElementById('sync-status-icon');
  const label = document.getElementById('sync-time-label');
  if (icon) {
    if (isSpinning) icon.setAttribute('class', 'ph-duotone ph-arrows-clockwise ph-spin');
    else if (isError) icon.setAttribute('class', 'ph-duotone ph-warning-circle');
    else icon.setAttribute('class', 'ph-duotone ph-cloud-check');
  }
  if (label && statusText) label.textContent = statusText;
}

// ── Handle incoming realtime change ──────────────────
function handleRealtimeChange(table, payload) {
  const { eventType, new: newRow, old: oldRow } = payload;
  console.log(`[Realtime] ${table} ${eventType}`, newRow || oldRow);

  switch (table) {
    case 'events':
      if (eventType === 'DELETE') {
        STATE.events = STATE.events.filter(e => e.id !== oldRow.id);
      } else {
        const ev = dbToEvent(newRow);
        const idx = STATE.events.findIndex(e => e.id === ev.id);
        if (idx >= 0) STATE.events[idx] = ev; else STATE.events.push(ev);
      }
      if (STATE.ui.currentPage === 'calendar') renderCalendarPage();
      break;

    case 'notes':
      if (eventType === 'DELETE') {
        STATE.notes = STATE.notes.filter(n => n.id !== oldRow.id);
        // Always re-render on delete
        if (STATE.ui.currentPage === 'notes') renderNotesPage();
      } else {
        const note = dbToNote(newRow);
        const idx = STATE.notes.findIndex(n => n.id === note.id);
        if (idx >= 0) STATE.notes[idx] = note; else STATE.notes.push(note);
        // Only re-render if the user is NOT actively in the editor for this note.
        // If note-body-field exists in the DOM, the user is typing — skip re-render
        // to avoid destroying focus and the cursor position.
        const isEditorOpen = !!document.getElementById('note-body-field');
        if (STATE.ui.currentPage === 'notes' && !isEditorOpen) renderNotesPage();
      }
      break;

    case 'members':
      if (eventType === 'DELETE') {
        STATE.members = STATE.members.filter(m => m.id !== oldRow.id);
      } else {
        const m = dbToMember(newRow);
        const idx = STATE.members.findIndex(x => x.id === m.id);
        if (idx >= 0) STATE.members[idx] = m; else STATE.members.push(m);
      }
      if (STATE.ui.currentPage === 'settings') renderSettingsPage();
      break;

    case 'trips':
      if (eventType === 'DELETE') {
        STATE.trips = STATE.trips.filter(t => t.id !== oldRow.id);
      } else {
        const existing = STATE.trips.find(t => t.id === newRow.id);
        if (existing) {
          existing.name = newRow.name;
          existing.participantIds = newRow.participant_ids || [];
          existing.budgets = newRow.budgets || {};
        } else {
          STATE.trips.push(dbToTrip(newRow, []));
        }
      }
      if (STATE.ui.currentPage === 'expenses') renderExpensesPage();
      break;

    case 'expenses':
      if (eventType === 'DELETE') {
        STATE.trips.forEach(t => {
          t.expenses = t.expenses.filter(e => e.id !== oldRow.id);
        });
      } else {
        const exp = dbToExpense(newRow);
        const trip = STATE.trips.find(t => t.id === newRow.trip_id);
        if (trip) {
          const idx = trip.expenses.findIndex(e => e.id === exp.id);
          if (idx >= 0) trip.expenses[idx] = exp; else trip.expenses.push(exp);
        }
      }
      if (STATE.ui.currentPage === 'expenses') renderExpensesPage();
      break;

    case 'lists':
      if (eventType === 'DELETE') {
        STATE.lists = STATE.lists.filter(l => l.id !== oldRow.id);
      } else {
        const listIdx = STATE.lists.findIndex(l => l.id === newRow.id);
        if (listIdx >= 0) {
          STATE.lists[listIdx].name = newRow.name;
          STATE.lists[listIdx].icon = newRow.icon;
        } else {
          STATE.lists.push({ id: newRow.id, name: newRow.name, icon: newRow.icon || '📦', items: [] });
        }
      }
      break;

    case 'list_items':
      // Re-fetch the entire lists data to stay consistent
      SupabaseSync.fetchAll().then(() => {
        saveState(true);
      });
      break;

    case 'app_settings':
      if (newRow) {
        Object.assign(STATE.settings, dbToSettings(newRow));
        applyTheme(STATE.settings.theme);
        saveState(true);
      }
      break;
  }

  // Update localStorage cache silently
  saveState(true);
  updateSyncUI(new Date().toLocaleTimeString(), false, false);
}

// ── Init Sync ─────────────────────────────────────────
async function initSync() {
  const sb = getSupabaseClient();
  if (!sb) {
    console.log('[Sync] No Supabase credentials configured.');
    updateSyncUI('Nicht verbunden', false, true);
    return;
  }

  updateSyncUI('Verbinde...', true, false);

  // 1. Pull all data from cloud (cloud wins on first load)
  const ok = await SupabaseSync.fetchAll();
  if (ok) {
    // Re-render current page with fresh data
    const page = STATE.ui.currentPage || 'calendar';
    if (typeof showPage === 'function') showPage(page);
    updateSyncUI(new Date().toLocaleTimeString(), false, false);
    showToast('Mit Supabase verbunden ✓');
  } else {
    updateSyncUI('Fehler beim Laden', false, true);
  }

  // 2. Subscribe to realtime changes
  SupabaseSync.subscribeToChanges(handleRealtimeChange);
}

// ── Flush offline queue when coming back online ───────
window.addEventListener('online', async () => {
  console.log('[Sync] Back online — flushing queue...');
  updateSyncUI('Synchronisiere...', true, false);
  await SupabaseSync.flushOfflineQueue();
  await initSync();
});

window.addEventListener('offline', () => {
  updateSyncUI('Offline', false, true);
  showToast('Offline — Änderungen werden gespeichert');
});

// Expose for use by other modules
window.initSync = initSync;
window.updateSyncUI = updateSyncUI;
