import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

document.documentElement.classList.add('js');
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const body = document.body;
const header = document.querySelector('[data-site-header]');
const nav = document.querySelector('[data-site-nav]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const hero = document.querySelector('[data-hero]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const animated = !reduceMotion.matches;
const smoothCapable = animated && finePointer.matches;
let lastScroll = 0;

const revealAll = () => {
  document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-revealed'));
};

const start = () => {
  requestAnimationFrame(() => {
    root.classList.add('is-ready');
    document.querySelectorAll('.hero [data-reveal]').forEach((element, index) => {
      window.setTimeout(() => element.classList.add('is-revealed'), 160 + index * 90);
    });
  });
};

if (document.fonts?.ready) document.fonts.ready.then(start);
else start();

if ('IntersectionObserver' in window && animated) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('[data-reveal]:not(.hero [data-reveal])').forEach((element) => revealObserver.observe(element));
} else {
  revealAll();
}

let lenis;
if (smoothCapable) {
  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.86,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const headerDarkZones = [...document.querySelectorAll('.layers, .closing, .dark-page main, .inner-hero-services')];

const updateHeader = (scrollY, direction = 0) => {
  if (!header) return;
  const homeThreshold = hero ? hero.offsetHeight - 84 : 0;
  const visible = !hero || scrollY > homeThreshold || window.innerWidth <= 980;
  const dark = headerDarkZones.some((zone) => {
    const rect = zone.getBoundingClientRect();
    return rect.top < 74 && rect.bottom > 74;
  });

  header.classList.toggle('is-visible', visible);
  header.classList.toggle('is-dark', dark);
  header.classList.toggle('is-solid', visible && !dark && !body.classList.contains('business-page'));
  header.classList.toggle('is-hidden', window.innerWidth > 980 && visible && direction > 0 && scrollY > lastScroll + 4 && scrollY > homeThreshold + 120);
  if (direction <= 0 || scrollY < lastScroll - 4) header.classList.remove('is-hidden');
  lastScroll = scrollY;
};

if (lenis) {
  lenis.on('scroll', ({ scroll, direction }) => updateHeader(scroll, direction));
} else {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => updateHeader(self.scroll(), self.direction),
  });
}

updateHeader(window.scrollY, 0);

if (hero && animated) {
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty('--hero-x', `${xRatio * -8}px`);
    hero.style.setProperty('--hero-y', `${yRatio * -6}px`);
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--hero-x', '0px');
    hero.style.setProperty('--hero-y', '0px');
  });
}

const closeMenu = () => {
  body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  lenis?.start();
};

menuToggle?.addEventListener('click', () => {
  const open = !body.classList.contains('menu-open');
  body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  if (open) lenis?.stop();
  else lenis?.start();
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

if (smoothCapable && window.innerWidth > 980) {
  const aperture = document.querySelector('[data-aperture]');
  const media = document.querySelector('[data-aperture-media]');
  const copy = document.querySelector('[data-aperture-copy]');

  if (aperture && media && copy) {
    const image = media.querySelector('img');
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: aperture,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
    });

    timeline
      .fromTo(media,
        { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
        { clipPath: 'inset(8% 4% 8% 34% round 0 0 11vw 0)', ease: 'none', duration: 1 },
        0)
      .fromTo(image, { scale: 1.09 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .fromTo(copy, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.34 }, 0.55);
  }

  const layerVisual = document.querySelector('[data-layer-visual]');
  if (layerVisual) {
    gsap.to('.layer-image-collage', { yPercent: -10, rotate: -1.2, ease: 'none', scrollTrigger: { trigger: layerVisual, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.layer-image-drawing', { yPercent: 10, rotate: 1.1, ease: 'none', scrollTrigger: { trigger: layerVisual, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.layer-image-render', { yPercent: -7, ease: 'none', scrollTrigger: { trigger: layerVisual, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  document.querySelectorAll('.editorial-project figure, .portfolio-study > figure').forEach((figure) => {
    gsap.fromTo(figure,
      { clipPath: 'inset(10% 0% 10% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: figure, start: 'top 88%', end: 'top 48%', scrub: 0.45 } });
  });
}

const contactForm = document.querySelector('[data-contact-form]');
contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = `Новый проект RENDART: ${data.get('type')}`;
  const message = [
    `Имя: ${data.get('name')}`,
    `Email: ${data.get('email')}`,
    `Тип задачи: ${data.get('type')}`,
    '',
    String(data.get('message') || ''),
  ].join('\n');
  window.location.href = `mailto:ir@rendart.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
});

window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
