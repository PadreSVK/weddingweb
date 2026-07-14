/* =================================================================
   SPRÁVA — couple/admin dashboard (Vue 3)
   Read-only overview for the newlyweds: all insiders + all wedding
   roles (holders and full descriptions, incl. private custom ones).
   Auth: the admin token (X-Admin-Token) entered once, kept in
   localStorage. Not linked from anywhere public.
   ================================================================= */

const { createApp, ref, reactive, computed, onMounted } = Vue;

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

    // --- editing ---
    // editingId: null (none) | role.RowKey (editing that role) | '__new__' (creating).
    const editingId = ref(null);
    const saving = ref(false);
    const formError = ref('');
    const form = reactive({ id: '', title: '', category: 'optional', description: '', holderMemberId: '' });

    function startEdit(role) {
      editingId.value = role.RowKey;
      form.id = role.RowKey;
      form.title = role.Title || '';
      form.category = (role.Category || 'optional').toLowerCase();
      form.description = role.Description || '';
      form.holderMemberId = role.HolderMemberId || '';
      formError.value = '';
    }
    function startCreate() {
      editingId.value = '__new__';
      form.id = ''; form.title = ''; form.category = 'optional'; form.description = ''; form.holderMemberId = '';
      formError.value = '';
    }
    function cancelEdit() { editingId.value = null; formError.value = ''; }

    async function saveRole() {
      if (!form.title.trim()) { formError.value = 'Zadaj názov roly.'; return; }
      saving.value = true;
      formError.value = '';
      try {
        const payload = {
          title: form.title,
          category: form.category,
          description: form.description,
          holderMemberId: form.holderMemberId,
        };
        if (editingId.value && editingId.value !== '__new__') payload.id = editingId.value;
        const r = await fetch(apiBase.value + '/manage/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token.value },
          body: JSON.stringify(payload),
        });
        if (r.status === 401) { formError.value = 'Token vypršal, prihlás sa znova.'; return; }
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error(data.error || 'save');
        editingId.value = null;
        await load();
      } catch (e) {
        console.error('Save role failed:', e);
        formError.value = 'Uloženie zlyhalo. Skús to znova.';
      } finally {
        saving.value = false;
      }
    }

    async function deleteRole(role) {
      if (!window.confirm('Naozaj zmazať rolu „' + role.Title + '"?')) return;
      saving.value = true;
      error.value = '';
      try {
        const r = await fetch(apiBase.value + '/manage/roles/' + encodeURIComponent(role.RowKey), {
          method: 'DELETE',
          headers: { 'X-Admin-Token': token.value },
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error('delete');
        if (editingId.value === role.RowKey) editingId.value = null;
        await load();
      } catch (e) {
        console.error('Delete role failed:', e);
        error.value = 'Mazanie zlyhalo. Skús to znova.';
      } finally {
        saving.value = false;
      }
    }

    onMounted(async () => {
      await loadConfig();
      if (token.value) load();
    });

    return {
      token, tokenInput, authed, loading, error,
      roles, members, categories, rolesByCategory, memberName,
      teamCount, takenCount, submitToken, logout, fmtDate,
      editingId, saving, formError, form,
      startEdit, startCreate, cancelEdit, saveRole, deleteRole,
    };
  },
}).mount('#admin-app');
