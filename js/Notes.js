/* =====================================================
   notes.js — Notes Module (Rich Text Editor)
   ===================================================== */

// Notes state lives in STATE.notes[]
// Each note: { id, title, content (HTML string), created, updated }

let notesView = 'list'; // 'list' | 'editor'
let activeNoteId = null;

// ── Render Notes Page ─────────────────────────────────
function renderNotesPage() {
  if (notesView === 'editor' && activeNoteId) {
    renderNoteEditor(activeNoteId);
  } else {
    notesView = 'list';
    renderNotesList();
  }
}

// ── Notes List View ───────────────────────────────────
function renderNotesList() {
  document.getElementById('header-title').textContent = 'Notizen';
  document.getElementById('header-actions').innerHTML = '';
  document.getElementById('header-back').innerHTML = '';

  const page = document.getElementById('notes-page');
  const notes = STATE.notes || [];

  if (notes.length === 0) {
    page.innerHTML = `
      <div class="no-notes">
        <div class="notes-empty-icon">📝</div>
        <h3>Keine Notizen</h3>
        <p>Tippe auf + um deine erste Notiz zu erstellen</p>
      </div>`;
  } else {
    let html = `<div class="notes-list">`;
    // Sort newest first
    const sorted = [...notes].sort((a, b) => new Date(b.updated) - new Date(a.updated));
    for (const note of sorted) {
      const preview = stripHTML(note.content).slice(0, 80) || 'Leere Notiz';
      const date = formatNoteDate(note.updated);
      html += `<div class="note-card" data-noteid="${note.id}">
        <div class="note-card-title">${note.title || 'Ohne Titel'}</div>
        <div class="note-card-meta">
          <span class="note-card-date">${date}</span>
          <span class="note-card-preview">${preview}</span>
        </div>
      </div>`;
    }
    html += `</div>`;
    page.innerHTML = html;

    page.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        activeNoteId = card.dataset.noteid;
        notesView = 'editor';
        renderNoteEditor(activeNoteId);
      });
    });
  }

  ensureFAB('notes', '+', () => createNote());
}

function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

function formatNoteDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const today = new Date();
  if (isSameDay(d, today)) {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

// ── Create / Delete Note ──────────────────────────────
function createNote() {
  if (!STATE.notes) STATE.notes = [];
  const now = new Date().toISOString();
  const note = { id: uid(), title: 'Neue Notiz', content: '<p><br></p>', created: now, updated: now };
  STATE.notes.push(note);
  saveState();
  if (window.SupabaseSync) SupabaseSync.upsertNote(note);
  activeNoteId = note.id;
  notesView = 'editor';
  renderNoteEditor(note.id);
}

function deleteNote(noteId) {
  // Hard delete — called only after user confirmed
  STATE.notes = (STATE.notes || []).filter(n => n.id !== noteId);
  saveState();
  if (window.SupabaseSync) SupabaseSync.deleteNote(noteId);
  activeNoteId = null;
  notesView = 'list';
  renderNotesList();
  showToast('Notiz gelöscht');
}

// Non-blocking inline confirmation — replaces window.confirm()
function showDeleteConfirm(noteId) {
  const ha = document.getElementById('header-actions');
  if (!ha) return;
  ha.innerHTML = `
    <span style="font-size:12px;color:var(--text-secondary);margin-right:4px;">Löschen?</span>
    <button class="btn btn-danger btn-sm" id="notes-confirm-delete-btn" style="padding:4px 10px;font-size:12px;">Ja</button>
    <button class="btn btn-ghost btn-sm" id="notes-cancel-delete-btn" style="padding:4px 10px;font-size:12px;">Nein</button>
  `;
  document.getElementById('notes-confirm-delete-btn').addEventListener('click', () => {
    deleteNote(noteId);
  });
  document.getElementById('notes-cancel-delete-btn').addEventListener('click', () => {
    // Restore original header
    renderNoteEditor(activeNoteId);
  });
}

// ── Note Editor ────────────────────────────────────────
function renderNoteEditor(noteId) {
  const note = (STATE.notes || []).find(n => n.id === noteId);
  if (!note) { notesView = 'list'; renderNotesList(); return; }

  // iOS: back button top-left, delete top-right
  document.getElementById('header-back').innerHTML = `
    <button class="ios-back-btn" id="notes-back-btn" title="Zurück">
      <i class="ph-bold ph-caret-left"></i>
      <span>Notizen</span>
    </button>
  `;
  document.getElementById('header-actions').innerHTML = `
    <button class="header-btn" id="notes-delete-btn" title="Notiz löschen" style="color:var(--danger)">
      <i class="ph-bold ph-trash" style="font-size: 20px;"></i>
    </button>
  `;
  removeFAB();

  const page = document.getElementById('notes-page');
  page.innerHTML = `
    <div class="editor-wrapper">
      <!-- Toolbar -->
      <div class="editor-toolbar" id="editor-toolbar">
        <div class="toolbar-group">
          <select class="toolbar-select" id="toolbar-block">
            <option value="p">Text</option>
            <option value="h1">Titel</option>
            <option value="h2">Überschrift 1</option>
            <option value="h3">Überschrift 2</option>
            <option value="h4">Überschrift 3</option>
            <option value="pre">Code</option>
          </select>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="bold"        title="Fett (Strg+B)"><b>B</b></button>
          <button class="toolbar-btn" data-cmd="italic"      title="Kursiv (Strg+I)"><i>I</i></button>
          <button class="toolbar-btn" data-cmd="underline"   title="Unterstrichen (Strg+U)"><u>U</u></button>
          <button class="toolbar-btn" data-cmd="strikeThrough" title="Durchgestrichen"><s>S</s></button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="insertUnorderedList" title="Aufzählung">
            <i class="ph-bold ph-list-dashes" style="font-size: 18px;"></i>
          </button>
          <button class="toolbar-btn" data-cmd="insertOrderedList" title="Nummerierte Liste">
            <i class="ph-bold ph-list-numbers" style="font-size: 18px;"></i>
          </button>
          <button class="toolbar-btn" data-cmd="indent"   title="Einrücken">
            <i class="ph-bold ph-text-indent" style="font-size: 18px;"></i>
          </button>
          <button class="toolbar-btn" data-cmd="outdent"  title="Ausrücken">
            <i class="ph-bold ph-text-outdent" style="font-size: 18px;"></i>
          </button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="justifyLeft"   title="Links"><i class="ph-bold ph-text-align-left" style="font-size: 18px;"></i></button>
          <button class="toolbar-btn" data-cmd="justifyCenter" title="Zentriert"><i class="ph-bold ph-text-align-center" style="font-size: 18px;"></i></button>
          <button class="toolbar-btn" data-cmd="justifyRight"  title="Rechts"><i class="ph-bold ph-text-align-right" style="font-size: 18px;"></i></button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="insertHorizontalRule" title="Trennlinie">—</button>
          <button class="toolbar-btn" data-cmd="removeFormat" title="Formatierung entfernen">✕</button>
        </div>
      </div>

      <!-- Title -->
      <div class="editor-title-wrap">
        <div class="editor-title"
          contenteditable="true"
          id="note-title-field"
          data-placeholder="Titel der Notiz…"
          spellcheck="true">${escapeHTML(note.title)}</div>
      </div>

      <!-- Body -->
      <div class="editor-body"
        contenteditable="true"
        id="note-body-field"
        spellcheck="true">${note.content}</div>
    </div>
  `;

  // Attach toolbar events
  document.getElementById('notes-back-btn').addEventListener('click', () => {
    saveCurrentNote();
    notesView = 'list';
    renderNotesList();
  });
  document.getElementById('notes-delete-btn').addEventListener('click', () => {
    showDeleteConfirm(noteId);
  });

  // Block format select
  document.getElementById('toolbar-block').addEventListener('change', (e) => {
    document.getElementById('note-body-field').focus();
    document.execCommand('formatBlock', false, e.target.value);
    updateToolbarState();
  });

  // Toolbar buttons
  document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent editor losing focus
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      updateToolbarState();
    });
  });

  // Auto-save on input
  const body  = document.getElementById('note-body-field');
  const title = document.getElementById('note-title-field');

  let saveTimer;
  const scheduleAutoSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrentNote, 800);
  };

  body.addEventListener('input', () => { scheduleAutoSave(); updateToolbarState(); });
  body.addEventListener('keyup', updateToolbarState);
  body.addEventListener('mouseup', updateToolbarState);
  title.addEventListener('input', scheduleAutoSave);

  // Tab key in body → indent
  body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
    }
  });

  // Enter in title → move focus to body
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      body.focus();
    }
  });

  // Focus body if content is the placeholder
  if (!note.content || note.content === '<p><br></p>') {
    setTimeout(() => { body.focus(); }, 100);
  }
}

function escapeHTML(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function saveCurrentNote() {
  if (!activeNoteId) return;
  const note = (STATE.notes || []).find(n => n.id === activeNoteId);
  if (!note) return;
  const titleEl = document.getElementById('note-title-field');
  const bodyEl  = document.getElementById('note-body-field');
  if (titleEl) note.title   = titleEl.textContent.trim() || 'Ohne Titel';
  if (bodyEl)  note.content = bodyEl.innerHTML;
  note.updated = new Date().toISOString();
  saveState();
  if (window.SupabaseSync) SupabaseSync.upsertNote(note);
}

// ── Toolbar active state ──────────────────────────────
function updateToolbarState() {
  const cmds = ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight'];
  cmds.forEach(cmd => {
    const btn = document.querySelector(`.toolbar-btn[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
  // Block format
  const sel = document.getElementById('toolbar-block');
  if (sel) {
    const val = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g,'') || 'p';
    if ([...sel.options].some(o => o.value === val)) sel.value = val;
  }
}

// Init (no separate modal needed — creation is inline)
function initNotesModule() {
  // Ensure notes array exists in state
  if (!STATE.notes) STATE.notes = [];
}
