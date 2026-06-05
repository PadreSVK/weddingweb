/* =================================================================
   OUR WEDDING — Vue 3 application
   - Countdown, RSVP, EPC-QR generator for gifts, HP quiz, Merlin easter egg
   ================================================================= */

const { createApp, ref, reactive, computed, onMounted, onUnmounted, watch } = Vue;

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

    // QR modal
    const qrModal = reactive({
      open: false,
      gift: null,
      amount: 0,
      message: '',
      editAmount: false,
    });
    const qrSvg = ref('');

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

    // ------------------------------------------------------------
    // CONFIG LOAD
    // 1) Try the inline fallback (#wedding-config-fallback) — works even on file://
    // 2) Try fetching config.json — for live edits via a local server
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

    fetch('config.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(data => {
        config.value = data;
        loaded.value = true;
        console.info('Config loaded from config.json (live)');
      })
      .catch(err => {
        if (!inline) {
          console.error('Failed to load config:', err);
          alert('Configuration failed to load. For live editing, run a local server — see README.');
        } else {
          console.info('Using inline fallback config (file:// or fetch blocked).');
        }
      });

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
    // RSVP SUBMIT
    // ------------------------------------------------------------
    async function submitRsvp() {
      const endpoint = config.value.rsvp.endpoint;
      const payload = { ...rsvp, submittedAt: new Date().toISOString() };

      if (endpoint) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          rsvpSent.value = true;
        } catch (err) {
          console.error('RSVP submit failed:', err);
          alert('Niečo sa pokazilo pri odosielaní. Skúste neskôr alebo nám napíšte.');
        }
      } else {
        const summary = formatRsvpForEmail(payload);
        try { await navigator.clipboard.writeText(summary); } catch (e) {}
        const subject = encodeURIComponent('RSVP - Svadba ' + (rsvp.name || ''));
        const body = encodeURIComponent(summary);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        rsvpSent.value = true;
      }

      setTimeout(() => {
        Object.assign(rsvp, {
          name: '', email: '', attending: '', adults: 1, children: 0,
          vegan: false, vegetarian: false, glutenFree: false,
          allergies: '', accommodation: '', message: '',
        });
      }, 300);
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
    // QR — EPC069-12 (SEPA Credit Transfer)
    // ------------------------------------------------------------
    function openQrModal(gift) {
      qrModal.gift = gift;
      qrModal.amount = gift.customAmount ? 50 : gift.amount;
      qrModal.message = '';
      qrModal.editAmount = !!gift.customAmount;
      qrModal.open = true;
      setTimeout(generateQr, 50);
    }

    function closeQrModal() {
      qrModal.open = false;
      qrModal.gift = null;
      qrSvg.value = '';
    }

    watch(
      () => [qrModal.amount, qrModal.message, qrModal.open],
      () => { if (qrModal.open) generateQr(); }
    );

    function generateQr() {
      if (!config.value || !qrModal.gift) return;
      const pay = config.value.gifts.payment;
      const iban = (pay.iban || '').replace(/\s+/g, '');
      const name = pay.beneficiaryName || '';
      const bic  = pay.bic || '';
      const vs   = qrModal.gift.variableSymbol || '';
      const amt  = Number(qrModal.amount) > 0 ? `EUR${Number(qrModal.amount).toFixed(2)}` : '';
      const userMsg = (qrModal.message || '').trim();
      const unstructuredRef = userMsg
        ? `/VS${vs} ${userMsg}`.substring(0, 140)
        : `/VS${vs}`;

      const payload = [
        'BCD', '002', '1', 'SCT',
        bic, name, iban, amt,
        '', '', unstructuredRef, '',
      ].join('\n');

      try {
        const qr = qrcode(0, 'M');
        qr.addData(payload);
        qr.make();
        qrSvg.value = qr.createSvgTag({ scalable: true, margin: 1 });
      } catch (err) {
        console.error('QR generation failed:', err);
        qrSvg.value = '<p style="color:#c97b5f">Chyba pri generovaní QR.</p>';
      }
    }

    const isIbanFilled = computed(() => {
      if (!config.value) return false;
      const iban = (config.value.gifts.payment.iban || '').replace(/\s+/g, '');
      return iban && !iban.startsWith('SK000000');
    });

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
    // ------------------------------------------------------------
    function findMerlin(id) {
      if (merlinFound.value.includes(id)) return;
      merlinFound.value.push(id);
      merlinNotification.value = { id };
      setTimeout(() => { merlinNotification.value = null; }, 4000);

      if (merlinFound.value.length === 3) {
        setTimeout(() => {
          alert('🎉 Našiel si všetkých troch Merlinov! Ďakujeme za hru — ako odmena ti dáme extra objatie psa na svadbe. 🐕');
        }, 4500);
      }
    }

    // ------------------------------------------------------------
    // RETURN
    // ------------------------------------------------------------
    return {
      config: computed(() => config.value || emptyConfig()),
      loaded, scrolled, menuOpen, now,
      countdown, currentQuestion, isIbanFilled,
      rsvp, rsvpSent, submitRsvp,
      qrModal, qrSvg, openQrModal, closeQrModal,
      quiz, startQuiz, answerQuiz, quizOptionClass, nextQuestion, restartQuiz,
      merlinFound, merlinNotification, merlinFunFacts, findMerlin,
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
    rsvp: { endpoint: '', deadlineDisplay: '', intro: '' },
    gifts: {
      intro: '', items: [],
      payment: { iban: '', beneficiaryName: '', bic: '', currency: 'EUR' },
    },
    easterEgg: { quiz: { title: '', intro: '', questions: [], reward: '' } },
    ui: { navItems: [] },
  };
}
