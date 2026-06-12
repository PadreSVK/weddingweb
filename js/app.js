/* =================================================================
   OUR WEDDING — Vue 3 application
   - Countdown, RSVP, HP quiz, Merlin easter egg
   ================================================================= */

const { createApp, ref, reactive, computed, onMounted, onUnmounted } = Vue;

createApp({
  setup() {
    // ------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------
    const config = ref(null);
    const loaded = ref(false);
    const scrolled = ref(false);
    const menuOpen = ref(false);
    const now = ref(Date.now());

    // RSVP
    const rsvp = reactive({
      name: '',
      email: '',
      attending: '',
      adults: 1,
      children: 0,
      vegan: false,
      vegetarian: false,
      glutenFree: false,
      allergies: '',
      accommodation: '',
      message: '',
    });
    const rsvpSent = ref(false);

    // Quiz
    const quiz = reactive({
      started: false,
      current: 0,
      score: 0,
      answered: null,
      finished: false,
    });

    // Merlin easter egg
    const merlinFound = ref([]);
    const merlinNotification = ref(null);
    const merlinFunFacts = [
      'Merlin má rád dlhé prechádzky po Vršatci... a syr.',
      'Merlin vie sedieť, ležať, podávať labku a kradnúť ponožky.',
      'Merlin je oficiálne svedok — bude mať na svadbe motýlika.',
    ];

    // Merlin reward — claimed after finding all three
    const merlinReward = reactive({ open: false, name: '', sent: false });

    // ------------------------------------------------------------
    // CONFIG LOAD
    // Production: use the inline synced config (#wedding-config-fallback) only.
    // Local dev: also fetch config.json so edits show up live without re-syncing.
    // Keeping the fetch dev-only means config.json isn't requested in production.
    // ------------------------------------------------------------
    function loadInlineConfig() {
      const tag = document.getElementById('wedding-config-fallback');
      if (!tag) return null;
      const txt = (tag.textContent || '').trim();
      if (!txt || txt.startsWith('__')) return null;
      try { return JSON.parse(txt); }
      catch (e) { console.warn('Inline config parse failed:', e); return null; }
    }

    const inline = loadInlineConfig();
    if (inline) {
      config.value = inline;
      loaded.value = true;
    }

    const host = location.hostname;
    const isDev =
      location.protocol === 'file:' || host === '' ||
      host === 'localhost' || host === '127.0.0.1';

    if (isDev) {
      fetch('config.json')
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
          config.value = data;
          loaded.value = true;
          console.info('Config loaded from config.json (live, dev)');
        })
        .catch(err => {
          if (!inline) {
            console.error('Failed to load config:', err);
            alert('Configuration failed to load. For live editing, run a local server — see README.');
          } else {
            console.info('Using inline fallback config (file:// or fetch blocked).');
          }
        });
    } else if (!inline) {
      console.error('No inline config found — run: node sync-config.js');
    }

    // ------------------------------------------------------------
    // COUNTDOWN + SCROLL
    // ------------------------------------------------------------
    let timer;
    onMounted(() => {
      timer = setInterval(() => { now.value = Date.now(); }, 1000);
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    });
    onUnmounted(() => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    });

    const countdown = computed(() => {
      if (!config.value) return null;
      const target = new Date(config.value.wedding.date).getTime();
      const diff = Math.max(0, target - now.value);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return {
        days: String(days),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      };
    });

    function handleScroll() {
      scrolled.value = window.scrollY > 40;
    }

    function scrollTo(id, evt) {
      if (evt) evt.preventDefault();
      menuOpen.value = false;
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }

    function getChapterEmoji(idx) {
      return ['💞', '✈️', '🐕', '🪄'][idx] || '📷';
    }

    // ------------------------------------------------------------
    // SUBMISSION ENGINE
    // One pipeline for every guest submission (RSVP, easter-egg reward…).
    // Today: POST to config.submissions.endpoint when set, otherwise fall
    // back to a mailto: draft (+ clipboard copy). Plug in a real endpoint
    // later and every caller starts using it with no further changes.
    // ------------------------------------------------------------
    async function submitEntry({ type, subject, summary, data }) {
      const sub = (config.value && config.value.submissions) || {};
      const endpoint = sub.endpoint || '';
      const payload = { type, ...data, submittedAt: new Date().toISOString() };

      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return { via: 'endpoint' };
      }

      // Fallback: copy a readable summary, then open a pre-filled mail draft.
      try { await navigator.clipboard.writeText(summary); } catch (e) {}
      const to = sub.email || '';
      const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
      window.location.href = `mailto:${to}?${query}`;
      return { via: 'mailto' };
    }

    // ------------------------------------------------------------
    // RSVP
    // ------------------------------------------------------------
    async function submitRsvp() {
      const data = { ...rsvp };
      try {
        await submitEntry({
          type: 'rsvp',
          subject: 'RSVP - Svadba ' + (rsvp.name || ''),
          summary: formatRsvpForEmail(data),
          data,
        });
        rsvpSent.value = true;
        Object.assign(rsvp, {
          name: '', email: '', attending: '', adults: 1, children: 0,
          vegan: false, vegetarian: false, glutenFree: false,
          allergies: '', accommodation: '', message: '',
        });
      } catch (err) {
        console.error('RSVP submit failed:', err);
        alert('Niečo sa pokazilo pri odosielaní. Skúste neskôr alebo nám napíšte.');
      }
    }

    function formatRsvpForEmail(p) {
      const diets = [];
      if (p.vegan) diets.push('vegán');
      if (p.vegetarian) diets.push('vegetarián');
      if (p.glutenFree) diets.push('bezlepkové');
      return [
        `RSVP — Svadba 16.10.2026`,
        `=====================================`,
        `Meno: ${p.name}`,
        `Email: ${p.email}`,
        `Účasť: ${p.attending === 'yes' ? 'ÁNO' : 'NIE'}`,
        p.attending === 'yes' ? `Dospelí: ${p.adults}` : null,
        p.attending === 'yes' ? `Deti: ${p.children}` : null,
        p.attending === 'yes' ? `Stravovanie: ${diets.length ? diets.join(', ') : '—'}` : null,
        p.attending === 'yes' ? `Alergie: ${p.allergies || '—'}` : null,
        p.attending === 'yes' ? `Ubytovanie: ${p.accommodation === 'yes' ? 'áno' : (p.accommodation === 'no' ? 'nie' : '—')}` : null,
        `Odkaz: ${p.message || '—'}`,
      ].filter(Boolean).join('\n');
    }

    // ------------------------------------------------------------
    // QUIZ
    // ------------------------------------------------------------
    function startQuiz() {
      quiz.started = true;
      quiz.current = 0;
      quiz.score = 0;
      quiz.answered = null;
      quiz.finished = false;
    }

    const currentQuestion = computed(() =>
      config.value ? config.value.easterEgg.quiz.questions[quiz.current] : null
    );

    function answerQuiz(idx) {
      if (quiz.answered !== null) return;
      quiz.answered = idx;
      if (currentQuestion.value && idx === currentQuestion.value.correct) {
        quiz.score++;
      }
    }

    function quizOptionClass(idx) {
      if (quiz.answered === null) return '';
      if (!currentQuestion.value) return '';
      if (idx === currentQuestion.value.correct) return 'quiz__option--correct';
      if (idx === quiz.answered) return 'quiz__option--wrong';
      return '';
    }

    function nextQuestion() {
      quiz.answered = null;
      if (quiz.current + 1 < config.value.easterEgg.quiz.questions.length) {
        quiz.current++;
      } else {
        quiz.finished = true;
      }
    }

    function restartQuiz() {
      quiz.started = false;
      quiz.finished = false;
    }

    // ------------------------------------------------------------
    // MERLIN HIDE & SEEK
    // Find all three, then claim the "reward" — the honour of walking
    // the dog. The claim is sent through the shared submission engine.
    // ------------------------------------------------------------
    const MERLIN_TOTAL = 3;

    function findMerlin(id) {
      if (merlinFound.value.includes(id)) return;
      merlinFound.value.push(id);
      merlinNotification.value = { id };
      setTimeout(() => { merlinNotification.value = null; }, 4000);

      if (merlinFound.value.length === MERLIN_TOTAL) {
        setTimeout(() => { merlinReward.open = true; }, 1500);
      }
    }

    function closeMerlinReward() {
      merlinReward.open = false;
    }

    async function claimMerlinReward() {
      const name = (merlinReward.name || '').trim();
      if (!name) return;
      try {
        await submitEntry({
          type: 'merlin-reward',
          subject: 'Merlin Hide & Seek — ' + name,
          summary: formatMerlinReward(name),
          data: { name, found: merlinFound.value.length, reward: 'Vyvenčiť Merlina' },
        });
        merlinReward.sent = true;
      } catch (err) {
        console.error('Merlin reward submit failed:', err);
        alert('Niečo sa pokazilo. Skús to znova.');
      }
    }

    function formatMerlinReward(name) {
      return [
        'Merlin Hide & Seek 🐕',
        '=====================================',
        `Hráč: ${name}`,
        `Našiel: ${MERLIN_TOTAL} / ${MERLIN_TOTAL} Merlinov`,
        'Odmena: čestná úloha vyvenčiť Merlina 🦴',
      ].join('\n');
    }

    // ------------------------------------------------------------
    // RETURN
    // ------------------------------------------------------------
    return {
      config: computed(() => config.value || emptyConfig()),
      loaded, scrolled, menuOpen, now,
      countdown, currentQuestion,
      rsvp, rsvpSent, submitRsvp,
      quiz, startQuiz, answerQuiz, quizOptionClass, nextQuestion, restartQuiz,
      merlinFound, merlinNotification, merlinFunFacts, findMerlin,
      merlinReward, claimMerlinReward, closeMerlinReward,
      scrollTo, getChapterEmoji,
    };
  },
}).mount('#app');

// Default config skeleton to avoid template errors during load
function emptyConfig() {
  return {
    couple: { bride: '...', groom: '...', hashtag: '' },
    wedding: {
      date: new Date().toISOString(),
      dateDisplay: '', timeDisplay: '',
      venue: { name: '', address: '', url: '#', wazeUrl: '#', googleMapsUrl: '#', description: '' },
    },
    accommodation: { intro: '', options: [] },
    story: { intro: '', chapters: [] },
    rsvp: { deadlineDisplay: '', intro: '' },
    submissions: { endpoint: '', email: '' },
    easterEgg: { quiz: { title: '', intro: '', questions: [], reward: '' } },
    ui: { navItems: [] },
  };
}
