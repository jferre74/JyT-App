/* =====================================================
   auth.js — Login / Session Management
   ===================================================== */

const AUTH_KEY   = 'jyt_auth_ok';
const VALID_USER = '2007jyt';
const VALID_PASS = '19041970';

/**
 * Returns true when the user has already authenticated in a previous session.
 */
function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === '1';
}

/**
 * Persist the successful login so the app skips the login screen on next start.
 */
function persistSession() {
  localStorage.setItem(AUTH_KEY, '1');
}

/**
 * Show the login overlay and return a Promise that resolves only when
 * the user supplies correct credentials.
 */
function showLoginScreen() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('login-overlay');
    if (!overlay) { resolve(); return; }

    overlay.classList.remove('hidden');

    const form       = document.getElementById('login-form');
    const userInput  = document.getElementById('login-username');
    const passInput  = document.getElementById('login-password');
    const errMsg     = document.getElementById('login-error');
    const toggleBtn  = document.getElementById('login-toggle-pass');

    // Show/Hide password toggle
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = passInput.type === 'password';
        passInput.type = isHidden ? 'text' : 'password';
        toggleBtn.innerHTML = isHidden
          ? '<i class="ph-bold ph-eye-slash"></i>'
          : '<i class="ph-bold ph-eye"></i>';
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const user = userInput.value.trim();
      const pass = passInput.value.trim();

      if (user === VALID_USER && pass === VALID_PASS) {
        // ✅ Correct credentials
        errMsg.classList.add('hidden');
        persistSession();

        // Animate out
        overlay.classList.add('login-fadeout');
        overlay.addEventListener('animationend', () => {
          overlay.classList.add('hidden');
          resolve();
        }, { once: true });
      } else {
        // ❌ Wrong credentials — shake the card and show error
        errMsg.classList.remove('hidden');
        const card = document.getElementById('login-card');
        card.classList.remove('shake');
        void card.offsetWidth; // reflow to restart animation
        card.classList.add('shake');
      }
    });
  });
}

/**
 * Entry point — called by main.js before initApp().
 * Resolves immediately if already authenticated, otherwise shows login screen.
 */
function requireAuth() {
  if (isAuthenticated()) {
    return Promise.resolve();
  }
  return showLoginScreen();
}
