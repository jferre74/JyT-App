/* =====================================================
   state.js — Global State, Storage & Utilities
   ===================================================== */

// ── Storage Keys ─────────────────────────────────────
const STORAGE_KEY       = 'jyt_app_data_v2';
const THEME_STORAGE_KEY = 'jyt_theme'; // device-local, never synced

// ── Default State ────────────────────────────────────
const DEFAULT_STATE = {
  updatedAt: Date.now(),
  members: [
    { id: 'm1', name: 'Thomas', color: '#6c63ff' },
    { id: 'm2', name: 'Javier',  color: '#ff6584' },
    { id: 'm3', name: 'Martin',   color: '#43e97b' },
  ],
  notes: [
    {
      id: 'note1',
      title: 'Willkommen bei JyT Notizen',
      content: '<h2>Willkommen! 👋</h2><p>Dies ist dein persönlicher Notizblock. Du kannst hier Notizen mit <strong>Formatierungen</strong>, <em>Kursivschrift</em> und Listen erstellen.</p><ul><li>Aufzählungen</li><li>Nummerierte Listen</li><li>Überschriften &amp; mehr</li></ul>',
      created: '2026-03-09T18:00:00.000Z',
      updated: '2026-03-09T18:00:00.000Z'
    },
    {
      id: 'note2',
      title: 'Einkaufsliste',
      content: '<h3>Supermarkt</h3><ul><li>Milch</li><li>Brot</li><li>Käse</li></ul><h3>Drogerie</h3><ul><li>Zahnpasta</li><li>Shampoo</li></ul>',
      created: '2026-03-09T17:00:00.000Z',
      updated: '2026-03-09T17:00:00.000Z'
    },
  ],
  events: [
    {
      id: 'e1', title: 'Zahnarzt Termin', memberId: 'm2',
      start: '2026-03-10T09:00', end: '2026-03-10T10:00',
      recurrence: 'none', seriesId: null
    },
    {
      id: 'e2', title: 'Fußball Training', memberId: 'm3',
      start: '2026-03-12T16:00', end: '2026-03-12T17:30',
      recurrence: 'weekly', seriesId: 'se2'
    },
    {
      id: 'e3', title: 'Familienessen', memberId: 'm1',
      start: '2026-03-15T19:00', end: '2026-03-15T21:00',
      recurrence: 'none', seriesId: null
    },
  ],
  lists: [
    {
      id: 'l1', name: 'Einkauf', icon: '🛒',
      items: [
        { id: 'i1', text: 'Gemüse', checked: false, isSubtitle: false },
        { id: 'i2', text: 'Obst & Gemüse', checked: false, isSubtitle: true },
        { id: 'i3', text: 'Äpfel', checked: true,  isSubtitle: false },
        { id: 'i4', text: 'Bananen', checked: false, isSubtitle: false },
        { id: 'i5', text: 'Milchprodukte', checked: false, isSubtitle: true },
        { id: 'i6', text: 'Milch', checked: false, isSubtitle: false },
        { id: 'i7', text: 'Joghurt', checked: false, isSubtitle: false },
      ]
    },
    {
      id: 'l2', name: 'Urlaub Packliste', icon: '🧳',
      items: [
        { id: 'i10', text: 'Kleidung', checked: false, isSubtitle: true },
        { id: 'i11', text: 'T-Shirts (5x)', checked: false, isSubtitle: false },
        { id: 'i12', text: 'Sonnencreme', checked: false, isSubtitle: false },
        { id: 'i13', text: 'Dokumente', checked: false, isSubtitle: true },
        { id: 'i14', text: 'Reisepass', checked: false, isSubtitle: false },
      ]
    },
  ],
  trips: [
    {
      id: 't1', name: 'Sommerurlaub Mallorca', participantIds: ['m1','m2','m3'],
      expenses: [
        {
          id: 'ex1', desc: 'Hotel', category: 'accommodation',
          amount: 450, currency: 'EUR', payerId: 'm2', date: '2026-07-10',
          participantIds: ['m1','m2','m3'],
          split: 'even', splitData: null, settled: false, paymentMethod: 'card'
        },
        {
          id: 'ex2', desc: 'Abendessen', category: 'food',
          amount: 87.50, currency: 'EUR', payerId: 'm1', date: '2026-07-11',
          participantIds: ['m1','m2','m3'],
          split: 'even', splitData: null, settled: false, paymentMethod: 'cash'
        },
      ]
    }
  ],
  settings: {
    bundesland: 'BY',
    baseCurrency: 'EUR',
    theme: 'dark',
    supabaseUrl: 'https://yjgpgzxeatoumcoqbopo.supabase.co',
    supabaseKey: 'sb_publishable_kaNB1d46jSqNxHsYExdH-A_mxwnCwac',
  },
  ui: {
    currentPage: 'calendar',
    calendarView: 'year-summary',
    calendarDate: new Date().toISOString().slice(0, 10),
    selectedDay: null,
    selectedListId: null,
    selectedTripId: 't1',
    expensesView: 'list',
    plannerZoom: 1.0,
  }
};

