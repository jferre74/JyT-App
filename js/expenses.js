/* =====================================================
   expenses.js — Travel & Group Expenses Module
   ===================================================== */

let expenseModalState = { tripId: null, editingId: null };
let tripModalState = { editingId: null };

// ── Render Expenses Page ──────────────────────────────
function renderExpensesPage() {
  const page = document.getElementById('expenses-page');
  const view = STATE.ui.expensesView || 'list';

  if (view === 'list') {
    renderExpensesList(page);
  } else if (view === 'archive') {
    renderExpensesArchive(page);
  } else {
    renderExpensesDetail(page);
  }
}

function renderExpensesList(page) {
  document.getElementById('header-title').textContent = 'Ausgaben';
  document.getElementById('header-actions').innerHTML = '';
  document.getElementById('header-back').innerHTML = '';

  const allTrips = STATE.trips || [];
  const trips = allTrips.filter(t => !t.archived);
  const archivedCount = allTrips.filter(t => t.archived).length;

  if (trips.length === 0 && archivedCount === 0) {
    page.innerHTML = `
      <div class="no-trip">
        <div class="empty-icon">✈️</div>
        <h3 style="color:var(--text-secondary);font-size:18px">Keine Reisen</h3>
        <p>Erstelle deinen ersten Trip</p>
        <button class="btn btn-primary" id="exp-create-first">+ Neue Reise</button>
      </div>`;
    document.getElementById('exp-create-first')?.addEventListener('click', () => openTripModal(null));
    removeFAB();
    return;
  }

  let html = `<div class="trip-list-container">`;

  for (const t of trips) {
    const totalExp = (t.expenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const dateStr = t.expenses?.length > 0 ? t.expenses.map(e => e.date).sort()[0] : 'Keine Ausgaben';

    html += `
      <div class="trip-card" data-tripid="${t.id}">
        <div class="trip-card-header">
          <div class="trip-card-title">${t.name}</div>
        </div>
        <div class="trip-card-body">
          <div class="trip-card-stat">
            <span class="stat-label">Gesamt</span>
            <span class="stat-val">${totalExp.toFixed(2)} ${STATE.settings.baseCurrency || 'EUR'}</span>
          </div>
          <div class="trip-card-stat">
            <span class="stat-label">Teilnehmer</span>
            <span class="stat-val">${t.participantIds.length}</span>
          </div>
        </div>
        <div class="trip-card-footer">
          <span class="trip-date">${dateStr}</span>
        </div>
      </div>
    `;
  }

  if (trips.length === 0) {
    html += `<div style="text-align:center;padding:var(--space-xl);color:var(--text-muted);">
      <div style="font-size:48px;margin-bottom:8px;">✈️</div>
      <p>Keine aktiven Reisen</p>
    </div>`;
  }

  html += `</div>`;

  // Archive link — always show if there are archived trips, or as a persistent entry
  html += `<button class="archive-section-link" id="go-to-archive">
    <i class="ph-duotone ph-archive"></i>
    Archiv${archivedCount > 0 ? ` (${archivedCount})` : ''}
  </button>`;

  page.innerHTML = html;

  document.querySelectorAll('.trip-card').forEach(card => {
    card.addEventListener('click', () => {
      STATE.ui.selectedTripId = card.dataset.tripid;
      STATE.ui.expensesView = 'detail';
      saveState();
      renderExpensesPage();
    });
  });

  document.getElementById('go-to-archive')?.addEventListener('click', () => {
    STATE.ui.expensesView = 'archive';
    saveState();
    renderExpensesPage();
  });

  ensureFAB('expenses', '+', () => openTripModal(null));
}

function renderExpensesArchive(page) {
  document.getElementById('header-title').textContent = 'Archiv';
  // iOS: back button goes top-left
  document.getElementById('header-back').innerHTML = `
    <button class="ios-back-btn" id="archive-back-btn" title="Zurück">
      <i class="ph-bold ph-caret-left"></i>
      <span>Ausgaben</span>
    </button>
  `;
  document.getElementById('header-actions').innerHTML = '';

  document.getElementById('archive-back-btn').addEventListener('click', () => {
    STATE.ui.expensesView = 'list';
    saveState();
    renderExpensesPage();
  });

  removeFAB();

  const archivedTrips = (STATE.trips || []).filter(t => t.archived);

  let html = `<div class="archive-view-note">
    <i class="ph-duotone ph-info" style="font-size:16px;flex-shrink:0;"></i>
    Archivierte Reisen sind schreibgeschützt und können nicht mehr bearbeitet werden.
  </div>
  <div class="trip-list-container">`;

  if (archivedTrips.length === 0) {
    html = `<div style="text-align:center;padding:var(--space-xl) var(--space-md);color:var(--text-muted);">
      <div style="font-size:48px;margin-bottom:12px;">🗄</div>
      <p style="font-size:15px;">Noch keine archivierten Reisen</p>
    </div>`;
    page.innerHTML = html;
    return;
  }

  const baseCcy = STATE.settings.baseCurrency || 'EUR';
  for (const t of archivedTrips) {
    const totalExp = (t.expenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const dateStr = t.expenses?.length > 0 ? t.expenses.map(e => e.date).sort()[0] : 'Keine Ausgaben';

    html += `
      <div class="trip-card archived" data-tripid="${t.id}">
        <div class="trip-card-header">
          <div class="trip-card-title">${t.name}</div>
        </div>
        <div class="trip-card-body">
          <div class="trip-card-stat">
            <span class="stat-label">Gesamt</span>
            <span class="stat-val">${totalExp.toFixed(2)} ${baseCcy}</span>
          </div>
          <div class="trip-card-stat">
            <span class="stat-label">Teilnehmer</span>
            <span class="stat-val">${t.participantIds.length}</span>
          </div>
        </div>
        <div class="trip-card-footer">
          <span class="trip-date">${dateStr}</span>
        </div>
      </div>
    `;
  }
  html += `</div>`;
  page.innerHTML = html;

  document.querySelectorAll('.trip-card.archived').forEach(card => {
    card.addEventListener('click', () => {
      STATE.ui.selectedTripId = card.dataset.tripid;
      STATE.ui.expensesView = 'detail';
      saveState();
      renderExpensesPage();
    });
  });
}

function renderExpensesDetail(page) {
  const tripId = STATE.ui.selectedTripId;
  const trip = STATE.trips.find(t => t.id === tripId);

  if (!trip) {
    STATE.ui.expensesView = 'list';
    saveState();
    renderExpensesPage();
    return;
  }

  const isArchived = !!trip.archived;

  document.getElementById('header-title').textContent = trip.name;

  // iOS: back button top-left, action buttons top-right
  document.getElementById('header-back').innerHTML = `
    <button class="ios-back-btn" id="exp-back-btn" title="Zurück">
      <i class="ph-bold ph-caret-left"></i>
      <span>Zurück</span>
    </button>
  `;
  if (isArchived) {
    document.getElementById('header-actions').innerHTML = `
      <span class="archived-badge">🗄 Archiviert</span>
      <button class="header-btn" id="exp-unarchive-btn" title="Wiederherstellen" style="color:var(--warning);">
        <i class="ph-bold ph-arrow-counter-clockwise" style="font-size: 20px;"></i>
      </button>
    `;
    document.getElementById('exp-unarchive-btn').addEventListener('click', () => unarchiveTrip(trip.id));
  } else {
    document.getElementById('header-actions').innerHTML = `
      <button class="header-btn" id="exp-archive-btn" title="Reise archivieren" style="color:var(--text-secondary);">
        <i class="ph-bold ph-archive" style="font-size: 20px;"></i>
      </button>
      <button class="header-btn" id="exp-edit-trip-btn" title="Reise bearbeiten">
        <i class="ph-bold ph-pencil-simple" style="font-size: 20px;"></i>
      </button>
    `;
    document.getElementById('exp-archive-btn').addEventListener('click', () => archiveTrip(trip.id));
    document.getElementById('exp-edit-trip-btn').addEventListener('click', () => openTripModal(trip.id));
  }

  document.getElementById('exp-back-btn').addEventListener('click', () => {
    // Go back to archive view if we came from there
    if (isArchived) {
      STATE.ui.expensesView = 'archive';
    } else {
      STATE.ui.expensesView = 'list';
    }
    saveState();
    renderExpensesPage();
  });

  // Balance & Setup
  const balances = calcBalances(trip);
  const settlements = calcSettlements(balances);
  const baseCcy = STATE.settings.baseCurrency || 'EUR';

  // Derive the trip's display currency from its expenses.
  // Use the most frequently occurring currency among non-settlement expenses.
  // Falls back to baseCcy if there are no expenses yet.
  const tripCcy = (() => {
    const freqMap = {};
    for (const exp of (trip.expenses || [])) {
      if (exp.desc.startsWith('Ausgleich:')) continue;
      const c = exp.currency || baseCcy;
      freqMap[c] = (freqMap[c] || 0) + 1;
    }
    const entries = Object.entries(freqMap);
    if (entries.length === 0) return baseCcy;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  })();

  // Compute "Ausgegeben" and "Total" (excluding settlements)
  const spentInfo = {};
  trip.participantIds.forEach(pid => spentInfo[pid] = { cash: 0, card: 0 });
  let totalCost = 0;

  for (const exp of (trip.expenses || [])) {
    if (exp.desc.startsWith('Ausgleich:')) continue; // Do not count settlements towards total/spent
    const amt = parseFloat(exp.amount) || 0;
    totalCost += amt;
    if (spentInfo[exp.payerId]) {
      if (exp.paymentMethod === 'cash') spentInfo[exp.payerId].cash += amt;
      else spentInfo[exp.payerId].card += amt;
    }
  }

  const numUsers = trip.participantIds.length;
  const costPerUser = numUsers > 0 ? (totalCost / numUsers) : 0;

  let html = `<div class="balance-summary">
    <div class="balance-summary-header">
      <h3 style="display: flex; align-items: center; gap: 8px;"><i class="ph-duotone ph-coins" style="font-size: 20px;"></i> Reisekosten Übersicht</h3>
      <button class="export-btn" id="exp-export-btn">📥 CSV</button>
    </div>
    
    <div class="rk-tables-container">
      
      <!-- Table 1: Budget -->
      <div class="rk-table-wrapper">
        <h4>Budget</h4>
        <table class="rk-table">
          <thead>
            <tr>
              <th style="color:var(--accent);">Teilnehmer</th>
              <th>Gesamt</th>
              <th style="color:var(--accent);">Bar</th>
              <th style="color:var(--accent);">Kreditkarte</th>
            </tr>
          </thead>
          <tbody>`;
          
  const budgets = trip.budgets || {};
  let bSumCash = 0;
  let bSumCard = 0;
  for (const pid of trip.participantIds) {
    bSumCash += budgets[pid]?.cash || 0;
    bSumCard += budgets[pid]?.card || 0;
  }
  const bSumTotal = bSumCash + bSumCard;

  html += `<tr style="border-bottom: 1px solid var(--border);">
    <td>Gesamt Reise</td>
    <td><strong>${bSumTotal.toFixed(2)} ${baseCcy}</strong></td>
    <td>${bSumCash.toFixed(2)}</td>
    <td>${bSumCard.toFixed(2)}</td>
  </tr>`;

  for (const pid of trip.participantIds) {
    const m = getMember(pid);
    const mName = m ? m.name : pid;
    const bCash = budgets[pid]?.cash || 0;
    const bCard = budgets[pid]?.card || 0;
    const bTotal = bCash + bCard;
    if (isArchived) {
      html += `<tr>
        <td style="color:var(--accent);">${mName}</td>
        <td><strong>${bTotal.toFixed(2)} ${baseCcy}</strong></td>
        <td><span class="readonly-value">${bCash.toFixed(2)}</span></td>
        <td><span class="readonly-value">${bCard.toFixed(2)}</span></td>
      </tr>`;
    } else {
      html += `<tr>
        <td style="color:var(--accent);">${mName}</td>
        <td><strong>${bTotal.toFixed(2)} ${baseCcy}</strong></td>
        <td>
          <input type="number" step="0.01" class="budget-input bg-cash" data-pid="${pid}" data-type="cash" value="${bCash.toFixed(2)}" style="color:var(--accent);" />
        </td>
        <td>
          <input type="number" step="0.01" class="budget-input bg-card" data-pid="${pid}" data-type="card" value="${bCard.toFixed(2)}" style="color:var(--accent);" />
        </td>
      </tr>`;
    }
  }
  
  html += `</tbody>
        </table>
      </div>

      <!-- Table 2: Ausgegeben -->
      <div class="rk-table-wrapper">
        <h4>Ausgegeben</h4>
        <table class="rk-table">
          <thead>
            <tr>
              <th style="color:var(--accent);">Teilnehmer</th>
              <th>Gesamt</th>
              <th style="color:var(--accent);">Bar</th>
              <th style="color:var(--accent);">Kreditkarte</th>
            </tr>
          </thead>
          <tbody>`;

  let sumCash = 0;
  let sumCard = 0;
  for (const pid of trip.participantIds) {
    sumCash += spentInfo[pid].cash;
    sumCard += spentInfo[pid].card;
  }
  const sumTotal = sumCash + sumCard;

  html += `<tr style="border-bottom: 1px solid var(--border);">
    <td>Gesamt Reise</td>
    <td>${sumTotal.toFixed(2)} ${tripCcy}</td>
    <td>${sumCash.toFixed(2)} ${tripCcy}</td>
    <td>${sumCard.toFixed(2)} ${tripCcy}</td>
  </tr>`;

  for (const pid of trip.participantIds) {
    const m = getMember(pid);
    const mName = m ? m.name : pid;
    const pTotal = spentInfo[pid].cash + spentInfo[pid].card;
    html += `<tr>
      <td style="color:var(--accent);">${mName}</td>
      <td>${pTotal.toFixed(2)} ${tripCcy}</td>
      <td style="color:var(--accent);">${spentInfo[pid].cash.toFixed(2)} ${tripCcy}</td>
      <td style="color:var(--accent);">${spentInfo[pid].card.toFixed(2)} ${tripCcy}</td>
    </tr>`;
  }
  
  html += `</tbody>
        </table>
      </div>

      <!-- Table 3: Gesamtkosten was removed per user request -->

    </div>
  </div>`;

  // Settlements
  if (settlements.length > 0) {
    html += `<div class="settlements">
      <div class="settlements-header">Ausgleichszahlungen</div>`;
    for (const s of settlements) {
      html += `<div class="settlement-item">
        <div class="settlement-text">${getMemberName(s.from)} → ${getMemberName(s.to)}: <strong>${s.amount.toFixed(2)} ${tripCcy}</strong></div>
        ${!isArchived ? `<button class="settle-btn" data-from="${s.from}" data-to="${s.to}" data-amt="${s.amount.toFixed(2)}">Begleichen</button>` : ''}
      </div>`;
    }
    html += `</div>`;
  }

  // Expense list grouped by day
  const catIcons = { accommodation: '<i class="ph-duotone ph-bed"></i>', food: '<i class="ph-duotone ph-fork-knife"></i>', transport: '<i class="ph-duotone ph-car-profile"></i>', activities: '<i class="ph-duotone ph-ticket"></i>', other: '<i class="ph-duotone ph-package"></i>' };
  const sorted = [...(trip.expenses || [])].sort((a, b) => b.date.localeCompare(a.date)).reverse();

  const groupedByDate = {};
  for (const exp of sorted) {
    if (!groupedByDate[exp.date]) groupedByDate[exp.date] = [];
    groupedByDate[exp.date].push(exp);
  }

  html += `<div class="expense-list">
    <div class="expense-list-header">Ausgaben (${sorted.length})</div>`;

  if (sorted.length === 0) {
    html += `<div class="empty-list"><div class="empty-icon"><i class="ph-duotone ph-receipt"></i></div><p>Noch keine Ausgaben</p></div>`;
  }

  for (const date of Object.keys(groupedByDate)) {
    const dayExps = groupedByDate[date];
    const dayTotal = dayExps.reduce((sum, e) => {
      const amt = e.desc.startsWith('Ausgleich:') ? 0 : (parseFloat(e.amount) || 0);
      return sum + amt;
    }, 0);

    html += `
      <div class="day-group">
        <div class="day-group-header" data-date="${date}">
          <div class="day-group-title">
            <i class="ph-bold ph-caret-down day-chevron"></i>
            <span>${date}</span>
          </div>
          <div class="day-group-total">${dayTotal.toFixed(2)} ${tripCcy}</div>
        </div>
        <div class="day-group-content" id="day-content-${date}">
    `;

    for (const exp of dayExps) {
      const payer = getMember(exp.payerId);
      const readonlyCls = isArchived ? ' readonly' : '';
      html += `<div class="expense-item${readonlyCls}" data-expid="${exp.id}" style="margin-bottom:0; border-radius:0; border-top:none; border-left:none; border-right:none; border-bottom:1px solid var(--border);">
        <div class="exp-cat-icon">${catIcons[exp.category] || '<i class="ph-duotone ph-package"></i>'}</div>
        <div class="exp-info">
          <div class="exp-desc">${exp.desc}</div>
          <div class="exp-meta">${exp.participantIds.length} Personen · ${splitLabel(exp.split)} · ${exp.paymentMethod === 'cash' ? '💶 Bar' : '💳 Karte'}</div>
        </div>
        <div class="exp-amount-col">
          <div class="exp-amount">${parseFloat(exp.amount).toFixed(2)} ${exp.currency}</div>
          <div class="exp-payer-chip" style="background:${payer?.color || '#6c63ff'}">${payer?.name || '?'}</div>
        </div>
      </div>`;
    }
    
    // To ensure the last item doesn't have a doubled border:
    html += `</div></div>`;
  }
  html += `</div>`;

  page.innerHTML = html;

  if (isArchived) {
    removeFAB();
  } else {
    ensureFAB('expenses', '+', () => openExpenseModal(trip.id, null));
  }

  // Export (always available)
  document.getElementById('exp-export-btn')?.addEventListener('click', () => exportTripCSV(trip));

  // Settle buttons (only for active trips)
  if (!isArchived) {
    document.querySelectorAll('.settle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        markSettlement(btn.dataset.from, btn.dataset.to, parseFloat(btn.dataset.amt));
      });
    });

    // Expense item click → edit (only for active trips)
    document.querySelectorAll('.expense-item').forEach(item => {
      item.addEventListener('click', () => openExpenseModal(trip.id, item.dataset.expid));
    });

    // Budget input save on blur/change (when user leaves the field or changes value)
    const saveBudgetInput = (e) => {
      const pid = e.target.dataset.pid;
      const type = e.target.dataset.type; // 'cash' or 'card'
      const val = parseFloat(e.target.value) || 0;

      if (!trip.budgets) trip.budgets = {};
      if (!trip.budgets[pid]) trip.budgets[pid] = { cash: 0, card: 0 };

      // Skip if value hasn't actually changed
      if (Number(trip.budgets[pid][type]) === val) return;

      trip.budgets[pid][type] = val;

      // Update the row's "Gesamt" cell inline (avoid full re-render which destroys all inputs)
      const row = e.target.closest('tr');
      if (row) {
        const cashInput = row.querySelector('.budget-input[data-type="cash"]');
        const cardInput = row.querySelector('.budget-input[data-type="card"]');
        const cashVal = parseFloat(cashInput?.value) || 0;
        const cardVal = parseFloat(cardInput?.value) || 0;
        const totalCell = row.querySelector('td:nth-child(2) strong');
        if (totalCell) totalCell.textContent = `${(cashVal + cardVal).toFixed(2)} ${STATE.settings.baseCurrency || 'EUR'}`;
      }

      // Update the "Gesamt Reise" summary row inline
      const budgets = trip.budgets || {};
      let bSumCash = 0, bSumCard = 0;
      for (const p of trip.participantIds) {
        bSumCash += budgets[p]?.cash || 0;
        bSumCard += budgets[p]?.card || 0;
      }
      const summaryRow = document.querySelector('.rk-table tbody tr:first-child');
      if (summaryRow) {
        const baseCcy = STATE.settings.baseCurrency || 'EUR';
        const sumTotal = summaryRow.querySelector('td:nth-child(2) strong');
        const sumCash  = summaryRow.querySelector('td:nth-child(3)');
        const sumCard  = summaryRow.querySelector('td:nth-child(4)');
        if (sumTotal) sumTotal.textContent = `${(bSumCash + bSumCard).toFixed(2)} ${baseCcy}`;
        if (sumCash)  sumCash.textContent  = `${bSumCash.toFixed(2)}`;
        if (sumCard)  sumCard.textContent  = `${bSumCard.toFixed(2)}`;
      }

      // Save locally and sync to Supabase
      saveState();
      if (window.SupabaseSync) {
        SupabaseSync.upsertTrip(trip).then(() => {
          showToast('Budget gespeichert ✓');
        }).catch(err => {
          // upsertTrip already showed a toast with the error — don't show a second one
          // but log it here for debugging
          console.error('[Budget] upsertTrip failed:', err?.message || err?.code || err);
        });
      } else {
        showToast('Budget gespeichert ✓');
      }
    };

    document.querySelectorAll('.budget-input').forEach(input => {
      input.addEventListener('blur', saveBudgetInput);
      input.addEventListener('change', saveBudgetInput);
    });
  }

  // Day group folding
  document.querySelectorAll('.day-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const date = header.dataset.date;
      const content = document.getElementById(`day-content-${date}`);
      const chevron = header.querySelector('.day-chevron');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        chevron.style.transform = 'rotate(0deg)';
      } else {
        content.classList.add('hidden');
        chevron.style.transform = 'rotate(-90deg)';
      }
    });
  });
}

