/* ── MISKI · Autenticación con Supabase Auth ───────────────────
   Controla la pantalla de inicio de sesión y protege el acceso
   a la aplicación. Requiere que supabase-config.js (supabaseClient)
   se haya cargado antes que este archivo.
   ──────────────────────────────────────────────────────────── */

const AUTH = {
  // Dominio interno para convertir "usuario" en un correo válido
  // que Supabase Auth pueda procesar (no recibe ni envía correos).
  USER_DOMAIN: 'miski.local',

  // Convierte un nombre de usuario (ej. "revibo") en el correo
  // interno usado por Supabase Auth (ej. "revibo@miski.local").
  // Si el usuario ya escribe un correo completo, se respeta tal cual.
  toEmail(username) {
    const u = (username || '').trim().toLowerCase();
    return u.includes('@') ? u : `${u}@${this.USER_DOMAIN}`;
  },

  session: null,

  // Muestra la pantalla de login y oculta la app
// Muestra la pantalla de login
  showLogin() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
  },

  // Oculta la pantalla de login y muestra la app
  // Oculta la pantalla de login
  showApp() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';

    const nameEl = document.getElementById('sidebar-user-name');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const logoutBtn = document.getElementById('logout-btn');
    const email = this.session?.user?.email;
    const displayName = email ? email.split('@')[0] : null;
    if (displayName && nameEl) nameEl.textContent = displayName;
    if (displayName && avatarEl) avatarEl.textContent = displayName.slice(0, 2).toUpperCase();
    if (!supabaseClient && logoutBtn) logoutBtn.style.display = 'none';
  },

  showError(msg) {
    const err = document.getElementById('login-error');
    if (!err) return;
    err.textContent = msg;
    err.style.display = 'block';
  },

  clearError() {
    const err = document.getElementById('login-error');
    if (err) err.style.display = 'none';
  },

  async signIn(email, password) {
    if (!supabaseClient) {
      this.showError('Supabase no está configurado. No es posible iniciar sesión.');
      return false;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: this.toEmail(email), password });
    if (error) {
      this.showError('Usuario o contraseña incorrectos.');
      return false;
    }
    this.session = data.session;
    return true;
  },

  async signOut() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    this.session = null;
    location.reload();
  },

  // Verifica si ya existe una sesión activa (al recargar la página)
  async checkSession() {
    if (!supabaseClient) {
      // Sin Supabase configurado: no se puede autenticar.
      // Se deja pasar para no bloquear el modo "solo local".
      return true;
    }
    const { data } = await supabaseClient.auth.getSession();
    this.session = data.session;
    return !!this.session;
  },

  // Inicializa el flujo de autenticación. Devuelve una promesa que
  // se resuelve cuando el usuario ha iniciado sesión correctamente.
  init() {
    return new Promise(resolve => {
      const form = document.getElementById('login-form');
      const submitBtn = document.getElementById('login-submit');

      this.checkSession().then(authenticated => {
        if (authenticated) {
          this.showApp();
          resolve();
        } else {
          this.showLogin();
        }
      });

      if (form) {
        form.addEventListener('submit', async e => {
          e.preventDefault();
          this.clearError();
          const email = document.getElementById('login-email').value.trim();
          const password = document.getElementById('login-password').value;
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verificando...'; }
          const ok = await this.signIn(email, password);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Iniciar sesión'; }
          if (ok) {
            this.showApp();
            resolve();
          }
        });
      }
    });
  },
};