// ── State Container ───────────────────────────────────
let STATE = {};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      STATE = deepMerge(DEFAULT_STATE, saved);
    } else {
      STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } catch(e) {
    STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  // Device-local theme overrides whatever is in the synced state
  const localTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (localTheme) {
    STATE.settings.theme = localTheme;
  }
  if (!STATE.ui.selectedListId && STATE.lists.length > 0) {
    STATE.ui.selectedListId = STATE.lists[0].id;
  }
}

function saveState(skipSync = false) {
  try {
    if (!skipSync) STATE.updatedAt = Date.now();
    const toSave = {
      updatedAt: STATE.updatedAt,
      members:  STATE.members,
      events:   STATE.events,
      lists:    STATE.lists,
      trips:    STATE.trips,
      settings: STATE.settings,
      notes:    STATE.notes || [],
      ui: { ...STATE.ui }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch(e) { console.warn('Save failed', e); }
}

function deepMerge(defaults, saved) {
  const result = JSON.parse(JSON.stringify(defaults));
  if (!saved || typeof saved !== 'object') return result;
  for (const key of Object.keys(saved)) {
    if (key in result && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], saved[key]);
    } else if (key in result) {
      result[key] = saved[key];
    }
  }
  // Overwrite arrays entirely from saved
  if (Array.isArray(saved.members)) result.members = saved.members;
  if (Array.isArray(saved.events))  result.events  = saved.events;
  if (Array.isArray(saved.lists))   result.lists   = saved.lists;
  if (Array.isArray(saved.trips))   result.trips   = saved.trips;
  return result;
}

// ── ID Generation ────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ── Member helpers ────────────────────────────────────
function getMember(id) {
  return STATE.members.find(m => m.id === id) || null;
}
function getMemberColor(id) {
  const m = getMember(id);
  return m ? m.color : '#6c63ff';
}
function getMemberName(id) {
  const m = getMember(id);
  return m ? m.name : '?';
}