// ── Archive / Unarchive ────────────────────────────────
function archiveTrip(tripId) {
  const trip = STATE.trips.find(t => t.id === tripId);
  if (!trip) return;
  trip.archived = true;
  saveState();
  if (window.SupabaseSync) SupabaseSync.upsertTrip(trip);
  STATE.ui.expensesView = 'list';
  saveState();
  renderExpensesPage();
  showToast('Reise archiviert 🗄');
}

function unarchiveTrip(tripId) {
  const trip = STATE.trips.find(t => t.id === tripId);
  if (!trip) return;
  trip.archived = false;
  saveState();
  if (window.SupabaseSync) SupabaseSync.upsertTrip(trip);
  STATE.ui.expensesView = 'list';
  saveState();
  renderExpensesPage();
  showToast('Reise wiederhergestellt ✓');
}

function splitLabel(s) {
  return { even: 'Gleichmäßig', percentage: 'Prozentual', fixed: 'Fester Betrag', individual: 'Individuell' }[s] || s;
}

function markSettlement(fromId, toId, amount) {
  const trip = STATE.trips.find(t => t.id === STATE.ui.selectedTripId);
  if (!trip) return;
  // Use the trip's display currency for the settlement entry
  const tripSettleCcy = (() => {
    const freqMap = {};
    for (const exp of (trip.expenses || [])) {
      if (exp.desc.startsWith('Ausgleich:')) continue;
      const c = exp.currency || STATE.settings.baseCurrency || 'EUR';
      freqMap[c] = (freqMap[c] || 0) + 1;
    }
    const entries = Object.entries(freqMap);
    if (entries.length === 0) return STATE.settings.baseCurrency || 'EUR';
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  })();
  const exp = {
    id: uid(), desc: `Ausgleich: ${getMemberName(fromId)} → ${getMemberName(toId)}`,
    category: 'other', amount, currency: tripSettleCcy,
    payerId: fromId, date: todayStr(),
    participantIds: [fromId, toId],
    split: 'fixed', splitData: { [fromId]: 0, [toId]: amount },
    settled: false
  };
  trip.expenses.push(exp);
  saveState();
  if (window.SupabaseSync) SupabaseSync.upsertExpense(exp, trip.id);
  renderExpensesPage();
  showToast('Ausgleich vermerkt ✓');
}

