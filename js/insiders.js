/* =================================================================
   PRE ZASVÄTENÝCH — gated insiders' area (Vue 3)
   Phase 1: name+key login + "join the organizing team".
   Content comes from insiders.json; API base is configured there.
   Identity (memberId) is kept in localStorage for return visits.
   ================================================================= */

const { createApp, ref, reactive, computed, onMounted } = Vue;

const STORAGE_KEY = 'weddingInsider';

createApp({
  setup() {
    const cfg = ref(null);
    const loadError = ref(false);

    // Session: { memberId, name, joinedTeam } or null
    const session = ref(readSession());
    const authed = computed(() => !!session.value);

    const login = reactive({ name: '', key: '', busy: false, error: '' });

    const joinChecked = ref(false);
    const joining = ref(false);
    const joinError = ref('');

    const apiBase = computed(() => (cfg.value && cfg.value.apiBase) || '');

    // --- session helpers ---
    function readSession() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }
    function saveSession(s) {
      session.value = s;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    }
    function logout() {
      session.value = null;
      joinChecked.value = false;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // --- config ---
    async function loadConfig() {
      try {
        const r = await fetch('insiders.json', { cache: 'no-cache' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        cfg.value = await r.json();
      } catch (e) {
        console.error('Failed to load insiders.json:', e);
        loadError.value = true;
      }
    }

    // --- login ---
    async function submitLogin() {
      login.error = '';
      if (!login.name.trim() || !login.key.trim()) {
        login.error = 'Vyplň meno aj kľúč.';
        return;
      }
      login.busy = true;
      try {
        const r = await fetch(apiBase.value + '/insider/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: login.name, key: login.key }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) {
          login.error = (cfg.value.login && cfg.value.login.error) || 'Prihlásenie zlyhalo.';
          return;
        }
        saveSession({ memberId: data.memberId, name: data.name, joinedTeam: !!data.joinedTeam });
        login.name = '';
        login.key = '';
      } catch (e) {
        console.error('Login failed:', e);
        login.error = 'Nepodarilo sa spojiť so serverom. Skús to znova.';
      } finally {
        login.busy = false;
      }
    }

    // --- join the org team ---
    async function joinTeam() {
      if (!session.value || !joinChecked.value) return;
      joinError.value = '';
      joining.value = true;
      try {
        const r = await fetch(apiBase.value + '/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: session.value.memberId }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error('join failed');
        saveSession({ ...session.value, joinedTeam: true });
      } catch (e) {
        console.error('Join team failed:', e);
        joinError.value = 'Nepodarilo sa pridať do tímu. Skús to znova.';
      } finally {
        joining.value = false;
      }
    }

    onMounted(loadConfig);

    return {
      cfg, loadError, session, authed,
      login, submitLogin,
      joinChecked, joining, joinError, joinTeam,
      logout,
    };
  },
}).mount('#insiders-app');
