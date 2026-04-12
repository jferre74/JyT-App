/* =====================================================
   supabase.js — Supabase Client & CRUD Helpers
   ===================================================== */

let _supabaseClient = null;
let _realtimeChannel = null;

// ── Client Factory ────────────────────────────────────
function getSupabaseClient() {
  const url = STATE?.settings?.supabaseUrl?.trim();
  const key = STATE?.settings?.supabaseKey?.trim();
  if (!url || !key) return null;

  // Re-create client if credentials changed
  const currentCreds = `${url}|${key}`;
  if (_supabaseClient && _supabaseClient._creds === currentCreds) return _supabaseClient;

  _supabaseClient = window.supabase.createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } }
  });
  _supabaseClient._creds = currentCreds;
  return _supabaseClient;
}

// ── SupabaseSync Object ────────────────────────────────
const SupabaseSync = {

  // ── Fetch all data from all tables and merge into STATE ──
  async fetchAll() {
    const sb = getSupabaseClient();
    if (!sb) return false;

    try {
      const [members, events, notes, trips, expenses, settings, lists, listItems] = await Promise.all([
        sb.from('members').select('*'),
        sb.from('events').select('*'),
        sb.from('notes').select('*'),
        sb.from('trips').select('*'),
        sb.from('expenses').select('*'),
        sb.from('app_settings').select('*').eq('id', 'family').single(),
        sb.from('lists').select('*'),
        sb.from('list_items').select('*').order('sort_order'),
      ]);

      if (members.data?.length)  STATE.members = members.data.map(dbToMember);
      if (events.data?.length)   STATE.events  = events.data.map(dbToEvent);
      if (notes.data?.length)    STATE.notes   = notes.data.map(dbToNote);

      // ── Trips: merge Supabase data but PRESERVE locally-stored budgets if Supabase returns empty
      if (trips.data?.length) {
        const prevTrips = STATE.trips || [];
        STATE.trips = trips.data.map(t => {
          const trip = dbToTrip(t, expenses.data || []);
          // If Supabase returned empty budgets, check if we have local data to restore
          const hasCloudBudgets = trip.budgets && Object.keys(trip.budgets).length > 0;
          if (!hasCloudBudgets) {
            const localTrip = prevTrips.find(lt => lt.id === trip.id);
            if (localTrip?.budgets && Object.keys(localTrip.budgets).length > 0) {
              console.warn('[Supabase] budgets column may be missing — restoring from localStorage for trip:', trip.id);
              trip.budgets = localTrip.budgets;
              // Push local budgets back up to Supabase asynchronously
              this.upsertTrip(trip).catch(err => console.error('[Supabase] budget re-sync failed:', err));
            }
          }
          console.log('[Supabase] Loaded trip budgets:', trip.id, trip.budgets);
          return trip;
        });
      }

      if (settings.data)         Object.assign(STATE.settings, dbToSettings(settings.data));
      if (lists.data?.length)    STATE.lists   = lists.data.map(l => dbToList(l, listItems.data || []));

      // Save merged state locally
      saveState(true);
      return true;
    } catch (err) {
      console.error('[Supabase] fetchAll error:', err);
      return false;
    }
  },

  // ── Members ───────────────────────────────────────────
  async upsertMember(member) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertMember', member);
    const { error } = await sb.from('members').upsert(memberToDb(member));
    if (error) console.error('[Supabase] upsertMember:', error);
  },
  async deleteMember(id) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('deleteMember', { id });
    const { error } = await sb.from('members').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteMember:', error);
  },

  // ── Events ────────────────────────────────────────────
  async upsertEvent(event) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertEvent', event);
    const { error } = await sb.from('events').upsert(eventToDb(event));
    if (error) console.error('[Supabase] upsertEvent:', error);
  },
  async deleteEvent(id) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('deleteEvent', { id });
    const { error } = await sb.from('events').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteEvent:', error);
  },

  // ── Notes ─────────────────────────────────────────────
  async upsertNote(note) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertNote', note);
    const { error } = await sb.from('notes').upsert(noteToDb(note));
    if (error) console.error('[Supabase] upsertNote:', error);
  },
  async deleteNote(id) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('deleteNote', { id });
    const { error } = await sb.from('notes').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteNote:', error);
  },

  // ── Trips ─────────────────────────────────────────────
  async upsertTrip(trip) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertTrip', trip);
    const payload = tripToDb(trip);
    console.log('[Supabase] upsertTrip payload:', JSON.stringify(payload));
    const { error } = await sb.from('trips').upsert(payload);
    if (error) {
      console.error('[Supabase] upsertTrip ERROR:', error);
      if (typeof showToast === 'function') showToast('❌ Budget konnte nicht gespeichert werden: ' + (error.message || error.code));
      throw error; // Propagate so .then() success toast does NOT fire
    }
    console.log('[Supabase] upsertTrip SUCCESS for trip:', trip.id, 'budgets:', JSON.stringify(trip.budgets));
  },
  async deleteTrip(id) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('deleteTrip', { id });
    const { error } = await sb.from('trips').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteTrip:', error);
  },

  // ── Expenses ──────────────────────────────────────────
  async upsertExpense(expense, tripId) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertExpense', { ...expense, tripId });
    const { error } = await sb.from('expenses').upsert(expenseToDb(expense, tripId));
    if (error) console.error('[Supabase] upsertExpense:', error);
  },
  async deleteExpense(id) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('deleteExpense', { id });
    const { error } = await sb.from('expenses').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteExpense:', error);
  },

  // ── Lists ─────────────────────────────────────────────
  async upsertList(list) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertList', list);
    const { error } = await sb.from('lists').upsert({ id: list.id, name: list.name, icon: list.icon });
    if (error) console.error('[Supabase] upsertList:', error);
    // Sync items
    await this.upsertListItems(list.id, list.items || []);
  },
  async deleteList(id) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('deleteList', { id });
    const { error } = await sb.from('lists').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteList:', error);
  },
  async upsertListItems(listId, items) {
    const sb = getSupabaseClient(); if (!sb) return;
    // Delete existing items for this list, then re-insert
    await sb.from('list_items').delete().eq('list_id', listId);
    if (items.length === 0) return;
    const rows = items.map((item, i) => ({
      id: item.id, list_id: listId, text: item.text,
      checked: item.checked || false,
      is_subtitle: item.isSubtitle || false,
      sort_order: i
    }));
    const { error } = await sb.from('list_items').insert(rows);
    if (error) console.error('[Supabase] upsertListItems:', error);
  },

  // ── Settings ──────────────────────────────────────────
  async upsertSettings(settings) {
    const sb = getSupabaseClient(); if (!sb) return this._queueOp('upsertSettings', settings);
    const { error } = await sb.from('app_settings').upsert({
      id: 'family',
      bundesland: settings.bundesland || null,
      base_currency: settings.baseCurrency || 'EUR',
      theme: settings.theme || 'dark',
    });
    if (error) console.error('[Supabase] upsertSettings:', error);
  },

  // ── Realtime subscription ─────────────────────────────
  subscribeToChanges(onChangeCallback) {
    const sb = getSupabaseClient();
    if (!sb) return;

    // Unsubscribe from any existing channel
    if (_realtimeChannel) {
      sb.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }

    _realtimeChannel = sb.channel('jyt-family-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },
        payload => onChangeCallback('events', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' },
        payload => onChangeCallback('notes', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' },
        payload => onChangeCallback('members', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' },
        payload => onChangeCallback('trips', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' },
        payload => onChangeCallback('expenses', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' },
        payload => onChangeCallback('lists', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' },
        payload => onChangeCallback('list_items', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' },
        payload => onChangeCallback('app_settings', payload))
      .subscribe(status => {
        console.log('[Supabase] Realtime status:', status);
        updateSyncUI(status === 'SUBSCRIBED' ? 'Echtzeit aktiv' : status, false, status === 'CHANNEL_ERROR');
      });

    return _realtimeChannel;
  },

  // ── Offline Queue ─────────────────────────────────────
  _offlineQueueKey: 'JYT_OFFLINE_QUEUE',

  _queueOp(op, payload) {
    const queue = this._loadQueue();
    queue.push({ op, payload, ts: Date.now() });
    localStorage.setItem(this._offlineQueueKey, JSON.stringify(queue));
    console.log('[Supabase] Queued offline op:', op);
  },

  _loadQueue() {
    try { return JSON.parse(localStorage.getItem(this._offlineQueueKey) || '[]'); }
    catch { return []; }
  },

  async flushOfflineQueue() {
    const queue = this._loadQueue();
    if (queue.length === 0) return;
    console.log(`[Supabase] Flushing ${queue.length} offline ops...`);
    const remaining = [];
    for (const item of queue) {
      try {
        const fn = this[item.op];
        if (typeof fn === 'function') {
          await fn.call(this, item.payload, item.payload?.tripId);
        }
      } catch (err) {
        console.warn('[Supabase] Failed to flush op:', item.op, err);
        remaining.push(item);
      }
    }
    localStorage.setItem(this._offlineQueueKey, JSON.stringify(remaining));
    if (remaining.length === 0) showToast('Offline-Änderungen synchronisiert ✓');
  }
};

// ── DB ↔ JS Mapping helpers ───────────────────────────

function memberToDb(m) {
  return { id: m.id, name: m.name, color: m.color };
}
function dbToMember(row) {
  return { id: row.id, name: row.name, color: row.color };
}

function eventToDb(ev) {
  return {
    id: ev.id,
    title: ev.title,
    member_id: ev.memberId || null,
    start_at: ev.start,
    end_at: ev.end || null,
    recurrence: ev.recurrence || 'none',
    series_id: ev.seriesId || null,
  };
}
function dbToEvent(row) {
  return {
    id: row.id,
    title: row.title,
    memberId: row.member_id,
    start: row.start_at,
    end: row.end_at || row.start_at,
    recurrence: row.recurrence || 'none',
    seriesId: row.series_id || null,
  };
}

function noteToDb(n) {
  return { id: n.id, title: n.title, content: n.content || '' };
}
function dbToNote(row) {
  return {
    id: row.id, title: row.title, content: row.content || '',
    created: row.created_at || new Date().toISOString(),
    updated: row.updated_at || new Date().toISOString(),
  };
}

function tripToDb(t) {
  return { id: t.id, name: t.name, participant_ids: t.participantIds || [], budgets: t.budgets || {}, archived: t.archived || false };
}
function dbToTrip(row, allExpenses) {
  const tripExpenses = allExpenses
    .filter(e => e.trip_id === row.id)
    .map(dbToExpense);
  return {
    id: row.id,
    name: row.name,
    participantIds: row.participant_ids || [],
    budgets: row.budgets || {},
    archived: row.archived || false,
    expenses: tripExpenses,
  };
}

function expenseToDb(exp, tripId) {
  return {
    id: exp.id,
    trip_id: tripId || exp.tripId,
    description: exp.desc,
    category: exp.category,
    amount: exp.amount,
    currency: exp.currency || 'EUR',
    payer_id: exp.payerId,
    date: exp.date,
    participant_ids: exp.participantIds || [],
    split: exp.split || 'even',
    split_data: exp.splitData || null,
    settled: exp.settled || false,
    payment_method: exp.paymentMethod || 'card',
  };
}
function dbToExpense(row) {
  return {
    id: row.id,
    desc: row.description,
    category: row.category,
    amount: parseFloat(row.amount),
    currency: row.currency || 'EUR',
    payerId: row.payer_id,
    date: row.date,
    participantIds: row.participant_ids || [],
    split: row.split || 'even',
    splitData: row.split_data || null,
    settled: row.settled || false,
    paymentMethod: row.payment_method || 'card',
  };
}

function dbToList(row, allItems) {
  const items = allItems
    .filter(i => i.list_id === row.id)
    .map(i => ({
      id: i.id, text: i.text,
      checked: i.checked || false,
      isSubtitle: i.is_subtitle || false,
    }));
  return { id: row.id, name: row.name, icon: row.icon || '📦', items };
}

function dbToSettings(row) {
  return {
    bundesland: row.bundesland || '',
    baseCurrency: row.base_currency || 'EUR',
    theme: row.theme || 'dark',
  };
}

// Make available globally
window.SupabaseSync = SupabaseSync;
window.getSupabaseClient = getSupabaseClient;
