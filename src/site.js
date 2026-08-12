document.documentElement.classList.add('js');

const root = document.documentElement;
const body = document.body;
const header = document.querySelector('[data-site-header]');
const nav = document.querySelector('[data-site-nav]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const menuLabel = document.querySelector('[data-menu-label]');
const hero = document.querySelector('[data-hero]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const animated = !reduceMotion.matches;
const smoothCapable = animated && finePointer.matches && window.innerWidth > 820;

const safeSession = {
  get(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* Storage may be blocked. */ }
  },
};

if (safeSession.get('rendart-intro-seen')) root.classList.add('intro-seen');
else safeSession.set('rendart-intro-seen', '1');

const revealTargets = document.querySelectorAll('[data-reveal], .case-card, .ruled-rows article, .process-list li');
revealTargets.forEach((element) => element.setAttribute('data-reveal', ''));

const revealAll = () => revealTargets.forEach((element) => element.classList.add('is-revealed'));
const start = () => requestAnimationFrame(() => root.classList.add('is-ready'));
if (document.fonts?.ready) document.fonts.ready.then(start);
else start();

if ('IntersectionObserver' in window && animated) {
  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      instance.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });
  revealTargets.forEach((element) => observer.observe(element));
} else {
  revealAll();
}

let lenis;
let lenisLoading = false;
const bootLenis = async () => {
  if (!smoothCapable || lenis || lenisLoading) return;
  lenisLoading = true;
  try {
    const { default: Lenis } = await import('lenis');
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.88 });
    lenis.on('scroll', ({ scroll, direction }) => updateHeader(scroll, direction));
    const frame = (time) => {
      lenis?.raf(time);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  } finally {
    lenisLoading = false;
  }
};

const darkZones = [...document.querySelectorAll('[data-header-theme="dark"]')];
let lastScroll = window.scrollY;
const updateHeader = (scrollY = window.scrollY, direction = 0) => {
  if (!header) return;
  const heroThreshold = hero ? Math.max(hero.offsetHeight - 90, 0) : 0;
  const visible = !hero || scrollY > heroThreshold || window.innerWidth <= 820;
  const dark = darkZones.some((zone) => {
    const rect = zone.getBoundingClientRect();
    return rect.top < 38 && rect.bottom > 38;
  });

  header.classList.toggle('is-visible', visible);
  header.classList.toggle('is-dark', dark);
  header.classList.toggle('is-solid', visible && !dark);

  const movingDown = direction > 0 || scrollY > lastScroll + 5;
  const movingUp = direction < 0 || scrollY < lastScroll - 5;
  if (window.innerWidth > 820 && visible && movingDown && scrollY > heroThreshold + 140) header.classList.add('is-hidden');
  if (movingUp || scrollY < heroThreshold + 80) header.classList.remove('is-hidden');
  lastScroll = scrollY;
};

window.addEventListener('scroll', () => updateHeader(window.scrollY), { passive: true });
window.addEventListener('pointermove', bootLenis, { once: true, passive: true });
updateHeader();

if (hero && animated && finePointer.matches) {
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty('--hero-x', `${x * -8}px`);
    hero.style.setProperty('--hero-y', `${y * -6}px`);
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--hero-x', '0px');
    hero.style.setProperty('--hero-y', '0px');
  });
}

const closeMenu = () => {
  body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  if (menuLabel) menuLabel.textContent = 'Меню';
  lenis?.start();
};

menuToggle?.addEventListener('click', () => {
  const open = !body.classList.contains('menu-open');
  body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  if (menuLabel) menuLabel.textContent = open ? 'Закрыть' : 'Меню';
  if (open) lenis?.stop();
  else lenis?.start();
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

document.querySelectorAll('[data-task-switcher]').forEach((switcher) => {
  const triggers = [...switcher.querySelectorAll('[data-task-trigger]')];
  const previews = [...switcher.querySelectorAll('[data-task-preview]')];
  const activate = (index) => {
    triggers.forEach((trigger, triggerIndex) => {
      const active = triggerIndex === index;
      trigger.closest('li')?.classList.toggle('is-active', active);
      trigger.setAttribute('aria-expanded', String(active));
    });
    previews.forEach((preview, previewIndex) => preview.classList.toggle('is-active', previewIndex === index));
  };

  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', () => activate(index));
    if (finePointer.matches) trigger.addEventListener('mouseenter', () => activate(index));
    trigger.addEventListener('focus', () => activate(index));
  });
});

