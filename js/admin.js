/* =================================================================
   SPRÁVA — couple/admin dashboard (Vue 3)
   Read-only overview for the newlyweds: all insiders + all wedding
   roles (holders and full descriptions, incl. private custom ones).
   Auth: the admin token (X-Admin-Token) entered once, kept in
   localStorage. Not linked from anywhere public.
   ================================================================= */

const { createApp, ref, computed, onMounted } = Vue;

const TOKEN_KEY = 'weddingAdminToken';

createApp({
  setup() {
    const cfg = ref(null);
    const token = ref(localStorage.getItem(TOKEN_KEY) || '');
    const tokenInput = ref('');
    const authed = ref(false);
    const loading = ref(false);
    const error = ref('');

    const roles = ref([]);
    const members = ref([]);

    // Dev override: ?api=local (→ localhost:7071) or ?api=<url>. Else insiders.json.
    function resolveApiOverride() {
      try {
        const p = new URLSearchParams(location.search).get('api');
        if (!p) return '';
        return p === 'local' ? 'http://localhost:7071/api' : p.replace(/\/$/, '');
      } catch { return ''; }
    }
    const apiOverride = resolveApiOverride();
    const apiBase = computed(() => apiOverride || (cfg.value && cfg.value.apiBase) || '');

    async function loadConfig() {
      try {
        const r = await fetch('insiders.json', { cache: 'no-cache' });
        if (r.ok) cfg.value = await r.json();
      } catch (e) { /* apiBase can still come from ?api= override */ }
    }

    // memberId -> name, to resolve who invented a custom role.
    const memberName = computed(() => {
      const map = {};
      members.value.forEach((m) => { map[m.RowKey] = m.Name; });
      return map;
    });

    const categories = computed(() =>
      (cfg.value && cfg.value.roles && cfg.value.roles.categories) || {
        fixed: { title: 'Pevné role' },
        mandatory: { title: 'Povinné role' },
        optional: { title: 'Voľné role' },
      });

    function rolesByCategory(cat) {
      return roles.value
        .filter((r) => (r.Category || '').toLowerCase() === cat)
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
    }

    const teamCount = computed(() => members.value.filter((m) => m.JoinedTeam).length);
    const takenCount = computed(() => roles.value.filter((r) => r.HolderMemberId).length);

    async function load() {
      if (!token.value) return;
      loading.value = true;
      error.value = '';
      try {
        const headers = { 'X-Admin-Token': token.value };
        const [rr, mr] = await Promise.all([
          fetch(apiBase.value + '/manage/roles', { headers }),
          fetch(apiBase.value + '/manage/members', { headers }),
        ]);
        if (rr.status === 401 || mr.status === 401) {
          error.value = 'Nesprávny admin token.';
          authed.value = false;
          return;
        }
        if (!rr.ok || !mr.ok) throw new Error('HTTP');
        roles.value = (await rr.json()).items || [];
        members.value = (await mr.json()).items || [];
        authed.value = true;
        localStorage.setItem(TOKEN_KEY, token.value);
      } catch (e) {
        console.error('Admin load failed:', e);
        error.value = 'Nepodarilo sa načítať dáta. Beží API a je apiBase správne?';
      } finally {
        loading.value = false;
      }
    }

    function submitToken() {
      token.value = (tokenInput.value || '').trim();
      tokenInput.value = '';
      load();
    }

    function logout() {
      token.value = '';
      authed.value = false;
      roles.value = [];
      members.value = [];
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    }

    function fmtDate(d) {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('sk-SK'); } catch { return d; }
    }

    onMounted(async () => {
      await loadConfig();
      if (token.value) load();
    });

    return {
      token, tokenInput, authed, loading, error,
      roles, members, categories, rolesByCategory, memberName,
      teamCount, takenCount, submitToken, logout, fmtDate,
    };
  },
}).mount('#admin-app');
