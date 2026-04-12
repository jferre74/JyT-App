/* =====================================================
   holidays.js — German Public Holidays by Bundesland
   ===================================================== */

const BUNDESLAENDER = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen',
};

// Fixed holidays present in ALL states
const FIXED_ALL = [
  { month:1,  day:1,  name:'Neujahr' },
  { month:5,  day:1,  name:'Tag der Arbeit' },
  { month:10, day:3,  name:'Tag der Deutschen Einheit' },
  { month:12, day:25, name:'1. Weihnachtstag' },
  { month:12, day:26, name:'2. Weihnachtstag' },
];

// Fixed holidays per state (in addition to ALL)
const FIXED_BY_STATE = {
  'BW': [{ month:1, day:6, name:'Heilige Drei Könige' },{ month:11, day:1, name:'Allerheiligen' }],
  'BY': [{ month:1, day:6, name:'Heilige Drei Könige' },{ month:8, day:15, name:'Mariä Himmelfahrt' },{ month:11, day:1, name:'Allerheiligen' }],
  'BE': [],
  'BB': [{ month:10, day:31, name:'Reformationstag' }],
  'HB': [{ month:10, day:31, name:'Reformationstag' }],
  'HH': [{ month:10, day:31, name:'Reformationstag' }],
  'HE': [],
  'MV': [{ month:10, day:31, name:'Reformationstag' }],
  'NI': [{ month:10, day:31, name:'Reformationstag' }],
  'NW': [{ month:11, day:1, name:'Allerheiligen' }],
  'RP': [{ month:11, day:1, name:'Allerheiligen' }],
  'SL': [{ month:8, day:15, name:'Mariä Himmelfahrt' },{ month:11, day:1, name:'Allerheiligen' }],
  'SN': [{ month:10, day:31, name:'Reformationstag' }],
  'ST': [{ month:1, day:6, name:'Heilige Drei Könige' },{ month:10, day:31, name:'Reformationstag' }],
  'SH': [{ month:10, day:31, name:'Reformationstag' }],
  'TH': [{ month:9, day:20, name:'Weltkindertag' },{ month:10, day:31, name:'Reformationstag' }],
};

// Easter-based holidays calculator
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31);
  const day   = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month-1, day);
}

function getMovingHolidays(year, bundesland) {
  const easter = easterDate(year);
  const add = (base, days) => {
    const d = new Date(base); d.setDate(d.getDate() + days); return d;
  };
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const result = [
    { date: fmt(add(easter, -2)), name: 'Karfreitag' },
    { date: fmt(easter),          name: 'Ostersonntag' },
    { date: fmt(add(easter, 1)),  name: 'Ostermontag' },
    { date: fmt(add(easter, 39)), name: 'Christi Himmelfahrt' },
    { date: fmt(add(easter, 49)), name: 'Pfingstsonntag' },
    { date: fmt(add(easter, 50)), name: 'Pfingstmontag' },
  ];

  // State-specific moving holidays
  const corpusChristi = ['BW','BY','HE','NW','RP','SL','SN','TH'];
  if (corpusChristi.includes(bundesland)) {
    result.push({ date: fmt(add(easter, 60)), name: 'Fronleichnam' });
  }

  return result;
}

function getHolidaysForYear(year, bundesland) {
  if (!bundesland) return {};
  const map = {}; // date string -> name

  // Fixed ALL
  for (const h of FIXED_ALL) {
    const key = `${year}-${String(h.month).padStart(2,'0')}-${String(h.day).padStart(2,'0')}`;
    map[key] = h.name;
  }
  // Fixed state-specific
  for (const h of (FIXED_BY_STATE[bundesland] || [])) {
    const key = `${year}-${String(h.month).padStart(2,'0')}-${String(h.day).padStart(2,'0')}`;
    map[key] = h.name;
  }
  // Moving (Easter-based)
  for (const h of getMovingHolidays(year, bundesland)) {
    map[h.date] = h.name;
  }

  return map;
}

// Get holiday name for a specific date string, or null
function getHoliday(dateStr) {
  const bl = (STATE.settings && STATE.settings.bundesland) || null;
  if (!bl) return null;
  const year = parseInt(dateStr.slice(0,4), 10);
  const map = getHolidaysForYear(year, bl);
  return map[dateStr] || null;
}
