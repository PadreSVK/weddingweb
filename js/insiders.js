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

    // Roles ("Boj o vysnenú rolu") — fetched from the API for the logged-in member.
    const roles = ref([]);
    const rolesError = ref('');
    const rolesBusy = ref('');   // id of the role whose action is in flight ('' = none)
    const create = reactive({ open: false, title: '', description: '', busy: false, error: '' });

    // Dev override: add ?api=local (→ http://localhost:7071/api) or ?api=<url> to
    // point at a local Functions host. Default & production use insiders.json apiBase.
    function resolveApiOverride() {
      try {
        const p = new URLSearchParams(location.search).get('api');
        if (!p) return '';
        return p === 'local' ? 'http://localhost:7071/api' : p.replace(/\/$/, '');
      } catch { return ''; }
    }
    const apiOverride = resolveApiOverride();
    const apiBase = computed(() => apiOverride || (cfg.value && cfg.value.apiBase) || '');

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
      roles.value = [];
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
        loadRoles();
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

    // --- roles ---
    // The catalog + live holder state come from the API (per logged-in member).
    // Category rules are enforced server-side; the buttons just mirror the
    // canClaim / canRelease / canTake flags each role comes back with.
    async function loadRoles() {
      if (!session.value) return;
      rolesError.value = '';
      try {
        const r = await fetch(apiBase.value + '/roles?memberId=' + encodeURIComponent(session.value.memberId));
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error('load');
        roles.value = data.roles || [];
      } catch (e) {
        console.error('Load roles failed:', e);
        rolesError.value = 'Role sa nepodarilo načítať. Skús obnoviť stránku.';
      }
    }

    function rolesByCategory(cat) {
      return roles.value.filter(r => r.category === cat);
    }

    async function roleAction(action, role) {
      if (!session.value || rolesBusy.value) return;
      rolesBusy.value = role.id;
      rolesError.value = '';
      try {
        const r = await fetch(apiBase.value + '/roles/' + action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: session.value.memberId, roleId: role.id }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error(data.error || 'action');
        await loadRoles();
      } catch (e) {
        console.error('Role action failed:', e);
        rolesError.value = e.message && e.message !== 'action' ? e.message : 'Akcia zlyhala. Skús to znova.';
      } finally {
        rolesBusy.value = '';
      }
    }
    const claimRole = (r) => roleAction('claim', r);
    const releaseRole = (r) => roleAction('release', r);
    const takeRole = (r) => roleAction('take', r);

    async function createRole() {
      if (!session.value || create.busy) return;
      if (!create.title.trim()) { create.error = 'Zadaj názov roly.'; return; }
      create.busy = true;
      create.error = '';
      try {
        const r = await fetch(apiBase.value + '/roles/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: session.value.memberId,
            title: create.title,
            description: create.description,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error(data.error || 'create');
        create.title = '';
        create.description = '';
        create.open = false;
        await loadRoles();
      } catch (e) {
        console.error('Create role failed:', e);
        create.error = 'Rolu sa nepodarilo vytvoriť. Skús to znova.';
      } finally {
        create.busy = false;
      }
    }

    onMounted(async () => {
      await loadConfig();
      if (session.value) loadRoles();
    });

    return {
      cfg, loadError, session, authed,
      login, submitLogin,
      joinChecked, joining, joinError, joinTeam,
      roles, rolesError, rolesBusy, rolesByCategory,
      claimRole, releaseRole, takeRole,
      create, createRole,
      logout,
    };
  },
}).mount('#insiders-app');