// ── Expense Modal ─────────────────────────────────────
function openExpenseModal(tripId, expId) {
  const trip = STATE.trips.find(t => t.id === tripId);
  if (!trip) return;
  // Guard: do not allow editing expenses on archived trips
  if (trip.archived) return;
  expenseModalState = { tripId, editingId: expId };
  const isNew = !expId;
  const exp = isNew ? null : trip.expenses.find(e => e.id === expId);

  document.getElementById('expense-modal-title').textContent = isNew ? 'Neue Ausgabe' : 'Ausgabe bearbeiten';
  document.getElementById('exp-delete-btn').classList.toggle('hidden', isNew);

  // Currency select
  const currSel = document.getElementById('exp-currency');
  currSel.innerHTML = CURRENCIES.map(c => `<option value="${c.code}">${c.code} – ${c.name}</option>`).join('');

  // Payer
  const payerSel = document.getElementById('exp-payer');
  payerSel.innerHTML = trip.participantIds.map(pid => {
    const m = getMember(pid);
    return `<option value="${pid}">${m?.name || pid}</option>`;
  }).join('');

  // Participants checkboxes
  const partsDiv = document.getElementById('exp-participants-check');
  partsDiv.innerHTML = trip.participantIds.map(pid => {
    const m = getMember(pid);
    const checked = isNew ? 'checked' : (exp?.participantIds || []).includes(pid) ? 'checked' : '';
    return `<label class="checkbox-label"><input type="checkbox" name="exp-part" value="${pid}" ${checked}/>${m?.name || pid}</label>`;
  }).join('');

  if (exp) {
    document.getElementById('exp-desc').value = exp.desc;
    document.getElementById('exp-amount').value = exp.amount;
    document.getElementById('exp-currency').value = exp.currency;
    document.getElementById('exp-payer').value = exp.payerId;
    document.getElementById('exp-date').value = exp.date;
    document.getElementById('exp-category').value = exp.category;
    document.getElementById('exp-split').value = exp.split;
    document.getElementById('exp-payment-method').value = exp.paymentMethod || 'card';
  } else {
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-currency').value = STATE.settings.baseCurrency || 'EUR';
    document.getElementById('exp-payer').value = trip.participantIds[0] || '';
    document.getElementById('exp-date').value = todayStr();
    document.getElementById('exp-category').value = 'accommodation';
    document.getElementById('exp-split').value = 'even';
    document.getElementById('exp-payment-method').value = 'card';
  }

  renderSplitDetails(trip, exp);
  document.getElementById('expense-modal-overlay').classList.remove('hidden');
}