// ── Date Helpers ──────────────────────────────────────
function parseLocalDate(str) {
  if (!str) return new Date();
  const [y,m,d] = str.slice(0,10).split('-').map(Number);
  return new Date(y, m-1, d);
}
function formatDate(date, opts={}) {
  return date.toLocaleDateString('de-DE', opts);
}
function formatTime(dtStr) {
  if (!dtStr || dtStr.length < 16) return '';
  const [,t] = dtStr.split('T');
  return t.slice(0,5);
}
function isSameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function toDatetimeLocal(date) {
  const pad = n => String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function todayStr() {
  return new Date().toISOString().slice(0,10);
}

// ── Theme ─────────────────────────────────────────────
function applyTheme(theme) {
  const t = theme || 'dark';
  document.body.setAttribute('data-theme', t);
  // Persist locally on this device only (never synced to cloud)
  localStorage.setItem(THEME_STORAGE_KEY, t);
}

// ── Toast ─────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ── Currency Data (100+) ──────────────────────────────
const CURRENCIES = [
  {code:'EUR',name:'Euro'},
  {code:'USD',name:'US Dollar'},
  {code:'GBP',name:'Brit. Pfund'},
  {code:'CHF',name:'Schweizer Franken'},
  {code:'JPY',name:'Japanischer Yen'},
  {code:'CNY',name:'Chinesischer Yuan'},
  {code:'AUD',name:'Australischer Dollar'},
  {code:'CAD',name:'Kanadischer Dollar'},
  {code:'SEK',name:'Schwedische Krone'},
  {code:'NOK',name:'Norwegische Krone'},
  {code:'DKK',name:'Dänische Krone'},
  {code:'PLN',name:'Polnischer Zloty'},
  {code:'CZK',name:'Tschechische Krone'},
  {code:'HUF',name:'Ungarischer Forint'},
  {code:'RON',name:'Rumänischer Leu'},
  {code:'HRK',name:'Kroatische Kuna'},
  {code:'RUB',name:'Russischer Rubel'},
  {code:'TRY',name:'Türkische Lira'},
  {code:'INR',name:'Indische Rupie'},
  {code:'BRL',name:'Brasilianischer Real'},
  {code:'MXN',name:'Mexikanischer Peso'},
  {code:'ARS',name:'Argentinischer Peso'},
  {code:'CLP',name:'Chilenischer Peso'},
  {code:'COP',name:'Kolumbianischer Peso'},
  {code:'PEN',name:'Peruanischer Sol'},
  {code:'UYU',name:'Uruguayischer Peso'},
  {code:'BOB',name:'Bolivianischer Boliviano'},
  {code:'PYG',name:'Paraguayischer Guaraní'},
  {code:'VES',name:'Venezol. Bolívar'},
  {code:'ZAR',name:'Südafrikanischer Rand'},
  {code:'EGP',name:'Ägyptisches Pfund'},
  {code:'NGN',name:'Nigerianische Naira'},
  {code:'KES',name:'Kenianischer Schilling'},
  {code:'GHS',name:'Ghanaischer Cedi'},
  {code:'MAD',name:'Marokkanischer Dirham'},
  {code:'TND',name:'Tunesischer Dinar'},
  {code:'DZD',name:'Algerischer Dinar'},
  {code:'AED',name:'Dirham (VAE)'},
  {code:'SAR',name:'Saudi-Riyal'},
  {code:'QAR',name:'Katarischer Riyal'},
  {code:'KWD',name:'Kuwaitischer Dinar'},
  {code:'BHD',name:'Bahrain-Dinar'},
  {code:'OMR',name:'Omanischer Rial'},
  {code:'ILS',name:'Israelischer Schekel'},
  {code:'JOD',name:'Jordanischer Dinar'},
  {code:'LBP',name:'Libanesisches Pfund'},
  {code:'PKR',name:'Pakistanische Rupie'},
  {code:'BDT',name:'Bangladeschischer Taka'},
  {code:'LKR',name:'Sri-Lankische Rupie'},
  {code:'NPR',name:'Nepalesische Rupie'},
  {code:'MMK',name:'Myanmarischer Kyat'},
  {code:'THB',name:'Thailändischer Baht'},
  {code:'VND',name:'Vietnamesischer Dong'},
  {code:'IDR',name:'Indonesische Rupiah'},
  {code:'MYR',name:'Malaysischer Ringgit'},
  {code:'SGD',name:'Singapur-Dollar'},
  {code:'PHP',name:'Philippinischer Peso'},
  {code:'HKD',name:'Hongkong-Dollar'},
  {code:'TWD',name:'Neuer Taiwan-Dollar'},
  {code:'KRW',name:'Südkoreanischer Won'},
  {code:'MNT',name:'Mongolischer Tögrög'},
  {code:'KZT',name:'Kasachischer Tenge'},
  {code:'UZS',name:'Usbekischer Sum'},
  {code:'GEL',name:'Georgischer Lari'},
  {code:'AMD',name:'Armenischer Dram'},
  {code:'AZN',name:'Aserbaidschanischer Manat'},
  {code:'BYN',name:'Weißrussischer Rubel'},
  {code:'UAH',name:'Ukrainische Hrywnja'},
  {code:'MDL',name:'Moldauischer Leu'},
  {code:'MKD',name:'Mazedonischer Denar'},
  {code:'ALL',name:'Albanischer Lek'},
  {code:'BAM',name:'Bosnische Mark'},
  {code:'RSD',name:'Serbischer Dinar'},
  {code:'BGN',name:'Bulgarischer Lew'},
  {code:'ISK',name:'Isländische Krone'},
  {code:'NZD',name:'Neuseeländischer Dollar'},
  {code:'FJD',name:'Fidschi-Dollar'},
  {code:'PGK',name:'Papua-Neuguinea Kina'},
  {code:'XPF',name:'CFP-Franc'},
  {code:'XOF',name:'CFA-Franc (West)'},
  {code:'XAF',name:'CFA-Franc (Zentral)'},
  {code:'BWP',name:'Botswanischer Pula'},
  {code:'MUR',name:'Mauritische Rupie'},
  {code:'SCR',name:'Seychellische Rupie'},
  {code:'ETB',name:'Äthiopischer Birr'},
  {code:'TZS',name:'Tansanischer Schilling'},
  {code:'UGX',name:'Ugandischer Schilling'},
  {code:'RWF',name:'Ruandischer Franc'},
  {code:'ZMW',name:'Sambianische Kwacha'},
  {code:'MWK',name:'Malawischer Kwacha'},
  {code:'MZN',name:'Mosambikanischer Metical'},
  {code:'AOA',name:'Angolanischer Kwanza'},
  {code:'CDF',name:'Kongolesischer Franc'},
  {code:'GMD',name:'Gambianischer Dalasi'},
  {code:'SLL',name:'Sierra-leonischer Leone'},
  {code:'LRD',name:'Liberianischer Dollar'},
  {code:'GNF',name:'Guineischer Franc'},
  {code:'HTG',name:'Haitianische Gourde'},
  {code:'CUP',name:'Kubanischer Peso'},
  {code:'JMD',name:'Jamaikanischer Dollar'},
  {code:'TTD',name:'Trinidad und Tobago Dollar'},
  {code:'BBD',name:'Barbadianischer Dollar'},
  {code:'BSD',name:'Bahama-Dollar'},
  {code:'BZD',name:'Belizianischer Dollar'},
  {code:'GTQ',name:'Guatemaltekischer Quetzal'},
  {code:'HNL',name:'Honduranische Lempira'},
  {code:'NIO',name:'Nicaraguanischer Córdoba'},
  {code:'CRC',name:'Costa-ricanischer Colón'},
  {code:'PAB',name:'Panamaischer Balboa'},
  {code:'DOP',name:'Dominikanischer Peso'},
];

// ── Expense Calculation ───────────────────────────────
function calcSplits(expense) {
  const total = parseFloat(expense.amount) || 0;
  const parts = expense.participantIds || [];
  const n = parts.length;
  if (n === 0) return {};
  const shares = {};
  if (expense.split === 'even') {
    const share = total / n;
    parts.forEach(pid => shares[pid] = share);
  } else if (expense.split === 'percentage') {
    const sd = expense.splitData || {};
    parts.forEach(pid => {
      const pct = parseFloat(sd[pid] || (100/n));
      shares[pid] = total * pct / 100;
    });
  } else if (expense.split === 'fixed') {
    const sd = expense.splitData || {};
    parts.forEach(pid => {
      shares[pid] = parseFloat(sd[pid] || 0);
    });
  } else { // individual
    const sd = expense.splitData || {};
    parts.forEach(pid => {
      shares[pid] = parseFloat(sd[pid] || 0);
    });
  }
  return shares;
}

function calcBalances(trip) {
  if (!trip) return {};
  const balances = {};
  trip.participantIds.forEach(pid => balances[pid] = 0);
  for (const exp of (trip.expenses || [])) {
    if (exp.settled) continue;
    const shares = calcSplits(exp);
    const payer = exp.payerId;
    // payer paid full amount
    balances[payer] = (balances[payer] || 0) + parseFloat(exp.amount);
    // each participant owes their share
    for (const [pid, share] of Object.entries(shares)) {
      balances[pid] = (balances[pid] || 0) - share;
    }
  }
  return balances;
}

function calcSettlements(balances) {
  const creditors = [], debtors = [];
  for (const [pid, bal] of Object.entries(balances)) {
    if (bal > 0.005) creditors.push({pid, amount: bal});
    else if (bal < -0.005) debtors.push({pid, amount: -bal});
  }
  creditors.sort((a,b) => b.amount - a.amount);
  debtors.sort((a,b) => b.amount - a.amount);
  const settlements = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci], d = debtors[di];
    const amt = Math.min(c.amount, d.amount);
    settlements.push({ from: d.pid, to: c.pid, amount: amt });
    c.amount -= amt; d.amount -= amt;
    if (c.amount < 0.005) ci++;
    if (d.amount < 0.005) di++;
  }
  return settlements;
}

