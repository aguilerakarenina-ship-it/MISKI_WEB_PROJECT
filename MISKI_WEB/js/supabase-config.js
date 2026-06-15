/* ── MISKI · Conexión Supabase ─────────────────────────────────
   Reemplaza estos dos valores con los de tu proyecto Supabase:
   Settings → API → Project URL / anon public key
   ──────────────────────────────────────────────────────────── */
const SUPABASE_URL = 'https://rwpbaumzptxlqtjvxyez.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cGJhdW16cHR4bHF0anZ4eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODE1NTIsImV4cCI6MjA5NzA1NzU1Mn0.P-E3QKmlJoOCj_8e-UTBk_Cr9XLHRRFWczMCYvdflUw';

const supabaseClient = (window.supabase && SUPABASE_URL.indexOf('TU-PROYECTO') === -1)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Tablas que se sincronizan con Supabase.
// 'seeded' se mantiene solo en localStorage (no es una tabla de datos).
const SUPABASE_TABLES = ['auxiliares', 'usuarios', 'asistencia', 'turnos', 'ventas'];

/* ── Capa de datos: caché en memoria + sincronización Supabase ──
   - DB.get()/DB.set() siguen siendo SÍNCRONOS para no romper la app:
     leen/escriben sobre una caché en memoria (_cache) que se
     hidrata desde Supabase al cargar la página.
   - DB.set() además dispara una escritura asíncrona hacia Supabase
     (en segundo plano) para persistir los cambios.
   - Si Supabase no está configurado (claves de ejemplo), la app
     funciona exactamente igual que antes, usando solo localStorage.
*/
const DB = {
  _cache: {},
  _ready: false,
  _lastSynced: {},

  get(key, def) {
    if (key in DB._cache) return DB._cache[key];
    try {
      const v = localStorage.getItem('cg_' + key);
      const parsed = v ? JSON.parse(v) : def;
      DB._cache[key] = parsed;
      return parsed;
    } catch { return def; }
  },

  set(key, val) {
    DB._cache[key] = val;
    try { localStorage.setItem('cg_' + key, JSON.stringify(val)); } catch {}
    if (SUPABASE_TABLES.includes(key)) DB._syncTable(key, val);
  },

  // Sincroniza una tabla con Supabase: inserta/actualiza (upsert) las
  // filas actuales y elimina las que ya no existen en el arreglo local.
  async _syncTable(table, rows) {
    if (!supabaseClient) return;
    try {
      const prevIds = (DB._lastSynced?.[table] || []);
      const currentIds = (rows || []).map(r => r.id);
      const removed = prevIds.filter(id => !currentIds.includes(id));

      if (rows && rows.length) {
        const { error } = await supabaseClient.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      if (removed.length) {
        const { error } = await supabaseClient.from(table).delete().in('id', removed);
        if (error) throw error;
      }
      DB._lastSynced = DB._lastSynced || {};
      DB._lastSynced[table] = currentIds;
    } catch (err) {
      console.error(`Error sincronizando '${table}' con Supabase:`, err);
      if (typeof showToast === 'function') {
        showToast(`No se pudo guardar "${table}" en Supabase (se guardó localmente)`, 'error');
      }
    }
  },

  // Carga todas las tablas desde Supabase a la caché en memoria.
  // Devuelve true si Supabase respondió correctamente.
  async hydrate() {
    if (!supabaseClient) return false;
    try {
      for (const table of SUPABASE_TABLES) {
        const { data, error } = await supabaseClient.from(table).select('*').order('id', { ascending: true });
        if (error) throw error;
        DB._cache[table] = data || [];
        DB._lastSynced[table] = (data || []).map(r => r.id);
        try { localStorage.setItem('cg_' + table, JSON.stringify(data || [])); } catch {}
      }
      DB._ready = true;
      return true;
    } catch (err) {
      console.error('Error cargando datos desde Supabase:', err);
      return false;
    }
  },
};