function renderSplitDetails(trip, exp) {
  const splitType = document.getElementById('exp-split').value;
  const parts = [...document.querySelectorAll('input[name="exp-part"]:checked')].map(cb => cb.value);
  const container = document.getElementById('exp-split-details');

  if (splitType === 'even') {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const sd = exp?.splitData || {};

  let html = `<div class="split-details">`;
  for (const pid of parts) {
    const m = getMember(pid);
    let val = '';
    if (splitType === 'percentage') {
      val = sd[pid] !== undefined ? sd[pid] : (100 / Math.max(parts.length, 1)).toFixed(1);
    } else {
      val = sd[pid] !== undefined ? sd[pid] : (amount / Math.max(parts.length, 1)).toFixed(2);
    }
    const suffix = splitType === 'percentage' ? '%' : (exp?.currency || 'EUR');
    html += `<div class="split-row">
      <div class="split-member-name">${m?.name || pid}</div>
      <input type="number" class="split-input" data-pid="${pid}" value="${val}" step="${splitType === 'percentage' ? '1' : '0.01'}" min="0" />
      <span style="font-size:12px;color:var(--text-muted)">${suffix}</span>
    </div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function closeExpenseModal() {
  document.getElementById('expense-modal-overlay').classList.add('hidden');
  expenseModalState = { tripId: null, editingId: null };
}

function saveExpense() {
  const { tripId, editingId } = expenseModalState;
  const trip = STATE.trips.find(t => t.id === tripId);
  if (!trip) return;

  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!desc || isNaN(amount) || amount <= 0) { showToast('Bitte Beschreibung und Betrag eingeben'); return; }

  const currency = document.getElementById('exp-currency').value;
  const payerId = document.getElementById('exp-payer').value;
  const date = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-category').value;
  const split = document.getElementById('exp-split').value;
  const paymentMethod = document.getElementById('exp-payment-method').value;
  const participantIds = [...document.querySelectorAll('input[name="exp-part"]:checked')].map(cb => cb.value);

  if (participantIds.length === 0) { showToast('Mindestens 1 Teilnehmer auswählen'); return; }

  // Gather split data
  let splitData = null;
  if (split !== 'even') {
    splitData = {};
    document.querySelectorAll('.split-input').forEach(inp => {
      splitData[inp.dataset.pid] = parseFloat(inp.value) || 0;
    });
  }

  if (editingId) {
    const idx = trip.expenses.findIndex(e => e.id === editingId);
    if (idx > -1) trip.expenses[idx] = { ...trip.expenses[idx], desc, amount, currency, payerId, date, category, split, splitData, participantIds, paymentMethod };
    if (window.SupabaseSync) SupabaseSync.upsertExpense(trip.expenses[idx >= 0 ? idx : 0], trip.id);
  } else {
    const newExp = { id: uid(), desc, amount, currency, payerId, date, category, split, splitData, participantIds, settled: false, paymentMethod };
    trip.expenses.push(newExp);
    if (window.SupabaseSync) SupabaseSync.upsertExpense(newExp, trip.id);
  }
  saveState();
  closeExpenseModal();
  renderExpensesPage();
  showToast('Ausgabe gespeichert ✓');
}

function deleteExpense() {
  const { tripId, editingId } = expenseModalState;
  if (!tripId || !editingId) return;
  const trip = STATE.trips.find(t => t.id === tripId);
  if (!trip) return;
  trip.expenses = trip.expenses.filter(e => e.id !== editingId);
  saveState();
  if (window.SupabaseSync) SupabaseSync.deleteExpense(editingId);
  closeExpenseModal();
  renderExpensesPage();
  showToast('Ausgabe gelöscht');
}

function initExpenseModal() {
  document.getElementById('expense-modal-close').addEventListener('click', closeExpenseModal);
  // iOS: "Sichern" button is in the modal header
  document.getElementById('exp-save-btn-header')?.addEventListener('click', saveExpense);
  document.getElementById('exp-delete-btn').addEventListener('click', deleteExpense);
  document.getElementById('expense-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('expense-modal-overlay')) closeExpenseModal();
  });
  document.getElementById('exp-split').addEventListener('change', () => {
    const { tripId, editingId } = expenseModalState;
    const trip = tripId ? STATE.trips.find(t => t.id === tripId) : null;
    const exp = editingId && trip ? trip.expenses.find(e => e.id === editingId) : null;
    if (trip) renderSplitDetails(trip, exp);
  });
  // Re-render split on participant change
  document.getElementById('exp-participants-check').addEventListener('change', () => {
    const { tripId, editingId } = expenseModalState;
    const trip = tripId ? STATE.trips.find(t => t.id === tripId) : null;
    const exp = editingId && trip ? trip.expenses.find(e => e.id === editingId) : null;
    if (trip) renderSplitDetails(trip, exp);
  });
  document.getElementById('exp-amount').addEventListener('input', () => {
    const { tripId, editingId } = expenseModalState;
    const trip = tripId ? STATE.trips.find(t => t.id === tripId) : null;
    const exp = editingId && trip ? trip.expenses.find(e => e.id === editingId) : null;
    if (trip && document.getElementById('exp-split').value !== 'even') renderSplitDetails(trip, exp);
  });
}

// ── Trip Modal ────────────────────────────────────────
function openTripModal(tripId) {
  tripModalState.editingId = tripId;
  const isNew = !tripId;
  const trip = isNew ? null : STATE.trips.find(t => t.id === tripId);
  document.getElementById('trip-modal-title').textContent = isNew ? 'Neue Reise' : 'Reise bearbeiten';
  document.getElementById('trip-delete-btn').classList.toggle('hidden', isNew);
  document.getElementById('trip-name').value = trip?.name || '';

  const partsDiv = document.getElementById('trip-participants-check');
  partsDiv.innerHTML = STATE.members.map(m => {
    const checked = isNew ? 'checked' : (trip?.participantIds || []).includes(m.id) ? 'checked' : '';
    return `<label class="checkbox-label"><input type="checkbox" name="trip-part" value="${m.id}" ${checked}/>${m.name}</label>`;
  }).join('');

  document.getElementById('trip-modal-overlay').classList.remove('hidden');
}

function closeTripModal() {
  document.getElementById('trip-modal-overlay').classList.add('hidden');
  tripModalState.editingId = null;
}

function saveTrip() {
  const name = document.getElementById('trip-name').value.trim();
  if (!name) { showToast('Bitte Reisename eingeben'); return; }
  const participantIds = [...document.querySelectorAll('input[name="trip-part"]:checked')].map(cb => cb.value);
  if (participantIds.length === 0) { showToast('Mindestens 1 Teilnehmer'); return; }

  const editingId = tripModalState.editingId;
  let targetTripId = editingId;
  if (editingId) {
    const trip = STATE.trips.find(t => t.id === editingId);
    if (trip) { trip.name = name; trip.participantIds = participantIds; }
    if (window.SupabaseSync && trip) SupabaseSync.upsertTrip(trip);
  } else {
    const newTrip = { id: uid(), name, participantIds, expenses: [] };
    STATE.trips.push(newTrip);
    targetTripId = newTrip.id;
    if (window.SupabaseSync) SupabaseSync.upsertTrip(newTrip);
  }

  STATE.ui.selectedTripId = targetTripId;
  STATE.ui.expensesView = 'detail';
  saveState();
  closeTripModal();
  renderExpensesPage();
  showToast('Reise gespeichert ✓');
}

function deleteTrip() {
  const tripId = tripModalState.editingId;
  if (!tripId) return;
  STATE.trips = STATE.trips.filter(t => t.id !== tripId);
  if (STATE.ui.selectedTripId === tripId) {
    STATE.ui.selectedTripId = STATE.trips[0]?.id || null;
  }
  STATE.ui.expensesView = 'list';
  saveState();
  if (window.SupabaseSync) SupabaseSync.deleteTrip(tripId);
  closeTripModal();
  renderExpensesPage();
  showToast('Reise gelöscht');
}

function initTripModal() {
  document.getElementById('trip-modal-close').addEventListener('click', closeTripModal);
  document.getElementById('trip-cancel-btn').addEventListener('click', closeTripModal);
  document.getElementById('trip-save-btn').addEventListener('click', saveTrip);
  document.getElementById('trip-delete-btn').addEventListener('click', deleteTrip);
  document.getElementById('trip-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('trip-modal-overlay')) closeTripModal();
  });
}