const rndStory = document.querySelector('[data-rnd-story]');
if (rndStory && animated && window.innerWidth > 820) {
  const steps = [...rndStory.querySelectorAll('[data-rnd-step]')];
  const images = [...rndStory.querySelectorAll('[data-rnd-image]')];
  const activate = (index) => {
    steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
    images.forEach((image, imageIndex) => image.classList.toggle('is-active', imageIndex === index));
  };
  let frameRequested = false;
  const updateStory = () => {
    const rect = rndStory.getBoundingClientRect();
    const distance = Math.max(rect.height - window.innerHeight, 1);
    const progress = Math.min(0.999, Math.max(0, -rect.top / distance));
    activate(Math.min(2, Math.floor(progress * 3)));
    frameRequested = false;
  };
  const requestStoryUpdate = () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(updateStory);
  };
  window.addEventListener('scroll', requestStoryUpdate, { passive: true });
  window.addEventListener('resize', requestStoryUpdate, { passive: true });
  updateStory();
}

const analyticsQueue = window.dataLayer = window.dataLayer || [];
const track = (event, parameters = {}) => {
  const payload = { event, page: window.location.pathname, ...parameters };
  analyticsQueue.push(payload);
  window.__rendartAnalytics = window.__rendartAnalytics || [];
  window.__rendartAnalytics.push(payload);
};

document.querySelectorAll('[data-track]').forEach((element) => {
  element.addEventListener('click', () => {
    const event = element.dataset.track;
    const parameters = {};
    for (const [key, value] of Object.entries(element.dataset)) {
      if (key === 'track') continue;
      parameters[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
    }
    track(event, parameters);
  });
});

const query = new URLSearchParams(window.location.search);
const queryAudience = query.get('audience');
const sourceCta = query.get('source') || 'direct';
const utm = Object.fromEntries([...query.entries()].filter(([key]) => key.startsWith('utm_')));
if (Object.keys(utm).length) safeSession.set('rendart-utm', JSON.stringify(utm));

document.querySelectorAll('[data-inquiry-form]').forEach((form) => {
  if (queryAudience) {
    const option = form.querySelector(`input[name="audience"][value="${CSS.escape(queryAudience)}"]`);
    if (option) option.checked = true;
  }

  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('button[type="submit"]');
  let started = false;
  const markStarted = () => {
    if (started) return;
    started = true;
    track('form_start', { audience: form.querySelector('input[name="audience"]:checked')?.value || 'unknown' });
  };
  form.addEventListener('input', markStarted, { once: true });
  form.addEventListener('focusin', markStarted, { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const endpoint = form.dataset.formEndpoint?.trim();
    const data = new FormData(form);

    if (data.get('website')) return;

    if (!endpoint) {
      status.textContent = 'Онлайн-отправка будет доступна после подключения CRM. Пока позвоните нам: +7 981 592 62 60';
      status.classList.remove('is-success');
      track('form_error', { error_type: 'integration_missing' });
      return;
    }

    if (!data.get('consent')) {
      status.textContent = 'Отметьте согласие на обработку персональных данных';
      status.classList.remove('is-success');
      form.querySelector('input[name="consent"]')?.focus();
      track('form_error', { error_type: 'consent_missing' });
      return;
    }

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    status.textContent = 'Отправляем заявку';
    status.classList.remove('is-success');

    const storedUtm = (() => {
      try { return JSON.parse(safeSession.get('rendart-utm') || '{}'); } catch { return {}; }
    })();
    const payload = {
      name: data.get('name') || '',
      contact: data.get('contact') || '',
      audience: data.get('audience') || '',
      message: data.get('message') || '',
      company: data.get('company') || '',
      deadline: data.get('deadline') || '',
      materials: data.get('materials') || '',
      consent: true,
      consentVersion: form.dataset.consentVersion,
      page: window.location.pathname,
      sourceCta,
      utm: storedUtm,
      referrer: document.referrer,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      status.textContent = 'Заявка отправлена';
      status.classList.add('is-success');
      track('form_submit', { audience: payload.audience || 'unknown', task_type: 'free_text' });
      window.location.assign(form.dataset.thanksUrl);
    } catch (error) {
      status.textContent = 'Не удалось отправить заявку. Данные сохранены в форме — попробуйте еще раз или позвоните нам';
      status.classList.remove('is-success');
      track('form_error', { error_type: 'network' });
      console.error('RENDART form submission failed', error);
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  });
});

window.addEventListener('resize', () => {
  closeMenu();
  updateHeader();
}, { passive: true });
