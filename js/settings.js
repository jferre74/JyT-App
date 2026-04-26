/* =====================================================
   settings.js — Settings Module
   ===================================================== */

// ── Render Settings Page ──────────────────────────────
function renderSettingsPage() {
  document.getElementById('header-title').textContent = 'Einstellungen';
  document.getElementById('header-actions').innerHTML = '';
  document.getElementById('header-back').innerHTML = '';

  const page = document.getElementById('settings-page');
  const bl = STATE.settings.bundesland || '';
  const blName = BUNDESLAENDER[bl] || 'Keines gewählt';
  const baseCcy = STATE.settings.baseCurrency || 'EUR';

  let html = `
  <!-- Family Members -->
  <div class="settings-section">
    <div class="settings-section-title">Familienmitglieder</div>
    <div class="settings-card" id="members-card">`;

  for (const m of STATE.members) {
    html += `<div class="family-member-row" data-memberid="${m.id}">
      <div class="member-avatar" style="background:${m.color}">${m.name[0]}</div>
      <div class="family-member-name">${m.name}</div>
      <div class="settings-row-chevron" style="width:10px;height:10px;border-right:2px solid;border-bottom:2px solid;transform:rotate(-45deg);display:inline-block"></div>
    </div>`;
  }

  html += `<div class="add-member-row" id="add-member-btn">
    <i class="ph-bold ph-plus" style="font-size: 20px;"></i> Mitglied hinzufügen
  </div>
  </div>
  </div>

  <!-- Calendar -->
  <div class="settings-section">
    <div class="settings-section-title">Kalender</div>
    <div class="settings-card">
      <div class="settings-row" id="bundesland-row">
        <div class="settings-row-icon"><i class="ph-duotone ph-map-trifold" style="font-size: 22px;"></i></div>
        <div class="settings-row-label">Bundesland (Feiertage)</div>
        <div class="settings-row-value" id="bl-value">${blName}</div>
        <div class="settings-row-chevron" style="width:8px;height:8px;border-right:2px solid var(--text-muted);border-bottom:2px solid var(--text-muted);transform:rotate(-45deg);display:inline-block;margin-left:8px"></div>
      </div>
    </div>
  </div>

  <!-- Expenses -->
  <div class="settings-section">
    <div class="settings-section-title">Ausgaben</div>
    <div class="settings-card">
      <div class="settings-row">
        <div class="settings-row-icon"><i class="ph-duotone ph-currency-circle-dollar" style="font-size: 22px;"></i></div>
        <div class="settings-row-label">Basiswährung</div>
        <select class="settings-select" id="base-currency-sel">
          ${CURRENCIES.map(c=>`<option value="${c.code}"${c.code===baseCcy?' selected':''}>${c.code}</option>`).join('')}
        </select>
      </div>
    </div>
  </div>

  <!-- Appearance -->
  <div class="settings-section">
    <div class="settings-section-title">Darstellung</div>
    <div class="settings-card">
      <div class="settings-row" style="cursor:default">
        <div class="settings-row-icon">${STATE.settings.theme === 'light' ? '<i class="ph-duotone ph-sun" style="font-size: 22px;"></i>' : '<i class="ph-duotone ph-moon" style="font-size: 22px;"></i>'}</div>
        <div class="settings-row-label">Design</div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:var(--text-secondary)">${STATE.settings.theme === 'light' ? 'Hell' : 'Dunkel'}</span>
          <label class="theme-toggle" title="Zwischen Hell und Dunkel wechseln">
            <input type="checkbox" id="theme-toggle-cb" ${STATE.settings.theme === 'light' ? 'checked' : ''}>
            <span class="theme-toggle-track"></span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- App Info -->
  <div class="settings-section">
    <div class="settings-section-title">App Info</div>
    <div class="settings-card">
      <div class="settings-row" style="cursor:default">
        <div class="settings-row-icon"><i class="ph-duotone ph-device-mobile" style="font-size: 22px;"></i></div>
        <div class="settings-row-label">JyT App</div>
        <div class="settings-row-value">Version 1.0</div>
      </div>
      <div class="settings-row" id="reset-row">
        <div class="settings-row-icon"><i class="ph-duotone ph-trash" style="font-size: 22px; color:var(--danger)"></i></div>
        <div class="settings-row-label" style="color:var(--danger)">Alle Daten zurücksetzen</div>
      </div>
    </div>
  </div>

  <!-- Cloud Sync -->
  <div class="settings-section">
    <div class="settings-section-title">Cloud Synchronisation (Supabase)</div>
    <div class="settings-card">
      <div class="settings-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
        <label style="font-size:12px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;">Supabase Projekt URL</label>
        <input type="text" id="sb-url" class="settings-input" placeholder="https://xxxx.supabase.co" style="width:100%" value="${STATE.settings.supabaseUrl || ''}">
      </div>
      <div class="settings-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
        <label style="font-size:12px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;">Anon Key</label>
        <div style="display:flex;gap:8px;width:100%;">
          <input type="password" id="sb-key" class="settings-input" placeholder="Supabase Anon Key..." style="flex:1" value="${STATE.settings.supabaseKey || ''}">
          <button class="btn btn-primary btn-sm" id="sb-connect-btn">Verbinden</button>
        </div>
      </div>
      <div class="settings-row" style="cursor:default">
        <div class="settings-row-icon"><i id="sync-status-icon" class="ph-duotone ${getSupabaseClient() ? 'ph-cloud-check' : 'ph-cloud-slash'}" style="font-size: 22px; color: ${getSupabaseClient() ? 'var(--accent)' : 'var(--text-secondary)'}"></i></div>
        <div class="settings-row-label">${getSupabaseClient() ? 'Echtzeit-Sync aktiv' : 'Nicht verbunden'}</div>
        <div class="settings-row-value" id="sync-time-label">${getSupabaseClient() ? new Date(STATE.updatedAt || Date.now()).toLocaleTimeString() : '—'}</div>
      </div>
      ${getSupabaseClient() ? `
      <div class="settings-row" id="sb-force-pull-row" style="cursor:pointer">
        <div class="settings-row-icon"><i class="ph-duotone ph-download-simple" style="font-size: 22px;"></i></div>
        <div class="settings-row-label">Von Supabase laden (Überschreiben)</div>
      </div>` : ''}
    </div>
  </div>`;

  page.innerHTML = html;
  attachSettingsEvents();
}