// ── CSV Export ────────────────────────────────────────
function exportTripCSV(trip) {
  if (!trip) return;
  
  const memberIds = trip.participantIds || [];
  const memberNames = memberIds.map(mId => getMemberName(mId));
  
  const header = ['Datum', 'Beschreibung', ...memberNames, 'Zahlungsart'];
  const rows = [header];
  
  for (const exp of (trip.expenses || [])) {
    let dStr = exp.date || '';
    if (dStr && dStr.includes('-')) {
      const [y, m, d] = dStr.split('-');
      dStr = `${d}.${m}.${y}`;
    }
    
    const amtStr = Number(exp.amount).toFixed(2).replace('.', ',');
    
    const row = [dStr, `"${exp.desc}"`];
    
    for (const mId of memberIds) {
      if (exp.payerId === mId) {
        row.push(amtStr);
      } else {
        row.push('');
      }
    }
    
    const zahlungsart = exp.paymentMethod === 'cash' ? 'Bar' : 'Kreditkarte';
    row.push(zahlungsart);
    
    rows.push(row);
  }
  
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; 
  a.download = `${trip.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportiert ✓');
}

// ── Multi-day expansion helper ────────────────────────
// Given a single event instance (possibly from expandRecurring), yield one
// copy per calendar day it spans, clipped to [viewStart, viewEnd].
// Each copy gets _isMultiDay, _dayIndex (0-based), _totalDays metadata.
function expandMultiDay(eventInstance, viewStart, viewEnd) {
  const evStart = parseLocalDate(eventInstance.start);     // midnight of start day
  const evEnd   = parseLocalDate(eventInstance.end);       // midnight of end day

  // Treat same-day events (or events ending before they start) as single-day
  evStart.setHours(0,0,0,0);
  evEnd.setHours(0,0,0,0);

  // Count total days this event spans (inclusive on both ends)
  const MS_PER_DAY = 86400000;
  const totalDays = Math.max(1, Math.round((evEnd - evStart) / MS_PER_DAY) + 1);

  if (totalDays <= 1) return [eventInstance]; // single-day: return as-is

  const pad = n => String(n).padStart(2,'0');
  const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const results = [];
  for (let i = 0; i < totalDays; i++) {
    const dayDate = new Date(evStart.getTime() + i * MS_PER_DAY);
    dayDate.setHours(0,0,0,0);
    // Skip days outside the requested view window
    if (dayDate > viewEnd || dayDate < viewStart) continue;

    const ds = toDateStr(dayDate);
    results.push({
      ...eventInstance,
      // Keep original id so click-to-edit works; day copies share the same id
      start: `${ds}T${eventInstance.start.slice(11,16)}`,
      end:   `${ds}T${eventInstance.end.slice(11,16)}`,
      _isMultiDay: true,
      _dayIndex:   i,          // 0 = first day
      _totalDays:  totalDays,
      _origStart:  eventInstance.start,
      _origEnd:    eventInstance.end,
    });
  }
  return results;
}

// ── Recurrence expansion ─────────────────────────────
function expandRecurring(event, viewStart, viewEnd) {
  if (event.recurrence === 'none' || !event.recurrence) {
    const evStart = parseLocalDate(event.start);
    const evEnd   = parseLocalDate(event.end);
    evStart.setHours(0,0,0,0);
    evEnd.setHours(0,0,0,0);
    // Event is visible if it starts before viewEnd AND ends on/after viewStart
    if (evStart <= viewEnd && evEnd >= viewStart) return expandMultiDay(event, viewStart, viewEnd);
    return [];
  }
  const instances = [];
  const startDate = parseLocalDate(event.start);
  const endDate   = parseLocalDate(event.end);
  const duration  = endDate - startDate;
  let cur = new Date(startDate);
  let safety = 0;
  while (cur <= viewEnd && safety++ < 400) {
    if (cur >= viewStart) {
      const instanceEnd = new Date(cur.getTime() + duration);
      const pad = n => String(n).padStart(2,'0');
      const dt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${event.start.slice(11,16)}`;
      const instance = {
        ...event,
        id: `${event.id}_${cur.getTime()}`,
        start: dt(cur),
        end:   dt(instanceEnd),
        _seriesId: event.id,
        _instanceDate: cur.toISOString().slice(0,10),
      };
      instances.push(...expandMultiDay(instance, viewStart, viewEnd));
    }
    // Advance
    if (event.recurrence === 'daily')        cur.setDate(cur.getDate()+1);
    else if (event.recurrence === 'weekly')  cur.setDate(cur.getDate()+7);
    else if (event.recurrence === 'monthly') cur.setMonth(cur.getMonth()+1);
    else if (event.recurrence === 'annually')cur.setFullYear(cur.getFullYear()+1);
    else break;
  }
  return instances;
}

function getEventsForDay(dateStr) {
  const day = parseLocalDate(dateStr);
  const viewStart = new Date(day); viewStart.setHours(0,0,0,0);
  const viewEnd   = new Date(day); viewEnd.setHours(23,59,59,999);
  const results = [];
  for (const ev of STATE.events) {
    // expandRecurring now returns one instance per spanned day,
    // all already filtered/clipped to [viewStart, viewEnd]
    results.push(...expandRecurring(ev, viewStart, viewEnd));
  }
  return results.sort((a,b) => a.start.localeCompare(b.start));
}

function getEventsForMonth(year, month) {
  // month: 0-indexed
  const viewStart = new Date(year, month, 1);
  const viewEnd   = new Date(year, month+1, 0, 23, 59, 59);
  const results = [];
  for (const ev of STATE.events) {
    results.push(...expandRecurring(ev, viewStart, viewEnd));
  }
  return results;
}