function attachSettingsEvents() {
  // Member click → open edit modal
  document.querySelectorAll('.family-member-row').forEach(row => {
    row.addEventListener('click', () => openMemberModal(row.dataset.memberid));
  });

  // Add member
  document.getElementById('add-member-btn')?.addEventListener('click', () => openMemberModal(null));

  // Bundesland picker
  document.getElementById('bundesland-row')?.addEventListener('click', () => showBundeslandPicker());

  // Base currency
  document.getElementById('base-currency-sel')?.addEventListener('change', (e) => {
    STATE.settings.baseCurrency = e.target.value;
    saveState();
    showToast('Basiswährung gespeichert ✓');
  });

  // Theme toggle
  document.getElementById('theme-toggle-cb')?.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'light' : 'dark';
    STATE.settings.theme = theme;
    saveState();
    applyTheme(theme);
    renderSettingsPage();
  });

  // Reset
  document.getElementById('reset-row')?.addEventListener('click', () => {
    if (confirm('Wirklich alle Daten zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // Supabase connect button
  document.getElementById('sb-connect-btn')?.addEventListener('click', () => {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    if (!url || !key) { showToast('Bitte URL und Key eingeben'); return; }
    STATE.settings.supabaseUrl = url;
    STATE.settings.supabaseKey = key;
    saveState(true);
    showToast('Verbinde mit Supabase...');
    if (window.initSync) window.initSync().then(() => renderSettingsPage());
  });

  // Force pull from Supabase
  document.getElementById('sb-force-pull-row')?.addEventListener('click', () => {
    if (confirm('Achtung: Dies überschreibt deine lokalen Daten mit den Cloud-Daten. Fortfahren?')) {
      if (window.SupabaseSync) {
        updateSyncUI('Download...', true);
        SupabaseSync.fetchAll().then(ok => {
          if (ok) {
            showToast('Cloud-Daten geladen ✓');
            showPage(STATE.ui.currentPage || 'calendar');
          } else {
            showToast('Fehler beim Laden');
          }
        });
      }
    }
  });
}

// ── Bundesland Picker (inline sheet) ─────────────────
function showBundeslandPicker() {
  // Build an overlay with a list of Bundesländer
  const existing = document.getElementById('bl-sheet');
  if (existing) existing.remove();

  const sheet = document.createElement('div');
  sheet.id = 'bl-sheet';
  sheet.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;
    display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);
    animation:fadeIn 0.2s ease;
  `;
  let inner = `<div style="background:var(--bg-surface);border-radius:24px 24px 0 0;max-width:480px;width:100%;max-height:70dvh;overflow-y:auto;border:1px solid var(--border);border-bottom:none;">
    <div style="padding:16px;border-bottom:1px solid var(--border);font-size:16px;font-weight:700;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;">
      Bundesland wählen
      <button id="bl-close" style="font-size:20px;color:var(--text-secondary);background:none;border:none;cursor:pointer">&times;</button>
    </div>
    <div style="padding:8px;">
      <div data-bl="" style="padding:12px 16px;border-radius:8px;cursor:pointer;color:var(--text-secondary);font-size:14px${!STATE.settings.bundesland?';background:var(--accent-glow);color:var(--accent-light)':''}">
        Keine Feiertage
      </div>`;
  for (const [code, name] of Object.entries(BUNDESLAENDER)) {
    const active = STATE.settings.bundesland === code;
    inner += `<div data-bl="${code}" style="padding:12px 16px;border-radius:8px;cursor:pointer;font-size:14px;color:${active?'var(--accent-light)':'var(--text-primary)'};background:${active?'var(--accent-glow)':'transparent'}">
      ${active ? '✓ ' : ''}${name}
    </div>`;
  }
  inner += `</div></div>`;
  sheet.innerHTML = inner;
  document.body.appendChild(sheet);

  sheet.addEventListener('click', (e) => {
    const row = e.target.closest('[data-bl]');
    if (row) {
      STATE.settings.bundesland = row.dataset.bl;
      saveState();
      sheet.remove();
      renderSettingsPage();
      showToast(`Bundesland: ${BUNDESLAENDER[row.dataset.bl] || 'Keine'} ✓`);
    }
    if (e.target === sheet || e.target.id === 'bl-close') sheet.remove();
  });
}

// ── Member Modal ──────────────────────────────────────
const MEMBER_COLORS = ['#6c63ff','#ff6584','#43e97b','#f7971e','#00c6fb','#a18cd1','#f953c6','#b7f8db','#fa709a','#fee140','#30cfd0','#667eea'];
let memberModalState = { editingId: null, selectedColor: '#6c63ff' };

function openMemberModal(memberId) {
  memberModalState.editingId = memberId;
  const isNew = !memberId;
  const m = isNew ? null : STATE.members.find(mm=>mm.id===memberId);

  document.getElementById('member-modal-title').textContent = isNew ? 'Neues Mitglied' : 'Mitglied bearbeiten';
  document.getElementById('mem-delete-btn').classList.toggle('hidden', isNew);
  document.getElementById('mem-name').value = m?.name || '';
  memberModalState.selectedColor = m?.color || MEMBER_COLORS[0];

  // Render color picker
  const picker = document.getElementById('color-picker');
  picker.innerHTML = MEMBER_COLORS.map(c =>
    `<div class="color-swatch${c===memberModalState.selectedColor?' selected':''}" data-color="${c}" style="background:${c};color:${c}"></div>`
  ).join('');

  picker.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      memberModalState.selectedColor = sw.dataset.color;
      picker.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });

  document.getElementById('member-modal-overlay').classList.remove('hidden');
}

function closeMemberModal() {
  document.getElementById('member-modal-overlay').classList.add('hidden');
  memberModalState.editingId = null;
}

function saveMember() {
  const name = document.getElementById('mem-name').value.trim();
  if (!name) { showToast('Bitte Namen eingeben'); return; }
  const color = memberModalState.selectedColor;
  const editingId = memberModalState.editingId;
  let savedMember;
  if (editingId) {
    const m = STATE.members.find(mm=>mm.id===editingId);
    if (m) { m.name = name; m.color = color; savedMember = m; }
  } else {
    savedMember = { id: uid(), name, color };
    STATE.members.push(savedMember);
  }
  saveState();
  if (window.SupabaseSync && savedMember) SupabaseSync.upsertMember(savedMember);
  closeMemberModal();
  renderSettingsPage();
  showToast('Mitglied gespeichert ✓');
}

function deleteMember() {
  const editingId = memberModalState.editingId;
  if (!editingId) return;
  if (STATE.members.length <= 1) { showToast('Mindestens 1 Mitglied erforderlich'); return; }
  STATE.members = STATE.members.filter(m=>m.id!==editingId);
  // Remove member from trips
  STATE.trips.forEach(t => {
    t.participantIds = t.participantIds.filter(pid=>pid!==editingId);
    t.expenses.forEach(e => {
      e.participantIds = (e.participantIds||[]).filter(pid=>pid!==editingId);
      if (e.payerId === editingId && t.participantIds.length > 0) e.payerId = t.participantIds[0];
    });
  });
  saveState();
  if (window.SupabaseSync) SupabaseSync.deleteMember(editingId);
  closeMemberModal();
  renderSettingsPage();
  showToast('Mitglied entfernt');
}

function initMemberModal() {
  document.getElementById('member-modal-close').addEventListener('click', closeMemberModal);
  document.getElementById('mem-cancel-btn').addEventListener('click', closeMemberModal);
  document.getElementById('mem-save-btn').addEventListener('click', saveMember);
  document.getElementById('mem-delete-btn').addEventListener('click', deleteMember);
  document.getElementById('member-modal-overlay').addEventListener('click', (e) => {
    if (e.target===document.getElementById('member-modal-overlay')) closeMemberModal();
  });
}
